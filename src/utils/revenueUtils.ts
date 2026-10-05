// Single source of truth for revenue across Admin, HR, Team Leader and Employee views.
//
// Revenue = sum of payment_verifications rows with status VERIFIED.
// A lead's own `dealValue` is only a claim made by the caller; it becomes revenue
// only once HR/Admin verifies the matching payment. Using lead.dealValue directly
// caused the employee screen to over-count (e.g. a re-imported duplicate lead that
// was "converted" again showed ₹10,000 that was never verified).

import { AssignedLead, PaymentVerificationItem } from '../types';
import { getTodayDateIST, isDateInPeriodIST } from './dateUtils';

type PeriodMode = Parameters<typeof isDateInPeriodIST>[1];

const YMD = /^\d{4}-\d{2}-\d{2}/;

/**
 * Real IST calendar date (YYYY-MM-DD) of a payment.
 * `timestamp` is sometimes a free-text label like "Just now", which previously made
 * every payment look like it happened today and broke Today/Week/Month filters.
 * Falls back to the SQLite `createdAt` (UTC, "YYYY-MM-DD HH:MM:SS").
 */
export function getPaymentDateIST(p?: Partial<PaymentVerificationItem> & { createdAt?: string } | null): string | null {
  if (!p) return null;
  if (p.timestamp && YMD.test(p.timestamp)) return p.timestamp.slice(0, 10);
  const created = p.createdAt;
  if (created && YMD.test(created)) {
    const iso = created.includes('T') ? created : `${created.replace(' ', 'T')}Z`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return getTodayDateIST(d);
    return created.slice(0, 10);
  }
  return null;
}

export const isVerifiedPayment = (p?: PaymentVerificationItem | null) => p?.status === 'VERIFIED';

export function isPaymentInPeriod(
  p: PaymentVerificationItem,
  mode: PeriodMode = 'ALL',
  customStart?: string,
  customEnd?: string
): boolean {
  if (mode === 'ALL') return true;
  const date = getPaymentDateIST(p);
  if (!date) return false; // never silently treat an undated payment as "today"
  return isDateInPeriodIST(date, mode, customStart, customEnd);
}

const norm = (s?: string | null) => (s || '').trim().toLowerCase();

export function paymentBelongsTo(p: PaymentVerificationItem, employeeName?: string | null): boolean {
  return Boolean(employeeName) && norm(p.telecallerName) === norm(employeeName);
}

/** Sum of VERIFIED payment amounts, optionally scoped to one employee and a period. */
export function sumVerifiedRevenue(
  payments: PaymentVerificationItem[] | undefined,
  opts: { employeeName?: string; mode?: PeriodMode; customStart?: string; customEnd?: string } = {}
): number {
  return (payments || [])
    .filter((p) => isVerifiedPayment(p))
    .filter((p) => (opts.employeeName ? paymentBelongsTo(p, opts.employeeName) : true))
    .filter((p) => isPaymentInPeriod(p, opts.mode || 'ALL', opts.customStart, opts.customEnd))
    .reduce((sum, p) => sum + (Number(p.dealAmount) || 0), 0);
}

const STATUS_PRIORITY: Record<string, number> = { VERIFIED: 0, PENDING_HR_AUDIT: 1, REJECTED: 2 };

/**
 * One-to-one match of converted leads to payment rows (a payment can back only one lead).
 * Matching order: exact `pay-<leadId>` id, then same lead name + amount + caller.
 * Oldest leads claim first, so a re-imported duplicate of an already-paid lead
 * does not steal (and double-count) the original payment.
 */
export function matchLeadsToPayments(
  leads: AssignedLead[],
  payments: PaymentVerificationItem[] | undefined
): Map<string, PaymentVerificationItem | undefined> {
  const result = new Map<string, PaymentVerificationItem | undefined>();
  const pool = [...(payments || [])];
  const used = new Set<string>();

  const byAge = [...leads].sort((a, b) =>
    String(a.updatedAt || a.createdAt || '').localeCompare(String(b.updatedAt || b.createdAt || ''))
  );

  // Pass 1: exact id links
  for (const lead of byAge) {
    const exact = pool.find((p) => !used.has(p.id) && p.id === `pay-${lead.id}`);
    if (exact) {
      used.add(exact.id);
      result.set(lead.id, exact);
    }
  }

  // Pass 2: name + amount + caller
  for (const lead of byAge) {
    if (result.has(lead.id)) continue;
    const candidates = pool
      .filter((p) => !used.has(p.id))
      .filter((p) => Number(p.dealAmount) === Number(lead.dealValue || 0))
      .filter((p) => norm(p.leadName) === norm(lead.name) || norm(p.customerName) === norm(lead.name))
      .filter((p) => !lead.assignedToEmployeeName || norm(p.telecallerName) === norm(lead.assignedToEmployeeName))
      .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9));
    const match = candidates[0];
    if (match) used.add(match.id);
    result.set(lead.id, match);
  }

  return result;
}
