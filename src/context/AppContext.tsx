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
  ExperienceCertificateData,
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

  // Employee Management & Documents
  offerLetters: OfferLetterData[];
  selectedOfferLetter: OfferLetterData | null;
  setSelectedOfferLetter: (letter: OfferLetterData | null) => void;
  isOfferLetterModalOpen: boolean;
  setIsOfferLetterModalOpen: (open: boolean) => void;
  createNewEmployee: (data: NewEmployeeInput) => void;
  loginEmployee: (emailOrCode: string, passwordInput: string) => { success: boolean; member?: TeamMember; error?: string };
  /** Change an employee's details, role or team. */
  updateEmployee: (id: string, changes: Partial<TeamMember>) => Promise<void>;
  /** Switch an employee off without deleting their history, or switch them back on. */
  setEmployeeActive: (id: string, active: boolean) => Promise<void>;
  generateOfferLetter: (data: Omit<OfferLetterData, 'id' | 'issuedDate'>) => void;

  // Experience Certificate
  experienceCertificates: ExperienceCertificateData[];
  selectedExperienceCert: ExperienceCertificateData | null;
  setSelectedExperienceCert: (cert: ExperienceCertificateData | null) => void;
  isExperienceCertModalOpen: boolean;
  setIsExperienceCertModalOpen: (open: boolean) => void;
  generateExperienceCert: (data: Omit<ExperienceCertificateData, 'id'>) => void;

  // Relieving Letter
  relievingLetters: RelievingLetterData[];
  selectedRelievingLetter: RelievingLetterData | null;
  setSelectedRelievingLetter: (letter: RelievingLetterData | null) => void;
  isRelievingLetterModalOpen: boolean;
  setIsRelievingLetterModalOpen: (open: boolean) => void;
  generateRelievingLetter: (data: Omit<RelievingLetterData, 'id'>) => void;

  // Invoices
  invoices: InvoiceData[];
  selectedInvoice: InvoiceData | null;
  setSelectedInvoice: (invoice: InvoiceData | null) => void;
  isInvoiceModalOpen: boolean;
  setIsInvoiceModalOpen: (open: boolean) => void;
  generateInvoice: (data: Omit<InvoiceData, 'id'>) => void;

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
  createTeamGroup: (data: { name: string; description: string; leaderName: string; monthlyTarget: number; color: string }, memberIds?: string[]) => void;
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
    targetAudience?: 'ALL' | 'TEAM' | 'INDIVIDUAL' | 'LEADERSHIP';
    targetTeam?: string;
    targetEmployeeId?: string;
    createdByRole?: string;
    priority?: 'NORMAL' | 'HIGH' | 'MANDATORY';
  }) => void;
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
  generateBulkPayslips: (month: string, year: string) => void;

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
  openOfferLetterModal: () => void;
  
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
  }, []);

  // Automated version check: Purge old mock/dummy cached data so real pipeline is clean
  const CURRENT_DATA_VERSION = 'v5_pure_zero_slate';
  try {
    if (typeof window !== 'undefined') {
      const savedVer = localStorage.getItem('tnx_data_version');
      if (savedVer !== CURRENT_DATA_VERSION) {
        const keysToPurge = [
          'tnx_callLogs',
          'tnx_assignedLeads',
          'tnx_leadBatches',
          'tnx_paymentVerifications',
          'tnx_clients',
          'tnx_stats',
          'tnx_attendanceLogs',
          'tnx_leaveRequests',
          'tnx_teamMembers',
          'tnx_teamGroups',
          'tnx_profile',
          'tnx_teamTasks',
          'tnx_teamMeetings',
          'tnx_candidates',
          'tnx_onboardingList',
          'tnx_exitList',
          'tnx_offerLetters',
        ];
        keysToPurge.forEach((k) => localStorage.removeItem(k));
        localStorage.setItem('tnx_data_version', CURRENT_DATA_VERSION);
      }
    }
  } catch {}

  const getStoredState = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(`tnx_${key}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return defaultValue;
  };

  const [profile, setProfile] = useState<EmployeeProfile>(() => getStoredState('profile', INITIAL_PROFILE));
  const [stats, setStats] = useState<TelecallerStats>(() => getStoredState('stats', INITIAL_TELECALLER_STATS));
  const [callLogs, setCallLogs] = useState<CallLogItem[]>(() => getStoredState('callLogs', INITIAL_CALL_LOGS));
  const [clients, setClients] = useState<ClientLead[]>(() => getStoredState('clients', INITIAL_CLIENT_LEADS));
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>(() => getStoredState('attendanceLogs', INITIAL_ATTENDANCE_LOGS));
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => getStoredState('leaveRequests', INITIAL_LEAVE_REQUESTS));
  const [payslips, setPayslips] = useState<PayslipItem[]>(() => getStoredState('payslips', INITIAL_PAYSLIPS));

  // Dynamic Lead Management State
  const [assignedLeads, setAssignedLeads] = useState<AssignedLead[]>(() => getStoredState('assignedLeads', INITIAL_ASSIGNED_LEADS));
  const [leadBatches, setLeadBatches] = useState<LeadBatch[]>(() => getStoredState('leadBatches', INITIAL_LEAD_BATCHES));

  // Face Biometric State
  const [faceProfiles, setFaceProfiles] = useState<FaceBiometricProfile[]>(() => getStoredState('faceProfiles', []));

  // Offer Letters State
  const [offerLetters, setOfferLetters] = useState<OfferLetterData[]>(() => getStoredState('offerLetters', INITIAL_OFFER_LETTERS));
  const [selectedOfferLetter, setSelectedOfferLetter] = useState<OfferLetterData | null>(null);
  const [isOfferLetterModalOpen, setIsOfferLetterModalOpen] = useState(false);

  // Experience Certificates State
  const [experienceCertificates, setExperienceCertificates] = useState<ExperienceCertificateData[]>(() => 
    getStoredState('experienceCertificates', [
      {
        id: 'exp-101',
        refNumber: 'TNX/EXP/2026/042',
        issueDate: '24-09-2026',
        employeeName: 'Amitabh Singh',
        fatherName: 'Sh. Heera Singh',
        designation: 'Senior Trading Strategist',
        companyName: 'Trade Nexus',
        startDate: '15th May 2023',
        endDate: '10th September 2026',
        responsibilities: 'supervising proprietary trading desk operations, executing high-frequency volume arbitrage, ensuring stringent risk management, and coordinating with desk quantitative analysts',
        signatoryName: 'T. Vidhya Sagar',
        signatoryRole: 'Chief Executive Officer',
      }
    ])
  );
  const [selectedExperienceCert, setSelectedExperienceCert] = useState<ExperienceCertificateData | null>(null);
  const [isExperienceCertModalOpen, setIsExperienceCertModalOpen] = useState(false);

  // Relieving Letters State
  const [relievingLetters, setRelievingLetters] = useState<RelievingLetterData[]>(() => 
    getStoredState('relievingLetters', [
      {
        id: 'rel-101',
        issueDate: '24/09/2026',
        employeeName: 'Rahul Verma',
        designation: 'Business Development Executive',
        department: 'Client Acquisition',
        employeeType: 'Full - Time',
        empCode: 'TNX-204',
        address: 'Flat 402, Highline Residency, Financial District, Hyderabad',
        resignationDate: '15th August 2026',
        lastWorkingDate: '20th September 2026',
        joiningDate: '01st June 2024',
        signatoryName: 'T. Vidhya Sagar',
        signatoryRole: 'Chief Executive Officer',
      }
    ])
  );
  const [selectedRelievingLetter, setSelectedRelievingLetter] = useState<RelievingLetterData | null>(null);
  const [isRelievingLetterModalOpen, setIsRelievingLetterModalOpen] = useState(false);

  // Invoices State
  const [invoices, setInvoices] = useState<InvoiceData[]>(() => 
    getStoredState('invoices', [
      {
        id: 'inv-101',
        invoiceNumber: 'TNX-INV-2026-88',
        date: '24 September 2026',
        billTo: {
          name: 'Estelle Darcy',
          phone: '+91 98451 22340',
          address: 'Suite 404, Cyber Towers, Hitec City, Hyderabad',
        },
        from: {
          name: 'Trade Nexus Corporate Billing',
          phone: '+91 98765 43210',
          address: '123 Business Avenue, Financial District, 500001',
        },
        items: [
          { id: 'item-1', description: 'Enterprise Algorithmic Trading Terminal License (Q3)', qty: 1, price: 45000, total: 45000 },
          { id: 'item-2', description: 'Real-time WebSocket Market Feed & Colocation Access', qty: 1, price: 15000, total: 15000 },
          { id: 'item-3', description: 'Quantitative Strategy Calibration & Dedicated Support', qty: 2, price: 10000, total: 20000 },
        ],
        subTotal: 80000,
        total: 80000,
        notes: 'Payment is due within 15 days of invoice date. Remittance via Bank Transfer or UPI.',
        paymentInfo: {
          bankName: 'HDFC Bank - Corporate Banking',
          accountNumber: '50200049281729',
          email: 'billing@tradenexus.com',
        },
      }
    ])
  );
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Team Leader Module State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => getStoredState('teamMembers', INITIAL_TEAM_MEMBERS));
  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>(() => getStoredState('teamGroups', INITIAL_TEAM_GROUPS));
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>(() => getStoredState('teamTasks', INITIAL_TEAM_TASKS));
  const [teamMeetings, setTeamMeetings] = useState<TeamMeeting[]>(() => getStoredState('teamMeetings', INITIAL_TEAM_MEETINGS));
  const [isLiveRoomOpen, setIsLiveRoomOpen] = useState(false);
  const [activeMeetingRoom, setActiveMeetingRoom] = useState<TeamMeeting | null>(null);

  // HR Module State
  const [candidates, setCandidates] = useState<CandidateInterview[]>(() => getStoredState('candidates', INITIAL_CANDIDATES));
  const [onboardingList, setOnboardingList] = useState<OnboardingEmployee[]>(() => getStoredState('onboardingList', INITIAL_ONBOARDING));
  const [exitList, setExitList] = useState<ExitEmployee[]>(() => getStoredState('exitList', INITIAL_EXIT_LIST));
  const [paymentVerifications, setPaymentVerifications] = useState<PaymentVerificationItem[]>(() => getStoredState('paymentVerifications', INITIAL_PAYMENT_VERIFICATIONS));

  // Backend connection state
  const [backendError, setBackendError] = useState<string | null>(null);

  // Hierarchy-wide Company Calendar & Holidays State
  const [weeklyOffDays, setWeeklyOffDaysState] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem('tnx_weekly_off_days');
      return stored ? JSON.parse(stored) : [0]; // Default: Sunday (0)
    } catch {
      return [0];
    }
  });

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

  const [companyHolidays, setCompanyHolidaysState] = useState<CompanyHoliday[]>(() => {
    try {
      const stored = localStorage.getItem('tnx_company_holidays');
      return stored ? JSON.parse(stored) : INITIAL_COMPANY_HOLIDAYS;
    } catch {
      return INITIAL_COMPANY_HOLIDAYS;
    }
  });

  const setWeeklyOffDays = (days: number[]) => {
    setWeeklyOffDaysState(days);
    setCalendarSettingsState(prev => ({ ...prev, weeklyOffDays: days }));
    try {
      localStorage.setItem('tnx_weekly_off_days', JSON.stringify(days));
    } catch {}
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
      try {
        localStorage.setItem('tnx_weekly_off_days', JSON.stringify(settings.weeklyOffDays));
      } catch {}
    }
    try {
      const updated = await api.updateCalendarSettings(settings);
      setCalendarSettingsState(updated);
      if (updated.weeklyOffDays) setWeeklyOffDaysState(updated.weeklyOffDays);
      triggerToast('✓ Shift timings & attendance policies saved to database');
    } catch {
      triggerToast('✓ Updated calendar policies (offline mode)');
    }
  };

  const addCompanyHoliday = async (holiday: Omit<CompanyHoliday, 'id'> & { id?: string; description?: string }) => {
    try {
      const created = await api.createHoliday(holiday);
      const updated = [...companyHolidays.filter(h => h.id !== created.id), created].sort((a, b) => a.date.localeCompare(b.date));
      setCompanyHolidaysState(updated);
      try {
        localStorage.setItem('tnx_company_holidays', JSON.stringify(updated));
      } catch {}
      triggerToast(`✓ Added Holiday "${holiday.name}" to company calendar`);
    } catch {
      const newHol: CompanyHoliday = {
        ...holiday,
        id: holiday.id || `hol-${Date.now()}`
      };
      const updated = [...companyHolidays, newHol].sort((a, b) => a.date.localeCompare(b.date));
      setCompanyHolidaysState(updated);
      try {
        localStorage.setItem('tnx_company_holidays', JSON.stringify(updated));
      } catch {}
      triggerToast(`✓ Added Holiday "${holiday.name}"`);
    }
  };

  const deleteCompanyHoliday = async (id: string) => {
    const target = companyHolidays.find(h => h.id === id);
    const updated = companyHolidays.filter(h => h.id !== id);
    setCompanyHolidaysState(updated);
    try {
      localStorage.setItem('tnx_company_holidays', JSON.stringify(updated));
    } catch {}
    try {
      await api.deleteHoliday(id);
    } catch {}
    triggerToast(`✓ Removed Holiday "${target?.name || ''}" from calendar`);
  };

  const loadPresetHolidays = async () => {
    try {
      const presets = await api.loadPresetHolidays();
      setCompanyHolidaysState(presets);
      try {
        localStorage.setItem('tnx_company_holidays', JSON.stringify(presets));
      } catch {}
      triggerToast('✨ Loaded 15 official Indian gazetted holidays (2026)');
    } catch {
      setCompanyHolidaysState(INITIAL_COMPANY_HOLIDAYS);
      try {
        localStorage.setItem('tnx_company_holidays', JSON.stringify(INITIAL_COMPANY_HOLIDAYS));
      } catch {}
      triggerToast('✨ Loaded official holidays preset');
    }
  };

  const clearAllHolidays = async () => {
    try {
      await api.clearAllHolidays();
    } catch {}
    setCompanyHolidaysState([]);
    try {
      localStorage.removeItem('tnx_company_holidays');
    } catch {}
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

  const openOfferLetterModal = () => {
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
    setIsOfferLetterModalOpen(true);
  };
  const generateOfferLetter = (data: Omit<OfferLetterData, 'id' | 'issuedDate'>) => {
    const newLetter: OfferLetterData = {
      ...data,
      id: `off-${Date.now()}`,
      issuedDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
    };
    setOfferLetters(prev => [newLetter, ...prev]);
    try { localStorage.setItem('tnx_offerLetters', JSON.stringify([newLetter, ...offerLetters])); } catch {}
    triggerToast(`✓ Offer Letter generated for ${data.candidateName}`);
  };

  const generateExperienceCert = (data: Omit<ExperienceCertificateData, 'id'>) => {
    const newCert: ExperienceCertificateData = {
      ...data,
      id: `exp-${Date.now()}`,
    };
    setExperienceCertificates(prev => {
      const updated = [newCert, ...prev];
      try { localStorage.setItem('tnx_experienceCertificates', JSON.stringify(updated)); } catch {}
      return updated;
    });
    triggerToast(`✓ Experience Certificate generated for ${data.employeeName}`);
  };

  const generateRelievingLetter = (data: Omit<RelievingLetterData, 'id'>) => {
    const newLetter: RelievingLetterData = {
      ...data,
      id: `rel-${Date.now()}`,
    };
    setRelievingLetters(prev => {
      const updated = [newLetter, ...prev];
      try { localStorage.setItem('tnx_relievingLetters', JSON.stringify(updated)); } catch {}
      return updated;
    });
    triggerToast(`✓ Relieving Letter generated for ${data.employeeName}`);
  };

  const generateInvoice = (data: Omit<InvoiceData, 'id'>) => {
    const newInvoice: InvoiceData = {
      ...data,
      id: `inv-${Date.now()}`,
    };
    setInvoices(prev => {
      const updated = [newInvoice, ...prev];
      try { localStorage.setItem('tnx_invoices', JSON.stringify(updated)); } catch {}
      return updated;
    });
    triggerToast(`✓ Invoice ${data.invoiceNumber} generated`);
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
          markStatus(key, 'loaded');
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
      localStorage.setItem('tnx_teamMembers', JSON.stringify(teamMembers));
    } catch {}
  }, [teamMembers]);

  useEffect(() => {
    try {
      localStorage.setItem('tnx_assignedLeads', JSON.stringify(assignedLeads));
    } catch {}
  }, [assignedLeads]);

  useEffect(() => {
    try {
      localStorage.setItem('tnx_leadBatches', JSON.stringify(leadBatches));
    } catch {}
  }, [leadBatches]);

  useEffect(() => {
    try {
      localStorage.setItem('tnx_onboardingList', JSON.stringify(onboardingList));
    } catch {}
  }, [onboardingList]);

  useEffect(() => {
    try {
      localStorage.setItem('tnx_offerLetters', JSON.stringify(offerLetters));
    } catch {}
  }, [offerLetters]);

  useEffect(() => {
    try {
      localStorage.setItem('tnx_callLogs', JSON.stringify(callLogs));
    } catch {}
  }, [callLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('tnx_stats', JSON.stringify(stats));
    } catch {}
  }, [stats]);

  useEffect(() => {
    try {
      localStorage.setItem('tnx_profile', JSON.stringify(profile));
    } catch {}
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem('tnx_leaveRequests', JSON.stringify(leaveRequests));
    } catch {}
  }, [leaveRequests]);

  useEffect(() => {
    try {
      localStorage.setItem('tnx_payslips', JSON.stringify(payslips));
    } catch {}
  }, [payslips]);

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
    try {
      localStorage.setItem('tnx_authStep', 'LOGIN');
      localStorage.removeItem('tnx_profile');
      localStorage.removeItem('tnx_stats');
      localStorage.removeItem('tnx_assignedLeads');
      localStorage.removeItem('tnx_callLogs');
    } catch {}
    setProfile(EMPTY_PROFILE);
    setStats(EMPTY_STATS);
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
    }));

    setLeadBatches(prev => [newBatch, ...prev]);
    setAssignedLeads(prev => [...newAssignedItems, ...prev]);
    triggerToast(`✓ Successfully allocated ${leads.length} leads to ${targetEmployeeName}!`);

    try {
      await api.bulkImportAssignedLeads(fileName, targetEmployeeId, targetEmployeeName, leads);
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
    let targetLead: AssignedLead | undefined;

    setAssignedLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        targetLead = {
          ...lead,
          status,
          notes: notes || lead.notes,
          callCount: lead.callCount + 1,
          lastCallTimestamp: 'Just now',
          dealValue: dealValue !== undefined ? dealValue : lead.dealValue,
          followUpDate: followUpDate || lead.followUpDate,
        };
        return targetLead;
      }
      return lead;
    }));

    if (targetLead) {
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
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
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
      };
      setStats(updatedStats);

      // Update Team Member record for TL and HR live visibility (Revenue recognized upon HR payment audit)
      setTeamMembers(prev => prev.map(m => {
        if (m.name.toLowerCase() === (targetLead?.assignedToEmployeeName ?? '').toLowerCase() || m.id === targetLead?.assignedToEmployeeId) {
          const newDials = m.dialsToday + 1;
          const newConnected = status !== 'NOT_INTERESTED' ? m.connected + 1 : m.connected;
          const newInterested = (status === 'INTERESTED' || status === 'CONVERTED') ? m.interested + 1 : m.interested;
          const updatedM: TeamMember = {
            ...m,
            dialsToday: newDials,
            connected: newConnected,
            interested: newInterested,
            conversionRate: Math.min(100, Math.round((newInterested / Math.max(1, newDials)) * 100)),
          };
          api.updateTeamMember(m.id, updatedM).catch(console.warn);
          return updatedM;
        }
        return m;
      }));

      // If converted with deal value, record in payment verification list for HR
      if (status === 'CONVERTED' && dealValue && dealValue > 0) {
        const newPayment: PaymentVerificationItem = {
          id: `pay-${Date.now()}`,
          leadName: targetLead.name,
          companyName: targetLead.company,
          telecallerName: targetLead.assignedToEmployeeName,
          dealAmount: dealValue,
          utrNumber: `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          paymentMode: 'Online Bank Transfer',
          timestamp: 'Just now',
          status: 'PENDING_HR_AUDIT',
        };
        setPaymentVerifications(prev => [newPayment, ...prev]);
        api.createPayment(newPayment).catch(console.warn);
      }

      // SQLite API calls
      try {
        api.updateAssignedLead(leadId, targetLead).catch(console.warn);
        api.createCallLog(newCallItem).catch(console.warn);
        api.updateStats(updatedStats).catch(console.warn);
      } catch (err) {
        console.warn('API sync error:', err);
      }
    }

    triggerToast(`✓ Status updated: ${status.replace('_', ' ')} for ${targetLead?.name || 'Lead'}`);
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
    triggerToast(`\u2713 ${updated.name} updated`);

    try {
      await api.updateTeamMember(id, updated);
    } catch (err) {
      console.warn('Employee update failed:', err);
      triggerToast('\u2717 Could not save those changes');
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

  const createNewEmployee = async (data: NewEmployeeInput) => {
    const empCode = data.empCode || `TNX-${Math.floor(8000 + Math.random() * 999)}`;
    const empId = `emp-${Date.now()}`;
    const monthlyGross = data.salary || ((data.basicSalary || 20000) + (data.hra || 10000) + (data.specialAllowance || 5000));
    const annualCtc = monthlyGross * 12;

    // 1. Add to Team Members
    const newMember: TeamMember = {
      id: empId,
      empCode,
      name: data.name,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
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

  const generateExperienceCert = (data: Omit<ExperienceCertificateData, 'id'>) => {
    const newCert: ExperienceCertificateData = {
      ...data,
      id: `exp-${Date.now()}`,
    };
    setExperienceCertificates(prev => {
      const updated = [newCert, ...prev];
      try { localStorage.setItem('tnx_experienceCertificates', JSON.stringify(updated)); } catch {}
      return updated;
    });
    setSelectedExperienceCert(newCert);
    setIsExperienceCertModalOpen(true);
    triggerToast(`✓ Experience Certificate generated for ${data.employeeName}`);
  };

  const generateRelievingLetter = (data: Omit<RelievingLetterData, 'id'>) => {
    const newLetter: RelievingLetterData = {
      ...data,
      id: `rel-${Date.now()}`,
    };
    setRelievingLetters(prev => {
      const updated = [newLetter, ...prev];
      try { localStorage.setItem('tnx_relievingLetters', JSON.stringify(updated)); } catch {}
      return updated;
    });
    setSelectedRelievingLetter(newLetter);
    setIsRelievingLetterModalOpen(true);
    triggerToast(`✓ Relieving Letter generated for ${data.employeeName}`);
  };

  const generateInvoice = (data: Omit<InvoiceData, 'id'>) => {
    const newInvoice: InvoiceData = {
      ...data,
      id: `inv-${Date.now()}`,
    };
    setInvoices(prev => {
      const updated = [newInvoice, ...prev];
      try { localStorage.setItem('tnx_invoices', JSON.stringify(updated)); } catch {}
      return updated;
    });
    setSelectedInvoice(newInvoice);
    setIsInvoiceModalOpen(true);
    triggerToast(`✓ Invoice #${data.invoiceNumber} created successfully!`);
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
      if (req.id === id) {
        const updated: LeaveRequest = { ...req, status: 'APPROVED', approvedBy: approverTitle };
        api.updateLeave(id, updated).catch(console.warn);
        return updated;
      }
      return req;
    }));
    triggerToast(`✓ Leave request APPROVED by ${approverTitle}`);
  };

  const rejectLeaveRequest = async (id: string, reason: string) => {
    const rejectorTitle = currentRole === 'admin' ? 'Admin' : currentRole === 'hr' ? 'HR' : 'Team Leader';
    setLeaveRequests(prev => prev.map(req => {
      if (req.id === id) {
        const updated: LeaveRequest = { ...req, status: 'REJECTED', approvedBy: `Rejected by ${rejectorTitle}: ${reason || 'Operational requirements'}` };
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
    const fromMember = teamMembers.find((m) => m.id === fromEmployeeId);
    const target = teamMembers.find((m) => m.id === toEmployeeId);
    if (!target) return;

    let moving = assignedLeads.filter((l) => 
      l.assignedToEmployeeId === fromEmployeeId ||
      (fromMember && l.assignedToEmployeeName && l.assignedToEmployeeName.toLowerCase() === fromMember.name.toLowerCase())
    );
    if (!moving.length) {
      triggerToast('That telecaller has no leads to move.');
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
          ? { ...l, assignedToEmployeeId: target.id, assignedToEmployeeName: target.name }
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
    } catch (err) {
      console.warn('Batch lead reassignment failed:', err);
      triggerToast('✗ Some leads could not be moved');
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
    targetAudience?: 'ALL' | 'TEAM' | 'INDIVIDUAL' | 'LEADERSHIP';
    targetTeam?: string;
    targetEmployeeId?: string;
    createdByRole?: string;
    priority?: 'NORMAL' | 'HIGH' | 'MANDATORY';
  }) => {
    const meetingId = `mtg-${Date.now()}`;
    const newMtg: TeamMeeting = {
      id: meetingId,
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
    };
    setTeamMeetings(prev => [newMtg, ...prev]);
    triggerToast(`✓ Meeting "${data.title}" scheduled`);

    try {
      await api.createTeamMeeting(newMtg);
    } catch (err) {
      console.warn('API create meeting error:', err);
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

  const joinMeeting = (mtg: TeamMeeting) => {
    setActiveMeetingRoom(mtg);
    setIsLiveRoomOpen(true);
    if (mtg.status !== 'LIVE' && (currentRole === 'team_leader' || currentRole === 'admin')) {
      updateTeamMeeting(mtg.id, { status: 'LIVE' });
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

  const generateBulkPayslips = async (month: string, year: string) => {
    try {
      const generated = await api.generateBulkPayslips(month, year);
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

      triggerToast(`✓ Generated ${month} ${year} payslips for ${generatedList.length} active employee${generatedList.length === 1 ? '' : 's'}!`);
    } catch (err: any) {
      console.warn('API generate bulk payslips error:', err);
      triggerToast(`✗ Failed to generate payslips: ${err.message || 'Error'}`);
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
    const newLeave: LeaveRequest = {
      id: `lv-${Date.now()}`,
      employeeName: profile.name,
      employeeCode: profile.empCode,
      leaveType: data.leaveType,
      fromDate: data.fromDate,
      toDate: data.toDate,
      totalDays: data.totalDays,
      reason: data.reason,
      status: 'PENDING',
      appliedOn: `Today, ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    };

    setLeaveRequests((prev) => [newLeave, ...prev]);
    const updatedProfile: EmployeeProfile = {
      ...profile,
      totalLeaveBalance: Math.max(0, profile.totalLeaveBalance - data.totalDays),
    };
    setProfile(updatedProfile);

    triggerToast(`✓ Leave request submitted to Team Leader (${data.totalDays} Days)`);

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
      };
      setProfile(updatedProfile);

      setAttendanceLogs((prev) => [
        {
          id: recordId,
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
        },
        ...prev.filter((item) => item.dayNumber !== now.getDate()),
      ]);

      triggerToast(`✓ Checked in at ${timeStr}`);
      await api.updateProfile(updatedProfile).catch(() => {});
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

    setAttendanceLogs((prev) =>
      prev.map((a) => (a.id === recordId ? { ...a, checkOut: timeStr } : a))
    );

    triggerToast(`✓ Checked out at ${timeStr}`);

    try {
      await api.updateAttendance2(recordId, {
        checkOut: timeStr,
        checkOutPhoto: data.photo,
        latitude: data.latitude,
        longitude: data.longitude,
      } as any);
      await api.updateProfile(updatedProfile);
    } catch (err) {
      console.warn('Check-out save failed:', err);
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
        offerLetters,
        selectedOfferLetter,
        setSelectedOfferLetter,
        isOfferLetterModalOpen,
        setIsOfferLetterModalOpen,
        createNewEmployee,
        loginEmployee,
        updateEmployee,
        setEmployeeActive,
        generateOfferLetter,
        experienceCertificates,
        selectedExperienceCert,
        setSelectedExperienceCert,
        isExperienceCertModalOpen,
        setIsExperienceCertModalOpen,
        generateExperienceCert,
        relievingLetters,
        selectedRelievingLetter,
        setSelectedRelievingLetter,
        isRelievingLetterModalOpen,
        setIsRelievingLetterModalOpen,
        generateRelievingLetter,
        invoices,
        selectedInvoice,
        setSelectedInvoice,
        isInvoiceModalOpen,
        setIsInvoiceModalOpen,
        generateInvoice,
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
        createTeamGroup,
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
        openOfferLetterModal,
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
