import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { hashPassword } from '../db/authUtils.js';

const router = Router();

// GET /api/team-members
router.get('/', (req: Request, res: Response) => {
  try {
    const user = req.user;

    // Team Leader: Scoped strictly to employees belonging to their assigned squad/team
    if (user && user.role === 'team_leader') {
      const leaderId = user.employeeId || user.id;
      const leaderEmpCode = user.empCode || '';
      const leaderName = user.name || '';

      const leaderRow = db.prepare(`
        SELECT groupName FROM team_members 
        WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
        LIMIT 1
      `).get(leaderId, leaderEmpCode, leaderName) as any;

      const groupRow = db.prepare(`
        SELECT name FROM team_groups 
        WHERE LOWER(leaderName) = LOWER(?)
        LIMIT 1
      `).get(leaderName) as any;

      const squadName = leaderRow?.groupName || groupRow?.name;

      if (squadName) {
        const members = db.prepare(`
          SELECT id, empCode, name, avatar, role, groupName as "group", phone, attendanceStatus, checkInTime, checkInMethod, dialsToday, goalCalls, connected, interested, salesAchieved, salesTarget, conversionRate, portal, email, active, deactivatedOn 
          FROM team_members 
          WHERE LOWER(groupName) = LOWER(?) OR id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
        `).all(squadName, leaderId, leaderEmpCode, leaderName);
        return res.status(200).json(members);
      } else {
        const members = db.prepare(`
          SELECT id, empCode, name, avatar, role, groupName as "group", phone, attendanceStatus, checkInTime, checkInMethod, dialsToday, goalCalls, connected, interested, salesAchieved, salesTarget, conversionRate, portal, email, active, deactivatedOn 
          FROM team_members 
          WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
        `).all(leaderId, leaderEmpCode, leaderName);
        return res.status(200).json(members);
      }
    }

    const members = db.prepare('SELECT id, empCode, name, avatar, role, groupName as "group", phone, attendanceStatus, checkInTime, checkInMethod, dialsToday, goalCalls, connected, interested, salesAchieved, salesTarget, conversionRate, portal, email, active, deactivatedOn FROM team_members').all();
    return res.status(200).json(members);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/team-members/floor-pulse
router.get('/floor-pulse', (req: Request, res: Response) => {
  try {
    const user = req.user;
    let squadFilter = '';
    let squadParam: string | null = null;

    if (user && user.role === 'team_leader') {
      const leaderRow = db.prepare(`
        SELECT groupName FROM team_members 
        WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
        LIMIT 1
      `).get(user.employeeId || user.id, user.empCode || '', user.name || '') as any;
      const groupRow = db.prepare('SELECT name FROM team_groups WHERE LOWER(leaderName) = LOWER(?) LIMIT 1').get(user.name || '') as any;
      squadParam = leaderRow?.groupName || groupRow?.name || null;
      if (squadParam) {
        squadFilter = 'AND LOWER(groupName) = LOWER(?)';
      }
    }

    // 1. Live Floor Attendance: Active telecallers with dynamic punctuality and metrics
    const activeMembers = squadParam
      ? db.prepare(`
          SELECT id, empCode, name, avatar, role, groupName as "group", phone, 
                 attendanceStatus, checkInTime, dialsToday, goalCalls, connected, 
                 interested, salesAchieved, salesTarget
          FROM team_members 
          WHERE active = 1 AND LOWER(groupName) = LOWER(?)
          ORDER BY 
            (CASE WHEN attendanceStatus = 'PRESENT' THEN 1 WHEN attendanceStatus = 'LATE' THEN 2 ELSE 3 END),
            salesAchieved DESC,
            dialsToday DESC
          LIMIT 6
        `).all(squadParam) as any[]
      : db.prepare(`
          SELECT id, empCode, name, avatar, role, groupName as "group", phone, 
                 attendanceStatus, checkInTime, dialsToday, goalCalls, connected, 
                 interested, salesAchieved, salesTarget
          FROM team_members 
          WHERE active = 1
          ORDER BY 
            (CASE WHEN attendanceStatus = 'PRESENT' THEN 1 WHEN attendanceStatus = 'LATE' THEN 2 ELSE 3 END),
            salesAchieved DESC,
            dialsToday DESC
          LIMIT 6
        `).all() as any[];

    // 2. Live Working Leads Pulse: Most recent active lead touchpoints
    const recentLeads = squadParam
      ? db.prepare(`
          SELECT 
            al.id, 
            al.name as contactName, 
            al.company, 
            al.assignedToEmployeeName as repName, 
            al.status, 
            al.dealValue, 
            al.notes, 
            al.lastCallTimestamp,
            al.updatedAt,
            al.createdAt
          FROM assigned_leads al
          JOIN team_members tm ON (tm.id = al.assignedToEmployeeId OR LOWER(tm.name) = LOWER(al.assignedToEmployeeName))
          WHERE LOWER(tm.groupName) = LOWER(?)
          ORDER BY al.updatedAt DESC, al.createdAt DESC
          LIMIT 8
        `).all(squadParam) as any[]
      : db.prepare(`
          SELECT 
            al.id, 
            al.name as contactName, 
            al.company, 
            al.assignedToEmployeeName as repName, 
            al.status, 
            al.dealValue, 
            al.notes, 
            al.lastCallTimestamp,
            al.updatedAt,
            al.createdAt
          FROM assigned_leads al
          ORDER BY al.updatedAt DESC, al.createdAt DESC
          LIMIT 8
        `).all() as any[];

    const pulseLeads = recentLeads.map((lead, idx) => {
      let type = 'CONNECTED';
      const statusUpper = (lead.status || '').toUpperCase();
      if (statusUpper.includes('CONVERT') || statusUpper.includes('WON') || lead.dealValue >= 75000) {
        type = 'WON_DEAL';
      } else if (statusUpper.includes('INTEREST')) {
        type = 'INTERESTED';
      } else if (statusUpper.includes('CALLBACK') || statusUpper.includes('CALL_BACK')) {
        type = 'CALLBACK';
      }

      const formattedAmount = lead.dealValue > 0
        ? (lead.dealValue >= 100000 ? `₹${(lead.dealValue / 100000).toFixed(2).replace(/\\.00$/, '')} L` : `₹${Number(lead.dealValue).toLocaleString('en-IN')}`)
        : '—';

      const relativeTimes = ['12m ago', '26m ago', '42m ago', '1h ago', '2h ago', '3h ago'];

      return {
        id: lead.id,
        rep: lead.repName || 'Employee',
        client: lead.company || 'Enterprise Client',
        contact: lead.contactName || 'Key Decision Maker',
        type,
        amount: formattedAmount,
        time: lead.lastCallTimestamp || relativeTimes[idx % relativeTimes.length],
        note: lead.notes || 'Spoke with client, follow-up scheduled.'
      };
    });

    return res.status(200).json({
      activeMembers,
      pulseLeads,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/team-members
router.post('/', (req: Request, res: Response) => {
  try {
    const { 
      id, empCode, name, avatar, role, group, phone, 
      attendanceStatus, checkInTime, checkInMethod, 
      dialsToday, goalCalls, connected, interested, 
      salesAchieved, salesTarget, conversionRate, portal, email, password 
    } = req.body;

    const memberId = id || `tm-${Date.now()}`;
    const finalEmpCode = empCode || `TNX-${Math.floor(8000 + Math.random() * 999)}`;
    const finalName = name || 'Team Member';
    const finalRole = role || 'Sales Executive';
    const finalGroup = group || 'General';
    const finalPhone = phone || '';
    const finalEmail = email ? email.toLowerCase().trim() : `${finalEmpCode.toLowerCase()}@tradenexus.com`;
    const finalPortal = portal || 'telecaller';

    const createAtomic = db.transaction(() => {
      // 1. Insert Team Member
      db.prepare(`
        INSERT INTO team_members (id, empCode, name, avatar, role, groupName, phone, attendanceStatus, checkInTime, checkInMethod, dialsToday, goalCalls, connected, interested, salesAchieved, salesTarget, conversionRate, portal, email)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        memberId, finalEmpCode, finalName,
        avatar || 'TM', finalRole, finalGroup,
        finalPhone, attendanceStatus || 'ABSENT', checkInTime || null, checkInMethod || '',
        dialsToday ? Number(dialsToday) : 0, goalCalls ? Number(goalCalls) : 0,
        connected ? Number(connected) : 0, interested ? Number(interested) : 0,
        salesAchieved ? Number(salesAchieved) : 0, salesTarget ? Number(salesTarget) : 0,
        conversionRate ? Number(conversionRate) : 0,
        finalPortal, finalEmail
      );

      // 2. Insert or replace Employee Profile
      db.prepare(`
        INSERT OR REPLACE INTO employee_profiles (id, empCode, name, roleTitle, department, teamName, teamLeaderName, email, phone, joinDate, bloodGroup, faceIdStatus, checkInTime, totalLeaveBalance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        memberId, finalEmpCode, finalName, finalRole, finalGroup, finalGroup, '',
        finalEmail, finalPhone, new Date().toISOString().split('T')[0], 'O+', 'NOT_CHECKED_IN', '', 14
      );

      // 3. Insert or update User Credentials for login
      if (finalEmail) {
        const rawPassword = password || 'nexus123';
        const passHash = hashPassword(rawPassword);
        db.prepare(`
          INSERT INTO users (id, email, passwordHash, name, role, empCode, employeeId, active)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(email) DO UPDATE SET
            name = excluded.name,
            role = excluded.role,
            empCode = excluded.empCode,
            employeeId = excluded.employeeId
        `).run(
          `usr-${Date.now()}`,
          finalEmail,
          passHash,
          finalName,
          finalPortal,
          finalEmpCode,
          memberId
        );
      }
    });

    createAtomic();

    const created = db.prepare('SELECT id, empCode, name, avatar, role, groupName as "group", phone, attendanceStatus, checkInTime, checkInMethod, dialsToday, goalCalls, connected, interested, salesAchieved, salesTarget, conversionRate, portal, email, active, deactivatedOn FROM team_members WHERE id = ?').get(memberId);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/team-members/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT id, empCode, name, avatar, role, groupName as "group", phone, attendanceStatus, checkInTime, checkInMethod, dialsToday, goalCalls, connected, interested, salesAchieved, salesTarget, conversionRate, portal, email, active, deactivatedOn FROM team_members WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    const user = req.user;
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
      const memberGroup = existing.group || existing.groupName || '';
      if (squadName && memberGroup.toLowerCase() !== squadName.toLowerCase() && existing.id !== leaderId) {
        return res.status(403).json({ error: 'Forbidden: Team Leader cannot modify staff outside assigned squad' });
      }
    }

    const merged = { ...existing, ...req.body };
    db.prepare(`
      UPDATE team_members 
      SET empCode = ?, name = ?, avatar = ?, role = ?, groupName = ?, phone = ?, 
          attendanceStatus = ?, checkInTime = ?, checkInMethod = ?, dialsToday = ?, 
          goalCalls = ?, connected = ?, interested = ?, salesAchieved = ?, 
          salesTarget = ?, conversionRate = ?, portal = ?, email = ?,
          active = ?, deactivatedOn = ?
      WHERE id = ?
    `).run(
      merged.empCode, merged.name, merged.avatar, merged.role, merged.group, merged.phone,
      merged.attendanceStatus, merged.checkInTime, merged.checkInMethod, merged.dialsToday,
      merged.goalCalls, merged.connected, merged.interested, merged.salesAchieved,
      merged.salesTarget, merged.conversionRate,
      merged.portal || 'telecaller', merged.email ?? null,
      merged.active === 0 ? 0 : 1, merged.deactivatedOn ?? null,
      id
    );

    const updated = db.prepare('SELECT id, empCode, name, avatar, role, groupName as "group", phone, attendanceStatus, checkInTime, checkInMethod, dialsToday, goalCalls, connected, interested, salesAchieved, salesTarget, conversionRate, portal, email, active, deactivatedOn FROM team_members WHERE id = ?').get(id);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
