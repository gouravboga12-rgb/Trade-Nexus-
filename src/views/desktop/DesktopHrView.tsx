import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useScreenData } from '../../hooks/useScreenData';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  CreditCard, 
  FileText, 
  Download, 
  Plus, 
  Check, 
  X, 
  Search, 
  Filter, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  Building,
  TrendingUp,
  UserPlus,
  ArrowUpRight,
  ShieldCheck,
  MoreHorizontal,
  Video
} from 'lucide-react';
import { CandidateInterview, OnboardingEmployee, ExitEmployee, PaymentVerificationItem, TeamMember } from '../../types';
import { AddEmployeeModal } from '../../components/modals/AddEmployeeModal';
import { Employee360ProfileView } from '../Employee360ProfileView';
import { EmployeeAvatar } from '../../components/common/EmployeeAvatar';

interface DesktopHrViewProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
}

export const DesktopHrView: React.FC<DesktopHrViewProps> = ({
  currentTab = 'home',
  onTabChange
}) => {
  const { 
    currentUser,
    profile,
    teamMembers, 
    teamGroups, 
    leaveRequests, 
    candidates, 
    onboardingList, 
    exitList, 
    paymentVerifications, 
    payslips,
    approveLeaveRequest, 
    rejectLeaveRequest, 
    scheduleInterview, 
    updateCandidateStatus, 
    toggleOnboardingChecklist, 
    toggleExitChecklist, 
    verifyPayment, 
    generateBulkPayslips, 
    teamMeetings,
    joinMeeting,
    triggerToast,
    setIsFaceIdModalOpen 
  } = useApp();

  useScreenData('hrDashboard');

  const [activeSubTab, setActiveSubTab] = useState<string>(currentTab);
  const activeTab = onTabChange ? currentTab : activeSubTab;
  const setTab = onTabChange || setActiveSubTab;

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [isPayslipGenModalOpen, setIsPayslipGenModalOpen] = useState(false);
  const [selectedEmployeeFor360, setSelectedEmployeeFor360] = useState<TeamMember | null>(null);

  // Form states
  const [candName, setCandName] = useState('');
  const [candRole, setCandRole] = useState('Senior Sales Executive');
  const [candExp, setCandExp] = useState('2+ Years in B2B Sales');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candTime, setCandTime] = useState('Tomorrow • 02:30 PM');
  const [candInterviewer, setCandInterviewer] = useState('Select Interviewer');

  const [payrollMonth, setPayrollMonth] = useState('May');
  const [payrollYear, setPayrollYear] = useState('2025');

  // Metrics
  const totalEmployees = teamMembers.length;
  const totalTeams = teamGroups.length;
  const presentCount = teamMembers.filter(m => m.attendanceStatus === 'PRESENT').length;
  const onLeaveCount = teamMembers.filter(m => m.attendanceStatus === 'ON_LEAVE').length;
  const pendingLeaves = leaveRequests.filter(r => r.status === 'PENDING');
  const pendingPayments = paymentVerifications.filter(p => p.status === 'PENDING_HR_AUDIT');
  const pendingApprovalsCount = pendingLeaves.length + pendingPayments.length;
  const attendancePercent = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

  const hrName = currentUser?.name?.trim() || profile?.name?.trim() || 'HR Manager';

  const handleScheduleInterviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candName.trim()) return;
    scheduleInterview({
      candidateName: candName,
      roleApplied: candRole,
      experience: candExp,
      email: candEmail || `${candName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
      phone: candPhone || '',
      interviewTime: candTime,
      interviewer: candInterviewer,
    });
    setCandName('');
    setCandEmail('');
    setCandPhone('');
    setIsInterviewModalOpen(false);
  };

  const handleBulkPayrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateBulkPayslips(payrollMonth, payrollYear);
    setIsPayslipGenModalOpen(false);
  };

  const exportHrReportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Role,Group,Status,CheckIn,Dials,Sales Achieved\n"
      + teamMembers.map(e => `"${e.name}","${e.role}","${e.group}","${e.attendanceStatus}","${e.checkInTime || 'N/A'}",${e.dialsToday},${e.salesAchieved}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HR_Org_Audit_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('✓ Exported HR Organization Audit Report (CSV)');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. Top Header Banner */}
      {activeTab === 'home' && (
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">
                Hello, {hrName}
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
              Human Resources & Operations • <span className="text-[#00A88B] font-bold">People Management</span> • <strong className="text-emerald-600">● {presentCount} Employees Checked In</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportHrReportCSV}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export Audit</span>
            </button>

            <button
              onClick={() => setIsInterviewModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-[#5B3DF5] font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition-all shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Schedule Interview</span>
            </button>

            <button
              onClick={() => setIsPayslipGenModalOpen(true)}
              className="flex items-center gap-2 bg-[#E6FAF6] border border-[#00C9A7]/30 text-[#00A88B] font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-[#00C9A7]/20 transition-all shadow-xs"
            >
              <CreditCard className="w-4 h-4" />
              <span>Run Payroll</span>
            </button>

            <button
              onClick={() => setIsAddEmployeeModalOpen(true)}
              className="flex items-center gap-2 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-[#00C9A7]/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Onboard Employee</span>
            </button>
          </div>
        </div>
      )}

      {/* 🔴 Live Team Meeting Banner for HR */}
      {activeTab === 'home' && (() => {
        const liveMeeting = teamMeetings.find(m => m.status === 'LIVE');
        if (!liveMeeting) return null;
        return (
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-2 border-emerald-500 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-md animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3.5">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-600"></span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    🔴 Live Team Meeting in Progress
                  </span>
                  <span className="text-xs font-mono text-emerald-800 font-bold">Conducted by Team Leader</span>
                </div>
                <h4 className="font-display font-black text-base text-[#0A2540] mt-0.5">
                  {liveMeeting.title}
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  {liveMeeting.invitedMemberName ? `Invited: ${liveMeeting.invitedMemberName}` : 'All team employees'} • HR can join to audit or assist
                </p>
              </div>
            </div>

            <button
              onClick={() => joinMeeting(liveMeeting)}
              className="px-5 py-2.5 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs rounded-xl flex items-center gap-2 shadow-md shadow-[#00C9A7]/30 transition-all active:scale-95"
            >
              <Video className="w-4 h-4" />
              <span>Join Video Session</span>
            </button>
          </div>
        );
      })()}

      {/* 2. Top Metric Cards (Widescreen 4-Column Grid) */}
      {activeTab === 'home' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          
          {/* Card 1: Total Employees */}
          <div 
            onClick={() => setTab('employees')}
            className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-[#00C9A7] transition-all group"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Active Workforce
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-mono-nums font-black text-2xl text-[#0A2540]">{totalEmployees}</span>
                <span className="text-xs font-bold text-slate-400">Headcount</span>
              </div>
              <span className="text-xs text-[#00A88B] font-extrabold mt-1 block group-hover:underline">
                Across {totalTeams} Teams →
              </span>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-[#E6FAF6] text-[#00C9A7] flex items-center justify-center shadow-xs">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Present Today */}
          <div 
            onClick={() => setTab('employees')}
            className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-all group"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Present Today
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-mono-nums font-black text-2xl text-emerald-600">{presentCount}</span>
                <span className="text-xs font-bold text-slate-400">/ {totalEmployees} Present</span>
              </div>
              <span className="text-xs text-emerald-600 font-extrabold mt-1 block">
                {attendancePercent}% Attendance
              </span>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Pending Approvals */}
          <div 
            onClick={() => setTab('clearances')}
            className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-rose-400 transition-all group"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Pending Approvals
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-mono-nums font-black text-2xl text-rose-600">{pendingApprovalsCount}</span>
                <span className="text-xs font-bold text-slate-400">Requests</span>
              </div>
              <span className="text-xs text-rose-600 font-extrabold mt-1 block">
                {pendingLeaves.length} Leaves • {pendingPayments.length} Payments
              </span>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Candidates in Pipeline */}
          <div 
            onClick={() => setTab('interviews')}
            className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-all group"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Interview Pipeline
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-mono-nums font-black text-2xl text-[#0A2540]">{candidates.length}</span>
                <span className="text-xs font-bold text-slate-400">Candidates</span>
              </div>
              <span className="text-xs text-indigo-600 font-extrabold mt-1 block">
                {candidates.filter(c => c.status === 'INTERVIEW_SCHEDULED').length} Scheduled Today
              </span>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5B3DF5] flex items-center justify-center shadow-xs">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

        </div>
      )}

      {/* --- TAB: HOME / OVERVIEW --- */}
      {activeTab === 'home' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* 2-Column Section: Candidates Pipeline + Payment Audit */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Candidate Interviews Table */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display font-black text-base text-[#0A2540]">Active Recruitment Pipeline</h3>
                  <p className="text-xs text-slate-400">Live candidate screening and interview rounds</p>
                </div>
                <button 
                  onClick={() => setTab('interviews')}
                  className="text-xs font-bold text-[#00A88B] hover:underline"
                >
                  View All Candidates →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3">Candidate</th>
                      <th className="pb-3">Role Applied</th>
                      <th className="pb-3">Slot / Interviewer</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {candidates.map((cand) => (
                      <tr key={cand.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3">
                          <div>
                            <span className="font-bold text-[#0A2540] block">{cand.candidateName}</span>
                            <span className="text-[10px] text-slate-400">{cand.phone}</span>
                          </div>
                        </td>
                        <td className="py-3 font-medium text-slate-700">
                          {cand.roleApplied}
                          <span className="text-[10px] text-slate-400 block">{cand.experience}</span>
                        </td>
                        <td className="py-3 font-mono text-slate-600">
                          <span className="text-xs block font-bold text-[#0A2540]">{cand.interviewTime}</span>
                          <span className="text-[10px] text-slate-400">{cand.interviewer}</span>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            cand.status === 'OFFER_EXTENDED' ? 'bg-emerald-100 text-emerald-800' :
                            cand.status === 'INTERVIEW_SCHEDULED' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {cand.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {cand.status === 'INTERVIEW_SCHEDULED' ? (
                            <button
                              onClick={() => updateCandidateStatus(cand.id, 'OFFER_EXTENDED', 'Cleared interview')}
                              className="py-1 px-2.5 rounded-lg bg-[#00C9A7] text-[#0A2540] font-bold text-[11px]"
                            >
                              Extend Offer
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-semibold">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 1 Col: Payment Verification & Onboarding Snapshot */}
            <div className="space-y-6">
              
              {/* Payment Verification Queue */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-black text-sm text-[#0A2540]">Payment Verifications</h4>
                  <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                    {pendingPayments.length} PENDING
                  </span>
                </div>

                <div className="space-y-2.5">
                  {paymentVerifications.slice(0, 2).map((pay) => (
                    <div key={pay.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-xs text-[#0A2540] block">{pay.leadName}</span>
                          <span className="text-[10px] text-slate-400">{pay.companyName}</span>
                        </div>
                        <span className="font-mono font-black text-xs text-[#00A88B]">
                          ₹{pay.dealAmount.toLocaleString()}
                        </span>
                      </div>

                      <div className="text-[10px] font-mono text-slate-500 bg-white p-1.5 rounded-lg border border-slate-100 flex justify-between">
                        <span>UTR: {pay.utrNumber}</span>
                        <span className="capitalize">{pay.paymentMode}</span>
                      </div>

                      {pay.status === 'PENDING_HR_AUDIT' ? (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => verifyPayment(pay.id, 'VERIFIED')}
                            className="flex-1 py-1 rounded-lg bg-[#00C9A7] text-[#0A2540] font-bold text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => verifyPayment(pay.id, 'REJECTED')}
                            className="py-1 px-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold text-xs"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded block text-center">
                          ✓ VERIFIED
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Onboarding Snapshot */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-black text-sm text-[#0A2540]">New Onboarding</h4>
                  <button onClick={() => setTab('employees')} className="text-[11px] font-bold text-[#00A88B] hover:underline">
                    View All →
                  </button>
                </div>

                <div className="space-y-2">
                  {onboardingList.slice(0, 2).map((onb) => (
                    <div key={onb.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-[#0A2540] block">{onb.name}</span>
                        <span className="text-[10px] text-slate-400">{onb.role} • Joined {onb.joiningDate}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        onb.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {onb.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* --- TAB: EMPLOYEES / DIRECTORY --- */}
      {activeTab === 'employees' && (
        selectedEmployeeFor360 ? (
          <Employee360ProfileView 
            member={selectedEmployeeFor360} 
            onBack={() => setSelectedEmployeeFor360(null)} 
            viewerRole="hr" 
          />
        ) : (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-black text-xl text-[#0A2540]">Employee Master Directory</h3>
                <p className="text-xs text-slate-500">Corporate roster, biometric status, and profiles</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search employees..."
                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00C9A7]"
                  />
                </div>

                <button
                  onClick={() => setIsAddEmployeeModalOpen(true)}
                  className="flex items-center gap-1.5 bg-[#00C9A7] text-[#0A2540] font-black text-xs px-4 py-2 rounded-xl shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Add Employee
                </button>
              </div>
            </div>

            {/* Widescreen Employee Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Employee</th>
                    <th className="pb-3">Designation</th>
                    <th className="pb-3">Group</th>
                    <th className="pb-3">Contact</th>
                    <th className="pb-3">Attendance</th>
                    <th className="pb-3">Check-in Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamMembers
                    .filter((emp) => {
                      const q = searchQuery.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        emp.name.toLowerCase().includes(q) ||
                        emp.empCode.toLowerCase().includes(q) ||
                        emp.role.toLowerCase().includes(q) ||
                        emp.group.toLowerCase().includes(q)
                      );
                    })
                    .map((emp) => (
                    <tr 
                      key={emp.id} 
                      onClick={() => setSelectedEmployeeFor360(emp)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-black text-xs overflow-hidden shrink-0">
                            <EmployeeAvatar
                              avatar={emp.avatar}
                              name={emp.name}
                              className="w-full h-full"
                              fallbackClassName="font-black text-xs"
                            />
                          </div>
                          <div>
                            <span className="font-bold text-[#0A2540] block group-hover:text-[#00A88B] transition-colors">{emp.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{emp.empCode}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 font-medium text-slate-700">{emp.role}</td>
                      <td className="py-3.5 font-semibold text-slate-600">{emp.group}</td>
                      <td className="py-3.5 font-mono text-slate-600">{emp.phone}</td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          emp.attendanceStatus === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          emp.attendanceStatus === 'LATE' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {emp.attendanceStatus}
                        </span>
                      </td>
                      <td className="py-3.5 font-mono text-slate-500">{emp.checkInTime || 'Not checked in'}</td>
                      <td className="py-3.5 text-right pr-2">
                        <span className="text-[#00A88B] font-bold text-xs group-hover:underline inline-flex items-center gap-1">
                          View 360° Profile →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* Onboarding Checklist Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display font-black text-lg text-[#0A2540]">Onboarding Checklist Progress</h3>
            <div className="space-y-3">
              {onboardingList.map((onb) => (
                <div key={onb.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-[#0A2540]">{onb.name} ({onb.empCode})</h4>
                    <span className="text-xs text-slate-400">{onb.role} • {onb.department}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {[
                      { key: 'documentsVerified', label: 'Docs Verified' },
                      { key: 'workstationAllocated', label: 'Workstation' },
                      { key: 'biometricEnrolled', label: 'Face ID' },
                      { key: 'trainingScheduled', label: 'Training' },
                    ].map((item) => {
                      const checked = onb.checklist[item.key as keyof typeof onb.checklist];
                      return (
                        <button
                          key={item.key}
                          onClick={() => toggleOnboardingChecklist(onb.id, item.key as any)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            checked ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-500'
                          }`}
                        >
                          {checked ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
        )
      )}

      {/* --- TAB: INTERVIEWS --- */}
      {activeTab === 'interviews' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-xl text-[#0A2540]">Recruitment & Interviews</h3>
                <p className="text-xs text-slate-500">Manage candidate pipeline, evaluation and offer letters</p>
              </div>
              <button
                onClick={() => setIsInterviewModalOpen(true)}
                className="flex items-center gap-2 bg-[#00C9A7] text-[#0A2540] font-black text-xs px-5 py-2.5 rounded-xl shadow-xs"
              >
                <Plus className="w-4 h-4" /> Schedule Interview
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((cand) => (
                <div key={cand.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-[#0A2540]">{cand.candidateName}</h4>
                      <span className="text-[11px] text-slate-500 block">{cand.roleApplied}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      cand.status === 'OFFER_EXTENDED' ? 'bg-emerald-100 text-emerald-800' :
                      cand.status === 'INTERVIEW_SCHEDULED' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {cand.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 font-medium">
                    <p>📧 {cand.email}</p>
                    <p>📞 {cand.phone}</p>
                    <p>🕒 {cand.interviewTime}</p>
                    <p>👤 Interviewer: {cand.interviewer}</p>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-slate-200/60">
                    <button
                      onClick={() => updateCandidateStatus(cand.id, 'OFFER_EXTENDED', 'Offer letter generated')}
                      className="flex-1 py-1.5 rounded-lg bg-[#00C9A7] text-[#0A2540] font-bold text-xs"
                    >
                      Extend Offer
                    </button>
                    <button
                      onClick={() => updateCandidateStatus(cand.id, 'REJECTED', 'Did not clear')}
                      className="py-1.5 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold text-xs"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB: PAYROLL --- */}
      {activeTab === 'payroll' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-xl text-[#0A2540]">Payroll Management</h3>
                <p className="text-xs text-slate-500">Corporate salary disbursements, tax deductions and payslip batches</p>
              </div>
              <button
                onClick={() => setIsPayslipGenModalOpen(true)}
                className="flex items-center gap-2 bg-[#00C9A7] text-[#0A2540] font-black text-xs px-5 py-2.5 rounded-xl shadow-xs"
              >
                <Plus className="w-4 h-4" /> Run Bulk Payroll
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Period</th>
                    <th className="pb-3">Basic Salary</th>
                    <th className="pb-3">HRA</th>
                    <th className="pb-3">Special Allowance</th>
                    <th className="pb-3">Incentives</th>
                    <th className="pb-3">Deductions</th>
                    <th className="pb-3">Net Pay</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {payslips.map((ps) => (
                    <tr key={ps.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 font-sans font-bold text-[#0A2540]">
                        {ps.month} {ps.year}
                      </td>
                      <td className="py-3.5 text-slate-700">₹{ps.basicSalary.toLocaleString()}</td>
                      <td className="py-3.5 text-slate-700">₹{ps.hra.toLocaleString()}</td>
                      <td className="py-3.5 text-slate-700">₹{ps.specialAllowance.toLocaleString()}</td>
                      <td className="py-3.5 text-emerald-600 font-bold">₹{ps.incentives.toLocaleString()}</td>
                      <td className="py-3.5 text-rose-600 font-bold">₹{(ps.pfDeduction + ps.taxDeduction).toLocaleString()}</td>
                      <td className="py-3.5 font-black text-[#00A88B] text-sm">₹{ps.netPay.toLocaleString()}</td>
                      <td className="py-3.5">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-extrabold">
                          {ps.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB: CLEARANCES & APPROVALS --- */}
      {activeTab === 'clearances' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Leaves */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display font-black text-lg text-[#0A2540]">Leave Approvals Audit</h3>
            <div className="space-y-3">
              {leaveRequests.map((req) => (
                <div key={req.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-[#0A2540] block">{req.employeeName || 'Employee'} ({req.leaveType})</span>
                    <span className="text-[11px] text-slate-500">{req.fromDate} to {req.toDate} • Reason: {req.reason}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {req.status}
                    </span>
                    {req.status === 'PENDING' && (
                      <button
                        onClick={() => approveLeaveRequest(req.id)}
                        className="py-1 px-3 bg-[#00C9A7] text-[#0A2540] font-bold text-xs rounded-lg"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exit Clearances */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display font-black text-lg text-[#0A2540]">Exit Clearances & Final Settlements</h3>
            <div className="space-y-3">
              {exitList.map((emp) => (
                <div key={emp.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-[#0A2540]">{emp.name} ({emp.empCode})</h4>
                    <span className="text-xs text-slate-500">Resigned: {emp.resignationDate} • LWD: {emp.lastWorkingDay}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { key: 'assetsReturned', label: 'Assets' },
                      { key: 'accountsSettled', label: 'Accounts' },
                      { key: 'knowledgeTransfer', label: 'KT' },
                      { key: 'relievingLetterIssued', label: 'Letter' },
                    ].map((item) => {
                      const checked = emp.checklist[item.key as keyof typeof emp.checklist];
                      return (
                        <button
                          key={item.key}
                          onClick={() => toggleExitChecklist(emp.id, item.key as any)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            checked ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-500'
                          }`}
                        >
                          {checked ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Add Employee Modal */}
      <AddEmployeeModal 
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
      />

      {/* Schedule Interview Modal */}
      {isInterviewModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95">
            <h3 className="font-display font-black text-lg text-[#0A2540]">Schedule Candidate Interview</h3>
            <form onSubmit={handleScheduleInterviewSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Candidate Name</label>
                <input
                  type="text"
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  placeholder="e.g. Anand Sharma"
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Role Applied</label>
                  <input
                    type="text"
                    value={candRole}
                    onChange={(e) => setCandRole(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Experience</label>
                  <input
                    type="text"
                    value={candExp}
                    onChange={(e) => setCandExp(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Email</label>
                  <input
                    type="email"
                    value={candEmail}
                    onChange={(e) => setCandEmail(e.target.value)}
                    placeholder="candidate@gmail.com"
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Phone</label>
                  <input
                    type="tel"
                    value={candPhone}
                    onChange={(e) => setCandPhone(e.target.value)}
                    placeholder="+91 98765..."
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Interview Slot</label>
                <input
                  type="text"
                  value={candTime}
                  onChange={(e) => setCandTime(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#00C9A7] text-[#0A2540] font-black shadow-md shadow-[#00C9A7]/25"
                >
                  Schedule Interview
                </button>
                <button
                  type="button"
                  onClick={() => setIsInterviewModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Run Bulk Payroll Modal */}
      {isPayslipGenModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95">
            <h3 className="font-display font-black text-lg text-[#0A2540]">Generate Organization Payroll</h3>
            <p className="text-xs text-slate-500">Calculate salary components, statutory PF & tax deductions for all active employees.</p>
            <form onSubmit={handleBulkPayrollSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Payroll Month</label>
                  <select
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Financial Year</label>
                  <input
                    type="text"
                    value={payrollYear}
                    onChange={(e) => setPayrollYear(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#00C9A7] text-[#0A2540] font-black shadow-md shadow-[#00C9A7]/25"
                >
                  Confirm & Dispatch Payslips
                </button>
                <button
                  type="button"
                  onClick={() => setIsPayslipGenModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
