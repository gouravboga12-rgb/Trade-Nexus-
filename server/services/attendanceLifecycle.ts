import db from '../db/connection.js';
import { getTodayDateIST } from '../utils/dateUtils.js';

interface CalendarSettingsRow {
  shiftStartTime?: string;
  shiftEndTime?: string;
  gracePeriodMinutes?: number;
}

/** "09:05 AM" -> minutes since midnight, or null if unparseable. */
function minutesOfDay(t?: string | null): number | null {
  if (!t) return null;
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  if (m[3]) {
    hours %= 12;
    if (m[3].toUpperCase() === 'PM') hours += 12;
  }
  return hours * 60 + parseInt(m[2], 10);
}

/**
 * Sweeps the database for any past attendance records where an employee punched in
 * but forgot to punch out (checkOut IS NULL).
 * Auto-closes them with shiftEndTime and sets punchOutStatus = 'MISSED_PUNCH_OUT'.
 */
export function sweepUnclosedAttendance(): number {
  try {
    const today = getTodayDateIST();
    const cal = db.prepare('SELECT shiftStartTime, shiftEndTime FROM calendar_settings WHERE id = ?').get('settings-default') as CalendarSettingsRow | undefined;
    const defaultEndTime = cal?.shiftEndTime || '06:30 PM';

    // 1. Find all records from previous days that have a checkIn but never punched out
    const unclosedRecords = db.prepare(`
      SELECT id, date, checkIn, employeeId, employeeName
      FROM attendance_records
      WHERE date < ? AND checkIn IS NOT NULL AND (checkOut IS NULL OR checkOut = '')
    `).all(today) as any[];

    if (!unclosedRecords.length) return 0;

    let closedCount = 0;
    const updateStmt = db.prepare(`
      UPDATE attendance_records
      SET checkOut = ?,
          punchOutStatus = 'MISSED_PUNCH_OUT',
          isAutoClosed = 1,
          autoClosedAt = CURRENT_TIMESTAMP,
          workHours = ?
      WHERE id = ?
    `);

    for (const rec of unclosedRecords) {
      let workHours = '8h 00m';
      const startMin = minutesOfDay(rec.checkIn);
      const endMin = minutesOfDay(defaultEndTime);
      if (startMin !== null && endMin !== null && endMin > startMin) {
        const diff = endMin - startMin;
        workHours = `${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, '0')}m`;
      }

      updateStmt.run(defaultEndTime, workHours, rec.id);
      closedCount++;
    }

    // 2. Also ensure team_members table does not retain stale 'PRESENT' status from previous days
    // If an employee does not have a punch-in for today, reset their daily checkInTime and attendanceStatus
    syncDailyRosterStatus();

    return closedCount;
  } catch (err) {
    console.warn('[Attendance Sweep Warning]', err);
    return 0;
  }
}

/**
 * Synchronizes today's live floor roster in team_members:
 * - If member punched in TODAY -> PRESENT or LATE
 * - If member is on approved leave TODAY -> ON_LEAVE
 * - If member has NO punch-in today -> ABSENT, checkInTime cleared
 */
let lastRosterSync = 0;

export function syncDailyRosterStatus(force = false): void {
  const now = Date.now();
  if (!force && now - lastRosterSync < 60000) return;
  lastRosterSync = now;

  try {
    const today = getTodayDateIST();

    // Today's attendance records
    const todayRecords = db.prepare(`
      SELECT employeeId, employeeName, status, checkIn, checkOut, disputedByAdmin
      FROM attendance_records
      WHERE date = ?
    `).all(today) as any[];

    // Approved leaves covering today
    const activeLeaves = db.prepare(`
      SELECT employeeName, employeeCode
      FROM leave_requests
      WHERE status = 'APPROVED' AND fromDate <= ? AND toDate >= ?
    `).all(today, today) as any[];

    const activeLeaveCodes = new Set<string>();
    const activeLeaveNames = new Set<string>();
    for (const l of activeLeaves) {
      if (l.employeeCode) activeLeaveCodes.add(l.employeeCode.toLowerCase());
      if (l.employeeName) activeLeaveNames.add(l.employeeName.toLowerCase());
    }

    const todayAttByEmp = new Map<string, any>();
    for (const r of todayRecords) {
      if (r.employeeId) todayAttByEmp.set(r.employeeId, r);
      if (r.employeeName) todayAttByEmp.set(r.employeeName.toLowerCase(), r);
    }

    const allMembers = db.prepare('SELECT id, empCode, name, attendanceStatus, checkInTime FROM team_members').all() as any[];

    const updateStatus = db.prepare(`
      UPDATE team_members
      SET attendanceStatus = ?,
          checkInTime = ?
      WHERE id = ?
    `);

    for (const m of allMembers) {
      const att = todayAttByEmp.get(m.id) || (m.empCode ? todayAttByEmp.get(m.empCode) : null) || (m.name ? todayAttByEmp.get(m.name.toLowerCase()) : null);

      if (att && !att.disputedByAdmin) {
        // Punched in today
        const effective = att.status === 'LATE' ? 'LATE' : 'PRESENT';
        if (m.attendanceStatus !== effective || m.checkInTime !== att.checkIn) {
          updateStatus.run(effective, att.checkIn || null, m.id);
        }
      } else if (
        (m.empCode && activeLeaveCodes.has(m.empCode.toLowerCase())) ||
        (m.name && activeLeaveNames.has(m.name.toLowerCase()))
      ) {
        // On approved leave today
        if (m.attendanceStatus !== 'ON_LEAVE' || m.checkInTime) {
          updateStatus.run('ON_LEAVE', null, m.id);
        }
      } else {
        // No punch-in today -> ABSENT (do NOT keep yesterday's PRESENT status!)
        if (m.attendanceStatus !== 'ABSENT' || m.checkInTime) {
          updateStatus.run('ABSENT', null, m.id);
        }
      }
    }
  } catch (err) {
    console.warn('[Roster Sync Warning]', err);
  }
}
