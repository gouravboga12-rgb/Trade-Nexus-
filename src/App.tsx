import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { BottomNav } from './components/layout/BottomNav';
import { MobileHeader } from './components/layout/MobileHeader';
import { TradeNexusLogo } from './components/common/TradeNexusLogo';

// Auth Flow Views
import { EmployeeLoginView } from './views/auth/EmployeeLoginView';
import { TeamLeaderLoginView } from './views/auth/TeamLeaderLoginView';
import { HrLoginView } from './views/auth/HrLoginView';
import { AdminLoginView } from './views/auth/AdminLoginView';
import { FaceScanAttendanceView } from './views/auth/FaceScanAttendanceView';
import { AttendanceSuccessView } from './views/auth/AttendanceSuccessView';

// Modals
import { FaceIdScannerModal } from './components/modals/FaceIdScannerModal';
import { QuickCallLogModal } from './components/modals/QuickCallLogModal';
import { ApplyLeaveModal } from './components/modals/ApplyLeaveModal';
import { DigitalIdCardModal } from './components/modals/DigitalIdCardModal';
import { OfferLetterModal } from './components/modals/OfferLetterModal';
import { PayslipDetailModal } from './components/modals/PayslipDetailModal';
import { RecentPayslipsModal } from './components/modals/RecentPayslipsModal';
import { DevSettingsModal } from './components/common/DevSettingsModal';
import { LiveVideoRoomModal } from './components/modals/LiveVideoRoomModal';

// Mobile Views
import { TelecallerHomeView } from './views/TelecallerHomeView';
import { DailyCallingView } from './views/DailyCallingView';
import { ClientsPipelineView } from './views/ClientsPipelineView';
import { AttendanceLeavesView } from './views/AttendanceLeavesView';
import { ProfileSelfServiceView } from './views/ProfileSelfServiceView';
import { AllModulesMenuView } from './views/AllModulesMenuView';

// Desktop Widescreen Views
import { DesktopTelecallerHome } from './views/desktop/DesktopTelecallerHome';
import { DesktopDailyCalling } from './views/desktop/DesktopDailyCalling';
import { DesktopClientsPipeline } from './views/desktop/DesktopClientsPipeline';
import { DesktopAttendanceLeaves } from './views/desktop/DesktopAttendanceLeaves';
import { DesktopProfile } from './views/desktop/DesktopProfile';
import { DesktopTeamLeaderView } from './views/desktop/DesktopTeamLeaderView';
import { DesktopHrView } from './views/desktop/DesktopHrView';
import { DesktopAdminView } from './views/desktop/DesktopAdminView';

// Mobile Management Views
import { TeamLeaderDashboardView } from './views/TeamLeaderDashboardView';
import { HrDashboardView } from './views/HrDashboardView';
import { AdminDashboardView } from './views/AdminDashboardView';

import { 
  Home, 
  PhoneCall, 
  Users, 
  CalendarCheck, 
  User, 
  Bell, 
  Search, 
  Plus, 
  UserCheck, 
  Shield, 
  ChevronDown,
  LogOut,
  ScanFace,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
  Award,
  Crown,
  FileSpreadsheet,
  FileText,
  UserPlus,
  Video,
  DollarSign
} from 'lucide-react';
import { NavTab, UserRole } from './types';

export const App: React.FC = () => {
  const { 
    authStep,
    setAuthStep,
    logout,
    currentRole, 
    setCurrentRole, 
    activeTab, 
    setActiveTab, 
    activeToast,
    selectedPayslip,
    isPayslipModalOpen,
    setIsPayslipModalOpen, 
    profile, 
    stats, 
    clients,
    assignedLeads,
    teamMembers,
    teamGroups,
    leaveRequests,
    paymentVerifications,
    setIsFaceIdModalOpen, 
    setIsQuickCallModalOpen, 
    setIsExcelUploadModalOpen,
    currentUser,
    isDataLoading,
    backendError,
    invalidateAll,
    triggerToast
  } = useApp();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isMobileRoleMenuOpen, setIsMobileRoleMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const q = globalSearch.trim().toLowerCase();
  const matchingPeople = q
    ? teamMembers.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.empCode.toLowerCase().includes(q) ||
          (m.group && m.group.toLowerCase().includes(q))
      )
    : [];
  const matchingLeads = q
    ? assignedLeads.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.company && l.company.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q))
      )
    : [];

  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  const backendBanner = (backendError && isLocalhost) ? (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-rose-600 text-white text-xs font-bold px-4 py-2 text-center shadow-lg">
      Backend unreachable — showing empty data. {backendError}
    </div>
  ) : (isDataLoading && isLocalhost) ? (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-[#0A2540] text-[#00C9A7] text-xs font-bold px-4 py-1.5 text-center">
      Loading live data from SQLite…
    </div>
  ) : null;

  // 1. If currently in the 4-step Authentication / Face ID flow, render the active step
  if (authStep === 'LOGIN' || authStep === 'FACE_SCAN' || authStep === 'ATTENDANCE_SUCCESS') {
    return (
      <div className="relative min-h-screen">
        {backendBanner}
        {authStep === 'LOGIN' && (
          currentRole === 'team_leader' ? <TeamLeaderLoginView /> :
          currentRole === 'hr' ? <HrLoginView /> :
          currentRole === 'admin' ? <AdminLoginView /> :
          <EmployeeLoginView />
        )}
        {authStep === 'FACE_SCAN' && <FaceScanAttendanceView />}
        {authStep === 'ATTENDANCE_SUCCESS' && <AttendanceSuccessView />}
        
        {/* Floating Notification Toast */}
        {activeToast && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#0A2540] text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl border border-[#00C9A7]/40 flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
            <span>{activeToast}</span>
          </div>
        )}

        {/* Dev Settings Modal accessible on Login & Face Scan */}
        <DevSettingsModal />
      </div>
    );
  }

  // 2. Dynamic Desktop Navigation Items tailored to Current Role
  const getDesktopNavLinks = () => {
    if (currentRole === 'team_leader') {
      const pendingCount = leaveRequests.filter(r => r.status === 'PENDING').length;
      return [
        { id: 'home', label: 'Dashboard & Overview', icon: Home },
        { id: 'team', label: 'Team Members & CRM', icon: Users },
        { id: 'approvals', label: 'Leave Approvals', icon: CheckCircle2, badge: pendingCount },
        { id: 'reports', label: 'Performance Reports', icon: TrendingUp },
        { id: 'meetings', label: 'Team Meetings', icon: Video },
      ];
    }

    if (currentRole === 'hr') {
      const pendingLeaves = leaveRequests.filter(r => r.status === 'PENDING').length;
      const pendingPays = paymentVerifications.filter(p => p.status === 'PENDING_HR_AUDIT').length;
      return [
        { id: 'home', label: 'HR Overview', icon: Home },
        { id: 'employees', label: 'Employee Directory', icon: Users },
        { id: 'interviews', label: 'Interviews & Hiring', icon: UserCheck },
        { id: 'payroll', label: 'Payroll & Payslips', icon: FileText },
        { id: 'clearances', label: 'Clearances & Approvals', icon: ShieldCheck, badge: pendingLeaves + pendingPays },
      ];
    }

    if (currentRole === 'admin') {
      const awaitingApproval = paymentVerifications.filter(p => p.status === 'PENDING_HR_AUDIT').length;
      return [
        { id: 'home', label: 'Overview', icon: Home },
        { id: 'people', label: 'People', icon: Users },
        { id: 'attendance', label: 'Attendance Report', icon: CalendarCheck },
        { id: 'leads', label: 'Lead Allocation', icon: FileSpreadsheet },
        { id: 'revenue', label: 'Revenue & Won Deals', icon: DollarSign },
        { id: 'approvals', label: 'Approvals & Audits', icon: CheckCircle2, badge: awaitingApproval },
        { id: 'reports', label: 'Reports', icon: TrendingUp },
      ];
    }

    // Default: Telecaller / SDR
    return [
      { id: 'home', label: 'Home Dashboard', icon: Home },
      { id: 'calling', label: 'My Calls', icon: PhoneCall },
      { id: 'clients', label: 'Won Deals', icon: Award },
      { id: 'leaves', label: 'Attendance & Leave', icon: CalendarCheck },
      { id: 'profile', label: 'Me', icon: User },
    ];
  };

  // Header User Profile details based on active role
  const getHeaderUserInfo = () => {
    const activeName = currentUser?.name || profile.name;
    const computeInitials = (fallback: string) =>
      activeName
        ? activeName
            .trim()
            .split(' ')
            .filter(Boolean)
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : fallback;

    if (currentRole === 'team_leader') {
      return {
        initials: computeInitials('TL'),
        name: activeName || 'Team Leader',
        roleTitle: 'Team Leader Portal'
      };
    }
    if (currentRole === 'hr') {
      return {
        initials: computeInitials('HR'),
        name: activeName || 'HR Manager',
        roleTitle: 'People Operations'
      };
    }
    if (currentRole === 'admin') {
      return {
        initials: computeInitials('AD'),
        name: activeName || 'Super Admin',
        roleTitle: 'Global Master Controller'
      };
    }
    return {
      initials: computeInitials('EM'),
      name: activeName || 'Employee',
      roleTitle: profile.roleTitle || 'Sales Executive'
    };
  };

  // 3. Full Workspace once authenticated
  const renderActiveView = (isDesktop: boolean = false) => {
    if (isDesktop) {
      if (currentRole === 'team_leader') {
        return <DesktopTeamLeaderView currentTab={activeTab} onTabChange={(tab) => setActiveTab(tab as any)} />;
      }
      if (currentRole === 'hr') {
        return <DesktopHrView currentTab={activeTab} onTabChange={(tab) => setActiveTab(tab as any)} />;
      }
      if (currentRole === 'admin') {
        return <DesktopAdminView currentTab={activeTab} onTabChange={(tab) => setActiveTab(tab as any)} />;
      }

      // Telecaller Desktop Widescreen
      switch (activeTab) {
        case 'home':
          return <DesktopTelecallerHome />;
        case 'calling':
          return <DesktopDailyCalling />;
        case 'clients':
          return <DesktopClientsPipeline />;
        case 'leaves':
          return <DesktopAttendanceLeaves />;
        case 'profile':
        case 'menu':
          return <DesktopProfile />;
        default:
          return <DesktopTelecallerHome />;
      }
    }

    // Mobile View (Screens < 1024px) - Dedicated Native Mobile App Views
    if (currentRole === 'team_leader') {
      return <TeamLeaderDashboardView />;
    }
    if (currentRole === 'hr') {
      return <HrDashboardView />;
    }
    if (currentRole === 'admin') {
      return <AdminDashboardView />;
    }

    switch (activeTab) {
      case 'home':
        return <TelecallerHomeView />;
      case 'calling':
        return <DailyCallingView />;
      case 'clients':
        return <ClientsPipelineView />;
      case 'leaves':
        return <AttendanceLeavesView />;
      case 'profile':
        return <ProfileSelfServiceView />;
      case 'menu':
        return <AllModulesMenuView />;
      default:
        return <TelecallerHomeView />;
    }
  };

  const handleRoleSelect = (r: UserRole) => {
    // Drop cached data so the new portal loads its own resources fresh
    invalidateAll();
    setCurrentRole(r);
    setActiveTab('home');
    setAuthStep('AUTHENTICATED');
    setIsRoleDropdownOpen(false);
    setIsMobileRoleMenuOpen(false);
    triggerToast(`Switched to ${r.toUpperCase().replace('_', ' ')} Workspace`);
  };

  const userInfo = getHeaderUserInfo();
  const desktopNavLinks = getDesktopNavLinks();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 selection:bg-[#00C9A7]/20">
      {backendBanner}

      {/* 1. DESKTOP WORKSPACE (Screens >= 1024px) */}
      <div className="hidden lg:flex flex-col min-h-screen">
        
        {/* Desktop Top Global Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs h-[65px]">
          <div className="flex items-center gap-8 flex-1 max-w-2xl">
            <TradeNexusLogo size="md" />

            {/* Global Search Bar - Expanded into freed header space */}
            <div className="relative flex-1 max-w-xl">
              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 w-full text-xs focus-within:border-[#00C9A7] focus-within:bg-white focus-within:shadow-xs transition-all">
                <Search className="w-4 h-4 text-slate-400 mr-2.5 flex-shrink-0" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search leads, calls, attendance, documents..."
                  className="bg-transparent text-xs text-slate-800 focus:outline-none w-full font-medium"
                />
                {globalSearch && (
                  <button
                    onClick={() => setGlobalSearch('')}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              {globalSearch.trim().length > 1 && (
                <div className="absolute left-0 top-11 bg-white rounded-2xl shadow-xl border border-slate-200 p-2.5 w-96 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-80 overflow-y-auto">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Results ({matchingPeople.length + matchingLeads.length})
                    </span>
                    <button
                      onClick={() => setGlobalSearch('')}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Clear
                    </button>
                  </div>

                  {matchingPeople.length > 0 && (
                    <div className="mb-2">
                      <span className="text-[9px] font-bold text-teal-600 uppercase px-2">Employees</span>
                      {matchingPeople.slice(0, 4).map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setActiveTab('home');
                            setGlobalSearch('');
                          }}
                          className="p-2 hover:bg-slate-50 rounded-xl cursor-pointer flex justify-between items-center text-xs transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-800 block">{m.name}</span>
                            <span className="text-[10px] text-slate-400">{m.empCode} · {m.role}</span>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {m.group || 'No Squad'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {matchingLeads.length > 0 && (
                    <div>
                      <span className="text-[9px] font-bold text-sky-600 uppercase px-2">Assigned Leads</span>
                      {matchingLeads.slice(0, 4).map((l) => (
                        <div
                          key={l.id}
                          onClick={() => {
                            setActiveTab('clients');
                            setGlobalSearch('');
                          }}
                          className="p-2 hover:bg-slate-50 rounded-xl cursor-pointer flex justify-between items-center text-xs transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-800 block">{l.name}</span>
                            <span className="text-[10px] text-slate-400">{l.company} · {l.phone}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-600">{l.status}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {matchingPeople.length === 0 && matchingLeads.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No matching employees or leads found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Header Right Actions - Clean and uncluttered */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button 
              onClick={() => triggerToast('🔔 2 pending callbacks for today')}
              className="relative w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#0A2540] transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
            </button>

            {/* User Profile in Header */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-black text-xs shadow-sm">
                {userInfo.initials}
              </div>
              <div className="text-left">
                <span className="font-display font-bold text-xs text-[#0A2540] block leading-tight">{userInfo.name}</span>
                <span className="text-[10px] text-slate-400 font-semibold">{userInfo.roleTitle}</span>
              </div>
              <button 
                onClick={logout}
                title="Logout" 
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Desktop Body: Left Sidebar + Right Main Stage */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar */}
          <aside className="w-64 bg-white border-r border-slate-200 p-5 flex flex-col justify-between flex-shrink-0 sticky top-[65px] h-[calc(100vh-65px)]">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-2">
                Navigation
              </span>
              {desktopNavLinks.map((link) => {
                const Icon = link.icon;
                const isActive = activeTab === link.id;

                return (
                  <button
                    key={link.id}
                    onClick={() => setActiveTab(link.id as any)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-xs transition-all ${
                      isActive
                        ? 'bg-[#00C9A7] text-[#0A2540] shadow-md shadow-[#00C9A7]/20 font-extrabold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#0A2540]' : 'text-slate-400'}`} />
                      <span>{link.label}</span>
                    </div>
                    {link.badge !== undefined && link.badge > 0 && (
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isActive ? 'bg-[#0A2540] text-white' : 'bg-rose-500 text-white'
                      }`}>
                        {link.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sidebar Bottom Widget dynamically tailored to current portal */}
            <div className="space-y-3">
              
              {currentRole === 'telecaller' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Calling Goal</span>
                    <span className="font-mono font-black text-[#00A88B]">{Math.round((stats.dialsMade / stats.todayGoalCalls) * 100)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#00C9A7] rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((stats.dialsMade / stats.todayGoalCalls) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono block text-center font-medium">
                    {stats.dialsMade} of {stats.todayGoalCalls} calls completed
                  </span>
                </div>
              )}

              {currentRole === 'team_leader' && (() => {
                const totalSales = teamMembers.reduce((sum, m) => sum + (m.salesAchieved || 0), 0);
                const targetTotal = teamMembers.reduce((sum, m) => sum + (m.salesTarget || 0), 0);
                const percent = targetTotal > 0 ? Math.min(100, Math.round((totalSales / targetTotal) * 100)) : 0;
                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">Team Monthly Target</span>
                      <span className="font-mono font-black text-[#00A88B]">{percent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#00C9A7] rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono block text-center font-medium">
                      ₹{(totalSales / 100000).toFixed(2)} L of ₹{(targetTotal / 100000).toFixed(2)} L achieved
                    </span>
                  </div>
                );
              })()}

              {currentRole === 'hr' && (() => {
                const present = teamMembers.filter(m => m.attendanceStatus === 'PRESENT').length;
                const percent = Math.round((present / Math.max(1, teamMembers.length)) * 100);
                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">Workforce Attendance</span>
                      <span className="font-mono font-black text-emerald-600">{percent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono block text-center font-medium">
                      {present} of {teamMembers.length} employees on duty
                    </span>
                  </div>
                );
              })()}

              {currentRole === 'admin' && (() => {
                const active = teamMembers.filter(m => m.attendanceStatus === 'PRESENT').length;
                const percent = Math.round((active / Math.max(1, teamMembers.length)) * 100);
                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">System Active Users</span>
                      <span className="font-mono font-black text-teal-600">{percent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#00C9A7] rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono block text-center font-medium">
                      {active} active user accounts
                    </span>
                  </div>
                );
              })()}

              {/* Quick Logout Button */}
              <button
                onClick={logout}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </aside>

          {/* Right Main Stage Content Area */}
          <main className="flex-1 p-8 overflow-y-auto bg-[#F8FAFC] h-[calc(100vh-65px)]">
            {renderActiveView(true)}
          </main>

        </div>

      </div>

      {/* 2. MOBILE APP WORKSPACE (Screens < 1024px) */}
      <div className="lg:hidden flex flex-col min-h-screen w-full bg-[#F8FAFC] relative">
        {/* Global Mobile Header (Logo + Tagline on Left, Bell on Right) */}
        {activeTab !== 'profile' && <MobileHeader />}

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto">
          {renderActiveView(false)}
        </main>

        {/* Floating Role Button on Mobile */}
        <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-2 items-end">
          <div className="relative">
            <button
              onClick={() => setIsMobileRoleMenuOpen(!isMobileRoleMenuOpen)}
              title="Switch Active Role"
              className="w-12 h-12 rounded-full bg-[#0A2540] text-white flex items-center justify-center shadow-xl shadow-black/35 border-2 border-[#00C9A7] active:scale-95 transition-all relative hover:scale-105"
            >
              <Shield className="w-5 h-5 text-[#00C9A7]" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#00C9A7] text-[#0A2540] font-black text-[8px] flex items-center justify-center">
                {currentRole === 'telecaller' ? 'TC' : currentRole === 'team_leader' ? 'TL' : currentRole === 'hr' ? 'HR' : 'AD'}
              </span>
            </button>

            {/* Menu Popup */}
            {isMobileRoleMenuOpen && (
              <div className="absolute bottom-14 right-0 bg-[#0A2540] text-white rounded-2xl shadow-2xl p-2 border border-white/10 w-48 space-y-1 animate-in slide-in-from-bottom duration-150">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2.5 block py-1 border-b border-white/10">
                  Switch Active Portal
                </span>
                {(['telecaller', 'team_leader', 'hr', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleSelect(r)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      currentRole === r ? 'bg-[#00C9A7] text-[#0A2540] font-black' : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {r === 'telecaller' ? 'Telecaller / SDR' : r === 'team_leader' ? 'Team Leader' : r === 'hr' ? 'HR Portal' : 'Admin Console'}
                  </button>
                ))}

                <div className="border-t border-white/10 pt-1 mt-1">
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/20 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Test Full Login Flow</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation on Mobile only for Telecaller */}
        {currentRole === 'telecaller' && <BottomNav />}
      </div>

      {/* Floating Notification Toast */}
      {activeToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#0A2540] text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl border border-[#00C9A7]/40 flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <span>{activeToast}</span>
        </div>
      )}

      {/* All Action Modals */}
      <FaceIdScannerModal />
      <QuickCallLogModal />
      <ApplyLeaveModal />
      <DigitalIdCardModal />
      <OfferLetterModal />
      <PayslipDetailModal
        payslip={selectedPayslip}
        isOpen={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
      />
      <RecentPayslipsModal />
      <DevSettingsModal />
      <LiveVideoRoomModal />
    </div>
  );
};
