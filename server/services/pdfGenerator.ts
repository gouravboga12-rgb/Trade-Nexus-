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
  location?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
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
  const companyName = (data as any).companyName || 'Trade Nexus';
  const companyAddress = (data as any).companyAddress || '123 Business Avenue, Financial District, Your City, 500001';
  const companyPhone = (data as any).companyPhone || '+91 98765 43210';
  const companyEmail = (data as any).companyEmail || 'info@tradenexus.com';
  const companyWebsite = (data as any).companyWebsite || 'www.tradenexus.com';

  doc.fontSize(11.5).font('Helvetica-Bold').fillColor('#041026').text(companyName, leftX, currentY);
  currentY += 16;

  // Pin + Address (multiline or 2 lines)
  const pinPath = path.join(ASSETS_DIR, 'icon-pin.png');
  if (fs.existsSync(pinPath)) {
    doc.image(pinPath, leftX, currentY + 1, { width: 9.5, height: 9.5 });
  }
  doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(companyAddress, leftX + 15, currentY, { width: 280, lineGap: 2 });
  currentY = doc.y + 3;

  // Phone
  const phonePath = path.join(ASSETS_DIR, 'icon-phone.png');
  if (fs.existsSync(phonePath)) {
    doc.image(phonePath, leftX, currentY + 1, { width: 9.5, height: 9.5 });
  }
  doc.text(companyPhone, leftX + 15, currentY);
  currentY += 14;

  // Email
  const mailPath = path.join(ASSETS_DIR, 'icon-mail.png');
  if (fs.existsSync(mailPath)) {
    doc.image(mailPath, leftX, currentY + 1, { width: 9.5, height: 9.5 });
  }
  doc.text(companyEmail, leftX + 15, currentY);
  currentY += 14;

  // Website
  const globePath = path.join(ASSETS_DIR, 'icon-globe.png');
  if (fs.existsSync(globePath)) {
    doc.image(globePath, leftX, currentY + 1, { width: 9.5, height: 9.5 });
  }
  doc.text(companyWebsite, leftX + 15, currentY);
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
    .font('Helvetica-Bold').fillColor('#00A88B').text(companyName, { continued: true })
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

  doc.fontSize(9.5).font('Helvetica').fillColor('#041026').text(companyName, leftX, currentY);

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

  drawCorporateHeader(doc, 'header-experience.png', pageWidth, 192);
  drawWatermark(doc, pageWidth, pageHeight);
  drawCorporateFooter(doc, pageWidth, pageHeight);

  const leftX = 48;
  const contentW = pageWidth - leftX * 2;
  let currentY = 205;

  const empName     = cert.employeeName    || employee.name      || 'Staff Member';
  const guardian    = cert.guardianName    || employee.guardianName || '';
  const empCode     = cert.empCode         || employee.empCode   || 'TNX-001';
  const role        = cert.designation     || employee.role      || employee.roleTitle || 'Executive';
  const dept        = cert.department      || employee.groupName || employee.department || 'Client Acquisition';
  const startDate   = cert.startDate       || employee.joinDate  || '01 January 2023';
  const endDate     = cert.endDate         || '01 January 2025';
  const refNum      = cert.refNumber       || `TNX/EXP/${new Date().getFullYear()}/${empCode}`;
  const issuedDate  = cert.issuedDate      || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const companyName = cert.companyName     || 'Trade Nexus';
  const sigName     = cert.signatoryName   || 'T. Vidhya Sagar';
  const sigRole     = cert.signatoryRole   || 'Chief Executive Officer';

  // Build default paragraphs — overridable by HR
  const guardianClause = guardian ? `, S/D of ${guardian},` : '';
  const firstName = empName.split(' ')[0] || empName;

  const defaultIntro = `This is to certify that Mr./Ms. ${empName}${guardianClause} bearing Employee Identification Number ${empCode}, was bona fide employed with ${companyName} from ${startDate} to ${endDate}.`;
  const defaultRole = `During the period of tenure with ${companyName}, ${empName} served in the professional capacity of ${role} within the ${dept} department.`;
  const defaultConduct = `During their tenure, ${firstName} performed their duties with sincerity, professionalism, and dedication. They were responsible for supervising client operations, ensuring high standards of service, coordinating with staff, and maintaining smooth day-to-day operations. Their conduct, character, and performance were satisfactory throughout their period of employment.`;
  const defaultClosing = `We appreciate the valuable contributions rendered during their service with ${companyName} and convey our best wishes for continued success and excellence in all future professional endeavors.`;

  const introPara   = cert.introParagraph   || defaultIntro;
  const rolePara    = cert.roleParagraph    || defaultRole;
  const conductPara = cert.conductRemarks   || defaultConduct;
  const closingPara = cert.closingParagraph || defaultClosing;

  // Ref Number (Left) and Date (Right)
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(`Ref: ${refNum}`, leftX, currentY);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569').text(`Date: ${issuedDate}`, 0, currentY, {
    align: 'right',
    width: pageWidth - leftX,
  });
  currentY += 32;

  // Centered Title
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#0A2540').text('To Whom It May Concern', 0, currentY, {
    align: 'center',
    width: pageWidth,
  });
  doc.rect((pageWidth - 140) / 2, currentY + 18, 140, 1.8).fill('#00C9A7');
  currentY += 40;

  // Intro paragraph
  doc.fontSize(9.5).font('Helvetica').fillColor('#1E293B').text(introPara, leftX, currentY, { width: contentW, lineGap: 5 });
  currentY += doc.heightOfString(introPara, { width: contentW, lineGap: 5 }) + 14;

  // Role paragraph
  doc.fontSize(9.5).font('Helvetica').fillColor('#1E293B').text(rolePara, leftX, currentY, { width: contentW, lineGap: 5 });
  currentY += doc.heightOfString(rolePara, { width: contentW, lineGap: 5 }) + 14;

  // Conduct paragraph
  doc.fontSize(9.5).font('Helvetica').fillColor('#1E293B').text(conductPara, leftX, currentY, { width: contentW, lineGap: 5 });
  currentY += doc.heightOfString(conductPara, { width: contentW, lineGap: 5 }) + 14;

  // Closing paragraph
  doc.fontSize(9.5).font('Helvetica').fillColor('#1E293B').text(closingPara, leftX, currentY, { width: contentW, lineGap: 5 });
  currentY += doc.heightOfString(closingPara, { width: contentW, lineGap: 5 }) + 28;

  // Signatory block
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0A2540').text(`For ${companyName} Corporate Services,`, leftX, currentY);
  drawOfficialSignature(doc, leftX, currentY + 12, 145);
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0A2540').text(sigName, leftX, currentY + 50);
  doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(sigRole, leftX, currentY + 62);
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#00A88B').text(companyName, leftX, currentY + 74);

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

  const paragraphs = [
    relievingLetter.bodyParagraph1,
    relievingLetter.bodyParagraph2,
    relievingLetter.bodyParagraph3,
    relievingLetter.bodyParagraph4,
  ].filter(Boolean);

  if (paragraphs.length > 0) {
    for (const p of paragraphs) {
      doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(p, leftX, currentY, { width: contentW, lineGap: 3.5 });
      currentY += doc.heightOfString(p, { width: contentW, lineGap: 3.5 }) + 10;
    }
  } else {
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
  }

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

  const empName = payslip.employeeName || employee?.name || '';
  const empCode = payslip.empCode || payslip.employeeCode || employee?.empCode || '';
  const role = payslip.roleTitle || employee?.roleTitle || employee?.role || '';
  const dept = payslip.department || employee?.groupName || employee?.department || '';
  const month = payslip.month || '';
  const year = payslip.year || new Date().getFullYear();
  const empType = payslip.employeeType || '';
  const payDate = payslip.payDate || '';

  const labelColor = '#0A2540';
  const valueColor = '#1E293B';
  const iconColor = '#475569';

  // Small vector icons matching the template's outline icon style
  const drawIcon = (kind: string, x: number, y: number) => {
    doc.save();
    doc.lineWidth(0.8).strokeColor(iconColor).fillColor(iconColor);
    if (kind === 'calendar') {
      doc.roundedRect(x, y + 1.5, 10, 9, 1).stroke();
      doc.rect(x, y + 1.5, 10, 2.4).fill();
      doc.moveTo(x + 2.5, y).lineTo(x + 2.5, y + 2.5).stroke();
      doc.moveTo(x + 7.5, y).lineTo(x + 7.5, y + 2.5).stroke();
    } else if (kind === 'person') {
      doc.circle(x + 5, y + 3, 2.6).fill();
      doc.moveTo(x + 0.5, y + 11).bezierCurveTo(x + 0.5, y + 5.5, x + 9.5, y + 5.5, x + 9.5, y + 11).closePath().fill();
    } else if (kind === 'idcard') {
      doc.roundedRect(x, y + 1.5, 10.5, 8, 1).stroke();
      doc.circle(x + 3, y + 4.6, 1.3).fill();
      doc.rect(x + 1.5, y + 6.6, 3, 1.4).fill();
      doc.moveTo(x + 6, y + 4.2).lineTo(x + 9, y + 4.2).stroke();
      doc.moveTo(x + 6, y + 6.6).lineTo(x + 9, y + 6.6).stroke();
    } else if (kind === 'building') {
      doc.roundedRect(x, y + 1.5, 10.5, 9, 1).stroke();
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) doc.rect(x + 2 + c * 2.6, y + 3.6 + r * 3, 1.3, 1.3).fill();
    } else if (kind === 'target') {
      doc.circle(x + 5, y + 6, 4.8).stroke();
      doc.circle(x + 5, y + 6, 2.6).stroke();
      doc.circle(x + 5, y + 6, 0.9).fill();
    }
    doc.restore();
  };

  const drawMetaRow = (icon: string, label: string, value: string, x: number, y: number, valueX: number, valueW: number) => {
    drawIcon(icon, x, y - 1);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(labelColor).text(label, x + 21, y, { lineBreak: false });
    doc.fontSize(8.5).font('Helvetica').fillColor(valueColor).text(`: ${value}`, valueX, y, { width: valueW, lineBreak: false, ellipsis: true });
  };

  // The header artwork ships with a sample "Month : May 2027" baked into its white strip.
  // Mask that sample text and draw the real payroll month in the same slot so Month appears exactly once.
  doc.rect(56, 161, 190, 23).fill('#FFFFFF');
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor(labelColor).text('Month', 57, 168, { lineBreak: false });
  doc.fontSize(8.5).font('Helvetica').fillColor(valueColor).text(`: ${month} ${year}`.trim(), 142, 168, { width: 100, lineBreak: false });

  // Two-column employee information grid (4.png)
  const leftIconX = 36;
  const leftValueX = 142;
  const rightIconX = 320;
  const rightValueX = 432;
  const rightValueW = pageWidth - rightValueX - 24;
  let rowY = 194;
  drawMetaRow('person', 'Employee Name', empName, leftIconX, rowY, leftValueX, 170);
  drawMetaRow('target', 'Designation', role, rightIconX, rowY, rightValueX, rightValueW);
  rowY += 22;
  drawMetaRow('idcard', 'Employee ID', empCode, leftIconX, rowY, leftValueX, 170);
  drawMetaRow('idcard', 'Employee Type', empType, rightIconX, rowY, rightValueX, rightValueW);
  rowY += 22;
  drawMetaRow('building', 'Department', dept, leftIconX, rowY, leftValueX, 170);
  drawMetaRow('calendar', 'Pay Date', payDate, rightIconX, rowY, rightValueX, rightValueW);

  let currentY = rowY + 26;

  // Earnings & Deductions amounts — always the real stored values (0 is a valid amount)
  const num = (primary: any, legacy?: any) => {
    const v = primary !== undefined && primary !== null && primary !== '' ? primary : legacy;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const basic = num(payslip.basicSalary);
  const hra = num(payslip.housingAllowance, payslip.hra);
  const allowance = num(payslip.transportation, payslip.specialAllowance);
  const incentives = num(payslip.performanceBonus, payslip.incentives);
  const totalEarnings = basic + hra + allowance + incentives;

  const tax = num(payslip.taxDeduction);
  const healthInsurance = num(payslip.healthInsurance, payslip.pfDeduction);
  const pension = num(payslip.pensionContribution);
  const totalDeductions = tax + healthInsurance + pension;
  const netPay = totalEarnings - totalDeductions;

  // 1. EARNINGS TABLE (Exact match for 4.png)
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0A2540').text('EARNINGS', leftX, currentY);
  currentY += 15;

  doc.rect(leftX, currentY, contentW, 22).fill('#06152B');
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#FFFFFF').text('DESCRIPTION', leftX + 10, currentY + 7);
  doc.text('AMOUNT (INR)', leftX, currentY + 7, { width: contentW - 10, align: 'right' });
  currentY += 22;

  const earnRows = [
    { desc: 'Basic Salary', amt: basic },
    { desc: 'Housing Allowance', amt: hra },
    { desc: 'Transportation', amt: allowance },
    { desc: 'Performance Bonus', amt: incentives },
  ];

  earnRows.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    doc.rect(leftX, currentY, contentW, 20).fill(bg);
    doc.fontSize(7.5).font('Helvetica').fillColor('#334155').text(r.desc, leftX + 10, currentY + 6);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0A2540').text(
      `INR ${r.amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      leftX,
      currentY + 6,
      { width: contentW - 10, align: 'right' }
    );
    currentY += 20;
  });

  // Total Earnings Row (Matching 4.png green tint)
  doc.rect(leftX, currentY, contentW, 22).fill('#E6FAF6');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text('TOTAL EARNINGS', leftX + 10, currentY + 7);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#00A88B').text(
    `INR ${totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    leftX,
    currentY + 6,
    { width: contentW - 10, align: 'right' }
  );
  currentY += 34;

  // 2. DEDUCTIONS TABLE (Exact match for 4.png)
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0A2540').text('DEDUCTIONS', leftX, currentY);
  currentY += 15;

  doc.rect(leftX, currentY, contentW, 22).fill('#06152B');
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#FFFFFF').text('DESCRIPTION', leftX + 10, currentY + 7);
  doc.text('AMOUNT (INR)', leftX, currentY + 7, { width: contentW - 10, align: 'right' });
  currentY += 22;

  const dedRows = [
    { desc: 'Tax (Federal + State)', amt: tax },
    { desc: 'Health Insurance', amt: healthInsurance },
    { desc: 'Pension Contribution', amt: pension },
  ];

  dedRows.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    doc.rect(leftX, currentY, contentW, 20).fill(bg);
    doc.fontSize(7.5).font('Helvetica').fillColor('#334155').text(r.desc, leftX + 10, currentY + 6);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0A2540').text(
      `INR ${r.amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      leftX,
      currentY + 6,
      { width: contentW - 10, align: 'right' }
    );
    currentY += 20;
  });

  // Total Deductions Row
  doc.rect(leftX, currentY, contentW, 22).fill('#E6FAF6');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text('TOTAL DEDUCTIONS', leftX + 10, currentY + 7);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#DC2626').text(
    `INR ${totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    leftX,
    currentY + 6,
    { width: contentW - 10, align: 'right' }
  );
  currentY += 34;

  // Bottom Summary & Authorized Signatory Block (Matching 4.png)
  const sumY = currentY;

  // Left Details
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0A2540').text('NET PAY', leftX, sumY);
  doc.text(':', leftX + 100, sumY);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#00A88B').text(
    `INR ${netPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    leftX + 112,
    sumY - 1
  );

  const bankAcc = payslip.bankAccountNumber || employee?.bankAccountNumber || '';
  const payMode = payslip.paymentMode || 'Bank Transfer';

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text('Bank Account', leftX, sumY + 20);
  doc.text(':', leftX + 100, sumY + 20);
  doc.fontSize(8).font('Helvetica').fillColor('#475569').text(bankAcc, leftX + 112, sumY + 20);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text('Payment Mode', leftX, sumY + 34);
  doc.text(':', leftX + 100, sumY + 34);
  doc.fontSize(8).font('Helvetica').fillColor('#475569').text(payMode, leftX + 112, sumY + 34);

  // Right Signatory: Authorized Signatory (matching 4.png, Finance Manager – Trade Nexus / Muhammad Patel)
  const sigRightX = 370;
  const authRole = payslip.authorizedRole || 'Finance Manager – Trade Nexus';
  const authName = payslip.authorizedName || 'Muhammad Patel';

  const sigW = pageWidth - sigRightX - leftX;
  doc.fontSize(8).font('Helvetica').fillColor('#475569').text('Authorized by:', sigRightX, sumY + 34, { lineBreak: false });
  doc.fontSize(8.5).font('Helvetica').fillColor('#0A2540').text(authRole, sigRightX, sumY + 50, { width: sigW, lineBreak: false, ellipsis: true });

  // Signature area: uploaded signature image only (never a second typed copy of the name)
  const sigData: string = payslip.authorizedSignature || '';
  const sigMatch = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(sigData);
  if (sigMatch) {
    try {
      doc.image(Buffer.from(sigMatch[2], 'base64'), sigRightX + 20, sumY + 66, { fit: [130, 34], align: 'center', valign: 'center' });
    } catch (e) {
      console.warn('[PDF] Unable to render payroll signature image:', e);
    }
  }

  // Authorized person's name — rendered exactly once
  doc.fontSize(8.5).font('Helvetica').fillColor('#0A2540').text(authName, sigRightX + 20, sumY + 106, { width: 130, align: 'center', lineBreak: false });

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
  const clientCompany = invoice.clientCompany || '';
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('BILL TO:', leftX, currentY);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#334155').text(clientName, leftX, currentY + 12, { width: 160 });
  let billY = currentY + 24;
  if (clientCompany) {
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text(clientCompany, leftX, billY, { width: 160 });
    billY += 11;
  }
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(clientPhone, leftX, billY, { width: 160 });
  billY += 11;
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(clientEmail, leftX, billY, { width: 160 });
  billY += 11;
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(clientAddress, leftX, billY, { width: 160 });
  const billEndY = doc.y;

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

  if (invoice.dueDate) {
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('DUE DATE:', col3X, currentY + 32);
    doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(String(invoice.dueDate), col3X + 75, currentY + 32);
  }

  currentY = Math.max(currentY + 72, billEndY + 14, doc.y + 14);

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
  const taxRate = invoice.taxRate !== undefined && invoice.taxRate !== null ? Number(invoice.taxRate) : 0;
  const taxAmount = invoice.taxAmount !== undefined && invoice.taxAmount !== null
    ? Number(invoice.taxAmount)
    : (subTotal * taxRate) / 100;
  const grandTotal = invoice.grandTotal !== undefined && invoice.grandTotal !== null
    ? Number(invoice.grandTotal)
    : subTotal + taxAmount;
  const fmt = (n: number) => `INR ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Totals block (Sub Total, GST, Grand Total)
  currentY += 10;
  const subBoxW = 200;
  const subBoxX = leftX + contentW - subBoxW;

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#334155').text('SUB TOTAL', subBoxX + 14, currentY + 4);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(fmt(subTotal), subBoxX, currentY + 4, { width: subBoxW - 14, align: 'right' });
  currentY += 16;

  if (taxRate > 0 || taxAmount > 0) {
    doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(`GST (${taxRate}%)`, subBoxX + 14, currentY + 4);
    doc.fontSize(8.5).font('Helvetica').fillColor('#0A2540').text(fmt(taxAmount), subBoxX, currentY + 4, { width: subBoxW - 14, align: 'right' });
    currentY += 18;
  }

  doc.rect(subBoxX, currentY, subBoxW, 26).fill('#081031');
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF').text('TOTAL', subBoxX + 14, currentY + 8);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#00C9A7').text(fmt(grandTotal), subBoxX, currentY + 8, { width: subBoxW - 14, align: 'right' });

  currentY += 40;

  // Underlined Note Lines (HR-entered notes, one per line)
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Note:', leftX, currentY);
  currentY += 14;

  const notes = String(invoice.note || 'All payments are due within 15 days of invoice date.')
    .split(/\r?\n/)
    .map((s: string) => s.trim())
    .filter(Boolean);

  notes.forEach((nt: string) => {
    doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(nt, leftX, currentY, { width: 300 });
    const lineY = doc.y + 2;
    doc.moveTo(leftX, lineY).lineTo(leftX + 300, lineY).lineWidth(0.4).strokeColor('#E2E8F0').stroke();
    currentY = lineY + 5;
  });

  // Bottom Section: Payment Information (Left) and Large "Thank You!" (Right) (Exact match for 5.png)
  currentY += 10;

  // Payment Info (Left Box)
  const payBoxW = 240;
  doc.rect(leftX, currentY, payBoxW, 69).fill('#F8FAFC');
  doc.rect(leftX, currentY, payBoxW, 69).lineWidth(0.5).strokeColor('#E2E8F0').stroke();

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text('Payment Information:', leftX + 10, currentY + 8);

  const bankName = invoice.bankName || 'HDFC Bank';
  const accNum = invoice.accountNumber || '50200084920194';
  const ifsc = invoice.ifscCode || '';
  const payEmail = invoice.paymentEmail || 'billing@tradenexus.live';

  const payRows: [string, string][] = [
    ['Bank', bankName],
    ['A/C No', accNum],
    ...(ifsc ? [['IFSC', ifsc] as [string, string]] : []),
    ['Email', payEmail],
  ];
  payRows.forEach(([label, val], i) => {
    const y = currentY + 22 + i * 11;
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text(label, leftX + 10, y);
    doc.text(':', leftX + 55, y);
    doc.fontSize(7.5).font('Helvetica').fillColor('#0A2540').text(val, leftX + 65, y, { width: payBoxW - 75 });
  });

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
  doc.rect(272, 574, 47, 3).fill('#00C2CB');

  // 4. Details Table Grid (matching tradenexus-id.png, spaced cleanly above wave at 732)
  const rows = [
    { label: 'Emp. ID', val: empCode },
    { label: 'Emp. Type', val: rawEmpType },
    { label: 'Blood Group', val: blood },
    { label: 'D.O.B.', val: dob },
    { label: 'Cell', val: phone },
  ];

  let curY = 604;
  rows.forEach(row => {
    doc.fontSize(13.5).font('Helvetica').fillColor('#CBD5E1').text(row.label, 148, curY);
    doc.fontSize(13.5).font('Helvetica-Bold').fillColor('#FFFFFF').text(':', 292, curY);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#FFFFFF').text(row.val, 328, curY);
    curY += 21.5;
  });

  // 5. Footer (y = 744 to 1004) - Always clean dynamic overlay
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

  doc.end();
  return bufferPromise;
}
