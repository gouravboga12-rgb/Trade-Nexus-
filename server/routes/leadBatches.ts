import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { emitSocketEvent } from '../services/socketService.js';

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

// GET /api/lead-batches/:id/cleanup-preview
// Pre-calculates exact protected vs purge counts before admin confirms
router.get('/:id/cleanup-preview', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const isAll = id.toLowerCase() === 'all';

    let condition = '1=1';
    let params: any[] = [];

    if (!isAll) {
      let targetBatchId = id;
      let targetFileName = req.query.fileName ? String(req.query.fileName) : '';
      const batch = db.prepare('SELECT * FROM lead_batches WHERE id = ?').get(id) as any;
      if (batch) {
        targetBatchId = batch.id;
        if (!targetFileName && batch.fileName) targetFileName = batch.fileName;
      } else if (targetFileName) {
        const fileBatch = db.prepare('SELECT * FROM lead_batches WHERE fileName = ? ORDER BY createdAt DESC').get(targetFileName) as any;
        if (fileBatch) targetBatchId = fileBatch.id;
      }

      if (targetFileName) {
        condition = '(batchId = ? OR notes LIKE ?)';
        params = [targetBatchId, `%${targetFileName}%`];
      } else {
        condition = 'batchId = ?';
        params = [targetBatchId];
      }
    }

    const counts = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('NOT_INTERESTED', 'REJECTED') AND status NOT IN ('CONVERTED', 'WON', 'INTERESTED', 'CALLBACK') THEN 1 ELSE 0 END) as notInterestedCount,
        SUM(CASE WHEN status IN ('CONVERTED', 'WON') THEN 1 ELSE 0 END) as wonCount,
        SUM(CASE WHEN status IN ('INTERESTED', 'CALLBACK') THEN 1 ELSE 0 END) as interestedCount,
        SUM(CASE WHEN status = 'PENDING' AND (callCount = 0 OR callCount IS NULL) THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status NOT IN ('NOT_INTERESTED', 'REJECTED', 'CONVERTED', 'WON', 'INTERESTED', 'CALLBACK', 'PENDING') THEN 1 ELSE 0 END) as otherCount
      FROM assigned_leads
      WHERE ${condition}
    `).get(...params) as any;

    // Get number of call logs associated with these phone numbers to show work credit guarantee
    let callLogsCount = { count: 0 };
    try {
      callLogsCount = db.prepare(`
        SELECT COUNT(*) as count FROM call_logs 
        WHERE phoneNumber IN (SELECT phone FROM assigned_leads WHERE ${condition} AND phone IS NOT NULL AND phone != '')
      `).get(...params) as any;
    } catch (cErr) {
      console.warn('[cleanup-preview] call_logs count notice:', cErr);
    }

    return res.status(200).json({
      batchId: id,
      total: Number(counts?.total || 0),
      notInterestedCount: Number(counts?.notInterestedCount || 0),
      wonCount: Number(counts?.wonCount || 0),
      interestedCount: Number(counts?.interestedCount || 0),
      pendingCount: Number(counts?.pendingCount || 0),
      otherCount: Number(counts?.otherCount || 0),
      protectedCount: Number(counts?.wonCount || 0) + Number(counts?.interestedCount || 0) + Number(counts?.pendingCount || 0),
      callLogsCount: Number(callLogsCount?.count || 0)
    });
  } catch (error) {
    console.error('[cleanup-preview error]:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/lead-batches/:id/monthly-cleanup
// Safely purges only NOT_INTERESTED leads while 100% protecting Won, Interested, Callbacks, and Unseen leads
router.post('/:id/monthly-cleanup', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const isAll = id.toLowerCase() === 'all';

    let condition = '1=1';
    let params: any[] = [];
    let targetBatchId = id;

    if (!isAll) {
      let targetFileName = req.body?.fileName ? String(req.body.fileName) : '';
      const batch = db.prepare('SELECT * FROM lead_batches WHERE id = ?').get(id) as any;
      if (batch) {
        targetBatchId = batch.id;
        if (!targetFileName && batch.fileName) targetFileName = batch.fileName;
      } else if (targetFileName) {
        const fileBatch = db.prepare('SELECT * FROM lead_batches WHERE fileName = ? ORDER BY createdAt DESC').get(targetFileName) as any;
        if (fileBatch) targetBatchId = fileBatch.id;
      }

      if (targetFileName) {
        condition = '(batchId = ? OR notes LIKE ?)';
        params = [targetBatchId, `%${targetFileName}%`];
      } else {
        condition = 'batchId = ?';
        params = [targetBatchId];
      }
    }

    // Identify target leads for safe removal
    const targetLeads = db.prepare(`
      SELECT id FROM assigned_leads
      WHERE ${condition}
        AND status IN ('NOT_INTERESTED', 'REJECTED')
        AND status NOT IN ('CONVERTED', 'WON', 'INTERESTED', 'CALLBACK')
    `).all(...params) as { id: string }[];

    const deletedLeadIds = targetLeads.map(l => l.id);

    if (deletedLeadIds.length > 0) {
      const cleanupTx = db.transaction(() => {
        // Delete in safe chunks of 500
        const chunkSize = 500;
        for (let i = 0; i < deletedLeadIds.length; i += chunkSize) {
          const chunk = deletedLeadIds.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => '?').join(',');
          db.prepare(`DELETE FROM assigned_leads WHERE id IN (${placeholders})`).run(...chunk);
        }
      });

      cleanupTx();

      // Physical disk reclamation
      try {
        db.pragma('wal_checkpoint(TRUNCATE)');
        db.prepare('VACUUM').run();
      } catch (vacuumErr) {
        console.warn('[monthly-cleanup] Vacuum notice:', vacuumErr);
      }

      // Broadcast real-time update to all panels
      emitSocketEvent('leads:cleaned', {
        batchId: targetBatchId,
        purgedCount: deletedLeadIds.length,
        deletedLeadIds
      });
    }

    return res.status(200).json({
      success: true,
      batchId: targetBatchId,
      purgedCount: deletedLeadIds.length,
      deletedLeadIds,
      message: `Successfully purged ${deletedLeadIds.length} 'Not Interested' leads. Won deals, Interested, Callbacks, and Unseen leads are 100% preserved.`
    });
  } catch (error) {
    console.error('[monthly-cleanup error]:', error);
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
