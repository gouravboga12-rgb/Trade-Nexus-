import PDFDocument from 'pdfkit';

/**
 * Utility to convert a streaming PDFDocument instance into a Buffer Promise
 */
function docToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. JOB OFFER LETTER PDF GENERATOR (Standard A4)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateOfferLetterPdf(data: {
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateAddress?: string;
  roleTitle?: string;
  annualCtc?: number | string;
  monthlyGross?: number | string;
  joiningDate?: string;
  reportingManager?: string;
  acceptanceDeadline?: string;
  issuedDate?: string;
  signatoryName?: string;
  signatoryRole?: string;
}): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `Job Offer Letter - ${data.candidateName}`,
      Author: 'Trade Nexus Corporate HR',
      Subject: 'Official Employment Offer Letter',
      Creator: 'Trade Nexus HRMS',
    }
  });

  const bufferPromise = docToBuffer(doc);
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  // ── Top Navy Banner (0 to 90pt) ──
  doc.rect(0, 0, pageWidth, 90).fill('#06152B');

  // Decorative Teal Accent Stripes
  doc.rect(0, 90, pageWidth, 5).fill('#00A88B');
  doc.rect(0, 95, pageWidth * 0.6, 2.5).fill('#38E1B7');

  // Brand Name & Logo Placeholder
  doc.circle(42, 45, 18).lineWidth(2).stroke('#00C9A7');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#00C9A7').text('TN', 34, 39);

  doc.fontSize(18).font('Helvetica-Bold').fillColor('#FFFFFF').text('TRADE NEXUS', 72, 33);
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#00C9A7').text('TRADE SMART  •  OPERATIONS & TRADING SUITE', 72, 54);

  // Document Title Header Right
  doc.fontSize(15).font('Helvetica-Bold').fillColor('#FFFFFF').text('JOB OFFER LETTER', 0, 36, {
    align: 'right',
    width: pageWidth - 40,
  });
  doc.fontSize(8).font('Helvetica').fillColor('#94A3B8').text('Confidential Corporate Communication', 0, 54, {
    align: 'right',
    width: pageWidth - 40,
  });

  // ── Company Contact Line & Issued Date ──
  const startY = 115;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Trade Nexus Corporate Office', 40, startY);
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text('123 Business Avenue, Financial District, Telangana 500001', 40, startY + 12);
  doc.text('Phone: +91 98765 43210  •  Email: hr@tradenexus.live  •  Web: www.tradenexus.com', 40, startY + 23);

  const issuedDate = data.issuedDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(`Date: ${issuedDate}`, 0, startY, {
    align: 'right',
    width: pageWidth - 40,
  });

  doc.moveTo(40, startY + 38).lineTo(pageWidth - 40, startY + 38).lineWidth(0.75).strokeColor('#E2E8F0').stroke();

  // ── Candidate Address ──
  const recipientY = startY + 50;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748B').text('TO,', 40, recipientY);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#0A2540').text(data.candidateName, 40, recipientY + 12);
  if (data.candidateEmail) {
    doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(`Email: ${data.candidateEmail}`, 40, recipientY + 26);
  }
  if (data.candidatePhone) {
    doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(`Contact: ${data.candidatePhone}`, 40, recipientY + 37);
  }

  // ── Salutation & Body Text ──
  const firstName = data.candidateName.split(' ')[0] || data.candidateName;
  const bodyY = recipientY + 54;
  doc.fontSize(9.5).font('Helvetica').fillColor('#1E293B').text(`Dear ${firstName},`, 40, bodyY);

  const role = data.roleTitle || 'Senior Telecaller / SDR';
  const joinDate = data.joiningDate || 'Immediate';
  const manager = data.reportingManager || 'Branch Operations Team Leader';
  const monthlySalary = typeof data.monthlyGross === 'number'
    ? `INR ${data.monthlyGross.toLocaleString('en-IN')}`
    : data.monthlyGross ? `INR ${data.monthlyGross}` : 'INR 35,000';
  const deadline = data.acceptanceDeadline || 'within 7 days of receipt';

  const introText = `We are pleased to offer you the position of ${role} with Trade Nexus, commencing on ${joinDate}. In this role, you will report directly to ${manager} and will be based at our corporate headquarters.`;
  doc.fontSize(9).font('Helvetica').lineGap(3.5).fillColor('#334155').text(introText, 40, bodyY + 20, {
    width: pageWidth - 80,
    align: 'justify'
  });

  const salaryText = `Your monthly compensation will be ${monthlySalary} (All Inclusive), subject to statutory withholdings and deductions. You will also be eligible for standard corporate benefits including performance incentives, medical coverage, and corporate paid leave, governed by Trade Nexus company policies.`;
  doc.moveDown(0.7);
  doc.text(salaryText, { width: pageWidth - 80, align: 'justify' });

  // ── Key Position Summary Box ──
  const boxY = doc.y + 10;
  doc.roundedRect(40, boxY, pageWidth - 80, 72, 8).fillAndStroke('#F8FAFC', '#E2E8F0');

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#00A88B').text('OFFER PARTICULARS & TENURE SPECIFICATIONS', 55, boxY + 10);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569').text('Designation:', 55, boxY + 25);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(role, 140, boxY + 25);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569').text('Monthly Remuneration:', 55, boxY + 39);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#00A88B').text(monthlySalary, 160, boxY + 39);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569').text('Employment Type:', 55, boxY + 53);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Full-Time Regular Employee', 140, boxY + 53);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569').text('Commencement Date:', 330, boxY + 25);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(joinDate, 440, boxY + 25);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569').text('Reporting Manager:', 330, boxY + 39);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(manager, 430, boxY + 39);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569').text('Reporting Location:', 330, boxY + 53);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Corporate HQ', 430, boxY + 53);

  // ── Acceptance & Closing ──
  const closeY = boxY + 84;
  doc.fontSize(9).font('Helvetica').lineGap(3.5).fillColor('#334155').text(
    `Please confirm your acceptance of this offer by signing and returning this letter by ${deadline}. We look forward to welcoming you to the Trade Nexus team and achieving substantial growth together!`,
    40,
    closeY,
    { width: pageWidth - 80, align: 'justify' }
  );

  // ── Sign-off & Signatures ──
  const sigY = closeY + 50;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Warm Regards,', 40, sigY);

  // Signature representation
  doc.fontSize(16).font('Helvetica-BoldOblique').fillColor('#0A2540').text('T. Vidhya Sagar', 40, sigY + 16);

  const signatory = data.signatoryName || 'T. Vidhya Sagar';
  const sigRole = data.signatoryRole || 'Chief Executive Officer';
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#00A88B').text(signatory, 40, sigY + 38);
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(sigRole, 40, sigY + 49);
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0A2540').text('Trade Nexus Corporate Operations', 40, sigY + 59);

  // Candidate Acceptance Counter-signature
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Candidate Acceptance:', pageWidth - 220, sigY);
  doc.moveTo(pageWidth - 220, sigY + 36).lineTo(pageWidth - 40, sigY + 36).lineWidth(0.5).strokeColor('#94A3B8').stroke();
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(`Signature: ${data.candidateName}`, pageWidth - 220, sigY + 42);
  doc.text('Date: ________________________', pageWidth - 220, sigY + 54);

  // ── Bottom Navy Footer Bar (Fixed to bottom 0 to 34pt) ──
  const footerH = 34;
  const footerY = pageHeight - footerH;
  doc.rect(0, footerY, pageWidth, footerH).fill('#06152B');
  doc.rect(0, footerY, pageWidth, 2).fill('#00A88B');

  doc.fontSize(7.5).font('Helvetica').fillColor('#E2E8F0').text(
    'Phone: +91 98765 43210   |   Email: info@tradenexus.com   |   Web: www.tradenexus.com   |   Trade Nexus Trade Smart',
    0,
    footerY + 12,
    { align: 'center', width: pageWidth }
  );

  doc.end();
  return bufferPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. OFFICIAL PAYSLIP PDF GENERATOR (Standard A4)
// ─────────────────────────────────────────────────────────────────────────────
export async function generatePayslipPdf(employee: any, payslip: any): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `Salary Payslip - ${employee.name || payslip.employeeName} (${payslip.month} ${payslip.year})`,
      Author: 'Trade Nexus Payroll & Finance',
      Subject: 'Official Monthly Salary Statement',
    }
  });

  const bufferPromise = docToBuffer(doc);
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  // ── Top Header ──
  doc.rect(0, 0, pageWidth, 90).fill('#06152B');
  doc.rect(0, 90, pageWidth, 4).fill('#00A88B');
  doc.rect(0, 94, pageWidth * 0.5, 2).fill('#38E1B7');

  doc.circle(42, 45, 18).lineWidth(2).stroke('#00C9A7');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#00C9A7').text('TN', 34, 39);

  doc.fontSize(18).font('Helvetica-Bold').fillColor('#FFFFFF').text('TRADE NEXUS', 72, 33);
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#00C9A7').text('TRADE SMART  •  PAYROLL & REMITTANCE SYSTEM', 72, 54);

  doc.fontSize(16).font('Helvetica-Bold').fillColor('#FFFFFF').text('PAYROLL SLIP', 0, 34, {
    align: 'right',
    width: pageWidth - 40,
  });
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#00C9A7').text(`${payslip.month} ${payslip.year}`, 0, 53, {
    align: 'right',
    width: pageWidth - 40,
  });

  // ── Employee Metadata Box ──
  const empBoxY = 112;
  doc.roundedRect(40, empBoxY, pageWidth - 80, 78, 8).fillAndStroke('#F8FAFC', '#E2E8F0');

  const empName = employee.name || payslip.employeeName || 'Staff Member';
  const empCode = employee.empCode || payslip.empCode || payslip.employeeCode || 'TNX-001';
  const role = employee.role || employee.roleTitle || payslip.roleTitle || 'Executive';
  const dept = employee.group || employee.department || payslip.department || 'Operations';
  const pan = employee.panNumber || 'ABCDE1234F';
  const bank = employee.bankName || 'HDFC Bank';
  const acc = employee.bankAccountNumber ? `••••${String(employee.bankAccountNumber).slice(-4)}` : 'Verified Account';

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748B').text('Employee Name:', 55, empBoxY + 12);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0A2540').text(empName, 135, empBoxY + 11);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748B').text('Employee Code:', 55, empBoxY + 28);
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#00A88B').text(empCode, 135, empBoxY + 28);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748B').text('Designation:', 55, empBoxY + 44);
  doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(role, 135, empBoxY + 44);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748B').text('Department:', 55, empBoxY + 60);
  doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(dept, 135, empBoxY + 60);

  // Column 2
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748B').text('Pay Period:', 320, empBoxY + 12);
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0A2540').text(`${payslip.month} ${payslip.year}`, 405, empBoxY + 11);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748B').text('Bank Account:', 320, empBoxY + 28);
  doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(`${bank} (${acc})`, 405, empBoxY + 28);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748B').text('PAN Number:', 320, empBoxY + 44);
  doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(pan, 405, empBoxY + 44);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748B').text('Disbursement:', 320, empBoxY + 60);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#00A88B').text('Direct Bank Wire', 405, empBoxY + 60);

  // ── Salary Breakdown Table ──
  const tableY = empBoxY + 92;
  const colW = (pageWidth - 80) / 2;

  // Headers
  doc.rect(40, tableY, colW, 24).fill('#0A2540');
  doc.rect(40 + colW, tableY, colW, 24).fill('#0A2540');

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#FFFFFF').text('EARNINGS COMPONENT', 50, tableY + 7);
  doc.text('AMOUNT (INR)', 40 + colW - 90, tableY + 7, { width: 80, align: 'right' });

  doc.text('DEDUCTIONS COMPONENT', 40 + colW + 10, tableY + 7);
  doc.text('AMOUNT (INR)', pageWidth - 130, tableY + 7, { width: 80, align: 'right' });

  // Rows
  const basic = Number(payslip.basicSalary || 0);
  const hra = Number(payslip.hra || 0);
  const special = Number(payslip.specialAllowance || 0);
  const incentives = Number(payslip.incentives || 0);
  const gross = basic + hra + special + incentives;

  const pf = Number(payslip.pfDeduction || 0);
  const tax = Number(payslip.taxDeduction || 0);
  const pension = 200;
  const deductions = pf + tax + pension;
  const net = Number(payslip.netPay || (gross - deductions));

  const rows = [
    { earn: 'Basic Salary', earnVal: basic, ded: 'Provident Fund (PF)', dedVal: pf },
    { earn: 'House Rent Allowance (HRA)', earnVal: hra, ded: 'Professional / Income Tax', dedVal: tax },
    { earn: 'Special / Remote Allowance', earnVal: special, ded: 'Statutory Pension / Insurance', dedVal: pension },
    { earn: 'Sales & Performance Incentives', earnVal: incentives, ded: 'Other Withholdings', dedVal: 0 },
  ];

  let currentY = tableY + 24;
  rows.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    doc.rect(40, currentY, colW, 22).fill(bg);
    doc.rect(40 + colW, currentY, colW, 22).fill(bg);

    doc.fontSize(8).font('Helvetica').fillColor('#334155').text(r.earn, 50, currentY + 6);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(`INR ${r.earnVal.toLocaleString('en-IN')}`, 40 + colW - 100, currentY + 6, {
      width: 90,
      align: 'right',
    });

    doc.fontSize(8).font('Helvetica').fillColor('#334155').text(r.ded, 40 + colW + 10, currentY + 6);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(r.dedVal > 0 ? '#DC2626' : '#64748B').text(`INR ${r.dedVal.toLocaleString('en-IN')}`, pageWidth - 140, currentY + 6, {
      width: 90,
      align: 'right',
    });

    currentY += 22;
  });

  // Table Totals Row
  doc.rect(40, currentY, colW, 24).fill('#F1F5F9');
  doc.rect(40 + colW, currentY, colW, 24).fill('#F1F5F9');

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Total Gross Earnings', 50, currentY + 7);
  doc.text(`INR ${gross.toLocaleString('en-IN')}`, 40 + colW - 100, currentY + 7, { width: 90, align: 'right' });

  doc.text('Total Deductions', 40 + colW + 10, currentY + 7);
  doc.fillColor('#DC2626').text(`INR ${deductions.toLocaleString('en-IN')}`, pageWidth - 140, currentY + 7, { width: 90, align: 'right' });

  currentY += 24;

  // ── Net Salary Disbursed Highlight Card ──
  const netCardY = currentY + 16;
  doc.roundedRect(40, netCardY, pageWidth - 80, 72, 10).fill('#06152B');
  doc.rect(40, netCardY, 6, 72).fill('#00C9A7');

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#00C9A7').text('NET SALARY TAKE-HOME DISBURSEMENT', 60, netCardY + 14);
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#FFFFFF').text(`INR ${net.toLocaleString('en-IN')}`, 60, netCardY + 28);
  doc.fontSize(8).font('Helvetica').fillColor('#CBD5E1').text(
    `Processed & Credited to ${bank} account ending in ${acc.replace(/\D/g, '') || '4 digits'}.`,
    60,
    netCardY + 54
  );

  // ── Statutory Note & Signatory ──
  const noteY = netCardY + 90;
  doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(
    'Note: This document is a confidential electronic salary statement issued by Trade Nexus. It is authentic, system-generated, and valid without a physical rubber stamp.',
    40,
    noteY,
    { width: pageWidth - 80, align: 'justify' }
  );

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Trade Nexus Payroll Authority', 40, noteY + 36);
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text('Director of Human Resources & Finance', 40, noteY + 48);

  // ── Bottom Footer ──
  const footerH = 34;
  const footerY = pageHeight - footerH;
  doc.rect(0, footerY, pageWidth, footerH).fill('#06152B');
  doc.rect(0, footerY, pageWidth, 2).fill('#00A88B');

  doc.fontSize(7.5).font('Helvetica').fillColor('#E2E8F0').text(
    'Trade Nexus Trade Smart  •  Corporate Payroll Operations  •  payroll@tradenexus.live  •  Confidential',
    0,
    footerY + 12,
    { align: 'center', width: pageWidth }
  );

  doc.end();
  return bufferPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. EMPLOYEE ID CARD PDF GENERATOR (Printable High-Def Badge)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateIdCardPdf(employee: any, cardData?: any): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `Employee ID Card - ${employee.name || cardData?.name}`,
      Author: 'Trade Nexus Security & HR',
      Subject: 'Official Identity Card Badge',
    }
  });

  const bufferPromise = docToBuffer(doc);
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  // Background sheet styling
  doc.rect(0, 0, pageWidth, pageHeight).fill('#F8FAFC');

  // Top Page Title for cutting
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#0A2540').text('TRADE NEXUS OFFICIAL IDENTITY BADGE', 0, 50, { align: 'center' });
  doc.fontSize(8.5).font('Helvetica').fillColor('#64748B').text('Cut along the border line for standard lanyard plastic card badge insertion.', 0, 68, { align: 'center' });

  // ── The Badge (Centered on page, 260pt wide x 410pt tall) ──
  const badgeW = 260;
  const badgeH = 410;
  const badgeX = (pageWidth - badgeW) / 2;
  const badgeY = 96;

  // Outer Badge Border & Background
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 18).fill('#06152B');

  // Lanyard Punch Hole Indicator
  doc.roundedRect(badgeX + (badgeW - 40) / 2, badgeY + 10, 40, 8, 4).fill('#1E293B');

  // Top Brand Header
  doc.circle(badgeX + badgeW / 2, badgeY + 44, 14).lineWidth(1.5).stroke('#00C9A7');
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#00C9A7').text('TN', badgeX + badgeW / 2 - 6, badgeY + 39);

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#FFFFFF').text('TRADE NEXUS', badgeX, badgeY + 64, { align: 'center', width: badgeW });
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#00C9A7').text('TRADE SMART  •  IDENTITY VERIFIED', badgeX, badgeY + 80, { align: 'center', width: badgeW });

  // Employee Photo Circle Placeholder / Avatar
  const avatarY = badgeY + 100;
  doc.circle(badgeX + badgeW / 2, avatarY + 38, 36).lineWidth(3).stroke('#00C9A7');
  doc.circle(badgeX + badgeW / 2, avatarY + 38, 33).fill('#0A2540');

  const empName = cardData?.name || employee.name || 'Staff Member';
  const initials = empName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#00C9A7').text(initials, badgeX + badgeW / 2 - 16, avatarY + 28);

  // Employee Name & Role
  const role = cardData?.role || employee.role || employee.roleTitle || 'Executive';
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#FFFFFF').text(empName.toUpperCase(), badgeX + 10, avatarY + 84, {
    align: 'center',
    width: badgeW - 20,
  });

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#00C9A7').text(role.toUpperCase(), badgeX + 10, avatarY + 100, {
    align: 'center',
    width: badgeW - 20,
  });

  // Divider
  doc.rect(badgeX + 30, avatarY + 116, badgeW - 60, 1).fill('#1E293B');

  // Employee Details Grid inside badge
  const gridY = avatarY + 124;
  const empCode = cardData?.empCode || employee.empCode || 'TNX-001';
  const blood = cardData?.bloodGroup || 'O+ ve';
  const dob = cardData?.dob || '05/11/1997';
  const phone = cardData?.phone || employee.phone || '+91 98765 43210';

  const drawBadgeField = (label: string, val: string, yPos: number) => {
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748B').text(label, badgeX + 30, yPos);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF').text(val, badgeX + 110, yPos);
  };

  drawBadgeField('Emp ID:', empCode, gridY);
  drawBadgeField('Emp Type:', 'Full-Time Regular', gridY + 15);
  drawBadgeField('Blood Group:', blood, gridY + 30);
  drawBadgeField('Date of Birth:', dob, gridY + 45);
  drawBadgeField('Emergency Ph:', phone, gridY + 60);

  // Badge Bottom Bar
  doc.rect(badgeX, badgeY + badgeH - 26, badgeW, 26).fill('#0A2540');
  doc.rect(badgeX, badgeY + badgeH - 26, badgeW, 2).fill('#00A88B');
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#CBD5E1').text(
    'AUTHORISED CORPORATE PERSONNEL',
    badgeX,
    badgeY + badgeH - 18,
    { align: 'center', width: badgeW }
  );

  // Bottom Notice
  doc.fontSize(8).font('Helvetica').fillColor('#94A3B8').text(
    'If found, please return to: Trade Nexus HQ, 123 Business Avenue, Financial District, Telangana 500001.',
    0,
    badgeY + badgeH + 30,
    { align: 'center' }
  );

  doc.end();
  return bufferPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. OFFICIAL RELIEVING LETTER PDF GENERATOR (Standard A4)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateRelievingLetterPdf(employee: any, relievingLetter: any): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `Relieving Letter - ${employee.name || relievingLetter.employeeName}`,
      Author: 'Trade Nexus Corporate HR',
      Subject: 'Official Certificate of Release and Relieving Order',
    }
  });

  const bufferPromise = docToBuffer(doc);
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  // Top Header
  doc.rect(0, 0, pageWidth, 90).fill('#06152B');
  doc.rect(0, 90, pageWidth, 4).fill('#00A88B');

  doc.circle(42, 45, 18).lineWidth(2).stroke('#00C9A7');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#00C9A7').text('TN', 34, 39);

  doc.fontSize(18).font('Helvetica-Bold').fillColor('#FFFFFF').text('TRADE NEXUS', 72, 33);
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#00C9A7').text('TRADE SMART  •  HUMAN RESOURCES ADMINISTRATION', 72, 54);

  doc.fontSize(15).font('Helvetica-Bold').fillColor('#FFFFFF').text('RELIEVING ORDER', 0, 36, {
    align: 'right',
    width: pageWidth - 40,
  });

  // Metadata
  const startY = 115;
  const issuedDate = relievingLetter.issuedDate || new Date().toLocaleDateString('en-GB');
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(`Ref: TNX/REL/${new Date().getFullYear()}/${employee.empCode || 'STAFF'}`, 40, startY);
  doc.text(`Date: ${issuedDate}`, 0, startY, { align: 'right', width: pageWidth - 40 });

  doc.moveTo(40, startY + 16).lineTo(pageWidth - 40, startY + 16).lineWidth(0.5).strokeColor('#E2E8F0').stroke();

  // Recipient
  const empName = employee.name || relievingLetter.employeeName || 'Employee';
  const role = employee.role || employee.roleTitle || relievingLetter.roleTitle || 'Executive';
  const empCode = employee.empCode || relievingLetter.employeeCode || 'TNX';

  const toY = startY + 28;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748B').text('TO,', 40, toY);
  doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0A2540').text(empName, 40, toY + 12);
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(`Employee Code: ${empCode}  •  Role: ${role}`, 40, toY + 26);

  // Content
  const bodyY = toY + 54;
  doc.fontSize(9.5).font('Helvetica').fillColor('#0A2540').text(`Dear ${empName.split(' ')[0] || empName},`, 40, bodyY);

  const lastDay = relievingLetter.lastWorkingDay || relievingLetter.lastWorkingDate || 'Exit Date';
  const joinDate = employee.joiningDate || relievingLetter.joiningDate || 'Date of Joining';

  const p1 = `This has reference to your formal resignation letter submitted to the management of Trade Nexus. We wish to inform you that your resignation has been accepted by the executive board, and you are relieved from your services and duties as ${role} effective from the close of business hours on ${lastDay}.`;
  doc.fontSize(9).font('Helvetica').lineGap(4).fillColor('#334155').text(p1, 40, bodyY + 20, {
    width: pageWidth - 80,
    align: 'justify'
  });

  const p2 = `During your tenure from ${joinDate} to ${lastDay}, your performance, integrity, and conduct were found to be satisfactory and commendable. All company properties, accounts, client portfolios, and documentation assigned to you have been surrendered and settled in full with complete department clearances.`;
  doc.moveDown(0.8);
  doc.text(p2, { width: pageWidth - 80, align: 'justify' });

  const p3 = `We place on record our appreciation for your contributions to Trade Nexus and wish you grand success, professional prosperity, and fulfillment in all your prospective career endeavors.`;
  doc.moveDown(0.8);
  doc.text(p3, { width: pageWidth - 80, align: 'justify' });

  // Clearance Confirmation Badge
  const badgeBoxY = doc.y + 16;
  doc.roundedRect(40, badgeBoxY, pageWidth - 80, 52, 8).fillAndStroke('#F8FAFC', '#E2E8F0');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#00A88B').text('NO DUES & COMPLIANCE CLEARANCE STATUS: 100% SETTLED', 55, badgeBoxY + 12);
  doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(
    'All statutory dues, final settlement computations, and intellectual property transfers have been cleared in full.',
    55,
    badgeBoxY + 26,
    { width: pageWidth - 110 }
  );

  // Signatory
  const sigY = badgeBoxY + 70;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('For Trade Nexus Corporate Management,', 40, sigY);
  doc.fontSize(16).font('Helvetica-BoldOblique').fillColor('#0A2540').text('T. Vidhya Sagar', 40, sigY + 16);
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#00A88B').text('T. Vidhya Sagar', 40, sigY + 38);
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text('Chief Executive Officer  •  Trade Nexus', 40, sigY + 49);

  // Bottom Footer
  const footerH = 34;
  const footerY = pageHeight - footerH;
  doc.rect(0, footerY, pageWidth, footerH).fill('#06152B');
  doc.rect(0, footerY, pageWidth, 2).fill('#00A88B');
  doc.fontSize(7.5).font('Helvetica').fillColor('#E2E8F0').text(
    'Trade Nexus Trade Smart  •  Corporate HR Division  •  Official Certificate of Release  •  Confidential',
    0,
    footerY + 12,
    { align: 'center', width: pageWidth }
  );

  doc.end();
  return bufferPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. OFFICIAL EXPERIENCE CERTIFICATE PDF GENERATOR (Standard A4)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateExperienceCertPdf(employee: any, cert: any): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `Experience Certificate - ${employee.name || cert.candidateName}`,
      Author: 'Trade Nexus Corporate HR',
      Subject: 'Official Certificate of Employment Experience',
    }
  });

  const bufferPromise = docToBuffer(doc);
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  // Header
  doc.rect(0, 0, pageWidth, 90).fill('#06152B');
  doc.rect(0, 90, pageWidth, 4).fill('#00A88B');

  doc.circle(42, 45, 18).lineWidth(2).stroke('#00C9A7');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#00C9A7').text('TN', 34, 39);

  doc.fontSize(18).font('Helvetica-Bold').fillColor('#FFFFFF').text('TRADE NEXUS', 72, 33);
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#00C9A7').text('TRADE SMART  •  SERVICE VERIFICATION CENTER', 72, 54);

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#FFFFFF').text('EXPERIENCE CERTIFICATE', 0, 36, {
    align: 'right',
    width: pageWidth - 40,
  });

  // Reference & Date
  const startY = 115;
  const ref = cert.refNumber || `TNX/EXP/${new Date().getFullYear()}/${employee.empCode || 'STAFF'}`;
  const dateStr = cert.issuedDate || new Date().toLocaleDateString('en-GB');

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(`Ref No: ${ref}`, 40, startY);
  doc.text(`Date of Issue: ${dateStr}`, 0, startY, { align: 'right', width: pageWidth - 40 });

  doc.moveTo(40, startY + 16).lineTo(pageWidth - 40, startY + 16).lineWidth(0.5).strokeColor('#E2E8F0').stroke();

  // "TO WHOMSOEVER IT MAY CONCERN"
  const bannerY = startY + 36;
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#0A2540').text('TO WHOMSOEVER IT MAY CONCERN', 0, bannerY, {
    align: 'center',
    width: pageWidth,
  });
  doc.rect((pageWidth - 160) / 2, bannerY + 18, 160, 1.5).fill('#00A88B');

  // Body Text
  const empName = employee.name || cert.candidateName || cert.employeeName || 'Staff Member';
  const empCode = employee.empCode || cert.empCode || 'TNX';
  const role = employee.role || employee.roleTitle || cert.roleTitle || cert.designation || 'Executive';
  const dept = employee.group || employee.department || cert.department || 'Operations';
  const joinDate = employee.joiningDate || cert.joiningDate || cert.startDate || '01-01-2023';
  const exitDate = cert.lastWorkingDay || cert.endDate || cert.issuedDate || '03-01-2025';

  const bodyY = bannerY + 34;
  const p1 = `This is to certify that ${empName} (Employee Code: ${empCode}) was employed with Trade Nexus from ${joinDate} to ${exitDate}. During their tenure of service with us, they held the designation of ${role} within the ${dept} division.`;
  doc.fontSize(9.5).font('Helvetica').lineGap(4.5).fillColor('#334155').text(p1, 40, bodyY, {
    width: pageWidth - 80,
    align: 'justify'
  });

  const p2 = `Throughout their service, ${empName} displayed exemplary dedication, exceptional organizational caliber, and a high degree of technical and operational proficiency. Their interpersonal skills and conduct with colleagues and clients were consistently professional and praiseworthy.`;
  doc.moveDown(0.9);
  doc.text(p2, { width: pageWidth - 80, align: 'justify' });

  const p3 = `We acknowledge their valuable contributions to our organization and wish them continued distinction and accomplishments in all future career undertakings.`;
  doc.moveDown(0.9);
  doc.text(p3, { width: pageWidth - 80, align: 'justify' });

  // Verification Seal Box
  const sealY = doc.y + 18;
  doc.roundedRect(40, sealY, pageWidth - 80, 54, 8).fillAndStroke('#F8FAFC', '#00C9A7');
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('AUTHENTIC CORPORATE SERVICE VERIFICATION', 55, sealY + 12);
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(
    `Certified valid in Trade Nexus personnel archives. Electronic Verification Hash: TNX-VERIFIED-${empCode}-${new Date().getFullYear()}`,
    55,
    sealY + 28,
    { width: pageWidth - 110 }
  );

  // Signatory
  const sigY = sealY + 70;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Authorized Executive Signatory,', 40, sigY);
  doc.fontSize(16).font('Helvetica-BoldOblique').fillColor('#0A2540').text('T. Vidhya Sagar', 40, sigY + 16);
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#00A88B').text('T. Vidhya Sagar', 40, sigY + 38);
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text('Chief Executive Officer  •  Trade Nexus', 40, sigY + 49);

  // Bottom Footer
  const footerH = 34;
  const footerY = pageHeight - footerH;
  doc.rect(0, footerY, pageWidth, footerH).fill('#06152B');
  doc.rect(0, footerY, pageWidth, 2).fill('#00A88B');
  doc.fontSize(7.5).font('Helvetica').fillColor('#E2E8F0').text(
    'Trade Nexus Trade Smart  •  Corporate HR Division  •  Official Certificate of Service Verification',
    0,
    footerY + 12,
    { align: 'center', width: pageWidth }
  );

  doc.end();
  return bufferPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. OFFICIAL CUSTOMER TAX INVOICE PDF GENERATOR (Standard A4)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateTaxInvoicePdf(invoice: any): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `Commercial Tax Invoice - #${invoice.invoiceNumber} (${invoice.clientName})`,
      Author: 'Trade Nexus Finance & Billing',
      Subject: 'Commercial Tax Invoice and Settlement Voucher',
    }
  });

  const bufferPromise = docToBuffer(doc);
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  // Header
  doc.rect(0, 0, pageWidth, 90).fill('#06152B');
  doc.rect(0, 90, pageWidth, 4).fill('#00A88B');

  doc.circle(42, 45, 18).lineWidth(2).stroke('#00C9A7');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#00C9A7').text('TN', 34, 39);

  doc.fontSize(18).font('Helvetica-Bold').fillColor('#FFFFFF').text('TRADE NEXUS', 72, 33);
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#00C9A7').text('TRADE SMART  •  COMMERCIAL BILLING & SETTLEMENT', 72, 54);

  doc.fontSize(16).font('Helvetica-Bold').fillColor('#00C9A7').text('TAX INVOICE', 0, 30, {
    align: 'right',
    width: pageWidth - 40,
  });
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#FFFFFF').text(`#${invoice.invoiceNumber}`, 0, 50, {
    align: 'right',
    width: pageWidth - 40,
  });

  // Invoice Date & Due Date Line
  const metaY = 110;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Trade Nexus Billing Division', 40, metaY);
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text('GSTIN: 36AAACT1234F1Z8  •  PAN: AAACT1234F', 40, metaY + 12);
  doc.text('123 Business Avenue, Financial District, Telangana 500001', 40, metaY + 23);

  const invDate = invoice.date || new Date().toLocaleDateString('en-GB');
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(`Invoice Date: ${invDate}`, 0, metaY, {
    align: 'right',
    width: pageWidth - 40,
  });
  if (invoice.dueDate) {
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#B45309').text(`Payment Due: ${invoice.dueDate}`, 0, metaY + 14, {
      align: 'right',
      width: pageWidth - 40,
    });
  }

  doc.moveTo(40, metaY + 38).lineTo(pageWidth - 40, metaY + 38).lineWidth(0.5).strokeColor('#E2E8F0').stroke();

  // Billed To Box
  const billY = metaY + 48;
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#00A88B').text('BILLED TO (CLIENT DETAILS):', 40, billY);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#0A2540').text(invoice.clientName, 40, billY + 12);
  if (invoice.clientCompany) {
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#334155').text(invoice.clientCompany, 40, billY + 26);
  }
  doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(`Email: ${invoice.clientEmail}   •   Phone: ${invoice.clientPhone || 'N/A'}`, 40, billY + 39);
  if (invoice.clientAddress) {
    doc.text(`Address: ${invoice.clientAddress}`, 40, billY + 50);
  }

  // Items Table
  let items = [];
  try {
    items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
  } catch {
    items = [];
  }

  const tableY = billY + 68;
  const colX = {
    num: 40,
    desc: 65,
    qty: 350,
    rate: 410,
    total: 490,
  };

  // Header row
  doc.rect(40, tableY, pageWidth - 80, 22).fill('#06152B');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
  doc.text('#', colX.num + 6, tableY + 6);
  doc.text('ITEM & SERVICE DESCRIPTION', colX.desc, tableY + 6);
  doc.text('QTY', colX.qty, tableY + 6, { width: 40, align: 'center' });
  doc.text('UNIT RATE', colX.rate, tableY + 6, { width: 70, align: 'right' });
  doc.text('AMOUNT', colX.total, tableY + 6, { width: 65, align: 'right' });

  let rowY = tableY + 22;
  items.forEach((item: any, idx: number) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    doc.rect(40, rowY, pageWidth - 80, 22).fill(bg);

    doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(String(idx + 1), colX.num + 6, rowY + 6);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(item.description || 'Enterprise Solution Service', colX.desc, rowY + 6, { width: 275 });
    doc.fontSize(8).font('Helvetica').fillColor('#334155').text(String(item.quantity || 1), colX.qty, rowY + 6, { width: 40, align: 'center' });
    doc.text(`INR ${Number(item.unitPrice || 0).toLocaleString('en-IN')}`, colX.rate, rowY + 6, { width: 70, align: 'right' });
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(`INR ${Number(item.total || 0).toLocaleString('en-IN')}`, colX.total, rowY + 6, { width: 65, align: 'right' });

    rowY += 22;
  });

  // Totals Box
  const totalsY = rowY + 12;
  const totalsW = 220;
  const totalsX = pageWidth - 40 - totalsW;

  const subTotal = Number(invoice.subTotal || 0);
  const taxRate = Number(invoice.taxRate || 18);
  const taxAmount = Number(invoice.taxAmount || ((subTotal * taxRate) / 100));
  const grandTotal = Number(invoice.grandTotal || (subTotal + taxAmount));

  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text('Subtotal:', totalsX, totalsY);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(`INR ${subTotal.toLocaleString('en-IN')}`, totalsX + 110, totalsY, { width: 110, align: 'right' });

  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(`GST (${taxRate}%):`, totalsX, totalsY + 16);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(`INR ${taxAmount.toLocaleString('en-IN')}`, totalsX + 110, totalsY + 16, { width: 110, align: 'right' });

  doc.rect(totalsX, totalsY + 32, totalsW, 28).fill('#06152B');
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#00C9A7').text('TOTAL DUE:', totalsX + 12, totalsY + 41);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#FFFFFF').text(`INR ${grandTotal.toLocaleString('en-IN')}`, totalsX + 90, totalsY + 40, { width: 118, align: 'right' });

  // Bank Remittance Box (Left of totals)
  const bankBoxW = pageWidth - 80 - totalsW - 20;
  doc.roundedRect(40, totalsY, bankBoxW, 78, 8).fillAndStroke('#F8FAFC', '#E2E8F0');
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0A2540').text('WIRE & DIRECT REMITTANCE DETAILS:', 52, totalsY + 10);
  doc.fontSize(7.5).font('Helvetica').fillColor('#475569')
    .text(`Bank Name: ${invoice.bankName || 'HDFC Bank'}`, 52, totalsY + 24)
    .text(`Account No: ${invoice.accountNumber || '50200084920194'}`, 52, totalsY + 36)
    .text(`IFSC Code: ${invoice.ifscCode || 'HDFC0001234'}`, 52, totalsY + 48)
    .text(`Billing Query: ${invoice.paymentEmail || 'billing@tradenexus.live'}`, 52, totalsY + 60);

  // Signatory & Authentication
  const signY = totalsY + 96;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Trade Nexus Commercial Accounts', 40, signY);
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text('This is a verified computer generated electronic tax invoice.', 40, signY + 12);

  // Bottom Footer
  const footerH = 34;
  const footerY = pageHeight - footerH;
  doc.rect(0, footerY, pageWidth, footerH).fill('#06152B');
  doc.rect(0, footerY, pageWidth, 2).fill('#00A88B');
  doc.fontSize(7.5).font('Helvetica').fillColor('#E2E8F0').text(
    'Trade Nexus Trade Smart  •  Commercial Accounts Division  •  Official Electronic Tax Invoice',
    0,
    footerY + 12,
    { align: 'center', width: pageWidth }
  );

  doc.end();
  return bufferPromise;
}
