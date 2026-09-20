# Quick Task: Indikator Last Sync Google Sheets di Halaman Admin

## Objective
Menampilkan indikator status dan waktu terakhir sinkronisasi Google Sheet (*Last Sync*) secara real-time di bagian Admin (Navbar, Admin User Dashboard `/admin`, dan Kasir Dashboard `/cashier`) tanpa mengganggu tampilan layar TV sirkuit.

## Changes
1. **Backend State Contract:**
   - Menyertakan `sheetSyncStatus: getSchedulerStatus()` pada snapshot `getFullState()` di `server/services/stateService.js` dan `server/raceManager.js`.
   - Mengirim data `lastRunAt`, `lastStatus`, `intervalSeconds`, dll. secara otomatis ke klien WebSocket via `STATE_UPDATE`.
2. **Frontend UI Integration:**
   - **Navbar (`Navbar.jsx`):** Menampilkan badge `SHEET SYNC: HH:mm:ss` dengan dot indikator hijau pulsing di top bar navigasi untuk pengguna yang login sebagai admin/kasir/director.
   - **Admin User Dashboard (`AdminUserDashboard.jsx`):** Menambahkan tombol/pill interaktif `LAST SYNC (60s)` di sebelah tombol `SYNC GOOGLE SHEET`.
   - **Kasir Dashboard (`CashierDashboard.jsx`):** Menambahkan tombol/pill interaktif `LAST SYNC (60s)` di sebelah tombol `SYNC GOOGLE SHEET`.
