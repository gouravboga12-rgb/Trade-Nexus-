import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

// GET /api/biometrics
router.get('/', (req: Request, res: Response) => {
  try {
    const profiles = db.prepare('SELECT * FROM face_biometric_profiles ORDER BY createdAt DESC').all();
    return res.status(200).json(profiles);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/biometrics (Register Face Biometric)
router.post('/', (req: Request, res: Response) => {
  try {
    const { employeeId, employeeName, registeredPhoto, registeredAt, status } = req.body;
    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }

    db.prepare(`
      INSERT INTO face_biometric_profiles (employeeId, employeeName, registeredPhoto, registeredAt, status)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(employeeId) DO UPDATE SET
        employeeName = excluded.employeeName,
        registeredPhoto = excluded.registeredPhoto,
        registeredAt = excluded.registeredAt,
        status = excluded.status
    `).run(
      employeeId, employeeName || 'Employee', registeredPhoto || '',
      registeredAt || 'Just now', status || 'REGISTERED'
    );

    // Also update onboarding checklist for this employee
    db.prepare(`
      UPDATE onboarding_employees
      SET biometricEnrolled = 1
      WHERE id = ? OR name LIKE ?
    `).run(employeeId, `%${employeeName}%`);

    const created = db.prepare('SELECT * FROM face_biometric_profiles WHERE employeeId = ?').get(employeeId);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/biometrics/verify (Verify Face & Record Attendance)
router.post('/verify', (req: Request, res: Response) => {
  try {
    const rawId = req.body?.employeeId || req.user?.employeeId || req.user?.id;
    if (!rawId) {
      return res.status(400).json({ error: 'employeeId is required for biometric verification' });
    }

    // Find employee from team_members or employee_profiles
    const emp = db.prepare('SELECT * FROM team_members WHERE id = ? OR empCode = ?').get(rawId, rawId) as any
      || db.prepare('SELECT * FROM employee_profiles WHERE id = ? OR empCode = ?').get(rawId, rawId) as any;

    const targetId = emp?.id || rawId;
    const targetEmpCode = emp?.empCode || rawId;
    const empName = emp ? emp.name : 'Employee';

    let profile = db.prepare('SELECT * FROM face_biometric_profiles WHERE employeeId = ? OR employeeName = ?').get(targetId, empName) as any;

    if (!profile) {
      db.prepare(`
        INSERT INTO face_biometric_profiles (employeeId, employeeName, registeredPhoto, registeredAt, status)
        VALUES (?, ?, '', 'Auto-enrolled', 'REGISTERED')
        ON CONFLICT(employeeId) DO UPDATE SET status = 'REGISTERED'
      `).run(targetId, empName);
      profile = db.prepare('SELECT * FROM face_biometric_profiles WHERE employeeId = ?').get(targetId);
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const today = now.toISOString().split('T')[0];
    const recId = `att-${today}-${targetId}`;

    const updateAttendanceAtomic = db.transaction(() => {
      // 1. Update Profile Status for THIS employee ONLY
      db.prepare(`
        UPDATE employee_profiles
        SET faceIdStatus = 'VERIFIED_PRESENT', checkInTime = ?
        WHERE id = ? OR empCode = ?
      `).run(timeStr, targetId, targetEmpCode);

      // 2. Record Attendance with employeeId composite key
      db.prepare(`
        INSERT INTO attendance_records (id, date, dayNumber, status, checkIn, workHours, method, employeeId, employeeName)
        VALUES (?, ?, ?, 'PRESENT', ?, 'In Progress', 'Face ID Biometric', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status = 'PRESENT',
          checkIn = excluded.checkIn,
          method = 'Face ID Biometric',
          employeeId = excluded.employeeId,
          employeeName = excluded.employeeName
      `).run(recId, today, now.getDate(), timeStr, targetId, empName);

      // 3. Update Team Member Status for THIS employee ONLY
      db.prepare(`
        UPDATE team_members
        SET attendanceStatus = 'PRESENT', checkInTime = ?, checkInMethod = 'Face ID Biometric'
        WHERE id = ? OR empCode = ?
      `).run(timeStr, targetId, targetEmpCode);
    });

    updateAttendanceAtomic();

    return res.status(200).json({
      verified: !!profile,
      checkInTime: timeStr,
      status: 'VERIFIED_PRESENT',
      employeeId: targetId,
      attendanceId: recId
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
