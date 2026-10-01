import nodemailer from 'nodemailer';
import {
  generateOfferLetterPdf,
  generatePayslipPdf,
  generateIdCardPdf,
  generateRelievingLetterPdf,
  generateExperienceCertPdf,
  generateTaxInvoicePdf,
} from './pdfGenerator.js';

const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || 'sagarsuchi26@gmail.com';
  // Strip any accidental spaces from Google App Password
  const rawPass = process.env.SMTP_PASSWORD || 'nktlcdbvgltfzuod';
  const pass = rawPass.replace(/\s+/g, '');

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
};

export async function verifySmtpConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { success: true, message: 'SMTP Transporter connected and verified successfully.' };
  } catch (err: any) {
    console.error('[SMTP Error] Transporter verification failed:', err);
    return { success: false, message: err.message || 'SMTP connection failed' };
  }
}

// ── 1. Password Reset OTP Email Dispatcher ──
export async function sendPasswordResetOtpEmail(
  toEmail: string,
  otp: string,
  userName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const companyName = process.env.COMPANY_NAME || 'TRADE NEXUS';
  const fromAddress = process.env.SMTP_FROM || `"${companyName}" <sagarsuchi26@gmail.com>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${companyName} - Password Reset OTP</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 16px; color: #1e293b; }
        .card { width: 100%; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #07192C 0%, #0A2540 60%, #0D3155 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
        .logo-text { font-size: 22px; font-weight: 900; letter-spacing: 2px; color: #ffffff; margin: 0; }
        .sub-header { color: #00C9A7; font-size: 12px; font-weight: 700; letter-spacing: 1px; margin-top: 6px; text-transform: uppercase; }
        .content { padding: 28px 24px; }
        .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
        .description { font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 20px; }
        .otp-box { background: #f8fafc; border: 2px dashed #00C9A7; border-radius: 14px; padding: 18px; text-align: center; margin: 20px 0; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #0A2540; margin: 0; }
        .otp-caption { font-size: 11px; color: #64748b; font-weight: 600; margin-top: 6px; text-transform: uppercase; }
        .warning { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 8px; font-size: 12px; color: #92400e; margin-top: 20px; line-height: 1.5; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="logo-text">${companyName}</h1>
          <div class="sub-header">Security Verification Center</div>
        </div>
        <div class="content">
          <div class="greeting">Hello ${userName || 'User'},</div>
          <div class="description">
            We received a request to reset the password for your <strong>${companyName}</strong> portal account (${toEmail}).
            Use the 6-digit One-Time Password (OTP) below to authenticate and choose a new password.
          </div>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="otp-caption">One-Time Password (OTP)</div>
          </div>

          <div class="warning">
            ⚠️ <strong>Security Notice:</strong> This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved. Automated security notification.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `[${companyName}] Password Reset Verification Code: ${otp}`,
      text: `Your ${companyName} password reset verification code is: ${otp}. It is valid for 10 minutes.`,
      html: htmlContent,
    });

    console.log(`[SMTP] Verification OTP email dispatched to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[SMTP Error] Failed to send OTP email to ${toEmail}:`, err);
    return { success: false, error: err.message || 'Failed to dispatch email' };
  }
}

// ── 2. Official Customer Invoice Email Dispatcher (With PDF Attachment) ──
export async function sendCustomerInvoiceEmail(
  invoice: any
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const companyName = process.env.COMPANY_NAME || 'TRADE NEXUS TRADE SMART';
  const fromAddress = process.env.SMTP_FROM || `"${companyName} Billing" <sagarsuchi26@gmail.com>`;
  const toEmail = invoice.clientEmail?.trim();

  if (!toEmail) {
    return { success: false, error: 'Customer email address is required' };
  }

  let items = [];
  try {
    items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
  } catch {
    items = [];
  }

  // Generate Official PDF in Memory
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateTaxInvoicePdf(invoice);
  } catch (pdfErr) {
    console.warn('[PDF Generation Warning] Failed to generate invoice PDF buffer, continuing without attachment:', pdfErr);
  }

  const itemsRows = items.map((it: any, idx: number) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 6px; color: #64748b; font-size: 12px;">${idx + 1}</td>
      <td style="padding: 10px 6px; color: #0f172a; font-size: 12px; font-weight: 600;">${it.description || 'Enterprise Solution Service'}</td>
      <td style="padding: 10px 6px; text-align: center; color: #334155; font-size: 12px;">${it.quantity || 1}</td>
      <td style="padding: 10px 6px; text-align: right; color: #334155; font-size: 12px;">₹${Number(it.unitPrice || 0).toLocaleString('en-IN')}</td>
      <td style="padding: 10px 6px; text-align: right; color: #0f172a; font-size: 12px; font-weight: 700;">₹${Number(it.total || 0).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${companyName} - Commercial Tax Invoice #${invoice.invoiceNumber}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 16px; color: #1e293b; }
        .card { width: 100%; max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #07192C 0%, #0A2540 60%, #0D3155 100%); padding: 24px; color: #ffffff; }
        .title { font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #ffffff; margin: 0; }
        .subtitle { color: #00C9A7; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }
        .content { padding: 24px; }
        .attachment-banner { background: #E6FAF6; border: 1.5px solid #00C9A7; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        th { background-color: #f8fafc; color: #475569; font-size: 11px; text-transform: uppercase; padding: 8px 6px; text-align: left; }
        .totals-box { margin-top: 20px; float: right; width: 100%; max-width: 240px; font-size: 13px; }
        .total-row { display: flex; justify-content: space-between; padding: 4px 0; color: #475569; }
        .total-row.grand { border-top: 2px solid #0f172a; color: #0f172a; font-size: 15px; font-weight: 900; padding-top: 8px; margin-top: 6px; }
        .bank-details { clear: both; margin-top: 28px; background-color: #f8fafc; border-radius: 12px; padding: 14px 16px; border: 1px solid #e2e8f0; font-size: 12px; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div style="float: right; text-align: right;">
            <div style="font-size: 16px; font-weight: 800; color: #00C9A7;">INVOICE</div>
            <div style="font-size: 12px; font-family: monospace; color: #cbd5e1;">#${invoice.invoiceNumber}</div>
            <div style="font-size: 10px; color: #94a3b8;">${invoice.date || 'Today'}</div>
          </div>
          <h1 class="title">${companyName}</h1>
          <div class="subtitle">Commercial Billing &amp; Settlement</div>
        </div>

        <div class="content">
          <div class="attachment-banner">
            <strong style="color: #0A2540; font-size: 12.5px; display: block;">📥 Official Tax Invoice PDF Attached</strong>
            <span style="color: #00A88B; font-size: 11.5px; font-weight: 600;">You can download and save the official <strong>Trade_Nexus_Invoice_${invoice.invoiceNumber}.pdf</strong> directly from your email app on mobile, tablet, or desktop.</span>
          </div>

          <div style="margin-bottom: 16px;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b;">Billed To:</div>
            <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">${invoice.clientName}</div>
            ${invoice.clientCompany ? `<div style="font-size: 12px; color: #475569; font-weight: 600;">${invoice.clientCompany}</div>` : ''}
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${invoice.clientEmail} ${invoice.clientPhone ? `• ${invoice.clientPhone}` : ''}</div>
          </div>

          <div style="overflow-x: auto;">
            <table>
              <thead>
                <tr>
                  <th style="width: 25px;">#</th>
                  <th>Item Description</th>
                  <th style="text-align: center; width: 45px;">Qty</th>
                  <th style="text-align: right; width: 75px;">Rate</th>
                  <th style="text-align: right; width: 85px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>

          <div class="totals-box">
            <div class="total-row">
              <span>Subtotal:</span>
              <strong style="color: #0f172a;">₹${Number(invoice.subTotal || 0).toLocaleString('en-IN')}</strong>
            </div>
            ${invoice.taxRate ? `
              <div class="total-row">
                <span>GST (${invoice.taxRate}%):</span>
                <span>₹${Number(invoice.taxAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            ` : ''}
            <div class="total-row grand">
              <span>Total Due:</span>
              <span style="color: #00A88B;">₹${Number(invoice.grandTotal || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div class="bank-details">
            <div style="font-weight: 800; color: #0f172a; margin-bottom: 6px; text-transform: uppercase; font-size: 11px;">Remittance &amp; Wire Details:</div>
            <div><strong>Bank:</strong> ${invoice.bankName || 'HDFC Bank'}</div>
            <div><strong>Account Number:</strong> ${invoice.accountNumber || '50200084920194'}</div>
            <div><strong>IFSC Code:</strong> ${invoice.ifscCode || 'HDFC0001234'}</div>
            ${invoice.dueDate ? `<div style="margin-top: 6px; color: #b45309; font-weight: 600;">Payment Due Date: ${invoice.dueDate}</div>` : ''}
          </div>
        </div>

        <div class="footer">
          &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved. Download the attached PDF for official accounting records.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = getTransporter();
    const mailOptions: any = {
      from: fromAddress,
      to: toEmail,
      subject: `[${companyName}] Commercial Tax Invoice #${invoice.invoiceNumber} for ${invoice.clientName}`,
      text: `Hello ${invoice.clientName},\n\nPlease find attached your commercial invoice #${invoice.invoiceNumber} for ₹${Number(invoice.grandTotal || 0).toLocaleString('en-IN')}.\nDue Date: ${invoice.dueDate || 'Upon Receipt'}.\n\nPlease download the attached PDF for your records.\n\nThank you for choosing ${companyName}.`,
      html: htmlContent,
    };

    if (pdfBuffer) {
      mailOptions.attachments = [
        {
          filename: `Trade_Nexus_Invoice_${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Commercial Invoice #${invoice.invoiceNumber} dispatched to ${toEmail} with PDF attachment. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[SMTP Error] Failed to send invoice to ${toEmail}:`, err);
    return { success: false, error: err.message || 'Failed to dispatch invoice email' };
  }
}

// ── 3. Employee Onboarding Welcome & Document Dispatcher (With Offer Letter & ID Card PDFs) ──
export async function sendEmployeeOnboardingEmail(
  employee: any,
  offerLetter?: any
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const companyName = process.env.COMPANY_NAME || 'TRADE NEXUS TRADE SMART';
  const fromAddress = process.env.SMTP_FROM || `"${companyName} HR" <sagarsuchi26@gmail.com>`;
  const toEmail = employee.email?.trim();

  if (!toEmail) {
    return { success: false, error: 'Employee email address is required' };
  }

  const roleTitle = employee.roleTitle || employee.role || 'Executive';
  const empCode = employee.empCode || 'TNX-STAFF';
  const defaultPassword = employee.password || 'Trade@1234';

  // Generate Offer Letter PDF and ID Card PDF in memory
  const attachments: any[] = [];
  try {
    const offerPdf = await generateOfferLetterPdf({
      candidateName: employee.name,
      candidateEmail: toEmail,
      candidatePhone: employee.phone,
      candidateAddress: employee.address || offerLetter?.candidateAddress,
      roleTitle,
      annualCtc: offerLetter?.annualCtc,
      monthlyGross: offerLetter?.monthlyGross,
      joiningDate: offerLetter?.joiningDate || employee.joiningDate,
      reportingManager: offerLetter?.reportingManager,
      acceptanceDeadline: offerLetter?.acceptanceDeadline,
      signatoryName: offerLetter?.signatoryName,
      signatoryRole: offerLetter?.signatoryRole,
    });
    attachments.push({
      filename: `Trade_Nexus_Offer_Letter_${(employee.name || 'Candidate').replace(/\s+/g, '_')}.pdf`,
      content: offerPdf,
      contentType: 'application/pdf',
    });
  } catch (pdfErr) {
    console.warn('[PDF Warning] Failed to generate offer letter PDF attachment:', pdfErr);
  }

  try {
    const idCardPdf = await generateIdCardPdf(employee, {
      name: employee.name,
      role: roleTitle,
      empCode,
      phone: employee.phone,
      emergencyPhone: employee.emergencyPhone || employee.phone,
      bloodGroup: employee.bloodGroup || 'O+',
      dob: employee.dob,
      avatar: employee.avatar,
      employeeType: employee.employeeType || 'Full Time',
    });
    attachments.push({
      filename: `Trade_Nexus_ID_Card_${(employee.name || 'Staff').replace(/\s+/g, '_')}.pdf`,
      content: idCardPdf,
      contentType: 'application/pdf',
    });
  } catch (idErr) {
    console.warn('[PDF Warning] Failed to generate ID card PDF attachment:', idErr);
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${companyName} - Welcome & Onboarding Package</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 16px; color: #1e293b; }
        .card { width: 100%; max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #07192C 0%, #0A2540 60%, #0D3155 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
        .title { font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #ffffff; margin: 0; }
        .subtitle { color: #00C9A7; font-size: 12px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }
        .content { padding: 24px; font-size: 13.5px; line-height: 1.6; color: #475569; }
        .attachment-banner { background: #E6FAF6; border: 1.5px solid #00C9A7; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; }
        .credentials-box { background: #f8fafc; border: 2px dashed #00C9A7; border-radius: 14px; padding: 18px; margin: 20px 0; }
        .cred-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; }
        .cred-item:last-child { border-bottom: none; }
        .cred-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
        .cred-val { font-size: 12.5px; font-weight: 700; color: #0f172a; font-family: monospace; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="title">${companyName}</h1>
          <div class="subtitle">Official Welcome &amp; Onboarding Notification</div>
        </div>
        <div class="content">
          <h3 style="color: #0f172a; margin-top: 0; font-size: 16px;">Welcome to the Team, ${employee.name}!</h3>
          
          <div class="attachment-banner">
            <strong style="color: #0A2540; font-size: 13px; display: block;">📥 Official Onboarding PDF Attachments Included</strong>
            <span style="color: #00A88B; font-size: 12px; font-weight: 600;">
              Your <strong>Job Offer Letter PDF</strong> and <strong>Digital Employee ID Card PDF</strong> are attached below for instant download and mobile saving.
            </span>
          </div>

          <p>
            Congratulations on joining <strong>${companyName}</strong>. We are thrilled to welcome you as our 
            <strong>${roleTitle}</strong>.
          </p>

          <div class="credentials-box">
            <div style="font-weight: 800; color: #0A2540; font-size: 12px; margin-bottom: 10px; text-transform: uppercase;">
              Your Portal Login Credentials:
            </div>
            <div class="cred-item">
              <span class="cred-label">Employee Code:</span>
              <span class="cred-val">${empCode}</span>
            </div>
            <div class="cred-item">
              <span class="cred-label">Login Username / Email:</span>
              <span class="cred-val">${toEmail}</span>
            </div>
            <div class="cred-item">
              <span class="cred-label">Default Password:</span>
              <span class="cred-val">${defaultPassword}</span>
            </div>
            <div class="cred-item">
              <span class="cred-label">Designated Role:</span>
              <span class="cred-val">${roleTitle}</span>
            </div>
          </div>

          <p style="font-size: 12px; color: #64748b;">
            Please log in to your employee self-service portal to review your digital employee ID card, access daily desk assignments, and complete onboarding.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${companyName}. Confidential Corporate Human Resources Communication.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = getTransporter();
    const mailOptions: any = {
      from: fromAddress,
      to: toEmail,
      subject: `[${companyName}] Welcome & Onboarding Documentation for ${employee.name} (${empCode})`,
      text: `Welcome to ${companyName}, ${employee.name}!\n\nYour Employee Code is ${empCode}. Login at our staff portal using your email (${toEmail}) and default password (${defaultPassword}).\n\nYour Official Offer Letter and Employee ID Card PDFs are attached to this email.`,
      html: htmlContent,
    };

    if (attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Onboarding documentation with ${attachments.length} PDF attachments dispatched to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[SMTP Error] Failed to send onboarding email to ${toEmail}:`, err);
    return { success: false, error: err.message || 'Failed to dispatch onboarding email' };
  }
}

// ── 4. Monthly Payslip / Payroll Email Dispatcher (With PDF Attachment) ──
export async function sendEmployeePayslipEmail(
  employee: any,
  payslip: any
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const companyName = process.env.COMPANY_NAME || 'TRADE NEXUS TRADE SMART';
  const fromAddress = process.env.SMTP_FROM || `"${companyName} Payroll" <sagarsuchi26@gmail.com>`;
  const toEmail = employee.email?.trim();

  if (!toEmail) {
    return { success: false, error: 'Employee email address is required' };
  }

  // Generate Payslip PDF in memory
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generatePayslipPdf(employee, payslip);
  } catch (pdfErr) {
    console.warn('[PDF Warning] Failed to generate payslip PDF buffer:', pdfErr);
  }

  const basic = Number(payslip.basicSalary || 0);
  const hra = Number(payslip.hra || 0);
  const specialAllowance = Number(payslip.specialAllowance || 0);
  const pf = Number(payslip.pfDeduction || 0);
  const tax = Number(payslip.taxDeduction || 0);
  const grossEarnings = basic + hra + specialAllowance;
  const totalDeductions = pf + tax;
  const netPay = Number(payslip.netPay || (grossEarnings - totalDeductions));

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${companyName} - Salary Statement ${payslip.month} ${payslip.year}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 16px; color: #1e293b; }
        .card { width: 100%; max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #07192C 0%, #0A2540 60%, #0D3155 100%); padding: 24px; color: #ffffff; }
        .title { font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #ffffff; margin: 0; }
        .subtitle { color: #00C9A7; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }
        .content { padding: 24px; font-size: 13px; color: #475569; }
        .attachment-banner { background: #E6FAF6; border: 1.5px solid #00C9A7; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; }
        .net-box { background: linear-gradient(135deg, #06152B 0%, #0A2540 100%); color: #ffffff; border-radius: 12px; padding: 18px; text-align: center; margin-top: 20px; }
        .net-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #00C9A7; font-weight: 800; }
        .net-amount { font-size: 28px; font-weight: 900; color: #ffffff; margin-top: 4px; font-family: monospace; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div style="float: right; text-align: right;">
            <div style="font-size: 15px; font-weight: 800; color: #00C9A7;">PAYSLIP</div>
            <div style="font-size: 11px; color: #cbd5e1;">${payslip.month} ${payslip.year}</div>
          </div>
          <h1 class="title">${companyName}</h1>
          <div class="subtitle">Salary Statement &amp; Remittance Voucher</div>
        </div>

        <div class="content">
          <div class="attachment-banner">
            <strong style="color: #0A2540; font-size: 12.5px; display: block;">📥 Official Monthly Payslip PDF Attached</strong>
            <span style="color: #00A88B; font-size: 11.5px; font-weight: 600;">
              Download and save your official <strong>Trade_Nexus_Payslip_${payslip.month}_${payslip.year}.pdf</strong> directly from your email app.
            </span>
          </div>

          <div>
            <div style="font-size: 15px; font-weight: 800; color: #0f172a;">${employee.name || payslip.employeeName}</div>
            <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">
              Emp Code: <strong>${employee.empCode || payslip.empCode || 'TNX'}</strong> • Designation: <strong>${employee.role || payslip.roleTitle || 'Executive'}</strong>
            </div>
          </div>

          <div class="net-box">
            <div class="net-label">Net Salary Disbursed</div>
            <div class="net-amount">₹${netPay.toLocaleString('en-IN')}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">
              Bank: ${employee.bankName || 'HDFC Bank'} • A/C: ${employee.bankAccountNumber ? `••••${String(employee.bankAccountNumber).slice(-4)}` : 'Verified Account'}
            </div>
          </div>
        </div>

        <div class="footer">
          &copy; ${new Date().getFullYear()} ${companyName}. This is an authentic digitally generated payroll slip.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = getTransporter();
    const mailOptions: any = {
      from: fromAddress,
      to: toEmail,
      subject: `[${companyName}] Salary Payslip for ${payslip.month} ${payslip.year} - ${employee.name}`,
      text: `Hello ${employee.name},\n\nYour salary statement for ${payslip.month} ${payslip.year} has been processed.\nNet Salary: ₹${netPay.toLocaleString('en-IN')}.\n\nPlease download your attached official Payslip PDF for your records.\n\nThank you for your valuable contributions to ${companyName}.`,
      html: htmlContent,
    };

    if (pdfBuffer) {
      mailOptions.attachments = [
        {
          filename: `Trade_Nexus_Payslip_${payslip.month}_${payslip.year}_${(employee.name || 'Staff').replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Payslip email with PDF dispatched to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[SMTP Error] Failed to send payslip to ${toEmail}:`, err);
    return { success: false, error: err.message || 'Failed to dispatch payslip email' };
  }
}

// ── 5. Official Relieving Letter Email Dispatcher (With PDF Attachment) ──
export async function sendEmployeeRelievingLetterEmail(
  employee: any,
  relievingLetter: any
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const companyName = process.env.COMPANY_NAME || 'TRADE NEXUS TRADE SMART';
  const fromAddress = process.env.SMTP_FROM || `"${companyName} HR" <sagarsuchi26@gmail.com>`;
  const toEmail = employee.email?.trim();

  if (!toEmail) {
    return { success: false, error: 'Employee email address is required' };
  }

  // Generate Relieving Letter PDF in memory
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateRelievingLetterPdf(employee, relievingLetter);
  } catch (pdfErr) {
    console.warn('[PDF Warning] Failed to generate relieving letter PDF buffer:', pdfErr);
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${companyName} - Relieving Letter &amp; Formal Release</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 16px; color: #1e293b; }
        .card { width: 100%; max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #07192C 0%, #0A2540 60%, #0D3155 100%); padding: 24px; color: #ffffff; }
        .title { font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #ffffff; margin: 0; }
        .subtitle { color: #00C9A7; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }
        .content { padding: 24px; font-size: 13.5px; line-height: 1.6; color: #334155; }
        .attachment-banner { background: #E6FAF6; border: 1.5px solid #00C9A7; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; }
        .highlight-box { background: #f8fafc; border-left: 4px solid #00C9A7; padding: 14px 16px; border-radius: 0 10px 10px 0; margin: 18px 0; font-size: 13px; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="title">${companyName}</h1>
          <div class="subtitle">Official Relieving Certificate</div>
        </div>

        <div class="content">
          <div class="attachment-banner">
            <strong style="color: #0A2540; font-size: 12.5px; display: block;">📥 Official Relieving Letter PDF Attached</strong>
            <span style="color: #00A88B; font-size: 11.5px; font-weight: 600;">
              Your formal <strong>Relieving Letter PDF</strong> is attached to this email. You can download and save it on your mobile device or computer.
            </span>
          </div>

          <p>Dear ${employee.name || relievingLetter.employeeName},</p>

          <div class="highlight-box">
            This is to formally confirm that your resignation from <strong>${companyName}</strong> has been accepted, 
            and you are relieved from your duties and service with effect from the close of business hours on 
            <strong>${relievingLetter.lastWorkingDay || relievingLetter.lastWorkingDate || 'your exit date'}</strong>.
          </div>

          <p>
            All company assets, data handovers, and compliance clearances have been settled in full. 
            We thank you for your service and wish you the very best in all your future professional endeavors.
          </p>
        </div>

        <div class="footer">
          &copy; ${new Date().getFullYear()} ${companyName}. Formal Certificate of Release.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = getTransporter();
    const mailOptions: any = {
      from: fromAddress,
      to: toEmail,
      subject: `[${companyName}] Official Relieving Letter for ${employee.name}`,
      text: `Dear ${employee.name},\n\nPlease find attached your formal Relieving Certificate from ${companyName}.\nEffective Last Working Day: ${relievingLetter.lastWorkingDay || 'Exit Date'}.\n\nWe wish you all the best in your career.`,
      html: htmlContent,
    };

    if (pdfBuffer) {
      mailOptions.attachments = [
        {
          filename: `Trade_Nexus_Relieving_Letter_${(employee.name || 'Staff').replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Relieving letter email with PDF dispatched to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[SMTP Error] Failed to send relieving letter to ${toEmail}:`, err);
    return { success: false, error: err.message || 'Failed to dispatch relieving email' };
  }
}

// ── 6. Official Experience Certificate Email Dispatcher (With PDF Attachment) ──
export async function sendEmployeeExperienceCertEmail(
  employee: any,
  cert: any
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const companyName = process.env.COMPANY_NAME || 'TRADE NEXUS TRADE SMART';
  const fromAddress = process.env.SMTP_FROM || `"${companyName} HR" <sagarsuchi26@gmail.com>`;
  const toEmail = employee.email?.trim();

  if (!toEmail) {
    return { success: false, error: 'Employee email address is required' };
  }

  // Generate Experience Certificate PDF in memory
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateExperienceCertPdf(employee, cert);
  } catch (pdfErr) {
    console.warn('[PDF Warning] Failed to generate experience certificate PDF buffer:', pdfErr);
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${companyName} - Experience &amp; Service Verification Certificate</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 16px; color: #1e293b; }
        .card { width: 100%; max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #07192C 0%, #0A2540 60%, #0D3155 100%); padding: 24px; color: #ffffff; }
        .title { font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #ffffff; margin: 0; }
        .subtitle { color: #00C9A7; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }
        .content { padding: 24px; font-size: 13.5px; line-height: 1.6; color: #334155; }
        .attachment-banner { background: #E6FAF6; border: 1.5px solid #00C9A7; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; }
        .cert-box { background: #f8fafc; border: 2px solid #00C9A7; border-radius: 14px; padding: 16px; margin: 18px 0; text-align: center; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="title">${companyName}</h1>
          <div class="subtitle">Certificate of Experience &amp; Service Verification</div>
        </div>

        <div class="content">
          <div class="attachment-banner">
            <strong style="color: #0A2540; font-size: 12.5px; display: block;">📥 Official Experience Certificate PDF Attached</strong>
            <span style="color: #00A88B; font-size: 11.5px; font-weight: 600;">
              Your formal <strong>Experience Certificate PDF</strong> is attached to this email. You can download and save it directly from your email app.
            </span>
          </div>

          <p>
            This is to certify that <strong>${employee.name || cert.candidateName}</strong> (Emp Code: <strong>${employee.empCode || cert.empCode || 'TNX'}</strong>) 
            was an esteemed full-time employee with <strong>${companyName}</strong>, serving as 
            <strong>${employee.roleTitle || cert.roleTitle || 'Executive'}</strong> from 
            <strong>${employee.joiningDate || cert.joiningDate || 'Date of Joining'}</strong> to 
            <strong>${cert.lastWorkingDay || cert.issuedDate || 'Date of Exit'}</strong>.
          </p>

          <div class="cert-box">
            <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Official Employment Verification</div>
            <div style="font-size: 15px; font-weight: 900; color: #0A2540; margin-top: 4px;">VERIFIED &amp; CERTIFIED</div>
            <div style="font-size: 11px; color: #00A88B; font-weight: 700; margin-top: 2px;">Trade Nexus Corporate HR</div>
          </div>

          <p>
            We wish them continued success and distinction in all future endeavors.
          </p>
        </div>

        <div class="footer">
          &copy; ${new Date().getFullYear()} ${companyName}. Verified Digital Corporate Certificate.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = getTransporter();
    const mailOptions: any = {
      from: fromAddress,
      to: toEmail,
      subject: `[${companyName}] Official Experience Certificate for ${employee.name}`,
      text: `Dear ${employee.name},\n\nPlease find attached your official Certificate of Experience and Service Verification from ${companyName}.\n\nWe wish you all the best in your career.`,
      html: htmlContent,
    };

    if (pdfBuffer) {
      mailOptions.attachments = [
        {
          filename: `Trade_Nexus_Experience_Certificate_${(employee.name || 'Staff').replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Experience certificate email with PDF dispatched to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[SMTP Error] Failed to send experience cert to ${toEmail}:`, err);
    return { success: false, error: err.message || 'Failed to dispatch experience certificate email' };
  }
}

// ── 7. Official Employee ID Card Email Dispatcher (With PDF Badge Attachment) ──
export async function sendEmployeeIdCardEmail(
  employee: any,
  cardData?: any
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const companyName = process.env.COMPANY_NAME || 'TRADE NEXUS TRADE SMART';
  const fromAddress = process.env.SMTP_FROM || `"${companyName} Security" <sagarsuchi26@gmail.com>`;
  const toEmail = employee.email?.trim() || cardData?.email?.trim();

  if (!toEmail) {
    return { success: false, error: 'Employee email address is required' };
  }

  // Generate ID Card PDF
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateIdCardPdf(employee, cardData);
  } catch (pdfErr) {
    console.warn('[PDF Warning] Failed to generate ID card PDF buffer:', pdfErr);
  }

  const empName = cardData?.name || employee.name || 'Staff Member';
  const empCode = cardData?.empCode || employee.empCode || 'TNX-STAFF';
  const role = cardData?.role || employee.role || employee.roleTitle || 'Executive';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${companyName} - Official Employee Identity Card</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 16px; color: #1e293b; }
        .card { width: 100%; max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #07192C 0%, #0A2540 60%, #0D3155 100%); padding: 24px; text-align: center; color: #ffffff; }
        .title { font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #ffffff; margin: 0; }
        .subtitle { color: #00C9A7; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }
        .content { padding: 24px; font-size: 13.5px; line-height: 1.6; color: #334155; }
        .attachment-banner { background: #E6FAF6; border: 1.5px solid #00C9A7; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; }
        .badge-preview { background: #06152B; border-radius: 14px; padding: 18px; text-align: center; color: #ffffff; margin: 18px 0; border: 1px solid #00C9A7; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="title">${companyName}</h1>
          <div class="subtitle">Official Employee Identity Badge</div>
        </div>

        <div class="content">
          <div class="attachment-banner">
            <strong style="color: #0A2540; font-size: 12.5px; display: block;">📥 Official Employee ID Badge PDF Attached</strong>
            <span style="color: #00A88B; font-size: 11.5px; font-weight: 600;">
              Your high-resolution, printable <strong>Trade_Nexus_ID_Card_${empName.replace(/\s+/g, '_')}.pdf</strong> is attached to this email.
            </span>
          </div>

          <div class="badge-preview">
            <div style="font-size: 11px; color: #00C9A7; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Verified Personnel Badge</div>
            <div style="font-size: 18px; font-weight: 900; color: #ffffff; margin-top: 6px;">${empName}</div>
            <div style="font-size: 12px; color: #cbd5e1; margin-top: 2px;">${role}</div>
            <div style="font-size: 11px; color: #00C9A7; margin-top: 4px; font-weight: 700;">EMP ID: ${empCode}</div>
          </div>

          <p style="font-size: 12px; color: #64748b;">
            This digital ID badge is authorized for official corporate facility access, client representation, and security verification. You can save the attached PDF on your phone or print it for standard lanyard badge pouches.
          </p>
        </div>

        <div class="footer">
          &copy; ${new Date().getFullYear()} ${companyName}. Corporate Security &amp; Identity Administration.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = getTransporter();
    const mailOptions: any = {
      from: fromAddress,
      to: toEmail,
      subject: `[${companyName}] Official Employee Identity Card Badge - ${empName} (${empCode})`,
      text: `Hello ${empName},\n\nPlease find attached your official Trade Nexus Employee ID Card Badge PDF (Emp Code: ${empCode}).\n\nYou can download and save this on your mobile device or print it for facility access.\n\nTrade Nexus Corporate Security`,
      html: htmlContent,
    };

    if (pdfBuffer) {
      mailOptions.attachments = [
        {
          filename: `Trade_Nexus_ID_Card_${empName.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP] ID Card email with PDF dispatched to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[SMTP Error] Failed to send ID card to ${toEmail}:`, err);
    return { success: false, error: err.message || 'Failed to dispatch ID card email' };
  }
}
