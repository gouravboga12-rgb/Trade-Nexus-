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
