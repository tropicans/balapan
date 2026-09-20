# Milestone v4.0 Requirements: Postgres DB Driver + Redis Socket Adapter & API Rate Limiting (Standalone Decoupled)

## Core Focus
Implementasi infrastruktur PostgreSQL DB driver, Redis Socket.IO adapter untuk scaling horizontal, proteksi API Rate Limiting, serta pelepasan ketergantungan dari Google Sheets (sistem mandiri berbasis DB & CSV/JSON lokal, dengan Google OAuth tetap aktif).

## Requirements

### 1. PostgreSQL DB Driver (`PG`)
- [ ] **PG-01**: Abstraksi database driver switchable (`DB_DRIVER=postgres|sqlite`) menggunakan `pg` connection pool & WASM SQLite fallback.
- [ ] **PG-02**: Migrasi & seeder skema database lengkap (`events`, `participants`, `matches`, `winners`, `bto`, `users`) ke PostgreSQL.
- [ ] **PG-03**: Manajemen transaksi database ACID & penguncian aman (pessimistic/optimistic lock) pada mutasi saldo/tiket.
- [ ] **PG-04**: Endpoint kesehatan database (`/api/health`) dan verifikasi test suite dual-driver (PostgreSQL & SQLite).

### 2. Redis Socket Adapter (`REDIS`)
- [ ] **REDIS-01**: Integrasi `@socket.io/redis-adapter` dengan `ioredis` client pada Express WebSocket server.
- [ ] **REDIS-02**: Auto-fallback ke in-memory Socket.IO adapter saat `REDIS_URL` tidak dikonfigurasi / mode offline venue.
- [ ] **REDIS-03**: Sinkronisasi event real-time (Pub/Sub) lintas node/instance server untuk multi-container cluster.

### 3. API Rate Limiting (`RATELIM`)
- [ ] **RATELIM-01**: Middleware Rate Limiting terpasang pada endpoint sensitif (`/api/auth/*`, `/api/participants/*`, `/api/winners/*`, `/api/bracket/*`).
- [ ] **RATELIM-02**: Redis store rate limiter dengan fallback in-memory store untuk proteksi abuse & DDoS.
- [ ] **RATELIM-03**: Respon HTTP 429 Too Many Requests & header RateLimit standar yang konsisten.

### 4. Decoupled Standalone System (`STANDALONE`)
- [ ] **STANDALONE-01**: Pelepasan total ketergantungan turnamen dari Google Sheets (seluruh pendaftaran & data peserta dikelola murni via DB lokal/Postgres).
- [ ] **STANDALONE-02**: Modul Impor & Ekspor CSV/JSON lokal di Kasir (`/cashier`) & Admin (`/admin`) sebagai pengganti Google Sheets sync.
- [ ] **STANDALONE-03**: Google OAuth 2.0 Auth tetap dipertahankan sebagai metode login utama (dengan Emergency Offline Login sebagai backup venue).
- [ ] **STANDALONE-04**: Verifikasi operasional turnamen murni mandiri tanpa dependensi pada Google Sheets.

## Future Requirements
- **AUDIT-01**: Centralized Audit Logging System untuk pelacakan aksi admin & RD.
- **METRICS-01**: Prometheus metrics exporter untuk monitoring kesehatan server & WebSocket latency.

## Out of Scope
- Direct Google Sheets Real-time Two-Way Sync — *Digantikan 100% oleh Local DB & CSV/JSON Import/Export mandiri untuk menjamin independensi total dari Google Sheets*.
- Hardware Sensor Interfacing — *Tetap menggunakan alur semi-manual/Marshal di lapangan*.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| **STANDALONE-01** | Phase 29 | Pending |
| **STANDALONE-02** | Phase 29 | Pending |
| **STANDALONE-03** | Phase 29 | Pending |
| **STANDALONE-04** | Phase 29 | Pending |
| **PG-01** | Phase 30 | Pending |
| **PG-02** | Phase 30 | Pending |
| **PG-03** | Phase 30 | Pending |
| **PG-04** | Phase 30 | Pending |
| **REDIS-01** | Phase 31 | Pending |
| **REDIS-02** | Phase 31 | Pending |
| **REDIS-03** | Phase 31 | Pending |
| **RATELIM-01** | Phase 31 | Pending |
| **RATELIM-02** | Phase 31 | Pending |
| **RATELIM-03** | Phase 31 | Pending |
