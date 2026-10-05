import { TeamMember, AttendanceRecord, PaymentVerificationItem, AssignedLead } from '../types';
import { getTodayDateIST } from './dateUtils';

/**
 * Escapes a cell value for RFC-4180 compliant CSV format.
 * - Wraps in double quotes
 * - Escapes internal quotes as ""
 * - Cleans newlines and strips literal 'undefined' / 'null'
 */
export const escapeCsvCell = (val: any): string => {
  if (val === null || val === undefined) return '""';
  const str = String(val).trim();
  if (str === 'undefined' || str === 'null') return '""';
  return `"${str.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
};

/**
 * Downloads a CSV file using Blob with UTF-8 BOM (\uFEFF)
 * Guarantees perfect rendering in Microsoft Excel, Google Sheets, LibreOffice, and Numbers.
 */
export const downloadCsvBlob = (filename: string, header: string, rows: string[]) => {
  // \uFEFF is the UTF-8 Byte Order Mark. Without it, Excel on Windows defaults to ANSI/ASCII and breaks symbols.
  const csvContent = '\uFEFF' + `${header}\r\n${rows.join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const todayStr = getTodayDateIST ? getTodayDateIST() : new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `${filename}_${todayStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

// ============================================================================
// 1. EMPLOYEES ROSTER REPORT
// ============================================================================
export const exportEmployeesRosterCsv = (teamMembers: TeamMember[]) => {
  // Deduplicate by id / empCode
  const seen = new Set<string>();
  const uniqueMembers = teamMembers.filter((m) => {
    const key = m.id || m.empCode;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const header = [
    'Employee Name',
    'Employee Code',
    'Role',
    'Team / Squad',
    'Account Status',
    'Attendance Status',
    'Check-in Time',
    'Check-in Method',
    'Calls Today',
    'Daily Call Goal',
    'Sales Achieved (₹)',
    'Monthly Sales Target (₹)',
    'Conversion Rate %',
    'Email',
    'Phone'
  ].join(',');

  const rows = uniqueMembers.map((e) => {
    const accountStatus = e.active === 0 ? 'DEACTIVATED' : 'ACTIVE';
    const convRate = e.conversionRate || (e.dialsToday > 0 ? Math.round(((e.interested || 0) / e.dialsToday) * 100) : 0);

    return [
      escapeCsvCell(e.name),
      escapeCsvCell(e.empCode),
      escapeCsvCell(e.role),
      escapeCsvCell(e.group || 'General'),
      escapeCsvCell(accountStatus),
      escapeCsvCell(e.attendanceStatus || 'ABSENT'),
      escapeCsvCell(e.checkInTime || 'Not punched in'),
      escapeCsvCell(e.checkInMethod || 'None'),
      Number(e.dialsToday || 0),
      Number(e.goalCalls || 60),
      Number(e.salesAchieved || 0),
      Number(e.salesTarget || 200000),
      convRate,
      escapeCsvCell(e.email || 'N/A'),
      escapeCsvCell(e.phone || 'N/A')
    ].join(',');
  });

  downloadCsvBlob('Employees_Roster', header, rows);
};

// ============================================================================
// 2. ATTENDANCE REGISTER REPORT
// ============================================================================
export const exportAttendanceRegisterCsv = (
  teamMembers: TeamMember[], 
  attendanceLogs: AttendanceRecord[] = []
) => {
  const header = [
    'Date',
    'Employee Name',
    'Employee Code / ID',
    'Team / Squad',
    'Status',
    'Check-in Time',
    'Check-out Time',
    'Work Hours',
    'Verification Method',
    'Office Location'
  ].join(',');

  // If historical logs are present, export deduplicated audit logs
  if (attendanceLogs && attendanceLogs.length > 0) {
    const seen = new Set<string>();
    const uniqueLogs = attendanceLogs.filter((log) => {
      const key = `${log.employeeId || log.employeeName}_${log.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date descending
    uniqueLogs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const rows = uniqueLogs.map((log) => {
      const member = teamMembers.find((m) => m.id === log.employeeId || m.empCode === log.employeeId);
      const team = member?.group || 'General';

      return [
        escapeCsvCell(log.date || getTodayDateIST()),
        escapeCsvCell(log.employeeName || member?.name || 'Staff'),
        escapeCsvCell(log.employeeId || member?.empCode || 'N/A'),
        escapeCsvCell(team),
        escapeCsvCell(log.status || 'PRESENT'),
        escapeCsvCell(log.checkIn || '—'),
        escapeCsvCell(log.checkOut || '—'),
        escapeCsvCell(log.workHours || '—'),
        escapeCsvCell(log.method || 'Biometric / Geo-tagged'),
        escapeCsvCell(log.locationStatus === 'AT_OFFICE' ? 'At Corporate Office' : log.locationStatus || 'Verified')
      ].join(',');
    });

    downloadCsvBlob('Attendance_Register', header, rows);
  } else {
    // Fallback to today's active roster register
    const today = getTodayDateIST();
    const rows = teamMembers.map((m) => [
      escapeCsvCell(today),
      escapeCsvCell(m.name),
      escapeCsvCell(m.empCode),
      escapeCsvCell(m.group || 'General'),
      escapeCsvCell(m.attendanceStatus || 'ABSENT'),
      escapeCsvCell(m.checkInTime || '—'),
      escapeCsvCell(m.checkOutTime || '—'),
      escapeCsvCell('—'),
      escapeCsvCell(m.checkInMethod || 'Pending'),
      escapeCsvCell(m.checkInMethod ? 'At Office' : 'Not punch in')
    ].join(','));

    downloadCsvBlob('Attendance_Register', header, rows);
  }
};

// ============================================================================
// 3. CALLS & CONVERSIONS REPORT
// ============================================================================
export const exportCallsAndConversionsCsv = (teamMembers: TeamMember[]) => {
  const seen = new Set<string>();
  const uniqueMembers = teamMembers.filter((m) => {
    const key = m.id || m.empCode;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const header = [
    'Employee Name',
    'Employee Code',
    'Role',
    'Team / Squad',
    'Dials Made Today',
    'Connected Calls',
    'Interested Prospects',
    'Daily Call Goal',
    'Conversion Rate %'
  ].join(',');

  const rows = uniqueMembers.map((m) => {
    const dials = Number(m.dialsToday || 0);
    const connected = Number(m.connected || 0);
    const interested = Number(m.interested || 0);
    const goal = Number(m.goalCalls || 60);
    const rate = m.conversionRate || (dials > 0 ? Math.round((interested / dials) * 100) : 0);

    return [
      escapeCsvCell(m.name),
      escapeCsvCell(m.empCode),
      escapeCsvCell(m.role),
      escapeCsvCell(m.group || 'General'),
      dials,
      connected,
      interested,
      goal,
      rate
    ].join(',');
  });

  downloadCsvBlob('Calls_And_Conversions', header, rows);
};

// ============================================================================
// 4. SALES VS TARGET REPORT
// ============================================================================
export const exportSalesVsTargetCsv = (teamMembers: TeamMember[]) => {
  const seen = new Set<string>();
  const uniqueMembers = teamMembers.filter((m) => {
    const key = m.id || m.empCode;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const header = [
    'Employee Name',
    'Employee Code',
    'Team / Squad',
    'Sales Achieved (₹)',
    'Monthly Sales Target (₹)',
    'Target Achievement %',
    'Calls Completed Today',
    'Daily Calling Target',
    'Target Status'
  ].join(',');

  const rows = uniqueMembers.map((m) => {
    const achieved = Number(m.salesAchieved || 0);
    const target = Number(m.salesTarget || 200000);
    const pct = Math.round((achieved / Math.max(1, target)) * 100);
    const status = pct >= 100 ? 'TARGET ACHIEVED' : pct >= 50 ? 'ON TRACK' : 'IN PROGRESS';

    return [
      escapeCsvCell(m.name),
      escapeCsvCell(m.empCode),
      escapeCsvCell(m.group || 'General'),
      achieved,
      target,
      pct,
      Number(m.dialsToday || 0),
      Number(m.goalCalls || 60),
      escapeCsvCell(status)
    ].join(',');
  });

  downloadCsvBlob('Sales_Vs_Target', header, rows);
};

// ============================================================================
// 5. PAYMENT VERIFICATIONS REPORT
// ============================================================================
export const exportPaymentVerificationsCsv = (paymentVerifications: PaymentVerificationItem[]) => {
  // Deduplicate won deal payment verifications
  const seen = new Set<string>();
  const uniquePayments = paymentVerifications.filter((p) => {
    // Unique key combines id, or UTR + dealAmount + telecaller
    const key = p.id || `${p.utrNumber || ''}_${p.dealAmount}_${(p.telecallerName || '').toLowerCase()}_${p.status}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const header = [
    'Payment Date',
    'Company Name',
    'Customer / Client Name',
    'Customer Phone',
    'Lead Name',
    'Closing Telecaller',
    'Deal Amount (₹)',
    'Payment Mode',
    'UTR / Transaction Number',
    'Customer Bank',
    'Customer Account / UPI',
    'Audit Status'
  ].join(',');

  const rows = uniquePayments.map((p) => {
    const dateStr = p.timestamp ? p.timestamp.slice(0, 10) : getTodayDateIST();
    return [
      escapeCsvCell(dateStr),
      escapeCsvCell(p.companyName || 'Private Enterprise'),
      escapeCsvCell(p.customerName || p.leadName || 'Customer'),
      escapeCsvCell(p.customerPhone || 'N/A'),
      escapeCsvCell(p.leadName || p.customerName || 'Customer'),
      escapeCsvCell(p.telecallerName || 'Unassigned'),
      Number(p.dealAmount || 0),
      escapeCsvCell(p.paymentMode || 'UPI / Bank Transfer'),
      escapeCsvCell(p.utrNumber || 'N/A'),
      escapeCsvCell(p.customerBankName || 'N/A'),
      escapeCsvCell(p.customerAccountNumber || p.customerUpiId || 'N/A'),
      escapeCsvCell(p.status || 'PENDING')
    ].join(',');
  });

  downloadCsvBlob('Payment_Verifications', header, rows);
};

// ============================================================================
// 6. LEAD ALLOCATION PIPELINE REPORT
// ============================================================================
export const exportLeadAllocationCsv = (assignedLeads: AssignedLead[]) => {
  // Deduplicate identical lead entries if any exist
  const seen = new Set<string>();
  const uniqueLeads = assignedLeads.filter((l) => {
    // Prefer ID, but also ensure exact duplicates with same phone, rep, and name don't repeat
    const compositeKey = `${(l.phone || '').trim()}_${(l.assignedToEmployeeName || '').trim().toLowerCase()}_${(l.name || '').trim().toLowerCase()}_${l.status}`;
    const key = l.id ? `${l.id}_${compositeKey}` : compositeKey;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const header = [
    'Lead Name',
    'Company',
    'Phone',
    'Email',
    'City',
    'Assigned Telecaller',
    'Lead Status',
    'Calls Made',
    'Allocation Date',
    'Requirement / Notes'
  ].join(',');

  const rows = uniqueLeads.map((l) => {
    const allocDate = l.assignedDate || (l as any).date || (l.createdAt ? l.createdAt.slice(0, 10) : getTodayDateIST());

    return [
      escapeCsvCell(l.name),
      escapeCsvCell(l.company || 'Private Enterprise'),
      escapeCsvCell(l.phone),
      escapeCsvCell(l.email || 'N/A'),
      escapeCsvCell(l.city || 'Pan-India'),
      escapeCsvCell(l.assignedToEmployeeName || 'Unassigned'),
      escapeCsvCell(l.status || 'PENDING'),
      Number(l.callCount || 0),
      escapeCsvCell(allocDate),
      escapeCsvCell(l.notes || '')
    ].join(',');
  });

  downloadCsvBlob('Lead_Allocation_Pipeline', header, rows);
};
