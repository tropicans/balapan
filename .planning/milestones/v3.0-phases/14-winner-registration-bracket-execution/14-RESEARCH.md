# Phase 14: Winner Registration & Bracket Execution - Research & Architecture

**Phase Goal:** Panitia mendaftarkan pemenang Babak 2 cukup dengan nomor peserta (nama ter-resolve otomatis) dan mengeksekusi heat 3-jalur dengan pilih pemenang manual + auto-advance, tanpa lock/start/countdown.
**Requirements:** WREG-01, WREG-02, WREG-03, WREG-04, WREG-05, WREG-06, BRKT-01, BRKT-02, BRKT-03
**Status:** Research Complete

---

## 1. Domain Architecture

1. **Domain Service: `server/services/winnerService.js`**
   - `registerWinner({ participant_number, event_id })`:
     - Validasi event aktif.
     - Lookup peserta via `participant_number` pada `event_id`. Jika tidak ada → throw "Nomor peserta tidak ditemukan".
     - Cek apakah peserta sudah ada di `bracket_matches` Round 2 (`user_id_1`, `user_id_2`, `user_id_3`) pada `event_id`. Jika ada → throw duplicate error.
     - Cari slot kosong di Round 2 (`user_id_1` / A, `user_id_2` / B, `user_id_3` / C).
     - Jika semua heat penuh, buat match Round 2 baru (`MAX(match_number) + 1`).
     - Simpan log riwayat di `winner_registrations` (atau memory / tracking table) untuk mendukung undo.
     - Kembalikan `{ success, match, slot, participant, heat_number }`.
   - `undoLastWinnerRegistration({ event_id })`:
     - Cari pendaftaran pemenang terakhir yang belum bertanding (status heat masih 'pending' dan belum punya winner).
     - Kosongkan slot pada match terkait.
     - Kembalikan `{ success, undone_participant }`.
   - `getRegisteredWinners({ event_id })`:
     - Kembalikan daftar pemenang Babak 2 terurut dari yang terbaru didaftarkan.

2. **REST API (`server/index.js`):**
   - `POST /api/winners/register`
   - `POST /api/winners/undo`
   - `GET /api/winners`
   - `POST /api/bracket/advance` (memanggil `advanceBracketWinner` tanpa hambatan lock)

3. **Frontend Sub-Components & Screens:**
   - Komponen `WinnerRegistrationPanel.jsx` (form input nomor cepat, kartu preview pembalap, tombol daftarkan, tombol undo terakhir, riwayat pendaftaran).
   - Layar baru atau integrasi ke `BracketDashboard.jsx` (tab "Pendaftaran Pemenang Babak 2" & "Bagan Pertandingan").
   - Ditambahkan ke `App.jsx` dan `Navbar.jsx` (`/winners` / "Registrasi Pemenang").
