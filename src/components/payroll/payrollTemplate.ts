import { PayslipItem, TeamMember } from '../../types';

/**
 * Payroll Slip template (4.png) — single source of truth for every field HR can customize.
 * The builder form, the live preview and validation are all driven from this config, and the
 * server renders the final PDF from the same keys (server/services/pdfGenerator.ts).
 */
export const PAYROLL_TEMPLATE_VERSION = 'payroll-slip-v1';

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export type PayrollFieldType = 'text' | 'email' | 'money' | 'select' | 'month' | 'year' | 'signature';

export interface PayrollField {
  key: keyof PayslipItem;
  label: string;
  type: PayrollFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  /** Shown under the input. */
  hint?: string;
  /** Span the full row in the form grid. */
  wide?: boolean;
}

export interface PayrollSection {
  id: string;
  title: string;
  description: string;
  fields: PayrollField[];
}

export const PAYROLL_SECTIONS: PayrollSection[] = [
  {
    id: 'period',
    title: 'Pay Period',
    description: 'Month shown in the header strip and the pay date.',
    fields: [
      { key: 'month', label: 'Month', type: 'month', required: true },
      { key: 'year', label: 'Year', type: 'year', required: true },
      { key: 'payDate', label: 'Pay Date', type: 'text', required: true, placeholder: 'e.g. 30 September 2026' },
    ],
  },
  {
    id: 'employee',
    title: 'Employee Information',
    description: 'Printed in the two-column information grid.',
    fields: [
      { key: 'employeeName', label: 'Employee Name', type: 'text', required: true },
      { key: 'empCode', label: 'Employee ID', type: 'text', required: true },
      { key: 'department', label: 'Department', type: 'text', required: true },
      { key: 'roleTitle', label: 'Designation', type: 'text', required: true },
      {
        key: 'employeeType', label: 'Employee Type', type: 'select', required: true,
        options: ['Full - Time', 'Part - Time', 'Contract', 'Intern', 'Probation'],
      },
      { key: 'email', label: 'Employee Email', type: 'email', required: true, hint: 'The dispatched payroll PDF is emailed here.' },
    ],
  },
  {
    id: 'earnings',
    title: 'Earnings',
    description: 'Rows of the EARNINGS table.',
    fields: [
      { key: 'basicSalary', label: 'Basic Salary', type: 'money', required: true },
      { key: 'housingAllowance', label: 'Housing Allowance', type: 'money' },
      { key: 'transportation', label: 'Transportation', type: 'money' },
      { key: 'performanceBonus', label: 'Performance Bonus', type: 'money' },
    ],
  },
  {
    id: 'deductions',
    title: 'Deductions',
    description: 'Rows of the DEDUCTIONS table.',
    fields: [
      { key: 'taxDeduction', label: 'Tax (Federal + State)', type: 'money' },
      { key: 'healthInsurance', label: 'Health Insurance', type: 'money' },
      { key: 'pensionContribution', label: 'Pension Contribution', type: 'money' },
    ],
  },
  {
    id: 'payment',
    title: 'Payment Details',
    description: 'Net pay is calculated automatically (Total Earnings − Total Deductions).',
    fields: [
      { key: 'bankAccountNumber', label: 'Bank Account', type: 'text', required: true },
      {
        key: 'paymentMode', label: 'Payment Mode', type: 'select', required: true,
        options: ['Bank Transfer', 'NEFT', 'IMPS', 'RTGS', 'UPI', 'Cheque', 'Cash'],
      },
    ],
  },
  {
    id: 'authorization',
    title: 'Authorization',
    description: 'Bottom-right "Authorized by" block. The name is printed once, under the signature.',
    fields: [
      { key: 'authorizedRole', label: 'Authorized Role', type: 'text', required: true },
      { key: 'authorizedName', label: 'Authorized Name', type: 'text', required: true },
      { key: 'authorizedSignature', label: 'Signature (optional)', type: 'signature', wide: true, hint: 'PNG/JPG, max 300 KB. Leave empty for a blank signing space.' },
    ],
  },
];

export const ALL_PAYROLL_FIELDS: PayrollField[] = PAYROLL_SECTIONS.flatMap(s => s.fields);

export const toNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function computePayrollTotals(p: Partial<PayslipItem>) {
  const basic = toNum(p.basicSalary);
  const housing = toNum(p.housingAllowance ?? p.hra);
  const transport = toNum(p.transportation ?? p.specialAllowance);
  const bonus = toNum(p.performanceBonus ?? p.incentives);
  const tax = toNum(p.taxDeduction);
  const health = toNum(p.healthInsurance ?? p.pfDeduction);
  const pension = toNum(p.pensionContribution);
  const totalEarnings = basic + housing + transport + bonus;
  const totalDeductions = tax + health + pension;
  return { basic, housing, transport, bonus, tax, health, pension, totalEarnings, totalDeductions, netPay: totalEarnings - totalDeductions };
}

/** Labels of required fields that are still empty (mirrors server-side validateForDispatch). */
export function missingRequiredFields(p: Partial<PayslipItem>): string[] {
  const missing: string[] = [];
  if (!p.employeeId) missing.push('Employee');
  for (const f of ALL_PAYROLL_FIELDS) {
    if (!f.required) continue;
    const v = p[f.key];
    if (f.type === 'money') {
      if (!(toNum(v) > 0)) missing.push(f.label);
    } else if (v === undefined || v === null || String(v).trim() === '') {
      missing.push(f.label);
    }
  }
  return missing;
}

const lastDayOfMonth = (month: string, year: number) => {
  const idx = MONTHS.indexOf(month);
  if (idx < 0) return `${month} ${year}`;
  return `${new Date(year, idx + 1, 0).getDate()} ${month} ${year}`;
};

export const defaultPayDate = lastDayOfMonth;

/** Prefill a new payroll from the employee's master record. HR then edits any field. */
export function buildDraftFromEmployee(emp: TeamMember, month: string, year: number, previous?: Partial<PayslipItem>): Partial<PayslipItem> {
  const gross = toNum(emp.salary);
  // Carry forward the last issued structure for this employee when available, else split monthly gross.
  const earnings = previous
    ? {
        basicSalary: toNum(previous.basicSalary),
        housingAllowance: toNum(previous.housingAllowance ?? previous.hra),
        transportation: toNum(previous.transportation ?? previous.specialAllowance),
        performanceBonus: 0,
        taxDeduction: toNum(previous.taxDeduction),
        healthInsurance: toNum(previous.healthInsurance ?? previous.pfDeduction),
        pensionContribution: toNum(previous.pensionContribution),
      }
    : {
        basicSalary: Math.round(gross * 0.5),
        housingAllowance: Math.round(gross * 0.3),
        transportation: Math.round(gross * 0.2),
        performanceBonus: 0,
        taxDeduction: 0,
        healthInsurance: 0,
        pensionContribution: 0,
      };

  return {
    employeeId: emp.id,
    empCode: emp.empCode,
    employeeCode: emp.empCode,
    employeeName: emp.name,
    roleTitle: emp.role,
    department: emp.group || previous?.department || '',
    employeeType: emp.employeeType || emp.empType || previous?.employeeType || 'Full - Time',
    email: emp.email || previous?.email || '',
    month,
    year,
    payDate: lastDayOfMonth(month, year),
    ...earnings,
    bankName: emp.bankName || previous?.bankName || '',
    bankAccountNumber: emp.bankAccountNumber || previous?.bankAccountNumber || '',
    paymentMode: previous?.paymentMode || 'Bank Transfer',
    authorizedRole: previous?.authorizedRole || 'Finance Manager – Trade Nexus',
    authorizedName: previous?.authorizedName || 'Muhammad Patel',
    authorizedSignature: previous?.authorizedSignature || null,
    templateVersion: PAYROLL_TEMPLATE_VERSION,
  };
}

/** Normalise legacy aliases so the payload sent to the server is consistent. */
export function toPayrollPayload(p: Partial<PayslipItem>): Partial<PayslipItem> {
  const t = computePayrollTotals(p);
  return {
    ...p,
    year: toNum(p.year),
    basicSalary: t.basic,
    housingAllowance: t.housing,
    transportation: t.transport,
    performanceBonus: t.bonus,
    taxDeduction: t.tax,
    healthInsurance: t.health,
    pensionContribution: t.pension,
    hra: t.housing,
    specialAllowance: t.transport,
    incentives: t.bonus,
    pfDeduction: t.health,
    netPay: t.netPay,
    employeeCode: p.empCode,
  };
}

export const MONTH_INDEX: Record<string, number> = MONTHS.reduce((acc, m, i) => ({ ...acc, [m.toLowerCase()]: i + 1 }), {} as Record<string, number>);

export const periodSortValue = (p: Partial<PayslipItem>) =>
  toNum(p.year) * 100 + (MONTH_INDEX[String(p.month || '').toLowerCase()] || 0);

export const formatINR = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Generates an optimized, dynamically advancing list of years for payroll.
 * - Starts from at least 2020 (or currentYear - 5).
 * - Extends well into the future (at least 15 years ahead, up to 2040+).
 * - Automatically rolls forward as calendar years advance.
 * - Automatically includes any selected year or existing record year so no historical or custom year is ever lost.
 */
export function getPayrollAvailableYears(selectedYear?: number, extraYears?: number[]): number[] {
  const currentYear = new Date().getFullYear();
  const startYear = Math.min(2020, currentYear - 5);
  const endYear = Math.max(currentYear + 15, 2040);
  const yearSet = new Set<number>();
  for (let y = startYear; y <= endYear; y++) {
    yearSet.add(y);
  }
  if (selectedYear && !isNaN(selectedYear)) yearSet.add(Number(selectedYear));
  if (extraYears) {
    extraYears.forEach(y => { if (y && !isNaN(y)) yearSet.add(Number(y)); });
  }
  return Array.from(yearSet).sort((a, b) => a - b);
}
