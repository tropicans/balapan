# Plan: Phase 24 - Google Sheets Live Fetch, Idempotent Sync Service & API Endpoints

## Objective
Membangun backend service untuk download dan parsing live data dari Google Sheets, logika sinkronisasi cerdas idempotence (anti-duplikat nama pembalap per event aktif), dan REST endpoint `/api/participants/sync-sheet` serta `/api/participants/sync-sheet/status` dengan proteksi RBAC dan broadcast real-time.

## Requirements Addressed
- **SYNC-01**: Normalisasi Google Sheets URL ke export format CSV.
- **SYNC-02**: HTTP fetch live data dan parsing CSV via `parseParticipantCsv`.
- **SYNC-03**: Idempotent duplicate detection (nama peserta per active event).
- **SYNC-04**: Alokasi `participant_number` berurutan atomik (`MAX + 1`).
- **SYNC-05**: Simpan sync URL ke `tournament_settings` dan kembalikan metrik ringkasan.
- **SYNC-06**: Endpoint `POST /api/participants/sync-sheet` dengan otorisasi admin/cashier.
- **SYNC-07**: Socket.IO broadcast `participants_imported` dan `STATE_UPDATE`.

## Tasks

### Task 1: Google Sheet Sync Service (`server/services/googleSheetService.js`)
- Buat fungsi `normalizeGoogleSheetUrl(url)` yang menerima URL spreadsheet biasa dan mengubahnya menjadi format CSV export:
  - Input: `https://docs.google.com/spreadsheets/d/{ID}/edit?gid={GID}#gid={GID}`
  - Output: `https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid={GID}`
- Buat fungsi `fetchGoogleSheetCsv(exportUrl, timeoutMs = 15000)` menggunakan global `fetch` dengan abort signal.
- Buat fungsi `syncParticipantsFromSheet({ sheetUrl, eventId })`:
  - Validasi dan normalisasi URL.
  - Fetch CSV content.
  - Parse via `parseParticipantCsv`.
  - Cek nama-nama yang sudah ada di database untuk event aktif (`SELECT LOWER(TRIM(name)) AS norm_name FROM users WHERE event_id = ?`).
  - Filter peserta yang belum terdaftar (`isPaid || isComp` dari parser).
  - Dalam database transaction:
    - Ambil `COALESCE(MAX(participant_number), 0)` dari event aktif.
    - Insert peserta baru satu per satu dengan penomoran berurutan.
    - Simpan `google_sheet_sync_url` dan `google_sheet_last_sync_time` ke `tournament_settings`.
  - Return ringkasan: `{ totalFound, addedCount, skippedCount, added, skipped, sheetUrl, targetEventId }`.

### Task 2: Endpoint Integration & RBAC in `server/index.js`
- Tambahkan route:
  - `POST /api/participants/sync-sheet`: memanggil `syncParticipantsFromSheet`, emit Socket.IO `participants_imported` dan `STATE_UPDATE`, panggil `broadcastFullState()`.
  - `GET /api/participants/sync-sheet/status`: mengembalikan URL sheet yang tersimpan dan status event aktif.
- Hubungkan dengan middleware autentikasi/approval jika token tersedia atau allow role cashier/admin.

### Task 3: Comprehensive Test Suite (`server/tests/google-sheet-sync.test.js`)
- Tulis test suite mandiri yang menguji:
  1. `normalizeGoogleSheetUrl` dengan berbagai format URL.
  2. Mocking/live fetch parsing Google Sheet CSV.
  3. Skenario idempotence: Sync 1 memasukkan N data, Sync 2 memasukkan 0 data (semua skipped).
  4. Penomoran berurutan melanjutkan nomor yang sudah ada.
  5. API endpoint response format dan error handling.

## Verification
- Jalankan test suite `node server/tests/google-sheet-sync.test.js`.
- Pastikan semua assertion lulus tanpa error.
