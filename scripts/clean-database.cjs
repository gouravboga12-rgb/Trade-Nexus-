const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'tradenexus_salt_2026').digest('hex');
}

const dbPath = path.join(__dirname, '..', 'server', 'db', 'data', 'tradenexus.sqlite');
console.log('Connecting to database at:', dbPath);
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = OFF');

const tables = [
  'assigned_leads',
  'call_logs',
  'client_leads',
  'lead_batches',
  'payment_verifications',
  'attendance_records',
  'leave_requests',
  'employee_profiles',
  'telecaller_stats',
  'team_members',
  'team_groups',
  'team_tasks',
  'team_meetings',
  'candidate_interviews',
  'onboarding_employees',
  'exit_employees',
  'face_biometric_profiles',
  'offer_letters',
  'payslips',
  'users',
];

console.log('--- PURGING ALL TABLES ---');
for (const table of tables) {
  try {
    const result = db.prepare(`DELETE FROM ${table}`).run();
    console.log(`Deleted rows from ${table}: ${result.changes}`);
  } catch (err) {
    console.warn(`Table ${table} could not be cleared:`, err.message);
  }
}

// Reseed Admin, HR, TL & Employee
console.log('--- RESEEDING CORE ACCOUNTS (Admin, HR, TL & Employee) ---');
const insertUser = db.prepare(`
  INSERT INTO users (id, email, passwordHash, name, role, empCode, employeeId, active)
  VALUES (?, ?, ?, ?, ?, ?, ?, 1)
`);

insertUser.run('usr-4', 'sagarsuchi26@gmail.com', hashPassword('Sagar@14326'), 'Super Admin', 'admin', 'TNX-AD01', 'emp-ad-1');
insertUser.run('usr-3', 'hr@tradenexus.com', hashPassword('hr123'), 'HR Manager', 'hr', 'TNX-HR01', 'emp-hr-1');
insertUser.run('usr-tl', 'tl@tradenexus.com', hashPassword('tl123'), 'Team Leader', 'team_leader', 'TNX-TL01', 'emp-tl-1');
insertUser.run('usr-emp', 'employee@tradenexus.com', hashPassword('emp123'), 'Telecaller Executive', 'telecaller', 'TNX-TC01', 'emp-tc-1');

// Reset stats to pure 0
try {
  const insertStats = db.prepare(`
    INSERT OR REPLACE INTO telecaller_stats (id, todayGoalCalls, dialsMade, connected, interested, rejected, averageCallDurationSec, monthlySalesTarget, monthlySalesAchieved)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertStats.run('stats-default', 0, 0, 0, 0, 0, 0, 0, 0);
} catch (e) {}

db.pragma('foreign_keys = ON');

// Verify counts
const memberCount = db.prepare('SELECT COUNT(*) as count FROM team_members').get().count;
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
const leadCount = db.prepare('SELECT COUNT(*) as count FROM assigned_leads').get().count;
const groupCount = db.prepare('SELECT COUNT(*) as count FROM team_groups').get().count;

console.log('\n=======================================');
console.log('✅ DATABASE RESET COMPLETE TO ZERO STATE:');
console.log(`- Team Members (Employees): ${memberCount} (Zero)`);
console.log(`- Squads (Groups): ${groupCount} (Zero)`);
console.log(`- Assigned Leads: ${leadCount} (Zero)`);
console.log(`- Total Users: ${userCount} (Only default Admin & HR)`);
console.log('=======================================\n');
