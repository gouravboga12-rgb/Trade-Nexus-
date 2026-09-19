import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { hashPassword, verifyPassword, createToken, verifyToken } from '../db/authUtils.js';
import { authenticate, requireRole } from '../middleware/auth.js';

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

export default router;
