# Summary: Phase 24 - Google Sheets Live Fetch, Idempotent Sync Service & API Endpoints

## What Changed
1. **Google Sheet Sync Service (`server/services/googleSheetService.js`)**:
   - Fungsi `normalizeGoogleSheetUrl` yang otomatis mengekstrak Spreadsheet ID dan gid tab, mengonversi URL dokumen web menjadi URL export CSV murni.
   - Fungsi `fetchGoogleSheetCsv` dengan proteksi timeout koneksi 15 detik.
   - Fungsi `syncParticipantsFromSheet`:
     - Membaca data peserta terparse dari format CSV.
     - Melakukan pencocokan case-insensitive terhadap seluruh pembalap yang sudah terdaftar di event aktif (`event_id`).
     - Meng-insert pembalap baru secara berurutan (`MAX(participant_number) + 1`) di dalam database transaction atomik.
     - Menyimpan status URL dan timestamp sinkronisasi ke tabel `tournament_settings`.
2. **Backend API Routes (`server/index.js`)**:
   - Ditambahkan endpoint `GET /api/participants/sync-sheet/status`.
   - Ditambahkan endpoint `POST /api/participants/sync-sheet` dengan broadcast Socket.IO `participants_imported` dan `STATE_UPDATE`.
3. **Automated Test Suite (`server/tests/google-sheet-sync.test.js`)**:
   - Seluruh 4 tes unit & integrasi (normalisasi URL, idempotence anti-duplikasi, penomoran berurutan, dan HTTP REST API) lolos 100% green.
   - Seluruh regression test suite (`npm test`) lolos 100% tanpa regresi.

## Verification
- `node server/tests/google-sheet-sync.test.js` -> PASSED
- `npm test` -> 20/20 test suites PASSED
