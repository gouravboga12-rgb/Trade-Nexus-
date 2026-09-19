import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/payments
router.get('/', (req: Request, res: Response) => {
  try {
    const user = req.user;

    // 1. Telecaller / Employee: Strictly restricted to their own closed deals
    if (user && (user.role === 'telecaller' || user.role === 'employee')) {
      const ownName = user.name || '';
      const payments = db.prepare(`
        SELECT * FROM payment_verifications 
        WHERE LOWER(telecallerName) = LOWER(?)
        ORDER BY createdAt DESC
      `).all(ownName);
      return res.status(200).json(payments);
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
          return res.status(200).json(payments);
        }
        return res.status(200).json([]);
      } else {
        const payments = db.prepare(`
          SELECT * FROM payment_verifications 
          WHERE LOWER(telecallerName) = LOWER(?)
          ORDER BY createdAt DESC
        `).all(user.name);
        return res.status(200).json(payments);
      }
    }

    // 3. Admin / HR: Full master payment ledger
    const payments = db.prepare('SELECT * FROM payment_verifications ORDER BY createdAt DESC').all();
    return res.status(200).json(payments);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/payments
router.post('/', (req: Request, res: Response) => {
  try {
    const { id, leadName, companyName, telecallerName, dealAmount, utrNumber, paymentMode, timestamp, status, receiptUrl } = req.body;
    const payId = id || `pay-${Date.now()}`;
    const callerName = telecallerName || req.user?.name || 'Employee';

    db.prepare(`
      INSERT INTO payment_verifications (id, leadName, companyName, telecallerName, dealAmount, utrNumber, paymentMode, timestamp, status, receiptUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payId, leadName || 'Client', companyName || 'Company', callerName,
      dealAmount ? Number(dealAmount) : 0, utrNumber || `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      paymentMode || 'Online Bank Transfer', timestamp || 'Just now',
      status || 'PENDING_HR_AUDIT', receiptUrl || null
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

export default router;
