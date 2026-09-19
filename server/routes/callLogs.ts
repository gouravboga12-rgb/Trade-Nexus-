import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

// GET /api/call-logs
router.get('/', (req: Request, res: Response) => {
  try {
    const user = req.user;
    const requestedEmpId = String(req.query.employeeId || '').trim();

    // 1. Telecaller / Employee: Strictly restricted to their own call logs
    if (user && (user.role === 'telecaller' || user.role === 'employee')) {
      const ownId = user.employeeId || user.id;
      const ownEmpCode = user.empCode || '';
      const logs = db.prepare(`
        SELECT * FROM call_logs 
        WHERE employeeId = ? OR employeeId = ?
        ORDER BY createdAt DESC
      `).all(ownId, ownEmpCode);
      return res.status(200).json(logs);
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
        const teamMemberRows = db.prepare('SELECT id, empCode FROM team_members WHERE LOWER(groupName) = LOWER(?)').all(groupName) as any[];
        const teamMemberIds = teamMemberRows.flatMap(m => [m.id, m.empCode].filter(Boolean));
        if (user.employeeId) teamMemberIds.push(user.employeeId);
        if (user.empCode) teamMemberIds.push(user.empCode);
        teamMemberIds.push(user.id);

        if (requestedEmpId) {
          if (!teamMemberIds.includes(requestedEmpId)) {
            return res.status(403).json({ error: 'Forbidden: Cannot access call logs outside your assigned squad' });
          }
          const logs = db.prepare('SELECT * FROM call_logs WHERE employeeId = ? ORDER BY createdAt DESC').all(requestedEmpId);
          return res.status(200).json(logs);
        }

        if (teamMemberIds.length > 0) {
          const placeholders = teamMemberIds.map(() => '?').join(',');
          const logs = db.prepare(`
            SELECT * FROM call_logs 
            WHERE employeeId IN (${placeholders})
            ORDER BY createdAt DESC
          `).all(...teamMemberIds);
          return res.status(200).json(logs);
        }
        return res.status(200).json([]);
      } else {
        const ownId = user.employeeId || user.id;
        const logs = db.prepare('SELECT * FROM call_logs WHERE employeeId = ? ORDER BY createdAt DESC').all(ownId);
        return res.status(200).json(logs);
      }
    }

    // 3. Admin / HR: Full access or query filter
    const logs = requestedEmpId
      ? db.prepare('SELECT * FROM call_logs WHERE employeeId = ? ORDER BY createdAt DESC').all(requestedEmpId)
      : db.prepare('SELECT * FROM call_logs ORDER BY createdAt DESC').all();
    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/call-logs
router.post('/', (req: Request, res: Response) => {
  try {
    const { id, clientName, companyName, phoneNumber, timestamp, durationSec, outcome, notes, followUpDate, employeeId } = req.body;
    const logId = id || `call-${Date.now()}`;
    const duration = durationSec !== undefined ? Number(durationSec) : 0;
    const time = timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const empId = employeeId || req.user?.employeeId || req.user?.id || null;

    db.prepare(`
      INSERT INTO call_logs (id, clientName, companyName, phoneNumber, timestamp, durationSec, outcome, notes, followUpDate, employeeId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId, clientName || 'Unknown Client', companyName || 'Company', phoneNumber || '',
      time, duration, outcome || 'CONNECTED', notes || '', followUpDate || null,
      empId
    );

    const created = db.prepare('SELECT * FROM call_logs WHERE id = ?').get(logId);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/call-logs/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM call_logs WHERE id = ?').run(id);
    return res.status(200).json({ success: true, message: 'Call log deleted' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
