import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

/**
 * The same employee is held in two places: `team_members` is the roster Admin
 * manages, `employee_profiles` is what the employee sees. They are matched on
 * empCode. Anything Admin controls — name, team, job title, phone, reporting
 * leader — is taken from the roster, so an Admin edit reaches the employee
 * instead of the two records drifting apart.
 */
function mergedProfile() {
  const profile = db.prepare('SELECT * FROM employee_profiles LIMIT 1').get() as any;
  if (!profile) return null;

  const roster = db
    .prepare('SELECT * FROM team_members WHERE empCode = ?')
    .get(profile.empCode) as any;
  if (!roster) return profile;

  // Whoever leads their team is their reporting leader — never typed by hand
  const group = db
    .prepare('SELECT leaderName FROM team_groups WHERE name = ?')
    .get(roster.groupName) as { leaderName?: string } | undefined;

  // Real-time synchronization with today's attendance in SQLite
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAtt = db.prepare(`
    SELECT * FROM attendance_records 
    WHERE (employeeId = ? OR id LIKE ?) AND date = ?
    ORDER BY createdAt DESC LIMIT 1
  `).get(profile.id, `%${todayStr}%`, todayStr) as any;

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
    name: roster.name ?? profile.name,
    roleTitle: roster.role ?? profile.roleTitle,
    phone: roster.phone ?? profile.phone,
    email: roster.email ?? profile.email,
    teamName: roster.groupName ?? profile.teamName,
    teamLeaderName: group?.leaderName ?? profile.teamLeaderName,
    faceIdStatus: dynamicFaceIdStatus,
    checkInTime: dynamicCheckInTime,
    checkOutTime: dynamicCheckOutTime,
    active: roster.active ?? 1,
  };
}

// GET /api/profile
router.get('/', (_req: Request, res: Response) => {
  try {
    const profile = mergedProfile();
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
    let current = db.prepare('SELECT * FROM employee_profiles LIMIT 1').get() as any;
    if (!current) {
      const id = data.id || 'prof-default';
      db.prepare(`
        INSERT INTO employee_profiles (id, empCode, name, roleTitle, department, teamName, teamLeaderName, email, phone, joinDate, bloodGroup, faceIdStatus, checkInTime, totalLeaveBalance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.empCode || 'EMP-001',
        data.name || 'Staff Member',
        data.roleTitle || 'Sales Executive',
        data.department || 'Sales',
        data.teamName || 'General',
        data.teamLeaderName || '',
        data.email || 'staff@tradenexus.com',
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
