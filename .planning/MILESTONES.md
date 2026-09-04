# Project Milestones

## v1.2: Multi-Round 3-Lane Elimination System
- **Shipped:** 2026-09-03
- **Phases:** 2 (Phases 5-6)
- **Plans:** 2
- **Requirements Satisfied:** 3/3 (`ELIM-01`, `ELIM-02`, `ELIM-03`)
- **Key Accomplishments:**
  - Multi-Round 3-Lane Bracket schema with `user_id_3` support in matches table and auto-advance promotion engine.
  - Multi-round hierarchical elimination dashboard UI (`EliminationDashboard.jsx`) with dynamic round switching, 3-lane heat cards, search filter, and instant advancement indicators.
  - Real-time Race Director & TV Circuit HUD integration for seamless multi-round elimination heats.
- **Verification:** 13/13 test suites passed, Vite production build clean.
- **Roadmap Archive:** [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)
- **Requirements Archive:** [milestones/v1.2-REQUIREMENTS.md](milestones/v1.2-REQUIREMENTS.md)

---

## v1.1: UI/UX & Arena Visual Showcase Polish
- **Shipped:** 2026-09-03
- **Phases:** 2 (Phases 3-4)
- **Plans:** 2
- **Requirements Satisfied:** 3/3 (`UI-01`, `UI-02`, `UI-03`)
- **Key Accomplishments:**
  - Reorganized Race Director finish time input into 3-column horizontal grid aligned with track lanes (Pink Lane A, Cyan Lane B, Green Lane C) with driver and team tags.
  - Added golden cyber shimmer border (`.gold-shimmer-border`) with breathing pulse animation for Best Time Overall (BTO #1) on Realtime TV HUD and participant Round 2 ticket cards.
  - Implemented 16:9 fullscreen dynamic countdown HUD overlay on Realtime TV featuring giant pulsing digits, CRT scanlines, 10-segment cyber LED bar, Indonesian voice text (`SEPULUH`, etc.), and explosive "GO! LEPAS MOBIL!" celebration banner.
- **Verification:** 12/12 test suites passed, Vite production build clean (0 errors).
- **Roadmap Archive:** [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
- **Requirements Archive:** [milestones/v1.1-REQUIREMENTS.md](milestones/v1.1-REQUIREMENTS.md)

---

## v1.0: Full SRS & Blueprint Compliance
- **Shipped:** 2026-09-03
- **Phases:** 2 (Phases 1-2)
- **Plans:** 2
- **Requirements Satisfied:** 4/4 (`EXCP-01`, `EXCP-02`, `SCRUT-01`, `SCRUT-02`)
- **Key Accomplishments:**
  - Implemented "SEMUA CO / DNF (No Winner)" emergency handling with coupon integrity retention.
  - Implemented "DEKLARASI RE-RACE" free permit modal with lane checklist and zero redundant QR scans.
  - Implemented Scrutineer Active Alert Lapis 2 banner indicator for locked races.
  - Implemented Scrutineer Emergency Override Lapis 3 with instant bracket auto-placement.
- **Verification:** 12/12 test suites passed, Vite production build clean.
- **Roadmap Archive:** [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- **Requirements Archive:** [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)
