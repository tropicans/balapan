# Phase 15: State Contract Switch & Backend Decoupling/Removal - Research

**Phase Goal:** Backend berhenti bergantung pada kupon/tiket/race engine: kontrak state baru (participants/bracket/BTO) disiarkan realtime, query coupon JOIN dibersihkan, lalu modul lama didecouple/dihapus.
**Requirements:** MIG-03, MON-05, REM-02
**Status:** Research Complete

1. **State Generator (`server/services/stateService.js`):**
   Membuat modul sentral `getFullState()` yang merangkum:
   - `activeEvent`: metadata event aktif
   - `participants`: daftar peserta event aktif
   - `bracketMatches`: matches bagan eliminasi event aktif
   - `btoLeaderboard`: data BTO kanonik dari `bto_records`
   - `settings`: tournament_settings
   - Safe legacy compatibility fallback fields (`activeRace: null`, `upcomingRaces: []`, `scrutineerQueue: []`, `ticketStats: { total_issued: 0, target_quota: 24, remaining_quota: 24, is_locked: false, tickets: [] }`) agar client yang masih berjalan tidak crash sebelum Phase 16.

2. **Coupon Query Decoupling:**
   - Ubah `GET /api/users` di `server/index.js` agar membaca `SELECT * FROM users ORDER BY created_at DESC` tanpa `JOIN coupons`.
   - Pastikan server boot tanpa error circular import.
