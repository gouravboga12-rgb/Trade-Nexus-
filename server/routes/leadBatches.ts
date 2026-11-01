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

// DELETE /api/lead-batches/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mode = (String(req.query.mode || req.body?.mode || 'delete_leads')).toLowerCase();

    // 1. First try exact match by id
    let batch = db.prepare('SELECT * FROM lead_batches WHERE id = ?').get(id) as any;
    let targetBatchId = id;

    // 2. Fallback: if not found by id, try matching by fileName (or close timestamp)
    if (!batch) {
      const fileNameMatch = req.query.fileName ? String(req.query.fileName) : null;
      if (fileNameMatch) {
        batch = db.prepare('SELECT * FROM lead_batches WHERE fileName = ? ORDER BY createdAt DESC').get(fileNameMatch) as any;
      }
      if (!batch && id.startsWith('batch-')) {
        const ts = id.replace('batch-', '');
        // Search if any batch was created within 5 seconds of the client timestamp
        const tsNum = Number(ts);
        if (!isNaN(tsNum)) {
          const candidates = db.prepare("SELECT * FROM lead_batches WHERE id LIKE 'batch-%'").all() as any[];
          const closeCandidate = candidates.find(c => {
            const cTs = Number(c.id.replace('batch-', ''));
            return !isNaN(cTs) && Math.abs(cTs - tsNum) < 10000;
          });
          if (closeCandidate) {
            batch = closeCandidate;
            targetBatchId = closeCandidate.id;
          }
        }
      }
    }

    if (batch) {
      targetBatchId = batch.id;
    }

    const batchLeads = db.prepare('SELECT id, phone, status FROM assigned_leads WHERE batchId = ?').all(targetBatchId) as any[];

    if (!batch && batchLeads.length === 0) {
      return res.status(404).json({ error: 'Lead batch not found' });
    }

    const deleteBatchTx = db.transaction(() => {
      if (mode === 'unassign_leads') {
        // Move all leads in this batch back to the Unassigned Pool
        db.prepare(`
          UPDATE assigned_leads 
          SET assignedToEmployeeId = '', assignedToEmployeeName = 'Unassigned', updatedAt = CURRENT_TIMESTAMP
          WHERE batchId = ?
        `).run(targetBatchId);
      } else {
        // Permanent delete: fetch lead ids in this batch
        for (const lead of batchLeads) {
          // Cleanup pending payment verifications if unconverted
          if (lead.status !== 'CONVERTED') {
            try {
              db.prepare('DELETE FROM payment_verifications WHERE id = ? OR utrNumber = ?').run(`pay-${lead.id}`, `LEAD-${lead.id}`);
            } catch (_) { }
          }
          // Remove call logs
          try {
            db.prepare('DELETE FROM call_logs WHERE leadId = ? OR clientPhone = ?').run(lead.id, lead.phone || '');
          } catch (_) { }
          // Delete from client_leads
          try {
            db.prepare('DELETE FROM client_leads WHERE id = ?').run(lead.id);
          } catch (_) { }
        }
        // Delete the leads
        db.prepare('DELETE FROM assigned_leads WHERE batchId = ?').run(targetBatchId);
      }

      // Delete the batch record
      db.prepare('DELETE FROM lead_batches WHERE id = ?').run(targetBatchId);
    });

    deleteBatchTx();

    return res.status(200).json({ success: true, deletedBatchId: targetBatchId, mode });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
