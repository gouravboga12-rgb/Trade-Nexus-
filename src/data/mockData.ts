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
  PaymentVerificationItem, 
  AssignedLead, 
  LeadBatch, 
  FaceBiometricProfile, 
  OfferLetterData, 
  CompanyHoliday 
} from '../types';

export const INITIAL_COMPANY_HOLIDAYS: CompanyHoliday[] = [];

export const INITIAL_PROFILE: EmployeeProfile = {
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

export const INITIAL_TELECALLER_STATS: TelecallerStats = {
  todayGoalCalls: 0,
  dialsMade: 0,
  connected: 0,
  interested: 0,
  rejected: 0,
  averageCallDurationSec: 0,
  monthlySalesTarget: 0,
  monthlySalesAchieved: 0,
};

export const INITIAL_CALL_LOGS: CallLogItem[] = [];

export const INITIAL_CLIENT_LEADS: ClientLead[] = [];

export const INITIAL_ATTENDANCE_LOGS: AttendanceRecord[] = [];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [];

export const INITIAL_PAYSLIPS: PayslipItem[] = [];

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [];

export const INITIAL_TEAM_GROUPS: TeamGroup[] = [];

export const INITIAL_TEAM_TASKS: TeamTask[] = [];

export const INITIAL_TEAM_MEETINGS: TeamMeeting[] = [];

export const INITIAL_CANDIDATES: CandidateInterview[] = [];

export const INITIAL_ONBOARDING: OnboardingEmployee[] = [];

export const INITIAL_EXIT_LIST: ExitEmployee[] = [];

export const INITIAL_PAYMENTS: PaymentVerificationItem[] = [];

export const INITIAL_ASSIGNED_LEADS: AssignedLead[] = [];

export const INITIAL_LEAD_BATCHES: LeadBatch[] = [];

export const INITIAL_FACE_PROFILES: FaceBiometricProfile[] = [];

export const INITIAL_OFFER_LETTERS: OfferLetterData[] = [];

export const INITIAL_PAYMENT_VERIFICATIONS: PaymentVerificationItem[] = [];
