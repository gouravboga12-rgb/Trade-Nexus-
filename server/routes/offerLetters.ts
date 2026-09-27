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
    const { id, candidateName, candidateEmail, candidatePhone, roleTitle, department, annualCtc, monthlyGross, joiningDate, reportingManager, location, issuedDate } = req.body;
    const offId = id || `off-${Date.now()}`;

    db.prepare(`
      INSERT INTO offer_letters (id, candidateName, candidateEmail, candidatePhone, roleTitle, department, annualCtc, monthlyGross, joiningDate, reportingManager, location, issuedDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      offId, candidateName || 'Candidate', candidateEmail || '', candidatePhone || '',
      roleTitle || 'Role', department || 'Department',
      annualCtc ? Number(annualCtc) : 0, monthlyGross ? Number(monthlyGross) : 0,
      joiningDate || 'Immediate', reportingManager || 'Manager',
      location || 'Bengaluru Corporate HQ',
      issuedDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    );

    const created = db.prepare('SELECT * FROM offer_letters WHERE id = ?').get(offId);
    return res.status(201).json(created);
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
