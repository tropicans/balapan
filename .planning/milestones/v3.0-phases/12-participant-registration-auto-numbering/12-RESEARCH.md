# Phase 12: Participant Registration & Auto-Numbering - Research & Architecture

**Phase Goal:** Kasir dapat mendaftarkan peserta (nama, tim) tanpa kupon/serial/saldo dan aplikasi otomatis memberi nomor peserta unik berurutan per event aktif.
**Requirements:** PARN-01, PARN-02, PARN-03, PARN-04, PARN-05, EVNT-03
**Status:** Research Complete

---

## 1. Executive Summary

Phase 12 menandai peralihan operasional kasir dari model v2.0 (aktivasi buku kupon fisik 50-kotak ber-barcode/serial number digital) ke model turnamen v3.0 (registrasi peserta fisik murni dengan auto-numbering). 

Pada sistem baru ini:
1. Peserta cukup menyetor nama pembalap dan nama tim (opsional).
2. Sistem otomatis mengalokasikan nomor peserta unik berurutan (`participant_number` integer: `#1`, `#2`, `#3`, dst.) yang terikat ke event aktif saat itu.
3. Saat event berganti atau dibuat baru, nomor peserta otomatis reset mulai dari 1 kembali (EVNT-03).
4. Layar kasir menampilkan modal angka raksasa kontras tinggi (`#42`) agar panitia dapat membaca sekilas dan langsung menulis nomor tersebut ke kupon kertas fisik peserta.
5. Kasir dapat bekerja super cepat tanpa mouse menggunakan keyboard flow (Enter mendaftar → modal muncul → Enter/Esc menutup modal → kursor auto-fokus ke input nama berikutnya).
6. Peserta dengan nama yang sama (multi-entry / beli banyak mobil) diizinkan langsung dan diberi nomor baru berurutan tanpa error.
7. Kasir/panitia dapat mencari peserta via omni-search tunggal (ketik nomor `#42` atau nama pembalap/tim) dengan debounce 200ms.
8. Typo pada nama atau tim dapat diperbaiki tanpa mengubah nomor peserta yang sudah dicatat di kupon fisik.
9. Roster CSV dapat di-import baik melalui Web UI kasir (dengan modal preview baris valid dan dilewati) maupun melalui terminal CLI `scripts/import-roster.js`.

---

## 2. User Constraints (Locked Decisions)

Berikut adalah salinan persis keputusan teknis terkunci dari [12-CONTEXT.md](file:///c:/Users/yudhiar/Downloads/oprek/Dev/balapan/.planning/phases/12-participant-registration-auto-numbering/12-CONTEXT.md):

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

---

## 3. Architecture & Integration Points

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           CASHIER DASHBOARD (v3.0)                        │
│                                                                           │
│  [Header Banner]                                                          │
│  Event: "STC Vol 8" [ACTIVE]  |  Total: 42  |  Last No: #42  | [Import CSV] │
├───────────────────────────────────────────────────────────────────────────┤
│ [Tab 1: Registrasi Peserta (v3.0) ★]  [Tab 2: Paket Kupon]  [Tab 3: TopUp] │
├──────────────────────────────────────┬────────────────────────────────────┤
│ Form Registrasi                      │ Tabel Peserta + Omni-Search        │
│ - Nama Pembalap * (Auto-focus)       │ [🔍 Cari #nomor atau nama/tim... ] │
│ - Nama Tim (Opsional)                │ #1  Andi Pratama  [RRT]  [Edit]    │
│ [ DAFTARKAN PESERTA (ENTER) ]        │ #2  Budi Santoso  [GTR]  [Edit]    │
│                                      │ #3  Budi Santoso  [GTR]  [Edit]    │
└──────────────────────────────────────┴────────────────────────────────────┘
                   │                                         ▲
        POST /api/participants                      GET /api/participants
                   │                                         │
                   ▼                                         │
┌───────────────────────────────────────────────────────────────────────────┐
│                             BACKEND EXPRESS                               │
│                                                                           │
│  participantService.js (Domain Layer)                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ registerParticipant():                                              │  │
│  │ 1. getActiveEventId() -> throws if no active event                  │  │
│  │ 2. db.transaction(() => {                                           │  │
│  │      MAX(participant_number) WHERE event_id = ?                     │  │
│  │      INSERT INTO users (event_id, participant_number, email=null)   │  │
│  │    })                                                               │  │
│  │ 3. io.emit('participant_registered', participant)                   │  │
│  │ 4. broadcastFullState()                                             │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  SqliteWrapper (server/db.js)                                             │
│  - Composite Unique Index: idx_users_event_participant_number             │
│  - Reentrant atomic transactions                                          │
└───────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Database Schema & Indexing

Di Phase 11, kolom dan indeks berikut telah dibuat via `server/migrations.js` (Migration 1):
```sql
ALTER TABLE users ADD COLUMN event_id TEXT;
ALTER TABLE users ADD COLUMN participant_number INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_event_participant_number ON users(event_id, participant_number);
```

Karakteristik penting:
1. **Uniqueness:** Kolom `(event_id, participant_number)` unik secara komposit. Ini memungkinkan nomor reset dari 1 pada event baru (EVNT-03) tanpa bentrok dengan nomor di event lama.
2. **Email Nullability:** Tabel `users` memiliki kolom `email TEXT UNIQUE`. SQLite mengizinkan banyak baris dengan nilai `NULL` pada kolom bertipe `UNIQUE`. Karena registrasi v3.0 tidak mewajibkan email, kita menetapkan `email = NULL`. Hal ini otomatis mengizinkan multi-entry pembalap bernama sama (D-04) tanpa memicu `UNIQUE constraint failed: users.email`.
3. **Penyimpanan Angka Integer:** `participant_number` disimpan sebagai `INTEGER` murni (`1`, `2`, `42`), bukan string berpadded zero. Format visual `#42` hanya ditambahkan di UI layer.

### 3.2 Backend Service Layer: `server/services/participantService.js`

Mengikuti preseden arsitektur dari [server/services/eventService.js](file:///c:/Users/yudhiar/Downloads/oprek/Dev/balapan/server/services/eventService.js), seluruh logika domain peserta dipusatkan di `server/services/participantService.js`:

1. `registerParticipant({ name, team_name, event_id })`:
   - Validasi nama (wajib diisi, non-empty string setelah trim, maks 100 karakter).
   - Sanitasi tim (trim, maks 50 karakter; jika kosong jadikan `null`).
   - Resolusi `event_id`: jika tidak dioper, gunakan `getActiveEventId()`. Jika tidak ada event aktif, throw error `"Tidak ada event aktif. Aktifkan atau buat event terlebih dahulu di Manajemen Event"`.
   - Eksekusi atomik dalam `db.transaction(() => ...)`:
     - `SELECT COALESCE(MAX(participant_number), 0) AS max_num FROM users WHERE event_id = ?`
     - `const nextNum = max_num + 1;`
     - `INSERT INTO users (id, name, email, google_sub_id, team_name, role, is_virtual, event_id, participant_number)`
       dengan `id = uuidv4()`, `email = null`, `role = 'participant'`.
     - `SELECT * FROM users WHERE id = ?`
   - Mengembalikan data peserta lengkap.

2. `getParticipants({ event_id, search, limit = 200, offset = 0 })`:
   - Resolusi `event_id` ke active event jika tidak diberikan.
   - Filter `role = 'participant'`.
   - Penanganan omni-search:
     - Jika input numeric (mis. `42` atau `#42`), cari `participant_number = ?` ATAU `name LIKE ?` ATAU `team_name LIKE ?`.
     - Jika input teks, cari `name LIKE ?` ATAU `team_name LIKE ?`.
   - Mengembalikan `{ participants, total, latest_number, active_event }`.

3. `updateParticipant(id, { name, team_name })`:
   - Validasi nama pembalap tidak boleh kosong.
   - Melindungi integritas data: `participant_number` dan `event_id` **tidak dapat diubah**.
   - `UPDATE users SET name = ?, team_name = ? WHERE id = ?`.
   - Mengembalikan data peserta terbaru.

4. `importParticipants(participantsList, { event_id })`:
   - Menerima array `[{ name, team_name }, ...]`.
   - Mengambil event aktif.
   - Dalam satu `db.transaction()`:
     - Mencari `MAX(participant_number)` terakhir dari event.
     - Melakukan iterasi berurutan: `nextNum = currentMax + index + 1`.
     - Melakukan batch insert ke tabel `users`.
   - Mengembalikan `{ count: number, participants: Array }`.

5. `parseParticipantCsv(csvString)`:
   - Helper modular untuk parsing CSV string dengan toleransi newline `\r\n` / `\n` dan quote wrapping.
   - Mendeteksi format fleksibel:
     - **Format Standar:** Baris header memiliki kata kunci `name` atau `nama` (dan opsional `team` atau `tim`).
     - **Format STC Vol 8:** Baris data dengan kolom status (`Lunas` / comp) dan kolom nama pembalap di kolom ke-1.
     - **Format Plain / Fallback:** Baris tanpa header, kolom 0 = nama, kolom 1 = tim.
   - Mengembalikan `{ valid: [{ name, team_name }], skipped: [{ row, reason }] }`.

### 3.3 REST API Endpoints

| Method | Path | Deskripsi | Status Code |
|---|---|---|---|
| `POST` | `/api/participants` | Mendaftarkan peserta baru dengan penomoran otomatis | 201 Created / 400 Bad Request |
| `GET` | `/api/participants` | Mengambil daftar peserta terdaftar di event aktif (+ omni-search) | 200 OK |
| `PUT` | `/api/participants/:id` | Mengedit nama pembalap & nama tim (memperbaiki typo) | 200 OK / 400 / 404 |
| `POST` | `/api/participants/import-preview` | Preview parsing data CSV (menghitung valid & dilewati) | 200 OK / 400 |
| `POST` | `/api/participants/import` | Eksekusi batch import peserta ke event aktif | 201 Created / 400 |

### 3.4 WebSocket Broadcasts

Saat terjadi mutasi data peserta, server memancarkan event berikut via `io.emit`:
- `participant_registered`: `{ participant }`
- `participant_updated`: `{ participant }`
- `participants_imported`: `{ count, event_id }`
- `STATE_UPDATE`: Snapshot global `RaceManager.getFullState()` untuk memperbarui layar lain.

### 3.5 Frontend Component Architecture

Struktur sub-komponen modular di `client/src/components/cashier/`:
1. `ParticipantRegistrationTab.jsx`: Tab utama v3.0, menyatukan form dan list.
2. `ParticipantForm.jsx`: Form registrasi peserta dengan input Nama Pembalap (autofocus ref) dan Tim.
3. `ParticipantNumberModal.jsx`: Modal pop-up raksasa kontras tinggi (`#42`), mendukung keyboard shortcut (Enter/Esc) untuk tutup dan auto-focus kembali ke form input Nama.
4. `ParticipantList.jsx`: Tabel peserta dengan kolom `#`, Nama, Tim, Waktu Daftar, tombol Edit, dan search bar omni-search (debounce 200ms).
5. `ParticipantEditModal.jsx`: Modal edit typo nama/tim dengan nomor terkunci (disabled/read-only).
6. `ParticipantImportModal.jsx`: Modal upload CSV dengan tab Drag & Drop/Pilih File, visualisasi preview data valid vs dilewati, dan tombol konfirmasi eksekusi.

---

## 4. Standard Stack & Reusable Assets

### 4.1 Reusable Backend Assets

1. **`server/utils/participantNumber.js`:**
   - Telah dibuat di Phase 11.
   - Berisi `normalizeParticipantNumber(input)`: mentrim, memvalidasi numeric-only, dan mengubah ke integer > 0 (membuang leading zero: `"007"` -> `7`).
2. **`server/services/eventService.js`:**
   - Menyediakan `getActiveEvent()` dan `getActiveEventId()`.
   - Mengambil event aktif saat ini untuk relasi peserta.
3. **`server/db.js` (SqliteWrapper):**
   - Menggunakan `db.transaction(fn)` yang reentrant untuk membungkus `MAX(participant_number) + 1` dan `INSERT` dalam satu blok atomik.
4. **`server/raceManager.js`:**
   - `broadcastFullState()` untuk sinkronisasi state ke seluruh klien.

### 4.2 Reusable Frontend Assets

1. **`CyberCard.jsx` & `CyberButton.jsx` (`client/src/components/ui/`):**
   - Komponen visual tema cyberpunk dengan border terpotong (`clip-cyber`) dan varian warna (`amber`, `cyan`, `green`, `pink`).
2. **`client/src/utils/audio.js`:**
   - `sound.playTone(...)` untuk efek audio klik atau pendaftaran sukses.
3. **`client/src/context/RaceContext.jsx`:**
   - Mengakses `socket` dan `raceState.activeEvent`.

---

## 5. Don't Hand-Roll

1. **Jangan hand-roll locking concurrency manual:**
   Node.js menjalankan event-loop single-threaded. Eksekusi `db.transaction(() => { ... })` pada WASM SQLite berjalan sinkron dari `BEGIN` hingga `COMMIT`/`save()`. Tidak ada callback asinkron yang dapat menyusup di antara `SELECT MAX(...)` dan `INSERT INTO users`. Didukung dengan database constraint `UNIQUE(event_id, participant_number)`, sistem terjamin 100% bebas race condition.
2. **Jangan hand-roll zero-padding string manipulation:**
   Nomor peserta adalah integer murni. Tampilan nomor cukup diformat via template literal `#{participant.participant_number}` (D-02).
3. **Jangan install library CSV parser eksternal:**
   Parser CSV bawaan yang ada di `scripts/import-roster.js` sudah mampu menangani RFC4180 parsing (tanda kutip, koma di dalam teks, baris baru). Kita cukup mengekstraksinya ke modul utilitas bersama `server/utils/csvParser.js` tanpa menambah beban dependency `npm`.

---

## 6. Common Pitfalls & Edge Cases

| Pitfall / Edge Case | Dampak | Pencegahan Terbukti |
|---|---|---|
| **Query `MAX(participant_number)` tanpa `WHERE event_id = ?`** | Nomor peserta tidak reset dari 1 saat event baru dibuat (melanggar EVNT-03). | Query penomoran **wajib** mencantumkan klausul `WHERE event_id = ?`. |
| **Tidak ada event aktif saat registrasi** | Peserta tersimpan tanpa `event_id` (NULL) atau gagal relasi. | Validasi ketat di `participantService`: jika `getActiveEventId()` null, segera kembalikan HTTP 400 dengan pesan ramah bahasa Indonesia. |
| **Email uniqueness collision pada multi-entry** | Pembalap yang mendaftar lebih dari satu kali gagal di-insert karena `email TEXT UNIQUE`. | Untuk peserta v3.0, kolom `email` diisi `NULL`. SQLite memperbolehkan banyak baris bernilai `NULL` pada kolom `UNIQUE`. |
| **Perubahan nomor peserta saat edit typo** | Panitia sudah mencoret/menulis nomor di kupon fisik; jika nomor berubah di sistem, kupon menjadi tidak valid. | Endpoint `PUT /api/participants/:id` hanya memperbarui kolom `name` dan `team_name`. Kolom `participant_number` diproteksi dan diabaikan dari payload update. |
| **Kehilangan fokus keyboard setelah modal konfirmasi ditutup** | Kasir harus meraih mouse untuk klik form nama lagi, memperlambat antrean. | Event listener `onClose` modal memanggil `nameInputRef.current?.focus()` via `setTimeout(..., 50)` untuk memastikan elemen DOM siap menerima fokus (D-03). |
| **Header CSV tidak seragam** | File CSV dari panitia memiliki header `nama,tim` atau `name,team` atau bahkan tanpa header. | Fungsi `parseParticipantCsv` melakukan normalisasi lowercase dan pencocokan alias (`nama`/`name`/`pembalap`/`racer`, `tim`/`team`/`klub`/`tag`). |
| **File CSV STC Vol 8 memiliki baris 'Total' dan baris kosong** | Baris non-peserta ikut terdaftar sebagai peserta. | Logika filter mengabaikan baris yang diawali kata `Total` atau baris yang nama pembalapnya kosong. |

---

## 7. Code Skeletons & Implementation Details

### 7.1 CSV Parser Utility: `server/utils/csvParser.js`

```javascript
/**
 * RFC4180-compliant CSV string tokenizer without external dependencies.
 * @param {string} text 
 * @returns {Array<Array<string>>}
 */
export function tokenizeCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      // Ignore carriage return
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Flexible participant CSV parser supporting:
 * 1. Standard format (headers: name/nama, team/tim)
 * 2. STC Vol 8 roster format (section-based with status Lunas/comp)
 * 3. Headerless format (col 0 = name, col 1 = team)
 *
 * @param {string} csvText 
 * @returns {{ valid: Array<{ name: string, team_name: string|null }>, skipped: Array<{ row: number, reason: string }> }}
 */
export function parseParticipantCsv(csvText) {
  const rows = tokenizeCsv(csvText);
  const valid = [];
  const skipped = [];

  if (!rows || rows.length === 0) {
    return { valid, skipped };
  }

  // Detect header in first 5 rows
  let headerIndex = -1;
  let nameColIdx = -1;
  let teamColIdx = -1;
  let isStcFormat = false;

  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const row = rows[r].map(c => (c || '').trim().toLowerCase());
    
    // Check STC Vol 8 format
    if (row.some(c => c.includes('nama racer') || c.includes('kupon sales'))) {
      isStcFormat = true;
      headerIndex = r;
      break;
    }

    // Check standard format
    const nIdx = row.findIndex(c => ['name', 'nama', 'pembalap', 'racer'].includes(c));
    if (nIdx !== -1) {
      headerIndex = r;
      nameColIdx = nIdx;
      teamColIdx = row.findIndex(c => ['team', 'tim', 'klub', 'club', 'tag'].includes(c));
      break;
    }
  }

  if (isStcFormat) {
    // Parser STC Vol 8
    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r].map(c => (c || '').trim());
      const c0 = cells[0] || '';
      const c1 = cells[1] || '';
      const status = cells[4] || '';

      if (!c0 || /^total/i.test(c0) || /kupon sales/i.test(c0) || /nama racer/i.test(c1)) {
        continue;
      }
      // Check if row is a section header (e.g. "Presale (40 Runs)")
      if (/presale|ots|top up/i.test(c0)) continue;

      const isPaid = /lunas/i.test(status) && !/belum/i.test(status);
      const isComp = !status && cells[2] === '' && /rp0/i.test(cells[3] || '');

      if (!c1) {
        skipped.push({ row: r + 1, reason: 'Nama pembalap kosong' });
        continue;
      }

      if (isPaid || isComp) {
        valid.push({ name: c1, team_name: null });
      } else {
        skipped.push({ row: r + 1, reason: `Status belum lunas (${status || 'Belum Lunas'})` });
      }
    }
  } else if (headerIndex !== -1) {
    // Standard format with header
    for (let r = headerIndex + 1; r < rows.length; r++) {
      const cells = rows[r];
      const name = (cells[nameColIdx] || '').trim();
      const team = teamColIdx !== -1 ? (cells[teamColIdx] || '').trim() : null;

      if (!name) {
        if (cells.some(c => (c || '').trim().length > 0)) {
          skipped.push({ row: r + 1, reason: 'Kolom nama kosong' });
        }
        continue;
      }

      valid.push({ name, team_name: team || null });
    }
  } else {
    // Fallback: headerless (col 0 = name, col 1 = team)
    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r];
      const name = (cells[0] || '').trim();
      const team = cells[1] ? cells[1].trim() : null;

      if (!name) continue;
      valid.push({ name, team_name: team || null });
    }
  }

  return { valid, skipped };
}
```

### 7.2 Domain Service: `server/services/participantService.js`

```javascript
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { getActiveEvent, getActiveEventId } from './eventService.js';
import { normalizeParticipantNumber } from '../utils/participantNumber.js';
import { parseParticipantCsv } from '../utils/csvParser.js';

export function registerParticipant({ name, team_name, event_id }) {
  const trimmedName = String(name ?? '').trim();
  if (!trimmedName) {
    throw new Error('Nama peserta wajib diisi');
  }
  if (trimmedName.length > 100) {
    throw new Error('Nama peserta maksimal 100 karakter');
  }

  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) {
    throw new Error('Tidak ada event aktif. Aktifkan atau buat event terlebih dahulu di Manajemen Event.');
  }

  const trimmedTeam = team_name != null ? String(team_name).trim() : null;
  const finalTeam = trimmedTeam ? trimmedTeam.substring(0, 50) : null;
  const newId = uuidv4();

  return db.transaction(() => {
    // D-05, EVNT-03: Sequentially allocate MAX + 1 scoped to active event
    const row = db.prepare(`
      SELECT COALESCE(MAX(participant_number), 0) AS max_num 
      FROM users 
      WHERE event_id = ?
    `).get(targetEventId);

    const nextNum = (row?.max_num || 0) + 1;

    db.prepare(`
      INSERT INTO users (
        id, name, email, google_sub_id, team_name, role, is_virtual, event_id, participant_number
      ) VALUES (?, ?, NULL, NULL, ?, 'participant', 0, ?, ?)
    `).run(newId, trimmedName, finalTeam, targetEventId, nextNum);

    return db.prepare('SELECT id, name, team_name, role, event_id, participant_number, created_at FROM users WHERE id = ?').get(newId);
  })();
}

export function getParticipants({ event_id, search, limit = 200, offset = 0 } = {}) {
  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) {
    return {
      active_event: null,
      total: 0,
      latest_number: 0,
      participants: []
    };
  }

  const activeEvent = getActiveEvent();

  // Aggregate stats
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total, 
      COALESCE(MAX(participant_number), 0) as latest_number 
    FROM users 
    WHERE event_id = ? AND role = 'participant'
  `).get(targetEventId);

  let query = `
    SELECT id, name, team_name, role, event_id, participant_number, created_at 
    FROM users 
    WHERE event_id = ? AND role = 'participant'
  `;
  const params = [targetEventId];

  if (search && search.trim()) {
    const q = search.trim();
    const num = normalizeParticipantNumber(q.replace(/^#/, ''));

    if (num !== null) {
      query += ` AND (participant_number = ? OR name LIKE ? OR team_name LIKE ?)`;
      params.push(num, `%${q}%`, `%${q}%`);
    } else {
      query += ` AND (name LIKE ? OR team_name LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }
  }

  query += ` ORDER BY participant_number DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const participants = db.prepare(query).all(...params);

  return {
    active_event: activeEvent,
    total: stats?.total || 0,
    latest_number: stats?.latest_number || 0,
    participants
  };
}

export function updateParticipant(id, { name, team_name }) {
  const trimmedName = String(name ?? '').trim();
  if (!trimmedName) {
    throw new Error('Nama peserta wajib diisi');
  }

  const trimmedTeam = team_name != null ? String(team_name).trim() : null;
  const finalTeam = trimmedTeam ? trimmedTeam.substring(0, 50) : null;

  return db.transaction(() => {
    const existing = db.prepare('SELECT id, participant_number, event_id FROM users WHERE id = ?').get(id);
    if (!existing) {
      throw new Error('Peserta tidak ditemukan');
    }

    db.prepare(`
      UPDATE users 
      SET name = ?, team_name = ? 
      WHERE id = ?
    `).run(trimmedName, finalTeam, id);

    return db.prepare('SELECT id, name, team_name, role, event_id, participant_number, created_at FROM users WHERE id = ?').get(id);
  })();
}

export function importParticipants(participantsList, { event_id } = {}) {
  if (!Array.isArray(participantsList) || participantsList.length === 0) {
    throw new Error('Daftar peserta untuk di-import kosong');
  }

  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) {
    throw new Error('Tidak ada event aktif. Aktifkan atau buat event terlebih dahulu di Manajemen Event.');
  }

  return db.transaction(() => {
    const row = db.prepare(`
      SELECT COALESCE(MAX(participant_number), 0) AS max_num 
      FROM users 
      WHERE event_id = ?
    `).get(targetEventId);

    let nextNum = (row?.max_num || 0) + 1;
    const imported = [];

    const insertStmt = db.prepare(`
      INSERT INTO users (
        id, name, email, google_sub_id, team_name, role, is_virtual, event_id, participant_number
      ) VALUES (?, ?, NULL, NULL, ?, 'participant', 0, ?, ?)
    `);

    for (const item of participantsList) {
      const name = String(item.name || '').trim();
      if (!name) continue;
      const team = item.team_name ? String(item.team_name).trim().substring(0, 50) : null;
      const uId = uuidv4();

      insertStmt.run(uId, name, team, targetEventId, nextNum);
      imported.push({ id: uId, name, team_name: team, participant_number: nextNum, event_id: targetEventId });
      nextNum++;
    }

    return { count: imported.length, imported };
  })();
}
```

### 7.3 Modal Konfirmasi Nomor Raksasa (D-01, D-02, D-03)

```jsx
import React, { useEffect, useRef } from 'react';
import { CyberButton } from '../ui/CyberButton.jsx';
import { CheckCircle2, Hash, Sparkles } from 'lucide-react';

export function ParticipantNumberModal({ participant, onClose }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    buttonRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!participant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-obsidian border-2 border-neonCyan p-6 md:p-8 clip-cyber shadow-[0_0_50px_rgba(0,240,255,0.3)] text-center space-y-5">
        <div className="flex items-center justify-center gap-2 text-xs font-orbitron font-bold text-neonCyan tracking-widest uppercase">
          <CheckCircle2 className="w-4 h-4 text-neonGreen" />
          <span>REGISTRASI BERHASIL // TERCATAT</span>
        </div>

        {/* D-01, D-02: Giant Number Format '#42' */}
        <div className="py-2">
          <div className="text-xs font-mono text-gray-400 mb-1">NOMOR PESERTA KUPON:</div>
          <div className="text-7xl md:text-8xl font-black font-orbitron text-neonCyan tracking-wider drop-shadow-[0_0_20px_rgba(0,240,255,0.6)]">
            #{participant.participant_number}
          </div>
        </div>

        <div className="border-t border-b border-gray-800 py-3 space-y-1">
          <div className="text-xl md:text-2xl font-orbitron font-black text-white uppercase truncate">
            {participant.name}
          </div>
          <div className="text-xs font-mono text-neonPink">
            TIM: {participant.team_name || '-'}
          </div>
        </div>

        <p className="text-xs font-mono text-gray-400">
          Tulis nomor ini pada lembar kupon fisik peserta.
        </p>

        {/* D-03: Close & Auto-focus back to Name input */}
        <CyberButton
          ref={buttonRef}
          variant="cyan"
          size="lg"
          className="w-full justify-center"
          onClick={onClose}
        >
          SELESAI / LANJUT DAFTAR (ENTER)
        </CyberButton>
      </div>
    </div>
  );
}
```

---

## 8. Validation Architecture

Berikut rancangan pengujian otomatis dan skenario edge case yang akan diimplementasikan pada file test `server/tests/participant-registration.test.js`:

### 8.1 Automated Test Matrix

| ID | Test Case | Scope & Requirement | Expected Assertion |
|---|---|---|---|
| **T-PARN-01** | Single participant registration without coupons | PARN-01 | Response 201, user record created in `users` with `role = 'participant'`, `coupon_balance = 0`, `email = NULL`. |
| **T-PARN-02** | Sequential auto-numbering allocation (#1, #2, #3) | PARN-02 | Consecutive registrations within the same event receive contiguous ascending `participant_number`s (1, 2, 3). |
| **T-EVNT-03** | Auto-numbering resets to #1 on new active event | EVNT-03 | Creating & activating a new event resets next `participant_number` to 1. Both events maintain their own numbering without collision. |
| **T-PARN-03A** | Omni-search by exact number (#42 or 42) | PARN-03, D-06 | Querying `GET /api/participants?search=42` and `?search=#42` returns participant with `participant_number = 42`. |
| **T-PARN-03B** | Omni-search by name substring or team tag | PARN-03, D-06 | Querying `GET /api/participants?search=budi` returns all Budis. Querying `?search=GTR` returns all racers in team GTR. |
| **T-PARN-04** | Multi-entry allowed with identical name | D-04 | Registering `Andi Pratama` twice succeeds without unique constraint errors, allocating two different sequential numbers (e.g. #1 and #2). |
| **T-PARN-05** | Optional team name defaults to NULL | D-05 | Registering with empty `team_name` stores `NULL` in database and outputs `null` in API response. |
| **T-PARN-06** | Typo edit updates name/team only | D-12 | `PUT /api/participants/:id` updates `name` from `Budi` to `Budi S.` while `participant_number` and `event_id` remain strictly unchanged. |
| **T-PARN-07** | CSV import preview and execution | PARN-05, D-07, D-08, D-09 | CSV preview reports valid & skipped count. Batch execution inserts rows contiguously continuing from last allocated number. |
| **T-PARN-08** | CSV compatibility with STC Vol 8 roster | D-08 | Passing `data/stc-vol8-roster.csv` parses valid Lunas/Comp racers and skips empty/Belum Lunas rows. |
| **T-PARN-09** | Rejection when no active event exists | EVNT-03 | Attempting registration with no active event returns 400 Bad Request with Indonesian error message. |
| **T-PARN-10** | CLI script `scripts/import-roster.js` execution | D-07 | Running `node scripts/import-roster.js --csv ...` allocates numbers into active event without errors. |

### 8.2 Verification Commands

```powershell
# Jalankan test suite baru untuk Participant Registration & Auto-Numbering
$env:PATH = "C:\Users\yudhiar\AppData\Local\nvm\v22.22.3;" + $env:PATH
node server/tests/participant-registration.test.js

# Jalankan keseluruhan test suite aplikasi (memastikan no regression)
npm test

# Verifikasi client Vite build
npm --prefix client run build
```

---

## 9. Next Steps for Planning

Rencana implementasi Phase 12 dapat dibagi menjadi 2 Plan yang berurutan dan terisolasi:

1. **Plan 12-01 (Backend Service, REST APIs, CSV Parser, CLI Script & Test Suite):**
   - Buat `server/utils/csvParser.js`.
   - Buat `server/services/participantService.js`.
   - Tambahkan REST endpoints di `server/index.js` (`/api/participants`, `/api/participants/import-preview`, `/api/participants/import`, `/api/participants/:id`).
   - Perbarui skrip terminal `scripts/import-roster.js` untuk v3.0 auto-numbering ke active event.
   - Buat file pengujian otomatis menyeluruh `server/tests/participant-registration.test.js`.
   - Daftarkan test baru ke script `test` di `package.json`.

2. **Plan 12-02 (Cashier UI Sub-components, Tab Navigation, Modals & Live Feed):**
   - Buat `client/src/components/cashier/ParticipantRegistrationTab.jsx`.
   - Buat `client/src/components/cashier/ParticipantForm.jsx` (dengan auto-focus handling).
   - Buat `client/src/components/cashier/ParticipantNumberModal.jsx` (modal kontras tinggi #42).
   - Buat `client/src/components/cashier/ParticipantEditModal.jsx` (edit typo inline/modal).
   - Buat `client/src/components/cashier/ParticipantImportModal.jsx` (upload CSV + preview valid/skipped).
   - Perbarui `client/src/screens/CashierDashboard.jsx`:
     - Set Tab 1 (Default): "Registrasi Peserta (v3.0)".
     - Update Header: Indikator Event Aktif + badge, Total Peserta, Nomor Terakhir `#N`, tombol aksi Import CSV & Refresh.
     - Pertahankan Tab 2 (Paket Kupon v2.0) & Tab 3 (Top Up Saldo Digital) sebagai tab sekunder.
   - Verifikasi build client (`npm --prefix client run build`).

---

## RESEARCH COMPLETE
