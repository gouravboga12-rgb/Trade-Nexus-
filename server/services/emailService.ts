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
