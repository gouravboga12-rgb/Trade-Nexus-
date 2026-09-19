import db from './connection.js';
import { hashPassword } from './authUtils.js';

export function seedUsersIfEmpty() {
  try {
    const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
    if (userCount > 0) return;

    console.log('[SQLite DB] Seeding default auth user credentials...');
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, passwordHash, name, role, empCode, employeeId, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const users = [
      { id: 'usr-3', email: 'hr@tradenexus.com', password: 'hr123', name: 'HR Manager', role: 'hr', empCode: 'TNX-HR01', employeeId: 'emp-hr-1' },
      { id: 'usr-4', email: 'admin@tradenexus.com', password: 'admin123', name: 'Super Admin', role: 'admin', empCode: 'TNX-AD01', employeeId: 'emp-ad-1' }
    ];

    for (const u of users) {
      const hash = hashPassword(u.password);
      insertUser.run(u.id, u.email, hash, u.name, u.role, u.empCode, u.employeeId, 1);
    }
    console.log('[SQLite DB] Core admin and HR accounts seeded.');
  } catch (err) {
    console.error('[SQLite DB] Error seeding users:', err);
  }
}

export function seedInitialDataIfEmpty() {
  seedUsersIfEmpty();

  const statsCount = (db.prepare('SELECT COUNT(*) as count FROM telecaller_stats').get() as { count: number }).count;
  
  if (statsCount > 0) {
    return;
  }

  console.log('[SQLite DB] Initializing pristine clean database state (0 dummy members, 0 dummy groups, 0 fake calls, 0 fake revenue)...');

  // 1. Telecaller Stats (Pristine 0s)
  const insertStats = db.prepare(`
    INSERT OR REPLACE INTO telecaller_stats (id, todayGoalCalls, dialsMade, connected, interested, rejected, averageCallDurationSec, monthlySalesTarget, monthlySalesAchieved)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertStats.run('stats-default', 0, 0, 0, 0, 0, 0, 0, 0);

  console.log('[SQLite DB] Pristine database initialization complete: 0 dummy employees, 0 fake groups, 0 fake deals.');
}

export function resetDatabaseToClean() {
  console.log('[SQLite DB] Purging stale data and resetting to pristine clean state...');
  try {
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

    for (const table of tables) {
      try {
        db.exec(`DELETE FROM ${table};`);
      } catch (err) {
        // table might not exist yet, ignore
      }
    }

    seedUsersIfEmpty();
    seedInitialDataIfEmpty();
    return { success: true, message: 'Database reset to clean state.' };
  } catch (err: any) {
    console.error('[SQLite DB] Error resetting database:', err);
    return { success: false, error: err.message };
  }
}


