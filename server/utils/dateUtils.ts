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
