import db, { initDatabase } from '../server/db.js';

async function main() {
  await initDatabase();

  console.log('=== RACER RECONCILIATION & DEDUPLICATION SCRIPT ===\n');

  const renames = [
    { num: 21, newName: 'PTMK', sourceKey: 'stc:presale:21' },
    { num: 23, newName: 'papamiya', sourceKey: 'stc:presale:23' },
    { num: 24, newName: 'kasetklasik', sourceKey: 'stc:presale:24' },
    { num: 25, newName: 'slowdon', sourceKey: 'stc:presale:25' }
  ];

  console.log('1. Renaming base participants (#21, #23, #24, #25):');
  for (const r of renames) {
    const prev = db.prepare('SELECT id, name, participant_number FROM users WHERE participant_number = ? AND role = "participant"').get(r.num);
    if (prev) {
      db.prepare('UPDATE users SET name = ?, source_key = ? WHERE id = ?').run(r.newName, r.sourceKey, prev.id);
      console.log(`   ✓ #${r.num}: "${prev.name}" -> "${r.newName}" (source_key: ${r.sourceKey})`);
    } else {
      console.log(`   - #${r.num}: Not found`);
    }
  }

  console.log('\n2. Pruning unreferenced phantom duplicates (#41, #42, #43, #44):');
  const duplicateNumbers = [41, 42, 43, 44];
  for (const num of duplicateNumbers) {
    const user = db.prepare('SELECT id, name FROM users WHERE participant_number = ? AND role = "participant"').get(num);
    if (user) {
      let inMatch = false;
      try {
        const m = db.prepare('SELECT id FROM bracket_matches WHERE user_id_1 = ? OR user_id_2 = ? OR user_id_3 = ? OR winner_id = ? LIMIT 1').get(user.id, user.id, user.id, user.id);
        if (m) inMatch = true;
      } catch (_) {}

      let inBto = false;
      try {
        const b = db.prepare('SELECT id FROM bto_records WHERE user_id = ? LIMIT 1').get(user.id);
        if (b) inBto = true;
      } catch (_) {}

      if (!inMatch && !inBto) {
        db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
        console.log(`   ✓ Safely removed duplicate #${num} "${user.name}" (ID: ${user.id})`);
      } else {
        console.log(`   ⚠️ Skipped #${num} "${user.name}" (has match or BTO record)`);
      }
    } else {
      console.log(`   - Duplicate #${num}: Already not present in DB`);
    }
  }

  console.log('\n3. Linking source keys for active roster #1 - #40:');
  for (let n = 1; n <= 35; n++) {
    db.prepare('UPDATE users SET source_key = ? WHERE participant_number = ? AND role = "participant" AND source_key IS NULL').run(`stc:presale:${n}`, n);
  }
  for (let n = 36; n <= 40; n++) {
    db.prepare('UPDATE users SET source_key = ? WHERE participant_number = ? AND role = "participant" AND source_key IS NULL').run(`stc:ots:${n}`, n);
  }
  console.log('   ✓ Source keys linked.');

  const total = db.prepare('SELECT count(*) as cnt FROM users WHERE role = "participant"').get()?.cnt || 0;
  console.log(`\n✅ RECONCILIATION COMPLETE! Total participants in DB: ${total}`);
}

main().catch(console.error);
