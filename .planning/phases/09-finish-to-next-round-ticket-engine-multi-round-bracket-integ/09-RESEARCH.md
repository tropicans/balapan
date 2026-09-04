# Phase 09: Finish-to-Next-Round Ticket Engine & Multi-Round Bracket Integration - Research

**Researched:** 2026-09-04  
**Domain:** Mini 4WD Elimination Bracket Engine, Digital Next-Round Tickets, Multi-Ticket Seeding, All-3-Same-Lane Auto-Advance, Atomic Transactions, Real-time WebSocket HUD  
**Confidence:** HIGH  

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Multi-Ticket Policy per Racer & All-3-Same-Lane Auto-Advance
- **D-01:** Satu pembalap diperbolehkan memiliki LEBIH DARI SATU tiket Babak 2 tanpa batas kuota individu (tradisi Mini 4WD "borong tiket"). Setiap kemenangan finish di kualifikasi berhak atas 1 tiket baru untuk menempatkan mobil di bagan eliminasi. — **Reversibility:** costly — memengaruhi skema relasi `next_round_tickets` dan alokasi multi-slot pembalap di `bracket_matches`.
- **D-02:** Penempatan tiket pembalap ke bracket Babak 2 berjalan secara **Sequential Murni** (Match 1 Slot A -> B -> C -> Match 2 Slot A...) sesuai urutan tiket terbit tanpa memaksakan pemisahan heat/match.
- **D-03:** Pembalap yang memiliki banyak tiket ditandai secara visual pada kartu match bracket dan feed sistem dengan format: `Nama Pembalap #1`, `Nama Pembalap #2` (misal: "Budi #1", "Budi #2") agar petugas meja finish dan penonton tahu persis mobil/tiket mana yang sedang turun di lintasan.
- **D-04:** **Aturan All-3-Same-Lane Auto-Advance**: Jika dalam satu heat/match Babak 2 ketiga jalur (Jalur A, B, dan C) terisi oleh pembalap yang sama (misal Budi #1, Budi #2, Budi #3), sistem otomatis menandai match tersebut sebagai `auto_advanced` (langsung lolos tanpa perlu turun balapan fisik) dan meloloskan satu slot mobil pembalap ke babak berikutnya (Babak 3 / Final). — **Reversibility:** costly — aturan spesifik eliminasi turnamen Tamiya untuk mencegah mobil milik satu orang bertarung sia-sia di lintasan.

#### Format & Metadata Nomor Tiket
- **D-05:** Format nomor tiket resmi di lapangan menggunakan nomor urut angka sederhana (tiket 1, 2, 3...) yang ditampilkan dengan simbol hash rapi di UI dan TV HUD: `#1`, `#2`, `#3`, `#15`, dst. (Kode internal: `TKT-B2-001`).
- **D-06:** Tabel database `next_round_tickets` mencatat metadata terintegrasi:
  - `id` (UUID)
  - `ticket_number` (Integer auto-increment sequential 1, 2, 3...)
  - `ticket_code` (Formatted string misal `TKT-B2-001`)
  - `user_id` (ID pembalap)
  - `racer_ticket_index` (Urutan tiket pembalap ke-N, misal 1 untuk Budi #1, 2 untuk Budi #2)
  - `package_id` & `serial_number` (Nomor seri lembar kupon fisik pemenang dari Phase 07)
  - `lane` ('A', 'B', 'C' jalur kemenangan saat kualifikasi)
  - `source` ('marshal' jika dari meja finish /marshal, 'race_director' jika dari Skenario B digital)
  - `status` ('issued', 'used', 'void')
  - `bracket_match_id` & `bracket_slot` ('user_id_1', 'user_id_2', 'user_id_3')
  - `created_at` & `updated_at`
- **D-07:** Status tiket di `next_round_tickets` tetap berstatus `issued`/`active` sebagai rekam jejak kualifikasi, sedangkan status kalah/menang Babak 2 murni dikelola oleh tabel `bracket_matches` guna mencegah redundansi transisi status.

#### Dual-Source Trigger & Pembatalan (Undo/Void)
- **D-08:** Service terpusat `TicketEngine.issueTicket()`: Pintu masuk meja finish `/marshal` (`POST /api/marshal/record-winner`) dan Dasbor Race Director `/race-director` (`RaceManager.submitFinishTimes` / Scrutineer pass) keduanya memanggil engine yang sama secara atomic untuk menjamin nomor tiket urut, auto-placement ke slot bracket, dan broadcast WebSocket seragam. — **Reversibility:** costly — mengonsolidasikan dua alur pencatatan menjadi satu pipeline transaksi ACID.
- **D-09:** Penanganan Klontang / Crash Out (CO) / DNF: Kupon fisik di kertas sudah dicoret manual oleh marshal garis start (atau terpotong otomatis saat deklarasi "Semua CO" di RD), kupon tetap hangus dan sistem TIDAK menerbitkan record tiket. Pada alur mekanis di `/marshal`, jika semua mobil CO, panitia tidak perlu input apa pun (zero input).
- **D-10:** Mekanisme Undo Komprehensif: Jika petugas meja finish menekan tombol "Undo Pemenang Terakhir" (dalam jendela toleransi waktu 60s):
  1. Record tiket di `next_round_tickets` ditandai `void` (atau dibatalkan).
  2. Slot yang sempat terisi di `bracket_matches` dikosongkan kembali.
  3. Kuota kupon fisik pada `coupon_packages` dipulihkan (+1).
  4. Perubahan disiarkan instan via WebSocket (`ticket:voided`, `bracket_updated`).

#### Mekanisme Auto-Placement, Kuota Bracket & Penutupan Kualifikasi
- **D-11:** Penentuan kuota Babak 2 fleksibel: Babak 1 kualifikasi dapat berjalan berdasarkan target jumlah race Babak 2 yang ditentukan panitia, ATAU berjalan bebas berdasarkan durasi waktu yang ditentukan panitia.
- **D-12:** Jika saat penutupan kualifikasi jumlah tiket yang terbit tidak genap kelipatan 3, heat terakhir di Babak 2 menerapkan **Sistem Bye Otomatis** (slot kosong dianggap Bye), di mana mobil yang ada otomatis melaju atau bertanding antar peserta yang terisi.
- **D-13:** Dasbor Race Director dibekali tombol kendali **"Kunci Kualifikasi & Finalisasi Babak 2"** untuk membekukan penerbitan tiket baru, mengunci bagan eliminasi Babak 2, dan menyiarkan sinyal arena bahwa Babak 2 siap dimulai.
- **D-14:** WebSocket event `ticket:granted` menyiarkan payload lengkap: nomor tiket (`#X`), kode tiket, nama pembalap, label pembalap (`Budi #1`), nama tim, nomor seri kupon, jalur menang kualifikasi, info slot match bracket yang ditempati, serta status kuota arena saat ini.

### the agent's Discretion
- Penataan visual badge nomor tiket (`#1`, `#2`) pada kartu bracket di `BracketDashboard.jsx`.
- Audio chime Web Audio sintetis bernada kemenangan (*double high beep*) saat event `ticket:granted` diterima oleh client.
- Optimasi query auto-seeding bracket dengan transaksi SQLite yang aman dari race condition saat beberapa heat finish berdekatan.

### Deferred Ideas (OUT OF SCOPE)
- None — seluruh diskusi fokus pada kebutuhan Phase 09 dan selaras dengan Roadmap Milestone v2.0.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TKET-01 | Ketika mobil dinyatakan FINISH oleh Race Director atau Meja Finish /marshal, sistem secara otomatis menerbitkan record Tiket Babak Berikutnya (`next_round_tickets`) dengan ID tiket unik (misal `TKT-B2-001` / `#1`). | Pembuatan tabel `next_round_tickets` di `server/db.js` dan service terpusat `server/ticketEngine.js` dengan method `issueTicket()` yang berjalan dalam transaksi atomic SQLite. |
| TKET-02 | Pemenang tiket Babak Berikutnya secara otomatis ditempatkan ke slot kosong Babak 2 pada bracket eliminasi 3-jalur (`bracket_matches`). Mendukung multi-tiket per racer (`Budi #1`, `Budi #2`) dan aturan All-3-Same-Lane Auto-Advance. | Pembaruan method `seedIntoBracket` di `TicketEngine`/`RaceManager` untuk menempatkan tiket secara berurutan ke slot kosong Round 2, menyimpan referensi `ticket_id_1/2/3`, dan mendeteksi kondisi auto-advance jika ketiga slot diisi pembalap yang sama. |
| TKET-03 | Jika mobil dinyatakan Klontang / CO (DNF), kupon yang dipakai tetap hangus dan tidak ada tiket babak berikutnya yang diterbitkan. | Pada alur RD `declareAllCO` atau `submitFinishTimes` tanpa pemenang/DNF, saldo kupon terpotong tanpa pemanggilan `issueTicket()`. Pada meja finish `/marshal`, heat klontang tidak memerlukan aksi input apa pun (zero input). |
</phase_requirements>

## Summary

Phase 09 adalah tulang punggung integrasi hasil kualifikasi Babak 1 ke babak eliminasi sistem gugur Babak 2 (Elimination Bracket 3-Jalur). Di turnamen Tamiya lokal Indonesia, satu pembalap sering kali membeli banyak kupon (misal 5 lembar kupon x 50 kotak = 250 race) dan berhasil mengamankan beberapa tiket Babak 2 (fenomena "borong tiket"). 

Sistem harus:
1. Menerbitkan tiket digital Babak 2 berurut (`#1`, `#2`, `#3` / `TKT-B2-001`) yang terhubung langsung ke nomor seri lembar kupon fisik pemenang (`coupon_packages.serial_number`).
2. Menempatkan tiket pemenang secara otomatis ke slot kosong Round 2 di tabel `bracket_matches` (`user_id_1`, `user_id_2`, `user_id_3` bersama `ticket_id_1`, `ticket_id_2`, `ticket_id_3`).
3. Mendukung multi-tiket per pembalap dengan penomoran indeks (`Budi #1`, `Budi #2`).
4. Menangani aturan khusus Mini 4WD **All-3-Same-Lane Auto-Advance**: jika ketiga slot dalam satu heat Babak 2 terisi oleh mobil dari pembalap yang sama, heat otomatis selesai tanpa tanding fisik, meloloskan satu slot mobil ke Babak 3 (Grand Final).
5. Menyediakan mekanisme pembatalan komprehensif (Undo 60 detik) yang membatalkan tiket (`status = 'void'`), mengosongkan slot bracket, mengembalikan kuota kupon, dan menyiarkan sinyal pembatalan ke seluruh terminal arena.
6. Memfasilitasi tombol Race Director untuk **Kunci Kualifikasi & Finalisasi Babak 2** yang menangani sistem Bye jika total tiket tidak kelipatan 3.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Skema Database `next_round_tickets` & Relasi Bracket | Database SQLite (`server/db.js`) | ORM / Wrapper | Menyimpan entitas tiket, indeks tiket pembalap, slot bracket, dan metadata kupon fisik. |
| Centralized Ticket Engine | Service Backend (`server/ticketEngine.js`) | API & Socket.IO | Logika tunggal penerbitan tiket atomik, validasi kualifikasi terkunci, auto-placement, auto-advance 3 jalur sama, dan undo rollback. |
| Integrasi Meja Finish `/marshal` | Controller API (`server/index.js`) | Service Backend | Memanggil `TicketEngine.issueTicket()` di `POST /api/marshal/record-winner` dan `TicketEngine.voidTicket()` di `POST /api/marshal/undo-last-winner`. |
| Integrasi Race Director | Controller API (`server/index.js`) & `RaceManager.js` | Service Backend | Memanggil `TicketEngine.issueTicket()` saat scrutineer meloloskan pemenang atau saat submit finish times Skenario B. Menangani deklarasi CO tanpa tiket. |
| Kunci Kualifikasi & Bye Slot Handling | Controller API (`POST /api/tickets/lock-qualifying`) | Service Backend | Mengunci penerbitan tiket baru, membekukan bagan Round 2, dan menandai slot kosong sebagai bye. |
| Visualisasi Multi-Tiket & Status Bracket | Client UI (`BracketDashboard.jsx`) | React Context (`RaceContext.jsx`) | Menampilkan format `Nama Pembalap #X`, indikator Tiket `#N`, dan badge `AUTO-ADVANCE`. |
| Audio Chime Kemenangan | Web Audio API (Browser Client) | — | Web Audio sintetis memutar double beep sukses saat event `ticket:granted` tiba. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express | ^4.21.2 | Server REST API | [VERIFIED: package.json:24] Framework aktif backend project. |
| sql.js | ^1.14.2 | SQLite in WASM with disk persist | [VERIFIED: package.json:26] Database engine dengan atomic transactions `db.transaction()`. |
| React | ^18.3.1 | Komponen Frontend UI | [VERIFIED: client/package.json:18] UI framework utama. |
| TailwindCSS | ^3.4.17 | Cyberpunk Styling & Responsive HUD | [VERIFIED: client/package.json:29] CSS utilities dengan palet cyberpunk. |
| Lucide React | ^1.16.0 | Ikon UI (Ticket, Trophy, Zap, ShieldAlert, Lock, CheckCircle) | [VERIFIED: client/package.json:16] Ikon standar cyberpunk UI. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | ^11.0.5 | UUID Primary Key | Pembuatan ID unik tabel `next_round_tickets`. |
| socket.io | ^4.8.1 | Real-time Synchronization | Penyiaran event `ticket:granted`, `ticket:voided`, `bracket_updated`, dan `qualifying:locked`. |

## Detailed Technical Patterns

### 1. Database Schema: `next_round_tickets` dan Modifikasi `bracket_matches`

Di `server/db.js`:
```sql
CREATE TABLE IF NOT EXISTS next_round_tickets (
  id TEXT PRIMARY KEY,
  ticket_number INTEGER UNIQUE NOT NULL,
  ticket_code TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  racer_ticket_index INTEGER NOT NULL DEFAULT 1,
  package_id TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  lane TEXT CHECK(lane IN ('A', 'B', 'C')) NOT NULL,
  source TEXT CHECK(source IN ('marshal', 'race_director')) DEFAULT 'marshal',
  status TEXT CHECK(status IN ('issued', 'used', 'void')) DEFAULT 'issued',
  bracket_match_id TEXT,
  bracket_slot TEXT CHECK(bracket_slot IN ('user_id_1', 'user_id_2', 'user_id_3')),
  void_reason TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(package_id) REFERENCES coupon_packages(id),
  FOREIGN KEY(bracket_match_id) REFERENCES bracket_matches(id)
);

CREATE INDEX IF NOT EXISTS idx_tickets_user ON next_round_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_serial ON next_round_tickets(serial_number);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON next_round_tickets(status);
```

Modifikasi kolom di `bracket_matches`:
- `ticket_id_1 TEXT` (FK ke `next_round_tickets(id)`)
- `ticket_id_2 TEXT` (FK ke `next_round_tickets(id)`)
- `ticket_id_3 TEXT` (FK ke `next_round_tickets(id)`)
- `is_auto_advanced INTEGER DEFAULT 0` (Flag jika ketiga jalur diisi orang yang sama)

Tabel settings/config kualifikasi (atau baris status di database):
- `qualifying_status`: 'open' | 'locked'
- `qualifying_target_tickets`: INTEGER | NULL

### 2. Centralized Ticket Engine (`server/ticketEngine.js`)

Service terpusat yang menangani:
1. `issueTicket({ userId, packageId, serialNumber, lane, source, io })`:
   - Cek apakah kualifikasi berstatus `locked`. Jika ya, tolak dengan error: "Kualifikasi telah dikunci oleh Race Director".
   - Tentukan `ticket_number` berikutnya via `SELECT COALESCE(MAX(ticket_number), 0) + 1 FROM next_round_tickets`.
   - Hitung `racer_ticket_index` untuk user ini: `SELECT COUNT(*) FROM next_round_tickets WHERE user_id = ? AND status != 'void'` + 1.
   - Format `ticket_code`: `TKT-B2-${String(ticket_number).padStart(3, '0')}`.
   - Panggil alokasi bracket Babak 2 (`seedTicketIntoRound2(ticket)`).
   - Simpan record `next_round_tickets`.
   - Cek apakah heat yang ditempati tiket sekarang memiliki ketiga slot terisi oleh `userId` yang sama. Jika ya, jalankan `triggerAllSameLaneAutoAdvance(matchId, userId, io)`.
   - Emit event WebSocket: `io.emit('ticket:granted', payload)`.
2. `voidTicket(ticketId, reason, io)`:
   - Ambil tiket berdasarkan ID.
   - Set status tiket menjadi `void`.
   - Kosongkan slot pada `bracket_matches` yang ditempati tiket tersebut.
   - Emit event WebSocket: `io.emit('ticket:voided', { ticketId, ticketNumber })` dan `io.emit('bracket_updated')`.
3. `lockQualifyingStage(io)`:
   - Set status kualifikasi menjadi `locked`.
   - Evaluasi match terakhir di Round 2 jika slot tidak genap 3: terapkan aturan Bye otomatis.
   - Emit event WebSocket: `io.emit('qualifying:locked')`.
4. `getTicketStats()`:
   - Mengambil total tiket terbit, daftar pembalap dengan jumlah tiketnya, dan status kualifikasi.

### 3. Logika All-3-Same-Lane Auto-Advance

Sesuai aturan D-04:
Jika pada `bracket_matches` Round 2:
`m.user_id_1 === m.user_id_2 && m.user_id_2 === m.user_id_3 && m.user_id_1 === userId`
Maka:
1. Tandai match tersebut: `status = 'completed'`, `is_auto_advanced = 1`, `winner_id = userId`.
2. Panggil `RaceManager.advanceBracketWinner(match.id, userId)` untuk memajukan pembalap ke Round berikutnya (Round 3 / Grand Final).
3. Siarkan log event khusus bahwa heat tersebut lolos otomatis tanpa balapan.

### 4. WebSocket Event Architecture

| Event Name | Emitter | Listener | Payload Summary |
|------------|---------|----------|-----------------|
| `ticket:granted` | Backend `TicketEngine.issueTicket` | All Terminals (TV, RD, Marshal, Bracket) | `{ ticket: { id, ticket_number, ticket_code, user_id, user_name, racer_ticket_index, racer_label, team_name, lane, serial_number, match_number, slot }, stats: { total_issued, remaining_target } }` |
| `ticket:voided` | Backend `TicketEngine.voidTicket` | All Terminals | `{ ticket_id, ticket_number, reason }` |
| `qualifying:locked` | Backend `TicketEngine.lockQualifyingStage` | All Terminals | `{ is_locked: true, total_tickets, timestamp }` |
| `bracket_updated` | Backend `RaceManager` & `TicketEngine` | Bracket Screen & TV | Full snapshot or update flag |

## Validation Architecture

### Automated Verification Command
- `node server/tests/ticket-engine-flow.test.js`
- `npm test`
- `npm run build`

### Verification Test Scope
1. **Schema & Migration:** Tabel `next_round_tickets` terinisialisasi dengan kolom lengkap dan index. Tabel `bracket_matches` memiliki kolom `ticket_id_1/2/3` dan `is_auto_advanced`.
2. **Sequential Multi-Ticket Issuance:** Penerbitan tiket #1, #2, #3 untuk pembalap yang sama menghasilkan label `Budi #1`, `Budi #2` tanpa error constraint atau duplikasi nomor urut.
3. **Atomic Bracket Placement:** Tiket otomatis mengisi slot terbuka (user_id_1 -> user_id_2 -> user_id_3) di match Round 2 secara terurut.
4. **All-3-Same-Lane Auto-Advance:** Ketika 3 tiket dari pembalap yang sama mengisi satu heat Round 2, status match otomatis menjadi `completed` dengan `is_auto_advanced = 1`, dan pembalap lolos ke round berikutnya.
5. **Undo/Void Rollback:** Pembatalan tiket mengembalikan kuota kupon fisik dan mengosongkan kembali slot bracket match terkait.
6. **DNF/Klontang Zero-Ticket Guarantee:** Deklarasi All CO atau status DNF tidak menerbitkan tiket apa pun, kupon tetap hangus.
7. **Lock Qualifying Stage:** Saat kualifikasi dikunci, upaya penerbitan tiket baru ditolak dengan error 400.

## Potential Pitfalls & Mitigation Strategies

1. **Race Condition pada Penomoran Tiket Sequential:**
   - *Risk:* Dua heat finish bersamaan dan keduanya membaca MAX(ticket_number) yang sama sehingga terjadi konflik PRIMARY KEY / UNIQUE.
   - *Mitigation:* Gunakan `db.transaction(() => { ... })()` SQLite yang mengeksekusi operasi read-and-write penomoran tiket dan slot assignment secara eksklusif dan serial.
2. **Kupon Dibatalkan tapi Bracket Tetap Terisi:**
   - *Risk:* Petugas melakukan Undo di `/marshal` sehingga kuota kupon kembali, tapi mobil pembalap masih ada di bagan Babak 2.
   - *Mitigation:* `TicketEngine.voidTicket()` wajib mengosongkan slot (`ticket_id_X = NULL`, `user_id_X = NULL`) di `bracket_matches` dalam transaksi atomic yang sama.
3. **Nama Pembalap Multi-Tiket Membingungkan:**
   - *Risk:* Jika hanya ditulis "Budi" di ketiga jalur, penonton dan juri tidak tahu mobil mana yang sedang turun.
   - *Mitigation:* Format display `Nama Pembalap #X` (contoh `Budi #1`, `Budi #2`) dikirim langsung dari backend dan dirender konsisten di kartu match bracket dan TV HUD.
