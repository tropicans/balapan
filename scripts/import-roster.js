import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { csv: path.join(repoRoot, 'data', 'stc-vol8-roster.csv'), db: null, dry: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--csv') args.csv = argv[++i];
    else if (a === '--db') args.db = argv[++i];
    else if (a === '--dry') args.dry = true;
  }
  return args;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\r') {
      // ignore
    } else if (ch === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const SECTION_CONFIG = {
  'Presale': { type: 'presale', quota: 40, prefix: 'PRE' },
  'OTS': { type: 'ots', quota: 40, prefix: 'OTS' },
  'Top Up': { type: 'topup', quota: 20, prefix: 'TOP' }
};
const COMP_QUOTA = 40;
const COMP_PREFIX = 'COMP';

function toInt(value) {
  const n = parseInt(String(value || '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function slugEmail(name, no) {
  const base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '').slice(0, 40);
  return `${base || 'racer'}.${no}@stc.local`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.db) process.env.DB_PATH = path.resolve(args.db);

  const csvText = fs.readFileSync(path.resolve(args.csv), 'utf8');
  const rows = parseCsv(csvText);

  const { initDatabase } = await import('../server/db.js');
  const { default: db } = await import('../server/db.js');

  if (!args.dry) await initDatabase();

  let currentSection = null;
  const stats = { usersNew: 0, usersFound: 0, pkgsNew: 0, pkgsSkipped: 0, runsAdded: 0, sideEvent: 0, comp: 0, skippedRows: 0 };
  const touchedUserIds = new Set();
  const plan = [];

  for (const cells of rows) {
    const c0 = (cells[0] || '').trim();
    const c1 = (cells[1] || '').trim();
    const sets = (cells[2] || '').trim();
    const payment = (cells[3] || '').trim();
    const status = (cells[4] || '').trim();
    const sideEvent = (cells[5] || '').trim();

    if (!c0) continue;

    const sectionKey = Object.keys(SECTION_CONFIG).find((k) => c0.toLowerCase().startsWith(k.toLowerCase()));
    if (sectionKey) { currentSection = SECTION_CONFIG[sectionKey]; continue; }
    if (/^Total/i.test(c0)) continue;

    const racerNo = parseInt(c0, 10);
    if (!Number.isFinite(racerNo)) continue;
    if (!c1) { stats.skippedRows++; continue; }

    const isPaid = /lunas/i.test(status) && !/belum/i.test(status);
    let packageType;
    let quota;
    let prefix;
    let count;
    let pricePaid;

    if (isPaid && currentSection) {
      packageType = currentSection.type;
      quota = currentSection.quota;
      prefix = currentSection.prefix;
      count = Math.max(1, toInt(sets) || 1);
      pricePaid = toInt(payment);
    } else if (!status) {
      packageType = 'comp';
      quota = COMP_QUOTA;
      prefix = COMP_PREFIX;
      count = 1;
      pricePaid = 0;
      stats.comp++;
    } else {
      stats.skippedRows++;
      continue;
    }

    if (sideEvent === '1') stats.sideEvent++;

    plan.push({ racerNo, name: c1, packageType, quota, prefix, count, pricePaid, sideEvent: sideEvent === '1' ? 1 : 0 });
  }

  console.log(`\n[import-roster] ${args.dry ? 'DRY RUN — ' : ''}${plan.length} racer rows parsed from ${path.basename(args.csv)}`);

  const findUser = db.prepare('SELECT id FROM users WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))');
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, google_sub_id, team_name, role, is_virtual, side_event_gta)
    VALUES (?, ?, ?, NULL, NULL, 'participant', 0, ?)
  `);
  const findSerial = db.prepare('SELECT id FROM coupon_packages WHERE serial_number = ?');
  const insertPkg = db.prepare(`
    INSERT INTO coupon_packages (
      id, serial_number, user_id, total_quota, used_quota, remaining_quota,
      price_paid, payment_method, package_type, status, void_from_id
    ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, 'active', NULL)
  `);

  for (const item of plan) {
    let userId;
    const existing = args.dry ? null : findUser.get(item.name);
    if (existing) {
      userId = existing.id;
      stats.usersFound++;
    } else {
      userId = uuidv4();
      if (!args.dry) insertUser.run(userId, item.name, slugEmail(item.name, item.racerNo), item.sideEvent);
      stats.usersNew++;
    }
    touchedUserIds.add(userId);

    for (let s = 1; s <= item.count; s++) {
      const serial = `STC8-${item.prefix}-${String(item.racerNo).padStart(3, '0')}-${s}`;
      const dup = args.dry ? null : findSerial.get(serial);
      if (dup) { stats.pkgsSkipped++; continue; }
      if (!args.dry) {
        insertPkg.run(uuidv4(), serial, userId, item.quota, item.quota, item.pricePaid, 'cash', item.packageType);
      }
      stats.pkgsNew++;
      stats.runsAdded += item.quota;
    }
  }

  if (!args.dry) {
    const recomputeBalance = db.prepare(`
      UPDATE coupons
      SET balance = (
        SELECT COALESCE(SUM(remaining_quota), 0) FROM coupon_packages
        WHERE user_id = ? AND status = 'active'
      ), updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `);
    const ensureCoupon = db.prepare('SELECT id FROM coupons WHERE user_id = ?');
    const insertCoupon = db.prepare('INSERT INTO coupons (id, user_id, balance) VALUES (?, ?, 0)');
    for (const userId of touchedUserIds) {
      if (!ensureCoupon.get(userId)) insertCoupon.run(uuidv4(), userId);
      recomputeBalance.run(userId, userId);
    }
  }

  console.log('[import-roster] Result:');
  console.log(`  users:    ${stats.usersNew} created, ${stats.usersFound} already existed`);
  console.log(`  packages: ${stats.pkgsNew} created, ${stats.pkgsSkipped} skipped (serial exists)`);
  console.log(`  runs:     ${stats.runsAdded} total quota added`);
  console.log(`  comp:     ${stats.comp} free-coupon members`);
  console.log(`  side gta: ${stats.sideEvent} flagged`);
  console.log(`  skipped:  ${stats.skippedRows} unnamed/unpaid rows`);
  console.log(`  balance:  coupons.balance synced for ${touchedUserIds.size} users\n`);
}

main().catch((err) => {
  console.error('[import-roster] FAILED:', err);
  process.exit(1);
});