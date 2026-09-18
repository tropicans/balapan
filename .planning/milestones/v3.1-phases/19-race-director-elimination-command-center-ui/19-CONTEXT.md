# Phase 19: Race Director Elimination Command Center UI - Context

**Gathered:** 2026-09-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Mentransformasi antarmuka Dasbor Race Director (`/director`) menjadi Pusat Komando Eliminasi modern yang berfokus pada Babak 2 hingga Grand Final: menggantikan kontrol digital lawas dengan visual bagan eliminasi 3-jalur, pemilihan pemenang 1-klik instan, visual status heat (pending vs selesai), ringkasan counter progres ronde, serta tombol & modal konfirmasi "Finalisasi / Kunci Babak 2" dengan fitur emergency unlock.

</domain>

<decisions>
## Implementation Decisions

### Tata Letak & Pembersihan Kontrol Digital Lama
- **D-01:** **Pembersihan Kontrol Usang:** Tab utama `KONTROL HEAT BALAPAN` digantikan seutuhnya oleh antarmuka **Pusat Komando Eliminasi**. Seluruh kontrol digital lawas (stopwatch finish inputs horizontal, tombol mulai/kunci balapan digital, countdown suara, modal re-race, dan admin override manual) yang sudah usang dibersihkan dari `/director`.
  — **Reversibility:** reversible.
- **D-02:** **Header Dasbor & BTO:** Header atas dasbor tetap mempertahankan informasi Active Event, tombol kontrol `BUKA / KUNCI KUALIFIKASI` (Babak 1), serta tab navigasi menuju `MANAJEMEN BTO MANUAL`.
  — **Reversibility:** reversible.

### Banner Progres & Mekanisme Kunci Babak 2
- **D-03:** **Banner Toolbar Babak 2:** Pada tampilan Babak 2, disajikan banner progres ronde yang menampilkan:
  - Counter progres: `X / Y Heat Selesai` (persentase selesai).
  - Status Babak: Badge `TERBUKA (OPEN)` berwarna cyan vs `TERKUNCI (FINALIZED)` berwarna pink/amber.
  - Tombol **FINALISASI / KUNCI BABAK 2**: Disabled dengan tooltip informasi sisa heat selama masih ada heat yang pending. Menyala aktif (neon gold/amber pulse) saat 100% heat Babak 2 telah berstatus selesai.
  — **Reversibility:** reversible.
- **D-04:** **Modal Konfirmasi & Emergency Unlock:**
  - Menekan tombol finalisasi membuka modal konfirmasi: *"Kunci Babak 2 dan amankan bagan Babak 3?"*.
  - Setelah Babak 2 berstatus `'locked'`, tombol berubah menjadi tombol aksi **BUKA KUNCI BABAK 2** (Emergency Unlock) yang dapat digunakan Race Director untuk membuka kunci jika perlu merevisi hasil heat.
  — **Reversibility:** reversible.

### Interaksi 1-Klik Pemenang Heat & Visual Status
- **D-05:** **1-Klik Instan Tanpa Pop-up:** Menekan tombol `MENANG` pada jalur kontestan langsung mengeksekusi penetapan pemenang tanpa dialog konfirmasi tambahan (dioptimalkan untuk kecepatan operasional di pinggir sirkuit).
  — **Reversibility:** reversible.
- **D-06:** **Diferensiasi Visual Heat Selesai vs Pending:**
  - **Heat Pending:** Border abu-abu/amber dengan badge status `PENDING` berkedip halus.
  - **Heat Selesai:** Border hijau neon (`border-neonGreen/60`), background tint lembut, badge `SELESAI` dengan centang hijau, dan kontestan pemenang dihiasi mahkota emas (`JUARA`).
  - Saat Babak 2 berstatus terkunci, tombol `MENANG` pada heat Babak 2 dinonaktifkan/disembunyikan untuk mencegah salah klik.
  — **Reversibility:** reversible.

### Navigasi Ronde & Filter Cepat
- **D-07:** **Navigasi Ronde:** Tab ronde dinamis untuk berpindah antara Babak 2, Babak 3 / Perempat Final, hingga Grand Final.
- **D-08:** **Pencarian & Filter:** Search bar instan untuk mencari nomor heat (#12), nama pembalap, atau tim, serta filter status (Semua, Pending, Selesai).
  — **Reversibility:** reversible.

### the agent's Discretion
- Penataan Cyberpunk visual styling (warna border, bayangan glow, penempatan icon) agar konsisten dengan tema dark obsidian / neon racing.
- Penyesuaian responsivitas layout kartu heat untuk tablet dan desktop.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Frontend UI Components
- `client/src/screens/RaceDirectorDashboard.jsx` — Layar dasbor Race Director yang akan ditransformasi
- `client/src/screens/BracketDashboard.jsx` — Komponen acuan bagan pertandingan 3-jalur dan match card
- `client/src/components/director/BtoManager.jsx` — Komponen tab BTO yang tetap dipertahankan
- `client/src/context/RaceContext.jsx` — Provider state dan method API bracket (`apiAdvanceBracket`, `apiLockQualifying`, `apiUnlockQualifying`)

### Backend REST Endpoints (Phase 18)
- `POST /api/bracket/lock-round` — Endpoint penguncian babak
- `POST /api/bracket/unlock-round` — Endpoint buka kunci darurat
- `GET /api/bracket/progress` — Endpoint query progres ronde

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `renderMatchCard` dan `renderContestantRow` dari `BracketDashboard.jsx`: Pola tampilan 3-jalur (Jalur A Pink, Jalur B Cyan, Jalur C Green) yang teruji.
- `useRace()` hook: Menyediakan `raceState` (`bracketMatches`, `round2_status`, `round2_progress`), `socket`, dan API methods.
- UI components: `CyberButton`, `CyberCard`, modal konfirmasi cyberpunk.

### Established Patterns
- Dialog modal konfirmasi berbasis Tailwind CSS backdrop blur dengan warna aksen neon.
- Socket.IO listener untuk reaktivitas instan (`bracket_updated`, `round2:locked`, `round2:unlocked`).

### Integration Points
- Menggantikan render tab `'race'` di `RaceDirectorDashboard.jsx` dengan komponen Dasbor Eliminasi atau embedding langsung.
- Menambahkan method `apiLockRound(round)` dan `apiUnlockRound(round)` di `RaceContext.jsx`.

</code_context>

<specifics>
## Specific Ideas

- Banner progres di atas bagan Babak 2 memberikan feedback instan kepada Race Director tentang berapa heat lagi yang harus diselesaikan sebelum Babak 3 bisa dimulai.
- Tombol Kunci Babak 2 yang menyala animasi pulse saat 100% selesai memberikan cue visual yang jelas tanpa membebani operator.

</specifics>

<deferred>
## Deferred Ideas

- Penambahan shortcut keyboard untuk pemilihan pemenang jalur A, B, C (dapat dipertimbangkan pada update ergonomi berikutnya).

</deferred>

---

*Phase: 19-race-director-elimination-command-center-ui*
*Context gathered: 2026-09-18*
