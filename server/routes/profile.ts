import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

/**
 * Merges employee profile with team roster and today's real-time attendance.
 * Scopes to the authenticated user (or requested employeeId) instead of hardcoding row 1.
 */
function mergedProfile(user?: any, queryEmpId?: string) {
  let profile: any = null;
  const targetId = queryEmpId || user?.employeeId || user?.id;
  const targetEmpCode = user?.empCode;
  const targetEmail = user?.email;
  const targetName = user?.name;

  // 1. Look up employee_profiles by user identifier
  if (targetId || targetEmpCode || targetEmail) {
    profile = db.prepare(`
      SELECT * FROM employee_profiles 
      WHERE (id = ? OR empCode = ? OR (email IS NOT NULL AND LOWER(email) = LOWER(?)))
      LIMIT 1
    `).get(targetId || '', targetEmpCode || '', targetEmail || '') as any;
  }

  // 2. Look up roster row in team_members
  let roster: any = null;
  if (targetId || targetEmpCode || targetEmail || targetName) {
    roster = db.prepare(`
      SELECT * FROM team_members 
      WHERE (id = ? OR empCode = ? OR (email IS NOT NULL AND LOWER(email) = LOWER(?)) OR (name IS NOT NULL AND LOWER(name) = LOWER(?)))
      LIMIT 1
    `).get(targetId || '', targetEmpCode || '', targetEmail || '', (targetName || '').toLowerCase()) as any;
  }

  // 3. If no profile exists yet, create one from roster or user metadata
  if (!profile && roster) {
    profile = {
      id: roster.id,
      empCode: roster.empCode || `EMP-${roster.id.slice(-4)}`,
      name: roster.name,
      roleTitle: roster.role || 'Sales Executive',
      department: 'Sales',
      teamName: roster.groupName || 'General',
      teamLeaderName: '',
      email: roster.email || '',
      phone: roster.phone || '',
      joinDate: new Date().toISOString().split('T')[0],
      bloodGroup: 'O+',
      faceIdStatus: roster.attendanceStatus === 'PRESENT' ? 'VERIFIED_PRESENT' : 'NOT_CHECKED_IN',
      checkInTime: roster.checkInTime || '',
      checkOutTime: '',
      totalLeaveBalance: 12,
    };
    try {
      db.prepare(`
        INSERT INTO employee_profiles (id, empCode, name, roleTitle, department, teamName, teamLeaderName, email, phone, joinDate, bloodGroup, faceIdStatus, checkInTime, totalLeaveBalance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        profile.id, profile.empCode, profile.name, profile.roleTitle, profile.department, profile.teamName,
        profile.teamLeaderName, profile.email, profile.phone, profile.joinDate, profile.bloodGroup,
        profile.faceIdStatus, profile.checkInTime, profile.totalLeaveBalance
      );
    } catch {}
  } else if (!profile && user) {
    profile = {
      id: user.employeeId || user.id,
      empCode: user.empCode || `EMP-${user.id.slice(-4)}`,
      name: user.name,
      roleTitle: user.role === 'admin' ? 'Super Admin' : user.role === 'hr' ? 'HR Manager' : user.role === 'team_leader' ? 'Team Leader' : 'Sales Executive',
      department: user.role === 'hr' ? 'Human Resources' : user.role === 'admin' ? 'Executive' : 'Sales',
      teamName: 'General',
      teamLeaderName: '',
      email: user.email || '',
      phone: '',
      joinDate: new Date().toISOString().split('T')[0],
      bloodGroup: 'O+',
      faceIdStatus: 'NOT_CHECKED_IN',
      checkInTime: '',
      checkOutTime: '',
      totalLeaveBalance: 12,
    };
    try {
      db.prepare(`
        INSERT INTO employee_profiles (id, empCode, name, roleTitle, department, teamName, teamLeaderName, email, phone, joinDate, bloodGroup, faceIdStatus, checkInTime, totalLeaveBalance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        profile.id, profile.empCode, profile.name, profile.roleTitle, profile.department, profile.teamName,
        profile.teamLeaderName, profile.email, profile.phone, profile.joinDate, profile.bloodGroup,
        profile.faceIdStatus, profile.checkInTime, profile.totalLeaveBalance
      );
    } catch {}
  }

  // Fallback to first profile row only if no user context was provided
  if (!profile) {
    profile = db.prepare('SELECT * FROM employee_profiles LIMIT 1').get() as any;
  }
  if (!profile) return null;

  if (!roster && profile.empCode) {
    roster = db.prepare('SELECT * FROM team_members WHERE empCode = ? OR id = ?').get(profile.empCode, profile.id) as any;
  }

  // Whoever leads their team is their reporting leader
  const group = roster?.groupName
    ? (db.prepare('SELECT leaderName FROM team_groups WHERE name = ?').get(roster.groupName) as { leaderName?: string } | undefined)
    : undefined;

  // Real-time synchronization with today's attendance in SQLite for this user
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAtt = db.prepare(`
    SELECT * FROM attendance_records 
    WHERE (employeeId = ? OR employeeId = ? OR id = ?) AND date = ?
    ORDER BY createdAt DESC LIMIT 1
  `).get(profile.id, profile.empCode || profile.id, `att-${todayStr}-${profile.id}`, todayStr) as any;

  let dynamicFaceIdStatus = profile.faceIdStatus || 'NOT_CHECKED_IN';
  let dynamicCheckInTime = profile.checkInTime || '';
  let dynamicCheckOutTime = profile.checkOutTime || '';

  if (todayAtt) {
    if (todayAtt.checkOut) {
      dynamicFaceIdStatus = 'ON_BREAK';
      dynamicCheckInTime = todayAtt.checkIn || dynamicCheckInTime;
      dynamicCheckOutTime = todayAtt.checkOut;
    } else if (todayAtt.checkIn) {
      dynamicFaceIdStatus = 'VERIFIED_PRESENT';
      dynamicCheckInTime = todayAtt.checkIn;
    }
  }

  return {
    ...profile,
    name: roster?.name ?? profile.name,
    roleTitle: roster?.role ?? profile.roleTitle,
    phone: roster?.phone ?? profile.phone,
    email: roster?.email ?? profile.email,
    teamName: roster?.groupName ?? profile.teamName,
    teamLeaderName: group?.leaderName ?? profile.teamLeaderName,
    faceIdStatus: dynamicFaceIdStatus,
    checkInTime: dynamicCheckInTime,
    checkOutTime: dynamicCheckOutTime,
    active: roster?.active ?? 1,
  };
}

// GET /api/profile
router.get('/', (req: Request, res: Response) => {
  try {
    const employeeId = req.query.employeeId as string | undefined;
    const profile = mergedProfile(req.user, employeeId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    return res.status(200).json(profile);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/profile
router.put('/', (req: Request, res: Response) => {
  try {
    const data = req.body;
    const targetId = data.id || req.user?.employeeId || req.user?.id;
    let current = targetId
      ? (db.prepare('SELECT * FROM employee_profiles WHERE id = ? OR empCode = ? LIMIT 1').get(targetId, data.empCode || '') as any)
      : (db.prepare('SELECT * FROM employee_profiles LIMIT 1').get() as any);

    if (!current) {
      const id = targetId || 'prof-default';
      db.prepare(`
        INSERT INTO employee_profiles (id, empCode, name, roleTitle, department, teamName, teamLeaderName, email, phone, joinDate, bloodGroup, faceIdStatus, checkInTime, totalLeaveBalance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.empCode || req.user?.empCode || 'EMP-001',
        data.name || req.user?.name || 'Staff Member',
        data.roleTitle || 'Sales Executive',
        data.department || 'Sales',
        data.teamName || 'General',
        data.teamLeaderName || '',
        data.email || req.user?.email || 'staff@tradenexus.com',
        data.phone || '',
        data.joinDate || new Date().toISOString().split('T')[0],
        data.bloodGroup || 'O+',
        data.faceIdStatus || 'NOT_CHECKED_IN',
        data.checkInTime || '',
        data.totalLeaveBalance ?? 0
      );
      current = db.prepare('SELECT * FROM employee_profiles WHERE id = ?').get(id);
    }

    const merged = { ...current, ...data };
    db.prepare(`
      UPDATE employee_profiles 
      SET empCode = ?, name = ?, roleTitle = ?, department = ?, teamName = ?, 
          teamLeaderName = ?, email = ?, phone = ?, joinDate = ?, bloodGroup = ?, 
          faceIdStatus = ?, checkInTime = ?, totalLeaveBalance = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      merged.empCode, merged.name, merged.roleTitle, merged.department, merged.teamName,
      merged.teamLeaderName, merged.email, merged.phone, merged.joinDate, merged.bloodGroup,
      merged.faceIdStatus, merged.checkInTime, merged.totalLeaveBalance, current.id
    );

    const updated = db.prepare('SELECT * FROM employee_profiles WHERE id = ?').get(current.id);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
