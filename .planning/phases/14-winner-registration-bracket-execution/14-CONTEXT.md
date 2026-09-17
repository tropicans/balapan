# Phase 14: Winner Registration & Bracket Execution - Context

**Gathered:** 2026-09-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Fase ini menghadirkan pendaftaran pemenang Babak 2 dan eksekusi bracket eliminasi 3-jalur manual untuk turnamen fisik v3.0:
- **Panel Registrasi Pemenang (WREG-01 to WREG-06):**
  - Panitia memasukkan nomor peserta (`participant_number`) pemenang Babak 1 fisik.
  - Sistem otomatis me-resolve nama pembalap dan tim untuk konfirmasi cepat (WREG-01, WREG-02).
  - Sistem menolak nomor peserta yang tidak terdaftar / tidak valid pada event aktif (WREG-03).
  - Sistem mencegah pendaftaran ganda peserta yang sama ke Babak 2 (WREG-04).
  - Pemenang otomatis menempati slot kosong Round 2 di bagan (Jalur A → B → C), secara dinamis membuat heat baru jika heat sebelumnya sudah penuh (WREG-06).
  - Panitia dapat melakukan undo pendaftaran pemenang terakhir jika terjadi salah input (WREG-05).
- **Eksekusi Bracket Eliminasi 3-Jalur (BRKT-01 to BRKT-03):**
  - Bracket 3-jalur Babak 2+ berjalan tanpa ketergantungan pada status lock/start/countdown race digital (BRKT-01).
  - Panitia memilih pemenang heat secara manual → otomatis advance (3:1 tree reduction) ke babak berikutnya hingga Grand Final (BRKT-02).
  - Navigasi/filter babak dan pencarian peserta bracket berfungsi responsif (BRKT-03).
  - Layar registrasi pemenang dapat diakses langsung dari navigasi atau terintegrasi di BracketDashboard / layar Registrasi Pemenang baru.

Fase ini **tidak** menghapus kode atau database kupon (itu Phase 15/17) dan **tidak** mengubah alur BTO (Phase 13).

</domain>

<decisions>
## Implementation Decisions

### Panel Registrasi Pemenang (Winner Registration)
- **D-01 (Input Nomor & Instant Resolve):** Panitia cukup mengetik nomor peserta (misal `12` atau `#12`). Sistem melakukan resolve nama pembalap dan tim secara realtime dengan debounce 150ms.
- **D-02 (Modal Konfirmasi Pemenang / Quick Submit):** Tekan Enter atau klik tombol "Daftarkan ke Babak 2" untuk konfirmasi. Jika nomor belum terdaftar pada event aktif, tampilkan error peringatan kontras tinggi "Nomor peserta #X tidak ditemukan pada event aktif".
- **D-03 (Proteksi Pendaftaran Ganda):** Jika peserta sudah terdaftar di Round 2 (sudah menempati salah satu slot heat di Round 2 pada event aktif), tolak pendaftaran baru dengan pesan "Peserta #X (Nama) sudah terdaftar di Babak 2".
- **D-04 (Slotting Otomatis A → B → C & Heat Baru):** Pemenang yang didaftarkan mengisi slot kosong pertama pada `bracket_matches` Round 2 (`user_id_1` / Jalur A, lalu `user_id_2` / Jalur B, lalu `user_id_3` / Jalur C). Jika semua heat Round 2 penuh, otomatis buat match/heat baru di Round 2 dengan `match_number` berikutnya.
- **D-05 (Undo Pendaftaran Terakhir):** Disediakan tombol "Undo Pendaftaran Terakhir" yang mengosongkan slot Babak 2 dari pendaftaran terakhir dan menghapus log pendaftaran pemenang tersebut jika ada.
- **D-06 (Riwayat Pendaftaran Pemenang):** Tampilkan daftar peserta yang telah terdaftar ke Babak 2 beserta info Heat dan Jalur yang ditempatinya.

### Eksekusi Bracket Manual
- **D-07 (Advance Tanpa Lock/Countdown):** Tombol pilih pemenang heat di `BracketDashboard.jsx` langsung memanggil endpoint `advanceBracketWinner` tanpa memerlukan status balapan digital (`races.status = 'locked'`).
- **D-08 (Realtime Synchronization):** Setiap pendaftaran pemenang atau eksekusi winner advance memancarkan event WebSocket (`bracket_updated`, `STATE_UPDATE`, `winner_registered`) agar semua layar (TV, Bracket Dashboard, RD) terupdate seketika.

</decisions>

<canonical_refs>
## Canonical References
- `.planning/ROADMAP.md` §"Phase 14: Winner Registration & Bracket Execution"
- `.planning/REQUIREMENTS.md` — WREG-01 s/d WREG-06, BRKT-01 s/d BRKT-03
- `server/raceManager.js` — `advanceBracketWinner`
- `client/src/screens/BracketDashboard.jsx` — antarmuka bracket 3-jalur
</canonical_refs>
