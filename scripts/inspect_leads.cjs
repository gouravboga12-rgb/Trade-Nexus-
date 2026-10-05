const Database = require('better-sqlite3');
const db = new Database('/home/ubuntu/tradex/server/db/data/tradenexus.sqlite');

console.log('=== ASSIGNED LEADS ===');
const leads = db.prepare("SELECT id, name, phone, assignedToEmployeeId, assignedToEmployeeName, callCount, status FROM assigned_leads").all();
console.log(JSON.stringify(leads, null, 2));

console.log('=== TEAM MEMBERS ===');
const members = db.prepare("SELECT id, empCode, name, role, portal, active FROM team_members").all();
console.log(JSON.stringify(members, null, 2));
