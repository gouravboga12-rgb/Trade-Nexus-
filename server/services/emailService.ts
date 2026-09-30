import nodemailer from 'nodemailer';

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
    }
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
      <title>${companyName} - Password Reset OTP</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #07192C 0%, #0A2540 60%, #0D3155 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
        .logo-text { font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #ffffff; margin: 0; }
        .sub-header { color: #00C9A7; font-size: 13px; font-weight: 700; letter-spacing: 1px; margin-top: 6px; text-transform: uppercase; }
        .content { padding: 36px 32px; }
        .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
        .description { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 24px; }
        .otp-box { background: #f8fafc; border: 2px dashed #00C9A7; border-radius: 16px; padding: 20px; text-align: center; margin: 28px 0; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #0A2540; margin: 0; }
        .otp-caption { font-size: 12px; color: #64748b; font-weight: 600; margin-top: 8px; text-transform: uppercase; }
        .warning { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #92400e; margin-top: 20px; line-height: 1.5; }
        .footer { background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
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
            ⚠️ <strong>Security Notice:</strong> This code is valid for <strong>10 minutes</strong>. Never share this code with anyone. ${companyName} officials will never ask for your OTP.
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

// ── 2. Official Customer Invoice Email Dispatcher ──
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

  const itemsRows = items.map((it: any, idx: number) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px 8px; color: #64748b; font-size: 12px;">${idx + 1}</td>
      <td style="padding: 12px 8px; color: #0f172a; font-size: 13px; font-weight: 600;">${it.description || 'Enterprise Solution Service'}</td>
      <td style="padding: 12px 8px; text-align: center; color: #334155; font-size: 13px;">${it.quantity || 1}</td>
      <td style="padding: 12px 8px; text-align: right; color: #334155; font-size: 13px;">₹${Number(it.unitPrice || 0).toLocaleString('en-IN')}</td>
      <td style="padding: 12px 8px; text-align: right; color: #0f172a; font-size: 13px; font-weight: 700;">₹${Number(it.total || 0).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${companyName} - Commercial Tax Invoice #${invoice.invoiceNumber}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #07192C 0%, #0A2540 60%, #0D3155 100%); padding: 32px; color: #ffffff; }
        .title { font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #ffffff; margin: 0; }
        .subtitle { color: #00C9A7; font-size: 12px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px; }
        .content { padding: 32px; }
        .bill-info { display: flex; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; }
        .info-col { font-size: 12px; color: #475569; line-height: 1.6; }
        .info-col strong { color: #0f172a; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background-color: #f8fafc; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 8px; text-align: left; }
        .totals-box { margin-top: 24px; float: right; width: 260px; font-size: 13px; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; color: #475569; }
        .total-row.grand { border-top: 2px solid #0f172a; color: #0f172a; font-size: 16px; font-weight: 900; padding-top: 10px; margin-top: 6px; }
        .bank-details { clear: both; margin-top: 36px; background-color: #f8fafc; border-radius: 12px; padding: 16px 20px; border: 1px solid #e2e8f0; font-size: 12px; }
        .footer { background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div style="float: right; text-align: right;">
            <div style="font-size: 18px; font-weight: 800; color: #00C9A7;">INVOICE</div>
            <div style="font-size: 12px; font-family: monospace; color: #cbd5e1; margin-top: 2px;">#${invoice.invoiceNumber}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Date: ${invoice.date || 'Today'}</div>
          </div>
          <h1 class="title">${companyName}</h1>
          <div class="subtitle">Commercial Billing &amp; Settlement</div>
        </div>

        <div class="content">
          <div style="margin-bottom: 20px;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b; letter-spacing: 1px;">Billed To:</div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px;">${invoice.clientName}</div>
            ${invoice.clientCompany ? `<div style="font-size: 13px; color: #475569; font-weight: 600;">${invoice.clientCompany}</div>` : ''}
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${invoice.clientEmail} ${invoice.clientPhone ? `• ${invoice.clientPhone}` : ''}</div>
            ${invoice.clientAddress ? `<div style="font-size: 12px; color: #64748b;">${invoice.clientAddress}</div>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Item &amp; Description</th>
                <th style="text-align: center; width: 60px;">Qty</th>
                <th style="text-align: right; width: 90px;">Rate</th>
                <th style="text-align: right; width: 100px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

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
            <div style="font-weight: 800; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Remittance &amp; Wire Details:</div>
            <div><strong>Bank:</strong> ${invoice.bankName || 'HDFC Bank'}</div>
            <div><strong>Account Number:</strong> ${invoice.accountNumber || '50200084920194'}</div>
            <div><strong>IFSC Code:</strong> ${invoice.ifscCode || 'HDFC0001234'}</div>
            ${invoice.paymentEmail ? `<div><strong>Billing Inquiry:</strong> ${invoice.paymentEmail}</div>` : ''}
            ${invoice.dueDate ? `<div style="margin-top: 8px; color: #b45309; font-weight: 600;">Payment Due Date: ${invoice.dueDate}</div>` : ''}
          </div>

          ${invoice.note ? `
            <div style="margin-top: 20px; font-size: 11px; color: #64748b; font-style: italic;">
              Note: ${invoice.note}
            </div>
          ` : ''}
        </div>

        <div class="footer">
          &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved. This is an authentic computer generated electronic invoice.
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
      subject: `[${companyName}] Commercial Tax Invoice #${invoice.invoiceNumber} for ${invoice.clientName}`,
      text: `Hello ${invoice.clientName},\n\nPlease find your commercial invoice #${invoice.invoiceNumber} for ₹${Number(invoice.grandTotal || 0).toLocaleString('en-IN')}.\nDue Date: ${invoice.dueDate || 'Upon Receipt'}.\n\nThank you for choosing ${companyName}.`,
      html: htmlContent,
    });
    console.log(`[SMTP] Commercial Invoice #${invoice.invoiceNumber} dispatched to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[SMTP Error] Failed to send invoice to ${toEmail}:`, err);
    return { success: false, error: err.message || 'Failed to dispatch invoice email' };
  }
}

// ── 3. Employee Onboarding Welcome & Document Dispatcher ──
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

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${companyName} - Welcome & Onboarding Package</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #07192C 0%, #0A2540 60%, #0D3155 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
        .title { font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #ffffff; margin: 0; }
        .subtitle { color: #00C9A7; font-size: 13px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 6px; }
        .content { padding: 36px 32px; font-size: 14px; line-height: 1.6; color: #475569; }
        .credentials-box { background: #f8fafc; border: 2px dashed #00C9A7; border-radius: 16px; padding: 20px; margin: 24px 0; }
        .cred-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .cred-item:last-child { border-bottom: none; }
        .cred-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
        .cred-val { font-size: 13px; font-weight: 700; color: #0f172a; font-family: monospace; }
        .badge { display: inline-block; background: #E6FAF6; color: #00A88B; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 8px; margin-top: 10px; }
        .footer { background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="title">${companyName}</h1>
          <div class="subtitle">Official Welcome &amp; Onboarding Notification</div>
        </div>
        <div class="content">
          <h3 style="color: #0f172a; margin-top: 0;">Welcome to the Team, ${employee.name}!</h3>
          <p>
            Congratulations on joining <strong>${companyName}</strong>. We are thrilled to welcome you as our 
            <strong>${roleTitle}</strong>.
          </p>
          <p>
            Your corporate employee profile, ID verification card, and appointment offer letter have been issued and registered in our enterprise HRMS portal.
          </p>

          <div class="credentials-box">
            <div style="font-weight: 800; color: #0A2540; font-size: 13px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
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
            <div class="cred-item">
              <span class="cred-label">Department:</span>
              <span class="cred-val">${employee.department || 'Sales & Client Acquisition'}</span>
            </div>
          </div>

          ${offerLetter ? `
            <div style="background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
              <strong style="color: #0f172a; font-size: 13px; display: block; margin-bottom: 6px;">Offer Letter Summary:</strong>
              <div style="font-size: 12px; color: #64748b;">
                Annual CTC: <strong>₹${Number(offerLetter.annualCtc || 0).toLocaleString('en-IN')}</strong> • Monthly Gross: <strong>₹${Number(offerLetter.monthlyGross || 0).toLocaleString('en-IN')}</strong><br/>
                Reporting Manager: <strong>${offerLetter.reportingManager || 'Team Leader'}</strong> • Joining Date: <strong>${offerLetter.joiningDate || employee.joiningDate || 'Immediate'}</strong>
              </div>
            </div>
          ` : ''}

          <p style="font-size: 12px; color: #64748b;">
            Please log in to your employee self-service portal to review your digital employee ID card, access daily desk assignments, and complete biometric onboarding.
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
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `[${companyName}] Welcome & Onboarding Documentation for ${employee.name} (${empCode})`,
      text: `Welcome to ${companyName}, ${employee.name}!\n\nYour Employee Code is ${empCode}. Login at our staff portal using your email (${toEmail}) and default password (${defaultPassword}).\n\nYour ID card and Offer Letter are registered on your portal account.`,
      html: htmlContent,
    });
    console.log(`[SMTP] Onboarding documentation dispatched to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[SMTP Error] Failed to send onboarding email to ${toEmail}:`, err);
    return { success: false, error: err.message || 'Failed to dispatch onboarding email' };
  }
}

// ── 4. Monthly Payslip / Payroll Email Dispatcher ──
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

  const basic = Number(payslip.basicSalary || 0);
  const hra = Number(payslip.hra || 0);
  const specialAllowance = Number(payslip.specialAllowance || 0);
  const incentives = Number(payslip.incentives || 0);
  const pf = Number(payslip.pfDeduction || 0);
  const tax = Number(payslip.taxDeduction || 0);
  const grossEarnings = basic + hra + specialAllowance + incentives;
  const totalDeductions = pf + tax;
  const netPay = Number(payslip.netPay || (grossEarnings - totalDeductions));

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${companyName} - Salary Statement ${payslip.month} ${payslip.year}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #07192C 0%, #0A2540 60%, #0D3155 100%); padding: 32px; color: #ffffff; }
        .title { font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #ffffff; margin: 0; }
        .subtitle { color: #00C9A7; font-size: 12px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px; }
        .content { padding: 32px; font-size: 13px; color: #475569; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; border-radius: 14px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0; }
        .table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        .table th { background: #f8fafc; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; }
        .table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
        .net-box { background: linear-gradient(135deg, #06152B 0%, #0A2540 100%); color: #ffffff; border-radius: 14px; padding: 20px; text-align: center; margin-top: 24px; }
        .net-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #00C9A7; font-weight: 800; }
        .net-amount { font-size: 32px; font-weight: 900; color: #ffffff; margin-top: 4px; font-family: monospace; }
        .footer { background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div style="float: right; text-align: right;">
            <div style="font-size: 16px; font-weight: 800; color: #00C9A7;">PAYSLIP</div>
            <div style="font-size: 12px; color: #cbd5e1; font-weight: 700;">${payslip.month} ${payslip.year}</div>
          </div>
          <h1 class="title">${companyName}</h1>
          <div class="subtitle">Salary Statement &amp; Remittance Voucher</div>
        </div>

        <div class="content">
          <div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a;">${employee.name || payslip.employeeName}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
              Emp Code: <strong>${employee.empCode || payslip.empCode || 'TNX'}</strong> • Designation: <strong>${employee.role || payslip.roleTitle || 'Executive'}</strong>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Earnings Component</th>
                <th style="text-align: right;">Amount (₹)</th>
                <th>Deductions</th>
                <th style="text-align: right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Salary</td>
                <td style="text-align: right; font-weight: 600;">₹${basic.toLocaleString('en-IN')}</td>
                <td>Provident Fund (PF)</td>
                <td style="text-align: right; color: #dc2626;">₹${pf.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td>House Rent Allowance (HRA)</td>
                <td style="text-align: right; font-weight: 600;">₹${hra.toLocaleString('en-IN')}</td>
                <td>Professional / Income Tax</td>
                <td style="text-align: right; color: #dc2626;">₹${tax.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td>Special / Performance Allowance</td>
                <td style="text-align: right; font-weight: 600;">₹${specialAllowance.toLocaleString('en-IN')}</td>
                <td>Other Deductions</td>
                <td style="text-align: right; color: #dc2626;">₹0</td>
              </tr>
              ${incentives > 0 ? `
                <tr>
                  <td>Sales &amp; Performance Incentives</td>
                  <td style="text-align: right; font-weight: 700; color: #00A88B;">+₹${incentives.toLocaleString('en-IN')}</td>
                  <td></td>
                  <td></td>
                </tr>
              ` : ''}
              <tr style="background: #f8fafc; font-weight: 700;">
                <td>Total Gross Earnings</td>
                <td style="text-align: right;">₹${grossEarnings.toLocaleString('en-IN')}</td>
                <td>Total Deductions</td>
                <td style="text-align: right; color: #dc2626;">₹${totalDeductions.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

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
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `[${companyName}] Salary Payslip for ${payslip.month} ${payslip.year} - ${employee.name}`,
      text: `Hello ${employee.name},\n\nYour salary statement for ${payslip.month} ${payslip.year} has been processed.\nNet Salary: ₹${netPay.toLocaleString('en-IN')}.\n\nThank you for your valuable contributions to ${companyName}.`,
      html: htmlContent,
    });
    console.log(`[SMTP] Payslip email dispatched to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[SMTP Error] Failed to send payslip to ${toEmail}:`, err);
    return { success: false, error: err.message || 'Failed to dispatch payslip email' };
  }
}

// ── 5. Official Relieving Letter Email Dispatcher ──
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

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${companyName} - Relieving Letter &amp; Formal Release</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #07192C 0%, #0A2540 60%, #0D3155 100%); padding: 32px; color: #ffffff; }
        .title { font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #ffffff; margin: 0; }
        .subtitle { color: #00C9A7; font-size: 12px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px; }
        .content { padding: 36px 32px; font-size: 14px; line-height: 1.7; color: #334155; }
        .highlight-box { background: #f8fafc; border-left: 4px solid #00C9A7; padding: 16px 20px; border-radius: 0 12px 12px 0; margin: 20px 0; }
        .footer { background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="title">${companyName}</h1>
          <div class="subtitle">Official Relieving Certificate</div>
        </div>

        <div class="content">
          <p><strong>Date:</strong> ${relievingLetter.issuedDate || new Date().toLocaleDateString('en-GB')}</p>
          <p>
            <strong>To:</strong><br/>
            <strong>${employee.name || relievingLetter.employeeName}</strong><br/>
            Employee Code: ${employee.empCode || relievingLetter.employeeCode || 'TNX'}<br/>
            Role: ${employee.roleTitle || relievingLetter.roleTitle || 'Executive'}
          </p>

          <p>Dear ${employee.name || relievingLetter.employeeName},</p>

          <div class="highlight-box">
            This is to formally confirm that your resignation from <strong>${companyName}</strong> has been accepted, 
            and you are relieved from your duties and service with effect from the close of business hours on 
            <strong>${relievingLetter.lastWorkingDay || relievingLetter.lastWorkingDate || 'your last working day'}</strong>.
          </div>

          <p>
            All company assets, data handovers, and compliance clearances have been settled in full. 
            During your tenure from <strong>${employee.joiningDate || relievingLetter.joiningDate || 'your start date'}</strong> 
            to <strong>${relievingLetter.lastWorkingDay || relievingLetter.lastWorkingDate || 'your exit date'}</strong>, 
            your performance and conduct were found to be satisfactory and professional.
          </p>

          <p>
            We thank you for your service and contributions to ${companyName}, and wish you the very best in all your future professional endeavors.
          </p>

          <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            <strong style="color: #0f172a;">For ${companyName}</strong><br/>
            <span style="font-size: 12px; color: #64748b;">Human Resources &amp; Corporate Management</span>
          </div>
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
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `[${companyName}] Official Relieving Letter for ${employee.name}`,
      text: `Dear ${employee.name},\n\nPlease find attached your formal Relieving Certificate from ${companyName}.\nEffective Last Working Day: ${relievingLetter.lastWorkingDay || 'Exit Date'}.\n\nWe wish you all the best in your career.`,
      html: htmlContent,
    });
    console.log(`[SMTP] Relieving letter dispatched to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[SMTP Error] Failed to send relieving letter to ${toEmail}:`, err);
    return { success: false, error: err.message || 'Failed to dispatch relieving email' };
  }
}

// ── 6. Official Experience Certificate Email Dispatcher ──
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

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${companyName} - Experience &amp; Service Verification Certificate</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #07192C 0%, #0A2540 60%, #0D3155 100%); padding: 32px; color: #ffffff; }
        .title { font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #ffffff; margin: 0; }
        .subtitle { color: #00C9A7; font-size: 12px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px; }
        .content { padding: 36px 32px; font-size: 14px; line-height: 1.7; color: #334155; }
        .cert-box { background: #f8fafc; border: 2px solid #00C9A7; border-radius: 16px; padding: 20px; margin: 20px 0; text-align: center; }
        .footer { background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="title">${companyName}</h1>
          <div class="subtitle">Certificate of Experience &amp; Service Verification</div>
        </div>

        <div class="content">
          <div style="text-align: center; font-weight: 800; font-size: 15px; color: #0A2540; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;">
            TO WHOMSOEVER IT MAY CONCERN
          </div>

          <p>
            This is to certify that <strong>${employee.name || cert.candidateName}</strong> (Emp Code: <strong>${employee.empCode || cert.empCode || 'TNX'}</strong>) 
            was an esteemed full-time employee with <strong>${companyName}</strong>, serving as 
            <strong>${employee.roleTitle || cert.roleTitle || 'Executive'}</strong> in the 
            <strong>${employee.department || cert.department || 'Corporate Operations'}</strong> division from 
            <strong>${employee.joiningDate || cert.joiningDate || 'Date of Joining'}</strong> to 
            <strong>${cert.lastWorkingDay || cert.issuedDate || 'Date of Exit'}</strong>.
          </p>

          <p>
            During their period of employment, ${employee.name || cert.candidateName} demonstrated exemplary professionalism, 
            dedication, and diligence in their assigned tasks. Their conduct and character were consistently commendable.
          </p>

          <div class="cert-box">
            <div style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase;">Official Employment Verification</div>
            <div style="font-size: 16px; font-weight: 900; color: #0A2540; margin-top: 4px;">VERIFIED &amp; CERTIFIED</div>
            <div style="font-size: 11px; color: #00A88B; font-weight: 700; margin-top: 2px;">Trade Nexus Trade Smart Corporate HR</div>
          </div>

          <p>
            We wish them continued success and distinction in all future endeavors.
          </p>

          <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            <strong style="color: #0f172a;">Authorized Executive Signatory</strong><br/>
            <span style="font-size: 12px; color: #64748b;">For: ${companyName}</span>
          </div>
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
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `[${companyName}] Official Experience Certificate for ${employee.name}`,
      text: `Dear ${employee.name},\n\nPlease find your official Certificate of Experience and Service Verification from ${companyName}.\n\nWe wish you all the best in your career.`,
      html: htmlContent,
    });
    console.log(`[SMTP] Experience certificate dispatched to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[SMTP Error] Failed to send experience cert to ${toEmail}:`, err);
    return { success: false, error: err.message || 'Failed to dispatch experience certificate email' };
  }
}

