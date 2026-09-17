<!-- generated-by: gsd-doc-writer -->
# Configuration Guide: DGDash Racing System

Panduan lengkap mengenai variabel lingkungan (*environment variables*), format berkas konfigurasi, nilai default, dan pengaturan lingkungan untuk DGDash Racing System.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Optional | `3000` | Port TCP internal yang digunakan server Express dan Socket.IO untuk menerima koneksi HTTP/WebSocket. |
| `NODE_ENV` | Optional | `development` | Mode eksekusi aplikasi (`development` atau `production`). Pada mode produksi, Express melayani bundel statis dari `client/dist`. |
| `DB_PATH` | Optional | `./tamiya.sqlite` (lokal) / `/app/data/tamiya.sqlite` (Docker) | Lokasi berkas penyimpanan persisten database SQLite di filesystem. |
| `HOST_PORT` | Optional | `3050` | Port TCP mesin host yang di-mapping ke port internal container pada `docker-compose.yml`. |
| `SEED_DEMO_DATA` | Optional | `false` | Bila `true`, database mengisi data dummy (pembalap demo, Race #1, bracket contoh) saat pertama kali dibuat. Biarkan `false`/kosong di produksi. Hanya dipakai untuk demo lokal dan test otomatis. |

## Config File Format

DGDash Racing System membaca konfigurasi lingkungan melalui file `.env` di root repository yang dimuat otomatis oleh library `dotenv`.

Contoh file `.env`:

```env
# ===================================================
# DGDash Racing System - Configuration
# ===================================================

# Node Environment: 'production' atau 'development'
NODE_ENV=production

# Host Port Mapping (menghindari konflik dengan service lain di port 3000)
HOST_PORT=3050

# Internal Server Port
PORT=3000

# SQLite Database Storage Filepath
DB_PATH=/app/data/tamiya.sqlite

# Demo seed data (dummy). Kosongkan/false di produksi.
SEED_DEMO_DATA=false
```

## Required vs Optional Settings

- **Semua pengaturan bersifat Opsional dengan nilai fallback otomatis**:
  - Jika `PORT` tidak didefinisikan, server otomatis beralih ke port `3000`.
  - Jika `DB_PATH` tidak didefinisikan, backend membuat berkas database `tamiya.sqlite` di root direktori project.
  - Jika `NODE_ENV` tidak didefinisikan, sistem berjalan dalam mode `development`.
- **Validasi Runtime**:
  - Pada lingkungan Docker, direktori penyimpanan target (`/app/data`) dipersiapkan dengan kepemilikan user non-root `node:node` untuk memastikan izin baca/tulis SQLite WASM.

## Defaults

| Variabel | Sumber Default | Nilai Default |
|----------|----------------|---------------|
| `process.env.PORT` | `server/index.js:20` | `3000` |
| `process.env.DB_PATH` | `server/db.js:15` | `path.join(__dirname, '../tamiya.sqlite')` |
| `process.env.NODE_ENV` | `server/index.js:19` | `'development'` |
| `SEED_DEMO_DATA` | `server/db.js` | tidak diisi (data demo nonaktif) |
| `HOST_PORT` | `docker-compose.yml:10` | `3050` |

## Per-Environment Overrides

### 1. Local Development Mode
Pada mode pengembangan lokal, Vite dev server berjalan di port `5173` dan mem-proxy request API & WebSocket ke Express server di port `3000`:
- **Vite Proxy Config (`client/vite.config.js`)**:
  - `/api` $\rightarrow$ `http://localhost:3000`
  - `/socket.io` $\rightarrow$ `http://localhost:3000` (dengan WebSocket upgrade `ws: true`)

### 2. Production Docker Deployment
Pada mode produksi kontainer, Vite dikompilasi menjadi aset statis murni di `client/dist`. Server Express melayani file statis tersebut secara langsung dari port `3000`, yang di-expose ke host pada port `3050`:
```yaml
ports:
  - "${HOST_PORT:-3050}:3000"
environment:
  - NODE_ENV=production
  - PORT=3000
  - DB_PATH=/app/data/tamiya.sqlite
volumes:
  - dgdash_data:/app/data
```

### 3. Circuit Closed LAN / Hotspot Setup
Ketika sistem dioperasikan di arena sirkuit menggunakan router Wi-Fi lokal:
- Cukup hubungkan perangkat juri, marshal, kasir, dan HP peserta ke subnet Wi-Fi yang sama (misal `192.168.1.x`).
- Buka alamat IP host laptop server dari browser perangkat manapun:
  `http://<IP-LAPTOP-SERVER>:3050`

## Roster Import (STC Vol. 8)

Daftar pembalap hasil penjualan kupon dapat diimport dari CSV:

```bash
# Lokal (DB default data/tamiya.sqlite)
npm run import:roster

# Preview tanpa menulis database
node scripts/import-roster.js --dry

# Target database tertentu
node scripts/import-roster.js --db path/ke/tamiya.sqlite
```

CSV default: `data/stc-vol8-roster.csv`. Format kolom:
`No., Nama Racer, Jumlah Kupon, Pembayaran, Status, Side Event (GTA), Best Race`

Pemetaan ke database:
- Setiap nama → satu baris `users` (unik, idempotent). Nama yang muncul lagi → paket kupon tambahan.
- `Presale (40 Runs)` → `coupon_packages.package_type='presale'`, kuota 40, harga `Rp175.000`.
- `OTS (40 Runs)` → `package_type='ots'`, kuota 40, harga `Rp200.000`.
- `Top Up (20 Runs)` → `package_type='topup'`, kuota 20, harga `Rp80.000`.
- Baris bernama tanpa `Status` (mis. Unyil/Organic/Ryu) → `package_type='comp'`, kuota 40, harga 0.
- `Side Event (GTA) = 1` → `users.side_event_gta = 1`.
- `coupons.balance` disinkronkan = total `remaining_quota` paket aktif user.
- Nomor seri digenerate: `STC8-{PRE|OTS|TOP|COMP}-{no}-{set}`.

**Penting (Docker):** server menyimpan snapshot database di memori dan menulis ulang saat shutdown. Jalankan import saat server **berhenti**, lalu start ulang:

```bash
docker compose stop
docker compose run --rm dgdash-app node scripts/import-roster.js --csv /app/seed/stc-vol8-roster.csv
docker compose start
```
