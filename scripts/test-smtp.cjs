// Test SMTP connection and send a real OTP email
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const nodemailer = require('nodemailer');

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const user = process.env.SMTP_USER || 'sagarsuchi26@gmail.com';
const pass = (process.env.SMTP_PASSWORD || 'nktlcdbvgltfzuod').replace(/\s+/g, '');
const from = process.env.SMTP_FROM || `"TRADE NEXUS" <${user}>`;

console.log('[SMTP TEST] Configuration:');
console.log('  Host:', host);
console.log('  Port:', port);
console.log('  User:', user);
console.log('  Pass:', pass.length, 'chars (hidden)');
console.log('  From:', from);
console.log('');

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
  tls: { rejectUnauthorized: false }
});

async function runTest() {
  // 1) Verify connection
  console.log('[1/2] Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('  ✅ SMTP connection verified successfully!\n');
  } catch (err) {
    console.error('  ❌ SMTP verification failed:', err.message);
    process.exit(1);
  }

  // 2) Send test email
  const testOtp = '482936';
  const toEmail = user; // Send to the same SMTP account for testing

  console.log('[2/2] Sending test OTP email to', toEmail, '...');
  try {
    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject: `[TRADE NEXUS] Password Reset OTP: ${testOtp}`,
      text: `Your TRADE NEXUS password reset verification code is: ${testOtp}. It is valid for 10 minutes.`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
          <div style="background:linear-gradient(135deg,#07192C,#0A2540);padding:28px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:2px">TRADE NEXUS</h1>
            <p style="color:#00C9A7;margin:6px 0 0;font-size:11px;font-weight:700;letter-spacing:1px">SECURITY VERIFICATION CENTER</p>
          </div>
          <div style="padding:28px">
            <p style="font-size:15px;font-weight:600">Hello Admin,</p>
            <p style="color:#64748b;font-size:14px">This is a test SMTP verification email from Trade Nexus. Your OTP code is:</p>
            <div style="background:#f8fafc;border:2px dashed #00C9A7;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
              <div style="font-family:monospace;font-size:34px;font-weight:900;letter-spacing:10px;color:#0A2540">${testOtp}</div>
              <p style="color:#64748b;font-size:11px;margin:8px 0 0;font-weight:600">ONE-TIME PASSWORD (TEST)</p>
            </div>
            <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px;border-radius:6px;font-size:12px;color:#92400e">
              ⚠️ This is a <strong>test email</strong>. SMTP is working correctly!
            </div>
          </div>
          <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #f1f5f9">
            © ${new Date().getFullYear()} TRADE NEXUS. Automated security notification.
          </div>
        </div>
      `
    });
    console.log('  ✅ Test email sent successfully!');
    console.log('  MessageId:', info.messageId);
    console.log('\n🎉 SMTP is fully working! Check inbox at:', toEmail);
  } catch (err) {
    console.error('  ❌ Email send failed:', err.message);
    console.error('  Full error:', err);
  }
}

runTest();
