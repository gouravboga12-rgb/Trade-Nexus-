import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { hashPassword, verifyPassword, createToken, verifyToken } from '../db/authUtils.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { sendPasswordResetOtpEmail } from '../services/emailService.js';

const router = Router();

interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'telecaller' | 'team_leader' | 'hr' | 'admin';
  empCode: string | null;
  employeeId: string | null;
  active: number;
}

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanInput = String(email).trim().toLowerCase();

    // Query by email OR employee code (support both .com and .io aliases)
    let user = db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(email) = ? OR LOWER(empCode) = ?
      LIMIT 1
    `).get(cleanInput, cleanInput) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = verifyPassword(String(password), user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = createToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      empCode: user.empCode,
      employeeId: user.employeeId,
    });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        empCode: user.empCode,
        employeeId: user.employeeId,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/auth/me
router.get('/me', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized, no token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken<{ id: string }>(token);

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }

    const user = db.prepare(`
      SELECT id, email, name, role, empCode, employeeId 
      FROM users 
      WHERE id = ?
    `).get(decoded.id) as any;

    if (!user) {
      return res.status(401).json({ error: 'User session expired or not found' });
    }

    return res.status(200).json({ user });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
});

// POST /api/auth/users (Admin / HR provisioning)
router.post('/users', authenticate, requireRole('admin', 'hr'), (req: Request, res: Response) => {
  try {
    const { email, name, role, empCode, employeeId, password } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    const tempPassword = password || 'nexus123';
    const hash = hashPassword(tempPassword);
    const userId = `usr-${Date.now()}`;

    db.prepare(`
      INSERT INTO users (id, email, passwordHash, name, role, empCode, employeeId, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name,
        role = excluded.role,
        empCode = excluded.empCode,
        employeeId = excluded.employeeId,
        passwordHash = excluded.passwordHash
    `).run(
      userId,
      email.toLowerCase().trim(),
      hash,
      name,
      role || 'employee',
      empCode || null,
      employeeId || null
    );

    return res.status(201).json({
      email,
      temporaryPassword: tempPassword,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken<{ id: string }>(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id) as UserRow | undefined;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = verifyPassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const newHash = hashPassword(newPassword);
    db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(newHash, user.id);

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/auth/forgot-password/send-otp
router.post('/forgot-password/send-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email or employee code is required' });
    }

    const cleanInput = String(email).trim().toLowerCase();

    // Find user by email OR employee code
    const user = db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(email) = ? OR LOWER(empCode) = ?
      LIMIT 1
    `).get(cleanInput, cleanInput) as any;

    if (!user) {
      return res.status(404).json({ error: 'No account found with this email or employee code.' });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    const otpId = `otp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Remove any previous pending OTPs for this email
    db.prepare('DELETE FROM password_reset_otps WHERE LOWER(email) = ?').run(user.email.toLowerCase());

    // Insert new OTP record
    db.prepare(`
      INSERT INTO password_reset_otps (id, email, otp, expiresAt, verified)
      VALUES (?, ?, ?, ?, 0)
    `).run(otpId, user.email.toLowerCase(), otp, expiresAt);

    console.log(`[AUTH] Generated OTP ${otp} for ${user.email} (${user.role}). Dispathing via SMTP...`);

    // Dispatch email via Gmail SMTP
    const mailResult = await sendPasswordResetOtpEmail(user.email, otp, user.name);

    if (!mailResult.success) {
      console.warn(`[AUTH] SMTP send warning: ${mailResult.error}. Providing fallback in dev console.`);
    }

    return res.status(200).json({
      ok: true,
      email: user.email,
      role: user.role,
      name: user.name,
      message: `Verification code sent to ${user.email}. Check your inbox or spam folder.`,
      // Return devHint only if SMTP had an issue, or for fast testing
      devHint: !mailResult.success ? `SMTP note: OTP code is ${otp}` : undefined
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/auth/forgot-password/verify-otp
router.post('/forgot-password/verify-otp', (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit OTP code are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const record = db.prepare(`
      SELECT * FROM password_reset_otps
      WHERE LOWER(email) = ? AND otp = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `).get(cleanEmail, cleanOtp) as any;

    if (!record) {
      return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    if (Date.now() > Number(record.expiresAt)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Mark as verified
    db.prepare('UPDATE password_reset_otps SET verified = 1 WHERE id = ?').run(record.id);

    return res.status(200).json({
      ok: true,
      message: 'OTP verified successfully. You may now set your new password.'
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/auth/forgot-password/reset-password
router.post('/forgot-password/reset-password', (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const record = db.prepare(`
      SELECT * FROM password_reset_otps
      WHERE LOWER(email) = ? AND otp = ? AND verified = 1
      ORDER BY createdAt DESC
      LIMIT 1
    `).get(cleanEmail, cleanOtp) as any;

    if (!record) {
      return res.status(400).json({ error: 'Invalid or unverified session. Please verify OTP first.' });
    }

    if (Date.now() > Number(record.expiresAt)) {
      return res.status(400).json({ error: 'Verification session has expired. Please restart the process.' });
    }

    // Find the user
    const user = db.prepare('SELECT id, email, role, name FROM users WHERE LOWER(email) = ?').get(cleanEmail) as any;
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    // Hash and update the password
    const newHash = hashPassword(String(newPassword));
    db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(newHash, user.id);

    // Clean up OTP records for this email
    db.prepare('DELETE FROM password_reset_otps WHERE LOWER(email) = ?').run(cleanEmail);

    console.log(`[AUTH] Password successfully reset for ${user.email} (${user.role})`);

    return res.status(200).json({
      ok: true,
      message: 'Password reset successfully! You can now log in with your new password.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
