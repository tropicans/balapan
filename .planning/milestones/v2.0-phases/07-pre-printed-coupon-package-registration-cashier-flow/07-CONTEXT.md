# Phase 07: Pre-Printed Coupon Package Registration & Cashier Flow - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Menyediakan skema data paket kupon fisik (`coupon_packages`), validasi nomor seri lembar kupon pre-printed (50 kotak), dan antarmuka pendaftaran kasir cepat terintegrasi pada `CashierDashboard.jsx` (`/cashier`) dengan pencarian instan dan pelacakan sisa kuota.

</domain>

<decisions>
## Implementation Decisions

### Format Nomor Seri & Metode Input
- **D-01:** Format nomor seri kupon fleksibel alfanumerik/numerik (4–32 karakter, misal: `001`, `102`, `CPN-001`, `B50-1092`) sesuai nomor cetak pada lembaran kertas fisik tanpa membatasi dengan regex kaku.
- **D-02:** Lembar kupon fisik di lapangan hanya memiliki nomor cetak angka (tanpa barcode atau QR code pada kertas). Kasir menginput nomor seri menggunakan keyboard / numpad dengan autofocus otomatis pada field nomor seri.
- **D-03:** Validasi keunikan nomor seri di level database (`UNIQUE(serial_number)`); jika nomor seri sudah pernah terdaftar, sistem melakukan hard-block dengan alert merah tebal serta menampilkan informasi pemilik lembar kupon dan sisa kuotanya untuk verifikasi langsung di meja kasir. — **Reversibility:** costly — integritas data unik nomor seri mencegah pendaftaran ganda di seluruh turnamen.
- **D-04:** Sediakan tombol helper opsional "Generate Seri Otomatis / Nomor Berikutnya" di UI kasir bagi sirkuit yang menggunakan lembaran kupon polos tanpa nomor cetak dari percetakan.

### Relasi Pembalap & Multi-Paket Kupon
- **D-05:** Satu pembalap diperbolehkan membeli dan memiliki lebih dari satu paket lembar kupon sekaligus (misal: Pembalap Budi membeli Lembar Seri #012 dan Lembar Seri #013, masing-masing 50 kotak).
- **D-06:** Dual Mode pemilihan pembalap: Kasir dapat mencari nama pembalap/tim yang sudah ada via autocomplete dari tabel `users`, ATAU langsung mengetik nama baru yang otomatis dibuatkan record usernya saat paket kupon disimpan.
- **D-07:** Kuota kupon fisik dilacak per nomor seri lembar (`remaining_quota` 0–50), dan total saldo kupon pembalap otomatis disinkronkan ke tabel `coupons` agar konsisten dengan alur race lama.
- **D-08:** Kasir dibekali fitur darurat "Ganti Lembar / Void" untuk menonaktifkan nomor seri lama dan mentransfer sisa kuota ke nomor seri lembaran fisik baru jika kertas kupon fisik peserta rusak atau hilang di sirkuit.

### Struktur Kuota & Pelacakan Pemakaian Kotak
- **D-09:** Jumlah kuota kotak ber-nilai default 50 kotak per lembar (standar turnamen Mini 4WD), namun dapat diedit oleh kasir jika sirkuit menyelenggarakan paket khusus (misal 25, 30, atau 100 kotak).
- **D-10:** Struktur pelacakan kuota sequential (urut): tabel menyimpan `total_quota` (default 50), `used_quota` (default 0), `remaining_quota` (default 50), dan `status` (`active`, `completed`, `void`), sehingga Dasbor Marshal di Phase 08 selalu menginstruksikan pencoretan nomor kotak berikutnya secara berurutan (`used_quota + 1`). — **Reversibility:** costly — skema tabel `coupon_packages` menjadi kontrak dasar untuk Phase 08 (Marshal Line-Up) dan Phase 09 (Finish Ticket).
- **D-11:** Status paket kupon otomatis berubah dari `'active'` menjadi `'completed'` (Habis) saat seluruh kotak terpakai, dan ditandai dengan badge abu-abu "HABIS" di daftar kasir.
- **D-12:** Form kasir menyediakan input opsional Nominal Harga (Rp) dan Metode Pembayaran (Tunai / QRIS / Transfer) untuk pencatatan rekapitulasi pemasukan kasir turnamen.

### Integrasi Antarmuka Kasir (UI/UX)
- **D-13:** Penempatan fitur sebagai Tab Navigasi pada `CashierDashboard.jsx` (`/cashier`): Tab 1 "Paket Kupon Fisik (Pre-Printed)" (default aktif) dan Tab 2 "Top Up Saldo Digital" (legacy v1.0).
- **D-14:** Layout Split 2-Kolom Cyberpunk: Kolom Kiri = Form Registrasi Cepat (Autofocus nomor seri, input pembalap, kuota, nominal bayar); Kolom Kanan = Live Feed Daftar Paket Terdaftar & Sisa Kuota.
- **D-15:** Search bar instan multi-kriteria di kolom kanan yang mampu memfilter secara real-time berdasarkan Nomor Seri Kupon, Nama Pembalap, atau Nama Tim, disertai tombol filter status (Semua / Aktif / Habis).
- **D-16:** Toast notifikasi sukses pendaftaran dengan tema Cyberpunk serta tombol aksi pintas "Daftar Lembar Berikutnya (Auto Seri +1)" untuk mempercepat kasir mendaftarkan bundle lembar kupon berurutan.

### the agent's Discretion
- Penataan field layout form kasir, ikon lucide-react, serta efek visual neon borders yang selaras dengan theme Cyberpunk Obsidian (`#0a0b10`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Roadmap Contracts
- `.planning/PROJECT.md` — Definisi proyek, batasan operasional turnamen v2.0 Marshal-driven, dan aturan transaksi kupon.
- `.planning/ROADMAP.md` — Definisi Phase 07 (Pre-Printed Coupon Package Registration & Cashier Flow) dan keterhubungannya dengan Phase 08 & 09.
- `.planning/REQUIREMENTS.md` — Spesifikasi kebutuhan `CPN-01`, `CPN-02`, dan `CPN-03`.

### Codebase Architecture & Conventions
- `.planning/codebase/ARCHITECTURE.md` — Pola Express + sql.js WASM + React Vite.
- `.planning/codebase/CONVENTIONS.md` — Konvensi respons API (`{ success: true, data: ... }`), Cyberpunk UI colors, dan styling TailwindCSS.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/components/ui/CyberCard.jsx` & `client/src/components/ui/CyberButton.jsx`: Komponen UI standar untuk card container dan tombol aksi bertema cyberpunk.
- `client/src/screens/CashierDashboard.jsx`: Layar kasir yang sudah ada, dapat diperluas dengan tab navigasi untuk mengakomodasi alur paket kupon fisik.
- `client/src/context/RaceContext.jsx`: Context provider React untuk state global turnamen dan API fetch helpers.

### Established Patterns
- `server/db.js`: Penggunaan wrapper `SqliteWrapper` berbasis `sql.js` dengan prepared statements (`prepare().run()`, `prepare().all()`, `prepare().get()`) dan auto-save ke disk.
- API response envelope standar: `{ success: true, data: ... }` atau `{ success: false, error: ... }`.
- WebSocket broadcasting via `io.emit()` di `server/index.js` untuk mengabarkan perubahan state arena secara real-time.

### Integration Points
- Tabel baru di `server/db.js`: `coupon_packages` (id, serial_number, user_id, total_quota, used_quota, remaining_quota, price_paid, payment_method, status, created_at, updated_at).
- API routes di `server/index.js`:
  - `POST /api/coupon-packages` (Registrasi paket kupon baru + validasi unik serial_number).
  - `GET /api/coupon-packages` (List paket dengan filter/search query).
  - `GET /api/coupon-packages/:serial_number` (Cek status paket berdasarkan nomor seri).
  - `POST /api/coupon-packages/:id/void` (Nonaktifkan dan transfer sisa kuota ke nomor seri baru).

</code_context>

<specifics>
## Specific Ideas

- Lembaran kupon fisik pre-printed di sirkuit Mini 4WD umumnya dicetak per lembar berisi 50 kotak dengan nomor urut cetak (misal 001 s.d. 500) tanpa barcode/QR code. Kasir membutuhkan input form keyboard/numpad dengan autofocus instan agar input nomor seri dapat diselesaikan dalam hitungan detik.
- Tersedia tombol shortcut "Daftar Lembar Berikutnya (+1)" jika kasir sedang melayani pembalap yang membeli 2 atau lebih lembar kupon berurutan.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-Pre-Printed Coupon Package Registration & Cashier Flow*
*Context gathered: 2026-09-04*
