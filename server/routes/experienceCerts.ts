import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

// GET /api/experience-certs - returns all certificates, or filtered by employeeId
router.get('/', (req: Request, res: Response) => {
  try {
    const { employeeId } = req.query;
    if (employeeId) {
      const rows = db.prepare(`
        SELECT * FROM experience_certificates
        WHERE employeeId = ? OR empCode = ?
        ORDER BY createdAt DESC
      `).all(employeeId, employeeId);
      return res.status(200).json(rows);
    }
    const rows = db.prepare(`
      SELECT * FROM experience_certificates
      ORDER BY createdAt DESC
    `).all();
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/experience-certs/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const cert = db.prepare(`
      SELECT * FROM experience_certificates
      WHERE id = ? OR employeeId = ?
      LIMIT 1
    `).get(req.params.id, req.params.id);
    if (!cert) return res.status(404).json({ error: 'Experience certificate not found' });
    return res.status(200).json(cert);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/experience-certs/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cert = db.prepare('SELECT * FROM experience_certificates WHERE id = ?').get(id) as any;
    if (cert) {
      db.prepare('DELETE FROM experience_certificates WHERE id = ?').run(id);
      if (cert.documentId) {
        db.prepare('DELETE FROM employee_documents WHERE id = ?').run(cert.documentId);
      } else if (cert.employeeId) {
        db.prepare("DELETE FROM employee_documents WHERE employeeId = ? AND category = 'Experience Certificate'").run(cert.employeeId);
      }
    }
    return res.status(200).json({ success: true, id });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
