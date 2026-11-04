const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../db/data/tradenexus.sqlite');
const db = new Database(dbPath);

const OFFICIAL_COMPANY_NAME = 'Trade nexus trade Smart';
const OFFICIAL_COMPANY_ADDRESS = 'RR westbrook,6th main HSR layout , beside pizza artistry, Bengaluru 102';
const OFFICIAL_COMPANY_PHONE = '+919483001083';
const OFFICIAL_COMPANY_EMAIL = 'hr@tradenexustradesmart.in';
const OFFICIAL_COMPANY_WEBSITE = 'tradenexustradesmart.co.in';
const OFFICIAL_SIGNATORY_NAME = 'T. Vidhya Sagar';
const OFFICIAL_SIGNATORY_ROLE = 'Chief Executive Officer';

console.log('--- EXECUTING COMPANY DETAILS SQL MIGRATION ---');

const tmRes = db.prepare(`
  UPDATE team_members
  SET companyAddress = ?,
      companyPhone = ?,
      companyEmail = ?,
      companyWebsite = ?,
      signatoryName = ?,
      signatoryRole = ?
`).run(
  OFFICIAL_COMPANY_ADDRESS,
  OFFICIAL_COMPANY_PHONE,
  OFFICIAL_COMPANY_EMAIL,
  OFFICIAL_COMPANY_WEBSITE,
  OFFICIAL_SIGNATORY_NAME,
  OFFICIAL_SIGNATORY_ROLE
);
console.log('Updated team_members rows:', tmRes.changes);

const olRes = db.prepare(`
  UPDATE offer_letters
  SET companyName = ?,
      companyAddress = ?,
      companyPhone = ?,
      companyEmail = ?,
      companyWebsite = ?,
      signatoryName = ?,
      signatoryRole = ?
`).run(
  OFFICIAL_COMPANY_NAME,
  OFFICIAL_COMPANY_ADDRESS,
  OFFICIAL_COMPANY_PHONE,
  OFFICIAL_COMPANY_EMAIL,
  OFFICIAL_COMPANY_WEBSITE,
  OFFICIAL_SIGNATORY_NAME,
  OFFICIAL_SIGNATORY_ROLE
);
console.log('Updated offer_letters rows:', olRes.changes);

const expRes = db.prepare(`
  UPDATE experience_certificates
  SET companyName = ?,
      signatoryName = ?,
      signatoryRole = ?
`).run(
  OFFICIAL_COMPANY_NAME,
  OFFICIAL_SIGNATORY_NAME,
  OFFICIAL_SIGNATORY_ROLE
);
console.log('Updated experience_certificates rows:', expRes.changes);

const relRes = db.prepare(`
  UPDATE relieving_letters
  SET companyName = ?,
      signatoryName = ?,
      signatoryRole = ?
`).run(
  OFFICIAL_COMPANY_NAME,
  OFFICIAL_SIGNATORY_NAME,
  OFFICIAL_SIGNATORY_ROLE
);
console.log('Updated relieving_letters rows:', relRes.changes);

// Clean up stored outdated PDFs in employee_documents so fresh PDFs with official company details are always served
const docRes = db.prepare(`
  DELETE FROM employee_documents
  WHERE category IN ('ID Card', 'Offer Letter')
`).run();
console.log('Cleared legacy employee_documents cache to force regeneration:', docRes.changes);

console.log('Sample verified team_members:');
console.log(db.prepare('SELECT id, name, companyAddress, companyPhone, companyEmail, companyWebsite FROM team_members LIMIT 3').all());

console.log('Sample verified offer_letters:');
console.log(db.prepare('SELECT id, candidateName, companyName, companyAddress, companyPhone, companyEmail, companyWebsite FROM offer_letters LIMIT 3').all());
