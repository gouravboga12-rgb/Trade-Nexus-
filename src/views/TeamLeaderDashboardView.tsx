import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useScreenData } from '../hooks/useScreenData';
import { 
  Users, 
  PhoneCall, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  ChevronLeft,
  Plus,
  Home, 
  Download, 
  Calendar, 
  Clock, 
  Search,
  Video,
  Copy,
  Radio,
  UserCheck,
  Check,
  X
} from 'lucide-react';
import { TeamMeeting, TeamMember } from '../types';
import { Employee360ProfileView } from './Employee360ProfileView';
import { EmployeeAvatar } from '../components/common/EmployeeAvatar';

export const TeamLeaderDashboardView: React.FC = () => {
  const { 
    profile,
    teamMembers, 
    teamMeetings,
    leaveRequests, 
    assignedLeads,
    approveLeaveRequest, 
    rejectLeaveRequest,
    scheduleTeamMeeting,
    deleteTeamMeeting,
    joinMeeting,
    attendanceLogs,
    setIsLeaveModalOpen,
    openPunchIn,
    openPunchOut,
    triggerToast 
  } = useApp();

  useScreenData('teamLeaderDashboard');

  const [activeTab, setActiveTab] = useState<'home' | 'team' | 'leaves' | 'reports' | 'meetings'>('home');
  const [leaveSubTab, setLeaveSubTab] = useState<'approvals' | 'calendar'>('approvals');
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
  const [approvalsFilter, setApprovalsFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ON_LEAVE'>('ALL');
  const [reportsTimeframe, setReportsTimeframe] = useState<'today' | 'week' | 'month'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected member for 360 profile
  const [selectedMemberFor360, setSelectedMemberFor360] = useState<TeamMember | null>(null);

  // Meeting modal state
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingType, setMeetingType] = useState<string>('Team Discussion');
  const [meetingTime, setMeetingTime] = useState('Today • 04:30 PM');
  const [meetingLocation, setMeetingLocation] = useState('In-App Video Room');
  const [meetingAgenda, setMeetingAgenda] = useState('');

  // Rejection modal state
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Dynamic Live Computations from Active Team State
  const totalTeamStrength = teamMembers.length;
  const presentCount = teamMembers.filter(m => m.attendanceStatus === 'PRESENT').length;
  const lateCount = teamMembers.filter(m => m.attendanceStatus === 'LATE').length;
  const onLeaveCount = teamMembers.filter(m => m.attendanceStatus === 'ON_LEAVE').length;
  const totalActivities = teamMembers.reduce((sum, m) => sum + (m.dialsToday || 0), 0);
  const totalGoalCalls = teamMembers.reduce((sum, m) => sum + (m.goalCalls || 0), 0);
  const totalConnectedCalls = teamMembers.reduce((sum, m) => sum + (m.connected || 0), 0);
  const connectRate = totalActivities > 0 ? Math.round((totalConnectedCalls / totalActivities) * 100) : 0;
  const totalSales = teamMembers.reduce((sum, m) => sum + (m.salesAchieved || 0), 0);
  const targetTotal = teamMembers.reduce((sum, m) => sum + (m.salesTarget || 0), 0);
  const targetPercentage = targetTotal > 0 ? Math.min(100, Math.round((totalSales / targetTotal) * 100)) : 0;

  const totalWonToday = useMemo(() => {
    const fromLeads = (assignedLeads || []).filter(l => l.status === 'CONVERTED').length;
    if (fromLeads > 0) return fromLeads;
    return teamMembers.filter(m => m.salesAchieved > 0).length;
  }, [assignedLeads, teamMembers]);

  const pendingLeaves = leaveRequests.filter(r => r.status === 'PENDING');

  // Calendar calculations driven by attendanceLogs
  const latestLogDate = attendanceLogs.map((l) => l.date).sort().at(-1);
  const monthAnchor = useMemo(() => {
    const base = latestLogDate ? new Date(`${latestLogDate}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth() + calendarMonthOffset, 1);
  }, [latestLogDate, calendarMonthOffset]);

  const monthLabel = monthAnchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0).getDate();
  const leadingBlanks = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1).getDay();
  const statusByDay = useMemo(() => new Map(attendanceLogs.map((log) => [log.dayNumber, log.status])), [attendanceLogs]);
  const latestDay = latestLogDate ? new Date(`${latestLogDate}T00:00:00`).getDate() : new Date().getDate();

  const countOf = (status: string) => attendanceLogs.filter((l) => l.status === status).length;
  const presentDays = countOf('PRESENT') + countOf('HALF_DAY');
  const leaveDays = countOf('LEAVE');
  const absentDays = countOf('ABSENT');
  const holidayDays = countOf('HOLIDAY');

  // Format amount in Lakhs
  const formatInLakhs = (amount: number) => {
    if (amount >= 100000) {
      const lakhs = (amount / 100000).toFixed(2);
      return `₹${lakhs.replace(/\.00$/, '')} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Timeframe calculation for Performance Reports
  const tfMultiplier = reportsTimeframe === 'today' ? 1 : reportsTimeframe === 'week' ? 5 : 22;
  const tfSalesMultiplier = reportsTimeframe === 'today' ? (1 / 22) : reportsTimeframe === 'week' ? (1 / 4) : 1;

  const tfDials = reportsTimeframe === 'today' ? totalActivities : Math.round(totalActivities * tfMultiplier);
  const tfSales = reportsTimeframe === 'month' ? totalSales : Math.round(totalSales * tfSalesMultiplier);
  const tfTarget = reportsTimeframe === 'month' ? targetTotal : Math.round(targetTotal * tfSalesMultiplier);
  const tfTargetPercent = Math.min(100, Math.round((tfSales / Math.max(1, tfTarget)) * 100));

  // Copy before sorting
  const membersByDials = [...teamMembers].sort((a, b) => b.dialsToday - a.dialsToday);

  // Top active telecallers on floor right now from active SQLite team_members
  const activeFloorMembers = useMemo(() => {
    return [...teamMembers]
      .filter(m => m.active !== 0)
      .sort((a, b) => {
        if (a.attendanceStatus === 'PRESENT' && b.attendanceStatus !== 'PRESENT') return -1;
        if (b.attendanceStatus === 'PRESENT' && a.attendanceStatus !== 'PRESENT') return 1;
        if (b.salesAchieved !== a.salesAchieved) return b.salesAchieved - a.salesAchieved;
        return b.dialsToday - a.dialsToday;
      })
      .slice(0, 3);
  }, [teamMembers]);

  // Real-time backend-backed working leads pulse from SQLite assigned_leads
  const liveFloorLeads = useMemo(() => {
    const activeLeads = (assignedLeads || []).filter(l => l.status !== 'PENDING' || l.callCount > 0);
    const sorted = [...activeLeads].sort((a, b) => {
      const aVal = a.dealValue || 0;
      const bVal = b.dealValue || 0;
      return bVal - aVal;
    });

    if (sorted.length > 0) {
      return sorted.slice(0, 4).map((lead, idx) => {
        let type = 'CONNECTED';
        const s = (lead.status || '').toUpperCase();
        if (s === 'CONVERTED' || (lead.dealValue && lead.dealValue >= 75000)) {
          type = 'WON_DEAL';
        } else if (s === 'INTERESTED') {
          type = 'INTERESTED';
        } else if (s === 'CALLBACK') {
          type = 'CALLBACK';
        }

        const relativeTimes = ['12m ago', '26m ago', '42m ago', '1h ago', '2h ago'];
        const amountStr = lead.dealValue && lead.dealValue > 0
          ? formatInLakhs(lead.dealValue)
          : '—';

        return {
          id: lead.id,
          rep: lead.assignedToEmployeeName || 'Employee',
          client: lead.company || 'Enterprise Client',
          contact: lead.name,
          type,
          amount: amountStr,
          time: lead.lastCallTimestamp || relativeTimes[idx % relativeTimes.length],
          note: lead.notes || 'Spoke with client, follow-up scheduled.'
        };
      });
    }

    return [];
  }, [assignedLeads]);

  const handleCreateMeetingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim()) return;
    scheduleTeamMeeting({
      title: meetingTitle,
      type: meetingType,
      dateTime: meetingTime,
      location: meetingLocation,
      agenda: meetingAgenda || 'Review telecalling milestones and client conversion rate.',
    });
    setMeetingTitle('');
    setMeetingAgenda('');
    setIsMeetingModalOpen(false);
  };

  const startInstantMeeting = (type: string = 'Team Discussion') => {
    const meetingId = `meet-${Date.now()}`;
    const newMtg: TeamMeeting = {
      id: meetingId,
      title: `Instant Team Meeting • ${profile?.teamName || 'Alpha Growth'}`,
      dateTime: 'Live Now',
      type: type || 'Team Discussion',
      location: 'In-App Video Room',
      attendeesCount: teamMembers.length,
      agenda: 'Instant team coordination and discussion',
      status: 'LIVE',
      meetingLink: `https://meet.tradenexus.io/room/${meetingId}`,
    };
    joinMeeting(newMtg);
  };

  const copyMeetingLink = (link?: string) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    triggerToast('✓ Meeting link copied to clipboard');
  };

  const filteredMembers = teamMembers.filter(m => {
    const matchesAttendance = attendanceFilter === 'ALL' || m.attendanceStatus === attendanceFilter;
    const matchesSearch = !searchQuery.trim() || 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.empCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAttendance && matchesSearch;
  });

  const exportTeamReportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Role,Group,Attendance,Check-in,Dials,Connected,Interested,Sales Achieved,Target\n"
      + teamMembers.map(e => `"${e.name}","${e.role}","${e.group}","${e.attendanceStatus}","${e.checkInTime || 'N/A'}",${e.dialsToday},${e.connected},${e.interested},${e.salesAchieved},${e.salesTarget}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Team_Performance_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('✓ Exported Team Performance Report (CSV)');
  };

  // If 360 profile is open, render native full-screen mobile view
  if (selectedMemberFor360) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] pb-28 max-w-lg mx-auto">
        <Employee360ProfileView 
          member={selectedMemberFor360} 
          onBack={() => setSelectedMemberFor360(null)} 
          viewerRole="team_leader" 
        />
      </div>
    );
  }

  const liveMeeting = teamMeetings.find(m => m.status === 'LIVE');

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col justify-between max-w-lg mx-auto font-sans pb-28 selection:bg-[#00C9A7]/20">
      
      {/* Main Scrollable Content Area */}
      <main className="flex-1 p-3.5 sm:p-4 space-y-4 pt-2">
        
        {/* --- TAB 1: HOME (Mobile Dashboard) --- */}
        {activeTab === 'home' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            
            {/* Greeting Header */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">
                    Hello, Ramesh
                  </h2>
                  <span className="text-xl">👋</span>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Team Leader • <span className="text-[#00A88B] font-bold">{profile?.teamName || 'Alpha Growth Team'}</span>
                </p>
              </div>

              {/* Avatar Badge */}
              <div className="w-10 h-10 rounded-2xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-black text-xs shadow-sm">
                RS
              </div>
            </div>

            {/* 3 Top Attendance Metric Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              
              {/* Card 1: Team Members */}
              <div 
                onClick={() => setActiveTab('team')}
                className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-col justify-between cursor-pointer hover:border-[#00C9A7] transition-all active:scale-95"
              >
                <span className="text-[11px] font-bold text-slate-500 leading-tight mb-1">
                  Team Size
                </span>
                <span className="font-display font-black text-2xl text-[#0A2540]">
                  {totalTeamStrength}
                </span>
              </div>

              {/* Card 2: Present Today */}
              <div 
                onClick={() => { setAttendanceFilter('PRESENT'); setActiveTab('team'); }}
                className="bg-white border border-emerald-200/80 rounded-2xl p-3 shadow-xs flex flex-col justify-between cursor-pointer hover:border-emerald-500 transition-all active:scale-95"
              >
                <span className="text-[11px] font-bold text-emerald-700 leading-tight mb-1">
                  Present Today
                </span>
                <span className="font-display font-black text-2xl text-emerald-600">
                  {presentCount}
                </span>
              </div>

              {/* Card 3: On Leave */}
              <div 
                onClick={() => setActiveTab('leaves')}
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

            {/* Live Meeting Alert Banner (if meeting active) */}
            {liveMeeting && (
              <div className="p-3.5 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
                  </span>
                  <div>
                    <strong className="text-xs font-bold text-[#0A2540] block">{liveMeeting.title}</strong>
                    <span className="text-[10px] text-emerald-700 font-bold">● Meeting is Live Now</span>
                  </div>
                </div>
                <button
                  onClick={() => joinMeeting(liveMeeting)}
                  className="px-3 py-1.5 bg-[#00C9A7] text-[#0A2540] font-black text-xs rounded-xl shadow-xs active:scale-95"
                >
                  Join Call
                </button>
              </div>
            )}

            {/* Team Leader Attendance Punch Lifecycle Card */}
            <div className="bg-white border border-[#00C9A7]/40 shadow-xs rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00C9A7]/15 text-[#00A88B] flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs text-[#0A2540]">My Attendance (TL Punch)</h4>
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

            {/* Team Overview Section (Today's Summary) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-[#0A2540]">
                  Today's Floor Overview
                </h3>
                <button 
                  onClick={() => setActiveTab('reports')}
                  className="text-[11px] font-bold text-[#00A88B] hover:underline"
                >
                  View Reports →
                </button>
              </div>

              {/* 3 Metric Columns Side-by-Side: Calls | Won | Revenue (Matching Image 2) */}
              <div className="bg-white border border-slate-200/90 shadow-xs rounded-2xl p-3.5">
                <div className="grid grid-cols-3 gap-1 text-center divide-x divide-slate-100">
                  {/* 1. Calls */}
                  <div 
                    onClick={() => setActiveTab('team')} 
                    className="px-1 cursor-pointer active:scale-95 transition-transform"
                  >
                    <strong className="text-base sm:text-lg font-display font-black text-[#0A2540] block leading-tight">
                      <span className="text-[#00A88B]">{totalActivities}</span>
                      <span className="text-slate-300 font-normal text-xs">/{totalGoalCalls}</span>
                    </strong>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">
                      Calls
                    </span>
                  </div>

                  {/* 2. Won */}
                  <div 
                    onClick={() => setActiveTab('team')} 
                    className="px-1 cursor-pointer active:scale-95 transition-transform"
                  >
                    <strong className="text-base sm:text-lg font-display font-black text-purple-700 block leading-tight">
                      {totalWonToday}
                    </strong>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">
                      Won
                    </span>
                  </div>

                  {/* 3. Revenue */}
                  <div 
                    onClick={() => setActiveTab('reports')} 
                    className="px-1 cursor-pointer active:scale-95 transition-transform"
                  >
                    <strong className="text-base sm:text-lg font-display font-black text-[#00A88B] block leading-tight">
                      {formatInLakhs(totalSales)}
                    </strong>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">
                      Revenue
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Performance Section (Radial Target Gauge) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-[#0A2540]">
                  Monthly Sales Target
                </h3>
                <span className="text-[11px] font-bold text-[#00A88B] bg-[#E6FAF6] px-2.5 py-0.5 rounded-full">
                  This Month
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex items-center gap-4">
                
                {/* Circular Gauge */}
                <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      className="stroke-slate-100"
                      strokeWidth="7"
                      fill="transparent"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      stroke="#00C9A7"
                      strokeWidth="7"
                      strokeDasharray="201"
                      strokeDashoffset={201 - (201 * targetPercentage) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-display font-black text-lg text-[#0A2540] leading-none">
                      {targetPercentage}%
                    </span>
                  </div>
                </div>

                {/* Target Metric Breakdown */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-700 block mb-0.5">
                    Target Achievement
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {formatInLakhs(totalSales)} of {formatInLakhs(targetTotal)}
                  </span>
                  <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-[#00C9A7] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${targetPercentage}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Mobile Action Links */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Standup Card */}
              <div 
                onClick={() => setActiveTab('meetings')}
                className="bg-white border border-slate-200 hover:border-[#00C9A7] rounded-2xl p-3 shadow-xs flex items-center justify-between cursor-pointer active:scale-95 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#0A2540]">Meetings</h4>
                    <span className="text-[10px] text-slate-400">Video Calls</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* Leave Requests Card */}
              <div 
                onClick={() => setActiveTab('leaves')}
                className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-3 shadow-xs flex items-center justify-between cursor-pointer active:scale-95 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#0A2540]">Leaves</h4>
                    <span className="text-[10px] text-slate-400">{pendingLeaves.length} Pending</span>
                  </div>
                </div>
                {pendingLeaves.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center">
                    {pendingLeaves.length}
                  </span>
                )}
              </div>
            </div>

            {/* --- SECTION 1: LIVE FLOOR ATTENDANCE SNAP --- */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-black text-sm text-[#0A2540]">
                    Live Floor Attendance
                  </h3>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {presentCount} Active
                  </span>
                </div>
                <button 
                  onClick={() => setActiveTab('team')}
                  className="text-[11px] font-bold text-[#00A88B] hover:text-[#0A2540] transition-colors flex items-center gap-0.5"
                >
                  <span>View All ({teamMembers.length})</span>
                  <span>→</span>
                </button>
              </div>

              {/* Top Active Telecallers on Floor Right Now - Backed by SQLite team_members */}
              <div className="space-y-2">
                {activeFloorMembers.map((m) => (
                  <div 
                    key={m.id}
                    onClick={() => setSelectedMemberFor360(m)}
                    className="bg-white border border-slate-200/90 hover:border-[#00C9A7] rounded-2xl p-3 shadow-2xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform overflow-hidden">
                          <EmployeeAvatar
                            avatar={m.avatar}
                            name={m.name}
                            className="w-full h-full"
                            fallbackClassName="font-bold text-xs"
                          />
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          m.attendanceStatus === 'PRESENT' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <strong className="text-xs font-bold text-[#0A2540] group-hover:text-[#00A88B] transition-colors">
                            {m.name}
                          </strong>
                          <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60">
                            {m.group}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          In: {m.checkInTime || '09:15 AM'} • {m.dialsToday} Dials
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-mono font-black text-[#00A88B] block">
                        {formatInLakhs(m.salesAchieved)}
                      </span>
                      <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 inline-block mt-0.5">
                        {m.interested || 0} Int.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* --- SECTION 2: LIVE FLOOR WORKING LEADS --- */}
            <div className="space-y-2.5 pt-2 pb-2">
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-black text-sm text-[#0A2540]">
                    Floor Pulse: Active Leads
                  </h3>
                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/80">
                    Live Stream
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Today</span>
              </div>

              {/* Recent Live Working Leads Cards - Backed by SQLite assigned_leads */}
              <div className="space-y-2">
                {liveFloorLeads.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs space-y-1.5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          item.type === 'WON_DEAL' ? 'bg-purple-500' :
                          item.type === 'INTERESTED' ? 'bg-emerald-500' :
                          item.type === 'CALLBACK' ? 'bg-amber-500' : 'bg-sky-500'
                        }`} />
                        <strong className="text-xs font-bold text-[#0A2540] truncate">
                          {item.client}
                        </strong>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex-shrink-0 ${
                        item.type === 'WON_DEAL' ? 'bg-purple-100 text-purple-800 border border-purple-200/60' :
                        item.type === 'INTERESTED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/60' :
                        item.type === 'CALLBACK' ? 'bg-amber-100 text-amber-800 border border-amber-200/60' :
                        'bg-sky-100 text-sky-800 border border-sky-200/60'
                      }`}>
                        {item.type === 'WON_DEAL' ? '🏆 Won Deal' :
                         item.type === 'INTERESTED' ? '🟢 Interested' :
                         item.type === 'CALLBACK' ? '⏰ Callback' : '💬 Connected'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>By <strong className="text-slate-700">{item.rep}</strong> • {item.contact}</span>
                      {item.amount !== '—' && (
                        <span className="font-mono font-black text-[#00A88B] text-xs">
                          {item.amount}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-xl border border-slate-100/80">
                      "{item.note}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                      <span>Lead Status Logged</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 2: TEAM (Live Attendance, Roster & 360 Dossier) --- */}
        {activeTab === 'team' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* TODAY'S TEAM PULSE / REPORT BOX (Replaces old heading as requested) */}
            <div className="bg-white border border-slate-200/90 shadow-xs rounded-2xl p-3.5 space-y-2.5">
              {/* Top Row: Title + Live Status Pill (Image 2) */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black tracking-wider text-[#0A2540] uppercase">
                    Today's Team Pulse
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="bg-[#E6F8F5] border border-[#B2EFE5] text-[#00897B] font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                  {presentCount} Present • {lateCount} Late • {onLeaveCount} Leave
                </div>
              </div>

              {/* Subtle Divider */}
              <div className="h-px bg-slate-100" />

              {/* 4 Metric Columns: Team | Calls (Attended / Total) | Won | Revenue */}
              <div className="grid grid-cols-4 gap-1 text-center divide-x divide-slate-100">
                {/* 1. Team */}
                <div className="px-1">
                  <strong className="text-base font-display font-black text-[#0A2540] block leading-tight">
                    {totalTeamStrength}
                  </strong>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                    Team
                  </span>
                </div>

                {/* 2. Attended out of total calls */}
                <div className="px-1">
                  <strong className="text-base font-display font-black text-[#0A2540] block leading-tight">
                    <span className="text-[#00A88B]">{totalActivities}</span>
                    <span className="text-slate-300 font-normal text-xs">/{totalGoalCalls}</span>
                  </strong>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                    Calls
                  </span>
                </div>

                {/* 3. Won */}
                <div className="px-1">
                  <strong className="text-base font-display font-black text-purple-700 block leading-tight">
                    {totalWonToday}
                  </strong>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                    Won
                  </span>
                </div>

                {/* 4. Revenue */}
                <div className="px-1">
                  <strong className="text-base font-display font-black text-[#00A88B] block leading-tight">
                    {formatInLakhs(totalSales)}
                  </strong>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                    Revenue
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee by name or employee code..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00C9A7]"
              />
            </div>

            {/* Filter Pills with real numbers (Placed below search bar as requested) */}
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
                All ({teamMembers.length})
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
                Present ({presentCount})
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
                Late ({lateCount})
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
                Leave ({onLeaveCount})
              </button>
            </div>

            {/* List of Telecallers - Native Touch Cards with Clear UI Highlights */}
            <div className="space-y-3">
              {filteredMembers.map((member) => {
                const isPresent = member.attendanceStatus === 'PRESENT';
                const isLate = member.attendanceStatus === 'LATE';

                return (
                  <div 
                    key={member.id}
                    onClick={() => setSelectedMemberFor360(member)}
                    className="bg-white border border-slate-200/90 hover:border-[#00C9A7] rounded-2xl p-4 shadow-xs hover:shadow-md flex flex-col gap-3 cursor-pointer active:scale-[0.98] transition-all group"
                  >
                    {/* Member Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className={`w-11 h-11 rounded-2xl ${
                            isPresent 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' 
                              : isLate 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/80' 
                              : 'bg-purple-50 text-purple-700 border border-purple-200/80'
                          } flex items-center justify-center font-display font-black text-xs shadow-2xs group-hover:scale-105 transition-transform overflow-hidden`}>
                            <EmployeeAvatar avatar={member.avatar} name={member.name} className="w-full h-full" fallbackClassName="font-display font-black text-xs" />
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            isPresent ? 'bg-emerald-500' : isLate ? 'bg-amber-500' : 'bg-purple-500'
                          }`} />
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <strong className="text-xs font-bold text-[#0A2540] group-hover:text-[#00A88B] transition-colors">
                              {member.name}
                            </strong>
                            <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-md border border-slate-200/80">
                              {member.group}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {member.empCode} • {member.role ? member.role.replace(/telecaller/gi, 'Sales Executive') : 'Sales Executive'}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        isPresent ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-200/80' :
                        isLate ? 'bg-amber-100/90 text-amber-800 border border-amber-200/80' :
                        'bg-rose-100/90 text-rose-800 border border-rose-200/80'
                      }`}>
                        {member.attendanceStatus}
                      </span>
                    </div>

                    {/* 3 Metric Matrix - Clean Elevated Micro-Cards */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50/90 p-1.5 rounded-xl border border-slate-100 text-center">
                      <div className="bg-white rounded-lg py-1.5 px-1 shadow-2xs border border-slate-100/80">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Dials</span>
                        <strong className="text-xs font-mono font-black text-[#0A2540]">{member.dialsToday}</strong>
                      </div>
                      <div className="bg-white rounded-lg py-1.5 px-1 shadow-2xs border border-slate-100/80">
                        <span className="text-[9px] text-[#00A88B] block font-bold uppercase tracking-wider">Sales</span>
                        <strong className="text-xs font-mono font-black text-[#00A88B]">{formatInLakhs(member.salesAchieved)}</strong>
                      </div>
                      <div className="bg-white rounded-lg py-1.5 px-1 shadow-2xs border border-slate-100/80">
                        <span className="text-[9px] text-emerald-600 block font-bold uppercase tracking-wider">Interested</span>
                        <strong className="text-xs font-mono font-black text-emerald-700">{member.interested || 0}</strong>
                      </div>
                    </div>

                    {/* Footer: Check-in Time + Clean Interactive Pill Button */}
                    <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100">
                      <span className="text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        In: {member.checkInTime || '—'}
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-[#E6FAF6] text-[#00A88B] font-bold group-hover:bg-[#00C9A7] group-hover:text-[#0A2540] transition-colors flex items-center gap-1 shadow-2xs">
                        <span>View Profile</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- TAB 3: LEAVES (Leave Approvals & Monthly Calendar) --- */}
        {activeTab === 'leaves' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* Top Header with Apply Leave Button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-black text-lg text-[#0A2540]">Leave Management</h2>
                <p className="text-xs text-slate-500">Approvals, calendar & leave balance</p>
              </div>

              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="flex items-center gap-1.5 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs px-3.5 py-2 rounded-xl shadow-xs active:scale-95 transition-all flex-shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Apply Leave</span>
              </button>
            </div>

            {/* Segmented Sub-Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                onClick={() => setLeaveSubTab('approvals')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  leaveSubTab === 'approvals'
                    ? 'bg-[#0A2540] text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Team Approvals</span>
                {pendingLeaves.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black bg-rose-500 text-white ml-0.5">
                    {pendingLeaves.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setLeaveSubTab('calendar')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  leaveSubTab === 'calendar'
                    ? 'bg-[#0A2540] text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Leave Calendar</span>
              </button>
            </div>

            {/* SUB-TAB 1: TEAM APPROVALS */}
            {leaveSubTab === 'approvals' && (
              <div className="space-y-3">
                {/* Approvals Filter Pills with Live Counts */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Filter Requests:</span>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    {[
                      { id: 'PENDING', label: 'Pending', count: leaveRequests.filter(r => r.status === 'PENDING').length },
                      { id: 'APPROVED', label: 'Approved', count: leaveRequests.filter(r => r.status === 'APPROVED').length },
                      { id: 'REJECTED', label: 'Rejected', count: leaveRequests.filter(r => r.status === 'REJECTED').length },
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => setApprovalsFilter(s.id as any)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                          approvalsFilter === s.id ? 'bg-[#00C9A7] text-[#0A2540] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <span>{s.label}</span>
                        <span className={`px-1 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                          approvalsFilter === s.id ? 'bg-[#0A2540] text-[#00C9A7]' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {s.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {leaveRequests.filter(r => r.status === approvalsFilter).length === 0 ? (
                    <div className="text-center py-8 bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <span className="text-xs font-bold text-slate-700 block">No {approvalsFilter.toLowerCase()} requests</span>
                      <span className="text-[10px] text-slate-400 block">All leave requests in this category have been processed.</span>
                    </div>
                  ) : (
                    leaveRequests.filter(r => r.status === approvalsFilter).map((req) => (
                      <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <strong className="text-xs font-bold text-[#0A2540] block">{req.employeeName || 'Employee'}</strong>
                            <span className="text-[11px] text-slate-500">{req.leaveType} ({req.totalDays} Days)</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                            req.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          "{req.reason}"
                        </p>

                        <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
                          <span>{req.fromDate} to {req.toDate}</span>
                          <span>Applied: {req.appliedOn}</span>
                        </div>

                        {req.status === 'PENDING' && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              onClick={() => approveLeaveRequest(req.id)}
                              className="py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => setRejectingLeaveId(req.id)}
                              className="py-2.5 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                            >
                              <X className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SUB-TAB 2: LEAVE CALENDAR & BALANCE */}
            {leaveSubTab === 'calendar' && (
              <div className="space-y-3.5">
                {/* Leave Quota Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-display font-black text-sm text-[#0A2540]">Annual Leave Balance</h4>
                      <p className="text-[11px] text-slate-500 font-medium">{profile.totalLeaveBalance || 0} Days Available</p>
                    </div>
                    <button
                      onClick={() => setIsLeaveModalOpen(true)}
                      className="text-[#00A88B] text-xs font-bold hover:underline flex items-center gap-1"
                    >
                      <span>+ Apply Now</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Casual</span>
                      <strong className="text-xs font-mono font-black text-[#0A2540]">8 / 12</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Sick</span>
                      <strong className="text-xs font-mono font-black text-[#0A2540]">5 / 7</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Paid</span>
                      <strong className="text-xs font-mono font-black text-[#0A2540]">10 / 15</strong>
                    </div>
                  </div>
                </div>

                {/* Monthly Calendar View */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="font-display font-black text-sm text-[#0A2540]">{monthLabel}</h4>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setCalendarMonthOffset(c => c - 1)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 active:scale-95 transition-all"
                        title="Previous Month"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setCalendarMonthOffset(0)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all"
                      >
                        Today
                      </button>
                      <button 
                        onClick={() => setCalendarMonthOffset(c => c + 1)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 active:scale-95 transition-all"
                        title="Next Month"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Weekday Labels */}
                  <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
                    <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-mono font-bold">
                    {[...Array(leadingBlanks)].map((_, i) => (
                      <div key={`blank-${i}`} />
                    ))}
                    {[...Array(daysInMonth)].map((_, i) => {
                      const day = i + 1;
                      const status = statusByDay.get(day);
                      const isLatest = day === latestDay && calendarMonthOffset === 0;

                      return (
                        <div
                          key={day}
                          className={`h-10 rounded-xl flex flex-col items-center justify-center relative transition-all ${
                            isLatest ? 'bg-[#00C9A7] text-[#0A2540] shadow-sm font-black' :
                            status === 'LEAVE' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            status === 'ABSENT' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                            status === 'HOLIDAY' ? 'bg-slate-50 text-slate-400' :
                            status === 'HALF_DAY' ? 'bg-sky-50 text-sky-900 border border-sky-200' :
                            status === 'PRESENT' ? 'bg-emerald-50/80 text-emerald-900 border border-emerald-200' :
                            'text-slate-400'
                          }`}
                        >
                          <span className="text-[11px] leading-none">{day}</span>
                          {status === 'PRESENT' && !isLatest && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" />
                          )}
                          {status === 'LEAVE' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-0.5" />
                          )}
                          {status === 'ABSENT' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Calendar Legend */}
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold text-slate-600 pt-2.5 border-t border-slate-100">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Present ({presentDays} Days)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Leave ({leaveDays} Days)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Absent ({absentDays} Days)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                      Off ({holidayDays} Days)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 4: REPORTS (Dynamic Calling Analytics & CSV Export) --- */}
        {activeTab === 'reports' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-black text-lg text-[#0A2540]">Performance Reports</h2>
                <p className="text-xs text-slate-500">Live dials &amp; sales analytics</p>
              </div>
              <button
                onClick={exportTeamReportCSV}
                className="py-2 px-3 rounded-xl bg-[#00C9A7] text-[#0A2540] font-black text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>

            {/* Timeframe Selector Pills */}
            <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(['today', 'week', 'month'] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => setReportsTimeframe(tf)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                    reportsTimeframe === tf ? 'bg-white text-[#0A2540] shadow-xs' : 'text-slate-500'
                  }`}
                >
                  {tf === 'today' ? 'Today' : tf === 'week' ? 'This Week' : 'This Month'}
                </button>
              ))}
            </div>

            {/* Dynamic Summary Chips */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">Total Dials</span>
                <span className="font-mono-nums font-black text-xl text-[#0A2540]">{tfDials} Calls</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{connectRate}% Connect Rate</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">Revenue Closed</span>
                <span className="font-mono-nums font-black text-xl text-[#00A88B]">{formatInLakhs(tfSales)}</span>
                <span className="text-[10px] text-amber-600 font-bold block mt-0.5">{tfTargetPercent}% Target Reached</span>
              </div>
            </div>

            {/* Telecaller Performance List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Caller Ranking ({reportsTimeframe})
              </span>
              {membersByDials.map((m, i) => {
                const callerDials = reportsTimeframe === 'today' ? m.dialsToday : reportsTimeframe === 'week' ? Math.round(m.dialsToday * 5) : Math.round(m.dialsToday * 22);
                const callerSales = reportsTimeframe === 'month' ? m.salesAchieved : Math.round(m.salesAchieved * tfSalesMultiplier);

                return (
                  <div 
                    key={m.id} 
                    onClick={() => setSelectedMemberFor360(m)}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-xs cursor-pointer active:scale-98 transition-all hover:border-[#00C9A7]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-slate-400 w-5">#{i + 1}</span>
                      <div>
                        <strong className="font-bold text-[#0A2540] block">{m.name}</strong>
                        <span className="text-[10px] text-slate-400">{m.group}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono-nums">
                      <span className="text-[#0A2540] font-bold block">{callerDials} Calls</span>
                      <span className="text-[#00A88B] text-[10px] font-bold">{formatInLakhs(callerSales)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- TAB 5: MEETINGS (Video Hub & 1-on-1s) --- */}
        {activeTab === 'meetings' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-black text-lg text-[#0A2540]">Team Meetings & Video Hub</h2>
                <p className="text-xs text-slate-500">Launch calls &amp; hold team coaching</p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => startInstantMeeting('Team Discussion')}
                className="py-3 px-3 rounded-2xl bg-gradient-to-r from-[#00C9A7] to-[#00B4D8] text-[#0A2540] font-black text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
              >
                <Video className="w-4 h-4" />
                <span>Start Meeting</span>
              </button>

              <button
                onClick={() => setIsMeetingModalOpen(true)}
                className="py-3 px-3 rounded-2xl bg-white border border-slate-200 hover:border-[#00C9A7] font-bold text-xs flex items-center justify-center gap-2 text-[#0A2540] shadow-xs active:scale-95 transition-all"
              >
                <Calendar className="w-4 h-4 text-[#00C9A7]" />
                <span>Schedule Meeting</span>
              </button>
            </div>

            {/* Scheduled Meetings List */}
            <div className="space-y-2.5">
              <h3 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Upcoming Meetings</h3>
              {teamMeetings.length === 0 ? (
                <div className="text-center py-8 bg-white border border-slate-200 rounded-2xl p-4">
                  <Video className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-700 block">No upcoming meetings</span>
                  <span className="text-[10px] text-slate-400">Start an instant meeting or schedule one above.</span>
                </div>
              ) : (
                teamMeetings.map((mtg) => (
                  <div key={mtg.id} className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-[#00A88B] bg-[#E6FAF6] px-2 py-0.5 rounded-md uppercase">
                            {mtg.type}
                          </span>
                          {mtg.status === 'LIVE' && (
                            <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                              <Radio className="w-2.5 h-2.5 text-rose-600" /> LIVE NOW
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-[#0A2540] mt-1">{mtg.title}</h4>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 font-bold">{mtg.dateTime}</span>
                    </div>

                    {mtg.agenda && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl italic">
                        "{mtg.agenda}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        onClick={() => copyMeetingLink(mtg.meetingLink)}
                        className="text-[11px] font-bold text-slate-500 flex items-center gap-1 hover:text-slate-800"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Link
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => deleteTeamMeeting(mtg.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 text-xs"
                          title="Delete"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => joinMeeting(mtg)}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 transition-all ${
                            mtg.status === 'LIVE' 
                              ? 'bg-[#00C9A7] text-[#0A2540]' 
                              : 'bg-[#0A2540] text-[#00C9A7]'
                          }`}
                        >
                          <Video className="w-3 h-3" />
                          <span>{mtg.status === 'LIVE' ? 'Join' : 'Start'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>

      {/* 5 Bottom Navigation Tabs (Native Mobile Bar) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 max-w-lg mx-auto px-2 py-1.5 flex justify-around items-center shadow-lg">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'team', label: 'Team', icon: Users },
          { id: 'leaves', label: 'Leaves', icon: Calendar, badge: pendingLeaves.length },
          { id: 'reports', label: 'Reports', icon: TrendingUp },
          { id: 'meetings', label: 'Meetings', icon: Video },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
                isActive ? 'text-[#00C9A7]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center ring-2 ring-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold mt-0.5 ${isActive ? 'text-[#00A88B] font-extrabold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Schedule Meeting Modal */}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-black text-lg text-[#0A2540]">Schedule Team Meeting</h3>
              <button onClick={() => setIsMeetingModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateMeetingSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Meeting Title</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g. Target Review / Sales Workshop"
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Meeting Type</label>
                <select
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold"
                >
                  <option value="Team Discussion">👥 Team Discussion</option>
                  <option value="1-on-1 Call">🤝 1-on-1 Call</option>
                  <option value="Problem Solving">⚡ Problem Solving Huddle</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Date &amp; Time</label>
                <input
                  type="text"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  placeholder="Today • 04:30 PM"
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Agenda</label>
                <textarea
                  value={meetingAgenda}
                  onChange={(e) => setMeetingAgenda(e.target.value)}
                  placeholder="Points to discuss..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 h-20"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black shadow-md shadow-[#00C9A7]/25 text-xs"
                >
                  Schedule Meeting
                </button>
                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Leave Reason Modal */}
      {rejectingLeaveId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95">
            <h3 className="font-display font-black text-lg text-rose-700">Reject Leave Request</h3>
            <p className="text-xs text-slate-500">Enter rejection remarks for employee feedback:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Critical campaign deadline / Shift understaffing"
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs h-24 focus:outline-none focus:border-rose-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  rejectLeaveRequest(rejectingLeaveId, rejectReason);
                  setRejectingLeaveId(null);
                  setRejectReason('');
                }}
                className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-sm"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => setRejectingLeaveId(null)}
                className="py-3 px-4 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
