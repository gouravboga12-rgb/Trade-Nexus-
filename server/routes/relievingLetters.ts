import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

// GET /api/relieving-letters - returns all letters, or filtered by employeeId
router.get('/', (req: Request, res: Response) => {
  try {
    const { employeeId } = req.query;
    if (employeeId) {
      const rows = db.prepare(`
        SELECT * FROM relieving_letters
        WHERE employeeId = ? OR empCode = ?
        ORDER BY createdAt DESC
      `).all(employeeId, employeeId);
      return res.status(200).json(rows);
    }
    const rows = db.prepare(`
      SELECT * FROM relieving_letters
      ORDER BY createdAt DESC
    `).all();
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/relieving-letters/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const letter = db.prepare(`
      SELECT * FROM relieving_letters
      WHERE id = ? OR employeeId = ?
      LIMIT 1
    `).get(req.params.id, req.params.id);
    if (!letter) return res.status(404).json({ error: 'Relieving letter not found' });
    return res.status(200).json(letter);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/relieving-letters/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const letter = db.prepare('SELECT * FROM relieving_letters WHERE id = ?').get(id) as any;
    if (letter) {
      db.prepare('DELETE FROM relieving_letters WHERE id = ?').run(id);
      if (letter.documentId) {
        db.prepare('DELETE FROM employee_documents WHERE id = ?').run(letter.documentId);
      } else if (letter.employeeId) {
        db.prepare("DELETE FROM employee_documents WHERE employeeId = ? AND category = 'Relieving Letter'").run(letter.employeeId);
      }
    }
    return res.status(200).json({ success: true, id });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
