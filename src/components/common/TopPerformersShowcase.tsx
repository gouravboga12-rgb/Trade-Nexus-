import React from 'react';
import { useApp } from '../../context/AppContext';
import { Award, Trophy, Crown, Sparkles, TrendingUp, Users, Edit3, Plus, Target } from 'lucide-react';
import { TopPerformer } from '../../types';

interface TopPerformersShowcaseProps {
  onManage?: () => void;
  className?: string;
}

export const TopPerformersShowcase: React.FC<TopPerformersShowcaseProps> = ({ onManage, className = '' }) => {
  const { topPerformers, currentUser, setIsTopPerformersModalOpen } = useApp();

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  const handleOpenManage = () => {
    if (onManage) {
      onManage();
    } else {
      setIsTopPerformersModalOpen(true);
    }
  };

  // If no performers have been added yet
  if (!topPerformers || topPerformers.length === 0) {
    if (!isAdmin) return null; // Non-admins don't see an empty placeholder

    return (
      <div className={`p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-amber-100/40 to-emerald-50 border border-amber-200 shadow-xs ${className}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#0A2540] flex items-center gap-1.5">
                <span>Monthly Top Sales Performers</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono">
                  Hall of Fame
                </span>
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Spotlight your top 1, 2, or 3 sales members with photos, sales figures, and leads across all employee portals.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenManage}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0A2540] hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-sm transition-all active:scale-95 flex-shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Setup Champions</span>
          </button>
        </div>
      </div>
    );
  }

  // Active month text from first performer or fallback
  const activeMonth = topPerformers[0]?.monthYear || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Sorted by rank 1, 2, 3
  const sorted = [...topPerformers].sort((a, b) => a.rank - b.rank);

  const formatINR = (val: number) => {
    if (!val || isNaN(val)) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakhs`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return {
        label: '1st Rank',
        tag: 'Champion 👑',
        ring: 'ring-4 ring-amber-400 shadow-amber-200/50',
        bg: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white',
        border: 'border-amber-300 bg-amber-50/40',
        crownColor: 'text-amber-500',
        pillBg: 'bg-amber-100 text-amber-900 border-amber-300',
        icon: <Crown className="w-3.5 h-3.5 text-amber-600" />,
      };
    }
    if (rank === 2) {
      return {
        label: '2nd Rank',
        tag: 'Runner Up 🥈',
        ring: 'ring-4 ring-slate-300 shadow-slate-200/50',
        bg: 'bg-gradient-to-br from-slate-400 to-slate-500 text-white',
        border: 'border-slate-200 bg-slate-50/40',
        crownColor: 'text-slate-400',
        pillBg: 'bg-slate-100 text-slate-800 border-slate-300',
        icon: <Award className="w-3.5 h-3.5 text-slate-500" />,
      };
    }
    return {
      label: '3rd Rank',
      tag: '2nd Runner Up 🥉',
      ring: 'ring-4 ring-amber-700/60 shadow-amber-900/20',
      bg: 'bg-gradient-to-br from-amber-700 to-amber-800 text-white',
      border: 'border-amber-200/80 bg-orange-50/30',
      crownColor: 'text-amber-700',
      pillBg: 'bg-orange-100 text-amber-900 border-amber-300',
      icon: <Award className="w-3.5 h-3.5 text-amber-700" />,
    };
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A2540] via-[#0E3359] to-[#0A2540] text-white p-4 sm:p-5 shadow-lg border border-slate-800/80 ${className}`}>
      {/* Background Glow Accents */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                <span>Top Sales Champions</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {activeMonth}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              Monthly top cleared revenue &amp; closed marketing leads
            </p>
          </div>
        </div>

        {/* Admin Manage Action */}
        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenManage}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white hover:text-amber-300 border border-white/20 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
            title="Edit top performers, sales numbers, or photos"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Manage Champions</span>
          </button>
        )}
      </div>

      {/* Champions Podium Grid */}
      <div className={`relative z-10 pt-4 grid gap-3 sm:gap-4 ${
        sorted.length === 1
          ? 'grid-cols-1 max-w-md mx-auto'
          : sorted.length === 2
          ? 'grid-cols-1 sm:grid-cols-2'
          : 'grid-cols-1 md:grid-cols-3'
      }`}>
        {sorted.map((p) => {
          const styling = getRankBadge(p.rank);
          const isGold = p.rank === 1;

          return (
            <div
              key={p.id || p.rank}
              className={`relative rounded-2xl p-4 transition-all duration-200 border flex flex-col justify-between ${
                isGold 
                  ? 'bg-gradient-to-b from-white/15 to-white/5 border-amber-400/40 shadow-md ring-1 ring-amber-400/30' 
                  : 'bg-white/10 hover:bg-white/15 border-white/10'
              }`}
            >
              {/* Crown for #1 */}
              {isGold && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md border border-amber-300">
                  <Crown className="w-3 h-3 fill-slate-900" />
                  <span>#1 Top Performer</span>
                </div>
              )}

              <div className="flex items-start gap-3.5">
                {/* Photo / Avatar */}
                <div className="relative flex-shrink-0">
                  {p.photoUrl ? (
                    <img
                      src={p.photoUrl}
                      alt={p.employeeName}
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shadow-md ${styling.ring}`}
                    />
                  ) : (
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-display font-black text-lg text-white shadow-md ${styling.bg} ${styling.ring}`}>
                      {p.employeeName.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Rank Badge Indicator */}
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shadow-md ${styling.bg} border border-white/50`}>
                    #{p.rank}
                  </div>
                </div>

                {/* Performer Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase font-mono ${
                      isGold ? 'bg-amber-400/30 text-amber-300' : 'bg-white/20 text-slate-200'
                    }`}>
                      {styling.label}
                    </span>
                    {p.badgeNote && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {p.badgeNote}
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm sm:text-base text-white truncate mt-1" title={p.employeeName}>
                    {p.employeeName}
                  </h4>
                  <p className="text-xs text-slate-300 truncate font-medium">
                    {p.designation}
                  </p>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="mt-3.5 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-left">
                {/* Sales Cleared */}
                <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-300 font-medium block">
                    Sales Cleared
                  </span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-emerald-400 block mt-0.5 truncate" title={`₹${p.salesAmount.toLocaleString('en-IN')}`}>
                    {formatINR(p.salesAmount)}
                  </span>
                </div>

                {/* Marketing Leads Closed */}
                <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-300 font-medium block">
                    Leads Closed
                  </span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-amber-300 block mt-0.5 truncate">
                    {p.leadsClosedCount || 0} Leads
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
