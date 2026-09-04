# Architecture Research

**Domain:** Physical Coupon & Marshal-Driven Tournament System
**Researched:** 2026-09-04
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                             PRESENTATION                               │
├───────────────────┬──────────────────────┬─────────────────────────────┤
│ Cashier / Print   │ Marshal Start Box    │ Race Director & Circuit TV  │
│ - Register Racer  │ - Fast 3-Lane Setup  │ - Launch Countdown          │
│ - 50-Box Print CSS│ - 1-Tap Coupon Debit │ - Finish / DNF Input        │
│                   │ - Barcode Scan/Lookup│ - Live Ticket Showcase      │
├───────────────────┴──────────────────────┴─────────────────────────────┤
│                       SOCKET.IO & REALTIME SYNC                        │
├────────────────────────────────────────────────────────────────────────┤
│ Events: marshal:lineup, race:start, race:finish, ticket:granted        │
├────────────────────────────────────────────────────────────────────────┤
│                       BACKEND BUSINESS LOGIC                           │
├───────────────────┬──────────────────────┬─────────────────────────────┤
│ Coupon Manager    │ Race Flow & State    │ Elimination Bracket Auto-Adv│
│ - Issue Package   │ - Lock / Unlock      │ - Auto-seed Round 2 slot    │
│ - Validate Quota  │ - Record Times       │ - Generate Next-Round Ticket│
├───────────────────┴──────────────────────┴─────────────────────────────┤
│                         SQLITE WASM STORAGE                            │
├────────────────────────────────────────────────────────────────────────┤
│ tables: users, coupon_packages, matches, race_logs, next_round_tickets │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `CouponPrintModal.jsx` / Print View | Render 50-box grid with package serial barcode, participant name/team, ready for `@media print` | React functional component with high-contrast monochrome print CSS |
| `MarshalDashboard.jsx` | Super fast mobile/tablet view for Track Marshal to assign Lane A, B, C and deduct run quota | Large touch targets, quick autocomplete search, vibration feedback on line-up confirmation |
| `ticketService.js` / Route API | Generate and track "Kupon Babak Berikutnya" upon valid race finish | Atomic database transaction creating ticket and updating bracket match `user_id` |
| `RealtimeTV.jsx` (Ticket HUD) | Live ticker / leaderboard displaying participants who secured Round 2 tickets | Marquee or split-card HUD overlay synced via WebSocket |

## Database Schema Extensions

```sql
-- Track physical coupon packages issued to racers
CREATE TABLE IF NOT EXISTS coupon_packages (
    id TEXT PRIMARY KEY,
    package_code TEXT UNIQUE NOT NULL, -- e.g. "PKG-2026-001"
    user_id TEXT NOT NULL,
    total_quota INTEGER NOT NULL DEFAULT 50,
    used_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, DEPLETED, VOID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Track tickets earned for next round (e.g. Babak 2)
CREATE TABLE IF NOT EXISTS next_round_tickets (
    id TEXT PRIMARY KEY,
    ticket_code TEXT UNIQUE NOT NULL, -- e.g. "TKT-B2-042"
    user_id TEXT NOT NULL,
    source_match_id TEXT,
    target_round INTEGER NOT NULL DEFAULT 2,
    finish_time REAL,
    status TEXT NOT NULL DEFAULT 'ISSUED', -- ISSUED, CLAIMED, USED
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
```

## Data Flow: Race Execution with Physical Coupon

1. **Pendaftaran:** Kasir input nama peserta -> Pilih paket (50 kupon) -> Cetak lembar kupon fisik berisi barcode & 50 kotak.
2. **Start Box:** Pembalap antri membawa kupon fisik -> Marshal pilih nama/scan barcode lembar -> Marshal pilih Jalur (A/B/C) -> Sistem catat kupon ke-N dipakai -> Marshal mencoret nomor ke-N pada lembar fisik.
3. **Race:** Race Director klik Mulai Balap -> Countdown -> Balapan berlangsung.
4. **Finish:** 
   - Jika **Klontang (CO)**: Kupon tetap hangus, tidak ada tiket babak berikutnya.
   - Jika **FINISH**: Race Director masukkan waktu -> Sistem otomatis buat record di `next_round_tickets` & tempatkan pembalap ke slot kosong Babak 2 di tabel `matches`.
   - Layar TV Sirkuit langsung memunculkan selebrasi "TIKET BABAK 2 DIAMANKAN!".

---
*Architecture research for: Physical Coupon & Marshal-Driven Tournament System*
*Researched: 2026-09-04*
