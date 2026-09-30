import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { sendEmployeePayslipEmail } from '../services/emailService.js';

const router = Router();

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

// GET /api/payslips - Sorted chronologically (newest first)
router.get('/', (req: Request, res: Response) => {
  try {
    const user = req.user;
    const requestedEmpId = String(req.query.employeeId || '').trim();

    let payslips: any[];
    if (user && (user.role === 'telecaller' || user.role === 'employee')) {
      const ownId = user.employeeId || user.id;
      const ownEmpCode = user.empCode || '';
      payslips = db.prepare(`
        SELECT * FROM payslips 
        WHERE employeeId = ? OR empCode = ?
        ORDER BY year DESC, createdAt DESC
      `).all(ownId, ownEmpCode) as any[];
    } else if (requestedEmpId) {
      payslips = db.prepare(`
        SELECT * FROM payslips 
        WHERE employeeId = ? OR empCode = ?
        ORDER BY year DESC, createdAt DESC
      `).all(requestedEmpId, requestedEmpId) as any[];
    } else {
      payslips = db.prepare('SELECT * FROM payslips ORDER BY year DESC, createdAt DESC').all() as any[];
    }
    
    // Sort strictly chronologically: Year DESC, Month Number DESC
    payslips.sort((a, b) => {
      const yearDiff = (Number(b.year) || 0) - (Number(a.year) || 0);
      if (yearDiff !== 0) return yearDiff;
      const aMonth = MONTH_ORDER[a.month?.toLowerCase()?.trim()] || 0;
      const bMonth = MONTH_ORDER[b.month?.toLowerCase()?.trim()] || 0;
      return bMonth - aMonth;
    });

    // Support optional ?limit=3 (rolling N months window)
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const result = limit && !isNaN(limit) ? payslips.slice(0, limit) : payslips;

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/payslips
router.post('/', (req: Request, res: Response) => {
  try {
    const { 
      id, employeeId, empCode, employeeName, roleTitle, department,
      month, year, basicSalary, hra, specialAllowance, incentives, 
      pfDeduction, taxDeduction, netPay, generatedDate, status,
      customNotes, changeRemarks, modifiedBy, modifiedAt
    } = req.body;
    const payId = id || `pay-${Date.now()}`;

    db.prepare(`
      INSERT INTO payslips (
        id, employeeId, empCode, employeeName, roleTitle, department, 
        month, year, basicSalary, hra, specialAllowance, incentives, 
        pfDeduction, taxDeduction, netPay, generatedDate, status,
        customNotes, changeRemarks, modifiedBy, modifiedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payId, employeeId || null, empCode || null, employeeName || null, roleTitle || null, department || null,
      month, Number(year) || new Date().getFullYear(), Number(basicSalary) || 0, Number(hra) || 0,
      Number(specialAllowance) || 0, Number(incentives) || 0, Number(pfDeduction) || 0,
      Number(taxDeduction) || 0, Number(netPay) || 0, generatedDate || 'Today', status || 'PAID',
      customNotes || null, changeRemarks || null, modifiedBy || null, modifiedAt || new Date().toISOString()
    );

    const created = db.prepare('SELECT * FROM payslips WHERE id = ?').get(payId) as any;

    // Asynchronously dispatch email to employee
    try {
      const emp = db.prepare(`
        SELECT email, name, empCode, role, bankName, bankAccountNumber 
        FROM team_members 
        WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
        LIMIT 1
      `).get(employeeId || '', empCode || '', employeeName || '') as any;

      if (emp?.email) {
        sendEmployeePayslipEmail(emp, created).catch(e => console.warn('[Payslip Email Dispatch Error]', e));
      }
    } catch (err) {
      console.warn('[Payslip Lookup Error]', err);
    }

    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/payslips/:id/send-email (Manual / Re-dispatch payslip to employee email)
router.post('/:id/send-email', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payslip = db.prepare('SELECT * FROM payslips WHERE id = ?').get(id) as any;
    if (!payslip) return res.status(404).json({ error: 'Payslip not found' });

    const emp = db.prepare(`
      SELECT email, name, empCode, role, bankName, bankAccountNumber 
      FROM team_members 
      WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
      LIMIT 1
    `).get(payslip.employeeId || '', payslip.empCode || '', payslip.employeeName || '') as any;

    const targetEmail = req.body.email || emp?.email;
    if (!targetEmail) {
      return res.status(400).json({ error: 'No employee email address found on record' });
    }

    const emailRes = await sendEmployeePayslipEmail({ ...emp, email: targetEmail }, payslip);
    return res.status(200).json({ success: true, emailResult: emailRes });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/payslips/:id (Edit / Customize existing payslip with salary fields & change remarks)
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM payslips WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    const {
      basicSalary = existing.basicSalary,
      hra = existing.hra,
      specialAllowance = existing.specialAllowance,
      incentives = existing.incentives,
      pfDeduction = existing.pfDeduction,
      taxDeduction = existing.taxDeduction,
      netPay,
      status = existing.status,
      customNotes = existing.customNotes,
      changeRemarks = existing.changeRemarks,
      modifiedBy = req.user?.name || 'HR Manager',
    } = req.body;

    const numBasic = Number(basicSalary) || 0;
    const numHra = Number(hra) || 0;
    const numAllowance = Number(specialAllowance) || 0;
    const numIncentives = Number(incentives) || 0;
    const numPf = Number(pfDeduction) || 0;
    const numTax = Number(taxDeduction) || 0;
    const computedNetPay = netPay !== undefined 
      ? Number(netPay) 
      : (numBasic + numHra + numAllowance + numIncentives) - (numPf + numTax);

    const nowIso = new Date().toISOString();

    db.prepare(`
      UPDATE payslips SET
        basicSalary = ?,
        hra = ?,
        specialAllowance = ?,
        incentives = ?,
        pfDeduction = ?,
        taxDeduction = ?,
        netPay = ?,
        status = ?,
        customNotes = ?,
        changeRemarks = ?,
        modifiedBy = ?,
        modifiedAt = ?
      WHERE id = ?
    `).run(
      numBasic, numHra, numAllowance, numIncentives, numPf, numTax,
      computedNetPay, status, customNotes || null, changeRemarks || null,
      modifiedBy, nowIso, id
    );

    const updated = db.prepare('SELECT * FROM payslips WHERE id = ?').get(id);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/payslips/bulk
router.post('/bulk', (req: Request, res: Response) => {
  try {
    const { month, year, employeeIds } = req.body;
    const numericYear = Number(year) || new Date().getFullYear();
    const monthClean = String(month || 'January').trim();

    // Get all active team members or filter by employeeIds
    let activeMembers = db.prepare('SELECT * FROM team_members WHERE active = 1').all() as any[];
    if (Array.isArray(employeeIds) && employeeIds.length > 0) {
      const idSet = new Set(employeeIds);
      activeMembers = activeMembers.filter(m => idSet.has(m.id) || idSet.has(m.empCode));
    }

    const generatedPayslips: any[] = [];
    const insertPayslip = db.prepare(`
      INSERT INTO payslips (id, employeeId, empCode, employeeName, roleTitle, department, month, year, basicSalary, hra, specialAllowance, incentives, pfDeduction, taxDeduction, netPay, generatedDate, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const generateMany = db.transaction((members: any[]) => {
      for (const m of members) {
        const payId = `ps-${numericYear}-${monthClean.toLowerCase()}-${m.id}`;
        // Compute personalized compensation
        const totalSalary = m.salary || 40000;
        const basic = Math.round(totalSalary * 0.5);
        const hra = Math.round(totalSalary * 0.3);
        const specialAllowance = Math.round(totalSalary * 0.2);
        const incentives = m.salesAchieved && m.salesAchieved > 0 ? Math.round(m.salesAchieved * 0.05) : 0;
        const pfDeduction = Math.min(1800, Math.round(basic * 0.12));
        const taxDeduction = totalSalary > 50000 ? Math.round(totalSalary * 0.05) : 0;
        const netPay = (basic + hra + specialAllowance + incentives) - (pfDeduction + taxDeduction);

        // Delete existing payslip for this employee, month, and year
        db.prepare('DELETE FROM payslips WHERE (employeeId = ? OR empCode = ?) AND LOWER(month) = ? AND year = ?')
          .run(m.id, m.empCode, monthClean.toLowerCase(), numericYear);

        insertPayslip.run(
          payId, m.id, m.empCode, m.name, m.role, m.groupName || 'General',
          monthClean, numericYear, basic, hra, specialAllowance, incentives,
          pfDeduction, taxDeduction, netPay, `01 ${monthClean} ${numericYear}`, 'PAID'
        );

        const created = db.prepare('SELECT * FROM payslips WHERE id = ?').get(payId);
        if (created) generatedPayslips.push(created);
      }
    });

    if (activeMembers.length > 0) {
      generateMany(activeMembers);
    }

    return res.status(201).json(generatedPayslips);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/payslips/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const info = db.prepare('DELETE FROM payslips WHERE id = ?').run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }
    return res.status(200).json({ ok: true, id });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
