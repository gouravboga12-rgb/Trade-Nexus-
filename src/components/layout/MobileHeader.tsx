import React from 'react';
import { useApp } from '../../context/AppContext';
import { TradeNexusLogo } from '../common/TradeNexusLogo';
import { Bell } from 'lucide-react';

export const MobileHeader: React.FC = () => {
  const { triggerToast, currentUser, profile, currentRole } = useApp();

  const activeName = currentUser?.name || profile?.name;
  const initials = activeName
    ? activeName
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : currentRole === 'admin'
    ? 'AD'
    : currentRole === 'hr'
    ? 'HR'
    : currentRole === 'team_leader'
    ? 'TL'
    : 'EM';

  const roleLabel =
    currentRole === 'admin'
      ? 'Admin'
      : currentRole === 'hr'
      ? 'HR'
      : currentRole === 'team_leader'
      ? 'Leader'
      : 'Sales';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2 flex items-center justify-between shadow-xs">
      {/* Official Trade Nexus Logo with Text */}
      <TradeNexusLogo size="sm" showText={true} />

      {/* Right: Authenticated User Badge & Notification Bell */}
      <div className="flex items-center gap-2">
        {activeName && (
          <div 
            title={`Signed in as ${activeName} (${roleLabel})`}
            className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 pl-2 pr-1 py-1 rounded-xl shadow-2xs max-w-[130px]"
          >
            <span className="text-[11px] font-bold text-[#0A2540] truncate">
              {activeName.split(' ')[0]}
            </span>
            <span className="w-5 h-5 rounded-md bg-[#0A2540] text-[#00C9A7] font-black text-[9px] flex items-center justify-center flex-shrink-0">
              {initials}
            </span>
          </div>
        )}

        <button
          onClick={() => triggerToast(`👤 Signed in as ${activeName || 'User'} (${roleLabel})`)}
          className="relative w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#0A2540] shadow-2xs active:scale-95 transition-all flex-shrink-0"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
};
