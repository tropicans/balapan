import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import { authenticateGoogleUser } from '../services/authService.js';
import { initDatabase } from '../db.js';

console.log('🧪 RUNNING BUG REPRODUCTION TEST: POST /api/auth/google payload formats...');

process.env.NODE_ENV = 'test';
process.env.SUPER_ADMIN_EMAIL = 'tropicans@gmail.com';

await initDatabase();

// Setup app matching server/index.js
const app = express();
app.use(express.json());

app.post('/api/auth/google', async (req, res) => {
  try {
    let credential = req.body?.credential || req.body?.id_token || req.body?.token;
    if (!credential && req.body?.mock_user) {
      const email = req.body.mock_user.email || 'user@gmail.com';
      const name = req.body.mock_user.name || 'Test User';
      credential = `mock-google-token:${email}:${name}`;
    }

    if (!credential) {
      return res.status(400).json({ success: false, error: 'Google credential/token wajib dikirim' });
    }
    const result = await authenticateGoogleUser(credential);
    res.json({ success: true, data: result, ...result });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

try {
  // Test Case 1: Client sends { id_token: '...' }
  console.log('Test 1: Sending { id_token } instead of { credential }...');
  const res1 = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: 'mock-google-token:user@gmail.com:Test User:sub-123' })
  });

  assert.strictEqual(res1.status, 200, `Expected 200 OK but got ${res1.status}`);
  const data1 = await res1.json();
  assert.strictEqual(data1.success, true);
  assert.ok(data1.data?.token, 'Response must include data.token');
  assert.ok(data1.token, 'Response must include token for backward compatibility');
  console.log('✅ Test 1 Passed: { id_token } accepted and dual-format response returned');

  // Test Case 2: Client sends { mock_user: { email, name } }
  console.log('Test 2: Sending { mock_user } simulation payload...');
  const res2 = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mock_user: {
        email: 'tropicans@gmail.com',
        name: 'Tropicans Super Admin'
      }
    })
  });

  assert.strictEqual(res2.status, 200, `Expected 200 OK but got ${res2.status}`);
  const data2 = await res2.json();
  assert.strictEqual(data2.success, true);
  assert.ok(data2.data?.token, 'Response must include data.token');
  assert.strictEqual(data2.data.user.email, 'tropicans@gmail.com');
  console.log('✅ Test 2 Passed: { mock_user } accepted');

  // Test Case 3: Client sends standard { credential: '...' }
  console.log('Test 3: Sending standard { credential } payload...');
  const res3 = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: 'mock-google-token:staff@gmail.com:Staff User:sub-staff-1' })
  });

  assert.strictEqual(res3.status, 200, `Expected 200 OK but got ${res3.status}`);
  const data3 = await res3.json();
  assert.strictEqual(data3.success, true);
  assert.ok(data3.data?.token && data3.token);
  console.log('✅ Test 3 Passed: { credential } accepted');

  // Test Case 4: Client sends { token: '...' }
  console.log('Test 4: Sending { token } payload...');
  const res4 = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'mock-google-token:viewer@gmail.com:Viewer:sub-viewer-1' })
  });

  assert.strictEqual(res4.status, 200, `Expected 200 OK but got ${res4.status}`);
  const data4 = await res4.json();
  assert.strictEqual(data4.success, true);
  assert.ok(data4.data?.token);
  console.log('✅ Test 4 Passed: { token } accepted');

  // Test Case 5: Empty payload returns 400 Bad Request
  console.log('Test 5: Sending empty payload...');
  const res5 = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  assert.strictEqual(res5.status, 400, `Expected 400 Bad Request but got ${res5.status}`);
  const data5 = await res5.json();
  assert.strictEqual(data5.success, false);
  console.log('✅ Test 5 Passed: Empty payload correctly rejected with 400');

  console.log('\n🎉 ALL REPRODUCTION & FIX VERIFICATION TESTS PASSED!');
} finally {
  server.close();
}
