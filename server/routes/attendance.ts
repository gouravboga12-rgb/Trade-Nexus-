import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

interface OfficeRow {
  label: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
}

/** Straight-line distance between two coordinates, in metres. */
function metresBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadius = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Attendance rows carry a photo and coordinates.
 * Admin sees all. Employees see their own (Telecaller sees own).
 * Team Leader and HR never receive photos or locations on the wire.
 */
function forViewer(row: any, isAdmin: boolean, requestingEmployeeId?: string) {
  if (isAdmin) return row;
  if (requestingEmployeeId && (row.employeeId === requestingEmployeeId || row.id === requestingEmployeeId)) {
    return row;
  }
  const { checkInPhoto, checkInLat, checkInLng, checkOutPhoto, checkOutLat, checkOutLng, ...rest } = row;
  return rest;
}

// GET /api/attendance?role=admin&employeeId=...
router.get('/', (req: Request, res: Response) => {
  try {
    const isAdmin = String(req.query.role || '').toLowerCase() === 'admin';
    const employeeId = String(req.query.employeeId || '').trim();
    const records = employeeId
      ? db
          .prepare('SELECT * FROM attendance_records WHERE (employeeId = ? OR employeeId IS NULL) ORDER BY date DESC, checkIn DESC')
          .all(employeeId)
      : db
          .prepare('SELECT * FROM attendance_records ORDER BY date DESC, checkIn DESC')
          .all();
    return res.status(200).json(records.map((r) => forViewer(r, isAdmin, employeeId)));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/attendance/today — check current shift status for employee
router.get('/today', (req: Request, res: Response) => {
  try {
    const employeeId = String(req.query.employeeId || '').trim();
    const todayStr = new Date().toISOString().split('T')[0];

    const record = employeeId
      ? db.prepare(`
          SELECT * FROM attendance_records 
          WHERE (employeeId = ? OR id LIKE ?) AND date = ?
          ORDER BY createdAt DESC LIMIT 1
        `).get(employeeId, `%${todayStr}%`, todayStr)
      : db.prepare(`
          SELECT * FROM attendance_records 
          WHERE date = ?
          ORDER BY createdAt DESC LIMIT 1
        `).get(todayStr);

    if (!record) {
      return res.status(200).json({
        hasRecord: false,
        status: 'NOT_CHECKED_IN',
        faceIdStatus: 'NOT_CHECKED_IN',
        checkIn: null,
        checkOut: null,
        date: todayStr
      });
    }

    const r = record as any;
    const isCheckedOut = !!r.checkOut;
    return res.status(200).json({
      hasRecord: true,
      checkedIn: !isCheckedOut && Boolean(r.checkIn),
      id: r.id,
      date: r.date,
      status: isCheckedOut ? 'SHIFT_COMPLETED' : 'ON_DUTY',
      shiftStatus: isCheckedOut ? 'SHIFT_COMPLETED' : 'ON_DUTY',
      faceIdStatus: isCheckedOut ? 'ON_BREAK' : 'VERIFIED_PRESENT',
      checkIn: r.checkIn,
      inTime: r.checkIn,
      checkOut: r.checkOut,
      outTime: r.checkOut,
      workHours: r.workHours,
      method: r.method,
      locationStatus: r.locationStatus,
      checkInPhoto: r.checkInPhoto,
      checkInLat: r.checkInLat,
      checkInLng: r.checkInLng,
      checkInDistanceM: r.checkInDistanceM
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/attendance/geocode/reverse?lat=...&lon=...
router.get('/geocode/reverse', async (req: Request, res: Response) => {
  try {
    const lat = req.query.lat;
    const lon = req.query.lon || req.query.lng;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat and lon are required' });
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}&format=json`,
      {
        headers: {
          'User-Agent': 'TradeNexus-Attendance/1.0 (admin@tradenexus.in)'
        }
      }
    );

    if (response.ok) {
      const data = (await response.json()) as any;
      return res.status(200).json({
        displayName: data.display_name || '',
        address: data.address || {},
        raw: data
      });
    }

    // Fallback to BigDataCloud
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (bdcRes.ok) {
      const bdc = (await bdcRes.json()) as any;
      const displayName = [bdc.locality, bdc.city, bdc.principalSubdivision, bdc.postcode, bdc.countryName].filter(Boolean).join(', ');
      return res.status(200).json({ displayName, raw: bdc });
    }
    return res.status(502).json({ error: 'Reverse geocode service unavailable' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/attendance/geocode/search?q=...
router.get('/geocode/search', async (req: Request, res: Response) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'Query q is required' });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(String(q))}&format=json&limit=5`,
      {
        headers: {
          'User-Agent': 'TradeNexus-Attendance/1.0 (admin@tradenexus.in)'
        }
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Search failed' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/attendance/office — where the office is
router.get('/office', (_req: Request, res: Response) => {
  try {
    const office = db.prepare('SELECT * FROM office_settings LIMIT 1').get();
    return res.status(200).json(office);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/attendance/office — set the office address and how far counts as "at office"
router.put('/office', (req: Request, res: Response) => {
  try {
    const { label, latitude, longitude, radiusMeters } = req.body;
    const current = db.prepare('SELECT * FROM office_settings LIMIT 1').get() as any;
    db.prepare(
      `UPDATE office_settings
         SET label = ?, latitude = ?, longitude = ?, radiusMeters = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      label ?? current.label,
      latitude ?? current.latitude,
      longitude ?? current.longitude,
      radiusMeters ?? current.radiusMeters,
      current.id
    );
    return res.status(200).json(db.prepare('SELECT * FROM office_settings LIMIT 1').get());
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/attendance — check in (optionally with photo and location)
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      id, date, dayNumber, status, checkIn, checkOut, workHours, method,
      employeeId, employeeName, checkInPhoto, latitude, longitude, inTime, outTime
    } = req.body;

    const resolvedCheckIn = checkIn || inTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const resolvedCheckOut = checkOut || outTime || null;

    const recDate = date || new Date().toISOString().split('T')[0];
    const recDay = dayNumber || new Date(recDate).getDate();
    // One record per employee per day
    const recId = id || `att-${recDate}-${employeeId || 'self'}`;

    // Judge the location against the office perimeter
    let distance: number | null = null;
    let locationStatus = 'NOT_SHARED';

    const office = db.prepare('SELECT * FROM office_settings LIMIT 1').get() as OfficeRow | undefined;
    const isOfficeConfigured = office?.latitude != null && office?.longitude != null;

    if (isOfficeConfigured) {
      if (latitude == null || longitude == null) {
        return res.status(400).json({
          error: 'Location permission is required to verify you are at the office before punching in.',
          code: 'LOCATION_REQUIRED'
        });
      }
      distance = metresBetween(latitude, longitude, office.latitude, office.longitude);
      if (distance > office.radiusMeters) {
        const distStr = distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance}m`;
        return res.status(403).json({
          error: `You are outside the office perimeter (${distStr} away). Punch-in is restricted to within ${office.radiusMeters}m of the office.`,
          distance,
          radiusMeters: office.radiusMeters,
          code: 'GEOFENCE_OUT_OF_BOUNDS'
        });
      }
      locationStatus = 'AT_OFFICE';
    } else if (latitude != null && longitude != null) {
      locationStatus = 'OFFICE_NOT_SET';
    }

    db.prepare(`
      INSERT INTO attendance_records
        (id, date, dayNumber, status, checkIn, checkOut, workHours, method,
         employeeId, employeeName, checkInPhoto, checkInLat, checkInLng,
         checkInDistanceM, locationStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        checkIn = coalesce(attendance_records.checkIn, excluded.checkIn),
        checkOut = coalesce(excluded.checkOut, attendance_records.checkOut),
        workHours = coalesce(excluded.workHours, attendance_records.workHours),
        method = coalesce(excluded.method, attendance_records.method),
        employeeName = coalesce(excluded.employeeName, attendance_records.employeeName),
        checkInPhoto = coalesce(attendance_records.checkInPhoto, excluded.checkInPhoto),
        checkInLat = coalesce(attendance_records.checkInLat, excluded.checkInLat),
        checkInLng = coalesce(attendance_records.checkInLng, excluded.checkInLng),
        checkInDistanceM = coalesce(attendance_records.checkInDistanceM, excluded.checkInDistanceM),
        locationStatus = coalesce(attendance_records.locationStatus, excluded.locationStatus)
    `).run(
      recId, recDate, recDay, status || 'PRESENT', resolvedCheckIn, resolvedCheckOut,
      workHours || 'In Progress', method || 'Face ID Biometric',
      employeeId || null, employeeName || null, checkInPhoto || null,
      latitude ?? null, longitude ?? null, distance, locationStatus
    );

    // Keep the roster in step so Admin's register shows today's status
    if (employeeId) {
      db.prepare(
        `UPDATE team_members SET attendanceStatus = ?, checkInTime = ?, checkInMethod = ? WHERE id = ?`
      ).run(status || 'PRESENT', resolvedCheckIn, method || 'Face ID Biometric', employeeId);
    }

    const record = db.prepare('SELECT * FROM attendance_records WHERE id = ?').get(recId) as any;
    return res.status(201).json({
      ...record,
      inTime: record.checkIn,
      outTime: record.checkOut
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

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

// PUT /api/attendance/:id — check out, or correct a record
router.put('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM attendance_records WHERE id = ?').get(req.params.id) as any;
    if (!existing) return res.status(404).json({ error: 'Attendance record not found' });

    const { checkOutPhoto, latitude, longitude } = req.body;
    const merged = { ...existing, ...req.body };

    // Judge the check-out position the same way as the check-in
    let outDistance: number | null = existing.checkOutDistanceM ?? null;
    let outStatus: string | null = existing.checkOutLocationStatus ?? null;

    if (latitude != null && longitude != null) {
      const office = db.prepare('SELECT * FROM office_settings LIMIT 1').get() as OfficeRow | undefined;
      if (office?.latitude != null && office?.longitude != null) {
        outDistance = metresBetween(latitude, longitude, office.latitude, office.longitude);
        outStatus = outDistance <= office.radiusMeters ? 'AT_OFFICE' : 'AWAY';
      } else {
        outStatus = 'OFFICE_NOT_SET';
      }
    } else if (merged.checkOut && !outStatus) {
      outStatus = 'NOT_SHARED';
    }

    // Hours worked, once both ends of the day are known
    let workHours = merged.workHours;
    const start = minutesOfDay(merged.checkIn);
    const end = minutesOfDay(merged.checkOut);
    if (start != null && end != null && end >= start) {
      const mins = end - start;
      workHours = `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
    }

    db.prepare(
      `UPDATE attendance_records
         SET status = ?, checkIn = ?, checkOut = ?, workHours = ?, method = ?,
             checkOutPhoto = coalesce(?, checkOutPhoto),
             checkOutLat = coalesce(?, checkOutLat),
             checkOutLng = coalesce(?, checkOutLng),
             checkOutDistanceM = ?, checkOutLocationStatus = ?
       WHERE id = ?`
    ).run(
      merged.status, merged.checkIn, merged.checkOut, workHours, merged.method,
      checkOutPhoto ?? null, latitude ?? null, longitude ?? null,
      outDistance, outStatus, req.params.id
    );

    return res.status(200).json(db.prepare('SELECT * FROM attendance_records WHERE id = ?').get(req.params.id));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
