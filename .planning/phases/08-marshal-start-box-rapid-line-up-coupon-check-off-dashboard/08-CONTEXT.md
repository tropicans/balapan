# Phase 08: Marshal Start Box Rapid Line-Up & Coupon Check-off Dashboard - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Membangun dasbor touch-friendly berukuran besar `/marshal` (`MarshalDashboard.jsx`) untuk panitia lapangan (Marshal / Juri Finish / Scrutineer) yang dioptimalkan untuk tablet/smartphone di tepi lintasan. 

Pada **Babak 1 (Kualifikasi)**, dasbor bertindak sebagai fast recording station untuk memvalidasi nomor seri kupon fisik pre-printed (`coupon_packages`) milik mobil yang berhasil finish dan menang, memotong kuota kupon, menerbitkan hak tiket Babak 2, dan menyiarkan hasil secara real-time via WebSocket ke Dasbor Race Director (`/race-director`) dan Layar TV Sirkuit (`/tv`). Mobil yang klontang/kalah dilepas secara mekanis tanpa bottleneck input sistem.

Pada **Babak 2 (Eliminasi Bracket)**, dasbor menampilkan 3 pembalap terjadwal di Jalur A (Pink), Jalur B (Cyan), dan Jalur C (Green) dari bagan bracket eliminasi dan memungkinkan 1-tap seleksi pemenang match untuk melaju ke babak berikutnya.

</domain>

<decisions>
## Implementation Decisions

### Realitas Operasional Garis Start & Fisik Kupon
- **D-01:** Petugas di garis start (Start Box Marshal) tidak memegang perangkat digital apa pun. Pelepasan 3 mobil (Jalur A, B, C) dilakukan murni secara mekanis menggunakan tuas start penahan mobil yang digerakkan tangan.
- **D-02:** Pembalap mengantre mandiri secara fisik di depan box start pada jalur yang diinginkan (A, B, atau C) dengan membawa mobil dan lembaran kupon fisik pre-printed. Pencoretan kotak kupon fisik (50 kotak) dilakukan secara manual di kertas oleh Marshal garis start menggunakan pulpen/spidol saat mobil diletakkan di start box.
- **D-03:** Mobil yang kalah atau klontang (Crash Out / CO) di Babak 1 tidak perlu dicatat apa pun ke sistem. Layar dasbor tidak perlu disentuh untuk heat yang semua mobilnya CO, sehingga ratusan heat kualifikasi dapat berjalan bertubi-tubi dalam hitungan detik tanpa hambatan digital.

### Pencatatan Pemenang Babak 1 di Meja Finish (`/marshal`)
- **D-04:** Layar sentuh tablet di rute `/marshal` (`MarshalDashboard.jsx`) ditempatkan di Meja Finish / Scrutineer di samping lintasan.
- **D-05:** Saat mobil berhasil finish dan menang heat, pemenang membawa mobil dan lembar kuponnya ke meja finish. Juri Finish / Marshal memilih jalur kemenangan (Jalur A Pink, Jalur B Cyan, Jalur C Green) dan mengetik **Nomor Seri Kupon Fisik** (misal: `012` atau `CPN-001`) via on-screen numpad besar atau input keyboard.
- **D-06:** Sistem secara instan memverifikasi nomor seri tersebut ke tabel `coupon_packages` (yang telah didaftarkan kasir pada Phase 07), menampilkan nama pembalap dan nama tim secara mencolok, membunyikan audio chime sukses, mendebit 1 kuota pada paket kupon, dan mencatat pembalap sebagai pemenang heat yang berhak atas tiket Babak 2. — **Reversibility:** costly — pencatatan pemenang ini memicu integrasi tiket Babak 2 di Phase 09 dan auto-seeding bracket.
- **D-07:** Pengawasan fisik sisa kuota (50 kotak) tetap dikontrol secara visual oleh panitia pada lembaran kertas di tangan pembalap; sistem tidak memblokir kuota secara kaku di garis start kualifikasi agar tidak menghambat ritme kompetisi.

### Sinkronisasi Real-Time & Handshake Race Director
- **D-08:** Begitu pemenang dicatat di `/marshal`, data langsung tersimpan via API dan disiarkan via WebSocket (`marshal:winner-recorded`, `race:finished`) ke Dasbor Race Director (`/race-director`) dan Layar TV Sirkuit (`/tv`) secara instan tanpa perlu persetujuan manual bertahap dari Race Director.
- **D-09:** Sediakan tombol "Batal / Koreksi Pemenang Terakhir" (Undo) di layar `/marshal` dengan batas waktu singkat (misal 60 detik) untuk mengantisipasi salah ketik nomor seri kupon oleh Juri Finish.
- **D-10:** Jika nomor seri kupon yang dimasukkan belum pernah didaftarkan di kasir, sistem menampilkan modal/banner alert merah tebal: "KUPON BELUM TERDAFTAR DI KASIR" dan menolak penerbitan pemenang hingga peserta mengaktifkan kuponnya di meja kasir.

### Transisi & Eksekusi Babak 2 (Eliminasi Bracket)
- **D-11:** Di Babak 2, data pembalap sudah lengkap terisi otomatis di sistem dari pemenang-pemenang Babak 1 yang terdaftar di bracket (`bracket_matches`).
- **D-12:** Layar `/marshal` menyediakan toggle/tampilan mode Babak 2 yang otomatis menampilkan 3 nama pembalap yang dijadwalkan di Jalur A, B, dan C untuk match aktif. Juri/Marshal cukup melakukan 1-tap pada nama pembalap pemenang untuk meloloskannya ke putaran berikutnya di bagan bracket eliminasi.

### the agent's Discretion
- Skema warna kontras tinggi Cyberpunk untuk tablet lapangan: Jalur A Pink Neon (`#ff007f`), Jalur B Cyan Neon (`#00f0ff`), Jalur C Green Neon (`#00ff66`).
- Implementasi Web Audio API sintetis untuk efek suara konfirmasi menang (beep/chime frekuensi tinggi) tanpa aset audio eksternal.
- Komponen On-Screen Numpad sentuh berukuran tombol minimal 64px x 64px agar mudah ditekan jari tangan petugas di tablet.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Roadmap Contracts
- `.planning/PROJECT.md` — Definisi proyek dan arsitektur turnamen v2.0 Marshal-driven.
- `.planning/ROADMAP.md` — Rencana Phase 08 (Marshal Start Box Rapid Line-Up & Coupon Check-off Dashboard) dan keterhubungannya dengan Phase 07, 09, dan 10.
- `.planning/REQUIREMENTS.md` — Spesifikasi kebutuhan `MRSH-01`, `MRSH-02`, `MRSH-03`, dan `MRSH-04`.
- `.planning/phases/07-pre-printed-coupon-package-registration-cashier-flow/07-CONTEXT.md` — Keputusan Phase 07 terkait skema `coupon_packages` dan nomor seri kupon fisik pre-printed.

### Codebase Architecture & Conventions
- `.planning/codebase/ARCHITECTURE.md` — Pola Express + sql.js WASM + React Vite.
- `.planning/codebase/CONVENTIONS.md` — Konvensi respons API (`{ success: true, data: ... }`), Cyberpunk UI colors, dan styling TailwindCSS.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/components/ui/CyberCard.jsx` & `client/src/components/ui/CyberButton.jsx`: Komponen card dan button dengan neon border cyberpunk.
- `client/src/screens/RaceDirectorDashboard.jsx`: Dasbor Race Director yang memantau balapan aktif dan integrasi lane A/B/C.
- `client/src/screens/BracketDashboard.jsx`: Layar bagan bracket eliminasi Babak 2 yang mengonsumsi data `bracket_matches`.
- `client/src/context/RaceContext.jsx`: Context provider React untuk state balapan real-time dan koneksi socket.io.

### Established Patterns
- WebSocket broadcasting: `io.emit('race_updated', ...)` dan `io.emit('winner_recorded', ...)` di `server/index.js` untuk live sync ke semua klien.
- Database access: `server/db.js` dengan wrapper prepared statements `db.prepare()`.

### Integration Points
- Rute baru di React client: `/marshal` (`client/src/screens/MarshalDashboard.jsx`) dan penambahan link di navbar (`Navbar.jsx`).
- API endpoints baru di `server/index.js` & `server/raceManager.js`:
  - `POST /api/marshal/record-winner`: Validasi nomor seri kupon pemenang, debit 1 kuota pada paket kupon, dan catat hasil heat.
  - `POST /api/marshal/undo-last-winner`: Batalkan pencatatan pemenang terakhir jika terjadi salah ketik.
  - `GET /api/marshal/active-bracket-match`: Mengambil data 3 pembalap terjadwal di jalur A, B, C untuk Babak 2.

</code_context>

<specifics>
## Specific Ideas

- Di lapangan Mini 4WD, panitia start box mengoperasikan tuas start mekanis dengan kedua tangan sambil mencoret kertas kupon fisik 50 kotak. Tidak ada tablet di start box.
- Tablet ditempatkan di meja Juri Finish / Scrutineer (`/marshal`). Juri finish hanya mengetik nomor seri kupon pemenang (misal `012`), sistem memvalidasi nama pembalap/tim dari kasir, membunyikan suara sukses, dan langsung meloloskan pembalap ke Babak 2.
- Jika seluruh mobil klontang (All CO) di Babak 1, panitia tidak perlu menyentuh layar sama sekali.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed strictly within phase scope.

</deferred>

---

*Phase: 08-Marshal Start Box Rapid Line-Up & Coupon Check-off Dashboard*
*Context gathered: 2026-09-04*
