---
phase: 01-race-exceptions-recovery
plan: 01
subsystem: race-engine-exceptions
tags: [all-co, dnf, re-race, free-permit, websocket, react]
provides:
  - "Tombol dan endpoint 'SEMUA CO / DNF (No Winner)': penutupan race cepat tanpa pemenang, kupon tetap hangus"
  - "Tombol dan modal 'DEKLARASI RE-RACE': pemilihan jalur balap ulang, kupon tidak terdebet ulang, zero re-scan"
  - "Broadcast real-time Socket.IO untuk notifikasi TV Sirkuit dan HP Peserta"
  - "Pengujian regresi otomatis (11/11 suite lulus tanpa error)"
affects:
  - 02-scrutineer-desk-alerts
actuals:
  tasks: 4
  commits: 1
tech-stack:
  patterns:
    - ACID transaction updates on race and race_registrations
    - WebSocket broadcast with specialized exception alerts
    - Responsive modal with lane checkboxes
key-files:
  modified:
    - server/raceManager.js
    - server/index.js
    - client/src/context/RaceContext.jsx
    - client/src/screens/RaceDirectorDashboard.jsx
    - client/src/screens/RealtimeTV.jsx
    - client/src/screens/ParticipantDashboard.jsx
    - server/tests/race-flow.test.js
key-decisions:
  - "Kupon kualifikasi tetap hangus saat Semua CO/DNF karena peserta sudah menggunakan jatah slot balapan"
  - "Balap ulang (Re-Race) berstatus Free Permit: saldo kupon peserta tidak dipotong ganda dan tanpa perlu scan QR ulang"
completed: 2026-09-03
status: complete
---

# Phase 1: Race Exceptions & Recovery Summary

**Penanganan kondisi darurat sirkuit (Semua CO/DNF & Deklarasi Re-Race) selesai diimplementasikan secara end-to-end sesuai SRS v1.0 dan Blueprint v20.**

## Accomplishments
1. **Semua CO / DNF (No Winner)**:
   - Method `declareAllCO` di `server/raceManager.js` dan endpoint `POST /api/race/all-co` di `server/index.js`.
   - Tombol merah raksasa `SEMUA CO / DNF (NO WINNER)` di Dasbor Race Director.
   - Status balapan ditutup `completed`, `winner_id = NULL`, registrasi ditandai `dnf_co`, kupon peserta tetap terpotong secara sah.
2. **Deklarasi Re-Race**:
   - Method `declareReRace` di `server/raceManager.js` dan endpoint `POST /api/race/re-race` di `server/index.js`.
   - Tombol amber `DEKLARASI RE-RACE` di Dasbor Race Director yang membuka modal dialog interaktif dengan daftar centang jalur (`[x] Jalur A`, `[x] Jalur B`, `[x] Jalur C`).
   - Jalur terpilih statusnya direset ke `ready`, `status` race kembali ke `pre-start`, saldo kupon peserta **tidak didebet lagi**, dan peserta **tidak perlu scan QR ulang**.
3. **Sinkronisasi Real-Time HUD**:
   - Banner alert berkedip di layar TV Sirkuit dan efek audio alarm saat Re-Race dideklarasikan.
   - Layar HP peserta menampilkan status konfirmasi balap ulang atau notifikasi jika heat berakhir CO/DNF.
4. **Verifikasi & Validasi**:
   - 11 pengujian otomatis di `server/tests/race-flow.test.js` lulus 100% tanpa error.
   - Vite client production build lulus 100% tanpa error sintaks.
