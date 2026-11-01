import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { getTodayDateIST } from '../utils/dateUtils.js';
import { emitSocketEvent } from '../services/socketService.js';
import { sendPushNotification } from '../services/notificationService.js';

const router = Router();

// GET /api/assigned-leads/stats — aggregate counters without transferring full table
router.get('/stats', (req: Request, res: Response) => {
  try {
    const user = req.user;
    let whereClause = '';
    const params: any[] = [];
    if (user && (user.role === 'telecaller' || user.role === 'employee')) {
      whereClause = 'WHERE assignedToEmployeeId = ? OR assignedToEmployeeId = ? OR LOWER(assignedToEmployeeName) = LOWER(?)';
      params.push(user.employeeId || user.id, user.empCode || '', user.name || '');
    }
    const counts = db.prepare(`
      SELECT 
        count(*) as total,
        sum(CASE WHEN status = 'CONVERTED' THEN 1 ELSE 0 END) as converted,
        sum(CASE WHEN status = 'INTERESTED' THEN 1 ELSE 0 END) as interested,
        sum(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as inProgress,
        sum(CASE WHEN status = 'NOT_INTERESTED' THEN 1 ELSE 0 END) as notInterested,
        sum(CASE WHEN status = 'PENDING' OR status IS NULL THEN 1 ELSE 0 END) as pending,
        sum(dealValue) as totalDealValue
      FROM assigned_leads
      ${whereClause}
    `).get(...params) as any;

    return res.status(200).json({
      total: counts?.total || 0,
      converted: counts?.converted || 0,
      interested: counts?.interested || 0,
      inProgress: counts?.inProgress || 0,
      notInterested: counts?.notInterested || 0,
      pending: counts?.pending || 0,
      totalDealValue: counts?.totalDealValue || 0,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/assigned-leads
router.get('/', (req: Request, res: Response) => {
  try {
    const user = req.user;
    const requestedEmpId = String(req.query.employeeId || '').trim();

    // 1. Telecaller / Employee: Strictly restricted to their own assigned leads
    if (user && (user.role === 'telecaller' || user.role === 'employee')) {
      const ownId = user.employeeId || user.id;
      const ownEmpCode = user.empCode || '';
      const leads = db.prepare(`
        SELECT * FROM assigned_leads 
        WHERE assignedToEmployeeId = ? OR assignedToEmployeeId = ? OR LOWER(assignedToEmployeeName) = LOWER(?)
        ORDER BY createdAt DESC
      `).all(ownId, ownEmpCode, user.name);
      return res.status(200).json(leads);
    }

    // 2. Team Leader: Restrict to reps in their team group
    if (user && user.role === 'team_leader') {
      const leader = db.prepare(`
        SELECT groupName FROM team_members 
        WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
        LIMIT 1
      `).get(user.employeeId || user.id, user.empCode || '', user.name) as any;

      const groupRow = db.prepare(`
        SELECT name FROM team_groups 
        WHERE LOWER(leaderName) = LOWER(?)
        LIMIT 1
      `).get(user.name) as any;

      const groupName = leader?.groupName || groupRow?.name;
      if (groupName) {
        const teamMemberRows = db.prepare('SELECT id, empCode, name FROM team_members WHERE LOWER(groupName) = LOWER(?)').all(groupName) as any[];
        const teamMemberIds = teamMemberRows.flatMap(m => [m.id, m.empCode, (m.name || '').toLowerCase()]);
        // Also add the leader's own identifiers
        if (user.employeeId) teamMemberIds.push(user.employeeId);
        if (user.empCode) teamMemberIds.push(user.empCode);
        teamMemberIds.push(user.name.toLowerCase());

        if (requestedEmpId) {
          if (!teamMemberIds.includes(requestedEmpId)) {
            return res.status(403).json({ error: 'Forbidden: Cannot access leads outside your assigned squad' });
          }
          const leads = db.prepare('SELECT * FROM assigned_leads WHERE assignedToEmployeeId = ? ORDER BY createdAt DESC').all(requestedEmpId);
          return res.status(200).json(leads);
        }

        if (teamMemberIds.length > 0) {
          const placeholders = teamMemberIds.map(() => '?').join(',');
          const leads = db.prepare(`
            SELECT * FROM assigned_leads 
            WHERE assignedToEmployeeId IN (${placeholders}) OR LOWER(assignedToEmployeeName) IN (${placeholders})
            ORDER BY createdAt DESC
          `).all(...teamMemberIds, ...teamMemberIds);
          return res.status(200).json(leads);
        }
        return res.status(200).json([]);
      } else {
        // No squad assigned: return only leader's own leads
        const ownId = user.employeeId || user.id;
        const leads = db.prepare('SELECT * FROM assigned_leads WHERE assignedToEmployeeId = ? OR LOWER(assignedToEmployeeName) = LOWER(?) ORDER BY createdAt DESC').all(ownId, user.name);
        return res.status(200).json(leads);
      }
    }

    // 3. Admin / HR (or fallback): Scoped query filter with default limit to prevent 50MB payload
    const batchId = String(req.query.batchId || '').trim();
    const search = String(req.query.search || '').trim();
    const all = req.query.all === 'true';
    const limit = req.query.limit ? Number(req.query.limit) : (all ? null : 500);

    let query = 'SELECT * FROM assigned_leads';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (requestedEmpId) {
      conditions.push('(assignedToEmployeeId = ? OR LOWER(assignedToEmployeeName) = LOWER(?))');
      queryParams.push(requestedEmpId, requestedEmpId);
    }
    if (batchId) {
      conditions.push('batchId = ?');
      queryParams.push(batchId);
    }
    if (search) {
      conditions.push('(name LIKE ? OR phone LIKE ? OR company LIKE ?)');
      const s = `%${search}%`;
      queryParams.push(s, s, s);
    }
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY createdAt DESC';
    if (limit) {
      query += ' LIMIT ?';
      queryParams.push(limit);
    }

    const leads = db.prepare(query).all(...queryParams);
    return res.status(200).json(leads);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/assigned-leads
router.post('/', (req: Request, res: Response) => {
  try {
    const { id, name, phone, email, company, city, assignedToEmployeeId, assignedToEmployeeName, batchId, assignedDate, status, notes, callCount, lastCallTimestamp, dealValue, followUpDate } = req.body;
    const leadId = id || `asg-${Date.now()}`;

    db.prepare(`
      INSERT INTO assigned_leads (id, name, phone, email, company, city, assignedToEmployeeId, assignedToEmployeeName, batchId, assignedDate, status, notes, callCount, lastCallTimestamp, dealValue, followUpDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      leadId, name || 'Lead', phone || '', email || '', company || 'Private Enterprise',
      city || 'Pan-India', assignedToEmployeeId || '', assignedToEmployeeName || 'Unassigned',
      batchId || 'batch-default', assignedDate || getTodayDateIST(), status || 'PENDING',
      notes || '', callCount ? Number(callCount) : 0, lastCallTimestamp || null,
      dealValue ? Number(dealValue) : 0, followUpDate || null
    );

    const created = db.prepare('SELECT * FROM assigned_leads WHERE id = ?').get(leadId);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/assigned-leads/bulk (For importing Excel / CSV leads)
router.post('/bulk', (req: Request, res: Response) => {
  try {
    const { fileName, targetEmployeeId, targetEmployeeName, leads } = req.body;
    const batchId = `batch-${Date.now()}`;

    // 1. Create batch
    db.prepare(`
      INSERT INTO lead_batches (id, fileName, uploadedAt, totalLeads, assignedToEmployeeName, assignedToEmployeeId)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      batchId, fileName || 'imported_leads.xlsx', 'Just now',
      Array.isArray(leads) ? leads.length : 0, targetEmployeeName || 'Employee', targetEmployeeId || null
    );

    // 2. Insert assigned leads in a transaction
    const insertLead = db.prepare(`
      INSERT INTO assigned_leads (id, name, phone, email, company, city, assignedToEmployeeId, assignedToEmployeeName, batchId, assignedDate, status, notes, callCount, dealValue)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((leadList: any[]) => {
      for (let i = 0; i < leadList.length; i++) {
        const lead = leadList[i];
        const trimmedName = String(lead.name || '').trim();
        const trimmedPhone = String(lead.phone || '').trim();
        if (!trimmedName || !trimmedPhone) {
          continue; // Safely skip invalid/incomplete rows
        }
        const leadId = lead.id || `asg-${Date.now()}-${i}`;
        const email = String(lead.email || '').trim();
        const company = String(lead.company || '').trim();
        const city = String(lead.city || '').trim();
        const now = new Date().toISOString();
        insertLead.run(
          leadId, trimmedName, trimmedPhone, email,
          company, city,
          targetEmployeeId, targetEmployeeName, batchId, getTodayDateIST(),
          'PENDING', `Imported via ${fileName}`, 0, 0
        );
      }
    });

    if (Array.isArray(leads) && leads.length > 0) {
      insertMany(leads);
    }

    const createdBatch = db.prepare('SELECT * FROM lead_batches WHERE id = ?').get(batchId);
    
    // Broadcast real-time push event to assigned employee and leaders
    emitSocketEvent('leads:assigned', {
      batchId,
      fileName: fileName || 'imported_leads.xlsx',
      targetEmployeeId: targetEmployeeId || null,
      targetEmployeeName: targetEmployeeName || 'Employee',
      count: Array.isArray(leads) ? leads.length : 0
    });

    if (targetEmployeeId) {
      sendPushNotification({
        targetUserId: targetEmployeeId,
        title: 'New Leads Assigned 📞',
        body: `Admin assigned ${Array.isArray(leads) ? leads.length : 0} new leads (${fileName || 'New batch'}).`,
        data: { targetTab: 'calling', batchId }
      }).catch(() => {});
    }

    // For large uploads (> 500 leads), avoid serializing 25MB JSON string which blocks event loop and swap
    if (Array.isArray(leads) && leads.length > 500) {
      return res.status(201).json({ 
        success: true, 
        count: leads.length, 
        batchId, 
        batch: createdBatch,
        isLargeBatch: true 
      });
    }

    const createdLeads = db.prepare('SELECT * FROM assigned_leads WHERE batchId = ?').all(batchId);
    return res.status(201).json({ success: true, batch: createdBatch, leads: createdLeads });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/assigned-leads/auto-distribute (Atomic high-speed server-side lead distribution)
router.post('/auto-distribute', (req: Request, res: Response) => {
  try {
    const { telecallers } = req.body;
    if (!Array.isArray(telecallers) || !telecallers.length) {
      return res.status(400).json({ error: 'telecallers array is required' });
    }

    const distributeTx = db.transaction(() => {
      // 1. First priority: leads that are explicitly unassigned
      let candidates = db.prepare(`
        SELECT id FROM assigned_leads
        WHERE assignedToEmployeeId IS NULL 
           OR assignedToEmployeeId = '' 
           OR assignedToEmployeeId = 'UNASSIGNED'
           OR assignedToEmployeeName = 'Unassigned'
        ORDER BY id ASC
      `).all() as { id: string }[];

      // 2. If no unassigned leads exist in the pool, fallback to fresh uncalled leads (callCount = 0)
      if (candidates.length === 0) {
        candidates = db.prepare(`
          SELECT id FROM assigned_leads
          WHERE (callCount = 0 OR callCount IS NULL) AND status != 'CONVERTED'
          ORDER BY id ASC
        `).all() as { id: string }[];
      }

      if (candidates.length === 0) {
        return { count: 0, totalCandidates: 0 };
      }

      const updateStmt = db.prepare(`
        UPDATE assigned_leads
        SET assignedToEmployeeId = ?, assignedToEmployeeName = ?, updatedAt = ?
        WHERE id = ?
      `);

      const now = new Date().toISOString();
      const perCaller = Math.ceil(candidates.length / telecallers.length);
      let updatedCount = 0;

      for (let i = 0; i < telecallers.length; i++) {
        const caller = telecallers[i];
        const callerId = String(caller.id || '');
        const callerName = String(caller.name || 'Telecaller');
        const chunk = candidates.slice(i * perCaller, (i + 1) * perCaller);
        
        for (const lead of chunk) {
          updateStmt.run(callerId, callerName, now, lead.id);
          updatedCount++;
        }
      }

      return { count: updatedCount, totalCandidates: candidates.length, callersCount: telecallers.length };
    });

    const result = distributeTx();
    emitSocketEvent('leads:distributed', result);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/assigned-leads/reassign-batch (Atomic bulk reassignment)
router.post('/reassign-batch', (req: Request, res: Response) => {
  try {
    const { leadIds, targetEmployeeId, targetEmployeeName } = req.body;
    if (!Array.isArray(leadIds) || !leadIds.length || !targetEmployeeId) {
      return res.status(400).json({ error: 'leadIds array and targetEmployeeId are required' });
    }

    const now = new Date().toISOString();
    const reassignMany = db.transaction((ids: string[], empId: string, empName: string) => {
      const stmt = db.prepare(`
        UPDATE assigned_leads 
        SET assignedToEmployeeId = ?, assignedToEmployeeName = ?, updatedAt = ?
        WHERE id = ?
      `);
      let updatedCount = 0;
      for (const id of ids) {
        const info = stmt.run(empId, empName, now, id);
        if (info.changes > 0) updatedCount++;
      }
      return updatedCount;
    });

    const count = reassignMany(leadIds, targetEmployeeId, targetEmployeeName || 'Employee');
    emitSocketEvent('leads:distributed', { count, targetEmployeeId });

    if (targetEmployeeId && count > 0) {
      sendPushNotification({
        targetUserId: targetEmployeeId,
        title: 'Leads Distributed to You 📞',
        body: `Admin allocated ${count} leads to your calling list.`,
        data: { targetTab: 'calling' }
      }).catch(() => {});
    }
    return res.status(200).json({ success: true, count, targetEmployeeId, targetEmployeeName });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/assigned-leads/reclaim (Undo assignment & return leads to unassigned pool)
router.post('/reclaim', (req: Request, res: Response) => {
  try {
    const { employeeId, batchId, leadIds, onlyFresh } = req.body;
    const freshOnly = onlyFresh !== false; // Default: true (reclaim fresh uncalled leads)
    const now = new Date().toISOString();

    const reclaimTx = db.transaction(() => {
      let query = `
        UPDATE assigned_leads 
        SET assignedToEmployeeId = '', assignedToEmployeeName = 'Unassigned', updatedAt = ?
        WHERE 1=1
      `;
      const params: any[] = [now];

      if (Array.isArray(leadIds) && leadIds.length > 0) {
        const placeholders = leadIds.map(() => '?').join(',');
        query += ` AND id IN (${placeholders})`;
        params.push(...leadIds);
      } else if (employeeId && batchId) {
        query += ` AND (assignedToEmployeeId = ? OR assignedToEmployeeName = ?) AND batchId = ?`;
        params.push(employeeId, employeeId, batchId);
      } else if (employeeId) {
        query += ` AND (assignedToEmployeeId = ? OR assignedToEmployeeName = ?)`;
        params.push(employeeId, employeeId);
      } else if (batchId) {
        query += ` AND batchId = ?`;
        params.push(batchId);
      } else {
        throw new Error('employeeId, batchId, or leadIds required for reclaim');
      }

      if (freshOnly) {
        query += ` AND callCount = 0 AND status = 'PENDING'`;
      }

      const stmt = db.prepare(query);
      const info = stmt.run(...params);
      return info.changes;
    });

    const count = reclaimTx();
    return res.status(200).json({ success: true, reclaimedCount: count });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/assigned-leads/bulk-delete (Bulk permanent delete for leads)
router.post('/bulk-delete', (req: Request, res: Response) => {
  try {
    const { leadIds, employeeId, batchId, onlyFresh } = req.body;
    const freshOnly = onlyFresh !== false;
    const freshCondition = `((callCount IS NULL OR callCount = 0) AND (status IS NULL OR status = '' OR status = 'PENDING' OR status = 'Pending' OR status = 'NEW' OR status = 'New'))`;

    const deleteTx = db.transaction(() => {
      let targets: string[] = [];

      let validEmpIds: string[] = [];
      let validEmpNames: string[] = [];
      if (employeeId) {
        const emp = db.prepare('SELECT id, empCode, name FROM team_members WHERE id = ? OR empCode = ? OR LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1').get(employeeId, employeeId, employeeId) as any;
        validEmpIds = Array.from(new Set([employeeId, emp?.id, emp?.empCode].filter(Boolean)));
        validEmpNames = Array.from(new Set([employeeId, emp?.name].filter(Boolean)));
      }

      if (Array.isArray(leadIds) && leadIds.length > 0) {
        targets = leadIds;
      } else if (employeeId && batchId) {
        const idPlaceholders = validEmpIds.map(() => '?').join(',');
        const nameConditions = validEmpNames.map(() => 'LOWER(TRIM(assignedToEmployeeName)) = LOWER(TRIM(?))').join(' OR ');
        let q = `SELECT id FROM assigned_leads WHERE (assignedToEmployeeId IN (${idPlaceholders}) ${nameConditions ? `OR ${nameConditions}` : ''}) AND batchId = ?`;
        if (freshOnly) q += ` AND ${freshCondition}`;
        const rows = db.prepare(q).all(...validEmpIds, ...validEmpNames, batchId) as any[];
        targets = rows.map((r) => r.id);
      } else if (employeeId) {
        const idPlaceholders = validEmpIds.map(() => '?').join(',');
        const nameConditions = validEmpNames.map(() => 'LOWER(TRIM(assignedToEmployeeName)) = LOWER(TRIM(?))').join(' OR ');
        let q = `SELECT id FROM assigned_leads WHERE (assignedToEmployeeId IN (${idPlaceholders}) ${nameConditions ? `OR ${nameConditions}` : ''})`;
        if (freshOnly) q += ` AND ${freshCondition}`;
        const rows = db.prepare(q).all(...validEmpIds, ...validEmpNames) as any[];
        targets = rows.map((r) => r.id);
      } else if (batchId) {
        let q = `SELECT id FROM assigned_leads WHERE batchId = ?`;
        if (freshOnly) q += ` AND ${freshCondition}`;
        const rows = db.prepare(q).all(batchId) as any[];
        targets = rows.map((r) => r.id);
      }

      if (!targets.length) {
        // If batchId was provided and no leads remain, clean up the empty batch record
        if (batchId) {
          try {
            db.prepare('DELETE FROM lead_batches WHERE id = ?').run(batchId);
          } catch (_) {}
        }
        return 0;
      }

      let deletedCount = 0;
      const deleteSingleLead = db.prepare('DELETE FROM assigned_leads WHERE id = ?');
      const deleteClientLead = db.prepare('DELETE FROM client_leads WHERE id = ?');
      const deleteCallLogs = db.prepare('DELETE FROM call_logs WHERE leadId = ?');
      const deletePayments = db.prepare('DELETE FROM payment_verifications WHERE id = ? OR utrNumber = ?');

      for (const id of targets) {
        deleteCallLogs.run(id);
        deletePayments.run(`pay-${id}`, `LEAD-${id}`);
        deleteClientLead.run(id);
        const res = deleteSingleLead.run(id);
        if (res.changes > 0) deletedCount++;
      }

      // If batchId was provided, update or delete the batch in lead_batches
      if (batchId) {
        try {
          const remaining = db.prepare('SELECT COUNT(*) as cnt FROM assigned_leads WHERE batchId = ?').get(batchId) as any;
          if (!remaining || remaining.cnt === 0 || !freshOnly) {
            db.prepare('DELETE FROM lead_batches WHERE id = ?').run(batchId);
          } else {
            db.prepare('UPDATE lead_batches SET totalLeads = ? WHERE id = ?').run(remaining.cnt, batchId);
          }
        } catch (bErr) {
          console.warn('[bulk-delete] lead_batches cleanup warning:', bErr);
        }
      }

      return deletedCount;
    });

    const count = deleteTx();
    return res.status(200).json({ success: true, deletedCount: count });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/assigned-leads/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM assigned_leads WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Assigned lead not found' });
    }

    const merged = { ...existing, ...req.body };
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE assigned_leads 
      SET name = ?, phone = ?, email = ?, company = ?, city = ?, 
          assignedToEmployeeId = ?, assignedToEmployeeName = ?, batchId = ?, 
          assignedDate = ?, status = ?, notes = ?, callCount = ?, 
          lastCallTimestamp = ?, dealValue = ?, followUpDate = ?,
          customerName = ?, customerPhone = ?, customerBankName = ?, customerAccountNumber = ?, customerIfscCode = ?, customerUpiId = ?,
          updatedAt = ?
      WHERE id = ?
    `).run(
      merged.name, merged.phone, merged.email, merged.company, merged.city,
      merged.assignedToEmployeeId, merged.assignedToEmployeeName, merged.batchId,
      merged.assignedDate, merged.status, merged.notes, merged.callCount,
      merged.lastCallTimestamp, merged.dealValue, merged.followUpDate,
      merged.customerName || merged.name || null, merged.customerPhone || merged.phone || null, merged.customerBankName || null,
      merged.customerAccountNumber || null, merged.customerIfscCode || null, merged.customerUpiId || null,
      now, id
    );

    // If deal converted, automatically ensure payment_verifications has a pending audit entry with customer details
    if (merged.status === 'CONVERTED' && merged.dealValue && merged.dealValue > 0) {
      try {
        const payId = `pay-${id}`;
        const cleanCompany = (merged.company || merged.name || 'Direct Client').trim();
        const callerName = (merged.assignedToEmployeeName || 'Employee').trim();
        const custPhone = (merged.customerPhone || merged.phone || '').trim();
        const existingPay = db.prepare(`
          SELECT id FROM payment_verifications 
          WHERE id = ? OR utrNumber = ? OR (
            LOWER(TRIM(COALESCE(companyName, leadName, ''))) = LOWER(TRIM(?)) AND
            LOWER(TRIM(COALESCE(telecallerName, ''))) = LOWER(TRIM(?)) AND
            dealAmount = ? AND
            status = 'PENDING_HR_AUDIT'
          )
        `).get(payId, `LEAD-${id}`, cleanCompany, callerName, merged.dealValue) as any;

        if (!existingPay) {
          db.prepare(`
            INSERT INTO payment_verifications (
              id, leadName, companyName, telecallerName, dealAmount, utrNumber, paymentMode, timestamp, status,
              customerName, customerPhone, customerBankName, customerAccountNumber, customerIfscCode, customerUpiId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            payId, merged.name, cleanCompany, callerName,
            merged.dealValue, `TXN-${id.slice(-6).toUpperCase()}`,
            merged.customerUpiId ? 'UPI Transfer' : 'Bank Wire / Transfer',
            getTodayDateIST(), 'PENDING_HR_AUDIT',
            merged.customerName || merged.name, custPhone || null, merged.customerBankName || null,
            merged.customerAccountNumber || null, merged.customerIfscCode || null, merged.customerUpiId || null
          );
          console.log(`[assignedLeads] Auto-created payment verification for won deal ${id}`);
        } else {
          // Update customer banking info if already exists
          db.prepare(`
            UPDATE payment_verifications
            SET customerName = COALESCE(?, customerName),
                customerPhone = COALESCE(?, customerPhone),
                customerBankName = COALESCE(?, customerBankName),
                customerAccountNumber = COALESCE(?, customerAccountNumber),
                customerIfscCode = COALESCE(?, customerIfscCode),
                customerUpiId = COALESCE(?, customerUpiId),
                dealAmount = ?
            WHERE id = ?
          `).run(
            merged.customerName || merged.name, custPhone || null, merged.customerBankName || null,
            merged.customerAccountNumber || null, merged.customerIfscCode || null, merged.customerUpiId || null,
            merged.dealValue, existingPay.id
          );
        }
      } catch (err) {
        console.warn('[assignedLeads] Failed to create payment verification for converted deal:', err);
      }
    }

    // Increment dials on team member if moving from PENDING
    if (existing.status === 'PENDING' && merged.status !== 'PENDING') {
      try {
        db.prepare(`
          UPDATE team_members
          SET dialsToday = dialsToday + 1
          WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
        `).run(merged.assignedToEmployeeId, merged.assignedToEmployeeId, merged.assignedToEmployeeName || '');
      } catch (err) {
        console.warn('[assignedLeads] Failed to increment team member dialsToday:', err);
      }
    }

    // Note: Converted deals create a payment verification item audited by HR/Admin.
    if (merged.status === 'INTERESTED') {
      try {
        db.prepare(`
          UPDATE team_members
          SET interested = interested + 1
          WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
        `).run(merged.assignedToEmployeeId, merged.assignedToEmployeeId, merged.assignedToEmployeeName || '');
      } catch (err) {
        console.warn('[assignedLeads] Failed to credit team member interested:', err);
      }
    }

    const updated = db.prepare('SELECT * FROM assigned_leads WHERE id = ?').get(id) as any;
    emitSocketEvent('lead:updated', updated);
    if (merged.status === 'CONVERTED') {
      emitSocketEvent('lead:converted', updated);
    }
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/assigned-leads/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let lead = db.prepare('SELECT * FROM assigned_leads WHERE id = ?').get(id) as any;
    let clientLead = db.prepare('SELECT * FROM client_leads WHERE id = ?').get(id) as any;

    if (!lead && !clientLead) {
      lead = db.prepare('SELECT * FROM assigned_leads WHERE phone = ? LIMIT 1').get(id) as any;
      clientLead = db.prepare('SELECT * FROM client_leads WHERE phone = ? LIMIT 1').get(id) as any;
    }

    if (!lead && !clientLead) {
      return res.status(404).json({ error: 'Lead not found in records' });
    }

    const effectiveLead = lead || clientLead;
    const leadPhone = effectiveLead.phone || '';
    const leadCompany = (effectiveLead.company || '').trim();
    const leadName = (effectiveLead.name || '').trim();
    const leadDealVal = effectiveLead.dealValue || 0;
    const batchId = effectiveLead.batchId;

    const deleteTransaction = db.transaction(() => {
      // 1. If lead was converted, remove or roll back corresponding payment verification
      try {
        const queryParams: any[] = [`pay-${id}`, `LEAD-${id}`];
        let queryCondition = `id = ? OR utrNumber = ?`;

        if (leadCompany || leadName) {
          queryCondition += ` OR (
            LOWER(TRIM(COALESCE(companyName, leadName, ''))) = LOWER(TRIM(?)) AND
            dealAmount = ?
          )`;
          queryParams.push(leadCompany || leadName, leadDealVal);
        }

        const linkedPayments = db.prepare(`SELECT * FROM payment_verifications WHERE ${queryCondition}`).all(...queryParams) as any[];

        for (const p of linkedPayments) {
          if (p.status === 'VERIFIED') {
            const caller = db.prepare('SELECT id, groupName FROM team_members WHERE LOWER(name) = LOWER(?) LIMIT 1').get(p.telecallerName || effectiveLead.assignedToEmployeeName) as any;
            if (caller) {
              db.prepare('UPDATE team_members SET salesAchieved = MAX(0, salesAchieved - ?) WHERE id = ?').run(p.dealAmount, caller.id);
              if (caller.groupName) {
                db.prepare('UPDATE team_groups SET achieved = MAX(0, achieved - ?) WHERE LOWER(name) = LOWER(?)').run(p.dealAmount, caller.groupName);
              }
            }
          }
          db.prepare('DELETE FROM payment_verifications WHERE id = ?').run(p.id);
        }
      } catch (e) {
        console.warn('[assignedLeads.delete] Linked payment cleanup warning:', e);
      }

      // 2. Remove associated call logs
      try {
        db.prepare('DELETE FROM call_logs WHERE leadId = ? OR (clientPhone IS NOT NULL AND clientPhone != "" AND clientPhone = ?)').run(id, leadPhone);
      } catch (err) {}

      // 3. Delete from assigned_leads and client_leads
      db.prepare('DELETE FROM assigned_leads WHERE id = ?').run(id);
      db.prepare('DELETE FROM client_leads WHERE id = ?').run(id);

      // 4. Update totalLeads on lead_batches if batchId exists
      if (batchId) {
        try {
          const remaining = db.prepare('SELECT COUNT(*) as cnt FROM assigned_leads WHERE batchId = ?').get(batchId) as any;
          if (!remaining || remaining.cnt === 0) {
            db.prepare('DELETE FROM lead_batches WHERE id = ?').run(batchId);
          } else {
            db.prepare('UPDATE lead_batches SET totalLeads = ? WHERE id = ?').run(remaining.cnt, batchId);
          }
        } catch (err) {}
      }
    });

    deleteTransaction();

    return res.status(200).json({ success: true, id });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
