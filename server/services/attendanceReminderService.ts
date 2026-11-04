import db from '../db/connection.js';
import { getTodayDateIST, getCurrentTimeIST, minutesOfDay } from '../utils/dateUtils.js';
import { isDateNonWorking } from './attendanceLifecycle.js';
import { sendPushNotification } from './notificationService.js';
import { emitSocketEvent } from './socketService.js';

export interface PunchReminderResult {
  triggered: boolean;
  type?: 'BEFORE_SHIFT' | 'WINDOW_OPEN' | 'MANUAL_TEST';
  targetCount?: number;
  message?: string;
  skippedReason?: string;
}

/**
 * Evaluates the live dynamic shift timing & holidays to automatically send
 * punch-in reminders to all staff who have not yet punched in today.
 */
export async function checkAndSendPunchInReminders(): Promise<PunchReminderResult> {
  try {
    const today = getTodayDateIST();
    const currentTimeStr = getCurrentTimeIST();
    const currentMins = minutesOfDay(currentTimeStr);

    if (currentMins === null) {
      return { triggered: false, skippedReason: 'INVALID_TIME' };
    }

    // 1. Holiday & Scheduled Rest Day Check (Automatic holiday suppression)
    const nonWorkingCheck = isDateNonWorking(today);
    if (nonWorkingCheck.isNonWorking) {
      return {
        triggered: false,
        skippedReason: `HOLIDAY_OR_REST_DAY (${nonWorkingCheck.reason}: ${nonWorkingCheck.holidayName || 'Weekly Off'})`
      };
    }

    // 2. Fetch live calendar & shift settings dynamically configured by Admin
    const cal = db.prepare(`
      SELECT 
        shiftStartTime, 
        punchInWindowStart, 
        enablePunchInReminder, 
        punchInReminderMinutes, 
        punchInReminderAtWindowOpen
      FROM calendar_settings 
      WHERE id = 'settings-default'
    `).get() as any;

    if (!cal) {
      return { triggered: false, skippedReason: 'NO_CALENDAR_SETTINGS' };
    }

    // Check if Admin has automated reminders enabled
    const isEnabled = cal.enablePunchInReminder === undefined || cal.enablePunchInReminder === null
      ? true
      : Boolean(Number(cal.enablePunchInReminder));

    if (!isEnabled) {
      return { triggered: false, skippedReason: 'REMINDERS_DISABLED_BY_ADMIN' };
    }

    const shiftStartTime = cal.shiftStartTime || '09:30 AM';
    const shiftStartMins = minutesOfDay(shiftStartTime);
    const reminderLeadMins = Number(cal.punchInReminderMinutes ?? 10);

    const windowStartTime = cal.punchInWindowStart || '08:00 AM';
    const windowStartMins = minutesOfDay(windowStartTime);
    const sendAtWindowOpen = Boolean(Number(cal.punchInReminderAtWindowOpen || 0));

    // 3. Determine if current minute matches trigger criteria
    let reminderTypeToFire: 'BEFORE_SHIFT' | 'WINDOW_OPEN' | null = null;
    let reminderTitle = '';
    let reminderBody = '';

    // Check A: Dynamic Lead-Time Reminder (e.g. 10m / 15m / 5m before shift start)
    if (shiftStartMins !== null) {
      const targetMin = shiftStartMins - reminderLeadMins;
      // Trigger window: match within a 3-minute window to ensure no interval miss
      if (currentMins >= targetMin && currentMins <= targetMin + 2) {
        // Deduplication check: Has BEFORE_SHIFT fired today?
        const alreadyLogged = db.prepare(`
          SELECT id FROM attendance_reminder_logs 
          WHERE date = ? AND reminderType = 'BEFORE_SHIFT'
        `).get(today);

        if (!alreadyLogged) {
          reminderTypeToFire = 'BEFORE_SHIFT';
          reminderTitle = '⏰ Shift Starts Soon: Punch In Reminder';
          reminderBody = `Good morning! Your office shift begins in ${reminderLeadMins} minutes (${shiftStartTime}). Please complete your daily punch-in now.`;
        }
      }
    }

    // Check B: Window Open Reminder (if enabled by Admin)
    if (!reminderTypeToFire && sendAtWindowOpen && windowStartMins !== null) {
      if (currentMins >= windowStartMins && currentMins <= windowStartMins + 2) {
        const alreadyLogged = db.prepare(`
          SELECT id FROM attendance_reminder_logs 
          WHERE date = ? AND reminderType = 'WINDOW_OPEN'
        `).get(today);

        if (!alreadyLogged) {
          reminderTypeToFire = 'WINDOW_OPEN';
          reminderTitle = '🏢 Attendance Window Open';
          reminderBody = `Good morning! Punch-in window is now officially open (${windowStartTime}). You can now complete your daily check-in.`;
        }
      }
    }

    if (!reminderTypeToFire) {
      return { triggered: false, skippedReason: 'OUTSIDE_TRIGGER_WINDOW' };
    }

    // 4. Find all active employees who have NOT yet punched in today
    const unpunchedEmployees = getUnpunchedEmployeesForToday(today);

    if (unpunchedEmployees.length === 0) {
      // Record log so we don't re-check in the same 3-minute window
      db.prepare(`
        INSERT OR IGNORE INTO attendance_reminder_logs (id, date, reminderType, targetCount, sentAt)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(`log-${today}-${reminderTypeToFire}`, today, reminderTypeToFire, 0);

      return {
        triggered: true,
        type: reminderTypeToFire,
        targetCount: 0,
        message: 'All employees are already punched in or on approved leave.'
      };
    }

    // 5. Dispatch multi-channel alert
    await dispatchPunchInReminderAlert({
      reminderType: reminderTypeToFire,
      title: reminderTitle,
      body: reminderBody,
      today,
      employees: unpunchedEmployees
    });

    return {
      triggered: true,
      type: reminderTypeToFire,
      targetCount: unpunchedEmployees.length,
      message: `Sent punch-in alert to ${unpunchedEmployees.length} employees.`
    };
  } catch (err: any) {
    console.warn('[PunchIn Reminder Engine Warning]:', err.message);
    return { triggered: false, skippedReason: `ERROR: ${err.message}` };
  }
}

/**
 * Filters all active staff who do NOT have a check-in today and are NOT on approved leave.
 * Automatically excludes admin, hr, and team_leader roles.
 */
function getUnpunchedEmployeesForToday(today: string): any[] {
  try {
    // 1. Employees already checked in today
    const checkedInRows = db.prepare(`
      SELECT employeeId, employeeName 
      FROM attendance_records 
      WHERE date = ? AND checkIn IS NOT NULL AND checkIn != ''
    `).all(today) as any[];

    const checkedInIds = new Set<string>();
    const checkedInNames = new Set<string>();
    for (const r of checkedInRows) {
      if (r.employeeId) checkedInIds.add(r.employeeId.toLowerCase());
      if (r.employeeName) checkedInNames.add(r.employeeName.trim().toLowerCase());
    }

    // 2. Employees on approved leave covering today
    const leaveRows = db.prepare(`
      SELECT employeeCode, employeeName 
      FROM leave_requests 
      WHERE status = 'APPROVED' AND fromDate <= ? AND toDate >= ?
    `).all(today, today) as any[];

    const onLeaveCodes = new Set<string>();
    const onLeaveNames = new Set<string>();
    for (const l of leaveRows) {
      if (l.employeeCode) onLeaveCodes.add(l.employeeCode.toLowerCase());
      if (l.employeeName) onLeaveNames.add(l.employeeName.trim().toLowerCase());
    }

    // 3. Query all target staff (telecallers, general employees, newly registered accounts)
    // Strictly exclude management portals ('admin', 'hr', 'team_leader')
    const allMembers = db.prepare(`
      SELECT id, empCode, name, portal, role 
      FROM team_members 
      WHERE (active = 1 OR active IS NULL)
        AND LOWER(COALESCE(portal, 'telecaller')) NOT IN ('admin', 'hr', 'team_leader')
        AND LOWER(COALESCE(role, '')) NOT LIKE '%admin%'
        AND LOWER(COALESCE(role, '')) NOT LIKE '%human resources%'
        AND LOWER(COALESCE(role, '')) NOT LIKE '%director%'
    `).all() as any[];

    // 4. Return only those who haven't punched in and aren't on leave
    return allMembers.filter(m => {
      const idKey = (m.id || '').toLowerCase();
      const codeKey = (m.empCode || '').toLowerCase();
      const nameKey = (m.name || '').trim().toLowerCase();

      const isPunched = checkedInIds.has(idKey) || (codeKey && checkedInIds.has(codeKey)) || checkedInNames.has(nameKey);
      if (isPunched) return false;

      const isLeave = onLeaveCodes.has(codeKey) || (idKey && onLeaveCodes.has(idKey)) || onLeaveNames.has(nameKey);
      if (isLeave) return false;

      return true;
    });
  } catch (err) {
    console.error('[getUnpunchedEmployeesForToday Error]:', err);
    return [];
  }
}

/**
 * Dispatches both External Push Notifications (FCM/Expo) and In-App Drawer Broadcasts.
 */
async function dispatchPunchInReminderAlert({
  reminderType,
  title,
  body,
  today,
  employees
}: {
  reminderType: string;
  title: string;
  body: string;
  today: string;
  employees: any[];
}) {
  const targetUserIds = employees.map(e => e.id).filter(Boolean);
  const targetEmpCodes = employees.map(e => e.empCode).filter(Boolean);

  // 1. External Push Notification to Android phones (FCM V1 / Expo Push)
  try {
    await sendPushNotification({
      targetUserId: targetUserIds,
      targetEmpCode: targetEmpCodes,
      title,
      body,
      data: {
        type: 'PUNCH_IN_REMINDER',
        targetScreen: 'Attendance',
        actionUrl: 'attendance',
        date: today
      },
      channelId: 'attendance-alerts'
    });
  } catch (pushErr: any) {
    console.warn('[PunchIn Push Warning]:', pushErr.message);
  }

  // 2. In-App Notification Drawer Entry (Persistent SQLite broadcast)
  const broadcastId = `punch-remind-${today}-${Date.now()}`;
  try {
    db.prepare(`
      INSERT INTO company_broadcasts (
        id, senderId, senderName, senderRole, category, targetScope, targetRoles, targetUserIds, title, message, actionUrl, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      broadcastId,
      'admin-system',
      'Attendance Desk',
      'System Automation',
      'attendance',
      'CUSTOM',
      JSON.stringify(['telecaller', 'employee']),
      JSON.stringify([...targetUserIds, ...targetEmpCodes]),
      title,
      body,
      'attendance'
    );
  } catch (dbErr: any) {
    console.warn('[PunchIn Broadcast DB Warning]:', dbErr.message);
  }

  // 3. Instant Real-Time Socket.IO Notification (Pop-up Banner & Chime)
  try {
    emitSocketEvent('broadcast:received', {
      id: broadcastId,
      title,
      body,
      message: body,
      category: 'attendance',
      actionUrl: 'attendance',
      targetTab: 'attendance',
      senderName: 'Attendance Automation Desk',
      createdAt: new Date().toISOString()
    });
  } catch (_) {}

  // 4. Record execution log to enforce idempotency
  try {
    db.prepare(`
      INSERT OR REPLACE INTO attendance_reminder_logs (id, date, reminderType, targetCount, sentAt)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(`log-${today}-${reminderType}`, today, reminderType, employees.length);
  } catch (logErr: any) {
    console.warn('[PunchIn Log Warning]:', logErr.message);
  }
}

/**
 * Manual test trigger for Admin to verify punch-in alerts in 1 click.
 */
export async function sendManualTestPunchReminder(adminName: string = 'Admin'): Promise<{ success: boolean; targetCount: number; message: string }> {
  const today = getTodayDateIST();
  const unpunched = getUnpunchedEmployeesForToday(today);
  const targetCount = unpunched.length > 0 ? unpunched.length : 1; // if 0, sends to all staff for testing

  const targetMembers = unpunched.length > 0
    ? unpunched
    : db.prepare(`SELECT id, empCode, name FROM team_members WHERE LOWER(COALESCE(portal, 'telecaller')) NOT IN ('admin') LIMIT 20`).all() as any[];

  await dispatchPunchInReminderAlert({
    reminderType: 'MANUAL_TEST',
    title: '🔔 Test: Attendance Punch-In Alert',
    body: `[Test by ${adminName}] Remember to complete your daily punch-in before the shift cutoff!`,
    today,
    employees: targetMembers
  });

  return {
    success: true,
    targetCount: targetMembers.length,
    message: `Test punch-in reminder dispatched to ${targetMembers.length} staff member${targetMembers.length === 1 ? '' : 's'}.`
  };
}
