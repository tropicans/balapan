# Phase 21: Admin Approval Engine & RBAC Middleware - Context

**Gathered:** 2026-09-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Menyediakan domain service dan REST API bagi Super Admin (`tropicans@gmail.com`) untuk mengelola status persetujuan akun pengguna (`app_users`), menyetujui akun pending dengan penetapan peran (Role: Kasir, Race Director, Scrutineer, Co-Admin, Viewer), mengubah peran, menonaktifkan/mencabut akses (suspend), serta membangun middleware pengamanan Role-Based Access Control (RBAC) pada API operasional turnamen.

</domain>

<decisions>
## Implementation Decisions

### Endpoint Manajemen Pengguna Admin (D-01)
- `GET /api/admin/users`: Mengembalikan daftar seluruh pengguna dari tabel `app_users`, dengan opsi filter query `status` (`pending`, `approved`, `suspended`) dan pencarian nama/email. Hanya dapat diakses oleh user ber-role `super_admin` atau `admin`.
— **Reversibility:** Reversible.

### Alur Persetujuan Pengguna (Approval) (D-02)
- `POST /api/admin/users/:id/approve`: Menerima payload `{ role }`.
- Pilihan role yang valid: `'cashier'`, `'race_director'`, `'scrutineer'`, `'admin'`, `'viewer'`.
- Status diubah menjadi `'approved'`, field `approved_at = NOW()`, dan `approved_by` diisi dengan email/ID admin yang menyetujui.
— **Reversibility:** Reversible.

### Perubahan Peran & Status Revocation (D-03)
- `POST /api/admin/users/:id/role`: Mengubah role pengguna terdaftar.
- `POST /api/admin/users/:id/status`: Mengubah status pengguna (`'approved'`, `'suspended'`). Jika user di-suspend, seluruh token sesi aktif user tersebut di `auth_sessions` langsung dihapus agar ter-logout seketika.
- **Proteksi Kekebalan Super Admin:** Akun `tropicans@gmail.com` (`role: 'super_admin'`) tidak dapat diubah statusnya menjadi suspended atau di-downgrade perannya oleh siapapun.
— **Reversibility:** Reversible.

### Arsitektur Middleware RBAC (D-04)
- **`requireAuth`**: Mengekstrak Bearer token dari header `Authorization`. Mengembalikan 401 Unauthorized jika tidak ada token atau sesi tidak ditemukan di `auth_sessions`.
- **`requireApproved`**: Memanggil `requireAuth` dan memastikan `req.user.status === 'approved'`. Jika status masih `'pending'`, mengembalikan 403 Forbidden dengan pesan: `Akun Anda masih menunggu persetujuan Super Admin (tropicans@gmail.com)`. Jika `'suspended'`, mengembalikan 403: `Akun Anda telah dinonaktifkan oleh administrator`.
- **`requireRole(...allowedRoles)`**: Memanggil `requireApproved` dan memastikan `allowedRoles.includes(req.user.role)` atau `req.user.role === 'super_admin'` (Super Admin memiliki hak bypass untuk seluruh aksi). Mengembalikan 403 Forbidden jika role tidak mencukupi.
— **Reversibility:** Reversible.

### Sinkronisasi Real-Time WebSocket (D-05)
- Setiap kali admin melakukan approve, ubah role, atau suspend pengguna, server memancarkan event WebSocket `user:updated` dengan payload data user terkait agar antarmuka klien dapat merespons secara real-time.
— **Reversibility:** Reversible.

</decisions>

<canonical_refs>
## Canonical References

- `server/services/authService.js` — Database query `app_users` dan token sesi
- `server/index.js` — Registrasi endpoint Express dan Socket.IO broadcast
- `.planning/REQUIREMENTS.md` — Rincian APPR-03, APPR-04, APPR-05, APPR-06

</canonical_refs>
