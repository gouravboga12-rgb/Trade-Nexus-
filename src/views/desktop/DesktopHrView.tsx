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
  Video,
  Award,
  Printer,
  Receipt,
  Sparkles,
  Briefcase,
  Eye,
  ExternalLink,
  QrCode,
  Layers
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
    setIsFaceIdModalOpen,
    openOfferLetterModal,
    openExperienceCertModal,
    openRelievingLetterModal,
    openInvoiceModal,
    openGenerateOfferLetterModal,
    openGenerateExperienceCertModal,
    openGenerateRelievingLetterModal,
    openGenerateInvoiceModal,
    openPayslipModal,
    setIsIdCardModalOpen,
    setSelectedIdCardEmpId,
    offerLetters,
    experienceCerts,
    relievingLetters,
    invoices
  } = useApp();

  useScreenData('hrDashboard');

  const [activeSubTab, setActiveSubTab] = useState<string>(currentTab);
  const activeTab = onTabChange ? currentTab : activeSubTab;
  const setTab = onTabChange || setActiveSubTab;

  const [documentsSubTab, setDocumentsSubTab] = useState<'all' | 'id_cards' | 'offers' | 'experience' | 'relieving' | 'payslips' | 'invoices'>('all');
  const [docSearchQuery, setDocSearchQuery] = useState('');

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
              onClick={() => setTab('documents')}
              className="flex items-center gap-2 bg-[#06152B] border border-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-xs"
            >
              <Award className="w-4 h-4 text-[#00C9A7]" />
              <span>Documents Studio</span>
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
                  {liveMeeting.zoomMeetingId && (
                    <span className="text-[10px] font-mono bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-600" /> Zoom API Room
                    </span>
                  )}
                  <span className="text-xs font-mono text-emerald-800 font-bold">Conducted by {liveMeeting.createdByRole || 'Team Leader'}</span>
                </div>
                <h4 className="font-display font-black text-base text-[#0A2540] mt-0.5">
                  {liveMeeting.title}
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  {liveMeeting.invitedMemberName ? `Invited: ${liveMeeting.invitedMemberName}` : 'All team employees'} • HR can join to audit or assist
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {liveMeeting.zoomJoinUrl && (
                <a
                  href={liveMeeting.zoomJoinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all active:scale-95"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Zoom App</span>
                </a>
              )}
              <button
                onClick={() => joinMeeting(liveMeeting)}
                className="px-5 py-2.5 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs rounded-xl flex items-center gap-2 shadow-md shadow-[#00C9A7]/30 transition-all active:scale-95"
              >
                <Video className="w-4 h-4" />
                <span>Join Video Session</span>
              </button>
            </div>
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

      {/* --- TAB: DOCUMENTS & LETTERS STUDIO --- */}
      {activeTab === 'documents' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Studio Hero Banner */}
          <div className="bg-gradient-to-br from-[#06152B] via-[#0A2540] to-[#06152B] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden border border-slate-800 shadow-xl">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#00C9A7]/15 to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00C9A7]/20 border border-[#00C9A7]/40 text-[#00C9A7] text-xs font-bold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Official Corporate Document Suite</span>
                </div>
                <h2 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-white">
                  HR Documents & Letters Studio
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-xl leading-relaxed">
                  Generate, preview, customize, and print high-fidelity official Trade Nexus documents matching company design templates with digital verification and executive signatures.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => openInvoiceModal()}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/10 transition-all"
                >
                  <Receipt className="w-4 h-4 text-[#00C9A7]" />
                  <span>New Invoice</span>
                </button>

                <button
                  onClick={() => openOfferLetterModal()}
                  className="px-4 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs flex items-center gap-2 shadow-lg shadow-[#00C9A7]/20 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Generate Document</span>
                </button>
              </div>
            </div>

            {/* Quick Stat Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID Cards Ready</span>
                <span className="font-display font-black text-lg text-[#00C9A7]">{teamMembers.length} Employees</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Job / Offer Letters</span>
                <span className="font-display font-black text-lg text-white">{offerLetters.length + candidates.length} Issued</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Experience & Relieving</span>
                <span className="font-display font-black text-lg text-white">{experienceCerts.length + relievingLetters.length} Records</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Invoices & Payslips</span>
                <span className="font-display font-black text-lg text-[#00C9A7]">{invoices.length + payslips.length} Total</span>
              </div>
            </div>
          </div>

          {/* Subtabs Filter Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Templates (6)', icon: Layers },
                { id: 'id_cards', label: 'ID Cards', icon: QrCode },
                { id: 'offers', label: 'Job Letters', icon: FileText },
                { id: 'experience', label: 'Experience Certs', icon: Award },
                { id: 'relieving', label: 'Relieving Letters', icon: Briefcase },
                { id: 'payslips', label: 'Payroll Slips', icon: CreditCard },
                { id: 'invoices', label: 'Invoices', icon: Receipt },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = documentsSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setDocumentsSubTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-[#06152B] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#00C9A7]' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00C9A7]"
              />
            </div>
          </div>

          {/* 6 Studio Template Action Cards Grid */}
          {(documentsSubTab === 'all' || docSearchQuery) && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-display font-black text-sm text-[#0A2540] uppercase tracking-wider">
                  Official Template Catalog & Direct Generators
                </h3>
                <span className="text-xs text-slate-400">Select any template to launch live interactive editor</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                
                {/* 1. ID Card Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-[#00C9A7] transition-all group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-lg bg-[#06152B] text-white text-[10px] font-mono font-bold">
                        TEMPLATE 1 • tradenexus-id.png
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#06152B] text-[#00C9A7] flex items-center justify-center border border-[#00C9A7]/30">
                        <QrCode className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-display font-black text-base text-[#0A2540]">Employee ID Card</h4>
                        <p className="text-xs text-slate-400">Biometric Vertical Badge with QR</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      Dual-sided format with curved teal wave, employee photo circle, matrix metadata table, corporate seal and CEO signature.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#00A88B]">{teamMembers.length} Staff Enrolled</span>
                    <button
                      onClick={() => {
                        const first = teamMembers[0]?.id || '';
                        setSelectedIdCardEmpId(first);
                        setIsIdCardModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#06152B] hover:bg-[#00C9A7] text-white hover:text-[#0A2540] font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Generate / View</span>
                    </button>
                  </div>
                </div>

                {/* 2. Job Letter Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-[#00C9A7] transition-all group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-lg bg-[#06152B] text-white text-[10px] font-mono font-bold">
                        TEMPLATE 2 • 1.png
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5B3DF5] flex items-center justify-center border border-indigo-100">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-display font-black text-base text-[#0A2540]">Job Offer & Appointment</h4>
                        <p className="text-xs text-slate-400">Formal Employment Offer Letter</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      Official letterhead with angled header, candidate details, designation, remuneration terms, reporting details and CEO signature.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#5B3DF5]">Recruitment Ready</span>
                    <button
                      onClick={() => openGenerateOfferLetterModal()}
                      className="px-4 py-2 rounded-xl bg-[#06152B] hover:bg-[#00C9A7] text-white hover:text-[#0A2540] font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Draft Job Letter</span>
                    </button>
                  </div>
                </div>

                {/* 3. Experience Certificate Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-[#00C9A7] transition-all group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-lg bg-[#06152B] text-white text-[10px] font-mono font-bold">
                        TEMPLATE 3 • 2.png
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-display font-black text-base text-[#0A2540]">Experience Certificate</h4>
                        <p className="text-xs text-slate-400">Employment Verification Letter</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      Official certificate stating tenure dates, designation, satisfactory conduct clause, ref numbering, and CEO signature.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-600">Verification Studio</span>
                    <button
                      onClick={() => openGenerateExperienceCertModal()}
                      className="px-4 py-2 rounded-xl bg-[#06152B] hover:bg-[#00C9A7] text-white hover:text-[#0A2540] font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Issue Certificate</span>
                    </button>
                  </div>
                </div>

                {/* 4. Relieving Letter Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-[#00C9A7] transition-all group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-lg bg-[#06152B] text-white text-[10px] font-mono font-bold">
                        TEMPLATE 4 • 3.png
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#00A88B] flex items-center justify-center border border-teal-100">
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-display font-black text-base text-[#0A2540]">Relieving Letter</h4>
                        <p className="text-xs text-slate-400">Clearance & Separation Document</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      Formal discharge with resignation acceptance, last working day, official circular Trade Nexus stamp badge & CEO signature.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#00A88B]">Exit & Settlement</span>
                    <button
                      onClick={() => openGenerateRelievingLetterModal()}
                      className="px-4 py-2 rounded-xl bg-[#06152B] hover:bg-[#00C9A7] text-white hover:text-[#0A2540] font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Generate Letter</span>
                    </button>
                  </div>
                </div>

                {/* 5. Payroll Slip Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-[#00C9A7] transition-all group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-lg bg-[#06152B] text-white text-[10px] font-mono font-bold">
                        TEMPLATE 5 • 4.png
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-display font-black text-base text-[#0A2540]">Corporate Payroll Slip</h4>
                        <p className="text-xs text-slate-400">Monthly Compensation Ledger</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      Two-column metadata layout, earnings breakdown, statutory deductions, net pay callout & Finance Manager sign-off.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600">{payslips.length} Slips Generated</span>
                    <button
                      onClick={() => {
                        const first = payslips[0];
                        if (first) openPayslipModal(first);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#06152B] hover:bg-[#00C9A7] text-white hover:text-[#0A2540] font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View / Print</span>
                    </button>
                  </div>
                </div>

                {/* 6. Invoice Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-[#00C9A7] transition-all group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-lg bg-[#06152B] text-white text-[10px] font-mono font-bold">
                        TEMPLATE 6 • 5.png
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-100">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-display font-black text-base text-[#0A2540]">Commercial Tax Invoice</h4>
                        <p className="text-xs text-slate-400">B2B Billing & Client Invoice</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      Dark navy geometric header, itemized line items, automated subtotal/GST math, banking coordinates, and cursive sign-off.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-700">{invoices.length} Invoices Active</span>
                    <button
                      onClick={() => openGenerateInvoiceModal()}
                      className="px-4 py-2 rounded-xl bg-[#06152B] hover:bg-[#00C9A7] text-white hover:text-[#0A2540] font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Invoice</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Specific Active Tab Documents Registries */}
          {(documentsSubTab === 'experience' || documentsSubTab === 'all') && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display font-black text-base text-[#0A2540]">Experience Certificates Registry</h3>
                  <p className="text-xs text-slate-400">Issued service verification letters for employees</p>
                </div>
                <button
                  onClick={() => openGenerateExperienceCertModal()}
                  className="px-3.5 py-1.5 bg-[#00C9A7] text-[#0A2540] font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>New Certificate</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3">Employee</th>
                      <th className="pb-3">Ref Number</th>
                      <th className="pb-3">Designation</th>
                      <th className="pb-3">Tenure Period</th>
                      <th className="pb-3">Issued Date</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {experienceCerts.map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 font-bold text-[#0A2540]">{cert.employeeName} ({cert.empCode})</td>
                        <td className="py-3 font-mono text-slate-600">{cert.refNumber}</td>
                        <td className="py-3 text-slate-700">{cert.designation}</td>
                        <td className="py-3 font-medium text-slate-600">{cert.startDate} to {cert.endDate}</td>
                        <td className="py-3 text-slate-500">{cert.issuedDate}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => openExperienceCertModal(cert)}
                            className="px-3 py-1 bg-[#06152B] hover:bg-[#00C9A7] text-white hover:text-[#0A2540] font-bold text-xs rounded-lg transition-all"
                          >
                            Open / Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(documentsSubTab === 'relieving' || documentsSubTab === 'all') && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display font-black text-base text-[#0A2540]">Relieving Letters Registry</h3>
                  <p className="text-xs text-slate-400">Formal separation & settlement records</p>
                </div>
                <button
                  onClick={() => openGenerateRelievingLetterModal()}
                  className="px-3.5 py-1.5 bg-[#00C9A7] text-[#0A2540] font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>New Relieving Letter</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3">Employee</th>
                      <th className="pb-3">Designation</th>
                      <th className="pb-3">Resignation Date</th>
                      <th className="pb-3">Last Working Day</th>
                      <th className="pb-3">Issued Date</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {relievingLetters.map((letter) => (
                      <tr key={letter.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 font-bold text-[#0A2540]">{letter.employeeName} ({letter.empCode})</td>
                        <td className="py-3 text-slate-700">{letter.designation}</td>
                        <td className="py-3 font-medium text-slate-600">{letter.resignationDate}</td>
                        <td className="py-3 font-medium text-slate-600">{letter.lastWorkingDate}</td>
                        <td className="py-3 text-slate-500">{letter.issuedDate}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => openRelievingLetterModal(letter)}
                            className="px-3 py-1 bg-[#06152B] hover:bg-[#00C9A7] text-white hover:text-[#0A2540] font-bold text-xs rounded-lg transition-all"
                          >
                            Open / Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(documentsSubTab === 'invoices' || documentsSubTab === 'all') && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display font-black text-base text-[#0A2540]">Commercial Invoices Registry</h3>
                  <p className="text-xs text-slate-400">B2B client invoices and billing settlements</p>
                </div>
                <button
                  onClick={() => openGenerateInvoiceModal()}
                  className="px-3.5 py-1.5 bg-[#00C9A7] text-[#0A2540] font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Create Invoice</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3">Invoice No</th>
                      <th className="pb-3">Client / Organization</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 font-mono font-bold text-[#0A2540]">{inv.invoiceNumber}</td>
                        <td className="py-3 font-medium text-slate-800">
                          {inv.clientName}
                          {inv.clientCompany && <span className="text-slate-400 block text-[10px]">{inv.clientCompany}</span>}
                        </td>
                        <td className="py-3 text-slate-600">{inv.date}</td>
                        <td className="py-3 font-mono font-bold text-[#00A88B]">₹{Number(inv.grandTotal).toLocaleString('en-IN')}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => openInvoiceModal(inv)}
                            className="px-3 py-1 bg-[#06152B] hover:bg-[#00C9A7] text-white hover:text-[#0A2540] font-bold text-xs rounded-lg transition-all"
                          >
                            Open / Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
