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
      employeeType, payDate,
      month, year, basicSalary, hra, specialAllowance, incentives, 
      housingAllowance, transportation, performanceBonus,
      pfDeduction, taxDeduction, healthInsurance, pensionContribution,
      netPay, generatedDate, status,
      authorizedName, authorizedRole,
      email, bankName, bankAccountNumber, paymentMode,
      customNotes, changeRemarks, modifiedBy, modifiedAt
    } = req.body;
    const payId = id || `pay-${Date.now()}`;

    // Resolve employee details if missing
    const emp = db.prepare(`
      SELECT email, name, empCode, role, bankName, bankAccountNumber 
      FROM team_members 
      WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
      LIMIT 1
    `).get(employeeId || '', empCode || '', employeeName || '') as any;

    const resolvedEmail = email || emp?.email || null;
    const resolvedBank = bankName || emp?.bankName || 'HDFC Bank';
    const resolvedAcc = bankAccountNumber || emp?.bankAccountNumber || '50200084920194';
    const resolvedPayMode = paymentMode || 'Bank Transfer';

    const finalEmployeeType = employeeType || 'Full - Time';
    const finalPayDate = payDate || generatedDate || `31 ${month} ${year}`;
    const finalBasic = Number(basicSalary) || 0;
    const finalHra = hra !== undefined ? Number(hra) : (housingAllowance !== undefined ? Number(housingAllowance) : 0);
    const finalAllowance = specialAllowance !== undefined ? Number(specialAllowance) : (transportation !== undefined ? Number(transportation) : 0);
    const finalBonus = performanceBonus !== undefined ? Number(performanceBonus) : (incentives !== undefined ? Number(incentives) : 0);
    const finalPf = pfDeduction !== undefined ? Number(pfDeduction) : (pensionContribution !== undefined ? Number(pensionContribution) : 0);
    const finalTax = Number(taxDeduction) || 0;
    const finalHealth = healthInsurance !== undefined ? Number(healthInsurance) : 500;
    const finalPension = pensionContribution !== undefined ? Number(pensionContribution) : (finalPf || 200);

    const computedNetPay = netPay !== undefined 
      ? Number(netPay) 
      : (finalBasic + finalHra + finalAllowance + finalBonus) - (finalTax + finalHealth + finalPension);

    const finalAuthName = authorizedName || 'Muhammad Patel';
    const finalAuthRole = authorizedRole || 'Finance Manager – Trade Nexus';

    db.prepare(`
      INSERT INTO payslips (
        id, employeeId, empCode, employeeName, roleTitle, department, 
        employeeType, payDate,
        month, year, basicSalary, hra, specialAllowance, incentives, 
        housingAllowance, transportation, performanceBonus,
        pfDeduction, taxDeduction, healthInsurance, pensionContribution,
        netPay, generatedDate, status,
        email, bankName, bankAccountNumber, paymentMode,
        authorizedName, authorizedRole,
        customNotes, changeRemarks, modifiedBy, modifiedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payId, employeeId || null, empCode || null, employeeName || null, roleTitle || null, department || null,
      finalEmployeeType, finalPayDate,
      month, Number(year) || new Date().getFullYear(),
      finalBasic, finalHra, finalAllowance, finalBonus,
      finalHra, finalAllowance, finalBonus,
      finalPf, finalTax, finalHealth, finalPension,
      computedNetPay, generatedDate || 'Today', status || 'PAID',
      resolvedEmail, resolvedBank, resolvedAcc, resolvedPayMode,
      finalAuthName, finalAuthRole,
      customNotes || null, changeRemarks || null, modifiedBy || null, modifiedAt || new Date().toISOString()
    );

    const created = db.prepare('SELECT * FROM payslips WHERE id = ?').get(payId) as any;

    // Asynchronously dispatch email to employee
    if (resolvedEmail) {
      sendEmployeePayslipEmail({ ...emp, email: resolvedEmail, name: created.employeeName }, created)
        .catch(e => console.warn('[Payslip Email Dispatch Error]', e));
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

    const targetEmail = req.body.email || payslip.email || emp?.email;
    if (!targetEmail) {
      return res.status(400).json({ error: 'No employee email address found on record' });
    }

    // Persist email to payslip record if not set
    if (!payslip.email && targetEmail) {
      db.prepare('UPDATE payslips SET email = ? WHERE id = ?').run(targetEmail, id);
      payslip.email = targetEmail;
    }

    const emailRes = await sendEmployeePayslipEmail({ ...emp, email: targetEmail, name: payslip.employeeName }, payslip);
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
      employeeName = existing.employeeName,
      roleTitle = existing.roleTitle,
      department = existing.department,
      employeeType = existing.employeeType || 'Full - Time',
      payDate = existing.payDate || existing.generatedDate || `31 ${existing.month} ${existing.year}`,
      basicSalary = existing.basicSalary,
      hra = existing.hra,
      specialAllowance = existing.specialAllowance,
      incentives = existing.incentives,
      housingAllowance = existing.housingAllowance ?? existing.hra,
      transportation = existing.transportation ?? existing.specialAllowance,
      performanceBonus = existing.performanceBonus ?? existing.incentives,
      pfDeduction = existing.pfDeduction,
      taxDeduction = existing.taxDeduction,
      healthInsurance = existing.healthInsurance ?? 500,
      pensionContribution = existing.pensionContribution ?? 200,
      netPay,
      status = existing.status,
      email = existing.email,
      bankName = existing.bankName,
      bankAccountNumber = existing.bankAccountNumber,
      paymentMode = existing.paymentMode,
      authorizedName = existing.authorizedName || 'Muhammad Patel',
      authorizedRole = existing.authorizedRole || 'Finance Manager – Trade Nexus',
      customNotes = existing.customNotes,
      changeRemarks = existing.changeRemarks,
      modifiedBy = (req as any).user?.name || 'HR Manager',
    } = req.body;

    const numBasic = Number(basicSalary) || 0;
    const numHra = housingAllowance !== undefined ? Number(housingAllowance) : (Number(hra) || 0);
    const numAllowance = transportation !== undefined ? Number(transportation) : (Number(specialAllowance) || 0);
    const numIncentives = performanceBonus !== undefined ? Number(performanceBonus) : (Number(incentives) || 0);
    const numPf = Number(pfDeduction) || 0;
    const numTax = Number(taxDeduction) || 0;
    const numHealth = Number(healthInsurance) || 0;
    const numPension = Number(pensionContribution) || 0;
    
    const computedNetPay = netPay !== undefined 
      ? Number(netPay) 
      : (numBasic + numHra + numAllowance + numIncentives) - (numTax + numHealth + numPension);

    const nowIso = new Date().toISOString();

    db.prepare(`
      UPDATE payslips SET
        employeeName = ?,
        roleTitle = ?,
        department = ?,
        employeeType = ?,
        payDate = ?,
        basicSalary = ?,
        hra = ?,
        specialAllowance = ?,
        incentives = ?,
        housingAllowance = ?,
        transportation = ?,
        performanceBonus = ?,
        pfDeduction = ?,
        taxDeduction = ?,
        healthInsurance = ?,
        pensionContribution = ?,
        netPay = ?,
        status = ?,
        email = ?,
        bankName = ?,
        bankAccountNumber = ?,
        paymentMode = ?,
        authorizedName = ?,
        authorizedRole = ?,
        customNotes = ?,
        changeRemarks = ?,
        modifiedBy = ?,
        modifiedAt = ?
      WHERE id = ?
    `).run(
      employeeName, roleTitle, department,
      employeeType, payDate,
      numBasic, numHra, numAllowance, numIncentives,
      numHra, numAllowance, numIncentives,
      numPf, numTax, numHealth, numPension,
      computedNetPay, status,
      email || null, bankName || null, bankAccountNumber || null, paymentMode || null,
      authorizedName, authorizedRole,
      customNotes || null, changeRemarks || null,
      modifiedBy, nowIso, id
    );

    const updated = db.prepare('SELECT * FROM payslips WHERE id = ?').get(id);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/payslips/bulk
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { month, year, employeeIds, sendEmail = false } = req.body;
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
      INSERT INTO payslips (
        id, employeeId, empCode, employeeName, roleTitle, department,
        employeeType, payDate,
        month, year, basicSalary, hra, specialAllowance, incentives,
        housingAllowance, transportation, performanceBonus,
        pfDeduction, taxDeduction, healthInsurance, pensionContribution,
        netPay, generatedDate, status,
        email, bankName, bankAccountNumber, paymentMode,
        authorizedName, authorizedRole
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const generateMany = db.transaction((members: any[]) => {
      for (const m of members) {
        const payId = `ps-${numericYear}-${monthClean.toLowerCase()}-${m.id}`;
        // Compute personalized compensation matching template proportions
        const totalSalary = m.salary || 40000;
        const basic = Math.round(totalSalary * 0.5);
        const housing = Math.round(totalSalary * 0.3);
        const transportation = Math.round(totalSalary * 0.2);
        const bonus = m.salesAchieved && m.salesAchieved > 0 ? Math.round(m.salesAchieved * 0.05) : 0;
        const healthInsurance = 500;
        const pensionContribution = 200;
        const tax = totalSalary > 50000 ? Math.round(totalSalary * 0.05) : 3000;
        const netPay = (basic + housing + transportation + bonus) - (tax + healthInsurance + pensionContribution);
        const payDate = `31 ${monthClean} ${numericYear}`;

        // Delete existing payslip for this employee, month, and year
        db.prepare('DELETE FROM payslips WHERE (employeeId = ? OR empCode = ?) AND LOWER(month) = ? AND year = ?')
          .run(m.id, m.empCode, monthClean.toLowerCase(), numericYear);

        insertPayslip.run(
          payId, m.id, m.empCode, m.name, m.role, m.groupName || 'General',
          m.employeeType || 'Full - Time', payDate,
          monthClean, numericYear, basic, housing, transportation, bonus,
          housing, transportation, bonus,
          pensionContribution, tax, healthInsurance, pensionContribution,
          netPay, `01 ${monthClean} ${numericYear}`, 'PAID',
          m.email || null, m.bankName || 'HDFC Bank', m.bankAccountNumber || '50200084920194', 'Bank Transfer',
          'Muhammad Patel', 'Finance Manager – Trade Nexus'
        );

        const created = db.prepare('SELECT * FROM payslips WHERE id = ?').get(payId);
        if (created) generatedPayslips.push(created);
      }
    });

    if (activeMembers.length > 0) {
      generateMany(activeMembers);
    }

    // If requested or if emails exist, asynchronously dispatch payslip emails
    if (sendEmail) {
      for (const ps of generatedPayslips) {
        if (ps.email) {
          sendEmployeePayslipEmail({ name: ps.employeeName, email: ps.email }, ps)
            .catch(e => console.warn(`[Bulk Payslip Email Error for ${ps.employeeName}]`, e));
        }
      }
    }

    return res.status(201).json(generatedPayslips);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/payslips/:id/download (Direct binary PDF download)
router.get('/:id/download', async (req: Request, res: Response) => {
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

    const { generatePayslipPdf } = await import('../services/pdfGenerator.js');
    const pdfBuf = await generatePayslipPdf(emp || {}, payslip);

    const safeName = (payslip.employeeName || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Payslip_${payslip.month}_${payslip.year}_${safeName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuf.length);
    return res.end(pdfBuf);
  } catch (error) {
    console.error('[Download Payslip Error]', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/payslips/download (Direct binary PDF download with custom body for preview/unsaved edits)
router.post('/download', async (req: Request, res: Response) => {
  try {
    const payslip = req.body;
    const { generatePayslipPdf } = await import('../services/pdfGenerator.js');
    const pdfBuf = await generatePayslipPdf({ name: payslip.employeeName }, payslip);

    const safeName = (payslip.employeeName || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Payslip_${payslip.month || 'Salary'}_${payslip.year || new Date().getFullYear()}_${safeName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuf.length);
    return res.end(pdfBuf);
  } catch (error) {
    console.error('[Download Custom Payslip Error]', error);
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
