# Plan: Phase 25 - Cashier & Admin Dashboard UI Integration

## Objective
Mengintegrasikan tombol dan modal interaktif "SYNC GOOGLE SHEET" di antarmuka Kasir (`CashierDashboard.jsx`) dan antarmuka Super Admin (`AdminUserDashboard.jsx`), memungkinkan sinkronisasi data peserta dalam 1 kali klik dengan umpan balik visual real-time dan notifikasi.

## Requirements Addressed
- **SYNC-08**: Tombol dan modal konfirmasi Sync Google Sheet di Dasbor Kasir (`CashierDashboard.jsx`).
- **SYNC-09**: Tombol dan visual status Sync Google Sheet di Panel Admin (`AdminUserDashboard.jsx`).
- **SYNC-10**: Modal/dialog input cepat untuk memvalidasi atau mengganti URL Google Sheet target sebelum melakukan sync.

## Tasks

### Task 1: Reusable Sync Modal Component (`client/src/components/sync/GoogleSheetSyncModal.jsx`)
- Buat komponen modal bergaya cyberpunk (`GoogleSheetSyncModal.jsx`).
- State:
  - `sheetUrl`: input URL Google Sheet (diisi otomatis dari `/api/participants/sync-sheet/status`).
  - `loading`: status proses sync.
  - `error`: pesan error jika koneksi gagal atau URL tidak valid.
  - `syncResult`: ringkasan `{ totalFound, addedCount, skippedCount, added, skipped }`.
- Menampilkan breakdown pembalap baru yang didaftarkan lengkap dengan nomor urut (`#1`, `#2`..).
- Panggilan audio feedback via `sound.playTone`.

### Task 2: Cashier Dashboard Integration (`client/src/screens/CashierDashboard.jsx`)
- Import `GoogleSheetSyncModal` dan icon `DatabaseSync` / `FileSpreadsheet`.
- Tambahkan tombol "SYNC SHEET" di header banner (sebelah tombol "IMPORT CSV").
- Hubungkan event `onSuccess` dari modal dengan `fetchTelemetry()`, `fetchUsers()`, dan banner sukses.

### Task 3: Admin Dashboard Integration (`client/src/screens/AdminUserDashboard.jsx`)
- Tambahkan panel / banner info sinkronisasi peserta Google Sheets di `AdminUserDashboard.jsx`.
- Menampilkan status URL tersinkron dan tombol "SINKRONKAN PEMBALAP".
- Membuka modal `GoogleSheetSyncModal`.

### Task 4: Frontend Production Build & Verification
- Jalankan `npm run build` di root / client.
- Pastikan build Vite bersih tanpa lint error atau broken imports.
