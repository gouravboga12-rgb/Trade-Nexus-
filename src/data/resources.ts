import { api } from '../services/api';
import { EmployeeProfile, TelecallerStats } from '../types';

/**
 * Neutral placeholders used until the API responds. Deliberately blank rather
 * than seeded with sample data, so a slow or failed request shows nothing
 * instead of presenting another employee's details as if they were yours.
 * Strings stay as '' (not null) because the UI calls .split()/.substring()
 * on them directly.
 */
export const EMPTY_PROFILE: EmployeeProfile = {
  id: '',
  empCode: '',
  name: '',
  roleTitle: '',
  department: '',
  teamName: '',
  teamLeaderName: '',
  email: '',
  phone: '',
  joinDate: '',
  bloodGroup: '',
  faceIdStatus: 'NOT_CHECKED_IN',
  checkInTime: '',
  totalLeaveBalance: 0,
};

export const EMPTY_STATS: TelecallerStats = {
  todayGoalCalls: 0,
  dialsMade: 0,
  connected: 0,
  interested: 0,
  rejected: 0,
  averageCallDurationSec: 0,
  monthlySalesTarget: 0,
  monthlySalesAchieved: 0,
};

/**
 * Every server-backed slice of application state, keyed by the same name the
 * slice has on the app context. Screens declare which of these they need and
 * the provider fetches each one at most once, on demand.
 */
export const RESOURCE_FETCHERS = {
  profile: () => api.getProfile(),
  stats: () => api.getStats(),
  callLogs: () => api.getCallLogs(),
  clients: () => api.getClients(),
  attendanceLogs: () => api.getAttendance(),
  leaveRequests: () => api.getLeaves(),
  payslips: () => api.getPayslips(),
  teamMembers: () => api.getTeamMembers(),
  teamGroups: () => api.getTeamGroups(),
  teamTasks: () => api.getTeamTasks(),
  teamMeetings: () => api.getTeamMeetings(),
  candidates: () => api.getInterviews(),
  onboardingList: () => api.getOnboarding(),
  exitList: () => api.getExitEmployees(),
  assignedLeads: () => api.getAssignedLeads(),
  leadBatches: () => api.getLeadBatches(),
  faceProfiles: () => api.getBiometrics(),
  offerLetters: () => api.getOfferLetters(),
  paymentVerifications: () => api.getPayments(),
  companyHolidays: () => api.getHolidays(),
  calendarSettings: () => api.getCalendarSettings(),
  invoices: () => api.getInvoices(),
  experienceCerts: () => api.getExperienceCerts(),
  relievingLetters: () => api.getRelievingLetters(),
  topPerformers: () => api.getTopPerformers(),
} as const;

export type ResourceKey = keyof typeof RESOURCE_FETCHERS;

export type ResourceStatus = 'idle' | 'loading' | 'loaded' | 'error';

export const ALL_RESOURCE_KEYS = Object.keys(RESOURCE_FETCHERS) as ResourceKey[];

/**
 * What each screen needs. Keeping this in one place means a screen's data
 * dependencies are reviewable without reading the component, and two screens
 * that share a resource share the single cached fetch.
 *
 * The login and biometric screens deliberately request nothing — opening the
 * app must not touch the API until the user is actually somewhere that shows data.
 */
export const SCREEN_RESOURCES = {
  login: [],
  faceScan: ['profile', 'faceProfiles'],
  attendanceSuccess: ['profile'],

  telecallerHome: ['profile', 'attendanceLogs', 'stats', 'clients', 'callLogs', 'assignedLeads', 'teamMeetings', 'paymentVerifications', 'topPerformers'],
  dailyCalling: ['profile', 'callLogs', 'stats', 'clients', 'assignedLeads'],
  clientsPipeline: ['clients', 'assignedLeads', 'paymentVerifications'],
  attendanceLeaves: ['profile', 'attendanceLogs', 'leaveRequests', 'companyHolidays', 'calendarSettings'],
  profileSelfService: ['profile', 'payslips', 'offerLetters', 'experienceCerts', 'relievingLetters', 'teamTasks', 'teamMeetings'],
  modulesMenu: ['profile'],

  teamLeaderDashboard: [
    'profile',
    'attendanceLogs',
    'teamMembers',
    'teamGroups',
    'teamTasks',
    'teamMeetings',
    'leaveRequests',
    'clients',
    'assignedLeads',
    'callLogs',
    'companyHolidays',
    'calendarSettings',
    'paymentVerifications',
    'topPerformers',
    'payslips',
    'offerLetters',
    'experienceCerts',
    'relievingLetters',
  ],

  hrDashboard: [
    'profile',
    'attendanceLogs',
    'teamMembers',
    'teamGroups',
    'leaveRequests',
    'candidates',
    'onboardingList',
    'exitList',
    'paymentVerifications',
    'payslips',
    'offerLetters',
    'experienceCerts',
    'relievingLetters',
    'faceProfiles',
    'teamMeetings',
    'companyHolidays',
    'calendarSettings',
    'invoices',
    'topPerformers',
  ],

  adminDashboard: [
    'teamMembers',
    'teamGroups',
    'leadBatches',
    'assignedLeads',
    'clients',
    'paymentVerifications',
    'attendanceLogs',
    'callLogs',
    'leaveRequests',
    'teamMeetings',
    'companyHolidays',
    'calendarSettings',
    'invoices',
    'offerLetters',
    'experienceCerts',
    'relievingLetters',
    'topPerformers',
  ],
} as const satisfies Record<string, readonly ResourceKey[]>;

export type ScreenName = keyof typeof SCREEN_RESOURCES;

/**
 * Returns strictly the resource keys needed for the active screen/tab,
 * eliminating the 22-parallel-request flood on manual refresh.
 */
export function getActiveScreenResourceKeys(role: string, tab?: string): readonly ResourceKey[] {
  const normRole = (role || '').toLowerCase();
  const cleanTab = (tab || '').toLowerCase();

  if (normRole === 'telecaller' || normRole === 'employee') {
    if (cleanTab === 'leads' || cleanTab === 'calling') return ['assignedLeads', 'callLogs', 'stats', 'profile', 'leaveRequests'];
    if (cleanTab === 'attendance') return ['attendanceLogs', 'leaveRequests', 'companyHolidays', 'calendarSettings'];
    return ['profile', 'attendanceLogs', 'leaveRequests', 'stats', 'assignedLeads', 'callLogs', 'teamMeetings', 'paymentVerifications'];
  }

  if (normRole === 'team_leader') {
    if (cleanTab === 'team' || cleanTab === 'attendance') return ['teamMembers', 'attendanceLogs', 'leaveRequests', 'teamGroups', 'teamMeetings'];
    if (cleanTab === 'leads') return ['assignedLeads', 'callLogs', 'stats', 'leaveRequests'];
    return ['profile', 'attendanceLogs', 'leaveRequests', 'teamMembers', 'teamGroups', 'paymentVerifications', 'callLogs'];
  }

  if (normRole === 'hr') {
    if (cleanTab === 'attendance') return ['attendanceLogs', 'leaveRequests', 'teamMembers', 'companyHolidays'];
    if (cleanTab === 'team') return ['teamMembers', 'teamGroups', 'paymentVerifications', 'leaveRequests'];
    if (cleanTab === 'approvals') return ['leaveRequests', 'paymentVerifications'];
    return ['teamMembers', 'paymentVerifications', 'attendanceLogs', 'leaveRequests', 'teamGroups', 'companyHolidays'];
  }

  // Admin
  if (cleanTab === 'attendance' || cleanTab === 'attendance_verification') return ['attendanceLogs', 'leaveRequests', 'teamMembers', 'companyHolidays'];
  if (cleanTab === 'leads') return ['assignedLeads', 'leadBatches', 'stats', 'leaveRequests'];
  if (cleanTab === 'revenue' || cleanTab === 'approvals') return ['paymentVerifications', 'leaveRequests', 'teamMembers', 'teamGroups'];
  if (cleanTab === 'people' || cleanTab === 'manage_employees') return ['teamMembers', 'leaveRequests', 'teamGroups'];
  return ['leaveRequests', 'teamMembers', 'paymentVerifications', 'attendanceLogs', 'stats', 'teamGroups', 'teamMeetings', 'companyHolidays'];
}
