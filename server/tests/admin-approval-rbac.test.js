import assert from 'assert';
import http from 'http';
import express from 'express';
import db, { initDatabase } from '../db.js';
import {
  authenticateGoogleUser,
  listAppUsers,
  getAppUserById,
  approveAppUser,
  updateAppUserRole,
  setAppUserStatus,
  getUserByToken
} from '../services/authService.js';
import { requireAuth, requireApproved, requireRole } from '../middleware/authMiddleware.js';

console.log('🧪 RUNNING ADMIN APPROVAL & RBAC TEST SUITE (PHASE 21)...');

process.env.NODE_ENV = 'test';
process.env.SUPER_ADMIN_EMAIL = 'tropicans@gmail.com';

await initDatabase();

// Clean existing auth test data
db.exec(`
  DELETE FROM auth_sessions;
  DELETE FROM app_users WHERE email LIKE '%@test.local' OR email LIKE '%@gmail.com';
`);

console.log('\n--- Setup Users ---');
const adminAuth = await authenticateGoogleUser('mock-google-token:tropicans@gmail.com:Super Admin:sub-admin-01');
const userPending = await authenticateGoogleUser('mock-google-token:staff_pending@gmail.com:Staff Pending:sub-pending-01');
const userToSuspend = await authenticateGoogleUser('mock-google-token:staff_bad@gmail.com:Bad Actor:sub-bad-01');

console.log('✓ Initial users created');

console.log('\n--- Test 1: listAppUsers filtering ---');
const allUsers = listAppUsers();
assert.ok(allUsers.length >= 3);

const pendingList = listAppUsers({ status: 'pending' });
assert.ok(pendingList.some(u => u.email === 'staff_pending@gmail.com'));
assert.ok(!pendingList.some(u => u.email === 'tropicans@gmail.com'));

const searchList = listAppUsers({ search: 'Staff Pending' });
assert.strictEqual(searchList.length, 1);
assert.strictEqual(searchList[0].email, 'staff_pending@gmail.com');
console.log('✓ Test 1: listAppUsers filtering passed');

console.log('\n--- Test 2: approveAppUser ---');
const approvedUser = approveAppUser(userPending.user.id, 'cashier', 'tropicans@gmail.com');
assert.strictEqual(approvedUser.status, 'approved');
assert.strictEqual(approvedUser.role, 'cashier');
assert.strictEqual(approvedUser.approved_by, 'tropicans@gmail.com');
assert.ok(approvedUser.approved_at);

assert.throws(() => {
  approveAppUser(userPending.user.id, 'hacker_role');
}, /Role tidak valid/);
console.log('✓ Test 2: approveAppUser with valid and invalid roles verified');

console.log('\n--- Test 3: updateAppUserRole ---');
const updatedRoleUser = updateAppUserRole(userPending.user.id, 'race_director', adminAuth.user);
assert.strictEqual(updatedRoleUser.role, 'race_director');

// Protect super admin role from modification
assert.throws(() => {
  updateAppUserRole(adminAuth.user.id, 'viewer', adminAuth.user);
}, /Peran Super Admin.*tidak dapat diubah/);
console.log('✓ Test 3: updateAppUserRole & Super Admin immunity verified');

console.log('\n--- Test 4: setAppUserStatus & Session Revocation ---');
// First approve userToSuspend
approveAppUser(userToSuspend.user.id, 'viewer', 'tropicans@gmail.com');
assert.ok(getUserByToken(userToSuspend.token), 'Session must be valid before suspend');

// Now suspend
setAppUserStatus(userToSuspend.user.id, 'suspended', adminAuth.user);
const suspendedUser = getAppUserById(userToSuspend.user.id);
assert.strictEqual(suspendedUser.status, 'suspended');

// Active session must be revoked immediately
assert.strictEqual(getUserByToken(userToSuspend.token), null, 'Session must be revoked on suspend');

// Protect super admin from suspend
assert.throws(() => {
  setAppUserStatus(adminAuth.user.id, 'suspended', adminAuth.user);
}, /Status Super Admin.*tidak dapat dinonaktifkan/);
console.log('✓ Test 4: setAppUserStatus & session cleanup verified');

console.log('\n--- Test 5: RBAC Middleware HTTP Server Tests ---');
const app = express();
app.use(express.json());

// Protected admin endpoint
app.get('/api/admin/users', requireRole('admin', 'super_admin'), (req, res) => {
  res.json({ success: true, data: listAppUsers() });
});

// Protected cashier operational endpoint
app.get('/api/cashier/data', requireRole('cashier', 'admin', 'super_admin'), (req, res) => {
  res.json({ success: true, message: 'Cashier access granted' });
});

// General approved operational endpoint
app.get('/api/operational/general', requireApproved, (req, res) => {
  res.json({ success: true, message: 'Approved user access granted' });
});

const server = http.createServer(app);
await new Promise(resolve => server.listen(0, resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

// 5a. No token -> 401
const noAuthRes = await fetch(`${baseUrl}/api/admin/users`);
assert.strictEqual(noAuthRes.status, 401);
const noAuthData = await noAuthRes.json();
assert.strictEqual(noAuthData.code, 'UNAUTHORIZED');

// 5b. Pending user tries to access general operational route -> 403 PENDING_APPROVAL
const newPending = await authenticateGoogleUser('mock-google-token:fresh_pending@gmail.com:Fresh:sub-fresh');
const pendingRes = await fetch(`${baseUrl}/api/operational/general`, {
  headers: { 'Authorization': `Bearer ${newPending.token}` }
});
assert.strictEqual(pendingRes.status, 403);
const pendingData = await pendingRes.json();
assert.strictEqual(pendingData.code, 'PENDING_APPROVAL');
assert.ok(pendingData.error.includes('tropicans@gmail.com'));

// 5c. User with role=race_director tries to access cashier-only route -> 403 INSUFFICIENT_ROLE
const rdRes = await fetch(`${baseUrl}/api/cashier/data`, {
  headers: { 'Authorization': `Bearer ${userPending.token}` } // role is race_director
});
assert.strictEqual(rdRes.status, 403);
const rdData = await rdRes.json();
assert.strictEqual(rdData.code, 'INSUFFICIENT_ROLE');

// 5d. Super admin accesses admin-only route -> 200 OK
const adminRes = await fetch(`${baseUrl}/api/admin/users`, {
  headers: { 'Authorization': `Bearer ${adminAuth.token}` }
});
assert.strictEqual(adminRes.status, 200);
const adminData = await adminRes.json();
assert.strictEqual(adminData.success, true);
assert.ok(adminData.data.length >= 3);

// 5e. Super admin accesses cashier route (Super Admin bypass) -> 200 OK
const superBypassRes = await fetch(`${baseUrl}/api/cashier/data`, {
  headers: { 'Authorization': `Bearer ${adminAuth.token}` }
});
assert.strictEqual(superBypassRes.status, 200);

server.close();
console.log('✓ Test 5: RBAC HTTP middleware security verified 100%');

console.log('\n🎉 ALL PHASE 21 ADMIN APPROVAL & RBAC TESTS PASSED (100% GREEN)!\n');
