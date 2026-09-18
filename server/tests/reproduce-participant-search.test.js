import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const uniqueTestDb = path.join(repoRoot, 'data', `test_search_bug_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'false';
process.env.PORT = '0';

// Import dependencies
const { initDatabase, default: db } = await import('../db.js');
const { app, server } = await import('../index.js');
const { getActiveEventId } = await import('../services/eventService.js');
const { registerParticipant, getParticipants } = await import('../services/participantService.js');

async function runReproductionTests() {
  console.log('🧪 RUNNING PARTICIPANT SEARCH BUG REPRODUCTION TEST SUITE...\n');

  try {
    if (!server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }
    const address = server.address();
    const port = address.port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`📡 Test server running on ${baseUrl}\n`);

    const eventId = getActiveEventId();
    assert.ok(eventId, 'Active event must exist');

    // Register the exact roster from user's screenshot:
    // #39 MIGO, #40 NIKA, #41 UNYIL, #42 ORGANIC, #43 RYU
    console.log('--- Setting up test participants (#39 MIGO to #43 RYU) ---');
    for (let i = 1; i <= 38; i++) {
      registerParticipant({ name: `Racer ${i}`, team_name: 'Regular Team' });
    }
    const pMigo = registerParticipant({ name: 'MIGO', team_name: 'FAST TEAM' });
    const pNika = registerParticipant({ name: 'NIKA', team_name: 'SUN SQUAD' });
    const pUnyil = registerParticipant({ name: 'UNYIL', team_name: 'PUPPET RACING' });
    const pOrganic = registerParticipant({ name: 'ORGANIC', team_name: 'GREEN POWER' });
    const pRyu = registerParticipant({ name: 'RYU', team_name: 'HADOUKEN CLUB' });

    assert.strictEqual(pRyu.participant_number, 43, 'Ryu must be #43 as in screenshot');
    assert.strictEqual(pOrganic.participant_number, 42, 'Organic must be #42 as in screenshot');

    // ----------------------------------------------------
    // Test 1: Search "ryu" via API should return ONLY RYU
    // ----------------------------------------------------
    console.log('\n--- Test 1: API Omni-Search "ryu" must exclude #42 ORGANIC, #41 UNYIL, etc. ---');
    const resRyu = await fetch(`${baseUrl}/api/participants?search=ryu`);
    const bodyRyu = await resRyu.json();
    assert.strictEqual(bodyRyu.success, true);
    const listRyu = bodyRyu.data.participants;

    console.log(`Search "ryu" returned ${listRyu.length} results:`, listRyu.map(p => `#${p.participant_number} ${p.name}`));
    
    // Must contain RYU
    assert.ok(listRyu.some(p => p.name === 'RYU' && p.participant_number === 43), 'Search "ryu" must include #43 RYU');
    
    // Must NOT contain ORGANIC, UNYIL, NIKA, MIGO
    assert.strictEqual(listRyu.some(p => p.name === 'ORGANIC'), false, 'Search "ryu" MUST NOT include ORGANIC');
    assert.strictEqual(listRyu.some(p => p.name === 'UNYIL'), false, 'Search "ryu" MUST NOT include UNYIL');
    assert.strictEqual(listRyu.some(p => p.name === 'NIKA'), false, 'Search "ryu" MUST NOT include NIKA');
    assert.strictEqual(listRyu.some(p => p.name === 'MIGO'), false, 'Search "ryu" MUST NOT include MIGO');
    assert.strictEqual(listRyu.length, 1, 'Search "ryu" should only return 1 participant');
    console.log('✅ Test 1 Passed: Server search "ryu" cleanly isolates RYU.');

    // ----------------------------------------------------
    // Test 2: Search "#43" via API
    // ----------------------------------------------------
    console.log('\n--- Test 2: Search "#43" must return ONLY #43 RYU ---');
    const res43 = await fetch(`${baseUrl}/api/participants?search=%2343`);
    const body43 = await res43.json();
    const list43 = body43.data.participants;
    assert.strictEqual(list43.length, 1, 'Search "#43" should return only 1 participant');
    assert.strictEqual(list43[0].participant_number, 43);
    console.log('✅ Test 2 Passed: Search "#43" returns only #43 RYU.');

    // ----------------------------------------------------
    // Test 3: Search combo "#43 RYU" or "RYU HADOUKEN"
    // ----------------------------------------------------
    console.log('\n--- Test 3: Search multi-word query "#43 RYU" or "RYU HADOUKEN" ---');
    const resMulti = await fetch(`${baseUrl}/api/participants?search=${encodeURIComponent('#43 RYU')}`);
    const bodyMulti = await resMulti.json();
    const listMulti = bodyMulti.data.participants;
    console.log(`Search "#43 RYU" returned ${listMulti.length} results:`, listMulti.map(p => `#${p.participant_number} ${p.name}`));
    assert.ok(listMulti.some(p => p.participant_number === 43), 'Multi-word search "#43 RYU" must find #43');
    console.log('✅ Test 3 Passed: Multi-word search "#43 RYU" works.');

    // ----------------------------------------------------
    // Test 4: Verify Client-side filtering logic
    // ----------------------------------------------------
    console.log('\n--- Test 4: Client-side Filter Function Simulation ---');
    const allParticipants = [
      { participant_number: 43, name: 'RYU', team_name: 'HADOUKEN CLUB' },
      { participant_number: 42, name: 'ORGANIC', team_name: 'GREEN POWER' },
      { participant_number: 41, name: 'UNYIL', team_name: 'PUPPET RACING' },
      { participant_number: 40, name: 'NIKA', team_name: 'SUN SQUAD' },
      { participant_number: 39, name: 'MIGO', team_name: 'FAST TEAM' }
    ];

    const clientFilter = (list, query) => {
      const q = (query || '').trim().toLowerCase();
      if (!q) return list;
      const terms = q.split(/\s+/).filter(Boolean);
      return list.filter(p => {
        const numStr = String(p.participant_number);
        const nameStr = String(p.name || '').toLowerCase();
        const teamStr = String(p.team_name || '').toLowerCase();
        return terms.every(term => {
          const cleanTerm = term.replace(/^#/, '');
          return numStr === cleanTerm || nameStr.includes(term) || teamStr.includes(term);
        });
      });
    };

    const filteredRyu = clientFilter(allParticipants, 'ryu');
    assert.strictEqual(filteredRyu.length, 1);
    assert.strictEqual(filteredRyu[0].name, 'RYU');

    const filteredHash43 = clientFilter(allParticipants, '#43');
    assert.strictEqual(filteredHash43.length, 1);
    assert.strictEqual(filteredHash43[0].participant_number, 43);

    const filteredCombo = clientFilter(allParticipants, '#43 ryu');
    assert.strictEqual(filteredCombo.length, 1);
    assert.strictEqual(filteredCombo[0].participant_number, 43);

    const filteredTeam = clientFilter(allParticipants, 'green');
    assert.strictEqual(filteredTeam.length, 1);
    assert.strictEqual(filteredTeam[0].name, 'ORGANIC');
    console.log('✅ Test 4 Passed: Client-side filter handles single, hash, team, and multi-word.');

    console.log('\n🎉 ALL SEARCH TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
  }
}

runReproductionTests().catch(err => {
  console.error('\n❌ REPRODUCTION TEST FAILED:', err);
  process.exit(1);
});
