# Phase 08: Marshal Start Box Rapid Line-Up & Coupon Check-off Dashboard - Research

**Researched:** 2026-09-04  
**Domain:** Mini 4WD Track Operations, Finish Scrutineer Rapid Recording, Web Audio Synthesis, Real-time WebSocket HUD  
**Confidence:** HIGH  

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Realitas Operasional Garis Start & Fisik Kupon
- **D-01:** Petugas di garis start (Start Box Marshal) tidak memegang perangkat digital apa pun. Pelepasan 3 mobil (Jalur A, B, C) dilakukan murni secara mekanis menggunakan tuas start penahan mobil yang digerakkan tangan.
- **D-02:** Pembalap mengantre mandiri secara fisik di depan box start pada jalur yang diinginkan (A, B, atau C) dengan membawa mobil dan lembaran kupon fisik pre-printed. Pencoretan kotak kupon fisik (50 kotak) dilakukan secara manual di kertas oleh Marshal garis start menggunakan pulpen/spidol saat mobil diletakkan di start box.
- **D-03:** Mobil yang kalah atau klontang (Crash Out / CO) di Babak 1 tidak perlu dicatat apa pun ke sistem. Layar dasbor tidak perlu disentuh untuk heat yang semua mobilnya CO, sehingga ratusan heat kualifikasi dapat berjalan bertubi-tubi dalam hitungan detik tanpa hambatan digital.

#### Pencatatan Pemenang Babak 1 di Meja Finish (`/marshal`)
- **D-04:** Layar sentuh tablet di rute `/marshal` (`MarshalDashboard.jsx`) ditempatkan di Meja Finish / Scrutineer di samping lintasan.
- **D-05:** Saat mobil berhasil finish dan menang heat, pemenang membawa mobil dan lembar kuponnya ke meja finish. Juri Finish / Marshal memilih jalur kemenangan (Jalur A Pink, Jalur B Cyan, Jalur C Green) dan mengetik **Nomor Seri Kupon Fisik** (misal: `012` atau `CPN-001`) via on-screen numpad besar atau input keyboard.
- **D-06:** Sistem secara instan memverifikasi nomor seri tersebut ke tabel `coupon_packages` (yang telah didaftarkan kasir pada Phase 07), menampilkan nama pembalap dan nama tim secara mencolok, membunyikan audio chime sukses, mendebit 1 kuota pada paket kupon, dan mencatat pembalap sebagai pemenang heat yang berhak atas tiket Babak 2. — **Reversibility:** costly — pencatatan pemenang ini memicu integrasi tiket Babak 2 di Phase 09 dan auto-seeding bracket.
- **D-07:** Pengawasan fisik sisa kuota (50 kotak) tetap dikontrol secara visual oleh panitia pada lembaran kertas di tangan pembalap; sistem tidak memblokir kuota secara kaku di garis start kualifikasi agar tidak menghambat ritme kompetisi.

#### Sinkronisasi Real-Time & Handshake Race Director
- **D-08:** Begitu pemenang dicatat di `/marshal`, data langsung tersimpan via API dan disiarkan via WebSocket (`marshal:winner-recorded`, `race:finished`) ke Dasbor Race Director (`/race-director`) dan Layar TV Sirkuit (`/tv`) secara instan tanpa perlu persetujuan manual bertahap dari Race Director.
- **D-09:** Sediakan tombol "Batal / Koreksi Pemenang Terakhir" (Undo) di layar `/marshal` dengan batas waktu singkat (misal 60 detik) untuk mengantisipasi salah ketik nomor seri kupon oleh Juri Finish.
- **D-10:** Jika nomor seri kupon yang dimasukkan belum pernah didaftarkan di kasir, sistem menampilkan modal/banner alert merah tebal: "KUPON BELUM TERDAFTAR DI KASIR" dan menolak penerbitan pemenang hingga peserta mengaktifkan kuponnya di meja kasir.

#### Transisi & Eksekusi Babak 2 (Eliminasi Bracket)
- **D-11:** Di Babak 2, data pembalap sudah lengkap terisi otomatis di sistem dari pemenang-pemenang Babak 1 yang terdaftar di bracket (`bracket_matches`).
- **D-12:** Layar `/marshal` menyediakan toggle/tampilan mode Babak 2 yang otomatis menampilkan 3 nama pembalap yang dijadwalkan di Jalur A, B, dan C untuk match aktif. Juri/Marshal cukup melakukan 1-tap pada nama pembalap pemenang untuk meloloskannya ke putaran berikutnya di bagan bracket eliminasi.

### the agent's Discretion
- Skema warna kontras tinggi Cyberpunk untuk tablet lapangan: Jalur A Pink Neon (`#ff007f`), Jalur B Cyan Neon (`#00f0ff`), Jalur C Green Neon (`#00ff66`).
- Implementasi Web Audio API sintetis untuk efek suara konfirmasi menang (beep/chime frekuensi tinggi) tanpa aset audio eksternal.
- Komponen On-Screen Numpad sentuh berukuran tombol minimal 64px x 64px agar mudah ditekan jari tangan petugas di tablet.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed strictly within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MRSH-01 | Marshal memiliki antarmuka khusus Start Box (`/marshal`) yang dioptimalkan untuk tablet/smartphone dengan tombol sentuh besar. | Implementasi `client/src/screens/MarshalDashboard.jsx` dengan rute `/marshal`, navigasi di `Navbar.jsx`, dan styling Tailwind Cyberpunk dengan touch target >= 64px x 64px. |
| MRSH-02 | Marshal dapat memasukkan peserta ke Jalur A (Pink), Jalur B (Cyan), dan Jalur C (Green) dengan cepat melalui pencarian instan atau input nomor seri kupon. | Komponen Jalur Raksasa 3-Lane dengan on-screen numpad sentuh untuk serial lookup instan ke `coupon_packages`. |
| MRSH-03 | Dasbor menampilkan verifikasi nomor kupon pemenang dan debit 1 kuota secara atomic. | Endpoint `POST /api/marshal/record-winner` yang memvalidasi serial, mengecek sisa kuota, mendebit `coupon_packages` & `coupons` dalam transaksi SQLite, dan mencatat log pemenang dengan mekanisme rollback 60 detik (`POST /api/marshal/undo-last-winner`). |
| MRSH-04 | Status pemenang dan line-up otomatis tersinkronisasi secara real-time via WebSocket ke Dasbor Race Director (`/race-director`) dan Layar TV Sirkuit (`/tv`). | WebSocket broadcasting `io.emit('marshal:winner-recorded', ...)` dan `io.emit('STATE_UPDATE', ...)` saat pemenang Babak 1 atau Babak 2 dicatat. |
</phase_requirements>

## Summary

Phase 08 merealisasikan operasional praktis sirkuit Mini 4WD di Indonesia pada level meja juri finish / scrutineer. Mengingat petugas di garis start harus mengoperasikan tuas mekanis dengan kedua tangan dan mencoret 50 kotak kupon secara manual di kertas tanpa distraksi gadget, perangkat tablet digital difokuskan di **Meja Finish / Scrutineer (`/marshal`)**.

Di Meja Finish, alur operasional terbagi menjadi dua babak:
1. **Babak 1 (Kualifikasi Cepat):** Ratusan heat berjalan sangat cepat. Mobil yang klontang (Crash Out) atau kalah tidak memerlukan input data apa pun ke sistem (nol interaksi layar jika All CO). Ketika ada mobil yang finish dan menang, pemenang membawa mobil dan lembaran kupon ke meja finish. Juri finish memilih jalur kemenangan (Jalur A Pink, Jalur B Cyan, atau Jalur C Green) dan mengetikkan 2–4 digit nomor seri kupon fisik menggunakan On-Screen Numpad berukuran tombol sentuh besar. Sistem memvalidasi serial tersebut ke tabel `coupon_packages`, mendebit 1 kuota secara atomik, membunyikan Web Audio chime sukses, mencatat pembalap sebagai pemenang, dan menyiarkan hasil secara instan ke Dasbor Race Director dan TV. Juri memiliki tombol Undo 60 detik jika terjadi kesalahan ketik nomor seri.
2. **Babak 2 (Eliminasi Bracket):** Menampilkan pembalap terjadwal di 3 jalur (A, B, C) untuk match eliminasi yang sedang aktif. Juri finish hanya perlu melakukan 1-tap pada nama pembalap pemenang untuk memajukannya ke babak berikutnya di bagan eliminasi `bracket_matches`.

**Primary recommendation:** Buat tabel `marshal_winner_logs` untuk audit trail pencatatan pemenang dan dukungan operasi undo 60 detik di `server/db.js`, sediakan REST endpoints `/api/marshal/*` di `server/index.js` dengan integrasi WebSocket broadcasts, dan kembangkan `client/src/screens/MarshalDashboard.jsx` tablet-first HUD lengkap dengan Web Audio API synthesizer, On-Screen Numpad, dan dual-mode Babak 1 / Babak 2.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Validasi Kupon & Transaksi Debit Atomic | API Backend (`server/index.js`) | Database SQLite (`server/db.js`) | Menjamin integritas pemotongan kuota kupon (`used_quota + 1`, `remaining_quota - 1`) dan pencegahan debit pada kupon yang habis atau berstatus 'void'. |
| Audit Trail & Batas Waktu Undo 60 Detik | API Backend (`server/index.js`) | Database SQLite (`server/db.js`) | Tabel `marshal_winner_logs` mencatat timestamp dan status (`active`, `undone`), memvalidasi batas waktu pembatalan 60 detik di sisi server. |
| Auto-Seeding Bracket Babak 2 | Backend Engine (`server/raceManager.js`) | Database SQLite (`server/db.js`) | Menggunakan logic `RaceManager.seedIntoBracket(userId)` yang sudah ada untuk menempatkan pemenang Babak 1 ke slot terbuka Babak 2. |
| Eksekusi 1-Tap Pemenang Bracket Babak 2 | Backend Engine (`server/raceManager.js`) | Client UI (`MarshalDashboard.jsx`) | Memanggil `RaceManager.advanceBracketWinner(matchId, winnerId)` untuk hierarki bracket tree 3:1 secara mulus. |
| Real-Time Broadcast ke RD dan TV | WebSocket Engine (`io.emit`) | Client Subscribers (`RaceContext.jsx`, TV Screen) | Event `marshal:winner-recorded`, `marshal:winner-undone`, dan `STATE_UPDATE` disiarkan seketika. |
| On-Screen Numpad Sentuh & Lane Selector | Client UI (`MarshalDashboard.jsx`) | — | Tombol sentuh minimal 64px x 64px dan tombol jalur minimal 72px memudahkan pengoperasian satu tangan/jari di tablet tanpa keyboard fisik. |
| Efek Suara Konfirmasi Kemenangan | Web Audio API (Browser Client) | — | Menghasilkan nada audio sintetis (harmonic chime dual-tone) tanpa memerlukan file aset audio mp3 eksternal. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express | ^4.21.2 | Server HTTP REST API | [VERIFIED: package.json:24] Framework backend aktif project. |
| sql.js | ^1.14.2 | SQLite in WASM with disk persist | [VERIFIED: package.json:26] Database engine dengan atomic transactions `db.transaction()`. |
| React | ^18.3.1 | Komponen UI Dasbor Marshal | [VERIFIED: client/package.json:18] UI framework utama. |
| TailwindCSS | ^3.4.17 | Cyberpunk Styling & Responsive Grid | [VERIFIED: client/package.json:29] CSS utilities dengan palet `#0a0b10`, `#ff007f`, `#00f0ff`, `#00ff66`, `#ffaa00`. |
| Lucide React | ^1.16.0 | Ikon Antarmuka (Flag, CheckCircle2, RotateCcw, AlertTriangle, Trophy, Zap) | [VERIFIED: client/package.json:16] Ikon standar cyberpunk UI. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | ^11.0.5 | ID Generator | Membuat primary key unik untuk `marshal_winner_logs`. |
| socket.io / socket.io-client | ^4.8.1 | Real-time WebSocket synchronization | Menyiarkan pemenang heat dan perubahan state secara instan ke Dasbor Race Director dan TV. |

## Detailed Technical Patterns

### 1. Database Schema: `marshal_winner_logs`
Untuk mendukung pencatatan pemenang heat Babak 1 dan mekanisme pembatalan 60 detik (Undo), kita menambahkan tabel di `server/db.js`:
```sql
CREATE TABLE IF NOT EXISTS marshal_winner_logs (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  user_id TEXT NOT NULL,
  lane TEXT CHECK(lane IN ('A', 'B', 'C')) NOT NULL,
  heat_number INTEGER DEFAULT NULL,
  box_number INTEGER NOT NULL,
  status TEXT CHECK(status IN ('active', 'undone')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(package_id) REFERENCES coupon_packages(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_marshal_logs_created ON marshal_winner_logs(created_at);
```

### 2. Web Audio API Chime Synthesis
Untuk memenuhi kebutuhan audio konfirmasi tanpa dependensi file eksternal:
```javascript
export function playSuccessChime() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.00, audioCtx.currentTime + 0.15); // A5

    osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, audioCtx.currentTime + 0.15); // D6

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(audioCtx.currentTime + 0.5);
    osc2.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.warn('Web Audio not supported or blocked:', e);
  }
}
```

### 3. REST API Contracts
- `POST /api/marshal/record-winner`
  - Body: `{ serial_number: string, lane: 'A'|'B'|'C' }`
  - Response:
    ```json
    {
      "success": true,
      "data": {
        "log_id": "...",
        "serial_number": "012",
        "lane": "A",
        "user_id": "...",
        "user_name": "Budi Santoso",
        "team_name": "GARUDA SPEED",
        "box_number": 9,
        "remaining_quota": 41,
        "recorded_at": "2026-09-04T05:55:00Z"
      }
    }
    ```
- `POST /api/marshal/undo-last-winner`
  - Body: `{ log_id?: string }`
  - Response:
    ```json
    {
      "success": true,
      "message": "Pemenang heat berhasil dibatalkan dan kuota kupon dikembalikan",
      "data": {
        "log_id": "...",
        "serial_number": "012",
        "remaining_quota": 42
      }
    }
    ```
- `GET /api/marshal/active-bracket-match`
  - Response:
    ```json
    {
      "success": true,
      "data": {
        "match": {
          "id": "...",
          "match_number": 4,
          "round_number": 2,
          "user_1": { "id": "...", "name": "Andi", "team_name": "DRAGON" },
          "user_2": { "id": "...", "name": "Budi", "team_name": "GARUDA" },
          "user_3": null
        }
      }
    }
    ```
- `POST /api/marshal/record-bracket-winner`
  - Body: `{ match_id: string, winner_id: string }`
  - Response: `{ "success": true, "data": { ... } }`

## State of the Art

| Old Approach (v1.0 / Start Line Overhead) | Current Approach (v2.0 Phase 08) | When Changed | Impact |
|-------------------------------------------|-----------------------------------|--------------|--------|
| Form registrasi 3 pembalap di start box sebelum mobil dilepas | Start Box dilepas manual 100% mekanis; hanya mobil pemenang finish yang dicatat di Meja Finish `/marshal` | Phase 08 (v2.0) | Mengeliminasi bottleneck antrean di garis start; heat kualifikasi dapat berjalan bertubi-tubi tanpa jeda digital. |
| Mobil All Crash Out harus dicatat di tablet | Heat All CO diabaikan sistem tanpa sentuh layar sama sekali | Phase 08 (v2.0) | Menghemat ratusan transaksi dan input data yang tidak relevan selama kualifikasi. |
| Input nama pembalap secara manual | Input nomor seri kupon fisik pre-printed via on-screen numpad | Phase 08 (v2.0) | Verifikasi identitas pembalap dan tim tampil otomatis dalam 1 detik. |
| Bracket eliminasi diatur manual di meja Race Director | 1-Tap langsung dari tablet Marshal Meja Finish di Babak 2 | Phase 08 (v2.0) | Mengurangi beban Race Director dan mempercepat ritme pertandingan eliminasi. |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:assert` & custom async test runner |
| Config file | `package.json` (`"test"` script) |
| Quick run command | `node server/tests/marshal-flow.test.js` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MRSH-01 | UI Dasbor `/marshal` dapat diakses dan responsif pada build frontend | integration | `npm run build` | ❌ Wave 1 |
| MRSH-02 | Input jalur A/B/C dan serial kupon valid mengembalikan data pembalap | unit/integration | `node server/tests/marshal-flow.test.js` | ❌ Wave 0 |
| MRSH-03 | Debit kupon atomic, penolakan kupon invalid/habis, dan undo 60 detik | unit/integration | `node server/tests/marshal-flow.test.js` | ❌ Wave 0 |
| MRSH-04 | WebSocket broadcasting event `marshal:winner-recorded` dan sinkronisasi Babak 2 bracket | integration | `node server/tests/marshal-flow.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node server/tests/marshal-flow.test.js`
- **Per wave merge:** `npm test` && `npm run build`
- **Phase gate:** Full suite green sebelum `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `server/tests/marshal-flow.test.js` — Test suite untuk validasi skema tabel `marshal_winner_logs`, endpoint `record-winner`, validasi kupon tidak terdaftar, debit kuota, auto-seeding bracket, undo 60s, dan bracket match winner advance.

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | Sanitasi input parameter dan verifikasi status paket kupon (`active` vs `void`/`completed`). |
| V5 Input Validation | yes | Validasi enum `lane` ('A', 'B', 'C'), validasi serial number string non-empty, dan pencegahan parameter injection. |
| V11 Business Logic | yes | Enforce batas waktu undo maksimum 60 detik (server-side enforcement) agar juri tidak bisa membatalkan pemenang lama yang sudah diproses di bracket berikutnya. |

### Known Threat Patterns for Node.js / SQLite
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL Injection pada nomor seri kupon | Tampering | Parameterized queries `db.prepare(...).run(...)` |
| Double Undo / Replay Attack | Tampering | Pengecekan status log (`status = 'active'`) dalam transaksi atomic sebelum membalikkan kuota. |
| Negative Quota Exploitation | Tampering | Validasi `remaining_quota > 0` sebelum pemotongan kupon. |

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `server/db.js` (Database tables & wrapper)
- Codebase inspection: `server/raceManager.js` (Bracket seeding & advancement logic)
- Codebase inspection: `server/index.js` (Express REST routes & Socket.IO server)
- Codebase inspection: `server/tests/coupon-package.test.js` (Test structure & mock patterns)
- Contract: `.planning/phases/08-marshal-start-box-rapid-line-up-coupon-check-off-dashboard/08-CONTEXT.md`
- Contract: `.planning/phases/08-marshal-start-box-rapid-line-up-coupon-check-off-dashboard/08-UI-SPEC.md`
- Requirements: `.planning/REQUIREMENTS.md` (MRSH-01, MRSH-02, MRSH-03, MRSH-04)

## Metadata

**Confidence breakdown:**
- Architecture: HIGH — Skema relasional dan Socket.IO broadcasting sudah mapan di Phase 01–07
- Performance: HIGH — Numpad sentuh 64px x 64px dan Web Audio API bebas latensi
- Security: HIGH — Server-side 60s undo verification dan atomic transaction integrity

**Research date:** 2026-09-04  
**Valid until:** 2026-10-04  
