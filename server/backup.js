import fs from 'fs';
import path from 'path';

/**
 * Generate a timestamp tag in local time: YYYYMMDD-HHmmss
 * @param {Date} [d=new Date()]
 * @returns {string}
 */
export function timestampTag(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${YYYY}${MM}${DD}-${HH}${mm}${ss}`;
}

/**
 * Create a timestamped backup of the SQLite database file.
 * Returns the created backup path or null if dbPath is falsy or does not exist.
 *
 * @param {string} dbPath
 * @returns {string|null}
 */
export function createTimestampedBackup(dbPath) {
  if (!dbPath || !fs.existsSync(dbPath)) return null;
  const dir = path.join(path.dirname(dbPath), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `tamiya-${timestampTag()}.sqlite`);
  fs.copyFileSync(dbPath, target);
  return target;
}
