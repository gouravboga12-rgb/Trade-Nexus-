import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { zoomService } from '../services/zoomService.js';

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
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      id, 
      title, 
      dateTime, 
      type, 
      location, 
      attendeesCount, 
      agenda, 
      status, 
      meetingLink, 
      invitedMemberName,
      targetAudience,
      targetTeam,
      targetEmployeeId,
      createdByRole,
      priority,
      createZoom = true
    } = req.body;

    const meetingId = id || `mtg-${Date.now()}`;
    let zoomData: {
      id?: string;
      joinUrl?: string;
      startUrl?: string;
      password?: string;
      hostEmail?: string;
    } = {};

    // Auto-create Zoom meeting if requested or if location indicates Zoom / Video room
    const isZoomLocation = !location || location.toLowerCase().includes('zoom') || location.toLowerCase().includes('video') || location.toLowerCase().includes('in-app') || location.toLowerCase().includes('online');

    if (createZoom && isZoomLocation) {
      try {
        const zoomRes = await zoomService.createMeeting({
          topic: title || 'Trade Nexus Team Meeting',
          type: 2, // Scheduled
          agenda: agenda || `Meeting with ${invitedMemberName || 'Team'}`,
          duration: 60,
        });

        zoomData = {
          id: zoomRes.id,
          joinUrl: zoomRes.joinUrl,
          startUrl: zoomRes.startUrl,
          password: zoomRes.password,
          hostEmail: zoomRes.hostEmail,
        };
        console.log(`[Zoom API] Successfully created live Zoom meeting: ID ${zoomRes.id} for "${title}"`);
      } catch (zoomErr) {
        console.error('[Zoom API] Meeting creation fallback:', zoomErr);
      }
    }

    const finalJoinUrl = zoomData.joinUrl || meetingLink || `https://meet.tradenexus.io/room/${meetingId}`;

    db.prepare(`
      INSERT INTO team_meetings (
        id, title, dateTime, type, location, attendeesCount, agenda, status, 
        meetingLink, invitedMemberName, targetAudience, targetTeam, 
        targetEmployeeId, createdByRole, priority, zoomMeetingId, 
        zoomJoinUrl, zoomStartUrl, zoomPassword, zoomHostEmail
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      meetingId,
      title || 'Team Meeting',
      dateTime || 'Today',
      type || 'Team Discussion',
      location || (zoomData.joinUrl ? 'Zoom Video Room' : 'In-App Video Room'),
      attendeesCount ? Number(attendeesCount) : 6,
      agenda || '',
      status || 'UPCOMING',
      finalJoinUrl,
      invitedMemberName || null,
      targetAudience || 'ALL',
      targetTeam || null,
      targetEmployeeId || null,
      createdByRole || 'ADMIN',
      priority || 'NORMAL',
      zoomData.id || null,
      zoomData.joinUrl || null,
      zoomData.startUrl || null,
      zoomData.password || null,
      zoomData.hostEmail || null
    );

    const created = db.prepare('SELECT * FROM team_meetings WHERE id = ?').get(meetingId);
    return res.status(201).json(created);
  } catch (error) {
    console.error('[Team Meetings] Error creating meeting:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/team-meetings/instant (Instant Zoom Huddle)
router.post('/instant', async (req: Request, res: Response) => {
  try {
    const { title, hostRole, hostName, agenda, targetAudience, targetTeam } = req.body;
    const meetingId = `mtg-instant-${Date.now()}`;

    let zoomRes;
    try {
      zoomRes = await zoomService.createMeeting({
        topic: title || `Instant Huddle - ${hostName || 'Team'}`,
        type: 1, // Instant meeting
        agenda: agenda || 'Instant Live Collaboration Room',
        duration: 45,
      });
    } catch (err) {
      console.error('[Zoom Instant] API fallback:', err);
    }

    const finalJoinUrl = zoomRes?.joinUrl || `https://meet.tradenexus.io/room/${meetingId}`;

    db.prepare(`
      INSERT INTO team_meetings (
        id, title, dateTime, type, location, attendeesCount, agenda, status, 
        meetingLink, invitedMemberName, targetAudience, targetTeam, 
        createdByRole, priority, zoomMeetingId, zoomJoinUrl, 
        zoomStartUrl, zoomPassword, zoomHostEmail
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      meetingId,
      title || `Live Huddle: ${hostName || 'Team Sync'}`,
      'Live Now',
      'Team Standup',
      'Zoom Video Room',
      8,
      agenda || 'Instant live discussion room',
      'LIVE',
      finalJoinUrl,
      hostName || null,
      targetAudience || 'ALL',
      targetTeam || null,
      hostRole || 'ADMIN',
      'HIGH',
      zoomRes?.id || null,
      zoomRes?.joinUrl || null,
      zoomRes?.startUrl || null,
      zoomRes?.password || null,
      zoomRes?.hostEmail || null
    );

    const created = db.prepare('SELECT * FROM team_meetings WHERE id = ?').get(meetingId);
    return res.status(201).json(created);
  } catch (error) {
    console.error('[Team Meetings] Error starting instant huddle:', error);
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
      SET title = ?, dateTime = ?, type = ?, location = ?, attendeesCount = ?, 
          agenda = ?, status = ?, meetingLink = ?, invitedMemberName = ?,
          targetAudience = ?, targetTeam = ?, targetEmployeeId = ?, 
          createdByRole = ?, priority = ?, zoomMeetingId = ?, 
          zoomJoinUrl = ?, zoomStartUrl = ?, zoomPassword = ?, zoomHostEmail = ?
      WHERE id = ?
    `).run(
      merged.title,
      merged.dateTime,
      merged.type,
      merged.location,
      merged.attendeesCount,
      merged.agenda,
      merged.status,
      merged.meetingLink,
      merged.invitedMemberName,
      merged.targetAudience || 'ALL',
      merged.targetTeam || null,
      merged.targetEmployeeId || null,
      merged.createdByRole || null,
      merged.priority || 'NORMAL',
      merged.zoomMeetingId || null,
      merged.zoomJoinUrl || null,
      merged.zoomStartUrl || null,
      merged.zoomPassword || null,
      merged.zoomHostEmail || null,
      id
    );

    const updated = db.prepare('SELECT * FROM team_meetings WHERE id = ?').get(id);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/team-meetings/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM team_meetings WHERE id = ?').get(id) as any;

    if (existing?.zoomMeetingId) {
      try {
        await zoomService.deleteMeeting(existing.zoomMeetingId);
        console.log(`[Zoom API] Cleaned up Zoom meeting ID ${existing.zoomMeetingId}`);
      } catch (zoomErr) {
        console.warn(`[Zoom API] Failed to delete Zoom meeting ${existing.zoomMeetingId}:`, zoomErr);
      }
    }

    db.prepare('DELETE FROM team_meetings WHERE id = ?').run(id);
    return res.status(200).json({ success: true, message: 'Meeting deleted' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
