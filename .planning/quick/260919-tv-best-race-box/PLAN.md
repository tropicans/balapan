# Quick Task: Kotak Leaderboard Best Race (Babak 2) di Bawah BTO Circuit TV

## Objective
Menambahkan kotak informasi di layar Circuit TV (`/tv` - `RealtimeTV.jsx`) tepat di bawah kotak BTO (Best Time Overall) yang menampilkan daftar pembalap dengan perolehan kupon / slot terbanyak di Babak 2 (Best Race).

## Changes
1. **Backend Aggregation:**
   - Menghitung `bestRaceLeaderboard` di `server/services/stateService.js` dan `server/raceManager.js` berdasarkan kemunculan racer di `bracket_matches` Babak 2 (`round_number = 2`).
   - Menyertakan `bestRaceLeaderboard` dalam `getFullState()` untuk snapshot Socket.IO dan REST.
2. **Frontend Circuit TV Display:**
   - Membagi kolom kanan (`lg:col-span-4`) di `RealtimeTV.jsx` menjadi dua card yang tersusun vertikal:
     - Card atas: TOP 5 BTO (Amber/Gold cyberpunk theme).
     - Card bawah: BEST RACE (BABAK 2) (Neon Emerald theme dengan Flame icon, rank badges, nomor peserta, nama pembalap, tim, dan jumlah kupon).
   - Fallback komputasi reaktif client-side dari `round2Matches` jika socket snapshot backend belum terisi.
