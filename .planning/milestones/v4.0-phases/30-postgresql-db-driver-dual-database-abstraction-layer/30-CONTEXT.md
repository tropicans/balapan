# Phase 30: PostgreSQL DB Driver & Dual-Database Abstraction Layer - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Mengembangkan abstraksi database driver switchable (`DB_DRIVER=postgres|sqlite`), skema PostgreSQL lengkap dengan migrasi & seeder, transaksi ACID, dan SQLite WASM fallback.
</domain>

<decisions>
## Implementation Decisions

### DB Driver Abstraction
- **D-01:** Buat lapisan abstraksi database unified di `server/db.js` / `server/dbAdapter.js` yang mendukung environment variable `DB_DRIVER=postgres|sqlite` (default: `sqlite`). — **Reversibility:** costly — abstraksi menyentuh seluruh query server
- **D-02:** Sediakan interface metode database yang konsisten (`prepare`, `get`, `all`, `run`, `transaction`, `exec`) sehingga service layer dapat beroperasi tanpa tergantung driver tertentu.

### PostgreSQL Schema & Migration
- **D-03:** Sediakan skema PostgreSQL lengkap (`server/schemas/postgres-schema.sql`) untuk semua tabel (`events`, `users`, `coupons`, `coupon_packages`, `bto_records`, `marshal_winner_logs`, `next_round_tickets`, `round_locks`, `bracket_matches`, `tournament_settings`). — **Reversibility:** costly — migrasi DB skema

### Transaction & Locking Protection
- **D-04:** Gunakan transaksi ACID bergaransi (dengan row locking `FOR UPDATE` jika PostgreSQL) pada mutasi saldo kupon, penerbitan tiket babak selanjutnya, dan pencatatan BTO.

### Health Endpoint & Testing
- **D-05:** Update `/api/health` untuk menampilkan status koneksi driver aktif (`postgres` atau `sqlite`) serta buat test suite verifikasi dual-driver `server/tests/db-driver-abstraction.test.js`.

### Agent's Discretion
- Penataan koneksi pool `pg` menggunakan standard `pg.Pool` dengan penanganan fallback error yang graceful jika PostgreSQL offline (akan menunjuk ke SQLite fallback).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/REQUIREMENTS.md` — Section 1: PostgreSQL DB Driver (PG-01 s/d PG-04)
- `.planning/ROADMAP.md` — Phase 30 specifications
- `server/db.js` — Modul database utama tempat integrasi abstraksi driver
- `server/migrations.js` — Skema migrasi eksisting
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/db.js` — Struktur SQLite prepared statements.
- `package.json` — Pustaka `sql.js` (WASM SQLite) dan `dotenv`.

### Integration Points
- `server/index.js` (Server boot & `/api/health`)
- Direct DB callers: `participantService.js`, `btoService.js`, `winnerService.js`, `ticketEngine.js`, `raceManager.js`, `authService.js`.
</code_context>

<specifics>
## Specific Ideas
- Parameter `DB_DRIVER` di `.env` menentukan driver database yang diinisialisasi saat server startup.
</specifics>

<deferred>
## Deferred Ideas
None — discussion stayed within phase scope.
</deferred>

---
*Phase: 30-PostgreSQL DB Driver & Dual-Database Abstraction Layer*
*Context gathered: 2026-09-20*
