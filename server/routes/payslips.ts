import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

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
      pfDeduction, taxDeduction, netPay, generatedDate, status 
    } = req.body;
    const payId = id || `pay-${Date.now()}`;

    db.prepare(`
      INSERT INTO payslips (id, employeeId, empCode, employeeName, roleTitle, department, month, year, basicSalary, hra, specialAllowance, incentives, pfDeduction, taxDeduction, netPay, generatedDate, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payId, employeeId || null, empCode || null, employeeName || null, roleTitle || null, department || null,
      month, Number(year) || new Date().getFullYear(), Number(basicSalary) || 0, Number(hra) || 0,
      Number(specialAllowance) || 0, Number(incentives) || 0, Number(pfDeduction) || 0,
      Number(taxDeduction) || 0, Number(netPay) || 0, generatedDate || 'Today', status || 'PAID'
    );

    const created = db.prepare('SELECT * FROM payslips WHERE id = ?').get(payId);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/payslips/bulk
router.post('/bulk', (req: Request, res: Response) => {
  try {
    const { month, year } = req.body;
    const numericYear = Number(year) || new Date().getFullYear();
    const monthClean = String(month || 'January').trim();

    // Get all active team members
    const activeMembers = db.prepare('SELECT * FROM team_members WHERE active = 1').all() as any[];

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

export default router;
