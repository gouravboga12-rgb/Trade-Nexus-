export type UserRole = 'telecaller' | 'employee' | 'team_leader' | 'hr' | 'admin';

export type AuthStep = 'LOGIN' | 'FACE_SCAN' | 'ATTENDANCE_SUCCESS' | 'AUTHENTICATED';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  empCode: string | null;
  employeeId: string | null;
  groupName?: string;
  phone?: string;
}

export type NavTab = 'home' | 'calling' | 'clients' | 'leaves' | 'profile' | 'menu';

export type CallOutcome = 'CONNECTED' | 'BUSY' | 'CALLBACK' | 'INTERESTED' | 'NOT_INTERESTED' | 'DEAL_CLOSED';

export type LeadTemperature = 'HOT' | 'WARM' | 'COLD' | 'CONVERTED';

export interface TelecallerStats {
  todayGoalCalls: number;
  dialsMade: number;
  connected: number;
  interested: number;
  rejected: number;
  averageCallDurationSec: number;
  monthlySalesTarget: number;
  monthlySalesAchieved: number;
}

export interface CallLogItem {
  id: string;
  clientName: string;
  phoneNumber: string;
  companyName: string;
  timestamp: string;
  durationSec: number;
  outcome: CallOutcome;
  notes: string;
  followUpDate?: string;
  employeeId?: string;
  createdAt?: string;
  date?: string;
}

export interface ClientLead {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  temperature: LeadTemperature;
  status: 'Due Today' | 'Pending' | 'Follow-up' | 'Converted';
  dueTime?: string;
  dealValue: number;
  requirement: string;
  lastContacted: string;
}

export interface CompanyHoliday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type?: 'NATIONAL' | 'FESTIVAL' | 'COMPANY' | 'OPTIONAL';
  description?: string;
}

export interface CalendarSettings {
  id?: string;
  weeklyOffDays: number[]; // e.g. [0] for Sunday, [0, 6] for Sat & Sun
  weekendPolicy: 'SUNDAY_ONLY' | 'SATURDAY_SUNDAY' | 'ALTERNATE_SATURDAY' | 'CUSTOM';
  shiftStartTime: string; // e.g. "09:30 AM"
  shiftEndTime: string;   // e.g. "06:30 PM"
  gracePeriodMinutes: number; // e.g. 15
  halfDayThresholdHours: number; // e.g. 4.0
  fullDayThresholdHours: number; // e.g. 8.0
  updatedAt?: string;
}

export interface AttendanceRecord {
  id?: string;
  employeeId?: string;
  employeeName?: string;
  /** Photo taken at check-in. Admin only — never sent to other roles. */
  checkInPhoto?: string;
  /** Coordinates at check-in. Admin only — never sent to other roles. */
  checkInLat?: number;
  checkInLng?: number;
  /** Metres from the office at check-in. */
  checkInDistanceM?: number;
  locationStatus?: 'AT_OFFICE' | 'AWAY' | 'NOT_SHARED' | 'OFFICE_NOT_SET';
  date: string;
  dayNumber: number;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY' | 'HALF_DAY';
  checkIn?: string;
  checkOut?: string;
  workHours?: string;
  method?: 'Face ID Biometric' | 'Geo-tagged';
}

export interface LeaveRequest {
  id: string;
  employeeName?: string;
  employeeCode?: string;
  leaveType: 'Casual Leave' | 'Sick Leave' | 'Earned / Paid Leave';
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedOn: string;
  approvedBy?: string;
}

export interface PayslipItem {
  id: string;
  employeeId?: string;
  employeeName?: string;
  employeeCode?: string;
  month: string;
  year: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  incentives: number;
  pfDeduction: number;
  taxDeduction: number;
  netPay: number;
  generatedDate: string;
  status: 'PAID';
}

export interface EmployeeProfile {
  id: string;
  empCode: string;
  name: string;
  roleTitle: string;
  department: string;
  teamName: string;
  teamLeaderName: string;
  email: string;
  phone: string;
  joinDate: string;
  bloodGroup: string;
  faceIdStatus: 'VERIFIED_PRESENT' | 'ON_BREAK' | 'NOT_CHECKED_IN';
  checkInTime: string;
  checkOutTime?: string;
  totalLeaveBalance: number;
}

export interface TeamMember {
  id: string;
  empCode: string;
  name: string;
  avatar: string;
  role: string;
  group: string;
  phone: string;
  attendanceStatus: 'PRESENT' | 'LATE' | 'ON_LEAVE' | 'ABSENT';
  checkInTime?: string;
  checkOutTime?: string;
  checkInMethod?: 'Face ID Biometric' | 'Geo-tagged' | '' | string;
  dialsToday: number;
  goalCalls: number;
  connected: number;
  interested: number;
  salesAchieved: number;
  salesTarget: number;
  conversionRate: number;
  email?: string;
  /** Which of the four portals this person may enter. */
  portal?: UserRole;
  password?: string;
  active?: number;
  deactivatedOn?: string;
}

export interface TeamGroup {
  id: string;
  name: string;
  description: string;
  leaderName: string;
  memberCount: number;
  monthlyTarget: number;
  achieved: number;
  color: string;
}

export interface TeamTask {
  id: string;
  title: string;
  assignedTo: string;
  group?: string;
  dueDate: string;
  priority: 'HIGH' | 'MEDIUM' | 'NORMAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface TeamMeeting {
  id: string;
  title: string;
  dateTime: string;
  type: string;
  location: string;
  attendeesCount: number;
  agenda: string;
  status?: 'LIVE' | 'UPCOMING' | 'COMPLETED';
  meetingLink?: string;
  invitedMemberName?: string;
  targetAudience?: 'ALL' | 'TEAM' | 'INDIVIDUAL' | 'LEADERSHIP';
  targetTeam?: string;
  targetEmployeeId?: string;
  createdByRole?: string;
  priority?: 'NORMAL' | 'HIGH' | 'MANDATORY';
}

export interface CandidateInterview {
  id: string;
  candidateName: string;
  roleApplied: string;
  experience: string;
  email: string;
  phone: string;
  status: 'APPLIED' | 'SCREENING' | 'INTERVIEW_SCHEDULED' | 'OFFER_EXTENDED' | 'HIRED' | 'REJECTED';
  interviewTime?: string;
  interviewer?: string;
  rating?: number;
  notes?: string;
}

export interface OnboardingEmployee {
  id: string;
  empCode: string;
  name: string;
  role: string;
  department: string;
  joiningDate: string;
  probationEnd: string;
  status: 'DOCS_PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  checklist: {
    documentsVerified: boolean;
    workstationAllocated: boolean;
    biometricEnrolled: boolean;
    trainingScheduled: boolean;
  };
}

export interface ExitEmployee {
  id: string;
  empCode: string;
  name: string;
  role: string;
  department: string;
  resignationDate: string;
  lastWorkingDay: string;
  status: 'CLEARANCE_PENDING' | 'CLEARANCE_COMPLETED' | 'RELIEVED';
  checklist: {
    assetsReturned: boolean;
    accountsSettled: boolean;
    knowledgeTransfer: boolean;
    relievingLetterIssued: boolean;
  };
}

export interface AssignedLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company: string;
  city?: string;
  assignedToEmployeeId: string;
  assignedToEmployeeName: string;
  batchId: string;
  assignedDate: string;
  status: 'PENDING' | 'CONNECTED' | 'INTERESTED' | 'CALLBACK' | 'NOT_INTERESTED' | 'CONVERTED' | 'BUSY';
  notes: string;
  callCount: number;
  lastCallTimestamp?: string;
  dealValue?: number;
  followUpDate?: string;
  updatedAt?: string;
}

export interface LeadBatch {
  id: string;
  fileName: string;
  uploadedAt: string;
  totalLeads: number;
  assignedToEmployeeName: string;
  assignedToEmployeeId: string;
}

export interface FaceBiometricProfile {
  employeeId: string;
  employeeName: string;
  registeredPhoto: string; // Base64 data URL
  registeredAt: string;
  status: 'REGISTERED' | 'NOT_REGISTERED';
}

export interface OfferLetterData {
  id: string;
  candidateName: string;
  candidateAddress?: string;
  candidateEmail: string;
  candidatePhone: string;
  roleTitle: string;
  department: string;
  annualCtc: number;
  monthlyGross: number;
  joiningDate: string;
  reportingManager: string;
  location: string;
  issuedDate: string;
  acceptanceDeadline?: string;
  signatoryName?: string;
  signatoryRole?: string;
}

export interface NewEmployeeInput {
  firstName: string;
  lastName: string;
  name: string; // Combined full name
  email: string;
  phone: string;
  role: UserRole;
  roleTitle: string;
  department: string;
  teamGroup: string;
  teamLeaderName?: string;
  address: string;
  location?: string;
  employeeType: 'Full Time' | 'Intern' | 'Contract';
  salary: number;
  basicSalary?: number;
  hra?: number;
  specialAllowance?: number;
  panDocumentName?: string;
  aadhaarDocumentName?: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfscCode: string;
  empCode: string;
  password?: string;
  joiningDate: string;
  salaryDate: string;
}

export interface PaymentVerificationItem {
  id: string;
  leadName: string;
  companyName: string;
  telecallerName: string;
  dealAmount: number;
  utrNumber: string;
  paymentMode: string;
  timestamp: string;
  status: 'PENDING_HR_AUDIT' | 'VERIFIED' | 'REJECTED';
  receiptUrl?: string;
}

export interface OfficeSettings {
  id: string;
  label: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
}

export interface ExperienceCertData {
  id: string;
  employeeName: string;
  empCode: string;
  guardianName?: string;
  designation: string;
  department: string;
  startDate: string;
  endDate: string;
  refNumber: string;
  issuedDate: string;
  conductRemarks?: string;
  signatoryName: string;
  signatoryRole: string;
}

export interface RelievingLetterData {
  id: string;
  employeeName: string;
  empCode: string;
  designation: string;
  department: string;
  employeeType: string;
  employeeAddress: string;
  resignationDate: string;
  lastWorkingDate: string;
  joiningDate: string;
  issuedDate: string;
  signatoryName: string;
  signatoryRole: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  // Bill To
  clientName: string;
  clientCompany?: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress: string;
  // From
  fromName: string;
  fromRole?: string;
  fromPhone: string;
  fromEmail: string;
  fromAddress: string;
  // Items & Summary
  items: InvoiceItem[];
  subTotal: number;
  taxRate?: number;
  taxAmount?: number;
  grandTotal: number;
  note?: string;
  // Payment Info
  bankName: string;
  accountNumber: string;
  ifscCode?: string;
  paymentEmail: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
}

