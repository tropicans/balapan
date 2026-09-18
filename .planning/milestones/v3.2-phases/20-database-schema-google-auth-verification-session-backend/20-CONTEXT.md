# Phase 20: Database Schema, Google Auth Verification & Session Backend - Context

**Gathered:** 2026-09-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Membangun fondasi autentikasi Google OAuth 2.0 di backend: skema tabel SQLite `app_users` dan `auth_sessions`, verifikasi token ID Google secara aman, otomatisasi Super Admin untuk `tropicans@gmail.com` dengan status langsung `approved`, inisialisasi status `pending` bagi pengguna Google baru lainnya, serta penerbitan token sesi dan endpoint autentikasi dasar (`/api/auth/google`, `/api/auth/me`, `/api/auth/logout`).

</domain>

<decisions>
## Implementation Decisions

### Skema Database Pengguna & Sesi (D-01)
- **Tabel `app_users`**:
  - `id` (TEXT PRIMARY KEY - uuid)
  - `google_id` (TEXT UNIQUE)
  - `email` (TEXT UNIQUE NOT NULL - lowercase)
  - `name` (TEXT NOT NULL)
  - `avatar` (TEXT)
  - `role` (TEXT NOT NULL DEFAULT 'pending' — enum: `'super_admin'`, `'admin'`, `'cashier'`, `'race_director'`, `'scrutineer'`, `'viewer'`, `'pending'`)
  - `status` (TEXT NOT NULL DEFAULT 'pending' — enum: `'pending'`, `'approved'`, `'suspended'`)
  - `created_at` (TEXT NOT NULL)
  - `approved_at` (TEXT)
  - `approved_by` (TEXT)
- **Tabel `auth_sessions`**:
  - `id` (TEXT PRIMARY KEY - uuid)
  - `user_id` (TEXT NOT NULL REFERENCES app_users(id))
  - `token` (TEXT UNIQUE NOT NULL)
  - `expires_at` (TEXT NOT NULL)
  - `created_at` (TEXT NOT NULL)
— **Reversibility:** Reversible melalui migrasi database SQLite.

### Auto-Provisioning Super Admin (D-02)
- Konfigurasi `SUPER_ADMIN_EMAIL` melalui environment variable dengan default `'tropicans@gmail.com'`.
- Normalisasi email (menghilangkan spasi, lowercase, dan menangani alias `tropicans@gmail` menjadi `tropicans@gmail.com`).
- Ketika `tropicans@gmail.com` login via Google, jika belum ada di database, langsung dibuat dengan:
  - `role = 'super_admin'`
  - `status = 'approved'`
  - `approved_at = NOW()`
  - `approved_by = 'system_bootstrap'`
— **Reversibility:** Irreversible tanpa akses database langsung.

### Pendaftaran Akun Baru sebagai Pending (D-03)
- Setiap user yang login dengan akun Google selain Super Admin dan belum disetujui otomatis tersimpan dengan:
  - `role = 'pending'`
  - `status = 'pending'`
  - `approved_at = NULL`
  - `approved_by = NULL`
- Akun ini belum diizinkan mengakses API operasional sampai Super Admin melakukan approval.
— **Reversibility:** Reversible.

### Verifikasi Google ID Token & Offline Test Fallback (D-04)
- Menggunakan `google-auth-library` (`OAuth2Client.verifyIdToken`) untuk memvalidasi token resmi Google.
- Menyediakan deterministic test/mock mode saat `NODE_ENV === 'test'` atau ketika token diawali prefix `mock-google-token:` sehingga seluruh unit test backend dapat berjalan offline tanpa koneksi internet ke Google servers.
— **Reversibility:** Reversible.

### Kontrak Endpoint Autentikasi (D-05)
- `POST /api/auth/google`: menerima payload `{ credential }`, verifikasi Google token, upsert user, buat record di `auth_sessions`, kembalikan `{ success: true, token, user }`.
- `GET /api/auth/me`: menerima header `Authorization: Bearer <token>`, memvalidasi session dari `auth_sessions`, kembalikan data user lengkap.
- `POST /api/auth/logout`: menerima token, menghapus session dari database, kembalikan `{ success: true }`.
— **Reversibility:** Reversible.

</decisions>

<canonical_refs>
## Canonical References

- `server/db.js` — Inisialisasi skema SQLite, migrasi tabel, dan helper query
- `server/index.js` — Registrasi REST API Express dan konfigurasi middleware
- `package.json` — Dependensi backend
- `.planning/REQUIREMENTS.md` — Rincian AUTH-02, AUTH-03, AUTH-04, APPR-01

</canonical_refs>
