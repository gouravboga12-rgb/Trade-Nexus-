import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS_DIR = path.resolve(__dirname, '../assets');

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

/**
 * Draw official Trade Nexus header banner from high-res asset
 */
function drawCorporateHeader(
  doc: InstanceType<typeof PDFDocument>,
  headerFilename: string,
  pageWidth: number,
  headerHeight: number
) {
  const headerPath = path.join(ASSETS_DIR, headerFilename);
  if (fs.existsSync(headerPath)) {
    doc.image(headerPath, 0, 0, { width: pageWidth, height: headerHeight });
  } else {
    // Elegant fallback
    doc.rect(0, 0, pageWidth, headerHeight).fill('#081031');
    doc.rect(0, headerHeight - 4, pageWidth, 4).fill('#00C9A7');
  }
}

/**
 * Draw official Trade Nexus corporate footer across bottom
 */
function drawCorporateFooter(
  doc: InstanceType<typeof PDFDocument>,
  pageWidth: number,
  pageHeight: number
) {
  const footerPath = path.join(ASSETS_DIR, 'corporate-footer.png');
  const footerH = 53.5;
  const footerY = pageHeight - footerH;

  if (fs.existsSync(footerPath)) {
    doc.image(footerPath, 0, footerY, { width: pageWidth, height: footerH });
  } else {
    // Fallback navy footer
    doc.rect(0, footerY, pageWidth, footerH).fill('#081031');
    doc.rect(0, footerY, pageWidth, 2).fill('#00C9A7');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#CBD5E1').text(
      'Trade Nexus Corporate HQ  •  123 Business Avenue, Financial District, 500001  •  info@tradenexus.com  •  +91 98765 43210',
      0,
      footerY + 18,
      { align: 'center', width: pageWidth }
    );
  }
}

/**
 * Draw background watermark emblem in the center of the page
 */
function drawWatermark(
  doc: InstanceType<typeof PDFDocument>,
  pageWidth: number,
  pageHeight: number
) {
  const wmPath = path.join(ASSETS_DIR, 'watermark-emblem.png');
  if (fs.existsSync(wmPath)) {
    const wmW = 260;
    const wmH = 260;
    const wmX = (pageWidth - wmW) / 2;
    const wmY = (pageHeight - wmH) / 2 + 30;

    doc.save();
    doc.opacity(0.08);
    doc.image(wmPath, wmX, wmY, { width: wmW, height: wmH });
    doc.restore();
  }
}

/**
 * Draw authentic signature of T. Vidhya Sagar
 */
function drawOfficialSignature(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  width: number = 140
) {
  const sigPath = path.join(ASSETS_DIR, 'signature-vidhya-sagar.png');
  if (fs.existsSync(sigPath)) {
    doc.image(sigPath, x, y, { width });
  }
}

/**
 * Draw official company seal stamp
 */
function drawOfficialSeal(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  width: number = 130
) {
  const sealPath = path.join(ASSETS_DIR, 'trade-nexus-seal.png');
  if (fs.existsSync(sealPath)) {
    doc.image(sealPath, x, y, { width });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. JOB OFFER LETTER PDF GENERATOR (Exact match for 1.png)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateOfferLetterPdf(data: {
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateAddress?: string;
  roleTitle?: string;
  department?: string;
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

  // Header Banner & Watermark & Footer (matching 1.png)
  drawCorporateHeader(doc, 'header-offer.png', pageWidth, 192);
  drawWatermark(doc, pageWidth, pageHeight);
  drawCorporateFooter(doc, pageWidth, pageHeight);

  // Body content area starts at y = 202
  const leftX = 48;
  const contentW = pageWidth - leftX * 2;
  let currentY = 202;

  // Date (Right aligned)
  const issuedDate = data.issuedDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569').text(`Date: ${issuedDate}`, 0, currentY, {
    align: 'right',
    width: pageWidth - leftX,
  });

  // Recipient Block
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#64748B').text('To,', leftX, currentY);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#0A2540').text(data.candidateName, leftX, currentY + 12);
  const candidateAddress = data.candidateAddress || '123 Business Avenue, Financial District, 500001';
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(candidateAddress, leftX, currentY + 26, { width: 320 });

  currentY += 66;

  // Salutation
  const firstName = (data.candidateName || '').split(' ')[0] || data.candidateName;
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0A2540').text(`Dear ${firstName},`, leftX, currentY);
  currentY += 16;

  // Opening paragraph
  const role = data.roleTitle || 'Senior Telecaller / SDR';
  doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(
    `We are pleased to extend an offer of employment for the position of ${role} with Trade Nexus. Following our interview discussions, we were thoroughly impressed by your credentials, professional enthusiasm, and alignment with our corporate mission.`,
    leftX,
    currentY,
    { width: contentW, lineGap: 3 }
  );
  currentY += 36;

  // Appointment Table
  const tableY = currentY;
  const tRowH = 17;
  const col1W = 150;
  const col2W = contentW - col1W;

  const joinDate = data.joiningDate || 'Immediate';
  const manager = data.reportingManager || 'Branch Operations Team Leader';
  const formattedMonthly = typeof data.monthlyGross === 'number'
    ? `INR ${data.monthlyGross.toLocaleString('en-IN')}`
    : data.monthlyGross ? `INR ${data.monthlyGross}` : 'INR 7,00,000';
  const formattedAnnual = typeof data.annualCtc === 'number'
    ? `INR ${data.annualCtc.toLocaleString('en-IN')}`
    : data.annualCtc ? `INR ${data.annualCtc}` : 'INR 8,40,000';
  const deadline = data.acceptanceDeadline || 'Within 7 business days';

  const rows = [
    { label: 'Position / Designation', value: role },
    { label: 'Department / Division', value: data.department || 'Client Acquisition & Trading Operations' },
    { label: 'Monthly Gross Emoluments', value: formattedMonthly },
    { label: 'Annual Total CTC', value: formattedAnnual },
    { label: 'Date of Joining', value: joinDate },
    { label: 'Reporting Authority', value: manager },
    { label: 'Work Location', value: 'Trade Nexus Corporate HQ, Financial District' },
    { label: 'Offer Validity / Acceptance', value: deadline },
  ];

  rows.forEach((r, idx) => {
    const rowY = tableY + idx * tRowH;
    const bg = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
    doc.rect(leftX, rowY, contentW, tRowH).fill(bg);
    doc.rect(leftX, rowY, contentW, tRowH).lineWidth(0.4).strokeColor('#E2E8F0').stroke();

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text(r.label, leftX + 8, rowY + 4);
    doc.fontSize(8).font('Helvetica').fillColor('#334155').text(r.value, leftX + col1W + 8, rowY + 4);
  });

  currentY = tableY + rows.length * tRowH + 14;

  // Terms and conditions
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Terms of Employment & Acceptance', leftX, currentY);
  currentY += 12;
  doc.fontSize(8).font('Helvetica').fillColor('#475569').text(
    'This offer is contingent upon satisfactory completion of background verification and submission of required credentials. Please sign and return the duplicate copy of this offer letter as confirmation of your formal acceptance.',
    leftX,
    currentY,
    { width: contentW, lineGap: 2.5 }
  );
  currentY += 34;

  // Closing Signatures
  const sigY = currentY;

  // Left: Authorized Signatory
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748B').text('Sincerely,', leftX, sigY);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Trade Nexus Corporate HR', leftX, sigY + 11);

  drawOfficialSignature(doc, leftX, sigY + 23, 140);

  const sigName = data.signatoryName || 'T .Vidhya Sagar';
  const sigRole = data.signatoryRole || 'Chief Executive Officer';
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(sigName, leftX, sigY + 54);
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(sigRole, leftX, sigY + 65);
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#00A88B').text('Trade Nexus', leftX, sigY + 75);

  // Right: Candidate Acceptance Signature
  const rightSigX = pageWidth - leftX - 170;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748B').text('Candidate Acceptance:', rightSigX, sigY);
  doc.moveTo(rightSigX, sigY + 50).lineTo(rightSigX + 170, sigY + 50).lineWidth(0.8).strokeColor('#94A3B8').stroke();
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(data.candidateName, rightSigX, sigY + 54);
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text('Signature & Date of Acceptance', rightSigX, sigY + 65);

  doc.end();
  return bufferPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXPERIENCE CERTIFICATE PDF GENERATOR (Exact match for 2.png)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateExperienceCertPdf(employee: any, cert: any): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `Experience Certificate - ${employee.name || cert.employeeName}`,
      Author: 'Trade Nexus Corporate HR',
      Subject: 'Official Certificate of Experience & Service Verification',
    }
  });

  const bufferPromise = docToBuffer(doc);
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  // Header Banner & Watermark & Footer (matching 2.png)
  drawCorporateHeader(doc, 'header-experience.png', pageWidth, 192);
  drawWatermark(doc, pageWidth, pageHeight);
  drawCorporateFooter(doc, pageWidth, pageHeight);

  const leftX = 48;
  const contentW = pageWidth - leftX * 2;
  let currentY = 205;

  const empName = cert.employeeName || employee.name || 'Staff Member';
  const guardian = cert.guardianName || employee.guardianName || 'Sh. Heera Singh';
  const empCode = cert.empCode || employee.empCode || 'TNX-001';
  const role = cert.designation || employee.role || employee.roleTitle || 'Captain';
  const dept = cert.department || employee.groupName || employee.department || 'Client Acquisition';
  const startDate = cert.startDate || employee.joinDate || '26th May 2023';
  const endDate = cert.endDate || '03rd January 2025';
  const refNum = cert.refNumber || `TNX/EXP/${new Date().getFullYear()}/${empCode}`;
  const issuedDate = cert.issuedDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Ref Number (Left) and Date (Right)
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(`Ref: ${refNum}`, leftX, currentY);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569').text(`Date: ${issuedDate}`, 0, currentY, {
    align: 'right',
    width: pageWidth - leftX,
  });

  currentY += 32;

  // Centered Title "To Whom It May Concern"
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#0A2540').text('To Whom It May Concern', 0, currentY, {
    align: 'center',
    width: pageWidth,
  });
  doc.rect((pageWidth - 140) / 2, currentY + 18, 140, 1.8).fill('#00C9A7');

  currentY += 40;

  // Body Paragraphs matching 2.png
  doc.fontSize(9.5).font('Helvetica').fillColor('#1E293B').text(
    `This is to certify that Mr./Ms. ${empName}, S/D of ${guardian}, bearing Employee Identification Number ${empCode}, was bona fide employed with Trade Nexus from ${startDate} to ${endDate}.`,
    leftX,
    currentY,
    { width: contentW, lineGap: 5 }
  );

  currentY += 42;

  doc.fontSize(9.5).font('Helvetica').fillColor('#1E293B').text(
    `During the period of tenure with Trade Nexus, ${empName} served in the professional capacity of ${role} within the ${dept} department.`,
    leftX,
    currentY,
    { width: contentW, lineGap: 5 }
  );

  currentY += 38;

  const defaultConduct = 'During his tenure, Mr. ' + empName.split(' ')[0] + ' performed his duties with sincerity, professionalism, and dedication. He was responsible for supervising operations, ensuring high standards of client service, coordinating with team members, and maintaining smooth day-to-day business operations. His conduct, character, and performance were satisfactory throughout his period of employment.';
  const conductText = cert.conductRemarks || defaultConduct;

  doc.fontSize(9.5).font('Helvetica').fillColor('#1E293B').text(
    conductText,
    leftX,
    currentY,
    { width: contentW, lineGap: 5 }
  );

  currentY += 80;

  doc.fontSize(9.5).font('Helvetica').fillColor('#1E293B').text(
    'We appreciate the valuable contributions rendered during their service with Trade Nexus and convey our best wishes for continued success and excellence in all future professional endeavors.',
    leftX,
    currentY,
    { width: contentW, lineGap: 5 }
  );

  currentY += 52;

  // Closing Signatory Block
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0A2540').text('For Trade Nexus Corporate Services,', leftX, currentY);

  drawOfficialSignature(doc, leftX, currentY + 12, 145);

  const sigName = cert.signatoryName || 'T. Vidhya Sagar';
  const sigRole = cert.signatoryRole || 'Chief Executive Officer';
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0A2540').text(sigName, leftX, currentY + 46);
  doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(sigRole, leftX, currentY + 58);
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#00A88B').text('Trade Nexus', leftX, currentY + 68);

  doc.end();
  return bufferPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. RELIEVING LETTER PDF GENERATOR (Exact match for 3.png)
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

  // Header Banner & Watermark & Footer (matching 3.png)
  drawCorporateHeader(doc, 'header-relieving.png', pageWidth, 192);
  drawWatermark(doc, pageWidth, pageHeight);
  drawCorporateFooter(doc, pageWidth, pageHeight);

  const leftX = 48;
  const contentW = pageWidth - leftX * 2;
  let currentY = 205;

  const empName = relievingLetter.employeeName || employee.name || 'Avery Davis';
  const empCode = relievingLetter.empCode || employee.empCode || 'TNX-042';
  const role = relievingLetter.designation || employee.role || employee.roleTitle || 'Digital Marketing Specialist';
  const dept = relievingLetter.department || employee.groupName || employee.department || 'Marketing & Communications';
  const empAddress = relievingLetter.employeeAddress || '123 Business Avenue, Financial District, Your City, 500001';
  const resignationDate = relievingLetter.resignationDate || '15 July 2025';
  const lastWorkingDate = relievingLetter.lastWorkingDate || '31 August 2025';
  const issuedDate = relievingLetter.issuedDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Date (Right Aligned)
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569').text(`Date: ${issuedDate}`, 0, currentY, {
    align: 'right',
    width: pageWidth - leftX,
  });

  // To Address
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#64748B').text('To,', leftX, currentY);
  doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0A2540').text(empName, leftX, currentY + 12);
  doc.fontSize(8).font('Helvetica').fillColor('#475569').text(`Employee Code: ${empCode}`, leftX, currentY + 25);
  doc.fontSize(8).font('Helvetica').fillColor('#475569').text(empAddress, leftX, currentY + 36, { width: 320 });

  currentY += 66;

  // Centered Title "RELIEVING LETTER"
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#0A2540').text('RELIEVING LETTER', 0, currentY, {
    align: 'center',
    width: pageWidth,
  });
  doc.rect((pageWidth - 130) / 2, currentY + 18, 130, 1.8).fill('#00C9A7');

  currentY += 36;

  // Body
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0A2540').text(`Dear ${empName.split(' ')[0] || empName},`, leftX, currentY);
  currentY += 16;

  doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(
    `This has reference to your formal letter of resignation dated ${resignationDate}, wherein you requested to be relieved from your employment responsibilities as ${role} in the ${dept} department at Trade Nexus.`,
    leftX,
    currentY,
    { width: contentW, lineGap: 4 }
  );
  currentY += 34;

  doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(
    `We wish to inform you that your resignation has been accepted by the Management, and you are officially relieved from your duties and contractual obligations with Trade Nexus with effect from the close of business working hours on ${lastWorkingDate}.`,
    leftX,
    currentY,
    { width: contentW, lineGap: 4 }
  );
  currentY += 34;

  doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(
    `We hereby confirm that you have successfully handed over all corporate assets, systems access credentials, and records. Your full and final settlement accounts have been thoroughly reconciled and processed in accordance with company policy. There are no outstanding liabilities pending against you.`,
    leftX,
    currentY,
    { width: contentW, lineGap: 4 }
  );
  currentY += 36;

  doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(
    `We take this opportunity to thank you for your committed service and valuable contributions during your association with Trade Nexus, and wish you all the very best for your future personal and career endeavors.`,
    leftX,
    currentY,
    { width: contentW, lineGap: 4 }
  );
  currentY += 38;

  // Closing with Official Seal and Signatory (Exact match for 3.png)
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('For Trade Nexus Corporate,', leftX, currentY);

  // Official Seal Stamp (matches 3.png!)
  drawOfficialSeal(doc, leftX, currentY + 12, 140);

  const sigName = relievingLetter.signatoryName || 'T .Vidhya Sagar';
  const sigRole = relievingLetter.signatoryRole || 'Chief Executive Officer';
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0A2540').text(sigName, leftX, currentY + 115);
  doc.fontSize(8).font('Helvetica').fillColor('#475569').text(sigRole, leftX, currentY + 126);
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#00A88B').text('Authorized Signatory', leftX, currentY + 136);

  doc.end();
  return bufferPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PAYSLIP / PAYROLL STATEMENT PDF GENERATOR (Exact match for 4.png)
// ─────────────────────────────────────────────────────────────────────────────
export async function generatePayslipPdf(employee: any, payslip: any): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `Payslip - ${payslip.employeeName || employee?.name} - ${payslip.month} ${payslip.year}`,
      Author: 'Trade Nexus Finance & Accounts',
      Subject: 'Official Salary and Payroll Statement',
    }
  });

  const bufferPromise = docToBuffer(doc);
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  // Header Banner & Watermark & Footer (matching 4.png)
  drawCorporateHeader(doc, 'header-payslip.png', pageWidth, 184);
  drawWatermark(doc, pageWidth, pageHeight);
  drawCorporateFooter(doc, pageWidth, pageHeight);

  const leftX = 42;
  const contentW = pageWidth - leftX * 2;
  let currentY = 196;

  const empName = payslip.employeeName || employee?.name || 'Avery Davis';
  const empCode = payslip.empCode || employee?.empCode || 'TNX-042';
  const role = payslip.roleTitle || employee?.role || employee?.roleTitle || 'Digital Marketing Specialist';
  const dept = payslip.department || employee?.groupName || employee?.department || 'Marketing & Communications';
  const month = payslip.month || 'August';
  const year = payslip.year || new Date().getFullYear();

  // Employee Information Grid (Matching 4.png)
  doc.rect(leftX, currentY, contentW, 58).fill('#F8FAFC');
  doc.rect(leftX, currentY, contentW, 58).lineWidth(0.6).strokeColor('#E2E8F0').stroke();

  const c1X = leftX + 14;
  const c2X = leftX + 175;
  const c3X = leftX + 350;

  // Row 1
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748B').text('EMPLOYEE NAME', c1X, currentY + 10);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(empName, c1X, currentY + 20);

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748B').text('EMPLOYEE ID', c2X, currentY + 10);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(empCode, c2X, currentY + 20);

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748B').text('PAY PERIOD', c3X, currentY + 10);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#00A88B').text(`${month} ${year}`.toUpperCase(), c3X, currentY + 20);

  // Row 2
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748B').text('DESIGNATION', c1X, currentY + 34);
  doc.fontSize(8).font('Helvetica').fillColor('#334155').text(role, c1X, currentY + 44);

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748B').text('DEPARTMENT', c2X, currentY + 34);
  doc.fontSize(8).font('Helvetica').fillColor('#334155').text(dept, c2X, currentY + 44);

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748B').text('STATUS', c3X, currentY + 34);
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#00A88B').text(payslip.status || 'PAID', c3X, currentY + 44);

  currentY += 72;

  // Earnings & Deductions Tables (Matching 4.png)
  const basic = Number(payslip.basicSalary) || 28000;
  const hra = Number(payslip.hra) || 12000;
  const allowance = Number(payslip.specialAllowance) || 5000;
  const incentives = Number(payslip.incentives) || 0;
  const totalEarnings = basic + hra + allowance + incentives;

  const pf = Number(payslip.pfDeduction) || 1800;
  const tax = Number(payslip.taxDeduction) || 0;
  const totalDeductions = pf + tax;
  const netPay = payslip.netPay !== undefined ? Number(payslip.netPay) : totalEarnings - totalDeductions;

  // 1. EARNINGS TABLE
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0A2540').text('EARNINGS', leftX, currentY);
  currentY += 12;

  doc.rect(leftX, currentY, contentW, 18).fill('#081031');
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#FFFFFF').text('DESCRIPTION', leftX + 10, currentY + 5);
  doc.text('AMOUNT (INR)', leftX, currentY + 5, { width: contentW - 10, align: 'right' });
  currentY += 18;

  const earnRows = [
    { desc: 'Basic Salary', amt: basic },
    { desc: 'House Rent Allowance (HRA)', amt: hra },
    { desc: 'Special Allowance', amt: allowance },
    ...(incentives > 0 ? [{ desc: 'Performance Incentives / Bonus', amt: incentives }] : []),
  ];

  earnRows.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    doc.rect(leftX, currentY, contentW, 16).fill(bg);
    doc.fontSize(7.5).font('Helvetica').fillColor('#334155').text(r.desc, leftX + 10, currentY + 4);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0A2540').text(
      `INR ${r.amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      leftX,
      currentY + 4,
      { width: contentW - 10, align: 'right' }
    );
    currentY += 16;
  });

  // Total Earnings Row
  doc.rect(leftX, currentY, contentW, 18).fill('#E6FAF6');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text('TOTAL EARNINGS', leftX + 10, currentY + 5);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#00A88B').text(
    `INR ${totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    leftX,
    currentY + 4,
    { width: contentW - 10, align: 'right' }
  );
  currentY += 26;

  // 2. DEDUCTIONS TABLE
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0A2540').text('DEDUCTIONS', leftX, currentY);
  currentY += 12;

  doc.rect(leftX, currentY, contentW, 18).fill('#081031');
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#FFFFFF').text('DESCRIPTION', leftX + 10, currentY + 5);
  doc.text('AMOUNT (INR)', leftX, currentY + 5, { width: contentW - 10, align: 'right' });
  currentY += 18;

  const dedRows = [
    { desc: 'Provident Fund (PF)', amt: pf },
    { desc: 'Professional Tax / Income Tax', amt: tax },
  ];

  dedRows.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    doc.rect(leftX, currentY, contentW, 16).fill(bg);
    doc.fontSize(7.5).font('Helvetica').fillColor('#334155').text(r.desc, leftX + 10, currentY + 4);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0A2540').text(
      `INR ${r.amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      leftX,
      currentY + 4,
      { width: contentW - 10, align: 'right' }
    );
    currentY += 16;
  });

  // Total Deductions Row
  doc.rect(leftX, currentY, contentW, 18).fill('#FEF2F2');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text('TOTAL DEDUCTIONS', leftX + 10, currentY + 5);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#DC2626').text(
    `INR ${totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    leftX,
    currentY + 4,
    { width: contentW - 10, align: 'right' }
  );
  currentY += 26;

  // Bottom Summary & Authorized Signatory Block (Matching 4.png)
  const sumY = currentY;

  // Left Details
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0A2540').text('NET TAKE-HOME PAY', leftX, sumY);
  doc.text(':', leftX + 110, sumY);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#00A88B').text(
    `INR ${netPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    leftX + 122,
    sumY - 1
  );

  const bankAcc = payslip.bankAccountNumber || employee?.bankAccountNumber || '50200084920194';
  const bankName = payslip.bankName || employee?.bankName || 'HDFC Bank';
  const payMode = payslip.paymentMode || 'Bank Transfer';

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text('Bank Account', leftX, sumY + 20);
  doc.text(':', leftX + 110, sumY + 20);
  doc.fontSize(8).font('Helvetica').fillColor('#475569').text(`${bankName} - ${bankAcc}`, leftX + 122, sumY + 20);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text('Payment Mode', leftX, sumY + 34);
  doc.text(':', leftX + 110, sumY + 34);
  doc.fontSize(8).font('Helvetica').fillColor('#475569').text(payMode, leftX + 122, sumY + 34);

  // Right Signatory: Authorized Signatory (matching 4.png, T. Vidhya Sagar with authentic signature!)
  const sigRightX = 350;
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text('Authorized by:', sigRightX, sumY);
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text('Finance Manager – Trade Nexus', sigRightX, sumY + 11);

  drawOfficialSignature(doc, sigRightX, sumY + 22, 130);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text('T. Vidhya Sagar', sigRightX, sumY + 54);
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text('Authorized Signatory', sigRightX, sumY + 65);

  doc.end();
  return bufferPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CUSTOMER INVOICE PDF GENERATOR (Exact match for 5.png)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateTaxInvoicePdf(invoice: any): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `Invoice #${invoice.invoiceNumber}`,
      Author: 'Trade Nexus Finance & Accounts',
      Subject: 'Commercial Customer Invoice',
    }
  });

  const bufferPromise = docToBuffer(doc);
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  // Header Banner & Watermark & Footer (matching 5.png)
  drawCorporateHeader(doc, 'header-invoice.png', pageWidth, 191);
  drawWatermark(doc, pageWidth, pageHeight);
  drawCorporateFooter(doc, pageWidth, pageHeight);

  const leftX = 42;
  const contentW = pageWidth - leftX * 2;
  let currentY = 205;

  // Metadata block: Bill To, From, Invoice Details (Matching 5.png)
  const clientName = invoice.clientName || 'Valued Client';
  const clientPhone = invoice.clientPhone || '+91 98765 43210';
  const clientAddress = invoice.clientAddress || '123 Client Street, Corporate Park';
  const clientEmail = invoice.clientEmail || 'client@example.com';

  const fromName = invoice.fromName || 'Trade Nexus';
  const fromPhone = invoice.fromPhone || '+91 98765 43210';
  const fromAddress = invoice.fromAddress || '123 Business Avenue, Financial District, 500001';

  const invNum = invoice.invoiceNumber || 'INV-2026-001';
  const invDate = invoice.date || new Date().toLocaleDateString('en-GB');

  // Column 1: Bill To
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('BILL TO:', leftX, currentY);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#334155').text(clientName, leftX, currentY + 12);
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(clientPhone, leftX, currentY + 24);
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(clientAddress, leftX, currentY + 35, { width: 140 });
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(clientEmail, leftX, currentY + 46, { width: 140 });

  // Column 2: From
  const col2X = leftX + 175;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('FROM:', col2X, currentY);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#334155').text(fromName, col2X, currentY + 12);
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(fromPhone, col2X, currentY + 24);
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(fromAddress, col2X, currentY + 35, { width: 150 });

  // Column 3: Invoice Info
  const col3X = leftX + 360;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('INVOICE NO:', col3X, currentY);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#00A88B').text(invNum, col3X + 75, currentY);

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('DATE:', col3X, currentY + 16);
  doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(invDate, col3X + 75, currentY + 16);

  currentY += 72;

  // 4-Column Items Table (Matching 5.png: DESCRIPTION | QTY | PRICE | TOTAL)
  doc.rect(leftX, currentY, contentW, 20).fill('#081031');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF').text('DESCRIPTION', leftX + 10, currentY + 6);
  doc.text('QTY', leftX + 270, currentY + 6, { width: 50, align: 'center' });
  doc.text('PRICE', leftX + 340, currentY + 6, { width: 70, align: 'right' });
  doc.text('TOTAL', leftX, currentY + 6, { width: contentW - 10, align: 'right' });
  currentY += 20;

  const rawItems = Array.isArray(invoice.items)
    ? invoice.items
    : typeof invoice.items === 'string'
      ? JSON.parse(invoice.items || '[]')
      : [];

  const items = rawItems.length > 0 ? rawItems : [
    { description: 'Premium Algorithmic Trading Software License', quantity: 1, unitPrice: 25000, total: 25000 },
    { description: 'Real-time Market Analytics & API Gateway Integration', quantity: 1, unitPrice: 15000, total: 15000 },
  ];

  let calculatedSubTotal = 0;
  items.forEach((item: any, idx: number) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice || item.price) || 0;
    const itemTot = Number(item.total) || qty * price;
    calculatedSubTotal += itemTot;

    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    doc.rect(leftX, currentY, contentW, 18).fill(bg);
    doc.fontSize(8).font('Helvetica').fillColor('#334155').text(item.description || 'Service Item', leftX + 10, currentY + 5, { width: 250 });
    doc.text(String(qty), leftX + 270, currentY + 5, { width: 50, align: 'center' });
    doc.text(`INR ${price.toLocaleString('en-IN')}`, leftX + 340, currentY + 5, { width: 70, align: 'right' });
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text(`INR ${itemTot.toLocaleString('en-IN')}`, leftX, currentY + 5, { width: contentW - 10, align: 'right' });
    currentY += 18;
  });

  const subTotal = invoice.subTotal !== undefined ? Number(invoice.subTotal) : calculatedSubTotal;

  // Sub Total Box (Matching 5.png dark navy box)
  currentY += 10;
  const subBoxW = 200;
  const subBoxX = leftX + contentW - subBoxW;
  doc.rect(subBoxX, currentY, subBoxW, 26).fill('#081031');
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF').text('SUB TOTAL', subBoxX + 14, currentY + 8);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#00C9A7').text(
    `INR ${subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    subBoxX,
    currentY + 8,
    { width: subBoxW - 14, align: 'right' }
  );

  currentY += 40;

  // Underlined Note Lines (Matching 5.png)
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Note:', leftX, currentY);
  currentY += 14;

  const notes = [
    invoice.note || 'All payments are due within 15 days of invoice date.',
    'Please quote invoice number in all payment references.',
    'For any billing questions, please reach out to billing@tradenexus.live.',
  ];

  notes.forEach((nt) => {
    doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(nt, leftX, currentY);
    doc.moveTo(leftX, currentY + 11).lineTo(leftX + 270, currentY + 11).lineWidth(0.4).strokeColor('#E2E8F0').stroke();
    currentY += 16;
  });

  // Bottom Section: Payment Information (Left) and Large "Thank You!" (Right) (Exact match for 5.png)
  currentY += 10;

  // Payment Info (Left Box)
  const payBoxW = 220;
  doc.rect(leftX, currentY, payBoxW, 58).fill('#F8FAFC');
  doc.rect(leftX, currentY, payBoxW, 58).lineWidth(0.5).strokeColor('#E2E8F0').stroke();

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text('Payment Information:', leftX + 10, currentY + 8);

  const bankName = invoice.bankName || 'HDFC Bank';
  const accNum = invoice.accountNumber || '50200084920194';
  const payEmail = invoice.paymentEmail || 'billing@tradenexus.live';

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text('Bank', leftX + 10, currentY + 22);
  doc.text(':', leftX + 55, currentY + 22);
  doc.fontSize(7.5).font('Helvetica').fillColor('#0A2540').text(bankName, leftX + 65, currentY + 22);

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text('No Bank', leftX + 10, currentY + 33);
  doc.text(':', leftX + 55, currentY + 33);
  doc.fontSize(7.5).font('Helvetica').fillColor('#0A2540').text(accNum, leftX + 65, currentY + 33);

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text('Email', leftX + 10, currentY + 44);
  doc.text(':', leftX + 55, currentY + 44);
  doc.fontSize(7.5).font('Helvetica').fillColor('#0A2540').text(payEmail, leftX + 65, currentY + 44);

  // Large Serif "Thank You!" on the Right (Matching 5.png, NO Samira Hadid signature!)
  doc.fontSize(32).font('Times-Italic').fillColor('#0A2540').text('Thank You!', leftX + 310, currentY + 12);

  doc.end();
  return bufferPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. OFFICIAL DIGITAL ID CARD PDF GENERATOR (Exact match for tradenexus-id.png)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateIdCardPdf(employee: any, cardData?: any): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `Employee ID Card - ${employee?.name || cardData?.name}`,
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
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#0A2540').text('TRADE NEXUS OFFICIAL IDENTITY BADGE', 0, 42, { align: 'center' });
  doc.fontSize(8.5).font('Helvetica').fillColor('#64748B').text('Cut along the outer card boundaries for laminated lanyard badge ID.', 0, 60, { align: 'center' });

  // Badge Dimensions (Centered on page)
  const badgeW = 270;
  const badgeH = 430;
  const badgeX = (pageWidth - badgeW) / 2;
  const badgeY = 88;

  // Outer Badge Background & Border (Matching #051326 in tradenexus-id.png)
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 20).fill('#051326');

  // Lanyard Punch Hole Indicator
  const holeW = 44;
  const holeH = 8;
  const holeX = badgeX + (badgeW - holeW) / 2;
  const holeY = badgeY + 10;
  doc.roundedRect(holeX, holeY, holeW, holeH, 4).fill('#1A2B42');
  doc.roundedRect(holeX + 4, holeY + 2, holeW - 8, holeH - 4, 2).fill('#051326');

  // Top Brand Header: Official Trade Nexus Logo Emblem (matching tradenexus-id.png)
  const logoTopY = badgeY + 28;
  const logoIconPath = path.join(ASSETS_DIR, 'logo-icon.png');
  const wmEmblemPath = path.join(ASSETS_DIR, 'watermark-emblem.png');
  const topBrandAsset = path.join(ASSETS_DIR, 'id-card-top-brand.png');

  if (fs.existsSync(topBrandAsset)) {
    // Draw crisp extracted top brand header (includes lanyard punch hole + circular logo + TRADE NEXUS + TRADE SMART)
    doc.save();
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 20).clip();
    doc.image(topBrandAsset, badgeX, badgeY, { width: badgeW });
    doc.restore();
  } else {
    // Fallback vector top brand
    const emblemToUse = fs.existsSync(wmEmblemPath) ? wmEmblemPath : (fs.existsSync(logoIconPath) ? logoIconPath : null);
    if (emblemToUse) {
      doc.image(emblemToUse, badgeX + (badgeW - 28) / 2, logoTopY, { width: 28 });
    }
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#FFFFFF').text('TRADE NEXUS', badgeX, logoTopY + 32, { align: 'center', width: badgeW });
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#00C9A7').text('— TRADE SMART —', badgeX, logoTopY + 47, { align: 'center', width: badgeW });
  }

  // Employee Photo Circle with Concentric Cyan Glowing Ring
  const avatarY = badgeY + 102;
  const centerX = badgeX + badgeW / 2;
  const centerY = avatarY + 36;
  const radius = 33;

  doc.circle(centerX, centerY, 37).lineWidth(2.5).stroke('#00C9A7');
  doc.circle(centerX, centerY, radius).fill('#0A2540');

  const empName = cardData?.name || employee?.name || 'Avery Davis';
  const initials = empName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'TN';

  let drewImage = false;
  const rawAvatar = cardData?.avatar || employee?.avatar;
  if (rawAvatar && typeof rawAvatar === 'string') {
    try {
      let imgBuffer: Buffer | null = null;
      if (rawAvatar.startsWith('data:image/')) {
        const base64Content = rawAvatar.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
        imgBuffer = Buffer.from(base64Content, 'base64');
      } else if (rawAvatar.startsWith('http://') || rawAvatar.startsWith('https://')) {
        try {
          const res = await fetch(rawAvatar);
          if (res.ok) {
            imgBuffer = Buffer.from(await res.arrayBuffer());
          }
        } catch (fetchErr) {
          // Ignore network avatar error
        }
      }

      if (imgBuffer && imgBuffer.length > 0) {
        doc.save();
        doc.circle(centerX, centerY, radius).clip();
        doc.image(imgBuffer, centerX - radius, centerY - radius, {
          cover: [radius * 2, radius * 2],
          align: 'center',
          valign: 'center'
        });
        doc.restore();
        drewImage = true;
      }
    } catch (imgErr) {
      // Fall back to initials
    }
  }

  if (!drewImage) {
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#00C9A7').text(initials, centerX - 14, centerY - 9);
  }

  // Employee Name & Designation (Matching tradenexus-id.png)
  const role = cardData?.role || employee?.role || employee?.roleTitle || 'Digital Marketing Specialist';
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#FFFFFF').text(empName.toUpperCase(), badgeX + 10, avatarY + 78, {
    align: 'center',
    width: badgeW - 20,
  });

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#00C9A7').text(role.toUpperCase(), badgeX + 10, avatarY + 93, {
    align: 'center',
    width: badgeW - 20,
  });

  // Divider
  doc.rect(badgeX + 35, avatarY + 106, badgeW - 70, 1).fill('#00C9A7');

  // Key Details Matrix inside badge
  const gridY = avatarY + 114;
  const empCode = cardData?.empCode || employee?.empCode || 'TNX-042';
  const blood = cardData?.bloodGroup || employee?.bloodGroup || 'O+ ve';
  let rawDob = cardData?.dob || employee?.dob || '05/11/1997';
  let dob = '05/11/1997';
  if (rawDob) {
    const clean = String(rawDob).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split('-');
      dob = `${d}/${m}/${y}`;
    } else {
      dob = clean;
    }
  }

  const rawEmpType = cardData?.empType || cardData?.employeeType || employee?.employeeType || 'Full - Time';
  const phone = cardData?.phone || cardData?.emergencyPhone || employee?.phone || employee?.emergencyPhone || '9876543210';

  const drawDetailRow = (label: string, val: string, yPos: number) => {
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#94A3B8').text(label, badgeX + 32, yPos);
    doc.text(':', badgeX + 90, yPos);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF').text(val, badgeX + 100, yPos);
  };

  drawDetailRow('Emp. ID', empCode, gridY);
  drawDetailRow('Emp. Type', rawEmpType, gridY + 13);
  drawDetailRow('Blood Group', blood, gridY + 26);
  drawDetailRow('D.O.B.', dob, gridY + 39);
  drawDetailRow('Cell', phone, gridY + 52);

  // Bottom Curved White Card Container (Matching tradenexus-id.png)
  const cardBottomH = 110;
  const cardBottomY = badgeY + badgeH - cardBottomH;

  doc.save();
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 20).clip();

  const botAssetPath = path.join(ASSETS_DIR, 'id-card-bottom.png');
  if (fs.existsSync(botAssetPath)) {
    doc.image(botAssetPath, badgeX, cardBottomY, { width: badgeW, height: cardBottomH });
  } else {
    // White background
    doc.rect(badgeX, cardBottomY, badgeW, cardBottomH).fill('#FFFFFF');
    doc.rect(badgeX, cardBottomY, badgeW, 3).fill('#00C9A7');

    // Contact details on left
    const contactY = cardBottomY + 10;
    doc.circle(badgeX + 18, contactY + 5, 4).fill('#051326');
    doc.fontSize(5.5).font('Helvetica-Bold').fillColor('#334155').text('123 Business Avenue,\nFinancial District, 500001', badgeX + 26, contactY, { width: 110 });

    doc.circle(badgeX + 18, contactY + 20, 4).fill('#051326');
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#334155').text('info@tradenexus.com', badgeX + 26, contactY + 17);

    doc.circle(badgeX + 18, contactY + 34, 4).fill('#051326');
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#334155').text('www.tradenexus.com', badgeX + 26, contactY + 31);

    doc.circle(badgeX + 18, contactY + 48, 4).fill('#051326');
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#334155').text('+91 98765 43210', badgeX + 26, contactY + 45);

    // Signature Block on right
    const sigRightX = badgeX + badgeW - 120;
    drawOfficialSignature(doc, sigRightX, cardBottomY + 12, 100);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0A2540').text('T. Vidhya Sagar', sigRightX, cardBottomY + 38);
    doc.fontSize(6.5).font('Helvetica').fillColor('#64748B').text('Chief executive Officer', sigRightX, cardBottomY + 48);

    // Bottom Notice Bar
    doc.rect(badgeX, cardBottomY + cardBottomH - 18, badgeW, 18).fill('#051326');
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#00C9A7').text(
      'AUTHORISED CORPORATE PERSONNEL  •  IDENTITY VERIFIED',
      badgeX,
      cardBottomY + cardBottomH - 13,
      { align: 'center', width: badgeW }
    );
  }

  doc.restore();

  // Outer border stroke
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 20).lineWidth(1).strokeColor('#00C9A7').stroke();

  doc.end();
  return bufferPromise;
}
