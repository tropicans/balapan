import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const DEFAULT_SUPER_ADMIN = 'tropicans@gmail.com';

export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  let normalized = email.trim().toLowerCase();
  // Support shorthand "tropicans@gmail" -> "tropicans@gmail.com"
  if (normalized === 'tropicans@gmail') {
    normalized = 'tropicans@gmail.com';
  }
  return normalized;
}

export function isSuperAdminEmail(email) {
  const norm = normalizeEmail(email);
  const target = normalizeEmail(process.env.SUPER_ADMIN_EMAIL || DEFAULT_SUPER_ADMIN);
  return norm === target || norm === 'tropicans@gmail.com';
}

/**
 * Verify Google ID Token.
 * Supports deterministic test mock mode when running unit tests.
 */
export async function verifyGoogleToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Google ID token is required');
  }

  // Fast offline mock support strictly for test runner / local testing
  if (idToken.startsWith('mock-google-token:')) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Mock authentication is strictly forbidden in production');
    }
    const parts = idToken.split(':');
    const email = normalizeEmail(parts[1] || 'user@gmail.com');
    const name = parts[2] || 'Test User';
    const sub = parts[3] || `google-sub-${email}`;
    const picture = parts.slice(4).join(':') || 'https://example.com/avatar.png';
    return {
      sub,
      email,
      name,
      picture
    };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const client = new OAuth2Client(clientId);

  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error('Invalid token payload: email missing');
  }

  return {
    sub: payload.sub,
    email: normalizeEmail(payload.email),
    name: payload.name || payload.email,
    picture: payload.picture || null
  };
}

/**
 * Authenticate Google user:
 * - Automatically grants super_admin + approved for tropicans@gmail.com
 * - Other users get role: 'pending', status: 'pending'
 * - Creates session token in auth_sessions
 */
export async function authenticateGoogleUser(credential) {
  const profile = await verifyGoogleToken(credential);
  const email = normalizeEmail(profile.email);
  const isSuperAdmin = isSuperAdminEmail(email);

  let existingUser = db.prepare(`
    SELECT * FROM app_users WHERE email = ? OR (google_id = ? AND google_id IS NOT NULL)
  `).get(email, profile.sub);

  const now = new Date().toISOString();

  if (!existingUser) {
    const userId = uuidv4();
    const role = isSuperAdmin ? 'super_admin' : 'pending';
    const status = isSuperAdmin ? 'approved' : 'pending';
    const approvedAt = isSuperAdmin ? now : null;
    const approvedBy = isSuperAdmin ? 'system_bootstrap' : null;

    db.prepare(`
      INSERT INTO app_users (id, google_id, email, name, avatar, role, status, created_at, approved_at, approved_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      profile.sub,
      email,
      profile.name,
      profile.picture,
      role,
      status,
      now,
      approvedAt,
      approvedBy
    );

    existingUser = {
      id: userId,
      google_id: profile.sub,
      email,
      name: profile.name,
      avatar: profile.picture,
      role,
      status,
      created_at: now,
      approved_at: approvedAt,
      approved_by: approvedBy
    };
  } else {
    // If existing user is super admin, enforce super_admin and approved status
    let role = existingUser.role;
    let status = existingUser.status;
    let approvedAt = existingUser.approved_at;
    let approvedBy = existingUser.approved_by;

    if (isSuperAdmin) {
      role = 'super_admin';
      status = 'approved';
      approvedAt = approvedAt || now;
      approvedBy = approvedBy || 'system_bootstrap';
    }

    db.prepare(`
      UPDATE app_users
      SET google_id = COALESCE(google_id, ?),
          name = COALESCE(?, name),
          avatar = COALESCE(?, avatar),
          role = ?,
          status = ?,
          approved_at = ?,
          approved_by = ?
      WHERE id = ?
    `).run(
      profile.sub,
      profile.name,
      profile.picture,
      role,
      status,
      approvedAt,
      approvedBy,
      existingUser.id
    );

    existingUser = {
      ...existingUser,
      google_id: existingUser.google_id || profile.sub,
      name: profile.name || existingUser.name,
      avatar: profile.picture || existingUser.avatar,
      role,
      status,
      approved_at: approvedAt,
      approved_by: approvedBy
    };
  }

  // Generate session token (30 days validity)
  const sessionId = uuidv4();
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO auth_sessions (id, user_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(sessionId, existingUser.id, sessionToken, expiresAt, now);

  return {
    token: sessionToken,
    user: {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
      avatar: existingUser.avatar,
      role: existingUser.role,
      status: existingUser.status,
      approved_at: existingUser.approved_at,
      approved_by: existingUser.approved_by
    }
  };
}

/**
 * Validate token and return current user
 */
export function getUserByToken(token) {
  if (!token) return null;

  const session = db.prepare(`
    SELECT s.id as session_id, s.expires_at, u.*
    FROM auth_sessions s
    JOIN app_users u ON s.user_id = u.id
    WHERE s.token = ?
  `).get(token);

  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    // Expired
    db.prepare('DELETE FROM auth_sessions WHERE id = ?').run(session.session_id);
    return null;
  }

  return {
    id: session.id,
    email: session.email,
    name: session.name,
    avatar: session.avatar,
    role: session.role,
    status: session.status,
    created_at: session.created_at,
    approved_at: session.approved_at,
    approved_by: session.approved_by
  };
}

/**
 * Invalidate session on logout
 */
export function invalidateSession(token) {
  if (!token) return false;
  const res = db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
  return res.changes > 0;
}

export const VALID_ROLES = ['super_admin', 'admin', 'cashier', 'race_director', 'scrutineer', 'viewer'];

/**
 * List application users with optional filtering
 */
export function listAppUsers({ status, search } = {}) {
  let query = 'SELECT id, google_id, email, name, avatar, role, status, created_at, approved_at, approved_by FROM app_users WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (search && search.trim()) {
    query += ' AND (name LIKE ? OR email LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  query += ' ORDER BY created_at DESC';

  return db.prepare(query).all(...params);
}

/**
 * Get user by ID
 */
export function getAppUserById(userId) {
  if (!userId) return null;
  return db.prepare(`
    SELECT id, google_id, email, name, avatar, role, status, created_at, approved_at, approved_by
    FROM app_users
    WHERE id = ?
  `).get(userId);
}

/**
 * Approve pending user with an assigned role
 */
export function approveAppUser(userId, role, approvedBy = 'admin') {
  if (!userId) throw new Error('User ID wajib disertakan');

  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Role tidak valid. Pilihan yang tersedia: ${VALID_ROLES.filter(r => r !== 'super_admin').join(', ')}`);
  }

  const user = getAppUserById(userId);
  if (!user) throw new Error('Pengguna tidak ditemukan');

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE app_users
    SET role = ?,
        status = 'approved',
        approved_at = ?,
        approved_by = ?
    WHERE id = ?
  `).run(role, now, approvedBy, userId);

  return getAppUserById(userId);
}

/**
 * Update user role
 */
export function updateAppUserRole(userId, newRole, requestedBy = null) {
  if (!userId) throw new Error('User ID wajib disertakan');

  if (!VALID_ROLES.includes(newRole)) {
    throw new Error(`Role tidak valid. Pilihan yang tersedia: ${VALID_ROLES.join(', ')}`);
  }

  const user = getAppUserById(userId);
  if (!user) throw new Error('Pengguna tidak ditemukan');

  if (isSuperAdminEmail(user.email) && newRole !== 'super_admin') {
    throw new Error('Peran Super Admin (tropicans@gmail.com) tidak dapat diubah');
  }

  db.prepare(`
    UPDATE app_users
    SET role = ?
    WHERE id = ?
  `).run(newRole, userId);

  return getAppUserById(userId);
}

/**
 * Set user status (approved, suspended, pending)
 */
export function setAppUserStatus(userId, newStatus, requestedBy = null) {
  if (!userId) throw new Error('User ID wajib disertakan');

  if (!['approved', 'suspended', 'pending'].includes(newStatus)) {
    throw new Error('Status tidak valid. Pilihan: approved, suspended, pending');
  }

  const user = getAppUserById(userId);
  if (!user) throw new Error('Pengguna tidak ditemukan');

  if (isSuperAdminEmail(user.email) && newStatus !== 'approved') {
    throw new Error('Status Super Admin (tropicans@gmail.com) tidak dapat dinonaktifkan');
  }

  db.prepare(`
    UPDATE app_users
    SET status = ?
    WHERE id = ?
  `).run(newStatus, userId);

  // If suspended, invalidate all active sessions immediately
  if (newStatus === 'suspended') {
    db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(userId);
  }

  return getAppUserById(userId);
}
