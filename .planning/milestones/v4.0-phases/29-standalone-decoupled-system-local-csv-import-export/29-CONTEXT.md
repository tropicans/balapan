# Phase 29: Standalone Decoupled System & Local CSV Import/Export - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Melepaskan dependensi dari Google Sheets dengan modul manajemen data peserta mandiri & import/export CSV/JSON lokal di Kasir (`/cashier`) dan Admin (`/admin`), sembari mempertahankan Google OAuth & Offline Login.
</domain>

<decisions>
## Implementation Decisions

### Local CSV/JSON Data Import & Export
- **D-01:** Implementasi endpoint server Express `/api/participants/export` dan `/api/participants/import` (serta BTO & Winners) yang mendukung format CSV dan JSON. — **Reversibility:** costly — menyentuh kontrak API data transfer
- **D-02:** Sediakan UI modal import/export di halaman Kasir (`/cashier`) dan Admin (`/admin`) dengan fitur validasi skema file, preview data sebelum commit, serta pesan error detail per baris.

### Decoupling Google Sheets Sync
- **D-03:** Putus ketergantungan wajib pada Google Sheets API dalam alur kerja registrasi peserta, transaksi tiket, pencatatan BTO, dan update bracket. Sistem beroperasi 100% dari DB lokal tanpa error jika `GOOGLE_SHEET_ID` kosong atau tidak ada koneksi internet. — **Reversibility:** costly — mengubah alur mutasi data core

### Authentication & Venue Backup
- **D-04:** Tetap gunakan Google OAuth 2.0 (`/api/auth/google`) sebagai auth utama, dan simpan Emergency Offline Login (`/api/auth/offline-login`) sebagai penanganan insiden ketika venue mengalami kerusuhan sinyal.

### Agent's Discretion
- Penataan visual tombol import/export di UI Kasir & Admin menyesuaikan desain Cyberpunk / Neo-Racing UI yang ada.
- Format pustaka parsing CSV menggunakan pustaka standar ringan atau custom CSV parser/serializer di Node.js/Express.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/REQUIREMENTS.md` — Section 4: Decoupled Standalone System (STANDALONE-01 s/d STANDALONE-04)
- `.planning/ROADMAP.md` — Phase 29 specifications
- `server/routes/participants.js` — Endpoint peserta & registrasi
- `server/routes/google-sheet-sync.js` — Alur sync Google Sheets eksisting yang didecouple
- `client/src/pages/CashierPage.jsx` — Halaman Kasir tempat integrasi UI Import/Export
- `client/src/pages/AdminDashboard.jsx` — Halaman Admin tempat integrasi UI Import/Export
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/services/` — Layanan basis data SQLite eksisting untuk query participant, bto, dan winners.
- Modul Modal & Notifications UI di frontend (`client/src/components/`).

### Established Patterns
- Express REST API response format: `{ success: true, data: ... }` / `{ success: false, error: ... }`.
- Client-side API client wrapper (`client/src/services/api.js`).

### Integration Points
- `/api/participants` (POST/GET/PUT/DELETE)
- `/api/participants/export` dan `/api/participants/import`
- Frontends `/cashier` dan `/admin`
</code_context>

<specifics>
## Specific Ideas
- Impor data CSV peserta mendukung header: `participant_id`, `name`, `team`, `phone`, `ticket_count`, `category`.
- Ekspor CSV menghasilkan pembatas koma standar dengan sanitasi quote string.
</specifics>

<deferred>
## Deferred Ideas
None — discussion stayed within phase scope.
</deferred>

---
*Phase: 29-Standalone Decoupled System & Local CSV Import/Export*
*Context gathered: 2026-09-20*
