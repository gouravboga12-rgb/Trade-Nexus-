import { getTodayDateIST } from './dateUtils.js';

const YMD = /^\d{4}-\d{2}-\d{2}/;

export interface RawPaymentRow {
  id?: string;
  leadName?: string | null;
  companyName?: string | null;
  customerName?: string | null;
  telecallerName?: string | null;
  dealAmount?: number | null;
  status?: string | null;
  timestamp?: string | null;
  createdAt?: string | null;
}

/**
 * Extracts the real IST calendar date (YYYY-MM-DD) of a payment row.
 * Handles free-text timestamps like "Just now" by falling back to SQLite UTC `createdAt`.
 */
export function getPaymentDateIST(p?: RawPaymentRow | null): string | null {
  if (!p) return null;
  if (p.timestamp && YMD.test(p.timestamp)) {
    return p.timestamp.slice(0, 10);
  }
  const created = p.createdAt;
  if (created && YMD.test(created)) {
    const iso = created.includes('T') ? created : `${created.replace(' ', 'T')}Z`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      return getTodayDateIST(d);
    }
    return created.slice(0, 10);
  }
  return null;
}

/**
 * Extracts IST YYYY-MM-DD from any lead/call/batch date or timestamp string.
 */
export function extractDateIST(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (YMD.test(s)) {
    if (s.length === 10) return s;
    const iso = s.includes('T') ? s : `${s.replace(' ', 'T')}Z`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      return getTodayDateIST(d);
    }
    return s.slice(0, 10);
  }
  return null;
}

/**
 * Returns the current IST year-month prefix, e.g. "2026-11".
 */
export function getCurrentMonthPrefixIST(dateObj: Date = new Date()): string {
  return getTodayDateIST(dateObj).slice(0, 7);
}

/**
 * Deduplicates verified payments using the same key as Admin/HR frontend views
 * and computes both current-month (YYYY-MM) and all-time verified revenue per caller.
 */
export function computeVerifiedSalesMaps(db: any, targetYearMonth?: string) {
  const yearMonth = targetYearMonth || getCurrentMonthPrefixIST();
  const rows = db.prepare(`
    SELECT id, leadName, companyName, customerName, telecallerName, dealAmount, status, timestamp, createdAt
    FROM payment_verifications
    WHERE status = 'VERIFIED'
    ORDER BY createdAt ASC
  `).all() as RawPaymentRow[];

  const seen = new Set<string>();
  const uniqueRows: RawPaymentRow[] = [];
  for (const p of rows) {
    const key = `${(p.companyName || p.leadName || '').trim().toLowerCase()}_${(p.telecallerName || '').trim().toLowerCase()}_${p.dealAmount}_${p.status}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueRows.push(p);
  }

  const monthlyByCaller = new Map<string, number>();
  const allTimeByCaller = new Map<string, number>();
  const monthlyDealsByCaller = new Map<string, number>();
  const allTimeDealsByCaller = new Map<string, number>();
  let totalMonthly = 0;
  let totalAllTime = 0;

  for (const p of uniqueRows) {
    const caller = (p.telecallerName || '').trim().toLowerCase();
    const amount = Number(p.dealAmount) || 0;
    const dateIST = getPaymentDateIST(p);
    const isTargetMonth = Boolean(dateIST && dateIST.startsWith(yearMonth));

    totalAllTime += amount;
    if (caller) {
      allTimeByCaller.set(caller, (allTimeByCaller.get(caller) || 0) + amount);
      allTimeDealsByCaller.set(caller, (allTimeDealsByCaller.get(caller) || 0) + 1);
    }

    if (isTargetMonth) {
      totalMonthly += amount;
      if (caller) {
        monthlyByCaller.set(caller, (monthlyByCaller.get(caller) || 0) + amount);
        monthlyDealsByCaller.set(caller, (monthlyDealsByCaller.get(caller) || 0) + 1);
      }
    }
  }

  return {
    yearMonth,
    uniqueRows,
    monthlyByCaller,
    allTimeByCaller,
    monthlyDealsByCaller,
    allTimeDealsByCaller,
    totalMonthly,
    totalAllTime,
  };
}

