import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Layers, Save, Check } from 'lucide-react';
import { TeamGroup } from '../../types';

interface EditTeamModalProps {
  isOpen: boolean;
  team: TeamGroup | null;
  onClose: () => void;
}

const COLOURS = ['#00C9A7', '#0284C7', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];

export const EditTeamModal: React.FC<EditTeamModalProps> = ({ isOpen, team, onClose }) => {
  const { teamMembers, updateTeamGroup } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [monthlyTarget, setMonthlyTarget] = useState('200000');
  const [color, setColor] = useState(COLOURS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (team) {
      setName(team.name || '');
      setDescription(team.description || '');
      setLeaderName(team.leaderName || '');
      setMonthlyTarget(String(team.monthlyTarget || 200000));
      setColor(team.color || COLOURS[0]);
    }
  }, [team, isOpen]);

  if (!isOpen || !team) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await updateTeamGroup(team.id, {
        name: name.trim(),
        description: description.trim(),
        leaderName,
        monthlyTarget: Number(monthlyTarget) || 0,
        color,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const leaderCandidates = [...teamMembers].sort((a, b) => {
    const aLead = a.portal === 'team_leader' ? 0 : 1;
    const bLead = b.portal === 'team_leader' ? 0 : 1;
    return aLead - bLead;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-200 max-h-[92vh] overflow-y-auto">
        <div className="bg-[#0A192F] px-5 py-4 text-white flex items-center justify-between sm:rounded-t-3xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-[#00C9A7] border border-teal-500/30 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Edit Team Squad</h3>
              <p className="text-xs text-slate-400">Update team details and leader assignment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">TEAM NAME *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Enterprise Desk"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">WHAT THEY DO</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Inbound leads, VIP accounts, Renewals"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">TEAM LEADER</label>
            <select
              value={leaderName}
              onChange={(e) => setLeaderName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">— Choose a team leader —</option>
              {leaderCandidates.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} ({m.portal === 'team_leader' ? '⭐ Team Leader' : m.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">MONTHLY SALES TARGET (₹)</label>
            <input
              type="number"
              min="0"
              step="10000"
              value={monthlyTarget}
              onChange={(e) => setMonthlyTarget(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">SQUAD COLOUR</label>
            <div className="flex items-center gap-2">
              {COLOURS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? '#0A2540' : 'transparent',
                    transform: color === c ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {color === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs rounded-xl shadow-xs hover:brightness-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
