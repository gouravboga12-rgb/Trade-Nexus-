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
  employeeType?: string;
  salaryType?: string;
}): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `Job Offer Letter - ${data.candidateName || 'Candidate'}`,
      Author: 'Trade Nexus Corporate HR',
      Subject: 'Official Employment Offer Letter',
      Creator: 'Trade Nexus HRMS',
    }
  });

  const bufferPromise = docToBuffer(doc);
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  // 1. Top Header Banner (exact 2480x800 asset matching template)
  drawCorporateHeader(doc, 'header-offer.png', pageWidth, 192);

  // 2. Watermark Emblem (subtle, lower right, matching template)
  const wmPath = path.join(ASSETS_DIR, 'watermark-emblem.png');
  if (fs.existsSync(wmPath)) {
    doc.save();
    doc.opacity(0.06);
    doc.image(wmPath, pageWidth - 260, pageHeight - 330, { width: 300, height: 300 });
    doc.restore();
  }

  // 3. Bottom Corporate Footer (exact 2480x223 asset matching template)
  drawCorporateFooter(doc, pageWidth, pageHeight);

  // 4. Content Area Layout
  const leftX = 42;
  const contentW = pageWidth - leftX * 2;
  let currentY = 202;

  // Issued Date (Right aligned, aligned with "Trade Nexus" header)
  const issuedDate = data.issuedDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#041026').text(issuedDate, 0, currentY, {
    align: 'right',
    width: pageWidth - leftX,
  });

  // Company Brand & Contact block (Upper Left under banner)
  doc.fontSize(11.5).font('Helvetica-Bold').fillColor('#041026').text('Trade Nexus', leftX, currentY);
  currentY += 16;

  // Pin + Address (2 lines)
  const pinPath = path.join(ASSETS_DIR, 'icon-pin.png');
  if (fs.existsSync(pinPath)) {
    doc.image(pinPath, leftX, currentY + 1, { width: 9.5, height: 9.5 });
  }
  doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text('123 Business Avenue,', leftX + 15, currentY);
  currentY += 12;
  doc.text('Financial District, Your City, 500001', leftX + 15, currentY);
  currentY += 14;

  // Phone
  const phonePath = path.join(ASSETS_DIR, 'icon-phone.png');
  if (fs.existsSync(phonePath)) {
    doc.image(phonePath, leftX, currentY + 1, { width: 9.5, height: 9.5 });
  }
  doc.text('+91 98765 43210', leftX + 15, currentY);
  currentY += 14;

  // Email
  const mailPath = path.join(ASSETS_DIR, 'icon-mail.png');
  if (fs.existsSync(mailPath)) {
    doc.image(mailPath, leftX, currentY + 1, { width: 9.5, height: 9.5 });
  }
  doc.text('info@tradenexus.com', leftX + 15, currentY);
  currentY += 14;

  // Website
  const globePath = path.join(ASSETS_DIR, 'icon-globe.png');
  if (fs.existsSync(globePath)) {
    doc.image(globePath, leftX, currentY + 1, { width: 9.5, height: 9.5 });
  }
  doc.text('www.tradenexus.com', leftX + 15, currentY);
  currentY += 22;

  // Recipient Block ("To,")
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#64748B').text('To,', leftX, currentY);
  currentY += 13;

  const candidateName = data.candidateName || 'Jonathan Patterson';
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#041026').text(candidateName, leftX, currentY);
  currentY += 14;

  const candidateAddress = data.candidateAddress || '123 Anywhere St., Any City\nST 12345';
  doc.fontSize(9.5).font('Helvetica').fillColor('#475569').text(candidateAddress, leftX, currentY, {
    width: 320,
    lineGap: 3,
  });

  const addressLines = candidateAddress.split('\n').length;
  currentY += Math.max(32, addressLines * 13 + 8);

  // Salutation
  const firstName = candidateName.trim().split(' ')[0] || candidateName;
  doc.fontSize(10.5).font('Helvetica').fillColor('#041026').text(`Dear ${firstName},`, leftX, currentY);
  currentY += 22;

  // Paragraph 1: Offer & Role
  const role = data.roleTitle || 'Marketing Coordinator';
  const joinDate = data.joiningDate || 'September 9, 2025';
  const reportingManager = data.reportingManager || 'Rosa Maria (Marketing Manager)';

  doc.fontSize(10).font('Helvetica').fillColor('#041026')
    .text('We are pleased to offer you the position of ', leftX, currentY, { continued: true, lineGap: 5, width: contentW })
    .font('Helvetica-Bold').fillColor('#00A88B').text(role, { continued: true })
    .font('Helvetica').fillColor('#041026').text(' at ', { continued: true })
    .font('Helvetica-Bold').fillColor('#00A88B').text('Trade Nexus', { continued: true })
    .font('Helvetica').fillColor('#041026').text(', starting on ', { continued: true })
    .font('Helvetica-Bold').fillColor('#00A88B').text(joinDate, { continued: true })
    .font('Helvetica').fillColor('#041026').text('. In this role, you will report to ', { continued: true })
    .font('Helvetica-Bold').fillColor('#00A88B').text(reportingManager, { continued: true })
    .font('Helvetica').fillColor('#041026').text(' and will be based at our corporate office.');

  currentY = doc.y + 16;

  // Paragraph 2: Remuneration
  let formattedSalary = 'INR 7,00,000';
  if (typeof data.monthlyGross === 'number') {
    formattedSalary = `INR ${data.monthlyGross.toLocaleString('en-IN')}`;
  } else if (data.monthlyGross) {
    formattedSalary = String(data.monthlyGross).startsWith('INR') ? String(data.monthlyGross) : `INR ${data.monthlyGross}`;
  }

  doc.fontSize(10).font('Helvetica').fillColor('#041026')
    .text('Your monthly salary will be ', leftX, currentY, { continued: true, lineGap: 5, width: contentW })
    .font('Helvetica-Bold').fillColor('#041026').text(formattedSalary, { continued: true })
    .font('Helvetica').fillColor('#041026').text(', along with benefits including health insurance, paid leave, internet allowance, and performance bonuses. Full details will be shared upon confirmation.');

  currentY = doc.y + 16;

  // Paragraph 3: Acceptance Deadline
  const deadline = data.acceptanceDeadline || 'August 30, 2025';
  doc.fontSize(10).font('Helvetica').fillColor('#041026')
    .text('Please confirm your acceptance by signing and returning this letter by ', leftX, currentY, { continued: true, lineGap: 5, width: contentW })
    .font('Helvetica-Bold').fillColor('#00A88B').text(deadline, { continued: true })
    .font('Helvetica').fillColor('#041026').text('.');

  currentY = doc.y + 16;

  // Paragraph 4: Closing encouragement
  doc.fontSize(10).font('Helvetica').fillColor('#041026').text(
    'We look forward to having you onboard and seeing your strategic ideas come to life!',
    leftX,
    currentY,
    { width: contentW }
  );

  currentY = doc.y + 16;

  // Key Terms
  const empType = data.employeeType || 'Full-Time';
  const salType = data.salaryType || 'Monthly Salary';

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#041026').text('Employee Type: ', leftX, currentY, { continued: true });
  doc.font('Helvetica').fillColor('#334155').text(empType);
  currentY += 15;

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#041026').text('Salary Type: ', leftX, currentY, { continued: true });
  doc.font('Helvetica').fillColor('#334155').text(salType);
  currentY += 20;

  // Sign-off
  doc.fontSize(10.5).font('Helvetica').fillColor('#041026').text('Warm Regards,', leftX, currentY);
  currentY += 10;

  // Signature Block
  const sigPath = path.join(ASSETS_DIR, 'signature-vidhya-sagar.png');
  if (fs.existsSync(sigPath)) {
    doc.image(sigPath, leftX, currentY, { width: 135 });
  }
  currentY += 32;

  const signatory = data.signatoryName || 'T .Vidhya Sagar';
  const signatoryRole = data.signatoryRole || 'Chief executive Officer';

  doc.fontSize(11).font('Helvetica-Bold').fillColor('#00A88B').text(signatory, leftX, currentY);
  currentY += 13;

  doc.fontSize(9.5).font('Helvetica').fillColor('#041026').text(signatoryRole, leftX, currentY);
  currentY += 12;

  doc.fontSize(9.5).font('Helvetica').fillColor('#041026').text('Trade Nexus', leftX, currentY);

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

  // Closing with Official Seal and Signatory on Right (Exact match for 3.png)
  const rightSealX = pageWidth - leftX - 140;

  // Official Seal Stamp (matches 3.png!)
  drawOfficialSeal(doc, rightSealX, currentY + 10, 130);

  const sigName = relievingLetter.signatoryName || 'T .Vidhya Sagar';
  const sigRole = relievingLetter.signatoryRole || 'Chief Executive Officer';
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0A2540').text(sigName, rightSealX, currentY + 145, { width: 130, align: 'center' });
  doc.fontSize(8).font('Helvetica').fillColor('#475569').text(sigRole, rightSealX, currentY + 157, { width: 130, align: 'center' });
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#00A88B').text('Authorized Signatory', rightSealX, currentY + 168, { width: 130, align: 'center' });

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

  // Right Signatory: Authorized Signatory (matching 4.png, Finance Manager – Trade Nexus / Muhammad Patel)
  const sigRightX = 370;
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text('Authorized by:', sigRightX, sumY);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Finance Manager – Trade Nexus', sigRightX, sumY + 12);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0A2540').text('Muhammad Patel', sigRightX, sumY + 45);

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
  const empName = (cardData?.name || employee?.name || 'Avery Davis').trim();
  const role = (cardData?.role || cardData?.designation || employee?.role || employee?.roleTitle || 'Digital Marketing Specialist').trim();
  const empCode = (cardData?.empCode || employee?.empCode || '001').trim();
  const rawEmpType = (cardData?.empType || cardData?.employeeType || employee?.employeeType || employee?.empType || 'Full - Time').trim();
  const blood = (cardData?.bloodGroup || employee?.bloodGroup || 'O+ ve').trim();
  
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

  const phone = (cardData?.phone || cardData?.cell || cardData?.emergencyPhone || employee?.phone || employee?.emergencyPhone || '0000XXXX97').trim();

  // Custom contact details (default to official template values)
  const address = cardData?.address || employee?.address || '123 Business Avenue, Financial District, Your City, 500001';
  const email = cardData?.email || employee?.email || 'info@tradenexus.com';
  const website = cardData?.website || employee?.website || 'www.tradenexus.com';
  const companyPhone = cardData?.companyPhone || employee?.companyPhone || '+91 98765 43210';
  const signatoryName = cardData?.signatoryName || 'T.Vidhya Sagar';
  const signatoryRole = cardData?.signatoryRole || 'Chief executive Officer';

  const isCustomContact = (
    address !== '123 Business Avenue, Financial District, Your City, 500001' ||
    email !== 'info@tradenexus.com' ||
    website !== 'www.tradenexus.com' ||
    companyPhone !== '+91 98765 43210' ||
    signatoryName !== 'T.Vidhya Sagar' ||
    signatoryRole !== 'Chief executive Officer'
  );

  const doc = new PDFDocument({
    size: [591, 1004],
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `Employee ID Card - ${empName}`,
      Author: 'Trade Nexus Security & HR',
      Subject: 'Official Identity Card Badge',
      Creator: 'Trade Nexus HRMS',
    }
  });

  const bufferPromise = docToBuffer(doc);

  // 1. Full Pristine Template Frame (591x1004)
  // Has continuous chevrons on both sides, top lanyard header, middle deep navy canvas, and bottom wave
  const fullFramePath = path.join(ASSETS_DIR, 'id-card-template-frame.png');
  if (fs.existsSync(fullFramePath)) {
    doc.image(fullFramePath, 0, 0, { width: 591, height: 1004 });
  } else {
    // Fallback if full frame not found
    doc.rect(0, 0, 591, 1004).fill('#020E37');
    const headerPath = path.join(ASSETS_DIR, 'id-card-header.png');
    if (fs.existsSync(headerPath)) {
      doc.image(headerPath, 0, 0, { width: 591, height: 270 });
    }
  }

  // 2. Avatar Circle with glowing cyan ring
  const cx = 295.5;
  const cy = 388;
  const r = 108;

  // Concentric outer cyan ring
  doc.circle(cx, cy, 116).lineWidth(7).strokeColor('#00C2CB').stroke();
  doc.circle(cx, cy, 110).lineWidth(2).strokeColor('#020E37').stroke();

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
        } catch {
          // ignore network avatar error
        }
      }

      if (imgBuffer && imgBuffer.length > 0) {
        doc.save();
        doc.circle(cx, cy, r).clip();
        doc.image(imgBuffer, cx - r, cy - r, {
          cover: [r * 2, r * 2],
          align: 'center',
          valign: 'center'
        });
        doc.restore();
        drewImage = true;
      }
    } catch {
      // Fall back
    }
  }

  if (!drewImage) {
    const defaultAvatarPath = path.join(ASSETS_DIR, 'default-id-avatar.png');
    if (fs.existsSync(defaultAvatarPath)) {
      doc.save();
      doc.circle(cx, cy, r).clip();
      doc.image(defaultAvatarPath, cx - r, cy - r, { width: r * 2, height: r * 2 });
      doc.restore();
    } else {
      const initials = empName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'TN';
      doc.circle(cx, cy, r).fill('#0A2540');
      doc.fontSize(44).font('Helvetica-Bold').fillColor('#00C2CB').text(initials, cx - 35, cy - 22);
    }
  }

  // 3. Name & Designation (exact template font sizes & colors)
  doc.fontSize(25).font('Helvetica-Bold').fillColor('#FFFFFF').text(empName.toUpperCase(), 0, 524, {
    align: 'center',
    width: 591,
    characterSpacing: 1.2
  });

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#00C2CB').text(role.toUpperCase(), 0, 555, {
    align: 'center',
    width: 591,
    characterSpacing: 1.5
  });

  // Small cyan accent bar under designation
  doc.rect(272, 576, 47, 3).fill('#00C2CB');

  // 4. Details Table Grid (matching tradenexus-id.png)
  const rows = [
    { label: 'Emp. ID', val: empCode },
    { label: 'Emp. Type', val: rawEmpType },
    { label: 'Blood Group', val: blood },
    { label: 'D.O.B.', val: dob },
    { label: 'Cell', val: phone },
  ];

  let curY = 618;
  rows.forEach(row => {
    doc.fontSize(13.5).font('Helvetica').fillColor('#CBD5E1').text(row.label, 148, curY);
    doc.fontSize(13.5).font('Helvetica-Bold').fillColor('#FFFFFF').text(':', 292, curY);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#FFFFFF').text(row.val, 328, curY);
    curY += 24;
  });

  // 5. Footer (y = 744 to 1004)
  if (isCustomContact) {
    const footerCleanPath = path.join(ASSETS_DIR, 'id-card-footer-clean.png');
    if (fs.existsSync(footerCleanPath)) {
      doc.image(footerCleanPath, 0, 744, { width: 591, height: 260 });
    }

    // Dynamic contact details on left
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#041026').text(address, 100, 816, { width: 250, lineGap: 1 });
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#041026').text(email, 100, 864, { width: 250 });
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#041026').text(website, 100, 901, { width: 250 });
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#041026').text(companyPhone, 100, 938, { width: 250 });

    // Dynamic signatory details on right
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#041026').text(signatoryName, 400, 888, { width: 175, align: 'center' });
    doc.fontSize(9.5).font('Helvetica').fillColor('#041026').text(signatoryRole, 400, 903, { width: 175, align: 'center' });
  } else if (!fs.existsSync(fullFramePath)) {
    const footerDefaultPath = path.join(ASSETS_DIR, 'id-card-footer-default.png');
    if (fs.existsSync(footerDefaultPath)) {
      doc.image(footerDefaultPath, 0, 744, { width: 591, height: 260 });
    }
  }

  doc.end();
  return bufferPromise;
}
