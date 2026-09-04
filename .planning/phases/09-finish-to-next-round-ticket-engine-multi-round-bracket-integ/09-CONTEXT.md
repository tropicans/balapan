# Phase 09: Finish-to-Next-Round Ticket Engine & Multi-Round Bracket Integration - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Membangun engine backend dan antarmuka terintegrasi untuk penerbitan tiket digital Babak 2 (`next_round_tickets`) secara otomatis saat mobil dinyatakan FINISH/menang di Babak 1 (Kualifikasi), auto-seeding pemegang tiket ke slot kosong bagan eliminasi 3-jalur Babak 2 (`bracket_matches`), penanganan hangus kupon tanpa tiket untuk mobil Klontang / CO (DNF), serta sinkronisasi event WebSocket `ticket:granted` ke seluruh terminal arena (TV Sirkuit, Race Director, dan Marshal).

</domain>

<decisions>
## Implementation Decisions

### Multi-Ticket Policy per Racer & All-3-Same-Lane Auto-Advance
- **D-01:** Satu pembalap diperbolehkan memiliki LEBIH DARI SATU tiket Babak 2 tanpa batas kuota individu (tradisi Mini 4WD "borong tiket"). Setiap kemenangan finish di kualifikasi berhak atas 1 tiket baru untuk menempatkan mobil di bagan eliminasi. — **Reversibility:** costly — memengaruhi skema relasi `next_round_tickets` dan alokasi multi-slot pembalap di `bracket_matches`.
- **D-02:** Penempatan tiket pembalap ke bracket Babak 2 berjalan secara **Sequential Murni** (Match 1 Slot A -> B -> C -> Match 2 Slot A...) sesuai urutan tiket terbit tanpa memaksakan pemisahan heat/match.
- **D-03:** Pembalap yang memiliki banyak tiket ditandai secara visual pada kartu match bracket dan feed sistem dengan format: `Nama Pembalap #1`, `Nama Pembalap #2` (misal: "Budi #1", "Budi #2") agar petugas meja finish dan penonton tahu persis mobil/tiket mana yang sedang turun di lintasan.
- **D-04:** **Aturan All-3-Same-Lane Auto-Advance**: Jika dalam satu heat/match Babak 2 ketiga jalur (Jalur A, B, dan C) terisi oleh pembalap yang sama (misal Budi #1, Budi #2, Budi #3), sistem otomatis menandai match tersebut sebagai `auto_advanced` (langsung lolos tanpa perlu turun balapan fisik) dan meloloskan satu slot mobil pembalap ke babak berikutnya (Babak 3 / Final). — **Reversibility:** costly — aturan spesifik eliminasi turnamen Tamiya untuk mencegah mobil milik satu orang bertarung sia-sia di lintasan.

### Format & Metadata Nomor Tiket
- **D-05:** Format nomor tiket resmi di lapangan menggunakan nomor urut angka sederhana (tiket 1, 2, 3...) yang ditampilkan dengan simbol hash rapi di UI dan TV HUD: `#1`, `#2`, `#3`, `#15`, dst.
- **D-06:** Tabel database `next_round_tickets` mencatat metadata terintegrasi:
  - `id` (UUID)
  - `ticket_number` (Integer auto-increment sequential)
  - `user_id` (ID pembalap)
  - `package_id` & `serial_number` (Nomor seri lembar kupon fisik pemenang dari Phase 07)
  - `lane` ('A', 'B', 'C' jalur kemenangan saat kualifikasi)
  - `source` ('marshal' jika dari meja finish /marshal, 'race_director' jika dari Skenario B digital)
  - `status` ('issued', 'used', 'void')
  - `bracket_match_id` & `bracket_slot` (Slot match Babak 2 yang ditempati tiket)
  - `created_at` & `updated_at`
- **D-07:** Status tiket di `next_round_tickets` tetap berstatus `issued`/`active` sebagai rekam jejak kualifikasi, sedangkan status kalah/menang Babak 2 murni dikelola oleh tabel `bracket_matches` guna mencegah redundansi transisi status.

### Dual-Source Trigger & Pembatalan (Undo/Void)
- **D-08:** Service terpusat `TicketEngine.issueTicket()`: Pintu masuk meja finish `/marshal` (`POST /api/marshal/record-winner`) dan Dasbor Race Director `/race-director` (`RaceManager.submitFinishTimes`) keduanya memanggil engine yang sama secara atomic untuk menjamin nomor tiket urut, auto-placement ke slot bracket, dan broadcast WebSocket seragam. — **Reversibility:** costly — mengonsolidasikan dua alur pencatatan menjadi satu pipeline transaksi ACID.
- **D-09:** Penanganan Klontang / Crash Out (CO) / DNF: Kupon fisik di kertas sudah dicoret manual oleh marshal garis start (atau terpotong otomatis saat deklarasi "Semua CO" di RD), kupon tetap hangus dan sistem TIDAK menerbitkan record tiket. Pada alur mekanis di `/marshal`, jika semua mobil CO, panitia tidak perlu input apa pun (zero input).
- **D-10:** Mekanisme Undo Komprehensif: Jika petugas meja finish menekan tombol "Undo Pemenang Terakhir" (dalam jendela toleransi waktu):
  1. Record tiket di `next_round_tickets` ditandai `void` (atau dibatalkan).
  2. Slot yang sempat terisi di `bracket_matches` dikosongkan kembali.
  3. Kuota kupon fisik pada `coupon_packages` dipulihkan (+1).
  4. Perubahan disiarkan instan via WebSocket (`ticket:voided`, `bracket_updated`).

### Mekanisme Auto-Placement, Kuota Bracket & Penutupan Kualifikasi
- **D-11:** Penentuan kuota Babak 2 fleksibel: Babak 1 kualifikasi dapat berjalan berdasarkan target jumlah race Babak 2 yang ditentukan panitia, ATAU berjalan bebas berdasarkan durasi waktu yang ditentukan panitia.
- **D-12:** Jika saat penutupan kualifikasi jumlah tiket yang terbit tidak genap kelipatan 3, heat terakhir di Babak 2 menerapkan **Sistem Bye Otomatis** (slot kosong dianggap Bye), di mana mobil yang ada otomatis melaju atau bertanding antar peserta yang terisi.
- **D-13:** Dasbor Race Director dibekali tombol kendali **"Kunci Kualifikasi & Finalisasi Babak 2"** untuk membekukan penerbitan tiket baru, mengunci bagan eliminasi Babak 2, dan menyiarkan sinyal arena bahwa Babak 2 siap dimulai.
- **D-14:** WebSocket event `ticket:granted` menyiarkan payload lengkap: nomor tiket (`#X`), nama pembalap, nama tim, nomor seri kupon, jalur menang kualifikasi, info slot match bracket yang ditempati, serta status kuota arena saat ini.

### the agent's Discretion
- Penataan visual modal konfirmasi Undo di dasbor `/marshal` dan `/race-director`.
- Audio chime Web Audio sintetis bernada kemenangan (*double high beep*) saat event `ticket:granted` diterima oleh client.
- Optimasi query auto-seeding bracket dengan transaksi SQLite yang aman dari race condition saat beberapa heat finish berdekatan.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Roadmap Contracts
- `.planning/PROJECT.md` — Definisi proyek, batasan operasional v2.0 Marshal-driven, dan prinsip nol hardware RFID.
- `.planning/ROADMAP.md` — Rencana Phase 09 (Finish-to-Next-Round Ticket Engine & Multi-Round Bracket Integration) serta requirements `TKET-01`, `TKET-02`, dan `TKET-03`.
- `.planning/REQUIREMENTS.md` — Detail spesifikasi `TKET-01`, `TKET-02`, dan `TKET-03`.
- `.planning/phases/07-pre-printed-coupon-package-registration-cashier-flow/07-CONTEXT.md` — Skema paket kupon fisik `coupon_packages` dan pelacakan nomor seri lembar kupon.
- `.planning/phases/08-marshal-start-box-rapid-line-up-coupon-check-off-dashboard/08-CONTEXT.md` — Keputusan meja finish `/marshal`, debit kupon atomic, dan integrasi 1-tap Babak 2.

### Codebase Architecture & Conventions
- `server/raceManager.js` — Logika balapan, Scrutineer, submit finish times, dan helper `seedIntoBracket()`.
- `server/db.js` — Wrapper SQLite prepared statements dan inisialisasi schema tabel.
- `server/index.js` — Endpoint API `/api/marshal/*` dan WebSocket event broadcasting.
- `server/tests/bracket-3lane.test.js` — Test suite referensi struktur 3-jalur bagan eliminasi `bracket_matches`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RaceManager.seedIntoBracket(userId)` di `server/raceManager.js`: Logika seeding yang sudah ada untuk mencari match dengan slot kosong di Round 2 dan mengisi `user_id_1`, `user_id_2`, atau `user_id_3`. Perlu disempurnakan untuk mendukung multi-ticket (`Budi #1`, `Budi #2`), pencatatan `ticket_id`, dan aturan all-3-same-lane auto-advance.
- `server/tests/bracket-3lane.test.js`: Pola seeding 3-jalur dan transisi pemenang antar ronde eliminasi.
- `client/src/screens/BracketDashboard.jsx`: Layar visualisasi bagan bracket eliminasi 3-jalur yang menampilkan match Babak 2 s.d. Grand Final.

### Established Patterns
- Transaksi ACID SQLite: `db.transaction(() => { ... })()` di `server/db.js` untuk memastikan konsistensi penerbitan tiket, auto-placement match, debit kupon, dan logging pemenang.
- Real-time broadcasting via Socket.IO: `io.emit('ticket:granted', payload)` dan `broadcastFullState()`.
- Error envelope API: `{ success: true, data: ... }` atau `{ success: false, error: ... }`.

### Integration Points
- Tabel baru di `server/db.js`: `next_round_tickets` (id, ticket_number, user_id, package_id, serial_number, lane, source, status, bracket_match_id, created_at, updated_at).
- Modifikasi tabel `bracket_matches`: Menyimpan referensi `ticket_id_1`, `ticket_id_2`, `ticket_id_3`, dan flag `is_auto_advanced`.
- Service baru `server/ticketEngine.js` (atau modul di `server/raceManager.js`):
  - `TicketEngine.issueTicket({ userId, packageId, serialNumber, lane, source, finishTime })`
  - `TicketEngine.voidTicket(ticketId, reason)`
  - `TicketEngine.lockQualifyingStage()`
  - `TicketEngine.getTicketStats()`
- Endpoint API di `server/index.js`:
  - `GET /api/tickets` (Daftar tiket Babak 2 yang telah terbit & sisa kuota)
  - `POST /api/tickets/lock-qualifying` (Race Director mengunci kualifikasi dan memfinalisasi bracket Babak 2)
  - Integrasi di `POST /api/marshal/record-winner` dan `POST /api/marshal/undo-last-winner`.

</code_context>

<specifics>
## Specific Ideas

- Di arena Mini 4WD, tiket Babak 2 biasanya diumumkan dan disebut dengan nomor urut ringkas (misal: "Selamat kepada Budi memegang Tiket #12!"). Running ticker TV di Phase 10 akan menampilkan pengumuman ini secara dramatis.
- Jika satu peserta sangat dominan di Babak 1 dan berhasil mengamankan 3 tiket yang kebetulan mengisi satu heat penuh di Babak 2 (Jalur A, B, dan C semuanya mobil Budi), aturan **All-3-Same-Lane Auto-Advance** langsung meloloskan mobilnya ke babak berikutnya tanpa harus membuang waktu balapan melawan diri sendiri.
- Kualifikasi bisa fleksibel: bila panitia menyetel target kuota (misal 36 tiket), TV menampilkan sisa tiket yang diperebutkan; bila tanpa target (berbasis waktu), TV menampilkan total tiket terbit hingga tombol "Kunci Kualifikasi" ditekan oleh Race Director.

</specifics>

<deferred>
## Deferred Ideas

- None — seluruh diskusi fokus pada kebutuhan Phase 09 dan selaras dengan Roadmap Milestone v2.0.

</deferred>

---

*Phase: 09-Finish-to-Next-Round Ticket Engine & Multi-Round Bracket Integration*
*Context gathered: 2026-09-04*
