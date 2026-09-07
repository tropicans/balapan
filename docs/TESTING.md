<!-- generated-by: gsd-doc-writer -->
# Testing Guide: DGDash Racing System

Panduan pengujian otomatis untuk memvalidasi integritas logika turnamen, keadilan pemotongan kupon, konkurensi antrean, penerbitan tiket, hingga rendering UI.

## Test Framework & Setup

- **Runner**: Node.js ESM Test Runner (`node server/tests/*.test.js`).
- **Database Fixtures**: Setiap test menginisialisasi instance SQLite in-memory independen atau database file sementara untuk isolasi pengujian tanpa efek samping pada database produksi.
- **Frontend Component Verification**: Pengujian rendering komponen React (seperti `BracketDashboard.jsx`) menggunakan bundling `esbuild` dan `react-dom/server.browser` untuk memverifikasi struktur JSX dan mendeteksi runtime reference errors.

## Running Tests

### 1. Menjalankan Seluruh Test Suite
Perintah utama yang menjalankan seluruh rangkaian test proyek:
```bash
npm test
```

### 2. Menjalankan Pengujian Spesifik

| Perintah Pengujian | Fokus Pengujian |
|---------------------|-----------------|
| `node server/tests/race-flow.test.js` | Logika state machine balapan, registrasi jalur, pemotongan kupon, re-race, dan override juri. |
| `node server/tests/camera-scanner.test.js` | Deteksi secure context (kamera mobile) dan parsing payload stensil QR. |
| `node server/tests/coupon-package.test.js` | Pendaftaran paket kupon fisik 50-kotak kasir, validasi unik nomor seri, dan void/replace. |
| `node server/tests/marshal-flow.test.js` | Alur start box marshal, check-off kupon fisik, toleransi undo 60 detik, dan eksekusi Babak 2. |
| `node server/tests/ticket-engine-flow.test.js` | Logika sequential ticket issuance, auto-seeding bracket Babak 2, kuota tiket, dan locking. |
| `node server/tests/bracket-3lane.test.js` | Skema bagan eliminasi 3-jalur berjenjang hingga 300 pembalap dan auto-advance pemenang. |
| `node server/tests/bracket-dashboard-render.test.js` | Pengujian rendering komponen bagan eliminasi dan validasi bebas runtime error. |
| `node server/tests/e2e-tournament-lifecycle.test.js` | Pengujian siklus penuh turnamen dari pendaftaran kupon kasir hingga Grand Final. |

## Writing New Tests

Saat menulis pengujian baru di `server/tests/`:

1. **Konvensi Penamaan**: Simpan berkas di direktori `server/tests/` dengan format `<fitur>.test.js`.
2. **Inisialisasi Database Bersih**:
   ```javascript
   import { initDatabase } from '../db.js';
   // Inisialisasi instance database baru dengan test fixtures
   ```
3. **Pola Asersi**: Gunakan `assert` bawaan Node.js (`import assert from 'assert';`) untuk validasi eksplisit:
   ```javascript
   assert.strictEqual(res.status, 200);
   assert.deepStrictEqual(data.success, true);
   ```
4. **Isolasi Server**: Jika menguji endpoint REST / Socket.IO, gunakan port dinamis (`0`) untuk menghindari tabrakan port antar-test:
   ```javascript
   const server = app.listen(0);
   const port = server.address().port;
   ```

## Coverage Requirements

| Metrik | Target | Catatan |
|--------|--------|---------|
| Status Machine Transisi | 100% | Siklus draft $\rightarrow$ ready $\rightarrow$ locked $\rightarrow$ finish $\rightarrow$ pass/dq. |
| Transaksi Kupon | 100% | Kupon tidak boleh berkurang ganda atau hilang pada aksi batal/re-race. |
| Bracket & Ticket Engine | 100% | Alokasi pemenang heat dan nomor tiket sekuensial anti-duplikasi. |

## CI Integration

Pengujian otomatis dapat dijalankan di pipeline CI (misal GitHub Actions) menggunakan perintah standar:
```yaml
- name: Run Test Suite
  run: npm test
```
Semua test mengembalikan exit code `0` saat sukses dan `1` saat terjadi kegagalan asersi.
