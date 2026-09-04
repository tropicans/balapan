# Phase 5: 3-Lane Elimination Backend Engine & Auto-Advance Schema - Research

**Researched:** 2026-09-03  
**Domain:** Tournament Bracket Systems, 3-Lane Tree Reduction Algorithm, SQLite Dynamic Data Schemas  
**Confidence:** HIGH  

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **ELIM-01** | Sistem mendukung 3 pembalap per heat (`user_id_1`, `user_id_2`, `user_id_3` memetakan ke Jalur A Pink, Jalur B Cyan, Jalur C Green) pada tabel `bracket_matches`. | [VERIFIED: server/db.js:166-183] Skema `bracket_matches` telah memiliki kolom `user_id_1`, `user_id_2`, dan `user_id_3`. Perlu penyesuaian fungsi `seedIntoBracket`, `advanceBracketWinner`, dan query state agar Jalur C (`user_id_3`) terisi dan diproses secara setara. |
| **ELIM-02** | Logika `seedIntoBracket` menempatkan peserta yang lolos Scrutineer Babak 1 ke slot kosong 3-jalur di Babak 2 secara berurutan dan mampu membuat heat baru secara dinamis hingga 100+ heat. | [VERIFIED: server/raceManager.js:609-634] Menggantikan fixed 8-slot iteration dengan dynamic heat allocator yang mengisi slot kosong di `round_number = 2` secara berurutan (Jalur A -> B -> C) dan otomatis men-generate heat baru (`match_number`) jika semua heat yang ada telah terisi penuh. |
| **ELIM-03** | Auto-Advance Engine secara otomatis mempromosikan 1 pemenang dari tiap heat di Babak $R$ ke slot kosong di Babak $R+1$ hingga mencapai Grand Final (3 mobil). | [VERIFIED: server/raceManager.js:637-660] Mengupgrade `advanceBracketWinner` dengan reduksi 3:1 dinamis. Pemenang Babak $R$ dipromosikan ke slot kosong di Babak $R+1$ tanpa duplikasi, menghubungkan atau membuat parent match secara reaktif hingga mencapai Grand Final. |
</phase_requirements>

---

## Summary

Phase 5 berfokus pada perombakan total backend engine bracket eliminasi di `server/raceManager.js` dan pendukungnya di `server/db.js`. Sebelumnya sistem mengasumsikan bagan fixed 8-slot 2-peserta (single elimination 2-car) peninggalan skema purwarupa awal. Pada kompetisi Mini 4WD Tamiya standar nasional/internasional, balapan berlangsung pada sirkuit 3-jalur (Line A, Line B, Line C), di mana setiap race/heat mempertemukan 3 mobil dan meloloskan tepat 1 pemenang tercepat ke babak berikutnya (reduksi 3:1).

Sistem harus mampu menampung lonjakan peserta kualifikasi (Babak 1) tanpa batasan artifisial 8 atau 16 slot. Ketika lebih dari 24 atau bahkan 300 pembalap lolos Scrutineer Babak 1, engine harus secara dinamis mengalokasikan heat baru di Babak 2 (Heat 1 s.d. Heat 100+) secara adil dan terurut. Selanjutnya, ketika Race Director memilih pemenang suatu heat di Babak $R$, Auto-Advance Engine secara deterministik mempromosikan pemenang tersebut ke slot kosong di Babak $R+1$ hingga menyisakan 3 mobil di babak puncak (Grand Final).

**Primary recommendation:**
Implementasikan algoritma alokasi dinamis berbasis transaksi SQLite (`db.transaction`) pada `server/raceManager.js` dengan membedakan ronde turnamen: Babak 2 (`round_number: 2`), Babak 3 (`round_number: 3`), Babak 4 (`round_number: 4`), dan seterusnya. Dukung alias backward-compatibility `placeIntoBracket` -> `seedIntoBracket` serta buat suite unit test komprehensif (`server/tests/bracket-3lane.test.js`) yang memvalidasi skala 300 kontestan (100 heat) dan auto-advance multi-babak tanpa kebocoran data.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| **3-Slot Lane Mapping (`user_id_1..3`)** | Database / Storage (`bracket_matches`) | Backend (`server/raceManager.js`) | Integritas data kontestan dan pemenang berada di database, dipetakan ke Jalur A (Pink), Jalur B (Cyan), dan Jalur C (Green). |
| **Dynamic Heat Allocation (100+ Heats)** | Backend Engine (`server/raceManager.js`) | Database (`bracket_matches`) | Backend bertugas menghitung nomor match berikutnya dan meng-insert heat baru secara atomik saat seluruh slot heat berjalan penuh. |
| **Auto-Advance Multi-Round (3:1 Reduction)** | Backend Engine (`server/raceManager.js`) | WebSocket / State (`server/index.js`) | Promosi pemenang dari Babak $R$ ke $R+1$ dilakukan saat RD memvalidasi hasil heat, kemudian langsung di-broadcast via WebSocket `FULL_STATE`. |
| **Bracket State Broadcast** | Backend API / WebSocket | Frontend Context | `getFullState()` mengembalikan seluruh heat berjenjang dengan data user ter-JOIN secara efisien. |

---

## Standard Stack

### Core
| Library / Modul | Versi Terverifikasi | Purpose | Why Standard |
|-----------------|---------------------|---------|--------------|
| `better-sqlite3` | `^11.8.1` | Embedded synchronous SQLite database engine | [VERIFIED: package.json:20] Performa tinggi, mendukung transaksi atomik sinkron yang menjamin nol race condition saat alokasi slot heat. |
| `uuid` | `^11.0.5` | Pembangkit ID unik (UUID v4) | [VERIFIED: package.json:28] Standard industri untuk Primary Key entitas pertandingan tanpa risiko tabrakan ID. |
| `node:assert` | Node.js Built-in | Unit testing assertion | Ringan, cepat, zero-dependency, konsisten dengan test suite eksisting di `server/tests/race-flow.test.js`. |

### Supporting
Tidak ada library eksternal baru yang diperlukan. Seluruh fungsionalitas diselesaikan menggunakan stack inti Node.js + `better-sqlite3`.

---

## Package Legitimacy Audit

> Phase 5 merupakan perubahan murni kode backend dan query SQLite. Tidak ada paket npm baru yang diinstall.

| Package | Registry | Status | Disposition |
|---------|----------|--------|-------------|
| `better-sqlite3` | npm | Eksisting | Approved (Sudah terpasang & teruji) |
| `uuid` | npm | Eksisting | Approved (Sudah terpasang & teruji) |

---

## Architecture Patterns

### System Architecture: 3-to-1 Dynamic Reduction Tree

```
Babak 1: Kualifikasi (Open Race)
      │
      ▼ (Scrutineer Pass)
Babak 2 (Elimination Round 1):
  [Heat 1] A: User 1 | B: User 2 | C: User 3  ───► Winner W1 ──┐
  [Heat 2] A: User 4 | B: User 5 | C: User 6  ───► Winner W2 ──┼──► Babak 3 (Heat K)
  [Heat 3] A: User 7 | B: User 8 | C: User 9  ───► Winner W3 ──┘     A: W1 | B: W2 | C: W3
  ... (Dinamis hingga Heat 100+)                                          │
                                                                          ▼ (Winner W_K)
                                                                     Babak 4 / Grand Final
                                                                       A: W_K | B: W_L | C: W_M
                                                                          │
                                                                          ▼
                                                                     CHAMPION (#1)
```

### Pattern 1: Deterministic Slot Filling Order (A -> B -> C)
Setiap heat memiliki 3 jalur fisik:
- `user_id_1`: Jalur A (Pink Neon)
- `user_id_2`: Jalur B (Cyan Neon)
- `user_id_3`: Jalur C (Green Neon)

Ketika kontestan baru masuk ke babak eliminasi:
1. Periksa apakah kontestan sudah terdaftar di babak tersebut (`round_number`). Jika sudah ada, abort (idempotent, no-duplicate).
2. Cari heat pertama di babak tersebut yang memiliki slot kosong (`user_id_1 IS NULL OR user_id_2 IS NULL OR user_id_3 IS NULL`) diurutkan berdasarkan `match_number ASC`.
3. Isi slot pertama yang kosong:
   - Jika `!m.user_id_1`: isi `user_id_1`.
   - Jika `!m.user_id_2`: isi `user_id_2`.
   - Jika `!m.user_id_3`: isi `user_id_3`.
4. Jika tidak ada heat dengan slot kosong:
   - Buat heat baru dengan `match_number = max(match_number) + 1`, `round_number`, dan tempatkan kontestan di `user_id_1`.

### Pattern 2: Multi-Round Hierarchical Auto-Advance
Ketika pemenang heat dideklarasikan (`advanceBracketWinner(matchId, winnerId)`):
1. Update status match menjadi `'completed'` dan isi `winner_id = winnerId`.
2. Hitung babak tujuan: `nextRound = currentMatch.round_number + 1`.
3. Periksa apakah `winnerId` sudah terdaftar di `nextRound` (mencegah double promotion).
4. Jika `currentMatch.parent_match_id` telah terdefinisi dan parent match masih memiliki slot kosong, isi slot kosong pada parent match tersebut.
5. Jika tidak ada parent match atau parent match sudah penuh:
   - Cari match di `nextRound` yang masih memiliki slot kosong.
   - Jika ada, isi slot kosong tersebut dan perbarui `currentMatch.parent_match_id = targetMatch.id`.
   - Jika tidak ada match dengan slot kosong di `nextRound`, buat match baru di `nextRound`, tempatkan `winnerId` di `user_id_1`, dan tautkan `currentMatch.parent_match_id = newMatch.id`.
6. Jika babak berikutnya adalah babak puncak (hanya 1 match yang tersisa dengan 3 finalis), menandai babak tersebut sebagai Grand Final.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Concurrency & Race Conditions | In-memory lock flags / async queues | SQLite `db.transaction()` | `better-sqlite3` mengeksekusi transaksi secara synchronous serializable, mencegah dua peserta mengisi slot jalur yang sama secara bersamaan. |
| Hardcoded Round Tree (m1..m7) | Hardcoded static match tables di JS | Dynamic Query-Driven Allocator | Turnamen nyata memiliki jumlah peserta dinamis (bisa 24, bisa 150, bisa 300+ pembalap). |
| ID Generation | Timestamp string / Math.random() | `uuidv4()` | Menjamin integritas referensial dan foreign key SQLite tanpa kolisi. |

---

## Common Pitfalls

### Pitfall 1: Duplicate Placement on Scrutineer Re-inspection
**What goes wrong:** Jika Scrutineer melakukan update status atau inspeksi ulang kontestan yang sama, peserta bisa diduplikasi ke beberapa heat Babak 2.  
**How to avoid:** Cek keberadaan kontestan di `round_number = 2` menggunakan `SELECT id FROM bracket_matches WHERE round_number = 2 AND (user_id_1 = ? OR user_id_2 = ? OR user_id_3 = ?)`. Jika sudah ada, jangan lakukan insert/update ulang.

### Pitfall 2: Overwriting Non-Empty Lane Slots
**What goes wrong:** Logic update menimpa `user_id_2` atau `user_id_3` yang sudah diisi oleh kontestan lain jika pengecekan `null` tidak ketat.  
**How to avoid:** Gunakan atomic condition `UPDATE bracket_matches SET user_id_X = ? WHERE id = ? AND user_id_X IS NULL`.

### Pitfall 3: Broken Grand Final Reduction
**What goes wrong:** Jika jumlah heat di Babak $R$ bukan kelipatan 3 (misal: 4 heat -> 4 pemenang), ronde berikutnya akan berisi 1 heat lengkap (3 mobil) dan 1 heat parsial (1 mobil).  
**How to avoid:** Engine harus mendukung heat parsial (bye/walkover atau heat dengan 2 peserta) secara fleksibel tanpa crash atau error constraint, serta RD dapat memajukan pemenang dari heat beranggotakan 2 atau 3 mobil secara konsisten.

---

## Code Examples

### 1. `seedIntoBracket(userId)` implementation pattern
```javascript
static seedIntoBracket(userId) {
  const findExisting = db.prepare(`
    SELECT id FROM bracket_matches
    WHERE round_number = 2 AND (user_id_1 = ? OR user_id_2 = ? OR user_id_3 = ?)
  `).get(userId, userId, userId);

  if (findExisting) return findExisting;

  const openMatch = db.prepare(`
    SELECT * FROM bracket_matches
    WHERE round_number = 2 AND (user_id_1 IS NULL OR user_id_2 IS NULL OR user_id_3 IS NULL)
    ORDER BY match_number ASC
    LIMIT 1
  `).get();

  if (openMatch) {
    if (!openMatch.user_id_1) {
      db.prepare('UPDATE bracket_matches SET user_id_1 = ? WHERE id = ?').run(userId, openMatch.id);
    } else if (!openMatch.user_id_2) {
      db.prepare('UPDATE bracket_matches SET user_id_2 = ? WHERE id = ?').run(userId, openMatch.id);
    } else if (!openMatch.user_id_3) {
      db.prepare('UPDATE bracket_matches SET user_id_3 = ? WHERE id = ?').run(userId, openMatch.id);
    }
    return openMatch;
  }

  // Create new heat for Round 2
  const maxNum = db.prepare('SELECT MAX(match_number) as max_num FROM bracket_matches').get()?.max_num || 0;
  const newMatchId = uuidv4();
  db.prepare(`
    INSERT INTO bracket_matches (id, match_number, round_number, user_id_1, status)
    VALUES (?, ?, 2, ?, 'pending')
  `).run(newMatchId, maxNum + 1, userId);

  return { id: newMatchId, match_number: maxNum + 1 };
}
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js Built-in Test & Assert |
| Quick run command | `& "C:\Users\yudhiar\AppData\Local\nvm\v22.22.3\node.exe" server/tests/race-flow.test.js` |
| Full suite command | `& "C:\Users\yudhiar\AppData\Local\nvm\v22.22.3\node.exe" server/tests/bracket-3lane.test.js` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| **ELIM-01** | Heat menyimpan dan mengembalikan 3 slot pembalap (`user_id_1`, `user_id_2`, `user_id_3`) | Unit | `node server/tests/bracket-3lane.test.js` | ❌ Wave 0 |
| **ELIM-02** | Seeding 9 kontestan mengisi 3 heat Babak 2 (3 mobil per heat); Seeding 300 kontestan otomatis membuat 100 heat | Unit / Load | `node server/tests/bracket-3lane.test.js` | ❌ Wave 0 |
| **ELIM-03** | Memilih pemenang di Babak 2 mempromosikan pembalap ke Babak 3 secara otomatis; pemenang Babak 3 dipromosikan ke Grand Final | Integration | `node server/tests/bracket-3lane.test.js` | ❌ Wave 0 |
| **REGRESS** | Alur balapan eksisting (kualifikasi, scrutineer, BTO, kupon) tetap 100% lulus | Regression | `node server/tests/race-flow.test.js` | ✅ Exists |

---

## Sources & Metadata

### Primary (HIGH Confidence)
- `server/db.js` (Definisi skema tabel `bracket_matches` dan initial seed)
- `server/raceManager.js` (Metode `placeIntoBracket`, `advanceBracketWinner`, dan query `getFullState()`)
- `server/tests/race-flow.test.js` (Verifikasi kepatuhan tes eksisting)

**Research date:** 2026-09-03  
**Valid until:** 2026-10-03
