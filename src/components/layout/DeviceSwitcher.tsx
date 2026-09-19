import React from 'react';
import { Smartphone, Monitor, Shield, TrendingUp, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

export const DeviceSwitcher: React.FC = () => {
  const { deviceMode, setDeviceMode, currentRole, setCurrentRole, triggerToast } = useApp();

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    const roleLabels: Record<UserRole, string> = {
      telecaller: 'Sales Portal',
      employee: 'Employee Portal',
      team_leader: 'Team Leader Portal',
      hr: 'HR Management Console',
      admin: 'Super Admin Control Center'
    };
    triggerToast(`Switched view to: ${roleLabels[role]}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0A2540] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md border-b border-white/10">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        {/* Trade Nexus Circular Logo */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00C9A7] via-[#00B4D8] to-[#38E1B7] p-0.5 shadow-md shadow-[#00C9A7]/30 flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-[#0A2540] flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-[#00C9A7]" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-base tracking-wider text-white">
              TRADE NEXUS
            </span>
            <span className="text-[9px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-full bg-[#00C9A7]/20 text-[#38E1B7] border border-[#00C9A7]/30">
              Live Preview
            </span>
          </div>
          <p className="text-[10px] text-slate-300 font-medium tracking-wide">
            CONNECT • CONVERT • GROW
          </p>
        </div>
      </div>

      {/* Role Switcher Pills */}
      <div className="flex items-center gap-1 bg-[#061B2F] p-1 rounded-xl border border-white/10">
        <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
          <Shield className="w-3 h-3 text-[#00C9A7]" />
          <span className="hidden sm:inline">Role:</span>
        </span>

        {(['telecaller', 'team_leader', 'hr', 'admin'] as UserRole[]).map((r) => {
          const labels: Record<UserRole, string> = {
            telecaller: 'Employee',
            employee: 'Employee',
            team_leader: 'Team Leader',
            hr: 'HR Portal',
            admin: 'Admin Console'
          };

          const isCurrent = currentRole === r;

          return (
            <button
              key={r}
              onClick={() => handleRoleChange(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                isCurrent
                  ? 'bg-[#00C9A7] text-[#0A2540] shadow-md shadow-[#00C9A7]/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {labels[r]}
            </button>
          );
        })}
      </div>

      {/* Device Viewport Toggle (Mobile Frame vs Full Desktop) */}
      <div className="flex items-center gap-1 bg-[#061B2F] p-1 rounded-xl border border-white/10">
        <button
          onClick={() => setDeviceMode('mobile')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            deviceMode === 'mobile'
              ? 'bg-[#00C9A7] text-[#0A2540] shadow-md shadow-[#00C9A7]/30'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile App Frame</span>
        </button>

        <button
          onClick={() => setDeviceMode('desktop')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            deviceMode === 'desktop'
              ? 'bg-[#00C9A7] text-[#0A2540] shadow-md shadow-[#00C9A7]/30'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Full Desktop</span>
        </button>
      </div>
    </header>
  );
};
