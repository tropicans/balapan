import assert from 'assert';
import http from 'http';

console.log('🧪 RUNNING PHASE 27 MUTATION RBAC TEST SUITE (SEC-02)...');

// Ensure anonymous mutations are NOT allowed in this test suite
delete process.env.ALLOW_ANONYMOUS_MUTATIONS;
process.env.NODE_ENV = 'test';
process.env.TEST_STRICT_AUTH = 'true';

const { app, server } = await import('../index.js');
if (!server.listening) {
  await new Promise(resolve => server.once('listening', resolve));
}
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

const superAdminHeaders = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer mock-super-admin-token'
};

const adminHeaders = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer mock-token:admin:approved:admin@test.local'
};

const cashierHeaders = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer mock-token:cashier:approved:cashier@test.local'
};

const pendingCashierHeaders = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer mock-token:cashier:pending:pending@test.local'
};

const scrutineerHeaders = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer mock-token:scrutineer:approved:scrutineer@test.local'
};

const rdHeaders = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer mock-token:race_director:approved:rd@test.local'
};

// 1. Events Endpoint RBAC (Admin/SuperAdmin only)
console.log('\n--- 1. Events RBAC Protection ---');
const resEventNoAuth = await fetch(`${baseUrl}/api/events`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nama: 'Test Event RBAC' })
});
assert.strictEqual(resEventNoAuth.status, 401, 'POST /api/events without token must return 401');

const resEventCashier = await fetch(`${baseUrl}/api/events`, {
  method: 'POST',
  headers: cashierHeaders,
  body: JSON.stringify({ nama: 'Test Event RBAC' })
});
assert.strictEqual(resEventCashier.status, 403, 'POST /api/events with cashier must return 403');

const resEventAdmin = await fetch(`${baseUrl}/api/events`, {
  method: 'POST',
  headers: adminHeaders,
  body: JSON.stringify({ nama: 'Test Event RBAC' })
});
assert.strictEqual(resEventAdmin.status, 201, 'POST /api/events with admin must return 201');
const createdEvent = await resEventAdmin.json();
const eventId = createdEvent.data.id;
console.log('✓ Events RBAC verified (401 without auth, 403 for non-admin, 201 for admin)');

// 2. Participants Endpoint RBAC (Cashier/Admin/SuperAdmin)
console.log('\n--- 2. Participants RBAC Protection ---');
const resPartNoAuth = await fetch(`${baseUrl}/api/participants`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Racer RBAC', event_id: eventId })
});
assert.strictEqual(resPartNoAuth.status, 401, 'POST /api/participants without token must return 401');

const resPartPending = await fetch(`${baseUrl}/api/participants`, {
  method: 'POST',
  headers: pendingCashierHeaders,
  body: JSON.stringify({ name: 'Racer RBAC', event_id: eventId })
});
assert.strictEqual(resPartPending.status, 403, 'POST /api/participants with pending user must return 403');

const resPartCashier = await fetch(`${baseUrl}/api/participants`, {
  method: 'POST',
  headers: cashierHeaders,
  body: JSON.stringify({ name: 'Racer RBAC', event_id: eventId })
});
assert.strictEqual(resPartCashier.status, 201, 'POST /api/participants with cashier must return 201');
const createdParticipant = await resPartCashier.json();
console.log('✓ Participants RBAC verified (401 without auth, 403 for pending, 201 for cashier)');

// 3. BTO Endpoint RBAC (Scrutineer/RD/Admin/SuperAdmin)
console.log('\n--- 3. BTO RBAC Protection ---');
const resBtoNoAuth = await fetch(`${baseUrl}/api/bto`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ participant_number: createdParticipant.data.participant_number, finish_time: 11.5, event_id: eventId })
});
assert.strictEqual(resBtoNoAuth.status, 401, 'POST /api/bto without token must return 401');

const resBtoCashier = await fetch(`${baseUrl}/api/bto`, {
  method: 'POST',
  headers: cashierHeaders,
  body: JSON.stringify({ participant_number: createdParticipant.data.participant_number, finish_time: 11.5, event_id: eventId })
});
assert.strictEqual(resBtoCashier.status, 403, 'POST /api/bto with cashier must return 403');

const resBtoScrutineer = await fetch(`${baseUrl}/api/bto`, {
  method: 'POST',
  headers: scrutineerHeaders,
  body: JSON.stringify({ participant_number: createdParticipant.data.participant_number, finish_time: 11.5, event_id: eventId })
});
assert.ok([200, 201].includes(resBtoScrutineer.status), 'POST /api/bto with scrutineer must succeed');
console.log('✓ BTO RBAC verified (401 without auth, 403 for cashier, 200/201 for scrutineer)');

// 4. Winners & Bracket RBAC (Marshal/RD/Admin/SuperAdmin)
console.log('\n--- 4. Winners & Bracket RBAC Protection ---');
const resWinNoAuth = await fetch(`${baseUrl}/api/winners/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ participant_number: createdParticipant.data.participant_number, round: 2, event_id: eventId })
});
assert.strictEqual(resWinNoAuth.status, 401, 'POST /api/winners/register without token must return 401');

const resBracketNoAuth = await fetch(`${baseUrl}/api/bracket/advance`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ matchId: 'm1', winnerId: 'u1' })
});
assert.strictEqual(resBracketNoAuth.status, 401, 'POST /api/bracket/advance without token must return 401');

const resBracketCashier = await fetch(`${baseUrl}/api/bracket/advance`, {
  method: 'POST',
  headers: cashierHeaders,
  body: JSON.stringify({ matchId: 'm1', winnerId: 'u1' })
});
assert.strictEqual(resBracketCashier.status, 403, 'POST /api/bracket/advance with cashier must return 403');

const resBracketSuper = await fetch(`${baseUrl}/api/bracket/advance`, {
  method: 'POST',
  headers: superAdminHeaders,
  body: JSON.stringify({ matchId: 'non-existent', winnerId: 'u1' })
});
// Super admin passes RBAC guard and reaches business logic (which may return 400 for non-existent match)
assert.notStrictEqual(resBracketSuper.status, 401, 'Super Admin must pass 401 auth gate');
assert.notStrictEqual(resBracketSuper.status, 403, 'Super Admin must pass 403 role gate');
console.log('✓ Winners & Bracket RBAC verified (401 without auth, 403 for cashier, super admin passes guard)');

console.log('\n🎉 ALL PHASE 27 MUTATION RBAC TESTS PASSED SUCCESSFULLY (100% GREEN)!');
server.close();
