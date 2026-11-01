const fs = require('fs');
const content = fs.readFileSync('tradexx/src/services/api.ts', 'utf8');

const replacementHeader = `import {
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
  InvoiceData,
  RelievingLetterData,
  ExperienceCertData,
  TopPerformer,
} from '../types';
import { storageService } from './storageService';

export type { AuthUser };

export const API_BASE = 'https://tradenexustradesmart.co.in/api';

let cachedToken: string | null = null;
let cachedUser: AuthUser | null = null;

export async function initApiAuth(): Promise<void> {
  cachedToken = await storageService.getToken();
  cachedUser = await storageService.getUser();
}

export function getAuthToken(): string | null {
  return cachedToken;
}

export function setAuthToken(token: string | null): void {
  cachedToken = token;
  if (token) {
    storageService.setToken(token).catch(console.warn);
  } else {
    storageService.removeToken().catch(console.warn);
  }
}

export function getStoredAuthUser(): AuthUser | null {
  return cachedUser;
}

export function setStoredAuthUser(user: AuthUser | null): void {
  cachedUser = user;
  if (user) {
    storageService.setUser(user).catch(console.warn);
  } else {
    storageService.setUser(null).catch(console.warn);
  }
}
`;

const idx = content.indexOf('export class ApiError');
if (idx === -1) {
  throw new Error('Could not find ApiError');
}
const rest = content.slice(idx);

fs.writeFileSync('tradex-mobile/src/services/api.ts', replacementHeader + '\n' + rest, 'utf8');
console.log('Created tradex-mobile/src/services/api.ts successfully');

