# Phase 13: Manual BTO Backend & Leaderboard - Research & Architecture

**Phase Goal:** Waktu terbaik per peserta dapat diinput manual oleh panitia, menggantikan stopwatch/race engine lama sebagai sumber BTO.
**Requirements:** BTO-01, BTO-02, BTO-03, BTO-04
**Status:** Research Complete

---

## 1. Executive Summary

Phase 13 menghadirkan pencatatan manual BTO (Best Time Overall) yang terisolasi per event aktif. 
Pada turnamen Mini 4WD fisik v3.0, panitia mencatat waktu lap terbaik di lintasan dan menginputnya ke sistem.

1. **Storage Kanonik (`bto_records`):**
   Tabel `bto_records` dibuat di migrasi Phase 11:
   - `id TEXT PRIMARY KEY`
   - `event_id TEXT NOT NULL`
   - `user_id TEXT NOT NULL`
   - `participant_number INTEGER`
   - `finish_time REAL NOT NULL`
   - `recorded_by TEXT`
   - `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`
   - Index: `idx_bto_event_time ON bto_records(event_id, finish_time ASC)`
   - Unique per peserta per event: `UNIQUE(event_id, user_id)` (atau enforced via service logic & unique constraint).

2. **Personal Best Logic (BTO-01, BTO-02):**
   - Jika peserta belum memiliki catatan BTO di event aktif: masukkan catatan baru.
   - Jika peserta sudah memiliki catatan BTO di event aktif:
     - Jika `new_time < existing_time`: perbarui `finish_time` dengan catatan baru (Personal Best terpecahkan).
     - Jika `new_time >= existing_time`: tolak update atau beritahukan bahwa waktu tidak mengalahkan catatan terbaik saat ini (`existing_time`).

3. **Top #1 Record Detection & Celebration (BTO-04):**
   - Sebelum mencatat, cek waktu tercepat nomor #1 saat ini di event aktif: `SELECT MIN(finish_time) as best FROM bto_records WHERE event_id = ?`.
   - Jika `!best || new_time < best`, maka rekor baru turnamen tercipta (`is_new_overall_record = true`).
   - Server memancarkan event `NEW_BTO_RECORD` dengan payload `{ userName, teamName, time, participantNumber, rank: 1 }`.

4. **Leaderboard Realtime (BTO-03):**
   - `btoService.getLeaderboard({ event_id, limit = 5 })` mengembalikan top-N tercepat dengan detail peserta (nomor, nama, tim, waktu).
   - Diintegrasikan ke `RaceManager.getFullState()` agar snapshot `btoLeaderboard` yang disiarkan ke TV Sirkuit dan Dashboards otomatis membaca data kanonik dari `bto_records`.
   - Server juga memancarkan WebSocket `bto:updated` saat ada catatan baru.

5. **Antarmuka Panitia (UI):**
   - Panel input BTO di Dasbor Race Director (`RaceDirectorDashboard.jsx` atau sub-komponen `BtoManager.jsx`):
     - Input nomor peserta (`participant_number`) atau pilih peserta dari auto-complete.
     - Tampilkan info peserta dan personal best saat ini.
     - Input waktu (format detik `XX.XXX`).
     - Tombol submit cepat / shortcut keyboard.
     - Tabel daftar BTO Leaderboard dengan opsi hapus/koreksi catatan jika terjadi salah input oleh panitia.
