// Read-only diagnostic: compares won leads vs payment_verifications for revenue reconciliation.
// Usage (on server): node scripts/diagnose_revenue_mismatch.cjs [path/to/tradenexus.sqlite]
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const candidates = [
  process.argv[2],
  path.join(__dirname, '../server/db/data/tradenexus.sqlite'),
  path.join(__dirname, '../dist-server/db/data/tradenexus.sqlite'),
  path.join(__dirname, '../dist/server/db/data/tradenexus.sqlite'),
].filter(Boolean);
const dbPath = candidates.find((p) => fs.existsSync(p));
if (!dbPath) { console.error('DB not found', candidates); process.exit(1); }
console.log('DB:', dbPath);
const db = new Database(dbPath, { readonly: true });

console.log('\n=== Won / valued leads ===');
console.table(db.prepare(`
  SELECT id, name, phone, company, assignedToEmployeeName AS emp, status, dealValue, batchId, assignedDate, updatedAt
  FROM assigned_leads WHERE status = 'CONVERTED' OR dealValue > 0 ORDER BY phone, updatedAt
`).all());

console.log('\n=== payment_verifications ===');
console.table(db.prepare(`
  SELECT id, leadName, companyName, telecallerName, dealAmount, utrNumber, status, timestamp, createdAt
  FROM payment_verifications ORDER BY createdAt
`).all());
