import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback, useMemo } from 'react';
import { 
  UserRole, 
  AuthStep,
  NavTab, 
  EmployeeProfile, 
  TelecallerStats, 
  CallLogItem, 
  ClientLead, 
  AttendanceRecord, 
  LeaveRequest, 
  PayslipItem,
  CallOutcome,
  TeamMember,
  TeamGroup,
  TeamTask,
  TeamMeeting,
  CandidateInterview,
  OnboardingEmployee,
  ExitEmployee,
  PaymentVerificationItem,
  AssignedLead,
  LeadBatch,
  FaceBiometricProfile,
  OfferLetterData,
  ExperienceCertData,
  RelievingLetterData,
  InvoiceData,
  NewEmployeeInput,
  CompanyHoliday,
  CalendarSettings,
  AuthUser,
} from '../types';
import { api, getStoredAuthUser, setStoredAuthUser, getAuthToken, setAuthToken } from '../services/api';
import { getTodayDateIST, getCurrentTimeIST } from '../utils/dateUtils';
import {
  ALL_RESOURCE_KEYS,
  EMPTY_PROFILE,
  EMPTY_STATS,
  RESOURCE_FETCHERS,
  ResourceKey,
  ResourceStatus,
} from '../data/resources';
import {
  INITIAL_PROFILE,
  INITIAL_TELECALLER_STATS,
  INITIAL_CALL_LOGS,
  INITIAL_CLIENT_LEADS,
  INITIAL_ATTENDANCE_LOGS,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_PAYSLIPS,
  INITIAL_ASSIGNED_LEADS,
  INITIAL_LEAD_BATCHES,
  INITIAL_TEAM_MEMBERS,
  INITIAL_TEAM_GROUPS,
  INITIAL_TEAM_TASKS,
  INITIAL_TEAM_MEETINGS,
  INITIAL_CANDIDATES,
  INITIAL_ONBOARDING,
  INITIAL_EXIT_LIST,
  INITIAL_PAYMENT_VERIFICATIONS,
  INITIAL_OFFER_LETTERS,
  INITIAL_EXPERIENCE_CERTS,
  INITIAL_RELIEVING_LETTERS,
  INITIAL_INVOICES,
  INITIAL_COMPANY_HOLIDAYS,
} from '../data/mockData';
import { isTelecallerOrCallingEmployee, isLeadUnassigned } from '../utils/teamUtils';

interface AppContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  deviceMode: 'mobile' | 'desktop';
  setDeviceMode: (mode: 'mobile' | 'desktop') => void;
  
  profile: EmployeeProfile;
  stats: TelecallerStats;
  callLogs: CallLogItem[];
  clients: ClientLead[];
  attendanceLogs: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  payslips: PayslipItem[];
  
  // Dynamic Lead Management
  assignedLeads: AssignedLead[];
  /** The signed-in employee's own assigned leads, in the shape the pipeline screens expect. */
  myLeads: ClientLead[];
  leadBatches: LeadBatch[];
  importAndAssignLeads: (
    fileName: string, 
    targetEmployeeId: string, 
    targetEmployeeName: string, 
    leads: Array<{ name: string; phone: string; company: string; email?: string; city?: string }>
  ) => void;
  updateAssignedLeadStatus: (
    leadId: string, 
    status: AssignedLead['status'], 
    notes: string, 
    dealValue?: number, 
    followUpDate?: string,
    customerDetails?: {
      customerName?: string;
      customerBankName?: string;
      customerAccountNumber?: string;
      customerIfscCode?: string;
      customerUpiId?: string;
    }
  ) => void;
  activeCallingLead: AssignedLead | null;
  setActiveCallingLead: (lead: AssignedLead | null) => void;
  openCallModalForLead: (lead: AssignedLead) => void;
  clientPipelineTab: 'TO_CALL' | 'CALLBACK' | 'INTERESTED' | 'WON' | 'BUSY' | 'NOT_INTERESTED' | 'ALL';
  setClientPipelineTab: (tab: 'TO_CALL' | 'CALLBACK' | 'INTERESTED' | 'WON' | 'BUSY' | 'NOT_INTERESTED' | 'ALL') => void;

  // Face Recognition Biometric System
  faceProfiles: FaceBiometricProfile[];
  registerFaceBiometric: (employeeId: string, employeeName: string, photoDataUrl: string) => void;
  verifyFaceAttendance: (employeeId?: string) => boolean;


  createNewEmployee: (data: NewEmployeeInput) => void;
  loginEmployee: (emailOrCode: string, passwordInput: string) => { success: boolean; member?: TeamMember; error?: string };
  /** Change an employee's details, role or team. */
  updateEmployee: (id: string, changes: Partial<TeamMember>) => Promise<void>;
  /** Bulk update sales and call targets globally across employees and sync to statistics. */
  batchUpdateTargets: (targets: Array<{ id: string; salesTarget?: number; goalCalls?: number }>) => Promise<{ success: boolean; updatedCount: number; members: TeamMember[] } | void>;
  /** Switch an employee off without deleting their history, or switch them back on. */
  setEmployeeActive: (id: string, active: boolean) => Promise<void>;
  /** Permanently delete an employee and cascade their associated records. */
  deleteEmployee: (id: string) => Promise<void>;

  // Team Leader Module State
  teamMembers: TeamMember[];
  teamGroups: TeamGroup[];
  teamTasks: TeamTask[];
  teamMeetings: TeamMeeting[];
  approveLeaveRequest: (id: string) => void;
  rejectLeaveRequest: (id: string, reason: string) => void;
  reassignLead: (leadId: string, newAssigneeName: string) => void;
  deleteAssignedLead: (leadId: string) => Promise<void>;
  deletePaymentVerification: (paymentId: string) => Promise<void>;
  /** Move a telecaller's leads to someone else, optionally limited to a count, or specific lead IDs. */
  reassignLeadsBetween: (fromEmployeeId: string, toEmployeeId: string, limit?: number, explicitLeadIds?: string[]) => Promise<void>;
  /** Auto distribute uncalled fresh leads evenly among active telecallers / sales staff */
  autoDistributeFreshLeads: () => Promise<void>;
  createTeamGroup: (data: { name: string; description: string; leaderName: string; monthlyTarget: number; color: string }, memberIds?: string[]) => void;
  updateTeamGroup: (id: string, updates: Partial<TeamGroup>) => Promise<void>;
  deleteTeamGroup: (id: string) => Promise<void>;
  assignTeamLeaderToGroup: (groupId: string, leaderName: string) => void;
  createTeamTask: (data: { title: string; assignedTo: string; group?: string; dueDate: string; priority: 'HIGH' | 'MEDIUM' | 'NORMAL' }) => void;
  toggleTaskStatus: (taskId: string) => void;
  scheduleTeamMeeting: (data: { 
    title: string; 
    dateTime: string; 
    type: string; 
    location?: string; 
    agenda: string; 
    status?: 'LIVE' | 'UPCOMING' | 'COMPLETED'; 
    meetingLink?: string; 
    invitedMemberName?: string;
    attendeesCount?: number;
    targetAudience?: 'ALL' | 'TEAM' | 'INDIVIDUAL' | 'LEADERSHIP' | 'ALL_HR' | 'ALL_TL' | 'ALL_TELECALLER' | 'SQUAD';
    targetTeam?: string;
    targetEmployeeId?: string;
    createdByRole?: string;
    priority?: 'NORMAL' | 'HIGH' | 'MANDATORY';
    includeAdmin?: boolean | number;
    useZoom?: boolean;
  }) => Promise<TeamMeeting | void>;
  updateTeamMeeting: (id: string, updates: Partial<TeamMeeting>) => void;
  deleteTeamMeeting: (id: string) => void;
  isLiveRoomOpen: boolean;
  setIsLiveRoomOpen: (open: boolean) => void;
  activeMeetingRoom: TeamMeeting | null;
  setActiveMeetingRoom: (meeting: TeamMeeting | null) => void;
  joinMeeting: (meeting: TeamMeeting) => void;
  leaveMeeting: () => void;
  
  // HR Module State
  candidates: CandidateInterview[];
  onboardingList: OnboardingEmployee[];
  exitList: ExitEmployee[];
  paymentVerifications: PaymentVerificationItem[];
  scheduleInterview: (data: { candidateName: string; roleApplied: string; experience: string; email: string; phone: string; interviewTime: string; interviewer: string }) => void;
  updateCandidateStatus: (candidateId: string, status: CandidateInterview['status'], notes?: string) => void;
  toggleOnboardingChecklist: (employeeId: string, itemKey: keyof OnboardingEmployee['checklist']) => void;
  toggleExitChecklist: (employeeId: string, itemKey: keyof ExitEmployee['checklist']) => void;
  verifyPayment: (paymentId: string, status: 'VERIFIED' | 'REJECTED') => void;
  generateBulkPayslips: (month: string, year: string, employeeIds?: string[]) => void;
  updatePayslip: (id: string, updates: Partial<PayslipItem>) => Promise<void>;
  deletePayslip: (id: string) => Promise<void>;
  /** Save the HR-customized payroll as a DRAFT (creates or updates). Throws ApiError on failure. */
  savePayrollDraft: (data: Partial<PayslipItem>, opts?: { id?: string; confirmRevision?: boolean }) => Promise<PayslipItem>;
  /** Finalise + store PDF + email + make visible to the employee. Throws ApiError on failure. */
  dispatchPayroll: (id: string, opts?: { resend?: boolean }) => Promise<{ payslip: PayslipItem; emailResult?: any }>;
  /** Only the signed-in user's own payroll that HR has actually dispatched. */
  myPayslips: PayslipItem[];

  // Company Calendar & Holidays (Hierarchy-wide)
  weeklyOffDays: number[];
  setWeeklyOffDays: (days: number[]) => void;
  toggleWeeklyOffDay: (dayIndex: number) => void;
  calendarSettings: CalendarSettings;
  updateCalendarSettings: (settings: Partial<CalendarSettings> & { applyToToday?: boolean }) => Promise<void>;
  reEvaluateTodayAttendance: () => Promise<number>;
  companyHolidays: CompanyHoliday[];
  addCompanyHoliday: (holiday: Omit<CompanyHoliday, 'id'> & { id?: string; description?: string }) => Promise<void>;
  deleteCompanyHoliday: (id: string) => Promise<void>;
  loadPresetHolidays: () => Promise<void>;
  clearAllHolidays: () => Promise<void>;
  
  // Authentication Flow
  currentUser: AuthUser | null;
  setCurrentUser: (user: AuthUser | null) => void;
  authStep: AuthStep;
  setAuthStep: (step: AuthStep) => void;
  logout: () => void;
  
  // Modals & Drawers
  isFaceIdModalOpen: boolean;
  setIsFaceIdModalOpen: (open: boolean) => void;
  faceIdModalMode: 'CHECK_IN' | 'CHECK_OUT';
  setFaceIdModalMode: (mode: 'CHECK_IN' | 'CHECK_OUT') => void;
  openPunchIn: () => void;
  openPunchOut: () => void;
  isFaceRegistrationModalOpen: boolean;
  setIsFaceRegistrationModalOpen: (open: boolean) => void;
  faceRegistrationEmployee: { id: string; name: string } | null;
  setFaceRegistrationEmployee: (emp: { id: string; name: string } | null) => void;
  isExcelUploadModalOpen: boolean;
  setIsExcelUploadModalOpen: (open: boolean) => void;
  isQuickCallModalOpen: boolean;
  setIsQuickCallModalOpen: (open: boolean) => void;
  isLeaveModalOpen: boolean;
  setIsLeaveModalOpen: (open: boolean) => void;
  isIdCardModalOpen: boolean;
  setIsIdCardModalOpen: (open: boolean) => void;
  selectedIdCardEmpId: string;
  setSelectedIdCardEmpId: (id: string) => void;
  selectedPayslip: PayslipItem | null;
  setSelectedPayslip: (payslip: PayslipItem | null) => void;
  isPayslipModalOpen: boolean;
  setIsPayslipModalOpen: (open: boolean) => void;
  isRecentPayslipsModalOpen: boolean;
  setIsRecentPayslipsModalOpen: (open: boolean) => void;
  openPayslipModal: (payslip: PayslipItem) => void;
  
  // Documents & Certificates
  offerLetters: OfferLetterData[];
  selectedOfferLetter: OfferLetterData | null;
  setSelectedOfferLetter: (letter: OfferLetterData | null) => void;
  isOfferLetterModalOpen: boolean;
  setIsOfferLetterModalOpen: (open: boolean) => void;
  isGenerateOfferLetterModalOpen: boolean;
  setIsGenerateOfferLetterModalOpen: (open: boolean) => void;
  generateOfferLetter: (data: Omit<OfferLetterData, 'id' | 'issuedDate'> & { issuedDate?: string }) => Promise<void>;
  updateOfferLetter: (id: string, data: Partial<OfferLetterData>) => Promise<void>;
  deleteOfferLetter: (id: string) => Promise<void>;
  openOfferLetterModal: (letter?: OfferLetterData) => void;
  openGenerateOfferLetterModal: () => void;

  experienceCerts: ExperienceCertData[];
  selectedExperienceCert: ExperienceCertData | null;
  setSelectedExperienceCert: (cert: ExperienceCertData | null) => void;
  selectedExperienceCertEmpId: string;
  setSelectedExperienceCertEmpId: (id: string) => void;
  isExperienceCertModalOpen: boolean;
  setIsExperienceCertModalOpen: (open: boolean) => void;
  isGenerateExperienceCertModalOpen: boolean;
  setIsGenerateExperienceCertModalOpen: (open: boolean) => void;
  generateExperienceCert: (data: Omit<ExperienceCertData, 'id' | 'issuedDate'> & { issuedDate?: string }) => Promise<void>;
  deleteExperienceCert: (id: string) => Promise<void>;
  openExperienceCertModal: (cert?: ExperienceCertData) => void;
  openGenerateExperienceCertModal: (empId?: string) => void;

  relievingLetters: RelievingLetterData[];
  selectedRelievingLetter: RelievingLetterData | null;
  setSelectedRelievingLetter: (letter: RelievingLetterData | null) => void;
  isRelievingLetterModalOpen: boolean;
  setIsRelievingLetterModalOpen: (open: boolean) => void;
  isGenerateRelievingLetterModalOpen: boolean;
  setIsGenerateRelievingLetterModalOpen: (open: boolean) => void;
  generateRelievingLetter: (data: Omit<RelievingLetterData, 'id' | 'issuedDate'> & { issuedDate?: string }) => Promise<void>;
  deleteRelievingLetter: (id: string) => Promise<void>;
  openRelievingLetterModal: (letter?: RelievingLetterData) => void;
  openGenerateRelievingLetterModal: (empId?: string) => void;

  invoices: InvoiceData[];
  selectedInvoice: InvoiceData | null;
  setSelectedInvoice: (invoice: InvoiceData | null) => void;
  isInvoiceModalOpen: boolean;
  setIsInvoiceModalOpen: (open: boolean) => void;
  isGenerateInvoiceModalOpen: boolean;
  setIsGenerateInvoiceModalOpen: (open: boolean) => void;
  generateInvoice: (data: Omit<InvoiceData, 'id'>) => Promise<void>;
  openInvoiceModal: (invoice?: InvoiceData) => void;
  openGenerateInvoiceModal: () => void;
  resendInvoiceEmail: (id: string) => Promise<boolean>;
  updateInvoiceStatus: (id: string, status: 'PAID' | 'PENDING' | 'SENT' | 'OVERDUE') => Promise<boolean>;
  updateInvoice: (invoice: InvoiceData) => Promise<boolean>;
  sendPayslipEmailToEmployee: (payslipId: string, email?: string) => Promise<boolean>;
  sendRelievingLetterEmailToEmployee: (employee: Partial<TeamMember>, letter: Partial<RelievingLetterData>) => Promise<boolean>;
  sendExperienceCertEmailToEmployee: (employee: Partial<TeamMember>, cert: Partial<ExperienceCertData>) => Promise<boolean>;
  sendIdCardEmailToEmployee: (employee: Partial<TeamMember>, cardData?: any) => Promise<boolean>;
  sendOnboardingEmailToEmployee: (employee: Partial<TeamMember>, offerLetter?: Partial<OfferLetterData>) => Promise<boolean>;

  updateEmployeeAvatar: (empId: string, photoDataUrl: string) => void;
  
  // Backend connection status & on-demand loading
  isDataLoading: boolean;
  backendError: string | null;
  resourceStatus: Record<ResourceKey, ResourceStatus>;
  loadResources: (keys: readonly ResourceKey[], options?: { force?: boolean }) => Promise<void>;
  refreshResources: (keys: readonly ResourceKey[]) => Promise<void>;
  invalidateAll: () => void;
  isRefreshing: boolean;
  refreshAllData: () => Promise<void>;

  // Quick Actions & Simulation
  activeToast: string | null;
  triggerToast: (msg: string) => void;
  logNewCall: (data: {
    clientName: string;
    companyName: string;
    phoneNumber: string;
    outcome: CallOutcome;
    durationSec: number;
    notes: string;
    followUpDate?: string;
  }) => void;
  submitLeaveRequest: (data: {
    leaveType: 'Casual Leave' | 'Sick Leave' | 'Earned / Paid Leave';
    fromDate: string;
    toDate: string;
    totalDays: number;
    reason: string;
  }) => void;
  simulateFaceIdCheckIn: () => void;
  simulateFaceIdCheckOut: () => void;
  /** Records a real check-in with the photo and position captured on the device. */
  recordCheckIn: (data: {
    photo: string | null;
    latitude: number | null;
    longitude: number | null;
  }) => Promise<void>;
  /** Records the end of the day, with the same proof as check-in. */
  recordCheckOut: (data: {
    photo: string | null;
    latitude: number | null;
    longitude: number | null;
  }) => Promise<void>;
  disputeAttendanceRecord: (recordId: string, employeeId: string, reason: string) => Promise<void>;
  verifyAttendanceRecord: (recordId: string, employeeId: string) => Promise<void>;
  clearAttendanceRecords: (params?: { date?: string; startDate?: string; endDate?: string; month?: string; year?: string; all?: boolean }) => Promise<void>;
  deleteAttendanceRecord: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    // Browsers with site data blocked throw on access rather than returning null
    try {
      return (localStorage.getItem('tnx_currentRole') as UserRole) || 'telecaller';
    } catch {
      return 'telecaller';
    }
  });
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    try {
      return (localStorage.getItem('tnx_activeTab') as NavTab) || 'home';
    } catch {
      return 'home';
    }
  });
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'desktop'>('desktop');
  const [clientPipelineTab, setClientPipelineTab] = useState<'TO_CALL' | 'CALLBACK' | 'INTERESTED' | 'WON' | 'BUSY' | 'NOT_INTERESTED' | 'ALL'>(() => {
    try {
      return (localStorage.getItem('tnx_pipelineTab') as any) || 'TO_CALL';
    } catch {
      return 'TO_CALL';
    }
  });
  const [authStep, setAuthStep] = useState<AuthStep>(() => {
    try {
      return (localStorage.getItem('tnx_authStep') as AuthStep) || 'LOGIN';
    } catch {
      return 'LOGIN';
    }
  });

  const [currentUser, setCurrentUserState] = useState<AuthUser | null>(() => {
    return getStoredAuthUser();
  });

  const setCurrentUser = useCallback((user: AuthUser | null) => {
    setCurrentUserState(user);
    setStoredAuthUser(user);
    if (user?.role) {
      setCurrentRole(user.role);
      try {
        localStorage.setItem('tnx_currentRole', user.role);
      } catch {}
    }
    if (user) {
      setProfile((prev) => ({
        ...prev,
        id: user.employeeId || user.id || prev.id,
        empCode: user.empCode || prev.empCode,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, []);


  // One-time purge: clear any stale data that was previously cached in localStorage.
  // All business data now lives exclusively in the AWS EC2 SQLite backend.
  try {
    if (typeof window !== 'undefined') {
      const DATA_KEYS_TO_PURGE = [
        'tnx_callLogs', 'tnx_assignedLeads', 'tnx_leadBatches',
        'tnx_paymentVerifications', 'tnx_clients', 'tnx_stats',
        'tnx_attendanceLogs', 'tnx_leaveRequests', 'tnx_teamMembers',
        'tnx_teamGroups', 'tnx_profile', 'tnx_teamTasks', 'tnx_teamMeetings',
        'tnx_candidates', 'tnx_onboardingList', 'tnx_exitList',
        'tnx_offerLetters', 'tnx_payslips', 'tnx_faceProfiles',
        'tnx_company_holidays', 'tnx_weekly_off_days', 'tnx_custom_avatars',
        'tnx_team_members', 'tnx_data_version', 'tnx_leadBatches',
        'tnx_experienceCerts', 'tnx_relievingLetters', 'tnx_invoices',
      ];
      DATA_KEYS_TO_PURGE.forEach((k) => {
        try { localStorage.removeItem(k); } catch {}
      });
    }
  } catch {}

  // All data state initializes empty — fetched exclusively from AWS EC2 SQLite backend via API
  const [profile, setProfile] = useState<EmployeeProfile>(INITIAL_PROFILE);
  const [stats, setStats] = useState<TelecallerStats>(INITIAL_TELECALLER_STATS);
  const [callLogs, setCallLogs] = useState<CallLogItem[]>([]);
  const [clients, setClients] = useState<ClientLead[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [payslips, setPayslips] = useState<PayslipItem[]>([]);

  // Dynamic Lead Management State
  const [assignedLeads, setAssignedLeads] = useState<AssignedLead[]>([]);
  const [leadBatches, setLeadBatches] = useState<LeadBatch[]>([]);

  // Face Biometric State
  const [faceProfiles, setFaceProfiles] = useState<FaceBiometricProfile[]>([]);

  // Offer Letters State
  const [offerLetters, setOfferLetters] = useState<OfferLetterData[]>([]);
  const [selectedOfferLetter, setSelectedOfferLetter] = useState<OfferLetterData | null>(null);
  const [isOfferLetterModalOpen, setIsOfferLetterModalOpen] = useState(false);

  // Experience Certificates State (DB-backed, strictly generated records only)
  const [experienceCerts, setExperienceCerts] = useState<ExperienceCertData[]>([]);
  const [selectedExperienceCert, setSelectedExperienceCert] = useState<ExperienceCertData | null>(null);
  const [selectedExperienceCertEmpId, setSelectedExperienceCertEmpId] = useState<string>('');
  const [isExperienceCertModalOpen, setIsExperienceCertModalOpen] = useState(false);

  // Relieving Letters State (DB-backed, strictly generated records only)
  const [relievingLetters, setRelievingLetters] = useState<RelievingLetterData[]>([]);
  const [selectedRelievingLetter, setSelectedRelievingLetter] = useState<RelievingLetterData | null>(null);
  const [isRelievingLetterModalOpen, setIsRelievingLetterModalOpen] = useState(false);

  // Invoices State
  const [invoices, setInvoices] = useState<InvoiceData[]>(INITIAL_INVOICES);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Team Leader Module State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [teamMeetings, setTeamMeetings] = useState<TeamMeeting[]>([]);
  const [isLiveRoomOpen, setIsLiveRoomOpen] = useState(false);
  const [activeMeetingRoom, setActiveMeetingRoom] = useState<TeamMeeting | null>(null);

  // HR Module State
  const [candidates, setCandidates] = useState<CandidateInterview[]>([]);
  const [onboardingList, setOnboardingList] = useState<OnboardingEmployee[]>([]);
  const [exitList, setExitList] = useState<ExitEmployee[]>([]);
  const [paymentVerifications, setPaymentVerifications] = useState<PaymentVerificationItem[]>([]);

  // Backend connection state
  const [backendError, setBackendError] = useState<string | null>(null);

  // Hierarchy-wide Company Calendar & Holidays State — all from backend
  const [weeklyOffDays, setWeeklyOffDaysState] = useState<number[]>([0]); // Default Sunday until API loads

  const [calendarSettings, setCalendarSettingsState] = useState<CalendarSettings>({
    id: 'settings-default',
    weeklyOffDays: [0],
    weekendPolicy: 'SUNDAY_ONLY',
    shiftStartTime: '09:30 AM',
    shiftEndTime: '06:30 PM',
    gracePeriodMinutes: 15,
    halfDayThresholdHours: 4.0,
    fullDayThresholdHours: 8.0,
    enableLateMarking: true,
    punchInWindowStart: '08:00 AM',
    punchInWindowEnd: '09:30 AM',
    autoPunchOutTime: '11:59 PM',
  });

  const [companyHolidays, setCompanyHolidaysState] = useState<CompanyHoliday[]>([]);

  const setWeeklyOffDays = (days: number[]) => {
    setWeeklyOffDaysState(days);
    setCalendarSettingsState(prev => ({ ...prev, weeklyOffDays: days }));
    api.updateCalendarSettings({ weeklyOffDays: days }).catch(() => {});
    triggerToast('✓ Weekly off schedule updated across company calendars');
  };

  const toggleWeeklyOffDay = (dayIndex: number) => {
    const updated = weeklyOffDays.includes(dayIndex)
      ? weeklyOffDays.filter(d => d !== dayIndex)
      : [...weeklyOffDays, dayIndex].sort();
    setWeeklyOffDays(updated);
  };

  const updateCalendarSettings = async (settings: Partial<CalendarSettings> & { applyToToday?: boolean }) => {
    setCalendarSettingsState(prev => ({ ...prev, ...settings }));
    if (settings.weeklyOffDays) {
      setWeeklyOffDaysState(settings.weeklyOffDays);
    }
    try {
      const updated = await api.updateCalendarSettings(settings);
      setCalendarSettingsState(updated);
      if (updated.weeklyOffDays) setWeeklyOffDaysState(updated.weeklyOffDays);
      if (updated.recalculatedCount !== undefined && updated.recalculatedCount > 0) {
        // Refresh attendance records & team members to show updated status
        const [recs, members] = await Promise.all([
          api.getAttendance(),
          api.getTeamMembers()
        ]);
        setAttendanceLogs(recs as any);
        setTeamMembers(members);
        triggerToast(`✓ Shift timings saved. Updated ${updated.recalculatedCount} attendance records for today`);
      } else {
        triggerToast('✓ Shift timings & attendance policies saved to database');
      }
    } catch {
      triggerToast('✓ Updated calendar policies');
    }
  };

  const reEvaluateTodayAttendance = async (): Promise<number> => {
    try {
      const res = await api.reEvaluateTodayAttendance();
      const [recs, members] = await Promise.all([
        api.getAttendance(),
        api.getTeamMembers()
      ]);
      setAttendanceLogs(recs as any);
      setTeamMembers(members);
      triggerToast(`✓ Re-evaluated today's attendance (${res.count} updated)`);
      return res.count;
    } catch (e: any) {
      triggerToast(`⚠️ Failed to re-evaluate: ${e.message}`);
      return 0;
    }
  };

  const computeAttendanceStatus = (checkInTimeStr: string): 'PRESENT' | 'LATE' => {
    try {
      // If Admin has turned off late marking globally, everyone gets PRESENT
      if (calendarSettings.enableLateMarking === false) {
        return 'PRESENT';
      }

      const parseTimeToMin = (tStr: string): number | null => {
        if (!tStr) return null;
        const clean = tStr.trim();
        const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
        if (!match) return null;
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const meridiem = match[3]?.toUpperCase();
        if (meridiem) {
          if (meridiem === 'PM' && hours < 12) hours += 12;
          if (meridiem === 'AM' && hours === 12) hours = 0;
        }
        return hours * 60 + minutes;
      };

      let cutoffMin: number | null = null;
      if (calendarSettings.punchInWindowEnd) {
        cutoffMin = parseTimeToMin(calendarSettings.punchInWindowEnd);
      }
      if (cutoffMin === null && calendarSettings.shiftStartTime) {
        const startMin = parseTimeToMin(calendarSettings.shiftStartTime);
        if (startMin !== null) {
          cutoffMin = startMin + (Number(calendarSettings.gracePeriodMinutes) || 0);
        }
      }

      const checkInMin = parseTimeToMin(checkInTimeStr);
      if (cutoffMin !== null && checkInMin !== null) {
        if (checkInMin > cutoffMin) {
          return 'LATE';
        }
      }
    } catch {
      // fallback
    }
    return 'PRESENT';
  };

  const addCompanyHoliday = async (holiday: Omit<CompanyHoliday, 'id'> & { id?: string; description?: string }) => {
    try {
      const created = await api.createHoliday(holiday);
      const updated = [...companyHolidays.filter(h => h.id !== created.id), created].sort((a, b) => a.date.localeCompare(b.date));
      setCompanyHolidaysState(updated);
      triggerToast(`✓ Added Holiday "${holiday.name}" to company calendar`);
    } catch {
      triggerToast('✗ Failed to save holiday. Please try again.');
    }
  };

  const deleteCompanyHoliday = async (id: string) => {
    const target = companyHolidays.find(h => h.id === id);
    setCompanyHolidaysState(prev => prev.filter(h => h.id !== id));
    try {
      await api.deleteHoliday(id);
    } catch {}
    triggerToast(`✓ Removed Holiday "${target?.name || ''}" from calendar`);
  };

  const loadPresetHolidays = async () => {
    try {
      const presets = await api.loadPresetHolidays();
      setCompanyHolidaysState(presets);
      triggerToast('✨ Loaded 15 official Indian gazetted holidays (2026)');
    } catch {
      triggerToast('✗ Failed to load preset holidays.');
    }
  };

  const clearAllHolidays = async () => {
    try {
      await api.clearAllHolidays();
    } catch {}
    setCompanyHolidaysState([]);
    triggerToast('✓ Cleared all company holidays');
  };

  // Modals & UI State
  const [isFaceIdModalOpen, setIsFaceIdModalOpen] = useState(false);
  const [faceIdModalMode, setFaceIdModalMode] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');

  const openPunchIn = () => {
    setFaceIdModalMode('CHECK_IN');
    setIsFaceIdModalOpen(true);
  };

  const openPunchOut = () => {
    setFaceIdModalMode('CHECK_OUT');
    setIsFaceIdModalOpen(true);
  };
  const [isFaceRegistrationModalOpen, setIsFaceRegistrationModalOpen] = useState<boolean>(false);
  const [faceRegistrationEmployee, setFaceRegistrationEmployee] = useState<{ id: string; name: string } | null>(null);
  const [activeCallingLead, setActiveCallingLead] = useState<AssignedLead | null>(null);

  const openCallModalForLead = (lead: AssignedLead) => {
    setActiveCallingLead(lead);
    setIsQuickCallModalOpen(true);
  };
  const [isExcelUploadModalOpen, setIsExcelUploadModalOpen] = useState(false);
  const [isQuickCallModalOpen, setIsQuickCallModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isIdCardModalOpen, setIsIdCardModalOpen] = useState(false);
  const [selectedIdCardEmpId, setSelectedIdCardEmpId] = useState<string>('');
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipItem | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [isRecentPayslipsModalOpen, setIsRecentPayslipsModalOpen] = useState(false);

  const openPayslipModal = (payslip: PayslipItem) => {
    setSelectedPayslip(payslip);
    setIsPayslipModalOpen(true);
  };

  const [isGenerateOfferLetterModalOpen, setIsGenerateOfferLetterModalOpen] = useState(false);
  const [isGenerateExperienceCertModalOpen, setIsGenerateExperienceCertModalOpen] = useState(false);
  const [isGenerateRelievingLetterModalOpen, setIsGenerateRelievingLetterModalOpen] = useState(false);
  const [isGenerateInvoiceModalOpen, setIsGenerateInvoiceModalOpen] = useState(false);

  const openGenerateOfferLetterModal = () => setIsGenerateOfferLetterModalOpen(true);
  const openGenerateExperienceCertModal = (empId?: string) => {
    if (empId) setSelectedExperienceCertEmpId(empId);
    setIsGenerateExperienceCertModalOpen(true);
  };
  const openGenerateRelievingLetterModal = (empId?: string) => {
    if (empId) setSelectedIdCardEmpId(empId);
    setIsGenerateRelievingLetterModalOpen(true);
  };
  const openGenerateInvoiceModal = () => setIsGenerateInvoiceModalOpen(true);

  const updateEmployeeAvatar = (empId: string, photoDataUrl: string) => {
    setTeamMembers(prev => prev.map(m => (m.id === empId || m.empCode === empId) ? { ...m, avatar: photoDataUrl } : m));
    if (profile.id === empId || profile.empCode === empId) {
      setProfile(prev => ({ ...prev, avatar: photoDataUrl }));
    }
    triggerToast('✓ Employee photo updated & saved');
  };

  const openOfferLetterModal = (letter?: OfferLetterData) => {
    if (letter) {
      setSelectedOfferLetter(letter);
    } else {
      const matched = offerLetters.find(o => o.candidateName.toLowerCase() === profile.name.toLowerCase()) || {
        id: `off-${profile.empCode}`,
        candidateName: profile.name,
        candidateEmail: profile.email || `${profile.name.toLowerCase().replace(' ', '.')}@tradenexus.com`,
        candidatePhone: profile.phone || '+91 98765 43210',
        roleTitle: profile.roleTitle || 'Telecaller Executive',
        department: profile.department || 'Client Acquisition',
        annualCtc: 360000,
        monthlyGross: 30000,
        joiningDate: profile.joinDate || '',
        reportingManager: profile.teamLeaderName || 'Team Leader',
        location: 'Bengaluru Corporate HQ',
        issuedDate: profile.joinDate || '',
      };
      setSelectedOfferLetter(matched);
    }
    setIsOfferLetterModalOpen(true);
  };

  const openExperienceCertModal = (cert?: ExperienceCertData) => {
    if (cert) {
      setSelectedExperienceCert(cert);
      setIsExperienceCertModalOpen(true);
      return;
    }
    const matched = experienceCerts.find(c => 
      (c.employeeId && profile.id && c.employeeId === profile.id) ||
      (c.empCode && profile.empCode && c.empCode.toLowerCase() === profile.empCode.toLowerCase()) || 
      (c.employeeName && profile.name && c.employeeName.toLowerCase() === profile.name.toLowerCase())
    );
    if (matched) {
      setSelectedExperienceCert(matched);
      setIsExperienceCertModalOpen(true);
    } else {
      triggerToast('ℹ️ No Experience Certificate has been generated yet for this employee.');
    }
  };

  const openRelievingLetterModal = (letter?: RelievingLetterData) => {
    if (letter) {
      setSelectedRelievingLetter(letter);
      setIsRelievingLetterModalOpen(true);
    } else {
      const matched = relievingLetters.find(r => 
        (r.employeeId && profile.id && r.employeeId === profile.id) ||
        (r.empCode && profile.empCode && r.empCode.toLowerCase() === profile.empCode.toLowerCase()) || 
        (r.employeeName && profile.name && r.employeeName.toLowerCase() === profile.name.toLowerCase())
      );
      if (matched) {
        setSelectedRelievingLetter(matched);
        setIsRelievingLetterModalOpen(true);
      } else {
        triggerToast('ℹ️ No Relieving Letter has been generated yet for this employee.');
      }
    }
  };

  const openInvoiceModal = (inv?: InvoiceData) => {
    if (inv) {
      setSelectedInvoice(inv);
    } else {
      const defaultInv: InvoiceData = invoices[0] || {
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
        dueDate: new Date(Date.now() + 15 * 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
        clientName: 'Estelle Darcy',
        clientCompany: 'Darcy Trading Corp',
        clientPhone: '+123-456-7890',
        clientEmail: 'estelle@darcytrading.com',
        clientAddress: '123 Anywhere St., Any City',
        fromName: 'Samira Hadid',
        fromRole: 'Lead Account Executive',
        fromPhone: '+91 98765 43210',
        fromEmail: 'info@tradenexus.com',
        fromAddress: '123 Business Avenue, Financial District, Your City, 500001',
        items: [
          { id: 'item-1', description: 'Enterprise Trading Suite CRM License (Q2)', quantity: 1, unitPrice: 25000, total: 25000 },
          { id: 'item-2', description: 'Automated AI Lead Routing Engine Setup', quantity: 1, unitPrice: 15000, total: 15000 },
          { id: 'item-3', description: 'Dedicated SDR Dedicated Support', quantity: 1, unitPrice: 5000, total: 5000 },
        ],
        subTotal: 45000,
        grandTotal: 45000,
        note: 'Payment is due within 15 days of invoice date.',
        bankName: 'HDFC Bank',
        accountNumber: '123-456-7890',
        ifscCode: 'HDFC0001234',
        paymentEmail: 'reallygreatsite.com',
        status: 'PAID',
      };
      setSelectedInvoice(defaultInv);
    }
    setIsInvoiceModalOpen(true);
  };
  const [activeToast, setActiveToast] = useState<string | null>(null);

  const triggerToast = useCallback((msg: string) => {
    setActiveToast(msg);
    setTimeout(() => {
      setActiveToast(null);
    }, 3000);
  }, []);

  // --- On-demand resource loading -----------------------------------------
  // Nothing is fetched on mount. Screens declare what they need via
  // useScreenData(), and each resource is fetched at most once per session
  // (until something invalidates it). Concurrent requests for the same
  // resource share one in-flight promise.

  const setters = useRef<Record<ResourceKey, (value: any) => void>>({
    profile: setProfile,
    stats: setStats,
    callLogs: setCallLogs,
    clients: setClients,
    attendanceLogs: setAttendanceLogs,
    leaveRequests: setLeaveRequests,
    payslips: setPayslips,
    teamMembers: setTeamMembers,
    teamGroups: setTeamGroups,
    teamTasks: setTeamTasks,
    teamMeetings: setTeamMeetings,
    candidates: setCandidates,
    onboardingList: setOnboardingList,
    exitList: setExitList,
    assignedLeads: setAssignedLeads,
    leadBatches: setLeadBatches,
    faceProfiles: setFaceProfiles,
    offerLetters: setOfferLetters,
    paymentVerifications: (data: PaymentVerificationItem[]) => {
      const seen = new Set<string>();
      const deduped = (data || []).filter((p) => {
        const key = `${(p.companyName || p.leadName || '').trim().toLowerCase()}_${(p.telecallerName || '').trim().toLowerCase()}_${p.dealAmount}_${p.status}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setPaymentVerifications(deduped);
    },
    companyHolidays: setCompanyHolidaysState,
    calendarSettings: (settings: CalendarSettings) => {
      setCalendarSettingsState(settings);
      if (settings?.weeklyOffDays) {
        setWeeklyOffDaysState(settings.weeklyOffDays);
      }
    },
    invoices: setInvoices,
    experienceCerts: setExperienceCerts,
    relievingLetters: setRelievingLetters,
  });

  const [resourceStatus, setResourceStatus] = useState<Record<ResourceKey, ResourceStatus>>(
    () => Object.fromEntries(ALL_RESOURCE_KEYS.map((k) => [k, 'idle'])) as Record<ResourceKey, ResourceStatus>
  );

  // Mirrors resourceStatus so load decisions never depend on a stale closure.
  const statusRef = useRef(resourceStatus);
  const inFlight = useRef(new Map<ResourceKey, Promise<void>>());

  const markStatus = useCallback((key: ResourceKey, status: ResourceStatus) => {
    statusRef.current = { ...statusRef.current, [key]: status };
    setResourceStatus((prev) => (prev[key] === status ? prev : { ...prev, [key]: status }));
  }, []);

  const resourceSeq = useRef<Record<string, number>>({});

  const fetchResource = useCallback(
    (key: ResourceKey): Promise<void> => {
      const existing = inFlight.current.get(key);
      if (existing) return existing;

      markStatus(key, 'loading');

      const seq = (resourceSeq.current[key] || 0) + 1;
      resourceSeq.current[key] = seq;

      const request = RESOURCE_FETCHERS[key]()
        .then((value) => {
          // Guard against race conditions: if a newer request or mutation happened while this request was in flight, discard it
          if (resourceSeq.current[key] !== seq) {
            return;
          }
          if (value !== undefined && value !== null) setters.current[key](value);
          markStatus(key, 'loaded');
          setBackendError(null);
        })
        .catch((err) => {
          if (resourceSeq.current[key] !== seq) return;
          // Mark as 'error' so subsequent calls/polls retry fetching once backend is ready
          markStatus(key, 'error');
          if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            setBackendError(
              `Could not load "${key}" from the API on port 5001. Start it with: npm run server (${String(err)})`
            );
          }
        })
        .finally(() => {
          inFlight.current.delete(key);
        });

      inFlight.current.set(key, request);
      return request;
    },
    [markStatus]
  );

  /** Fetch the given resources unless they are already loaded or in flight. */
  const loadResources = useCallback(
    (keys: readonly ResourceKey[], options?: { force?: boolean }) => {
      const pending = keys.filter((key) =>
        options?.force ? true : statusRef.current[key] === 'idle' || statusRef.current[key] === 'error'
      );
      if (!pending.length) return Promise.resolve();
      if (options?.force) pending.forEach((key) => inFlight.current.delete(key));
      return Promise.all(pending.map(fetchResource)).then(() => undefined);
    },
    [fetchResource]
  );

  /** Re-fetch resources that have already been loaded (used after mutations). */
  const refreshResources = useCallback(
    (keys: readonly ResourceKey[]) => loadResources(keys, { force: true }),
    [loadResources]
  );

  // Hydrate session from backend /api/auth/me on app load
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      api.me()
        .then(({ user }) => {
          if (user) {
            setCurrentUserState(user);
            setStoredAuthUser(user);
            if (user.role) {
              setCurrentRole(user.role);
              try {
                localStorage.setItem('tnx_currentRole', user.role);
              } catch {}
            }
            setProfile((prev) => ({
              ...prev,
              id: user.employeeId || user.id || prev.id,
              empCode: user.empCode || prev.empCode,
              name: user.name || prev.name,
              email: user.email || prev.email,
            }));
            setAuthStep('AUTHENTICATED');
            loadResources([
              'profile',
              'stats',
              'attendanceLogs',
              'teamMembers',
              'assignedLeads',
              'callLogs',
              'paymentVerifications',
              'teamMeetings'
            ], { force: true });
          }
        })
        .catch((err) => {
          console.warn('Session verification failed:', err);
          if (err?.status === 401 || err?.status === 403) {
            setAuthToken(null);
            setStoredAuthUser(null);
            setCurrentUserState(null);
            setAuthStep('LOGIN');
          }
        });
    }
  }, [loadResources]);

  const isDataLoading = ALL_RESOURCE_KEYS.some((k) => resourceStatus[k] === 'loading');

  // Only the selected portal is remembered locally; domain data is never cached
  // so the screens always reflect what is actually in SQLite.
  useEffect(() => {
    try {
      localStorage.setItem('tnx_currentRole', currentRole);
    } catch {
      // Ignore storage errors (private windows, blocked site data)
    }
  }, [currentRole]);

  useEffect(() => {
    try {
      localStorage.setItem('tnx_authStep', authStep);
    } catch {}
  }, [authStep]);

  useEffect(() => {
    try {
      localStorage.setItem('tnx_activeTab', activeTab);
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem('tnx_pipelineTab', clientPipelineTab);
    } catch {}
  }, [clientPipelineTab]);

  // Live real-time background sync for all 4 panels (Admin, TL, HR, Employee)
  // Keeps attendance, stats, leads, team roster, calls, payments, leaves, and meetings perfectly synchronized
  useEffect(() => {
    if (authStep !== 'AUTHENTICATED') return;
    const syncAllPanels = () => {
      loadResources([
        'stats',
        'assignedLeads',
        'attendanceLogs',
        'teamMembers',
        'callLogs',
        'paymentVerifications',
        'leaveRequests',
        'teamMeetings',
        'offerLetters',
        'experienceCerts',
      ], { force: true });
    };
    // Initial fetch immediately, then poll every 8 seconds
    syncAllPanels();
    const interval = setInterval(syncAllPanels, 8000);
    return () => clearInterval(interval);
  }, [authStep, loadResources]);

  // Manual one-tap refresh triggered from headers across all 4 panels
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshAllData = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshResources(ALL_RESOURCE_KEYS);
      triggerToast('✓ Data refreshed successfully');
    } catch (e) {
      console.error('Failed to sync data:', e);
      triggerToast('⚠ Error syncing with server');
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  }, [isRefreshing, refreshResources, triggerToast]);




  // Synchronize profile attendance status strictly with today's attendance record
  useEffect(() => {
    const today = getTodayDateIST();
    const empId = currentUser?.employeeId || currentUser?.id || profile.id;
    if (!empId) return;

    const todayRec = attendanceLogs.find(
      (a) =>
        a.date === today &&
        (a.employeeId === empId ||
          (currentUser?.id && a.employeeId === currentUser.id) ||
          (currentUser?.empCode && a.employeeId === currentUser.empCode) ||
          (profile.empCode && a.employeeId === profile.empCode) ||
          a.id === `att-${today}-${empId}` ||
          (a.employeeName && profile.name && a.employeeName.toLowerCase().trim() === profile.name.toLowerCase().trim()) ||
          (a.employeeName && currentUser?.name && a.employeeName.toLowerCase().trim() === currentUser.name.toLowerCase().trim()))
    );

    if (todayRec) {
      if (todayRec.disputedByAdmin) {
        if (profile.faceIdStatus !== 'NOT_CHECKED_IN' || profile.checkInTime || !profile.disputedByAdmin) {
          setProfile((prev) => ({
            ...prev,
            checkInTime: '',
            faceIdStatus: 'NOT_CHECKED_IN',
            disputedByAdmin: true,
            disputeReason: todayRec.disputeReason,
          }));
        }
      } else {
        const isOut = Boolean(todayRec.checkOut);
        const isPunchedIn = Boolean(todayRec.checkIn) && !isOut;
        const newStatus: 'VERIFIED_PRESENT' | 'ON_BREAK' | 'NOT_CHECKED_IN' = isOut
          ? 'ON_BREAK'
          : (isPunchedIn || todayRec.status === 'PRESENT' || todayRec.status === 'LATE' || todayRec.status === 'HALF_DAY')
          ? 'VERIFIED_PRESENT'
          : 'NOT_CHECKED_IN';
        const newTime = todayRec.checkIn || '';
        if (
          profile.checkInTime !== newTime ||
          profile.faceIdStatus !== newStatus ||
          profile.disputedByAdmin
        ) {
          setProfile((prev) => ({
            ...prev,
            checkInTime: newTime,
            faceIdStatus: newStatus,
            disputedByAdmin: false,
            disputeReason: null,
          }));
        }
      }
    } else if (resourceStatus.attendanceLogs === 'loaded' && attendanceLogs.length > 0) {
      // Only reset if attendanceLogs has verified records in DB and none exist for this employee today
      if (profile.checkInTime || profile.faceIdStatus === 'VERIFIED_PRESENT' || profile.disputedByAdmin) {
        setProfile((prev) => ({
          ...prev,
          checkInTime: '',
          faceIdStatus: 'NOT_CHECKED_IN',
          disputedByAdmin: false,
          disputeReason: null,
        }));
      }
    }
  }, [attendanceLogs, currentUser, profile.id, profile.name, profile.empCode, resourceStatus.attendanceLogs]);



  /** Drop every cached resource so the next screen re-fetches from the API. */
  const invalidateAll = useCallback(() => {
    inFlight.current.clear();
    const reset = Object.fromEntries(
      ALL_RESOURCE_KEYS.map((k) => [k, 'idle'])
    ) as Record<ResourceKey, ResourceStatus>;
    statusRef.current = reset;
    setResourceStatus(reset);
  }, []);


  const logout = useCallback(() => {
    invalidateAll();
    setAuthToken(null);
    setStoredAuthUser(null);
    setCurrentUserState(null);
    // Reset all in-memory data states to empty (data lives in the DB, not localStorage)
    setProfile(EMPTY_PROFILE);
    setStats(EMPTY_STATS);
    setCallLogs([]);
    setAssignedLeads([]);
    setLeaveRequests([]);
    setPaymentVerifications([]);
    setTeamMembers([]);
    setPayslips([]);
    setAuthStep('LOGIN');
    triggerToast('Logged out. Please login to continue.');
  }, [invalidateAll, triggerToast]);

  // Lead Import & Allocation
  const importAndAssignLeads = async (
    fileName: string, 
    targetEmployeeId: string, 
    targetEmployeeName: string, 
    leads: Array<{ name: string; phone: string; company: string; email?: string; city?: string }>
  ) => {
    const batchId = `batch-${Date.now()}`;
    const newBatch: LeadBatch = {
      id: batchId,
      fileName,
      uploadedAt: 'Just now',
      totalLeads: leads.length,
      assignedToEmployeeId: targetEmployeeId,
      assignedToEmployeeName: targetEmployeeName,
    };

    const newAssignedItems: AssignedLead[] = leads.map((lead, idx) => ({
      id: `asg-${Date.now()}-${idx}`,
      name: lead.name,
      phone: lead.phone,
      email: lead.email || `${lead.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      company: lead.company || 'Private Enterprise',
      city: lead.city || 'Pan-India',
      assignedToEmployeeId: targetEmployeeId,
      assignedToEmployeeName: targetEmployeeName,
      batchId,
      assignedDate: getTodayDateIST(),
      status: 'PENDING',
      notes: `Imported via ${fileName}`,
      callCount: 0,
      updatedAt: new Date().toISOString(),
    }));

    setLeadBatches(prev => [newBatch, ...prev]);
    setAssignedLeads(prev => [...newAssignedItems, ...prev]);
    triggerToast(`✓ Successfully allocated ${leads.length} leads to ${targetEmployeeName}!`);

    try {
      const res = await api.bulkImportAssignedLeads(fileName, targetEmployeeId, targetEmployeeName, newAssignedItems);
      if (res?.leads && res.leads.length > 0) {
        setAssignedLeads(prev => [
          ...res.leads,
          ...prev.filter(l => l.batchId !== batchId)
        ]);
      }
    } catch (err) {
      console.warn('API bulk import error:', err);
    }
  };

  const updateAssignedLeadStatus = async (
    leadId: string, 
    status: AssignedLead['status'], 
    notes: string, 
    dealValue?: number, 
    followUpDate?: string,
    customerDetails?: {
      customerName?: string;
      customerBankName?: string;
      customerAccountNumber?: string;
      customerIfscCode?: string;
      customerUpiId?: string;
    }
  ) => {
    const existingLead = assignedLeads.find(l => l.id === leadId);
    if (!existingLead) {
      console.warn(`Lead ${leadId} not found in state`);
      return;
    }

    const nowIso = new Date().toISOString();
    const dealAmountNum = dealValue !== undefined ? dealValue : (existingLead.dealValue || 0);

    const targetLead: AssignedLead = {
      ...existingLead,
      status,
      notes: notes || existingLead.notes,
      callCount: (existingLead.callCount || 0) + 1,
      lastCallTimestamp: 'Just now',
      dealValue: dealAmountNum,
      followUpDate: followUpDate || existingLead.followUpDate,
      customerName: customerDetails?.customerName || existingLead.customerName || existingLead.name,
      customerBankName: customerDetails?.customerBankName || existingLead.customerBankName,
      customerAccountNumber: customerDetails?.customerAccountNumber || existingLead.customerAccountNumber,
      customerIfscCode: customerDetails?.customerIfscCode || existingLead.customerIfscCode,
      customerUpiId: customerDetails?.customerUpiId || existingLead.customerUpiId,
      updatedAt: nowIso,
    };

    // Optimistically update assignedLeads in state
    setAssignedLeads(prev => prev.map(lead => lead.id === leadId ? targetLead : lead));

    // Also log as call item with explicit employee linkage
    const newCallItem: CallLogItem = {
      id: `call-${Date.now()}`,
      clientName: targetLead.name,
      companyName: targetLead.company,
      phoneNumber: targetLead.phone,
      durationSec: status === 'BUSY' ? 0 : 180,
      outcome: status === 'CONVERTED' ? 'DEAL_CLOSED' : 
               status === 'INTERESTED' ? 'INTERESTED' : 
               status === 'CALLBACK' ? 'CALLBACK' : 
               status === 'BUSY' ? 'BUSY' : 
               status === 'NOT_INTERESTED' ? 'NOT_INTERESTED' : 'CONNECTED',
      notes: notes || `Call outcome updated to ${status.replace('_', ' ')}`,
      timestamp: 'Just now',
      date: nowIso.split('T')[0],
      createdAt: nowIso,
      followUpDate,
      employeeId: targetLead.assignedToEmployeeId || currentUser?.employeeId || currentUser?.id,
      employeeName: targetLead.assignedToEmployeeName || currentUser?.name,
    };

    setCallLogs(prev => [newCallItem, ...prev]);

    // Update Telecaller Stats (Only increment interested for INTERESTED, never for CONVERTED)
    const updatedStats: TelecallerStats = {
      ...stats,
      dialsMade: stats.dialsMade + 1,
      connected: (status !== 'NOT_INTERESTED' && status !== 'BUSY') ? stats.connected + 1 : stats.connected,
      interested: status === 'INTERESTED' ? stats.interested + 1 : stats.interested,
      rejected: (status === 'NOT_INTERESTED' || status === 'BUSY') ? stats.rejected + 1 : stats.rejected,
      // Official sales revenue (monthlySalesAchieved) is credited upon verification in verifyPayment
    };
    setStats(updatedStats);

    // Update Team Member record for TL and HR live visibility
    setTeamMembers(prev => prev.map(m => {
      const isTargetEmp =
        (m.id && (m.id === targetLead.assignedToEmployeeId || m.id === currentUser?.employeeId || m.id === currentUser?.id)) ||
        (m.empCode && (m.empCode === targetLead.assignedToEmployeeId || m.empCode === currentUser?.empCode)) ||
        (m.name && targetLead.assignedToEmployeeName && m.name.toLowerCase() === targetLead.assignedToEmployeeName.toLowerCase());

      if (isTargetEmp) {
        const newDials = m.dialsToday + 1;
        const newConnected = (status !== 'NOT_INTERESTED' && status !== 'BUSY') ? m.connected + 1 : m.connected;
        const newInterested = status === 'INTERESTED' ? m.interested + 1 : m.interested;
        const newSales = m.salesAchieved;
        const updatedM: TeamMember = {
          ...m,
          dialsToday: newDials,
          connected: newConnected,
          interested: newInterested,
          salesAchieved: newSales,
          conversionRate: Math.min(100, Math.round((newInterested / Math.max(1, newDials)) * 100)),
        };
        api.updateTeamMember(m.id, updatedM).catch(console.warn);
        return updatedM;
      }
      return m;
    }));

    // If converted with deal value, record in payment verification list for HR and Admin Won Deals Ledger
    if (status === 'CONVERTED') {
      const payId = `pay-${leadId}`;
      const newPayment: PaymentVerificationItem = {
        id: payId,
        leadName: targetLead.name,
        companyName: targetLead.company,
        telecallerName: targetLead.assignedToEmployeeName,
        dealAmount: dealAmountNum,
        utrNumber: `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        paymentMode: targetLead.customerUpiId ? 'UPI Transfer' : 'Online Bank Transfer',
        timestamp: 'Just now',
        status: 'PENDING_HR_AUDIT',
        customerName: targetLead.customerName || targetLead.name,
        customerBankName: targetLead.customerBankName,
        customerAccountNumber: targetLead.customerAccountNumber,
        customerIfscCode: targetLead.customerIfscCode,
        customerUpiId: targetLead.customerUpiId,
      };
      setPaymentVerifications(prev => {
        const withoutDup = prev.filter(p => 
          p.id !== payId && 
          !(
            (p.companyName || p.leadName || '').trim().toLowerCase() === (targetLead.company || targetLead.name || '').trim().toLowerCase() &&
            (p.telecallerName || '').trim().toLowerCase() === (targetLead.assignedToEmployeeName || '').trim().toLowerCase() &&
            p.dealAmount === dealAmountNum &&
            p.status === 'PENDING_HR_AUDIT'
          )
        );
        return [newPayment, ...withoutDup];
      });
      api.createPayment(newPayment).catch(console.warn);
    }

    // Persist to AWS EC2 SQLite API
    try {
      await Promise.allSettled([
        api.updateAssignedLead(leadId, targetLead),
        api.createCallLog(newCallItem),
        api.updateStats(updatedStats),
      ]);
      // Force global refresh so Admin, TL, and HR panels reflect this won deal immediately
      refreshResources(['assignedLeads', 'callLogs', 'paymentVerifications', 'teamMembers', 'stats']);
    } catch (err) {
      console.warn('API sync error:', err);
    }

    triggerToast(`✓ Status updated: ${status.replace('_', ' ')} for ${targetLead.name || 'Lead'}`);
  };

  // Face Biometric Registration
  const registerFaceBiometric = async (employeeId: string, employeeName: string, photoDataUrl: string) => {
    const profileItem: FaceBiometricProfile = {
      employeeId,
      employeeName,
      registeredPhoto: photoDataUrl,
      registeredAt: 'Just now',
      status: 'REGISTERED',
    };

    setFaceProfiles(prev => {
      const existing = prev.filter(p => p.employeeId !== employeeId);
      return [profileItem, ...existing];
    });

    // Mark Onboarding checklist item
    setOnboardingList(prev => prev.map(onb => {
      if (onb.id === employeeId || onb.name.toLowerCase() === employeeName.toLowerCase()) {
        const updated = {
          ...onb,
          checklist: { ...onb.checklist, biometricEnrolled: true },
        };
        api.updateOnboarding(onb.id, updated).catch(console.warn);
        return updated;
      }
      return onb;
    }));

    triggerToast(`✓ Face Biometric Enrolled successfully for ${employeeName}!`);

    try {
      await api.registerBiometric(profileItem);
    } catch (err) {
      console.warn('API biometric register error:', err);
    }
  };

  const verifyFaceAttendance = (employeeId?: string): boolean => {
    const targetId = employeeId || profile.id;
    const enrolled = faceProfiles.find(p => p.employeeId === targetId || p.employeeName.toLowerCase() === profile.name.toLowerCase());
    
    // Check-in
    const timeStr = getCurrentTimeIST();
    const today = getTodayDateIST();
    const dayNumber = parseInt(today.split('-')[2], 10) || new Date().getDate();

    const updatedProfile: EmployeeProfile = {
      ...profile,
      faceIdStatus: 'VERIFIED_PRESENT',
      checkInTime: timeStr,
      checkOutTime: undefined,
    };
    setProfile(updatedProfile);

    const calculatedStatus = computeAttendanceStatus(timeStr);

    const newAttendanceItem: AttendanceRecord = {
      id: `att-${today}-${targetId}`,
      employeeId: targetId,
      employeeName: profile.name,
      date: today,
      dayNumber: dayNumber,
      status: calculatedStatus,
      checkIn: timeStr,
      checkOut: undefined,
      workHours: 'In Progress',
      method: 'Face ID Biometric',
    };

    setAttendanceLogs(prev => [
      newAttendanceItem,
      ...prev.filter(item => item.id !== newAttendanceItem.id && item.date !== today),
    ]);

    setTeamMembers(prev => prev.map(m => {
      if (m.id === profile.id || m.name.toLowerCase() === profile.name.toLowerCase()) {
        const updated = { ...m, attendanceStatus: calculatedStatus, checkInTime: timeStr, checkInMethod: 'Face ID Biometric' as const };
        api.updateTeamMember(m.id, updated).catch(console.warn);
        return updated;
      }
      return m;
    }));

    api.verifyBiometric(targetId).catch(console.warn);
    api.recordAttendance(newAttendanceItem).catch(console.warn);
    api.updateProfile(updatedProfile).catch(console.warn);

    return !!enrolled;
  };

  // Employee Creation & Onboarding (HR & Admin)
  const updateEmployee = async (id: string, changes: Partial<TeamMember>) => {
    // Invalidate any in-flight background polls so they cannot overwrite this update
    resourceSeq.current['teamMembers'] = (resourceSeq.current['teamMembers'] || 0) + 1;
    resourceSeq.current['teamGroups'] = (resourceSeq.current['teamGroups'] || 0) + 1;

    // Resolve target employee synchronously from current state
    const currentMember = teamMembers.find(m => m.id === id || m.empCode === id);
    const targetId = currentMember?.id || id;
    const targetEmpCode = currentMember?.empCode || (changes.empCode || id);

    // Optimistic local state update
    setTeamMembers((prev) =>
      prev.map((m) => {
        if (m.id !== id && m.empCode !== id && m.id !== targetId) return m;
        return { ...m, ...changes };
      })
    );

    // ── Global sync: if admin edits the currently logged-in employee, update profile too ──
    const currentEmpIdForSync = currentUser?.employeeId || currentUser?.id || profile.id;
    const isCurrentUser = id === currentEmpIdForSync ||
      targetId === currentEmpIdForSync ||
      (profile.empCode && profile.empCode === targetEmpCode);

    if (isCurrentUser) {
      setProfile(prev => ({
        ...prev,
        ...(changes.name !== undefined && { name: changes.name }),
        ...(changes.role !== undefined && { roleTitle: changes.role }),
        ...(changes.phone !== undefined && { phone: changes.phone }),
        ...(changes.email !== undefined && { email: changes.email }),
        ...(changes.address !== undefined && { address: changes.address }),
        ...(changes.salary !== undefined && { salary: changes.salary }),
        ...(changes.bankName !== undefined && { bankName: changes.bankName }),
        ...(changes.bankAccountNumber !== undefined && { bankAccountNumber: changes.bankAccountNumber }),
        ...(changes.bankIfscCode !== undefined && { bankIfscCode: changes.bankIfscCode }),
        ...(changes.panDocumentName !== undefined && { panDocumentName: changes.panDocumentName }),
        ...(changes.panDocumentUrl !== undefined && { panDocumentUrl: changes.panDocumentUrl }),
        ...(changes.aadhaarDocumentName !== undefined && { aadhaarDocumentName: changes.aadhaarDocumentName }),
        ...(changes.aadhaarDocumentUrl !== undefined && { aadhaarDocumentUrl: changes.aadhaarDocumentUrl }),
        ...(changes.bloodGroup !== undefined && { bloodGroup: changes.bloodGroup }),
        ...(changes.dob !== undefined && { dob: changes.dob }),
        ...(changes.avatar !== undefined && { avatar: changes.avatar }),
      }));
    }

    // ── Sync payslips: update employee name on existing payslips if name changed ──
    if (changes.name) {
      setPayslips(prev => prev.map(p =>
        (p.employeeId === id || p.empCode === id || p.employeeId === targetId) ? { ...p, employeeName: changes.name! } : p
      ));
    }

    // ── Sync assignedLeads: update assignee name if it changed ──
    if (changes.name) {
      setAssignedLeads(prev => prev.map(l =>
        (l.assignedToEmployeeId === id || l.assignedToEmployeeId === targetId) ? { ...l, assignedToEmployeeName: changes.name! } : l
      ));
    }

    try {
      const saved = await api.updateTeamMember(targetId, changes);
      if (saved) {
        setTeamMembers(prev => prev.map(m => (m.id === targetId || m.empCode === targetId || m.id === saved.id || m.empCode === saved.empCode || m.id === id || m.empCode === id) ? { ...m, ...saved } : m));
      }
      if (changes.salesTarget !== undefined || changes.goalCalls !== undefined) {
        if (isCurrentUser) {
          setStats(prev => ({
            ...prev,
            ...(changes.salesTarget !== undefined && { monthlySalesTarget: changes.salesTarget }),
            ...(changes.goalCalls !== undefined && { todayGoalCalls: changes.goalCalls, dailyTarget: changes.goalCalls }),
          }));
        }
      }
      refreshResources(['teamMembers', 'teamGroups', 'stats']).catch(() => {});
    } catch (err) {
      console.warn('Employee update failed:', err);
      triggerToast('✗ Could not save those changes to server');
      throw err;
    }
  };

  const batchUpdateTargets = async (targets: Array<{ id: string; salesTarget?: number; goalCalls?: number }>) => {
    resourceSeq.current['teamMembers'] = (resourceSeq.current['teamMembers'] || 0) + 1;
    resourceSeq.current['stats'] = (resourceSeq.current['stats'] || 0) + 1;

    const targetMap = new Map(targets.map(t => [t.id, t]));

    setTeamMembers(prev => prev.map(m => {
      const match = targetMap.get(m.id) || targetMap.get(m.empCode);
      if (!match) return m;
      return {
        ...m,
        ...(match.salesTarget !== undefined && { salesTarget: match.salesTarget }),
        ...(match.goalCalls !== undefined && { goalCalls: match.goalCalls }),
      };
    }));

    const currentEmpId = currentUser?.employeeId || currentUser?.id || profile.id;
    const currentMatch = targetMap.get(currentEmpId) || (profile.empCode ? targetMap.get(profile.empCode) : undefined);
    if (currentMatch) {
      setStats(prev => ({
        ...prev,
        ...(currentMatch.salesTarget !== undefined && { monthlySalesTarget: currentMatch.salesTarget }),
        ...(currentMatch.goalCalls !== undefined && { todayGoalCalls: currentMatch.goalCalls, dailyTarget: currentMatch.goalCalls }),
      }));
    }

    try {
      const res = await api.batchUpdateTargets(targets);
      if (res?.members && Array.isArray(res.members)) {
        setTeamMembers(res.members);
      }
      refreshResources(['teamMembers', 'stats']).catch(() => {});
      return res;
    } catch (err) {
      console.warn('Batch update targets error, falling back:', err);
      for (const t of targets) {
        try {
          await api.updateTeamMember(t.id, {
            ...(t.salesTarget !== undefined && { salesTarget: t.salesTarget }),
            ...(t.goalCalls !== undefined && { goalCalls: t.goalCalls }),
          });
        } catch (_) {}
      }
      refreshResources(['teamMembers', 'stats']).catch(() => {});
    }
  };

  const setEmployeeActive = async (id: string, active: boolean) => {
    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    const changes: Partial<TeamMember> = {
      active: active ? 1 : 0,
      deactivatedOn: active ? undefined : today,
    };

    let name = '';
    setTeamMembers((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        name = m.name;
        return { ...m, ...changes };
      })
    );

    triggerToast(active ? `\u2713 ${name} reactivated` : `\u2713 ${name} deactivated`);

    try {
      await api.updateTeamMember(id, changes as Partial<TeamMember>);
    } catch (err) {
      console.warn('Employee status change failed:', err);
    }
  };

  const deleteEmployee = async (id: string) => {
    const member = teamMembers.find((m) => m.id === id || m.empCode === id);
    if (!member) return;

    // Optimistic removal
    setTeamMembers((prev) => prev.filter((m) => m.id !== id && m.empCode !== id));

    // Update group counts locally
    if (member.group) {
      setTeamGroups((prev) =>
        prev.map((g) =>
          g.name.toLowerCase() === member.group.toLowerCase()
            ? { ...g, memberCount: Math.max(0, g.memberCount - 1) }
            : g
        )
      );
    }

    // Cascade remove local offer letters & payslips for deleted staff
    setOfferLetters((prev) =>
      prev.filter(
        (o) =>
          o.candidateName?.toLowerCase() !== member.name.toLowerCase() &&
          (!member.email || o.candidateEmail?.toLowerCase() !== member.email.toLowerCase())
      )
    );
    setPayslips((prev) =>
      prev.filter(
        (p) =>
          p.employeeId !== id &&
          p.empCode !== id &&
          p.empCode !== member.empCode &&
          p.employeeName?.toLowerCase() !== member.name.toLowerCase()
      )
    );

    try {
      await api.deleteTeamMember(id);
      triggerToast(`\u2713 ${member.name} (${member.empCode}) permanently deleted`);
    } catch (err: any) {
      console.warn('Employee delete failed:', err);
      // Rollback
      setTeamMembers((prev) => [...prev, member]);
      triggerToast(`\u2717 ${err.message || 'Could not delete employee'}`);
      throw err;
    }
  };

  const createNewEmployee = async (data: NewEmployeeInput) => {
    // 0. Pre-validate: Email and Phone uniqueness
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const cleanDigits = (data.phone || '').replace(/[^0-9]/g, '');
    const phoneLast10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : '';

    if (cleanEmail) {
      const dupEmail = teamMembers.find(m => m.email && m.email.trim().toLowerCase() === cleanEmail);
      if (dupEmail) {
        triggerToast(`✗ Email "${cleanEmail}" is already registered to ${dupEmail.name} (${dupEmail.empCode}). Please use a different email.`);
        throw new Error(`Email already registered to ${dupEmail.name}`);
      }
    }

    if (phoneLast10) {
      const dupPhone = teamMembers.find(m => {
        const d = (m.phone || '').replace(/[^0-9]/g, '');
        return d.length >= 10 && d.slice(-10) === phoneLast10;
      });
      if (dupPhone) {
        triggerToast(`✗ Phone number "${data.phone}" is already registered to ${dupPhone.name} (${dupPhone.empCode}). Please use a different phone number.`);
        throw new Error(`Phone number already registered to ${dupPhone.name}`);
      }
    }

    const empCode = data.empCode || `TNX-${Math.floor(8000 + Math.random() * 999)}`;
    const empId = `emp-${Date.now()}`;
    const monthlyGross = data.salary || ((data.basicSalary || 20000) + (data.hra || 10000) + (data.specialAllowance || 5000));
    const annualCtc = monthlyGross * 12;

    // 1. Add to Team Members
    const newMember: TeamMember = {
      id: empId,
      empCode,
      name: data.name,
      avatar: data.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      role: data.roleTitle || (data.role === 'telecaller' ? 'Telecaller Executive' : data.role === 'team_leader' ? 'Team Leader' : data.role.toUpperCase()),
      group: data.teamGroup || 'Alpha Growth Team',
      phone: data.phone,
      attendanceStatus: 'ABSENT',
      checkInTime: '',
      checkInMethod: '',
      dialsToday: 0,
      goalCalls: 0,
      connected: 0,
      interested: 0,
      salesAchieved: 0,
      salesTarget: 0,
      conversionRate: 0,
      portal: data.role,
      email: data.email,
      password: data.password || 'Trade@1234',
      active: 1,
      bankName: data.bankName,
      bankAccountNumber: data.bankAccountNumber,
      bankIfscCode: data.bankIfscCode,
      panDocumentName: data.panDocumentName,
      panDocumentUrl: data.panDocumentUrl,
      aadhaarDocumentName: data.aadhaarDocumentName,
      aadhaarDocumentUrl: data.aadhaarDocumentUrl,
      salary: data.salary,
      joiningDate: data.joiningDate,
      address: data.address,
      bloodGroup: data.bloodGroup || 'O+',
      dob: data.dob,
      emergencyPhone: data.emergencyPhone || data.phone,
      employeeType: data.employeeType,
    };
    setTeamMembers(prev => [newMember, ...prev]);

    // 2. Add to Onboarding List
    const newOnboarding: OnboardingEmployee = {
      id: empId,
      empCode,
      name: data.name,
      role: data.roleTitle || 'Telecaller Executive',
      department: data.department || 'Sales & Client Acquisition',
      joiningDate: data.joiningDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      probationEnd: '6 Months from Joining',
      status: 'IN_PROGRESS',
      checklist: {
        documentsVerified: !!data.panDocumentName && !!data.aadhaarDocumentName,
        workstationAllocated: true,
        biometricEnrolled: false,
        trainingScheduled: false,
      },
    };
    setOnboardingList(prev => [newOnboarding, ...prev]);

    // 3. Generate Offer Letter
    const newOfferLetter: OfferLetterData = {
      id: `off-${Date.now()}`,
      candidateName: data.name,
      candidateEmail: data.email,
      candidatePhone: data.phone,
      candidateAddress: data.address || 'Bengaluru Corporate HQ',
      roleTitle: data.roleTitle || 'Telecaller Executive',
      department: data.department || 'Sales & Client Acquisition',
      annualCtc,
      monthlyGross,
      joiningDate: data.joiningDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      reportingManager: data.teamLeaderName || 'Team Leader',
      location: data.location || 'Bengaluru Corporate HQ',
      issuedDate: data.issuedDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      acceptanceDeadline: data.acceptanceDeadline || 'Within 7 business days',
      signatoryName: data.signatoryName || 'T .Vidhya Sagar',
      signatoryRole: data.signatoryRole || 'Chief executive Officer',
      employeeType: data.employeeType || 'Full Time',
      salaryType: data.salaryType || 'Monthly Gross / Annual CTC',
      companyName: data.companyName || 'Trade Nexus',
      companyAddress: data.companyAddress || '123 Business Avenue, Financial District, Your City, 500001',
      companyPhone: data.companyPhone || '+91 98765 43210',
      companyEmail: data.companyEmail || 'info@tradenexus.com',
      companyWebsite: data.companyWebsite || 'www.tradenexus.com',
    };
    setOfferLetters(prev => [newOfferLetter, ...prev]);
    setSelectedOfferLetter(newOfferLetter);
    setIsOfferLetterModalOpen(true);
    triggerToast(`✓ Employee ${data.name} (${empCode}) created! Offer Letter generated.`);

    // Persist to SQLite
    try {
      await Promise.all([
        api.createTeamMember(newMember),
        api.createOnboarding(newOnboarding),
        api.createOfferLetter(newOfferLetter),
      ]);
      // Automatically generate canonical ID Card & Offer Letter in employee_documents
      api.generateIdCard(empId, {
        name: data.name,
        role: data.roleTitle || newMember.role,
        empCode,
        bloodGroup: data.bloodGroup || 'O+ ve',
        dob: data.dob || '05/11/1997',
        phone: data.phone || '9876543210',
        empType: data.employeeType || 'Full - Time',
        address: data.address || 'Flat 204, Highrise Apts, Hyd',
        avatar: data.avatar || undefined,
      }).catch(console.warn);
      api.generateOfferLetter(empId, newOfferLetter).catch(console.warn);
      api.sendOnboardingEmail(newMember, newOfferLetter).catch(console.warn);
    } catch (err) {
      console.warn('API error creating employee:', err);
    }
  };

  const loginEmployee = (emailOrCode: string, _passInput: string): { success: boolean; member?: TeamMember; error?: string } => {
    const cleanId = (emailOrCode || '').trim().toLowerCase();
    const digitsOnly = cleanId.replace(/[^0-9]/g, '');

    // Match existing onboarded team member if present
    const member = teamMembers.find(m => 
      (cleanId && m.email && m.email.toLowerCase() === cleanId) || 
      (cleanId && m.empCode && m.empCode.toLowerCase() === cleanId) ||
      (digitsOnly.length >= 7 && m.phone && m.phone.replace(/[^0-9]/g, '').includes(digitsOnly))
    );

    if (!member) {
      return { success: false, error: 'Employee not found in roster' };
    }

    const targetMember: TeamMember = member;

    // Set Dynamic Profile for this employee
    setProfile({
      ...INITIAL_PROFILE,
      id: targetMember.id,
      empCode: targetMember.empCode,
      name: targetMember.name,
      email: targetMember.email || (cleanId.includes('@') ? cleanId : `${targetMember.name.toLowerCase().replace(/\s+/g, '.')}@tradenexus.com`),
      roleTitle: targetMember.role || 'Sales Executive',
      department: targetMember.group || 'Sales',
      teamName: targetMember.group || 'General',
      phone: targetMember.phone || '',
      faceIdStatus: 'NOT_CHECKED_IN',
      checkInTime: targetMember.checkInTime || ''
    });

    setStats({
      ...INITIAL_TELECALLER_STATS,
      dialsMade: targetMember.dialsToday || 0,
      todayGoalCalls: (targetMember.goalCalls && targetMember.goalCalls > 0) ? targetMember.goalCalls : 60,
      connected: targetMember.connected || 0,
      interested: targetMember.interested || 0,
      monthlySalesAchieved: targetMember.salesAchieved || 0,
      monthlySalesTarget: (targetMember.salesTarget && targetMember.salesTarget > 0) ? targetMember.salesTarget : 200000
    });

    setCurrentRole(targetMember.portal || 'telecaller');
    return { success: true, member: targetMember };
  };

  const generateOfferLetter = async (data: Omit<OfferLetterData, 'id' | 'issuedDate'> & { issuedDate?: string }) => {
    const newOffer: OfferLetterData = {
      ...data,
      id: `off-${Date.now()}`,
      issuedDate: data.issuedDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    setOfferLetters(prev => [newOffer, ...prev]);
    setSelectedOfferLetter(newOffer);
    setIsOfferLetterModalOpen(true);
    triggerToast(`✓ Offer letter generated for ${data.candidateName}`);

    try {
      const matchedEmp = teamMembers.find(m => 
        (m.name && m.name.toLowerCase() === data.candidateName.toLowerCase()) ||
        (m.email && data.candidateEmail && m.email.toLowerCase() === data.candidateEmail.toLowerCase())
      );
      const res = await api.generateOfferLetter(matchedEmp?.id, newOffer);
      if (res?.offerLetter?.id) {
        newOffer.id = res.offerLetter.id;
      }
    } catch (err) {
      console.warn('API generate offer letter error, falling back to createOfferLetter:', err);
      try {
        await api.createOfferLetter(newOffer);
      } catch (createErr) {
        console.warn('API create offer letter error:', createErr);
      }
    }
  };

  const updateOfferLetter = async (id: string, data: Partial<OfferLetterData>) => {
    setOfferLetters(prev => prev.map(o => o.id === id ? { ...o, ...data } : o));
    if (selectedOfferLetter?.id === id) {
      setSelectedOfferLetter(prev => prev ? { ...prev, ...data } : null);
    }
    try {
      await api.updateOfferLetter(id, data);
      await api.generateOfferLetter(undefined, { ...data, id });
      triggerToast(`✓ Offer letter updated & saved to database`);
    } catch (err: any) {
      console.warn('Update offer letter error:', err);
      triggerToast(`⚠️ Saved locally: ${err.message || 'Server error'}`);
    }
  };

  const deleteOfferLetter = async (id: string) => {
    const target = offerLetters.find(o => o.id === id);
    setOfferLetters(prev => prev.filter(o => o.id !== id));
    try {
      await api.deleteOfferLetter(id);
      triggerToast(`✓ Offer letter for ${target?.candidateName || 'candidate'} deleted`);
    } catch (err: any) {
      console.warn('Delete offer letter error:', err);
      if (target) setOfferLetters(prev => [target, ...prev]);
      triggerToast('✗ Failed to delete offer letter');
    }
  };

  const generateExperienceCert = async (data: Omit<ExperienceCertData, 'id' | 'issuedDate'> & { issuedDate?: string }) => {
    // Look up employee
    const targetEmp = teamMembers.find(
      m => (data.employeeId && m.id === data.employeeId) ||
           (m.empCode && data.empCode && m.empCode.toLowerCase() === data.empCode.toLowerCase()) ||
           (m.name && data.employeeName && m.name.toLowerCase() === data.employeeName.toLowerCase())
    );

    const empId = targetEmp?.id || data.employeeId || data.empCode;
    try {
      const res = await api.generateExperienceCert(empId, data, 'HR Admin');
      if (res.success && res.certData) {
        setExperienceCerts(prev => [res.certData, ...prev.filter(c => c.employeeId !== empId && c.empCode !== res.certData.empCode)]);
        setSelectedExperienceCert(res.certData);
        setIsExperienceCertModalOpen(true);
        triggerToast(`✓ Experience Certificate generated, saved & dispatched for ${data.employeeName}`);
        return;
      }
    } catch (err: any) {
      console.warn('[Generate Experience Cert API Error]', err);
      const fallbackCert: ExperienceCertData = {
        ...data,
        id: `exp-${Date.now()}`,
        employeeId: empId,
        issuedDate: data.issuedDate || new Date().toLocaleDateString('en-GB'),
      };
      setExperienceCerts(prev => [fallbackCert, ...prev.filter(c => c.employeeId !== empId)]);
      setSelectedExperienceCert(fallbackCert);
      setIsExperienceCertModalOpen(true);
      triggerToast(`⚠️ Saved locally: ${err.message || 'Server error'}`);
    }
  };

  const deleteExperienceCert = async (id: string) => {
    const target = experienceCerts.find(c => c.id === id);
    setExperienceCerts(prev => prev.filter(c => c.id !== id));
    if (selectedExperienceCert?.id === id) {
      setSelectedExperienceCert(null);
      setIsExperienceCertModalOpen(false);
    }
    try {
      await api.deleteExperienceCert(id);
      triggerToast(`✓ Experience Certificate for ${target?.employeeName || 'employee'} deleted`);
    } catch (err: any) {
      console.warn('[Delete Experience Cert Error]', err);
      if (target) setExperienceCerts(prev => [target, ...prev]);
      triggerToast(`✗ Failed to delete experience certificate: ${err.message || 'Server error'}`);
    }
  };

  const generateRelievingLetter = async (data: Omit<RelievingLetterData, 'id' | 'issuedDate'> & { issuedDate?: string }) => {
    // Look up employee
    const targetEmp = teamMembers.find(
      m => (data.employeeId && m.id === data.employeeId) ||
           (m.empCode && data.empCode && m.empCode.toLowerCase() === data.empCode.toLowerCase()) ||
           (m.name && data.employeeName && m.name.toLowerCase() === data.employeeName.toLowerCase())
    );

    const empId = targetEmp?.id || data.employeeId || data.empCode;
    try {
      const res = await api.generateRelievingLetter(empId, data, 'HR Admin');
      if (res.success && res.letterData) {
        setRelievingLetters(prev => [res.letterData, ...prev.filter(r => r.employeeId !== empId && r.empCode !== res.letterData.empCode)]);
        setSelectedRelievingLetter(res.letterData);
        setIsRelievingLetterModalOpen(true);
        triggerToast(`✓ Relieving Letter generated, saved & dispatched for ${data.employeeName}`);
        return;
      }
    } catch (err: any) {
      console.warn('[Generate Relieving Letter API Error]', err);
      const fallbackLetter: RelievingLetterData = {
        ...data,
        id: `rel-${Date.now()}`,
        employeeId: empId,
        issuedDate: data.issuedDate || new Date().toLocaleDateString('en-GB'),
      };
      setRelievingLetters(prev => [fallbackLetter, ...prev.filter(r => r.employeeId !== empId)]);
      setSelectedRelievingLetter(fallbackLetter);
      setIsRelievingLetterModalOpen(true);
      triggerToast(`⚠️ Saved locally: ${err.message || 'Server error'}`);
    }
  };

  const deleteRelievingLetter = async (id: string) => {
    const target = relievingLetters.find(r => r.id === id);
    setRelievingLetters(prev => prev.filter(r => r.id !== id));
    if (selectedRelievingLetter?.id === id) {
      setSelectedRelievingLetter(null);
      setIsRelievingLetterModalOpen(false);
    }
    try {
      await api.deleteRelievingLetter(id);
      triggerToast(`✓ Relieving Letter for ${target?.employeeName || 'employee'} deleted`);
    } catch (err: any) {
      console.warn('[Delete Relieving Letter Error]', err);
      if (target) setRelievingLetters(prev => [target, ...prev]);
      triggerToast(`✗ Failed to delete relieving letter: ${err.message || 'Server error'}`);
    }
  };

  const generateInvoice = async (data: Omit<InvoiceData, 'id'>) => {
    const newInvoice: InvoiceData = {
      ...data,
      id: `inv-${Date.now()}`,
    };
    setInvoices(prev => [newInvoice, ...prev]);
    setSelectedInvoice(newInvoice);
    setIsInvoiceModalOpen(true);
    triggerToast(`✓ Invoice ${data.invoiceNumber} generated & sent to ${data.clientEmail}`);
    try {
      await api.createInvoice(newInvoice);
      refreshResources(['invoices']);
    } catch (err) {
      console.warn('API invoice save error:', err);
    }
  };

  const resendInvoiceEmail = async (id: string): Promise<boolean> => {
    try {
      const res = await api.resendInvoice(id);
      if (res.success) {
        // Optimistically update invoice status to SENT in local state
        setInvoices(prev => prev.map(inv =>
          inv.id === id ? { ...inv, status: 'SENT' as const } : inv
        ));
        triggerToast('✓ Invoice dispatched to customer email successfully');
        return true;
      }
      triggerToast('✗ Failed to dispatch email. Check SMTP settings.');
      return false;
    } catch (err) {
      triggerToast('✗ Failed to re-send invoice email.');
      return false;
    }
  };

  const updateInvoiceStatus = async (id: string, status: 'PAID' | 'PENDING' | 'SENT' | 'OVERDUE'): Promise<boolean> => {
    try {
      // Optimistic update in local state
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
      await api.updateInvoiceStatus(id, status);
      triggerToast(`✓ Invoice marked as ${status}`);
      return true;
    } catch (err) {
      triggerToast('✗ Failed to update invoice status');
      refreshResources(['invoices']);
      return false;
    }
  };

  const updateInvoice = async (invoice: InvoiceData): Promise<boolean> => {
    setInvoices(prev => prev.map(inv => inv.id === invoice.id ? invoice : inv));
    setSelectedInvoice(invoice);
    try {
      await api.updateInvoice(invoice.id, invoice);
      return true;
    } catch (err: any) {
      triggerToast(`✗ Failed to save invoice changes: ${err?.message || 'Server error'}`);
      return false;
    }
  };

  const sendPayslipEmailToEmployee = async (payslipId: string, email?: string): Promise<boolean> => {
    try {
      const res = await api.sendPayslipEmail(payslipId, email);
      if (res.success) {
        triggerToast('✓ Payroll email re-sent to employee');
        return true;
      }
      triggerToast('✗ Could not send payslip email.');
      return false;
    } catch {
      triggerToast('✗ Failed to send payslip email.');
      return false;
    }
  };

  const sendRelievingLetterEmailToEmployee = async (employee: Partial<TeamMember>, letter: Partial<RelievingLetterData>): Promise<boolean> => {
    try {
      const res = await api.sendRelievingEmail(employee, letter);
      if (res.success) {
        triggerToast(`✓ Relieving letter emailed to ${employee.email}`);
        return true;
      }
      triggerToast('✗ Could not send relieving letter email.');
      return false;
    } catch {
      triggerToast('✗ Failed to send relieving letter email.');
      return false;
    }
  };

  const sendExperienceCertEmailToEmployee = async (employee: Partial<TeamMember>, cert: Partial<ExperienceCertData>): Promise<boolean> => {
    try {
      const res = await api.sendExperienceEmail(employee, cert);
      if (res.success) {
        triggerToast(`✓ Experience certificate emailed to ${employee.email}`);
        return true;
      }
      triggerToast('✗ Could not send experience cert email.');
      return false;
    } catch {
      triggerToast('✗ Failed to send experience cert email.');
      return false;
    }
  };

  const sendIdCardEmailToEmployee = async (employee: Partial<TeamMember>, cardData?: any): Promise<boolean> => {
    try {
      const res = await api.sendIdCardEmail(employee, cardData);
      if (res.success) {
        triggerToast(`✓ Digital ID Card PDF emailed to ${employee.email}`);
        return true;
      }
      triggerToast('✗ Could not send ID Card email.');
      return false;
    } catch {
      triggerToast('✗ Failed to send ID Card email.');
      return false;
    }
  };

  const sendOnboardingEmailToEmployee = async (employee: Partial<TeamMember>, offerLetter?: Partial<OfferLetterData>): Promise<boolean> => {
    try {
      const res = await api.sendOnboardingEmail(employee, offerLetter);
      if (res.success) {
        triggerToast(`✓ Offer letter & ID credentials emailed to ${employee.email}`);
        return true;
      }
      triggerToast('✗ Could not send offer email.');
      return false;
    } catch {
      triggerToast('✗ Failed to send offer email.');
      return false;
    }
  };

  // Team Leader Assignment
  const assignTeamLeaderToGroup = async (groupId: string, leaderName: string) => {
    setTeamGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        const updated = { ...g, leaderName };
        api.updateTeamGroup(groupId, updated).catch(console.warn);
        return updated;
      }
      return g;
    }));

    const targetGroup = teamGroups.find(g => g.id === groupId);
    triggerToast(`✓ ${leaderName} assigned as Team Leader to ${targetGroup?.name || 'Group'}`);
  };

  // Team Leader, HR & Admin Hierarchical Leave Actions
  const approveLeaveRequest = async (id: string) => {
    const approverName = profile.name || currentUser?.name || (currentRole === 'admin' ? 'Super Admin' : currentRole === 'hr' ? 'HR Manager' : 'Team Leader');
    const approverTitle = currentRole === 'admin' ? 'Super Admin' : currentRole === 'hr' ? 'HR Manager' : (profile.name ? `${profile.name} (Team Leader)` : 'Team Leader');
    const nowIso = new Date().toISOString();

    setLeaveRequests(prev => prev.map(req => {
      if (req.id !== id) return req;
      let nextStage: LeaveRequest['approvalStage'] = 'APPROVED';
      let nextStatus: LeaveRequest['status'] = 'APPROVED';
      let updated: LeaveRequest = { ...req };

      // Advance stage based on current approver role
      if (currentRole === 'team_leader') {
        // Team leader approves → advances to HR
        nextStage = 'PENDING_HR';
        nextStatus = 'PENDING';
        updated = {
          ...req,
          approvalStage: nextStage,
          status: nextStatus,
          teamLeaderApprovedBy: approverName,
          teamLeaderApprovedAt: nowIso,
        };
      } else if (currentRole === 'hr') {
        // HR approves → advances to Admin
        nextStage = 'PENDING_ADMIN';
        nextStatus = 'PENDING';
        updated = {
          ...req,
          approvalStage: nextStage,
          status: nextStatus,
          hrApprovedBy: approverName,
          hrApprovedAt: nowIso,
        };
      } else {
        // Admin final approval → APPROVED
        nextStage = 'APPROVED';
        nextStatus = 'APPROVED';
        updated = {
          ...req,
          approvalStage: nextStage,
          status: nextStatus,
          adminApprovedBy: approverName,
          adminApprovedAt: nowIso,
          approvedBy: approverTitle,
        };
      }

      api.updateLeave(id, updated).catch(console.warn);
      return updated;
    }));

    const stageMsg = currentRole === 'team_leader' ? 'forwarded to HR' : currentRole === 'hr' ? 'forwarded to Admin' : 'APPROVED';
    triggerToast(`✓ Leave request ${stageMsg} by ${approverTitle}`);
  };

  const rejectLeaveRequest = async (id: string, reason: string) => {
    const rejectorTitle = currentRole === 'admin' ? 'Admin' : currentRole === 'hr' ? 'HR' : 'Team Leader';
    const rejectorName = profile.name || currentUser?.name || rejectorTitle;
    const targetLeave = leaveRequests.find(r => r.id === id);

    setLeaveRequests(prev => prev.map(req => {
      if (req.id === id) {
        const updated: LeaveRequest = {
          ...req,
          status: 'REJECTED',
          approvalStage: 'REJECTED',
          rejectedBy: `${rejectorName} (${rejectorTitle})`,
          rejectionReason: reason || 'Operational requirements',
          approvedBy: `Rejected by ${rejectorTitle}: ${reason || 'Operational requirements'}`,
        };
        api.updateLeave(id, updated).catch(console.warn);
        return updated;
      }
      return req;
    }));

    // If the rejected leave belongs to the current user, refund in UI profile state
    if (targetLeave && (targetLeave.employeeId === profile.id || targetLeave.employeeCode === profile.empCode || (targetLeave.employeeName && targetLeave.employeeName.toLowerCase() === (profile.name || '').toLowerCase()))) {
      setProfile(prev => ({
        ...prev,
        totalLeaveBalance: prev.totalLeaveBalance + (targetLeave.totalDays || 0)
      }));
    }

    triggerToast(`✗ Leave request REJECTED by ${rejectorTitle}`);
  };

  const reassignLead = async (leadId: string, newAssigneeName: string) => {
    setClients(prev => prev.map(c => {
      if (c.id === leadId) {
        const updated: ClientLead = { ...c, requirement: `${c.requirement} (Reassigned to ${newAssigneeName})` };
        api.updateClient(leadId, updated).catch(console.warn);
        return updated;
      }
      return c;
    }));
    triggerToast(`✓ Lead successfully reassigned to ${newAssigneeName}`);
  };

  // Leads that Admin allocated to this employee. Admin writes them to
  // assigned_leads; the pipeline screens were built around ClientLead, so they
  // are mapped across rather than duplicating the screens.
  const todayIso = getTodayDateIST();
  const currentEmpId = currentUser?.employeeId || currentUser?.id || profile.id;
  const currentEmpCode = currentUser?.empCode || profile.empCode;
  const currentEmpName = (currentUser?.name || profile.name || '').trim().toLowerCase();

  const myLeads: ClientLead[] = assignedLeads
    .filter((l) => 
      (currentEmpId && l.assignedToEmployeeId === currentEmpId) ||
      (currentEmpCode && l.assignedToEmployeeId === currentEmpCode) ||
      (currentEmpName && l.assignedToEmployeeName && l.assignedToEmployeeName.toLowerCase() === currentEmpName)
    )
    .map((l) => {
      const dueToday = !!l.followUpDate && l.followUpDate.slice(0, 10) === todayIso;
      return {
        id: l.id,
        name: l.name,
        company: l.company,
        phone: l.phone,
        email: l.email || '',
        temperature:
          l.status === 'CONVERTED' ? 'CONVERTED'
          : l.status === 'INTERESTED' ? 'HOT'
          : l.status === 'CALLBACK' ? 'WARM'
          : (l.status === 'NOT_INTERESTED' || l.status === 'BUSY') ? 'COLD'
          : 'WARM',
        status:
          l.status === 'CONVERTED' ? 'Converted'
          : dueToday ? 'Due Today'
          : l.status === 'CALLBACK' ? 'Follow-up'
          : l.status === 'INTERESTED' ? 'Follow-up'
          : l.status === 'NOT_INTERESTED' ? 'Lost'
          : 'Pending',
        dueTime: l.followUpDate,
        dealValue: l.dealValue ?? 0,
        requirement: l.notes || `Assigned ${l.assignedDate}`,
        lastContacted: l.lastCallTimestamp || 'Not called yet',
      };
    });

  const reassignLeadsBetween = async (
    fromEmployeeId: string,
    toEmployeeId: string,
    limit?: number,
    explicitLeadIds?: string[]
  ) => {
    const isUnassigned = fromEmployeeId === 'UNASSIGNED';
    const fromMember = isUnassigned ? null : teamMembers.find((m) => m.id === fromEmployeeId);
    const target = teamMembers.find((m) => m.id === toEmployeeId);
    if (!target) return;

    let moving: AssignedLead[] = [];
    if (explicitLeadIds && explicitLeadIds.length > 0) {
      const explicitSet = new Set(explicitLeadIds);
      moving = assignedLeads.filter((l) => explicitSet.has(l.id));
    } else if (isUnassigned) {
      moving = assignedLeads.filter((l) => isLeadUnassigned(l, teamMembers));
    } else {
      moving = assignedLeads.filter((l) =>
        l.assignedToEmployeeId === fromEmployeeId ||
        (fromMember && l.assignedToEmployeeName && l.assignedToEmployeeName.toLowerCase() === fromMember.name.toLowerCase())
      );
    }

    if (!moving.length) {
      triggerToast(isUnassigned ? 'No unassigned leads found to move.' : 'That telecaller has no leads to move.');
      return;
    }

    if (limit && limit > 0 && limit < moving.length) {
      moving = moving.slice(0, limit);
    }

    const movingIds = new Set(moving.map((l) => l.id));

    setAssignedLeads((prev) =>
      prev.map((l) => {
        const isMoving = movingIds.has(l.id);
        return isMoving
          ? { ...l, assignedToEmployeeId: target.id, assignedToEmployeeName: target.name, updatedAt: new Date().toISOString() }
          : l;
      })
    );

    triggerToast(`✓ ${moving.length} lead${moving.length === 1 ? '' : 's'} assigned to ${target.name}`);

    try {
      await api.reassignBatchAssignedLeads({
        leadIds: Array.from(movingIds),
        targetEmployeeId: target.id,
        targetEmployeeName: target.name,
      });
      refreshResources(['assignedLeads']);
    } catch (err) {
      console.warn('Batch lead reassignment failed:', err);
      triggerToast('✗ Some leads could not be moved');
    }
  };

  const deleteAssignedLead = async (leadId: string) => {
    setAssignedLeads((prev) => prev.filter((l) => l.id !== leadId));
    setClients((prev) => prev.filter((c) => c.id !== leadId));
    setPaymentVerifications((prev) => prev.filter((p) => p.id !== `pay-${leadId}` && p.utrNumber !== `LEAD-${leadId}`));

    try {
      await api.deleteAssignedLead(leadId);
      triggerToast('✓ Lead deleted across all panels');
      refreshResources(['assignedLeads', 'teamMembers', 'teamGroups', 'paymentVerifications', 'stats']);
    } catch (err) {
      console.warn('Delete assigned lead failed:', err);
      triggerToast('✗ Failed to delete lead from server');
      refreshResources(['assignedLeads']);
    }
  };

  const deletePaymentVerification = async (paymentId: string) => {
    setPaymentVerifications((prev) => prev.filter((p) => p.id !== paymentId));

    try {
      await api.deletePayment(paymentId);
      triggerToast('✓ Deal payment removed & sales ledger updated');
      refreshResources(['paymentVerifications', 'teamMembers', 'teamGroups', 'assignedLeads', 'stats']);
    } catch (err) {
      console.warn('Delete payment failed:', err);
      triggerToast('✗ Failed to delete payment from server');
      refreshResources(['paymentVerifications']);
    }
  };

  const autoDistributeFreshLeads = async () => {
    // 1. Identify unassigned leads across the system using unified predicate
    const unassignedLeads = assignedLeads.filter((l) => isLeadUnassigned(l, teamMembers));

    // If unassigned leads exist in the pool, prioritize distributing them!
    // Otherwise distribute fresh uncalled leads (callCount === 0).
    const leadsToDistribute = unassignedLeads.length > 0
      ? unassignedLeads
      : assignedLeads.filter((l) => l.callCount === 0);

    const activeTelecallers = teamMembers.filter(
      (m) => isTelecallerOrCallingEmployee(m)
    );

    if (!leadsToDistribute.length) {
      triggerToast('✓ All leads are already distributed and assigned!');
      return;
    }
    if (!activeTelecallers.length) {
      triggerToast('No active telecallers found to receive leads.');
      return;
    }

    try {
      const perCaller = Math.ceil(leadsToDistribute.length / activeTelecallers.length);
      let idx = 0;
      const reassignments: { [empId: string]: { member: typeof activeTelecallers[0]; leads: typeof leadsToDistribute } } = {};

      for (const caller of activeTelecallers) {
        const chunk = leadsToDistribute.slice(idx, idx + perCaller);
        idx += perCaller;
        if (chunk.length > 0) {
          reassignments[caller.id] = { member: caller, leads: chunk };
        }
      }

      for (const empId of Object.keys(reassignments)) {
        const { member, leads } = reassignments[empId];
        const leadIdsToMove = leads.map((l) => l.id);
        try {
          await api.reassignBatchAssignedLeads({
            leadIds: leadIdsToMove,
            targetEmployeeId: member.id,
            targetEmployeeName: member.name,
          });
        } catch (e) {
          console.warn('Batch assign warning:', e);
        }
      }

      setAssignedLeads((prev) =>
        prev.map((l) => {
          for (const empId of Object.keys(reassignments)) {
            if (reassignments[empId].leads.some((chunkLead) => chunkLead.id === l.id)) {
              return {
                ...l,
                assignedToEmployeeId: reassignments[empId].member.id,
                assignedToEmployeeName: reassignments[empId].member.name,
              };
            }
          }
          return l;
        })
      );

      triggerToast(`✓ Distributed ${leadsToDistribute.length} leads across ${activeTelecallers.length} telecallers`);
      refreshResources(['assignedLeads']);
    } catch (err) {
      console.warn(err);
      triggerToast('✓ Leads distributed successfully');
    }
  };

  const createTeamGroup = async (
    data: { name: string; description: string; leaderName: string; monthlyTarget: number; color: string },
    memberIds?: string[]
  ) => {
    const newGroup: TeamGroup = {
      id: `grp-${Date.now()}`,
      name: data.name,
      description: data.description,
      leaderName: data.leaderName,
      memberCount: memberIds?.length || 0,
      monthlyTarget: data.monthlyTarget,
      achieved: 0,
      color: data.color || '#00C9A7',
    };
    setTeamGroups(prev => [...prev, newGroup]);

    if (memberIds && memberIds.length > 0) {
      setTeamMembers(prev =>
        prev.map(m => memberIds.includes(m.id) ? { ...m, group: data.name } : m)
      );
      for (const mId of memberIds) {
        const mem = teamMembers.find(m => m.id === mId);
        if (mem) {
          api.updateTeamMember(mId, { ...mem, group: data.name }).catch(console.warn);
        }
      }
    }

    triggerToast(`✓ Team squad "${data.name}" created with ${memberIds?.length || 0} members`);

    try {
      await api.createTeamGroup(newGroup);
    } catch (err) {
      console.warn('API create group error:', err);
    }
  };

  const updateTeamGroup = async (id: string, updates: Partial<TeamGroup>) => {
    const prevGroup = teamGroups.find(g => g.id === id);
    setTeamGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    
    if (updates.name && prevGroup && prevGroup.name !== updates.name) {
      setTeamMembers(prev => prev.map(m => m.group === prevGroup.name ? { ...m, group: updates.name! } : m));
    }

    triggerToast(`✓ Team "${updates.name || prevGroup?.name || 'group'}" updated`);
    try {
      await api.updateTeamGroup(id, updates);
    } catch (err) {
      console.warn('API update team group error:', err);
    }
  };

  const deleteTeamGroup = async (id: string) => {
    const targetGroup = teamGroups.find(g => g.id === id);
    const groupName = targetGroup?.name || 'Team';
    
    setTeamGroups(prev => prev.filter(g => g.id !== id));
    setTeamMembers(prev => prev.map(m => m.group === groupName ? { ...m, group: 'Unassigned' } : m));
    
    triggerToast(`✓ Team "${groupName}" deleted. Members set to Unassigned.`);
    try {
      await api.deleteTeamGroup(id);
    } catch (err) {
      console.warn('API delete team group error:', err);
    }
  };

  const createTeamTask = async (data: { title: string; assignedTo: string; group?: string; dueDate: string; priority: 'HIGH' | 'MEDIUM' | 'NORMAL' }) => {
    const newTask: TeamTask = {
      id: `task-${Date.now()}`,
      title: data.title,
      assignedTo: data.assignedTo,
      group: data.group,
      dueDate: data.dueDate,
      priority: data.priority,
      status: 'PENDING',
    };
    setTeamTasks(prev => [newTask, ...prev]);
    triggerToast(`✓ Task assigned to ${data.assignedTo}`);

    try {
      await api.createTeamTask(newTask);
    } catch (err) {
      console.warn('API create task error:', err);
    }
  };

  const toggleTaskStatus = async (taskId: string) => {
    setTeamTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'PENDING' ? 'IN_PROGRESS' : t.status === 'IN_PROGRESS' ? 'COMPLETED' : 'PENDING';
        const updated: TeamTask = { ...t, status: nextStatus };
        api.updateTeamTask(taskId, updated).catch(console.warn);
        return updated;
      }
      return t;
    }));
    triggerToast('✓ Task status updated');
  };

  const scheduleTeamMeeting = async (data: { 
    title: string; 
    dateTime: string; 
    type: string; 
    location?: string; 
    agenda: string; 
    status?: 'LIVE' | 'UPCOMING' | 'COMPLETED'; 
    meetingLink?: string; 
    invitedMemberName?: string;
    attendeesCount?: number;
    targetAudience?: 'ALL' | 'TEAM' | 'INDIVIDUAL' | 'LEADERSHIP' | 'ALL_HR' | 'ALL_TL' | 'ALL_TELECALLER' | 'SQUAD';
    targetTeam?: string;
    targetEmployeeId?: string;
    createdByRole?: string;
    priority?: 'NORMAL' | 'HIGH' | 'MANDATORY';
    includeAdmin?: boolean | number;
    useZoom?: boolean;
  }) => {
    try {
      let createdMtg: TeamMeeting;
      const shouldUseZoom = data.useZoom !== false && (!data.location || data.location.includes('Zoom') || data.location.includes('Video') || data.location.includes('In-App'));

      if (shouldUseZoom) {
        createdMtg = await api.createZoomMeeting({
          title: data.title,
          dateTime: data.dateTime,
          agenda: data.agenda,
          type: data.type,
          status: data.status,
          targetAudience: data.targetAudience,
          targetTeam: data.targetTeam,
          targetEmployeeId: data.targetEmployeeId,
          invitedMemberName: data.invitedMemberName,
          includeAdmin: data.includeAdmin,
          priority: data.priority,
          attendeesCount: data.attendeesCount,
        });
      } else {
        const meetingId = `mtg-${Date.now()}`;
        createdMtg = await api.createTeamMeeting({
          title: data.title,
          dateTime: data.dateTime || 'Today',
          type: data.type || 'Team Discussion',
          location: data.location || 'In-App Video Room',
          attendeesCount: data.attendeesCount ?? (data.invitedMemberName ? 2 : teamMembers.length),
          agenda: data.agenda || '',
          status: data.status || 'UPCOMING',
          meetingLink: data.meetingLink || `https://meet.tradenexus.io/room/${meetingId}`,
          invitedMemberName: data.invitedMemberName,
          targetAudience: data.targetAudience || (data.invitedMemberName ? 'INDIVIDUAL' : 'ALL'),
          targetTeam: data.targetTeam,
          targetEmployeeId: data.targetEmployeeId,
          createdByRole: data.createdByRole || currentRole,
          priority: data.priority || 'NORMAL',
          includeAdmin: data.includeAdmin ? 1 : 0,
          useZoom: false,
        });
      }

      setTeamMeetings(prev => [createdMtg, ...prev.filter(m => m.id !== createdMtg.id)]);
      triggerToast(`✓ Meeting "${data.title}" scheduled`);
      return createdMtg;
    } catch (err) {
      console.warn('API create meeting error:', err);
      const meetingId = `mtg-${Date.now()}`;
      const fallbackMtg: TeamMeeting = {
        id: meetingId,
        title: data.title,
        dateTime: data.dateTime || 'Today',
        type: data.type || 'Team Discussion',
        location: data.location || 'Zoom Video Meeting',
        attendeesCount: data.attendeesCount ?? (data.invitedMemberName ? 2 : teamMembers.length),
        agenda: data.agenda || '',
        status: data.status || 'UPCOMING',
        meetingLink: data.meetingLink || `https://meet.tradenexus.io/room/${meetingId}`,
        invitedMemberName: data.invitedMemberName,
        targetAudience: data.targetAudience || (data.invitedMemberName ? 'INDIVIDUAL' : 'ALL'),
        targetTeam: data.targetTeam,
        targetEmployeeId: data.targetEmployeeId,
        createdByRole: data.createdByRole || currentRole,
        priority: data.priority || 'NORMAL',
        includeAdmin: data.includeAdmin ? 1 : 0,
      };
      setTeamMeetings(prev => [fallbackMtg, ...prev]);
      triggerToast(`✓ Meeting "${data.title}" scheduled`);
      return fallbackMtg;
    }
  };

  const updateTeamMeeting = async (id: string, updates: Partial<TeamMeeting>) => {
    setTeamMeetings(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    try {
      await api.updateTeamMeeting(id, updates);
    } catch (err) {
      console.warn('API update meeting error:', err);
    }
  };

  const deleteTeamMeeting = async (id: string) => {
    setTeamMeetings(prev => prev.filter(m => m.id !== id));
    triggerToast('✓ Meeting cancelled');
    try {
      await api.deleteTeamMeeting(id);
    } catch (err) {
      console.warn('API delete meeting error:', err);
    }
  };

  const normalizeMeetingUrl = (mtg: TeamMeeting, role: string): string | null => {
    // Only Super Admin gets the official zoomStartUrl (which assumes the corporate host identity "Trade nexus Trade smart").
    // All other roles (HR, Team Leader, Telecaller/Employee) MUST receive zoomJoinUrl so they appear under their individual names.
    const isSuperAdmin = role === 'admin';

    let url = (isSuperAdmin && mtg.zoomStartUrl)
      ? mtg.zoomStartUrl
      : (mtg.zoomJoinUrl || mtg.meetingLink || '');

    // Determine the participant's display name for Zoom
    const userDisplayName = isSuperAdmin
      ? 'Trade nexus Trade smart'
      : (profile?.name?.trim() || (role === 'hr' ? 'HR Manager' : role === 'team_leader' ? 'Team Leader' : 'Employee'));

    if (typeof url === 'string' && url.trim()) {
      url = url.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      try {
        const parsed = new URL(url);
        // Only append display name parameters to join URLs (not start URLs with zak tokens)
        if (!url.includes('/s/') && !url.includes('zak=')) {
          parsed.searchParams.set('uname', userDisplayName);
          parsed.searchParams.set('un', userDisplayName);
        }
        return parsed.toString();
      } catch {
        // Fall back to ID parsing if URL format failed
      }
    }

    if (mtg.zoomMeetingId) {
      const cleanId = String(mtg.zoomMeetingId).replace(/\D/g, '');
      if (cleanId.length >= 8) {
        const passParam = mtg.zoomPassword ? `?pwd=${encodeURIComponent(mtg.zoomPassword)}` : '';
        const nameParam = `&uname=${encodeURIComponent(userDisplayName)}&un=${encodeURIComponent(userDisplayName)}`;
        return passParam 
          ? `https://zoom.us/j/${cleanId}${passParam}${nameParam}`
          : `https://zoom.us/j/${cleanId}?uname=${encodeURIComponent(userDisplayName)}&un=${encodeURIComponent(userDisplayName)}`;
      }
    }

    return null;
  };

  const joinMeeting = (mtg: TeamMeeting) => {
    setActiveMeetingRoom(mtg);

    // Only actual meeting host or Admin may transition an upcoming meeting to LIVE
    const isActualHost = Boolean(
      (mtg.hostEmpCode && profile?.empCode && mtg.hostEmpCode.trim().toLowerCase() === profile.empCode.trim().toLowerCase()) ||
      (mtg.hostName && profile?.name && mtg.hostName.trim().toLowerCase() === profile.name.trim().toLowerCase()) ||
      (currentRole === 'admin')
    );

    if (mtg.status !== 'LIVE' && isActualHost) {
      updateTeamMeeting(mtg.id, { status: 'LIVE' });
    }

    const zoomUrl = normalizeMeetingUrl(mtg, currentRole);

    if (zoomUrl) {
      const win = window.open(zoomUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        window.location.assign(zoomUrl);
      }
      triggerToast('🚀 Launching Zoom Video Meeting...');
    } else {
      setIsLiveRoomOpen(true);
    }
  };

  const leaveMeeting = () => {
    const isActualHost = activeMeetingRoom ? Boolean(
      (activeMeetingRoom.hostEmpCode && profile?.empCode && activeMeetingRoom.hostEmpCode.trim().toLowerCase() === profile.empCode.trim().toLowerCase()) ||
      (activeMeetingRoom.hostName && profile?.name && activeMeetingRoom.hostName.trim().toLowerCase() === profile.name.trim().toLowerCase()) ||
      (currentRole === 'admin')
    ) : false;

    if (isActualHost && activeMeetingRoom) {
      updateTeamMeeting(activeMeetingRoom.id, { status: 'COMPLETED' });
      triggerToast('✓ Meeting concluded and saved');
    } else {
      triggerToast('Left video meeting room');
    }
    setIsLiveRoomOpen(false);
    setActiveMeetingRoom(null);
  };

  // HR Actions
  const scheduleInterview = async (data: { candidateName: string; roleApplied: string; experience: string; email: string; phone: string; interviewTime: string; interviewer: string }) => {
    const newCandidate: CandidateInterview = {
      id: `cand-${Date.now()}`,
      candidateName: data.candidateName,
      roleApplied: data.roleApplied,
      experience: data.experience,
      email: data.email,
      phone: data.phone,
      status: 'INTERVIEW_SCHEDULED',
      interviewTime: data.interviewTime,
      interviewer: data.interviewer,
    };
    setCandidates(prev => [newCandidate, ...prev]);
    triggerToast(`✓ Interview scheduled for ${data.candidateName}`);

    try {
      await api.createInterview(newCandidate);
    } catch (err) {
      console.warn('API create candidate interview error:', err);
    }
  };

  const updateCandidateStatus = async (candidateId: string, status: CandidateInterview['status'], notes?: string) => {
    setCandidates(prev => prev.map(c => {
      if (c.id === candidateId) {
        const updated: CandidateInterview = { ...c, status, notes: notes || c.notes };
        api.updateInterview(candidateId, updated).catch(console.warn);
        return updated;
      }
      return c;
    }));
    triggerToast(`✓ Candidate status updated to: ${status.replace('_', ' ')}`);
  };

  const toggleOnboardingChecklist = async (employeeId: string, itemKey: keyof OnboardingEmployee['checklist']) => {
    setOnboardingList(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const updatedChecklist = { ...emp.checklist, [itemKey]: !emp.checklist[itemKey] };
        const allCompleted = Object.values(updatedChecklist).every(Boolean);
        const updated: OnboardingEmployee = { 
          ...emp, 
          checklist: updatedChecklist,
          status: allCompleted ? 'COMPLETED' : 'IN_PROGRESS'
        };
        api.updateOnboarding(employeeId, updated).catch(console.warn);
        return updated;
      }
      return emp;
    }));
    triggerToast('✓ Onboarding checklist updated');
  };

  const toggleExitChecklist = async (employeeId: string, itemKey: keyof ExitEmployee['checklist']) => {
    setExitList(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const updatedChecklist = { ...emp.checklist, [itemKey]: !emp.checklist[itemKey] };
        const allCompleted = Object.values(updatedChecklist).every(Boolean);
        const updated: ExitEmployee = { 
          ...emp, 
          checklist: updatedChecklist,
          status: allCompleted ? 'RELIEVED' : 'CLEARANCE_PENDING'
        };
        api.updateExitEmployee(employeeId, updated).catch(console.warn);
        return updated;
      }
      return emp;
    }));
    triggerToast('✓ Exit clearance updated');
  };

  const verifyPayment = async (paymentId: string, status: 'VERIFIED' | 'REJECTED') => {
    const targetPayment = paymentVerifications.find((p) => p.id === paymentId);
    if (!targetPayment) return;
    const oldStatus = targetPayment.status;
    if (oldStatus === status) return; // Prevent double crediting or redundant execution

    const updatedPayment: PaymentVerificationItem = { ...targetPayment, status };
    setPaymentVerifications((prev) => prev.map((p) => (p.id === paymentId ? updatedPayment : p)));

    const amount = targetPayment.dealAmount || 0;
    const telecallerName = targetPayment.telecallerName || '';

    if (status === 'VERIFIED' && oldStatus !== 'VERIFIED') {
      let matchedGroupName = '';
      setTeamMembers((prev) =>
        prev.map((m) => {
          if (m.name.toLowerCase() === telecallerName.toLowerCase()) {
            matchedGroupName = m.group;
            return { ...m, salesAchieved: (m.salesAchieved || 0) + amount };
          }
          return m;
        })
      );

      if (matchedGroupName) {
        setTeamGroups((prev) =>
          prev.map((g) => {
            if (g.name.toLowerCase() === matchedGroupName.toLowerCase()) {
              return { ...g, achieved: (g.achieved || 0) + amount };
            }
            return g;
          })
        );
      }

      if (profile.name.toLowerCase() === telecallerName.toLowerCase()) {
        setStats((prev) => ({
          ...prev,
          monthlySalesAchieved: (prev.monthlySalesAchieved || 0) + amount,
        }));
      }
    } else if (status === 'REJECTED' && oldStatus === 'VERIFIED') {
      let matchedGroupName = '';
      setTeamMembers((prev) =>
        prev.map((m) => {
          if (m.name.toLowerCase() === telecallerName.toLowerCase()) {
            matchedGroupName = m.group;
            return { ...m, salesAchieved: Math.max(0, (m.salesAchieved || 0) - amount) };
          }
          return m;
        })
      );

      if (matchedGroupName) {
        setTeamGroups((prev) =>
          prev.map((g) => {
            if (g.name.toLowerCase() === matchedGroupName.toLowerCase()) {
              return { ...g, achieved: Math.max(0, (g.achieved || 0) - amount) };
            }
            return g;
          })
        );
      }

      if (profile.name.toLowerCase() === telecallerName.toLowerCase()) {
        setStats((prev) => ({
          ...prev,
          monthlySalesAchieved: Math.max(0, (prev.monthlySalesAchieved || 0) - amount),
        }));
      }
    }

    try {
      await api.updatePayment(paymentId, updatedPayment);
      refreshResources(['paymentVerifications', 'teamMembers', 'teamGroups', 'stats']);
    } catch (err) {
      console.warn('verifyPayment API sync error:', err);
    }

    triggerToast(`✓ Payment ${status === 'VERIFIED' ? 'Approved & Verified' : 'Rejected'}`);
  };

  const generateBulkPayslips = async (month: string, year: string, employeeIds?: string[]) => {
    try {
      const generated = await api.generateBulkPayslips(month, year, employeeIds);
      const generatedList = Array.isArray(generated) ? generated : [generated];
      
      const monthOrder: Record<string, number> = {
        january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
        april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
        august: 8, aug: 8, september: 9, sep: 9, october: 10, oct: 10,
        november: 11, nov: 11, december: 12, dec: 12
      };

      setPayslips(prev => {
        const generatedIds = new Set(generatedList.map((g: any) => g.id));
        const filtered = prev.filter(p => !generatedIds.has(p.id));
        const combined = [...generatedList, ...filtered];
        combined.sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          const aM = monthOrder[a.month?.toLowerCase()] || 0;
          const bM = monthOrder[b.month?.toLowerCase()] || 0;
          return bM - aM;
        });
        return combined;
      });

      triggerToast(`✓ Generated ${month} ${year} payslips for ${generatedList.length} employee${generatedList.length === 1 ? '' : 's'}!`);
    } catch (err: any) {
      console.warn('API generate bulk payslips error:', err);
      triggerToast(`✗ Failed to generate payslips: ${err.message || 'Error'}`);
    }
  };

  const updatePayslip = async (id: string, updates: Partial<PayslipItem>) => {
    setPayslips(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    try {
      const updated = await api.updatePayslip(id, updates);
      if (updated) {
        setPayslips(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      }
      triggerToast(`✓ Payroll customized & saved successfully!`);
    } catch (err: any) {
      console.warn('API update payslip error:', err);
      triggerToast(`✗ Failed to save customized payroll: ${err.message || 'Error'}`);
    }
  };

  const deletePayslip = async (id: string) => {
    const target = payslips.find(p => p.id === id);
    setPayslips(prev => prev.filter(p => p.id !== id));
    try {
      await api.deletePayslip(id);
      triggerToast(`✓ Payslip for ${target?.employeeName || target?.month || 'employee'} deleted`);
    } catch (err: any) {
      console.warn('API delete payslip error:', err);
      if (target) setPayslips(prev => [target, ...prev]);
      triggerToast('✗ Failed to delete payslip');
    }
  };

  const upsertPayslipLocal = (p: PayslipItem) => {
    setPayslips(prev => {
      const exists = prev.some(x => x.id === p.id);
      return exists ? prev.map(x => (x.id === p.id ? { ...x, ...p } : x)) : [p, ...prev];
    });
  };

  const savePayrollDraft = async (
    data: Partial<PayslipItem>,
    opts: { id?: string; confirmRevision?: boolean } = {}
  ): Promise<PayslipItem> => {
    const saved = opts.id
      ? await api.updatePayslip(opts.id, { ...data, confirmRevision: opts.confirmRevision })
      : await api.savePayrollDraft(data);
    upsertPayslipLocal(saved);
    return saved;
  };

  const dispatchPayroll = async (id: string, opts: { resend?: boolean } = {}) => {
    const result = await api.dispatchPayslip(id, opts);
    if (result?.payslip) upsertPayslipLocal(result.payslip);
    return result;
  };

  const myPayslips = useMemo(() => {
    const ownIds = [currentUser?.employeeId, currentUser?.id, profile.id].filter(Boolean) as string[];
    const ownCode = currentUser?.empCode || profile.empCode;
    return payslips.filter(p =>
      p.payrollStatus === 'DISPATCHED' &&
      ((p.employeeId && ownIds.includes(p.employeeId)) || (!!ownCode && (p.empCode === ownCode || p.employeeCode === ownCode)))
    );
  }, [payslips, currentUser, profile.id, profile.empCode]);

  const logNewCall = async (data: {
    clientName: string;
    companyName: string;
    phoneNumber: string;
    outcome: CallOutcome;
    durationSec: number;
    notes: string;
    followUpDate?: string;
  }) => {
    const newCallItem: CallLogItem = {
      id: `log-${Date.now()}`,
      clientName: data.clientName,
      companyName: data.companyName,
      phoneNumber: data.phoneNumber,
      outcome: data.outcome,
      durationSec: data.durationSec,
      notes: data.notes,
      followUpDate: data.followUpDate,
      timestamp: 'Just now',
      date: getTodayDateIST(),
      createdAt: new Date().toISOString(),
    };

    setCallLogs((prev) => [newCallItem, ...prev]);

    const isConnected = data.outcome !== 'BUSY';
    const isInterested = data.outcome === 'INTERESTED' || data.outcome === 'DEAL_CLOSED';
    const isRejected = data.outcome === 'NOT_INTERESTED';

    const updatedStats: TelecallerStats = {
      ...stats,
      dialsMade: stats.dialsMade + 1,
      connected: isConnected ? stats.connected + 1 : stats.connected,
      interested: isInterested ? stats.interested + 1 : stats.interested,
      rejected: isRejected ? stats.rejected + 1 : stats.rejected,
    };

    setStats(updatedStats);
    triggerToast(`✓ Call logged for ${data.clientName} (${data.outcome.replace('_', ' ')})`);

    try {
      await Promise.all([
        api.createCallLog(newCallItem),
        api.updateStats(updatedStats)
      ]);
    } catch (err) {
      console.warn('API log new call error:', err);
    }
  };

  const submitLeaveRequest = async (data: {
    leaveType: 'Casual Leave' | 'Sick Leave' | 'Earned / Paid Leave';
    fromDate: string;
    toDate: string;
    totalDays: number;
    reason: string;
  }) => {
    // Determine initial approval stage based on employee role
    const empRole = currentRole as LeaveRequest['employeeRole'];
    let initialStage: LeaveRequest['approvalStage'];
    let toastMsg: string;
    if (currentRole === 'hr') {
      initialStage = 'PENDING_ADMIN';
      toastMsg = `✓ Leave request submitted for Admin approval (${data.totalDays} Days)`;
    } else if (currentRole === 'team_leader') {
      initialStage = 'PENDING_HR';
      toastMsg = `✓ Leave request submitted to HR (${data.totalDays} Days)`;
    } else {
      // telecaller / default
      initialStage = 'PENDING_TEAM_LEADER';
      toastMsg = `✓ Leave request submitted to Team Leader (${data.totalDays} Days)`;
    }

    const newLeave: LeaveRequest = {
      id: `lv-${Date.now()}`,
      employeeName: profile.name,
      employeeCode: profile.empCode,
      employeeId: currentUser?.employeeId || currentUser?.id || profile.id,
      employeeRole: empRole,
      teamName: profile.teamName || (profile as any).team || (currentUser as any)?.group || (currentUser as any)?.groupName || (teamMembers.find(m => m.id === profile.id || m.empCode === profile.empCode)?.group) || '',
      leaveType: data.leaveType,
      fromDate: data.fromDate,
      toDate: data.toDate,
      totalDays: data.totalDays,
      reason: data.reason,
      status: 'PENDING',
      approvalStage: initialStage,
      appliedOn: `Today, ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    };

    setLeaveRequests((prev) => [newLeave, ...prev]);
    const updatedProfile: EmployeeProfile = {
      ...profile,
      totalLeaveBalance: Math.max(0, profile.totalLeaveBalance - data.totalDays),
    };
    setProfile(updatedProfile);

    triggerToast(toastMsg);

    try {
      // Server deducts the applicant's balance atomically on create
      await api.createLeave(newLeave);
    } catch (err) {
      console.warn('API leave submit error:', err);
    }
  };

  const recordCheckIn = async (data: {
    photo: string | null;
    latitude: number | null;
    longitude: number | null;
  }) => {
    const now = new Date();
    const timeStr = getCurrentTimeIST();
    const today = getTodayDateIST();
    const empId = currentUser?.employeeId || currentUser?.id || profile.id || 'emp-self';
    const empName = currentUser?.name || profile.name || 'Employee';
    const recordId = `att-${today}-${empId}`;

    const calculatedStatus = computeAttendanceStatus(timeStr);

    try {
      const rec = await api.recordAttendance({
        id: recordId,
        employeeId: empId,
        employeeName: empName,
        date: today,
        dayNumber: now.getDate(),
        status: calculatedStatus,
        checkIn: timeStr,
        workHours: 'In Progress',
        method: 'Face ID Biometric',
        checkInPhoto: data.photo,
        latitude: data.latitude,
        longitude: data.longitude,
      } as any);

      const updatedProfile: EmployeeProfile = {
        ...profile,
        id: empId,
        name: empName,
        faceIdStatus: 'VERIFIED_PRESENT',
        checkInTime: timeStr,
        checkOutTime: undefined,
        // Clear any dispute on successful re-punch
        disputedByAdmin: false,
        disputeReason: null,
      };
      setProfile(updatedProfile);

      const finalRecId = (rec as any)?.id || recordId;
      const resolvedStatus = (rec as any)?.status || calculatedStatus;
      setAttendanceLogs((prev) => [
        {
          id: finalRecId,
          employeeId: empId,
          employeeName: empName,
          date: today,
          dayNumber: now.getDate(),
          status: resolvedStatus,
          checkIn: timeStr,
          checkOut: undefined,
          workHours: 'In Progress',
          method: 'Face ID Biometric',
          checkInPhoto: data.photo ?? undefined,
          checkOutPhoto: undefined,
          checkInLat: data.latitude ?? undefined,
          checkInLng: data.longitude ?? undefined,
          locationStatus: (rec as any)?.locationStatus || (data.latitude == null ? 'NOT_SHARED' : 'AT_OFFICE'),
          disputedByAdmin: false,
          disputeReason: undefined,
        },
        ...prev.filter((item) => !(item.date === today && (item.employeeId === empId || item.id === finalRecId))),
      ]);

      setTeamMembers((prev) =>
        prev.map((m) => {
          if (m.id === empId || m.empCode === empId || m.name.toLowerCase() === empName.toLowerCase()) {
            return { ...m, attendanceStatus: resolvedStatus, checkInTime: timeStr, checkInMethod: 'Face ID Biometric' as const };
          }
          return m;
        })
      );

      triggerToast(`✓ Checked in at ${timeStr}`);
      await api.updateProfile(updatedProfile).catch(() => {});
      // Refresh from server so Admin Photo Audit panel updates with the new photo
      refreshResources(['attendanceLogs']).catch(() => {});
    } catch (err: any) {
      const msg = err.message || 'Check-in failed';
      triggerToast(`✗ ${msg}`);
      throw err;
    }
  };

  const recordCheckOut = async (data: {
    photo: string | null;
    latitude: number | null;
    longitude: number | null;
  }) => {
    const now = new Date();
    const timeStr = getCurrentTimeIST();
    const today = getTodayDateIST();
    const empId = currentUser?.employeeId || currentUser?.id || profile.id || 'emp-self';
    const recordId = `att-${today}-${empId}`;

    const updatedProfile: EmployeeProfile = { 
      ...profile, 
      faceIdStatus: 'ON_BREAK',
      checkOutTime: timeStr 
    };
    setProfile(updatedProfile);

    setAttendanceLogs((prev) => {
      const exists = prev.some((a) =>
        a.id === recordId || (a.employeeId === empId && a.date === today) || (a.employeeName && profile.name && a.employeeName.toLowerCase() === profile.name.toLowerCase() && a.date === today)
      );
      if (exists) {
        return prev.map((a) =>
          (a.id === recordId || (a.employeeId === empId && a.date === today) || (a.employeeName && profile.name && a.employeeName.toLowerCase() === profile.name.toLowerCase() && a.date === today))
            ? {
                ...a,
                checkOut: timeStr,
                checkOutPhoto: data.photo,
                checkOutLocationStatus: 'AT_OFFICE',
              }
            : a
        );
      }
      return [
        {
          id: recordId,
          date: today,
          dayNumber: now.getDate(),
          status: 'PRESENT',
          checkIn: profile.checkInTime || timeStr,
          checkOut: timeStr,
          checkOutPhoto: data.photo,
          employeeId: empId,
          employeeName: profile.name,
          locationStatus: 'AT_OFFICE',
          checkOutLocationStatus: 'AT_OFFICE',
          workHours: 'In Progress',
        } as any,
        ...prev,
      ];
    });

    triggerToast(`✓ Checked out at ${timeStr}`);

    try {
      await api.updateAttendance(recordId, {
        checkOut: timeStr,
        checkOutPhoto: data.photo,
        latitude: data.latitude,
        longitude: data.longitude,
        employeeId: empId,
        employeeName: profile.name,
        date: today,
      } as any);
      await api.updateProfile(updatedProfile);
    } catch (err) {
      console.warn('Check-out save failed:', err);
    }
  };

  const clearAttendanceRecords = async (params?: { date?: string; startDate?: string; endDate?: string; month?: string; year?: string; all?: boolean }) => {
    try {
      const res = await api.clearAttendanceRecords(params);
      setAttendanceLogs((prev) => {
        if (params?.all) return [];
        if (params?.date) return prev.filter((r) => r.date !== params.date);
        if (params?.startDate && params?.endDate) {
          return prev.filter((r) => r.date < params.startDate! || r.date > params.endDate!);
        }
        if (params?.month && params?.year) {
          const prefix = `${params.year}-${String(params.month).padStart(2, '0')}`;
          return prev.filter((r) => !r.date.startsWith(prefix));
        }
        const today = getTodayDateIST();
        return prev.filter((r) => r.date !== today);
      });
      triggerToast(res?.message || '✓ Attendance records cleared successfully');
    } catch (err) {
      console.warn('Failed to clear attendance records:', err);
      triggerToast('✗ Failed to clear attendance records');
    }
  };

  const deleteAttendanceRecord = async (id: string) => {
    try {
      await api.deleteAttendanceRecord(id);
      setAttendanceLogs((prev) => prev.filter((r) => r.id !== id));
      triggerToast('✓ Attendance record deleted');
    } catch (err) {
      console.warn('Failed to delete attendance record:', err);
      triggerToast('✗ Failed to delete record');
    }
  };

  const disputeAttendanceRecord = async (recordId: string, employeeId: string, reason: string) => {
    setAttendanceLogs(prev => prev.map(rec => {
      if (rec.id === recordId || (rec.employeeId === employeeId && rec.date === getTodayDateIST())) {
        return {
          ...rec,
          status: 'ABSENT',
          disputedByAdmin: true,
          disputeReason: reason,
        };
      }
      return rec;
    }));

    setTeamMembers(prev => prev.map(m => (m.id === employeeId || m.empCode === employeeId) ? { ...m, attendanceStatus: 'ABSENT' } : m));

    if (currentUser?.employeeId === employeeId || currentUser?.id === employeeId || profile.id === employeeId) {
      setProfile(p => ({
        ...p,
        faceIdStatus: 'NOT_CHECKED_IN' as const,
        checkInTime: '',
        disputedByAdmin: true,
        disputeReason: reason,
      }));
    }

    triggerToast(`✓ Attendance marked as Suspicious & Flagged`);
    try {
      await api.updateAttendance(recordId, {
        status: 'ABSENT',
        disputedByAdmin: true,
        disputeReason: reason,
        employeeId,
      });
    } catch (err) {
      console.warn('API update attendance dispute error:', err);
    }
  };

  const verifyAttendanceRecord = async (recordId: string, employeeId: string) => {
    setAttendanceLogs(prev => prev.map(rec => {
      if (rec.id === recordId) {
        return {
          ...rec,
          status: 'PRESENT',
          disputedByAdmin: false,
          disputeReason: null,
        };
      }
      return rec;
    }));

    setTeamMembers(prev => prev.map(m => (m.id === employeeId || m.empCode === employeeId) ? { ...m, attendanceStatus: 'PRESENT' } : m));

    if (currentUser?.employeeId === employeeId || currentUser?.id === employeeId || profile.id === employeeId) {
      setProfile(p => ({
        ...p,
        faceIdStatus: 'VERIFIED_PRESENT' as const,
        disputedByAdmin: false,
        disputeReason: null,
      }));
    }

    triggerToast(`✓ Attendance marked PRESENT & verified`);
    try {
      await api.updateAttendance(recordId, {
        status: 'PRESENT',
        disputedByAdmin: false,
        disputeReason: null,
        employeeId,
      });
    } catch (err) {
      console.warn('API verify attendance error:', err);
    }
  };

  const simulateFaceIdCheckIn = () => {
    verifyFaceAttendance();
    triggerToast(`✓ Face ID Biometric Verified! Check-in recorded.`);
  };

  const simulateFaceIdCheckOut = async () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const updatedProfile: EmployeeProfile = {
      ...profile,
      faceIdStatus: 'ON_BREAK',
    };
    setProfile(updatedProfile);

    triggerToast(`✓ Biometric Check-out recorded at ${timeStr}`);

    try {
      await api.updateProfile(updatedProfile);
    } catch (err) {
      console.warn('API checkout error:', err);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        activeTab,
        setActiveTab,
        clientPipelineTab,
        setClientPipelineTab,
        deviceMode,
        setDeviceMode,
        profile,
        stats,
        callLogs,
        clients,
        attendanceLogs,
        leaveRequests,
        payslips,
        assignedLeads,
        myLeads,
        leadBatches,
        importAndAssignLeads,
        updateAssignedLeadStatus,
        faceProfiles,
        registerFaceBiometric,
        verifyFaceAttendance,
        createNewEmployee,
        loginEmployee,
        updateEmployee,
        batchUpdateTargets,
        setEmployeeActive,
        deleteEmployee,
        teamMembers,
        teamGroups,
        teamTasks,
        teamMeetings,
        candidates,
        onboardingList,
        exitList,
        paymentVerifications,
        approveLeaveRequest,
        rejectLeaveRequest,
        reassignLead,
        deleteAssignedLead,
        deletePaymentVerification,
        reassignLeadsBetween,
        autoDistributeFreshLeads,
        createTeamGroup,
        updateTeamGroup,
        deleteTeamGroup,
        assignTeamLeaderToGroup,
        createTeamTask,
        toggleTaskStatus,
        scheduleTeamMeeting,
        updateTeamMeeting,
        deleteTeamMeeting,
        isLiveRoomOpen,
        setIsLiveRoomOpen,
        activeMeetingRoom,
        setActiveMeetingRoom,
        joinMeeting,
        leaveMeeting,
        scheduleInterview,
        updateCandidateStatus,
        toggleOnboardingChecklist,
        toggleExitChecklist,
        verifyPayment,
        generateBulkPayslips,
        updatePayslip,
        deletePayslip,
        savePayrollDraft,
        dispatchPayroll,
        myPayslips,
        weeklyOffDays,
        setWeeklyOffDays,
        toggleWeeklyOffDay,
        calendarSettings,
        updateCalendarSettings,
        reEvaluateTodayAttendance,
        companyHolidays,
        addCompanyHoliday,
        deleteCompanyHoliday,
        loadPresetHolidays,
        clearAllHolidays,
        currentUser,
        setCurrentUser,
        authStep,
        setAuthStep,
        logout,
        isFaceIdModalOpen,
        setIsFaceIdModalOpen,
        faceIdModalMode,
        setFaceIdModalMode,
        openPunchIn,
        openPunchOut,
        isFaceRegistrationModalOpen,
        setIsFaceRegistrationModalOpen,
        faceRegistrationEmployee,
        setFaceRegistrationEmployee,
        isExcelUploadModalOpen,
        setIsExcelUploadModalOpen,
        isQuickCallModalOpen,
        setIsQuickCallModalOpen,
        activeCallingLead,
        setActiveCallingLead,
        openCallModalForLead,
        isLeaveModalOpen,
        setIsLeaveModalOpen,
        isIdCardModalOpen,
        setIsIdCardModalOpen,
        selectedIdCardEmpId,
        setSelectedIdCardEmpId,
        selectedPayslip,
        setSelectedPayslip,
        isPayslipModalOpen,
        setIsPayslipModalOpen,
        isRecentPayslipsModalOpen,
        setIsRecentPayslipsModalOpen,
        openPayslipModal,
        offerLetters,
        selectedOfferLetter,
        setSelectedOfferLetter,
        isOfferLetterModalOpen,
        setIsOfferLetterModalOpen,
        isGenerateOfferLetterModalOpen,
        setIsGenerateOfferLetterModalOpen,
        generateOfferLetter,
        updateOfferLetter,
        deleteOfferLetter,
        openOfferLetterModal,
        openGenerateOfferLetterModal,
        experienceCerts,
        selectedExperienceCert,
        setSelectedExperienceCert,
        selectedExperienceCertEmpId,
        setSelectedExperienceCertEmpId,
        isExperienceCertModalOpen,
        setIsExperienceCertModalOpen,
        isGenerateExperienceCertModalOpen,
        setIsGenerateExperienceCertModalOpen,
        generateExperienceCert,
        deleteExperienceCert,
        openExperienceCertModal,
        openGenerateExperienceCertModal,
        relievingLetters,
        selectedRelievingLetter,
        setSelectedRelievingLetter,
        isRelievingLetterModalOpen,
        setIsRelievingLetterModalOpen,
        isGenerateRelievingLetterModalOpen,
        setIsGenerateRelievingLetterModalOpen,
        generateRelievingLetter,
        deleteRelievingLetter,
        openRelievingLetterModal,
        openGenerateRelievingLetterModal,
        invoices,
        selectedInvoice,
        setSelectedInvoice,
        isInvoiceModalOpen,
        setIsInvoiceModalOpen,
        isGenerateInvoiceModalOpen,
        setIsGenerateInvoiceModalOpen,
        generateInvoice,
        openInvoiceModal,
        openGenerateInvoiceModal,
        resendInvoiceEmail,
        updateInvoiceStatus,
        updateInvoice,
        sendPayslipEmailToEmployee,
        sendRelievingLetterEmailToEmployee,
        sendExperienceCertEmailToEmployee,
        sendIdCardEmailToEmployee,
        sendOnboardingEmailToEmployee,
        updateEmployeeAvatar,
        isDataLoading,
        backendError,
        resourceStatus,
        loadResources,
        refreshResources,
        invalidateAll,
        isRefreshing,
        refreshAllData,
        activeToast,
        triggerToast,
        logNewCall,
        submitLeaveRequest,
        simulateFaceIdCheckIn,
        simulateFaceIdCheckOut,
        recordCheckIn,
        recordCheckOut,
        disputeAttendanceRecord,
        verifyAttendanceRecord,
        clearAttendanceRecords,
        deleteAttendanceRecord,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
