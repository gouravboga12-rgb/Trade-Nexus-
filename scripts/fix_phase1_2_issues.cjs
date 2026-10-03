const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../server/db/data/tradenexus.sqlite');
const db = new Database(dbPath);

console.log('Connecting to SQLite at:', dbPath);

// 1. Remove duplicate Akash Deep rows from candidate_interviews, keep only the earliest one
const duplicates = db.prepare("SELECT id, createdAt FROM candidate_interviews WHERE candidateName = 'Akash Deep' ORDER BY createdAt ASC").all();
console.log('Found Akash Deep rows:', duplicates.length);
if (duplicates.length > 1) {
  const toDelete = duplicates.slice(1).map(d => d.id);
  const placeholders = toDelete.map(() => '?').join(',');
  const info = db.prepare(`DELETE FROM candidate_interviews WHERE id IN (${placeholders})`).run(...toDelete);
  console.log('Deleted duplicate candidate rows:', info.changes);
}

// 2. Ensure Super Admin is in team_members
const adminInTm = db.prepare("SELECT id FROM team_members WHERE id = 'emp-ad-1' OR empCode = 'TNX-AD01'").get();
if (!adminInTm) {
  db.prepare(`
    INSERT INTO team_members (
      id, empCode, name, avatar, role, groupName, phone, emergencyPhone, dob, 
      employeeType, attendanceStatus, dialsToday, goalCalls, connected, interested, 
      salesAchieved, salesTarget, conversionRate, portal, email, password, active, 
      salary, joiningDate, address, bloodGroup
    ) VALUES (
      'emp-ad-1', 'TNX-AD01', 'Super Admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      'Executive Director', 'Executive Management', '+91 98765 43210', '+91 98765 43210',
      '1985-04-12', 'Full - Time', 'PRESENT', 0, 0, 0, 0, 0, 0, 0,
      'admin', 'sagarsuchi26@gmail.com', 'admin123', 1, 150000, '2023-01-01',
      'Trade Nexus Corporate HQ, Financial District', 'O+ ve'
    )
  `).run();
  console.log('Inserted Super Admin into team_members');
} else {
  console.log('Super Admin already exists in team_members');
}

// 3. Ensure HR Manager is in team_members
const hrInTm = db.prepare("SELECT id FROM team_members WHERE id = 'emp-hr-1' OR empCode = 'TNX-HR01'").get();
if (!hrInTm) {
  db.prepare(`
    INSERT INTO team_members (
      id, empCode, name, avatar, role, groupName, phone, emergencyPhone, dob, 
      employeeType, attendanceStatus, dialsToday, goalCalls, connected, interested, 
      salesAchieved, salesTarget, conversionRate, portal, email, password, active, 
      salary, joiningDate, address, bloodGroup
    ) VALUES (
      'emp-hr-1', 'TNX-HR01', 'HR Manager', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      'HR Head', 'Human Resources', '+91 98765 43211', '+91 98765 43211',
      '1990-08-20', 'Full - Time', 'PRESENT', 0, 0, 0, 0, 0, 0, 0,
      'hr', 'hr@tradenexus.com', 'hr123', 1, 85000, '2023-06-15',
      'Trade Nexus Corporate HQ, Financial District', 'B+ ve'
    )
  `).run();
  console.log('Inserted HR Manager into team_members');
} else {
  console.log('HR Manager already exists in team_members');
}

console.log('Total team_members:', db.prepare('SELECT count(*) as cnt FROM team_members').get().cnt);
console.log('Total candidates:', db.prepare('SELECT count(*) as cnt FROM candidate_interviews').get().cnt);
