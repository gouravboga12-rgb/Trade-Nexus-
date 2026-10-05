import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

// GET /api/lead-batches
router.get('/', (req: Request, res: Response) => {
  try {
    const batches = db.prepare('SELECT * FROM lead_batches ORDER BY createdAt DESC').all();
    return res.status(200).json(batches);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/lead-batches
router.post('/', (req: Request, res: Response) => {
  try {
    const { id, fileName, uploadedAt, totalLeads, assignedToEmployeeName, assignedToEmployeeId } = req.body;
    const batchId = id || `batch-${Date.now()}`;

    db.prepare(`
      INSERT INTO lead_batches (id, fileName, uploadedAt, totalLeads, assignedToEmployeeName, assignedToEmployeeId)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      batchId, fileName || 'Batch.xlsx', uploadedAt || 'Just now',
      totalLeads ? Number(totalLeads) : 0, assignedToEmployeeName || 'Employee', assignedToEmployeeId || null
    );

    const created = db.prepare('SELECT * FROM lead_batches WHERE id = ?').get(batchId);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
