const Database = require('better-sqlite3');
const db = new Database('/home/ubuntu/tradex/server/db/data/tradenexus.sqlite');

console.log('--- TEAM MEMBERS ---');
console.log(db.prepare("SELECT id, empCode, name, email, panDocumentName, length(panDocumentUrl) as panLen, aadhaarDocumentName, length(aadhaarDocumentUrl) as aadhaarLen, length(avatar) as avatarLen FROM team_members WHERE empCode LIKE '%8459%' OR name LIKE '%Surath%'").all());

console.log('--- ONBOARDING ---');
console.log(db.prepare("SELECT * FROM onboarding_employees WHERE empCode LIKE '%8459%' OR name LIKE '%Surath%'").all());

console.log('--- EMPLOYEE DOCUMENTS ---');
console.log(db.prepare("SELECT id, employeeId, title, category, fileName, length(content) as contentLen FROM employee_documents").all());
