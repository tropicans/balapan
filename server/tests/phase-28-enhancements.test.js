import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const uniqueTestDb = path.join(repoRoot, 'data', `test_phase28_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'false';
process.env.PORT = '0';
process.env.TEST_STRICT_AUTH = 'false';

const { initDatabase, default: db } = await import('../db.js');
const { app, server } = await import('../index.js');
const { RaceManager } = await import('../raceManager.js');
const { createEvent, setActiveEvent, getActiveEvent } = await import('../services/eventService.js');
const { syncParticipantsFromSheet } = await import('../services/googleSheetService.js');

test('Phase 28 Enhancements: ENH-01, ENH-02, ENH-04', async (t) => {
  if (!server.listening) {
    await new Promise(resolve => server.once('listening', resolve));
  }

  await t.test('ENH-01: Switching active events resets dynamic round lock settings to open', () => {
    // 1. Create two events
    const eventA = createEvent({ nama: 'Event Reset Test A', tanggal: '2026-09-18' });
    const eventB = createEvent({ nama: 'Event Reset Test B', tanggal: '2026-09-18' });

    // Set A active and lock round 2 & 3
    setActiveEvent(eventA.id);
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value) VALUES ('round2_status', 'locked')").run();
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value) VALUES ('round3_status', 'locked')").run();
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value) VALUES ('qualifying_status', 'locked')").run();

    assert.strictEqual(RaceManager.getRoundStatus(2), 'locked', 'Round 2 must be locked in event A');
    assert.strictEqual(RaceManager.getRoundStatus(3), 'locked', 'Round 3 must be locked in event A');

    // Switch to event B
    setActiveEvent(eventB.id);

    // Settings must now be reset to 'open'
    assert.strictEqual(RaceManager.getRoundStatus(2), 'open', 'Round 2 must be reset to open on switch');
    assert.strictEqual(RaceManager.getRoundStatus(3), 'open', 'Round 3 must be reset to open on switch');
    const qStatus = db.prepare("SELECT value FROM tournament_settings WHERE key = 'qualifying_status'").get();
    assert.strictEqual(qStatus?.value, 'open', 'Qualifying status must be reset to open on switch');
  });

  await t.test('ENH-02: Generic round lock enforcement on advanceBracketWinner & resetBracketMatch for any round', () => {
    const event = createEvent({ nama: 'Round Lock Multi-Round Test' });
    setActiveEvent(event.id);

    // Create participant users
    const p1 = { id: 'enh02-user-1', name: 'Racer 1' };
    const p2 = { id: 'enh02-user-2', name: 'Racer 2' };
    db.prepare("INSERT OR IGNORE INTO users (id, name, role, event_id) VALUES (?, ?, 'participant', ?)").run(p1.id, p1.name, event.id);
    db.prepare("INSERT OR IGNORE INTO users (id, name, role, event_id) VALUES (?, ?, 'participant', ?)").run(p2.id, p2.name, event.id);

    // Insert Round 3 match (match_number: 999)
    const matchRound3Id = 'bracket-r3-test-match-1';
    db.prepare(`
      INSERT OR REPLACE INTO bracket_matches (id, event_id, match_number, round_number, user_id_1, user_id_2, status)
      VALUES (?, ?, 999, 3, ?, ?, 'pending')
    `).run(matchRound3Id, event.id, p1.id, p2.id);

    // Lock Round 3
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value) VALUES ('round3_status', 'locked')").run();
    assert.strictEqual(RaceManager.getRoundStatus(3), 'locked');

    // Attempt advance on locked Round 3 -> should fail
    assert.throws(
      () => RaceManager.advanceBracketWinner(matchRound3Id, p1.id, { autoAdvance: false }),
      /Babak 3 telah difinalisasi dan dikunci/
    );

    // Unlock Round 3
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value) VALUES ('round3_status', 'open')").run();

    // Now advance should succeed
    const advRes = RaceManager.advanceBracketWinner(matchRound3Id, p1.id, { autoAdvance: false });
    assert.strictEqual(advRes.success, true);
    assert.strictEqual(advRes.winnerId, p1.id);

    // Lock Round 3 again
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value) VALUES ('round3_status', 'locked')").run();

    // Attempt resetBracketMatch on locked Round 3 -> should fail
    assert.throws(
      () => RaceManager.resetBracketMatch(matchRound3Id),
      /Babak 3 telah difinalisasi dan dikunci/
    );

    // Unlock Round 3 and reset
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value) VALUES ('round3_status', 'open')").run();
    const resetRes = RaceManager.resetBracketMatch(matchRound3Id);
    assert.strictEqual(resetRes.success, true);
    assert.strictEqual(resetRes.status, 'pending');
  });

  await t.test('ENH-04: Google Sheet sync allows multi-entry when allow_multi_entry is true', async () => {
    const event = createEvent({ nama: 'Multi-Entry Event Test' });
    setActiveEvent(event.id);

    const testCsv = `Nama,Team\nBudi Santoso,Team Red\nBudi Santoso,Team Blue\nAgus,Team White\n`;

    // 1. First sync without allow_multi_entry (default: deduplicated)
    const resDedup = await syncParticipantsFromSheet({
      event_id: event.id,
      csv_override: testCsv,
      allow_multi_entry: false
    });

    assert.strictEqual(resDedup.addedCount, 2, 'Should only add Budi once and Agus once');
    assert.strictEqual(resDedup.skippedCount, 1, 'Second Budi should be skipped');

    // 2. Second sync with allow_multi_entry: true (supports multiple car entries)
    const eventMulti = createEvent({ nama: 'Multi-Entry Enabled Event' });
    setActiveEvent(eventMulti.id);

    const resMulti = await syncParticipantsFromSheet({
      event_id: eventMulti.id,
      csv_override: testCsv,
      allow_multi_entry: true
    });

    assert.strictEqual(resMulti.addedCount, 3, 'Should add all 3 entries including both Budis');
    assert.strictEqual(resMulti.skippedCount, 0, 'No rows should be skipped');

    const budiEntries = db.prepare("SELECT * FROM users WHERE event_id = ? AND name = 'Budi Santoso'").all(eventMulti.id);
    assert.strictEqual(budiEntries.length, 2, 'Two separate participant entries should exist for Budi');
    assert.notStrictEqual(budiEntries[0].participant_number, budiEntries[1].participant_number, 'Entries must have distinct participant numbers');
  });

  t.after(() => {
    server.close();
    try {
      if (fs.existsSync(uniqueTestDb)) fs.unlinkSync(uniqueTestDb);
    } catch (_) {}
  });
});