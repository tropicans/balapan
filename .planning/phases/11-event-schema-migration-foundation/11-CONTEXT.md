# Phase 11: Event & Schema Migration Foundation - Context

**Gathered:** 2026-09-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Fase ini membangun fondasi data yang aman dan terversi untuk milestone v3.0:
manajemen event (buat/pilih/arsip), pengikatan data ke event (`event_id`), kolom
identitas baru `participant_number` pada `users`, tabel `bto_records`, serta
mekanik migrasi yang aman (transaksi nyata, backup bertimestamp, `schema_version`,
gerbang env untuk langkah destruktif).

Fase ini **tidak** menghapus tabel kupon/race (itu Phase 17), **tidak** membangun
UI layar kerja (baru layar Manajemen Event), dan **tidak** mendaftarkan pemenang
(Phase 14). Basis data v2.0 harus tetap terbaca dan server tetap boot.

</domain>

<decisions>
## Implementation Decisions

### Model Scope Event
- **D-01:** Data diikat ke event via kolom `event_id` (FK) pada tabel `users`,
  `bracket_matches`, dan `bto_records`. Query memfilter `WHERE event_id = <event aktif>`.
- **D-02:** Entitas peserta tetap memakai tabel `users` yang ada + kolom `event_id`
  (bukan tabel `participants` baru).
- **D-03:** Hanya **satu event aktif** yang dikelola/ditampilkan pada satu waktu.
  Event lain tersimpan sebagai arsip (tidak dihapus).

### Format Nomor Peserta
- **D-04:** `participant_number` disimpan sebagai `INTEGER` polos (1, 2, 3) — bukan
  TEXT zero-padded; ditampilkan apa adanya.
- **D-05:** Alokasi nomor otomatis `MAX(participant_number) + 1` di dalam event aktif,
  dijalankan dalam transaksi.
- **D-06:** Normalisasi input nomor saat lookup (dipakai Panel Registrasi Phase 14):
  trim spasi + buang leading zero, sehingga `" 007 "` == `7`.
- **D-07:** Keunikan nomor adalah per-event: `UNIQUE(event_id, participant_number)` —
  nomor boleh sama pada event berbeda.

### Keamanan Migrasi
- **D-08:** Backup database otomatis ke `data/backups/tamiya-<YYYYMMDD-HHmmss>.sqlite`
  sebelum langkah destruktif. Folder `data/backups/` masuk `.gitignore`.
- **D-09:** Versi skema dilacak dengan tabel `schema_version` (kolom `version`, `applied_at`).
- **D-10:** Perbaiki `SqliteWrapper.transaction()` (`server/db.js`) agar benar-benar
  mengirim `BEGIN` / `COMMIT` / `ROLLBACK` — berlaku global untuk seluruh aplikasi,
  bukan helper terpisah. Catatan: `run()` saat ini selalu mengembalikan `{ changes: 1 }`.
- **D-11:** Langkah destruktif (drop/alter merusak) hanya berjalan bila env
  `ALLOW_DESTRUCTIVE_MIGRATION=true`; default aman (`false` = tahan).

### Siklus Hidup Event
- **D-12:** Field event: `nama`, `tanggal`, `status` (`active`/`archived`), `catatan`,
  `jumlah lap` (jumlah lap balapan, mis. 3).
- **D-13:** Saat boot pertama tanpa event, otomatis buat `Event 1` dan jadikan aktif.
- **D-14:** Event tidak bisa dihapus permanen; hanya diarsipkan (status `archived`).
- **D-15:** Layar baru **Manajemen Event** untuk buat/pilih/arsip event.

### the agent's Discretion
- Struktur persis tabel `events` (kolom id/tipe, constraint) dan penamaan tipe data.
- Cara menyimpan `jumlah lap` (angka) dan apakah `catatan` opsional.
- Implementasi teknis backfill `participant_number` untuk data `users` lama (data v2.0)
  dan bagaimana `event_id` lama diisi (mis. event default).
- Strategi penamaan/urutan checksum migrasi di `schema_version`.
- Penetapan `PRAGMA foreign_keys` (audit orphan dulu; riset merekomendasikan hati-hati).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope & Requirements
- `.planning/ROADMAP.md` §"Phase 11: Event & Schema Migration Foundation" — goal,
  success criteria, requirement mapping (EVNT-01, EVNT-02, EVNT-04, MIG-01, MIG-02).
- `.planning/REQUIREMENTS.md` — REQUIREMENTS.md kategori `EVNT` dan `MIG`.
- `.planning/PROJECT.md` — goal milestone v3.0, constraints, key decisions (`Physical-Only Race Flow`).
- `.planning/research/SUMMARY.md` — ringkasan riset add→switch→remove, schema migration foundation.
- `.planning/research/ARCHITECTURE.md` — integration points, add/keep/remove, build order.
- `.planning/research/PITFALLS.md` — schema resurrection, fake transactions, FK OFF, data loss.
- `.planning/research/STACK.md` — schema additions, migrasi di `db.js`, do-not-add list.

### Kode Sumber
- `server/db.js` — `initDatabase()`, pola `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE`
  dalam try/catch, `SqliteWrapper.transaction()`/`run()`/`save()`, `seedInitialData()`.
- `server/raceManager.js` — `getFullState()`/`getActiveRace()` (JOIN `coupons`), logika bracket,
  sumber `btoLeaderboard` dari `race_registrations.finish_time`.
- `server/index.js` — rute REST `/api/users`, `/api/state`, `broadcastFullState()`.
- `scripts/import-roster.js` — akan di-rewrite pada Phase 12; saat ini menulis `coupon_packages`.
- `.planning/codebase/ARCHITECTURE.md` — layer & aliran data saat ini.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SqliteWrapper` (`server/db.js`): pembungkus `sql.js` dengan `.prepare().all()/get()/run()`
  dan `.transaction()` — basis untuk memperbaiki transaksi nyata (D-10).
- Pola migrasi `try { db.exec('ALTER TABLE ... ADD COLUMN ...'); } catch (e) {}` di `initDatabase()`
  — dipakai ulang untuk menambah `event_id`/`participant_number`, tapi harus di-guard `schema_version`.
- `broadcastFullState()` (`server/index.js`) + `STATE_UPDATE`: jalur distribusi state realtime
  yang nanti ikut membawa `participants[]`/`btoLeaderboard[]`.
- `tournament_settings` (tabel key/value) — kandidat untuk default event aktif, meski `schema_version`
  dipisah ke tabel sendiri (D-09).

### Established Patterns
- Skema ditulis idempoten tiap boot; konsumen harus dihapus bersamaan definisinya (risiko schema resurrection).
- Error bisnis dilempar sebagai `Error` berbahasa Indonesia; rute membalas
  `{ success, data }` / `{ success:false, error }`.
- Konfigurasi env dibaca via `process.env` (mis. `DB_PATH`, `SEED_DEMO_DATA`) — pola untuk
  `ALLOW_DESTRUCTIVE_MIGRATION` baru.
- Seed demo digerbangi `SEED_DEMO_DATA=true`; test suite menyalakannya.

### Integration Points
- `initDatabase()` — titik masuk migrasi & pembuatan tabel `events`, kolom `event_id`/`participant_number`, `schema_version`, `bto_records`.
- `server/index.js` — rute baru `/api/events` (buat/pilih/arsip) dan reset nomor per event.
- `getFullState()` — nanti mengekspos event aktif & data ter-scope (Phase 15).
- `.gitignore` — tambah `data/backups/`.

</code_context>

<specifics>
## Specific Ideas

- "Nomor ini dibuat mudah saja 1, 2, 3, 4 dst." — nomor peserta sengaja sesederhana mungkin
  agar mudah ditulis panitia di kupon fisik.
- Nomor peserta = identitas **entri/kupon**, bukan identitas orang; nama peserta tidak unik
  (satu orang bisa memegang beberapa kupon/entri pada event berbeda).
- Fase ini harus meninggalkan app tetap bisa boot dan membaca DB v2.0.

</specifics>

<deferred>
## Deferred Ideas

- **Cetak daftar seeding per heat** — EXTR-01 (v2 Requirements).
- **Heat konsolasi / perebutan juara 3** — EXTR-02.
- **Operator PIN untuk registrasi pemenang** — EXTR-03.
- **Drop tabel kupon/race lama** — Phase 17 (MIG-04).
- **Rewrite `scripts/import-roster.js` jadi pendaftaran peserta** — Phase 12 (PARN-05).
- **`PRAGMA foreign_keys = ON`** — ditunda sampai audit orphan terpisah.

</deferred>

---

*Phase: 11-Event & Schema Migration Foundation*
*Context gathered: 2026-09-17*