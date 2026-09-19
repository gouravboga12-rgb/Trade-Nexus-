import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Target, TrendingUp, Users, Check, Sparkles, RefreshCw, Layers } from 'lucide-react';
import { TeamMember } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const inrShort = (n: number) => {
  if (n >= 100000) {
    return `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  }
  return inr(n);
};

export const AdminTargetSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { teamMembers, updateEmployee, triggerToast } = useApp();

  const [draftTargets, setDraftTargets] = useState<Record<string, number>>({});
  const [bulkTargetInput, setBulkTargetInput] = useState('200000');
  const [isSaving, setIsSaving] = useState(false);
  const [activeSquadFilter, setActiveSquadFilter] = useState<string>('ALL');

  // Filter telecallers and sales reps
  const salesMembers = teamMembers.filter((m) => m.portal === 'telecaller' || m.role?.toLowerCase().includes('telecaller') || m.salesTarget > 0);
  const activeMembers = salesMembers.length > 0 ? salesMembers : teamMembers;

  // Initialize draft targets from current members
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, number> = {};
      activeMembers.forEach((m) => {
        initial[m.id] = m.salesTarget || 0;
      });
      setDraftTargets(initial);
    }
  }, [isOpen, teamMembers]);

  if (!isOpen) return null;

  // Compute live aggregates based on drafts
  const totalDraftTarget = activeMembers.reduce((sum, m) => sum + (draftTargets[m.id] ?? m.salesTarget ?? 0), 0);
  const totalAchieved = activeMembers.reduce((sum, m) => sum + (m.salesAchieved || 0), 0);
  const percentAchieved = totalDraftTarget > 0 ? Math.min(100, Math.round((totalAchieved / totalDraftTarget) * 100)) : 0;

  // Extract squad list for filtering
  const squads = Array.from(new Set(activeMembers.map((m) => m.group || 'General'))).filter(Boolean);

  const displayedMembers = activeSquadFilter === 'ALL'
    ? activeMembers
    : activeMembers.filter((m) => (m.group || 'General') === activeSquadFilter);

  const handleApplyBulk = (val: number) => {
    setDraftTargets((prev) => {
      const updated = { ...prev };
      displayedMembers.forEach((m) => {
        updated[m.id] = val;
      });
      return updated;
    });
    triggerToast(`Applied ${inr(val)} target to ${displayedMembers.length} telecallers`);
  };

  const handleAdjust = (id: string, delta: number) => {
    setDraftTargets((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const handleDirectChange = (id: string, val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
    setDraftTargets((prev) => ({ ...prev, [id]: num }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let changedCount = 0;
      for (const m of activeMembers) {
        const newTgt = draftTargets[m.id];
        if (newTgt !== undefined && newTgt !== m.salesTarget) {
          await updateEmployee(m.id, { salesTarget: newTgt });
          changedCount++;
        }
      }
      triggerToast(`✓ Successfully updated sales targets for ${changedCount || activeMembers.length} members`);
      onClose();
    } catch (err) {
      console.warn('Failed to save targets:', err);
      triggerToast('✗ Could not save some targets');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-[#00C9A7]/30 text-[#00A88B] flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base text-[#0A2540]">Company Target Control</h3>
              <p className="text-[11px] text-slate-500 font-medium">Set monthly quotas for reps & squads</p>
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
          <div className="bg-gradient-to-br from-[#0A2540] to-[#123659] text-white rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block">Company Monthly Target</span>
                <span className="font-mono-nums font-black text-2xl text-white block mt-0.5">
                  {inr(totalDraftTarget)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Month Achieved</span>
                <span className="font-mono-nums font-black text-lg text-[#00C9A7] block mt-0.5">
                  {inr(totalAchieved)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#00C9A7] to-[#00B4D8] h-full rounded-full transition-all duration-300"
                  style={{ width: `${percentAchieved}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium">
                <span>{percentAchieved}% of monthly goal reached</span>
                <span>{activeMembers.length} Active Telecallers</span>
              </div>
            </div>
          </div>

          {/* 2. Fast Bulk Target Setter */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#0A2540]">
                <Sparkles className="w-3.5 h-3.5 text-[#00A88B]" />
                <span>Quick Batch Set (All Active Reps)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">1-tap apply</span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-1.5">
              {[150000, 200000, 250000, 300000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleApplyBulk(val)}
                  className="py-1.5 px-2 rounded-xl bg-white border border-slate-200 hover:border-[#00C9A7] hover:bg-teal-50/50 text-[#0A2540] font-bold text-[11px] transition-all active:scale-95 text-center cursor-pointer shadow-2xs"
                >
                  {inrShort(val)}
                </button>
              ))}
            </div>

            {/* Custom Batch Value */}
            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  value={bulkTargetInput}
                  onChange={(e) => setBulkTargetInput(e.target.value)}
                  placeholder="200000"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold text-[#0A2540] focus:outline-none focus:border-[#00C9A7]"
                />
              </div>
              <button
                type="button"
                onClick={() => handleApplyBulk(Number(bulkTargetInput) || 0)}
                className="bg-[#0A2540] hover:bg-[#123659] text-white font-black text-xs px-3.5 py-2 rounded-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
            </div>
          </div>

          {/* 3. Squad Filter Pills */}
          {squads.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveSquadFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all flex-shrink-0 cursor-pointer ${
                  activeSquadFilter === 'ALL'
                    ? 'bg-[#0A2540] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Reps ({activeMembers.length})
              </button>
              {squads.map((sq) => (
                <button
                  key={sq}
                  type="button"
                  onClick={() => setActiveSquadFilter(sq)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all flex-shrink-0 cursor-pointer ${
                    activeSquadFilter === sq
                      ? 'bg-[#0A2540] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sq}
                </button>
              ))}
            </div>
          )}

          {/* 4. Rep Roster with Stepper Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Individual Rep Quotas</span>
              <span className="text-[10px] text-slate-400 font-mono">{displayedMembers.length} Reps</span>
            </div>

            <div className="space-y-2">
              {displayedMembers.map((m) => {
                const currentTgt = draftTargets[m.id] ?? m.salesTarget ?? 200000;
                const mAchieved = m.salesAchieved || 0;
                const mPct = Math.round((mAchieved / Math.max(1, currentTgt)) * 100);

                return (
                  <div 
                    key={m.id}
                    className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
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

                      {/* Stepper + Input */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAdjust(m.id, -25000)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                          title="-₹25,000"
                        >
                          -
                        </button>

                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">₹</span>
                          <input
                            type="text"
                            value={currentTgt}
                            onChange={(e) => handleDirectChange(m.id, e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-5 pr-1.5 py-1 text-xs font-mono font-black text-[#0A2540] text-right focus:outline-none focus:border-[#00C9A7]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAdjust(m.id, 25000)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                          title="+₹25,000"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Mini Progress */}
                    <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
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
            <span>{isSaving ? 'Saving Targets...' : `Save & Sync All Targets (${inr(totalDraftTarget)})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
