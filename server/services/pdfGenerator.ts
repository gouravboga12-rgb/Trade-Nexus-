import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FONT_PATH = path.resolve(__dirname, '../assets/fonts/GreatVibes.ttf');

/**
 * Register cursive signature font if available, fallback to Times-Italic
 */
function registerSignatureFont(doc: InstanceType<typeof PDFDocument>): string {
  try {
    if (fs.existsSync(FONT_PATH)) {
      doc.registerFont('SignatureScript', FONT_PATH);
      return 'SignatureScript';
    }
  } catch (err) {
    console.warn('[PDF] Could not register signature font:', err);
  }
  return 'Times-Italic';
}

/**
 * Draw an authentic cursive executive signature with natural pen flourish
 */
function drawCursiveSignature(
  doc: InstanceType<typeof PDFDocument>,
  name: string,
  x: number,
  y: number,
  fontSize: number = 22,
  color: string = '#051326',
  flourishWidth: number = 100
) {
  const fontName = registerSignatureFont(doc);
  doc.save();
  doc.rotate(-3, { origin: [x, y] });
  doc.font(fontName).fontSize(fontSize).fillColor(color).text(name, x, y);

  // Natural pen flourish stroke under signature
  doc.moveTo(x, y + fontSize + 2)
     .bezierCurveTo(
       x + flourishWidth * 0.35, y + fontSize,
       x + flourishWidth * 0.7, y + fontSize + 3,
       x + flourishWidth, y + fontSize - 1
     )
     .lineWidth(0.75)
     .strokeColor(color)
     .stroke();
  doc.restore();
}

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
// 1. JOB OFFER LETTER PDF GENERATOR (Exact match for OfferLetterModal.tsx / 1.png)
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

  // ── Top Navy Banner (matching OfferLetterModal.tsx) ──
  const bannerH = 75;
  doc.rect(0, 0, pageWidth, bannerH).fill('#06152B');

  // Teal bottom stripes
  doc.rect(0, bannerH - 4, pageWidth, 4).fill('#00A88B');
  doc.rect(0, bannerH - 1.5, pageWidth * 0.6, 1.5).fill('#38E1B7');

  // Brand Logo (Circular gradient style with TN)
  doc.circle(46, 36, 18).lineWidth(2).stroke('#00C9A7');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#00C9A7').text('TN', 38, 30);

  // Brand Name & Tagline
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#FFFFFF').text('TRADE NEXUS', 74, 26);
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#00C9A7').text('— TRADE SMART —', 75, 45);

  // Right Document Title
  doc.fontSize(15).font('Helvetica-Bold').fillColor('#FFFFFF').text('JOB OFFER LETTER', 0, 28, {
    align: 'right',
    width: pageWidth - 42,
  });
  doc.rect(pageWidth - 190, 47, 148, 1.5).fill('#00C9A7');

  // ── Company Contact Information & Date ──
  const compY = bannerH + 20;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#0A2540').text('Trade Nexus', 42, compY);

  doc.fontSize(8).font('Helvetica').fillColor('#475569');
  doc.text('123 Business Avenue, Financial District, Your City, 500001', 42, compY + 14);
  doc.text('+91 98765 43210', 42, compY + 26);
  doc.text('info@tradenexus.com', 42, compY + 38);
  doc.text('www.tradenexus.com', 42, compY + 50);

  // Issue Date (Right Aligned)
  const issuedDate = data.issuedDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569').text(issuedDate, 0, compY, {
    align: 'right',
    width: pageWidth - 42,
  });

  // Divider line
  const dividerY = compY + 68;
  doc.moveTo(42, dividerY).lineTo(pageWidth - 42, dividerY).lineWidth(0.5).strokeColor('#E2E8F0').stroke();

  // ── Recipient Address Block ──
  const toY = dividerY + 14;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#64748B').text('To,', 42, toY);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#0A2540').text(data.candidateName, 42, toY + 12);

  const address = data.candidateAddress || '123 Business Avenue, Financial District, Your City, 500001';
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(address, 42, toY + 26, { width: 340 });

  // ── Letter Body (Exact copy from OfferLetterModal.tsx / 1.png) ──
  const firstName = data.candidateName.split(' ')[0] || data.candidateName;
  const bodyY = toY + 62;

  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0A2540').text(`Dear ${firstName},`, 42, bodyY);

  const role = data.roleTitle || 'Senior Telecaller / SDR';
  const joinDate = data.joiningDate || 'Immediate';
  const manager = data.reportingManager || 'Branch Operations Team Leader';
  const monthlySalary = typeof data.monthlyGross === 'number'
    ? `INR ${data.monthlyGross.toLocaleString('en-IN')}`
    : data.monthlyGross ? `INR ${data.monthlyGross}` : 'INR 7,00,000';
  const deadline = data.acceptanceDeadline || 'Within 7 business days';

  let currentY = bodyY + 18;

  // Paragraph 1
  doc.fontSize(9).font('Helvetica').fillColor('#334155').lineGap(3.5).text(
    `We are pleased to offer you the position of `,
    42,
    currentY,
    { continued: true, width: pageWidth - 84 }
  );
  doc.font('Helvetica-Bold').fillColor('#00A88B').text(`${role} `, { continued: true });
  doc.font('Helvetica').fillColor('#334155').text(`at `, { continued: true });
  doc.font('Helvetica-Bold').fillColor('#0A2540').text(`Trade Nexus`, { continued: true });
  doc.font('Helvetica').fillColor('#334155').text(`, starting on `, { continued: true });
  doc.font('Helvetica-Bold').fillColor('#00A88B').text(`${joinDate}`, { continued: true });
  doc.font('Helvetica').fillColor('#334155').text(`. In this role, you will report to `, { continued: true });
  doc.font('Helvetica-Bold').fillColor('#00A88B').text(`${manager} `, { continued: true });
  doc.font('Helvetica').fillColor('#334155').text(`and will be based at our corporate office.`);

  // Paragraph 2
  currentY = doc.y + 10;
  doc.fontSize(9).font('Helvetica').fillColor('#334155').lineGap(3.5).text(
    `Your monthly salary will be `,
    42,
    currentY,
    { continued: true, width: pageWidth - 84 }
  );
  doc.font('Helvetica-Bold').fillColor('#0A2540').text(`${monthlySalary}`, { continued: true });
  doc.font('Helvetica').fillColor('#334155').text(
    `, along with benefits including health insurance, paid leave, internet allowance, and performance bonuses. Full details will be shared upon confirmation.`
  );

  // Paragraph 3
  currentY = doc.y + 10;
  doc.fontSize(9).font('Helvetica').fillColor('#334155').lineGap(3.5).text(
    `Please confirm your acceptance by signing and returning this letter by `,
    42,
    currentY,
    { continued: true, width: pageWidth - 84 }
  );
  doc.font('Helvetica-Bold').fillColor('#00A88B').text(`${deadline}.`);

  // Paragraph 4
  currentY = doc.y + 10;
  doc.fontSize(9).font('Helvetica').fillColor('#334155').lineGap(3.5).text(
    `We look forward to having you onboard and seeing your strategic ideas come to life!`,
    42,
    currentY,
    { width: pageWidth - 84 }
  );

  // Terms summary
  currentY = doc.y + 14;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(`Employee Type: Full-Time`, 42, currentY);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(`Salary Type: Monthly Salary`, 42, currentY + 13);

  // ── Warm Regards & Cursive Signature Block ──
  const sigY = currentY + 38;
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text('Warm Regards,', 42, sigY);

  // Authentic cursive signature
  drawCursiveSignature(doc, 'T. Vidhya sagar', 42, sigY + 16, 24, '#0A2540', 120);

  const signatory = data.signatoryName || 'T .Vidhya Sagar';
  const signatoryRole = data.signatoryRole || 'Chief executive Officer';

  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#00A88B').text(signatory, 42, sigY + 50);
  doc.fontSize(8).font('Helvetica').fillColor('#475569').text(signatoryRole, 42, sigY + 62);
  doc.fontSize(8).font('Helvetica').fillColor('#64748B').text('Trade Nexus', 42, sigY + 74);

  // ── Bottom Navy Footer Bar (matching OfferLetterModal.tsx) ──
  const footerH = 34;
  const footerY = pageHeight - footerH;
  doc.rect(0, footerY, pageWidth, footerH).fill('#06152B');
  doc.rect(0, footerY, pageWidth, 2).fill('#00A88B');

  doc.fontSize(8).font('Helvetica').fillColor('#CBD5E1').text(
    '+91 98765 43210   |   info@tradenexus.com   |   www.tradenexus.com',
    0,
    footerY + 12,
    { align: 'center', width: pageWidth }
  );

  doc.end();
  return bufferPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EMPLOYEE ID CARD PDF GENERATOR (Exact match for DigitalIdCardModal.tsx)
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
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#0A2540').text('TRADE NEXUS OFFICIAL IDENTITY BADGE', 0, 40, { align: 'center' });
  doc.fontSize(8.5).font('Helvetica').fillColor('#64748B').text('Cut along the border line for standard lanyard plastic card badge insertion.', 0, 58, { align: 'center' });

  // ── Badge Dimensions (Centered on page) ──
  const badgeW = 270;
  const badgeH = 430;
  const badgeX = (pageWidth - badgeW) / 2;
  const badgeY = 85;

  // Outer Badge Border & Background
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 18).fill('#06152B');

  // Lanyard Punch Hole Indicator
  doc.roundedRect(badgeX + (badgeW - 36) / 2, badgeY + 10, 36, 7, 3.5).fill('#1E293B');

  // Top Brand Header
  doc.circle(badgeX + badgeW / 2, badgeY + 40, 13).lineWidth(1.5).stroke('#00C9A7');
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#00C9A7').text('TN', badgeX + badgeW / 2 - 6, badgeY + 35);

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#FFFFFF').text('TRADE NEXUS', badgeX, badgeY + 58, { align: 'center', width: badgeW });
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#00C9A7').text('— TRADE SMART —', badgeX, badgeY + 73, { align: 'center', width: badgeW });

  // Employee Photo Circle / Avatar
  const avatarY = badgeY + 92;
  const centerX = badgeX + badgeW / 2;
  const centerY = avatarY + 36;
  const radius = 33;

  doc.circle(centerX, centerY, 37).lineWidth(2.5).stroke('#00C9A7');
  doc.circle(centerX, centerY, radius).fill('#0A2540');

  const empName = cardData?.name || employee.name || 'Staff Member';
  const initials = empName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'TN';

  let drewImage = false;
  const rawAvatar = cardData?.avatar || employee.avatar;
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
          console.warn('[PDF Warning] Failed to fetch avatar from URL:', fetchErr);
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
      console.warn('[PDF Warning] Failed to render avatar image, falling back to initials:', imgErr);
    }
  }

  if (!drewImage) {
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#00C9A7').text(initials, centerX - 14, centerY - 9);
  }

  // Employee Name & Role
  const role = cardData?.role || employee.role || employee.roleTitle || 'Executive';
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
  const empCode = cardData?.empCode || employee.empCode || '001';
  const blood = cardData?.bloodGroup || employee.bloodGroup || 'O+ ve';
  const rawDob = cardData?.dob || employee.dob || '05/11/1997';
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

  const rawEmpType = cardData?.empType || cardData?.employeeType || employee.employeeType || 'Full - Time';
  // Full unmasked phone number
  const phone = cardData?.phone || cardData?.emergencyPhone || employee.phone || employee.emergencyPhone || '9876543210';

  const drawDetailRow = (label: string, val: string, yPos: number) => {
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#94A3B8').text(label, badgeX + 32, yPos);
    doc.text(':', badgeX + 90, yPos);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF').text(val, badgeX + 100, yPos);
  };

  drawDetailRow('Emp. ID', empCode, gridY);
  drawDetailRow('Emp. Type', rawEmpType, gridY + 14);
  drawDetailRow('Blood Group', blood, gridY + 28);
  drawDetailRow('D.O.B.', dob, gridY + 42);
  drawDetailRow('Cell', phone, gridY + 56);

  // ── Bottom Curved White Card Container (Matching DigitalIdCardModal.tsx) ──
  const cardBottomH = 110;
  const cardBottomY = badgeY + badgeH - cardBottomH;

  // White container clipped into rounded bottom of badge with curved top
  doc.save();
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 18).clip();
  doc.rect(badgeX, cardBottomY, badgeW, cardBottomH).fill('#FFFFFF');
  doc.rect(badgeX, cardBottomY, badgeW, 3).fill('#00C9A7');

  // Contact details on the left
  const contactY = cardBottomY + 10;
  doc.circle(badgeX + 18, contactY + 5, 4).fill('#051326');
  doc.fontSize(5.5).font('Helvetica-Bold').fillColor('#334155').text('123 Business Avenue,\nFinancial District, 500001', badgeX + 26, contactY, { width: 110 });

  doc.circle(badgeX + 18, contactY + 20, 4).fill('#051326');
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#334155').text('info@tradenexus.com', badgeX + 26, contactY + 17);

  doc.circle(badgeX + 18, contactY + 34, 4).fill('#051326');
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#334155').text('www.tradenexus.com', badgeX + 26, contactY + 31);

  doc.circle(badgeX + 18, contactY + 48, 4).fill('#051326');
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#334155').text('+91 98765 43210', badgeX + 26, contactY + 45);

  // Signature Block on the right of the bottom white card
  const sigRightX = badgeX + badgeW - 122;
  drawCursiveSignature(doc, 'T. Vidhya sagar', sigRightX, cardBottomY + 12, 17, '#051326', 85);
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0A2540').text('T. Vidhya Sagar', sigRightX, cardBottomY + 38);
  doc.fontSize(6.5).font('Helvetica').fillColor('#64748B').text('Chief executive Officer', sigRightX, cardBottomY + 48);
  doc.text('Trade Nexus', sigRightX, cardBottomY + 57);

  // Bottom Notice Bar
  doc.rect(badgeX, cardBottomY + cardBottomH - 18, badgeW, 18).fill('#051326');
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#00C9A7').text(
    'AUTHORISED CORPORATE PERSONNEL  •  IDENTITY VERIFIED',
    badgeX,
    cardBottomY + cardBottomH - 13,
    { align: 'center', width: badgeW }
  );

  doc.restore();

  // Bottom text below card
  doc.fontSize(7.5).font('Helvetica').fillColor('#94A3B8').text(
    'If found, please return to: Trade Nexus HQ, 123 Business Avenue, Financial District, Telangana 500001.',
    0,
    badgeY + badgeH + 24,
    { align: 'center' }
  );

  doc.end();
  return bufferPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. OFFICIAL PAYSLIP PDF GENERATOR (Exact match for PayslipDetailModal.tsx / 4.png)
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

  // ── Top Header Banner ──
  const bannerH = 75;
  doc.rect(0, 0, pageWidth, bannerH).fill('#06152B');

  // Teal Stripes
  doc.rect(0, bannerH - 4, pageWidth, 4).fill('#00A88B');
  doc.rect(0, bannerH - 1.5, pageWidth * 0.6, 1.5).fill('#38E1B7');

  // Brand Name & Logo
  doc.circle(46, 36, 18).lineWidth(2).stroke('#00C9A7');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#00C9A7').text('TN', 38, 30);

  doc.fontSize(16).font('Helvetica-Bold').fillColor('#FFFFFF').text('TRADE NEXUS', 74, 26);
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#00C9A7').text('— TRADE SMART —', 75, 45);

  // Right Header
  doc.fontSize(15).font('Helvetica-Bold').fillColor('#FFFFFF').text('PAYROLL SLIP', 0, 28, {
    align: 'right',
    width: pageWidth - 42,
  });
  doc.rect(pageWidth - 165, 47, 123, 1.5).fill('#00C9A7');

  // ── Employee & Month Metadata Grid (2 Columns matching 4.png) ──
  const empName = employee.name || payslip.employeeName || 'Staff Member';
  const empCode = employee.empCode || payslip.empCode || payslip.employeeCode || 'TNX-001';
  const role = employee.role || employee.roleTitle || payslip.roleTitle || 'Digital Marketing Specialist';
  const dept = employee.group || employee.department || payslip.department || 'Marketing';
  const payDate = `31 ${payslip.month} ${payslip.year}`;

  const metaY = bannerH + 20;

  // Column 1
  const drawMetaItem = (label: string, val: string, xPos: number, yPos: number) => {
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(label, xPos, yPos);
    doc.text(':', xPos + 90, yPos);
    doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(val, xPos + 100, yPos);
  };

  drawMetaItem('Month', `${payslip.month} ${payslip.year}`, 42, metaY);
  drawMetaItem('Employee Name', empName, 42, metaY + 16);
  drawMetaItem('Employee ID', empCode, 42, metaY + 32);
  drawMetaItem('Department', dept, 42, metaY + 48);

  // Column 2
  drawMetaItem('Designation', role, 310, metaY);
  drawMetaItem('Employee Type', 'Full - Time', 310, metaY + 16);
  drawMetaItem('Pay Date', payDate, 310, metaY + 32);

  // Calculations
  const basic = Number(payslip.basicSalary || 30000);
  const hra = Number(payslip.hra || 5000);
  const transportation = Number(payslip.specialAllowance || 2000);
  const incentives = Number(payslip.incentives || 3000);
  const totalEarnings = basic + hra + transportation + incentives;

  const tax = Number(payslip.taxDeduction || 3000);
  const insurance = Number(payslip.pfDeduction || 500);
  const pension = 200;
  const totalDeductions = tax + insurance + pension;
  const netPay = totalEarnings - totalDeductions;

  // ── EARNINGS TABLE (Exact match for PayslipDetailModal.tsx) ──
  const table1Y = metaY + 74;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#0A2540').text('EARNINGS', 42, table1Y);

  const tW = pageWidth - 84;
  const col1W = tW - 120;
  let rowY = table1Y + 14;

  // Header
  doc.rect(42, rowY, tW, 20).fill('#06152B');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF').text('DESCRIPTION', 52, rowY + 5);
  doc.text('AMOUNT (INR)', 42 + col1W, rowY + 5, { width: 110, align: 'right' });
  rowY += 20;

  const earnRows = [
    { desc: 'Basic Salary', amt: basic },
    { desc: 'Housing Allowance', amt: hra },
    { desc: 'Transportation', amt: transportation },
    { desc: 'Performance Bonus', amt: incentives },
  ];

  earnRows.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    doc.rect(42, rowY, tW, 18).fill(bg);
    doc.fontSize(8).font('Helvetica').fillColor('#334155').text(r.desc, 52, rowY + 5);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text(`INR ${r.amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 42 + col1W, rowY + 5, { width: 110, align: 'right' });
    rowY += 18;
  });

  // Total Earnings Row
  doc.rect(42, rowY, tW, 22).fill('#E6FAF6');
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('TOTAL EARNINGS', 52, rowY + 6);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#00A88B').text(`INR ${totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 42 + col1W, rowY + 5, { width: 110, align: 'right' });
  rowY += 22;

  // ── DEDUCTIONS TABLE (Exact match for PayslipDetailModal.tsx) ──
  const table2Y = rowY + 16;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#0A2540').text('DEDUCTIONS', 42, table2Y);

  rowY = table2Y + 14;
  doc.rect(42, rowY, tW, 20).fill('#06152B');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF').text('DESCRIPTION', 52, rowY + 5);
  doc.text('AMOUNT (INR)', 42 + col1W, rowY + 5, { width: 110, align: 'right' });
  rowY += 20;

  const dedRows = [
    { desc: 'Tax (Federal + State)', amt: tax },
    { desc: 'Health Insurance', amt: insurance },
    { desc: 'Pension Contribution', amt: pension },
  ];

  dedRows.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    doc.rect(42, rowY, tW, 18).fill(bg);
    doc.fontSize(8).font('Helvetica').fillColor('#334155').text(r.desc, 52, rowY + 5);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text(`INR ${r.amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 42 + col1W, rowY + 5, { width: 110, align: 'right' });
    rowY += 18;
  });

  // Total Deductions Row
  doc.rect(42, rowY, tW, 22).fill('#E6FAF6');
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('TOTAL DEDUCTIONS', 52, rowY + 6);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#DC2626').text(`INR ${totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 42 + col1W, rowY + 5, { width: 110, align: 'right' });
  rowY += 22;

  // ── Bottom Summary & Authorized Signatory Block (Matching 4.png) ──
  const sumY = rowY + 22;

  // Left Details
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0A2540').text('NET PAY', 42, sumY);
  doc.text(':', 130, sumY);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#00A88B').text(`INR ${netPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 140, sumY - 1);

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Bank Account', 42, sumY + 18);
  doc.text(':', 130, sumY + 18);
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text('123 4567 890', 140, sumY + 18);

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Payment Mode', 42, sumY + 34);
  doc.text(':', 130, sumY + 34);
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text('Bank Transfer', 140, sumY + 34);

  // Right Signatory
  doc.fontSize(8).font('Helvetica').fillColor('#64748B').text('Authorized by:', 360, sumY);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Finance Manager – Trade Nexus', 360, sumY + 12);
  drawCursiveSignature(doc, 'Muhammad Patel', 360, sumY + 24, 20, '#0A2540', 110);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text('Muhammad Patel', 360, sumY + 50);

  // ── Bottom Navy Footer Bar ──
  const footerH = 34;
  const footerY = pageHeight - footerH;
  doc.rect(0, footerY, pageWidth, footerH).fill('#06152B');
  doc.rect(0, footerY, pageWidth, 2).fill('#00A88B');

  doc.fontSize(8).font('Helvetica').fillColor('#CBD5E1').text(
    '+91 98765 43210   |   info@tradenexus.com   |   www.tradenexus.com',
    0,
    footerY + 12,
    { align: 'center', width: pageWidth }
  );

  doc.end();
  return bufferPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. OFFICIAL RELIEVING LETTER PDF GENERATOR (Exact match for RelievingLetterModal.tsx / 3.png)
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

  // ── Top Header Banner ──
  const bannerH = 75;
  doc.rect(0, 0, pageWidth, bannerH).fill('#06152B');

  // Teal Stripes
  doc.rect(0, bannerH - 4, pageWidth, 4).fill('#00A88B');
  doc.rect(0, bannerH - 1.5, pageWidth * 0.6, 1.5).fill('#38E1B7');

  // Brand Name & Logo
  doc.circle(46, 36, 18).lineWidth(2).stroke('#00C9A7');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#00C9A7').text('TN', 38, 30);

  doc.fontSize(16).font('Helvetica-Bold').fillColor('#FFFFFF').text('TRADE NEXUS', 74, 26);
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#00C9A7').text('— TRADE SMART —', 75, 45);

  // Right Header Title
  doc.fontSize(15).font('Helvetica-Bold').fillColor('#FFFFFF').text('RELIEVING LETTER', 0, 28, {
    align: 'right',
    width: pageWidth - 42,
  });
  doc.rect(pageWidth - 195, 47, 153, 1.5).fill('#00C9A7');

  // ── Centered Title matching 3.png ──
  const titleY = bannerH + 24;
  doc.fontSize(15).font('Helvetica-Bold').fillColor('#0A2540').text('Relieving Letter Format For Employee', 0, titleY, {
    align: 'center',
    width: pageWidth,
  });
  doc.moveTo(42, titleY + 22).lineTo(pageWidth - 42, titleY + 22).lineWidth(0.5).strokeColor('#E2E8F0').stroke();

  // ── Date ──
  const issuedDate = relievingLetter.issuedDate || new Date().toLocaleDateString('en-GB');
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0A2540').text(`[${issuedDate}]`, 42, titleY + 34);

  // ── Recipient Details Block ──
  const empName = employee.name || relievingLetter.employeeName || 'Employee';
  const role = employee.role || employee.roleTitle || relievingLetter.designation || relievingLetter.roleTitle || 'Executive';
  const dept = employee.group || relievingLetter.department || 'Client Acquisition Department';
  const empCode = employee.empCode || relievingLetter.empCode || 'TNX-042';
  const empType = relievingLetter.employeeType || 'Full-Time';
  const empAddress = relievingLetter.employeeAddress || '123 Business Avenue, Financial District, Your City, 500001';

  const toY = titleY + 54;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#0A2540').text(`[${empName}]`, 42, toY);
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(`[${role}]`, 42, toY + 14);
  doc.text(`[${dept}]`, 42, toY + 26);
  doc.text(`[${empType}]`, 42, toY + 38);
  doc.text(`[Employee ID: ${empCode}]`, 42, toY + 50);
  doc.text(`[${empAddress}]`, 42, toY + 62);

  // ── Salutation & Paragraphs (Exact copy from RelievingLetterModal.tsx / 3.png) ──
  const firstName = empName.trim().split(' ')[0] || empName;
  const salutationY = toY + 84;
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0A2540').text(`Dear [${firstName}],`, 42, salutationY);

  const resDate = relievingLetter.resignationDate || '15 July 2025';
  const lastWorkingDate = relievingLetter.lastWorkingDate || relievingLetter.lastWorkingDay || '31 August 2025';
  const joiningDate = employee.joiningDate || relievingLetter.joiningDate || '12 January 2024';

  const p1Y = salutationY + 18;
  doc.fontSize(9).font('Helvetica').fillColor('#334155').lineGap(4).text(
    `This is to formally inform you that your resignation dated [${resDate}] has been accepted, and your last working day with [Trade Nexus] was [${lastWorkingDate}].`,
    42,
    p1Y,
    { width: pageWidth - 84, align: 'justify' }
  );

  const p2Y = doc.y + 12;
  doc.fontSize(9).font('Helvetica').fillColor('#334155').lineGap(4).text(
    `We would like to confirm that you have been relieved from your duties as [${role}] in [${dept}]. We thank you for the dedication, effort, and contributions you have made during your tenure with us, from [${joiningDate}] to [${lastWorkingDate}].`,
    42,
    p2Y,
    { width: pageWidth - 84, align: 'justify' }
  );

  // ── Official Stamp & Signatory Block (Matching 3.png) ──
  const stampY = doc.y + 36;
  const stampX = pageWidth - 160;

  // Stamp circle
  doc.circle(stampX + 35, stampY + 32, 28).lineWidth(1.5).dash(3, { space: 3 }).strokeColor('#0A2540').stroke();
  doc.undash();
  doc.fontSize(5.5).font('Helvetica-Bold').fillColor('#0A2540').text('TRADE NEXUS', stampX + 14, stampY + 18);
  doc.fontSize(5).font('Helvetica-Bold').fillColor('#00A88B').text('TRADE SMART', stampX + 15, stampY + 40);

  // Script signature overlaid across stamp
  drawCursiveSignature(doc, 'T. Vidhya sagar', stampX - 2, stampY + 20, 20, '#0A2540', 80);

  const signatory = relievingLetter.signatoryName || 'T .Vidhya Sagar';
  const sigRole = relievingLetter.signatoryRole || 'Chief Executive Officer';

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0A2540').text(signatory, stampX - 20, stampY + 68, { width: 110, align: 'center' });
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(sigRole, stampX - 20, stampY + 80, { width: 110, align: 'center' });
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0A2540').text('Authorized Signatory', stampX - 20, stampY + 92, { width: 110, align: 'center' });

  // ── Bottom Navy Footer Bar ──
  const footerH = 34;
  const footerY = pageHeight - footerH;
  doc.rect(0, footerY, pageWidth, footerH).fill('#06152B');
  doc.rect(0, footerY, pageWidth, 2).fill('#00A88B');

  doc.fontSize(8).font('Helvetica').fillColor('#CBD5E1').text(
    '+91 98765 43210   |   info@tradenexus.com   |   www.tradenexus.com',
    0,
    footerY + 12,
    { align: 'center', width: pageWidth }
  );

  doc.end();
  return bufferPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. OFFICIAL EXPERIENCE CERTIFICATE PDF GENERATOR (Exact match for ExperienceCertModal.tsx / 2.png)
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

  // ── Top Header Banner ──
  const bannerH = 75;
  doc.rect(0, 0, pageWidth, bannerH).fill('#06152B');

  // Teal Stripes
  doc.rect(0, bannerH - 4, pageWidth, 4).fill('#00A88B');
  doc.rect(0, bannerH - 1.5, pageWidth * 0.6, 1.5).fill('#38E1B7');

  // Brand Name & Logo
  doc.circle(46, 36, 18).lineWidth(2).stroke('#00C9A7');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#00C9A7').text('TN', 38, 30);

  doc.fontSize(16).font('Helvetica-Bold').fillColor('#FFFFFF').text('TRADE NEXUS', 74, 26);
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#00C9A7').text('— TRADE SMART —', 75, 45);

  // Right Header Title
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#FFFFFF').text('EXPERIENCE CERTIFICATE', 0, 28, {
    align: 'right',
    width: pageWidth - 42,
  });
  doc.rect(pageWidth - 235, 47, 193, 1.5).fill('#00C9A7');

  // ── Date & Ref line (Matching 2.png) ──
  const startY = bannerH + 24;
  const dateStr = cert.issuedDate || new Date().toLocaleDateString('en-GB');
  const ref = cert.refNumber || `TNX/EXP/${new Date().getFullYear()}/${employee.empCode || '001'}`;

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0A2540').text(`Date: ${dateStr}`, 42, startY);
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0A2540').text(`Ref: ${ref}`, 0, startY, {
    align: 'right',
    width: pageWidth - 42,
  });

  // ── Centered Heading: To Whom It May Concern (Matching 2.png) ──
  const toWhomY = startY + 36;
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#0A2540').text('To Whom It May Concern', 0, toWhomY, {
    align: 'center',
    width: pageWidth,
  });
  doc.rect((pageWidth - 160) / 2, toWhomY + 22, 160, 1.5).fill('#00A88B');

  // ── Main Certificate Paragraphs (Exact copy from ExperienceCertModal.tsx / 2.png) ──
  const empName = employee.name || cert.candidateName || cert.employeeName || 'Staff Member';
  const guardian = cert.guardianName ? `, son/daughter of ${cert.guardianName},` : '';
  const role = employee.role || employee.roleTitle || cert.roleTitle || cert.designation || 'Executive';
  const startDate = employee.joiningDate || cert.startDate || cert.joiningDate || '01-01-2023';
  const endDate = cert.endDate || cert.lastWorkingDay || '03-01-2025';

  const bodyY = toWhomY + 44;

  // Paragraph 1
  doc.fontSize(9.5).font('Helvetica').fillColor('#334155').lineGap(4.5).text(
    `This letter serves to confirm that Mr. / Ms. ${empName}${guardian} was employed as a ${role} at Trade Nexus, a renowned organization in corporate finance & trading services, from ${startDate} to ${endDate}.`,
    42,
    bodyY,
    { width: pageWidth - 84, align: 'justify' }
  );

  // Paragraph 2
  const p2Y = doc.y + 14;
  doc.fontSize(9.5).font('Helvetica').fillColor('#334155').lineGap(4.5).text(
    `During their tenure, Mr./Ms. ${empName} performed duties with sincerity, professionalism, and dedication. They were responsible for supervising client operations, ensuring high standards of service, coordinating with staff, and maintaining smooth day-to-day operations. Their conduct and performance were satisfactory throughout their period of employment.`,
    42,
    p2Y,
    { width: pageWidth - 84, align: 'justify' }
  );

  // Paragraph 3
  const p3Y = doc.y + 14;
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0A2540').text(
    `We wish them all the best in their future endeavours.`,
    42,
    p3Y
  );

  // ── Sign-off matching 2.png ──
  const sigY = p3Y + 44;
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text('Sincerely,', 42, sigY);
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0A2540').text('For: Trade Nexus', 42, sigY + 12);

  // Script signature
  drawCursiveSignature(doc, 'T. Vidhya sagar', 42, sigY + 26, 24, '#0A2540', 120);

  const signatory = cert.signatoryName || 'T .Vidhya Sagar';
  const sigRole = cert.signatoryRole || 'Chief Executive Officer';

  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0A2540').text(signatory, 42, sigY + 58);
  doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(sigRole, 42, sigY + 70);

  // ── Bottom Navy Footer Bar ──
  const footerH = 34;
  const footerY = pageHeight - footerH;
  doc.rect(0, footerY, pageWidth, footerH).fill('#06152B');
  doc.rect(0, footerY, pageWidth, 2).fill('#00A88B');

  doc.fontSize(8).font('Helvetica').fillColor('#CBD5E1').text(
    '+91 98765 43210   |   info@tradenexus.com   |   www.tradenexus.com',
    0,
    footerY + 12,
    { align: 'center', width: pageWidth }
  );

  doc.end();
  return bufferPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. OFFICIAL CUSTOMER TAX INVOICE PDF GENERATOR (Exact match for InvoiceModal.tsx / 5.png)
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

  // ── Top Geometric Header Banner (matching 5.png) ──
  const bannerH = 100;
  doc.rect(0, 0, pageWidth, bannerH).fill('#06152B');

  // Decorative right accent polygon
  doc.save();
  doc.polygon([pageWidth * 0.65, 0], [pageWidth, 0], [pageWidth, bannerH], [pageWidth * 0.55, bannerH])
     .fillOpacity(0.15)
     .fill('#00C9A7');
  doc.restore();

  // Bottom teal accent line
  doc.rect(0, bannerH - 3, pageWidth, 3).fill('#00C9A7');

  // Left Brand & Address
  doc.circle(46, 32, 16).lineWidth(2).stroke('#00C9A7');
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#00C9A7').text('TN', 39, 27);

  doc.fontSize(16).font('Helvetica-Bold').fillColor('#FFFFFF').text('TRADE NEXUS', 72, 22);
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#00C9A7').text('THE ONLY SMART WAY TO TRADE', 73, 40);

  doc.fontSize(7).font('Helvetica').fillColor('#CBD5E1').lineGap(2).text(
    'Trade Nexus Financial Technologies Pvt. Ltd.\nLevel 12, Nexus Cyber Tower, HITEC City, Hyderabad - 500081',
    42,
    58,
    { width: 280 }
  );

  // Right: INVOICE title and badge
  doc.fontSize(24).font('Helvetica-Bold').fillColor('#FFFFFF').text('INVOICE', 0, 18, {
    align: 'right',
    width: pageWidth - 42,
  });

  doc.roundedRect(pageWidth - 110, 48, 68, 16, 4).fillAndStroke('#0A2540', '#00C9A7');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#00C9A7').text(`#${invoice.invoiceNumber}`, pageWidth - 110, 52, {
    align: 'center',
    width: 68,
  });

  const invDate = invoice.date || new Date().toLocaleDateString('en-GB');
  const dueDate = invoice.dueDate || '10 July 2025';
  const status = (invoice.status || 'PAID').toUpperCase();

  doc.fontSize(7.5).font('Helvetica').fillColor('#94A3B8').text(`Date: ${invDate}  •  Due: ${dueDate}  •  Status: `, 0, 72, {
    align: 'right',
    width: pageWidth - 42,
    continued: true,
  });
  doc.font('Helvetica-Bold').fillColor('#00C9A7').text(status);

  // ── Two Column Details Card (Client Details & Payment Info) ──
  const cardY = bannerH + 16;
  const colW = (pageWidth - 94) / 2;

  // Left: INVOICE TO (CLIENT)
  doc.roundedRect(42, cardY, colW, 76, 6).fillAndStroke('#F8FAFC', '#E2E8F0');
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#00A88B').text('INVOICE TO (CLIENT)', 52, cardY + 8);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0A2540').text(invoice.clientName, 52, cardY + 22);
  doc.fontSize(8).font('Helvetica').fillColor('#475569').text(invoice.clientCompany || 'Corporate Client', 52, cardY + 34);
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(invoice.clientAddress || 'Client Corporate Address', 52, cardY + 46, { width: colW - 20 });
  doc.text(`${invoice.clientEmail || 'client@email.com'} • ${invoice.clientPhone || 'N/A'}`, 52, cardY + 58);

  // Right: PAYMENT & TAX DETAILS
  const rightCardX = 42 + colW + 10;
  doc.roundedRect(rightCardX, cardY, colW, 76, 6).fillAndStroke('#F8FAFC', '#E2E8F0');
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0A2540').text('PAYMENT & TAX DETAILS', rightCardX + 10, cardY + 8);

  const drawPaymentRow = (l: string, v: string, yP: number) => {
    doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(l, rightCardX + 10, yP);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0A2540').text(v, rightCardX + colW - 90, yP, { width: 80, align: 'right' });
  };

  drawPaymentRow('Invoice Ref:', invoice.invoiceNumber, cardY + 22);
  drawPaymentRow('GSTIN:', '36AAACT9182N1Z8', cardY + 34);
  drawPaymentRow('Payment Term:', 'Net 15 Days', cardY + 46);
  drawPaymentRow('Currency:', 'INR (Rs)', cardY + 58);

  // ── Items Table ──
  let items = [];
  try {
    items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
  } catch {
    items = [];
  }
  if (!items || items.length === 0) {
    items = [{ description: 'Trading Desk Platform Services & Analytics', quantity: 1, unitPrice: 25000, total: 25000 }];
  }

  const tableY = cardY + 86;
  const tW = pageWidth - 84;

  doc.rect(42, tableY, tW, 20).fill('#06152B');
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#FFFFFF');
  doc.text('#', 50, tableY + 6);
  doc.text('ITEM DESCRIPTION', 75, tableY + 6);
  doc.text('QTY', 330, tableY + 6, { width: 35, align: 'center' });
  doc.text('UNIT PRICE', 375, tableY + 6, { width: 75, align: 'right' });
  doc.text('TOTAL', 460, tableY + 6, { width: 80, align: 'right' });

  let rowY = tableY + 20;
  items.forEach((item: any, idx: number) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    doc.rect(42, rowY, tW, 20).fill(bg);

    doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(String(idx + 1), 50, rowY + 6);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text(item.description || 'Enterprise Solution Service', 75, rowY + 6, { width: 250 });
    doc.fontSize(7.5).font('Helvetica').fillColor('#334155').text(String(item.quantity || 1), 330, rowY + 6, { width: 35, align: 'center' });
    doc.text(`INR ${Number(item.unitPrice || 0).toLocaleString('en-IN')}`, 375, rowY + 6, { width: 75, align: 'right' });
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0A2540').text(`INR ${Number(item.total || 0).toLocaleString('en-IN')}`, 460, rowY + 6, { width: 80, align: 'right' });

    rowY += 20;
  });

  // ── Bottom Summary & Banking info (Matching 5.png) ──
  const botY = rowY + 14;
  const halfW = (tW - 14) / 2;

  // Left: Payment Information & Terms
  doc.roundedRect(42, botY, halfW, 64, 6).fillAndStroke('#F8FAFC', '#E2E8F0');
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#06152B').text('PAYMENT INFORMATION', 52, botY + 8);
  doc.fontSize(7.5).font('Helvetica').fillColor('#475569')
    .text(`Bank Name: ${invoice.bankName || 'HDFC Bank'}`, 52, botY + 22)
    .text(`Account No: ${invoice.accountNumber || '50200084920194'}`, 52, botY + 34)
    .text(`IFSC / SWIFT: ${invoice.ifscCode || 'HDFC0001234'}`, 52, botY + 46);

  doc.roundedRect(42, botY + 70, halfW, 46, 6).fillAndStroke('#F0FDF4', '#86EFAC');
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#0A2540').text('Important Terms & Notes:', 52, botY + 76);
  doc.fontSize(6.5).font('Helvetica').fillColor('#334155').text(
    invoice.note || 'Payment is due within 15 days of invoice date. All payments subject to Trade Nexus enterprise services master agreement.',
    52,
    botY + 88,
    { width: halfW - 20 }
  );

  // Right: Calculations & Totals Callout
  const subTotal = Number(invoice.subTotal || 0);
  const taxRate = Number(invoice.taxRate !== undefined ? invoice.taxRate : 18);
  const taxAmount = Number(invoice.taxAmount || ((subTotal * taxRate) / 100));
  const grandTotal = Number(invoice.grandTotal || (subTotal + taxAmount));

  const rightBoxX = 42 + halfW + 14;
  doc.roundedRect(rightBoxX, botY, halfW, 70, 6).fillAndStroke('#FFFFFF', '#E2E8F0');

  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text('Subtotal:', rightBoxX + 12, botY + 10);
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0A2540').text(`INR ${subTotal.toLocaleString('en-IN')}`, rightBoxX + halfW - 90, botY + 10, { width: 78, align: 'right' });

  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(`GST (${taxRate}%):`, rightBoxX + 12, botY + 24);
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0A2540').text(`INR ${taxAmount.toLocaleString('en-IN')}`, rightBoxX + halfW - 90, botY + 24, { width: 78, align: 'right' });

  // TOTAL DUE callout box
  doc.roundedRect(rightBoxX + 8, botY + 38, halfW - 16, 26, 4).fill('#06152B');
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#FFFFFF').text('TOTAL DUE', rightBoxX + 16, botY + 46);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#00C9A7').text(`INR ${grandTotal.toLocaleString('en-IN')}`, rightBoxX + halfW - 120, botY + 45, { width: 104, align: 'right' });

  // Signatory & Thank You
  const signY = botY + 76;
  doc.fontSize(13).font('Times-Italic').fillColor('#94A3B8').text('Thank You!', rightBoxX + 10, signY + 6);
  doc.fontSize(6.5).font('Helvetica').fillColor('#94A3B8').text('We appreciate your business', rightBoxX + 10, signY + 24);

  // Script signature
  drawCursiveSignature(doc, 'Samira Hadid', rightBoxX + halfW - 100, signY + 2, 20, '#0A2540', 90);
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0A2540').text('Samira Hadid', rightBoxX + halfW - 100, signY + 26);
  doc.fontSize(6.5).font('Helvetica').fillColor('#64748B').text('Head of Finance & Accounts', rightBoxX + halfW - 100, signY + 36);

  // ── Bottom Navy Footer Bar ──
  const footerH = 34;
  const footerY = pageHeight - footerH;
  doc.rect(0, footerY, pageWidth, footerH).fill('#06152B');
  doc.rect(0, footerY, pageWidth, 2).fill('#00A88B');

  doc.fontSize(7.5).font('Helvetica').fillColor('#CBD5E1').text(
    'Level 12, Nexus Cyber Tower, HITEC City, Hyderabad   |   +91 40 4829 1000   |   billing@tradenexus.live',
    0,
    footerY + 12,
    { align: 'center', width: pageWidth }
  );

  doc.end();
  return bufferPromise;
}
