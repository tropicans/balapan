# Phase 25: Cashier & Admin Dashboard UI Integration - Context

## Overview
Phase 25 melengkapi integrasi antarmuka frontend: menyediakan tombol dan modal interaktif "SYNC GOOGLE SHEET" di dasbor Kasir (`CashierDashboard.jsx`) dan panel Super Admin (`AdminUserDashboard.jsx`).

## Implementation Decisions (Locked)

### 1. Reusable Google Sheet Sync Modal Component
- Buat komponen `client/src/components/sync/GoogleSheetSyncModal.jsx` yang dapat digunakan baik oleh Kasir maupun Admin.
- Fitur modal:
  - Menampilkan input URL Google Sheets (default terisi dengan URL active setting).
  - Tombol aksi "SINKRONISASIKAN SEKARANG" dengan spinner loading.
  - Preview / Result card setelah sinkronisasi selesai:
    - Jumlah pembalap baru ditambahkan (badge hijau neon).
    - Jumlah data dilewati / duplikat (badge abu-abu/kuning).
    - Daftar nama pembalap baru yang baru saja di-insert dengan nomornya.
  - Efek audio feedback (success tone / error tone).
  - Integrasi Socket.IO reaktif agar list peserta dan counter langsung refresh.

### 2. Cashier Dashboard Integration (`CashierDashboard.jsx`)
- Tambahkan tombol `CyberButton` variant "green" / "cyan" bertuliskan `SYNC GOOGLE SHEET` di header telemetry kasir bersebelahan dengan tombol `IMPORT CSV`.
- Tombol membuka `GoogleSheetSyncModal`.
- Setelah sukses sinkronisasi, kasir me-refresh data telemetry dan menampilkan notifikasi toast sukses.

### 3. Admin Dashboard Integration (`AdminUserDashboard.jsx`)
- Di panel Admin (`/admin`), sediakan action bar / card sinkronisasi terpadu:
  - Menampilkan status Google Sheets Sync: URL target aktif, terakhir disinkronkan kapan, dan berapa pembalap terakhir ditambahkan.
  - Tombol cepat "SYNC DATA PEMBALAP" yang membuka modal sync atau langsung mentrigger sinkronisasi.

### 4. Verification
- Verifikasi Vite production build: `npm run build` (harus 0 errors).
- Verifikasi tidak ada console errors saat rendering modal dan tombol.
