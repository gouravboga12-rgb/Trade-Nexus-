import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'db', 'data', 'tradenexus.sqlite');

try {
  const db = new Database(dbPath);
  console.log('=== ATTENDANCE RECORDS ===');
  const rows = db.prepare('SELECT * FROM attendance_records ORDER BY date DESC, checkIn DESC').all();
  console.log('Total attendance records in DB:', rows.length);
  console.log(JSON.stringify(rows.slice(0, 5), null, 2));

  console.log('=== EMPLOYEE PROFILES ===');
  const profiles = db.prepare('SELECT id, name, roleTitle, checkInTime, faceIdStatus FROM employee_profiles').all();
  console.log(JSON.stringify(profiles, null, 2));
  console.log('=== USERS ===');
  const users = db.prepare('SELECT id, email, name, role, empCode, employeeId FROM users').all();
  console.log(JSON.stringify(users, null, 2));
  console.log('=== OFFICE SETTINGS ===');
  const office = db.prepare('SELECT * FROM office_settings').all();
  console.log(JSON.stringify(office, null, 2));
} catch (err) {
  console.log('Error querying:', err.message);
}
