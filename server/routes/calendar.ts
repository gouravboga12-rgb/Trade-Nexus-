import express from 'express';
import db from '../db/connection.js';
import { getTodayDateIST, minutesOfDay } from '../utils/dateUtils.js';

const router = express.Router();

export const DEFAULT_GAZETTED_HOLIDAYS = [
  { id: 'hol-1', name: 'Republic Day', date: '2026-01-26', type: 'NATIONAL', description: 'National Republic Day Celebration' },
  { id: 'hol-2', name: 'Maha Shivratri', date: '2026-02-15', type: 'FESTIVAL', description: 'Hindu Festival of Lord Shiva' },
  { id: 'hol-3', name: 'Holi Festival', date: '2026-03-03', type: 'FESTIVAL', description: 'Festival of Colors' },
  { id: 'hol-4', name: 'Eid-ul-Fitr', date: '2026-03-20', type: 'FESTIVAL', description: 'Islamic Festival of Breaking the Fast' },
  { id: 'hol-5', name: 'Dr. Ambedkar Jayanti', date: '2026-04-14', type: 'NATIONAL', description: 'Birthday of Dr. B. R. Ambedkar' },
  { id: 'hol-6', name: 'May Day', date: '2026-05-01', type: 'COMPANY', description: 'International Workers Day' },
  { id: 'hol-7', name: 'Bakrid / Eid al-Adha', date: '2026-05-27', type: 'FESTIVAL', description: 'Feast of the Sacrifice' },
  { id: 'hol-8', name: 'Muharram', date: '2026-06-26', type: 'FESTIVAL', description: 'Islamic New Year Remembrance' },
  { id: 'hol-9', name: 'Independence Day', date: '2026-08-15', type: 'NATIONAL', description: 'Indian National Independence Day' },
  { id: 'hol-10', name: 'Ganesh Chaturthi', date: '2026-09-14', type: 'FESTIVAL', description: 'Vinayaka Chaturthi Festival' },
  { id: 'hol-11', name: 'Mahatma Gandhi Jayanti', date: '2026-10-02', type: 'NATIONAL', description: 'Father of the Nation Birthday' },
  { id: 'hol-12', name: 'Dussehra / Vijayadashami', date: '2026-10-20', type: 'FESTIVAL', description: 'Victory of Good over Evil' },
  { id: 'hol-13', name: 'Diwali Festival', date: '2026-11-08', type: 'FESTIVAL', description: 'Festival of Lights' },
  { id: 'hol-14', name: 'Guru Nanak Jayanti', date: '2026-11-24', type: 'FESTIVAL', description: 'Sikh Guru Nanak Dev Ji Birthday' },
  { id: 'hol-15', name: 'Christmas Day', date: '2026-12-25', type: 'FESTIVAL', description: 'Christmas Celebration' },
];

function formatSettings(row: any) {
  let weeklyOffDays: number[] = [0];
  try {
    weeklyOffDays = JSON.parse(row.weeklyOffDays || '[0]');
  } catch {
    weeklyOffDays = [0];
  }
  return {
    id: row.id,
    weeklyOffDays,
    weekendPolicy: row.weekendPolicy || 'SUNDAY_ONLY',
    shiftStartTime: row.shiftStartTime || '09:30 AM',
    shiftEndTime: row.shiftEndTime || '06:30 PM',
    gracePeriodMinutes: Number(row.gracePeriodMinutes ?? 15),
    halfDayThresholdHours: Number(row.halfDayThresholdHours ?? 4.0),
    fullDayThresholdHours: Number(row.fullDayThresholdHours ?? 8.0),
    enableLateMarking: row.enableLateMarking !== undefined && row.enableLateMarking !== null
      ? Boolean(Number(row.enableLateMarking))
      : true,
    punchInWindowStart: row.punchInWindowStart || '08:00 AM',
    punchInWindowEnd: row.punchInWindowEnd || row.shiftStartTime || '09:30 AM',
    autoPunchOutTime: row.autoPunchOutTime || '11:59 PM',
    updatedAt: row.updatedAt
  };
}

// -------------------------------------------------------------
// 1. HOLIDAYS API
// -------------------------------------------------------------

// GET /api/calendar/holidays
router.get('/holidays', (req, res) => {
  try {
    const holidays = db.prepare('SELECT * FROM company_holidays ORDER BY date ASC').all();
    res.json(holidays);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar/holidays
router.post('/holidays', (req, res) => {
  try {
    const { id, name, date, type = 'FESTIVAL', description = '' } = req.body;
    if (!name || !date) {
      return res.status(400).json({ error: 'Name and date are required' });
    }

    const holidayId = id || `hol-${Date.now()}`;
    const insertOrReplace = db.prepare(`
      INSERT OR REPLACE INTO company_holidays (id, name, date, type, description)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertOrReplace.run(holidayId, name.trim(), date, type, description.trim());

    const created = db.prepare('SELECT * FROM company_holidays WHERE id = ?').get(holidayId);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/calendar/holidays/:id
router.delete('/holidays/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM company_holidays WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    res.json({ deleted: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/calendar/holidays (Clear All)
router.delete('/holidays', (req, res) => {
  try {
    db.prepare('DELETE FROM company_holidays').run();
    res.json({ cleared: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar/holidays/bulk-preset
router.post('/holidays/bulk-preset', (req, res) => {
  try {
    // Delete existing to load fresh official presets cleanly
    db.prepare('DELETE FROM company_holidays').run();

    const insertStmt = db.prepare(`
      INSERT INTO company_holidays (id, name, date, type, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const h of DEFAULT_GAZETTED_HOLIDAYS) {
      insertStmt.run(h.id, h.name, h.date, h.type, h.description);
    }

    const allHolidays = db.prepare('SELECT * FROM company_holidays ORDER BY date ASC').all();
    res.json(allHolidays);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 2. CALENDAR & SHIFT SETTINGS API
// -------------------------------------------------------------

// GET /api/calendar/settings
router.get('/settings', (req, res) => {
  try {
    let settings = db.prepare('SELECT * FROM calendar_settings WHERE id = ?').get('settings-default');
    if (!settings) {
      db.prepare(`
        INSERT INTO calendar_settings (id, weeklyOffDays, weekendPolicy, shiftStartTime, shiftEndTime, gracePeriodMinutes, halfDayThresholdHours, fullDayThresholdHours)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('settings-default', '[0]', 'SUNDAY_ONLY', '09:30 AM', '06:30 PM', 15, 4.0, 8.0);
      settings = db.prepare('SELECT * FROM calendar_settings WHERE id = ?').get('settings-default');
    }
    res.json(formatSettings(settings));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Recalculate today's attendance records when shift rules or late flags are updated */
export function recalculateTodayAttendance(settings: any): number {
  try {
    const today = getTodayDateIST();
    const records = db.prepare(`
      SELECT * FROM attendance_records 
      WHERE date = ? AND checkIn IS NOT NULL
    `).all(today) as any[];

    const isLateEnabled = settings.enableLateMarking !== 0 && settings.enableLateMarking !== false;
    
    // Evaluate Cutoff in minutes
    let cutoffMin: number | null = null;
    if (settings.punchInWindowEnd) {
      cutoffMin = minutesOfDay(settings.punchInWindowEnd);
    }
    if (cutoffMin === null && settings.shiftStartTime) {
      const startMin = minutesOfDay(settings.shiftStartTime);
      if (startMin !== null) {
        cutoffMin = startMin + (Number(settings.gracePeriodMinutes) || 0);
      }
    }

    let updatedCount = 0;
    for (const r of records) {
      // Disputed / rejected by admin stays flagged as ABSENT
      if (r.disputedByAdmin) continue;

      let newStatus = 'PRESENT';
      if (isLateEnabled && cutoffMin !== null) {
        const checkInMin = minutesOfDay(r.checkIn);
        if (checkInMin !== null && checkInMin > cutoffMin) {
          newStatus = 'LATE';
        }
      }

      if (r.status !== newStatus) {
        db.prepare('UPDATE attendance_records SET status = ? WHERE id = ?').run(newStatus, r.id);
        if (r.employeeId) {
          db.prepare('UPDATE team_members SET attendanceStatus = ? WHERE id = ? OR empCode = ?').run(
            newStatus, r.employeeId, r.employeeId
          );
        }
        updatedCount++;
      }
    }
    return updatedCount;
  } catch (e) {
    console.warn('[Recalculate Today Attendance Error]', e);
    return 0;
  }
}

// PUT /api/calendar/settings
router.put('/settings', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM calendar_settings WHERE id = ?').get('settings-default') as any;
    const current = existing ? formatSettings(existing) : {
      weeklyOffDays: [0],
      weekendPolicy: 'SUNDAY_ONLY',
      shiftStartTime: '09:30 AM',
      shiftEndTime: '06:30 PM',
      gracePeriodMinutes: 15,
      halfDayThresholdHours: 4.0,
      fullDayThresholdHours: 8.0,
      enableLateMarking: true,
      punchInWindowStart: '08:00 AM',
      punchInWindowEnd: '09:30 AM',
      autoPunchOutTime: '11:59 PM',
    };

    const weeklyOffDays = req.body.weeklyOffDays !== undefined ? req.body.weeklyOffDays : current.weeklyOffDays;
    const weekendPolicy = req.body.weekendPolicy !== undefined ? req.body.weekendPolicy : current.weekendPolicy;
    const shiftStartTime = req.body.shiftStartTime !== undefined ? req.body.shiftStartTime : current.shiftStartTime;
    const shiftEndTime = req.body.shiftEndTime !== undefined ? req.body.shiftEndTime : current.shiftEndTime;
    const gracePeriodMinutes = req.body.gracePeriodMinutes !== undefined ? req.body.gracePeriodMinutes : current.gracePeriodMinutes;
    const halfDayThresholdHours = req.body.halfDayThresholdHours !== undefined ? req.body.halfDayThresholdHours : current.halfDayThresholdHours;
    const fullDayThresholdHours = req.body.fullDayThresholdHours !== undefined ? req.body.fullDayThresholdHours : current.fullDayThresholdHours;
    const enableLateMarking = req.body.enableLateMarking !== undefined
      ? (req.body.enableLateMarking ? 1 : 0)
      : (current.enableLateMarking ? 1 : 0);
    const punchInWindowStart = req.body.punchInWindowStart !== undefined ? req.body.punchInWindowStart : current.punchInWindowStart;
    const punchInWindowEnd = req.body.punchInWindowEnd !== undefined ? req.body.punchInWindowEnd : current.punchInWindowEnd;
    const autoPunchOutTime = req.body.autoPunchOutTime !== undefined ? req.body.autoPunchOutTime : current.autoPunchOutTime;

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO calendar_settings (
        id, weeklyOffDays, weekendPolicy, shiftStartTime, shiftEndTime, gracePeriodMinutes,
        halfDayThresholdHours, fullDayThresholdHours, enableLateMarking,
        punchInWindowStart, punchInWindowEnd, autoPunchOutTime, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      'settings-default',
      JSON.stringify(weeklyOffDays),
      weekendPolicy,
      shiftStartTime,
      shiftEndTime,
      Number(gracePeriodMinutes),
      Number(halfDayThresholdHours),
      Number(fullDayThresholdHours),
      enableLateMarking,
      punchInWindowStart,
      punchInWindowEnd,
      autoPunchOutTime
    );

    const updated = db.prepare('SELECT * FROM calendar_settings WHERE id = ?').get('settings-default');
    const formatted = formatSettings(updated);

    // Apply retroactively to today's active punches if requested or by default
    let recalculatedCount = 0;
    if (req.body.applyToToday !== false) {
      recalculatedCount = recalculateTodayAttendance(formatted);
    }

    res.json({
      ...formatted,
      recalculatedCount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
