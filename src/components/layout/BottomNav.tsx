import React from 'react';
import { 
  Home, 
  Users, 
  PhoneCall, 
  CalendarCheck, 
  User, 
  CheckCircle2, 
  TrendingUp, 
  Video, 
  UserCheck, 
  FileText, 
  ShieldCheck, 
  FileSpreadsheet,
  Award
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BottomNav: React.FC = () => {
  const { currentRole, activeTab, setActiveTab, leaveRequests, paymentVerifications } = useApp();

  const getTabs = () => {
    if (currentRole === 'team_leader') {
      // Team Leader only sees PENDING_TEAM_LEADER leaves
      const pendingLeaves = leaveRequests.filter(r => r.approvalStage === 'PENDING_TEAM_LEADER' || (!r.approvalStage && r.status === 'PENDING')).length;
      return [
        { id: 'home', label: 'Dashboard', icon: Home },
        { id: 'team', label: 'Team', icon: Users },
        { id: 'approvals', label: 'Approvals', icon: CheckCircle2, badge: pendingLeaves },
        { id: 'reports', label: 'Reports', icon: TrendingUp },
        { id: 'meetings', label: 'Meetings', icon: Video },
      ];
    }

    if (currentRole === 'hr') {
      // HR only sees PENDING_HR stage leaves
      const pendingLeaves = leaveRequests.filter(r => r.approvalStage === 'PENDING_HR' || (!r.approvalStage && r.status === 'PENDING')).length;
      const pendingPays = paymentVerifications.filter(p => p.status === 'PENDING_HR_AUDIT').length;
      return [
        { id: 'home', label: 'Overview', icon: Home },
        { id: 'employees', label: 'People', icon: Users },
        { id: 'interviews', label: 'Hiring', icon: UserCheck },
        { id: 'payroll', label: 'Payroll', icon: FileText },
        { id: 'clearances', label: 'Audits', icon: ShieldCheck, badge: pendingLeaves + pendingPays },
      ];
    }

    if (currentRole === 'admin') {
      const awaitingApproval = paymentVerifications.filter(p => p.status === 'PENDING_HR_AUDIT').length;
      return [
        { id: 'home', label: 'Overview', icon: Home },
        { id: 'people', label: 'People', icon: Users },
        { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
        { id: 'leads', label: 'Leads', icon: FileSpreadsheet },
        { id: 'approvals', label: 'Approvals', icon: CheckCircle2, badge: awaitingApproval },
        { id: 'reports', label: 'Reports', icon: TrendingUp },
      ];
    }

    // Default: Telecaller / SDR
    return [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'calling', label: 'My Calls', icon: PhoneCall },
      { id: 'clients', label: 'Won Deals', icon: Award },
      { id: 'leaves', label: 'Attendance', icon: CalendarCheck },
      { id: 'profile', label: 'Profile', icon: User },
    ];
  };

  const tabs = getTabs();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 pb-safe flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`relative flex flex-col items-center justify-center flex-1 py-0.5 px-0.5 transition-all duration-200 ${
              isActive ? 'text-[#00A88B]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`w-11 h-7 rounded-full flex items-center justify-center transition-all relative ${
              isActive ? 'bg-[#D7F5EE] text-[#00A88B]' : 'text-slate-400'
            }`}>
              <Icon className="w-4 h-4" />
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className={`text-[9px] mt-0.5 font-bold truncate max-w-[60px] ${isActive ? 'text-[#00A88B] font-extrabold' : 'text-slate-500'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
