import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../db/authUtils.js';

export interface AuthPayload {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'hr' | 'team_leader' | 'telecaller' | 'employee';
  empCode?: string | null;
  employeeId?: string | null;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Middleware to verify JWT from Authorization: Bearer <token>
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Authentication token required' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken<AuthPayload>(token);

  if (!decoded || !decoded.id) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
  }

  req.user = decoded;
  next();
}

/**
 * Middleware to enforce required roles
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const userRole = req.user.role;
    // 'employee' is treated equivalent to 'telecaller'
    const normalizedRole = userRole === 'employee' ? 'telecaller' : userRole;
    const allowed = roles.map(r => r === 'employee' ? 'telecaller' : r);

    if (!allowed.includes(normalizedRole)) {
      return res.status(403).json({ 
        error: `Forbidden: Access requires ${roles.join(' or ')} privileges` 
      });
    }

    next();
  };
}
