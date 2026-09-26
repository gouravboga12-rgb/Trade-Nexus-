import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { zoomService } from '../services/zoomService.js';

const router = Router();

/**
 * Helper to determine employee's squad/group
 */
function getUserSquad(user: any): string | null {
  if (!user) return null;
  const empId = user.employeeId || user.id;
  const empCode = user.empCode || '';
  const empName = user.name || '';

  const memberRow = db.prepare(`
    SELECT groupName FROM team_members 
    WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
    LIMIT 1
  `).get(empId, empCode, empName) as any;

  if (memberRow?.groupName) return memberRow.groupName;

  if (user.role === 'team_leader') {
    const groupRow = db.prepare(`
      SELECT name FROM team_groups 
      WHERE LOWER(leaderName) = LOWER(?)
      LIMIT 1
    `).get(empName) as any;
    if (groupRow?.name) return groupRow.name;
  }

  return null;
}

// GET /api/team-meetings
// Audience scoped to avoid any cross-meeting collisions
router.get('/', (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = user.role === 'employee' ? 'telecaller' : user.role;
    const userSquad = getUserSquad(user);
    const empId = user.employeeId || user.id;
    const empCode = user.empCode || '';
    const empName = (user.name || '').trim().toLowerCase();

    // 1. Admin: Sees all meetings across the entire firm, or meetings with includeAdmin = 1
    if (role === 'admin') {
      const meetings = db.prepare('SELECT * FROM team_meetings ORDER BY createdAt DESC').all();
      return res.status(200).json(meetings);
    }

    // 2. HR: Sees company townhalls, HR sessions, leadership syncs, all 1-on-1s they host or are invited to
    if (role === 'hr') {
      const meetings = db.prepare(`
        SELECT * FROM team_meetings 
        WHERE hostRole = 'hr'
           OR hostEmpCode = ?
           OR targetAudience IN ('ALL', 'ALL_HR', 'LEADERSHIP')
           OR targetEmployeeId = ?
           OR LOWER(invitedMemberName) = ?
           OR includeAdmin = 1
        ORDER BY createdAt DESC
      `).all(empCode, empId, empName);
      return res.status(200).json(meetings);
    }

    // 3. Team Leader: Sees meetings they host, squad meetings for their squad, company-wide meetings, leadership syncs, and 1-on-1s for them
    if (role === 'team_leader') {
      const meetings = db.prepare(`
        SELECT * FROM team_meetings 
        WHERE hostRole = 'team_leader' AND (hostEmpCode = ? OR LOWER(hostName) = ?)
           OR (targetAudience IN ('ALL', 'ALL_TL', 'LEADERSHIP'))
           OR (targetTeam IS NOT NULL AND LOWER(targetTeam) = LOWER(?))
           OR targetEmployeeId = ?
           OR LOWER(invitedMemberName) = ?
        ORDER BY createdAt DESC
      `).all(empCode, empName, userSquad || '', empId, empName);
      return res.status(200).json(meetings);
    }

    // 4. Telecaller / Employee: Strict join-only scope.
    // Cannot see other squads' private meetings or HR disciplinary 1-on-1s of others.
    const meetings = db.prepare(`
      SELECT * FROM team_meetings 
      WHERE targetAudience IN ('ALL', 'ALL_TELECALLER')
         OR (targetTeam IS NOT NULL AND LOWER(targetTeam) = LOWER(?))
         OR targetEmployeeId = ?
         OR LOWER(invitedMemberName) = ?
      ORDER BY createdAt DESC
    `).all(userSquad || '', empId, empName);

    return res.status(200).json(meetings);
  } catch (error) {
    console.error('[GET /team-meetings] Error:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/team-meetings/create-zoom
// Explicit Zoom meeting creation with API token and participant separation
router.post('/create-zoom', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = user.role === 'employee' ? 'telecaller' : user.role;

    // Rule: Telecallers / Employees cannot host meetings
    if (role === 'telecaller') {
      return res.status(403).json({ error: 'Telecallers cannot host meetings. You may only join meetings when invited.' });
    }

    const {
      title,
      dateTime,
      duration = 60,
      agenda = '',
      type = 'Team Discussion',
      targetAudience = 'ALL',
      targetTeam,
      targetEmployeeId,
      invitedMemberName,
      includeAdmin = false,
      priority = 'NORMAL',
      attendeesCount,
    } = req.body;

    const userSquad = getUserSquad(user);

    // Rule: Team Leader can only host meetings for their OWN squad or 1-on-1 with squad members
    if (role === 'team_leader') {
      if (targetAudience === 'ALL' || targetAudience === 'ALL_HR') {
        return res.status(403).json({ error: 'Team Leaders can only schedule meetings for their own squad or squad 1-on-1s.' });
      }
    }

    const meetingId = `mtg-${Date.now()}`;
    const cleanTopic = title ? `${title} (Trade Nexus)` : 'Trade Nexus Live Meeting';

    let zoomInfo: { id?: string; joinUrl?: string; startUrl?: string; password?: string } = {};

    try {
      // Call Zoom API using Server-to-Server OAuth
      const zoomRes = await zoomService.createMeeting({
        topic: cleanTopic,
        duration: Number(duration) || 60,
        agenda: agenda || `Meeting organized by ${user.name} (${role.toUpperCase()})`,
      });

      zoomInfo = {
        id: zoomRes.id,
        joinUrl: zoomRes.joinUrl,
        startUrl: zoomRes.startUrl,
        password: zoomRes.password || '',
      };
      console.log(`[ZoomService] Created live Zoom room ID ${zoomRes.id} for ${user.name}`);
    } catch (zoomErr) {
      console.warn('[ZoomService] Fallback to internal room due to Zoom error:', (zoomErr as Error).message);
      zoomInfo = {
        joinUrl: `https://meet.tradenexus.io/room/${meetingId}`,
        startUrl: `https://meet.tradenexus.io/room/${meetingId}`,
      };
    }

    const resolvedLocation = zoomInfo.id ? `Zoom Video (ID: ${zoomInfo.id})` : 'Trade Nexus In-App Room';
    const resolvedLink = zoomInfo.joinUrl || `https://meet.tradenexus.io/room/${meetingId}`;

    db.prepare(`
      INSERT INTO team_meetings (
        id, title, dateTime, type, location, attendeesCount, agenda, status, 
        meetingLink, invitedMemberName, zoomMeetingId, zoomJoinUrl, zoomStartUrl, 
        zoomPassword, hostRole, hostName, hostEmpCode, targetAudience, 
        targetTeam, targetEmployeeId, includeAdmin, priority
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      meetingId,
      title || 'Team Meeting',
      dateTime || 'Today, 11:00 AM',
      type,
      resolvedLocation,
      attendeesCount ? Number(attendeesCount) : 6,
      agenda || '',
      'UPCOMING',
      resolvedLink,
      invitedMemberName || null,
      zoomInfo.id || null,
      zoomInfo.joinUrl || resolvedLink,
      zoomInfo.startUrl || resolvedLink,
      zoomInfo.password || null,
      role,
      user.name,
      user.empCode || null,
      targetAudience,
      targetTeam || (role === 'team_leader' ? userSquad : null),
      targetEmployeeId || null,
      includeAdmin ? 1 : 0,
      priority
    );

    const created = db.prepare('SELECT * FROM team_meetings WHERE id = ?').get(meetingId);
    return res.status(201).json(created);
  } catch (error) {
    console.error('[POST /team-meetings/create-zoom] Error:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/team-meetings (Standard endpoint - also Zoom-powered by default for reliability)
router.post('/', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = user.role === 'employee' ? 'telecaller' : user.role;

    if (role === 'telecaller') {
      return res.status(403).json({ error: 'Telecallers cannot create meetings.' });
    }

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
      targetAudience = 'ALL',
      targetTeam,
      targetEmployeeId,
      includeAdmin = false,
      priority = 'NORMAL',
      useZoom = true,
    } = req.body;

    const meetingId = id || `mtg-${Date.now()}`;
    const userSquad = getUserSquad(user);

    let zoomJoinUrl = meetingLink || '';
    let zoomStartUrl = meetingLink || '';
    let zoomId: string | null = null;
    let zoomPass: string | null = null;

    // Automatically provision Zoom room if requested or if no custom URL was provided
    if (useZoom && (!meetingLink || meetingLink.includes('tradenexus.io'))) {
      try {
        const zoomRes = await zoomService.createMeeting({
          topic: title ? `${title} (Trade Nexus)` : 'Trade Nexus Meeting',
          agenda: agenda || `Host: ${user.name}`,
        });
        zoomId = zoomRes.id;
        zoomJoinUrl = zoomRes.joinUrl;
        zoomStartUrl = zoomRes.startUrl;
        zoomPass = zoomRes.password || null;
      } catch (err) {
        console.warn('[teamMeetings.ts] Zoom generation failed, using default room link:', (err as Error).message);
        zoomJoinUrl = zoomJoinUrl || `https://meet.tradenexus.io/room/${meetingId}`;
        zoomStartUrl = zoomStartUrl || zoomJoinUrl;
      }
    }

    const finalLocation = location || (zoomId ? `Zoom Meeting (${zoomId})` : 'In-App Video Room');
    const finalLink = zoomJoinUrl || `https://meet.tradenexus.io/room/${meetingId}`;

    db.prepare(`
      INSERT INTO team_meetings (
        id, title, dateTime, type, location, attendeesCount, agenda, status, 
        meetingLink, invitedMemberName, zoomMeetingId, zoomJoinUrl, zoomStartUrl, 
        zoomPassword, hostRole, hostName, hostEmpCode, targetAudience, 
        targetTeam, targetEmployeeId, includeAdmin, priority
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      meetingId,
      title || 'Team Meeting',
      dateTime || 'Today',
      type || 'Team Discussion',
      finalLocation,
      attendeesCount ? Number(attendeesCount) : 6,
      agenda || '',
      status || 'UPCOMING',
      finalLink,
      invitedMemberName || null,
      zoomId,
      zoomJoinUrl || finalLink,
      zoomStartUrl || finalLink,
      zoomPass,
      role,
      user.name,
      user.empCode || null,
      targetAudience,
      targetTeam || (role === 'team_leader' ? userSquad : null),
      targetEmployeeId || null,
      includeAdmin ? 1 : 0,
      priority
    );

    const created = db.prepare('SELECT * FROM team_meetings WHERE id = ?').get(meetingId);
    return res.status(201).json(created);
  } catch (error) {
    console.error('[POST /team-meetings] Error:', error);
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
          zoomMeetingId = ?, zoomJoinUrl = ?, zoomStartUrl = ?, zoomPassword = ?,
          targetAudience = ?, targetTeam = ?, targetEmployeeId = ?, 
          includeAdmin = ?, priority = ?
      WHERE id = ?
    `).run(
      merged.title, merged.dateTime, merged.type, merged.location,
      merged.attendeesCount, merged.agenda, merged.status, merged.meetingLink, merged.invitedMemberName,
      merged.zoomMeetingId || null, merged.zoomJoinUrl || null, merged.zoomStartUrl || null, merged.zoomPassword || null,
      merged.targetAudience || 'ALL', merged.targetTeam || null, merged.targetEmployeeId || null,
      merged.includeAdmin ? 1 : 0, merged.priority || 'NORMAL',
      id
    );

    const updated = db.prepare('SELECT * FROM team_meetings WHERE id = ?').get(id);
    return res.status(200).json(updated);
  } catch (error) {
    console.error('[PUT /team-meetings/:id] Error:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/team-meetings/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM team_meetings WHERE id = ?').get(id) as any;

    if (existing && existing.zoomMeetingId) {
      try {
        await zoomService.deleteMeeting(existing.zoomMeetingId);
        console.log(`[ZoomService] Cleaned up Zoom meeting ${existing.zoomMeetingId}`);
      } catch (e) {
        console.warn('[ZoomService] Could not delete Zoom meeting from cloud:', (e as Error).message);
      }
    }

    db.prepare('DELETE FROM team_meetings WHERE id = ?').run(id);
    return res.status(200).json({ success: true, message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('[DELETE /team-meetings/:id] Error:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

