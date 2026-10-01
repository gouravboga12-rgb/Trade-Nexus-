import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const getJwtSecret = () => process.env.JWT_SECRET || 'trade_nexus_secure_secret_key_2025';

/**
 * Hash password with bcryptjs.
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

/**
 * Verify password matching either bcrypt or native scrypt format.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash) return false;
    if (storedHash.startsWith('$2')) {
      return bcrypt.compareSync(password, storedHash);
    }
    const [salt, key] = storedHash.split(':');
    if (salt && key) {
      const hash = crypto.scryptSync(password, salt, 64).toString('hex');
      const keyBuf = Buffer.from(key, 'hex');
      const hashBuf = Buffer.from(hash, 'hex');
      if (keyBuf.length !== hashBuf.length) return false;
      return crypto.timingSafeEqual(keyBuf, hashBuf);
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Standard signed JWT token.
 */
export function createToken(payload: Record<string, any>): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

/**
 * Verify and decode signed JWT token.
 */
export function verifyToken<T = any>(token: string): T | null {
  try {
    return jwt.verify(token, getJwtSecret()) as T;
  } catch (err: any) {
    console.error('[JWT Verify Error]:', err?.message, 'token:', token?.slice(0, 15));
    return null;
  }
}
