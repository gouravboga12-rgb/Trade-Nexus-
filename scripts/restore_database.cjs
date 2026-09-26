const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'tradenexus_salt_2026').digest('hex');
}

const dbPath = path.join(__dirname, '..', 'server', 'db', 'data', 'tradenexus.sqlite');
const backupDir = path.join(__dirname, '..', 'server', 'db', 'data', 'backups');

console.log('[Restore] Connecting to database at:', dbPath);

// Ensure backup directory exists & save a snapshot before any changes
if (fs.existsSync(dbPath)) {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `tradenexus-restore-backup-${timestamp}.sqlite`);
  fs.copyFileSync(dbPath, backupFile);
  fs.copyFileSync(dbPath, path.join(backupDir, 'tradenexus-latest.sqlite'));
  console.log('[Restore] Backup saved to:', backupFile);
}

const db = new Database(dbPath);

function getTableCount(table) {
  try {
    const res = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    return res ? res.count : 0;
  } catch (e) {
    return 0;
  }
}

// 1. Core Users (Admin, HR, TL, Telecallers)
console.log('--- RESTORING CORE USER ACCOUNTS ---');
const insertUser = db.prepare(`
  INSERT INTO users (id, email, passwordHash, name, role, empCode, employeeId, active)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const users = [
  { id: 'usr-4', email: 'sagarsuchi26@gmail.com', password: 'Sagar@14326', name: 'Super Admin', role: 'admin', empCode: 'TNX-AD01', employeeId: 'emp-ad-1' },
  { id: 'usr-hr-boga', email: 'bogagourav5@gmail.com', password: 'hr123', name: 'HR Officer', role: 'hr', empCode: 'TNX-8096', employeeId: 'emp-hr-boga' },
  { id: 'usr-3', email: 'hr@tradenexus.com', password: 'hr123', name: 'HR Manager', role: 'hr', empCode: 'TNX-HR01', employeeId: 'emp-hr-1' },
  { id: 'usr-tl', email: 'tl@tradenexus.com', password: 'tl123', name: 'Team Leader', role: 'team_leader', empCode: 'TNX-TL01', employeeId: 'emp-tl-1' },
  { id: 'usr-emp', email: 'employee@tradenexus.com', password: 'emp123', name: 'Telecaller Executive', role: 'telecaller', empCode: 'TNX-TC01', employeeId: 'emp-tc-1' },
  { id: 'usr-tc-gourav', email: 'gouravboga12@gmail.com', password: 'emp123', name: 'Gourav Boga', role: 'telecaller', empCode: 'TNX-8275', employeeId: 'emp-tc-gourav' },
  { id: 'usr-tc-zoro', email: 'bogagourav10@gmail.com', password: 'emp123', name: 'Zoro Juro', role: 'telecaller', empCode: 'TNX-8316', employeeId: 'emp-tc-zoro' },
  { id: 'usr-tc-nikhil', email: 'dachepallynikhil6301@gmail.com', password: 'emp123', name: 'Nikhil Bill', role: 'telecaller', empCode: 'TNX-8442', employeeId: 'emp-tc-nikhil' }
];

for (const u of users) {
  const existing = db.prepare('SELECT id, email FROM users WHERE LOWER(email) = ?').get(u.email.toLowerCase());
  if (!existing) {
    const hash = hashPassword(u.password);
    insertUser.run(u.id, u.email, hash, u.name, u.role, u.empCode, u.employeeId, 1);
    console.log(`+ Added user: ${u.email} (${u.role})`);
  } else {
    // If admin, ensure password and role are active
    if (u.email === 'sagarsuchi26@gmail.com') {
      const hash = hashPassword(u.password);
      db.prepare('UPDATE users SET role = ?, name = ?, passwordHash = ?, active = 1 WHERE id = ?').run('admin', 'Super Admin', hash, existing.id);
      console.log(`✓ Admin user verified: ${u.email}`);
    }
  }
}

// 2. Employee Profiles
if (getTableCount('employee_profiles') === 0) {
  console.log('--- RESTORING EMPLOYEE PROFILES ---');
  const insertProfile = db.prepare(`
    INSERT INTO employee_profiles (id, empCode, name, roleTitle, department, teamName, teamLeaderName, email, phone, joinDate, bloodGroup, faceIdStatus, checkInTime, totalLeaveBalance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const profiles = [
    { id: 'emp-ad-1', empCode: 'TNX-AD01', name: 'Super Admin', roleTitle: 'Executive Director', department: 'Executive Management', teamName: 'Leadership', teamLeaderName: 'Management Board', email: 'sagarsuchi26@gmail.com', phone: '+91 98450 00001', joinDate: '01 Jan 2024', bloodGroup: 'O+ Positive', faceIdStatus: 'REGISTERED', checkInTime: '08:30 AM', totalLeaveBalance: 24 },
    { id: 'emp-hr-boga', empCode: 'TNX-8096', name: 'HR Officer', roleTitle: 'HR Operations Officer', department: 'Human Resources', teamName: 'HR & People Ops', teamLeaderName: 'Super Admin', email: 'bogagourav5@gmail.com', phone: '+91 98450 80960', joinDate: '15 Feb 2024', bloodGroup: 'B+ Positive', faceIdStatus: 'REGISTERED', checkInTime: '09:00 AM', totalLeaveBalance: 18 },
    { id: 'emp-hr-1', empCode: 'TNX-HR01', name: 'HR Manager', roleTitle: 'HR Head', department: 'Human Resources', teamName: 'HR & People Ops', teamLeaderName: 'Super Admin', email: 'hr@tradenexus.com', phone: '+91 98450 11111', joinDate: '01 Feb 2024', bloodGroup: 'A+ Positive', faceIdStatus: 'REGISTERED', checkInTime: '09:00 AM', totalLeaveBalance: 18 },
    { id: 'emp-tl-1', empCode: 'TNX-TL01', name: 'Team Leader', roleTitle: 'Sales Team Leader', department: 'Sales & Client Acquisition', teamName: 'Alpha Growth Team', teamLeaderName: 'Super Admin', email: 'tl@tradenexus.com', phone: '+91 98450 22222', joinDate: '10 Feb 2024', bloodGroup: 'AB+ Positive', faceIdStatus: 'REGISTERED', checkInTime: '09:00 AM', totalLeaveBalance: 16 },
    { id: 'emp-tc-gourav', empCode: 'TNX-8275', name: 'Gourav Boga', roleTitle: 'Senior SDR Specialist', department: 'Sales & Client Acquisition', teamName: 'HNI Closers', teamLeaderName: 'Team Leader', email: 'gouravboga12@gmail.com', phone: '+91 98450 82750', joinDate: '12 Jan 2024', bloodGroup: 'O+ Positive', faceIdStatus: 'REGISTERED', checkInTime: '09:12 AM', totalLeaveBalance: 14 },
    { id: 'emp-tc-zoro', empCode: 'TNX-8316', name: 'Zoro Juro', roleTitle: 'Telecaller Executive', department: 'Sales & Client Acquisition', teamName: 'Inbound Qualifiers', teamLeaderName: 'Team Leader', email: 'bogagourav10@gmail.com', phone: '+91 98450 83160', joinDate: '01 Mar 2024', bloodGroup: 'B+ Positive', faceIdStatus: 'REGISTERED', checkInTime: '09:28 AM', totalLeaveBalance: 14 },
    { id: 'emp-tc-nikhil', empCode: 'TNX-8442', name: 'Nikhil Bill', roleTitle: 'Telecaller Executive', department: 'Sales & Client Acquisition', teamName: 'Inbound Qualifiers', teamLeaderName: 'Team Leader', email: 'dachepallynikhil6301@gmail.com', phone: '+91 98450 84420', joinDate: '15 Mar 2024', bloodGroup: 'O+ Positive', faceIdStatus: 'REGISTERED', checkInTime: '10:15 AM', totalLeaveBalance: 14 },
    { id: 'emp-tc-1', empCode: 'TNX-TC01', name: 'Telecaller Executive', roleTitle: 'Sales Executive', department: 'Sales & Client Acquisition', teamName: 'HNI Closers', teamLeaderName: 'Team Leader', email: 'employee@tradenexus.com', phone: '+91 98450 12345', joinDate: '12 Jan 2024', bloodGroup: 'O+ Positive', faceIdStatus: 'REGISTERED', checkInTime: '09:00 AM', totalLeaveBalance: 14 }
  ];
  for (const p of profiles) {
    insertProfile.run(p.id, p.empCode, p.name, p.roleTitle, p.department, p.teamName, p.teamLeaderName, p.email, p.phone, p.joinDate, p.bloodGroup, p.faceIdStatus, p.checkInTime, p.totalLeaveBalance);
  }
}

// 3. Team Members
if (getTableCount('team_members') === 0) {
  console.log('--- RESTORING TEAM MEMBERS ---');
  const insertTeamMember = db.prepare(`
    INSERT INTO team_members (id, empCode, name, avatar, role, groupName, phone, attendanceStatus, checkInTime, checkInMethod, dialsToday, goalCalls, connected, interested, salesAchieved, salesTarget, conversionRate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const members = [
    { id: 'tm-1', empCode: 'TNX-8275', name: 'Gourav Boga', avatar: 'GB', role: 'Senior SDR Specialist', groupName: 'HNI Closers', phone: '+91 98450 82750', attendanceStatus: 'PRESENT', checkInTime: '09:12 AM', checkInMethod: 'Face ID Biometric', dialsToday: 68, goalCalls: 100, connected: 44, interested: 12, salesAchieved: 145000, salesTarget: 200000, conversionRate: 17.6 },
    { id: 'tm-2', empCode: 'TNX-8493', name: 'Priya Nair', avatar: 'PN', role: 'Inside Sales Specialist', groupName: 'HNI Closers', phone: '+91 98450 67890', attendanceStatus: 'PRESENT', checkInTime: '09:05 AM', checkInMethod: 'Face ID Biometric', dialsToday: 82, goalCalls: 100, connected: 58, interested: 16, salesAchieved: 190000, salesTarget: 200000, conversionRate: 19.5 },
    { id: 'tm-3', empCode: 'TNX-8316', name: 'Zoro Juro', avatar: 'ZJ', role: 'Telecaller Executive', groupName: 'Inbound Qualifiers', phone: '+91 98450 83160', attendanceStatus: 'PRESENT', checkInTime: '09:28 AM', checkInMethod: 'Geo-tagged', dialsToday: 51, goalCalls: 90, connected: 32, interested: 7, salesAchieved: 95000, salesTarget: 180000, conversionRate: 13.7 },
    { id: 'tm-4', empCode: 'TNX-8442', name: 'Nikhil Bill', avatar: 'NB', role: 'Telecaller Executive', groupName: 'Inbound Qualifiers', phone: '+91 98450 84420', attendanceStatus: 'LATE', checkInTime: '10:15 AM', checkInMethod: 'Face ID Biometric', dialsToday: 39, goalCalls: 90, connected: 21, interested: 5, salesAchieved: 65000, salesTarget: 180000, conversionRate: 12.8 },
    { id: 'tm-5', empCode: 'TNX-8501', name: 'Rohan Joshi', avatar: 'RJ', role: 'Junior Telecaller', groupName: 'Retention Squad', phone: '+91 98450 99001', attendanceStatus: 'ON_LEAVE', checkInTime: null, checkInMethod: null, dialsToday: 0, goalCalls: 80, connected: 0, interested: 0, salesAchieved: 40000, salesTarget: 150000, conversionRate: 0 },
    { id: 'tm-6', empCode: 'TNX-8504', name: 'Kavita Menon', avatar: 'KM', role: 'Inside Sales Specialist', groupName: 'Retention Squad', phone: '+91 98450 22334', attendanceStatus: 'PRESENT', checkInTime: '08:58 AM', checkInMethod: 'Face ID Biometric', dialsToday: 74, goalCalls: 100, connected: 49, interested: 11, salesAchieved: 160000, salesTarget: 200000, conversionRate: 14.8 },
    { id: 'tm-7', empCode: 'TNX-TC01', name: 'Telecaller Executive', avatar: 'TE', role: 'Sales Executive', groupName: 'HNI Closers', phone: '+91 98450 12345', attendanceStatus: 'PRESENT', checkInTime: '09:00 AM', checkInMethod: 'Face ID Biometric', dialsToday: 55, goalCalls: 100, connected: 35, interested: 9, salesAchieved: 110000, salesTarget: 200000, conversionRate: 16.0 }
  ];
  for (const m of members) {
    insertTeamMember.run(m.id, m.empCode, m.name, m.avatar, m.role, m.groupName, m.phone, m.attendanceStatus, m.checkInTime, m.checkInMethod, m.dialsToday, m.goalCalls, m.connected, m.interested, m.salesAchieved, m.salesTarget, m.conversionRate);
  }
}

// 4. Team Groups
if (getTableCount('team_groups') === 0) {
  console.log('--- RESTORING TEAM GROUPS ---');
  const insertGroup = db.prepare(`
    INSERT INTO team_groups (id, name, description, leaderName, memberCount, monthlyTarget, achieved, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const groups = [
    { id: 'grp-1', name: 'HNI Closers', description: 'High-ticket corporate clients & enterprise accounts', leaderName: 'Priya Nair', memberCount: 3, monthlyTarget: 400000, achieved: 335000, color: '#00C9A7' },
    { id: 'grp-2', name: 'Inbound Qualifiers', description: 'Fresh web leads, Google Ads, and campaign inquiries', leaderName: 'Zoro Juro', memberCount: 2, monthlyTarget: 360000, achieved: 160000, color: '#00B4D8' },
    { id: 'grp-3', name: 'Retention Squad', description: 'Account renewals, upsells & feedback calls', leaderName: 'Kavita Menon', memberCount: 2, monthlyTarget: 350000, achieved: 200000, color: '#F59E0B' }
  ];
  for (const g of groups) {
    insertGroup.run(g.id, g.name, g.description, g.leaderName, g.memberCount, g.monthlyTarget, g.achieved, g.color);
  }
}

// 5. Call Logs
if (getTableCount('call_logs') === 0) {
  console.log('--- RESTORING CALL LOGS ---');
  const insertCallLog = db.prepare(`
    INSERT INTO call_logs (id, clientName, companyName, phoneNumber, timestamp, durationSec, outcome, notes, followUpDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const callLogs = [
    { id: 'cl-1', clientName: 'Rajesh Singhania', companyName: 'Singhania Logistics Ltd', phoneNumber: '+91 98200 12345', timestamp: 'Today, 11:32 AM', durationSec: 342, outcome: 'INTERESTED', notes: 'Interested in API enterprise access. Requested customized commercial proposal.', followUpDate: 'Tomorrow, 02:00 PM' },
    { id: 'cl-2', clientName: 'Pooja Agarwal', companyName: 'Zenith Logistics', phoneNumber: '+91 98111 22334', timestamp: 'Today, 10:45 AM', durationSec: 184, outcome: 'CONNECTED', notes: 'Scheduled live demonstration for procurement team.', followUpDate: '28 May 2025' },
    { id: 'cl-3', clientName: 'Amit Verma', companyName: 'Om Exports Corp', phoneNumber: '+91 97234 55667', timestamp: 'Today, 10:12 AM', durationSec: 45, outcome: 'REJECTED', notes: 'Already subscribed to alternative solution through Q3.', followUpDate: null },
    { id: 'cl-4', clientName: 'Suresh Raina', companyName: 'Prime Global', phoneNumber: '+91 98451 11223', timestamp: 'Today, 09:40 AM', durationSec: 210, outcome: 'CONNECTED', notes: 'Call rescheduled on prospect request.', followUpDate: 'Today, 04:30 PM' }
  ];
  for (const item of callLogs) {
    insertCallLog.run(item.id, item.clientName, item.companyName, item.phoneNumber, item.timestamp, item.durationSec, item.outcome, item.notes, item.followUpDate);
  }
}

// 6. Client Leads
if (getTableCount('client_leads') === 0) {
  console.log('--- RESTORING CLIENT LEADS ---');
  const insertClientLead = db.prepare(`
    INSERT INTO client_leads (id, name, company, phone, email, temperature, status, dueTime, dealValue, requirement, lastContacted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const clientLeads = [
    { id: 'lead-1', name: 'Vikram Mehta', company: 'Apex Global Corp', phone: '+91 98765 43210', email: 'vikram@apexglobal.com', temperature: 'HOT', status: 'Due Today', dueTime: '10:00 AM (Due in 15 mins)', dealValue: 45000, requirement: 'Product Demo & Custom Pricing Review', lastContacted: 'Today, 09:45 AM' },
    { id: 'lead-2', name: 'Pooja Agarwal', company: 'Zenith Logistics', phone: '+91 98111 22334', email: 'pooja@zenithlog.in', temperature: 'CONVERTED', status: 'Converted', dueTime: null, dealValue: 80000, requirement: 'Annual Enterprise Plan Sign-off', lastContacted: 'Today, 09:32 AM' },
    { id: 'lead-3', name: 'Deepak Singhal', company: 'Singhal Trading Co.', phone: '+91 99444 55667', email: 'deepak@singhaltrade.com', temperature: 'HOT', status: 'Due Today', dueTime: '11:30 AM', dealValue: 35000, requirement: 'Quote comparison with existing software', lastContacted: 'Yesterday, 04:15 PM' },
    { id: 'lead-4', name: 'Ananya Roy', company: 'Roy Digital Studios', phone: '+91 98222 33119', email: 'ananya@roystudios.io', temperature: 'WARM', status: 'Pending', dueTime: null, dealValue: 20000, requirement: 'Team Management & Attendance tracking', lastContacted: '2 days ago' },
    { id: 'lead-5', name: 'Karan Malhotra', company: 'Karan Exports Ltd', phone: '+91 97111 44558', email: 'karan@karanexports.com', temperature: 'WARM', status: 'Follow-up', dueTime: null, dealValue: 50000, requirement: 'Requested WhatsApp presentation deck', lastContacted: '3 days ago' }
  ];
  for (const lead of clientLeads) {
    insertClientLead.run(lead.id, lead.name, lead.company, lead.phone, lead.email, lead.temperature, lead.status, lead.dueTime, lead.dealValue, lead.requirement, lead.lastContacted);
  }
}

// 7. Attendance Records
if (getTableCount('attendance_records') === 0) {
  console.log('--- RESTORING ATTENDANCE RECORDS ---');
  const insertAttendance = db.prepare(`
    INSERT INTO attendance_records (id, date, dayNumber, status, checkIn, checkOut, workHours, method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const attendances = [
    { id: 'att-28', date: '2025-05-28', dayNumber: 28, status: 'PRESENT', checkIn: '09:12 AM', checkOut: '06:30 PM', workHours: '9h 18m', method: 'Face ID Biometric' },
    { id: 'att-27', date: '2025-05-27', dayNumber: 27, status: 'PRESENT', checkIn: '09:05 AM', checkOut: '06:15 PM', workHours: '9h 10m', method: 'Face ID Biometric' },
    { id: 'att-26', date: '2025-05-26', dayNumber: 26, status: 'PRESENT', checkIn: '09:14 AM', checkOut: '06:40 PM', workHours: '9h 26m', method: 'Face ID Biometric' },
    { id: 'att-25', date: '2025-05-25', dayNumber: 25, status: 'HOLIDAY', checkIn: null, checkOut: null, workHours: null, method: null },
    { id: 'att-24', date: '2025-05-24', dayNumber: 24, status: 'HOLIDAY', checkIn: null, checkOut: null, workHours: null, method: null },
    { id: 'att-23', date: '2025-05-23', dayNumber: 23, status: 'PRESENT', checkIn: '09:10 AM', checkOut: '06:20 PM', workHours: '9h 10m', method: 'Face ID Biometric' },
    { id: 'att-22', date: '2025-05-22', dayNumber: 22, status: 'LEAVE', checkIn: null, checkOut: null, workHours: '0h 00m', method: null },
    { id: 'att-21', date: '2025-05-21', dayNumber: 21, status: 'PRESENT', checkIn: '09:15 AM', checkOut: '06:05 PM', workHours: '8h 50m', method: 'Face ID Biometric' }
  ];
  for (const a of attendances) {
    insertAttendance.run(a.id, a.date, a.dayNumber, a.status, a.checkIn, a.checkOut, a.workHours, a.method);
  }
}

// 8. Leave Requests
if (getTableCount('leave_requests') === 0) {
  const insertLeave = db.prepare(`
    INSERT INTO leave_requests (id, employeeName, employeeCode, leaveType, fromDate, toDate, totalDays, reason, status, appliedOn, approvedBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertLeave.run('leave-1', 'Gourav Boga', 'TNX-8275', 'Casual Leave', '22 May 2025', '22 May 2025', 1, 'Family personal commitment in hometown', 'APPROVED', '20 May 2025', 'Team Leader');
  insertLeave.run('leave-2', 'Gourav Boga', 'TNX-8275', 'Sick Leave', '05 Jun 2025', '06 Jun 2025', 2, 'Scheduled medical health checkup', 'PENDING', 'Today', null);
}

// 9. Payslips
if (getTableCount('payslips') === 0) {
  const insertPayslip = db.prepare(`
    INSERT INTO payslips (id, month, year, basicSalary, hra, specialAllowance, incentives, pfDeduction, taxDeduction, netPay, generatedDate, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPayslip.run('pay-2025-04', 'April', 2025, 28000, 12000, 6000, 14500, 2400, 1800, 56300, '01 May 2025', 'PAID');
  insertPayslip.run('pay-2025-03', 'March', 2025, 28000, 12000, 6000, 18200, 2400, 2100, 59700, '01 Apr 2025', 'PAID');
}

// 10. Team Tasks
if (getTableCount('team_tasks') === 0) {
  const insertTask = db.prepare(`
    INSERT INTO team_tasks (id, title, assignedTo, groupName, dueDate, priority, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertTask.run('tsk-1', 'Close 5 Enterprise Demos Before Month End', 'Gourav Boga', 'HNI Closers', '31 May 2025', 'HIGH', 'IN_PROGRESS');
  insertTask.run('tsk-2', 'Follow-up with B2B Logistics Inbound Inquiries', 'Zoro Juro', 'Inbound Qualifiers', '29 May 2025', 'NORMAL', 'PENDING');
}

// 11. Team Meetings
if (getTableCount('team_meetings') === 0) {
  const insertMeeting = db.prepare(`
    INSERT INTO team_meetings (id, title, dateTime, type, location, attendeesCount, agenda)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertMeeting.run('mtg-1', 'Daily Morning Huddle & Target Review', 'Today • 09:30 AM - 09:50 AM', 'Team Standup', 'Conference Room 2 & Google Meet', 6, 'Review hourly dial quotas, share objection handling techniques, and address blocked leads.');
  insertMeeting.run('mtg-2', 'High-Ticket Objections & Pricing Coaching', 'Tomorrow • 04:00 PM - 04:45 PM', 'Product Training', 'Main Training Bay', 4, 'Deep dive into handling price objections and closing enterprise annual subscriptions.');
}

// 12. Candidate Interviews
if (getTableCount('candidate_interviews') === 0) {
  const insertCandidate = db.prepare(`
    INSERT INTO candidate_interviews (id, candidateName, roleApplied, experience, email, phone, status, interviewTime, interviewer, rating, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertCandidate.run('cand-1', 'Siddharth Rao', 'Senior Telecaller Specialist', '3.5 Yrs in FinTech Sales', 'siddharth.rao@gmail.com', '+91 98190 22334', 'INTERVIEW_SCHEDULED', 'Today • 03:30 PM', 'Team Leader', 4.5, 'Strong telecalling pitch. Scheduled Round 2 technical demo.');
  insertCandidate.run('cand-2', 'Megha Nair', 'SDR Team Lead', '5 Yrs in Enterprise Sales', 'megha.nair@outlook.com', '+91 98765 11223', 'OFFER_EXTENDED', 'Completed (Cleared)', 'HR Officer', 4.8, 'Offer letter dispatched with CTC ₹9.5 LPA. Joining scheduled for 01 June 2025.');
  insertCandidate.run('cand-3', 'Anil Kapoor', 'Inside Sales Representative', '1.5 Yrs in B2B Calling', 'anil.k@gmail.com', '+91 98330 99887', 'SCREENING', 'Tomorrow • 11:00 AM', 'HR Officer', null, 'Resume screened. Good English & Hindi communication.');
}

// 13. Onboarding Employees
if (getTableCount('onboarding_employees') === 0) {
  const insertOnboarding = db.prepare(`
    INSERT INTO onboarding_employees (id, empCode, name, role, department, joiningDate, probationEnd, status, documentsVerified, workstationAllocated, biometricEnrolled, trainingScheduled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertOnboarding.run('onb-1', 'TNX-8510', 'Vikram Joshi', 'Telecaller Executive', 'Sales & Client Acquisition', '01 May 2025', '01 Nov 2025 (3 Months Remaining)', 'IN_PROGRESS', 1, 1, 1, 0);
  insertOnboarding.run('onb-2', 'TNX-8512', 'Ananya Roy', 'Inside Sales Associate', 'Alpha Growth Team', '15 May 2025', '15 Nov 2025', 'DOCS_PENDING', 0, 1, 0, 0);
}

// 14. Exit Employees
if (getTableCount('exit_employees') === 0) {
  const insertExit = db.prepare(`
    INSERT INTO exit_employees (id, empCode, name, role, department, resignationDate, lastWorkingDay, status, assetsReturned, accountsSettled, knowledgeTransfer, relievingLetterIssued)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertExit.run('exit-1', 'TNX-8390', 'Manish Pandey', 'Junior Telecaller', 'Retention Squad', '10 May 2025', '31 May 2025', 'CLEARANCE_PENDING', 1, 0, 1, 0);
}

// 15. Assigned Leads
if (getTableCount('assigned_leads') === 0) {
  const insertAssignedLead = db.prepare(`
    INSERT INTO assigned_leads (id, name, phone, email, company, city, assignedToEmployeeId, assignedToEmployeeName, batchId, assignedDate, status, notes, callCount, lastCallTimestamp, dealValue, followUpDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const assignedLeads = [
    { id: 'asg-1', name: 'Suresh Raina', phone: '+91 98451 11223', email: 'suresh.r@primeglobal.com', company: 'Prime Global Logistics', city: 'Mumbai', assignedToEmployeeId: 'tm-1', assignedToEmployeeName: 'Gourav Boga', batchId: 'batch-1', assignedDate: 'Today', status: 'PENDING', notes: 'Imported from B2B Logistics Database', callCount: 0, lastCallTimestamp: null, dealValue: 0, followUpDate: null },
    { id: 'asg-2', name: 'Meera Nambiar', phone: '+91 97312 33445', email: 'meera@finedge.in', company: 'FinEdge Advisory Corp', city: 'Bengaluru', assignedToEmployeeId: 'tm-1', assignedToEmployeeName: 'Gourav Boga', batchId: 'batch-1', assignedDate: 'Today', status: 'INTERESTED', notes: 'Interested in Premium SaaS plan. Send quote by 3 PM.', callCount: 1, lastCallTimestamp: '10:45 AM', dealValue: 75000, followUpDate: null },
    { id: 'asg-3', name: 'Kavita Sharma', phone: '+91 99001 88776', email: 'kavita@apexretail.com', company: 'Apex Retailers Hub', city: 'Delhi NCR', assignedToEmployeeId: 'tm-1', assignedToEmployeeName: 'Gourav Boga', batchId: 'batch-1', assignedDate: 'Today', status: 'CALLBACK', notes: 'Requested callback after 4:00 PM today.', callCount: 1, lastCallTimestamp: '11:15 AM', dealValue: 0, followUpDate: 'Today, 04:00 PM' },
    { id: 'asg-4', name: 'Rohan Deshmukh', phone: '+91 96112 44556', email: 'rohan.d@omnitrade.in', company: 'OmniTrade Solutions', city: 'Pune', assignedToEmployeeId: 'tm-3', assignedToEmployeeName: 'Zoro Juro', batchId: 'batch-2', assignedDate: 'Today', status: 'PENDING', notes: 'Allocated batch for Zoro', callCount: 0, lastCallTimestamp: null, dealValue: 0, followUpDate: null },
    { id: 'asg-5', name: 'Deepak Chawla', phone: '+91 98223 99881', email: 'deepak@zenith.com', company: 'Zenith Logistics Tech', city: 'Hyderabad', assignedToEmployeeId: 'tm-3', assignedToEmployeeName: 'Zoro Juro', batchId: 'batch-2', assignedDate: 'Today', status: 'CONNECTED', notes: 'Spoke with CFO. Exploring multi-user license.', callCount: 1, lastCallTimestamp: '09:50 AM', dealValue: 0, followUpDate: null },
    { id: 'asg-6', name: 'Alok Aggarwal', phone: '+91 97441 22334', email: 'alok@bharatexport.com', company: 'Bharat Export Corp', city: 'Surat', assignedToEmployeeId: 'tm-4', assignedToEmployeeName: 'Nikhil Bill', batchId: 'batch-3', assignedDate: 'Today', status: 'PENDING', notes: 'Batch for Nikhil', callCount: 0, lastCallTimestamp: null, dealValue: 0, followUpDate: null }
  ];
  for (const asg of assignedLeads) {
    insertAssignedLead.run(asg.id, asg.name, asg.phone, asg.email, asg.company, asg.city, asg.assignedToEmployeeId, asg.assignedToEmployeeName, asg.batchId, asg.assignedDate, asg.status, asg.notes, asg.callCount, asg.lastCallTimestamp, asg.dealValue, asg.followUpDate);
  }
}

// 16. Lead Batches
if (getTableCount('lead_batches') === 0) {
  const insertBatch = db.prepare(`
    INSERT INTO lead_batches (id, fileName, uploadedAt, totalLeads, assignedToEmployeeName, assignedToEmployeeId)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertBatch.run('batch-1', 'B2B_Q3_HighValue_Leads.xlsx', 'Today, 09:00 AM', 50, 'Gourav Boga', 'tm-1');
  insertBatch.run('batch-2', 'Tech_Enterprises_South.csv', 'Today, 09:15 AM', 100, 'Zoro Juro', 'tm-3');
  insertBatch.run('batch-3', 'Logistics_Manufacturing_Batch4.xlsx', 'Today, 09:30 AM', 75, 'Nikhil Bill', 'tm-4');
}

// 17. Face Biometrics
if (getTableCount('face_biometric_profiles') === 0) {
  const insertFace = db.prepare(`
    INSERT INTO face_biometric_profiles (employeeId, employeeName, registeredPhoto, registeredAt, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertFace.run('emp-tc-gourav', 'Gourav Boga', '', '12 Jan 2024', 'REGISTERED');
  insertFace.run('emp-tc-zoro', 'Zoro Juro', '', '01 Mar 2024', 'REGISTERED');
  insertFace.run('emp-tc-nikhil', 'Nikhil Bill', '', '15 Mar 2024', 'REGISTERED');
}

// 18. Offer Letters
if (getTableCount('offer_letters') === 0) {
  const insertOffer = db.prepare(`
    INSERT INTO offer_letters (id, candidateName, candidateEmail, candidatePhone, roleTitle, department, annualCtc, monthlyGross, joiningDate, reportingManager, location, issuedDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertOffer.run('off-1', 'Srihari Nair', 'srihari.n@gmail.com', '+91 98450 67890', 'Telecaller Executive', 'Sales & Client Acquisition', 360000, 30000, '01 Jun 2025', 'Team Leader', 'Bengaluru Corporate HQ', '28 May 2025');
}

// 19. Payment Verifications
if (getTableCount('payment_verifications') === 0) {
  const insertPayment = db.prepare(`
    INSERT INTO payment_verifications (id, leadName, companyName, telecallerName, dealAmount, utrNumber, paymentMode, timestamp, status, receiptUrl)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPayment.run('pay-1', 'Rajesh Singhania', 'Singhania Logistics Ltd', 'Gourav Boga', 85000, 'HDFC948295820491', 'NEFT / RTGS', 'Today, 11:45 AM', 'PENDING_HR_AUDIT', null);
  insertPayment.run('pay-2', 'Vikram Mehta', 'Mehta Global Logistics', 'Priya Nair', 120000, 'ICIC849204928104', 'Corporate Net Banking', 'Yesterday, 04:15 PM', 'VERIFIED', null);
}

// 20. Telecaller Stats
if (getTableCount('telecaller_stats') === 0) {
  const insertStats = db.prepare(`
    INSERT OR REPLACE INTO telecaller_stats (id, todayGoalCalls, dialsMade, connected, interested, rejected, averageCallDurationSec, monthlySalesTarget, monthlySalesAchieved)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertStats.run('stats-default', 100, 52, 34, 11, 23, 210, 200000, 145000);
}

console.log('\n=======================================');
console.log('✅ DATABASE RESTORATION COMPLETE:');
console.log(`- Total Users: ${getTableCount('users')}`);
console.log(`- Team Members: ${getTableCount('team_members')}`);
console.log(`- Employee Profiles: ${getTableCount('employee_profiles')}`);
console.log(`- Team Groups: ${getTableCount('team_groups')}`);
console.log(`- Client Leads: ${getTableCount('client_leads')}`);
console.log(`- Call Logs: ${getTableCount('call_logs')}`);
console.log(`- Attendance Records: ${getTableCount('attendance_records')}`);
console.log(`- Assigned Leads: ${getTableCount('assigned_leads')}`);
console.log('=======================================\n');
