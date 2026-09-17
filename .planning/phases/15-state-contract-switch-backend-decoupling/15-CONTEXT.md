# Phase 15: State Contract Switch & Backend Decoupling/Removal - Context

**Gathered:** 2026-09-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Fase ini melakukan switch kontrak state backend dan de-coupling dari modul v1/v2 (kupon, tiket, race engine digital):
1. **New State Contract (MIG-03, MON-05):**
   - `getFullState()` beralih sepenuhnya menyiarkan:
     - `activeEvent`: metadata event aktif saat ini.
     - `participants`: daftar peserta event aktif (id, nama, tim, nomor peserta).
     - `bracketMatches`: bagan eliminasi ter-scope event aktif (Round 2 s/d Grand Final).
     - `btoLeaderboard`: top-N catatan waktu terbaik manual dari `bto_records`.
     - `settings`: pengaturan turnamen aktif.
     - `serverTime`: ISO timestamp.
   - Menghentikan ketergantungan pada `ticketStats`, `activeRace`, `scrutineerQueue`, `upcomingRaces`.
2. **Coupon Decoupling (MIG-03):**
   - Menghapus query `JOIN coupons` pada endpoint `/api/users`.
   - Mengisolasi dan memotong ketergantungan circular `ticketEngine.js` dan `raceManager.js`.
   - `/api/state` mengembalikan 200 dengan payload state baru.
3. **Realtime Event Stream (MON-05):**
   - Memastikan `STATE_UPDATE`, `participant_registered`, `participant_updated`, `bto:updated`, `NEW_BTO_RECORD`, `winner_registered`, `winner_undone`, dan `bracket_updated` bekerja serasi.

Fase ini **tidak** mengubah layout UI atau menghapus screen frontend (Phase 16) dan **tidak** men-drop tabel fisik di SQLite (Phase 17).

</domain>

<decisions>
## Implementation Decisions

- **D-01 (State Contract Shape):** Payload `getFullState()` mengembalikan:
  ```json
  {
    "activeEvent": { ... },
    "participants": [ ... ],
    "bracketMatches": [ ... ],
    "btoLeaderboard": [ ... ],
    "settings": { ... },
    "serverTime": "..."
  }
  ```
  Untuk backwards-compatibility sementara layar TV / Dashboards di Phase 15 belum di-rewrite, field `activeRace`, `upcomingRaces`, `scrutineerQueue`, dan `ticketStats` dapat disediakan dummy/safe default (kosong/mock) agar client v2 tidak melempar uncaught reference exception sebelum Phase 16.
- **D-02 (Clean User Query):** Query `/api/users` tidak lagi melakukan `LEFT JOIN coupons c ON u.id = c.user_id`.
- **D-03 (Decoupling Bracket & State):** Helper bracket dan state query dipisahkan secara bersih sehingga server boot mandiri tanpa circular dependency.
</decisions>
