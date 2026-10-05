import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Target, Sparkles, RefreshCw, Check, Phone } from 'lucide-react';
import { TeamMember } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface RepDraftTarget {
  salesTarget: number;
  goalCalls: number;
}

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const inrShort = (n: number) => {
  if (n >= 100000) {
    return `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  }
  return inr(n);
};

export const AdminTargetSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { teamMembers, batchUpdateTargets, triggerToast } = useApp();

  const [draftTargets, setDraftTargets] = useState<Record<string, RepDraftTarget>>({});
  const [bulkSalesInput, setBulkSalesInput] = useState('200000');
  const [bulkCallsInput, setBulkCallsInput] = useState('60');
  const [bulkMode, setBulkMode] = useState<'sales' | 'calls'>('sales');
  const [isSaving, setIsSaving] = useState(false);
  const [activeSquadFilter, setActiveSquadFilter] = useState<string>('ALL');

  const prevIsOpenRef = useRef(false);

  // Filter telecallers and sales reps, but include any active rep or squad member
  const activeMembers = useMemo(() => {
    const reps = teamMembers.filter((m) => {
      const p = (m.portal || '').toLowerCase();
      const r = (m.role || '').toLowerCase();
      const g = (m.group || '').toLowerCase();
      return (
        p === 'telecaller' ||
        r.includes('telecaller') ||
        r.includes('sales') ||
        r.includes('sdr') ||
        r.includes('bde') ||
        r.includes('executive') ||
        (m.salesTarget && m.salesTarget > 0) ||
        (g && g !== 'human resources' && g !== 'executive management' && g !== 'unassigned')
      );
    });
    return reps.length > 0 ? reps : teamMembers.filter((m) => m.portal !== 'admin');
  }, [teamMembers]);

  // Extract squad list for filtering
  const squads = useMemo(() => {
    return Array.from(new Set(activeMembers.map((m) => m.group || 'General'))).filter(Boolean);
  }, [activeMembers]);

  // Initialize draft targets ONLY when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      const initial: Record<string, RepDraftTarget> = {};
      activeMembers.forEach((m) => {
        initial[m.id] = {
          salesTarget: (m.salesTarget && m.salesTarget > 0) ? m.salesTarget : 200000,
          goalCalls: (m.goalCalls && m.goalCalls > 0) ? m.goalCalls : 60,
        };
      });
      setDraftTargets(initial);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, activeMembers]);

  if (!isOpen) return null;

  // Filtered members based on selected squad
  const displayedMembers = activeSquadFilter === 'ALL'
    ? activeMembers
    : activeMembers.filter((m) => (m.group || 'General') === activeSquadFilter);

  // Compute live aggregates based on drafts
  const totalDraftSalesTarget = activeMembers.reduce(
    (sum, m) => sum + (draftTargets[m.id]?.salesTarget ?? m.salesTarget ?? 200000),
    0
  );
  const totalAchievedSales = activeMembers.reduce((sum, m) => sum + (m.salesAchieved || 0), 0);
  const percentSalesAchieved = totalDraftSalesTarget > 0
    ? Math.min(100, Math.round((totalAchievedSales / totalDraftSalesTarget) * 100))
    : 0;

  const totalDraftCallsTarget = activeMembers.reduce(
    (sum, m) => sum + (draftTargets[m.id]?.goalCalls ?? m.goalCalls ?? 60),
    0
  );

  // Handlers for bulk apply
  const handleApplyBulkSales = (val: number) => {
    setDraftTargets((prev) => {
      const updated = { ...prev };
      displayedMembers.forEach((m) => {
        updated[m.id] = {
          ...(updated[m.id] || { goalCalls: m.goalCalls || 60 }),
          salesTarget: val,
        };
      });
      return updated;
    });
    triggerToast(`Applied ${inr(val)} sales target to ${displayedMembers.length} reps (${activeSquadFilter === 'ALL' ? 'Company-wide' : activeSquadFilter})`);
  };

  const handleApplyBulkCalls = (val: number) => {
    setDraftTargets((prev) => {
      const updated = { ...prev };
      displayedMembers.forEach((m) => {
        updated[m.id] = {
          ...(updated[m.id] || { salesTarget: m.salesTarget || 200000 }),
          goalCalls: val,
        };
      });
      return updated;
    });
    triggerToast(`Applied ${val} daily calls goal to ${displayedMembers.length} reps (${activeSquadFilter === 'ALL' ? 'Company-wide' : activeSquadFilter})`);
  };

  // Adjustments for individual rep
  const handleAdjustSales = (id: string, delta: number) => {
    setDraftTargets((prev) => {
      const cur = prev[id] || { salesTarget: 200000, goalCalls: 60 };
      const nextSales = Math.max(0, cur.salesTarget + delta);
      return { ...prev, [id]: { ...cur, salesTarget: nextSales } };
    });
  };

  const handleAdjustCalls = (id: string, delta: number) => {
    setDraftTargets((prev) => {
      const cur = prev[id] || { salesTarget: 200000, goalCalls: 60 };
      const nextCalls = Math.max(10, cur.goalCalls + delta);
      return { ...prev, [id]: { ...cur, goalCalls: nextCalls } };
    });
  };

  const handleDirectSalesChange = (id: string, val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
    setDraftTargets((prev) => {
      const cur = prev[id] || { salesTarget: 200000, goalCalls: 60 };
      return { ...prev, [id]: { ...cur, salesTarget: num } };
    });
  };

  const handleDirectCallsChange = (id: string, val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
    setDraftTargets((prev) => {
      const cur = prev[id] || { salesTarget: 200000, goalCalls: 60 };
      return { ...prev, [id]: { ...cur, goalCalls: num } };
    });
  };

  // Atomic batch save and global sync
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = activeMembers.map((m) => {
        const draft = draftTargets[m.id];
        return {
          id: m.id,
          salesTarget: draft?.salesTarget ?? (m.salesTarget || 200000),
          goalCalls: draft?.goalCalls ?? (m.goalCalls || 60),
        };
      });

      await batchUpdateTargets(payload);
      triggerToast(`✓ Successfully updated & globally synced targets for ${payload.length} reps!`);
      onClose();
    } catch (err) {
      console.warn('Failed to save targets globally:', err);
      triggerToast('✗ Could not sync some targets to server');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-[#00C9A7]/30 text-[#00A88B] flex items-center justify-center shadow-2xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-base text-[#0A2540]">Company Target Control</h3>
                <span className="text-[9px] font-black bg-teal-100 text-[#0A2540] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Global Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Set monthly sales quotas & daily call goals for individuals, teams, or all</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* 1. Live Aggregate Progress Card */}
          <div className="bg-gradient-to-br from-[#0A2540] via-[#103050] to-[#123659] text-white rounded-2xl p-4 shadow-sm space-y-3.5 border border-slate-800">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[9px] font-bold text-teal-300 uppercase tracking-wider block">Total Monthly Target</span>
                <span className="font-mono-nums font-black text-xl text-white block mt-0.5 truncate">
                  {inr(totalDraftSalesTarget)}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider block">Month Achieved</span>
                <span className="font-mono-nums font-black text-lg text-[#00C9A7] block mt-0.5 truncate">
                  {inr(totalAchievedSales)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-sky-300 uppercase tracking-wider block">Daily Call Floor</span>
                <span className="font-mono-nums font-black text-lg text-sky-200 block mt-0.5 truncate">
                  {totalDraftCallsTarget} calls
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#00C9A7] via-[#00B4D8] to-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${percentSalesAchieved}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium">
                <span>{percentSalesAchieved}% of monthly goal reached</span>
                <span>{activeMembers.length} Active Sales Reps</span>
              </div>
            </div>
          </div>

          {/* 2. Fast Bulk Target Setter with Mode Switch */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#0A2540]">
                <Sparkles className="w-3.5 h-3.5 text-[#00A88B]" />
                <span>
                  Quick Batch Set {activeSquadFilter === 'ALL' ? '(All Reps)' : `(${activeSquadFilter})`}
                </span>
              </div>
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setBulkMode('sales')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    bulkMode === 'sales' ? 'bg-[#0A2540] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sales Target
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode('calls')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    bulkMode === 'calls' ? 'bg-[#0A2540] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Daily Calls
                </button>
              </div>
            </div>

            {bulkMode === 'sales' ? (
              <>
                {/* Sales Presets */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[150000, 200000, 250000, 300000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleApplyBulkSales(val)}
                      className="py-1.5 px-2 rounded-xl bg-white border border-slate-200 hover:border-[#00C9A7] hover:bg-teal-50/50 text-[#0A2540] font-bold text-[11px] transition-all active:scale-95 text-center cursor-pointer shadow-2xs"
                    >
                      {inrShort(val)}
                    </button>
                  ))}
                </div>

                {/* Custom Sales Value */}
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      value={bulkSalesInput}
                      onChange={(e) => setBulkSalesInput(e.target.value)}
                      placeholder="200000"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-7 pr-3 py-1.5 text-xs font-mono font-bold text-[#0A2540] focus:outline-none focus:border-[#00C9A7]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyBulkSales(Number(bulkSalesInput) || 0)}
                    className="bg-[#0A2540] hover:bg-[#123659] text-white font-black text-xs px-3.5 py-1.5 rounded-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Apply to {displayedMembers.length} Reps</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Calls Presets */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[40, 60, 80, 100].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleApplyBulkCalls(val)}
                      className="py-1.5 px-2 rounded-xl bg-white border border-slate-200 hover:border-[#00C9A7] hover:bg-teal-50/50 text-[#0A2540] font-bold text-[11px] transition-all active:scale-95 text-center cursor-pointer shadow-2xs"
                    >
                      {val} Calls
                    </button>
                  ))}
                </div>

                {/* Custom Calls Value */}
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      <Phone className="w-3 h-3" />
                    </span>
                    <input
                      type="number"
                      value={bulkCallsInput}
                      onChange={(e) => setBulkCallsInput(e.target.value)}
                      placeholder="60"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono font-bold text-[#0A2540] focus:outline-none focus:border-[#00C9A7]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyBulkCalls(Number(bulkCallsInput) || 0)}
                    className="bg-[#0A2540] hover:bg-[#123659] text-white font-black text-xs px-3.5 py-1.5 rounded-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Apply to {displayedMembers.length} Reps</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 3. Squad Filter Pills */}
          {squads.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveSquadFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all flex-shrink-0 cursor-pointer ${
                  activeSquadFilter === 'ALL'
                    ? 'bg-[#0A2540] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Reps ({activeMembers.length})
              </button>
              {squads.map((sq) => {
                const count = activeMembers.filter((m) => (m.group || 'General') === sq).length;
                return (
                  <button
                    key={sq}
                    type="button"
                    onClick={() => setActiveSquadFilter(sq)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all flex-shrink-0 cursor-pointer ${
                      activeSquadFilter === sq
                        ? 'bg-[#0A2540] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {sq} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* 4. Rep Roster with Stepper Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Individual Rep Quotas & Targets
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{displayedMembers.length} Reps in view</span>
            </div>

            <div className="space-y-2.5">
              {displayedMembers.map((m) => {
                const draft = draftTargets[m.id];
                const currentSalesTgt = draft?.salesTarget ?? (m.salesTarget && m.salesTarget > 0 ? m.salesTarget : 200000);
                const currentCallsTgt = draft?.goalCalls ?? (m.goalCalls && m.goalCalls > 0 ? m.goalCalls : 60);
                const mAchieved = m.salesAchieved || 0;
                const mPct = Math.round((mAchieved / Math.max(1, currentSalesTgt)) * 100);

                return (
                  <div 
                    key={m.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Rep Info */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-[#0A2540] block truncate">{m.name}</span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {m.group || 'Sales'} · Won: {inr(mAchieved)} ({mPct}%)
                          </span>
                        </div>
                      </div>

                      {/* Controls Grid */}
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        {/* Daily Calls Stepper */}
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Daily Calls</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <button
                              type="button"
                              onClick={() => handleAdjustCalls(m.id, -10)}
                              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                              title="-10 calls"
                            >
                              -
                            </button>
                            <div className="relative w-16">
                              <input
                                type="text"
                                value={currentCallsTgt}
                                onChange={(e) => handleDirectCallsChange(m.id, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 text-xs font-mono font-bold text-[#0A2540] text-center focus:outline-none focus:border-[#00C9A7]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAdjustCalls(m.id, 10)}
                              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                              title="+10 calls"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Monthly Sales Stepper */}
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Monthly Sales</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <button
                              type="button"
                              onClick={() => handleAdjustSales(m.id, -25000)}
                              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                              title="-₹25,000"
                            >
                              -
                            </button>
                            <div className="relative w-24">
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">₹</span>
                              <input
                                type="text"
                                value={currentSalesTgt}
                                onChange={(e) => handleDirectSalesChange(m.id, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-4 pr-1 py-0.5 text-xs font-mono font-black text-[#0A2540] text-right focus:outline-none focus:border-[#00C9A7]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAdjustSales(m.id, 25000)}
                              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                              title="+₹25,000"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mini Progress */}
                    <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          mPct >= 100 ? 'bg-emerald-500' : mPct >= 50 ? 'bg-[#00C9A7]' : 'bg-amber-400'
                        }`}
                        style={{ width: `${Math.min(100, mPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs active:scale-95 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00C9A7] to-[#00B4D8] hover:from-[#00B899] hover:to-[#00A0C2] text-[#0A2540] font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-[#00C9A7]/25 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {isSaving ? 'Saving Globally...' : `Save & Globally Sync All Targets (${inr(totalDraftSalesTarget)})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
