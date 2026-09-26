import {
  EmployeeProfile,
  TelecallerStats,
  CallLogItem,
  ClientLead,
  AttendanceRecord,
  LeaveRequest,
  PayslipItem,
  TeamMember,
  TeamGroup,
  TeamTask,
  TeamMeeting,
  CandidateInterview,
  OnboardingEmployee,
  ExitEmployee,
  AssignedLead,
  LeadBatch,
  FaceBiometricProfile,
  OfferLetterData,
  PaymentVerificationItem,
  OfficeSettings,
  CompanyHoliday,
  CalendarSettings,
  AuthUser,
} from '../types';

export type { AuthUser };

const envApiUrl = (import.meta as any).env?.VITE_API_URL;
const API_BASE = envApiUrl
  ? `${String(envApiUrl).replace(/\/$/, '')}/api`
  : (typeof window !== 'undefined' && window.location.hostname === 'localhost') 
  ? 'http://localhost:5001/api' 
  : '/api';

const TOKEN_KEY = 'tnx_auth_token';
const USER_KEY = 'tnx_auth_user';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage blocked — the session simply will not survive a reload
  }
}

export function getStoredAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuthUser(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // Storage blocked
  }
}

/** Thrown for a non-2xx response, carrying the status so callers can branch. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errBody.error || `Request failed (${res.status})`);
  }

  return (await res.json()) as T;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: AuthUser }>('/auth/me'),
  createLogin: (data: { email: string; name: string; role: string; empCode?: string; employeeId?: string }) =>
    request<{ email: string; temporaryPassword: string }>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  forgotPasswordSendOtp: (email: string, role?: string) =>
    request<{ ok: boolean; email: string; role?: string; name?: string; message: string; devHint?: string }>('/auth/forgot-password/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  forgotPasswordVerifyOtp: (email: string, otp: string) =>
    request<{ ok: boolean; message: string }>('/auth/forgot-password/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),
  forgotPasswordResetPassword: (email: string, otp: string, newPassword: string) =>
    request<{ ok: boolean; message: string; user?: AuthUser }>('/auth/forgot-password/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    }),

  // Profile
  getProfile: () => request<EmployeeProfile>('/profile'),
  updateProfile: (data: Partial<EmployeeProfile>) => 
    request<EmployeeProfile>('/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Stats
  getStats: () => request<TelecallerStats>('/stats'),
  updateStats: (data: Partial<TelecallerStats>) => 
    request<TelecallerStats>('/stats', { method: 'PUT', body: JSON.stringify(data) }),

  // Call Logs
  getCallLogs: () => request<CallLogItem[]>('/call-logs'),
  createCallLog: (data: Omit<CallLogItem, 'id'> & { id?: string }) => 
    request<CallLogItem>('/call-logs', { method: 'POST', body: JSON.stringify(data) }),
  deleteCallLog: (id: string) => 
    request<{ success: boolean }>('/call-logs/' + id, { method: 'DELETE' }),

  // Clients
  getClients: () => request<ClientLead[]>('/clients'),
  createClient: (data: Omit<ClientLead, 'id'> & { id?: string }) => 
    request<ClientLead>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: string, data: Partial<ClientLead>) => 
    request<ClientLead>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id: string) => 
    request<{ success: boolean }>(`/clients/${id}`, { method: 'DELETE' }),

  // Attendance
  getTodayAttendance: (employeeId?: string) =>
    request<{
      hasRecord: boolean;
      id?: string;
      date: string;
      status: string;
      faceIdStatus: string;
      checkIn: string | null;
      checkOut: string | null;
      workHours: string | null;
      method?: string;
      locationStatus?: string;
    }>(`/attendance/today${employeeId ? `?employeeId=${employeeId}` : ''}`),
  getAttendance: (role?: string, employeeId?: string) => {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (employeeId) params.set('employeeId', employeeId);
    const qs = params.toString();
    return request<AttendanceRecord[]>(`/attendance${qs ? `?${qs}` : ''}`);
  },
  updateAttendance2: (id: string, data: Partial<AttendanceRecord>) =>
    request<AttendanceRecord>(`/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getOffice: () => request<OfficeSettings>('/attendance/office'),
  updateOffice: (data: Partial<OfficeSettings>) =>
    request<OfficeSettings>('/attendance/office', { method: 'PUT', body: JSON.stringify(data) }),
  reverseGeocode: async (lat: number, lng: number): Promise<string | null> => {
    // 1. Try backend geocode reverse proxy (with JWT token)
    try {
      const data = await request<{ displayName: string }>(`/attendance/geocode/reverse?lat=${lat}&lon=${lng}`);
      if (data?.displayName) return data.displayName;
    } catch {
      // Fallback
    }

    // 2. Client-side fallback via BigDataCloud (CORS-friendly, no keys)
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      if (bdcRes.ok) {
        const bdc = (await bdcRes.json()) as any;
        const parts = [
          bdc.locality || bdc.city,
          bdc.principalSubdivision,
          bdc.postcode,
          bdc.countryName
        ].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
      }
    } catch {
      // Fallback
    }

    return null;
  },
  searchAddress: async (query: string): Promise<Array<{ display_name: string; lat: string; lon: string }>> => {
    // 1. Try backend geocode search proxy (with JWT token)
    try {
      const data = await request<Array<{ display_name: string; lat: string; lon: string }>>(
        `/attendance/geocode/search?q=${encodeURIComponent(query.trim())}`
      );
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          display_name: item.display_name,
          lat: String(item.lat),
          lon: String(item.lon)
        }));
      }
    } catch {
      // Fallback
    }
    return [];
  },
  recordAttendance: (data: AttendanceRecord) => 
    request<AttendanceRecord>('/attendance', { method: 'POST', body: JSON.stringify(data) }),
  updateAttendance: (id: string, data: Partial<AttendanceRecord>) => 
    request<AttendanceRecord>(`/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Leaves
  getLeaves: () => request<LeaveRequest[]>('/leaves'),
  createLeave: (data: Omit<LeaveRequest, 'id'> & { id?: string }) => 
    request<LeaveRequest>('/leaves', { method: 'POST', body: JSON.stringify(data) }),
  updateLeave: (id: string, data: Partial<LeaveRequest>) => 
    request<LeaveRequest>(`/leaves/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Payslips
  getPayslips: () => request<PayslipItem[]>('/payslips'),
  createPayslip: (data: Omit<PayslipItem, 'id'> & { id?: string }) => 
    request<PayslipItem>('/payslips', { method: 'POST', body: JSON.stringify(data) }),
  generateBulkPayslips: (month: string, year: string) => 
    request<PayslipItem>('/payslips/bulk', { method: 'POST', body: JSON.stringify({ month, year }) }),

  // Team Members
  getTeamMembers: () => request<TeamMember[]>('/team-members'),
  createTeamMember: (data: Omit<TeamMember, 'id'> & { id?: string }) => 
    request<TeamMember>('/team-members', { method: 'POST', body: JSON.stringify(data) }),
  updateTeamMember: (id: string, data: Partial<TeamMember>) => 
    request<TeamMember>(`/team-members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTeamMember: (id: string) =>
    request<{ success: boolean; deletedId: string; name?: string; empCode?: string }>(`/team-members/${id}`, { method: 'DELETE' }),

  // Team Groups
  getTeamGroups: () => request<TeamGroup[]>('/team-groups'),
  createTeamGroup: (data: Omit<TeamGroup, 'id'> & { id?: string }) => 
    request<TeamGroup>('/team-groups', { method: 'POST', body: JSON.stringify(data) }),
  updateTeamGroup: (id: string, data: Partial<TeamGroup>) => 
    request<TeamGroup>(`/team-groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Team Tasks
  getTeamTasks: () => request<TeamTask[]>('/team-tasks'),
  createTeamTask: (data: Omit<TeamTask, 'id'> & { id?: string }) => 
    request<TeamTask>('/team-tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTeamTask: (id: string, data: Partial<TeamTask>) => 
    request<TeamTask>(`/team-tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Team Meetings
  getTeamMeetings: () => request<TeamMeeting[]>('/team-meetings'),
  createTeamMeeting: (data: Omit<TeamMeeting, 'id'> & { id?: string; useZoom?: boolean }) => 
    request<TeamMeeting>('/team-meetings', { method: 'POST', body: JSON.stringify(data) }),
  createZoomMeeting: (data: {
    title: string;
    dateTime?: string;
    duration?: number;
    agenda?: string;
    type?: string;
    targetAudience?: string;
    targetTeam?: string;
    targetEmployeeId?: string;
    invitedMemberName?: string;
    includeAdmin?: boolean | number;
    priority?: string;
    attendeesCount?: number;
  }) => request<TeamMeeting>('/team-meetings/create-zoom', { method: 'POST', body: JSON.stringify(data) }),
  updateTeamMeeting: (id: string, data: Partial<TeamMeeting>) => 
    request<TeamMeeting>(`/team-meetings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTeamMeeting: (id: string) => 
    request<{ success: boolean }>(`/team-meetings/${id}`, { method: 'DELETE' }),

  // Candidates / Interviews
  getInterviews: () => request<CandidateInterview[]>('/interviews'),
  createInterview: (data: Omit<CandidateInterview, 'id'> & { id?: string }) => 
    request<CandidateInterview>('/interviews', { method: 'POST', body: JSON.stringify(data) }),
  updateInterview: (id: string, data: Partial<CandidateInterview>) => 
    request<CandidateInterview>(`/interviews/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Onboarding
  getOnboarding: () => request<OnboardingEmployee[]>('/onboarding'),
  createOnboarding: (data: OnboardingEmployee) => 
    request<OnboardingEmployee>('/onboarding', { method: 'POST', body: JSON.stringify(data) }),
  updateOnboarding: (id: string, data: Partial<OnboardingEmployee>) => 
    request<OnboardingEmployee>(`/onboarding/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Exit Employees
  getExitEmployees: () => request<ExitEmployee[]>('/exit-employees'),
  createExitEmployee: (data: ExitEmployee) => 
    request<ExitEmployee>('/exit-employees', { method: 'POST', body: JSON.stringify(data) }),
  updateExitEmployee: (id: string, data: Partial<ExitEmployee>) => 
    request<ExitEmployee>(`/exit-employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Assigned Leads
  getAssignedLeads: (employeeId?: string) => 
    request<AssignedLead[]>(`/assigned-leads${employeeId ? `?employeeId=${employeeId}` : ''}`),
  createAssignedLead: (data: Omit<AssignedLead, 'id'> & { id?: string }) => 
    request<AssignedLead>('/assigned-leads', { method: 'POST', body: JSON.stringify(data) }),
  bulkImportAssignedLeads: (fileName: string, targetEmployeeId: string, targetEmployeeName: string, leads: any[]) => 
    request<{ batch: LeadBatch; leads: AssignedLead[] }>('/assigned-leads/bulk', {
      method: 'POST',
      body: JSON.stringify({ fileName, targetEmployeeId, targetEmployeeName, leads }),
    }),
  updateAssignedLead: (id: string, data: Partial<AssignedLead>) => 
    request<AssignedLead>(`/assigned-leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  reassignBatchAssignedLeads: (data: { leadIds: string[]; targetEmployeeId: string; targetEmployeeName: string }) => 
    request<{ success: boolean; count: number; targetEmployeeId: string; targetEmployeeName: string }>('/assigned-leads/reassign-batch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Lead Batches
  getLeadBatches: () => request<LeadBatch[]>('/lead-batches'),
  createLeadBatch: (data: Omit<LeadBatch, 'id'> & { id?: string }) => 
    request<LeadBatch>('/lead-batches', { method: 'POST', body: JSON.stringify(data) }),

  // Biometrics
  getBiometrics: () => request<FaceBiometricProfile[]>('/biometrics'),
  registerBiometric: (data: FaceBiometricProfile) => 
    request<FaceBiometricProfile>('/biometrics', { method: 'POST', body: JSON.stringify(data) }),
  verifyBiometric: (employeeId?: string) => 
    request<{ verified: boolean; checkInTime: string; status: string }>('/biometrics/verify', {
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    }),

  // Offer Letters
  getOfferLetters: () => request<OfferLetterData[]>('/offer-letters'),
  createOfferLetter: (data: Omit<OfferLetterData, 'id'> & { id?: string }) => 
    request<OfferLetterData>('/offer-letters', { method: 'POST', body: JSON.stringify(data) }),

  // Payments
  // Employee documents
  getEmployeeDocuments: (employeeId: string) =>
    request<any[]>(`/employee-documents?employeeId=${employeeId}`),
  getEmployeeDocument: (id: string) => request<any>(`/employee-documents/${id}`),
  uploadEmployeeDocument: (data: {
    employeeId: string; title: string; category: string; fileName: string;
    mimeType: string; sizeBytes: number; content: string;
  }) => request<any>('/employee-documents', { method: 'POST', body: JSON.stringify(data) }),
  deleteEmployeeDocument: (id: string) =>
    request<{ deleted: string }>(`/employee-documents/${id}`, { method: 'DELETE' }),

  getPayments: () => request<PaymentVerificationItem[]>('/payments'),
  createPayment: (data: Omit<PaymentVerificationItem, 'id'> & { id?: string }) => 
    request<PaymentVerificationItem>('/payments', { method: 'POST', body: JSON.stringify(data) }),
  updatePayment: (id: string, data: Partial<PaymentVerificationItem>) => 
    request<PaymentVerificationItem>(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Company Calendar & Holidays
  getHolidays: () => request<CompanyHoliday[]>('/calendar/holidays'),
  createHoliday: (data: Omit<CompanyHoliday, 'id'> & { id?: string }) =>
    request<CompanyHoliday>('/calendar/holidays', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoliday: (id: string) =>
    request<{ deleted: string }>(`/calendar/holidays/${id}`, { method: 'DELETE' }),
  clearAllHolidays: () =>
    request<{ cleared: boolean }>('/calendar/holidays', { method: 'DELETE' }),
  loadPresetHolidays: () =>
    request<CompanyHoliday[]>('/calendar/holidays/bulk-preset', { method: 'POST' }),
  getCalendarSettings: () => request<CalendarSettings>('/calendar/settings'),
  updateCalendarSettings: (data: Partial<CalendarSettings>) =>
    request<CalendarSettings>('/calendar/settings', { method: 'PUT', body: JSON.stringify(data) }),
};
