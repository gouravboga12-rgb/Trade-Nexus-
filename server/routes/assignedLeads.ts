import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { getTodayDateIST } from '../utils/dateUtils.js';

const router = Router();

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

    // 3. Admin / HR (or fallback): Full access or query filter
    const leads = requestedEmpId
      ? db.prepare('SELECT * FROM assigned_leads WHERE assignedToEmployeeId = ? ORDER BY createdAt DESC').all(requestedEmpId)
      : db.prepare('SELECT * FROM assigned_leads ORDER BY createdAt DESC').all();
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
    const createdLeads = db.prepare('SELECT * FROM assigned_leads WHERE batchId = ?').all(batchId);

    return res.status(201).json({ batch: createdBatch, leads: createdLeads });
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
    return res.status(200).json({ success: true, count, targetEmployeeId, targetEmployeeName });
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

    const updated = db.prepare('SELECT * FROM assigned_leads WHERE id = ?').get(id);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/assigned-leads/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = db.prepare('SELECT * FROM assigned_leads WHERE id = ?').get(id) as any;
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const deleteTransaction = db.transaction(() => {
      // 1. If lead was converted, remove or roll back corresponding payment verification
      try {
        const linkedPayments = db.prepare(`
          SELECT * FROM payment_verifications 
          WHERE id = ? OR utrNumber = ? OR (
            LOWER(TRIM(COALESCE(companyName, leadName, ''))) = LOWER(TRIM(?)) AND
            dealAmount = ?
          )
        `).all(`pay-${id}`, `LEAD-${id}`, (lead.company || lead.name || '').trim(), lead.dealValue || 0) as any[];

        for (const p of linkedPayments) {
          if (p.status === 'VERIFIED') {
            const caller = db.prepare('SELECT id, groupName FROM team_members WHERE LOWER(name) = LOWER(?) LIMIT 1').get(p.telecallerName || lead.assignedToEmployeeName) as any;
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
        db.prepare('DELETE FROM call_logs WHERE leadId = ? OR (clientPhone IS NOT NULL AND clientPhone != "" AND clientPhone = ?)').run(id, lead.phone || '');
      } catch (err) {}

      // 3. Delete from assigned_leads
      db.prepare('DELETE FROM assigned_leads WHERE id = ?').run(id);

      // 4. Update totalLeads on lead_batches if batchId exists
      if (lead.batchId) {
        try {
          db.prepare('UPDATE lead_batches SET totalLeads = MAX(0, totalLeads - 1) WHERE id = ?').run(lead.batchId);
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
