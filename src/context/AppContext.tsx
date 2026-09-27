import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
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
    followUpDate?: string
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
  /** Move a telecaller's leads to someone else, optionally limited to a count. */
  reassignLeadsBetween: (fromEmployeeId: string, toEmployeeId: string, limit?: number) => Promise<void>;
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

  // Company Calendar & Holidays (Hierarchy-wide)
  weeklyOffDays: number[];
  setWeeklyOffDays: (days: number[]) => void;
  toggleWeeklyOffDay: (dayIndex: number) => void;
  calendarSettings: CalendarSettings;
  updateCalendarSettings: (settings: Partial<CalendarSettings>) => Promise<void>;
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
  generateOfferLetter: (data: Omit<OfferLetterData, 'id' | 'issuedDate'>) => Promise<void>;
  openOfferLetterModal: (letter?: OfferLetterData) => void;
  openGenerateOfferLetterModal: () => void;

  experienceCerts: ExperienceCertData[];
  selectedExperienceCert: ExperienceCertData | null;
  setSelectedExperienceCert: (cert: ExperienceCertData | null) => void;
  isExperienceCertModalOpen: boolean;
  setIsExperienceCertModalOpen: (open: boolean) => void;
  isGenerateExperienceCertModalOpen: boolean;
  setIsGenerateExperienceCertModalOpen: (open: boolean) => void;
  generateExperienceCert: (data: Omit<ExperienceCertData, 'id' | 'issuedDate'> & { issuedDate?: string }) => void;
  openExperienceCertModal: (cert?: ExperienceCertData) => void;
  openGenerateExperienceCertModal: (empId?: string) => void;

  relievingLetters: RelievingLetterData[];
  selectedRelievingLetter: RelievingLetterData | null;
  setSelectedRelievingLetter: (letter: RelievingLetterData | null) => void;
  isRelievingLetterModalOpen: boolean;
  setIsRelievingLetterModalOpen: (open: boolean) => void;
  isGenerateRelievingLetterModalOpen: boolean;
  setIsGenerateRelievingLetterModalOpen: (open: boolean) => void;
  generateRelievingLetter: (data: Omit<RelievingLetterData, 'id' | 'issuedDate'> & { issuedDate?: string }) => void;
  openRelievingLetterModal: (letter?: RelievingLetterData) => void;
  openGenerateRelievingLetterModal: (empId?: string) => void;

  invoices: InvoiceData[];
  selectedInvoice: InvoiceData | null;
  setSelectedInvoice: (invoice: InvoiceData | null) => void;
  isInvoiceModalOpen: boolean;
  setIsInvoiceModalOpen: (open: boolean) => void;
  isGenerateInvoiceModalOpen: boolean;
  setIsGenerateInvoiceModalOpen: (open: boolean) => void;
  generateInvoice: (data: Omit<InvoiceData, 'id'>) => void;
  openInvoiceModal: (invoice?: InvoiceData) => void;
  openGenerateInvoiceModal: () => void;

  updateEmployeeAvatar: (empId: string, photoDataUrl: string) => void;
  
  // Backend connection status & on-demand loading
  isDataLoading: boolean;
  backendError: string | null;
  resourceStatus: Record<ResourceKey, ResourceStatus>;
  loadResources: (keys: readonly ResourceKey[], options?: { force?: boolean }) => Promise<void>;
  refreshResources: (keys: readonly ResourceKey[]) => Promise<void>;
  invalidateAll: () => void;

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
  const [clientPipelineTab, setClientPipelineTab] = useState<'TO_CALL' | 'CALLBACK' | 'INTERESTED' | 'WON' | 'BUSY' | 'NOT_INTERESTED' | 'ALL'>('TO_CALL');
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

  // Experience Certificates State
  const [experienceCerts, setExperienceCerts] = useState<ExperienceCertData[]>(INITIAL_EXPERIENCE_CERTS);
  const [selectedExperienceCert, setSelectedExperienceCert] = useState<ExperienceCertData | null>(null);
  const [isExperienceCertModalOpen, setIsExperienceCertModalOpen] = useState(false);

  // Relieving Letters State
  const [relievingLetters, setRelievingLetters] = useState<RelievingLetterData[]>(INITIAL_RELIEVING_LETTERS);
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

  const updateCalendarSettings = async (settings: Partial<CalendarSettings>) => {
    setCalendarSettingsState(prev => ({ ...prev, ...settings }));
    if (settings.weeklyOffDays) {
      setWeeklyOffDaysState(settings.weeklyOffDays);
    }
    try {
      const updated = await api.updateCalendarSettings(settings);
      setCalendarSettingsState(updated);
      if (updated.weeklyOffDays) setWeeklyOffDaysState(updated.weeklyOffDays);
      triggerToast('✓ Shift timings & attendance policies saved to database');
    } catch {
      triggerToast('✓ Updated calendar policies');
    }
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
    if (empId) setSelectedIdCardEmpId(empId);
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
    } else {
      const defaultCert: ExperienceCertData = experienceCerts[0] || {
        id: `exp-${Date.now()}`,
        employeeName: profile.name || 'Amitabh',
        empCode: profile.empCode || 'TNX-001',
        guardianName: 'Sh. Heera Singh',
        designation: profile.roleTitle || 'Captain',
        department: profile.department || 'Client Acquisition',
        startDate: profile.joinDate || '26th May 2023',
        endDate: '03rd January 2025',
        refNumber: `TNX/EXP/${new Date().getFullYear()}/${profile.empCode || '001'}`,
        issuedDate: new Date().toLocaleDateString('en-GB'),
        conductRemarks: 'During his tenure, Mr. Amitabh performed his duties with sincerity, professionalism, and dedication. He was responsible for supervising restaurant & operations, ensuring high standards of customer service, coordinating with staff, and maintaining smooth day-to-day operations. His conduct and performance were satisfactory throughout his period of employment.',
        signatoryName: 'T. Vidhya Sagar',
        signatoryRole: 'Chief Executive Officer',
      };
      setSelectedExperienceCert(defaultCert);
    }
    setIsExperienceCertModalOpen(true);
  };

  const openRelievingLetterModal = (letter?: RelievingLetterData) => {
    if (letter) {
      setSelectedRelievingLetter(letter);
    } else {
      const defaultLetter: RelievingLetterData = relievingLetters[0] || {
        id: `rel-${Date.now()}`,
        employeeName: profile.name || 'Avery Davis',
        empCode: profile.empCode || 'TNX-042',
        designation: profile.roleTitle || 'Digital Marketing Specialist',
        department: profile.department || 'Marketing & Communications',
        employeeType: 'Full-Time',
        employeeAddress: '123 Business Avenue, Financial District, Your City, 500001',
        resignationDate: '15 July 2025',
        lastWorkingDate: '31 August 2025',
        joiningDate: profile.joinDate || '12 January 2024',
        issuedDate: new Date().toLocaleDateString('en-GB'),
        signatoryName: 'T .Vidhya Sagar',
        signatoryRole: 'Chief Executive Officer',
      };
      setSelectedRelievingLetter(defaultLetter);
    }
    setIsRelievingLetterModalOpen(true);
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
    paymentVerifications: setPaymentVerifications,
    companyHolidays: setCompanyHolidaysState,
    calendarSettings: (settings: CalendarSettings) => {
      setCalendarSettingsState(settings);
      if (settings?.weeklyOffDays) {
        setWeeklyOffDaysState(settings.weeklyOffDays);
      }
    },
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

  const fetchResource = useCallback(
    (key: ResourceKey): Promise<void> => {
      const existing = inFlight.current.get(key);
      if (existing) return existing;

      markStatus(key, 'loading');

      const request = RESOURCE_FETCHERS[key]()
        .then((value) => {
          if (value !== undefined && value !== null) setters.current[key](value);
          markStatus(key, 'loaded');
          setBackendError(null);
        })
        .catch((err) => {
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

  // Live real-time background sync for all 4 panels (Admin, TL, HR, Employee)
  // Keeps attendance, leads, team roster, calls, payments, leaves, and meetings perfectly synchronized
  useEffect(() => {
    if (authStep !== 'AUTHENTICATED') return;
    const syncAllPanels = () => {
      loadResources([
        'assignedLeads',
        'attendanceLogs',
        'teamMembers',
        'callLogs',
        'paymentVerifications',
        'leaveRequests',
        'teamMeetings'
      ], { force: true });
    };
    // Initial fetch immediately, then poll every 8 seconds
    syncAllPanels();
    const interval = setInterval(syncAllPanels, 8000);
    return () => clearInterval(interval);
  }, [authStep, loadResources]);




  // Synchronize profile attendance status strictly with today's attendance record
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
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
        const newStatus = isOut
          ? 'ON_BREAK'
          : todayRec.status === 'PRESENT'
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

  const triggerToast = useCallback((msg: string) => {
    setActiveToast(msg);
    setTimeout(() => {
      setActiveToast((prev) => (prev === msg ? null : prev));
    }, 3200);
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
      assignedDate: 'Today',
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
    followUpDate?: string
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
      updatedAt: nowIso,
    };

    // Optimistically update assignedLeads in state
    setAssignedLeads(prev => prev.map(lead => lead.id === leadId ? targetLead : lead));

    // Also log as call item
    const newCallItem: CallLogItem = {
      id: `call-${Date.now()}`,
      clientName: targetLead.name,
      companyName: targetLead.company,
      phoneNumber: targetLead.phone,
      durationSec: 180,
      outcome: status === 'CONVERTED' ? 'DEAL_CLOSED' : 
               status === 'INTERESTED' ? 'INTERESTED' : 
               status === 'CALLBACK' ? 'CALLBACK' : 
               status === 'NOT_INTERESTED' ? 'NOT_INTERESTED' : 'CONNECTED',
      notes: notes || `Call outcome updated to ${status}`,
      timestamp: 'Just now',
      date: nowIso.split('T')[0],
      createdAt: nowIso,
      followUpDate,
    };

    setCallLogs(prev => [newCallItem, ...prev]);

    // Update Telecaller Stats
    const updatedStats: TelecallerStats = {
      ...stats,
      dialsMade: stats.dialsMade + 1,
      connected: status !== 'NOT_INTERESTED' ? stats.connected + 1 : stats.connected,
      interested: (status === 'INTERESTED' || status === 'CONVERTED') ? stats.interested + 1 : stats.interested,
      rejected: status === 'NOT_INTERESTED' ? stats.rejected + 1 : stats.rejected,
      monthlySalesAchieved: status === 'CONVERTED' ? (stats.monthlySalesAchieved || 0) + dealAmountNum : stats.monthlySalesAchieved,
    };
    setStats(updatedStats);

    // Update Team Member record for TL and HR live visibility
    setTeamMembers(prev => prev.map(m => {
      const isTargetEmp =
        (m.id && m.id === targetLead.assignedToEmployeeId) ||
        (m.empCode && m.empCode === targetLead.assignedToEmployeeId) ||
        (m.name && targetLead.assignedToEmployeeName && m.name.toLowerCase() === targetLead.assignedToEmployeeName.toLowerCase());

      if (isTargetEmp) {
        const newDials = m.dialsToday + 1;
        const newConnected = status !== 'NOT_INTERESTED' ? m.connected + 1 : m.connected;
        const newInterested = (status === 'INTERESTED' || status === 'CONVERTED') ? m.interested + 1 : m.interested;
        const newSales = status === 'CONVERTED' ? (m.salesAchieved || 0) + dealAmountNum : m.salesAchieved;
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
      const newPayment: PaymentVerificationItem = {
        id: `pay-${Date.now()}`,
        leadName: targetLead.name,
        companyName: targetLead.company,
        telecallerName: targetLead.assignedToEmployeeName,
        dealAmount: dealAmountNum,
        utrNumber: `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        paymentMode: 'Online Bank Transfer',
        timestamp: 'Just now',
        status: 'PENDING_HR_AUDIT',
      };
      setPaymentVerifications(prev => [newPayment, ...prev]);
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
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const today = new Date().toISOString().split('T')[0];

    const updatedProfile: EmployeeProfile = {
      ...profile,
      faceIdStatus: 'VERIFIED_PRESENT',
      checkInTime: timeStr,
    };
    setProfile(updatedProfile);

    const newAttendanceItem: AttendanceRecord = {
      id: `att-${today}-${targetId}`,
      employeeId: targetId,
      employeeName: profile.name,
      date: today,
      dayNumber: now.getDate(),
      status: 'PRESENT',
      checkIn: timeStr,
      workHours: 'In Progress',
      method: 'Face ID Biometric',
    };

    setAttendanceLogs(prev => [
      newAttendanceItem,
      ...prev.filter(item => item.dayNumber !== now.getDate()),
    ]);

    setTeamMembers(prev => prev.map(m => {
      if (m.id === profile.id || m.name.toLowerCase() === profile.name.toLowerCase()) {
        const updated = { ...m, attendanceStatus: 'PRESENT' as const, checkInTime: timeStr, checkInMethod: 'Face ID Biometric' as const };
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
    let updated: TeamMember | undefined;
    setTeamMembers((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        updated = { ...m, ...changes };
        return updated;
      })
    );

    if (!updated) return;
    triggerToast(`✓ ${updated.name} updated`);

    // ── Global sync: if admin edits the currently logged-in employee, update profile too ──
    const currentEmpIdForSync = currentUser?.employeeId || currentUser?.id || profile.id;
    const isCurrentUser = id === currentEmpIdForSync ||
      (profile.empCode && profile.empCode === (updated as TeamMember).empCode);

    if (isCurrentUser) {
      setProfile(prev => ({
        ...prev,
        ...(changes.name !== undefined && { name: changes.name }),
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
      }));
    }

    // ── Sync payslips: update employee name on existing payslips if name changed ──
    if (changes.name) {
      setPayslips(prev => prev.map(p =>
        p.employeeId === id ? { ...p, employeeName: changes.name! } : p
      ));
    }

    // ── Sync assignedLeads: update assignee name if it changed ──
    if (changes.name) {
      setAssignedLeads(prev => prev.map(l =>
        l.assignedToEmployeeId === id ? { ...l, assignedToEmployeeName: changes.name! } : l
      ));
    }

    try {
      await api.updateTeamMember(id, changes);
    } catch (err) {
      console.warn('Employee update failed:', err);
      triggerToast('✗ Could not save those changes');
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
      roleTitle: data.roleTitle || 'Telecaller Executive',
      department: data.department || 'Sales & Client Acquisition',
      annualCtc,
      monthlyGross,
      joiningDate: data.joiningDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      reportingManager: data.teamLeaderName || 'Team Leader',
      location: data.location || 'Bengaluru Corporate HQ',
      issuedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
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
        api.createOfferLetter(newOfferLetter)
      ]);
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
      todayGoalCalls: targetMember.goalCalls || 0,
      connected: targetMember.connected || 0,
      interested: targetMember.interested || 0,
      monthlySalesAchieved: targetMember.salesAchieved || 0,
      monthlySalesTarget: targetMember.salesTarget || 0
    });

    setCurrentRole(targetMember.portal || 'telecaller');
    return { success: true, member: targetMember };
  };

  const generateOfferLetter = async (data: Omit<OfferLetterData, 'id' | 'issuedDate'>) => {
    const newOffer: OfferLetterData = {
      ...data,
      id: `off-${Date.now()}`,
      issuedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    setOfferLetters(prev => [newOffer, ...prev]);
    setSelectedOfferLetter(newOffer);
    setIsOfferLetterModalOpen(true);
    triggerToast(`✓ Offer letter generated for ${data.candidateName}`);

    try {
      await api.createOfferLetter(newOffer);
    } catch (err) {
      console.warn('API create offer letter error:', err);
    }
  };

  const generateExperienceCert = (data: Omit<ExperienceCertData, 'id' | 'issuedDate'>) => {
    const newCert: ExperienceCertData = {
      ...data,
      id: `exp-${Date.now()}`,
      issuedDate: new Date().toLocaleDateString('en-GB'),
    };
    setExperienceCerts(prev => [newCert, ...prev]);
    setSelectedExperienceCert(newCert);
    setIsExperienceCertModalOpen(true);
    triggerToast(`✓ Experience Certificate generated for ${data.employeeName}`);
  };

  const generateRelievingLetter = (data: Omit<RelievingLetterData, 'id' | 'issuedDate'>) => {
    const newLetter: RelievingLetterData = {
      ...data,
      id: `rel-${Date.now()}`,
      issuedDate: new Date().toLocaleDateString('en-GB'),
    };
    setRelievingLetters(prev => [newLetter, ...prev]);
    setSelectedRelievingLetter(newLetter);
    setIsRelievingLetterModalOpen(true);
    triggerToast(`✓ Relieving Letter generated for ${data.employeeName}`);
  };

  const generateInvoice = (data: Omit<InvoiceData, 'id'>) => {
    const newInvoice: InvoiceData = {
      ...data,
      id: `inv-${Date.now()}`,
    };
    setInvoices(prev => [newInvoice, ...prev]);
    setSelectedInvoice(newInvoice);
    setIsInvoiceModalOpen(true);
    triggerToast(`✓ Invoice ${data.invoiceNumber} generated for ${data.clientName}`);
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

  // Team Leader & Admin Leave Actions
  const approveLeaveRequest = async (id: string) => {
    const approverTitle = currentRole === 'admin' ? 'Super Admin' : currentRole === 'hr' ? 'HR Manager' : (profile.name ? `${profile.name} (Team Leader)` : 'Team Leader');
    setLeaveRequests(prev => prev.map(req => {
      if (req.id !== id) return req;
      const currentStage = req.approvalStage || 'PENDING_TEAM_LEADER';
      let nextStage: LeaveRequest['approvalStage'] = 'APPROVED';
      let nextStatus: LeaveRequest['status'] = 'APPROVED';
      // Advance stage based on current approver role
      if (currentRole === 'team_leader') {
        // Team leader approves → goes to HR
        nextStage = 'PENDING_HR';
        nextStatus = 'PENDING';
      } else if (currentRole === 'hr') {
        // HR approves → goes to Admin
        nextStage = 'PENDING_ADMIN';
        nextStatus = 'PENDING';
      } else {
        // Admin final approval
        nextStage = 'APPROVED';
        nextStatus = 'APPROVED';
      }
      const updated: LeaveRequest = {
        ...req,
        approvalStage: nextStage,
        status: nextStatus,
        approvedBy: nextStatus === 'APPROVED' ? approverTitle : undefined,
      };
      api.updateLeave(id, updated).catch(console.warn);
      return updated;
    }));
    const stageMsg = currentRole === 'team_leader' ? 'forwarded to HR' : currentRole === 'hr' ? 'forwarded to Admin' : 'APPROVED';
    triggerToast(`✓ Leave request ${stageMsg} by ${approverTitle}`);
  };

  const rejectLeaveRequest = async (id: string, reason: string) => {
    const rejectorTitle = currentRole === 'admin' ? 'Admin' : currentRole === 'hr' ? 'HR' : 'Team Leader';
    setLeaveRequests(prev => prev.map(req => {
      if (req.id === id) {
        const updated: LeaveRequest = {
          ...req,
          status: 'REJECTED',
          approvalStage: 'REJECTED',
          approvedBy: `Rejected by ${rejectorTitle}: ${reason || 'Operational requirements'}`,
        };
        api.updateLeave(id, updated).catch(console.warn);
        return updated;
      }
      return req;
    }));
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
  const todayIso = new Date().toISOString().split('T')[0];
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
          : l.status === 'NOT_INTERESTED' ? 'COLD'
          : 'WARM',
        status:
          l.status === 'CONVERTED' ? 'Converted'
          : dueToday ? 'Due Today'
          : l.status === 'CALLBACK' ? 'Follow-up'
          : 'Pending',
        dueTime: l.followUpDate,
        dealValue: l.dealValue ?? 0,
        requirement: l.notes || `Assigned ${l.assignedDate}`,
        lastContacted: l.lastCallTimestamp || 'Not called yet',
      };
    });

  const reassignLeadsBetween = async (fromEmployeeId: string, toEmployeeId: string, limit?: number) => {
    const isUnassigned = fromEmployeeId === 'UNASSIGNED';
    const fromMember = isUnassigned ? null : teamMembers.find((m) => m.id === fromEmployeeId);
    const target = teamMembers.find((m) => m.id === toEmployeeId);
    if (!target) return;

    let moving = assignedLeads.filter((l) => {
      if (isUnassigned) {
        return (
          !l.assignedToEmployeeId ||
          l.assignedToEmployeeId === 'unassigned' ||
          l.assignedToEmployeeId === '' ||
          (l.assignedToEmployeeName && l.assignedToEmployeeName.toLowerCase() === 'unassigned')
        );
      }
      return (
        l.assignedToEmployeeId === fromEmployeeId ||
        (fromMember && l.assignedToEmployeeName && l.assignedToEmployeeName.toLowerCase() === fromMember.name.toLowerCase())
      );
    });
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

    triggerToast(`✓ ${moving.length} lead${moving.length === 1 ? '' : 's'} moved to ${target.name}`);

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

  const autoDistributeFreshLeads = async () => {
    const freshLeads = assignedLeads.filter((l) => l.callCount === 0);
    const activeTelecallers = teamMembers.filter(
      (m) =>
        m.active !== 0 &&
        m.empCode !== 'TNX-AD01' &&
        !m.role?.toLowerCase().includes('admin')
    );
    if (!freshLeads.length) {
      triggerToast('✓ All fresh leads are already distributed and dialed!');
      return;
    }
    if (!activeTelecallers.length) {
      triggerToast('No active employees found to receive leads.');
      return;
    }

    try {
      const perCaller = Math.ceil(freshLeads.length / activeTelecallers.length);
      let idx = 0;
      const reassignments: { [empId: string]: { member: typeof activeTelecallers[0]; leads: typeof freshLeads } } = {};

      for (const caller of activeTelecallers) {
        const chunk = freshLeads.slice(idx, idx + perCaller);
        idx += perCaller;
        if (chunk.length > 0) {
          reassignments[caller.id] = { member: caller, leads: chunk };
        }
      }

      for (const empId of Object.keys(reassignments)) {
        const { member, leads } = reassignments[empId];
        const leadIdsToMove = leads.map(l => l.id);
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

      triggerToast(`✓ Distributed ${freshLeads.length} fresh leads across ${activeTelecallers.length} employees`);
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
    let url = (role === 'admin' && mtg.zoomStartUrl)
      ? mtg.zoomStartUrl
      : (mtg.zoomJoinUrl || mtg.meetingLink || '');

    if (typeof url === 'string' && url.trim()) {
      url = url.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      try {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          return url;
        }
      } catch {
        // Fall back to ID parsing if URL format failed
      }
    }

    if (mtg.zoomMeetingId) {
      const cleanId = String(mtg.zoomMeetingId).replace(/\D/g, '');
      if (cleanId.length >= 8) {
        const passParam = mtg.zoomPassword ? `?pwd=${encodeURIComponent(mtg.zoomPassword)}` : '';
        return `https://zoom.us/j/${cleanId}${passParam}`;
      }
    }

    return null;
  };

  const joinMeeting = (mtg: TeamMeeting) => {
    setActiveMeetingRoom(mtg);

    // If host or admin, mark meeting as LIVE
    if (mtg.status !== 'LIVE' && (currentRole === 'team_leader' || currentRole === 'admin' || currentRole === 'hr')) {
      updateTeamMeeting(mtg.id, { status: 'LIVE' });
    }

    const zoomUrl = normalizeMeetingUrl(mtg, currentRole);

    if (zoomUrl) {
      window.open(zoomUrl, '_blank', 'noopener,noreferrer');
      triggerToast('🚀 Launching Zoom Video Meeting...');
    } else {
      setIsLiveRoomOpen(true);
    }
  };

  const leaveMeeting = () => {
    if ((currentRole === 'team_leader' || currentRole === 'admin') && activeMeetingRoom) {
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
    let targetPayment: PaymentVerificationItem | undefined;
    let oldStatus: string | undefined;

    setPaymentVerifications(prev => prev.map(p => {
      if (p.id === paymentId) {
        targetPayment = p;
        oldStatus = p.status;
        const updated: PaymentVerificationItem = { ...p, status };
        api.updatePayment(paymentId, updated).catch(console.warn);
        return updated;
      }
      return p;
    }));

    if (targetPayment) {
      const amount = (targetPayment as PaymentVerificationItem).dealAmount || 0;
      const telecallerName = (targetPayment as PaymentVerificationItem).telecallerName;

      if (status === 'VERIFIED' && oldStatus !== 'VERIFIED') {
        // Credit employee salesAchieved and squad achieved upon HR verification
        let matchedGroupName = '';
        setTeamMembers(prev => prev.map(m => {
          if (m.name.toLowerCase() === telecallerName.toLowerCase()) {
            matchedGroupName = m.group;
            const newSales = (m.salesAchieved || 0) + amount;
            const updated = { ...m, salesAchieved: newSales };
            api.updateTeamMember(m.id, updated).catch(console.warn);
            return updated;
          }
          return m;
        }));

        if (matchedGroupName) {
          setTeamGroups(prev => prev.map(g => {
            if (g.name.toLowerCase() === matchedGroupName.toLowerCase()) {
              const newAchieved = (g.achieved || 0) + amount;
              const updated = { ...g, achieved: newAchieved };
              api.updateTeamGroup(g.id, updated).catch(console.warn);
              return updated;
            }
            return g;
          }));
        }

        if (profile.name.toLowerCase() === telecallerName.toLowerCase()) {
          setStats(prev => {
            const newSales = (prev.monthlySalesAchieved || 0) + amount;
            const updated = { ...prev, monthlySalesAchieved: newSales };
            api.updateStats(updated).catch(console.warn);
            return updated;
          });
        }
      } else if (status === 'REJECTED' && oldStatus === 'VERIFIED') {
        // Reverse previously recognized sales from employee and squad
        let matchedGroupName = '';
        setTeamMembers(prev => prev.map(m => {
          if (m.name.toLowerCase() === telecallerName.toLowerCase()) {
            matchedGroupName = m.group;
            const newSales = Math.max(0, (m.salesAchieved || 0) - amount);
            const updated = { ...m, salesAchieved: newSales };
            api.updateTeamMember(m.id, updated).catch(console.warn);
            return updated;
          }
          return m;
        }));

        if (matchedGroupName) {
          setTeamGroups(prev => prev.map(g => {
            if (g.name.toLowerCase() === matchedGroupName.toLowerCase()) {
              const newAchieved = Math.max(0, (g.achieved || 0) - amount);
              const updated = { ...g, achieved: newAchieved };
              api.updateTeamGroup(g.id, updated).catch(console.warn);
              return updated;
            }
            return g;
          }));
        }

        if (profile.name.toLowerCase() === telecallerName.toLowerCase()) {
          setStats(prev => {
            const newSales = Math.max(0, (prev.monthlySalesAchieved || 0) - amount);
            const updated = { ...prev, monthlySalesAchieved: newSales };
            api.updateStats(updated).catch(console.warn);
            return updated;
          });
        }
      }
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
      date: new Date().toISOString().split('T')[0],
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
      await Promise.all([
        api.createLeave(newLeave),
        api.updateProfile(updatedProfile)
      ]);
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
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const today = now.toISOString().split('T')[0];
    const empId = currentUser?.employeeId || currentUser?.id || profile.id || 'emp-self';
    const empName = currentUser?.name || profile.name || 'Employee';
    const recordId = `att-${today}-${empId}`;

    try {
      const rec = await api.recordAttendance({
        id: recordId,
        employeeId: empId,
        employeeName: empName,
        date: today,
        dayNumber: now.getDate(),
        status: 'PRESENT',
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
        // Clear any dispute on successful re-punch
        disputedByAdmin: false,
        disputeReason: null,
      };
      setProfile(updatedProfile);

      const finalRecId = (rec as any)?.id || recordId;
      setAttendanceLogs((prev) => [
        {
          id: finalRecId,
          employeeId: empId,
          employeeName: empName,
          date: today,
          dayNumber: now.getDate(),
          status: 'PRESENT',
          checkIn: timeStr,
          workHours: 'In Progress',
          method: 'Face ID Biometric',
          checkInPhoto: data.photo ?? undefined,
          checkInLat: data.latitude ?? undefined,
          checkInLng: data.longitude ?? undefined,
          locationStatus: (rec as any)?.locationStatus || (data.latitude == null ? 'NOT_SHARED' : 'AT_OFFICE'),
          disputedByAdmin: false,
          disputeReason: undefined,
        },
        ...prev.filter((item) => !(item.date === today && (item.employeeId === empId || item.id === finalRecId))),
      ]);

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
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const today = now.toISOString().split('T')[0];
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
        const today = new Date().toISOString().split('T')[0];
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
      if (rec.id === recordId || (rec.employeeId === employeeId && rec.date === new Date().toISOString().split('T')[0])) {
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
        weeklyOffDays,
        setWeeklyOffDays,
        toggleWeeklyOffDay,
        calendarSettings,
        updateCalendarSettings,
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
        openOfferLetterModal,
        openGenerateOfferLetterModal,
        experienceCerts,
        selectedExperienceCert,
        setSelectedExperienceCert,
        isExperienceCertModalOpen,
        setIsExperienceCertModalOpen,
        isGenerateExperienceCertModalOpen,
        setIsGenerateExperienceCertModalOpen,
        generateExperienceCert,
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
        updateEmployeeAvatar,
        isDataLoading,
        backendError,
        resourceStatus,
        loadResources,
        refreshResources,
        invalidateAll,
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
