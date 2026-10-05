import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useScreenData } from '../hooks/useScreenData';
import {
  Users,
  Layers,
  Home,
  Plus,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  CalendarCheck,
  Calendar,
  AlertCircle,
  Wallet,
  Clock,
  MapPin,
  Crosshair,
  Save,
  ChevronRight,
  TrendingUp,
  UserCheck,
  PhoneCall,
  ArrowUpRight,
  FileText,
  Sparkles,
  UploadCloud,
  Shield,
  MoreHorizontal,
  ArrowLeft,
  X,
  Target,
  Video,
  Award,
  DollarSign,
  Maximize2,
  Minimize2,
  Building2,
  Trash2,
  LogOut,
  Edit2,
  Eye,
  Camera,
  AlertTriangle,
  CameraOff,
  RotateCw,
  Receipt,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from 'lucide-react';
import { ExcelLeadUploadModal } from '../components/modals/ExcelLeadUploadModal';
import { AddEmployeeModal } from '../components/modals/AddEmployeeModal';
import { EmployeeRecordModal, PORTAL_LABEL } from '../components/modals/EmployeeRecordModal';
import { CreateTeamModal } from '../components/modals/CreateTeamModal';
import { EditTeamModal } from '../components/modals/EditTeamModal';
import { DeleteTeamModal } from '../components/modals/DeleteTeamModal';
import { ManageTeamMembersModal } from '../components/modals/ManageTeamMembersModal';
import { AdminTargetSettingsModal } from '../components/modals/AdminTargetSettingsModal';
import { AdminScheduleMeetingModal } from '../components/modals/AdminScheduleMeetingModal';
import { GeofenceLocationModal } from '../components/modals/GeofenceLocationModal';
import { InAppLiveMapModal } from '../components/modals/InAppLiveMapModal';
import { OfficeSettings, TeamGroup, TeamMember, UserRole, LeaveRequest, PaymentVerificationItem, AttendanceRecord } from '../types';
import { api } from '../services/api';
import { Employee360ProfileView } from './Employee360ProfileView';
import { AdminCalendarConfig } from '../components/common/AdminCalendarConfig';
import { EmployeeAvatar } from '../components/common/EmployeeAvatar';
import { LeafletGeofenceMap } from '../components/common/LeafletGeofenceMap';
import { ManageEmployeesTab } from './admin/ManageEmployeesTab';
import { InvoicesLedger } from '../components/common/InvoicesLedger';
import { getTodayDateIST } from '../utils/dateUtils';

type AdminTab = 'home' | 'people' | 'attendance' | 'leads' | 'revenue' | 'more' | 'approvals' | 'reports' | 'attendance_verification' | 'manage_employees' | 'invoices' | 'company_calendar';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const formatInLakhs = (amount: number) => {
  if (!amount || amount === 0) return '₹0';
  if (amount >= 100000) {
    const inLakhs = (amount / 100000).toFixed(2).replace(/\.00$/, '');
    return `₹${inLakhs} L`;
  }
  return inr(amount);
};

const downloadCsv = (filename: string, header: string, rows: string[]) => {
  const csv = `data:text/csv;charset=utf-8,${header}\n${rows.join('\n')}`;
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csv));
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const AdminDashboardView: React.FC = () => {
  const {
    currentUser,
    teamMembers,
    teamGroups,
    leadBatches,
    assignedLeads,
    clients,
    paymentVerifications,
    attendanceLogs,
    leaveRequests,
    teamMeetings,
    joinMeeting,
    deleteTeamMeeting,
    clearAttendanceRecords,
    deleteAttendanceRecord,
    approveLeaveRequest,
    rejectLeaveRequest,
    updateEmployee,
    deleteEmployee,
    setIsExcelUploadModalOpen,
    assignTeamLeaderToGroup,
    verifyPayment,
    reassignLeadsBetween,
    updateTeamGroup,
    deleteTeamGroup,
    disputeAttendanceRecord,
    verifyAttendanceRecord,
    triggerToast,
    logout,
    autoDistributeFreshLeads,
    refreshResources,
    calendarSettings,
    updateCalendarSettings,
    reEvaluateTodayAttendance,
  } = useApp();

  useScreenData('adminDashboard');

  const adminName = currentUser?.name?.trim() || 'Admin';
  const adminFirstName = adminName.split(' ')[0] || 'Admin';
  const adminInitials = adminName !== 'Admin'
    ? adminName
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AD';

  const [tab, setTabState] = useState<AdminTab>(() => {
    try {
      return (localStorage.getItem('tnx_adminTab') as AdminTab) || 'home';
    } catch {
      return 'home';
    }
  });

  const setTab = (newTab: AdminTab) => {
    setTabState(newTab);
    try {
      localStorage.setItem('tnx_adminTab', newTab);
    } catch {}
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberFor360, setSelectedMemberFor360] = useState<TeamMember | null>(null);
  const [selectedAdminTeamGroup, setSelectedAdminTeamGroup] = useState<TeamGroup | null>(null);
  const [adminPeopleMode, setAdminPeopleMode] = useState<'TEAMS' | 'ALL'>('TEAMS');
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ON_LEAVE'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'EMPLOYEE' | 'LEADER' | 'HR'>('ALL');
  const [leadsDateFilter, setLeadsDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [leadsCustomStart, setLeadsCustomStart] = useState<string>(getTodayDateIST());
  const [leadsCustomEnd, setLeadsCustomEnd] = useState<string>(getTodayDateIST());
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [openEmployee, setOpenEmployee] = useState<TeamMember | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<TeamMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamGroup | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<TeamGroup | null>(null);
  const [verifySelectedDate, setVerifySelectedDate] = useState<string>(getTodayDateIST());
  const [verifyDateMode, setVerifyDateMode] = useState<'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'SPECIFIC' | 'CUSTOM' | 'ALL'>('TODAY');
  const [customStartDate, setCustomStartDate] = useState<string>(getTodayDateIST());
  const [customEndDate, setCustomEndDate] = useState<string>(getTodayDateIST());
  const [verifyStatusFilter, setVerifyStatusFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'DISPUTED'>('ALL');
  const [verifySearchQuery, setVerifySearchQuery] = useState('');
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);
  const [suspiciousModalItem, setSuspiciousModalItem] = useState<AttendanceRecord | null>(null);
  const [suspiciousReason, setSuspiciousReason] = useState<string>('Suspicious face photo / Proxy verification suspected');
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);
  const [isClearAttendanceModalOpen, setIsClearAttendanceModalOpen] = useState(false);
  const [clearAttendanceScope, setClearAttendanceScope] = useState<'SELECTED_DAY' | 'THIS_MONTH' | 'CUSTOM_RANGE' | 'ALL'>('SELECTED_DAY');
  const [clearCustomStartDate, setClearCustomStartDate] = useState<string>(getTodayDateIST());
  const [clearCustomEndDate, setClearCustomEndDate] = useState<string>(getTodayDateIST());
  const [isClearingAttendance, setIsClearingAttendance] = useState(false);
  const [attendanceToDelete, setAttendanceToDelete] = useState<AttendanceRecord | null>(null);
  const [managingSquad, setManagingSquad] = useState<TeamGroup | null>(null);
  const [moveFrom, setMoveFrom] = useState('');
  const [moveTo, setMoveTo] = useState('');

  // Target control, Approvals subtab, Meeting scheduling, and Inspection voucher states
  const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [approvalSubTab, setApprovalSubTab] = useState<'PAYMENTS' | 'LEAVES'>('PAYMENTS');
  const [inspectingPayment, setInspectingPayment] = useState<PaymentVerificationItem | null>(null);
  const [isDistributing, setIsDistributing] = useState(false);

  // Office location & Live Verification
  const [office, setOffice] = useState<OfficeSettings | null>(null);
  const [officeDraft, setOfficeDraft] = useState<Partial<OfficeSettings>>({});
  const [locating, setLocating] = useState(false);
  const [showOfficeEditor, setShowOfficeEditor] = useState(false);
  const [showCalendarConfig, setShowCalendarConfig] = useState(false);
  const [calendarInitialTab, setCalendarInitialTab] = useState<'CALENDAR' | 'POLICY' | 'HOLIDAYS'>('CALENDAR');
  const [isAdminMapExpanded, setIsAdminMapExpanded] = useState(false);
  const [adminDeviceLocation, setAdminDeviceLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [adminDistanceToOffice, setAdminDistanceToOffice] = useState<number | null>(null);
  const [isVerifyingAdminLocation, setIsVerifyingAdminLocation] = useState(false);
  const [showInAppLiveMap, setShowInAppLiveMap] = useState(false);

  useEffect(() => {
    api.getOffice().then(setOffice).catch(() => setOffice(null));

    // Initial silent check of admin device location
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setAdminDeviceLocation({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    }
  }, []);

  // Real-time calculation of distance between admin device and office
  useEffect(() => {
    if (adminDeviceLocation && office?.latitude != null && office?.longitude != null) {
      const R = 6371000;
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const dLat = toRad(office.latitude - adminDeviceLocation.lat);
      const dLng = toRad(office.longitude - adminDeviceLocation.lng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(adminDeviceLocation.lat)) * Math.cos(toRad(office.latitude)) * Math.sin(dLng / 2) ** 2;
      const d = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      setAdminDistanceToOffice(d);
    } else {
      setAdminDistanceToOffice(null);
    }
  }, [adminDeviceLocation, office]);

  useEffect(() => {
    if (tab === 'attendance_verification') {
      refreshResources(['attendanceLogs']);
    }
  }, [tab, refreshResources]);

  const isMemberOfSquad = (m: TeamMember, squadName?: string) =>
    squadName ? (m.group || '').split(',').map((s) => s.trim().toLowerCase()).includes(squadName.trim().toLowerCase()) : false;

  const verifyAdminLiveLocation = () => {
    setIsVerifyingAdminLocation(true);
    if (!navigator.geolocation) {
      triggerToast('Geolocation is not supported by your browser.');
      setIsVerifyingAdminLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setAdminDeviceLocation({ lat, lng });
        setIsVerifyingAdminLocation(false);
        triggerToast(`✓ Live device coordinates verified! (±${Math.round(pos.coords.accuracy)}m)`);
      },
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos2) => {
            const lat = Number(pos2.coords.latitude.toFixed(6));
            const lng = Number(pos2.coords.longitude.toFixed(6));
            setAdminDeviceLocation({ lat, lng });
            setIsVerifyingAdminLocation(false);
            triggerToast('✓ Live device coordinates verified via network');
          },
          (err) => {
            setIsVerifyingAdminLocation(false);
            triggerToast(`✗ Could not read location: ${err.message || 'Permission denied'}`);
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 }
    );
  };

  const officeField = <K extends keyof OfficeSettings>(k: K) =>
    (officeDraft[k] !== undefined ? officeDraft[k] : office?.[k]) as OfficeSettings[K];

  const handleConfirmClearAttendance = async () => {
    setIsClearingAttendance(true);
    try {
      if (clearAttendanceScope === 'SELECTED_DAY') {
        await clearAttendanceRecords({ date: verifySelectedDate });
      } else if (clearAttendanceScope === 'THIS_MONTH') {
        const d = new Date();
        await clearAttendanceRecords({ month: String(d.getMonth() + 1), year: String(d.getFullYear()) });
      } else if (clearAttendanceScope === 'CUSTOM_RANGE') {
        await clearAttendanceRecords({ startDate: clearCustomStartDate, endDate: clearCustomEndDate });
      } else if (clearAttendanceScope === 'ALL') {
        await clearAttendanceRecords({ all: true });
      }
      setIsClearAttendanceModalOpen(false);
      triggerToast('✓ Attendance records cleared successfully');
    } catch (err: any) {
      triggerToast(err?.message || 'Failed to clear records');
    } finally {
      setIsClearingAttendance(false);
    }
  };

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
        triggerToast('\u2713 Location read. Press Save to use it.');
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
      setShowOfficeEditor(false);
      triggerToast('\u2713 Office location saved');
    } catch {
      triggerToast('\u2717 Could not save the office location');
    }
  };

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

  const verifiedPayments = useMemo(() => uniquePayments.filter(p => p.status === 'VERIFIED'), [uniquePayments]);
  const pendingPaymentsList = useMemo(() => uniquePayments.filter(p => p.status === 'PENDING_HR_AUDIT'), [uniquePayments]);
  const totalVerifiedRevenue = useMemo(() => verifiedPayments.reduce((sum, p) => sum + (p.dealAmount || 0), 0), [verifiedPayments]);
  const totalPendingRevenue = useMemo(() => pendingPaymentsList.reduce((sum, p) => sum + (p.dealAmount || 0), 0), [pendingPaymentsList]);
  const teamSalesTotal = useMemo(() => teamMembers.reduce((sum, m) => sum + (m.salesAchieved || 0), 0), [teamMembers]);
  const leadsWonRevenue = useMemo(() => (assignedLeads || []).filter(l => l.status === 'CONVERTED' || (l.dealValue && l.dealValue > 0)).reduce((sum, l) => sum + (l.dealValue || 0), 0), [assignedLeads]);
  const salesAchieved = Math.max(totalVerifiedRevenue, teamSalesTotal, leadsWonRevenue);

  const totalRosterTarget = useMemo(() => teamMembers.reduce((sum, m) => sum + (m.salesTarget || 0), 0), [teamMembers]);
  const totalGroupTarget = useMemo(() => (teamGroups || []).reduce((sum, g) => sum + (g.monthlyTarget || 0), 0), [teamGroups]);
  const salesTarget = Math.max(totalRosterTarget, totalGroupTarget, 500000);

  const pendingPayments = uniquePayments.filter((p: PaymentVerificationItem) => p.status === 'PENDING_HR_AUDIT');
  const todayYMD = getTodayDateIST();
  const todayVerifiedSales = verifiedPayments.filter(p => (p.timestamp || '').slice(0, 10) === todayYMD || (p.timestamp || '').toLowerCase().includes('today')).reduce((sum: number, p: PaymentVerificationItem) => sum + (p.dealAmount || 0), 0);
  const todayPendingSales = pendingPaymentsList.reduce((sum: number, p: PaymentVerificationItem) => sum + (p.dealAmount || 0), 0);
  const todaySales = todayVerifiedSales > 0 ? todayVerifiedSales : (salesAchieved > 0 ? todayVerifiedSales || Math.round(salesAchieved / Math.max(1, new Date().getDate())) : todayPendingSales);
  const todayDealsCount = uniquePayments.length;
  const leadsDueToday = clients.filter((c) => c.status === 'Due Today');

  const awayWithoutLeave = teamMembers.filter((m) => m.attendanceStatus === 'ABSENT');
  const idleToday = teamMembers.filter(
    (m) => m.attendanceStatus === 'PRESENT' && (m.dialsToday || 0) === 0
  );

  const nonAdminMembers = teamMembers.filter(
    (m) => m.portal !== 'admin' && m.empCode !== 'TNX-AD01' && !(m.role || '').toLowerCase().includes('admin')
  );

  // Strictly filter for Telecaller employees (excludes Admin, HR, Team Leaders, Accounts, Coaches)
  const isTelecallerMember = (m: TeamMember) => {
    if (!m) return false;
    const p = (m.portal || '').toLowerCase();
    const r = (m.role || '').toLowerCase();
    const n = (m.name || '').toLowerCase();
    if (p === 'admin' || p === 'hr' || p === 'team_leader') return false;
    if (m.empCode === 'TNX-AD01') return false;
    if (r.includes('admin') || r.includes('hr') || r.includes('leader') || r.includes('coach') || 
        r.includes('account') || r.includes('manager') || r.includes('finance') || r.includes('operations')) {
      return false;
    }
    if (n.includes('hr') || n.includes('admin')) return false;
    return true;
  };

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
    const matchesAttendance =
      attendanceFilter === 'ALL' ||
      m.attendanceStatus === attendanceFilter;

    const portalStr = (m.portal || '').toLowerCase();
    const roleStr = (m.role || '').toLowerCase();
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

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.empCode.toLowerCase().includes(q) ||
      roleStr.includes(q) ||
      (m.group ?? '').toLowerCase().includes(q) ||
      portalStr.includes(q);

    return matchesAttendance && matchesRole && matchesSearch;
  });

  const statusChip = (status: string) => (
    <span
      className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
        status === 'PRESENT'
          ? 'bg-emerald-50 text-emerald-700'
          : status === 'LATE'
          ? 'bg-amber-50 text-amber-700'
          : status === 'ON_LEAVE'
          ? 'bg-sky-50 text-sky-700'
          : 'bg-rose-50 text-rose-700'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );

  const AdminKpiCard: React.FC<{
    label: string;
    value: string;
    sub?: string;
    icon: React.FC<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    badge?: string;
    badgeStyle?: string;
    progress?: number;
    onClick?: () => void;
  }> = ({ label, value, sub, icon: Icon, iconBg, iconColor, badge, badgeStyle, progress, onClick }) => (
    <div 
      onClick={onClick}
      className={`bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer hover:border-[#00C9A7] active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
        <div className={`w-7 h-7 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display font-black text-xl text-[#0A2540] tracking-tight">{value}</span>
        </div>

        {sub && (
          <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">{sub}</span>
        )}

        {progress !== undefined && (
          <div className="mt-2 space-y-1">
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-[#00C9A7] to-teal-500 transition-all duration-500" 
                style={{ width: `${Math.min(100, progress)}%` }} 
              />
            </div>
          </div>
        )}

        {badge && (
          <div className="mt-2">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${badgeStyle || 'bg-slate-100 text-slate-600'}`}>
              {badge}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const Stat: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs text-center">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">{label}</span>
      <span className="font-display font-black text-lg text-[#0A2540] block leading-tight mt-0.5">{value}</span>
      {sub && <span className="text-[9px] text-slate-400 font-medium block truncate">{sub}</span>}
    </div>
  );

  const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="font-display font-bold text-sm text-[#0A2540] px-1">{children}</h3>
  );

  const Empty: React.FC<{ text: string }> = ({ text }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-[11px] text-slate-400 font-semibold">
      {text}
    </div>
  );

  // Admin only sees leaves at PENDING_ADMIN stage (final approval)
  const pendingLeavesCount = leaveRequests.filter((l) => l.status === 'PENDING' && l.approvalStage === 'PENDING_ADMIN').length;
  const totalApprovalsWaiting = pendingPayments.length + pendingLeavesCount;

  const navItems: { id: AdminTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'home', label: 'Overview', icon: Home },
    { id: 'people', label: 'People', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'leads', label: 'Leads', icon: FileSpreadsheet },
    { id: 'more', label: 'More', icon: MoreHorizontal, badge: totalApprovalsWaiting > 0 ? totalApprovalsWaiting : undefined },
  ];

  if (selectedMemberFor360) {
    return (
      <Employee360ProfileView
        member={selectedMemberFor360}
        onBack={() => setSelectedMemberFor360(null)}
        viewerRole="admin"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col justify-between w-full max-w-7xl mx-auto font-sans pb-24 lg:pb-28">
      <main className="flex-1 p-3.5 sm:p-5 lg:p-6 space-y-4 pt-3">

        {/* ---------------------------------------------------- Overview */}
        {tab === 'home' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header: Clean Hello Admin */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <h2 className="font-display font-black text-xl text-[#0A2540] tracking-tight">
                  Hello, {adminFirstName} 👋
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-display font-black text-xs shadow-xs border border-[#00C9A7]/30">
                  {adminInitials}
                </div>
                <button
                  onClick={() => logout()}
                  title="Exit Account / Logout"
                  className="w-9 h-9 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 flex items-center justify-center shadow-2xs active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 4 Core Compact KPI Cards (2x2 on Mobile, 4x1 on Desktop) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5 lg:gap-4">
              {/* Row 1, Col 1: Present */}
              <div 
                onClick={() => setTab('attendance')}
                className="bg-white border border-slate-200/90 hover:border-[#00C9A7] rounded-xl p-2.5 shadow-2xs cursor-pointer active:scale-95 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">Present</span>
                  <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <span className="font-display font-black text-sm text-[#0A2540] block tracking-tight leading-tight">
                    {presentToday}/{headcount}
                  </span>
                  <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-200/60 inline-block mt-1 truncate max-w-full">
                    {Math.round((presentToday / Math.max(1, headcount)) * 100)}% On-Duty
                  </span>
                </div>
              </div>

              {/* Row 1, Col 2: Calls Today */}
              <div 
                onClick={() => setTab('leads')}
                className="bg-white border border-slate-200/90 hover:border-indigo-400 rounded-xl p-2.5 shadow-2xs cursor-pointer active:scale-95 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">Calls Today</span>
                  <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <PhoneCall className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <span className="font-display font-black text-sm text-[#0A2540] block tracking-tight leading-tight truncate">
                    {callsToday} <span className="text-[10px] font-bold text-slate-400">Dials</span>
                  </span>
                  <span className="text-[8.5px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded-md border border-indigo-200/60 inline-block mt-1 truncate max-w-full">
                    {Math.round(callsToday / Math.max(1, headcount))} Dials / Rep
                  </span>
                </div>
              </div>

              {/* Row 2, Col 1: Today's Sales */}
              <div 
                onClick={() => setTab('approvals')}
                className="bg-white border border-slate-200/90 hover:border-amber-400 rounded-xl p-2.5 shadow-2xs cursor-pointer active:scale-95 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">Today's Sales</span>
                  <div className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <span className="font-display font-black text-sm text-amber-700 block tracking-tight leading-tight truncate">
                    {inr(todaySales)}
                  </span>
                  <span className="text-[8.5px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200/60 inline-block mt-1 truncate max-w-full">
                    {todayDealsCount} Closed Today
                  </span>
                </div>
              </div>

              {/* Row 2, Col 2: Monthly Sales & Target Control */}
              <div 
                onClick={() => setIsTargetModalOpen(true)}
                className="bg-white border border-slate-200/90 hover:border-teal-400 rounded-xl p-2.5 shadow-2xs cursor-pointer active:scale-95 transition-all flex flex-col justify-between group"
                title="Click to set monthly sales targets"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">Monthly Sales</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-black text-[#00A88B] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60 group-hover:bg-[#00C9A7] group-hover:text-[#0A2540] transition-colors">
                      Set 🎯
                    </span>
                  </div>
                </div>
                <div>
                  <span className="font-display font-black text-sm text-[#00A88B] block tracking-tight leading-tight truncate">
                    {inr(salesAchieved)}
                  </span>
                  <span className="text-[8.5px] font-bold text-[#00A88B] bg-[#E6FAF6] px-1.5 py-0.2 rounded-md border border-[#00C9A7]/40 inline-block mt-1 truncate max-w-full">
                    {salesTarget > 0 ? `${Math.round((salesAchieved / salesTarget) * 100)}% of ${salesTarget >= 100000 ? `₹${(salesTarget / 100000).toFixed(1)}L` : inr(salesTarget)}` : salesAchieved > 0 ? `${inr(salesAchieved)} achieved` : '0% of ₹0'}
                  </span>
                </div>
              </div>
            </div>

            {/* Executive Quick Actions Bar */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsScheduleMeetingOpen(true)}
                className="flex-1 py-2.5 px-3 bg-gradient-to-r from-[#0A2540] to-teal-950 text-[#00C9A7] font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm border border-[#00C9A7]/40 active:scale-95 transition-all cursor-pointer"
              >
                <Video className="w-4 h-4 text-[#00C9A7]" />
                <span>Schedule Zoom Call</span>
                <span className="text-[9px] bg-[#00C9A7] text-[#0A2540] font-black px-1.5 py-0.5 rounded uppercase">Cloud</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(true)}
                className="py-2.5 px-3.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs hover:border-slate-300 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Add Staff</span>
              </button>
            </div>

            {/* 📹 Active LIVE & Scheduled Meeting Alerts for Super Admin */}
            {(() => {
              const activeMeetings = teamMeetings.filter(m => m.status === 'LIVE' || m.status === 'UPCOMING');
              if (activeMeetings.length === 0) return null;
              const seen = new Set<string>();
              const deduplicatedMeetings = activeMeetings.filter(m => {
                const key = m.id || `${(m.title || '').trim().toLowerCase()}_${(m.dateTime || '').trim().toLowerCase()}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Active Floor Calls & Meetings ({deduplicatedMeetings.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsScheduleMeetingOpen(true)}
                      className="text-[10px] font-bold text-sky-600 hover:text-sky-800"
                    >
                      + Schedule Call
                    </button>
                  </div>
                  {deduplicatedMeetings.slice(0, 5).map((mtg) => {
                    const isLive = mtg.status === 'LIVE';
                    return (
                      <div 
                        key={mtg.id}
                        className={`border-2 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs animate-in slide-in-from-top-2 ${
                          isLive 
                            ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-emerald-500/80' 
                            : 'bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 border-sky-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="relative flex h-3 w-3 flex-shrink-0">
                            {isLive ? (
                              <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
                              </>
                            ) : (
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                isLive ? 'bg-emerald-200 text-emerald-900' : 'bg-sky-100 text-sky-800 border border-sky-200'
                              }`}>
                                {isLive ? '🔴 Live Session' : '📅 Scheduled'}
                              </span>
                              {mtg.zoomMeetingId && (
                                <span className="text-[9px] font-mono font-bold bg-blue-100 text-blue-800 px-1 rounded">
                                  Zoom
                                </span>
                              )}
                              {mtg.targetTeam && (
                                <span className="text-[9px] font-bold text-slate-500 truncate">
                                  · {mtg.targetTeam}
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-xs text-[#0A2540] truncate block mt-0.5">
                              {mtg.title}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              Host: {mtg.hostName || 'Floor Leader'} {mtg.hostRole ? `(${mtg.hostRole.toUpperCase()})` : ''} · {mtg.dateTime}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => deleteTeamMeeting(mtg.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Cancel / Delete Meeting"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => joinMeeting(mtg)}
                            className="px-3 py-1.5 bg-[#0A2540] hover:bg-[#00C9A7] hover:text-[#0A2540] text-white font-black text-[11px] rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                          >
                            <Video className="w-3.5 h-3.5 text-[#00C9A7]" />
                            <span>{isLive ? 'Join' : 'Start / Join'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* 🛡️ Pending Leave Approvals Escalation Card for Super Admin */}
            {pendingLeavesCount > 0 && (
              <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-3.5 space-y-3 shadow-xs animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                      {pendingLeavesCount}
                    </div>
                    <div>
                      <h4 className="font-display font-black text-xs text-amber-950 uppercase tracking-wider">
                        Pending Leave Approvals
                      </h4>
                      <span className="text-[10px] text-amber-800">Final executive sanction waiting</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('more');
                      setApprovalSubTab('LEAVES');
                    }}
                    className="text-[11px] font-bold text-amber-900 hover:underline cursor-pointer"
                  >
                    View All →
                  </button>
                </div>

                <div className="space-y-2">
                  {leaveRequests
                    .filter((l) => l.status === 'PENDING' && l.approvalStage === 'PENDING_ADMIN')
                    .slice(0, 3)
                    .map((l) => (
                      <div key={l.id} className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <strong className="text-xs font-bold text-[#0A2540] block">{l.employeeName || 'Staff Member'}</strong>
                            <span className="text-[10px] text-slate-500">{l.leaveType} • {l.fromDate} to {l.toDate} ({l.totalDays || 1} day(s))</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                            PENDING
                          </span>
                        </div>
                        {l.reason && (
                          <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                            "{l.reason}"
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => {
                              approveLeaveRequest(l.id);
                              triggerToast(`✓ Approved leave request for ${l.employeeName || 'Staff'}`);
                            }}
                            className="py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve Leave</span>
                          </button>
                          <button
                            onClick={() => {
                              rejectLeaveRequest(l.id, 'Declined by Admin due to operational schedule');
                              triggerToast(`✗ Rejected leave request for ${l.employeeName || 'Staff'}`);
                            }}
                            className="py-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
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

            {/* Quick Actions Hub (5-col grid with Host Meeting & Calendar Setup) */}
            <div className="grid grid-cols-5 gap-1.5 pt-0.5">
              <button
                onClick={() => setIsScheduleMeetingOpen(true)}
                className="bg-white border border-slate-200/90 hover:border-teal-400 rounded-2xl p-2 flex flex-col items-center justify-center gap-1 text-center active:scale-95 transition-all shadow-2xs group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-xl bg-teal-50 text-[#00A88B] flex items-center justify-center group-hover:bg-[#00C9A7] group-hover:text-[#0A2540] transition-colors">
                  <Video className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9.5px] font-bold text-[#0A2540] leading-tight">Meeting</span>
              </button>

              <button
                onClick={() => {
                  setTab('more');
                  setShowCalendarConfig(true);
                }}
                className="bg-white border border-slate-200/90 hover:border-purple-400 rounded-2xl p-2 flex flex-col items-center justify-center gap-1 text-center active:scale-95 transition-all shadow-2xs group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9.5px] font-bold text-[#0A2540] leading-tight">Calendar</span>
              </button>

              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="bg-white border border-slate-200/90 hover:border-[#00C9A7] rounded-2xl p-2 flex flex-col items-center justify-center gap-1 text-center active:scale-95 transition-all shadow-2xs group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-xl bg-teal-50 text-[#00A88B] flex items-center justify-center group-hover:bg-[#00C9A7] group-hover:text-[#0A2540] transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9.5px] font-bold text-[#0A2540] leading-tight">Add User</span>
              </button>

              <button
                onClick={() => setIsExcelUploadModalOpen(true)}
                className="bg-white border border-slate-200/90 hover:border-indigo-400 rounded-2xl p-2 flex flex-col items-center justify-center gap-1 text-center active:scale-95 transition-all shadow-2xs group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <UploadCloud className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9.5px] font-bold text-[#0A2540] leading-tight">Leads</span>
              </button>

              <button
                onClick={() => {
                  setTab('more');
                  setShowOfficeEditor(true);
                }}
                className="bg-white border border-slate-200/90 hover:border-sky-400 rounded-2xl p-2 flex flex-col items-center justify-center gap-1 text-center active:scale-95 transition-all shadow-2xs group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9.5px] font-bold text-[#0A2540] leading-tight">Geofence</span>
              </button>
            </div>

            {/* Needs Your Attention Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <h3 className="font-display font-black text-sm text-[#0A2540] flex items-center gap-1.5">
                  <span>Needs Your Attention</span>
                  {(pendingPayments.length > 0 || idleToday.length > 0 || awayWithoutLeave.length > 0) && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Real-time alerts</span>
              </div>

              {!pendingPayments.length && !awayWithoutLeave.length && !idleToday.length ? (
                <Empty text="✨ All clear! No pending audits or floor alerts right now." />
              ) : (
                <div className="space-y-2">
                  {/* Pending Payment Cards */}
                  {pendingPayments.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white border border-amber-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          💰 Payment Audit Required
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.timestamp || 'Today'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <strong className="text-sm font-black text-[#0A2540] block">
                            {inr(p.dealAmount)}
                          </strong>
                          <span className="text-xs text-slate-600 font-medium">
                            {p.companyName} • <span className="text-slate-400">Rep: {p.telecallerName}</span>
                          </span>
                        </div>
                        <button
                          onClick={() => setTab('approvals')}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Telecallers with Zero Calls Today */}
                  {idleToday.length > 0 && (
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60">
                          ⚠️ Zero Dials Logged
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{idleToday.length} Employees</span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {idleToday.map((m) => (
                          <div key={m.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-[#0A2540] text-[#00C9A7] font-black text-[10px] flex items-center justify-center">
                                {m.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-[#0A2540] block">{m.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">In at {m.checkInTime || '—'}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                              0 Calls
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Absent Without Leave */}
                  {awayWithoutLeave.map((m) => (
                    <div key={m.id} className="bg-rose-50/50 border border-rose-200 rounded-2xl p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                          <XCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-xs font-bold text-rose-950 block">{m.name} is Absent</strong>
                          <span className="text-[10px] text-rose-600">No approved leave logged in system</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Download Reports Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <h3 className="font-display font-black text-sm text-[#0A2540]">
                  Executive CSV Reports
                </h3>
                <button
                  onClick={() => setTab('reports')}
                  className="text-[11px] font-bold text-[#00A88B] hover:text-[#0A2540] transition-colors cursor-pointer"
                >
                  All 8 Reports →
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    downloadCsv(
                      'Employees',
                      'Name,Code,Role,Team,Status,Calls today,Sales',
                      teamMembers.map(
                        (e) =>
                          `"${e.name}","${e.empCode}","${e.role}","${e.group}","${e.attendanceStatus}",${e.dialsToday},${e.salesAchieved}`
                      )
                    );
                    triggerToast('✓ Employee roster CSV exported');
                  }}
                  className="bg-white border border-slate-200/90 hover:border-[#00C9A7] rounded-2xl p-3 text-left shadow-2xs active:scale-95 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#00A88B] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Download className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                      .CSV
                    </span>
                  </div>
                  <strong className="text-xs font-bold text-[#0A2540] block">Employee Roster</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Sales, targets & calls</span>
                </button>

                <button
                  onClick={() => {
                    downloadCsv(
                      'Attendance',
                      'Name,Team,Status,Check-in,Method',
                      teamMembers.map(
                        (m) =>
                          `"${m.name}","${m.group}","${m.attendanceStatus}","${m.checkInTime || ''}","${m.checkInMethod || ''}"`
                      )
                    );
                    triggerToast('✓ Attendance ledger CSV exported');
                  }}
                  className="bg-white border border-slate-200/90 hover:border-sky-400 rounded-2xl p-3 text-left shadow-2xs active:scale-95 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                      .CSV
                    </span>
                  </div>
                  <strong className="text-xs font-bold text-[#0A2540] block">Attendance Logs</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Punch-ins & geofence</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------ People */}
        {tab === 'people' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* Header + Mode Switcher */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-black text-xl text-[#0A2540]">
                  {selectedAdminTeamGroup
                    ? selectedAdminTeamGroup.name
                    : adminPeopleMode === 'TEAMS'
                    ? 'All Teams'
                    : `Workforce Roster (${headcount})`}
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedAdminTeamGroup
                    ? 'Squad employees & operational performance'
                    : adminPeopleMode === 'TEAMS'
                    ? 'Click any team to inspect employees & 360 dossiers'
                    : 'Tap any employee to view full 360 profile'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {!selectedAdminTeamGroup && (
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAdminPeopleMode('TEAMS')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        adminPeopleMode === 'TEAMS'
                          ? 'bg-[#0A2540] text-[#00C9A7] shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Teams
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminPeopleMode('ALL')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        adminPeopleMode === 'ALL'
                          ? 'bg-[#0A2540] text-[#00C9A7] shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Roster
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="flex items-center gap-1 bg-[#00C9A7] text-[#0A2540] font-extrabold text-xs px-2.5 py-1.5 rounded-xl shadow-xs active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* LEVEL 1: TEAMS BREAKDOWN (When adminPeopleMode === 'TEAMS' and selectedAdminTeamGroup === null) */}
            {adminPeopleMode === 'TEAMS' && !selectedAdminTeamGroup && (
              <div className="space-y-3.5">
                {/* Floor-wide Pulse Banner */}
                <div className="bg-white border border-slate-200/90 shadow-xs rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black tracking-wider text-[#0A2540] uppercase">
                        Floor Operations Pulse
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="bg-[#E6F8F5] border border-[#B2EFE5] text-[#00897B] font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                      {presentToday} Present • {headcount - presentToday} Away
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
                        <span className="text-[#00A88B]">{callsToday}</span>
                        <span className="text-slate-300 font-normal text-xs">/{teamMembers.reduce((s, m) => s + (m.goalCalls || 0), 0)}</span>
                      </strong>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                        Calls
                      </span>
                    </div>

                    <div className="px-1">
                      <strong className="text-base font-display font-black text-purple-700 block leading-tight">
                        {teamMembers.filter(m => m.salesAchieved > 0).length}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                        Won
                      </span>
                    </div>

                    <div className="px-1">
                      <strong className="text-base font-display font-black text-[#00A88B] block leading-tight">
                        {formatInLakhs(salesAchieved)}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                        Revenue
                      </span>
                    </div>
                  </div>
                </div>

                {/* Team Cards Header */}
                <div className="flex items-center justify-between px-1">
                  <SectionTitle>All Teams ({teamGroups.length})</SectionTitle>
                  <button
                    onClick={() => setIsCreateTeamOpen(true)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#00A88B] active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Team</span>
                  </button>
                </div>

                {/* All Teams Cards */}
                {!teamGroups.length ? (
                  <Empty text="No teams yet. Create a team to get started." />
                ) : (
                  <div className="space-y-3">
                    {teamGroups.map((g) => {
                      const squad = teamMembers.filter((m) => isMemberOfSquad(m, g.name));
                      const squadDials = squad.reduce((s, m) => s + (m.dialsToday || 0), 0);
                      const squadGoals = squad.reduce((s, m) => s + (m.goalCalls || 0), 0);
                      const squadWon = squad.filter((m) => m.salesAchieved > 0).length;
                      const squadRev = squad.reduce((s, m) => s + (m.salesAchieved || 0), 0);
                      const squadPresent = squad.filter((m) => m.attendanceStatus === 'PRESENT').length;
                      const squadLate = squad.filter((m) => m.attendanceStatus === 'LATE').length;
                      const squadLeave = squad.filter((m) => m.attendanceStatus === 'ON_LEAVE').length;

                      return (
                        <div
                          key={g.id}
                          className="bg-white border border-slate-200/90 hover:border-[#00C9A7] rounded-2xl p-3.5 shadow-2xs space-y-3 transition-all"
                        >
                          {/* Team Title + TL */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-bold text-xs">
                                <Layers className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-xs font-black text-[#0A2540]">{g.name}</h3>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  Leader: <span className="font-bold text-[#0A2540]">{g.leaderName || 'Unassigned'}</span> • {squad.length} members
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                Target: {inr(g.monthlyTarget)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTeam(g);
                                }}
                                title="Edit Team"
                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-500 hover:text-[#00A88B] border border-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingTeam(g);
                                }}
                                title="Delete Team"
                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* 4 Metric Columns */}
                          <div className="grid grid-cols-4 gap-1 text-center divide-x divide-slate-100 bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                            <div className="px-1">
                              <strong className="text-sm font-display font-black text-[#0A2540] block leading-tight">
                                {squad.length}
                              </strong>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                                Team
                              </span>
                            </div>
                            <div className="px-1">
                              <strong className="text-sm font-display font-black text-[#0A2540] block leading-tight">
                                <span className="text-[#00A88B]">{squadDials}</span>
                                <span className="text-slate-300 font-normal text-[10px]">/{squadGoals}</span>
                              </strong>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                                Calls
                              </span>
                            </div>
                            <div className="px-1">
                              <strong className="text-sm font-display font-black text-purple-700 block leading-tight">
                                {squadWon}
                              </strong>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                                Won
                              </span>
                            </div>
                            <div className="px-1">
                              <strong className="text-sm font-display font-black text-[#00A88B] block leading-tight">
                                {formatInLakhs(squadRev)}
                              </strong>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                                Revenue
                              </span>
                            </div>
                          </div>

                          {/* Attendance Status Pill */}
                          <div className="bg-[#E6F8F5] border border-[#B2EFE5] text-[#00897B] font-bold text-[10px] px-2.5 py-1 rounded-xl text-center">
                            {squadPresent} Present • {squadLate} Late • {squadLeave} Leave
                          </div>

                          {/* Actions: Manage Squad + View Employees */}
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setManagingSquad(g)}
                              className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] py-2 px-3 rounded-xl transition-all border border-slate-200 active:scale-95 cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5 text-[#00A88B]" />
                              <span>{squad.length === 0 ? '+ Add Reps' : 'Manage Squad'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedAdminTeamGroup(g)}
                              className="flex items-center justify-center gap-1.5 bg-[#0A2540] hover:bg-[#133353] text-[#00C9A7] font-bold text-[11px] py-2 px-3 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                            >
                              <span>View Employees</span>
                              <span>→</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* LEVEL 2: SPECIFIC TEAM SQUAD (When adminPeopleMode === 'TEAMS' and selectedAdminTeamGroup !== null) */}
            {adminPeopleMode === 'TEAMS' && selectedAdminTeamGroup && (
              <div className="space-y-3.5">
                {/* Back to All Teams Navigation */}
                <button
                  type="button"
                  onClick={() => setSelectedAdminTeamGroup(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0A2540] bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#00A88B]" />
                  <span>← All Teams</span>
                </button>

                {/* Team Summary Pulse Card */}
                <div className="bg-white border border-slate-200/90 shadow-xs rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black tracking-wider text-[#00A88B] uppercase">
                        Team Squad Pulse
                      </span>
                      <h3 className="font-display font-black text-lg text-[#0A2540] leading-tight">
                        {selectedAdminTeamGroup.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Leader: <span className="font-bold text-[#0A2540]">{selectedAdminTeamGroup.leaderName || 'Unassigned'}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setManagingSquad(selectedAdminTeamGroup)}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-200 flex items-center gap-1"
                    >
                      <Users className="w-3 h-3 text-[#00A88B]" />
                      <span>Manage Squad</span>
                    </button>
                  </div>

                  <div className="h-px bg-slate-100" />

                  {(() => {
                    const squad = teamMembers.filter((m) => isMemberOfSquad(m, selectedAdminTeamGroup.name));
                    const squadDials = squad.reduce((s, m) => s + (m.dialsToday || 0), 0);
                    const squadGoals = squad.reduce((s, m) => s + (m.goalCalls || 0), 0);
                    const squadWon = squad.filter((m) => m.salesAchieved > 0).length;
                    const squadRev = squad.reduce((s, m) => s + (m.salesAchieved || 0), 0);
                    const squadPresent = squad.filter((m) => m.attendanceStatus === 'PRESENT').length;
                    const squadLate = squad.filter((m) => m.attendanceStatus === 'LATE').length;
                    const squadLeave = squad.filter((m) => m.attendanceStatus === 'ON_LEAVE').length;

                    return (
                      <>
                        <div className="grid grid-cols-4 gap-1 text-center divide-x divide-slate-100">
                          <div className="px-1">
                            <strong className="text-base font-display font-black text-[#0A2540] block leading-tight">
                              {squad.length}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                              Team
                            </span>
                          </div>
                          <div className="px-1">
                            <strong className="text-base font-display font-black text-[#0A2540] block leading-tight">
                              <span className="text-[#00A88B]">{squadDials}</span>
                              <span className="text-slate-300 font-normal text-xs">/{squadGoals}</span>
                            </strong>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                              Calls
                            </span>
                          </div>
                          <div className="px-1">
                            <strong className="text-base font-display font-black text-purple-700 block leading-tight">
                              {squadWon}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                              Won
                            </span>
                          </div>
                          <div className="px-1">
                            <strong className="text-base font-display font-black text-[#00A88B] block leading-tight">
                              {formatInLakhs(squadRev)}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                              Revenue
                            </span>
                          </div>
                        </div>

                        <div className="bg-[#E6F8F5] border border-[#B2EFE5] text-[#00897B] font-bold text-[10px] px-2.5 py-1 rounded-xl text-center">
                          {squadPresent} Present • {squadLate} Late • {squadLeave} Leave
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
                    placeholder={`Search in ${selectedAdminTeamGroup.name}...`}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00C9A7]"
                  />
                </div>

                {/* Filter Pills for this team */}
                {(() => {
                  const squad = teamMembers.filter((m) => isMemberOfSquad(m, selectedAdminTeamGroup.name));
                  const pCount = squad.filter((m) => m.attendanceStatus === 'PRESENT').length;
                  const lCount = squad.filter((m) => m.attendanceStatus === 'LATE').length;
                  const oCount = squad.filter((m) => m.attendanceStatus === 'ON_LEAVE').length;

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
                        All ({squad.length})
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

                {/* Team's Telecallers List */}
                <div className="space-y-3">
                  {teamMembers
                    .filter((m) => isMemberOfSquad(m, selectedAdminTeamGroup.name))
                    .filter((m) => {
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

                      return (
                        <div
                          key={member.id}
                          onClick={() => setSelectedMemberFor360(member)}
                          className="bg-white border border-slate-200/90 hover:border-[#00C9A7] rounded-2xl p-3.5 shadow-2xs hover:shadow-md flex flex-col gap-2.5 cursor-pointer active:scale-[0.98] transition-all group relative overflow-hidden"
                        >
                          <div
                            className={`absolute top-0 left-0 right-0 h-1 ${
                              isPresent
                                ? 'bg-gradient-to-r from-emerald-400 to-[#00C9A7]'
                                : isLate
                                ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                : 'bg-gradient-to-r from-rose-400 to-rose-500'
                            }`}
                          />

                          <div className="flex items-center justify-between pt-0.5">
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                <div className="w-11 h-11 rounded-2xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-display font-black text-sm shadow-xs group-hover:scale-105 transition-transform overflow-hidden">
                                  <EmployeeAvatar avatar={member.avatar} name={member.name} className="w-full h-full" fallbackClassName="font-display font-black text-sm" />
                                </div>
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                    isPresent
                                      ? 'bg-emerald-500'
                                      : isLate
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                />
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

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                isPresent
                                  ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-200/80'
                                  : isLate
                                  ? 'bg-amber-100/90 text-amber-800 border border-amber-200/80'
                                  : 'bg-rose-100/90 text-rose-800 border border-rose-200/80'
                              }`}
                            >
                              {member.attendanceStatus}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-slate-50/90 p-1.5 rounded-xl border border-slate-100 text-center">
                            <div className="bg-white rounded-lg py-1.5 px-1 shadow-2xs border border-slate-100/80">
                              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Dials</span>
                              <strong className="text-xs font-mono font-black text-[#0A2540]">{member.dialsToday || 0}</strong>
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

                          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100">
                            <span className="text-slate-500 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              In: {member.checkInTime || '—'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {member.portal !== 'admin' && member.empCode !== 'TNX-AD01' && !(member.role || '').toLowerCase().includes('admin') && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEmployeeToDelete(member);
                                  }}
                                  className="px-2 py-1 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/80 transition-all flex items-center gap-1 cursor-pointer"
                                  title="Delete employee"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span className="text-[9px] font-bold">Delete</span>
                                </button>
                              )}
                              <span className="px-2.5 py-1 rounded-xl bg-[#E6FAF6] text-[#00A88B] font-bold group-hover:bg-[#00C9A7] group-hover:text-[#0A2540] transition-colors flex items-center gap-1 shadow-2xs">
                                <span>View 360 Profile</span>
                                <span>→</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {teamMembers.filter((m) => isMemberOfSquad(m, selectedAdminTeamGroup.name)).length === 0 && (
                    <Empty text={`No employees assigned to ${selectedAdminTeamGroup.name} yet.`} />
                  )}
                </div>
              </div>
            )}

            {/* FULL WORKFORCE ROSTER (When adminPeopleMode === 'ALL') */}
            {adminPeopleMode === 'ALL' && (
              <div className="space-y-3.5">
                {/* Role Tabs for filtering Telecallers, Team Leaders, and HR */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { key: 'ALL', label: 'Everyone', count: nonAdminMembers.length },
                    { key: 'EMPLOYEE', label: 'Telecallers', count: telecallerCount, icon: '📞' },
                    { key: 'LEADER', label: 'Team Leaders', count: leaderCount, icon: '⭐' },
                    { key: 'HR', label: 'HR Staff', count: hrCount, icon: '👥' },
                  ].map((tabItem) => (
                    <button
                      key={tabItem.key}
                      type="button"
                      onClick={() => setRoleFilter(tabItem.key as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                        roleFilter === tabItem.key
                          ? 'bg-[#0A2540] text-[#00C9A7] shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {tabItem.icon && <span>{tabItem.icon}</span>}
                      <span>{tabItem.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        roleFilter === tabItem.key ? 'bg-[#00C9A7] text-[#0A2540] font-black' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {tabItem.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    {(['ALL', 'PRESENT', 'LATE', 'ON_LEAVE'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setAttendanceFilter(f)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          attendanceFilter === f ? 'bg-[#00C9A7] text-[#0A2540] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {f === 'ALL' ? 'All' : f === 'ON_LEAVE' ? 'Leave' : f}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono font-bold">
                    {filteredPeople.length} Showing
                  </span>
                </div>

                {/* Mobile Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, emp code, role or squad..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00C9A7]"
                  />
                </div>

                {!filteredPeople.length ? (
                  <Empty text={headcount ? 'Nobody matches that search.' : 'No employees yet. Tap Add to begin.'} />
                ) : (
                  <div className="space-y-3">
                    {filteredPeople.map((member) => {
                      const isPresent = member.attendanceStatus === 'PRESENT';
                      const isLate = member.attendanceStatus === 'LATE';

                      return (
                        <div
                          key={member.id}
                          onClick={() => setSelectedMemberFor360(member)}
                          className="bg-white border border-slate-200/90 hover:border-[#00C9A7] rounded-2xl p-3.5 shadow-2xs hover:shadow-md flex flex-col gap-2.5 cursor-pointer active:scale-[0.98] transition-all group relative overflow-hidden"
                        >
                          <div
                            className={`absolute top-0 left-0 right-0 h-1 ${
                              isPresent
                                ? 'bg-gradient-to-r from-emerald-400 to-[#00C9A7]'
                                : isLate
                                ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                : 'bg-gradient-to-r from-rose-400 to-rose-500'
                            }`}
                          />

                          <div className="flex items-center justify-between pt-0.5">
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                <div className="w-11 h-11 rounded-2xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-display font-black text-sm shadow-xs group-hover:scale-105 transition-transform overflow-hidden">
                                  <EmployeeAvatar avatar={member.avatar} name={member.name} className="w-full h-full" fallbackClassName="font-display font-black text-sm" />
                                </div>
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                    isPresent
                                      ? 'bg-emerald-500'
                                      : isLate
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                />
                              </div>

                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <strong className="text-xs font-bold text-[#0A2540] group-hover:text-[#00A88B] transition-colors">
                                    {member.name}
                                  </strong>
                                  <span
                                    className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${
                                      member.portal === 'team_leader' || (member.role || '').toLowerCase().includes('leader')
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : member.portal === 'hr' || (member.role || '').toLowerCase().includes('hr')
                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                        : 'bg-sky-50 text-sky-700 border-sky-200'
                                    }`}
                                  >
                                    {member.portal === 'team_leader' || (member.role || '').toLowerCase().includes('leader')
                                      ? '⭐ Team Leader'
                                      : member.portal === 'hr' || (member.role || '').toLowerCase().includes('hr')
                                      ? '👥 HR Staff'
                                      : '📞 Telecaller'}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-md border border-slate-200/80">
                                    {member.group}
                                  </span>
                                  {member.active === 0 && (
                                    <span className="text-[8px] font-black px-1 py-0.5 rounded bg-slate-200 text-slate-600 uppercase">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {member.empCode} • {member.role || 'Telecaller Executive'}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                isPresent
                                  ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-200/80'
                                  : isLate
                                  ? 'bg-amber-100/90 text-amber-800 border border-amber-200/80'
                                  : 'bg-rose-100/90 text-rose-800 border border-rose-200/80'
                              }`}
                            >
                              {member.attendanceStatus}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-slate-50/90 p-1.5 rounded-xl border border-slate-100 text-center">
                            <div className="bg-white rounded-lg py-1.5 px-1 shadow-2xs border border-slate-100/80">
                              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Dials</span>
                              <strong className="text-xs font-mono font-black text-[#0A2540]">{member.dialsToday || 0}</strong>
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

                          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100">
                            <span className="text-slate-500 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              In: {member.checkInTime || '—'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {member.portal !== 'admin' && member.empCode !== 'TNX-AD01' && !(member.role || '').toLowerCase().includes('admin') && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEmployeeToDelete(member);
                                  }}
                                  className="px-2.5 py-1 rounded-xl text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1 cursor-pointer font-bold text-[10px]"
                                  title={`Delete ${member.role || 'employee'}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              )}
                              <span className="px-2.5 py-1 rounded-xl bg-[#E6FAF6] text-[#00A88B] font-bold group-hover:bg-[#00C9A7] group-hover:text-[#0A2540] transition-colors flex items-center gap-1 shadow-2xs">
                                <span>360 Profile</span>
                                <span>→</span>
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
        )}

        {/* -------------------------------------------------- Attendance */}
        {tab === 'attendance' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Header: Attendance Heading, Timing & Policy Button & Export Button */}
            <div className="flex items-center justify-between pt-0.5">
              <div>
                <h2 className="font-display font-black text-xl text-[#0A2540]">Attendance</h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCalendarInitialTab('POLICY');
                    setTab('company_calendar');
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-[#00C9A7] hover:text-[#00A88B] transition-colors cursor-pointer shadow-2xs"
                  title="Configure Shift Timings & Late Policy"
                >
                  <Clock className="w-3.5 h-3.5 text-[#00C9A7]" />
                  <span>Timing & Policy</span>
                </button>
                <button
                  onClick={() => {
                    downloadCsv(
                      'Attendance',
                      'Name,Team,Status,Check-in,Method',
                      teamMembers.map(
                        (m) => `"${m.name}","${m.group}","${m.attendanceStatus}","${m.checkInTime || ''}","${m.checkInMethod || ''}"`
                      )
                    );
                    triggerToast('✓ Attendance ledger CSV exported');
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#00A88B] bg-[#E6FAF6] px-2.5 py-1.5 rounded-xl border border-[#00C9A7]/40 hover:bg-[#00C9A7] hover:text-[#0A2540] transition-colors cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Quick Shift & Late-Tag Control Banner */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#00A88B] flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-xs text-[#0A2540]">Company Shift &amp; Late Policy</h4>
                    <span
                      className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full border shadow-2xs ${
                        calendarSettings?.enableLateMarking !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-purple-50 text-purple-700 border-purple-300'
                      }`}
                    >
                      {calendarSettings?.enableLateMarking !== false ? '● LATE TAG ENFORCED' : '○ LATE TAG DISABLED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cutoff: <span className="font-bold text-slate-700">{calendarSettings?.punchInWindowEnd || '09:30 AM'}</span>
                    {' • '}
                    Shift: <span className="font-bold text-slate-700">{calendarSettings?.shiftStartTime || '09:30 AM'} — {calendarSettings?.shiftEndTime || '06:30 PM'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const nextState = calendarSettings?.enableLateMarking === false;
                    await updateCalendarSettings({
                      enableLateMarking: nextState,
                      applyToToday: true,
                    });
                    triggerToast(nextState ? '✓ Late tagging enabled & applied to today' : '✓ Late tagging disabled: all check-ins set to PRESENT');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 ${
                    calendarSettings?.enableLateMarking !== false
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {calendarSettings?.enableLateMarking !== false ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-rose-500" />
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
                  className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
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
                  {presentToday}
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
                  {teamMembers.filter((m) => m.attendanceStatus === 'LATE').length}
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
                  {teamMembers.filter((m) => m.attendanceStatus === 'ON_LEAVE').length}
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
                  {teamMembers.length}
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

            {/* Attendance Register Roster (Exact HR Portal Style & Content) */}
            <div className="space-y-3">
              {(() => {
                const filteredAttendance = teamMembers.filter((m) => {
                  const matchSearch =
                    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    m.empCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (m.group && m.group.toLowerCase().includes(searchQuery.toLowerCase()));
                  const matchFilter =
                    attendanceFilter === 'ALL' || m.attendanceStatus === attendanceFilter;
                  return matchSearch && matchFilter;
                });

                if (filteredAttendance.length === 0) {
                  return (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400 font-semibold shadow-xs">
                      Nobody matches this attendance filter or search query.
                    </div>
                  );
                }

                return filteredAttendance.map((member) => {
                  const isPresent = member.attendanceStatus === 'PRESENT';
                  const isLate = member.attendanceStatus === 'LATE';
                  const isLeave = member.attendanceStatus === 'ON_LEAVE';

                  const squircleContainerStyle = isPresent
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                    : isLate
                    ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                    : 'bg-purple-50 text-purple-700 border border-purple-200/80';

                  const todayIso = getTodayDateIST();
                  const rec = attendanceLogs.find((a) => a.employeeId === member.id && a.date === todayIso);
                  const locLabel =
                    rec?.locationStatus === 'AT_OFFICE' ? 'At office'
                    : rec?.locationStatus === 'AWAY'
                      ? rec.checkInDistanceM != null ? `${(rec.checkInDistanceM / 1000).toFixed(1)} km away` : 'Away'
                    : rec?.locationStatus === 'OFFICE_NOT_SET' ? 'Office not set'
                    : rec ? 'Not shared' : null;

                  return (
                    <div
                      key={member.id}
                      onClick={() => setSelectedMemberFor360(member)}
                      className="bg-white border border-slate-200/90 hover:border-[#00C9A7] rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-[0.99] group flex flex-col gap-3"
                    >
                      {/* Top Row: Squircle Avatar + Name/Squad + Status Pill */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Squircle Container with Live Status Badge */}
                          <div className="relative flex-shrink-0">
                            {rec?.checkInPhoto ? (
                              <img
                                src={rec.checkInPhoto}
                                alt={member.name}
                                className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-2xs group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className={`w-12 h-12 rounded-2xl ${squircleContainerStyle} flex items-center justify-center font-black text-sm shadow-2xs group-hover:scale-105 transition-transform overflow-hidden`}>
                                <EmployeeAvatar avatar={member.avatar} name={member.name} className="w-full h-full" fallbackClassName="font-black text-sm" />
                              </div>
                            )}
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

                      {/* Middle: Full Content Punch Details Box (Punch In & Punch Out) */}
                      <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isLate ? 'text-amber-500' : isPresent ? 'text-[#00A88B]' : 'text-purple-500'}`} />
                            <span className="font-semibold text-slate-700 font-mono text-[11px] truncate">
                              {isLeave
                                ? 'Approved Leave for Today'
                                : (rec?.checkIn || member.checkInTime)
                                ? `Punch In: ${rec?.checkIn || member.checkInTime} ${isLate ? '(Late Flag • After 09:30)' : '(On Time)'}`
                                : 'Punch In: Not Logged'}
                            </span>
                          </div>
                          {locLabel && (
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ml-2 ${
                                rec?.locationStatus === 'AT_OFFICE'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : rec?.locationStatus === 'AWAY'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {locLabel}
                            </span>
                          )}
                        </div>

                        {!isLeave && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[11px]">
                            <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                              <LogOut className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span>
                                {rec?.checkOut || member.checkOutTime ? (
                                  <>Punch Out: <strong className="text-slate-800">{rec?.checkOut || member.checkOutTime}</strong></>
                                ) : (rec?.checkIn || member.checkInTime) ? (
                                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active on Floor (Not Punched Out)
                                  </span>
                                ) : (
                                  'Punch Out: —'
                                )}
                              </span>
                            </div>
                            {rec?.workHours && (
                              <span className="font-mono font-bold text-teal-700 text-[10px] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                                {rec.workHours}
                              </span>
                            )}
                          </div>
                        )}
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
                });
              })()}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------- Leads */}
        {/* ------------------------------------------------------- Leads */}
        {tab === 'leads' && (() => {
          const now = new Date();
          const todayYMD = getTodayDateIST();
          const yesterdayYMD = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          const filteredLeadsByDate = assignedLeads.filter((l) => {
            if (leadsDateFilter === 'ALL') return true;
            const leadDate = l.assignedDate || (l.updatedAt || l.createdAt || '').slice(0, 10);
            if (leadsDateFilter === 'TODAY') {
              return leadDate === todayYMD || (l.updatedAt || '').startsWith(todayYMD);
            }
            if (leadsDateFilter === 'YESTERDAY') {
              return leadDate === yesterdayYMD;
            }
            if (leadsDateFilter === 'THIS_WEEK') {
              const d = new Date(leadDate || l.updatedAt || '');
              return !isNaN(d.getTime()) && d >= sevenDaysAgo;
            }
            if (leadsDateFilter === 'THIS_MONTH') {
              const d = new Date(leadDate || l.updatedAt || '');
              return !isNaN(d.getTime()) && d >= startOfMonth;
            }
            if (leadsDateFilter === 'CUSTOM') {
              return leadDate >= leadsCustomStart && leadDate <= leadsCustomEnd;
            }
            return true;
          });

          const totalLeadsCount = filteredLeadsByDate.length;
          const freshLeadsCount = filteredLeadsByDate.filter((l) => l.callCount === 0).length;
          const pipelineLeadsCount = filteredLeadsByDate.filter((l) => l.callCount > 0 && l.status !== 'CONVERTED').length;
          const convertedLeadsCount = filteredLeadsByDate.filter((l) => l.status === 'CONVERTED').length;

          const handleAutoDistribute = async () => {
            setIsDistributing(true);
            try {
              await autoDistributeFreshLeads();
            } finally {
              setIsDistributing(false);
            }
          };

          return (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">Lead Inventory</h2>
                  <p className="text-xs text-slate-500 font-medium">Pipeline distribution, day-wise audits & allocations</p>
                </div>
                <button
                  onClick={() => setIsExcelUploadModalOpen(true)}
                  className="flex items-center gap-1.5 bg-[#00C9A7] text-[#0A2540] font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-[#00C9A7]/25 active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Upload Batch</span>
                </button>
              </div>

              {/* Day-Wise Filter Bar */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 overflow-x-auto p-0.5">
                    {(['ALL', 'TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'CUSTOM'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setLeadsDateFilter(mode)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-tight whitespace-nowrap transition-all ${
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
                  <span className="text-[10px] font-mono text-slate-400 font-bold whitespace-nowrap">
                    {totalLeadsCount} records
                  </span>
                </div>

                {leadsDateFilter === 'CUSTOM' && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-xs text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-[11px]">Range:</span>
                    <input
                      type="date"
                      value={leadsCustomStart}
                      onChange={(e) => setLeadsCustomStart(e.target.value)}
                      className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                    <span>to</span>
                    <input
                      type="date"
                      value={leadsCustomEnd}
                      onChange={(e) => setLeadsCustomEnd(e.target.value)}
                      className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>

              {/* 4-Stat Lead Inventory Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Leads</span>
                  <span className="font-mono-nums font-black text-lg text-[#0A2540] block leading-tight mt-0.5">
                    {totalLeadsCount}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium block mt-0.5">In database</span>
                </div>

                <div className="bg-white border border-teal-200/80 rounded-2xl p-2.5 shadow-2xs bg-gradient-to-br from-teal-50/40 to-white">
                  <span className="text-[9px] font-bold text-[#00A88B] uppercase tracking-wider block">Fresh Uncalled</span>
                  <span className="font-mono-nums font-black text-lg text-[#00A88B] block leading-tight mt-0.5">
                    {freshLeadsCount}
                  </span>
                  <span className="text-[9px] text-[#00A88B] font-medium block mt-0.5">Ready to dial</span>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs">
                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block">In Pipeline</span>
                  <span className="font-mono-nums font-black text-lg text-amber-700 block leading-tight mt-0.5">
                    {pipelineLeadsCount}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium block mt-0.5">Connected / Warm</span>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">Won Deals</span>
                  <span className="font-mono-nums font-black text-lg text-emerald-700 block leading-tight mt-0.5">
                    {convertedLeadsCount}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium block mt-0.5">Closed deals</span>
                </div>
              </div>

              {/* Employee Holding Breakdown */}
              <SectionTitle>Employee Lead Allocations</SectionTitle>
              {!telecallerMembers.length ? (
                <Empty text="No telecaller employees found." />
              ) : (
                <div className="space-y-2">
                  {telecallerMembers.map((m) => {
                    const mine = filteredLeadsByDate.filter((l) => l.assignedToEmployeeId === m.id);
                    const calledCount = mine.filter((l) => l.callCount > 0).length;
                    const convertedCount = mine.filter((l) => l.status === 'CONVERTED').length;
                    const calledPct = mine.length > 0 ? Math.round((calledCount / mine.length) * 100) : 0;

                    return (
                      <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#0A2540] block truncate">{m.name}</span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {calledCount} called · {convertedCount} converted · {mine.length - calledCount} fresh
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="font-mono-nums font-black text-lg text-[#0A2540] block leading-tight">
                              {mine.length}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">leads held</span>
                          </div>
                        </div>

                        {/* Progress Bar: Called vs Total */}
                        <div className="space-y-1">
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-[#00C9A7] to-teal-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${calledPct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] font-mono text-slate-400">
                            <span>{calledPct}% dialed</span>
                            <span>{mine.length - calledCount} uncalled</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <SectionTitle>Move leads</SectionTitle>
              <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
                <select
                  value={moveFrom}
                  onChange={(e) => setMoveFrom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                >
                  <option value="">From — choose employee or pool</option>
                  {(() => {
                    const unassignedCount = assignedLeads.filter(
                      (l) =>
                        !l.assignedToEmployeeId ||
                        l.assignedToEmployeeId === 'unassigned' ||
                        l.assignedToEmployeeId === '' ||
                        (l.assignedToEmployeeName && l.assignedToEmployeeName.toLowerCase() === 'unassigned')
                    ).length;
                    return unassignedCount > 0 ? (
                      <option value="UNASSIGNED">
                        ⚡ Unassigned Leads Pool ({unassignedCount} leads available)
                      </option>
                    ) : null;
                  })()}
                  {telecallerMembers
                    .filter((m) =>
                      assignedLeads.some(
                        (l) =>
                          l.assignedToEmployeeId === m.id ||
                          (l.assignedToEmployeeName &&
                            l.assignedToEmployeeName.toLowerCase() === m.name.toLowerCase())
                      )
                    )
                    .map((m) => {
                      const count = assignedLeads.filter(
                        (l) =>
                          l.assignedToEmployeeId === m.id ||
                          (l.assignedToEmployeeName &&
                            l.assignedToEmployeeName.toLowerCase() === m.name.toLowerCase())
                      ).length;
                      return (
                        <option key={m.id} value={m.id}>
                          {m.name} ({count} leads)
                        </option>
                      );
                    })}
                </select>
                <select
                  value={moveTo}
                  onChange={(e) => setMoveTo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                >
                  <option value="">To — choose employee</option>
                  {telecallerMembers
                    .filter((m) => (moveFrom === 'UNASSIGNED' || m.id !== moveFrom) && m.active !== 0)
                    .map((m) => {
                      const count = assignedLeads.filter(
                        (l) =>
                          l.assignedToEmployeeId === m.id ||
                          (l.assignedToEmployeeName &&
                            l.assignedToEmployeeName.toLowerCase() === m.name.toLowerCase())
                      ).length;
                      return (
                        <option key={m.id} value={m.id}>
                          {m.name} ({count} leads held)
                        </option>
                      );
                    })}
                </select>
                <button
                  onClick={async () => {
                    await reassignLeadsBetween(moveFrom, moveTo);
                    setMoveFrom('');
                    setMoveTo('');
                  }}
                  disabled={!moveFrom || !moveTo}
                  className="w-full bg-[#0A2540] disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs py-2.5 rounded-xl active:scale-95 transition-all cursor-pointer"
                >
                  Move leads
                </button>
              </div>

              <SectionTitle>Recent uploads</SectionTitle>
              {!leadBatches.length ? (
                <Empty text="No lead files uploaded yet." />
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                  {leadBatches.map((b) => (
                    <div key={b.id} className="p-3">
                      <span className="text-xs font-bold text-[#0A2540] block truncate">{b.fileName}</span>
                      <span className="text-[10px] text-slate-500">
                        {b.totalLeads} leads → {b.assignedToEmployeeName} · {b.uploadedAt}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* -------------------------------------------------------- More */}
        {tab === 'more' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">
                Control Hub
              </h2>
              <p className="text-xs text-slate-500 font-medium">System operations, approvals & configuration</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Revenue & Won Deals Option */}
              <div
                onClick={() => setTab('revenue')}
                className="bg-white border border-slate-200/90 hover:border-emerald-400 rounded-2xl p-4 shadow-2xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#0A2540] group-hover:text-emerald-700 transition-colors">
                        Revenue & Won Deals
                      </h4>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                        Financials
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">Sales leaderboard, won deals & deal values</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
              </div>

              {/* Invoices & Billing Ledger Option */}
              <div
                onClick={() => setTab('invoices')}
                className="bg-white border border-slate-200/90 hover:border-teal-400 rounded-2xl p-4 shadow-2xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#00A88B] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#0A2540] group-hover:text-[#00A88B] transition-colors">
                        Invoices & Billing Ledger
                      </h4>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-mono">
                        Tax Invoices
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">Commercial client tax invoices, email dispatch & history</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-teal-600 transition-colors" />
              </div>

              {/* Approvals Option */}
              <div
                onClick={() => setTab('approvals')}
                className="bg-white border border-slate-200/90 hover:border-amber-400 rounded-2xl p-4 shadow-2xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#0A2540] group-hover:text-amber-700 transition-colors">
                        Approvals & Audits
                      </h4>
                      {totalApprovalsWaiting > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-black text-[10px]">
                          {totalApprovalsWaiting} Pending
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">Review deal payments & leave requests</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-amber-600 transition-colors" />
              </div>

              {/* Schedule Universal Meeting Option */}
              <div
                onClick={() => setIsScheduleMeetingOpen(true)}
                className="bg-white border border-slate-200/90 hover:border-teal-400 rounded-2xl p-4 shadow-2xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#00A88B] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#0A2540] group-hover:text-[#00A88B] transition-colors">
                        Schedule Company Meeting
                      </h4>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-mono">
                        Universal
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">Create meetings for everyone, specific squads, or 1-on-1s</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#00C9A7] transition-colors" />
              </div>

              {/* Target Settings Option */}
              <div
                onClick={() => setIsTargetModalOpen(true)}
                className="bg-white border border-slate-200/90 hover:border-teal-400 rounded-2xl p-4 shadow-2xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#00A88B] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#0A2540] group-hover:text-[#00A88B] transition-colors">
                      Sales Target Management
                    </h4>
                    <span className="text-xs text-slate-500">Set monthly company quotas & employee targets</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#00C9A7] transition-colors" />
              </div>

              {/* Reports Option */}
              <div
                onClick={() => setTab('reports')}
                className="bg-white border border-slate-200/90 hover:border-[#00C9A7] rounded-2xl p-4 shadow-2xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#00A88B] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#0A2540] group-hover:text-[#00A88B] transition-colors">
                      Executive CSV Reports
                    </h4>
                    <span className="text-xs text-slate-500">8 company data extracts (Sales, Calls, Staff)</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#00C9A7] transition-colors" />
              </div>

              {/* Geofence & Office Location */}
              <div
                onClick={() => setShowOfficeEditor(true)}
                className="bg-white border border-slate-200/90 hover:border-sky-400 rounded-2xl p-4 shadow-2xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-[#0A2540] group-hover:text-sky-600 transition-colors truncate">
                        Geofence & Location
                      </h4>
                      {office?.radiusMeters && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {office.radiusMeters}m Active
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 truncate block mt-0.5">
                      {office?.label ? `${office.label} • Strict perimeter` : 'Office coordinates & punch-in boundary'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInAppLiveMap(true);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#00A88B] bg-[#E6FAF6] hover:bg-[#00C9A7] hover:text-[#0A2540] px-3 py-1.5 rounded-xl border border-[#00C9A7]/40 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                    title="Open live point location on full in-app map"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Open Map in App</span>
                  </button>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-sky-600 transition-colors" />
                </div>
              </div>

              {/* Lead Import Modal */}
              <div
                onClick={() => setIsExcelUploadModalOpen(true)}
                className="bg-white border border-slate-200/90 hover:border-indigo-400 rounded-2xl p-4 shadow-2xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#0A2540] group-hover:text-indigo-600 transition-colors">
                      Import Lead Batches
                    </h4>
                    <span className="text-xs text-slate-500">Upload Excel/CSV client contacts</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </div>

              {/* Create Team Squad */}
              <div
                onClick={() => setIsCreateTeamOpen(true)}
                className="bg-white border border-slate-200/90 hover:border-purple-400 rounded-2xl p-4 shadow-2xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#0A2540] group-hover:text-purple-600 transition-colors">
                      Manage Team Squads
                    </h4>
                    <span className="text-xs text-slate-500">Create squad & assign team leaders</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-purple-600 transition-colors" />
              </div>

              {/* Attendance Photo Audit */}
              <div
                onClick={() => setTab('attendance_verification')}
                className="bg-white border border-slate-200/90 hover:border-blue-400 rounded-2xl p-4 shadow-2xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#0A2540] group-hover:text-blue-600 transition-colors">
                        Attendance Photo Audit
                      </h4>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">Audit</span>
                    </div>
                    <span className="text-xs text-slate-500">Review punch-in photos & flag suspicious attendance</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
              </div>

              {/* Manage Employees (KYC, Bank Details, PAN & Aadhaar Files) */}
              <div
                onClick={() => setTab('manage_employees')}
                className="bg-white border border-slate-200/90 hover:border-emerald-500 rounded-2xl p-4 shadow-2xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#0A2540] group-hover:text-emerald-600 transition-colors">
                        Manage Employees
                      </h4>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">KYC &amp; Bank</span>
                    </div>
                    <span className="text-xs text-slate-500">Inspect &amp; edit employee details, download PAN, Aadhaar &amp; photos</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
              </div>

              {/* Company Calendar & Holiday Configuration */}
              <div
                onClick={() => setShowCalendarConfig((v) => !v)}
                className={`bg-white border rounded-2xl p-4 shadow-2xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all group ${
                  showCalendarConfig
                    ? 'border-[#00C9A7] ring-2 ring-[#00C9A7]/20 bg-[#E6FAF6]/30'
                    : 'border-slate-200/90 hover:border-[#00C9A7]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform ${
                    showCalendarConfig ? 'bg-[#00C9A7] text-[#0A2540]' : 'bg-teal-50 text-[#00A88B]'
                  }`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#0A2540] group-hover:text-[#00A88B] transition-colors">
                        Company Calendar & Holidays
                      </h4>
                      {showCalendarConfig && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#00C9A7]/20 text-[#00A88B] font-mono">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">Weekly off schedule, official holidays &amp; shift timings</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTab('company_calendar');
                    }}
                    title="Open in Full Page Mode"
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className={`w-5 h-5 text-slate-300 group-hover:text-[#00C9A7] transition-transform ${showCalendarConfig ? 'rotate-90 text-[#00C9A7]' : ''}`} />
                </div>
              </div>

              {/* Inline Full-Width Expansion spanning all desktop/tablet columns */}
              {showCalendarConfig && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3 col-span-full w-full animate-in fade-in duration-200 pt-1">
                  <AdminCalendarConfig 
                    initialTab={calendarInitialTab}
                    onClose={() => setShowCalendarConfig(false)}
                    onExpandFull={() => {
                      setShowCalendarConfig(false);
                      setTab('company_calendar');
                    }}
                  />
                </div>
              )}
            </div>

            {/* ---- Logout Button ---- */}
            <button
              onClick={() => logout()}
              className="w-full mt-4 mb-8 flex items-center justify-center gap-2.5 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-400 text-red-600 hover:text-red-700 rounded-2xl p-4 font-bold text-sm transition-all active:scale-[0.98] cursor-pointer group shadow-xs"
            >
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Logout</span>
            </button>

          </div>
        )}

        {/* --------------------------------------------------- Company Calendar & Shift Setup Full View */}
        {tab === 'company_calendar' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <button
              onClick={() => setTab('more')}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#0A2540] transition-colors mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Control Hub</span>
            </button>

            <AdminCalendarConfig 
              initialTab={calendarInitialTab}
              isFullPage={true}
              onClose={() => setTab('more')}
            />
          </div>
        )}

        {/* --------------------------------------------------- Invoices & Billing */}
        {tab === 'invoices' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <button
              onClick={() => setTab('more')}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#0A2540] transition-colors mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Control Hub</span>
            </button>

            <InvoicesLedger
              panelTitle="Admin Commercial Invoices & Billing"
              panelSubtitle="Create, dispatch to customer email, and audit commercial tax invoices"
            />
          </div>
        )}

        {/* --------------------------------------------------- Approvals */}
        {tab === 'approvals' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <button
              onClick={() => setTab('more')}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#0A2540] transition-colors mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to More</span>
            </button>

            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">Approvals Hub</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {totalApprovalsWaiting} item{totalApprovalsWaiting === 1 ? '' : 's'} waiting for your sign-off
                </p>
              </div>
            </div>

            {/* Sub-tab Pill Switcher */}
            <div className="flex p-1 bg-slate-200/80 rounded-2xl">
              <button
                type="button"
                onClick={() => setApprovalSubTab('PAYMENTS')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  approvalSubTab === 'PAYMENTS'
                    ? 'bg-white text-[#0A2540] shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Deal Payments</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                  pendingPayments.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {pendingPayments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setApprovalSubTab('LEAVES')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  approvalSubTab === 'LEAVES'
                    ? 'bg-white text-[#0A2540] shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Leave Escalations</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                  pendingLeavesCount > 0
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {pendingLeavesCount}
                </span>
              </button>
            </div>

            {/* Subtab 1: PAYMENTS */}
            {approvalSubTab === 'PAYMENTS' && (
              <div className="space-y-3">
                {!pendingPayments.length ? (
                  <Empty text="Nothing waiting. Every deal payment has been verified." />
                ) : (
                  <div className="space-y-3">
                    {pendingPayments.map((p) => (
                      <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs hover:border-slate-300 transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="font-mono-nums font-black text-2xl text-[#0A2540] block tracking-tight">
                              {inr(p.dealAmount)}
                            </span>
                            <span className="text-sm font-bold text-slate-800 block mt-0.5">{p.companyName}</span>
                            <span className="text-xs text-slate-500 block mt-0.5">
                              Closed by <strong className="text-slate-700">{p.telecallerName || 'Employee'}</strong> · {p.paymentMode}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                            PENDING AUDIT
                          </span>
                        </div>

                        {/* Customer Banking / UPI Remittance Details */}
                        {(p.customerName || p.customerAccountNumber || p.customerUpiId) && (
                          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 text-xs space-y-1">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                              Customer Remittance Details
                            </span>
                            <div className="font-mono text-[11px] text-slate-800 space-y-0.5">
                              {p.customerName && (
                                <div>Customer: <strong className="text-slate-900">{p.customerName}</strong></div>
                              )}
                              {p.customerAccountNumber ? (
                                <div className="text-slate-700">
                                  Bank: <strong>{p.customerBankName || 'Bank'}</strong> · A/C: <strong className="text-[#0A2540]">{p.customerAccountNumber}</strong> · IFSC: <strong className="text-[#0A2540]">{p.customerIfscCode}</strong>
                                </div>
                              ) : p.customerUpiId ? (
                                <div className="text-slate-700">
                                  UPI ID: <strong className="text-emerald-700">{p.customerUpiId}</strong>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )}

                        {/* UTR & Proof trigger */}
                        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                          <span className="font-mono text-slate-500 text-[11px] truncate">
                            UTR: <strong className="text-slate-700">{p.utrNumber || 'N/A'}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => setInspectingPayment(p)}
                            className="text-[11px] font-bold text-[#00A88B] hover:text-[#0A2540] flex items-center gap-1 active:scale-95 transition-all cursor-pointer flex-shrink-0"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Inspect Proof Slip</span>
                          </button>
                        </div>

                        {/* 1-Click Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => {
                              verifyPayment(p.id, 'VERIFIED');
                              triggerToast(`✓ Payment of ${inr(p.dealAmount)} approved & credited to ${p.telecallerName || 'Employee'}`);
                            }}
                            className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve & Credit</span>
                          </button>
                          <button
                            onClick={() => {
                              verifyPayment(p.id, 'REJECTED');
                              triggerToast(`✗ Payment from ${p.companyName} rejected/flagged`);
                            }}
                            className="py-2.5 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject / Flag</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Subtab 2: LEAVES */}
            {approvalSubTab === 'LEAVES' && (
              <div className="space-y-3">
                {pendingLeavesCount === 0 ? (
                  <Empty text="No leave escalations waiting. All staff requests are cleared." />
                ) : (
                  <div className="space-y-3">
                    {leaveRequests
                      .filter((l) => l.status === 'PENDING' && l.approvalStage === 'PENDING_ADMIN')
                      .map((l) => (
                        <div key={l.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs hover:border-slate-300 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-[#0A2540]">{l.employeeName}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200/60">
                                  {l.leaveType}
                                </span>
                              </div>
                              <span className="text-xs text-slate-600 block mt-1">
                                <strong>{l.totalDays} day{l.totalDays === 1 ? '' : 's'}</strong> ({l.fromDate} → {l.toDate})
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                              PENDING
                            </span>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[11px] text-slate-600 italic block">
                              "{l.reason}"
                            </span>
                          </div>

                          {/* 1-Click Action Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              onClick={() => {
                                approveLeaveRequest(l.id);
                                triggerToast(`✓ Approved leave for ${l.employeeName}`);
                              }}
                              className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Approve Leave</span>
                            </button>
                            <button
                              onClick={() => {
                                rejectLeaveRequest(l.id, 'Rejected by Admin');
                                triggerToast(`✗ Rejected leave request for ${l.employeeName}`);
                              }}
                              className="py-2.5 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Already Decided Log */}
            <SectionTitle>Already decided</SectionTitle>
            {approvalSubTab === 'PAYMENTS' ? (
              paymentVerifications.filter((p) => p.status !== 'PENDING_HR_AUDIT').length === 0 ? (
                <Empty text="No payment decisions recorded yet." />
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-2xs">
                  {paymentVerifications
                    .filter((p) => p.status !== 'PENDING_HR_AUDIT')
                    .map((p) => (
                      <div key={p.id} className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-[#0A2540] block truncate">
                            {inr(p.dealAmount)} · {p.companyName}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {p.telecallerName || 'Employee'} · UTR {p.utrNumber}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded flex-shrink-0 ${
                            p.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    ))}
                </div>
              )
            ) : (
              leaveRequests.filter((l) => l.status !== 'PENDING').length === 0 ? (
                <Empty text="No leave decisions recorded yet." />
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-2xs">
                  {leaveRequests
                    .filter((l) => l.status !== 'PENDING')
                    .map((l) => (
                      <div key={l.id} className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-[#0A2540] block truncate">
                            {l.employeeName} · {l.leaveType} ({l.totalDays}d)
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {l.fromDate} to {l.toDate}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded flex-shrink-0 ${
                            l.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {l.status}
                        </span>
                      </div>
                    ))}
                </div>
              )
            )}
          </div>
        )}

        {/* ---------------------------------------------------- Revenue & Won Deals */}
        {tab === 'revenue' && (() => {
          const verifiedPayments = uniquePayments.filter((p) => p.status === 'VERIFIED');
          const pendingPaymentsList = uniquePayments.filter((p) => p.status === 'PENDING_HR_AUDIT');
          const totalVerifiedRevenue = verifiedPayments.reduce((sum, p) => sum + (p.dealAmount || 0), 0);
          const totalPendingRevenue = pendingPaymentsList.reduce((sum, p) => sum + (p.dealAmount || 0), 0);
          const teamSalesTotal = teamMembers.reduce((sum, m) => sum + (m.salesAchieved || 0), 0);
          const convertedLeadsRevenue = (assignedLeads || []).filter((l) => l.status === 'CONVERTED' || (l.dealValue && l.dealValue > 0)).reduce((sum, l) => sum + (l.dealValue || 0), 0);
          const effectiveTotalRevenue = Math.max(totalVerifiedRevenue, teamSalesTotal, convertedLeadsRevenue);
          const convertedLeadsCount = assignedLeads.filter((l) => l.status === 'CONVERTED').length;
          const totalWonDeals = Math.max(verifiedPayments.length, convertedLeadsCount);
          const avgDealValue = totalWonDeals > 0 ? Math.round(effectiveTotalRevenue / totalWonDeals) : 0;

          // Build Leaderboard (excluding Admin & HR)
          const leaderboard = teamMembers
            .filter((m) => m.portal !== 'admin' && m.empCode !== 'TNX-AD01' && !(m.role || '').toLowerCase().includes('admin') && m.portal !== 'hr' && !(m.role || '').toLowerCase().includes('hr'))
            .map((m) => {
              const mNameLower = m.name.toLowerCase();
              const repPayments = paymentVerifications.filter(
                (p) => (p.telecallerName || '').toLowerCase() === mNameLower
              );
              const repVerifiedPayments = repPayments.filter((p) => p.status === 'VERIFIED');
              const repConvertedLeads = assignedLeads.filter(
                (l) =>
                  l.status === 'CONVERTED' &&
                  (l.assignedToEmployeeId === m.id ||
                    (l.assignedToEmployeeName && l.assignedToEmployeeName.toLowerCase() === mNameLower))
              );

              const dealsCount = Math.max(repVerifiedPayments.length, repConvertedLeads.length);
              const paymentsRevenue = repVerifiedPayments.reduce((sum, p) => sum + (p.dealAmount || 0), 0);
              const leadsRevenue = repConvertedLeads.reduce((sum, l) => sum + (l.dealValue || 0), 0);
              const salesAchieved = Math.max(m.salesAchieved || 0, paymentsRevenue, leadsRevenue);
              const target = m.salesTarget || 500000;
              const targetPercent = Math.min(100, Math.round((salesAchieved / Math.max(1, target)) * 100));

              return {
                member: m,
                dials: m.dialsToday || 0,
                deals: dealsCount,
                revenue: salesAchieved,
                target,
                targetPercent,
                conversionRate: m.conversionRate || (m.dialsToday > 0 ? Math.round((dealsCount / m.dialsToday) * 100) : 0),
              };
            })
            .sort((a, b) => b.revenue - a.revenue);

          const topCloser = leaderboard.length > 0 && leaderboard[0].revenue > 0 ? leaderboard[0] : null;

          return (
            <div className="space-y-4 animate-in fade-in duration-150">
              <button
                onClick={() => setTab('more')}
                className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#0A2540] transition-colors mb-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to More</span>
              </button>

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">Revenue & Won Deals</h2>
                  <p className="text-xs text-slate-500 font-medium">Sales leaderboard, closed deals & revenue tracking</p>
                </div>
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Total Revenue</span>
                  <span className="font-display font-black text-lg text-[#00A88B] block mt-0.5">{inr(effectiveTotalRevenue)}</span>
                  <span className="text-[9px] text-slate-400 block truncate">{totalWonDeals} deals closed</span>
                </div>
                <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Won Deals</span>
                  <span className="font-display font-black text-lg text-purple-700 block mt-0.5">{totalWonDeals}</span>
                  <span className="text-[9px] text-slate-400 block truncate">Avg {inr(avgDealValue)}</span>
                </div>
                <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Top Closer</span>
                  <span className="font-display font-black text-sm text-[#0A2540] block truncate mt-0.5">{topCloser ? topCloser.member.name : '—'}</span>
                  <span className="text-[9px] text-emerald-600 font-bold block truncate">{topCloser ? inr(topCloser.revenue) : 'No deals'}</span>
                </div>
                <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Pending Audit</span>
                  <span className="font-display font-black text-sm text-amber-600 block mt-0.5">{inr(totalPendingRevenue)}</span>
                  <span className="text-[9px] text-slate-400 block truncate">{pendingPaymentsList.length} deals waiting</span>
                </div>
              </div>

              {/* Sales Rep Leaderboard */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-xs text-[#0A2540] uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>Employee Leaderboard</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Ranked by revenue</span>
                </div>

                <div className="space-y-2">
                  {leaderboard.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">
                      No active sales employees on the leaderboard yet.
                    </div>
                  ) : (
                    leaderboard.map((entry, idx) => (
                    <div
                      key={entry.member.id}
                      onClick={() => setSelectedMemberFor360(entry.member)}
                      className="p-3 bg-slate-50/80 hover:bg-slate-100/80 rounded-xl border border-slate-200/60 transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            idx === 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            idx === 1 ? 'bg-slate-200 text-slate-800' :
                            idx === 2 ? 'bg-orange-100 text-orange-900' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            #{idx + 1}
                          </span>
                          <strong className="text-xs font-bold text-[#0A2540]">{entry.member.name}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">({entry.member.group})</span>
                        </div>
                        <span className="font-mono font-black text-xs text-[#00A88B]">
                          {inr(entry.revenue)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>📞 {entry.dials} Dials</span>
                        <span>🏆 {entry.deals} Deals</span>
                        <span>🎯 {entry.targetPercent}% of target</span>
                        <span className="text-teal-600 font-bold">Inspect 360 →</span>
                      </div>
                    </div>
                  )))}
                </div>
              </div>

              {/* Master Won Deals Ledger */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-xs text-[#0A2540] uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-[#00A88B]" />
                    <span>Won Deals Ledger ({uniquePayments.length})</span>
                  </h3>
                </div>

                {uniquePayments.length === 0 ? (
                  <Empty text="No deals logged yet." />
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {uniquePayments.map((p) => (
                      <div key={p.id} className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <strong className="text-xs font-bold text-[#0A2540] block">{p.companyName}</strong>
                            <span className="text-[11px] text-slate-500">Contact: {p.leadName} • Closed by: {p.telecallerName}</span>
                          </div>
                          <span className="font-mono font-black text-xs text-[#00A88B]">
                            {inr(p.dealAmount)}
                          </span>
                        </div>

                        {/* Customer Banking / UPI Info */}
                        {(p.customerName || p.customerAccountNumber || p.customerUpiId) && (
                          <div className="bg-white/80 p-2 rounded-lg border border-slate-200/60 text-[11px] font-mono text-slate-700">
                            {p.customerName && <div className="font-bold text-slate-900">Cust: {p.customerName}</div>}
                            {p.customerAccountNumber ? (
                              <div>{p.customerBankName || 'Bank'} A/C: {p.customerAccountNumber} · IFSC: {p.customerIfscCode}</div>
                            ) : p.customerUpiId ? (
                              <div className="text-emerald-700 font-semibold">UPI: {p.customerUpiId}</div>
                            ) : null}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-200/60">
                          <span>UTR: {p.utrNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                            p.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                            p.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ---------------------------------------------------- Reports */}
        {/* --------------------------------------------------- Attendance Verification */}
        {tab === 'attendance_verification' && (() => {
          const todayIso = getTodayDateIST();
          const yesterdayIso = new Date(new Date(todayIso + 'T12:00:00+05:30').getTime() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
          const currentMonthIso = todayIso.slice(0, 7);

          const verifyRecords = attendanceLogs.filter((r) => {
            let matchDate = true;
            if (verifyDateMode === 'TODAY') {
              matchDate = r.date === todayIso;
            } else if (verifyDateMode === 'YESTERDAY') {
              matchDate = r.date === yesterdayIso;
            } else if (verifyDateMode === 'THIS_MONTH') {
              matchDate = (r.date || '').startsWith(currentMonthIso);
            } else if (verifyDateMode === 'SPECIFIC') {
              matchDate = r.date === verifySelectedDate;
            } else if (verifyDateMode === 'CUSTOM') {
              const start = customStartDate || todayIso;
              const end = customEndDate || todayIso;
              matchDate = (r.date || '') >= start && (r.date || '') <= end;
            } else if (verifyDateMode === 'ALL') {
              matchDate = true;
            }

            const matchStatus =
              verifyStatusFilter === 'ALL'
                ? true
                : verifyStatusFilter === 'PRESENT'
                ? r.status === 'PRESENT' && !r.disputedByAdmin
                : verifyStatusFilter === 'LATE'
                ? (r.status as string) === 'LATE'
                : verifyStatusFilter === 'DISPUTED'
                ? !!r.disputedByAdmin
                : true;

            const q = verifySearchQuery.toLowerCase();
            const matchSearch =
              !q ||
              (r.employeeName || '').toLowerCase().includes(q) ||
              (r.employeeId || '').toLowerCase().includes(q);

            return matchDate && matchStatus && matchSearch;
          });

          // Compute stats for current date filter
          const dateFilteredLogs = attendanceLogs.filter((r) => {
            if (verifyDateMode === 'TODAY') return r.date === todayIso;
            if (verifyDateMode === 'YESTERDAY') return r.date === yesterdayIso;
            if (verifyDateMode === 'THIS_MONTH') return (r.date || '').startsWith(currentMonthIso);
            if (verifyDateMode === 'SPECIFIC') return r.date === verifySelectedDate;
            if (verifyDateMode === 'CUSTOM') {
              const start = customStartDate || todayIso;
              const end = customEndDate || todayIso;
              return (r.date || '') >= start && (r.date || '') <= end;
            }
            return true;
          });

          const presentCount = dateFilteredLogs.filter(r => r.status === 'PRESENT' && !r.disputedByAdmin).length;
          const flaggedCount = dateFilteredLogs.filter(r => r.disputedByAdmin).length;
          const punchedOutCount = dateFilteredLogs.filter(r => !!r.checkOut || !!r.checkOutPhoto).length;
          const noPhotoCount = dateFilteredLogs.filter(r => r.status === 'PRESENT' && !r.checkInPhoto && !r.checkOutPhoto).length;

          return (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setTab('more')}
                    className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="font-display font-black text-xl text-[#0A2540] tracking-tight">Attendance Photo Audit</h2>
                    <p className="text-[11px] text-slate-500">Punch-in & punch-out selfies, timings & GPS coordinates</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRefreshingLogs(true);
                      refreshResources(['attendanceLogs']).finally(() => setIsRefreshingLogs(false));
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                    title="Refresh latest attendance logs"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin text-[#00A88B]' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Date Filters Bar */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[#0A2540] uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#00A88B]" />
                    Date Filter
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Showing: {verifyRecords.length} record{verifyRecords.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Date Mode Selector Pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: 'TODAY', label: 'Today' },
                    { id: 'YESTERDAY', label: 'Yesterday' },
                    { id: 'THIS_MONTH', label: 'This Month' },
                    { id: 'SPECIFIC', label: 'Specific Day' },
                    { id: 'CUSTOM', label: 'Custom Range' },
                    { id: 'ALL', label: 'All Dates' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setVerifyDateMode(m.id as any)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        verifyDateMode === m.id
                          ? 'bg-[#00A88B] text-white shadow-2xs font-black'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Sub Date Inputs */}
                {verifyDateMode === 'SPECIFIC' && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Choose Date:</span>
                    <input
                      type="date"
                      value={verifySelectedDate}
                      onChange={(e) => setVerifySelectedDate(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-[#0A2540] bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00A88B]/30 focus:border-[#00A88B]"
                    />
                  </div>
                )}

                {verifyDateMode === 'CUSTOM' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">From Date</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-[#0A2540] bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00A88B]/30 focus:border-[#00A88B]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">To Date</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-[#0A2540] bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00A88B]/30 focus:border-[#00A88B]"
                      />
                    </div>
                  </div>
                )}

                {/* Search & Status Filters */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search employee by name or ID…"
                      value={verifySearchQuery}
                      onChange={(e) => setVerifySearchQuery(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00A88B]/30 focus:border-[#00A88B]"
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                    {(['ALL', 'PRESENT', 'LATE', 'DISPUTED'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setVerifyStatusFilter(f)}
                        className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold transition-all cursor-pointer ${
                          verifyStatusFilter === f
                            ? 'bg-[#0A2540] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {f === 'DISPUTED' ? '🚩 Flagged' : f === 'PRESENT' ? '✓ Present' : f === 'LATE' ? '⏰ Late' : 'All Status'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Present', val: presentCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Punched Out', val: punchedOutCount, color: 'text-teal-600', bg: 'bg-teal-50' },
                  { label: 'Flagged', val: flaggedCount, color: 'text-rose-600', bg: 'bg-rose-50' },
                  { label: 'No Photo', val: noPhotoCount, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((s) => (
                  <div key={s.label} className={`${s.bg} rounded-2xl p-2.5 text-center`}>
                    <div className={`font-black text-lg ${s.color}`}>{s.val}</div>
                    <div className="text-[9.5px] font-bold text-slate-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Photo Cards */}
              {verifyRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-white border border-slate-200/90 rounded-2xl p-6">
                  <Camera className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-bold text-[#0A2540]">No attendance records found</p>
                  <p className="text-xs mt-1 text-slate-400">Try changing date mode or clearing filters</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {verifyRecords.map((rec) => {
                    const member = teamMembers.find(
                      (m) => m.id === rec.employeeId || m.empCode === rec.employeeId
                    );
                    const name = rec.employeeName || member?.name || rec.employeeId || 'Unknown';
                    const isFlagged = rec.disputedByAdmin;
                    return (
                      <div
                        key={rec.id || `${rec.employeeId}-${rec.date}`}
                        className={`bg-white border rounded-2xl p-3.5 shadow-2xs transition-all ${
                          isFlagged ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200/90'
                        }`}
                      >
                        {/* Header: Employee Info, Date, Status & Delete button */}
                        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm text-[#0A2540] truncate">{name}</p>
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                {rec.employeeId}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 flex-wrap">
                              <span className="font-medium flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" /> {rec.date}
                              </span>
                              {rec.workHours && (
                                <span className="bg-teal-50 text-[#00A88B] font-bold px-1.5 py-0.2 rounded border border-teal-200/60">
                                  ⏱️ {rec.workHours}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isFlagged
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : rec.status === 'PRESENT'
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : (rec.status as string) === 'LATE'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {isFlagged ? '🚩 Flagged' : rec.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAttendanceToDelete(rec)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Delete this record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Dual Punch In & Punch Out Grid */}
                        <div className="grid grid-cols-2 gap-2.5 pt-3">
                          {/* PUNCH IN SIDE */}
                          <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/70 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Punch In
                              </span>
                              <span className="text-[11px] font-bold text-[#0A2540] font-mono">
                                {rec.checkIn || '—'}
                              </span>
                            </div>

                            <div
                              className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-200/60 cursor-pointer group mb-1.5"
                              onClick={() => rec.checkInPhoto && setZoomPhotoUrl(rec.checkInPhoto)}
                            >
                              {rec.checkInPhoto ? (
                                <>
                                  <img
                                    src={rec.checkInPhoto}
                                    alt={`${name} punch-in`}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 flex items-center justify-center transition-all">
                                    <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                  <CameraOff className="w-5 h-5 mb-1 opacity-50" />
                                  <span className="text-[9px] font-medium">No In Photo</span>
                                </div>
                              )}
                            </div>

                            <div className="text-[10px] flex items-center justify-between text-slate-500 font-medium">
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                <span className="truncate">
                                  {rec.locationStatus === 'AT_OFFICE' ? 'At Office' : rec.locationStatus === 'AWAY' ? 'Away' : 'No GPS'}
                                </span>
                              </span>
                              {rec.distanceM != null && (
                                <span className="font-mono text-[9px] text-slate-400 flex-shrink-0">
                                  ±{Math.round(rec.distanceM)}m
                                </span>
                              )}
                            </div>
                          </div>

                          {/* PUNCH OUT SIDE */}
                          <div className={`rounded-xl p-2.5 border flex flex-col justify-between ${
                            (rec.punchOutStatus === 'MISSED_PUNCH_OUT' || rec.isAutoClosed)
                              ? 'bg-amber-50/50 border-amber-200'
                              : 'bg-slate-50/80 border-slate-200/70'
                          }`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                (rec.punchOutStatus === 'MISSED_PUNCH_OUT' || rec.isAutoClosed)
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  (rec.punchOutStatus === 'MISSED_PUNCH_OUT' || rec.isAutoClosed)
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}></span>
                                Punch Out
                              </span>
                              <span className={`text-[11px] font-bold font-mono ${
                                (rec.punchOutStatus === 'MISSED_PUNCH_OUT' || rec.isAutoClosed)
                                  ? 'text-amber-800'
                                  : 'text-[#0A2540]'
                              }`}>
                                {rec.checkOut ? rec.checkOut : ((rec.punchOutStatus === 'MISSED_PUNCH_OUT' || rec.isAutoClosed) ? 'Auto-Closed' : 'Active')}
                              </span>
                            </div>

                            <div
                              className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-200/60 cursor-pointer group mb-1.5"
                              onClick={() => rec.checkOutPhoto && setZoomPhotoUrl(rec.checkOutPhoto)}
                            >
                              {rec.checkOutPhoto ? (
                                <>
                                  <img
                                    src={rec.checkOutPhoto}
                                    alt={`${name} punch-out`}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 flex items-center justify-center transition-all">
                                    <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </>
                              ) : (rec.punchOutStatus === 'MISSED_PUNCH_OUT' || rec.isAutoClosed) ? (
                                <div className="w-full h-full flex flex-col items-center justify-center text-amber-700 bg-amber-50/90 border border-amber-200/80 p-2 text-center rounded-lg">
                                  <AlertTriangle className="w-5 h-5 mb-1 text-amber-600 animate-bounce" />
                                  <span className="text-[9px] font-black uppercase tracking-tight text-amber-900 leading-tight">Failed to Punch Out</span>
                                  <span className="text-[8px] text-amber-700 font-medium mt-0.5 leading-tight">Auto-closed at shift end (No Face Scan)</span>
                                </div>
                              ) : rec.checkOut ? (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                  <CameraOff className="w-5 h-5 mb-1 opacity-50" />
                                  <span className="text-[9px] font-medium">No Out Photo</span>
                                </div>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-emerald-600 bg-emerald-50/50">
                                  <Clock className="w-5 h-5 mb-1 animate-pulse" />
                                  <span className="text-[9px] font-bold">On Duty</span>
                                  <span className="text-[8px] text-slate-400">Not Punched Out</span>
                                </div>
                              )}
                            </div>

                            <div className="text-[10px] flex items-center justify-between text-slate-500 font-medium">
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                <span className="truncate">
                                  {(rec.punchOutStatus === 'MISSED_PUNCH_OUT' || rec.isAutoClosed)
                                    ? 'Auto-closed at Shift End'
                                    : rec.checkOutLocationStatus === 'AT_OFFICE'
                                    ? 'At Office'
                                    : rec.checkOutLocationStatus === 'AWAY'
                                    ? 'Away'
                                    : rec.checkOut
                                    ? 'Recorded'
                                    : 'Pending Out'}
                                </span>
                              </span>
                              {rec.checkOutDistanceM != null && (
                                <span className="font-mono text-[9px] text-slate-400 flex-shrink-0">
                                  ±{Math.round(rec.checkOutDistanceM)}m
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Dispute Reason */}
                        {isFlagged && rec.disputeReason && (
                          <p className="mt-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1.5">
                            🚩 {rec.disputeReason}
                          </p>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                          {!isFlagged ? (
                            <>
                              <button
                                onClick={() => {
                                  setSuspiciousModalItem(rec);
                                  setSuspiciousReason('Suspicious face photo / Proxy verification suspected');
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl py-2 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Flag Suspicious
                              </button>
                              <button
                                onClick={() => rec.id && rec.employeeId && verifyAttendanceRecord(rec.id, rec.employeeId)}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl py-2 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Verify OK
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => rec.id && rec.employeeId && verifyAttendanceRecord(rec.id, rec.employeeId)}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl py-2 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Restore as Present
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {tab === 'reports' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <button
              onClick={() => setTab('more')}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#0A2540] transition-colors mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to More</span>
            </button>

            <div>
              <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">Reports</h2>
              <p className="text-xs text-slate-500 font-medium">Download spreadsheet reports directly to your device.</p>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  label: 'Employees Roster',
                  blurb: 'Staff list, role, team and sales stats.',
                  icon: Users,
                  run: () =>
                    downloadCsv(
                      'Employees',
                      'Name,Code,Role,Team,Status,Calls today,Sales',
                      teamMembers.map(
                        (e) => `"${e.name}","${e.empCode}","${e.role}","${e.group}","${e.attendanceStatus}",${e.dialsToday},${e.salesAchieved}`
                      )
                    ),
                },
                {
                  label: 'Attendance Register',
                  blurb: 'Daily punch times and check-in methods.',
                  icon: CalendarCheck,
                  run: () =>
                    downloadCsv(
                      'Attendance',
                      'Name,Team,Status,Check-in,Method',
                      teamMembers.map(
                        (m) => `"${m.name}","${m.group}","${m.attendanceStatus}","${m.checkInTime || ''}","${m.checkInMethod || ''}"`
                      )
                    ),
                },
                {
                  label: 'Calls & Conversions',
                  blurb: 'Dials, connected calls and interested leads.',
                  icon: TrendingUp,
                  run: () =>
                    downloadCsv(
                      'Calls',
                      'Name,Team,Dials,Connected,Interested,Conversion %',
                      teamMembers.map(
                        (m) => `"${m.name}","${m.group}",${m.dialsToday},${m.connected},${m.interested},${m.conversionRate}`
                      )
                    ),
                },
                {
                  label: 'Sales vs Target',
                  blurb: 'Monthly revenue performance per caller.',
                  icon: Wallet,
                  run: () =>
                    downloadCsv(
                      'Sales',
                      'Name,Team,Achieved,Target,Percent',
                      teamMembers.map(
                        (m) => `"${m.name}","${m.group}",${m.salesAchieved},${m.salesTarget},${Math.round((m.salesAchieved / Math.max(1, m.salesTarget)) * 100)}`
                      )
                    ),
                },
                {
                  label: 'Payment Verifications',
                  blurb: 'Full audit history of payment receipts.',
                  icon: CheckCircle2,
                  run: () =>
                    downloadCsv(
                      'Payments',
                      'Company,Lead,Employee,Amount,Mode,UTR,Status',
                      paymentVerifications.map(
                        (p) => `"${p.companyName}","${p.leadName}","${p.telecallerName}",${p.dealAmount},"${p.paymentMode}","${p.utrNumber}","${p.status}"`
                      )
                    ),
                },
                {
                  label: 'Lead Allocation Pipeline',
                  blurb: 'Active leads held by each employee.',
                  icon: FileSpreadsheet,
                  run: () =>
                    downloadCsv(
                      'Lead_Allocation',
                      'Lead,Company,Phone,Assigned to,Status,Calls',
                      assignedLeads.map(
                        (l) => `"${l.name}","${l.company}","${l.phone}","${l.assignedToEmployeeName}","${l.status}",${l.callCount}`
                      )
                    ),
                },
              ].map((r, i) => {
                const Icon = r.icon;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      r.run();
                      triggerToast(`✓ ${r.label} downloaded`);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-left shadow-xs flex items-center justify-between active:scale-[.99] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#00A88B] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-[#0A2540] block">{r.label}</span>
                        <span className="text-[11px] text-slate-500">{r.blurb}</span>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* --------------------------------------------------- Manage Employees */}
        {tab === 'manage_employees' && (
          <ManageEmployeesTab
            teamMembers={teamMembers}
            teamGroups={teamGroups}
            onBack={() => setTab('more')}
            onUpdateEmployee={updateEmployee}
            onDeleteEmployee={deleteEmployee}
            triggerToast={triggerToast}
          />
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex justify-around items-center px-1 py-1.5 z-30 lg:bottom-4 lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-2xl lg:rounded-2xl lg:border lg:shadow-xl lg:px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="flex flex-col items-center justify-center gap-0.5 px-2 py-0.5 rounded-xl transition-all relative cursor-pointer active:scale-95 group flex-1"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                isActive ? 'bg-[#E6FAF6] text-[#00A88B] shadow-2xs' : 'text-slate-400 group-hover:text-slate-600'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[9px] transition-colors leading-tight ${
                isActive ? 'font-black text-[#0A2540]' : 'font-semibold text-slate-400'
              }`}>
                {item.label}
              </span>
              {item.badge ? (
                <span className="absolute top-0.5 right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center shadow-xs animate-bounce">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <ExcelLeadUploadModal />
      <AddEmployeeModal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} />
      <EmployeeRecordModal employee={openEmployee} onClose={() => setOpenEmployee(null)} />
      <CreateTeamModal isOpen={isCreateTeamOpen} onClose={() => setIsCreateTeamOpen(false)} />
      <EditTeamModal isOpen={!!editingTeam} team={editingTeam} onClose={() => setEditingTeam(null)} />
      <DeleteTeamModal isOpen={!!deletingTeam} team={deletingTeam} onClose={() => setDeletingTeam(null)} />
      <ManageTeamMembersModal
        team={managingSquad}
        isOpen={!!managingSquad}
        onClose={() => setManagingSquad(null)}
      />

      {/* Payment Proof Slip Voucher Modal */}
      {inspectingPayment && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
          onClick={() => setInspectingPayment(null)}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 space-y-4 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#00A88B] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0A2540]">Payment Proof Voucher</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Bank Audit Slip</p>
                </div>
              </div>
              <button
                onClick={() => setInspectingPayment(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Digital Slip Body */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/70 rounded-2xl p-4 border border-slate-200/80 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount Paid</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  {inspectingPayment.status}
                </span>
              </div>

              <div className="font-mono-nums font-black text-2xl text-[#0A2540]">
                {inr(inspectingPayment.dealAmount)}
              </div>

              <div className="space-y-2 text-xs pt-1 border-t border-slate-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-400">Client / Payer:</span>
                  <strong className="text-slate-800 text-right">{inspectingPayment.companyName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Closed By:</span>
                  <strong className="text-slate-800">{inspectingPayment.telecallerName || 'Employee'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Channel:</span>
                  <span className="font-mono font-bold text-slate-700">{inspectingPayment.paymentMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bank UTR Ref:</span>
                  <span className="font-mono font-bold text-slate-800">{inspectingPayment.utrNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction Time:</span>
                  <span className="font-mono text-slate-600 text-[11px]">{inspectingPayment.timestamp}</span>
                </div>
              </div>

              {/* Simulated Verification Stamp */}
              <div className="pt-2 flex items-center justify-center">
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 border border-dashed border-slate-300 px-3 py-1 rounded-md">
                  🔒 Electronic Bank Transfer Verified Record
                </span>
              </div>
            </div>

            {/* Action Buttons inside modal */}
            {inspectingPayment.status === 'PENDING_HR_AUDIT' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    verifyPayment(inspectingPayment.id, 'VERIFIED');
                    triggerToast(`✓ Deal payment of ${inr(inspectingPayment.dealAmount)} approved`);
                    setInspectingPayment(null);
                  }}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
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
                  className="py-2.5 rounded-xl bg-white border border-rose-200 text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Target Settings Modal */}
      <AdminTargetSettingsModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
      />

      {/* Admin Executive Schedule Meeting Modal */}
      <AdminScheduleMeetingModal
        isOpen={isScheduleMeetingOpen}
        onClose={() => setIsScheduleMeetingOpen(false)}
      />

      {/* Geofence & Office Location Modal */}
      <GeofenceLocationModal
        isOpen={showOfficeEditor}
        onClose={() => setShowOfficeEditor(false)}
        onSaved={(saved) => setOffice(saved)}
      />

      {/* Dedicated In-App Live Map Viewer Modal */}
      <InAppLiveMapModal
        isOpen={showInAppLiveMap}
        onClose={() => setShowInAppLiveMap(false)}
        office={office}
        onSaved={(saved) => setOffice(saved)}
      />

      {/* Delete Employee Confirmation Modal */}
      {employeeToDelete && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
          onClick={() => setEmployeeToDelete(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-rose-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </div>

            <div>
              {(() => {
                const isLeader = employeeToDelete.portal === 'team_leader' || (employeeToDelete.role || '').toLowerCase().includes('leader');
                const isHr = employeeToDelete.portal === 'hr' || (employeeToDelete.role || '').toLowerCase().includes('hr');
                const roleLabel = isLeader ? 'Team Leader' : isHr ? 'HR Staff' : 'Employee (Telecaller)';

                return (
                  <>
                    <h3 className="font-display font-black text-base text-[#0A2540]">
                      Delete {roleLabel}?
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Are you sure you want to permanently delete <strong className="text-slate-800">{employeeToDelete.name}</strong> (<span className="font-mono text-slate-600">{employeeToDelete.empCode}</span>)?
                    </p>
                  </>
                );
              })()}
            </div>

            <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-3 space-y-1 text-xs text-rose-800">
              <p className="font-bold flex items-center gap-1.5 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
                Permanent removal
              </p>
              <ul className="list-disc list-inside text-[10px] text-rose-700 space-y-0.5 ml-1">
                <li>Credentials & login access will be purged</li>
                <li>Biometrics & attendance records removed</li>
                <li>Leads unassigned for redistributing</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setEmployeeToDelete(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
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
                className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-4 py-2 rounded-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Flag Suspicious Attendance Modal ---- */}
      {suspiciousModalItem && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSuspiciousModalItem(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-rose-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-base text-[#0A2540]">Flag as Suspicious?</h3>
                <p className="text-xs text-slate-500">This will revert attendance to <strong>ABSENT</strong></p>
              </div>
            </div>

            {/* Employee info */}
            <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-200">
              {suspiciousModalItem.checkInPhoto ? (
                <img src={suspiciousModalItem.checkInPhoto} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-200" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <CameraOff className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div>
                <p className="font-bold text-sm text-[#0A2540]">
                  {suspiciousModalItem.employeeName || suspiciousModalItem.employeeId}
                </p>
                <p className="text-[11px] text-slate-500">
                  {suspiciousModalItem.date} · Check-in: {suspiciousModalItem.checkIn || '—'}
                </p>
              </div>
            </div>

            {/* Reason input */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">Reason / Admin Note</label>
              <textarea
                value={suspiciousReason}
                onChange={(e) => setSuspiciousReason(e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 resize-none"
                placeholder="Describe the suspicious activity…"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setSuspiciousModalItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!suspiciousModalItem?.id || !suspiciousModalItem?.employeeId) return;
                  await disputeAttendanceRecord(
                    suspiciousModalItem.id,
                    suspiciousModalItem.employeeId,
                    suspiciousReason
                  );
                  setSuspiciousModalItem(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Confirm & Flag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Zoom Photo Lightbox ---- */}
      {zoomPhotoUrl && (
        <div
          className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setZoomPhotoUrl(null)}
        >
          <button
            onClick={() => setZoomPhotoUrl(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={zoomPhotoUrl}
            alt="Attendance photo"
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-4 left-0 right-0 text-center text-white/50 text-xs">Tap outside to close</p>
        </div>
      )}

      {/* Clear Attendance Records Modal */}
      {isClearAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-[#0A2540]">Clear Attendance Records</h3>
                  <p className="text-xs text-slate-500">Purge concluded or verified audit logs</p>
                </div>
              </div>
              <button
                onClick={() => setIsClearAttendanceModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-700 block">Select Scope to Clear:</label>
              
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="clearScope"
                  checked={clearAttendanceScope === 'SELECTED_DAY'}
                  onChange={() => setClearAttendanceScope('SELECTED_DAY')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-[#0A2540] block">Selected Day ({verifySelectedDate})</span>
                  <span className="text-[11px] text-slate-400">Clear all records for this specific date</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="clearScope"
                  checked={clearAttendanceScope === 'THIS_MONTH'}
                  onChange={() => setClearAttendanceScope('THIS_MONTH')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-[#0A2540] block">Current Month ({new Date().toISOString().slice(0, 7)})</span>
                  <span className="text-[11px] text-slate-400">Clear all records in the ongoing month</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="clearScope"
                  checked={clearAttendanceScope === 'CUSTOM_RANGE'}
                  onChange={() => setClearAttendanceScope('CUSTOM_RANGE')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-[#0A2540] block">Custom Date Range</span>
                  <span className="text-[11px] text-slate-400">Choose start and end dates</span>
                </div>
              </label>

              {clearAttendanceScope === 'CUSTOM_RANGE' && (
                <div className="flex gap-2 pl-7 pt-1">
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">From</span>
                    <input
                      type="date"
                      value={clearCustomStartDate}
                      onChange={(e) => setClearCustomStartDate(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-200 rounded-lg p-2"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">To</span>
                    <input
                      type="date"
                      value={clearCustomEndDate}
                      onChange={(e) => setClearCustomEndDate(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-200 rounded-lg p-2"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50/40 cursor-pointer hover:bg-rose-50 transition-colors">
                <input
                  type="radio"
                  name="clearScope"
                  checked={clearAttendanceScope === 'ALL'}
                  onChange={() => setClearAttendanceScope('ALL')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-rose-800 block">Clear All Records</span>
                  <span className="text-[11px] text-rose-600">Completely purge all attendance logs across all dates</span>
                </div>
              </label>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 font-medium">
                This action will permanently delete the selected attendance records and their photos. This cannot be undone.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearAttendanceModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearingAttendance}
                onClick={handleConfirmClearAttendance}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isClearingAttendance ? <RotateCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Confirm Clear</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Attendance Record Confirmation Modal */}
      {attendanceToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base text-[#0A2540]">Delete Attendance Log</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete attendance record for <span className="font-bold text-slate-700">{attendanceToDelete.employeeName || attendanceToDelete.employeeId}</span> on <span className="font-bold text-slate-700">{attendanceToDelete.date}</span>?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAttendanceToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (attendanceToDelete.id) {
                    await deleteAttendanceRecord(attendanceToDelete.id);
                  }
                  setAttendanceToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
