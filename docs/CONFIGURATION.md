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
