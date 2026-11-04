import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';
import {
  X,
  Database,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  PhoneCall,
  Flame,
  Award,
  Layers,
  RefreshCw,
  Clock
} from 'lucide-react';

interface AdminMonthlyLeadCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminMonthlyLeadCleanupModal: React.FC<AdminMonthlyLeadCleanupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { leadBatches, cleanMonthlyLeads } = useApp();

  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [cleanupResult, setCleanupResult] = useState<{
    purgedCount: number;
    message: string;
  } | null>(null);

  const [preview, setPreview] = useState<{
    total: number;
    notInterestedCount: number;
    wonCount: number;
    interestedCount: number;
    pendingCount: number;
    otherCount: number;
    protectedCount: number;
    callLogsCount: number;
  }>({
    total: 0,
    notInterestedCount: 0,
    wonCount: 0,
    interestedCount: 0,
    pendingCount: 0,
    otherCount: 0,
    protectedCount: 0,
    callLogsCount: 0,
  });

  const selectedBatch = useMemo(() => {
    if (selectedBatchId === 'all') return null;
    return leadBatches.find((b) => b.id === selectedBatchId);
  }, [selectedBatchId, leadBatches]);

  // Fetch pre-check stats whenever selected batch changes
  const fetchPreview = async (batchId: string, fileName?: string) => {
    setIsLoadingPreview(true);
    setCleanupResult(null);
    try {
      const res = await api.getBatchCleanupPreview(batchId, fileName);
      setPreview(res);
    } catch (err) {
      console.warn('Failed to fetch lead batch cleanup preview:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPreview(selectedBatchId, selectedBatch?.fileName);
    }
  }, [isOpen, selectedBatchId, selectedBatch]);

  if (!isOpen) return null;

  const handleExecuteCleanup = async () => {
    const batchLabel = selectedBatch ? `"${selectedBatch.fileName}"` : 'all lead batches';
    const confirmMsg =
      `Are you sure you want to purge ${preview.notInterestedCount} "Not Interested" leads from ${batchLabel}?\n\n` +
      `✓ ${preview.wonCount} Won Deals will be PROTECTED & KEPT\n` +
      `✓ ${preview.interestedCount} Interested/Callback clients will be KEPT\n` +
      `✓ ${preview.pendingCount} Unseen fresh leads will be KEPT\n` +
      `✓ All Call Logs & Rep Work Credit will remain 100% INTACT\n\n` +
      `Proceed with manual storage optimization?`;

    if (!window.confirm(confirmMsg)) return;

    setIsPurging(true);
    try {
      const res = await cleanMonthlyLeads(selectedBatchId, selectedBatch?.fileName);
      setCleanupResult({
        purgedCount: res.purgedCount,
        message: res.message || `Successfully purged ${res.purgedCount} Not-Interested leads!`,
      });
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
      // Refresh preview stats
      await fetchPreview(selectedBatchId, selectedBatch?.fileName);
    } catch (err: any) {
      window.alert(`Failed to perform cleanup: ${err.message || 'Server error'}`);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#07192C] via-[#0A2540] to-[#0E3558] text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-[#00C9A7]/40 flex items-center justify-center text-[#00C9A7] shadow-xs">
              <Database className="w-5 h-5 text-[#00C9A7]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-base text-white">
                  Monthly Lead Storage Cleanup
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-[#00C9A7] border border-[#00C9A7]/30 font-mono">
                  Manual Tool
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Safely purge dead 'Not Interested' leads while 100% retaining Won, Interested &amp; Unseen leads
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Batch Selector */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Select Target Lead Batch / Scope to Clean:</span>
              </label>
              <button
                type="button"
                onClick={() => fetchPreview(selectedBatchId, selectedBatch?.fileName)}
                disabled={isLoadingPreview}
                className="text-[11px] font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingPreview ? 'animate-spin' : ''}`} />
                <span>Refresh Stats</span>
              </button>
            </div>

            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0A2540] focus:outline-none focus:border-[#00C9A7] shadow-2xs"
            >
              <option value="all">🌐 All Uploaded Batches &amp; Lead Pools Combined</option>
              {leadBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  📄 {b.fileName || `Batch (${b.id})`} • {b.totalLeads || 0} total leads • {b.uploadedAt || 'Recent'}
                  {b.assignedToEmployeeName ? ` (Assigned to ${b.assignedToEmployeeName})` : ''}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500 block">
              Tip: Run this once a month after telecallers have finished dialing older batches.
            </span>
          </div>

          {/* Success Result Banner */}
          {cleanupResult && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-emerald-900">Storage Optimization Successful!</h4>
                <p className="text-xs text-emerald-700 mt-0.5">{cleanupResult.message}</p>
                <span className="text-[11px] text-emerald-600 font-medium block mt-1">
                  SQLite database has been vacuumed and physical disk space on EC2 reclaimed.
                </span>
              </div>
            </div>
          )}

          {/* Live Data Breakdown & Immunity Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Live Data Safety &amp; Purge Breakdown
              </h4>
              <span className="text-xs font-bold text-slate-600">
                Total Leads: <strong className="text-[#0A2540] font-mono">{preview.total}</strong>
              </span>
            </div>

            {/* Protected Section (Green) */}
            <div className="bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white rounded-2xl border border-teal-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h5 className="font-bold text-xs text-emerald-900">
                  PROTECTED &amp; IMMUNE (Will 100% Stay in All Panels)
                </h5>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="bg-white/90 p-3 rounded-xl border border-teal-100 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                    <Award className="w-3.5 h-3.5" />
                    <span>Won Deals</span>
                  </div>
                  <span className="font-mono font-black text-lg text-[#0A2540] block mt-1">
                    {preview.wonCount}
                  </span>
                  <span className="text-[10px] text-slate-500">Saved in Client Pipeline</span>
                </div>

                <div className="bg-white/90 p-3 rounded-xl border border-teal-100 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-teal-700 font-bold text-xs">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>Interested &amp; Callbacks</span>
                  </div>
                  <span className="font-mono font-black text-lg text-[#0A2540] block mt-1">
                    {preview.interestedCount}
                  </span>
                  <span className="text-[10px] text-slate-500">Kept in Follow-up Queue</span>
                </div>

                <div className="bg-white/90 p-3 rounded-xl border border-teal-100 shadow-2xs col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>Unseen Fresh Leads</span>
                  </div>
                  <span className="font-mono font-black text-lg text-[#0A2540] block mt-1">
                    {preview.pendingCount}
                  </span>
                  <span className="text-[10px] text-slate-500">Untouched for reps to call</span>
                </div>
              </div>

              {/* Call Logs Guarantee Banner */}
              <div className="bg-white/80 p-2.5 rounded-xl border border-teal-100 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-slate-700">
                  <PhoneCall className="w-3.5 h-3.5 text-[#00A88B]" />
                  <span>Telecaller Call Logs &amp; Dial History:</span>
                </span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {preview.callLogsCount} Records (100% Retained)
                </span>
              </div>
            </div>

            {/* Purge Target Section (Rose) */}
            <div className="bg-gradient-to-br from-rose-50/70 via-red-50/40 to-white rounded-2xl border border-rose-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <h5 className="font-bold text-xs text-rose-900">
                    SAFE PURGE TARGET (Dead Numbers to be Removed)
                  </h5>
                </div>
                <span className="text-xs font-mono font-black text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full border border-rose-200">
                  {preview.notInterestedCount} leads
                </span>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-rose-100 flex items-center justify-between">
                <div>
                  <h6 className="font-bold text-xs text-[#0A2540]">Not Interested &amp; Dead Rejections</h6>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Will be cleared from Telecaller &amp; Team Leader calling lists to reduce screen clutter and save database space.
                  </p>
                </div>
                <span className="text-xl font-mono font-black text-rose-600 pl-3">
                  {preview.notInterestedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Operational Guarantees Notice */}
          <div className="bg-slate-100/80 p-3 rounded-2xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Operational Safety Guarantees:</span>
            </div>
            <p>
              • <strong>Reps' Dial Credit Intact:</strong> Call records in <code>call_logs</code> are never deleted. Daily dials and performance scores will not drop.
            </p>
            <p>
              • <strong>Unseen Leads Saved:</strong> Fresh leads with 0 calls remain in the pool so employees can continue dialing them.
            </p>
            <p>
              • <strong>Manual Only:</strong> This action runs strictly when you click the button below. Zero automated background deletions.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span className="text-xs text-slate-500 font-medium order-2 sm:order-1">
            {preview.notInterestedCount > 0 ? (
              <span>Ready to clean {preview.notInterestedCount} dead lead(s)</span>
            ) : (
              <span>No Not-Interested leads to purge in this scope</span>
            )}
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPurging}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteCleanup}
              disabled={isPurging || preview.notInterestedCount === 0 || isLoadingPreview}
              className="px-5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isPurging ? 'animate-spin' : ''}`} />
              <span>
                {isPurging
                  ? 'Optimizing Storage...'
                  : preview.notInterestedCount > 0
                  ? `Purge ${preview.notInterestedCount} Not-Interested Leads`
                  : 'No Not-Interested Leads'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
