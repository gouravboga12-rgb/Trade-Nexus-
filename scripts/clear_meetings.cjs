const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'server', 'db', 'data', 'tradenexus.sqlite');
const db = new Database(dbPath);

const res = db.prepare('DELETE FROM team_meetings').run();
console.log('Cleared all meetings, deleted rows:', res.changes);
