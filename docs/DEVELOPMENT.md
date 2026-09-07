<!-- generated-by: gsd-doc-writer -->
# Development Guide: DGDash Racing System

Panduan pengembangan lokal bagi kontributor dan engineer yang memelihara atau menambahkan fitur baru pada DGDash Racing System.

## Local Setup

1. **Clone dan Install**:
   ```bash
   git clone <repository-url>
   cd balapan
   npm install
   npm --prefix client install
   ```

2. **Persiapan Lingkungan**:
   ```bash
   cp .env.example .env
   ```

3. **Menjalankan Mode Development**:
   Jalankan server backend dan frontend Vite secara bersamaan menggunakan `concurrently`:
   ```bash
   npm run dev
   ```
   - **Backend**: Berjalan di `http://localhost:3000` dengan `--watch` auto-restart pada perubahan kode di `server/`.
   - **Frontend (Vite SPA)**: Berjalan di `http://localhost:5173` dengan Fast Refresh (HMR).

## Build Commands

### Root Commands (`package.json`)

| Perintah | Deskripsi |
|----------|-----------|
| `npm run dev` | Menjalankan backend (`dev:server`) dan client (`dev:client`) secara paralel. |
| `npm run dev:server` | Menjalankan server Node.js dengan `--watch` auto-restart. |
| `npm run dev:client` | Menjalankan Vite dev server di direktori `client/`. |
| `npm run build` | Mengompilasi frontend React SPA ke direktori `client/dist`. |
| `npm start` | Menjalankan server backend produksi pada port yang dikonfigurasi. |
| `npm test` | Menjalankan seluruh test suite otomatis di `server/tests/`. |
| `npm run docker:build` | Melakukan build image Docker `dgdash-racing-system:latest`. |
| `npm run docker:up` | Menjalankan container Docker di background dengan `docker compose up -d`. |
| `npm run docker:down` | Menghentikan container Docker secara aman. |
| `npm run docker:logs` | Menampilkan log container secara real-time. |
| `npm run docker:restart` | Me-restart container Docker. |

### Frontend Commands (`client/package.json`)

| Perintah | Deskripsi |
|----------|-----------|
| `npm --prefix client run dev` | Menjalankan dev server Vite di port 5173. |
| `npm --prefix client run build` | Menjalankan Vite build (`dist/`). |
| `npm --prefix client run preview` | Meninjau hasil kompilasi produksi secara lokal. |

## Code Style & Architecture Conventions

### 1. Desain Sistem Cyberpunk & Warna Neon
Gunakan token warna tailwind yang telah didefinisikan pada konfigurasi:
- **Midnight Obsidian**: `#0a0b10` (Background utama dasbor)
- **Obsidian Dark**: `#12131c` (Card & panel)
- **Neon Pink (Jalur A)**: `#ff0055`
- **Electric Cyan (Jalur B)**: `#00f0ff`
- **Acid Green (Jalur C)**: `#39ff14`
- **Neon Amber (Warning/Auto-Advance)**: `#ffaa00`
- **Cyber Silver**: `#e2e8f0` (Tipografi kontras tinggi)

### 2. Frontend State & WebSocket
- Semua data balapan terpusat di `client/src/context/RaceContext.jsx`.
- Komponen harus mendengarkan update melalui hook `useRace()`.
- Hindari *direct state mutation* di luar context wrapper.

### 3. Backend Database Persistence
- Backend menggunakan `server/db.js` yang membungkus database SQLite WASM (`sql.js`).
- Setiap transaksi write harus memanggil `db.saveToDisk()` untuk menjamin persistensi data ke filesystem.
- Gunakan *prepared statements* via `db.prepare()` untuk mencegah SQL injection.

## Branch Conventions

- **Default Branch**: `main`
- **Feature Branches**: `feat/<nama-fitur>` (contoh: `feat/bracket-3lane-auto-advance`)
- **Bugfix Branches**: `fix/<nama-bug>` (contoh: `fix/bracket-cfg-reference`)
- **Documentation**: `docs/<nama-dokumen>`

## PR Process

1. **Buat Test Reproduksi**: Sebelum memperbaiki bug atau membuat fitur baru, buat unit/integration test di `server/tests/`.
2. **Validasi Test Suite**: Pastikan seluruh test lulus 100%:
   ```bash
   npm test
   ```
3. **Validasi Build Frontend**: Pastikan Vite dapat mengompilasi bundel tanpa error TypeScript/JSX:
   ```bash
   npm run build
   ```
4. **Commit Atomik**: Gunakan format conventional commits (contoh: `feat(marshal): add 60s undo window`, `fix(bracket): resolve cfg undefined error`).
5. **Kirim Pull Request**: Ajukan PR ke branch `main` dengan ringkasan perubahan dan referensi test yang membuktikannya.
