import assert from 'assert';
import http from 'http';
import express from 'express';
import db, { initDatabase } from '../db.js';
import {
  normalizeEmail,
  isSuperAdminEmail,
  verifyGoogleToken,
  authenticateGoogleUser,
  getUserByToken,
  invalidateSession
} from '../services/authService.js';

console.log('🧪 RUNNING GOOGLE AUTH & USER PROVISIONING TEST SUITE (PHASE 20)...');

process.env.NODE_ENV = 'test';
process.env.SUPER_ADMIN_EMAIL = 'tropicans@gmail.com';

await initDatabase();

// Clean existing test auth records if any
db.exec(`
  DELETE FROM auth_sessions;
  DELETE FROM app_users WHERE email LIKE '%@test.local' OR email LIKE '%@gmail.com';
`);

console.log('\n--- Test 1: Email Normalization & Super Admin Detection ---');
assert.strictEqual(normalizeEmail('  Tropicans@Gmail.COM  '), 'tropicans@gmail.com');
assert.strictEqual(normalizeEmail('tropicans@gmail'), 'tropicans@gmail.com');
assert.strictEqual(isSuperAdminEmail('tropicans@gmail.com'), true);
assert.strictEqual(isSuperAdminEmail('tropicans@gmail'), true);
assert.strictEqual(isSuperAdminEmail('TROPICANS@GMAIL.COM'), true);
assert.strictEqual(isSuperAdminEmail('someoneelse@gmail.com'), false);
console.log('✓ Test 1: Email normalization and super admin detection passed');

console.log('\n--- Test 2: Verify Mock Google Token ---');
const mockAdmin = await verifyGoogleToken('mock-google-token:tropicans@gmail.com:Tropicans Admin:sub-001:https://pic.com/admin.jpg');
assert.strictEqual(mockAdmin.email, 'tropicans@gmail.com');
assert.strictEqual(mockAdmin.name, 'Tropicans Admin');
assert.strictEqual(mockAdmin.sub, 'sub-001');
assert.strictEqual(mockAdmin.picture, 'https://pic.com/admin.jpg');
console.log('✓ Test 2: Token verification passed');

console.log('\n--- Test 3: Auto-Provision Super Admin for tropicans@gmail.com ---');
const adminAuth = await authenticateGoogleUser('mock-google-token:tropicans@gmail.com:Super Admin:sub-admin-999');
assert.ok(adminAuth.token, 'Token must be issued');
assert.strictEqual(adminAuth.user.email, 'tropicans@gmail.com');
assert.strictEqual(adminAuth.user.role, 'super_admin');
assert.strictEqual(adminAuth.user.status, 'approved');
assert.strictEqual(adminAuth.user.approved_by, 'system_bootstrap');
assert.ok(adminAuth.user.approved_at, 'Approved timestamp must exist');

// Verify stored in app_users
const adminRow = db.prepare('SELECT * FROM app_users WHERE email = ?').get('tropicans@gmail.com');
assert.ok(adminRow, 'Admin row must exist in app_users');
assert.strictEqual(adminRow.role, 'super_admin');
assert.strictEqual(adminRow.status, 'approved');
console.log('✓ Test 3: Super Admin auto-provisioned as super_admin & approved');

console.log('\n--- Test 4: New Google User Provisioned as Pending ---');
const userAuth = await authenticateGoogleUser('mock-google-token:racer_new@gmail.com:Budi Santoso:sub-racer-101');
assert.ok(userAuth.token, 'Token must be issued');
assert.strictEqual(userAuth.user.email, 'racer_new@gmail.com');
assert.strictEqual(userAuth.user.role, 'pending');
assert.strictEqual(userAuth.user.status, 'pending');
assert.strictEqual(userAuth.user.approved_at, null);
assert.strictEqual(userAuth.user.approved_by, null);

const userRow = db.prepare('SELECT * FROM app_users WHERE email = ?').get('racer_new@gmail.com');
assert.ok(userRow, 'User row must exist in app_users');
assert.strictEqual(userRow.role, 'pending');
assert.strictEqual(userRow.status, 'pending');
console.log('✓ Test 4: New user provisioned with role=pending and status=pending');

console.log('\n--- Test 5: Session Retrieval via getUserByToken ---');
const retrievedAdmin = getUserByToken(adminAuth.token);
assert.ok(retrievedAdmin);
assert.strictEqual(retrievedAdmin.email, 'tropicans@gmail.com');
assert.strictEqual(retrievedAdmin.role, 'super_admin');

const retrievedUser = getUserByToken(userAuth.token);
assert.ok(retrievedUser);
assert.strictEqual(retrievedUser.email, 'racer_new@gmail.com');
assert.strictEqual(retrievedUser.status, 'pending');

assert.strictEqual(getUserByToken('invalid-token-xyz'), null);
console.log('✓ Test 5: Session retrieval returns correct user');

console.log('\n--- Test 6: Invalidate Session (Logout) ---');
const loggedOut = invalidateSession(userAuth.token);
assert.strictEqual(loggedOut, true);
assert.strictEqual(getUserByToken(userAuth.token), null, 'Logged out token must be invalid');
console.log('✓ Test 6: Session invalidation (logout) verified');

console.log('\n--- Test 7: HTTP REST API Endpoints ---');
const app = express();
app.use(express.json());

app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ success: false, error: 'Credential required' });
    const result = await authenticateGoogleUser(credential);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ success: false, error: 'Invalid or expired session' });
  res.json({ success: true, user });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.body?.token;
  if (token) invalidateSession(token);
  res.json({ success: true, message: 'Logged out' });
});

const server = http.createServer(app);
await new Promise(resolve => server.listen(0, resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

// 7a. Login endpoint
const loginRes = await fetch(`${baseUrl}/api/auth/google`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ credential: 'mock-google-token:tropicans@gmail:Tropicans Root:sub-admin-root' })
});
assert.strictEqual(loginRes.status, 200);
const loginData = await loginRes.json();
assert.strictEqual(loginData.success, true);
assert.strictEqual(loginData.user.role, 'super_admin');
assert.strictEqual(loginData.user.status, 'approved');
const rootToken = loginData.token;

// 7b. /me endpoint with Bearer token
const meRes = await fetch(`${baseUrl}/api/auth/me`, {
  headers: { 'Authorization': `Bearer ${rootToken}` }
});
assert.strictEqual(meRes.status, 200);
const meData = await meRes.json();
assert.strictEqual(meData.user.email, 'tropicans@gmail.com');

// 7c. Logout endpoint
const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${rootToken}` }
});
assert.strictEqual(logoutRes.status, 200);

// 7d. /me endpoint after logout
const meAfterLogout = await fetch(`${baseUrl}/api/auth/me`, {
  headers: { 'Authorization': `Bearer ${rootToken}` }
});
assert.strictEqual(meAfterLogout.status, 401);

server.close();
console.log('✓ Test 7: HTTP REST API endpoints verified 100%');

console.log('\n🎉 ALL PHASE 20 AUTH & PROVISIONING TESTS PASSED (100% GREEN)!\n');
