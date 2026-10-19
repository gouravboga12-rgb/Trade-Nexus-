import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useScreenData } from '../../hooks/useScreenData';
import {
  Users,
  UserCheck,
  Layers,
  Download,
  Plus,
  FileSpreadsheet,
  Search,
  TrendingUp,
  PhoneCall,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  CalendarCheck,
  Wallet,
  MapPin,
  Crosshair,
  Save,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Filter,
  Video,
  DollarSign,
  Award,
  ArrowRight,
  Trash2,
  Building2,
  Receipt,
  Calendar,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Phone,
  FileText,
  X,
  Undo2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { OfficeSettings, TeamMember, UserRole, PaymentVerificationItem } from '../../types';
import { api } from '../../services/api';
import { InvoicesLedger } from '../../components/common/InvoicesLedger';
import { RecentLeadUploadsLedger } from '../../components/common/RecentLeadUploadsLedger';
import { ExcelLeadUploadModal } from '../../components/modals/ExcelLeadUploadModal';
import { AddEmployeeModal } from '../../components/modals/AddEmployeeModal';
import { EmployeeRecordModal, PORTAL_LABEL } from '../../components/modals/EmployeeRecordModal';
import { CreateTeamModal } from '../../components/modals/CreateTeamModal';
import { ManageTeamMembersModal } from '../../components/modals/ManageTeamMembersModal';
import { TeamGroup } from '../../types';
import { Employee360ProfileView } from '../Employee360ProfileView';
import { AdminCalendarConfig } from '../../components/common/AdminCalendarConfig';
import { AdminScheduleMeetingModal } from '../../components/modals/AdminScheduleMeetingModal';
import { getTodayDateIST, getLeadDate, isDateInPeriodIST, formatLeadAssignmentDateTime } from '../../utils/dateUtils';
import { isTelecallerOrCallingEmployee, isLeadUnassigned } from '../../utils/teamUtils';
import {
  downloadCsvBlob,
  exportEmployeesRosterCsv,
  exportAttendanceRegisterCsv,
  exportCallsAndConversionsCsv,
  exportSalesVsTargetCsv,
  exportPaymentVerificationsCsv,
  exportLeadAllocationCsv,
} from '../../utils/csvExportUtils';

interface DesktopAdminViewProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const downloadCsv = (filename: string, header: string, rows: string[]) => {
  downloadCsvBlob(filename, header, rows);
};

export const DesktopAdminView: React.FC<DesktopAdminViewProps> = ({
  currentTab = 'home',
  onTabChange,
}) => {
  const {
    teamMembers,
    teamGroups,
    leadBatches,
    assignedLeads,
    clients,
    paymentVerifications,
    attendanceLogs,
    leaveRequests,
    approveLeaveRequest,
    rejectLeaveRequest,
    setIsExcelUploadModalOpen,
    assignTeamLeaderToGroup,
    verifyPayment,
    deletePaymentVerification,
    deleteAssignedLead,
    deleteLeadBatch,
    reclaimAssignedLeads,
    bulkDeleteAssignedLeads,
    reassignLeadsBetween,
    teamMeetings,
    joinMeeting,
    deleteTeamMeeting,
    deleteEmployee,
    triggerToast,
    autoDistributeFreshLeads,
    calendarSettings,
    updateCalendarSettings,
    reEvaluateTodayAttendance,
  } = useApp();

  useScreenData('adminDashboard');

  const [internalTab, setInternalTab] = useState<string>(currentTab);
  const activeTab = onTabChange ? currentTab : internalTab;
  const setTab = onTabChange || setInternalTab;

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'EMPLOYEE' | 'LEADER' | 'HR'>('ALL');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [openEmployee, setOpenEmployee] = useState<TeamMember | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<TeamMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);

  // Where the office is — the reference point every check-in is measured against
  const [office, setOffice] = useState<OfficeSettings | null>(null);
  const [officeDraft, setOfficeDraft] = useState<Partial<OfficeSettings>>({});
  const [locating, setLocating] = useState(false);
  const [moveFrom, setMoveFrom] = useState('');
  const [moveTo, setMoveTo] = useState('');
  const [moveCount, setMoveCount] = useState('');
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [managingSquad, setManagingSquad] = useState<TeamGroup | null>(null);

  // Attendance Report date picker & filter state
  const [attendanceDate, setAttendanceDate] = useState<string>(
    () => getTodayDateIST()
  );
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'PROBLEMS'>('ALL');

  // Approvals subtab & rejection prompt
  const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = useState(false);
  const [approvalTab, setApprovalTab] = useState<'PAYMENTS' | 'LEAVES' | 'HISTORY'>('PAYMENTS');
  const [revenueDealFilter, setRevenueDealFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED'>('ALL');
  const [inspectingPayment, setInspectingPayment] = useState<PaymentVerificationItem | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<{
    id: string;
    type: 'PAYMENT' | 'LEAVE';
    name: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Leads day-wise filter state
  const [leadsDateFilter, setLeadsDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [leadsCustomStart, setLeadsCustomStart] = useState<string>(() => getTodayDateIST());
  const [leadsCustomEnd, setLeadsCustomEnd] = useState<string>(() => getTodayDateIST());
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [leadsSearchQuery, setLeadsSearchQuery] = useState('');
  const [leadsStatusFilter, setLeadsStatusFilter] = useState<string>('ALL');
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [reassigningBatch, setReassigningBatch] = useState<{
    batchId: string;
    fileName: string;
    leads: any[];
    fromMemberId: string;
    fromMemberName: string;
  } | null>(null);
  const [targetReassignMemberId, setTargetReassignMemberId] = useState<string>('');
  const [selectedMemberLeadIds, setSelectedMemberLeadIds] = useState<string[]>([]);
  const [memberLeadsSearchQuery, setMemberLeadsSearchQuery] = useState('');
  const [memberLeadsStatusFilter, setMemberLeadsStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    api.getOffice().then(setOffice).catch(() => setOffice(null));
  }, []);

  const officeField = <K extends keyof OfficeSettings>(k: K) =>
    (officeDraft[k] !== undefined ? officeDraft[k] : office?.[k]) as OfficeSettings[K];

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      triggerToast('This device cannot report a location.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOfficeDraft((d) => ({
          ...d,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
        setLocating(false);
        triggerToast('\u2713 Location read. Press Save to use it as the office.');
      },
      () => {
        setLocating(false);
        triggerToast('\u2717 Could not read your location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const saveOffice = async () => {
    try {
      const saved = await api.updateOffice({ ...office, ...officeDraft } as Partial<OfficeSettings>);
      setOffice(saved);
      setOfficeDraft({});
      triggerToast('\u2713 Office location saved');
    } catch {
      triggerToast('\u2717 Could not save the office location');
    }
  };

  // ---- Real figures, all derived from what is actually in the database ----
  const headcount = teamMembers.length;
  const presentToday = teamMembers.filter((m) => m.attendanceStatus === 'PRESENT').length;
  const callsToday = teamMembers.reduce((sum, m) => sum + (m.dialsToday || 0), 0);

  // Deduplicate won deal payment verifications to avoid double cards in Needs Your Attention & Ledger
  const uniquePayments = useMemo<PaymentVerificationItem[]>(() => {
    const seen = new Set<string>();
    return paymentVerifications.filter((p: PaymentVerificationItem) => {
      const key = `${(p.companyName || p.leadName || '').trim().toLowerCase()}_${(p.telecallerName || '').trim().toLowerCase()}_${p.dealAmount}_${p.status}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [paymentVerifications]);

  // Helper to extract customer details (phone, bank account, IFSC, UPI, name) with fallback to matching assigned lead
  const getPaymentCustomerInfo = (p?: PaymentVerificationItem | null) => {
    if (!p) return { customerName: '', customerPhone: '', customerBankName: '', customerAccountNumber: '', customerIfscCode: '', customerUpiId: '' };
    const leadId = p.id && p.id.startsWith('pay-') ? p.id.slice(4) : '';
    const matchedLead = assignedLeads.find(l => 
      (leadId && l.id === leadId) || 
      (p.customerPhone && l.phone && l.phone.trim() === p.customerPhone.trim()) ||
      (p.leadName && l.name && l.name.trim().toLowerCase() === p.leadName.trim().toLowerCase())
    );
    return {
      customerName: p.customerName || matchedLead?.customerName || p.leadName || matchedLead?.name || '',
      customerPhone: p.customerPhone || matchedLead?.customerPhone || matchedLead?.phone || '',
      customerBankName: p.customerBankName || matchedLead?.customerBankName || '',
      customerAccountNumber: p.customerAccountNumber || matchedLead?.customerAccountNumber || '',
      customerIfscCode: p.customerIfscCode || matchedLead?.customerIfscCode || '',
      customerUpiId: p.customerUpiId || matchedLead?.customerUpiId || '',
    };
  };

  const verifiedPayments = useMemo(() => uniquePayments.filter(p => p.status === 'VERIFIED'), [uniquePayments]);
  const pendingPaymentsList = useMemo(() => uniquePayments.filter(p => p.status === 'PENDING_HR_AUDIT'), [uniquePayments]);
  const totalVerifiedRevenue = useMemo(() => verifiedPayments.reduce((sum, p) => sum + (p.dealAmount || 0), 0), [verifiedPayments]);
  // SOURCE OF TRUTH: only verified payment records drive salesAchieved
  const salesAchieved = totalVerifiedRevenue;

  const totalRosterTarget = useMemo(() => teamMembers.reduce((sum, m) => sum + (m.salesTarget || 0), 0), [teamMembers]);
  const totalGroupTarget = useMemo(() => (teamGroups || []).reduce((sum, g) => sum + (g.monthlyTarget || 0), 0), [teamGroups]);
  const salesTarget = Math.max(totalRosterTarget, totalGroupTarget, 500000);
  const salesPercent = Math.round((salesAchieved / Math.max(1, salesTarget)) * 100);

  const pendingPayments = uniquePayments.filter((p: PaymentVerificationItem) => p.status === 'PENDING_HR_AUDIT');
  const leadsDueToday = clients.filter((c) => c.status === 'Due Today');

  // Things that need a decision from the Admin today
  const awayWithoutLeave = teamMembers.filter((m) => m.attendanceStatus === 'ABSENT');
  const idleToday = teamMembers.filter(
    (m) => m.attendanceStatus === 'PRESENT' && (m.dialsToday || 0) === 0
  );

  const nonAdminMembers = teamMembers.filter(
    (m) => m.portal !== 'admin' && m.empCode !== 'TNX-AD01' && !(m.role || '').toLowerCase().includes('admin')
  );

  // Strictly filter for Telecaller employees (excludes Admin, HR, Team Leaders, Accounts, Coaches)
  const isTelecallerMember = isTelecallerOrCallingEmployee;

  const telecallerMembers = teamMembers.filter(isTelecallerMember);
  const telecallerCount = telecallerMembers.length;

  const leaderCount = nonAdminMembers.filter((m) => {
    const p = (m.portal || '').toLowerCase();
    const r = (m.role || '').toLowerCase();
    return p === 'team_leader' || r.includes('leader');
  }).length;

  const hrCount = nonAdminMembers.filter((m) => {
    const p = (m.portal || '').toLowerCase();
    const r = (m.role || '').toLowerCase();
    return p === 'hr' || r.includes('hr');
  }).length;

  const filteredPeople = nonAdminMembers.filter((m) => {
    const q = searchQuery.trim().toLowerCase();
    const portalStr = (m.portal || '').toLowerCase();
    const roleStr = (m.role || '').toLowerCase();
    const matchesSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.empCode.toLowerCase().includes(q) ||
      roleStr.includes(q) ||
      (m.group ?? '').toLowerCase().includes(q) ||
      portalStr.includes(q);

    const isLeader = roleStr.includes('leader') || portalStr === 'team_leader';
    const isHr = roleStr.includes('hr') || portalStr === 'hr';
    const matchesRole =
      roleFilter === 'ALL'
        ? true
        : roleFilter === 'LEADER'
        ? isLeader
        : roleFilter === 'HR'
        ? isHr
        : !isLeader && !isHr;

    return matchesSearch && matchesRole;
  });

  const todayYMD = getTodayDateIST();
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayYMD = yesterdayObj.toISOString().slice(0, 10);
  const filteredAssignedLeadsByDate = assignedLeads.filter((l) => {
    return isDateInPeriodIST(getLeadDate(l), leadsDateFilter, leadsCustomStart, leadsCustomEnd);
  });

  const leadsPerEmployee = telecallerMembers.map((m) => {
    const mine = filteredAssignedLeadsByDate.filter(
      (l) =>
        l.assignedToEmployeeId === m.id ||
        l.assignedToEmployeeId === m.empCode ||
        (l.assignedToEmployeeName &&
          l.assignedToEmployeeName.toLowerCase() === m.name.toLowerCase())
    );
    return {
      member: m,
      total: mine.length,
      fresh: mine.filter((l) => (l.callCount || 0) === 0 && l.status !== 'CONVERTED').length,
      called: mine.filter((l) => (l.callCount || 0) > 0).length,
      interested: mine.filter((l) => l.status === 'INTERESTED').length,
      converted: mine.filter((l) => l.status === 'CONVERTED').length,
    };
  });

  const pendingLeaves = leaveRequests.filter((l) => l.status === 'PENDING' && l.approvalStage === 'PENDING_ADMIN');

  // ---------------------------------------------------------------- shells

  const Card: React.FC<{ label: string; value: string; sub?: string; tone?: 'plain' | 'good' | 'warn' }> = ({
    label,
    value,
    sub,
    tone = 'plain',
  }) => (
    <div className="nexus-card p-5 bg-white border border-slate-200 shadow-sm">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
        {label}
      </span>
      <span
        className={`font-mono-nums font-black text-2xl block ${
          tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-[#0A2540]'
        }`}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-slate-500 font-semibold mt-0.5 block">{sub}</span>}
    </div>
  );

  const PageHead: React.FC<{ title: string; blurb: string; children?: React.ReactNode }> = ({
    title,
    blurb,
    children,
  }) => (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">{title}</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">{blurb}</p>
      </div>
      {children && <div className="flex items-center gap-3 flex-shrink-0">{children}</div>}
    </div>
  );

  const Empty: React.FC<{ text: string }> = ({ text }) => (
    <div className="p-8 text-center text-xs text-slate-400 font-semibold">{text}</div>
  );

  // ---------------------------------------------------------------- screens

  const renderOverview = () => (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHead 
        title="Overview" 
        blurb="Where the company stands today, and what is waiting for you."
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsScheduleMeetingOpen(true)}
            className="px-4 py-2.5 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs rounded-xl flex items-center gap-2 shadow-md shadow-[#00C9A7]/30 transition-all active:scale-95 cursor-pointer"
          >
            <Video className="w-4 h-4 text-[#0A2540]" />
            <span>Schedule Zoom Meeting</span>
            <span className="text-[9px] bg-[#0A2540] text-[#00C9A7] font-black px-1.5 py-0.5 rounded uppercase">Cloud</span>
          </button>
        </div>
      </PageHead>

      {/* 🔴 Active LIVE & Scheduled Meetings Banner for Admin */}
      {(() => {
        const activeMeetings = teamMeetings.filter(m => m.status === 'LIVE' || m.status === 'UPCOMING');
        if (!activeMeetings.length) return null;

        const seen = new Set<string>();
        const deduplicatedMeetings = activeMeetings.filter(m => {
          const key = m.id || `${(m.title || '').trim().toLowerCase()}_${(m.dateTime || '').trim().toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                </span>
                <h4 className="font-display font-black text-sm text-[#0A2540]">
                  Active & Scheduled Zoom Floor Calls ({deduplicatedMeetings.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleMeetingOpen(true)}
                className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Book Another Meeting</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {deduplicatedMeetings.map((mtg) => {
                const isLive = mtg.status === 'LIVE';
                const isInvited = mtg.includeAdmin || mtg.invitedMemberName?.toLowerCase().includes('admin');
                const hasZoom = Boolean(mtg.zoomJoinUrl || mtg.zoomMeetingId);

                return (
                  <div
                    key={mtg.id}
                    className={`p-4 rounded-3xl border transition-all shadow-xs flex flex-col justify-between gap-3 ${
                      isLive 
                        ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border-emerald-400 ring-2 ring-emerald-400/20 shadow-md'
                        : isInvited
                        ? 'bg-gradient-to-r from-amber-50/70 via-white to-sky-50/70 border-amber-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isLive
                              ? 'bg-emerald-200 text-emerald-900 animate-pulse'
                              : 'bg-sky-100 text-sky-800'
                          }`}>
                            {isLive ? '🔴 LIVE NOW' : '📅 UPCOMING'}
                          </span>

                          {hasZoom && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                              <Video className="w-3 h-3 text-blue-600" />
                              <span>Zoom Room</span>
                            </span>
                          )}

                          {isInvited && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              👑 ADMIN PRIORITY
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-mono font-bold text-slate-500">
                          {mtg.dateTime}
                        </span>
                      </div>

                      <h4 className="font-display font-black text-base text-[#0A2540]">
                        {mtg.title}
                      </h4>

                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        Host: <span className="font-bold text-slate-700">{mtg.hostName || 'Executive Admin'}</span> • Scope: <span className="font-bold text-slate-700">{mtg.targetAudience || 'Company Wide'} {mtg.targetTeam ? `(${mtg.targetTeam})` : ''}</span>
                        {mtg.zoomMeetingId ? ` • ID: ${mtg.zoomMeetingId}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 gap-2">
                      <div className="text-[11px] text-slate-400 font-medium">
                        {mtg.attendeesCount ? `${mtg.attendeesCount} Expected Participants` : 'Open Floor Room'}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => deleteTeamMeeting(mtg.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Cancel/Delete Meeting"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => joinMeeting(mtg)}
                          className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer ${
                            isLive
                              ? 'bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540]'
                              : 'bg-[#0A2540] hover:bg-teal-900 text-white'
                          }`}
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>{isLive ? 'Join Live Session' : 'Start / Launch Zoom'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card label="Employees" value={String(headcount)} sub="on the books" />
        <Card
          label="Present today"
          value={`${presentToday} of ${headcount}`}
          sub={`${Math.round((presentToday / Math.max(1, headcount)) * 100)}% checked in`}
          tone={presentToday === headcount ? 'good' : 'warn'}
        />
        <Card label="Calls made today" value={String(callsToday)} sub="across all employees" />
        <Card
          label="Sales this month"
          value={inr(salesAchieved)}
          sub={`${salesPercent}% of ${inr(salesTarget)} target`}
        />
        <Card
          label="Waiting for approval"
          value={String(pendingPayments.length)}
          sub="payments needing your sign-off"
          tone={pendingPayments.length ? 'warn' : 'good'}
        />
        <Card label="Leads due today" value={String(leadsDueToday.length)} sub="follow-ups scheduled" />
      </div>

      {/* Pending Leave Approvals Quick Escalation Card for Super Admin */}
      {pendingLeaves.length > 0 && (
        <div className="nexus-card bg-amber-50/75 border-2 border-amber-300 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                {pendingLeaves.length}
              </div>
              <div>
                <h4 className="font-display font-black text-base text-amber-950 uppercase tracking-wider">
                  Pending Leave Requests ({pendingLeaves.length})
                </h4>
                <span className="text-xs text-amber-800">Final executive sanction waiting on floor</span>
              </div>
            </div>
            <button
              onClick={() => setTab('approvals')}
              className="text-xs font-bold text-amber-900 hover:underline"
            >
              View All Approvals →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingLeaves.slice(0, 4).map((l) => (
              <div key={l.id} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-sm text-[#0A2540] block">{l.employeeName || 'Staff Member'}</span>
                    <span className="text-xs text-amber-800 font-semibold">{l.leaveType} • {l.fromDate} to {l.toDate} ({l.totalDays || 1} day(s))</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                    PENDING
                  </span>
                </div>
                {l.reason && (
                  <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    "{l.reason}"
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      approveLeaveRequest(l.id);
                      triggerToast(`✓ Approved leave request for ${l.employeeName || 'Staff'}`);
                    }}
                    className="py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Leave</span>
                  </button>
                  <button
                    onClick={() => {
                      rejectLeaveRequest(l.id, 'Declined by Admin due to operational schedule');
                      triggerToast(`✗ Rejected leave request for ${l.employeeName || 'Staff'}`);
                    }}
                    className="py-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="nexus-card bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <h3 className="font-display font-black text-base text-[#0A2540]">Needs your attention</h3>
          </div>

          {!pendingPayments.length && !awayWithoutLeave.length && !idleToday.length ? (
            <Empty text="Nothing outstanding. Everyone is checked in and no approvals are pending." />
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingPayments.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTab('approvals')}
                  className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-xs font-bold text-[#0A2540] block">
                      {inr(p.dealAmount)} from {p.companyName}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Closed by {p.telecallerName} · awaiting your approval
                    </span>
                  </div>
                  <Wallet className="w-4 h-4 text-amber-600 flex-shrink-0" />
                </button>
              ))}

              {awayWithoutLeave.map((m) => (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#0A2540] block">{m.name} is absent</span>
                    <span className="text-[11px] text-slate-500">No approved leave on record</span>
                  </div>
                  <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                </div>
              ))}

              {idleToday.map((m) => (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#0A2540] block">{m.name} has made no calls</span>
                    <span className="text-[11px] text-slate-500">Checked in at {m.checkInTime || '—'}</span>
                  </div>
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="nexus-card bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00A88B]" />
            <h3 className="font-display font-black text-base text-[#0A2540]">Today's activity</h3>
          </div>

          {!teamMembers.length ? (
            <Empty text="No employees yet." />
          ) : (
            <div className="divide-y divide-slate-100">
              {[...teamMembers]
                .sort((a, b) => (b.dialsToday || 0) - (a.dialsToday || 0))
                .slice(0, 6)
                .map((m) => (
                  <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#0A2540] block truncate">{m.name}</span>
                      <span className="text-[11px] text-slate-500">{m.group}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-mono-nums font-black text-sm text-[#0A2540] block">
                        {m.dialsToday || 0} calls
                      </span>
                      <span className="text-[11px] text-slate-500">{inr(m.salesAchieved || 0)}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPeople = () => (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHead title="People" blurb="Everyone who works here, and the teams they belong to.">
        <button
          onClick={() => exportEmployeesRosterCsv(teamMembers)}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Download to Excel</span>
        </button>
        <button
          onClick={() => setIsAddUserModalOpen(true)}
          className="flex items-center gap-2 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-[#00C9A7]/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Employee</span>
        </button>
      </PageHead>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3.5 py-2 flex-1 min-w-[16rem]">
          <Search className="w-4 h-4 text-slate-400 mr-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code, role or team"
            className="bg-transparent text-xs text-slate-800 focus:outline-none w-full font-medium"
          />
        </div>
        {[
          { key: 'ALL', label: 'Everyone', count: nonAdminMembers.length },
          { key: 'EMPLOYEE', label: 'Telecallers (Employees)', count: telecallerCount, icon: '📞' },
          { key: 'LEADER', label: 'Team Leaders', count: leaderCount, icon: '⭐' },
          { key: 'HR', label: 'HR Staff', count: hrCount, icon: '👥' },
        ].map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setRoleFilter(tabItem.key as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
              roleFilter === tabItem.key
                ? 'bg-[#0A2540] text-[#00C9A7] border-[#0A2540] shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tabItem.icon && <span>{tabItem.icon}</span>}
            <span>{tabItem.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                roleFilter === tabItem.key
                  ? 'bg-[#00C9A7] text-[#0A2540] font-black'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tabItem.count}
            </span>
          </button>
        ))}
      </div>

      <div className="nexus-card bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[46rem]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold text-[10px] bg-slate-50/70">
                <th className="py-3 px-5">Name</th>
                <th className="py-3 px-5">Code</th>
                <th className="py-3 px-5">Job title</th>
                <th className="py-3 px-5">Portal</th>
                <th className="py-3 px-5">Team</th>
                <th className="py-3 px-5">Calls today</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPeople.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => setOpenEmployee(m)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-black text-[10px] flex-shrink-0">
                        {m.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-[#0A2540]">{m.name}</span>
                      {m.active === 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 uppercase">
                          Inactive
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-5 font-mono text-slate-500">{m.empCode}</td>
                  <td className="py-3.5 px-5 text-slate-600 font-medium">{m.role}</td>
                  <td className="py-3.5 px-5">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-lg inline-flex items-center gap-1 border ${
                        m.portal === 'admin'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : m.portal === 'hr' || (m.role || '').toLowerCase().includes('hr')
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : m.portal === 'team_leader' || (m.role || '').toLowerCase().includes('leader')
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}
                    >
                      {m.portal === 'team_leader' || (m.role || '').toLowerCase().includes('leader')
                        ? '⭐ Team Leader'
                        : m.portal === 'hr' || (m.role || '').toLowerCase().includes('hr')
                        ? '👥 HR'
                        : m.portal === 'admin'
                        ? '👑 Admin'
                        : '📞 Employee'}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-600">{m.group}</td>
                  <td className="py-3.5 px-5 font-mono-nums font-bold text-[#0A2540]">{m.dialsToday || 0}</td>
                  <td className="py-3.5 px-5">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        m.attendanceStatus === 'PRESENT'
                          ? 'bg-emerald-50 text-emerald-700'
                          : m.attendanceStatus === 'LATE'
                          ? 'bg-amber-50 text-amber-700'
                          : m.attendanceStatus === 'ON_LEAVE'
                          ? 'bg-sky-50 text-sky-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {m.attendanceStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                    {m.portal !== 'admin' && m.empCode !== 'TNX-AD01' && !(m.role || '').toLowerCase().includes('admin') ? (
                      <button
                        onClick={() => setEmployeeToDelete(m)}
                        title={`Delete ${m.name}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">Delete</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Protected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filteredPeople.length && (
          <Empty text={teamMembers.length ? 'Nobody matches that search.' : 'No employees yet. Use Add Employee to begin.'} />
        )}
      </div>

      {/* Teams live inside People, not as their own tab */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" />
            <h3 className="font-display font-black text-base text-[#0A2540]">Teams</h3>
          </div>
          <button
            onClick={() => setIsCreateTeamOpen(true)}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-[#00C9A7] text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create team</span>
          </button>
        </div>

        {!teamGroups.length ? (
          <div className="nexus-card bg-white border border-slate-200 shadow-sm">
            <Empty text="No teams yet." />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {teamGroups.map((g) => {
              const members = teamMembers.filter((m) =>
                (m.group || '').split(',').map((s) => s.trim().toLowerCase()).includes(g.name.trim().toLowerCase())
              );
              return (
                <div key={g.id} className="nexus-card p-5 bg-white border border-slate-200 shadow-sm space-y-3">
                  <div>
                    <h4 className="font-display font-black text-sm text-[#0A2540]">{g.name}</h4>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Led by {g.leaderName || '—'} · {members.length} member{members.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-500 font-bold">Monthly target</span>
                    <span className="font-mono-nums font-black text-[#0A2540]">{inr(g.monthlyTarget)}</span>
                  </div>

                  <select
                    value={g.leaderName || ''}
                    onChange={(e) => assignTeamLeaderToGroup(g.id, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                  >
                    <option value="">— Assign a Team Leader —</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} — {m.role}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setManagingSquad(g)}
                    className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-xl transition-all border border-slate-200 hover:border-slate-300"
                  >
                    <Users className="w-3.5 h-3.5 text-[#00A88B]" />
                    <span>{members.length === 0 ? '+ Add Members' : `Manage Squad (${members.length})`}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderAttendance = () => {
    // Record lookup based on selected date with robust multi-identifier matching
    const recordFor = (employeeId: string, memberName?: string, memberCode?: string) =>
      attendanceLogs.find(
        (a) =>
          a.date === attendanceDate &&
          (a.employeeId === employeeId ||
            (memberCode && a.employeeId === memberCode) ||
            a.id === `att-${attendanceDate}-${employeeId}` ||
            (memberName && a.employeeName && a.employeeName.toLowerCase().trim() === memberName.toLowerCase().trim()))
      );

    const isProblem = (m: TeamMember, rec?: ReturnType<typeof recordFor>) => {
      const status = rec?.status || m.attendanceStatus;
      if (status === 'ABSENT' || status === 'LATE') return true;
      if (rec && rec.locationStatus === 'AWAY') return true;
      return false;
    };

    const locationCell = (rec: ReturnType<typeof recordFor>) => {
      if (!rec) return <span className="text-slate-400">—</span>;
      if (rec.locationStatus === 'AT_OFFICE')
        return <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">At office</span>;
      if (rec.locationStatus === 'AWAY')
        return (
          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-50 text-amber-700">
            {rec.checkInDistanceM != null ? `${(rec.checkInDistanceM / 1000).toFixed(1)} km away` : 'Away'}
          </span>
        );
      if (rec.locationStatus === 'OFFICE_NOT_SET')
        return <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500">Office not set</span>;
      return <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500">Not shared</span>;
    };

    const selectedDateFormatted = new Date(attendanceDate + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const membersWithRecs = teamMembers.map((m) => ({
      m,
      rec: recordFor(m.id, m.name, m.empCode),
      status: recordFor(m.id, m.name, m.empCode)?.status || m.attendanceStatus,
    }));

    const presentToday = membersWithRecs.filter((x) => x.status === 'PRESENT').length;
    const late = membersWithRecs.filter((x) => x.status === 'LATE').length;
    const onLeave = membersWithRecs.filter((x) => x.status === 'ON_LEAVE' || x.status === 'LEAVE').length;
    const absent = membersWithRecs.filter((x) => x.status === 'ABSENT').length;
    const problemsCount = teamMembers.filter((m) => isProblem(m, recordFor(m.id, m.name, m.empCode))).length;

    const displayedMembers = attendanceFilter === 'PROBLEMS'
      ? teamMembers.filter((m) => isProblem(m, recordFor(m.id, m.name, m.empCode)))
      : teamMembers;

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title="Attendance Report" blurb={selectedDateFormatted}>
          <button
            onClick={() =>
              downloadCsv(
                `Attendance_${attendanceDate}`,
                'Name,Team,Status,Check-in,Method,Location',
                teamMembers.map(
                  (m) =>
                    `"${m.name}","${m.group}","${m.attendanceStatus}","${m.checkInTime || ''}","${m.checkInMethod || ''}","${recordFor(m.id)?.locationStatus || ''}"`
                )
              )
            }
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Download to Excel</span>
          </button>
        </PageHead>

        {/* Quick Shift & Late-Tag Control Banner */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Official Shift Window
                </span>
                <span className="text-xs font-mono font-black text-slate-800">
                  {calendarSettings?.shiftStartTime || '09:30 AM'} — {calendarSettings?.shiftEndTime || '06:30 PM'}
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Punch-In Window &amp; Cutoff
              </span>
              <span className="text-xs font-mono font-bold text-slate-700">
                {calendarSettings?.punchInWindowStart || '08:00 AM'} to {calendarSettings?.punchInWindowEnd || '09:30 AM'}
              </span>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Late Arrival Tag
              </span>
              <span
                className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md border ${
                  calendarSettings?.enableLateMarking !== false
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}
              >
                {calendarSettings?.enableLateMarking !== false ? '● ACTIVE (CUTOFF ENFORCED)' : '○ DISABLED (FLEXIBLE)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const nextState = calendarSettings?.enableLateMarking === false;
                updateCalendarSettings({
                  enableLateMarking: nextState,
                  applyToToday: true
                });
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95 ${
                calendarSettings?.enableLateMarking !== false
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              }`}
            >
              {calendarSettings?.enableLateMarking !== false ? (
                <>
                  <ToggleRight className="w-4 h-4 text-emerald-600" />
                  <span>Turn Off Late Tag</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 text-emerald-200" />
                  <span>Enable Late Tag</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => reEvaluateTodayAttendance()}
              title="Recalculate today's attendance records using current shift policy"
              className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hierarchy Company Calendar & Holidays Configuration */}
        <AdminCalendarConfig />

        {/* Date Navigation & Problem Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const d = new Date(attendanceDate + 'T00:00:00');
                d.setDate(d.getDate() - 1);
                setAttendanceDate(d.toISOString().split('T')[0]);
              }}
              title="Previous Day"
              className="w-8 h-8 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
            />

            <button
              onClick={() => {
                const d = new Date(attendanceDate + 'T00:00:00');
                d.setDate(d.getDate() + 1);
                setAttendanceDate(d.toISOString().split('T')[0]);
              }}
              title="Next Day"
              className="w-8 h-8 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setAttendanceDate(getTodayDateIST())}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAttendanceFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                attendanceFilter === 'ALL'
                  ? 'bg-[#0A2540] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Employees ({teamMembers.length})
            </button>
            <button
              onClick={() => setAttendanceFilter('PROBLEMS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                attendanceFilter === 'PROBLEMS'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Flagged Problems ({problemsCount})</span>
            </button>
          </div>
        </div>

        {/* Office location — the reference point every check-in is measured against */}
        <div className="nexus-card bg-white border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#00A88B]" />
            <h3 className="font-display font-black text-base text-[#0A2540]">Office location</h3>
            {office?.latitude == null && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                Not set yet
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            Check-ins are compared against this point. Anyone within the distance below counts as
            at the office. The most accurate way to set it is to stand at the office and press
            Use my current location.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Office name
              </label>
              <input
                type="text"
                value={String(officeField('label') ?? '')}
                onChange={(e) => setOfficeDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="e.g. Meerpet TRR College, Hyderabad"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="0.000001"
                value={String(officeField('latitude') ?? '')}
                onChange={(e) => setOfficeDraft((d) => ({ ...d, latitude: Number(e.target.value) }))}
                placeholder="17.3140"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#00C9A7]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="0.000001"
                value={String(officeField('longitude') ?? '')}
                onChange={(e) => setOfficeDraft((d) => ({ ...d, longitude: Number(e.target.value) }))}
                placeholder="78.5290"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#00C9A7]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Counts as at office within
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={String(officeField('radiusMeters') ?? 200)}
                  onChange={(e) => setOfficeDraft((d) => ({ ...d, radiusMeters: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
                <span className="text-xs font-bold text-slate-500">metres</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={useMyLocation}
              disabled={locating}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
            >
              <Crosshair className="w-4 h-4" />
              <span>{locating ? 'Reading location…' : 'Use my current location'}</span>
            </button>

            <button
              onClick={saveOffice}
              disabled={!Object.keys(officeDraft).length}
              className="flex items-center gap-1.5 bg-[#00C9A7] hover:bg-[#00B4D8] disabled:bg-slate-200 disabled:text-slate-400 text-[#0A2540] font-black text-xs px-5 py-2.5 rounded-xl transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>

            {office?.latitude != null && !Object.keys(officeDraft).length && (
              <span className="text-[11px] text-slate-500 font-semibold">
                Currently {office.label} · within {office.radiusMeters}m
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card label="Present" value={String(presentToday)} tone="good" />
          <Card label="Late" value={String(late)} tone={late ? 'warn' : 'plain'} />
          <Card label="On leave" value={String(onLeave)} />
          <Card label="Absent" value={String(absent)} tone={absent ? 'warn' : 'plain'} />
        </div>

        <div className="nexus-card bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[48rem]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold text-[10px] bg-slate-50/70">
                  <th className="py-3 px-4">Punch In</th>
                  <th className="py-3 px-4">Punch Out</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Check-in</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Check-out</th>
                  <th className="py-3 px-4">Work Hours</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedMembers.map((m) => {
                  const rec = recordFor(m.id, m.name, m.empCode);
                  const effectiveStatus = rec?.status || m.attendanceStatus;
                  return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      {rec?.checkInPhoto ? (
                        <img
                          src={rec.checkInPhoto}
                          alt={`${m.name} at check-in`}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                          No Pic
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {rec?.checkOutPhoto ? (
                        <img
                          src={rec.checkOutPhoto}
                          alt={`${m.name} at check-out`}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs"
                        />
                      ) : rec?.checkOut ? (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                          No Pic
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[9px] text-emerald-700 font-bold">
                          Active
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#0A2540]">{m.name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{m.group}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{rec?.checkIn || m.checkInTime || '—'}</td>
                    <td className="py-3.5 px-4">{locationCell(rec)}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{rec?.checkOut || '—'}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-700 text-xs">{rec?.workHours || (rec?.checkOut ? 'Recorded' : 'In Progress')}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          effectiveStatus === 'PRESENT'
                            ? 'bg-emerald-50 text-emerald-700'
                            : effectiveStatus === 'LATE'
                            ? 'bg-amber-50 text-amber-700'
                            : effectiveStatus === 'ON_LEAVE' || effectiveStatus === 'LEAVE'
                            ? 'bg-sky-50 text-sky-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {String(effectiveStatus || 'ABSENT').replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!displayedMembers.length && (
            <Empty text={attendanceFilter === 'PROBLEMS' ? 'No flagged attendance problems on this day!' : 'No employees yet.'} />
          )}
        </div>

        <p className="text-[11px] text-slate-500 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3">
          <strong className="text-slate-700">Admin only:</strong> the photo and location columns are
          sent to nobody else. HR and Team Leaders see this same register without them.
        </p>
      </div>
    );
  };

  const renderLeads = () => {
    const totalLeadsCount = filteredAssignedLeadsByDate.length;
    const freshLeadsCount = filteredAssignedLeadsByDate.filter((l) => l.callCount === 0).length;
    const pipelineLeadsCount = filteredAssignedLeadsByDate.filter((l) => l.callCount > 0 && l.status !== 'CONVERTED').length;
    const convertedLeadsCount = filteredAssignedLeadsByDate.filter((l) => l.status === 'CONVERTED').length;

    const handleAutoDistribute = async () => {
      setIsDistributing(true);
      try {
        await autoDistributeFreshLeads();
      } finally {
        setIsDistributing(false);
      }
    };

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title="Lead Allocation" blurb="Give lists of prospects to the employees who will call them.">
          <button
            onClick={() => setIsExcelUploadModalOpen(true)}
            className="flex items-center gap-2 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-[#00C9A7]/20 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
            <span>Upload Leads</span>
          </button>
        </PageHead>

        {/* Day-Wise Filter Bar */}
        <div className="nexus-card bg-white border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['ALL', 'TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'CUSTOM'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setLeadsDateFilter(mode)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    leadsDateFilter === mode
                      ? 'bg-[#0A2540] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {mode === 'ALL' ? 'All Time' :
                   mode === 'TODAY' ? 'Today' :
                   mode === 'YESTERDAY' ? 'Yesterday' :
                   mode === 'THIS_WEEK' ? 'This Week' :
                   mode === 'THIS_MONTH' ? 'This Month' : 'Custom'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 font-bold">
                {totalLeadsCount} records in view
              </span>
              {freshLeadsCount > 0 && (
                <button
                  onClick={handleAutoDistribute}
                  disabled={isDistributing}
                  className="flex items-center gap-1.5 bg-[#06152B] hover:bg-[#00C9A7] text-white hover:text-[#0A2540] font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  <span>Auto-Distribute ({freshLeadsCount})</span>
                </button>
              )}
            </div>
          </div>

          {leadsDateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-xs">Custom Range:</span>
              <input
                type="date"
                value={leadsCustomStart}
                onChange={(e) => setLeadsCustomStart(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <span>to</span>
              <input
                type="date"
                value={leadsCustomEnd}
                onChange={(e) => setLeadsCustomEnd(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          )}
        </div>

        {/* 4 Dynamic Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card label="Total Leads in Scope" value={String(totalLeadsCount)} tone="plain" />
          <Card label="Fresh / Uncalled" value={String(freshLeadsCount)} tone={freshLeadsCount ? 'warn' : 'plain'} />
          <Card label="In Dialing Pipeline" value={String(pipelineLeadsCount)} tone="plain" />
          <Card label="Converted Deals" value={String(convertedLeadsCount)} tone="good" />
        </div>



        <div className="nexus-card bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00A88B]" />
              <h3 className="font-display font-black text-base text-[#0A2540]">Who is holding what</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">
              Reclaim uncalled leads to pool or clear fresh allocation
            </span>
          </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[50rem]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold text-[10px] bg-slate-50/70">
                <th className="py-3 px-5">Employee</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Leads held</th>
                <th className="py-3 px-4">Fresh / Uncalled</th>
                <th className="py-3 px-4">Called</th>
                <th className="py-3 px-4">Interested</th>
                <th className="py-3 px-4">Converted</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leadsPerEmployee.map(({ member, total, fresh, called, interested, converted }) => {
                const memberLeads = filteredAssignedLeadsByDate.filter(
                  (l) =>
                    l.assignedToEmployeeId === member.id ||
                    l.assignedToEmployeeId === member.empCode ||
                    (l.assignedToEmployeeName &&
                      l.assignedToEmployeeName.toLowerCase() === member.name.toLowerCase())
                );
                const isExpanded = expandedEmployeeId === member.id;

                const filteredMemberLeads = memberLeads.filter((l) => {
                  const q = memberLeadsSearchQuery.trim().toLowerCase();
                  const matchesQ = !q ||
                    (l.name && l.name.toLowerCase().includes(q)) ||
                    (l.phone && l.phone.includes(q)) ||
                    (l.company && l.company.toLowerCase().includes(q)) ||
                    (l.city && l.city.toLowerCase().includes(q));

                  const matchesStatus =
                    memberLeadsStatusFilter === 'ALL'
                      ? true
                      : memberLeadsStatusFilter === 'FRESH'
                      ? (l.callCount || 0) === 0 && l.status !== 'CONVERTED'
                      : memberLeadsStatusFilter === 'CALLED'
                      ? (l.callCount || 0) > 0 && l.status !== 'CONVERTED'
                      : l.status === memberLeadsStatusFilter;

                  return matchesQ && matchesStatus;
                });

                return (
                  <React.Fragment key={member.id}>
                    <tr
                      onClick={() => {
                        setExpandedEmployeeId(isExpanded ? null : member.id);
                        setSelectedMemberLeadIds([]);
                        setMemberLeadsSearchQuery('');
                        setMemberLeadsStatusFilter('ALL');
                      }}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-teal-50/40 border-l-4 border-l-[#00A88B]' : ''
                      }`}
                    >
                      <td className="py-3.5 px-5 font-bold text-[#0A2540]">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#00A88B]" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </span>
                          <span>{member.name}</span>
                          {member.portal === 'team_leader' && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 font-extrabold px-1.5 py-0.5 rounded">
                              TL
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium capitalize">
                        {member.portal === 'team_leader' ? 'Team Leader' : 'Telecaller'}
                      </td>
                      <td className="py-3.5 px-4 font-mono-nums font-bold">
                        <span className="underline decoration-slate-300 underline-offset-2">
                          {total}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono-nums font-bold text-amber-700">
                        {fresh > 0 ? fresh : <span className="text-slate-400 font-normal">0</span>}
                      </td>
                      <td className="py-3.5 px-4 font-mono-nums text-slate-600">{called}</td>
                      <td className="py-3.5 px-4 font-mono-nums text-blue-700">{interested}</td>
                      <td className="py-3.5 px-4 font-mono-nums text-emerald-700">{converted}</td>
                      <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedEmployeeId(isExpanded ? null : member.id);
                              setExpandedBatchId(null);
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer ${
                              isExpanded
                                ? 'bg-[#0A2540] text-white shadow-xs'
                                : 'bg-teal-50 hover:bg-teal-100 text-[#00897B] border border-teal-200'
                            }`}
                            title="Click to view assigned Excel files and batches"
                          >
                            <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                            <span>{isExpanded ? 'Hide Files' : `Files & Batches`}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {fresh > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (window.confirm(`Reclaim ${fresh} uncalled lead(s) from ${member.name} back into the Unassigned Pool?`)) {
                                    await reclaimAssignedLeads({ employeeId: member.id, onlyFresh: true });
                                  }
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg active:scale-95 transition-all"
                                title="Move uncalled leads to unassigned pool"
                              >
                                <Undo2 className="w-3 h-3" />
                                <span>Reclaim</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (window.confirm(`Permanently delete ${fresh} uncalled lead(s) held by ${member.name}? (Won deals remain preserved)`)) {
                                    await bulkDeleteAssignedLeads({ employeeId: member.id, onlyFresh: true });
                                  }
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg active:scale-95 transition-all"
                                title="Permanently remove fresh leads"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Clear</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED DROPDOWN: Excel Files & Batches held by this specific employee */}
                    {isExpanded && (() => {
                      // Group this employee's leads by batchId
                      const map = new Map<string, typeof memberLeads>();
                      for (const lead of memberLeads) {
                        const bId = lead.batchId || 'batch-default';
                        if (!map.has(bId)) {
                          map.set(bId, []);
                        }
                        map.get(bId)!.push(lead);
                      }

                      const employeeBatchGroups = Array.from(map.entries()).map(([batchId, bLeads]) => {
                        const matchedBatch = leadBatches.find((b) => b.id === batchId);
                        let fileName = matchedBatch?.fileName;
                        if (!fileName) {
                          const sample = bLeads.find((l) => l.notes && l.notes.includes('Imported via '));
                          if (sample) {
                            fileName = sample.notes.replace('Imported via ', '').trim();
                          } else if (batchId === 'crm-pipeline' || batchId === 'batch-default') {
                            fileName = 'Direct CRM Assignment';
                          } else {
                            fileName = `Lead Batch (${batchId.slice(0, 10)})`;
                          }
                        }

                        let dateStr = '';
                        let timeStr = '';
                        if (matchedBatch && matchedBatch.createdAt) {
                          const dt = formatLeadAssignmentDateTime({ createdAt: matchedBatch.createdAt } as any);
                          dateStr = dt.dateStr;
                          timeStr = dt.timeStr;
                        } else if (bLeads[0]) {
                          const dt = formatLeadAssignmentDateTime(bLeads[0]);
                          dateStr = dt.dateStr;
                          timeStr = dt.timeStr;
                        }
                        const uploadedAt = timeStr ? `${dateStr} • ${timeStr}` : dateStr || 'Recently assigned';

                        return {
                          batchId,
                          fileName,
                          uploadedAt,
                          leads: bLeads,
                          totalCount: bLeads.length,
                          freshCount: bLeads.filter((l) => (l.callCount || 0) === 0 && l.status !== 'CONVERTED').length,
                          calledCount: bLeads.filter((l) => (l.callCount || 0) > 0 && l.status !== 'CONVERTED').length,
                          convertedCount: bLeads.filter((l) => l.status === 'CONVERTED').length,
                        };
                      });

                      return (
                        <tr className="bg-slate-50/95 border-y-2 border-teal-500/30">
                          <td colSpan={8} className="p-4 sm:p-5">
                            <div className="space-y-4 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
                              {/* Dropdown Header */}
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                                    <FileSpreadsheet className="w-4 h-4 text-[#00A88B]" />
                                  </div>
                                  <div>
                                    <h4 className="font-display font-black text-sm text-[#0A2540]">
                                      Excel Files &amp; Lead Batches assigned to {member.name}
                                    </h4>
                                    <p className="text-[11px] text-slate-400">
                                      Delete, return to pool, or reassign entire Excel files given to this employee
                                    </p>
                                  </div>
                                </div>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono">
                                  {employeeBatchGroups.length} File{employeeBatchGroups.length === 1 ? '' : 's'} · {total} Total Leads Held
                                </span>
                              </div>

                              {/* List of Excel Files / Batches */}
                              {employeeBatchGroups.length === 0 ? (
                                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                  No Excel files or leads currently assigned to {member.name}.
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {employeeBatchGroups.map((batch) => {
                                    const isBatchLeadsExpanded = expandedBatchId === batch.batchId;

                                    return (
                                      <div
                                        key={batch.batchId}
                                        className="border border-slate-200 rounded-xl bg-slate-50/40 hover:bg-slate-50/90 transition-all p-3.5 space-y-3"
                                      >
                                        {/* File Card Top Row: Name, Timestamp, Stats, Actions */}
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                          <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 shadow-2xs">
                                              <FileSpreadsheet className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-[#0A2540] truncate max-w-sm">
                                                  {batch.fileName}
                                                </span>
                                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                  Excel Batch
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                                                <span>🕒 Assigned: {batch.uploadedAt}</span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Counters Badges */}
                                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                                              {batch.totalCount} leads
                                            </span>
                                            <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-bold border border-amber-200">
                                              {batch.freshCount} fresh
                                            </span>
                                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold border border-blue-200">
                                              {batch.calledCount} called
                                            </span>
                                            {batch.convertedCount > 0 && (
                                              <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-bold border border-emerald-200">
                                                {batch.convertedCount} won
                                              </span>
                                            )}
                                          </div>

                                          {/* Batch Actions Group */}
                                          <div className="flex items-center gap-1.5">
                                            {/* Reassign File */}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setReassigningBatch({
                                                  batchId: batch.batchId,
                                                  fileName: batch.fileName,
                                                  leads: batch.leads,
                                                  fromMemberId: member.id,
                                                  fromMemberName: member.name,
                                                });
                                                setTargetReassignMemberId('');
                                              }}
                                              className="px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                              title="Reassign this entire Excel file to another employee"
                                            >
                                              <RefreshCw className="w-3 h-3" />
                                              <span>Reassign</span>
                                            </button>

                                            {/* Return to Pool */}
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                if (
                                                  window.confirm(
                                                    `Return all ${batch.totalCount} lead(s) from Excel file "${batch.fileName}" assigned to ${member.name} back to the Unassigned Pool?`
                                                  )
                                                ) {
                                                  await reclaimAssignedLeads({
                                                    leadIds: batch.leads.map((l) => l.id),
                                                    employeeId: member.id,
                                                    batchId: batch.batchId,
                                                    onlyFresh: false,
                                                  });
                                                }
                                              }}
                                              className="px-2.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                              title="Return leads in this file back to Unassigned Pool"
                                            >
                                              <Undo2 className="w-3 h-3" />
                                              <span>Return to Pool</span>
                                            </button>

                                            {/* Remove File */}
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                if (
                                                  window.confirm(
                                                    `Permanently delete Excel file "${batch.fileName}" and all ${batch.totalCount} leads assigned to ${member.name}? (Won deals will be preserved)`
                                                  )
                                                ) {
                                                  await bulkDeleteAssignedLeads({
                                                    leadIds: batch.leads.map((l) => l.id),
                                                    employeeId: member.id,
                                                    batchId: batch.batchId,
                                                    onlyFresh: false,
                                                  });
                                                }
                                              }}
                                              className="px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                              title="Permanently remove this Excel file from employee"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Remove File</span>
                                            </button>

                                            {/* View Individual Leads */}
                                            <button
                                              type="button"
                                              onClick={() => setExpandedBatchId(isBatchLeadsExpanded ? null : batch.batchId)}
                                              className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                              title="Toggle lead details for this file"
                                            >
                                              <span>{isBatchLeadsExpanded ? 'Hide' : 'View'} Leads ({batch.totalCount})</span>
                                              {isBatchLeadsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            </button>
                                          </div>
                                        </div>

                                        {/* Sub-accordion: Granular Leads inside this specific Excel file */}
                                        {isBatchLeadsExpanded && (
                                          <div className="pt-2 border-t border-slate-200 animate-in fade-in">
                                            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-60 overflow-y-auto bg-white">
                                              <table className="w-full text-left text-xs min-w-[42rem]">
                                                <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase">
                                                  <tr>
                                                    <th className="py-2 px-3">Lead Contact</th>
                                                    <th className="py-2 px-3">Phone</th>
                                                    <th className="py-2 px-3">Assigned Timestamp</th>
                                                    <th className="py-2 px-3">Status</th>
                                                    <th className="py-2 px-3 text-right">Direct Action</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                  {batch.leads.map((lead) => {
                                                    const { dateStr, timeStr } = formatLeadAssignmentDateTime(lead);
                                                    return (
                                                      <tr key={lead.id} className="hover:bg-slate-50">
                                                        <td className="py-2 px-3 font-bold text-[#0A2540]">
                                                          {lead.name}
                                                          {(lead.company || lead.city) && (
                                                            <span className="text-[10px] text-slate-400 block font-normal">
                                                              {[lead.company, lead.city].filter(Boolean).join(' • ')}
                                                            </span>
                                                          )}
                                                        </td>
                                                        <td className="py-2 px-3 font-mono text-slate-700">{lead.phone || '—'}</td>
                                                        <td className="py-2 px-3 font-mono text-[10px] text-slate-500">
                                                          {dateStr} {timeStr ? `• ${timeStr}` : ''}
                                                        </td>
                                                        <td className="py-2 px-3">
                                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                                            {lead.status === 'CONVERTED' ? 'Won Deal' : (lead.callCount || 0) === 0 ? 'Fresh' : lead.status}
                                                          </span>
                                                        </td>
                                                        <td className="py-2 px-3 text-right">
                                                          <button
                                                            type="button"
                                                            onClick={async () => {
                                                              if (window.confirm(`Permanently remove lead "${lead.name}"?`)) {
                                                                await deleteAssignedLead(lead.id);
                                                              }
                                                            }}
                                                            className="text-rose-600 hover:text-rose-800 text-[10px] font-bold cursor-pointer"
                                                          >
                                                            Remove
                                                          </button>
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {!telecallerMembers.length && <Empty text="No telecaller or team leader calling reps yet." />}
      </div>

      <div className="nexus-card bg-white border border-slate-200 shadow-sm p-5 space-y-3">
        <h3 className="font-display font-black text-base text-[#0A2540]">Move leads</h3>
        <p className="text-[11px] text-slate-500">
          Hand an employee's whole list to someone else — when they leave, go on holiday, or the
          workload needs balancing.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[12rem]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">From</label>
            <select
              value={moveFrom}
              onChange={(e) => setMoveFrom(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
            >
              <option value="">— Choose employee or pool —</option>
              {(() => {
                const unassignedCount = assignedLeads.filter((l) => isLeadUnassigned(l, teamMembers)).length;
                return unassignedCount > 0 ? (
                  <option value="UNASSIGNED">
                    ⚡ Unassigned Leads Pool ({unassignedCount} leads available)
                  </option>
                ) : null;
              })()}
              {leadsPerEmployee
                .filter((r) => r.total > 0)
                .map((r) => (
                  <option key={r.member.id} value={r.member.id}>
                    {r.member.name} ({r.total} leads)
                  </option>
                ))}
            </select>
          </div>

          <div className="flex-1 min-w-[12rem]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">To</label>
            <select
              value={moveTo}
              onChange={(e) => setMoveTo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
            >
              <option value="">— Choose employee —</option>
              {telecallerMembers
                .filter((m) => (moveFrom === 'UNASSIGNED' || m.id !== moveFrom) && m.active !== 0)
                .map((m) => {
                  const heldCount = assignedLeads.filter(
                    (l) =>
                      l.assignedToEmployeeId === m.id ||
                      (l.assignedToEmployeeName &&
                        l.assignedToEmployeeName.toLowerCase() === m.name.toLowerCase())
                  ).length;
                  return (
                    <option key={m.id} value={m.id}>
                      {m.name} ({heldCount} leads held)
                    </option>
                  );
                })}
            </select>
          </div>

          <div className="w-24">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={moveCount}
              onChange={(e) => setMoveCount(e.target.value)}
              placeholder="All"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
            />
          </div>

          <button
            onClick={async () => {
              const limit = moveCount.trim() ? Math.max(1, Number(moveCount)) : undefined;
              await reassignLeadsBetween(moveFrom, moveTo, limit);
              setMoveFrom('');
              setMoveTo('');
              setMoveCount('');
            }}
            disabled={!moveFrom || !moveTo}
            className="bg-[#0A2540] hover:bg-[#0F3258] disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs px-5 py-2.5 rounded-xl transition-all active:scale-95"
          >
            Move leads
          </button>
        </div>
      </div>

      <RecentLeadUploadsLedger />

      {/* Lead Records Inspector & Bulk Actions */}
      {(() => {
        const filteredLeads = filteredAssignedLeadsByDate.filter((l) => {
          const q = leadsSearchQuery.trim().toLowerCase();
          const matchesQuery = !q ||
            (l.name && l.name.toLowerCase().includes(q)) ||
            (l.phone && l.phone.includes(q)) ||
            (l.company && l.company.toLowerCase().includes(q)) ||
            (l.assignedToEmployeeName && l.assignedToEmployeeName.toLowerCase().includes(q));

          const matchesStatus =
            leadsStatusFilter === 'ALL'
              ? true
              : leadsStatusFilter === 'FRESH'
              ? (l.callCount || 0) === 0 && l.status !== 'CONVERTED'
              : leadsStatusFilter === 'CALLED'
              ? (l.callCount || 0) > 0 && l.status !== 'CONVERTED'
              : l.status === leadsStatusFilter;

          return matchesQuery && matchesStatus;
        });

        return (
          <div className="nexus-card bg-white border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#00A88B]" />
                <h3 className="font-display font-black text-base text-[#0A2540]">
                  Lead Records ({filteredLeads.length})
                </h3>
              </div>

              {selectedLeadIds.length > 0 && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl animate-in fade-in">
                  <span className="text-xs font-bold text-slate-700">
                    {selectedLeadIds.length} leads selected:
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(`Reclaim ${selectedLeadIds.length} selected lead(s) back into the Unassigned Pool?`)) {
                        await reclaimAssignedLeads({ leadIds: selectedLeadIds, onlyFresh: false });
                        setSelectedLeadIds([]);
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg active:scale-95 transition-all"
                  >
                    <Undo2 className="w-3 h-3" />
                    <span>Reclaim to Pool</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(`Permanently delete ${selectedLeadIds.length} selected lead(s)?`)) {
                        await bulkDeleteAssignedLeads({ leadIds: selectedLeadIds, onlyFresh: false });
                        setSelectedLeadIds([]);
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg active:scale-95 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete Selected</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[14rem]">
                <input
                  type="text"
                  value={leadsSearchQuery}
                  onChange={(e) => setLeadsSearchQuery(e.target.value)}
                  placeholder="Search lead by name, phone, company, or rep..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>
              <div className="w-48">
                <select
                  value={leadsStatusFilter}
                  onChange={(e) => setLeadsStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="FRESH">Fresh / Uncalled</option>
                  <option value="CALLED">Dialed (In Pipeline)</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="CONVERTED">Won Deals (Converted)</option>
                  <option value="CALLBACK">Callback</option>
                  <option value="BUSY">Busy</option>
                  <option value="NOT_INTERESTED">Not Interested</option>
                </select>
              </div>
            </div>

            {/* Lead Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs min-w-[50rem]">
                <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                  <tr className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-2.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.slice(0, 50).length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeadIds(filteredLeads.slice(0, 50).map((l) => l.id));
                          } else {
                            setSelectedLeadIds([]);
                          }
                        }}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                    </th>
                    <th className="py-2.5 px-4">Contact</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4">Holding Rep</th>
                    <th className="py-2.5 px-4">Calls</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!filteredLeads.length ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        No leads match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.slice(0, 50).map((l) => {
                      const isSelected = selectedLeadIds.includes(l.id);
                      return (
                        <tr key={l.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-teal-50/30' : ''}`}>
                          <td className="py-2.5 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLeadIds((prev) => [...prev, l.id]);
                                } else {
                                  setSelectedLeadIds((prev) => prev.filter((id) => id !== l.id));
                                }
                              }}
                              className="rounded text-teal-600 focus:ring-teal-500"
                            />
                          </td>
                          <td className="py-2.5 px-4 font-bold text-[#0A2540]">
                            {l.name}
                            {l.company && <span className="text-[10px] text-slate-400 block font-normal">{l.company}</span>}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-600">{l.phone || '—'}</td>
                          <td className="py-2.5 px-4 text-slate-700 font-medium">
                            {isLeadUnassigned(l, teamMembers) ? (
                              <span className="text-amber-600 font-bold">Unassigned Pool</span>
                            ) : (
                              l.assignedToEmployeeName || '—'
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-mono-nums">{l.callCount || 0}</td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                l.status === 'CONVERTED'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : l.status === 'INTERESTED'
                                  ? 'bg-blue-50 text-blue-700'
                                  : l.status === 'CALLBACK'
                                  ? 'bg-amber-50 text-amber-700'
                                  : l.callCount === 0
                                  ? 'bg-purple-50 text-purple-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {l.status === 'CONVERTED'
                                ? 'Won Deal'
                                : l.callCount === 0
                                ? 'Fresh'
                                : l.status || 'Pending'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Delete lead "${l.name}"?`)) {
                                  await deleteAssignedLead(l.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Delete lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredLeads.length > 50 && (
              <p className="text-[11px] text-slate-400 text-center">
                Showing top 50 of {filteredLeads.length} leads. Narrow your search to find specific contacts.
              </p>
            )}
          </div>
        );
      })()}

      <p className="text-[11px] text-slate-500 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3">
        <strong className="text-slate-700">File format:</strong> save your sheet as CSV from Excel
        (File → Save As → CSV). Columns in order: name, phone, company, city, email.
      </p>
    </div>
    );
  };

  const renderRevenue = () => {
    // 1. Calculate Aggregates — SOURCE OF TRUTH: verified payments only
    const allVerifiedPayments = uniquePayments.filter((p) => p.status === 'VERIFIED');
    const pendingPaymentsList = uniquePayments.filter((p) => p.status === 'PENDING_HR_AUDIT');
    const effectiveTotalRevenue = allVerifiedPayments.reduce((sum, p) => sum + (p.dealAmount || 0), 0);
    const totalPendingRevenue = pendingPaymentsList.reduce((sum, p) => sum + (p.dealAmount || 0), 0);
    const totalWonDeals = allVerifiedPayments.length;
    const avgDealValue = totalWonDeals > 0 ? Math.round(effectiveTotalRevenue / totalWonDeals) : 0;

    // Build Rep Leaderboard (excluding Admin & HR)
    const leaderboard = teamMembers
      .filter((m) => m.portal !== 'admin' && m.empCode !== 'TNX-AD01' && !(m.role || '').toLowerCase().includes('admin') && m.portal !== 'hr' && !(m.role || '').toLowerCase().includes('hr'))
      .map((m) => {
        const mNameLower = m.name.toLowerCase();
        // Verified payments only for this rep
        const repVerifiedPayments = allVerifiedPayments.filter(
          (p) => (p.telecallerName || '').toLowerCase() === mNameLower
        );

        const dealsCount = repVerifiedPayments.length;
        const repRevenue = repVerifiedPayments.reduce((sum, p) => sum + (p.dealAmount || 0), 0);
        const target = m.salesTarget || 500000;
        const targetPercent = Math.min(100, Math.round((repRevenue / Math.max(1, target)) * 100));

        return {
          member: m,
          dials: m.dialsToday || 0,
          deals: dealsCount,
          revenue: repRevenue,
          target,
          targetPercent,
          conversionRate: m.conversionRate || (m.dialsToday > 0 ? Math.round((dealsCount / m.dialsToday) * 100) : 0),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const topCloser = leaderboard.length > 0 && leaderboard[0].revenue > 0 ? leaderboard[0] : null;

    // Filtered Won Deals Ledger
    const allWonDeals = uniquePayments.filter((p) => {
      if (revenueDealFilter === 'VERIFIED') return p.status === 'VERIFIED';
      if (revenueDealFilter === 'PENDING') return p.status === 'PENDING_HR_AUDIT';
      if (revenueDealFilter === 'REJECTED') return p.status === 'REJECTED';
      return true;
    });

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead
          title="Revenue & Won Deals"
          blurb="Executive financial console tracking employee revenue, closed deals, and master transaction audits."
        >
          <button
            onClick={() => exportPaymentVerificationsCsv(uniquePayments || paymentVerifications)}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Revenue Report</span>
          </button>
        </PageHead>

        {/* 1. Top Executive Financial KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card
            label="Total Verified Revenue"
            value={inr(effectiveTotalRevenue)}
            sub={`${totalWonDeals} closed & verified deals`}
            tone="good"
          />
          <Card
            label="Won Deals Closed"
            value={String(totalWonDeals)}
            sub="client subscriptions signed"
          />
          <Card
            label="Average Deal Size"
            value={inr(avgDealValue)}
            sub="revenue generated per deal"
          />
          <Card
            label="Pending Financial Audit"
            value={inr(totalPendingRevenue)}
            sub={`${pendingPaymentsList.length} deal sign-offs waiting`}
            tone={pendingPaymentsList.length ? 'warn' : 'plain'}
          />
        </div>

        {/* 2. Employee Revenue & Closing Leaderboard */}
        <div className="nexus-card bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-display font-black text-base text-[#0A2540] flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Employee Sales & Revenue Leaderboard</span>
              </h3>
              <p className="text-xs text-slate-500">
                Track dials made, deals closed, and total revenue contributed by each telecaller
              </p>
            </div>
            {topCloser && (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                🏆 Top Closer: {topCloser.member.name} ({inr(topCloser.revenue)})
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                  <th className="py-3 pl-4">Rank & Rep</th>
                  <th className="py-3">Team Squad</th>
                  <th className="py-3">Dials Today</th>
                  <th className="py-3">Deals Won</th>
                  <th className="py-3">Revenue Closed</th>
                  <th className="py-3">Target Progress</th>
                  <th className="py-3">Conv. Rate</th>
                  <th className="py-3 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaderboard.map((entry, idx) => {
                  const m = entry.member;
                  const rankBadge =
                    idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-display font-black text-xs px-2 py-0.5 rounded-lg ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-800'
                                : idx === 2
                                ? 'bg-orange-100 text-orange-900'
                                : 'text-slate-500'
                            }`}
                          >
                            {rankBadge}
                          </span>
                          <div>
                            <span className="font-bold text-xs text-[#0A2540] block">{m.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">{m.empCode}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 font-medium text-slate-600">
                        {m.group || 'General Squad'}
                      </td>

                      <td className="py-3.5 font-mono font-bold text-slate-700">
                        {entry.dials} calls
                      </td>

                      <td className="py-3.5">
                        <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                          {entry.deals} Deals
                        </span>
                      </td>

                      <td className="py-3.5">
                        <span className="font-mono font-black text-sm text-[#00A88B] block">
                          {inr(entry.revenue)}
                        </span>
                      </td>

                      <td className="py-3.5 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                            <span>{entry.targetPercent}%</span>
                            <span>{inr(entry.target)}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#00C9A7] to-emerald-600 transition-all duration-500"
                              style={{ width: `${entry.targetPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 font-mono font-bold text-slate-700">
                        {entry.conversionRate}%
                      </td>

                      <td className="py-3.5 text-right pr-4">
                        <button
                          onClick={() => setOpenEmployee(m)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#00C9A7] text-slate-700 hover:text-[#0A2540] font-black text-xs inline-flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                        >
                          <span>View 360 Ledger</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Master Won Deals & Financial Audits Ledger */}
        <div className="nexus-card bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-black text-base text-[#0A2540] flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#00A88B]" />
                <span>Master Won Deals & Audit Ledger</span>
              </h3>
              <p className="text-xs text-slate-500">
                Detailed transaction records with UTR, bank transfer channels, and audit statuses
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5">
              {[
                { id: 'ALL', label: `All (${paymentVerifications.length})` },
                { id: 'VERIFIED', label: `Verified (${verifiedPayments.length})` },
                { id: 'PENDING', label: `Pending Sign-Off (${pendingPaymentsList.length})` },
                { id: 'REJECTED', label: 'Rejected' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setRevenueDealFilter(pill.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    revenueDealFilter === pill.id
                      ? 'bg-[#0A2540] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {allWonDeals.length === 0 ? (
            <Empty text="No deals found matching this filter." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                    <th className="py-3 pl-4">Client & Company</th>
                    <th className="py-3">Closed By</th>
                    <th className="py-3">Deal Value</th>
                    <th className="py-3">Payment Channel</th>
                    <th className="py-3">Bank UTR Number</th>
                    <th className="py-3">Audit Status</th>
                    <th className="py-3 text-right pr-4">Sign-Off Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allWonDeals.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-4">
                        {(() => {
                          const info = getPaymentCustomerInfo(p);
                          return (
                            <div className="space-y-0.5">
                              <strong className="font-bold text-xs text-[#0A2540] block">{p.companyName}</strong>
                              <span className="text-[11px] text-slate-500 font-medium">Contact: {p.leadName}</span>
                              {(info.customerName || info.customerPhone || info.customerBankName || info.customerAccountNumber || info.customerUpiId) && (
                                <div className="mt-1 pt-1 border-t border-slate-100 text-[10px] text-slate-600 space-y-0.5 font-mono">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {info.customerName && <div>Client: <span className="font-bold text-slate-800">{info.customerName}</span></div>}
                                    {info.customerPhone && (
                                      <a href={`tel:${info.customerPhone}`} className="text-emerald-700 font-bold hover:underline">
                                        📞 {info.customerPhone}
                                      </a>
                                    )}
                                  </div>
                                  {info.customerAccountNumber ? (
                                    <div>Bank: {info.customerBankName || 'Bank'} A/C: <span className="font-bold text-slate-800">{info.customerAccountNumber}</span> (IFSC: {info.customerIfscCode || 'N/A'})</div>
                                  ) : info.customerUpiId ? (
                                    <div>UPI: <span className="font-bold text-[#00A88B]">{info.customerUpiId}</span></div>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      <td className="py-3.5">
                        <span className="font-bold text-xs text-slate-700 block">{p.telecallerName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.timestamp}</span>
                      </td>

                      <td className="py-3.5">
                        <span className="font-mono font-black text-sm text-[#00A88B] block">
                          {inr(p.dealAmount)}
                        </span>
                      </td>

                      <td className="py-3.5 font-medium text-slate-600">
                        {p.paymentMode || 'Online Transfer'}
                      </td>

                      <td className="py-3.5">
                        <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold">
                          {p.utrNumber}
                        </span>
                      </td>

                      <td className="py-3.5">
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                            p.status === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {p.status === 'VERIFIED'
                            ? '✓ Verified & Credited'
                            : p.status === 'REJECTED'
                            ? '✕ Rejected'
                            : '⏳ Pending Sign-Off'}
                        </span>
                      </td>

                      <td className="py-3.5 text-right pr-4">
                        {p.status === 'PENDING_HR_AUDIT' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setInspectingPayment(p)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-[#00C9A7] text-slate-700 hover:text-[#0A2540] font-bold text-[11px] rounded-lg shadow-2xs active:scale-95 transition-all inline-flex items-center gap-1 cursor-pointer"
                              title="Inspect full remittance voucher & account details"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Voucher</span>
                            </button>
                            <button
                              onClick={() => {
                                verifyPayment(p.id, 'VERIFIED');
                                triggerToast(`✓ Payment of ${inr(p.dealAmount)} approved & credited`);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-2xs active:scale-95 transition-all cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                setRejectionTarget({
                                  id: p.id,
                                  type: 'PAYMENT',
                                  name: `${inr(p.dealAmount)} from ${p.companyName}`,
                                })
                              }
                              className="px-2.5 py-1 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-[11px] rounded-lg active:scale-95 transition-all cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete payment verification of ${inr(p.dealAmount)} for "${p.companyName}"?`)) {
                                  deletePaymentVerification(p.id);
                                }
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                              title="Delete this payment record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setInspectingPayment(p)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-[#00C9A7] text-slate-700 hover:text-[#0A2540] font-bold text-[11px] rounded-lg shadow-2xs active:scale-95 transition-all inline-flex items-center gap-1 cursor-pointer"
                              title="Inspect full remittance voucher & account details"
                            >
                              <FileText className="w-3 h-3" />
                              <span>View Voucher</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete deal payment of ${inr(p.dealAmount)} for "${p.companyName}"? This will roll back sales achievements and remove the payment verification across all panels.`)) {
                                  deletePaymentVerification(p.id);
                                }
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                              title="Delete this payment record & adjust sales totals"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
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
    );
  };

  const renderApprovals = () => {
    // Admin only sees leaves at the PENDING_ADMIN stage (final sign-off)
    const pendingLeaves = leaveRequests.filter((l) => l.status === 'PENDING' && l.approvalStage === 'PENDING_ADMIN');
    const totalPending = pendingPayments.length + pendingLeaves.length;
    const auditedPayments = uniquePayments.filter((p) => p.status !== 'PENDING_HR_AUDIT');

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead
          title="Approvals & Financial Audits"
          blurb={`${totalPending} pending item${totalPending === 1 ? '' : 's'} waiting for executive sign-off.`}
        />

        {/* Sub-tabs: Payments vs Leaves vs Audit History */}
        <div className="flex gap-2">
          <button
            onClick={() => setApprovalTab('PAYMENTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              approvalTab === 'PAYMENTS'
                ? 'bg-[#0A2540] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Pending Payments ({pendingPayments.length})
          </button>
          <button
            onClick={() => setApprovalTab('LEAVES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              approvalTab === 'LEAVES'
                ? 'bg-[#0A2540] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Leave Escalations ({pendingLeaves.length})
          </button>
          <button
            onClick={() => setApprovalTab('HISTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              approvalTab === 'HISTORY'
                ? 'bg-[#0A2540] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Audit History Ledger ({auditedPayments.length})
          </button>
        </div>

        {approvalTab === 'PAYMENTS' && (
          <>
            {!pendingPayments.length ? (
              <div className="nexus-card bg-white border border-slate-200 shadow-sm">
                <Empty text="Nothing waiting. Every deal payment has been signed off." />
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPayments.map((p) => (
                  <div key={p.id} className="nexus-card p-5 bg-white border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="font-mono-nums font-black text-xl text-[#0A2540] block">
                          {inr(p.dealAmount)}
                        </span>
                        <span className="text-sm font-bold text-slate-700 block">{p.companyName}</span>
                        <span className="text-[11px] text-slate-500 block">
                          Closed by {p.telecallerName} · {p.paymentMode} · {p.timestamp}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 block">UTR {p.utrNumber}</span>

                        {(() => {
                          const info = getPaymentCustomerInfo(p);
                          if (!info.customerName && !info.customerPhone && !info.customerBankName && !info.customerAccountNumber && !info.customerUpiId) {
                            return null;
                          }
                          return (
                            <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] space-y-1">
                              <div className="font-bold text-[#0A2540] flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-[#00A88B]" />
                                <span>Won Customer Remittance Details:</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3">
                                {info.customerName && (
                                  <div className="text-slate-700">Account Holder: <strong className="font-semibold text-slate-900">{info.customerName}</strong></div>
                                )}
                                {info.customerPhone && (
                                  <div className="text-slate-700 flex items-center gap-1">
                                    <span>Phone:</span>
                                    <a href={`tel:${info.customerPhone}`} className="font-mono font-bold text-emerald-700 hover:underline">
                                      📞 {info.customerPhone}
                                    </a>
                                  </div>
                                )}
                              </div>
                              {info.customerAccountNumber ? (
                                <div className="text-slate-700">
                                  Bank: <strong className="font-semibold text-slate-900">{info.customerBankName || 'Bank'}</strong> · A/C: <span className="font-mono font-bold text-slate-900">{info.customerAccountNumber}</span> {info.customerIfscCode ? `(IFSC: ${info.customerIfscCode})` : ''}
                                </div>
                              ) : info.customerUpiId ? (
                                <div className="text-slate-700">UPI ID: <span className="font-mono font-bold text-[#00A88B]">{info.customerUpiId}</span></div>
                              ) : null}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setInspectingPayment(p)}
                          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer border border-slate-200"
                          title="Inspect complete voucher slip & settlement details"
                        >
                          <FileText className="w-4 h-4 text-slate-500" />
                          <span>Inspect Slip</span>
                        </button>
                        <button
                          onClick={() => {
                            verifyPayment(p.id, 'VERIFIED');
                            triggerToast(`✓ Deal payment of ${inr(p.dealAmount)} approved & credited`);
                          }}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve & Credit</span>
                        </button>
                        <button
                          onClick={() =>
                            setRejectionTarget({
                              id: p.id,
                              type: 'PAYMENT',
                              name: `${inr(p.dealAmount)} from ${p.companyName}`,
                            })
                          }
                          className="flex items-center gap-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {approvalTab === 'LEAVES' && (
          <>
            {!pendingLeaves.length ? (
              <div className="nexus-card bg-white border border-slate-200 shadow-sm">
                <Empty text="No leave escalations waiting. All team requests are cleared." />
              </div>
            ) : (
              <div className="space-y-3">
                {pendingLeaves.map((l) => (
                  <div key={l.id} className="nexus-card p-5 bg-white border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#0A2540]">{l.employeeName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700">
                            {l.leaveType}
                          </span>
                        </div>
                        <span className="text-xs text-slate-600 block">
                          <strong>{l.totalDays} day{l.totalDays === 1 ? '' : 's'}</strong> ({l.fromDate} → {l.toDate})
                        </span>
                        <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                          "{l.reason}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            approveLeaveRequest(l.id);
                            triggerToast(`✓ Approved leave for ${l.employeeName}`);
                          }}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() =>
                            setRejectionTarget({
                              id: l.id,
                              type: 'LEAVE',
                              name: `Leave for ${l.employeeName} (${l.totalDays} days)`,
                            })
                          }
                          className="flex items-center gap-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {approvalTab === 'HISTORY' && (
          <div className="nexus-card bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-display font-black text-base text-[#0A2540]">Audited Transaction Records</h3>
              <span className="text-xs font-mono text-slate-400">Total {auditedPayments.length} logged</span>
            </div>

            {auditedPayments.length === 0 ? (
              <Empty text="No audited decisions recorded yet." />
            ) : (
              <div className="divide-y divide-slate-100">
                {auditedPayments.map((p) => {
                  const info = getPaymentCustomerInfo(p);
                  return (
                    <div key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-nums font-black text-sm text-[#0A2540]">
                            {inr(p.dealAmount)}
                          </span>
                          <span className="text-xs font-bold text-slate-700 truncate">
                            · {p.companyName}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          Closed by {p.telecallerName} · Mode: {p.paymentMode} · UTR: <strong className="font-mono text-slate-700">{p.utrNumber}</strong>
                        </span>
                        {(info.customerName || info.customerPhone || info.customerBankName || info.customerAccountNumber || info.customerUpiId) && (
                          <div className="text-[10px] text-slate-600 block mt-1 font-mono space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              {info.customerName && <span>Customer: <strong className="font-semibold text-slate-800">{info.customerName}</strong></span>}
                              {info.customerPhone && (
                                <a href={`tel:${info.customerPhone}`} className="text-emerald-700 font-bold hover:underline">
                                  📞 {info.customerPhone}
                                </a>
                              )}
                            </div>
                            {info.customerAccountNumber ? (
                              <div>
                                Bank: <strong className="text-slate-800">{info.customerBankName || 'Bank'}</strong> · A/C: <span className="font-bold text-slate-800">{info.customerAccountNumber}</span> {info.customerIfscCode ? `(IFSC: ${info.customerIfscCode})` : ''}
                              </div>
                            ) : info.customerUpiId ? (
                              <div>UPI: <span className="font-bold text-[#00A88B]">{info.customerUpiId}</span></div>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <button
                          onClick={() => setInspectingPayment(p)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-[#00C9A7] text-slate-700 hover:text-[#0A2540] font-bold text-xs rounded-xl shadow-2xs active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer border border-slate-200/80"
                          title="Inspect full remittance voucher & account details"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Voucher</span>
                        </button>
                        <div className="text-right">
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                              p.status === 'VERIFIED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {p.status === 'VERIFIED' ? '✓ Verified & Credited' : '✕ Rejected'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            {p.timestamp}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderReports = () => {
    const reports = [
      {
        label: 'Employees Roster',
        blurb: 'Staff list, role, team and sales stats.',
        icon: Users,
        run: () => exportEmployeesRosterCsv(teamMembers),
      },
      {
        label: 'Attendance Register',
        blurb: 'Daily punch times and check-in methods.',
        icon: CalendarCheck,
        run: () => exportAttendanceRegisterCsv(teamMembers, attendanceLogs),
      },
      {
        label: 'Calls & Conversions',
        blurb: 'Dials, connected calls and interested leads.',
        icon: PhoneCall,
        run: () => exportCallsAndConversionsCsv(teamMembers),
      },
      {
        label: 'Sales vs Target',
        blurb: 'Monthly revenue performance per caller.',
        icon: TrendingUp,
        run: () => exportSalesVsTargetCsv(teamMembers),
      },
      {
        label: 'Payment Verifications',
        blurb: 'Full audit history of payment receipts.',
        icon: Wallet,
        run: () => exportPaymentVerificationsCsv(uniquePayments || paymentVerifications),
      },
      {
        label: 'Lead Allocation Pipeline',
        blurb: 'Active leads held by each employee.',
        icon: FileSpreadsheet,
        run: () => exportLeadAllocationCsv(assignedLeads),
      },
    ];

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead
          title="Reports"
          blurb="Download your figures as a file that opens in Excel or Google Sheets."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reports.map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.label}
                onClick={() => {
                  r.run();
                  triggerToast(`✓ ${r.label} downloaded`);
                }}
                className="nexus-card p-5 bg-white border border-slate-200 shadow-sm text-left hover:border-[#00C9A7] transition-all active:scale-[.99] flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-[#E6FAF6] text-[#00A88B] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <Download className="w-4 h-4 text-slate-300" />
                </div>
                <div>
                  <h3 className="font-display font-black text-sm text-[#0A2540]">{r.label}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{r.blurb}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------- render

  if (openEmployee) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Employee360ProfileView
          member={openEmployee}
          onBack={() => setOpenEmployee(null)}
          viewerRole="admin"
        />
      </div>
    );
  }

  return (
    <>
      {activeTab === 'home' && renderOverview()}
      {activeTab === 'people' && renderPeople()}
      {activeTab === 'attendance' && renderAttendance()}
      {activeTab === 'leads' && renderLeads()}
      {activeTab === 'revenue' && renderRevenue()}
      {activeTab === 'invoices' && (
        <div className="max-w-7xl mx-auto py-2">
          <InvoicesLedger
            panelTitle="Admin Global Commercial Invoices & Billing"
            panelSubtitle="Comprehensive billing ledger, day-wise filters, customer email dispatch, and audit trail"
          />
        </div>
      )}
      {activeTab === 'approvals' && renderApprovals()}
      {activeTab === 'reports' && renderReports()}

      <ExcelLeadUploadModal />
      <AddEmployeeModal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} />
      <EmployeeRecordModal employee={openEmployee} onClose={() => setOpenEmployee(null)} />
      <CreateTeamModal isOpen={isCreateTeamOpen} onClose={() => setIsCreateTeamOpen(false)} />
      <ManageTeamMembersModal
        team={managingSquad}
        isOpen={!!managingSquad}
        onClose={() => setManagingSquad(null)}
      />

      {/* Rejection Prompt Dialog */}
      {rejectionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-display font-black text-sm text-[#0A2540]">
                Reject {rejectionTarget.type === 'PAYMENT' ? 'Payment Sign-Off' : 'Leave Escalation'}
              </h4>
              <button
                onClick={() => setRejectionTarget(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
            <div>
              <p className="text-xs text-slate-600 mb-2 font-medium">
                Reason for rejecting <strong>{rejectionTarget.name}</strong>:
              </p>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. UTR transaction details could not be verified against bank statement..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-rose-500 font-medium"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRejectionTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (rejectionTarget.type === 'PAYMENT') {
                    verifyPayment(rejectionTarget.id, 'REJECTED');
                    triggerToast(`✓ Payment rejected with audit note`);
                  } else {
                    rejectLeaveRequest(rejectionTarget.id, rejectionReason || 'Rejected by Admin');
                    triggerToast(`✓ Leave request rejected`);
                  }
                  setRejectionTarget(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs active:scale-95 transition-all"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Executive Schedule Meeting Modal */}
      <AdminScheduleMeetingModal
        isOpen={isScheduleMeetingOpen}
        onClose={() => setIsScheduleMeetingOpen(false)}
      />

      {/* Delete Employee Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div>
              {(() => {
                const isLeader = employeeToDelete.portal === 'team_leader' || (employeeToDelete.role || '').toLowerCase().includes('leader');
                const isHr = employeeToDelete.portal === 'hr' || (employeeToDelete.role || '').toLowerCase().includes('hr');
                const roleLabel = isLeader ? 'Team Leader' : isHr ? 'HR Staff' : 'Employee (Telecaller)';

                return (
                  <>
                    <h3 className="font-display font-black text-lg text-[#0A2540]">
                      Delete {roleLabel}?
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Are you sure you want to permanently delete <strong className="text-slate-800">{employeeToDelete.name}</strong> (<span className="font-mono text-slate-600">{employeeToDelete.empCode}</span>)?
                    </p>
                  </>
                );
              })()}
            </div>

            <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-3.5 space-y-1.5 text-xs text-rose-800">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                Zero Data Loss Guarantee
              </p>
              <ul className="list-disc list-inside text-[11px] text-rose-700 space-y-0.5 ml-1">
                <li>User credentials and login access will be removed</li>
                <li>Biometric profile and login access will be purged</li>
                <li>Fresh uncalled leads will return to the Unassigned Pool</li>
                <li>Won deals, payments &amp; customer call logs remain permanently preserved</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!employeeToDelete) return;
                  try {
                    setIsDeleting(true);
                    await deleteEmployee(employeeToDelete.id);
                    setEmployeeToDelete(null);
                  } catch (err) {
                    console.error('Failed to delete employee:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-5 py-2.5 rounded-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete Employee</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Proof Slip & Settlement Voucher Modal */}
      {inspectingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 text-[#00A88B]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-[#0A2540]">
                    Payment Remittance Voucher
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    ID: {inspectingPayment.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingPayment(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-slate-100/70 rounded-2xl p-5 border border-slate-200/80 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Settlement Amount</span>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full ${
                  inspectingPayment.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                  inspectingPayment.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                  'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {inspectingPayment.status === 'VERIFIED' ? '✓ VERIFIED & CREDITED' :
                   inspectingPayment.status === 'REJECTED' ? '✕ REJECTED' :
                   '⏳ PENDING HR AUDIT'}
                </span>
              </div>

              <div className="font-display font-black text-3xl text-[#0A2540] tracking-tight">
                {inr(inspectingPayment.dealAmount)}
              </div>

              {/* Customer Account & Phone Details Card */}
              {(() => {
                const info = getPaymentCustomerInfo(inspectingPayment);
                return (
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Customer & Remittance Details</span>
                    </span>
                    <div className="text-xs space-y-1.5 text-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Customer Name:</span>
                        <strong className="text-slate-900 font-bold">{info.customerName || inspectingPayment.leadName || 'Direct Client'}</strong>
                      </div>
                      {info.customerPhone && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Customer Phone:</span>
                          <a
                            href={`tel:${info.customerPhone}`}
                            className="font-mono font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>{info.customerPhone}</span>
                          </a>
                        </div>
                      )}
                      {info.customerAccountNumber ? (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Bank Name:</span>
                            <span className="font-bold text-slate-800">{info.customerBankName || 'Bank'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Account Number:</span>
                            <span className="font-mono font-black text-[#0A2540]">{info.customerAccountNumber}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">IFSC Code:</span>
                            <span className="font-mono font-bold text-slate-800">{info.customerIfscCode || 'N/A'}</span>
                          </div>
                        </>
                      ) : info.customerUpiId ? (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Customer UPI ID:</span>
                          <span className="font-mono font-bold text-emerald-700">{info.customerUpiId}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2 text-xs pt-1 border-t border-slate-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-500">Client / Company:</span>
                  <span className="font-bold text-slate-800">{inspectingPayment.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Closed By:</span>
                  <span className="font-bold text-slate-800">{inspectingPayment.telecallerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Channel:</span>
                  <span className="font-bold text-slate-800">{inspectingPayment.paymentMode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Transaction Reference / UTR:</span>
                  <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                    {inspectingPayment.utrNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Logged At:</span>
                  <span className="font-mono text-slate-600">{inspectingPayment.timestamp}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons inside modal */}
            {inspectingPayment.status === 'PENDING_HR_AUDIT' ? (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => {
                    verifyPayment(inspectingPayment.id, 'VERIFIED');
                    triggerToast(`✓ Deal payment of ${inr(inspectingPayment.dealAmount)} approved & credited to revenue`);
                    setInspectingPayment(null);
                  }}
                  className="py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Credit</span>
                </button>
                <button
                  onClick={() => {
                    verifyPayment(inspectingPayment.id, 'REJECTED');
                    triggerToast(`✗ Payment rejected`);
                    setInspectingPayment(null);
                  }}
                  className="py-3 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </div>
            ) : (
              <div className="pt-1">
                <button
                  onClick={() => setInspectingPayment(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  Close Voucher
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Reassign Entire Excel File / Batch to another Telecaller */}
      {reassigningBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
                  <RefreshCw className="w-4 h-4 text-[#00A88B]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0A2540]">Reassign Excel File</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-xs">{reassigningBatch.fileName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReassigningBatch(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
              <p className="text-slate-600">
                You are transferring <span className="font-bold text-teal-800">{reassigningBatch.leads.length} leads</span> from{' '}
                <span className="font-bold text-[#0A2540]">{reassigningBatch.fromMemberName}</span>.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Select Target Telecaller / Representative:</label>
              <select
                value={targetReassignMemberId}
                onChange={(e) => setTargetReassignMemberId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
              >
                <option value="">— Choose target team member —</option>
                {teamMembers
                  .filter(isTelecallerOrCallingEmployee)
                  .filter((tm) => tm.id !== reassigningBatch.fromMemberId)
                  .map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name} ({tm.empCode}) {tm.portal === 'team_leader' ? '— Team Leader' : '— Telecaller'}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReassigningBatch(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!targetReassignMemberId}
                onClick={async () => {
                  if (!targetReassignMemberId) return;
                  const target = teamMembers.find((m) => m.id === targetReassignMemberId);
                  if (!target) return;
                  await reassignLeadsBetween(
                    reassigningBatch.fromMemberId,
                    target.id,
                    undefined,
                    reassigningBatch.leads.map((l) => l.id)
                  );
                  setReassigningBatch(null);
                  setTargetReassignMemberId('');
                }}
                className="px-4 py-1.5 rounded-lg bg-[#00A88B] hover:bg-[#00897B] text-white text-xs font-bold disabled:opacity-50 cursor-pointer active:scale-95 transition-all"
              >
                Confirm Reassign
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
