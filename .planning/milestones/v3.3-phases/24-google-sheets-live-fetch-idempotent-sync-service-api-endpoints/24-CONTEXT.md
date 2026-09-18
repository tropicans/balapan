# Phase 24: Google Sheets Live Fetch, Idempotent Sync Service & API Endpoints - Context

## Overview
Phase 24 fokus pada pembangunan engine sinkronisasi data peserta dari Google Sheets ke database internal DGDash secara live, aman, dan idempotence.

## Implementation Decisions (Locked)

### 1. Google Sheets Live CSV Fetching
- URL default: `https://docs.google.com/spreadsheets/d/1FZC65RxP3XMZM4FtsCTSt3C-EabqYbky/export?format=csv&gid=1028020136`
- Helper extractor URL: Jika user memasukkan URL browser (`/edit?gid=...` atau `.../edit#gid=...`), fungsi helper otomatis mengonversinya menjadi URL export CSV (`/export?format=csv&gid=...`).
- Menggunakan built-in `fetch` di Node.js dengan timeout proteksi (10-15 detik).
- Menyimpan sheet URL yang berhasil digunakan ke tabel `tournament_settings` dengan key `google_sheet_sync_url`.

### 2. Idempotent Deduplication Logic
- Menggunakan `parseParticipantCsv(csvText)` yang sudah ada dan teruji pada format STC Vol 8 (memfilter baris Lunas / comp pada Presale dan OTS).
- Pengecekan duplikat: Dilakukan terhadap nama peserta pada event aktif (`WHERE event_id = ?`). Pencocokan bersifat case-insensitive trimmed (`LOWER(TRIM(name))`).
- Jika nama peserta sudah terdaftar di event aktif: Lewati (skip) dan catat ke dalam daftar `skippedList`.
- Jika nama peserta belum terdaftar di event aktif: Insert ke tabel `users` dengan nomor urut berikutnya (`MAX(participant_number) + 1`), scoped per event aktif.
- Seluruh proses insert dilakukan di dalam `db.transaction()` agar nomor urut konsisten dan terhindar dari race condition.

### 3. API Contract & Protected Endpoints
- Endpoint: `POST /api/participants/sync-sheet`
- Hak Akses: Diproteksi oleh session / RBAC token (`requireRole(['admin', 'cashier'])`).
- Payload opsional: `{ sheet_url?: string, event_id?: string }`
- Response:
  ```json
  {
    "success": true,
    "data": {
      "totalFound": 32,
      "addedCount": 3,
      "skippedCount": 29,
      "added": [...],
      "skipped": [...],
      "targetEventId": "...",
      "sheetUrl": "..."
    }
  }
  ```
- Endpoint GET informasi status sync: `GET /api/participants/sync-sheet/status` mengembalikan URL yang tersimpan dan riwayat ringkasan terakhir.
- Socket.IO broadcast: Memicu event `participants_imported` dan `STATE_UPDATE` saat data baru berhasil di-sync.

### 4. Verification & Testing Strategy
- Menulis automated test suite baru `server/tests/google-sheet-sync.test.js`.
- Pengujian mencakup:
  1. Ekstraksi dan normalisasi Google Sheet URL ke export URL.
  2. Parsing CSV dengan status Lunas vs Belum Lunas.
  3. Idempotent execution (sync pertama meng-insert N peserta, sync kedua menghasilkan 0 penambahan dan N dilewati).
  4. Proteksi otentikasi/RBAC.
