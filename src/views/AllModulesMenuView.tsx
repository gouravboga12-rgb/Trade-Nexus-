import React from 'react';
import { useApp } from '../context/AppContext';
import { useScreenData } from '../hooks/useScreenData';
import { 
  UserCheck, 
  PhoneCall, 
  TrendingUp, 
  CalendarCheck, 
  Target, 
  CreditCard, 
  FileSpreadsheet, 
  Settings, 
  ChevronRight, 
  Shield 
} from 'lucide-react';
import { NavTab } from '../types';

export const AllModulesMenuView: React.FC = () => {
  const { profile, setActiveTab, triggerToast } = useApp();

  useScreenData('modulesMenu');

  const modules = [
    { title: 'Attendance Management', subtitle: 'Face ID logs, check-in history & calendar', icon: UserCheck, tab: 'leaves' as NavTab },
    { title: 'Production & Activity', subtitle: 'Daily calls made, outcomes & talk duration', icon: PhoneCall, tab: 'calling' as NavTab },
    { title: 'Client & Pipeline Management', subtitle: 'Track leads, follow-up alerts & conversions', icon: TrendingUp, tab: 'clients' as NavTab },
    { title: 'Leave Management', subtitle: 'Apply leave, check balance & review status', icon: CalendarCheck, tab: 'leaves' as NavTab },
    { title: 'Performance & Targets (TGT)', subtitle: 'Sales quota achievement & conversion rate', icon: Target, tab: 'home' as NavTab },
    { title: 'Payslip & ID Cards', subtitle: 'Download salary slips & official identity card', icon: CreditCard, tab: 'profile' as NavTab },
    { title: 'Reports & Analytics', subtitle: 'Weekly & monthly production statements', icon: FileSpreadsheet, action: () => triggerToast('📊 Reports center available in Admin console') },
    { title: 'Profile Settings', subtitle: 'Security, password & personal contact info', icon: Settings, tab: 'profile' as NavTab },
  ];

  return (
    <div className="flex flex-col gap-4 pb-20 pt-2 px-4 sm:px-6 lg:px-8 w-full max-w-5xl mx-auto">
      
      {/* User Header */}
      <div className="nexus-card p-4 bg-white border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00C9A7] to-[#0A2540] p-0.5">
            <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center font-bold text-base text-[#0A2540]">{profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-[#0A2540]">{profile.name}</h3>
            <p className="text-xs text-slate-500 font-semibold">{profile.roleTitle}</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold bg-[#E6FAF6] text-[#00A88B] px-2.5 py-1 rounded-full">
          {profile.empCode}
        </span>
      </div>

      {/* Modules List */}
      <div>
        <h4 className="font-display font-bold text-xs text-slate-500 uppercase tracking-wider px-1 mb-2">All System Modules</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {modules.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <div
                key={idx}
                onClick={() => {
                  if (mod.action) {
                    mod.action();
                  } else if (mod.tab) {
                    setActiveTab(mod.tab);
                  }
                }}
                className="nexus-card p-3.5 bg-white border border-slate-200 shadow-sm hover:border-[#00C9A7] flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E6FAF6] text-[#00A88B] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-display font-bold text-sm text-[#0A2540]">{mod.title}</h5>
                    <p className="text-[11px] text-slate-500">{mod.subtitle}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
