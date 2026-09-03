# Phase 6: Multi-Round Scalable Elimination Dashboard UI - Research

**Researched:** 2026-09-03  
**Domain:** React Frontend, Cyberpunk UI/UX, Large-Scale Virtualized Tournament Bracket, Responsive Layouts  
**Confidence:** HIGH  

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **ELIM-04** | Antarmuka dasbor eliminasi (`BracketDashboard.jsx`) mengadopsi navigasi berjenjang (*Round Selector Tabs*: Babak 2, Babak 3, Babak 4, Grand Final) dengan label jumlah heat aktif. | [VERIFIED: client/src/screens/BracketDashboard.jsx:10-15] Sebelumnya data dipilah secara kaku (`round1Matches`, `round2Matches`, `round3Matches`) ke 3 kolom statis (Quarterfinals, Semifinals, Grand Final). Harus diubah menjadi navigasi tab dinamis yang membaca ronde-ronde yang ada dari `raceState.bracketMatches` (Babak 2, Babak 3, Babak 4, Grand Final), lengkap dengan badge jumlah heat (misal: "10 Heat • 3 Selesai"). |
| **ELIM-05** | Setiap kartu pertandingan menampilkan 3 baris pembalap ber-aksen warna jalur resmi (Line A Merah/Pink, Line B Cyan/Biru, Line C Hijau) dengan tombol "MENANG" dan ikon mahkota juara. | [VERIFIED: client/src/screens/BracketDashboard.jsx:44-93] Sebelumnya `renderMatchCard` hanya menampilkan 2 kontestan (`user_1_name`, `user_2_name`). Perlu ditambahkan kontestan ke-3 (`user_3_name`, `user_3_team`, `user_id_3`), dengan styling baris jalur terpisah: Line A Pink (`border-neonPink/40 bg-neonPink/5`), Line B Cyan (`border-neonCyan/40 bg-neonCyan/5`), Line C Green (`border-neonGreen/40 bg-neonGreen/5`). |
| **ELIM-06** | Terdapat filter pencarian cepat (berdasarkan nomor heat atau nama/tim pembalap) serta pagination/virtual grouping agar 100+ heat dapat dijelajahi dengan lancar tanpa lag. | [VERIFIED: client/src/screens/BracketDashboard.jsx] Untuk mendukung turnamen skala masif hingga 100+ heat, komponen memerlukan: input search bar real-time (nomor match, nama racer, atau tag tim), filter status (Semua / Pending / Selesai), dan sistem pagination (misal 12 heat per halaman) agar DOM tetap ringan dan render mulus 60fps. |
| **ELIM-07** | Navigasi utama Navbar memperbarui tab dari *"Bracket Babak 2"* menjadi *"Babak Eliminasi"*. | [VERIFIED: client/src/components/ui/Navbar.jsx:38] Tab navigation di `Navbar.jsx` baris 38 masih bertuliskan `label: 'Bracket Babak 2'`. Perlu diperbarui menjadi `label: 'Babak Eliminasi'` dengan tetap mempertahankan `id: 'bracket'` demi kestabilan routing internal. |
</phase_requirements>

---

## Summary

Phase 6 berfokus pada penyegaran dan modernisasi menyeluruh terhadap antarmuka dasbor turnamen eliminasi di sisi client (`client/src/screens/BracketDashboard.jsx` dan `client/src/components/ui/Navbar.jsx`). Pada Phase 5, backend engine telah sukses dirombak untuk mendukung format 3-jalur (Jalur A Pink, Jalur B Cyan, Jalur C Green) serta pembuatan heat dinamis hingga 100+ heat dan auto-advance promosi 3:1. Namun, UI frontend saat ini masih tertinggal pada format 2-kontestan kaku (8-slot single elimination) dan layout 3-kolom statis (Quarterfinals, Semifinals, Grand Final).

Dengan arsitektur baru, antarmuka harus memfasilitasi operator Race Director (RD) dan penonton turnamen dalam mengelola puluhan hingga ratusan heat eliminasi tanpa kebingungan layout atau lag visual:
1. **Navigasi Berjenjang (*Round Selector Tabs*)**: Tab selektor dinamis untuk berpindah antar babak (`Babak 2 (Penyisihan 3-Jalur)`, `Babak 3 (Semifinal)`, `Babak 4`, `Grand Final`). Tiap tab menampilkan indikator jumlah heat total dan selesai.
2. **Kartu Pertandingan 3-Jalur Ergonomis**: Setiap kartu heat menampilkan header nomor heat, status (`PENDING` vs `SELESAI`), dan 3 baris pembalap dengan aksen warna jalur resmi (Pink, Cyan, Green). Jika slot kosong, tampilkan placeholder cyberpunk informatif ("Menunggu Lolos Babak 1..." atau "Menunggu Pemenang Heat...").
3. **Pencarian Cepat & Pagination (100+ Heats)**: Dilengkapi pencarian instan (filter nomor heat atau nama/tim pembalap) dan pagination cyberpunk (misal 12 heat per halaman) dengan navigasi halaman yang nyaman.
4. **Pembaruan Navigasi Utama Navbar**: Label tab navigasi di `Navbar.jsx` diperbarui dari *"Bracket Babak 2"* menjadi *"Babak Eliminasi"*.

---

## Architectural Responsibility Map

| Komponen / Modul | Peran & Tanggung Jawab | File Terkait |
|------------------|------------------------|--------------|
| **`Navbar.jsx`** | Memperbarui label navigasi utama menjadi *"Babak Eliminasi"* dengan tetap menjaga konsistensi state navigasi aplikasi. | `client/src/components/ui/Navbar.jsx` |
| **`BracketDashboard.jsx`** | Komponen utama penampil bagan turnamen eliminasi multi-babak, filter, pagination, dan kartu pertandingan 3-jalur. | `client/src/screens/BracketDashboard.jsx` |
| **`RaceContext.jsx`** | Menyediakan state real-time `bracketMatches` dan wrapper fungsi `apiAdvanceBracket(matchId, winnerId, options)` untuk memanggil endpoint `/api/bracket/advance`. | `client/src/context/RaceContext.jsx` |
| **`index.css`** | Menyediakan styling cyber glow dan utilities visual pendukung kartu eliminasi 3-jalur. | `client/src/index.css` |

---

## Standard Stack

| Library / Tool | Versi Terverifikasi | Purpose | Why Standard |
|----------------|---------------------|---------|--------------|
| `react` | `^18.3.1` | View library | [VERIFIED: client/package.json:15] Core UI runtime. |
| `lucide-react` | `^0.475.0` | Cyberpunk icons | [VERIFIED: client/package.json:14] Ikon standar: `GitBranch`, `Trophy`, `Zap`, `Crown`, `Search`, `ChevronLeft`, `ChevronRight`, `Filter`. |
| `clsx` | `^2.1.1` | Class composition | [VERIFIED: client/package.json:13] Manajemen class dinamis Tailwind. |
| Tailwind CSS | `^3.4.17` | Utility-first CSS | [VERIFIED: client/package.json:28] Styling cyberpunk palette eksisting (`neonPink`, `neonCyan`, `neonGreen`, `neonAmber`, `obsidian`, `midnight`). |

---

## Technical Design & Layout Specifications

### 1. Round Selector Tabs
- Ambil semua distinct `round_number` dari `raceState.bracketMatches`.
- Urutkan ronde: `[2, 3, 4, ...]` di mana ronde terendah adalah Babak 2 (Eliminasi Awal) dan ronde tertinggi adalah Grand Final.
- Berikan label deskriptif:
  - Ronde 2: `BABAK 2 // PENYISIHAN 3-JALUR`
  - Ronde 3 (jika ada ronde 4): `BABAK 3 // PEREMPAT FINAL / SEMIFINAL`
  - Ronde Tertinggi: `GRAND FINAL // KEJUARAAN`
- Setiap tab memiliki badge ringkasan: `X Heat • Y Selesai`.
- State tab aktif dikontrol oleh state `selectedRound` (default: Babak 2 atau ronde aktif pertama).

### 2. Ergonomic 3-Lane Heat Cards
- **Line A**: Border `border-neonPink/40`, background `bg-neonPink/5`, badge teks `LINE A`, nama racer & team tag.
- **Line B**: Border `border-neonCyan/40`, background `bg-neonCyan/5`, badge teks `LINE B`, nama racer & team tag.
- **Line C**: Border `border-neonGreen/40`, background `bg-neonGreen/5`, badge teks `LINE C`, nama racer & team tag.
- **Tombol MENANG**: Muncul pada pembalap yang terisi jika match belum selesai (`!isCompleted`). Mengirim `handleSelectWinner(match.id, userId, { isFinal: match.is_final || isHighestRound })`.
- **Status Pemenang**: Jika `winnerId === userId`, kartu pembalap menyala hijau neon dengan ikon mahkota `Crown` dan badge `PEMENANG / LOLOS`.

### 3. High-Volume Search, Filter & Pagination
- **Search Query State**: `searchQuery` mencocokkan nomor match (misal `"10"`), nama pembalap (`"Andi"`), atau tim (`"RRT"`).
- **Status Filter State**: `statusFilter` (`'all'`, `'pending'`, `'completed'`).
- **Pagination**:
  - `ITEMS_PER_PAGE = 12` (grid 3x4 pada desktop, responsif 1-kolom pada mobile).
  - Kontrol navigasi: `Previous Page`, `Halaman X dari Y`, `Next Page`.
  - Jika hasil filter/search kosong, tampilkan pesan cyber informatif: `"Tidak ada heat yang cocok dengan pencarian"`.

### 4. Navbar Screen Update
- Di `Navbar.jsx`:
  ```javascript
  { id: 'bracket', label: 'Babak Eliminasi', icon: GitBranch, color: 'pink' }
  ```

---

## Validation Architecture

### Automated Verification
1. **Client Production Bundle Build**:
   ```bash
   npm --prefix client run build
   ```
   Memastikan kompilasi Vite/Tailwind 100% sukses tanpa sintaks error atau missing imports.
2. **Backend Regression Verification**:
   ```bash
   & "C:\Users\yudhiar\AppData\Local\nvm\v22.22.3\node.exe" server/tests/bracket-3lane.test.js
   & "C:\Users\yudhiar\AppData\Local\nvm\v22.22.3\node.exe" server/tests/race-flow.test.js
   ```
   Memastikan seluruh API endpoint dan socket flow tetap lulus 100%.

### Manual Inspection & UI Acceptance Checkpoints
1. Buka Dasbor Eliminasi melalui tab **"Babak Eliminasi"** di Navbar.
2. Verifikasi tab selektor menampilkan babak-babak dengan badge jumlah heat.
3. Verifikasi kartu pertandingan menampilkan 3 baris pembalap (Line A Pink, Line B Cyan, Line C Green).
4. Coba tombol "MENANG" pada pembalap dan pastikan pemenang ter-highlight mahkota serta otomatis mengisi babak berikutnya.
5. Coba fitur pencarian nomor heat dan nama pembalap.
6. Coba navigasi pagination saat heat melebihi 12.
