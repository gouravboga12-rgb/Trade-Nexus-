import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useListDefault } from '../hooks/useListDefault';
import { useScreenData } from '../hooks/useScreenData';
import { 
  Menu,
  Bell,
  Users, 
  UserCheck, 
  FileText, 
  CreditCard, 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Download, 
  ChevronRight, 
  TrendingUp, 
  Layers, 
  Check, 
  Home,
  MoreHorizontal,
  DollarSign,
  QrCode,
  Printer,
  Shield,
  Calendar,
  Briefcase,
  ScanFace,
  Award,
  Sparkles,
  PhoneCall,
  Video,
  Send,
  Upload,
  User,
  Search,
  Clock,
  ArrowLeft,
  CalendarCheck,
  AlertCircle,
  Filter,
  Copy,
  Eye,
  EyeOff,
  Key,
  Receipt,
  ExternalLink
} from 'lucide-react';
import { OnboardingEmployee, ExitEmployee, TeamMember, TeamGroup } from '../types';
import { AddEmployeeModal } from '../components/modals/AddEmployeeModal';
import { OfferLetterModal } from '../components/modals/OfferLetterModal';
import { GenerateOfferLetterModal } from '../components/modals/GenerateOfferLetterModal';
import { DigitalIdCardModal } from '../components/modals/DigitalIdCardModal';
import { FaceRegistrationModal } from '../components/modals/FaceRegistrationModal';
import { Employee360ProfileView } from './Employee360ProfileView';
import { EmployeeAvatar } from '../components/common/EmployeeAvatar';

const formatInLakhs = (val: number) => {
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2).replace(/\.00$/, '')} L`;
  }
  return `₹${val.toLocaleString('en-IN')}`;
};

export const HrDashboardView: React.FC = () => {
  const {
    currentUser,
    profile,
    openPunchIn,
    openPunchOut,
    teamMembers,
    teamGroups,
    candidates,
    onboardingList,
    exitList,
    payslips,
    leaveRequests,
    paymentVerifications,
    offerLetters,
    setSelectedOfferLetter,
    setIsOfferLetterModalOpen,
    setIsIdCardModalOpen,
    selectedIdCardEmpId,
    setSelectedIdCardEmpId,
    openPayslipModal,
    teamMeetings,
    setIsFaceRegistrationModalOpen,
    setFaceRegistrationEmployee,
    scheduleInterview,
    scheduleTeamMeeting,
    updateCandidateStatus,
    toggleOnboardingChecklist,
    toggleExitChecklist,
    generateBulkPayslips,
    approveLeaveRequest,
    rejectLeaveRequest,
    verifyPayment,
    triggerToast 
  } = useApp();

  useScreenData('hrDashboard');

  const hrName = currentUser?.name || profile?.name || 'HR Manager';
  const hrFirstName = hrName.trim().split(' ')[0] || 'HR';
  const hrEmail = currentUser?.email || profile?.email || 'hr@tradenexus.in';
  const hrCode = currentUser?.empCode || profile?.empCode || 'HR-01';
  const hrInitials = hrName
    ? hrName
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'HR';

  const [activeHrNav, setActiveHrNav] = useState<'home' | 'attendance' | 'employees' | 'approvals' | 'reports' | 'more'>('home');
  const [selectedTeamGroup, setSelectedTeamGroup] = useState<TeamGroup | null>(null);
  const [selectedEmployeeFor360, setSelectedEmployeeFor360] = useState<TeamMember | null>(null);
  
  // Search & Filter for Team Roster
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ON_LEAVE'>('ALL');

  // Dedicated More Tab: Assets, Credentials & History Registry
  const [moreSubTab, setMoreSubTab] = useState<'id_cards' | 'payslips' | 'meetings' | 'offers' | 'hr_account' | 'onboard' | 'credentials' | 'interviews'>('payslips');
  const [moreSearchQuery, setMoreSearchQuery] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (empId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [empId]: !prev[empId] }));
  };

  const handleCopyCredentials = (emp: TeamMember) => {
    const credText = `Trade Nexus Staff Credentials\nName: ${emp.name}\nEmp Code: ${emp.empCode}\nLogin ID: ${emp.email || emp.phone || emp.empCode}\nPassword: ${emp.password || 'Trade@1234'}\nRole: ${emp.role}\nPortal URL: ${window.location.origin}`;
    navigator.clipboard.writeText(credText);
    triggerToast(`✓ Copied credentials for ${emp.name} to clipboard!`);
  };

  // Modals
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isGenerateOfferLetterModalOpen, setIsGenerateOfferLetterModalOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [isPayslipGenModalOpen, setIsPayslipGenModalOpen] = useState(false);

  // Payslip Generator States
  const [payrollMonth, setPayrollMonth] = useState('May');
  const [payrollYear, setPayrollYear] = useState('2025');
  const [payslipSelectionMode, setPayslipSelectionMode] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [selectedEmpIdsForPayroll, setSelectedEmpIdsForPayroll] = useState<string[]>(teamMembers.map(m => m.id));

  // Schedule Interview States
  const [candName, setCandName] = useState('');
  const [candRole, setCandRole] = useState('Senior Sales Executive');
  const [candExp, setCandExp] = useState('2+ Years in B2B Sales');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candTime, setCandTime] = useState('Tomorrow • 02:30 PM');
  const [interviewTeamScope, setInterviewTeamScope] = useState('ALL');
  const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>([]);

  const idCardEmp = teamMembers.find((m) => m.id === selectedIdCardEmpId);
  useListDefault(selectedIdCardEmpId, setSelectedIdCardEmpId, teamMembers, (m) => m.id);

  // Filtered members for Team Roster
  const filteredMembers = useMemo(() => {
    return teamMembers.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.empCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.group && m.group.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchFilter =
        attendanceFilter === 'ALL' || m.attendanceStatus === attendanceFilter;
      return matchSearch && matchFilter;
    });
  }, [teamMembers, searchQuery, attendanceFilter]);

  // Org stats derived from live backend data
  const totalTeams = teamGroups.length;
  const totalEmployees = teamMembers.length;
  const onLeaveCount = teamMembers.filter((m) => m.attendanceStatus === 'ON_LEAVE').length;
  const presentCount = teamMembers.filter((m) => m.attendanceStatus === 'PRESENT').length;
  const lateCount = teamMembers.filter((m) => m.attendanceStatus === 'LATE').length;
  const absentCount = teamMembers.filter((m) => m.attendanceStatus === 'ABSENT').length;
  const attendancePercent = Math.round((presentCount / Math.max(1, totalEmployees)) * 100);

  const lateEmployees = useMemo(() => teamMembers.filter((m) => m.attendanceStatus === 'LATE'), [teamMembers]);
  const onLeaveEmployees = useMemo(() => teamMembers.filter((m) => m.attendanceStatus === 'ON_LEAVE'), [teamMembers]);

  const totalActivities = teamMembers.reduce((sum, m) => sum + (m.dialsToday || 0), 0);
  const totalGoalCalls = teamMembers.reduce((sum, m) => sum + (m.goalCalls || 0), 0);
  const totalWonToday = useMemo(() => {
    return teamMembers.filter(m => m.salesAchieved > 0).length;
  }, [teamMembers]);

  const formatInLakhs = (amount: number) => {
    if (amount >= 100000) {
      const lakhs = (amount / 100000).toFixed(2);
      return `₹${lakhs.replace(/\.00$/, '')} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const totalSalesTarget = teamMembers.reduce((sum, m) => sum + m.salesTarget, 0);
  const totalSalesAchieved = teamMembers.reduce((sum, m) => sum + m.salesAchieved, 0);
  const targetAchievedPercent = Math.round((totalSalesAchieved / Math.max(1, totalSalesTarget)) * 100);

  const pendingApprovalsCount =
    leaveRequests.filter((r) => r.status === 'PENDING').length +
    paymentVerifications.filter((p) => p.status === 'PENDING_HR_AUDIT').length;

  // Leave Approvals & Sanctions States
  const [leaveApprovalTab, setLeaveApprovalTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [approvedCategoryFilter, setApprovedCategoryFilter] = useState<'ALL' | 'Casual Leave' | 'Sick Leave' | 'Earned / Paid Leave'>('ALL');

  const pendingLeaves = useMemo(() => leaveRequests.filter((r) => r.status === 'PENDING'), [leaveRequests]);
  const approvedLeaves = useMemo(() => leaveRequests.filter((r) => r.status === 'APPROVED'), [leaveRequests]);
  const rejectedLeaves = useMemo(() => leaveRequests.filter((r) => r.status === 'REJECTED'), [leaveRequests]);

  const approvedCasualCount = useMemo(() => approvedLeaves.filter((r) => r.leaveType === 'Casual Leave').length, [approvedLeaves]);
  const approvedSickCount = useMemo(() => approvedLeaves.filter((r) => r.leaveType === 'Sick Leave').length, [approvedLeaves]);
  const approvedEarnedCount = useMemo(() => approvedLeaves.filter((r) => r.leaveType.includes('Earned') || r.leaveType.includes('Paid')).length, [approvedLeaves]);
  const totalApprovedDays = useMemo(() => approvedLeaves.reduce((sum, r) => sum + (r.totalDays || 1), 0), [approvedLeaves]);

  const displayedApprovedLeaves = useMemo(() => {
    if (approvedCategoryFilter === 'ALL') return approvedLeaves;
    if (approvedCategoryFilter === 'Earned / Paid Leave') {
      return approvedLeaves.filter((r) => r.leaveType.includes('Earned') || r.leaveType.includes('Paid'));
    }
    return approvedLeaves.filter((r) => r.leaveType === approvedCategoryFilter);
  }, [approvedLeaves, approvedCategoryFilter]);

  const teamAnalyticsData = [
    { team: 'HNI Closers', percent: 96 },
    { team: 'Inbound Qualifiers', percent: 92 },
    { team: 'Retention Squad', percent: 88 },
    { team: 'Enterprise Growth', percent: 94 },
  ];

  const handleGeneratePayslipsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateBulkPayslips(payrollMonth, payrollYear);
    setIsPayslipGenModalOpen(false);
    triggerToast(`✓ Published ${payrollMonth} ${payrollYear} payslips for ${payslipSelectionMode === 'ALL' ? totalEmployees : selectedEmpIdsForPayroll.length} employees!`);
  };

  const handleScheduleInterviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candName.trim()) return;

    // 1. Create interview record
    scheduleInterview({
      candidateName: candName.trim(),
      roleApplied: candRole,
      experience: candExp,
      email: candEmail || `${candName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
      phone: candPhone || '+91 98765 43210',
      interviewTime: candTime,
      interviewer: selectedInterviewers.join(', ') || 'HR & Team Leader',
    });

    // 2. Dispatch Live Video Meeting to attendees' dashboards
    scheduleTeamMeeting({
      title: `Candidate Interview: ${candName} (${candRole})`,
      dateTime: candTime,
      type: 'Candidate Interview (Video Call)',
      location: 'Trade Nexus Live Room #HR-101',
      agenda: `HR & Technical screening for ${candName} applying for ${candRole}. Attendees: ${selectedInterviewers.join(', ')}`,
      attendeesCount: selectedInterviewers.length + 1,
      invitedMemberName: selectedInterviewers.join(', '),
      meetingLink: 'https://meet.tradenexus.io/interview-hr',
    });

    setCandName('');
    setIsInterviewModalOpen(false);
    triggerToast(`✓ Candidate Interview & Live Video Call dispatched to ${selectedInterviewers.join(', ')}!`);
  };

  const exportHrReportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'ID,Name,Role,Group,Attendance,Dials,Sales Target,Sales Achieved\n' +
      teamMembers
        .map(
          (m) =>
            `${m.id},"${m.name}","${m.role}","${m.group}",${m.attendanceStatus},${m.dialsToday},${m.salesTarget},${m.salesAchieved}`
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HR_Workforce_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('✓ HR Workforce Analytics Report downloaded (CSV)');
  };

  // If 360 Dossier is open, render Employee360ProfileView
  if (selectedEmployeeFor360) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] pb-24 px-3 sm:px-6 pt-2">
        <Employee360ProfileView
          member={selectedEmployeeFor360}
          onBack={() => setSelectedEmployeeFor360(null)}
          viewerRole="hr"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-slate-800 animate-in fade-in duration-150">
      
      <div className="p-4 space-y-4 max-w-lg mx-auto">

        {/* --- TAB 1: HR HOME / PULSE --- */}
        {activeHrNav === 'home' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            
            {/* HR Authenticated Identity Header */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">
                    Hello, {hrFirstName}
                  </h2>
                  <span className="text-xl">👋</span>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  HR Portal • <span className="text-[#00A88B] font-bold">{hrEmail}</span> • <span className="text-slate-400 font-mono">{hrCode}</span>
                </p>
              </div>

              {/* Avatar Badge */}
              <div className="w-10 h-10 rounded-2xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-display font-black text-xs shadow-sm border border-[#00C9A7]/30">
                {hrInitials}
              </div>
            </div>

            {/* HR Attendance Punch Lifecycle Card */}
            <div className="bg-white border border-[#00C9A7]/40 shadow-xs rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00C9A7]/15 text-[#00A88B] flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs text-[#0A2540]">My Attendance (HR Punch)</h4>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {profile.checkInTime ? `Punched in: ${profile.checkInTime}` : 'Face scan required to check in'}
                  </p>
                </div>
              </div>

              {profile.checkInTime && profile.faceIdStatus === 'VERIFIED_PRESENT' ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ Present
                  </span>
                  <button
                    type="button"
                    onClick={openPunchOut}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs border border-rose-200 transition-all active:scale-95 cursor-pointer"
                  >
                    Punch Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openPunchIn}
                  className="px-3.5 py-1.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  Punch In (Face ID)
                </button>
              )}
            </div>

            {/* 3 Top Stat Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              
              {/* Card 1: Teams */}
              <div 
                onClick={() => setActiveHrNav('employees')}
                className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-col justify-between cursor-pointer hover:border-[#00C9A7] transition-all active:scale-95"
              >
                <span className="text-[11px] font-bold text-slate-600 leading-tight mb-1">
                  Teams
                </span>
                <span className="font-display font-black text-2xl text-[#0A2540]">
                  {totalTeams}
                </span>
              </div>

              {/* Card 2: Employees */}
              <div 
                onClick={() => setActiveHrNav('employees')}
                className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-col justify-between cursor-pointer hover:border-[#00C9A7] transition-all active:scale-95"
              >
                <span className="text-[11px] font-bold text-slate-600 leading-tight mb-1">
                  Employees
                </span>
                <span className="font-display font-black text-2xl text-[#0A2540]">
                  {totalEmployees}
                </span>
              </div>

              {/* Card 3: On Leave */}
              <div 
                onClick={() => setActiveHrNav('approvals')}
                className="bg-white border border-amber-200/80 rounded-2xl p-3 shadow-xs flex flex-col justify-between cursor-pointer hover:border-amber-500 transition-all active:scale-95"
              >
                <span className="text-[11px] font-bold text-amber-700 leading-tight mb-1">
                  On Leave
                </span>
                <span className="font-display font-black text-2xl text-amber-600">
                  {onLeaveCount}
                </span>
              </div>

            </div>

            {/* Today's Floor Overview Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-[#0A2540]">
                  Today's Floor Overview
                </h3>
                <span className="text-[11px] font-bold text-[#00A88B] bg-[#E6FAF6] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00A88B] animate-pulse" />
                  Live Sync
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {/* Attendance - Real Headcount */}
                <div 
                  onClick={() => {
                    setAttendanceFilter('PRESENT');
                    setActiveHrNav('attendance');
                  }}
                  className="bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-3 shadow-xs text-center space-y-1 cursor-pointer transition-all active:scale-95 group"
                >
                  <span className="text-[10px] font-bold text-slate-500 block">Attendance</span>
                  <span className="font-display font-black text-xl text-emerald-600 block group-hover:scale-105 transition-transform">
                    {presentCount} <span className="text-xs text-slate-400 font-normal">/ {totalEmployees}</span>
                  </span>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md inline-block">
                    {attendancePercent}% On Floor
                  </span>
                </div>

                {/* Late Punch-ins - Replaces Target Achieved */}
                <div 
                  onClick={() => {
                    setAttendanceFilter('LATE');
                    setActiveHrNav('attendance');
                  }}
                  className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-3 shadow-xs text-center space-y-1 cursor-pointer transition-all active:scale-95 group"
                >
                  <span className="text-[10px] font-bold text-slate-500 block">Late Punch-ins</span>
                  <span className="font-display font-black text-xl text-amber-600 block group-hover:scale-105 transition-transform">
                    {lateCount}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md inline-block ${
                    lateCount > 0 ? 'text-amber-800 bg-amber-50 border border-amber-200/80' : 'text-slate-500 bg-slate-100'
                  }`}>
                    {lateCount > 0 ? 'Late Flagged' : 'All On Time'}
                  </span>
                </div>

                {/* Today's Revenue - Replaces Pending Approvals */}
                <div 
                  onClick={() => setActiveHrNav('employees')}
                  className="bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-3 shadow-xs text-center space-y-1 cursor-pointer transition-all active:scale-95 group"
                >
                  <span className="text-[10px] font-bold text-slate-500 block">Today's Revenue</span>
                  <span className="font-display font-black text-xl text-emerald-600 block group-hover:scale-105 transition-transform">
                    {formatInLakhs(totalSalesAchieved)}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md inline-block">
                    {totalWonToday} Won Deals
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Operations Grid (HR Quick Actions moved above attendance exceptions) */}
            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm text-[#0A2540]">
                HR Quick Actions
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                
                {/* Action 1: Onboard New Employee */}
                <button
                  onClick={() => setIsAddEmployeeModalOpen(true)}
                  className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-2 border-[#00C9A7]/60 hover:border-[#00C9A7] rounded-2xl p-3.5 shadow-sm flex items-center gap-3 text-left transition-all active:scale-95 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#00C9A7] text-slate-950 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-xs font-black text-[#0A2540] block">Onboard Employee</strong>
                    <span className="text-[10px] text-teal-800 font-medium">Create credentials</span>
                  </div>
                </button>

                {/* Action 2: Generate Offer Letter */}
                <button
                  onClick={() => setIsGenerateOfferLetterModalOpen(true)}
                  className="bg-white border border-slate-200 hover:border-[#00C9A7] rounded-2xl p-3.5 shadow-xs flex items-center gap-3 text-left transition-all active:scale-95"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-[#0A2540] block">Offer Letter</strong>
                    <span className="text-[10px] text-slate-500">Pre-onboarding form</span>
                  </div>
                </button>

                {/* Action 3: Generate Payslips */}
                <button
                  onClick={() => setIsPayslipGenModalOpen(true)}
                  className="bg-white border border-slate-200 hover:border-[#00C9A7] rounded-2xl p-3.5 shadow-xs flex items-center gap-3 text-left transition-all active:scale-95"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#E6FAF6] text-[#00A88B] flex items-center justify-center font-bold flex-shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-[#0A2540] block">Generate Payslips</strong>
                    <span className="text-[10px] text-slate-500">Select &amp; calculate</span>
                  </div>
                </button>

                {/* Action 4: ID Card Generation */}
                <button
                  onClick={() => {
                    if (!selectedIdCardEmpId && teamMembers.length > 0) {
                      setSelectedIdCardEmpId(teamMembers[0].id);
                    }
                    setIsIdCardModalOpen(true);
                  }}
                  className="bg-white border border-slate-200 hover:border-[#00C9A7] rounded-2xl p-3.5 shadow-xs flex items-center gap-3 text-left transition-all active:scale-95 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-[#0A2540] block">ID Card Generation</strong>
                    <span className="text-[10px] text-slate-500">Print &amp; QR badge</span>
                  </div>
                </button>

              </div>
            </div>

            {/* Today's Attendance Exceptions & Late Arrivals Radar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-[#0A2540] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>Today's Attendance Exceptions</span>
                </h3>
                <button 
                  onClick={() => setActiveHrNav('attendance')}
                  className="text-[11px] font-bold text-[#00A88B] hover:text-[#0A2540] transition-colors flex items-center gap-0.5"
                >
                  <span>Open Register</span>
                  <span>→</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-[#0A2540] block">
                    Punctuality &amp; Leaves Log
                  </span>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Floor Cutoff: 09:30 AM
                  </span>
                </div>

                {lateEmployees.length === 0 && onLeaveEmployees.length === 0 ? (
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>All clocked-in staff arrived on time today. Zero punctuality flags!</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Late Arrival Items */}
                    {lateEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        onClick={() => {
                          setAttendanceFilter('LATE');
                          setActiveHrNav('attendance');
                        }}
                        className="bg-amber-50/60 border border-amber-200/80 hover:border-amber-400 rounded-2xl p-2.5 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden">
                            <EmployeeAvatar
                              avatar={emp.avatar}
                              name={emp.name}
                              className="w-full h-full"
                              fallbackClassName="font-bold text-xs"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-xs font-bold text-[#0A2540] truncate group-hover:text-amber-800 transition-colors">
                                {emp.name}
                              </strong>
                              <span className="text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                {emp.group}
                              </span>
                            </div>
                            <span className="text-[10px] text-amber-700 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-500" />
                              Checked in: {emp.checkInTime || '09:42 AM'} (Late Flag)
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-amber-800 bg-white border border-amber-200 px-2 py-1 rounded-xl shadow-2xs group-hover:bg-amber-500 group-hover:text-white transition-colors flex-shrink-0">
                          Review →
                        </span>
                      </div>
                    ))}

                    {/* On-Leave Items */}
                    {onLeaveEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        onClick={() => {
                          setAttendanceFilter('ON_LEAVE');
                          setActiveHrNav('attendance');
                        }}
                        className="bg-purple-50/60 border border-purple-200/80 hover:border-purple-400 rounded-2xl p-2.5 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden">
                            <EmployeeAvatar
                              avatar={emp.avatar}
                              name={emp.name}
                              className="w-full h-full"
                              fallbackClassName="font-bold text-xs"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-xs font-bold text-[#0A2540] truncate group-hover:text-purple-800 transition-colors">
                                {emp.name}
                              </strong>
                              <span className="text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                {emp.group}
                              </span>
                            </div>
                            <span className="text-[10px] text-purple-700 font-medium">
                              Approved Leave for Today
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-purple-800 bg-white border border-purple-200 px-2 py-1 rounded-xl shadow-2xs group-hover:bg-purple-600 group-hover:text-white transition-colors flex-shrink-0">
                          Inspect →
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Official Offer Letters Feed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-[#0A2540] flex items-center gap-1.5">
                  <span>Official Offer Letters ({offerLetters.length})</span>
                </h3>
                <button
                  onClick={() => setIsGenerateOfferLetterModalOpen(true)}
                  className="text-[11px] font-bold text-[#00A88B] hover:underline"
                >
                  + Generate New
                </button>
              </div>

              <div className="space-y-2">
                {offerLetters.map((letter) => (
                  <div 
                    key={letter.id} 
                    onClick={() => {
                      setSelectedOfferLetter(letter);
                      setIsOfferLetterModalOpen(true);
                    }}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-teal-400 shadow-xs flex items-center justify-between text-xs cursor-pointer transition-all active:scale-98"
                  >
                    <div className="space-y-0.5">
                      <strong className="font-bold text-[#0A2540] block">{letter.candidateName}</strong>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {letter.roleTitle} • CTC: <span className="font-bold text-slate-700">₹{(letter.annualCtc ?? 0).toLocaleString('en-IN')}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">
                        {letter.issuedDate}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 2: DEDICATED DAILY ATTENDANCE & PUNCH REGISTER --- */}
        {activeHrNav === 'attendance' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Header: Just Attendance Heading & Compact Export Button */}
            <div className="flex items-center justify-between pt-0.5">
              <h2 className="font-display font-black text-xl text-[#0A2540]">Attendance</h2>
              <button
                onClick={exportHrReportCSV}
                className="flex items-center gap-1.5 text-xs font-bold text-[#00A88B] bg-[#E6FAF6] px-2.5 py-1.5 rounded-xl border border-[#00C9A7]/40 hover:bg-[#00C9A7] hover:text-[#0A2540] transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>

            {/* Compact 2x2 Attendance Action Filter Buttons (Just Name & Numbers, No Icons) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Tile 1: Present */}
              <button
                type="button"
                onClick={() => setAttendanceFilter('PRESENT')}
                className={`rounded-2xl py-2.5 px-3.5 shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center justify-between ${
                  attendanceFilter === 'PRESENT'
                    ? 'bg-emerald-50/70 border-2 border-[#00C9A7] shadow-xs'
                    : 'bg-white border border-slate-200/90 hover:border-[#00C9A7]'
                }`}
              >
                <span className="text-xs font-bold text-[#0A2540]">Present</span>
                <span className={`text-base font-black font-display ${attendanceFilter === 'PRESENT' ? 'text-[#00A88B]' : 'text-slate-800'}`}>
                  {presentCount}
                </span>
              </button>

              {/* Tile 2: Late */}
              <button
                type="button"
                onClick={() => setAttendanceFilter('LATE')}
                className={`rounded-2xl py-2.5 px-3.5 shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center justify-between ${
                  attendanceFilter === 'LATE'
                    ? 'bg-amber-50/70 border-2 border-amber-400 shadow-xs'
                    : 'bg-white border border-slate-200/90 hover:border-amber-400'
                }`}
              >
                <span className="text-xs font-bold text-[#0A2540]">Late</span>
                <span className={`text-base font-black font-display ${attendanceFilter === 'LATE' ? 'text-amber-600' : 'text-slate-800'}`}>
                  {lateCount}
                </span>
              </button>

              {/* Tile 3: On Leave */}
              <button
                type="button"
                onClick={() => setAttendanceFilter('ON_LEAVE')}
                className={`rounded-2xl py-2.5 px-3.5 shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center justify-between ${
                  attendanceFilter === 'ON_LEAVE'
                    ? 'bg-purple-50/70 border-2 border-purple-400 shadow-xs'
                    : 'bg-white border border-slate-200/90 hover:border-purple-400'
                }`}
              >
                <span className="text-xs font-bold text-[#0A2540]">On Leave</span>
                <span className={`text-base font-black font-display ${attendanceFilter === 'ON_LEAVE' ? 'text-purple-600' : 'text-slate-800'}`}>
                  {onLeaveCount}
                </span>
              </button>

              {/* Tile 4: All */}
              <button
                type="button"
                onClick={() => setAttendanceFilter('ALL')}
                className={`rounded-2xl py-2.5 px-3.5 shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center justify-between ${
                  attendanceFilter === 'ALL'
                    ? 'bg-slate-100 border-2 border-[#0A2540] shadow-xs'
                    : 'bg-white border border-slate-200/90 hover:border-slate-400'
                }`}
              >
                <span className="text-xs font-bold text-[#0A2540]">All</span>
                <span className={`text-base font-black font-display ${attendanceFilter === 'ALL' ? 'text-[#0A2540]' : 'text-slate-800'}`}>
                  {totalEmployees}
                </span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by employee name, code, or squad..."
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-[#00C9A7] shadow-2xs placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Attendance Register Roster (Image 1 Squircle Container & Full Content) */}
            <div className="space-y-3">
              {filteredMembers.map((member) => {
                const isPresent = member.attendanceStatus === 'PRESENT';
                const isLate = member.attendanceStatus === 'LATE';
                const isLeave = member.attendanceStatus === 'ON_LEAVE';

                // Image 1 Squircle Container Style Matching
                const squircleContainerStyle = isPresent
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                  : isLate
                  ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                  : 'bg-purple-50 text-purple-700 border border-purple-200/80';

                return (
                  <div
                    key={member.id}
                    onClick={() => setSelectedEmployeeFor360(member)}
                    className="bg-white border border-slate-200/90 hover:border-[#00C9A7] rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-[0.99] group flex flex-col gap-3"
                  >
                    {/* Top Row: Image 1 Squircle Avatar + Name/Squad + Premium Status Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Image 1 Squircle Container with Live Status Badge */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-12 h-12 rounded-2xl ${squircleContainerStyle} flex items-center justify-center font-black text-sm shadow-2xs group-hover:scale-105 transition-transform overflow-hidden`}>
                            <EmployeeAvatar avatar={member.avatar} name={member.name} className="w-full h-full" fallbackClassName="font-black text-sm" />
                          </div>
                          {/* Corner micro-indicator */}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                              isPresent ? 'bg-emerald-500' : isLate ? 'bg-amber-500' : 'bg-purple-500'
                            }`}
                          />
                        </div>

                        {/* Name & Identity */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-bold text-[#0A2540] group-hover:text-[#00A88B] transition-colors truncate">
                              {member.name}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/80 truncate">
                              {member.group || 'Inside Sales'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                            {member.empCode} • {member.role ? member.role.replace(/telecaller/gi, 'Sales Executive') : 'Sales Executive'}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge Pill */}
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 shadow-2xs ${
                          isPresent
                            ? 'bg-[#E6FAF6] text-[#00A88B] border border-[#00C9A7]/40'
                            : isLate
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-purple-50 text-purple-800 border border-purple-200'
                        }`}
                      >
                        {isPresent && <span className="w-1.5 h-1.5 rounded-full bg-[#00C9A7] animate-pulse" />}
                        {isLate && <Clock className="w-3 h-3 text-amber-600" />}
                        {isLeave && <Calendar className="w-3 h-3 text-purple-600" />}
                        <span>{member.attendanceStatus.replace('_', ' ')}</span>
                      </span>
                    </div>

                    {/* Middle: Full Content Punch Details Box (No biometric tag so punch in is fully visible) */}
                    <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5 flex items-center text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isLate ? 'text-amber-500' : isPresent ? 'text-[#00A88B]' : 'text-purple-500'}`} />
                        <span className="font-semibold text-slate-700 font-mono text-[11px] truncate">
                          {isLeave
                            ? 'Approved Leave for Today'
                            : member.checkInTime
                            ? `Punch In: ${member.checkInTime} ${isLate ? '(Late Flag • After 09:30)' : '(On Time)'}`
                            : 'Punch In: Not Logged'}
                        </span>
                      </div>
                    </div>

                    {/* Full Content: 3-Stat Matrix (Floor Productivity & Output) */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50/60 p-2 rounded-xl border border-slate-100 text-center">
                      <div className="bg-white rounded-lg py-1.5 px-1 shadow-2xs border border-slate-100/90">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Calls Today</span>
                        <strong className="text-xs font-mono font-black text-[#0A2540]">{member.dialsToday || 0} dials</strong>
                      </div>
                      <div className="bg-white rounded-lg py-1.5 px-1 shadow-2xs border border-slate-100/90">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Connected</span>
                        <strong className="text-xs font-mono font-black text-slate-700">{member.connected || Math.round((member.dialsToday || 0) * 0.42)} leads</strong>
                      </div>
                      <div className="bg-white rounded-lg py-1.5 px-1 shadow-2xs border border-slate-100/90">
                        <span className="text-[9px] text-emerald-600 block font-bold uppercase tracking-wider">Sales Won</span>
                        <strong className="text-xs font-mono font-black text-[#00A88B]">{formatInLakhs(member.salesAchieved || 0)}</strong>
                      </div>
                    </div>

                    {/* Bottom: Contact & 360 Profile link */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="text-[11px] text-slate-400 font-mono">
                        📞 {member.phone || '+91 98765 43210'}
                      </span>
                      <span className="text-[11px] font-bold text-[#00A88B] group-hover:text-[#0A2540] transition-colors flex items-center gap-1">
                        <span>Inspect 360 Profile</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredMembers.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400 font-semibold shadow-xs">
                  Nobody matches this attendance filter or search query.
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 3: TEAMS & EMPLOYEES HIERARCHY --- */}
        {activeHrNav === 'employees' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* If a team is selected -> LEVEL 2: THAT TEAM'S EMPLOYEES */}
            {/* If a team is selected -> LEVEL 2: THAT TEAM'S EMPLOYEES */}
            {selectedTeamGroup ? (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* Team Header Box with Integrated Compact Back Button (No wasted top space) */}
                <div className="bg-white border border-slate-200/90 shadow-xs rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => setSelectedTeamGroup(null)}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-[#00C9A7] text-slate-700 hover:text-[#0A2540] flex items-center justify-center transition-all active:scale-95 cursor-pointer flex-shrink-0 shadow-2xs"
                        title="Back to All Teams"
                      >
                        <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-display font-black text-sm text-[#0A2540] uppercase truncate">
                            {selectedTeamGroup.name}
                          </h3>
                          <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-md truncate">
                            TL: {selectedTeamGroup.leaderName || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const teamEmps = teamMembers.filter(m => m.group === selectedTeamGroup.name);
                      const teamPresent = teamEmps.filter(m => m.attendanceStatus === 'PRESENT').length;
                      return (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E6FAF6] text-[#00A88B] border border-[#00C9A7]/30 whitespace-nowrap flex-shrink-0">
                          {teamPresent}/{teamEmps.length} Present
                        </span>
                      );
                    })()}
                  </div>

                  <div className="h-px bg-slate-100" />

                  {/* 4 Metric Columns for this team */}
                  {(() => {
                    const teamEmps = teamMembers.filter(m => m.group === selectedTeamGroup.name);
                    const teamDials = teamEmps.reduce((s, m) => s + (m.dialsToday || 0), 0);
                    const teamGoals = teamEmps.reduce((s, m) => s + (m.goalCalls || 0), 0);
                    const teamWon = teamEmps.filter(m => m.salesAchieved > 0).length;
                    const teamRev = teamEmps.reduce((s, m) => s + (m.salesAchieved || 0), 0);
                    const teamPresent = teamEmps.filter(m => m.attendanceStatus === 'PRESENT').length;
                    const teamLate = teamEmps.filter(m => m.attendanceStatus === 'LATE').length;
                    const teamLeave = teamEmps.filter(m => m.attendanceStatus === 'ON_LEAVE').length;

                    return (
                      <>
                        <div className="grid grid-cols-4 gap-1 text-center divide-x divide-slate-100">
                          <div className="px-1">
                            <strong className="text-base font-display font-black text-[#0A2540] block leading-tight">
                              {teamEmps.length}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                              Team
                            </span>
                          </div>

                          <div className="px-1">
                            <strong className="text-base font-display font-black text-[#0A2540] block leading-tight">
                              <span className="text-[#00A88B]">{teamDials}</span>
                              <span className="text-slate-300 font-normal text-xs">/{teamGoals}</span>
                            </strong>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                              Calls
                            </span>
                          </div>

                          <div className="px-1">
                            <strong className="text-base font-display font-black text-purple-700 block leading-tight">
                              {teamWon}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                              Won
                            </span>
                          </div>

                          <div className="px-1">
                            <strong className="text-base font-display font-black text-[#00A88B] block leading-tight">
                              {formatInLakhs(teamRev)}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                              Revenue
                            </span>
                          </div>
                        </div>

                        {/* Attendance Pill status with no awkward wrapping */}
                        <div className="bg-[#E6FAF6] border border-[#00C9A7]/20 text-[#00897B] font-bold text-[10px] px-2.5 py-1 rounded-xl text-center flex items-center justify-center gap-2 whitespace-nowrap">
                          <span>{teamPresent} Present</span>
                          <span>•</span>
                          <span>{teamLate} Late</span>
                          <span>•</span>
                          <span>{teamLeave} Leave</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Search within this team */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search in ${selectedTeamGroup.name}...`}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00C9A7]"
                  />
                </div>

                {/* Filter Pills for this team */}
                {(() => {
                  const teamEmps = teamMembers.filter(m => m.group === selectedTeamGroup.name);
                  const pCount = teamEmps.filter(m => m.attendanceStatus === 'PRESENT').length;
                  const lCount = teamEmps.filter(m => m.attendanceStatus === 'LATE').length;
                  const oCount = teamEmps.filter(m => m.attendanceStatus === 'ON_LEAVE').length;

                  return (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                      <button
                        type="button"
                        onClick={() => setAttendanceFilter('ALL')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                          attendanceFilter === 'ALL'
                            ? 'bg-[#0A2540] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        All ({teamEmps.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setAttendanceFilter('PRESENT')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                          attendanceFilter === 'PRESENT'
                            ? 'bg-[#0A2540] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Present ({pCount})
                      </button>

                      <button
                        type="button"
                        onClick={() => setAttendanceFilter('LATE')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                          attendanceFilter === 'LATE'
                            ? 'bg-[#0A2540] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Late ({lCount})
                      </button>

                      <button
                        type="button"
                        onClick={() => setAttendanceFilter('ON_LEAVE')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                          attendanceFilter === 'ON_LEAVE'
                            ? 'bg-[#0A2540] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Leave ({oCount})
                      </button>
                    </div>
                  );
                })()}

                {/* Team's Employees List */}
                <div className="space-y-3">
                  {teamMembers
                    .filter(m => m.group === selectedTeamGroup.name)
                    .filter(m => {
                      const matchSearch =
                        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        m.empCode.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchFilter =
                        attendanceFilter === 'ALL' || m.attendanceStatus === attendanceFilter;
                      return matchSearch && matchFilter;
                    })
                    .map((member) => {
                      const isPresent = member.attendanceStatus === 'PRESENT';
                      const isLate = member.attendanceStatus === 'LATE';

                      const squircleStyle = isPresent
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : isLate
                        ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                        : 'bg-purple-50 text-purple-700 border border-purple-200/80';

                      return (
                        <div 
                          key={member.id}
                          onClick={() => setSelectedEmployeeFor360(member)}
                          className="bg-white border border-slate-200/90 hover:border-[#00C9A7] rounded-2xl p-3.5 shadow-xs hover:shadow-md flex flex-col gap-2.5 cursor-pointer active:scale-[0.98] transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                <div className={`w-11 h-11 rounded-2xl ${squircleStyle} flex items-center justify-center font-display font-black text-xs shadow-2xs group-hover:scale-105 transition-transform overflow-hidden`}>
                                  <EmployeeAvatar avatar={member.avatar} name={member.name} className="w-full h-full" fallbackClassName="font-display font-black text-xs" />
                                </div>
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                  isPresent ? 'bg-emerald-500' : isLate ? 'bg-amber-500' : 'bg-purple-500'
                                }`} />
                              </div>

                              <div>
                                <strong className="text-xs font-bold text-[#0A2540] group-hover:text-[#00A88B] transition-colors block">
                                  {member.name}
                                </strong>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {member.empCode} • {member.role ? member.role.replace(/telecaller/gi, 'Sales Executive') : 'Sales Executive'}
                                </span>
                              </div>
                            </div>

                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              isPresent ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-200/80' :
                              isLate ? 'bg-amber-100/90 text-amber-800 border border-amber-200/80' :
                              'bg-purple-100/90 text-purple-800 border border-purple-200/80'
                            }`}>
                              {member.attendanceStatus}
                            </span>
                          </div>

                          {/* 3 Metric Matrix */}
                          <div className="grid grid-cols-3 gap-2 bg-slate-50/70 p-1.5 rounded-xl border border-slate-100 text-center">
                            <div className="bg-white rounded-lg py-1 px-1 shadow-2xs border border-slate-100/90">
                              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Dials</span>
                              <strong className="text-xs font-mono font-black text-[#0A2540]">{member.dialsToday}</strong>
                            </div>
                            <div className="bg-white rounded-lg py-1 px-1 shadow-2xs border border-slate-100/90">
                              <span className="text-[9px] text-emerald-600 block font-bold uppercase tracking-wider">Sales</span>
                              <strong className="text-xs font-mono font-black text-[#00A88B]">{formatInLakhs(member.salesAchieved)}</strong>
                            </div>
                            <div className="bg-white rounded-lg py-1 px-1 shadow-2xs border border-slate-100/90">
                              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Interested</span>
                              <strong className="text-xs font-mono font-black text-slate-700">{member.interested || 0}</strong>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100">
                            <span className="text-slate-500 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              In: {member.checkInTime || 'Not Punched'}
                            </span>
                            <span className="px-2.5 py-1 rounded-xl bg-slate-50 group-hover:bg-[#00C9A7] text-[#0A2540] font-bold transition-colors flex items-center gap-1 shadow-2xs">
                              <span>View Profile</span>
                              <span>→</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              /* LEVEL 1: ALL TEAMS VIEW (DEFAULT) */
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* Floor Pulse Box */}
                <div className="bg-white border border-slate-200/90 shadow-xs rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-black tracking-wider text-[#0A2540] uppercase truncate">
                        Floor Pulse
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                    </div>
                    <div className="bg-[#E6FAF6] border border-[#00C9A7]/30 text-[#00897B] font-bold text-[10px] px-2.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                      {presentCount} Present • {lateCount} Late • {onLeaveCount} Leave
                    </div>
                  </div>

                  <div className="h-px bg-slate-100" />

                  <div className="grid grid-cols-4 gap-1 text-center divide-x divide-slate-100">
                    <div className="px-1">
                      <strong className="text-base font-display font-black text-[#0A2540] block leading-tight">
                        {teamGroups.length}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                        Teams
                      </span>
                    </div>

                    <div className="px-1">
                      <strong className="text-base font-display font-black text-[#0A2540] block leading-tight">
                        <span className="text-[#00A88B]">{totalActivities}</span>
                        <span className="text-slate-300 font-normal text-xs">/{totalGoalCalls}</span>
                      </strong>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                        Calls
                      </span>
                    </div>

                    <div className="px-1">
                      <strong className="text-base font-display font-black text-purple-700 block leading-tight">
                        {totalWonToday}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                        Won
                      </span>
                    </div>

                    <div className="px-1">
                      <strong className="text-base font-display font-black text-[#00A88B] block leading-tight">
                        {formatInLakhs(totalSalesAchieved)}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                        Revenue
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section Header */}
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h3 className="font-display font-black text-sm text-[#0A2540]">
                      All Sales Teams ({teamGroups.length})
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Tap a team to inspect employees, attendance &amp; daily calls
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {totalEmployees} Total Staff
                  </span>
                </div>

                {/* Teams List */}
                <div className="space-y-3">
                  {teamGroups.map((group) => {
                    const groupMembers = teamMembers.filter(m => m.group === group.name);
                    const groupPresent = groupMembers.filter(m => m.attendanceStatus === 'PRESENT').length;
                    const groupLate = groupMembers.filter(m => m.attendanceStatus === 'LATE').length;
                    const groupLeave = groupMembers.filter(m => m.attendanceStatus === 'ON_LEAVE').length;
                    const groupDials = groupMembers.reduce((s, m) => s + (m.dialsToday || 0), 0);
                    const groupSales = groupMembers.reduce((s, m) => s + (m.salesAchieved || 0), 0);

                    // Soft squircle styling based on squad type
                    const isTeal = group.name.includes('HNI');
                    const isBlue = group.name.includes('Inbound');
                    const squircleStyle = isTeal
                      ? 'bg-[#E6FAF6] text-[#00A88B] border border-[#00C9A7]/30'
                      : isBlue
                      ? 'bg-sky-50 text-sky-600 border border-sky-200/80'
                      : 'bg-amber-50 text-amber-600 border border-amber-200/80';

                    return (
                      <div
                        key={group.id}
                        onClick={() => setSelectedTeamGroup(group)}
                        className="bg-white border border-slate-200/90 hover:border-[#00C9A7] rounded-2xl p-4 shadow-xs hover:shadow-md cursor-pointer transition-all active:scale-[0.99] group space-y-3"
                      >
                        {/* Team Title & TL */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-11 h-11 rounded-2xl ${squircleStyle} flex items-center justify-center font-black text-sm shadow-2xs group-hover:scale-105 transition-transform flex-shrink-0`}>
                              <Layers className="w-5 h-5 stroke-[2.2]" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-display font-bold text-sm text-[#0A2540] group-hover:text-[#00A88B] transition-colors truncate">
                                  {group.name}
                                </h4>
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/60">
                                  {groupMembers.length} Members
                                </span>
                              </div>
                              <span className="text-xs text-slate-400 font-medium block mt-0.5 truncate">
                                Team Leader: <strong className="text-slate-600 font-bold">{group.leaderName || 'Unassigned'}</strong>
                              </span>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#E6FAF6] text-[#00A88B] border border-[#00C9A7]/30 whitespace-nowrap flex-shrink-0 shadow-2xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00C9A7] animate-pulse" />
                            <span>{groupPresent}/{groupMembers.length} Present</span>
                          </span>
                        </div>

                        {/* Team Stats Matrix */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50/70 p-2 rounded-xl border border-slate-100 text-center">
                          <div className="bg-white rounded-lg py-1 px-1 shadow-2xs border border-slate-100/90">
                            <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Calls Today</span>
                            <strong className="text-xs font-mono font-black text-[#0A2540]">{groupDials} calls</strong>
                          </div>
                          <div className="bg-white rounded-lg py-1 px-1 shadow-2xs border border-slate-100/90">
                            <span className="text-[9px] text-emerald-600 block font-bold uppercase tracking-wider">Revenue</span>
                            <strong className="text-xs font-mono font-black text-[#00A88B]">{formatInLakhs(groupSales)}</strong>
                          </div>
                          <div className="bg-white rounded-lg py-1 px-1 shadow-2xs border border-slate-100/90">
                            <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Attendance</span>
                            <strong className="text-xs font-mono font-bold text-slate-700">
                              {groupPresent}P • {groupLate}L • {groupLeave}O
                            </strong>
                          </div>
                        </div>

                        {/* Card Footer Premium App Action */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
                            {group.description || 'High-velocity client engagement team'}
                          </span>
                          <span className="px-3 py-1.5 rounded-xl bg-slate-100 group-hover:bg-[#00C9A7] text-[#0A2540] font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs group-hover:shadow-xs group-hover:translate-x-0.5">
                            <span>Open Squad</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: APPROVALS & LEAVES --- */}
        {activeHrNav === 'approvals' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Clean Executive Header (No bulky badge pill) */}
            <div>
              <h2 className="font-display font-black text-xl text-[#0A2540]">
                HR Sanctions &amp; Approvals
              </h2>
              <p className="text-xs text-slate-500">Leave applications and floor attendance governance</p>
            </div>

            {/* Sleek Segmented Control with subtle color touches */}
            <div className="bg-slate-100/90 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60 shadow-2xs">
              <button
                onClick={() => setLeaveApprovalTab('PENDING')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  leaveApprovalTab === 'PENDING'
                    ? 'bg-white text-[#0A2540] shadow-xs ring-1 ring-slate-200/70'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Pending</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  leaveApprovalTab === 'PENDING' 
                    ? 'bg-amber-500 text-white font-bold shadow-2xs' 
                    : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {pendingLeaves.length}
                </span>
              </button>

              <button
                onClick={() => setLeaveApprovalTab('APPROVED')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  leaveApprovalTab === 'APPROVED'
                    ? 'bg-white text-[#0A2540] shadow-xs ring-1 ring-slate-200/70'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Approved</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  leaveApprovalTab === 'APPROVED' 
                    ? 'bg-[#00A88B] text-white font-bold shadow-2xs' 
                    : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {approvedLeaves.length}
                </span>
              </button>

              <button
                onClick={() => setLeaveApprovalTab('REJECTED')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  leaveApprovalTab === 'REJECTED'
                    ? 'bg-white text-[#0A2540] shadow-xs ring-1 ring-slate-200/70'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Rejected</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  leaveApprovalTab === 'REJECTED' 
                    ? 'bg-rose-500 text-white font-bold shadow-2xs' 
                    : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {rejectedLeaves.length}
                </span>
              </button>
            </div>

            {/* --- SECTION 1: PENDING QUEUE --- */}
            {leaveApprovalTab === 'PENDING' && (
              <div className="space-y-3">
                {pendingLeaves.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2 shadow-xs">
                    <div className="w-10 h-10 rounded-full bg-teal-50 text-[#00A88B] flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <h4 className="font-display font-bold text-sm text-[#0A2540]">All Clear</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Zero pending leave requests. Floor attendance is fully accounted for.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingLeaves.map((req, idx) => {
                      const emp = teamMembers.find(m => m.name === req.employeeName || m.empCode === req.employeeCode);
                      
                      // Refined avatar gradients
                      const avatarGradients = [
                        'bg-gradient-to-tr from-[#00A88B] to-[#00C9A7]',
                        'bg-gradient-to-tr from-indigo-600 to-sky-400',
                        'bg-gradient-to-tr from-purple-600 to-pink-400',
                        'bg-gradient-to-tr from-blue-600 to-cyan-400',
                      ];
                      const avatarGradient = avatarGradients[idx % avatarGradients.length];

                      // Refined jewel-toned leave type tags
                      const isSick = req.leaveType === 'Sick Leave';
                      const isPaid = req.leaveType.includes('Earned') || req.leaveType.includes('Paid');
                      const leaveBadgeStyle = isSick
                        ? 'bg-rose-50 text-rose-800 border-rose-200/80'
                        : isPaid
                        ? 'bg-sky-50 text-sky-800 border-sky-200/80'
                        : 'bg-amber-50 text-amber-800 border-amber-200/80';

                      return (
                        <div key={req.id} className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-3.5 shadow-xs space-y-2.5 transition-all">
                          {/* Header: Gradient Avatar, Name, Group & Jewel Pill */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-10 h-10 rounded-full ${avatarGradient} text-white font-black text-xs flex items-center justify-center shadow-2xs flex-shrink-0 overflow-hidden`}>
                                <EmployeeAvatar
                                  avatar={emp?.avatar}
                                  name={req.employeeName || 'Employee'}
                                  className="w-full h-full rounded-full"
                                  fallbackClassName="font-black text-xs"
                                />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-[#0A2540] truncate">
                                  {req.employeeName || 'Employee'}
                                </h4>
                                <p className="text-xs text-slate-500 truncate">
                                  <span className="font-mono text-slate-600">{req.employeeCode || emp?.empCode || 'TNX'}</span>
                                  <span className="mx-1.5 text-slate-300">•</span>
                                  <span>{emp?.group || 'Inside Sales Squad'}</span>
                                </p>
                              </div>
                            </div>

                            {/* Refined Jewel-Toned Leave Tag */}
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border whitespace-nowrap flex-shrink-0 ${leaveBadgeStyle}`}>
                              {req.leaveType} • {req.totalDays}d
                            </span>
                          </div>

                          {/* Date Range & 360 Profile link (Placed right above Reject button to save card height) */}
                          <div className="flex items-center justify-between text-xs px-0.5">
                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-[#00A88B]" />
                              <span>{req.fromDate} {req.toDate !== req.fromDate ? `– ${req.toDate}` : ''}</span>
                            </div>
                            {emp ? (
                              <button
                                type="button"
                                onClick={() => setSelectedEmployeeFor360(emp)}
                                className="text-[11px] font-bold text-[#00A88B] hover:text-[#0A2540] inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                              >
                                <span>View 360 Profile</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-mono">
                                {req.appliedOn || 'Today'}
                              </span>
                            )}
                          </div>

                          {/* Refined Quote Box with Teal Accent Border */}
                          <div className="border-l-[3px] border-[#00C9A7] bg-slate-50/60 pl-3 py-1.5 rounded-r-xl border-y border-r border-slate-100">
                            <p className="text-xs text-slate-700 italic leading-relaxed">
                              "{req.reason}"
                            </p>
                          </div>

                          {/* Action Buttons: Signature Mint/Teal Gradient + Clean Outlined */}
                          <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <button
                              onClick={() => {
                                approveLeaveRequest(req.id);
                                triggerToast(`✓ Sanctioned leave for ${req.employeeName || 'Employee'}`);
                              }}
                              className="py-2 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs flex items-center justify-center gap-1.5 shadow-2xs hover:brightness-105 transition-all active:scale-98 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => {
                                rejectLeaveRequest(req.id, 'Shift coverage constraint');
                                triggerToast(`✗ Rejected leave application for ${req.employeeName || 'Employee'}`);
                              }}
                              className="py-2 rounded-xl bg-white hover:bg-rose-50/60 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-98 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* --- SECTION 2: APPROVED LEAVES WITH SLEEK FILTER --- */}
            {leaveApprovalTab === 'APPROVED' && (
              <div className="space-y-3">
                {/* Summary bar */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-[#0A2540]">
                    {approvedLeaves.length} Approved Requests
                  </span>
                  <span className="text-xs text-slate-500">
                    {totalApprovedDays} Days Total
                  </span>
                </div>

                {/* Sleek Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { id: 'ALL', label: 'All', count: approvedLeaves.length },
                    { id: 'Casual Leave', label: 'Casual', count: approvedCasualCount },
                    { id: 'Sick Leave', label: 'Sick', count: approvedSickCount },
                    { id: 'Earned / Paid Leave', label: 'Paid', count: approvedEarnedCount },
                  ].map((cat) => {
                    const isActive = approvedCategoryFilter === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setApprovedCategoryFilter(cat.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                          isActive
                            ? 'bg-[#0A2540] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        <span>{cat.label}</span>
                        <span className={`text-[10px] font-mono ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                          {cat.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Approved Cards List */}
                {displayedApprovedLeaves.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-1 shadow-xs">
                    <p className="text-xs font-bold text-[#0A2540]">No records in this category</p>
                    <p className="text-[11px] text-slate-400">
                      No approved leave applications match "{approvedCategoryFilter}".
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayedApprovedLeaves.map((req) => {
                      const emp = teamMembers.find(m => m.name === req.employeeName || m.empCode === req.employeeCode);
                      return (
                        <div key={req.id} className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-xs space-y-3 transition-all">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-slate-100 text-[#0A2540] font-bold text-xs flex items-center justify-center border border-slate-200/60 flex-shrink-0 overflow-hidden">
                                <EmployeeAvatar
                                  avatar={emp?.avatar}
                                  name={req.employeeName || 'Employee'}
                                  className="w-full h-full rounded-full"
                                  fallbackClassName="font-bold text-xs"
                                />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-[#0A2540] truncate">
                                  {req.employeeName || 'Employee'}
                                </h4>
                                <p className="text-xs text-slate-500 truncate">
                                  <span className="font-mono text-slate-600">{req.employeeCode || emp?.empCode || 'TNX'}</span>
                                  <span className="mx-1.5 text-slate-300">•</span>
                                  <span>{emp?.group || 'Inside Sales Squad'}</span>
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1 flex-shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Approved</span>
                            </span>
                          </div>

                          {/* Leave Specs */}
                          <div className="flex items-center justify-between text-xs text-slate-600 px-0.5">
                            <span className="font-semibold text-slate-800">
                              {req.leaveType} • {req.totalDays}d
                            </span>
                            <span className="text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{req.fromDate} {req.toDate !== req.fromDate ? `– ${req.toDate}` : ''}</span>
                            </span>
                          </div>

                          {/* Reason */}
                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                            <p className="text-xs text-slate-600 italic">
                              "{req.reason}"
                            </p>
                          </div>

                          {/* Sanction Stamp & 360 link */}
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                            <span className="text-[11px] text-slate-500 font-medium">
                              Sanctioned by {req.approvedBy || 'HR Admin'}
                            </span>
                            {emp && (
                              <button
                                onClick={() => setSelectedEmployeeFor360(emp)}
                                className="text-[11px] font-semibold text-[#00A88B] hover:underline flex items-center gap-0.5"
                              >
                                <span>View 360</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* --- SECTION 3: REJECTED LEAVES --- */}
            {leaveApprovalTab === 'REJECTED' && (
              <div className="space-y-3">
                {rejectedLeaves.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-1 shadow-xs">
                    <p className="text-xs font-bold text-[#0A2540]">No Rejected Requests</p>
                    <p className="text-[11px] text-slate-400">
                      There are currently zero rejected leave applications.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rejectedLeaves.map((req) => {
                      const emp = teamMembers.find(m => m.name === req.employeeName || m.empCode === req.employeeCode);
                      return (
                        <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <strong className="text-sm font-bold text-[#0A2540] block">{req.employeeName || 'Employee'}</strong>
                              <span className="text-xs text-slate-500">{req.leaveType} ({req.totalDays} Days)</span>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/80">
                              Rejected
                            </span>
                          </div>

                          <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 text-xs text-rose-800">
                            <strong>Note:</strong> {req.approvedBy || 'Operational requirements'}
                          </div>

                          {emp && (
                            <div className="text-right pt-0.5">
                              <button
                                onClick={() => setSelectedEmployeeFor360(emp)}
                                className="text-[11px] font-semibold text-slate-600 hover:underline inline-flex items-center gap-1"
                              >
                                <span>Inspect Employee 360</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 4: REPORTS & CSV EXPORTS --- */}
        {activeHrNav === 'reports' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-black text-lg text-[#0A2540]">HR Analytics &amp; Reports</h2>
                <p className="text-xs text-slate-500">Workforce roster &amp; biometric audits</p>
              </div>
              <button
                onClick={exportHrReportCSV}
                className="py-2 px-3 rounded-xl bg-[#00C9A7] text-[#0A2540] font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 block font-semibold">Total Employees</span>
                <span className="font-mono-nums font-black text-lg text-[#0A2540]">{totalEmployees} Active</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 block font-semibold">Biometric Regularity</span>
                <span className="font-mono-nums font-black text-lg text-[#00A88B]">94.2%</span>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 5: DEDICATED MORE (HR Records & Asset Registry Hub) --- */}
        {activeHrNav === 'more' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            
            {/* 3x2 Quick Action Grid: ID Card, Payslips, Meetings, Offer Letters, HR Account, Onboard (Compacted to 65% size) */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { 
                  id: 'id_cards', 
                  label: 'ID Card', 
                  icon: CreditCard, 
                  badge: `${teamMembers.length}` 
                },
                { 
                  id: 'payslips', 
                  label: 'Payslips', 
                  icon: Receipt, 
                  badge: `${payslips.length}` 
                },
                { 
                  id: 'meetings', 
                  label: 'Meetings', 
                  icon: Video, 
                  badge: `${teamMeetings.filter(m => m.type?.includes('Interview') || m.title?.includes('Interview')).length}` 
                },
                { 
                  id: 'offers', 
                  label: 'Offer Letters', 
                  icon: Award, 
                  badge: `${offerLetters.length}` 
                },
                { 
                  id: 'hr_account', 
                  label: 'HR Account', 
                  icon: Shield, 
                  badge: 'Admin' 
                },
                { 
                  id: 'onboard', 
                  label: 'Onboard', 
                  icon: UserPlus, 
                  badge: '+ New',
                  isAccent: true 
                },
              ].map((btn) => {
                const isActive = moreSubTab === btn.id || (btn.id === 'id_cards' && moreSubTab === 'credentials') || (btn.id === 'meetings' && moreSubTab === 'interviews');
                const Icon = btn.icon;

                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => {
                      setMoreSubTab(btn.id as any);
                      setMoreSearchQuery('');
                      if (btn.id === 'onboard') {
                        setIsAddEmployeeModalOpen(true);
                      }
                    }}
                    className={`py-1 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-center relative cursor-pointer active:scale-95 ${
                      isActive
                        ? 'bg-[#0A2540] text-white shadow-sm ring-1.5 ring-[#00C9A7]/60'
                        : btn.isAccent
                          ? 'bg-gradient-to-b from-teal-50/70 to-emerald-50/90 border border-teal-200 text-[#00897B] hover:border-teal-300 shadow-2xs'
                          : 'bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 shadow-2xs hover:shadow-xs'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                      isActive 
                        ? 'bg-white/10 text-[#00C9A7]' 
                        : btn.isAccent 
                          ? 'bg-teal-500/10 text-[#00A88B]' 
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <span className={`text-[9.5px] font-bold leading-tight truncate max-w-full px-0.5 ${isActive ? 'text-white' : 'text-slate-800'}`}>
                      {btn.label}
                    </span>
                    {btn.badge && (
                      <span className={`text-[7px] font-extrabold px-1.5 py-0 rounded-full leading-tight ${
                        isActive 
                          ? 'bg-[#00C9A7] text-[#0A2540]' 
                          : btn.isAccent
                            ? 'bg-[#00C9A7]/20 text-[#00897B]'
                            : 'bg-slate-100 text-slate-500'
                      }`}>
                        {btn.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* CATEGORY 1: EMPLOYEE CREDENTIALS & DIGITAL ID CARDS */}
            {(moreSubTab === 'id_cards' || moreSubTab === 'credentials') && (
              <div className="space-y-3 animate-in fade-in duration-150">
                
                {/* Search Bar (70%) + Create Button (30%) - Same height */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={moreSearchQuery}
                      onChange={(e) => setMoreSearchQuery(e.target.value)}
                      placeholder="Search name, TNX code, email..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00C9A7] shadow-2xs font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddEmployeeModalOpen(true)}
                    className="px-3 py-2 bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs rounded-xl shadow-2xs hover:brightness-105 active:scale-95 whitespace-nowrap flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer border border-[#00C9A7]/30"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Issue ID</span>
                  </button>
                </div>

                {/* Employee Credentials Cards List */}
                <div className="space-y-3">
                  {(() => {
                    const filtered = teamMembers.filter(m => 
                      m.name.toLowerCase().includes(moreSearchQuery.toLowerCase()) ||
                      m.empCode.toLowerCase().includes(moreSearchQuery.toLowerCase()) ||
                      (m.email && m.email.toLowerCase().includes(moreSearchQuery.toLowerCase())) ||
                      (m.group && m.group.toLowerCase().includes(moreSearchQuery.toLowerCase()))
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
                          No employees found matching "{moreSearchQuery}".
                        </div>
                      );
                    }

                    return filtered.map((emp) => {
                      const isPassVisible = !!visiblePasswords[emp.id];
                      const passwordDisplay = emp.password || 'Trade@1234';

                      return (
                        <div key={emp.id} className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-3.5 shadow-2xs space-y-3 transition-all">
                          {/* Header row: Avatar, Name, Code, Squad, Active Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-[#0A2540] text-[#00C9A7] font-display font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                                {emp.avatar?.startsWith('http') ? (
                                  <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                  emp.name.substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <strong className="text-xs font-bold text-[#0A2540] truncate">{emp.name}</strong>
                                  <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[9px] font-mono font-bold">
                                    {emp.empCode}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium truncate">
                                  <span className="font-bold text-slate-700">{emp.role}</span> • <span>{emp.group || 'Sales Squad'}</span>
                                </p>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                              Active Staff
                            </span>
                          </div>

                          {/* Credentials Box: Login ID & Password with Show/Hide */}
                          <div className="bg-slate-50/90 border border-slate-100 rounded-xl p-2.5 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-medium">Login ID:</span>
                              <span className="font-mono font-bold text-slate-800 selection:bg-teal-100">
                                {emp.email || emp.phone || emp.empCode}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                              <span className="text-slate-400 font-medium">Password:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#0A2540]">
                                  {isPassVisible ? passwordDisplay : '••••••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(emp.id)}
                                  className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 cursor-pointer"
                                  title={isPassVisible ? 'Hide Password' : 'Show Password'}
                                >
                                  {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions Row: Copy Credentials | View ID Card | Inspect 360 */}
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleCopyCredentials(emp)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-[#00C9A7] text-slate-700 hover:text-[#0A2540] font-bold text-[10px] inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
                                title="Copy credentials to send to employee"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Credentials</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIdCardEmpId(emp.id);
                                  setIsIdCardModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#00897B] font-bold text-[10px] inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-[#00C9A7]/30 shadow-2xs"
                                title="Open digital ID Card"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>View ID Card</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedEmployeeFor360(emp)}
                              className="text-[11px] font-bold text-[#00A88B] hover:text-[#0A2540] inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                            >
                              <span>360 Profile</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* CATEGORY 2: OFFICIAL OFFER LETTERS */}
            {moreSubTab === 'offers' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                
                {/* Search Bar (70%) + Create Button (30%) - Same height */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={moreSearchQuery}
                      onChange={(e) => setMoreSearchQuery(e.target.value)}
                      placeholder="Search candidate, role..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00C9A7] shadow-2xs font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGenerateOfferLetterModalOpen(true)}
                    className="px-3 py-2 bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs rounded-xl shadow-2xs hover:brightness-105 active:scale-95 whitespace-nowrap flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer border border-[#00C9A7]/30"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Draft Offer</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(() => {
                    const filtered = offerLetters.filter(l => 
                      l.candidateName.toLowerCase().includes(moreSearchQuery.toLowerCase()) ||
                      l.roleTitle.toLowerCase().includes(moreSearchQuery.toLowerCase()) ||
                      (l.candidateEmail && l.candidateEmail.toLowerCase().includes(moreSearchQuery.toLowerCase()))
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
                          {moreSearchQuery ? `No offer letters found matching "${moreSearchQuery}".` : 'No offer letters created yet. Tap "+ Draft Offer" to generate one.'}
                        </div>
                      );
                    }

                    return filtered.map((letter) => (
                      <div 
                        key={letter.id}
                        className="bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-teal-400 shadow-2xs space-y-2.5 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <strong className="text-xs font-bold text-[#0A2540] block">{letter.candidateName}</strong>
                            <span className="text-[10px] text-slate-500">{letter.candidateEmail || 'Candidate'} • {letter.candidatePhone}</span>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                            Issued
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl text-xs">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Designation</span>
                            <strong className="text-slate-700 text-[11px] block truncate">{letter.roleTitle}</strong>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Annual CTC</span>
                            <strong className="text-[#00A88B] text-[11px] block">₹{(letter.annualCtc ?? 0).toLocaleString('en-IN')}</strong>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                          <span className="text-[10px] font-mono text-slate-400">
                            Issued: {letter.issuedDate}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOfferLetter(letter);
                              setIsOfferLetterModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#0A2540] text-white hover:bg-[#133353] font-bold text-[10px] inline-flex items-center gap-1 transition-all"
                          >
                            <FileText className="w-3 h-3 text-[#00C9A7]" />
                            <span>View / Print Offer Letter</span>
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* CATEGORY 3: GENERATED PAYSLIPS */}
            {moreSubTab === 'payslips' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                
                {/* Search Bar (70%) + Create Button (30%) - Same height */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={moreSearchQuery}
                      onChange={(e) => setMoreSearchQuery(e.target.value)}
                      placeholder="Search employee, month..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00C9A7] shadow-2xs font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPayslipGenModalOpen(true)}
                    className="px-3 py-2 bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs rounded-xl shadow-2xs hover:brightness-105 active:scale-95 whitespace-nowrap flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer border border-[#00C9A7]/30"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Run Payroll</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(() => {
                    const filtered = payslips.filter(ps => 
                      (ps.employeeName && ps.employeeName.toLowerCase().includes(moreSearchQuery.toLowerCase())) ||
                      (ps.employeeCode && ps.employeeCode.toLowerCase().includes(moreSearchQuery.toLowerCase())) ||
                      (ps.month && ps.month.toLowerCase().includes(moreSearchQuery.toLowerCase())) ||
                      (ps.year && ps.year.toString().includes(moreSearchQuery))
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
                          {moreSearchQuery ? `No payslips found matching "${moreSearchQuery}".` : 'No payslips generated yet. Tap "+ Run Payroll" to issue slips.'}
                        </div>
                      );
                    }

                    return filtered.map((ps) => {
                      const gross = (ps.basicSalary || 0) + (ps.hra || 0) + (ps.specialAllowance || 0) + (ps.incentives || 0);
                      const net = ps.netPay ?? (ps as any).netSalary ?? 0;
                      const pf = ps.pfDeduction ?? (ps as any).deductions ?? 0;
                      return (
                        <div 
                          key={ps.id}
                          className="bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-teal-400 shadow-2xs space-y-2.5 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <strong className="text-xs font-bold text-[#0A2540] block">{ps.employeeName || 'Staff Member'}</strong>
                              <span className="text-[10px] text-slate-400 font-mono">{ps.employeeCode || ps.id} • {ps.month} {ps.year}</span>
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {ps.status || 'PROCESSED'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl text-xs">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Gross Salary</span>
                              <strong className="text-slate-700 text-[11px] block">₹{gross.toLocaleString('en-IN')}</strong>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Net Payout</span>
                              <strong className="text-[#00A88B] text-[11px] block">₹{net.toLocaleString('en-IN')}</strong>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 font-mono">
                              PF Deduction: ₹{pf.toLocaleString('en-IN')}
                            </span>
                            <button
                              type="button"
                              onClick={() => openPayslipModal(ps)}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 text-[#00897B] hover:bg-teal-100 font-bold text-[10px] inline-flex items-center gap-1 transition-all border border-[#00C9A7]/30"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>Inspect Payslip</span>
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* CATEGORY 4: INTERVIEW CALLS & MEETINGS */}
            {(moreSubTab === 'meetings' || moreSubTab === 'interviews') && (
              <div className="space-y-3 animate-in fade-in duration-150">
                
                {/* Search Bar (70%) + Create Button (30%) - Same height */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={moreSearchQuery}
                      onChange={(e) => setMoreSearchQuery(e.target.value)}
                      placeholder="Search interview, candidate..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00C9A7] shadow-2xs font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsInterviewModalOpen(true)}
                    className="px-3 py-2 bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs rounded-xl shadow-2xs hover:brightness-105 active:scale-95 whitespace-nowrap flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer border border-[#00C9A7]/30"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Schedule</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(() => {
                    const interviews = teamMeetings.filter(m => 
                      (m.type?.includes('Interview') || m.title?.includes('Interview')) &&
                      (m.title.toLowerCase().includes(moreSearchQuery.toLowerCase()) ||
                       (m.type && m.type.toLowerCase().includes(moreSearchQuery.toLowerCase())) ||
                       (m.agenda && m.agenda.toLowerCase().includes(moreSearchQuery.toLowerCase())))
                    );
                    if (interviews.length === 0) {
                      return (
                        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
                          {moreSearchQuery ? `No interviews match "${moreSearchQuery}".` : 'No candidate interviews currently scheduled. Tap "+ Schedule" to book one.'}
                        </div>
                      );
                    }

                    return interviews.map((meet) => (
                      <div key={meet.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                              <Video className="w-4 h-4" />
                            </div>
                            <div>
                              <strong className="text-xs font-bold text-[#0A2540] block">{meet.title}</strong>
                              <span className="text-[10px] text-slate-400">{meet.dateTime}</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                            Scheduled
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl">
                          {meet.agenda || 'HR & Technical Screening interview'}
                        </p>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                          <span className="text-[10px] text-slate-500 font-medium">
                            Panel: {meet.invitedMemberName || 'HR Panel'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(meet.meetingLink || 'https://meet.tradenexus.io/interview-hr');
                              triggerToast('✓ Interview video call link copied to clipboard!');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] inline-flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3 text-slate-500" />
                            <span>Copy Room Link</span>
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* CATEGORY 5: HR EXECUTIVE ACCOUNT & PRIVILEGES */}
            {moreSubTab === 'hr_account' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0A2540] to-[#133353] text-[#00C9A7] flex items-center justify-center font-display font-black text-base shadow-sm border border-[#00C9A7]/30">
                      HR
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-[#0A2540]">Sarah Jenkins</strong>
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[9px] font-extrabold border border-emerald-200">
                          Super Admin
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Head of HR &amp; People Operations</p>
                      <span className="text-[10px] font-mono text-slate-400">ID: TNX-HR-001 • Dept: Human Capital</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">System Access</span>
                      <strong className="text-[#0A2540] text-[11px] block">Full Org Controller</strong>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Security Tier</span>
                      <strong className="text-[#00A88B] text-[11px] block">Tier 1 Compliance</strong>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] text-slate-400">Official Portal Login:</span>
                      <span className="font-mono font-bold text-slate-800">hr.admin@tradenexus.com</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] text-slate-400">Biometric Verification:</span>
                      <span className="font-bold text-emerald-700">Enrolled &amp; Validated</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] text-slate-400">Workforce Scope:</span>
                      <span className="font-bold text-slate-800">{teamMembers.length} Active Personnel</span>
                    </div>
                  </div>

                  <div className="pt-1 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const hrCreds = `Trade Nexus HR Admin Access\nName: Sarah Jenkins\nID: TNX-HR-001\nPortal: hr.admin@tradenexus.com\nTier: Super Admin\nDomain: ${window.location.origin}`;
                        navigator.clipboard.writeText(hrCreds);
                        triggerToast('✓ Copied HR Admin profile to clipboard!');
                      }}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy HR Access Credentials</span>
                    </button>
                    <button
                      type="button"
                      onClick={exportHrReportCSV}
                      className="w-full py-2 rounded-xl bg-[#0A2540] hover:bg-[#133353] text-[#00C9A7] font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-98"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Organization Master Audit</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 6: ONBOARDING PIPELINE */}
            {moreSubTab === 'onboard' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                
                {/* Search Bar (70%) + Create Button (30%) - Same height */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={moreSearchQuery}
                      onChange={(e) => setMoreSearchQuery(e.target.value)}
                      placeholder="Search new hire, role..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00C9A7] shadow-2xs font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddEmployeeModalOpen(true)}
                    className="px-3 py-2 bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs rounded-xl shadow-2xs hover:brightness-105 active:scale-95 whitespace-nowrap flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer border border-[#00C9A7]/30"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Add Staff</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(() => {
                    const filtered = onboardingList.filter(emp =>
                      emp.name.toLowerCase().includes(moreSearchQuery.toLowerCase()) ||
                      emp.role.toLowerCase().includes(moreSearchQuery.toLowerCase()) ||
                      (emp.status && emp.status.toLowerCase().includes(moreSearchQuery.toLowerCase()))
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400 space-y-3">
                          <p>{moreSearchQuery ? `No candidates match "${moreSearchQuery}".` : 'All newly onboarded candidates have completed setup.'}</p>
                          <button
                            type="button"
                            onClick={() => setIsAddEmployeeModalOpen(true)}
                            className="px-3.5 py-2 rounded-xl bg-[#00A88B] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>+ Onboard New Staff</span>
                          </button>
                        </div>
                      );
                    }

                    return filtered.map((emp) => (
                      <div key={emp.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <strong className="text-xs font-bold text-[#0A2540] block">{emp.name}</strong>
                            <span className="text-[10px] text-slate-400">{emp.role} • Joining: {emp.joiningDate}</span>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            {emp.status}
                          </span>
                        </div>

                        {/* Checklist progress */}
                        <div className="space-y-1.5 pt-1 border-t border-slate-100 text-xs">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Onboarding Checklist</span>
                          {[
                            { key: 'documentsVerified' as const, task: 'Documents Verified' },
                            { key: 'workstationAllocated' as const, task: 'Workstation Allocated' },
                            { key: 'biometricEnrolled' as const, task: 'Biometric Face ID Enrolled' },
                            { key: 'trainingScheduled' as const, task: 'Training Scheduled' },
                          ].map((item) => {
                            const completed = Boolean(emp.checklist?.[item.key]);
                            return (
                              <div 
                                key={item.key}
                                onClick={() => toggleOnboardingChecklist(emp.id, item.key)}
                                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                              >
                                <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors ${
                                  completed ? 'bg-emerald-500 text-white' : 'border border-slate-300 bg-white'
                                }`}>
                                  {completed && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className={`text-[11px] font-medium ${completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                  {item.task}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Utility Download Bar */}
            <div className="bg-slate-100/80 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-semibold">Full Workforce Database</span>
              <button
                type="button"
                onClick={exportHrReportCSV}
                className="px-3 py-1.5 rounded-xl bg-[#0A2540] hover:bg-[#133353] text-[#00C9A7] font-bold text-[10px] inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Master CSV</span>
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Modern HR Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-3 py-2">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {[
            { id: 'home', label: 'Home', icon: Home },
            { id: 'attendance', label: 'Attendance', icon: CalendarCheck, badge: lateCount > 0 ? lateCount : undefined },
            { id: 'employees', label: 'Team', icon: Users },
            { id: 'approvals', label: 'Leaves', icon: UserCheck, badge: pendingApprovalsCount },
            { id: 'more', label: 'More', icon: MoreHorizontal },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeHrNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveHrNav(item.id as any)}
                className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all relative ${
                  isActive ? 'text-[#00A88B]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span>{item.label}</span>
                {!!item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 right-2 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- MODALS & DIALOGS --- */}
      
      {/* 1. Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
      />

      {/* 2. Generate Offer Letter Form Modal (Image 4 Template) */}
      <GenerateOfferLetterModal
        isOpen={isGenerateOfferLetterModalOpen}
        onClose={() => setIsGenerateOfferLetterModalOpen(false)}
      />

      {/* 3. Face Registration Modal */}
      <FaceRegistrationModal />

      {/* 6. Payslip Generator Modal */}
      {isPayslipGenModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#00A88B] flex items-center justify-center font-bold text-base">
                  ₹
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-[#0A2540]">Generate Monthly Payslips</h3>
                  <p className="text-xs text-slate-500">Calculate basic pay, HRA, incentives and PF deductions</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPayslipGenModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGeneratePayslipsSubmit} className="space-y-4 text-xs">
              
              {/* Month & Year Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Month</label>
                  <select
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-[#00C9A7]"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Year</label>
                  <input
                    type="text"
                    value={payrollYear}
                    onChange={(e) => setPayrollYear(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-[#00C9A7]"
                  />
                </div>
              </div>

              {/* Target Scope Selection */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Generate For:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPayslipSelectionMode('ALL');
                      setSelectedEmpIdsForPayroll(teamMembers.map(m => m.id));
                    }}
                    className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      payslipSelectionMode === 'ALL'
                        ? 'bg-teal-50 border-[#00C9A7] text-teal-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${payslipSelectionMode === 'ALL' ? 'opacity-100' : 'opacity-0'}`} />
                    <span>All 10 Employees</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayslipSelectionMode('SPECIFIC')}
                    className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      payslipSelectionMode === 'SPECIFIC'
                        ? 'bg-teal-50 border-[#00C9A7] text-teal-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${payslipSelectionMode === 'SPECIFIC' ? 'opacity-100' : 'opacity-0'}`} />
                    <span>Select Specific</span>
                  </button>
                </div>
              </div>

              {/* Individual Employee Selection Checkbox List */}
              {payslipSelectionMode === 'SPECIFIC' && (
                <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-2 max-h-40 overflow-y-auto">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Select Employees:</span>
                  {teamMembers.map(m => (
                    <label key={m.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEmpIdsForPayroll.includes(m.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmpIdsForPayroll(prev => [...prev, m.id]);
                          } else {
                            setSelectedEmpIdsForPayroll(prev => prev.filter(id => id !== m.id));
                          }
                        }}
                        className="rounded text-[#00C9A7] focus:ring-[#00C9A7]"
                      />
                      <span>{m.name} ({m.empCode} • {m.role})</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Live Salary Breakdown Preview */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between font-bold text-[#0A2540] border-b border-slate-200 pb-1.5">
                  <span>Selected Employees:</span>
                  <span className="font-mono">{payslipSelectionMode === 'ALL' ? totalEmployees : selectedEmpIdsForPayroll.length} Active</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div>• Basic Salary: <strong className="text-slate-800">50% Gross</strong></div>
                  <div>• HRA Allowance: <strong className="text-slate-800">30% Gross</strong></div>
                  <div>• Special Allowance: <strong className="text-slate-800">20% Gross</strong></div>
                  <div>• PF Deduction: <strong className="text-rose-600">12% Basic</strong></div>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-sm text-[#00A88B]">
                  <span>Estimated Total Payout:</span>
                  <span className="font-mono font-black">₹3,84,000</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayslipGenModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black shadow-md hover:brightness-105"
                >
                  Publish &amp; Dispatch Payslips
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 7. Schedule Candidate Interview Modal */}
      {isInterviewModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-[#0A2540]">Schedule Candidate Interview</h3>
                  <p className="text-xs text-slate-500">Meeting will be dispatched to interviewers' dashboards &amp; alerts</p>
                </div>
              </div>
              <button 
                onClick={() => setIsInterviewModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleInterviewSubmit} className="space-y-3 text-xs">
              
              <div>
                <label className="font-bold text-slate-700 block mb-1">Candidate Full Name *</label>
                <input
                  type="text"
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  placeholder="e.g. Siddharth Rao"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-[#00C9A7]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Role Applied</label>
                  <input
                    type="text"
                    value={candRole}
                    onChange={(e) => setCandRole(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-[#00C9A7]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date &amp; Time</label>
                  <input
                    type="text"
                    value={candTime}
                    onChange={(e) => setCandTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-[#00C9A7]"
                  />
                </div>
              </div>

              {/* Team Squad Filter Dropdown */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Interview Squad / Department:</label>
                <select
                  value={interviewTeamScope}
                  onChange={(e) => setInterviewTeamScope(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-[#00C9A7]"
                >
                  <option value="ALL">All Teams &amp; Squads</option>
                  {teamGroups.map(g => (
                    <option key={g.id} value={g.name}>{g.name} (TL: {g.leaderName})</option>
                  ))}
                </select>
              </div>

              {/* Multi-Select Interviewers / Employees */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Select Interviewers / Attendees:</label>
                  <button
                    type="button"
                    onClick={() => setSelectedInterviewers(teamMembers.map(m => m.name))}
                    className="text-[10px] font-bold text-[#00A88B] hover:underline"
                  >
                    Select All
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl p-2.5 bg-slate-50 space-y-1.5 max-h-36 overflow-y-auto">
                  {teamMembers
                    .filter(m => interviewTeamScope === 'ALL' || m.group === interviewTeamScope)
                    .map(m => (
                      <label key={m.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedInterviewers.includes(m.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedInterviewers(prev => [...prev, m.name]);
                            } else {
                              setSelectedInterviewers(prev => prev.filter(name => name !== m.name));
                            }
                          }}
                          className="rounded text-[#00C9A7] focus:ring-[#00C9A7]"
                        />
                        <span>{m.name} ({m.role} • {m.group || 'Sales'})</span>
                      </label>
                    ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInterviewModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black shadow-md hover:brightness-105 flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  <span>Schedule &amp; Dispatch Video Call</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
