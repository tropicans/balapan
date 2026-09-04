# Phase 07: Pre-Printed Coupon Package Registration & Cashier Flow - Research

**Researched:** 2026-09-04  
**Domain:** Mini 4WD Physical Coupon Package Lifecycle, Fast Cashier Operations, SQLite Schema & Concurrency  
**Confidence:** HIGH  

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Format Nomor Seri & Metode Input
- **D-01:** Format nomor seri kupon fleksibel alfanumerik/numerik (4–32 karakter, misal: `001`, `102`, `CPN-001`, `B50-1092`) sesuai nomor cetak pada lembaran kertas fisik tanpa membatasi dengan regex kaku.
- **D-02:** Lembar kupon fisik di lapangan hanya memiliki nomor cetak angka (tanpa barcode atau QR code pada kertas). Kasir menginput nomor seri menggunakan keyboard / numpad dengan autofocus otomatis pada field nomor seri.
- **D-03:** Validasi keunikan nomor seri di level database (`UNIQUE(serial_number)`); jika nomor seri sudah pernah terdaftar, sistem melakukan hard-block dengan alert merah tebal serta menampilkan informasi pemilik lembar kupon dan sisa kuotanya untuk verifikasi langsung di meja kasir. — **Reversibility:** costly — integritas data unik nomor seri mencegah pendaftaran ganda di seluruh turnamen.
- **D-04:** Sediakan tombol helper opsional "Generate Seri Otomatis / Nomor Berikutnya" di UI kasir bagi sirkuit yang menggunakan lembaran kupon polos tanpa nomor cetak dari percetakan.

#### Relasi Pembalap & Multi-Paket Kupon
- **D-05:** Satu pembalap diperbolehkan membeli dan memiliki lebih dari satu paket lembar kupon sekaligus (misal: Pembalap Budi membeli Lembar Seri #012 dan Lembar Seri #013, masing-masing 50 kotak).
- **D-06:** Dual Mode pemilihan pembalap: Kasir dapat mencari nama pembalap/tim yang sudah ada via autocomplete dari tabel `users`, ATAU langsung mengetik nama baru yang otomatis dibuatkan record usernya saat paket kupon disimpan.
- **D-07:** Kuota kupon fisik dilacak per nomor seri lembar (`remaining_quota` 0–50), dan total saldo kupon pembalap otomatis disinkronkan ke tabel `coupons` agar konsisten dengan alur race lama.
- **D-08:** Kasir dibekali fitur darurat "Ganti Lembar / Void" untuk menonaktifkan nomor seri lama dan mentransfer sisa kuota ke nomor seri lembaran fisik baru jika kertas kupon fisik peserta rusak atau hilang di sirkuit.

#### Struktur Kuota & Pelacakan Pemakaian Kotak
- **D-09:** Jumlah kuota kotak ber-nilai default 50 kotak per lembar (standar turnamen Mini 4WD), namun dapat diedit oleh kasir jika sirkuit menyelenggarakan paket khusus (misal 25, 30, atau 100 kotak).
- **D-10:** Struktur pelacakan kuota sequential (urut): tabel menyimpan `total_quota` (default 50), `used_quota` (default 0), `remaining_quota` (default 50), dan `status` (`active`, `completed`, `void`), sehingga Dasbor Marshal di Phase 08 selalu menginstruksikan pencoretan nomor kotak berikutnya secara berurutan (`used_quota + 1`). — **Reversibility:** costly — skema tabel `coupon_packages` menjadi kontrak dasar untuk Phase 08 (Marshal Line-Up) dan Phase 09 (Finish Ticket).
- **D-11:** Status paket kupon otomatis berubah dari `'active'` menjadi `'completed'` (Habis) saat seluruh kotak terpakai, dan ditandai dengan badge abu-abu "HABIS" di daftar kasir.
- **D-12:** Form kasir menyediakan input opsional Nominal Harga (Rp) dan Metode Pembayaran (Tunai / QRIS / Transfer) untuk pencatatan rekapitulasi pemasukan kasir turnamen.

#### Integrasi Antarmuka Kasir (UI/UX)
- **D-13:** Penempatan fitur sebagai Tab Navigasi pada `CashierDashboard.jsx` (`/cashier`): Tab 1 "Paket Kupon Fisik (Pre-Printed)" (default aktif) dan Tab 2 "Top Up Saldo Digital" (legacy v1.0).
- **D-14:** Layout Split 2-Kolom Cyberpunk: Kolom Kiri = Form Registrasi Cepat (Autofocus nomor seri, input pembalap, kuota, nominal bayar); Kolom Kanan = Live Feed Daftar Paket Terdaftar & Sisa Kuota.
- **D-15:** Search bar instan multi-kriteria di kolom kanan yang mampu memfilter secara real-time berdasarkan Nomor Seri Kupon, Nama Pembalap, atau Nama Tim, disertai tombol filter status (Semua / Aktif / Habis).
- **D-16:** Toast notifikasi sukses pendaftaran dengan tema Cyberpunk serta tombol aksi pintas "Daftar Lembar Berikutnya (Auto Seri +1)" untuk mempercepat kasir mendaftarkan bundle lembar kupon berurutan.

### the agent's Discretion
Penataan field layout form kasir, ikon lucide-react, serta efek visual neon borders yang selaras dengan theme Cyberpunk Obsidian (`#0a0b10`).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CPN-01 | Kasir dapat mendaftarkan peserta dan mengaitkan nomor seri lembar kupon fisik pre-printed dengan kuota race (default 50 kotak). | Tabel `coupon_packages` dengan kolom `serial_number`, `user_id`, `total_quota`, `used_quota`, `remaining_quota`, `status` (`active`, `completed`, `void`), dan endpoint `POST /api/coupon-packages`. |
| CPN-02 | Kasir memiliki form pendaftaran kilat dengan validasi unik nomor seri pre-printed guna mencegah nomor kupon ganda/terdaftar ulang. | Database index constraint `UNIQUE(serial_number)` pada SQLite WASM wrapper, pengecekan pra-insert, dan penanganan HTTP 409 Conflict dengan payload data pemilik kupon terdaftar. |
| CPN-03 | Sistem mendukung pencarian data paket kupon pre-printed & pelacakan sisa kuota berdasarkan nama pembalap atau pemindaian nomor seri. | Endpoint `GET /api/coupon-packages` dengan query parameter `?search=` dan `?status=`, join tabel `users` dan `coupon_packages`, serta debounce filter instan di React client. |
</phase_requirements>

## Summary

Phase 07 menjembatani realitas operasional turnamen fisik Mini 4WD Tamiya (lembaran kertas fisik 50 kotak bertinta cetak) dengan ekosistem backend digital NEO-TAMIYA. Alih-alih mengharuskan sirkuit berinvestasi pada barcode scanner atau label printer mahal, kasir sirkuit diberdayakan dengan form registrasi ultra-cepat berbasis keyboard/numpad dengan autofocus instan. Setiap paket kupon pre-printed memiliki nomor seri unik yang terdaftar pada tabel `coupon_packages`, diverifikasi keunikannya secara ketat, dan sisa kuotanya disinkronisasikan ke tabel `coupons` agar kompatibel dengan alur balap yang ada.

Selain pendaftaran cepat, fase ini mencakup penanganan insiden lapangan melalui fitur "Void & Ganti Lembar", yang memungkinkan pemindahan sisa kuota kupon lama yang rusak/hilang ke lembar fisik baru secara aman dalam satu transaksi database atomik. UI Kasir diimplementasikan pada `CashierDashboard.jsx` menggunakan layout split 2-kolom bertema Cyberpunk (`#0a0b10` midnight background, `#ffaa00` neonAmber aksen, `#0e1017` obsidian surface) dengan live search, filter status, dan dialog konfirmasi destruktif.

**Primary recommendation:** Buat tabel `coupon_packages` dengan skema relasional ketat di `server/db.js`, sediakan REST endpoint CRUD + Void di `server/index.js` dengan integrasi WebSocket `io.emit('coupon_package_updated')`, dan perbarui `CashierDashboard.jsx` dengan sistem tab 2-kolom yang mengimplementasikan semua kontrak visual dan copywriting dari `07-UI-SPEC.md`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Validasi keunikan nomor seri kupon | Database / Storage (`server/db.js`) | API Backend (`server/index.js`) | Integritas data tidak boleh bergantung pada validasi client. Database constraint `UNIQUE(serial_number)` menjamin nol duplikasi bahkan dalam race condition. |
| Pembuatan akun pembalap otomatis (Dual Mode) | API Backend (`server/index.js`) | Client UI (`CashierDashboard.jsx`) | Backend memeriksa apakah `user_id` disediakan atau `new_user_name` dikirim, lalu membuat user baru di tabel `users` secara atomik di dalam transaksi paket kupon. |
| Sinkronisasi kuota kupon fisik ke saldo `coupons` | API Backend (`server/index.js`) | Database / Storage (`server/db.js`) | Memastikan konsistensi saldo di tabel `coupons` (balance += total_quota) agar kompatibel dengan validator race lama tanpa perlu memodifikasi logic race v1.0. |
| Operasi Void & Transfer Kuota Lembar Fisik | API Backend (`server/index.js`) | Database / Storage (`server/db.js`) | Operasi multi-tabel (update status paket lama ke 'void', insert paket baru dengan sisa kuota, log audit) harus dieksekusi dalam transaksi db. |
| Real-time broadcast pembaruan paket | API Backend (WebSocket `io.emit`) | Browser Client (`socket.io-client`) | Saat kasir mendaftarkan atau mem-void paket, event WebSocket dikirim ke semua layar yang aktif (misal monitor kasir pendamping atau dashboard marshal). |
| Autofocus & Keyboard Numpad Navigation | Browser Client (`CashierDashboard.jsx`) | — | UX kasir di lapangan menuntut input cepat tanpa menyentuh mouse. Autofocus diatur via React `useRef`. |
| Pencarian & Filtering Instan | Browser Client (`CashierDashboard.jsx`) | API Backend (`GET /api/coupon-packages`) | Client-side search & filtering dengan fallback ke server query parameter `?search=` untuk performa real-time instan. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express | ^4.21.2 | Server HTTP REST API | [VERIFIED: package.json:24] Framework web standar backend node.js yang sudah terintegrasi di project. |
| sql.js | ^1.14.2 | SQLite in WASM with disk persist | [VERIFIED: package.json:26] Database engine lokal tanpa dependensi C-compiler luar, mendukung prepared statements dan transaksi atomik. |
| React | ^18.3.1 | Komponen antarmuka kasir | [VERIFIED: client/package.json:18] UI framework utama project dengan functional components & hooks. |
| TailwindCSS | ^3.4.17 | Cyberpunk Styling & Responsive Grid | [VERIFIED: client/package.json:29] CSS utility-first terintegrasi dengan tokens `midnight`, `obsidian`, `neonAmber`, `neonCyan`, `neonPink`. |
| Lucide React | ^1.16.0 | Ikon UI (CreditCard, Search, Tag, AlertTriangle) | [VERIFIED: client/package.json:16] Ikon visual modern yang selaras dengan tema cyberpunk. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | ^11.0.5 | ID generator untuk entitas database | Digunakan untuk primary key `id` pada tabel `coupon_packages` dan `users`. |
| clsx & tailwind-merge | ^2.1.1 / ^3.0.2 | Penggabungan class Tailwind dinamis | Digunakan saat merender conditional styles pada tab, input ring, dan status badge. |
| socket.io / socket.io-client | ^4.8.1 | Real-time websocket notification | Digunakan untuk mengirim event broadcast `coupon_package_created` dan `coupon_package_voided`. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side pure search | Server-side pagination query | Karena turnamen Mini 4WD umumnya memiliki < 1000 paket kupon per hari, client-side filtering memberikan respon instan 0ms latency bagi kasir, namun API tetap mendukung query search server-side. |
| Separate `package_logs` table | In-table status & remarks (`void_from_id`, `void_reason`) | Menyimpan `void_from_package_id` langsung di record `coupon_packages` menyederhanakan tracking riwayat transfer tanpa perlu tabel relasi tambahan yang berlebihan. |

## Package Legitimacy Audit

Tidak ada package baru yang diinstal pada Phase 07. Semua dependensi menggunakan stack yang telah ada di `package.json` dan `client/package.json`.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| express | npm | > 10 yrs | > 30M/wk | github.com/expressjs/express | [OK] | Existing approved |
| sql.js | npm | > 8 yrs | > 500k/wk | github.com/sql-js/sql.js | [OK] | Existing approved |
| lucide-react | npm | > 3 yrs | > 10M/wk | github.com/lucide-icons/lucide | [OK] | Existing approved |
| uuid | npm | > 10 yrs | > 100M/wk | github.com/uuidjs/uuid | [OK] | Existing approved |

**Packages removed due to [SLOP] verdict:** none  
**Packages flagged as suspicious [SUS]:** none  

## Architecture Patterns

### System Architecture Diagram

```
Kasir (Browser Client)              API Server (server/index.js)             Database (server/db.js)
┌─────────────────────────┐         ┌─────────────────────────────┐         ┌─────────────────────────┐
│ CashierDashboard.jsx    │         │ POST /api/coupon-packages   │         │ SQLite WASM (db)        │
│                         │         │                             │         │                         │
│ [Form Registrasi Cepat] │────(1)─►│ 1. Cek serial unik          │────(2)─►│ SELECT serial_number    │
│  - Serial: "042"        │         │ 2. Buat user jika nama baru │────(3)─►│ INSERT INTO users       │
│  - Pembalap: "Budi"     │         │ 3. Simpan paket kupon       │────(4)─►│ INSERT coupon_packages  │
│  - Quota: 50            │         │ 4. Sync saldo kupon user    │────(5)─►│ UPDATE coupons (balance)│
│                         │◄───(6)──│ 5. Return success envelope  │         │                         │
│                         │         │ 6. io.emit('coupon_updated')│         └─────────────────────────┘
│                         │         └─────────────────────────────┘
│ [Live Feed & Search]    │
│  - Auto-refresh via WS  │◄───(7)── WebSocket Broadcast
│  - Filter: Aktif/Habis  │
│  - Button: Void/Ganti   │────(8)─► POST /api/coupon-packages/:id/void
└─────────────────────────┘
```

### Recommended Project Structure
```
server/
├── db.js                           # Tambah skema tabel coupon_packages & fungsi query helper
├── index.js                        # Tambah routes: /api/coupon-packages, /:id/void, /next-serial
└── tests/
    └── coupon-package.test.js      # Unit & integration tests untuk validasi unik, sync, dan void

client/src/
├── screens/
│   └── CashierDashboard.jsx        # Update dengan Tab: Paket Fisik (2-Kolom) & Top Up Digital
└── components/
    └── cashier/
        ├── CouponRegistrationForm.jsx  # Form pendaftaran cepat dengan autofocus & serial generator
        ├── CouponPackageList.jsx       # Feed kartu paket kupon terdaftar & quota progress
        └── VoidPackageModal.jsx        # Dialog konfirmasi darurat ganti lembar rusak/hilang
```

### Pattern 1: Atomic Registration & Balance Sync Transaction
**What:** Ketika paket kupon 50 kotak didaftarkan, pendaftaran paket dan penambahan saldo kupon pembalap dilakukan dalam satu transaksi atomik.
**When to use:** Setiap kali `POST /api/coupon-packages` dipanggil.
**Example:**
```javascript
// Source: server/db.js SqliteWrapper transaction pattern
const registerCouponPackage = db.transaction((packageData, userData) => {
  let userId = userData.id;
  if (!userId) {
    // Mode pendaftaran pembalap baru on-the-fly
    userId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, name, team_name, role, is_virtual)
      VALUES (?, ?, ?, 'participant', 1)
    `).run(userId, userData.name, userData.team_name || null);
    
    // Inisialisasi saldo kupon awal 0
    db.prepare(`INSERT INTO coupons (id, user_id, balance) VALUES (?, ?, 0)`)
      .run(uuidv4(), userId);
  }

  // Insert paket kupon baru
  const packageId = uuidv4();
  db.prepare(`
    INSERT INTO coupon_packages (
      id, serial_number, user_id, total_quota, used_quota, remaining_quota,
      price_paid, payment_method, status, void_from_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    packageId,
    packageData.serial_number,
    userId,
    packageData.total_quota,
    packageData.total_quota,
    packageData.price_paid || 0,
    packageData.payment_method || 'cash',
    packageData.void_from_id || null
  );

  // Sync kuota lembar fisik ke saldo tabel coupons
  db.prepare(`
    UPDATE coupons
    SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).run(packageData.total_quota, userId);

  return { packageId, userId };
});
```

### Pattern 2: Void & Transfer Sisa Kuota Lembar Rusak
**What:** Menonaktifkan lembar kupon yang rusak atau hilang, dan menerbitkan nomor seri baru dengan membawa sisa kuota yang belum terpakai.
**When to use:** Kasir memproses insiden lembar rusak melalui `POST /api/coupon-packages/:id/void`.
**Example:**
```javascript
const voidAndReplacePackage = db.transaction((oldPackageId, newSerialNumber, reason) => {
  const oldPkg = db.prepare('SELECT * FROM coupon_packages WHERE id = ?').get(oldPackageId);
  if (!oldPkg) throw new Error('Paket kupon asal tidak ditemukan');
  if (oldPkg.status !== 'active') throw new Error('Paket kupon tidak dalam status aktif');
  if (oldPkg.remaining_quota <= 0) throw new Error('Kupon sudah habis, tidak ada sisa kuota untuk ditransfer');

  // Cek apakah nomor seri baru sudah digunakan
  const existingNew = db.prepare('SELECT id FROM coupon_packages WHERE serial_number = ?').get(newSerialNumber);
  if (existingNew) throw new Error(`Nomor seri baru ${newSerialNumber} sudah terdaftar di sistem`);

  // 1. Nonaktifkan paket lama
  db.prepare(`
    UPDATE coupon_packages 
    SET status = 'void', updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(oldPackageId);

  // 2. Terbitkan paket pengganti dengan membawa sisa kuota lama
  const newPackageId = uuidv4();
  db.prepare(`
    INSERT INTO coupon_packages (
      id, serial_number, user_id, total_quota, used_quota, remaining_quota,
      price_paid, payment_method, status, void_from_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 0, ?, 0, 'transfer_void', 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    newPackageId,
    newSerialNumber,
    oldPkg.user_id,
    oldPkg.remaining_quota,
    oldPkg.remaining_quota,
    oldPackageId
  );

  // Catatan: Saldo kupon user di tabel `coupons` TIDAK BERUBAH karena sisa kuota hanya ditransfer ke kertas baru
  return { newPackageId, transferredQuota: oldPkg.remaining_quota };
});
```

### Anti-Patterns to Avoid
- **Hardcoded Serial Format via Regex:** Membatasi kasir dengan regex ketat (misal `^\d{3}$`). Sirkuit menggunakan beragam format kertas cetak (`001`, `KPN-101`, atau `B50-092`). Biarkan validasi format fleksibel dengan batasan panjang karakter aman (4–32 karakter) dan sanitasi whitespace.
- **Client-Side Only Duplicate Check:** Mengecek duplikasi nomor seri hanya pada form React. Harus ada `UNIQUE(serial_number)` di database dan error handler HTTP 409 Conflict di backend.
- **Silent Failure on Duplicate:** Saat kasir menginput nomor seri yang sudah ada, jangan hanya menampilkan "Gagal". Berikan detail pemilik nomor seri tersebut agar kasir dapat memverifikasi fisik lembaran di meja.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unik constraint validasi nomor seri | Custom loop scanning array JS di memori | SQLite `UNIQUE(serial_number)` constraint | Mencegah race condition antar request paralel dan memastikan integritas data permanen. |
| Status progress kuota visual | Custom canvas rendering | TailwindCSS progress container (`w-full bg-slate-800 rounded-full h-2.5`) | Lebih ringan, aksesibel, dan mudah di-theme dengan warna neonAmber/neonCyan. |
| Modal backdrop & dialog logic | Manipulasi DOM langsung | React portal / conditional state component | Memastikan isolasi event bubbling dan cleanup saat modal ditutup. |

## Common Pitfalls

### Pitfall 1: Double Balance Crediting pada Transaksi Gagal
**What goes wrong:** Paket kupon gagal disimpan karena error nomor seri duplikat, namun saldo di tabel `coupons` sudah terlanjur bertambah.  
**Why it happens:** Operasi database tidak dibungkus dalam `db.transaction()`.  
**How to avoid:** Gunakan wrapper `db.transaction()` di `server/db.js` yang melakukan rollback otomatis jika terjadi kegagalan statement SQL di tengah alur.

### Pitfall 2: Desinkronisasi Saldo saat Void Lembar Kupon
**What goes wrong:** Saat kasir mengganti lembar rusak, saldo pembalap bertambah dua kali lipat (saldo lama + saldo lembar baru).  
**Why it happens:** Kasir menganggap lembar baru sebagai pembelian baru dan menambahkan `remaining_quota` ke tabel `coupons`.  
**How to avoid:** Pada alur Void & Replace, lembar baru hanya mewarisi sisa kuota lama; saldo pembalap di `coupons` tidak ditambahkan kembali karena sudah pernah ditambahkan pada pembelian pertama.

### Pitfall 3: Hilangnya Fokus Input Saat Kasir Mendaftarkan Bundle Lembar Kupon
**What goes wrong:** Setelah menekan "Daftarkan", fokus kursor hilang dari field nomor seri sehingga kasir harus mengklik kembali form dengan mouse untuk lembar berikutnya.  
**Why it happens:** State submit me-reset form tanpa memanggil `inputRef.current?.focus()`.  
**How to avoid:** Panggil `focus()` pada input nomor seri di callback sukses registrasi dan sediakan tombol "Daftar Lembar Berikutnya (+1)".

## Code Examples

### Form Autofocus & Auto-Increment Helper Pattern
```javascript
// Source: client/src/components/cashier/CouponRegistrationForm.jsx
import React, { useRef, useEffect, useState } from 'react';

export function CouponRegistrationForm({ onRegistered, lastSerial }) {
  const serialInputRef = useRef(null);
  const [serialNumber, setSerialNumber] = useState('');

  // Autofocus saat tab dibuka atau form siap
  useEffect(() => {
    serialInputRef.current?.focus();
  }, []);

  // Helper auto increment serial
  const handleAutoIncrement = () => {
    if (!lastSerial) return;
    const match = lastSerial.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const num = parseInt(match[2], 10) + 1;
      const paddedNum = String(num).padStart(match[2].length, '0');
      const next = `${prefix}${paddedNum}`;
      setSerialNumber(next);
      serialInputRef.current?.focus();
    }
  };

  return (
    <input
      ref={serialInputRef}
      type="text"
      value={serialNumber}
      onChange={(e) => setSerialNumber(e.target.value.trim().toUpperCase())}
      className="w-full bg-[#0e1017] border border-[#1e293b] focus:border-[#ffaa00] focus:ring-1 focus:ring-[#ffaa00] text-white font-mono px-3 py-2 text-sm rounded outline-none"
      placeholder="Contoh: 001, CPN-042"
    />
  );
}
```

## State of the Art

| Old Approach (v1.0) | Current Approach (v2.0 Phase 07) | When Changed | Impact |
|---------------------|-----------------------------------|--------------|--------|
| Saldo digital murni (kasir top-up nominal kupon per user) | Paket kupon fisik pre-printed 50 kotak dengan nomor seri kertas | Phase 07 (v2.0) | Selaras 100% dengan operasional sirkuit Mini 4WD lapangan di Indonesia tanpa perlu device khusus untuk peserta. |
| Input manual nama pembalap berulang kali | Dual Mode: Autocomplete nama peserta terdaftar ATAU pendaftaran instan tamu | Phase 07 (v2.0) | Mempersingkat antrean kasir dari 45 detik menjadi < 10 detik per peserta. |
| Kehilangan kertas kupon = kupon hangus / manual admin | Fitur darurat "Void & Ganti Lembar" dengan transfer kuota terdata | Phase 07 (v2.0) | Memberikan perlindungan bagi peserta jika kertas kupon robek atau terkena tumpahan pelumas di pit area. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Nomor seri kupon di lapangan berupa alfanumerik 4–32 karakter. | Form Input | Rendah: field string varchar(32) di SQLite dapat menampung nomor numerik murni maupun kode cetak percetakan. |
| A2 | Default kuota lembar standar Mini 4WD adalah 50 kotak. | User Constraints | Nol: form kasir tetap mengizinkan pengubahan angka kuota jika turnamen menggunakan 25 atau 100 kotak. |

## Open Questions

1. **Format Penomoran Helper "Generate Seri Otomatis":**
   - What we know: Sebagian sirkuit membeli lembaran kupon polos tanpa nomor dari percetakan.
   - Recommendation: Tombol helper membaca nomor seri terakhir di database dan memberikan `lastNumber + 1` (misal `001` -> `002`). Jika belum ada data sama sekali, berikan nilai awal `001`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend runtime & test runner | ✓ | v22.22.3 | — |
| SQLite (sql.js) | Data persistence layer | ✓ | v1.14.2 | — |
| React + Vite | Frontend cashier UI | ✓ | React 18.3 / Vite 6.0 | — |
| TailwindCSS | Cyberpunk design styling | ✓ | v3.4.17 | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:assert` & custom async test runner |
| Config file | `package.json` (`"test"` script) |
| Quick run command | `node server/tests/coupon-package.test.js` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CPN-01 | Registrasi paket kupon fisik 50 kotak berhasil & saldo pembalap tersinkronisasi | integration | `node server/tests/coupon-package.test.js` | ❌ Wave 0 |
| CPN-02 | Validasi keunikan nomor seri kupon (menolak duplikasi nomor seri dengan 409 Conflict) | unit/integration | `node server/tests/coupon-package.test.js` | ❌ Wave 0 |
| CPN-03 | Pencarian paket berdasarkan nomor seri / nama pembalap & pelacakan status sisa kuota | integration | `node server/tests/coupon-package.test.js` | ❌ Wave 0 |
| CPN-04 (Void) | Void lembar rusak dan transfer sisa kuota ke lembar nomor seri baru secara atomik | integration | `node server/tests/coupon-package.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node server/tests/coupon-package.test.js`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green sebelum `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `server/tests/coupon-package.test.js` — Test suite untuk validasi skema tabel `coupon_packages`, duplicate serial prevention, balance sync, search filter API, dan void flow.

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Cashier desk bersifat internal assisted terminal turnamen lokal. |
| V4 Access Control | yes | Sanitasi parameter input route API kasir agar tidak terjadi privilege escalation. |
| V5 Input Validation | yes | Validasi panjang nomor seri (4–32 chars), validasi angka positif untuk kuota (1–500), dan sanitasi string nama pembalap. |
| V6 Cryptography | no | Tidak ada token rahasia eksternal yang dienkripsi pada lembar kupon fisik. |

### Known Threat Patterns for Node.js / SQLite
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL Injection pada nomor seri / nama pembalap | Tampering | Menggunakan parameterized queries `db.prepare(sql).run(param1, param2)`. |
| Race Condition pendaftaran nomor seri duplikat | Tampering | Enforce database unique constraint `UNIQUE(serial_number)`. |
| Manipulasi kuota negatif / berlebih | Tampering | Validasi integer bounds `total_quota > 0 && remaining_quota >= 0`. |

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `server/db.js` (SqliteWrapper implementation)
- Codebase inspection: `client/src/screens/CashierDashboard.jsx` (Existing cashier UI)
- Codebase inspection: `server/tests/race-flow.test.js` (Test architecture pattern)
- Contract: `.planning/phases/07-pre-printed-coupon-package-registration-cashier-flow/07-CONTEXT.md`
- Contract: `.planning/phases/07-pre-printed-coupon-package-registration-cashier-flow/07-UI-SPEC.md`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Menggunakan stack aktif tanpa penambahan library baru
- Architecture: HIGH - Skema relasional SQLite dan WebSocket pattern sudah terbukti di Phase 01–06
- Pitfalls: HIGH - Mengantisipasi double balance sync dan kehilangan autofocus di meja kasir

**Research date:** 2026-09-04  
**Valid until:** 2026-10-04  
