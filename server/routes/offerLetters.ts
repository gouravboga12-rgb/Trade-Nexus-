import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

// GET /api/offer-letters
router.get('/', (req: Request, res: Response) => {
  try {
    const letters = db.prepare('SELECT * FROM offer_letters ORDER BY createdAt DESC').all();
    return res.status(200).json(letters);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/offer-letters
router.post('/', (req: Request, res: Response) => {
  try {
    const { 
      id, 
      candidateName, 
      candidateEmail, 
      candidatePhone, 
      candidateAddress,
      roleTitle, 
      department, 
      annualCtc, 
      monthlyGross, 
      joiningDate, 
      reportingManager, 
      location, 
      issuedDate,
      acceptanceDeadline,
      signatoryName,
      signatoryRole,
      employeeType,
      salaryType,
      companyName,
      companyAddress,
      companyPhone,
      companyEmail,
      companyWebsite
    } = req.body;
    const offId = id || `off-${Date.now()}`;

    db.prepare(`
      INSERT INTO offer_letters (
        id, candidateName, candidateEmail, candidatePhone, candidateAddress,
        roleTitle, department, annualCtc, monthlyGross, joiningDate, reportingManager, location, issuedDate,
        acceptanceDeadline, signatoryName, signatoryRole, employeeType, salaryType,
        companyName, companyAddress, companyPhone, companyEmail, companyWebsite
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      offId, 
      candidateName || 'Candidate', 
      candidateEmail || '', 
      candidatePhone || '',
      candidateAddress || 'Bengaluru Corporate Office',
      roleTitle || 'Role', 
      department || 'Department',
      annualCtc ? Number(annualCtc) : (monthlyGross ? Number(monthlyGross) * 12 : 0), 
      monthlyGross ? Number(monthlyGross) : 0,
      joiningDate || 'Immediate', 
      reportingManager || 'Manager',
      location || 'Bengaluru Corporate HQ',
      issuedDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      acceptanceDeadline || 'Within 7 business days',
      signatoryName || 'T.Vidhya Sagar',
      signatoryRole || 'Chief executive Officer',
      employeeType || 'Full-Time',
      salaryType || 'Monthly Salary',
      companyName || 'Trade Nexus',
      companyAddress || '123 Business Avenue, Financial District, Your City, 500001',
      companyPhone || '+91 98765 43210',
      companyEmail || 'info@tradenexus.com',
      companyWebsite || 'www.tradenexus.com'
    );

    const created = db.prepare('SELECT * FROM offer_letters WHERE id = ?').get(offId);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/offer-letters/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM offer_letters WHERE id = ?').get(id) as any;
    const body = req.body;

    if (existing) {
      db.prepare(`
        UPDATE offer_letters
        SET candidateName = COALESCE(?, candidateName),
            candidateEmail = COALESCE(?, candidateEmail),
            candidatePhone = COALESCE(?, candidatePhone),
            candidateAddress = COALESCE(?, candidateAddress),
            roleTitle = COALESCE(?, roleTitle),
            department = COALESCE(?, department),
            annualCtc = COALESCE(?, annualCtc),
            monthlyGross = COALESCE(?, monthlyGross),
            joiningDate = COALESCE(?, joiningDate),
            reportingManager = COALESCE(?, reportingManager),
            location = COALESCE(?, location),
            issuedDate = COALESCE(?, issuedDate),
            acceptanceDeadline = COALESCE(?, acceptanceDeadline),
            signatoryName = COALESCE(?, signatoryName),
            signatoryRole = COALESCE(?, signatoryRole),
            employeeType = COALESCE(?, employeeType),
            salaryType = COALESCE(?, salaryType),
            companyName = COALESCE(?, companyName),
            companyAddress = COALESCE(?, companyAddress),
            companyPhone = COALESCE(?, companyPhone),
            companyEmail = COALESCE(?, companyEmail),
            companyWebsite = COALESCE(?, companyWebsite)
        WHERE id = ?
      `).run(
        body.candidateName,
        body.candidateEmail,
        body.candidatePhone,
        body.candidateAddress,
        body.roleTitle,
        body.department,
        body.annualCtc ? Number(body.annualCtc) : (body.monthlyGross ? Number(body.monthlyGross) * 12 : undefined),
        body.monthlyGross ? Number(body.monthlyGross) : undefined,
        body.joiningDate,
        body.reportingManager,
        body.location,
        body.issuedDate,
        body.acceptanceDeadline,
        body.signatoryName,
        body.signatoryRole,
        body.employeeType,
        body.salaryType,
        body.companyName,
        body.companyAddress,
        body.companyPhone,
        body.companyEmail,
        body.companyWebsite,
        id
      );
    } else {
      // Upsert if doesn't exist yet
      db.prepare(`
        INSERT INTO offer_letters (
          id, candidateName, candidateEmail, candidatePhone, candidateAddress,
          roleTitle, department, annualCtc, monthlyGross, joiningDate, reportingManager, location, issuedDate,
          acceptanceDeadline, signatoryName, signatoryRole, employeeType, salaryType,
          companyName, companyAddress, companyPhone, companyEmail, companyWebsite
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.candidateName || 'Candidate',
        body.candidateEmail || '',
        body.candidatePhone || '',
        body.candidateAddress || 'Bengaluru Corporate Office',
        body.roleTitle || 'Role',
        body.department || 'Department',
        body.annualCtc ? Number(body.annualCtc) : (body.monthlyGross ? Number(body.monthlyGross) * 12 : 0),
        body.monthlyGross ? Number(body.monthlyGross) : 0,
        body.joiningDate || 'Immediate',
        body.reportingManager || 'Manager',
        body.location || 'Bengaluru Corporate HQ',
        body.issuedDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        body.acceptanceDeadline || 'Within 7 business days',
        body.signatoryName || 'T.Vidhya Sagar',
        body.signatoryRole || 'Chief executive Officer',
        body.employeeType || 'Full-Time',
        body.salaryType || 'Monthly Salary',
        body.companyName || 'Trade Nexus',
        body.companyAddress || '123 Business Avenue, Financial District, Your City, 500001',
        body.companyPhone || '+91 98765 43210',
        body.companyEmail || 'info@tradenexus.com',
        body.companyWebsite || 'www.tradenexus.com'
      );
    }

    const updated = db.prepare('SELECT * FROM offer_letters WHERE id = ?').get(id);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/offer-letters/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const info = db.prepare('DELETE FROM offer_letters WHERE id = ?').run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Offer letter not found' });
    }
    return res.status(200).json({ ok: true, id });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
