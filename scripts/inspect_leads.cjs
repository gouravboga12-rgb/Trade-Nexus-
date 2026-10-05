const Database = require('better-sqlite3');
const db = new Database('/home/ubuntu/tradex/server/db/data/tradenexus.sqlite');

console.log('=== PAYMENT VERIFICATIONS ===');
console.log(db.prepare("SELECT id, leadName, companyName, telecallerName, dealAmount, status, timestamp FROM payment_verifications").all());

console.log('=== TEAM MEMBERS SALES ===');
console.log(db.prepare("SELECT id, name, salesAchieved, salesTarget FROM team_members").all());

console.log('=== CONVERTED ASSIGNED LEADS ===');
console.log(db.prepare("SELECT id, name, company, assignedToEmployeeName, dealValue, status, assignedDate, updatedAt FROM assigned_leads WHERE status = 'CONVERTED' OR dealValue > 0").all());
