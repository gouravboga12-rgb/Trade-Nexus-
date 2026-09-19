import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

// GET /api/team-tasks
router.get('/', (req: Request, res: Response) => {
  try {
    const user = req.user;

    // Team Leader: Scoped to their assigned squad tasks
    if (user && user.role === 'team_leader') {
      const leaderId = user.employeeId || user.id;
      const leaderEmpCode = user.empCode || '';
      const leaderName = user.name || '';

      const leaderRow = db.prepare(`
        SELECT groupName FROM team_members 
        WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
        LIMIT 1
      `).get(leaderId, leaderEmpCode, leaderName) as any;
      const groupRow = db.prepare('SELECT name FROM team_groups WHERE LOWER(leaderName) = LOWER(?) LIMIT 1').get(leaderName) as any;
      const squadName = leaderRow?.groupName || groupRow?.name || '';

      const tasks = db.prepare(`
        SELECT id, title, assignedTo, groupName as "group", dueDate, priority, status 
        FROM team_tasks 
        WHERE LOWER(groupName) = LOWER(?) OR LOWER(assignedTo) = LOWER(?)
        ORDER BY createdAt DESC
      `).all(squadName, leaderName);
      return res.status(200).json(tasks);
    }

    const tasks = db.prepare('SELECT id, title, assignedTo, groupName as "group", dueDate, priority, status FROM team_tasks ORDER BY createdAt DESC').all();
    return res.status(200).json(tasks);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/team-tasks
router.post('/', (req: Request, res: Response) => {
  try {
    const { id, title, assignedTo, group, dueDate, priority, status } = req.body;
    const taskId = id || `task-${Date.now()}`;

    db.prepare(`
      INSERT INTO team_tasks (id, title, assignedTo, groupName, dueDate, priority, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      taskId, title || 'Task', assignedTo || 'Member', group || null,
      dueDate || 'Today', priority || 'NORMAL', status || 'PENDING'
    );

    const created = db.prepare('SELECT id, title, assignedTo, groupName as "group", dueDate, priority, status FROM team_tasks WHERE id = ?').get(taskId);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/team-tasks/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT id, title, assignedTo, groupName as "group", dueDate, priority, status FROM team_tasks WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Team task not found' });
    }

    const user = req.user;
    if (user && user.role === 'team_leader') {
      const leaderName = user.name || '';
      const leaderRow = db.prepare(`
        SELECT groupName FROM team_members 
        WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
        LIMIT 1
      `).get(user.employeeId || user.id, user.empCode || '', leaderName) as any;
      const groupRow = db.prepare('SELECT name FROM team_groups WHERE LOWER(leaderName) = LOWER(?) LIMIT 1').get(leaderName) as any;
      const squadName = leaderRow?.groupName || groupRow?.name || '';

      const taskGroup = existing.group || '';
      if (squadName && taskGroup.toLowerCase() !== squadName.toLowerCase() && existing.assignedTo.toLowerCase() !== leaderName.toLowerCase()) {
        return res.status(403).json({ error: 'Forbidden: Team Leader cannot modify tasks outside assigned squad' });
      }
    }

    const merged = { ...existing, ...req.body };
    db.prepare(`
      UPDATE team_tasks 
      SET title = ?, assignedTo = ?, groupName = ?, dueDate = ?, priority = ?, status = ?
      WHERE id = ?
    `).run(
      merged.title, merged.assignedTo, merged.group, merged.dueDate,
      merged.priority, merged.status, id
    );

    const updated = db.prepare('SELECT id, title, assignedTo, groupName as "group", dueDate, priority, status FROM team_tasks WHERE id = ?').get(id);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
