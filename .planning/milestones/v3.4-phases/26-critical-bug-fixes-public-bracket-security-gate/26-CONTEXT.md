# Phase 26: Critical Bug Fixes & Public Bracket Security Gate - Context

## Overview

Fase ini fokus pada perbaikan bug kritis yang ditemukan dalam audit sistem, pengamanan rute publik `/bracket`, perbaikan kebocoran kredensial Google OAuth, pencegahan memory leak WebSocket pada modul BTO, serta pemulihan tampilan nama event aktif di layar TV Sirkuit.

## Locked Implementation Decisions

### 1. OAuth Client Secret & ID Alignment (FIX-01)
- **Keputusan:** Di `.env`, nilai `VITE_GOOGLE_CLIENT_ID` yang sebelumnya berisi client secret (`GOCSPX-...`) diganti dengan Client ID sah (`1073832156942-hakmkecmpdntp2kvr56r63v89ofong0n.apps.googleusercontent.com`).
- **Keamanan:** Klien web browser (Vite) tidak boleh menerima OAuth Client Secret dalam bentuk apa pun.
- **Inisialisasi:** `LoginScreen.jsx` membaca Client ID yang valid sehingga Google Identity Services (GIS) terinisialisasi secara normal tanpa error ID tidak valid.

### 2. Eliminasi Memory Leak & Redundant Fetch di BTO Manager (FIX-02)
- **Keputusan:** Di `client/src/components/director/BtoManager.jsx`:
  - Pasang `socket.off('STATE_UPDATE', handleStateUpdate)` di dalam cleanup function `useEffect`.
  - Ketika menerima event `STATE_UPDATE`, langsung update local state dengan `setLeaderboard(state.btoLeaderboard)` alih-alih memanggil HTTP request `fetchLeaderboard()`.
  - Tetap gunakan `fetchLeaderboard()` hanya saat initial mount atau manual refresh.

### 3. Display Nama Event di Circuit TV HUD (FIX-03)
- **Keputusan:** Di `client/src/screens/RealtimeTV.jsx`, pembacaan nama event aktif diubah menjadi:
  `(activeEvent?.nama || activeEvent?.name || 'DGDASH RACING SYSTEM').toUpperCase()`.
  Ini mencocokkan skema database `events.nama` dan menghilangkan fallback default yang tidak diinginkan saat ada event aktif.

### 4. Kelengkapan Test Suite di package.json (FIX-04)
- **Keputusan:** Tambahkan `node server/tests/google-sheet-sync.test.js` ke dalam perintah `"test"` di `package.json`.
- Seluruh 21 file test suite di `server/tests` harus berjalan dan lulus 100% saat `npm test`.

### 5. Mode Read-Only Spectator di Rute Publik /bracket (SEC-01)
- **Keputusan:** Rute publik `/bracket`:
  - Spectator publik (tanpa login atau peran `viewer`) hanya dapat melihat pohon bagan pertandingan dan status heat secara live.
  - Tombol aksi `MENANG` disembunyikan jika user belum login atau bukan `race_director` / `admin`.
  - Tab `REGISTRASI PEMENANG BABAK 2 (v3.0)` disembunyikan pada `/bracket` publik untuk mencegah manipulasi peserta dan tombol undo oleh penonton biasa.
  - Kontrol penetapan juara heat dan registrasi pemenang babak tetap tersedia penuh di `/director` (Race Director Dashboard) dan `/winners`.

## Scope Fences
- Tidak mengubah skema tabel database di fase ini.
- Tidak mengubah arsitektur eliminasi 3-jalur.
