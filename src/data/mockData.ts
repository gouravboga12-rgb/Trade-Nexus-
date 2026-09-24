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
  ExperienceCertData,
  RelievingLetterData,
  InvoiceData,
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

export const INITIAL_OFFER_LETTERS: OfferLetterData[] = [
  {
    id: 'off-001',
    candidateName: 'Jonathan Patterson',
    candidateAddress: '123 Anywhere St., Any City\nST 12345',
    candidateEmail: 'jonathan.patterson@gmail.com',
    candidatePhone: '+1 234-567-8900',
    roleTitle: 'Marketing Coordinator',
    department: 'Marketing & Brand Strategy',
    annualCtc: 8400000,
    monthlyGross: 700000,
    joiningDate: 'September 9, 2025',
    reportingManager: 'Rosa Maria (Marketing Manager)',
    location: 'Trade Nexus Corporate HQ',
    issuedDate: '24 August 2025',
    acceptanceDeadline: 'August 30, 2025',
    signatoryName: 'T. Vidhya Sagar',
    signatoryRole: 'Chief executive Officer'
  }
];

export const INITIAL_EXPERIENCE_CERTS: ExperienceCertData[] = [
  {
    id: 'exp-001',
    employeeName: 'Amitabh',
    empCode: 'TNX-001',
    guardianName: 'Sh. Heera Singh',
    designation: 'Captain',
    department: 'Client Acquisition',
    startDate: '26th May 2023',
    endDate: '03rd January 2025',
    refNumber: 'TNX/EXP/2025/001',
    issuedDate: '01-01-2025',
    conductRemarks: 'During his tenure, Mr. Amitabh performed his duties with sincerity, professionalism, and dedication. He was responsible for supervising restaurant & operations, ensuring high standards of customer service, coordinating with staff, and maintaining smooth day-to-day operations. His conduct and performance were satisfactory throughout his period of employment.',
    signatoryName: 'T. Vidhya Sagar',
    signatoryRole: 'Chief Executive Officer'
  }
];

export const INITIAL_RELIEVING_LETTERS: RelievingLetterData[] = [
  {
    id: 'rel-001',
    employeeName: 'Avery Davis',
    empCode: 'TNX-042',
    designation: 'Digital Marketing Specialist',
    department: 'Marketing & Communications',
    employeeType: 'Full-Time',
    employeeAddress: '123 Business Avenue, Financial District, Your City, 500001',
    resignationDate: '15 July 2025',
    lastWorkingDate: '31 August 2025',
    joiningDate: '12 January 2024',
    issuedDate: '31/08/2025',
    signatoryName: 'T .Vidhya Sagar',
    signatoryRole: 'Chief Executive Officer'
  }
];

export const INITIAL_INVOICES: InvoiceData[] = [
  {
    id: 'inv-001',
    invoiceNumber: 'INV-2025-001',
    date: '26 June 2025',
    dueDate: '10 July 2025',
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
      { id: 'item-3', description: 'Dedicated SDR Dedicated Support', quantity: 1, unitPrice: 5000, total: 5000 }
    ],
    subTotal: 45000,
    grandTotal: 45000,
    note: 'Payment is due within 15 days of invoice date.',
    bankName: 'HDFC Bank',
    accountNumber: '123-456-7890',
    ifscCode: 'HDFC0001234',
    paymentEmail: 'reallygreatsite.com',
    status: 'PAID'
  }
];

export const INITIAL_PAYMENT_VERIFICATIONS: PaymentVerificationItem[] = [];

