import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { requireRole } from '../middleware/auth.js';
import { sendEmployeePayslipEmail } from '../services/emailService.js';

const router = Router();

/**
 * Phase 3 payroll lifecycle
 *   DRAFT       → HR is customizing; never visible to the employee
 *   DISPATCHED  → finalized PDF saved to the employee's documents + emailed;
 *                 visible in the employee account
 * One record per employee + month + year. A dispatched month is never silently
 * overwritten: editing it requires an explicit revision, and re-sending requires
 * an explicit resend flag.
 */
export const PAYROLL_TEMPLATE_VERSION = 'payroll-slip-v1';
const HR_ROLES = ['admin', 'hr'];

const MONTH_ORDER: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

const isHr = (req: Request) => !!req.user && HR_ROLES.includes(req.user.role);

const num = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function findEmployee(employeeId?: string, empCode?: string, name?: string) {
  return db.prepare(`
    SELECT * FROM team_members
    WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
    LIMIT 1
  `).get(employeeId || '', empCode || '', name || '') as any;
}

function findPeriodRecord(employeeId: string, empCode: string, month: string, year: number, excludeId?: string) {
  return db.prepare(`
    SELECT * FROM payslips
    WHERE (employeeId = ? OR (empCode IS NOT NULL AND empCode = ?))
      AND LOWER(month) = LOWER(?) AND year = ?
      AND id != ?
    LIMIT 1
  `).get(employeeId || '', empCode || '', month, year, excludeId || '') as any;
}

/** Does this payslip belong to the logged-in user? */
function ownsPayslip(req: Request, p: any) {
  const u = req.user;
  if (!u) return false;
  const ids = [u.employeeId, u.id].filter(Boolean);
  return (p.employeeId && ids.includes(p.employeeId)) || (!!u.empCode && p.empCode === u.empCode);
}

/** Normalise every template field from a request body (falls back to an existing record). */
function buildPayrollFields(body: any, existing: any = {}) {
  const pick = (key: string, fallback: any = null) =>
    body[key] !== undefined ? body[key] : (existing[key] !== undefined && existing[key] !== null ? existing[key] : fallback);

  const month = String(pick('month', 'January')).trim();
  const year = num(pick('year', new Date().getFullYear()), new Date().getFullYear());

  const basicSalary = num(pick('basicSalary', 0));
  const housingAllowance = num(body.housingAllowance ?? body.hra ?? existing.housingAllowance ?? existing.hra ?? 0);
  const transportation = num(body.transportation ?? body.specialAllowance ?? existing.transportation ?? existing.specialAllowance ?? 0);
  const performanceBonus = num(body.performanceBonus ?? body.incentives ?? existing.performanceBonus ?? existing.incentives ?? 0);
  const taxDeduction = num(pick('taxDeduction', 0));
  const healthInsurance = num(pick('healthInsurance', 0));
  const pensionContribution = num(pick('pensionContribution', 0));

  const totalEarnings = basicSalary + housingAllowance + transportation + performanceBonus;
  const totalDeductions = taxDeduction + healthInsurance + pensionContribution;

  return {
    employeeId: pick('employeeId'),
    empCode: pick('empCode') || pick('employeeCode'),
    employeeName: pick('employeeName'),
    roleTitle: pick('roleTitle'),
    department: pick('department'),
    employeeType: pick('employeeType', 'Full - Time'),
    payDate: pick('payDate', `31 ${month} ${year}`),
    month,
    year,
    basicSalary,
    // legacy column aliases kept in sync for backward compatibility
    hra: housingAllowance,
    specialAllowance: transportation,
    incentives: performanceBonus,
    housingAllowance,
    transportation,
    performanceBonus,
    pfDeduction: healthInsurance,
    taxDeduction,
    healthInsurance,
    pensionContribution,
    // Net pay is always derived on the server so the document can never disagree with its rows
    netPay: totalEarnings - totalDeductions,
    email: pick('email'),
    bankName: pick('bankName'),
    bankAccountNumber: pick('bankAccountNumber'),
    paymentMode: pick('paymentMode', 'Bank Transfer'),
    authorizedName: pick('authorizedName', 'Muhammad Patel'),
    authorizedRole: pick('authorizedRole', 'Finance Manager – Trade Nexus'),
    authorizedSignature: pick('authorizedSignature'),
    customNotes: pick('customNotes'),
    changeRemarks: pick('changeRemarks'),
  };
}

const WRITABLE_COLUMNS = [
  'employeeId', 'empCode', 'employeeName', 'roleTitle', 'department', 'employeeType', 'payDate',
  'month', 'year', 'basicSalary', 'hra', 'specialAllowance', 'incentives',
  'housingAllowance', 'transportation', 'performanceBonus',
  'pfDeduction', 'taxDeduction', 'healthInsurance', 'pensionContribution', 'netPay',
  'email', 'bankName', 'bankAccountNumber', 'paymentMode',
  'authorizedName', 'authorizedRole', 'authorizedSignature', 'customNotes', 'changeRemarks',
] as const;

/** Required template fields that must be filled before a payroll can be dispatched. */
function validateForDispatch(p: any): string[] {
  const missing: string[] = [];
  const req: Array<[string, string]> = [
    ['employeeId', 'Employee'],
    ['employeeName', 'Employee Name'],
    ['empCode', 'Employee ID'],
    ['department', 'Department'],
    ['roleTitle', 'Designation'],
    ['employeeType', 'Employee Type'],
    ['month', 'Month'],
    ['year', 'Year'],
    ['payDate', 'Pay Date'],
    ['bankAccountNumber', 'Bank Account'],
    ['paymentMode', 'Payment Mode'],
    ['authorizedRole', 'Authorized Role'],
    ['authorizedName', 'Authorized Name'],
    ['email', 'Employee Email'],
  ];
  for (const [k, label] of req) {
    if (p[k] === null || p[k] === undefined || String(p[k]).trim() === '') missing.push(label);
  }
  if (!(num(p.basicSalary) > 0)) missing.push('Basic Salary');
  return missing;
}

/** Strip the (potentially large) signature image from list responses only when not needed. */
const sortChronological = (rows: any[]) =>
  rows.sort((a, b) => {
    const yearDiff = (Number(b.year) || 0) - (Number(a.year) || 0);
    if (yearDiff !== 0) return yearDiff;
    const aMonth = MONTH_ORDER[a.month?.toLowerCase()?.trim()] || 0;
    const bMonth = MONTH_ORDER[b.month?.toLowerCase()?.trim()] || 0;
    return bMonth - aMonth;
  });

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payslips
//   HR/Admin → every record (drafts + dispatched) for payroll management
//   Everyone else (HR's own profile uses the client-side "mine" filter) →
//   only their OWN, DISPATCHED payroll
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', (req: Request, res: Response) => {
  try {
    const user = req.user;
    const requestedEmpId = String(req.query.employeeId || '').trim();
    let payslips: any[];

    if (!isHr(req)) {
      const ownId = user?.employeeId || user?.id || '';
      const ownEmpCode = user?.empCode || '';
      payslips = db.prepare(`
        SELECT * FROM payslips
        WHERE (employeeId = ? OR (empCode IS NOT NULL AND empCode = ?))
          AND payrollStatus = 'DISPATCHED'
      `).all(ownId, ownEmpCode) as any[];
    } else if (requestedEmpId) {
      payslips = db.prepare(`
        SELECT * FROM payslips WHERE employeeId = ? OR empCode = ?
      `).all(requestedEmpId, requestedEmpId) as any[];
    } else {
      payslips = db.prepare('SELECT * FROM payslips').all() as any[];
    }

    sortChronological(payslips);
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    return res.status(200).json(limit && !isNaN(limit) ? payslips.slice(0, limit) : payslips);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payslips  → create (or update the existing) DRAFT for employee + month
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireRole(...HR_ROLES), (req: Request, res: Response) => {
  try {
    const emp = findEmployee(req.body.employeeId, req.body.empCode, req.body.employeeName);
    const body = {
      ...req.body,
      employeeId: req.body.employeeId || emp?.id,
      empCode: req.body.empCode || emp?.empCode,
      employeeName: req.body.employeeName || emp?.name,
      email: req.body.email || emp?.email,
    };
    if (!body.employeeId) return res.status(400).json({ error: 'Select an employee for this payroll' });

    const fields = buildPayrollFields(body);
    const existing = findPeriodRecord(fields.employeeId, fields.empCode, fields.month, fields.year);
    if (existing) {
      if (existing.payrollStatus === 'DISPATCHED') {
        return res.status(409).json({
          error: `${fields.month} ${fields.year} payroll for ${fields.employeeName} has already been dispatched.`,
          existingId: existing.id,
          alreadyDispatched: true,
        });
      }
      // Same employee/month draft already exists → update it instead of duplicating
      updateRecord(existing.id, fields, req.user?.name);
      return res.status(200).json(db.prepare('SELECT * FROM payslips WHERE id = ?').get(existing.id));
    }

    const payId = req.body.id || `ps-${fields.year}-${fields.month.toLowerCase()}-${fields.employeeId}`;
    const cols = ['id', ...WRITABLE_COLUMNS, 'generatedDate', 'status', 'payrollStatus', 'templateVersion', 'modifiedBy', 'modifiedAt'];
    const values = [
      payId, ...WRITABLE_COLUMNS.map(c => (fields as any)[c] ?? null),
      new Date().toISOString().slice(0, 10), 'PROCESSED', 'DRAFT', PAYROLL_TEMPLATE_VERSION,
      req.user?.name || 'HR Manager', new Date().toISOString(),
    ];
    db.prepare(`INSERT INTO payslips (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).run(...values);

    return res.status(201).json(db.prepare('SELECT * FROM payslips WHERE id = ?').get(payId));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

function updateRecord(id: string, fields: ReturnType<typeof buildPayrollFields>, modifiedBy?: string) {
  const sets = [...WRITABLE_COLUMNS.map(c => `${c} = ?`), 'modifiedBy = ?', 'modifiedAt = ?'];
  db.prepare(`UPDATE payslips SET ${sets.join(', ')} WHERE id = ?`).run(
    ...WRITABLE_COLUMNS.map(c => (fields as any)[c] ?? null),
    modifiedBy || 'HR Manager',
    new Date().toISOString(),
    id,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/payslips/:id  → edit a DRAFT (dispatched records need confirmRevision)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', requireRole(...HR_ROLES), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM payslips WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Payslip not found' });

    if (existing.payrollStatus === 'DISPATCHED' && !req.body.confirmRevision) {
      return res.status(409).json({
        error: 'This payroll has already been dispatched. Confirm a revision to change it.',
        alreadyDispatched: true,
      });
    }

    const fields = buildPayrollFields(req.body, existing);
    const clash = findPeriodRecord(fields.employeeId, fields.empCode, fields.month, fields.year, id);
    if (clash) {
      return res.status(409).json({
        error: `A ${fields.month} ${fields.year} payroll already exists for ${fields.employeeName}.`,
        existingId: clash.id,
      });
    }

    updateRecord(id, fields, req.user?.name);
    return res.status(200).json(db.prepare('SELECT * FROM payslips WHERE id = ?').get(id));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payslips/:id/dispatch
//   validate → render final PDF → store in employee documents → mark DISPATCHED
//   → email the employee. Re-dispatching an already-dispatched month needs resend:true.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/dispatch', requireRole(...HR_ROLES), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payslip = db.prepare('SELECT * FROM payslips WHERE id = ?').get(id) as any;
    if (!payslip) return res.status(404).json({ error: 'Payslip not found' });

    if (payslip.payrollStatus === 'DISPATCHED' && !req.body.resend) {
      return res.status(409).json({
        error: `${payslip.month} ${payslip.year} payroll was already dispatched on ${payslip.dispatchedAt}. Use Resend to send it again.`,
        alreadyDispatched: true,
      });
    }

    const missing = validateForDispatch(payslip);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Complete these fields before dispatch: ${missing.join(', ')}`, missing });
    }

    const emp = findEmployee(payslip.employeeId, payslip.empCode, payslip.employeeName) || {};

    // 1. Render the final document from the exact template used for preview
    const { generatePayslipPdf } = await import('../services/pdfGenerator.js');
    const pdfBuf = await generatePayslipPdf(emp, payslip);
    const base64Data = `data:application/pdf;base64,${pdfBuf.toString('base64')}`;
    const safeName = (payslip.employeeName || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Payslip_${payslip.month}_${payslip.year}_${safeName}.pdf`;
    const title = `Payroll Slip – ${payslip.month} ${payslip.year}`;
    const dispatcher = req.user?.name || 'HR Manager';
    const nowIso = new Date().toISOString();

    // 2. Persist into the employee's document vault (one document per payslip)
    const docId = payslip.documentId || `doc-payslip-${payslip.id}`;
    const docExists = db.prepare('SELECT id FROM employee_documents WHERE id = ?').get(docId);
    if (docExists) {
      db.prepare(`
        UPDATE employee_documents
        SET title = ?, fileName = ?, sizeBytes = ?, content = ?, uploadedBy = ?, uploadedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(title, fileName, pdfBuf.length, base64Data, dispatcher, docId);
    } else {
      db.prepare(`
        INSERT INTO employee_documents (id, employeeId, title, category, fileName, mimeType, sizeBytes, content, uploadedBy)
        VALUES (?, ?, ?, 'Payslip', ?, 'application/pdf', ?, ?, ?)
      `).run(docId, payslip.employeeId, title, fileName, pdfBuf.length, base64Data, dispatcher);
    }

    // 3. Mark dispatched (this is what makes it visible to the employee)
    db.prepare(`
      UPDATE payslips
      SET payrollStatus = 'DISPATCHED', status = 'PAID', dispatchedAt = ?, dispatchedBy = ?,
          documentId = ?, templateVersion = ?, generatedDate = ?
      WHERE id = ?
    `).run(nowIso, dispatcher, docId, PAYROLL_TEMPLATE_VERSION, nowIso.slice(0, 10), id);

    const dispatched = db.prepare('SELECT * FROM payslips WHERE id = ?').get(id) as any;

    // 4. Email the employee with the PDF attached
    let emailResult: any = null;
    try {
      emailResult = await sendEmployeePayslipEmail({ ...emp, email: dispatched.email, name: dispatched.employeeName }, dispatched);
      if (emailResult?.success !== false) {
        db.prepare('UPDATE payslips SET emailedAt = ? WHERE id = ?').run(new Date().toISOString(), id);
      }
    } catch (e) {
      console.warn('[Payroll Dispatch] Email failed (payroll is still dispatched):', e);
      emailResult = { success: false, error: (e as Error).message };
    }

    return res.status(200).json({
      payslip: db.prepare('SELECT * FROM payslips WHERE id = ?').get(id),
      emailResult,
    });
  } catch (error) {
    console.error('[Payroll Dispatch Error]', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/payslips/:id/send-email  → resend a DISPATCHED payroll
router.post('/:id/send-email', requireRole(...HR_ROLES), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payslip = db.prepare('SELECT * FROM payslips WHERE id = ?').get(id) as any;
    if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
    if (payslip.payrollStatus !== 'DISPATCHED') {
      return res.status(400).json({ error: 'Dispatch this payroll before emailing it.' });
    }

    const emp = findEmployee(payslip.employeeId, payslip.empCode, payslip.employeeName) || {};
    const targetEmail = req.body.email || payslip.email || emp?.email;
    if (!targetEmail) return res.status(400).json({ error: 'No employee email address found on record' });

    const emailRes = await sendEmployeePayslipEmail({ ...emp, email: targetEmail, name: payslip.employeeName }, payslip);
    db.prepare('UPDATE payslips SET emailedAt = ? WHERE id = ?').run(new Date().toISOString(), id);
    return res.status(200).json({ success: true, emailResult: emailRes });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/payslips/bulk → prepares DRAFTS only (never dispatches, never emails,
// never touches an already-dispatched month). HR still customizes + dispatches each.
router.post('/bulk', requireRole(...HR_ROLES), (req: Request, res: Response) => {
  try {
    const { month, year, employeeIds } = req.body;
    const numericYear = Number(year) || new Date().getFullYear();
    const monthClean = String(month || 'January').trim();

    let members = db.prepare('SELECT * FROM team_members WHERE active = 1').all() as any[];
    if (Array.isArray(employeeIds) && employeeIds.length > 0) {
      const idSet = new Set(employeeIds);
      members = members.filter(m => idSet.has(m.id) || idSet.has(m.empCode));
    }

    const drafts: any[] = [];
    const tx = db.transaction(() => {
      for (const m of members) {
        const existing = findPeriodRecord(m.id, m.empCode, monthClean, numericYear);
        if (existing) { drafts.push(existing); continue; }
        const gross = Number(m.salary) || 0;
        const fields = buildPayrollFields({
          employeeId: m.id, empCode: m.empCode, employeeName: m.name, roleTitle: m.role,
          department: m.groupName || 'General', employeeType: m.employeeType || 'Full - Time',
          month: monthClean, year: numericYear, email: m.email,
          bankName: m.bankName, bankAccountNumber: m.bankAccountNumber,
          basicSalary: Math.round(gross * 0.5), housingAllowance: Math.round(gross * 0.3),
          transportation: Math.round(gross * 0.2),
        });
        const payId = `ps-${numericYear}-${monthClean.toLowerCase()}-${m.id}`;
        const cols = ['id', ...WRITABLE_COLUMNS, 'generatedDate', 'status', 'payrollStatus', 'templateVersion'];
        db.prepare(`INSERT INTO payslips (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).run(
          payId, ...WRITABLE_COLUMNS.map(c => (fields as any)[c] ?? null),
          new Date().toISOString().slice(0, 10), 'PROCESSED', 'DRAFT', PAYROLL_TEMPLATE_VERSION,
        );
        drafts.push(db.prepare('SELECT * FROM payslips WHERE id = ?').get(payId));
      }
    });
    tx();
    return res.status(201).json(drafts);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/payslips/:id/download → the stored dispatched document (or a fresh render for HR)
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payslip = db.prepare('SELECT * FROM payslips WHERE id = ?').get(id) as any;
    if (!payslip) return res.status(404).json({ error: 'Payslip not found' });

    // Employees may only download their own, dispatched payroll
    if (!isHr(req) && (!ownsPayslip(req, payslip) || payslip.payrollStatus !== 'DISPATCHED')) {
      return res.status(403).json({ error: 'You do not have access to this payroll' });
    }

    let pdfBuf: Buffer | null = null;
    if (payslip.payrollStatus === 'DISPATCHED' && payslip.documentId) {
      const doc = db.prepare('SELECT content FROM employee_documents WHERE id = ?').get(payslip.documentId) as any;
      if (doc?.content) pdfBuf = Buffer.from(String(doc.content).split(',').pop() || '', 'base64');
    }
    if (!pdfBuf) {
      const emp = findEmployee(payslip.employeeId, payslip.empCode, payslip.employeeName) || {};
      const { generatePayslipPdf } = await import('../services/pdfGenerator.js');
      pdfBuf = await generatePayslipPdf(emp, payslip);
    }

    const safeName = (payslip.employeeName || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Payslip_${payslip.month}_${payslip.year}_${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBuf.length);
    return res.end(pdfBuf);
  } catch (error) {
    console.error('[Download Payslip Error]', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/payslips/preview → HR-only render of unsaved form data with the final template
router.post(['/preview', '/download'], requireRole(...HR_ROLES), async (req: Request, res: Response) => {
  try {
    const fields = buildPayrollFields(req.body);
    const emp = findEmployee(fields.employeeId, fields.empCode, fields.employeeName) || {};
    const { generatePayslipPdf } = await import('../services/pdfGenerator.js');
    const pdfBuf = await generatePayslipPdf(emp, fields);
    const safeName = (fields.employeeName || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_');
    const inline = req.path === '/preview';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="Payslip_${fields.month}_${fields.year}_${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBuf.length);
    return res.end(pdfBuf);
  } catch (error) {
    console.error('[Preview Payslip Error]', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/payslips/:id (also removes its dispatched document)
router.delete('/:id', requireRole(...HR_ROLES), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT documentId FROM payslips WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Payslip not found' });
    db.prepare('DELETE FROM payslips WHERE id = ?').run(id);
    if (existing.documentId) db.prepare('DELETE FROM employee_documents WHERE id = ?').run(existing.documentId);
    return res.status(200).json({ ok: true, id });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
