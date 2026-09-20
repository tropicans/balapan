# Roadmap: NEO-TAMIYA Racing System

## Milestones

- ✅ **v4.0 Postgres DB Driver + Redis Socket Adapter & API Rate Limiting (Standalone Decoupled)** — Phases 29-31 (shipped 2026-09-20) — [Archive](milestones/v4.0-ROADMAP.md)
- ✅ **v3.4 System Hardening, Security & Operational Reliability** — Phases 26-28 (shipped 2026-09-20) — [Archive](milestones/v3.4-ROADMAP.md)
- ✅ **v3.3 Google Sheets Racer Sync & Admin Integration** — Phases 24-25 (shipped 2026-09-18) — [Archive](milestones/v3.3-ROADMAP.md)
- ✅ **v3.2 Google OAuth Authentication & Admin Approval System** — Phases 20-23 (shipped 2026-09-18) — [Archive](milestones/v3.2-ROADMAP.md)
- ✅ **v3.1 Race Director Elimination Command Center** — Phases 18-19 (shipped 2026-09-18) — [Archive](milestones/v3.1-ROADMAP.md)
- ✅ **v3.0 Alur Balap Fisik Tanpa Scan Kupon** — Phases 11-17 (shipped 2026-09-17) — [Archive](milestones/v3.0-ROADMAP.md)
- ✅ **v2.0 Physical Coupon & Marshal-Driven Tournament System** — Phases 07-10 (shipped 2026-09-04) — [Archive](milestones/v2.0-ROADMAP.md)
- ✅ **v1.2 Multi-Round 3-Lane Elimination System** — Phases 5-6 (shipped 2026-09-03) — [Archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.1 UI/UX & Arena Visual Showcase Polish** — Phases 3-4 (shipped 2026-09-03) — [Archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.0 Full SRS & Blueprint Compliance** — Phases 1-2 (shipped 2026-09-03) — [Archive](milestones/v1.0-ROADMAP.md)

## Phases

### v4.0 Postgres DB Driver + Redis Socket Adapter & API Rate Limiting (Phases 29-31)

- [x] **Phase 29: Standalone Decoupled System & Local CSV Import/Export** (1/1 plan) — completed 2026-09-20
  - Goal: Melepaskan dependensi dari Google Sheets dengan modul manajemen data peserta mandiri & import/export CSV/JSON lokal di Kasir (`/cashier`) dan Admin (`/admin`), sembari mempertahankan Google OAuth & Offline Login.
  - Requirements: STANDALONE-01, STANDALONE-02, STANDALONE-03, STANDALONE-04

- [x] **Phase 30: PostgreSQL DB Driver & Dual-Database Abstraction Layer** (1/1 plan) — completed 2026-09-20
  - Goal: Mengembangkan abstraksi database driver switchable (`DB_DRIVER=postgres|sqlite`), skema PostgreSQL lengkap dengan migrasi & seeder, transaksi ACID, dan SQLite WASM fallback.
  - Requirements: PG-01, PG-02, PG-03, PG-04

- [x] **Phase 31: Redis Socket Adapter & API Rate Limiting Infrastructure** (1/1 plan) — completed 2026-09-20
  - Goal: Mengintegrasikan `@socket.io/redis-adapter` untuk scaling horizontal real-time WebSocket pub/sub serta mengimplementasikan API Rate Limiting middleware (Redis & in-memory backed).
  - Requirements: REDIS-01, REDIS-02, REDIS-03, RATELIM-01, RATELIM-02, RATELIM-03

<details>
<summary>✅ v3.4 System Hardening, Security & Operational Reliability (Phases 26-28) — SHIPPED 2026-09-20</summary>

- [x] Phase 26: Critical Bug Fixes & Public Bracket Security Gate (1/1 plan) — completed 2026-09-20
- [x] Phase 27: End-to-End RBAC Backend Protection & Frontend Role Guarding (1/1 plan) — completed 2026-09-20
- [x] Phase 28: Multi-Round Lock Hardening, Event Isolation & Offline Capabilities (1/1 plan) — completed 2026-09-20

</details>

---

## Progress

**Execution Order:**
Phases execute in numeric order: 29 → 30 → 31

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 29. Standalone Decoupled System & Local CSV Import/Export | v4.0 | 1/1 | Completed | 2026-09-20 |
| 30. PostgreSQL DB Driver & Dual-Database Abstraction Layer | v4.0 | 1/1 | Completed | 2026-09-20 |
| 31. Redis Socket Adapter & API Rate Limiting Infrastructure | v4.0 | 1/1 | Completed | 2026-09-20 |

---
*Roadmap updated: 2026-09-20 for Milestone v4.0 initialization*
