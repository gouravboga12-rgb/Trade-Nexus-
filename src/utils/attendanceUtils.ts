import { TeamMember, AttendanceRecord, LeaveRequest, CalendarSettings } from '../types';
import { normalizeDateToYMD, minutesOfDay, getTodayDateIST, getISTHourMinute } from './dateUtils';

export interface EvaluatedAttendance {
  status: 'PRESENT' | 'LATE' | 'ON_LEAVE' | 'ABSENT' | 'WEEKLY_OFF' | 'HOLIDAY';
  badgeLabel: string;
  checkIn?: string;
  checkOut?: string;
  isLate?: boolean;
  lateMinutes?: number;
  leave?: LeaveRequest;
  record?: AttendanceRecord;
}

export function evaluateMemberAttendanceForDate(
  member: TeamMember,
  dateYMD: string, // YYYY-MM-DD
  attendanceLogs: AttendanceRecord[] = [],
  leaveRequests: LeaveRequest[] = [],
  calendarSettings?: CalendarSettings,
  weeklyOffDays: number[] = [0],
  companyHolidays: { date: string; name?: string }[] = []
): EvaluatedAttendance {
  const targetYMD = normalizeDateToYMD(dateYMD) || getTodayDateIST();
  const todayYMD = getTodayDateIST();

  // 1. Check for Approved Leave covering targetYMD
  const matchingLeave = leaveRequests.find((l) => {
    const isApproved =
      l.status === 'APPROVED' || (l as any).approvalStage === 'APPROVED';
    if (!isApproved) return false;

    // Match employee by id, empCode, or name
    const mId = member.id ? String(member.id).trim().toLowerCase() : '';
    const mCode = member.empCode ? String(member.empCode).trim().toLowerCase() : '';
    const mName = member.name ? String(member.name).trim().toLowerCase() : '';

    const lEmpId = l.employeeId ? String(l.employeeId).trim().toLowerCase() : '';
    const lEmpCode = l.employeeCode ? String(l.employeeCode).trim().toLowerCase() : '';
    const lEmpName = l.employeeName ? String(l.employeeName).trim().toLowerCase() : '';

    const matchesEmp =
      (lEmpId && (lEmpId === mId || lEmpId === mCode)) ||
      (lEmpCode && (lEmpCode === mCode || lEmpCode === mId)) ||
      (lEmpName && mName && lEmpName === mName);

    if (!matchesEmp) return false;

    const fromYMD = normalizeDateToYMD(l.fromDate || (l as any).startDate);
    const toYMD = normalizeDateToYMD(l.toDate || (l as any).endDate || fromYMD);

    if (!fromYMD && !toYMD) return false;
    const start = fromYMD || toYMD;
    const end = toYMD || fromYMD;
    const [minDate, maxDate] = start <= end ? [start, end] : [end, start];

    return targetYMD >= minDate && targetYMD <= maxDate;
  });

  if (matchingLeave) {
    return {
      status: 'ON_LEAVE',
      badgeLabel: 'ON LEAVE',
      leave: matchingLeave,
    };
  }

  // 2. Check Attendance Logs for targetYMD
  const mId = member.id ? String(member.id).trim().toLowerCase() : '';
  const mCode = member.empCode ? String(member.empCode).trim().toLowerCase() : '';
  const mName = member.name ? String(member.name).trim().toLowerCase() : '';

  const record = attendanceLogs.find((a) => {
    if (normalizeDateToYMD(a.date) !== targetYMD) return false;
    const aEmpId = a.employeeId ? String(a.employeeId).trim().toLowerCase() : '';
    const aEmpName = a.employeeName ? String(a.employeeName).trim().toLowerCase() : '';
    const aRecordId = a.id ? String(a.id).trim().toLowerCase() : '';

    return (
      (aEmpId && (aEmpId === mId || aEmpId === mCode || aRecordId.includes(mId))) ||
      (aEmpName && mName && aEmpName === mName)
    );
  });

  const shiftStart = calendarSettings?.shiftStartTime || '09:00 AM';
  const shiftStartMin = minutesOfDay(shiftStart) ?? (9 * 60);
  const graceMin = Number(calendarSettings?.gracePeriodMinutes) || 5;
  const cutoffMin = shiftStartMin + graceMin;

  if (record && record.checkIn) {
    const checkInMin = minutesOfDay(record.checkIn);
    const isLateByCutoff = checkInMin !== null && checkInMin > cutoffMin;
    const isMarkedLate = record.status === 'LATE' || isLateByCutoff;
    const lateMinutes = checkInMin !== null && checkInMin > cutoffMin ? checkInMin - cutoffMin : 0;

    return {
      status: isMarkedLate ? 'LATE' : 'PRESENT',
      badgeLabel: isMarkedLate ? 'LATE' : 'PRESENT',
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      isLate: isMarkedLate,
      lateMinutes,
      record,
    };
  }

  // 3. Fallback for TODAY using in-memory member properties if record isn't in attendanceLogs yet
  if (targetYMD === todayYMD) {
    if (member.attendanceStatus === 'ON_LEAVE') {
      return {
        status: 'ON_LEAVE',
        badgeLabel: 'ON LEAVE',
      };
    }
    if (member.attendanceStatus === 'PRESENT' || member.checkInTime) {
      const checkInTime = member.checkInTime || '09:00 AM';
      const checkInMin = minutesOfDay(checkInTime);
      const isLateByCutoff = checkInMin !== null && checkInMin > cutoffMin;
      const isMarkedLate = member.attendanceStatus === 'LATE' || isLateByCutoff;
      const lateMinutes = checkInMin !== null && checkInMin > cutoffMin ? checkInMin - cutoffMin : 0;

      return {
        status: isMarkedLate ? 'LATE' : 'PRESENT',
        badgeLabel: isMarkedLate ? 'LATE' : 'PRESENT',
        checkIn: member.checkInTime,
        isLate: isMarkedLate,
        lateMinutes,
      };
    }
  }

  // 4. Check for Holiday
  const holiday = (companyHolidays || []).find((h) => normalizeDateToYMD(h.date) === targetYMD);
  if (holiday) {
    return {
      status: 'HOLIDAY',
      badgeLabel: 'HOLIDAY',
    };
  }

  // 5. Check for Weekly Off
  const parts = targetYMD.split('-').map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayOfWeek = d.getDay();
    const dayOfMonth = d.getDate();
    const satIndex = Math.ceil(dayOfMonth / 7);
    const isAltSatOff =
      calendarSettings?.weekendPolicy === 'ALTERNATE_SATURDAY' &&
      dayOfWeek === 6 &&
      (satIndex === 2 || satIndex === 4);
    const isWeeklyOff = (weeklyOffDays || [0]).includes(dayOfWeek) || isAltSatOff;
    if (isWeeklyOff) {
      return {
        status: 'WEEKLY_OFF',
        badgeLabel: 'WEEKLY OFF',
      };
    }
  }

  // 6. Otherwise Absent
  return {
    status: 'ABSENT',
    badgeLabel: 'ABSENT',
  };
}

