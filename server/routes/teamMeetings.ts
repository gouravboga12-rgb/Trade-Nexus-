import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

// GET /api/team-meetings
router.get('/', (req: Request, res: Response) => {
  try {
    const meetings = db.prepare('SELECT * FROM team_meetings ORDER BY createdAt DESC').all();
    return res.status(200).json(meetings);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/team-meetings
router.post('/', (req: Request, res: Response) => {
  try {
    const { id, title, dateTime, type, location, attendeesCount, agenda, status, meetingLink, invitedMemberName } = req.body;
    const meetingId = id || `mtg-${Date.now()}`;

    db.prepare(`
      INSERT INTO team_meetings (id, title, dateTime, type, location, attendeesCount, agenda, status, meetingLink, invitedMemberName)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      meetingId, title || 'Team Meeting', dateTime || 'Today', type || 'Team Discussion',
      location || 'In-App Video Room', attendeesCount ? Number(attendeesCount) : 6, agenda || '',
      status || 'UPCOMING', meetingLink || `https://meet.tradenexus.io/room/${meetingId}`, invitedMemberName || null
    );

    const created = db.prepare('SELECT * FROM team_meetings WHERE id = ?').get(meetingId);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/team-meetings/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM team_meetings WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const merged = { ...existing, ...req.body };
    db.prepare(`
      UPDATE team_meetings 
      SET title = ?, dateTime = ?, type = ?, location = ?, attendeesCount = ?, agenda = ?, status = ?, meetingLink = ?, invitedMemberName = ?
      WHERE id = ?
    `).run(
      merged.title, merged.dateTime, merged.type, merged.location,
      merged.attendeesCount, merged.agenda, merged.status, merged.meetingLink, merged.invitedMemberName, id
    );

    const updated = db.prepare('SELECT * FROM team_meetings WHERE id = ?').get(id);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/team-meetings/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM team_meetings WHERE id = ?').run(id);
    return res.status(200).json({ success: true, message: 'Meeting deleted' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
