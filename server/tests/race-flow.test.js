import { initDatabase } from '../db.js';
import db from '../db.js';
import { RaceManager } from '../raceManager.js';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uniqueTestDb = path.join(__dirname, `../../data/test_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;

async function runTests() {
  console.log('🧪 RUNNING TAMIYA DIGITAL RACING SYSTEM TEST SUITE...\n');

  // 1. Init Database
  await initDatabase();
  console.log('✓ [1/9] Database initialized and seeded successfully');

  // 2. Query initial state
  const state = RaceManager.getFullState();
  assert.ok(state.activeRace, 'Active race must exist');
  assert.strictEqual(state.activeRace.race_number, 1, 'Initial race number should be 1');
  console.log('✓ [2/9] Initial state retrieved with Race #' + state.activeRace.race_number);

  // 3. User Registration
  const andi = db.prepare("SELECT * FROM users WHERE email = 'andi@gmail.com'").get();
  const budi = db.prepare("SELECT * FROM users WHERE email = 'budi@gmail.com'").get();
  const chandra = db.prepare("SELECT * FROM users WHERE email = 'chandra@gmail.com'").get();
  const doni = db.prepare("SELECT * FROM users WHERE email = 'doni@gmail.com'").get();

  assert.ok(andi && budi && chandra && doni, 'Seeded users must exist');

  // Scan Lane C for Chandra
  const regC = RaceManager.registerLane(chandra.id, 'C');
  assert.strictEqual(regC.success, true);
  assert.strictEqual(regC.lane, 'C');
  console.log('✓ [3/9] Participant Chandra scanned Lane C successfully');

  // Concurrency / Lane full test: Doni tries to scan Lane A (already taken by Andi in race 1)
  const regDoni = RaceManager.registerLane(doni.id, 'A');
  assert.strictEqual(regDoni.success, true);
  assert.strictEqual(regDoni.pushedToNext, true, 'Doni should be pushed to next race');
  assert.strictEqual(regDoni.raceNumber, 2, 'Doni assigned to Race 2');
  console.log(`✓ [4/9] Concurrency handling: Doni pushed to Race ${regDoni.raceNumber} because Lane A was taken`);

  // 4. Set Ready
  const readyAndi = RaceManager.setReady(andi.id);
  const readyBudi = RaceManager.setReady(budi.id);
  const readyChan = RaceManager.setReady(chandra.id);
  assert.strictEqual(readyAndi.success, true);
  assert.strictEqual(readyBudi.success, true);
  assert.strictEqual(readyChan.success, true);
  console.log('✓ [5/9] All 3 lanes marked "SIAP BALAP"');

  // 5. RD Lock Race ("KUNCI BALAPAN")
  const andiCouponBefore = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(andi.id).balance;
  const lockResult = RaceManager.lockRace(state.activeRace.id);
  assert.strictEqual(lockResult.status, 'pre-start');
  const andiCouponAfter = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(andi.id).balance;
  assert.strictEqual(andiCouponAfter, andiCouponBefore - 1, '1 coupon deducted permanently on lock');
  console.log(`✓ [6/9] RD locked Race #1, deducted 1 coupon from all racers (Andi: ${andiCouponBefore} -> ${andiCouponAfter})`);

  // 6. RD Start physical race and submit finish times
  RaceManager.startRace(state.activeRace.id);
  const finishTimes = {
    A: 11.230,
    B: 11.890,
    C: 12.450
  };
  const finishRes = RaceManager.submitFinishTimes(state.activeRace.id, finishTimes);
  assert.strictEqual(finishRes.winner.userId, andi.id, 'Andi with 11.230s should be the winner');
  console.log(`✓ [7/9] Finish times recorded. Winner: ${finishRes.winner.userName} (${finishRes.winner.finishTime}s)`);

  // 7. Scrutineering: Andi is inspected and passes ("LOLOS")
  const activeWinnerReg = db.prepare("SELECT id FROM race_registrations WHERE user_id = ? AND race_id = ?").get(andi.id, state.activeRace.id);
  const scrutRes = RaceManager.handleScrutineerAction(activeWinnerReg.id, 'pass');
  assert.strictEqual(scrutRes.status, 'pass');
  assert.strictEqual(scrutRes.isNewBTO, true, 'Andi should be new Best Time Overall');

  // Check Round 2 Bracket Auto-Placement
  const bracketCheck = db.prepare("SELECT * FROM bracket_matches WHERE user_id_1 = ? OR user_id_2 = ?").get(andi.id, andi.id);
  assert.ok(bracketCheck, 'Andi should be auto-placed into Round 2 Elimination Bracket!');
  console.log(`✓ [8/9] Scrutineer passed Andi -> New BTO Record & Auto-placed into Bracket Match #${bracketCheck.match_number}`);

  // 8. Cashier Top-Up & Guest Racer
  const topUpRes = RaceManager.topUpCoupons(andi.id, 50);
  assert.strictEqual(topUpRes.newBalance, andiCouponAfter + 50);

  const guestRes = RaceManager.registerGuest('Racer Junior', 'JUNIOR', 20);
  assert.strictEqual(guestRes.user.balance, 20);
  console.log(`✓ [9/9] Cashier +50 topup verified (${topUpRes.newBalance}) & Guest Racer created (${guestRes.user.name})`);

  console.log('\n======================================================');
  console.log('🏁 ALL TEST SUITES PASSED PERFECTLY! ZERO ERRORS!');
  console.log('======================================================\n');

  // Cleanup test DB
  if (fs.existsSync(uniqueTestDb)) {
    try { fs.unlinkSync(uniqueTestDb); } catch(e) {}
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
