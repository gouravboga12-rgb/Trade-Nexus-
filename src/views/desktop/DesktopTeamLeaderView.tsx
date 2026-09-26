import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useListDefault } from '../../hooks/useListDefault';
import { useScreenData } from '../../hooks/useScreenData';
import { 
  Users, 
  CheckCircle2, 
  Calendar, 
  TrendingUp, 
  PhoneCall, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  Plus, 
  Download, 
  Filter, 
  Search, 
  MoreHorizontal, 
  ArrowUpRight, 
  MessageCircle, 
  Layers, 
  Check, 
  X,
  CalendarCheck,
  ShieldCheck,
  ChevronRight,
  Award,
  AlertTriangle,
  TrendingDown,
  ShieldAlert,
  Sparkles,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Share2,
  Copy,
  Radio,
  PhoneOff,
  Trash2,
  UserPlus
} from 'lucide-react';
import { TeamMeeting, TeamMember } from '../../types';
import { TelecallerDetailDrawer } from '../../components/modals/TelecallerDetailDrawer';
import { Employee360ProfileView } from '../Employee360ProfileView';
import { EmployeeAvatar } from '../../components/common/EmployeeAvatar';

interface DesktopTeamLeaderViewProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
}

export const DesktopTeamLeaderView: React.FC<DesktopTeamLeaderViewProps> = ({ 
  currentTab = 'home',
  onTabChange 
}) => {
  const { 
    currentUser,
    profile,
    teamMembers, 
    teamGroups, 
    teamTasks, 
    teamMeetings, 
    leaveRequests, 
    approveLeaveRequest, 
    rejectLeaveRequest, 
    scheduleTeamMeeting, 
    updateTeamMeeting,
    deleteTeamMeeting,
    joinMeeting,
    triggerToast,
    setIsFaceIdModalOpen
  } = useApp();

  useScreenData('teamLeaderDashboard');

  const [activeSubTab, setActiveSubTab] = useState<string>(currentTab);
  const activeTab = onTabChange ? currentTab : activeSubTab;
  const setTab = onTabChange || setActiveSubTab;

  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ON_LEAVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [selectedMemberForDetail, setSelectedMemberForDetail] = useState<TeamMember | null>(null);
  const [selectedMemberFor360, setSelectedMemberFor360] = useState<TeamMember | null>(null);

  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingType, setMeetingType] = useState<string>('Team Discussion');
  const [meetingTime, setMeetingTime] = useState('Today • 04:30 PM');
  const [meetingLocation, setMeetingLocation] = useState('In-App Video Room');
  const [meetingAgenda, setMeetingAgenda] = useState('');
  const [invitedTelecaller, setInvitedTelecaller] = useState('');
  useListDefault(invitedTelecaller, setInvitedTelecaller, teamMembers, (m) => m.name);

  // Invitee selection states for Schedule Meeting
  const [inviteeMode, setInviteeMode] = useState<'ALL' | '1ON1' | 'CUSTOM'>('ALL');
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);

  // Filter States
  const [meetingFilter, setMeetingFilter] = useState<'ALL' | '1ON1' | 'TEAM' | 'PROBLEM_SOLVING'>('ALL');

  // Rejection modal state
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Metrics
  const totalTeamStrength = teamMembers.length;
  const presentCount = teamMembers.filter(m => m.attendanceStatus === 'PRESENT').length;
  const onLeaveCount = teamMembers.filter(m => m.attendanceStatus === 'ON_LEAVE').length;
  const lateCount = teamMembers.filter(m => m.attendanceStatus === 'LATE').length;
  const totalActivities = teamMembers.reduce((sum, m) => sum + (m.dialsToday || 0), 0);
  const totalSales = teamMembers.reduce((sum, m) => sum + (m.salesAchieved || 0), 0);
  const totalCollections = Math.round(totalSales * 0.85);
  const targetTotal = teamMembers.reduce((sum, m) => sum + (m.salesTarget || 0), 0);
  const targetPercentage = targetTotal > 0 ? Math.min(100, Math.round((totalSales / targetTotal) * 100)) : 0;

  const leaderName = currentUser?.name?.trim() || profile?.name?.trim() || 'Team Leader';

  const pendingLeaves = leaveRequests.filter(r => r.status === 'PENDING');

  // Leave Approvals filter & search
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [leaveSearch, setLeaveSearch] = useState('');

  // Performance Reports timeframe
  const [reportsTimeframe, setReportsTimeframe] = useState<'today' | 'week' | 'month'>('month');

  // Leave metrics
  const pendingLeavesCount = leaveRequests.filter(r => r.status === 'PENDING').length;
  const approvedLeavesCount = leaveRequests.filter(r => r.status === 'APPROVED').length;
  const rejectedLeavesCount = leaveRequests.filter(r => r.status === 'REJECTED').length;

  const filteredLeaves = leaveRequests.filter(req => {
    const matchesFilter = leaveStatusFilter === 'ALL' || req.status === leaveStatusFilter;
    const matchesSearch = !leaveSearch.trim() || 
      (req.employeeName || '').toLowerCase().includes(leaveSearch.toLowerCase()) ||
      (req.employeeCode || '').toLowerCase().includes(leaveSearch.toLowerCase()) ||
      (req.reason || '').toLowerCase().includes(leaveSearch.toLowerCase()) ||
      (req.leaveType || '').toLowerCase().includes(leaveSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Performance analytics metrics
  const totalConnectedCalls = teamMembers.reduce((sum, m) => sum + (m.connected || 0), 0);
  const totalInterested = teamMembers.reduce((sum, m) => sum + (m.interested || 0), 0);
  const connectRate = totalActivities > 0 ? Math.round((totalConnectedCalls / totalActivities) * 100) : 62;

  const filteredMembers = teamMembers.filter(m => {
    const matchesFilter = attendanceFilter === 'ALL' || m.attendanceStatus === attendanceFilter;
    const matchesSearch = !searchQuery.trim() || 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.empCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.group.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const startInstantMeeting = async (type: string = 'Team Discussion', specificTelecaller?: string) => {
    const userSquad = profile?.teamName || teamMembers[0]?.group || 'Squad';
    const title = specificTelecaller 
      ? `1-on-1 Coaching • ${specificTelecaller}`
      : `Instant Squad Sync • ${userSquad}`;
      
    const mtg = await scheduleTeamMeeting({
      title,
      dateTime: 'Live Now',
      type: type || 'Team Discussion',
      location: 'Zoom Video Room',
      attendeesCount: specificTelecaller ? 2 : teamMembers.length + 1,
      agenda: specificTelecaller ? `1-on-1 coaching & review with ${specificTelecaller}` : `Live squad discussion for ${userSquad}`,
      status: 'LIVE',
      targetAudience: specificTelecaller ? 'INDIVIDUAL' : 'SQUAD',
      targetTeam: userSquad,
      invitedMemberName: specificTelecaller,
      createdByRole: 'team_leader',
      useZoom: true,
      includeAdmin: true,
    });
    
    if (mtg) {
      joinMeeting(mtg);
    }
  };

  const copyMeetingLink = (link?: string) => {
    const url = link || `https://meet.tradenexus.io/room/team-huddle`;
    navigator.clipboard?.writeText(url);
    triggerToast('✓ Meeting link copied to clipboard!');
  };

  const handleCreateMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim()) return;

    let inviteesDisplay: string | undefined = undefined;
    let attendeesCount = teamMembers.length;
    const is1on1 = inviteeMode === '1ON1';
    const targetMember = teamMembers.find(m => m.name === invitedTelecaller);
    const userSquad = profile?.teamName || teamMembers[0]?.group || 'Squad';

    if (is1on1) {
      inviteesDisplay = invitedTelecaller;
      attendeesCount = 2;
    } else if (inviteeMode === 'CUSTOM') {
      inviteesDisplay = selectedInvitees.length > 0 ? selectedInvitees.join(', ') : undefined;
      attendeesCount = selectedInvitees.length > 0 ? selectedInvitees.length + 1 : teamMembers.length;
    }

    await scheduleTeamMeeting({
      title: meetingTitle,
      dateTime: meetingTime || 'Today • 04:30 PM',
      type: meetingType,
      location: 'Zoom Cloud Meeting',
      agenda: meetingAgenda || `Squad meeting for ${is1on1 ? (inviteesDisplay || 'rep') : userSquad}`,
      status: 'UPCOMING',
      invitedMemberName: inviteesDisplay,
      attendeesCount,
      targetAudience: is1on1 ? 'INDIVIDUAL' : 'SQUAD',
      targetTeam: userSquad,
      targetEmployeeId: is1on1 ? targetMember?.id : undefined,
      createdByRole: 'team_leader',
      useZoom: true,
      includeAdmin: true,
    });
    setMeetingTitle('');
    setMeetingAgenda('');
    setSelectedInvitees([]);
    setIsMeetingModalOpen(false);
  };

  const exportTeamReportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Role,Group,Status,CheckIn,Dials,Sales Achieved,Conversion Rate\n"
      + teamMembers.map(e => `"${e.name}","${e.role}","${e.group}","${e.attendanceStatus}","${e.checkInTime || 'N/A'}",${e.dialsToday},${e.salesAchieved},${e.conversionRate}%`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Team_Performance_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('✓ Exported Team Performance Report (CSV)');
  };

  const formatInLakhs = (num: number): string => {
    if (!num || num === 0) return '₹0';
    if (num >= 100000) {
      const lakhs = num / 100000;
      return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(2)} L`;
    }
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const renderMemberAvatar = (member: { avatar?: string; name: string }) => {
    return (
      <div className="w-8 h-8 rounded-xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-black text-xs shadow-2xs flex-shrink-0 overflow-hidden">
        <EmployeeAvatar
          avatar={member.avatar}
          name={member.name}
          className="w-full h-full object-cover"
          fallbackClassName="font-black text-xs"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* --- TAB: HOME / OVERVIEW --- */}
      {activeTab === 'home' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* 1. Top Header Banner with Greeting & High-Value Quick Actions */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">
                  Hello, {leaderName}
                </h2>
                <span className="text-xl">👋</span>

                {/* Face ID & Attendance status on the dashboard itself */}
                <button
                  onClick={() => setIsFaceIdModalOpen(true)}
                  title="Click to view Biometric Attendance details"
                  className="flex items-center gap-1.5 bg-[#E6FAF6] border border-[#00C9A7]/40 text-[#00A88B] font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-[#00C9A7]/20 transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  <UserCheck className="w-4 h-4 text-[#00C9A7]" />
                  <span>
                    Face ID: {profile?.checkInTime ? `Present (${profile.checkInTime})` : profile?.faceIdStatus === 'VERIFIED_PRESENT' ? 'Present' : 'Not Checked In'}
                  </span>
                </button>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Team Leader • <span className="text-[#00A88B] font-bold">{profile?.teamName || 'Alpha Growth Team'}</span> • <strong className="text-emerald-600">● {presentCount} Active Employees</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={exportTeamReportCSV}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => setIsMeetingModalOpen(true)}
                className="flex items-center gap-2 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-[#00C9A7]/20 transition-all active:scale-95"
              >
                <Calendar className="w-4 h-4 stroke-[3]" />
                <span>Schedule Meeting</span>
              </button>
            </div>
          </div>

          {/* 2. Top Metric Summary Cards (Widescreen 4-Column Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            
            {/* Card 1: Team Members */}
            <div 
              onClick={() => setTab('team')}
              className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-[#00C9A7] transition-all group"
            >
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Total Team Size
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono-nums font-black text-2xl text-[#0A2540]">{totalTeamStrength}</span>
                  <span className="text-xs font-bold text-slate-400">Employees</span>
                </div>
                <span className="text-xs text-[#00A88B] font-extrabold mt-1 block group-hover:underline">
                  View Team List →
                </span>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-[#E6FAF6] text-[#00C9A7] flex items-center justify-center shadow-xs">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: Attendance / Present */}
            <div 
              onClick={() => { setAttendanceFilter('PRESENT'); setTab('team'); }}
              className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-all group"
            >
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Present Today
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono-nums font-black text-2xl text-emerald-600">{presentCount}</span>
                  <span className="text-xs font-bold text-slate-400">/ {totalTeamStrength} Employees</span>
                </div>
                <span className="text-xs text-emerald-600 font-extrabold mt-1 block">
                  {Math.round((presentCount / Math.max(1, totalTeamStrength)) * 100)}% Attendance Rate
                </span>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: Total Dials Today */}
            <div className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Total Dials Today
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono-nums font-black text-2xl text-[#0A2540]">{totalActivities}</span>
                  <span className="text-xs font-bold text-slate-400">Calls Logged</span>
                </div>
                <span className="text-xs text-sky-600 font-extrabold mt-1 block">
                  Avg {Math.round(totalActivities / Math.max(1, presentCount))} calls per employee
                </span>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-xs">
                <PhoneCall className="w-6 h-6" />
              </div>
            </div>

            {/* Card 4: Sales Achieved */}
            <div 
              onClick={() => setTab('reports')}
              className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all group"
            >
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Team Monthly Sales
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono-nums font-black text-2xl text-[#0A2540]">{formatInLakhs(totalSales)}</span>
                  <span className="text-xs font-bold text-slate-400">/ {formatInLakhs(targetTotal)}</span>
                </div>
                <span className="text-xs text-amber-600 font-extrabold mt-1 block">
                  {targetPercentage}% Target Reached
                </span>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* 2-Column Section: Team Performance + Upcoming Meetings & Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Real-Time Team Performance Table */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display font-black text-base text-[#0A2540]">Today's Team Performance</h3>
                  <p className="text-xs text-slate-400">Today's call dials, customer interest, and sales done</p>
                </div>
                <button 
                  onClick={() => setTab('team')}
                  className="text-xs font-bold text-[#00A88B] hover:underline"
                >
                  View All Members →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3">Employee</th>
                      <th className="pb-3">Check-In</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Dials Today</th>
                      <th className="pb-3">Interested</th>
                      <th className="pb-3">Sales Done</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            {renderMemberAvatar(member)}
                            <div>
                              <span className="font-bold text-[#0A2540] block">{member.name}</span>
                              <span className="text-[10px] text-slate-400">{member.empCode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 font-mono text-[11px] text-slate-600">
                          {member.checkInTime || '—'}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            member.attendanceStatus === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            member.attendanceStatus === 'LATE' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {member.attendanceStatus}
                          </span>
                        </td>
                        <td className="py-3 font-mono font-bold text-slate-800">
                          {member.dialsToday} <span className="text-slate-400 font-normal">/ {member.goalCalls}</span>
                        </td>
                        <td className="py-3 font-mono font-bold text-emerald-600">
                          {member.interested || 0} Leads
                        </td>
                        <td className="py-3 font-mono font-bold text-[#00A88B]">
                          ₹{member.salesAchieved.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 1 Col: Standups & Pending Approvals */}
            <div className="space-y-6">
              
              {/* Team Meetings Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-black text-sm text-[#0A2540]">Scheduled Meetings</h4>
                  <button onClick={() => setIsMeetingModalOpen(true)} className="text-[11px] font-bold text-[#00A88B] hover:underline">
                    + New
                  </button>
                </div>

                <div className="space-y-2.5">
                  {teamMeetings.slice(0, 2).map((mtg) => (
                    <div key={mtg.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-[#00A88B] bg-[#E6FAF6] px-2 py-0.5 rounded-md uppercase">
                          {mtg.type}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{(mtg.dateTime ?? '').split('•')[0]}</span>
                      </div>
                      <h5 className="font-bold text-xs text-[#0A2540]">{mtg.title}</h5>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> {(mtg.dateTime ?? '').split('•')[1] || mtg.dateTime}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Leave Approvals Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-black text-sm text-[#0A2540]">Pending Leaves</h4>
                    {pendingLeavesCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                        {pendingLeavesCount} new
                      </span>
                    )}
                  </div>
                  <button onClick={() => setTab('approvals')} className="text-[11px] font-bold text-[#00A88B] hover:underline">
                    View All →
                  </button>
                </div>

                {pendingLeaves.length === 0 ? (
                  <div className="text-center py-5 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    <span className="text-xs font-bold text-slate-700 block">All caught up!</span>
                    <span className="text-[10px] text-slate-400">No pending leave requests</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pendingLeaves.slice(0, 2).map((req) => (
                      <div key={req.id} className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-xs text-slate-800 block">{req.employeeName || 'Employee'}</span>
                            <span className="text-[10px] text-rose-700 font-semibold">{req.leaveType} • {req.totalDays} Day(s)</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{req.appliedOn}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 italic">"{req.reason}"</p>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => approveLeaveRequest(req.id)}
                            className="flex-1 py-1.5 rounded-lg bg-[#00C9A7] text-[#0A2540] font-bold text-xs shadow-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectingLeaveId(req.id)}
                            className="py-1.5 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold text-xs"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* --- TAB: TEAM MEMBERS --- */}
      {activeTab === 'team' && (
        selectedMemberFor360 ? (
          <Employee360ProfileView 
            member={selectedMemberFor360} 
            onBack={() => setSelectedMemberFor360(null)} 
            viewerRole="team_leader" 
          />
        ) : (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            
            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-black text-xl text-[#0A2540]">Team Members & Daily Status</h3>
                <p className="text-xs text-slate-500">Monitor attendance, calls made, and sales achieved</p>
              </div>

              {/* Attendance Filter Tabs */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                {(['ALL', 'PRESENT', 'LATE', 'ON_LEAVE'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setAttendanceFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      attendanceFilter === filter 
                        ? 'bg-white text-[#0A2540] shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {filter === 'ALL' ? 'All Members' : filter.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employees by name or employee ID code..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00C9A7]"
              />
            </div>

            {/* Team Member Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMembers.map((member) => {
                const memberInTime = member.checkInTime || (member.attendanceStatus === 'PRESENT' ? '09:15 AM' : member.attendanceStatus === 'LATE' ? '09:48 AM' : null);
                const isLate = member.attendanceStatus === 'LATE' || (memberInTime && (() => {
                  const parts = memberInTime.match(/(\d+):(\d+)/);
                  if (!parts) return false;
                  const h = parseInt(parts[1], 10);
                  const m = parseInt(parts[2], 10);
                  return (h === 9 && m > 30) || (h > 9 && h < 12);
                })());

                const memberOutTime = member.checkOutTime;

                return (
                  <div 
                    key={member.id} 
                    onClick={() => setSelectedMemberFor360(member)}
                    className="bg-slate-50/80 border border-slate-200 rounded-3xl p-5 hover:border-[#00C9A7] hover:shadow-md hover:bg-white transition-all space-y-3.5 cursor-pointer group"
                  >
                    {/* Top Row: Avatar, Name, Code & Attendance Badge */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {renderMemberAvatar(member)}
                        <div>
                          <h4 className="font-bold text-sm text-[#0A2540] group-hover:text-[#00A88B] transition-colors">
                            {member.name}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {member.empCode} • {member.role ? member.role.replace(/telecaller/gi, 'Sales Executive') : 'Sales Executive'}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        member.attendanceStatus === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                        member.attendanceStatus === 'LATE' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {member.attendanceStatus}
                      </span>
                    </div>

                    {/* Middle: Dials, Sales & Interested Leads */}
                    <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-2xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Dials</span>
                        <strong className="text-sm font-mono-nums font-black text-[#0A2540]">{member.dialsToday}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Sales</span>
                        <strong className="text-sm font-mono-nums font-black text-[#00A88B]">{formatInLakhs(member.salesAchieved)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Interested</span>
                        <strong className="text-sm font-mono-nums font-black text-emerald-600">{member.interested || 0} Leads</strong>
                      </div>
                    </div>

                    {/* Timing Row: Check-in & Check-out Side-by-Side */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
                      {/* Check-In */}
                      <div className={`p-2.5 rounded-xl border flex items-center gap-1.5 ${
                        isLate ? 'bg-amber-50/80 border-amber-300 text-amber-900 font-bold' : 'bg-white border-slate-100 text-slate-600'
                      }`}>
                        <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isLate ? 'text-amber-600' : 'text-slate-400'}`} />
                        <span className="text-[11px] truncate">
                          In: {memberInTime || '—'} {isLate && '(Late)'}
                        </span>
                      </div>

                      {/* Check-Out */}
                      <div className="p-2.5 rounded-xl border bg-white border-slate-100 text-slate-600 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-[11px] truncate">
                            Out: {memberOutTime || 'Shift Active'}
                          </span>
                        </div>
                        {!memberOutTime && (member.attendanceStatus === 'PRESENT' || member.attendanceStatus === 'LATE') && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" title="Shift Active" />
                        )}
                      </div>
                    </div>

                    {/* Card Bottom: Click to view details */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400">View assigned leads & calls</span>
                      <span className="text-[#00A88B] font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                        Details →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
        )
      )}

      {/* --- TAB: APPROVALS --- */}
      {activeTab === 'approvals' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Top Title & Quick Action */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">
                Leave Approvals
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and approve leave applications for your team members
              </p>
            </div>
          </div>

          {/* 3 Executive KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-1">
                  Pending Review
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono-nums font-black text-2xl text-[#0A2540]">{pendingLeavesCount}</span>
                  <span className="text-xs font-bold text-slate-400">Requests</span>
                </div>
                <span className="text-xs text-amber-600 font-semibold mt-1 block">
                  Requires immediate manager action
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block mb-1">
                  On Leave Today
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono-nums font-black text-2xl text-[#0A2540]">{onLeaveCount}</span>
                  <span className="text-xs font-bold text-slate-400">Employees</span>
                </div>
                <span className="text-xs text-slate-500 font-semibold mt-1 block">
                  Out of office headcount
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-xs">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                  Processed This Month
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono-nums font-black text-2xl text-[#0A2540]">{approvedLeavesCount}</span>
                  <span className="text-xs font-bold text-slate-400">Approved</span>
                </div>
                <span className="text-xs text-slate-500 font-semibold mt-1 block">
                  {rejectedLeavesCount} Rejected • {Math.round((approvedLeavesCount / Math.max(1, approvedLeavesCount + rejectedLeavesCount)) * 100)}% Approval rate
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Main Card: Tab Filter Bar + Search + Data Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            
            {/* Filter toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
              {/* Tab Switcher */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setLeaveStatusFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    leaveStatusFilter === 'PENDING' ? 'bg-white text-[#0A2540] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Pending</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${leaveStatusFilter === 'PENDING' ? 'bg-amber-100 text-amber-800 font-black' : 'bg-slate-200 text-slate-600'}`}>
                    {pendingLeavesCount}
                  </span>
                </button>

                <button
                  onClick={() => setLeaveStatusFilter('APPROVED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    leaveStatusFilter === 'APPROVED' ? 'bg-white text-[#0A2540] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Approved</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${leaveStatusFilter === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 font-black' : 'bg-slate-200 text-slate-600'}`}>
                    {approvedLeavesCount}
                  </span>
                </button>

                <button
                  onClick={() => setLeaveStatusFilter('REJECTED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    leaveStatusFilter === 'REJECTED' ? 'bg-white text-[#0A2540] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Rejected</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${leaveStatusFilter === 'REJECTED' ? 'bg-rose-100 text-rose-800 font-black' : 'bg-slate-200 text-slate-600'}`}>
                    {rejectedLeavesCount}
                  </span>
                </button>

                <button
                  onClick={() => setLeaveStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    leaveStatusFilter === 'ALL' ? 'bg-white text-[#0A2540] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All History ({leaveRequests.length})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={leaveSearch}
                  onChange={(e) => setLeaveSearch(e.target.value)}
                  placeholder="Search employee, ID, reason..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00C9A7]"
                />
              </div>
            </div>

            {/* Enterprise Data Table */}
            {filteredLeaves.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto stroke-1" />
                <p className="text-sm font-bold text-slate-700">No leave requests found</p>
                <p className="text-xs text-slate-400">All requests in this category have been processed or none exist.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pl-2">Employee</th>
                      <th className="pb-3">Leave Type</th>
                      <th className="pb-3">Date Range</th>
                      <th className="pb-3">Days</th>
                      <th className="pb-3">Reason</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeaves.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 pl-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-black text-xs">
                              {(req.employeeName || 'EM').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-[#0A2540] block">{req.employeeName || 'Employee'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{req.employeeCode || '—'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                            req.leaveType === 'Sick Leave' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            req.leaveType === 'Casual Leave' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                            'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {req.leaveType}
                          </span>
                        </td>
                        <td className="py-3.5 font-medium text-slate-600">
                          {req.fromDate} → {req.toDate}
                        </td>
                        <td className="py-3.5 font-mono font-bold text-slate-700">
                          {req.totalDays} Day{req.totalDays > 1 ? 's' : ''}
                        </td>
                        <td className="py-3.5 max-w-xs">
                          <p className="text-slate-600 truncate" title={req.reason}>
                            {req.reason}
                          </p>
                        </td>
                        <td className="py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                            req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right pr-2">
                          {req.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => approveLeaveRequest(req.id)}
                                className="flex items-center gap-1 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs px-3 py-1.5 rounded-xl shadow-xs transition-all active:scale-95"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => setRejectingLeaveId(req.id)}
                                className="flex items-center gap-1 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs px-2.5 py-1.5 rounded-xl transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              {req.approvedBy ? `Actioned by ${req.approvedBy}` : 'Processed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>
      )}

      {/* --- TAB: REPORTS --- */}
      {activeTab === 'reports' && (() => {
        const isToday = reportsTimeframe === 'today';
        const isWeek = reportsTimeframe === 'week';
        const isMonth = reportsTimeframe === 'month';

        const tfLabel = isToday ? 'Today' : isWeek ? 'This Week' : 'This Month';
        const tfMultiplier = isToday ? 1 : isWeek ? 5 : 22;
        const tfSalesMultiplier = isToday ? (1 / 22) : isWeek ? (1 / 4) : 1;

        const tfDials = isToday ? totalActivities : Math.round(totalActivities * tfMultiplier);
        const tfConnected = isToday ? totalConnectedCalls : Math.round(totalConnectedCalls * tfMultiplier);
        const tfSales = isMonth ? totalSales : Math.round(totalSales * tfSalesMultiplier);
        const tfTarget = isMonth ? targetTotal : Math.round(targetTotal * tfSalesMultiplier);
        const tfTargetPercentage = Math.min(100, Math.round((tfSales / Math.max(1, tfTarget)) * 100));
        const tfInterested = isToday ? totalInterested : Math.round(totalInterested * (isWeek ? 5 : 20));

        return (
          <div className="space-y-6 animate-in fade-in duration-150">
            
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">
                  Team Performance & Revenue Analytics
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live dials, connect rates, quota pacing, and employee productivity
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Timeframe selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {(['today', 'week', 'month'] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setReportsTimeframe(tf)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                        reportsTimeframe === tf ? 'bg-white text-[#0A2540] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tf === 'today' ? 'Today' : tf === 'week' ? 'This Week' : 'This Month'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={exportTeamReportCSV}
                  className="flex items-center gap-2 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* 4 High-Level Performance Metrics - Dynamically Calculated by Timeframe */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Metric 1: Total Dials */}
              <div className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {isToday ? 'Total Dials Today' : isWeek ? 'Weekly Dials (This Week)' : 'Monthly Dials (This Month)'}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono-nums font-black text-2xl text-[#0A2540]">{tfDials}</span>
                    <span className="text-xs font-bold text-slate-400">Calls</span>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold mt-1 block">
                    {isToday ? `Logged today across ${presentCount} active employees` : isWeek ? 'Cumulative calls dialed this week' : 'Total calls logged this month'}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-xs">
                  <PhoneCall className="w-6 h-6" />
                </div>
              </div>

              {/* Metric 2: Connect Rate */}
              <div className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {isToday ? 'Calls Answered Today' : isWeek ? 'Calls Answered (This Week)' : 'Calls Answered (This Month)'}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono-nums font-black text-2xl text-emerald-600">{tfConnected}</span>
                    <span className="text-xs font-bold text-slate-400">Calls</span>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold mt-1 block">
                    <strong className="text-emerald-600 font-bold">{connectRate}%</strong> Connect Rate ({tfDials} Total Dials)
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>

              {/* Metric 3: Revenue Closed */}
              <div className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {isToday ? 'Revenue Closed Today' : isWeek ? 'Weekly Revenue Closed' : 'Monthly Revenue Closed'}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono-nums font-black text-2xl text-[#0A2540]">{formatInLakhs(tfSales)}</span>
                    <span className="text-xs font-bold text-slate-400">/ {formatInLakhs(tfTarget)}</span>
                  </div>
                  <span className="text-xs text-amber-600 font-extrabold mt-1 block">
                    {tfTargetPercentage}% Target Reached
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              {/* Metric 4: Interested Prospects */}
              <div className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {isToday ? 'Interested Leads Today' : isWeek ? 'Interested Leads (This Week)' : 'Interested Leads (This Month)'}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono-nums font-black text-2xl text-[#00A88B]">{tfInterested}</span>
                    <span className="text-xs font-bold text-slate-400">Leads</span>
                  </div>
                  <span className="text-xs text-emerald-600 font-semibold mt-1 block">
                    Positive customer responses
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00C9A7] flex items-center justify-center shadow-xs">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Table: Targets & Sales Progress - Dynamic to selected Timeframe */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display font-black text-base text-[#0A2540]">
                    {tfLabel} Performance & Sales Breakdown
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isToday ? "Real-time calls dialed, connected, and sales closed today" : isWeek ? "Cumulative weekly call volume, conversions, and deals" : "Monthly sales targets and achievement pacing for your team"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pl-2">Employee</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">{isToday ? 'Dials Today' : isWeek ? 'Dials This Week' : 'Monthly Dials'}</th>
                      <th className="pb-3">{isToday ? 'Today Sales' : isWeek ? 'Weekly Sales' : 'Sales Achieved'}</th>
                      <th className="pb-3">{isToday ? 'Daily Target' : isWeek ? 'Weekly Target' : 'Monthly Target'}</th>
                      <th className="pb-3 pr-2">Target Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamMembers.map((member) => {
                      const memberDials = isToday 
                        ? member.dialsToday 
                        : isWeek 
                        ? Math.round(member.dialsToday * 5) 
                        : Math.round(member.dialsToday * 22);

                      const memberGoal = isToday 
                        ? member.goalCalls 
                        : isWeek 
                        ? (member.goalCalls * 5) 
                        : (member.goalCalls * 22);

                      const achieved = isMonth ? (member.salesAchieved || 0) : Math.round((member.salesAchieved || 0) * tfSalesMultiplier);
                      const target = isMonth ? (member.salesTarget || 0) : Math.round((member.salesTarget || 0) * tfSalesMultiplier);
                      const pacingPercent = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;

                      return (
                        <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 pl-2">
                            <div className="flex items-center gap-3">
                              {renderMemberAvatar(member)}
                              <div>
                                <span className="font-bold text-xs text-[#0A2540] block">{member.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{member.empCode}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              member.attendanceStatus === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              member.attendanceStatus === 'LATE' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {member.attendanceStatus}
                            </span>
                          </td>
                          <td className="py-3.5 font-mono text-slate-700 font-bold">
                            {memberDials} <span className="text-slate-400 font-normal">/ {memberGoal}</span>
                          </td>
                          <td className="py-3.5 font-mono font-bold text-[#00A88B]">{formatInLakhs(achieved)}</td>
                          <td className="py-3.5 font-mono text-slate-500">{formatInLakhs(target)}</td>
                          <td className="py-3.5 pr-2">
                            <div className="flex items-center gap-3">
                              <div className="w-36 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#00C9A7] rounded-full transition-all" style={{ width: `${pacingPercent}%` }} />
                              </div>
                              <span className="font-mono font-black text-slate-700 text-[11px] w-10">
                                {pacingPercent}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        );
      })()}

      {/* --- TAB: TEAM MEETINGS --- */}
      {activeTab === 'meetings' && (() => {
        const filteredMeetings = teamMeetings.filter(m => {
          if (meetingFilter === '1ON1') return m.type === '1-on-1 Call' || !!m.invitedMemberName;
          if (meetingFilter === 'TEAM') return m.type === 'Team Discussion' || m.type === 'Team Standup';
          if (meetingFilter === 'PROBLEM_SOLVING') return m.type === 'Problem Solving' || m.type === 'Sales Pipeline Review';
          return true;
        });

        const liveMeeting = teamMeetings.find(m => m.status === 'LIVE');

        return (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top Toolbar Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">
                  Team Meetings & Video Hub
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Launch instant video calls, hold 1-on-1 reviews, and schedule team discussions
                </p>
              </div>

              <div className="flex items-center flex-wrap gap-2.5">
                <button
                  onClick={() => startInstantMeeting('Team Discussion')}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#00C9A7] to-[#00B4D8] hover:opacity-95 text-[#0A2540] font-black text-xs px-4 py-2.5 rounded-xl shadow-md shadow-[#00C9A7]/20 transition-all active:scale-95"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Instant Meeting</span>
                </button>

                <button
                  onClick={() => {
                    setMeetingType('1-on-1 Call');
                    setMeetingTitle('1-on-1 Coaching & Review');
                    setInviteeMode('1ON1');
                    setIsMeetingModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Schedule 1-on-1</span>
                </button>

                <button
                  onClick={() => {
                    setMeetingType('Team Discussion');
                    setMeetingTitle('Team Review & Strategy');
                    setInviteeMode('ALL');
                    setIsMeetingModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-[#0A2540] text-[#00C9A7] hover:bg-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs"
                >
                  <Calendar className="w-4 h-4 text-[#00C9A7]" />
                  <span>Schedule Meeting</span>
                </button>
              </div>
            </div>

            {/* Live Meeting Alert Banner (if any meeting is active) */}
            {liveMeeting && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-600"></span>
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Live Call in Progress
                      </span>
                      <span className="text-xs font-mono text-emerald-800 font-bold">Room Active</span>
                    </div>
                    <h4 className="font-display font-black text-base text-[#0A2540] mt-0.5">
                      {liveMeeting.title}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      {liveMeeting.invitedMemberName ? `Invited: ${liveMeeting.invitedMemberName}` : `Open to entire team (${teamMembers.length} employees)`} • Click Join to enter room
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => copyMeetingLink(liveMeeting.meetingLink)}
                    className="px-3 py-2 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/50 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Invite Link
                  </button>
                  <button
                    onClick={() => joinMeeting(liveMeeting)}
                    className="px-5 py-2 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs rounded-xl flex items-center gap-2 shadow-md shadow-[#00C9A7]/30 active:scale-95"
                  >
                    <Video className="w-4 h-4" /> Enter Video Room
                  </button>
                </div>
              </div>
            )}

            {/* Full-Width Meetings Hub */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-display font-black text-base text-[#0A2540]">
                    Scheduled & Active Meetings
                  </h3>
                  <p className="text-xs text-slate-400">All team video calls, 1-on-1 check-ins, and problem-solving huddles</p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold overflow-x-auto">
                  <button
                    onClick={() => setMeetingFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${meetingFilter === 'ALL' ? 'bg-white text-[#0A2540] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    All Meetings ({teamMeetings.length})
                  </button>
                  <button
                    onClick={() => setMeetingFilter('1ON1')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${meetingFilter === '1ON1' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    1-on-1 Calls ({teamMeetings.filter(m => m.type === '1-on-1 Call' || !!m.invitedMemberName).length})
                  </button>
                  <button
                    onClick={() => setMeetingFilter('TEAM')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${meetingFilter === 'TEAM' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Team Calls ({teamMeetings.filter(m => m.type === 'Team Discussion' || m.type === 'Team Standup').length})
                  </button>
                  <button
                    onClick={() => setMeetingFilter('PROBLEM_SOLVING')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${meetingFilter === 'PROBLEM_SOLVING' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Problem Solving ({teamMeetings.filter(m => m.type === 'Problem Solving' || m.type === 'Sales Pipeline Review').length})
                  </button>
                </div>
              </div>

              {filteredMeetings.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl space-y-3">
                  <Video className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-base text-slate-700">No meetings found in this view</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Click "Start Instant Meeting" to immediately launch a live call, or "Schedule Meeting" to invite team members in advance.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredMeetings.map((mtg) => (
                    <div key={mtg.id} className="p-5 bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200 rounded-3xl space-y-3.5 transition-all flex flex-col justify-between shadow-2xs">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              mtg.type === '1-on-1 Call' ? 'bg-purple-100 text-purple-800' :
                              mtg.type === 'Problem Solving' ? 'bg-amber-100 text-amber-800' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {mtg.type}
                            </span>
                            {mtg.status === 'LIVE' && (
                              <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                <Radio className="w-3 h-3 text-rose-600" /> LIVE NOW
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono text-slate-500 font-bold">{mtg.dateTime}</span>
                        </div>

                        <div>
                          <h4 className="font-display font-black text-base text-[#0A2540]">{mtg.title}</h4>
                          {mtg.invitedMemberName ? (
                            <p className="text-xs text-purple-700 font-semibold flex items-center gap-1.5 mt-1">
                              <UserCheck className="w-3.5 h-3.5" /> Invited: {mtg.invitedMemberName}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                              <Users className="w-3.5 h-3.5 text-slate-400" /> Open to all team employees ({mtg.attendeesCount || teamMembers.length} invited)
                            </p>
                          )}
                        </div>

                        {mtg.agenda && (
                          <p className="text-xs text-slate-600 bg-white p-3 rounded-2xl border border-slate-100 italic">
                            "{mtg.agenda}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-200/70">
                        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          📍 {mtg.location}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyMeetingLink(mtg.meetingLink)}
                            title="Copy Meeting Link"
                            className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy Link
                          </button>
                          <button
                            onClick={() => deleteTeamMeeting(mtg.id)}
                            title="Cancel Meeting"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => joinMeeting(mtg)}
                            className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                              mtg.status === 'LIVE' 
                                ? 'bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540]' 
                                : 'bg-[#0A2540] hover:bg-slate-800 text-[#00C9A7]'
                            }`}
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>{mtg.status === 'LIVE' ? 'Join Call' : 'Start Meeting'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        );
      })()}

      {/* Schedule Meeting Modal (Google Meet Style Invitee Selection) */}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-black text-lg text-[#0A2540]">Schedule Team Meeting</h3>
                <p className="text-xs text-slate-400">Plan a video meeting and invite team members</p>
              </div>
              <button 
                onClick={() => setIsMeetingModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMeetingSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Meeting Title</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g. Weekly Target Review / Client Objection Workshop"
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-[#00C9A7]"
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

              {/* Google Meet Style Invitee Selection */}
              <div className="space-y-2 border border-slate-200 rounded-2xl p-3.5 bg-slate-50/60">
                <label className="font-bold text-slate-700 block">Who is Invited?</label>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteeMode('ALL')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-xs border text-center transition-all ${
                      inviteeMode === 'ALL'
                        ? 'bg-[#0A2540] text-[#00C9A7] border-[#0A2540] shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    👥 Whole Team
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteeMode('1ON1')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-xs border text-center transition-all ${
                      inviteeMode === '1ON1'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🤝 1-on-1 Member
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteeMode('CUSTOM')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-xs border text-center transition-all ${
                      inviteeMode === 'CUSTOM'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🎯 Pick Specific
                  </button>
                </div>

                {/* 1-on-1 Invitee Picker */}
                {inviteeMode === '1ON1' && (
                  <div className="pt-2">
                    <label className="font-bold text-purple-900 block mb-1">Select Employee:</label>
                    <select
                      value={invitedTelecaller}
                      onChange={(e) => setInvitedTelecaller(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white border border-purple-300 text-slate-800 font-bold"
                    >
                      {teamMembers.map(m => (
                        <option key={m.id} value={m.name}>{m.name} ({m.empCode} • {m.role ? m.role.replace(/telecaller/gi, 'Sales Executive') : 'Sales Executive'})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Pick Specific Members (Multi-select Checkboxes) */}
                {inviteeMode === 'CUSTOM' && (
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500">
                        {selectedInvitees.length} of {teamMembers.length} selected
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedInvitees(teamMembers.map(m => m.name))}
                          className="text-[10px] text-[#00A88B] font-bold hover:underline"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedInvitees([])}
                          className="text-[10px] text-slate-400 font-bold hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl bg-white p-2 space-y-1">
                      {teamMembers.map(m => {
                        const isChecked = selectedInvitees.includes(m.name);
                        return (
                          <label
                            key={m.id}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-all ${
                              isChecked ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedInvitees(prev => [...prev, m.name]);
                                  } else {
                                    setSelectedInvitees(prev => prev.filter(name => name !== m.name));
                                  }
                                }}
                                className="w-4 h-4 rounded text-[#00A88B] focus:ring-0"
                              />
                              <span>{m.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{m.empCode}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Whole Team Notice */}
                {inviteeMode === 'ALL' && (
                  <p className="text-[11px] text-slate-500 font-medium pt-1">
                    ✓ All {teamMembers.length} employees in this team will see this meeting on their dashboard.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Date & Time</label>
                  <input
                    type="text"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    placeholder="Today • 04:30 PM"
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Meeting Platform</label>
                  <input
                    type="text"
                    value={meetingLocation}
                    onChange={(e) => setMeetingLocation(e.target.value)}
                    placeholder="In-App Video Room"
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Agenda / Discussion Goals</label>
                <textarea
                  value={meetingAgenda}
                  onChange={(e) => setMeetingAgenda(e.target.value)}
                  placeholder="Key topics, lead objections, or strategy to discuss..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 h-20"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black shadow-md shadow-[#00C9A7]/25 transition-all text-xs"
                >
                  Schedule & Send Invites
                </button>
                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
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

      {/* Telecaller Activity & Leads Bucket Drawer */}
      <TelecallerDetailDrawer
        member={selectedMemberForDetail}
        isOpen={!!selectedMemberForDetail}
        onClose={() => setSelectedMemberForDetail(null)}
      />

    </div>
  );
};
