---
status: complete
date: 2026-09-19
slug: tv-best-race-box
---

# Quick Task Summary: Kotak Leaderboard Best Race (Babak 2) di Bawah BTO Circuit TV

## Hasil Pengerjaan
1. **Backend Aggregation (`stateService.js` & `raceManager.js`):**
   - Menambahkan kalkulasi `bestRaceLeaderboard` yang mengagregasi total tiket/kupon lolos per pembalap di `bracket_matches` Babak 2 (`round_number = 2` atau `1` jika babak 2 belum dibuat).
   - Diurutkan dari pemegang kupon terbanyak (`coupon_count DESC`) dan dibatasi 5 teratas.
   - Dikirim secara real-time via event WebSocket `RACE_STATE_UPDATE` dan HTTP endpoint `getFullState()`.
2. **Frontend Redesign Circuit TV (`RealtimeTV.jsx`):**
   - Mengubah layout kolom samping (`lg:col-span-4`) menjadi 2 kotak bertumpuk vertikal:
     - **Top Box:** TOP 5 BTO (Best Time Overall) dengan aksen Amber/Gold.
     - **Bottom Box:** BEST RACE (BABAK 2) dengan aksen Emerald/Green neon, ikon `Flame`, pill status `LEADER` untuk peringkat #1, nomor pembalap, nama, tim, dan badge kupon `{coupon_count} KUPON`.
   - Menambahkan memoized client fallback dari `round2Matches` sehingga data tetap langsung tampil reaktif bahkan sebelum socket full-state refresh.
3. **Build & Quality Audit:**
   - Client bundle berhasil di-compile (`npm run build:client` - Vite v6.4.3).
   - Automated test suites (`google-sheet-sync.test.js` & `google-sheet-bracket-sync.test.js`) 100% PASS.
   - Container Docker `dgdash-racing-system` berhasil di-build dan di-restart (`Up (healthy)`).
