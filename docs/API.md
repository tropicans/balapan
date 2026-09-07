<!-- generated-by: gsd-doc-writer -->
# REST & WebSocket API Specification: DGDash Racing System

Dokumentasi lengkap seluruh REST API endpoint dan WebSocket event yang digunakan dalam DGDash Racing System.

## Authentication & Security

- **Arsitektur Jaringan**: Sistem beroperasi di lingkungan sirkuit tertutup (*closed local circuit LAN/Wi-Fi*).
- **Model Akses**: Pengguna diidentifikasi melalui `userId` atau registrasi kasir instan. Tindakan operasional (Race Director, Scrutineer, Marshal, Kasir) dilakukan secara semi-terbuka antar terminal panitia di subnet LAN sirkuit tanpa token JWT eksternal yang rumit untuk memaksimalkan kecepatan pergantian race di lapangan.

## Endpoints Overview

| Method | Path | Description | Auth / Role |
|--------|------|-------------|-------------|
| `GET` | `/api/health` | Status kesehatan server dan koneksi database SQLite. | Public |
| `GET` | `/api/state` | Snapshot state lengkap turnamen (active race, BTO, bracket, queue, ticket stats). | Public |
| `GET` | `/api/users` | Daftar seluruh peserta turnamen terdaftar. | Operator |
| `POST` | `/api/users/login` | Login peserta mandiri atau buat profil baru. | Participant |
| `POST` | `/api/users/profile` | Update Racer Tag / Nama Tim pembalap. | Participant |
| `POST` | `/api/users/guest` | Registrasi kilat pembalap tamu / anak oleh kasir. | Cashier |
| `POST` | `/api/coupons/topup` | Tambah saldo kupon digital peserta secara instan (+10, +50, +100). | Cashier |
| `GET` | `/api/coupon-packages` | Pencarian & daftar paket kupon fisik pre-printed 50-kotak. | Cashier |
| `GET` | `/api/coupon-packages/next-serial` | Mendapatkan nomor seri paket kupon berikutnya yang disarankan (auto-increment). | Cashier |
| `POST` | `/api/coupon-packages` | Registrasi paket kupon fisik baru (50 kuota) dan kaitkan ke peserta. | Cashier |
| `POST` | `/api/coupon-packages/:id/void` | Pembatalan lembar kupon rusak/hilang dan transfer sisa kuota ke serial baru. | Cashier |
| `POST` | `/api/race/scan` | Peserta mendaftar ke slot lintasan (Jalur A, B, C) via scan QR. | Participant |
| `POST` | `/api/race/ready` | Konfirmasi "SIAP BALAP" oleh peserta di jalurnya. | Participant |
| `POST` | `/api/race/cancel` | Pembatalan slot jalur oleh peserta sebelum balapan dikunci. | Participant |
| `POST` | `/api/race/lock` | Mengunci balapan, mendebit 1 kupon per peserta, dan mengunci tombol batal. | Race Director |
| `POST` | `/api/race/start` | Mengubah status balapan menjadi berlangsung (*running*). | Race Director |
| `POST` | `/api/race/finish` | Mencatat catatan waktu finish 3 stopwatch dan menentukan pemenang heat. | Race Director |
| `POST` | `/api/race/all-co` | Menutup balapan tanpa pemenang jika semua mobil klontang (kupon tetap terpotong). | Race Director |
| `POST` | `/api/race/re-race` | Mendeklarasikan balap ulang pada jalur terpilih dengan izin balap gratis (zero debit). | Race Director |
| `POST` | `/api/race/scrutineer` | Verifikasi fisik mobil pemenang (LOLOS / DQ). | Scrutineer |
| `POST` | `/api/race/scrutineer-override` | Tombol darurat juri untuk auto-placement pembalap ke bracket Babak 2. | Scrutineer |
| `POST` | `/api/race/override` | Assign manual peserta, force-ready, atau reset slot oleh RD. | Race Director |
| `POST` | `/api/bracket/advance` | Memajukan pemenang pertandingan bagan eliminasi 3-jalur ke babak berikutnya. | Race Director / Bracket |
| `POST` | `/api/countdown/start` | Memulai hitung mundur suara manusia 10 detik. | Race Director |
| `POST` | `/api/countdown/stop` | Menghentikan hitung mundur dan memicu sinyal GO / SIAP. | Race Director |
| `POST` | `/api/countdown/reset` | Mereset hitung mundur ke kondisi netral. | Race Director |
| `POST` | `/api/marshal/record-winner` | Marshal mencatat mobil finish, mencoret kotak kupon fisik, & menerbitkan tiket. | Marshal |
| `POST` | `/api/marshal/undo-last-winner` | Membatalkan pencatatan pemenang terakhir dalam toleransi waktu 60 detik. | Marshal |
| `GET` | `/api/marshal/recent-winners` | Histori 5 pemenang terakhir yang dicatat oleh Meja Start Box. | Marshal |
| `GET` | `/api/marshal/active-bracket-match` | Mengambil data pertandingan aktif bracket Babak 2 yang siap dijalankan. | Marshal |
| `POST` | `/api/marshal/record-bracket-winner` | 1-Tap selection pemenang pertandingan bracket Babak 2 di Meja Start Box. | Marshal |
| `GET` | `/api/tickets` | Daftar tiket lolos Babak 2 beserta status kuota dan critical indicator. | Race Director / TV |
| `POST` | `/api/tickets/lock-qualifying` | Menutup kualifikasi Babak 1 saat kuota tiket Babak 2 telah terpenuhi. | Race Director |
| `POST` | `/api/tickets/unlock-qualifying` | Membuka kembali kualifikasi Babak 1 jika ada kuota tambahan. | Race Director |

---

## Request & Response Formats

### 1. Standard Response Envelope
Seluruh endpoint REST merespons dengan envelope standar JSON:

**Sukses:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operasi berhasil"
}
```

**Gagal:**
```json
{
  "success": false,
  "error": "Pesan deskripsi kesalahan"
}
```

### 2. Contoh Request & Response

#### POST `/api/race/scan`
Request:
```json
{
  "userId": "user-andi",
  "lane": "A"
}
```
Response:
```json
{
  "success": true,
  "raceId": 1,
  "lane": "A",
  "message": "Berhasil terdaftar di Jalur A. Saldo kupon: 24"
}
```

#### POST `/api/marshal/record-winner`
Request:
```json
{
  "winnerUserId": "user-andi",
  "winnerLane": "A",
  "couponPackageId": 1
}
```
Response:
```json
{
  "success": true,
  "log": {
    "id": "log-xyz",
    "box_number": 12,
    "user_name": "Andi Pratama",
    "remaining_quota": 38
  },
  "ticket": {
    "ticket_number": "T-015",
    "racer_ticket_index": 2,
    "bracket_match_number": 5
  },
  "message": "Kupon Kotak #12 berhasil dicoret. Tiket T-015 diterbitkan!"
}
```

---

## Real-Time WebSocket Events (Socket.IO)

Server Socket.IO memancarkan event berikut ke seluruh klien yang terhubung:

| Event Name | Payload | Deskripsi |
|------------|---------|-----------|
| `STATE_UPDATE` | Full state object | Dipancarkan setiap kali ada perubahan status balapan, antrean, atau BTO. |
| `RACE_LOCKED` | `{ raceId, message }` | Memicu audio lock & getaran haptic saat balapan dikunci. |
| `COUNTDOWN_STARTED` | `{ seconds: 10, word: "Sepuluh" }` | Memulai overlay visual TV & sinkronisasi audio suara manusia. |
| `COUNTDOWN_TICK` | `{ seconds: 9, word: "Sembilan", haptic: true }` | Tik hitungan mundur per detik. |
| `COUNTDOWN_COMPLETE` | `{ word: "GO!", message: "GO! LEPAS MOBIL!" }` | Memicu sinyal pelepasan mobil. |
| `NEW_BTO_RECORD` | `{ racerName, teamName, time, rank }` | Memicu selebrasi pendar emas, sirene, dan confetti di Layar TV. |
| `RACE_ALL_CO` | `{ raceId, message }` | Memberitahukan seluruh layar bahwa semua mobil klontang tanpa pemenang. |
| `RACE_RERACE_DECLARED`| `{ reRaceLanes: ["A", "B"] }` | Memberitahukan deklarasi balap ulang bebas biaya. |
| `ticket:granted` | `{ ticket: { ticket_number, racer_ticket_index, bracket_match_number } }` | Memicu modal selebrasi emas kualifikasi Babak 2 dan chime lonceng. |
| `qualifying:locked` | `{ target_quota, total_issued }` | Menampilkan banner broadcast merah bahwa kualifikasi resmi ditutup. |

---

## Error Codes

| Kode HTTP | Makna | Skenario Penggunaan |
|-----------|-------|---------------------|
| `200 OK` | Sukses | Request berhasil diproses. |
| `400 Bad Request` | Permintaan tidak valid | Parameter tidak lengkap, kupon habis, atau format nomor seri salah. |
| `404 Not Found` | Tidak ditemukan | Peserta, paket kupon, atau pertandingan bracket tidak ditemukan. |
| `409 Conflict` | Konflik data | Jalur sudah diisi peserta lain, nomor seri kupon duplikat, atau race locked. |
| `500 Internal Server Error`| Kesalahan server | Kegagalan transaksi disk database SQLite. |

## Rate Limits
Karena dirancang untuk jaringan tertutup sirkuit (*Intranet / LAN Hotspot*), API tidak memberlakukan throttle kuota request eksternal yang membatasi jalannya turnamen, melainkan menggunakan mekanisme database atomic lock untuk menjamin keamanan konkurensi.
