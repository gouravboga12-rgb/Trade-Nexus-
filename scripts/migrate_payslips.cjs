const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'server', 'db', 'data', 'tradenexus.sqlite');
const db = new Database(dbPath);

const addColumnIfMissing = (table, column, definition) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[Migration] Added ${table}.${column}`);
  } else {
    console.log(`[Migration] ${table}.${column} already exists`);
  }
};

addColumnIfMissing('payslips', 'employeeType', "TEXT DEFAULT 'Full - Time'");
addColumnIfMissing('payslips', 'payDate', 'TEXT');
addColumnIfMissing('payslips', 'housingAllowance', 'REAL');
addColumnIfMissing('payslips', 'transportation', 'REAL');
addColumnIfMissing('payslips', 'performanceBonus', 'REAL DEFAULT 0');
addColumnIfMissing('payslips', 'healthInsurance', 'REAL DEFAULT 0');
addColumnIfMissing('payslips', 'pensionContribution', 'REAL DEFAULT 0');
addColumnIfMissing('payslips', 'authorizedName', "TEXT DEFAULT 'Muhammad Patel'");
addColumnIfMissing('payslips', 'authorizedRole', "TEXT DEFAULT 'Finance Manager – Trade Nexus'");

const updatedCols = db.prepare('PRAGMA table_info(payslips)').all();
console.log('Final payslips columns:');
console.log(updatedCols.map(c => c.name).join(', '));
