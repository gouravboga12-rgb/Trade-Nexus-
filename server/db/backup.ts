import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data', 'tradenexus.sqlite');
const backupDir = path.join(__dirname, 'data', 'backups');

export function createDatabaseBackup(prefix: string = 'auto') {
  try {
    if (!fs.existsSync(dbPath)) {
      return;
    }

    const stats = fs.statSync(dbPath);
    if (stats.size === 0) {
      return;
    }

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `tradenexus-${prefix}-${timestamp}.sqlite`;
    const targetPath = path.join(backupDir, backupFileName);
    const latestPath = path.join(backupDir, 'tradenexus-latest.sqlite');

    fs.copyFileSync(dbPath, targetPath);
    fs.copyFileSync(dbPath, latestPath);

    console.log(`[Backup] Safe SQLite snapshot preserved at: ${backupFileName}`);

    // Retain only the latest 10 backups to prevent disk bloat
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('tradenexus-') && f.endsWith('.sqlite') && f !== 'tradenexus-latest.sqlite')
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 10) {
      for (const oldFile of files.slice(10)) {
        try {
          fs.unlinkSync(path.join(backupDir, oldFile.name));
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('[Backup] Notice: automatic backup skipped or failed:', err);
  }
}
