// Indian Standard Time (IST, UTC+5:30) date and time utilities for server

export function getTodayDateIST(dateObj: Date = new Date()): string {
  try {
    return dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } catch {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export function getCurrentTimeIST(dateObj: Date = new Date()): string {
  try {
    return dateObj.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

export function minutesOfDay(t?: string | null): number | null {
  if (!t) return null;
  const m = String(t).trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  if (m[3]) {
    hours %= 12;
    if (m[3].toUpperCase() === 'PM') hours += 12;
  }
  return hours * 60 + parseInt(m[2], 10);
}

// Safely normalizes any date representation (e.g. "04 Nov 2026", "2026-11-04", ISO timestamp, Date object) to YYYY-MM-DD in IST
export function normalizeDateToYMD(raw?: string | Date | null): string {
  if (!raw) return '';
  if (raw instanceof Date) {
    return getTodayDateIST(raw);
  }
  const trimmed = String(raw).trim();
  if (!trimmed) return '';
  if (trimmed.toLowerCase() === 'today') return getTodayDateIST();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return getTodayDateIST(parsed);
  }
  return trimmed;
}
