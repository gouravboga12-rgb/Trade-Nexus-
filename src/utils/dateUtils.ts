// Indian Standard Time (IST, UTC+5:30) date and time utilities
// Ensures all client-side and server-side punch in/out calculations match the user's real calendar day and time.

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

// Returns a Date object adjusted to current time in Asia/Kolkata
export function getISTDateObject(dateObj: Date = new Date()): Date {
  const istString = dateObj.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(istString);
}

// Returns tomorrow's date string YYYY-MM-DD in IST
export function getTomorrowDateIST(): string {
  const ist = getISTDateObject();
  ist.setDate(ist.getDate() + 1);
  return getTodayDateIST(ist);
}

// Returns current hour (0-23) and minute (0-59) in IST
export function getISTHourMinute(dateObj: Date = new Date()): { hours: number; minutes: number } {
  const ist = getISTDateObject(dateObj);
  return {
    hours: ist.getHours(),
    minutes: ist.getMinutes(),
  };
}

