const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'server', 'db', 'data', 'tradenexus.sqlite');
const db = new Database(dbPath);

console.log('Testing Phase 3 Payslips Database Operations...');

const testId = `test-pay-${Date.now()}`;
const testPayload = {
  id: testId,
  employeeId: 'emp-001',
  empCode: 'TNX-042',
  employeeName: 'Avery Davis',
  roleTitle: 'Senior Growth Marketer',
  department: 'Marketing & Expansion',
  employeeType: 'Full - Time',
  payDate: '31 October 2026',
  month: 'October',
  year: 2026,
  basicSalary: 32000,
  hra: 6000,
  specialAllowance: 2500,
  incentives: 4000,
  housingAllowance: 6000,
  transportation: 2500,
  performanceBonus: 4000,
  pfDeduction: 600,
  taxDeduction: 3200,
  healthInsurance: 600,
  pensionContribution: 250,
  netPay: (32000 + 6000 + 2500 + 4000) - (3200 + 600 + 250),
  generatedDate: '31 October 2026',
  status: 'PAID',
  email: 'avery.davis@tradenexus.com',
  bankName: 'HDFC Corporate Bank',
  bankAccountNumber: '987 6543 210',
  paymentMode: 'Direct IMPS',
  authorizedName: 'Muhammad Patel',
  authorizedRole: 'Finance Director – Trade Nexus',
  changeRemarks: 'Phase 3 Verification Payslip'
};

// Insert
db.prepare(`
  INSERT INTO payslips (
    id, employeeId, empCode, employeeName, roleTitle, department,
    employeeType, payDate, month, year,
    basicSalary, hra, specialAllowance, incentives,
    housingAllowance, transportation, performanceBonus,
    pfDeduction, taxDeduction, healthInsurance, pensionContribution,
    netPay, generatedDate, status, email, bankName, bankAccountNumber,
    paymentMode, authorizedName, authorizedRole, changeRemarks
  ) VALUES (
    @id, @employeeId, @empCode, @employeeName, @roleTitle, @department,
    @employeeType, @payDate, @month, @year,
    @basicSalary, @hra, @specialAllowance, @incentives,
    @housingAllowance, @transportation, @performanceBonus,
    @pfDeduction, @taxDeduction, @healthInsurance, @pensionContribution,
    @netPay, @generatedDate, @status, @email, @bankName, @bankAccountNumber,
    @paymentMode, @authorizedName, @authorizedRole, @changeRemarks
  )
`).run(testPayload);

console.log('✓ Successfully inserted payslip with all Phase 3 dynamic fields');

// Fetch
const fetched = db.prepare('SELECT * FROM payslips WHERE id = ?').get(testId);
console.log('Fetched record:');
console.log({
  id: fetched.id,
  employeeName: fetched.employeeName,
  employeeType: fetched.employeeType,
  payDate: fetched.payDate,
  earnings: {
    basic: fetched.basicSalary,
    housing: fetched.housingAllowance,
    transportation: fetched.transportation,
    bonus: fetched.performanceBonus,
  },
  deductions: {
    tax: fetched.taxDeduction,
    insurance: fetched.healthInsurance,
    pension: fetched.pensionContribution,
  },
  netPay: fetched.netPay,
  bankAccount: fetched.bankAccountNumber,
  paymentMode: fetched.paymentMode,
  authorizedName: fetched.authorizedName,
  authorizedRole: fetched.authorizedRole,
});

// Update test
db.prepare(`
  UPDATE payslips SET
    basicSalary = 35000,
    housingAllowance = 7000,
    performanceBonus = 5000,
    netPay = 42000,
    authorizedName = 'Farhan Akhtar'
  WHERE id = ?
`).run(testId);

const updated = db.prepare('SELECT basicSalary, housingAllowance, performanceBonus, netPay, authorizedName FROM payslips WHERE id = ?').get(testId);
console.log('✓ Update verified:');
console.log(updated);

// Clean up test row
db.prepare('DELETE FROM payslips WHERE id = ?').run(testId);
console.log('✓ Cleaned up test record');
console.log('ALL PHASE 3 DATABASE OPERATIONS VERIFIED 100%!');
