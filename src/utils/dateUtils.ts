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

// Safely extracts YYYY-MM-DD in IST from any lead record, handling 'Today' strings & missing timestamps
export function getLeadDate(lead?: { assignedDate?: string; createdAt?: string; updatedAt?: string } | null): string {
  if (!lead) return getTodayDateIST();
  if (lead.assignedDate && lead.assignedDate !== 'Today' && /^\d{4}-\d{2}-\d{2}/.test(lead.assignedDate)) {
    return lead.assignedDate.slice(0, 10);
  }
  if (lead.createdAt && /^\d{4}-\d{2}-\d{2}/.test(lead.createdAt)) {
    return lead.createdAt.slice(0, 10);
  }
  if (lead.updatedAt && /^\d{4}-\d{2}-\d{2}/.test(lead.updatedAt)) {
    return lead.updatedAt.slice(0, 10);
  }
  return getTodayDateIST();
}

// Returns start and end YYYY-MM-DD in IST for standard date filters
export function getDateRangeIST(
  mode: 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_7' | 'LAST_30' | 'CUSTOM',
  customStart?: string,
  customEnd?: string
): { start: string; end: string } {
  const istNow = getISTDateObject();
  const todayYMD = getTodayDateIST(istNow);

  if (mode === 'TODAY') {
    return { start: todayYMD, end: todayYMD };
  }

  if (mode === 'YESTERDAY') {
    const yDate = new Date(istNow);
    yDate.setDate(yDate.getDate() - 1);
    const yStr = getTodayDateIST(yDate);
    return { start: yStr, end: yStr };
  }

  if (mode === 'THIS_WEEK' || mode === 'LAST_7') {
    const wDate = new Date(istNow);
    wDate.setDate(wDate.getDate() - 7);
    return { start: getTodayDateIST(wDate), end: todayYMD };
  }

  if (mode === 'THIS_MONTH') {
    return { start: `${todayYMD.slice(0, 7)}-01`, end: todayYMD };
  }

  if (mode === 'LAST_30') {
    const mDate = new Date(istNow);
    mDate.setDate(mDate.getDate() - 30);
    return { start: getTodayDateIST(mDate), end: todayYMD };
  }

  if (mode === 'CUSTOM') {
    return {
      start: customStart || '1970-01-01',
      end: customEnd || '2099-12-31',
    };
  }

  return { start: '1970-01-01', end: '2099-12-31' };
}

// Checks if a date string falls inside the given period in IST
export function isDateInPeriodIST(
  dateStr?: string | null,
  mode: 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_7' | 'LAST_30' | 'CUSTOM' = 'ALL',
  customStart?: string,
  customEnd?: string
): boolean {
  if (mode === 'ALL') return true;
  if (!dateStr) return false;

  let cleanDate = dateStr;
  if (cleanDate === 'Today' || !/^\d{4}-\d{2}-\d{2}/.test(cleanDate)) {
    const parsed = new Date(cleanDate);
    if (!isNaN(parsed.getTime())) {
      cleanDate = getTodayDateIST(parsed);
    } else {
      cleanDate = getTodayDateIST();
    }
  } else {
    cleanDate = cleanDate.slice(0, 10);
  }

  const { start, end } = getDateRangeIST(mode, customStart, customEnd);
  return cleanDate >= start && cleanDate <= end;
}


