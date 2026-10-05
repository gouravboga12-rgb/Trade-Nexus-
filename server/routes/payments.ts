import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/payments
router.get('/', (req: Request, res: Response) => {
  try {
    const user = req.user;

    // Helper to deduplicate payments
    const dedupe = (list: any[]) => {
      const seen = new Set<string>();
      return list.filter((p) => {
        const key = `${(p.companyName || p.leadName || '').trim().toLowerCase()}_${(p.telecallerName || '').trim().toLowerCase()}_${p.dealAmount}_${p.status}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    // 1. Telecaller / Employee: Strictly restricted to their own closed deals
    if (user && (user.role === 'telecaller' || user.role === 'employee')) {
      const ownName = user.name || '';
      const payments = db.prepare(`
        SELECT * FROM payment_verifications 
        WHERE LOWER(telecallerName) = LOWER(?)
        ORDER BY createdAt DESC
      `).all(ownName);
      return res.status(200).json(dedupe(payments));
    }

    // 2. Team Leader: Restrict to members in their team group / squad
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
        const teamMemberRows = db.prepare('SELECT name FROM team_members WHERE LOWER(groupName) = LOWER(?)').all(groupName) as any[];
        const memberNames = teamMemberRows.map(m => (m.name || '').toLowerCase()).filter(Boolean);
        memberNames.push(user.name.toLowerCase());

        if (memberNames.length > 0) {
          const placeholders = memberNames.map(() => '?').join(',');
          const payments = db.prepare(`
            SELECT * FROM payment_verifications 
            WHERE LOWER(telecallerName) IN (${placeholders})
            ORDER BY createdAt DESC
          `).all(...memberNames);
          return res.status(200).json(dedupe(payments));
        }
        return res.status(200).json([]);
      } else {
        const payments = db.prepare(`
          SELECT * FROM payment_verifications 
          WHERE LOWER(telecallerName) = LOWER(?)
          ORDER BY createdAt DESC
        `).all(user.name);
        return res.status(200).json(dedupe(payments));
      }
    }

    // 3. Admin / HR: Full master payment ledger
    const payments = db.prepare('SELECT * FROM payment_verifications ORDER BY createdAt DESC').all();
    return res.status(200).json(dedupe(payments));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/payments
router.post('/', (req: Request, res: Response) => {
  try {
    const { 
      id, leadName, companyName, telecallerName, dealAmount, utrNumber, paymentMode, timestamp, status, receiptUrl,
      customerName, customerBankName, customerAccountNumber, customerIfscCode, customerUpiId
    } = req.body;
    const payId = id || `pay-${Date.now()}`;
    const callerName = telecallerName || req.user?.name || 'Employee';
    const cleanCompany = (companyName || leadName || 'Company').trim();
    const amount = dealAmount ? Number(dealAmount) : 0;

    // Check if an existing pending payment matches to prevent duplicates
    const existing = db.prepare(`
      SELECT id FROM payment_verifications 
      WHERE id = ? OR (
        LOWER(TRIM(COALESCE(companyName, leadName, ''))) = LOWER(TRIM(?)) AND
        LOWER(TRIM(COALESCE(telecallerName, ''))) = LOWER(TRIM(?)) AND
        dealAmount = ? AND
        status = 'PENDING_HR_AUDIT'
      )
    `).get(payId, cleanCompany, callerName, amount) as any;

    if (existing) {
      db.prepare(`
        UPDATE payment_verifications
        SET customerName = COALESCE(?, customerName),
            customerBankName = COALESCE(?, customerBankName),
            customerAccountNumber = COALESCE(?, customerAccountNumber),
            customerIfscCode = COALESCE(?, customerIfscCode),
            customerUpiId = COALESCE(?, customerUpiId),
            utrNumber = COALESCE(?, utrNumber),
            paymentMode = COALESCE(?, paymentMode),
            dealAmount = ?
        WHERE id = ?
      `).run(
        customerName || leadName || null, customerBankName || null,
        customerAccountNumber || null, customerIfscCode || null, customerUpiId || null,
        utrNumber || null, paymentMode || null,
        amount, existing.id
      );
      const updated = db.prepare('SELECT * FROM payment_verifications WHERE id = ?').get(existing.id);
      return res.status(200).json(updated);
    }

    db.prepare(`
      INSERT INTO payment_verifications (
        id, leadName, companyName, telecallerName, dealAmount, utrNumber, paymentMode, timestamp, status, receiptUrl,
        customerName, customerBankName, customerAccountNumber, customerIfscCode, customerUpiId
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payId, leadName || customerName || 'Client', cleanCompany, callerName,
      amount, utrNumber || `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      paymentMode || (customerUpiId ? 'UPI Transfer' : 'Online Bank Transfer'), timestamp || 'Just now',
      status || 'PENDING_HR_AUDIT', receiptUrl || null,
      customerName || leadName || null, customerBankName || null, customerAccountNumber || null,
      customerIfscCode || null, customerUpiId || null
    );

    const created = db.prepare('SELECT * FROM payment_verifications WHERE id = ?').get(payId);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/payments/:id (Audit & verification restricted to Admin / HR)
router.put('/:id', requireRole('admin', 'hr'), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM payment_verifications WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Payment verification not found' });
    }

    const merged = { ...existing, ...req.body };
    const amount = Number(merged.dealAmount) || 0;
    const telecallerName = merged.telecallerName || existing.telecallerName;

    const syncTransaction = db.transaction(() => {
      db.prepare(`
        UPDATE payment_verifications 
        SET leadName = ?, companyName = ?, telecallerName = ?, dealAmount = ?, 
            utrNumber = ?, paymentMode = ?, timestamp = ?, status = ?, receiptUrl = ?
        WHERE id = ?
      `).run(
        merged.leadName, merged.companyName, merged.telecallerName, merged.dealAmount,
        merged.utrNumber, merged.paymentMode, merged.timestamp, merged.status,
        merged.receiptUrl, id
      );

      // Attribution Sync: propagate verified payment to employee and squad
      if (merged.status === 'VERIFIED' && existing.status !== 'VERIFIED') {
        const member = db.prepare('SELECT id, groupName FROM team_members WHERE LOWER(name) = LOWER(?) LIMIT 1').get(telecallerName) as any;
        if (member) {
          db.prepare('UPDATE team_members SET salesAchieved = salesAchieved + ? WHERE id = ?').run(amount, member.id);
          if (member.groupName) {
            db.prepare('UPDATE team_groups SET achieved = achieved + ? WHERE LOWER(name) = LOWER(?)').run(amount, member.groupName);
          }
        }
      } else if (merged.status === 'REJECTED' && existing.status === 'VERIFIED') {
        const member = db.prepare('SELECT id, groupName FROM team_members WHERE LOWER(name) = LOWER(?) LIMIT 1').get(telecallerName) as any;
        if (member) {
          db.prepare('UPDATE team_members SET salesAchieved = MAX(0, salesAchieved - ?) WHERE id = ?').run(amount, member.id);
          if (member.groupName) {
            db.prepare('UPDATE team_groups SET achieved = MAX(0, achieved - ?) WHERE LOWER(name) = LOWER(?)').run(amount, member.groupName);
          }
        }
      }
    });

    syncTransaction();

    const updated = db.prepare('SELECT * FROM payment_verifications WHERE id = ?').get(id);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/payments/:id
router.delete('/:id', requireRole('admin', 'hr'), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM payment_verifications WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Payment verification not found' });
    }

    const deleteTransaction = db.transaction(() => {
      // If payment was verified, rollback salesAchieved from employee and team group
      if (existing.status === 'VERIFIED') {
        const amount = Number(existing.dealAmount) || 0;
        const callerName = existing.telecallerName || '';
        const member = db.prepare('SELECT id, groupName FROM team_members WHERE LOWER(name) = LOWER(?) LIMIT 1').get(callerName) as any;
        if (member) {
          db.prepare('UPDATE team_members SET salesAchieved = MAX(0, salesAchieved - ?) WHERE id = ?').run(amount, member.id);
          if (member.groupName) {
            db.prepare('UPDATE team_groups SET achieved = MAX(0, achieved - ?) WHERE LOWER(name) = LOWER(?)').run(amount, member.groupName);
          }
        }
      }

      // If linked to an assigned_lead that was CONVERTED, reset status to INTERESTED and clear dealValue
      try {
        const leadId = id.startsWith('pay-') ? id.slice(4) : '';
        const linkedLead = db.prepare(`
          SELECT id FROM assigned_leads 
          WHERE id = ? OR (
            LOWER(TRIM(COALESCE(company, name, ''))) = LOWER(TRIM(?)) AND
            dealValue = ? AND
            status = 'CONVERTED'
          )
          LIMIT 1
        `).get(leadId, (existing.companyName || existing.leadName || '').trim(), existing.dealAmount) as any;

        if (linkedLead) {
          db.prepare(`UPDATE assigned_leads SET status = 'INTERESTED', dealValue = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(linkedLead.id);
        }
      } catch (err) {}

      db.prepare('DELETE FROM payment_verifications WHERE id = ?').run(id);
    });

    deleteTransaction();

    return res.status(200).json({ success: true, id });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
