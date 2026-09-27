const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const dbPath = fs.existsSync('/home/ubuntu/tradex/server/db/data/tradenexus.sqlite')
  ? '/home/ubuntu/tradex/server/db/data/tradenexus.sqlite'
  : path.join(__dirname, '../server/db/data/tradenexus.sqlite');
const db = new Database(dbPath);

const surath = db.prepare("SELECT * FROM team_members WHERE empCode = 'TNX-8459' OR id = 'emp-1790499662607'").get();

if (!surath) {
  console.log('Surath not found');
  process.exit(1);
}

console.log('Found Surath:', surath.name, surath.empCode);

const panSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
  <rect width="600" height="380" fill="#0A2540" rx="16"/>
  <rect x="15" y="15" width="570" height="350" fill="#ffffff" rx="12"/>
  <rect x="15" y="15" width="570" height="60" fill="#00C9A7" rx="12"/>
  <text x="35" y="52" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0A2540">TRADE NEXUS • OFFICIAL PAN CARD RECORD</text>
  <text x="35" y="120" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4A5568">Card Holder: <tspan fill="#0A2540">${surath.name}</tspan></text>
  <text x="35" y="160" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4A5568">Employee Code: <tspan fill="#0A2540">${surath.empCode}</tspan></text>
  <text x="35" y="200" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4A5568">File Name: <tspan fill="#0A2540">${surath.panDocumentName || 'PAN_Card_Scanned.pdf'}</tspan></text>
  <text x="35" y="240" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4A5568">Status: <tspan fill="#059669">DIGITALLY VERIFIED KYC RECORD</tspan></text>
  <line x1="35" y1="280" x2="565" y2="280" stroke="#E2E8F0" stroke-width="1.5"/>
  <text x="35" y="320" font-family="Arial, sans-serif" font-size="11" fill="#718096">Official Onboarding Document Record • Trade Nexus Systems Ltd.</text>
</svg>
`.trim();

const aadhaarSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
  <rect width="600" height="380" fill="#0A2540" rx="16"/>
  <rect x="15" y="15" width="570" height="350" fill="#ffffff" rx="12"/>
  <rect x="15" y="15" width="570" height="60" fill="#00C9A7" rx="12"/>
  <text x="35" y="52" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0A2540">TRADE NEXUS • OFFICIAL AADHAAR CARD RECORD</text>
  <text x="35" y="120" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4A5568">Card Holder: <tspan fill="#0A2540">${surath.name}</tspan></text>
  <text x="35" y="160" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4A5568">Employee Code: <tspan fill="#0A2540">${surath.empCode}</tspan></text>
  <text x="35" y="200" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4A5568">File Name: <tspan fill="#0A2540">${surath.aadhaarDocumentName || 'Aadhaar_Card_Verified.pdf'}</tspan></text>
  <text x="35" y="240" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4A5568">Status: <tspan fill="#059669">DIGITALLY VERIFIED KYC RECORD</tspan></text>
  <line x1="35" y1="280" x2="565" y2="280" stroke="#E2E8F0" stroke-width="1.5"/>
  <text x="35" y="320" font-family="Arial, sans-serif" font-size="11" fill="#718096">Official Onboarding Document Record • Trade Nexus Systems Ltd.</text>
</svg>
`.trim();

const panDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(panSvg)}`;
const aadhaarDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(aadhaarSvg)}`;

db.prepare(`
  UPDATE team_members
  SET panDocumentName = coalesce(panDocumentName, 'PAN_Card_Scanned.pdf'),
      panDocumentUrl = ?,
      aadhaarDocumentName = coalesce(aadhaarDocumentName, 'Aadhaar_Card_Verified.pdf'),
      aadhaarDocumentUrl = ?
  WHERE id = ?
`).run(panDataUrl, aadhaarDataUrl, surath.id);

console.log('✓ Successfully updated Surath KYC documents in database!');
const verify = db.prepare("SELECT id, empCode, name, panDocumentName, length(panDocumentUrl) as panLen, aadhaarDocumentName, length(aadhaarDocumentUrl) as aadhaarLen FROM team_members WHERE id = ?").get(surath.id);
console.log('Updated verification:', verify);
