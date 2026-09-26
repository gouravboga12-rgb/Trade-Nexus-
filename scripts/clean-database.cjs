// clean-database.cjs: Safe database reset utility
// Automatically preserves backup before resetting and ensures all accounts, profiles and teams exist.
const path = require('path');
const { execSync } = require('child_process');

console.log('[Clean DB] Running safe database restore...');
require('./restore_database.cjs');
