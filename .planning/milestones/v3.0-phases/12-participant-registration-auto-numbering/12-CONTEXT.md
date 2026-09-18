# Phase 12: Participant Registration & Auto-Numbering - Context

**Gathered:** 2026-09-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Fase ini menghadirkan alur registrasi peserta mandiri/kasir dan penomoran otomatis berurutan berbasis event aktif untuk milestone v3.0:
- Kasir mendaftarkan peserta (nama pembalap, nama tim opsional) tanpa kupon/serial/saldo.
- Sistem otomatis mengalokasikan nomor peserta unik berurutan (`participant_number`) per event aktif, reset dari 1 pada event baru.
- Layar konfirmasi nomor modal angka raksasa kontras tinggi (#42) untuk memudahkan panitia menyalin nomor ke lembar kupon fisik.
- Fitur pencarian cepat (omni-search) peserta berdasarkan nomor (#) atau nama/tim.
- Fitur perbaikan typo nama/tim tanpa mengubah nomor peserta yang telah terbit.
- Fitur import roster CSV (via Web UI upload dengan modal preview dan via CLI script terminal).
- Penataan UI Dasbor Kasir dengan tab Registrasi Peserta v3.0 sebagai tab utama/default.

Fase ini **tidak** mendaftarkan pemenang ke Babak 2 (itu Phase 14), **tidak** menginput BTO (Phase 13), dan **tidak** melakukan drop tabel kupon/race lama (Phase 17).

</domain>

<decisions>
## Implementation Decisions

### Tampilan Konfirmasi Nomor Peserta di Kasir
- **D-01:** Modal Pop-up Raksasa Kontras Tinggi — Setelah kasir menekan tombol pendaftaran, modal pop-up kontras tinggi muncul menampilkan nomor peserta sangat besar (mis. `#42`), nama pembalap, nama tim, serta tombol aksi "Selesai / Lanjut Daftar" (Enter) agar kasir dapat membaca sekilas dan langsung menuliskan nomor ke kupon fisik.
- **D-02:** Format Tanda Pagar '#42' (Angka Asli Tanpa Zero-Padding) — Di visual UI dan modal, nomor ditampilkan dengan prefix pagar `#` diikuti angka integer asli (`#1`, `#2`, `#42`), konsisten dengan penyimpanan kolom `participant_number INTEGER` (D-04).
- **D-03:** Auto-focus ke input Nama — Setelah modal konfirmasi ditutup (baik via klik tombol, tombol Enter, Space, maupun Esc), kursor form langsung otomatis memfokuskan kembali ke input nama peserta berikutnya tanpa perlu sentuhan mouse.

### Kebijakan Nama Peserta Kembar / Multi-Entry
- **D-04:** Izinkan Langsung & Beri Nomor Baru — Karena turnamen Mini 4WD lazim melibatkan pembalap yang mendaftarkan banyak mobil (multi-entry) atau membeli banyak entri, sistem mengizinkan nama yang sama dan langsung mengalokasikan nomor peserta baru yang berurutan tanpa memblokir.
- **D-05:** Nama Tim Bersifat Opsional — Kolom input Nama Tim (`team_name`) bersifat opsional; jika dikosongkan, disimpan sebagai NULL atau string kosong dan ditampilkan sebagai strip (`-`) pada tabel antarmuka.
- **D-06:** Single Omni-Search Bar — Kasir dan panitia mencari peserta melalui satu input pencarian cerdas dengan debounce 200ms: jika pengguna mengetik angka, otomatis memfilter nomor peserta; jika mengetik teks/huruf, memfilter nama pembalap atau tim.

### Mekanisme Import Roster CSV
- **D-07:** Keduanya (Web UI Upload + CLI Script) — Disediakan tombol "Import CSV" di Web UI Kasir dengan modal preview data sebelum eksekusi, serta pembaruan skrip CLI `scripts/import-roster.js` untuk kebutuhan batch/otomasi terminal.
- **D-08:** Format Standar Simpel (Nama, Tim) + Kompatibilitas STC Vol 8 — Parser CSV mendukung format header fleksibel (`name,team` atau `nama,tim`) sekaligus kompatibel dengan format file roster STC Vol 8 lama (membaca kolom nama pembalap dari baris lunas/comp).
- **D-09:** Auto-Sequence Berkelanjutan — Nomor peserta yang diimport selalu dialokasikan secara berurutan melanjutkan nomor terakhir event aktif (`MAX(participant_number) + 1`) di dalam transaksi database, menjamin tidak ada bentrok nomor (D-05).

### Transisi Layout Dasbor Kasir
- **D-10:** Jadikan 'Registrasi Peserta (v3.0)' sebagai Tab Default / Utama — Menempatkan tab baru "Registrasi Peserta" sebagai tab pertama dan default aktif pada `CashierDashboard.jsx`, sedangkan tab "Paket Kupon (v2.0)" dan "Top Up Saldo Digital" tetap dipertahankan sebagai tab sekunder/arsip transisi sebelum pembersihan di Phase 17.
- **D-11:** Header Lengkap Dasbor Kasir — Menampilkan indikator Event Aktif (nama event + badge 'Active'), Total Peserta Terdaftar, Nomor Terakhir Diterbitkan (`#N`), tombol aksi "Import CSV", dan tombol Refresh.
- **D-12:** Kolom Tabel Peserta + Aksi Edit Nama/Tim — Tabel peserta menampilkan kolom Nomor (`#N`), Nama Pembalap, Tim, Waktu Daftar, dan tombol aksi "Edit" untuk memperbaiki salah ketik (typo) nama/tim secara inline/modal tanpa mengubah nomor peserta yang sudah tertulis di kupon fisik.

### the agent's Discretion
- Penataan visual komponen dialog modal preview import CSV (jumlah baris valid, baris dilewati).
- Endpoint REST API baru (`POST /api/participants` atau perluasan `POST /api/users`) yang ter-scope ke `event_id` event aktif.
- Struktur payload WebSocket `participant_registered` dan `participant_updated` untuk update realtime tabel kasir.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope & Requirements
- `.planning/ROADMAP.md` §"Phase 12: Participant Registration & Auto-Numbering" — goal, success criteria, and scope.
- `.planning/REQUIREMENTS.md` — PARN-01, PARN-02, PARN-03, PARN-04, PARN-05, EVNT-03.
- `.planning/PROJECT.md` — goal milestone v3.0, constraints, and physical-only race flow.
- `.planning/phases/11-event-schema-migration-foundation/11-CONTEXT.md` — D-01 through D-15 (event scoping, participant_number INTEGER, normalization, single active event).

### Backend & Database
- `server/db.js` — skema `users` (`event_id`, `participant_number`), `events`, `SqliteWrapper.transaction()`.
- `server/services/eventService.js` — `getActiveEvent()`, `getActiveEventId()`.
- `server/index.js` — rute `/api/users`, WebSocket broadcast, penanganan transaksi registrasi.
- `scripts/import-roster.js` — skrip roster CSV yang perlu disesuaikan untuk registrasi peserta bernomor ke event aktif.

### Frontend
- `client/src/screens/CashierDashboard.jsx` — dasbor kasir utama yang akan ditambahkan tab Registrasi Peserta (v3.0).
- `client/src/components/ui/CyberCard.jsx` & `client/src/components/ui/CyberButton.jsx` — komponen UI styling tema cyberpunk.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getActiveEvent()` dan `getActiveEventId()` (`server/services/eventService.js`): mengambil event yang sedang aktif untuk mengikat peserta baru.
- `SqliteWrapper.transaction()` (`server/db.js`): transaksi nyata (BEGIN/COMMIT/ROLLBACK) untuk menjamin alokasi `MAX(participant_number) + 1` bebas race-condition.
- `CyberCard`, `CyberButton`, `Navbar`: komponen UI cyberpunk standar.
- `parseCsv` helper di `scripts/import-roster.js`: parser CSV tanpa dependensi eksternal.

### Established Patterns
- Indeks unik: `CREATE UNIQUE INDEX idx_users_event_participant_number ON users(event_id, participant_number)`.
- Nomor reset dari 1 per event baru (EVNT-03): `COALESCE(MAX(participant_number), 0) + 1 WHERE event_id = ?`.
- Error response: `{ success: false, error: "Pesan error bahasa Indonesia" }`.
- WebSocket events: disiarkan via `io.emit()` untuk sinkronisasi multi-layar kasir/RD.

### Integration Points
- Backend: Endpoint pendaftaran peserta (mis. `POST /api/participants` atau `POST /api/users`), endpoint pencarian/list peserta ter-scope event aktif, endpoint update profil peserta (`PUT /api/users/:id`), dan endpoint import CSV (`POST /api/participants/import-csv`).
- Frontend: `CashierDashboard.jsx` menambahkan tab default 'Registrasi Peserta', sub-komponen form registrasi, modal nomor raksasa, tabel daftar peserta, dan modal import CSV.
- CLI: `scripts/import-roster.js` di-update untuk mendaftarkan peserta ke event aktif tanpa membuat `coupon_packages`.

</code_context>

<specifics>
## Specific Ideas

- Modal konfirmasi nomor: angka `#42` ditampilkan dengan font monospaced besar (teks 5xl/6xl) dengan warna Electric Cyan (`#00f0ff`) atau Acid Green (`#39ff14`), sangat kontras terhadap latar Midnight Obsidian (`#0a0b10`).
- Shortcut keyboard kasir: saat di form, tekan Enter untuk mendaftar -> modal muncul -> tekan Enter/Esc untuk menutup modal -> kursor langsung kembali fokus ke input Nama. Kasir bisa mendaftarkan puluhan pembalap tanpa menyentuh mouse.
- Multi-entry pembalap: nama pembalap yang sama langsung diizinkan, menghasilkan nomor berbeda (mis. Budi di #12 dan Budi di #35).

</specifics>

<deferred>
## Deferred Ideas

- **Panel Registrasi Pemenang Babak 2 (WREG-01 s.d. WREG-06)** — Phase 14: input nomor peserta untuk seeding Babak 2.
- **Input Manual BTO & Leaderboard (BTO-01 s.d. BTO-04)** — Phase 13: pencatatan personal-best waktu tercepat.
- **Pembersihan / Drop tabel kupon & race v2.0** — Phase 17: drop tabel lama setelah seluruh alur v3.0 teruji.

</deferred>

---

*Phase: 12-Participant Registration & Auto-Numbering*
*Context gathered: 2026-09-17*
