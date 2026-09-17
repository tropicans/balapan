# Feature Research

**Domain:** Physical-only grassroots racing tournament management (Tamiya Mini 4WD / single-elimination bracket + manual best-time tracking)
**Researched:** 2026-09-17
**Confidence:** MEDIUM (codebase evidence HIGH; domain conventions MEDIUM from single-elimination/seeding standards; no direct competitor product research — LOW)

**Scope note:** This research covers ONLY the v3.0 physical-only flow: numbered participant registration, manual winner registration into Round 2, manual BTO tracking, and RD/TV monitoring. Scanning, coupons, marshal, scrutineer, ticket engine, countdown and race engine are being REMOVED and are covered here only as dependencies/deprecation risk, not as new features.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Participant roster registration (name + team) at cashier | Committee must register walk-up racers; this is the new entry point replacing coupon packages | LOW | Reuse existing `users` table + `registerGuest` pattern in `raceManager.js`. Drop balance/quota fields from the form. `CashierDashboard.jsx` + `CouponRegistrationForm.jsx` are the surface to replace. |
| Auto-assigned unique participant number | "Nomor unik otomatis" is an explicit v3.0 requirement; number is the physical key the committee writes on the paper | MEDIUM | Needs a new monotonic sequence (per-tournament). Do NOT reuse `coupon_packages.serial_number` (being deleted). Add `participant_number` on `users` or a dedicated `participants` table with `UNIQUE`. Migration must backfill existing users or start clean per event. |
| Number → name auto-resolution on input | The whole point of the Registration Panel: committee enters only the number, the name must appear automatically | MEDIUM | Requires lookup API by number. Must handle exact match, not-found, and ambiguous states. This replaces the ticket-engine auto-placement as the identity bridge. |
| Round 2 seeding panel (input winner number → seat into bracket) | Explicit v3.0 requirement; replaces `next_round_tickets` auto-seeding | MEDIUM | Reuse `RaceManager.seedIntoBracket(userId)` slot-first-fit logic (user_id_1 → _2 → _3, then new heat). Change trigger from "ticket issued" to "number submitted". Confirmation must echo heat # + lane. |
| Duplicate-seeding guard | Committee will punch a number twice; a double-seated racer corrupts the bracket | LOW | Existing `alreadyInRound2` check in `seedIntoBracket` covers this — keep and surface a clear error ("sudah terdaftar di Heat #N"). |
| Unknown/invalid number rejection | Paper typo or stale number must not create ghost participants | LOW | Validate against roster before insert. Show nearest-match suggestions for fat-finger input. |
| Manual heat winner selection + auto-advance | Core of bracket execution; winner picked by human, tree advances automatically | LOW | `advanceBracketWinner()` already implements 3:1 hierarchical reduction, parent-match placement, dynamic heat creation. Keep as-is; it must not depend on race/lock state. |
| Per-heat winner UI with manual pick (no lock/start) | RD must see 3 lanes per heat and click the winner directly | LOW | `BracketDashboard.jsx` already renders 3-lane cards with "MENANG" buttons. Remove countdown/lock gating only. |
| Manual BTO entry (participant + time) by committee | Explicit v3.0 requirement; BTO is now human-recorded, not sensor/stopwatch-derived | MEDIUM | NEW table needed (e.g. `bto_records`). Current `btoLeaderboard` reads `race_registrations.finish_time WHERE scrutineer_status='pass'` — that source is deleted with the race engine. This is the single most important backend replacement. |
| BTO leaderboard ranking + #1 record highlight | TV and RD expect a top-N board; existing UX has "Top 5 BTO" + golden shimmer | LOW | Reuse `RealtimeTV.jsx` leaderboard render + `BtoCelebrationModal.jsx`. Only the data source changes. |
| BTO update / correction | Manual typing means mistakes; committee must edit and re-rank | MEDIUM | Needs edit + delete path and deterministic re-rank. Decide policy: keep personal-best per participant vs. every logged run. Recommend personal-best (lowest) per participant — matches existing BTO semantics. |
| Realtime sync of roster, seeds, BTO to all screens | Existing app is WebSocket-first; screens drift otherwise | LOW | Infra exists (`/api/state`, Socket.IO broadcast). Extend `getFullState()` payload; strip race/coupon/ticket fields. |
| Round 2+ round navigation (tabs) | Multi-round tournament; existing ELIM-02 behavior | LOW | `BracketDashboard.jsx` already has dynamic round tabs, search, pagination. Reuse unchanged. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Giant-number keypad for seeding entry (touch, 64px+) | Committee desk is a tablet in bright/noisy arena; number pad beats typing | MEDIUM | Reuse `marshal/OnScreenNumpad.jsx` and `LaneSelector.jsx` patterns. Directly serves the "cepat, bebas antrean" core value. |
| Undo last seeding / winner advance | Manual entry WILL mis-fire; an undo window prevents bracket corruption | MEDIUM | Reuse the 60s undo + `marshal_winner_logs.status` pattern from v2.0. High operational value for a manual flow. |
| BTO audit trail (who/when/edited) | Human-entered times invite disputes; provenance settles them | MEDIUM | Store `recorded_by`, `created_at`, `updated_at`, `void_reason`. Aligns with existing transaction-integrity constraint in PROJECT.md. |
| BTO "new record" celebration + TV flash | Reuses the emotional payoff that made BTO valuable; keeps arena energy | LOW | Hook existing `BtoCelebrationModal` + cyber-shimmer border to the manual record event. |
| Live "heat siap" / next-heat indicator on TV | Physical-only flow has no lock/start, so TV must cue the next heat manually | MEDIUM | New lightweight concept: mark a heat "next up" (manual), render on TV ticker. Replaces the old race-lock alert. |
| Participant monitoring board for RD | RD needs to see who is seeded, who is pending, heat completion at a glance | LOW–MEDIUM | Derive from `bracketMatches`; add "peserta terdaftar vs. tersisih" counter. No new storage. |
| Printable/seeding list per heat | Paper backup for arena side; zero-hardware ethos | LOW | Simple export/render path from bracket state. |
| Conflict warning on seeding (participant already eliminated/pending) | Prevents re-seeding a racer already knocked out | LOW–MEDIUM | Guard against `winner_id`-completed history and cross-heat duplication. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-seed Round 2 by BTO ranking | "More fair" than manual entry | Contradicts the physical flow: Babak 1 is fully manual and the committee holds the physical winner cards. Auto-seed re-introduces complexity the milestone explicitly deletes, and mis-ranks if BTO is incomplete. | Committee enters winner's number; system only validates + seats. |
| Any residual digital coupon / saldo / serial | Legacy muscle memory from v2.0 | Directly violates v3.0 goal; half-removed ledger is worse than none (double-source of truth, confusion). | Hard remove tables/UI; identity = participant number + name. |
| Scanning (QR lane / barcode serial) | Faster entry in theory | Explicitly removed; requires hardware/paper the organizers no longer want, and slows the physical line. | Number pad + typeahead lookup. |
| Countdown / race lock / start / timing engine | Atmospheric carry-over from v2.0 | Babak 1 is manual on-track; keeping lock/countdown against manually-seeded bracket creates dead states that block manual winner entry. | Plain manual winner pick; optional "next heat" cue only. |
| Digital stopwatch integration for BTO | "Accurate" timing | Adds hardware dependency and sync complexity; organizers record times by hand by decision. | Manual BTO entry with edit/correction. |
| Participant self-service / mobile app | Reduces committee work | Participant app + scan flow is deleted; requires accounts/coupons that no longer exist. | Committee-only screens. |
| Auto-advance on heat-complete without human confirm | Removes a click | Auto-advance misfires on CO/DNF/dispute; physical races have ambiguous outcomes. | Human picks winner, always; keep the existing explicit advance. |
| Forcing bracket size to power-of-two with byes | "Proper" bracket | Grassroots heats are dynamic; the existing 3:1 tree + dynamic heat creation handles arbitrary counts. Forced sizing adds logic with no field value. | Keep dynamic 3-lane heat creation. |

## Feature Dependencies

```
[Participant roster + auto number]
    └──requires──> [Registration model change: new participant_number / participants table]
                          └──requires──> [Remove coupon_packages dependency from cashier registration]

[Registration Panel: winner number → Round 2]
    └──requires──> [Number → participant lookup]
    └──requires──> [Round 2 bracket heats exist]  (reuse seedIntoBracket)
                          └──requires──> [Bracket schema without ticket_id columns]
    └──enhances──> [Duplicate-seeding guard + Undo]

[Manual BTO]
    └──requires──> [New bto_records store]
    └──conflicts──> [btoLeaderboard derived from race_registrations.finish_time + scrutineer_status]
                          └──requires──> [Remove/modify getFullState BTO query]

[Heat winner manual pick + auto-advance]
    └──requires──> [advanceBracketWinner decoupled from race lock / ticket engine]

[RD monitoring]
    └──requires──> [getFullState payload: roster + bracket + manual BTO, race/coupon/ticket fields removed]

[TV Round 2 + BTO]
    └──requires──> [RD monitoring state]  (same feed)
    └──requires──> [Manual BTO leaderboard + bracket matches]

[Remove coupon/ticket/marshal/scrutineer]
    └──conflicts──> [v3.0 new features] ONLY IF removed before replacements land
```

### Dependency Notes

- **Registration Panel requires number→participant lookup:** Without a stable participant number resolved to a name, the panel cannot seat anyone. This is the linchpin feature; build the number registry first.
- **Manual BTO conflicts with existing BTO source:** `getFullState()` computes `btoLeaderboard` from `race_registrations.finish_time WHERE scrutineer_status='pass'`. Deleting the race/scrutineer columns silently empties the board. Replace the query in the SAME phase as manual BTO, or TV/RD show an empty BTO with no error.
- **Winner entry requires `advanceBracketWinner` decoupled from lock/ticket:** Current winner path runs through `handleScrutineerAction` → `TicketEngine.issueTicket` + `seedIntoBracket`. Manual seeding must call slot placement directly, bypassing tickets. Deleting the ticket engine without rewiring this breaks auto-advance.
- **Undo enhances manual seeding:** The existing `marshal_winner_logs` undo pattern is the closest analog; port the pattern rather than invent one.
- **Removal must follow replacement (ordering):** Do not delete `coupons`/`coupon_packages`/`next_round_tickets` until the number registry + seeding panel + manual BTO are live, or the app has no identity/seeding path.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the physical-only flow.

- [ ] Participant registration at cashier with auto unique number — the new identity primitive; everything keys off it.
- [ ] Number → name lookup + auto-resolve — makes the Registration Panel usable with a single input.
- [ ] Round 2 seeding panel (input number → seat; duplicate/unknown guards) — the explicit v3.0 requirement.
- [ ] Manual heat winner pick + auto-advance (no lock/start) — bracket must progress.
- [ ] Manual BTO entry + leaderboard replacement — restores the board broken by race-engine removal.
- [ ] RD monitoring view of Round 2 participants + BTO — RD is the operational control point.
- [ ] TV Round 2 bracket + BTO display — replaces race ticker.

### Add After Validation (v1.x)

- [ ] Giant-number keypad for seeding — when committees report typing friction.
- [ ] Undo last seeding/advance — when mis-entry incidents appear.
- [ ] BTO audit trail + edit history — when disputes arise.
- [ ] Next-heat cue on TV — when arena needs pacing without race lock.

### Future Consideration (v2+)

- [ ] Printable seeding list — defer until paper-backup demand is real.
- [ ] Consolation/3rd-place classification heats — defer; out of current bracket scope.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Participant registration + auto number | HIGH | MEDIUM | P1 |
| Number → name lookup | HIGH | MEDIUM | P1 |
| Round 2 seeding panel | HIGH | MEDIUM | P1 |
| Duplicate/unknown guards | HIGH | LOW | P1 |
| Manual winner pick + auto-advance | HIGH | LOW | P1 |
| Manual BTO entry + leaderboard replacement | HIGH | MEDIUM | P1 |
| RD monitoring | HIGH | MEDIUM | P1 |
| TV bracket + BTO | HIGH | LOW–MEDIUM | P1 |
| Giant-number keypad | MEDIUM | MEDIUM | P2 |
| Undo last seeding/advance | HIGH | MEDIUM | P2 |
| BTO audit trail | MEDIUM | MEDIUM | P2 |
| Next-heat cue on TV | MEDIUM | MEDIUM | P2 |
| Printable seeding list | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Generic bracket tools (Challonge/Toornament) | Physical handwritten bracket | Our Approach |
|---------|---------------------------------------------|------------------------------|--------------|
| Participant identity | Account/seed name, often self-registered | Name + handwritten number | Number assigned by cashier, name auto-resolved |
| Seeding | Auto/manual drag with seed protection | Committee writes winner name | Committee enters winner's number; system seats slot-first |
| Winner advance | Click winner, tree redraws | Erase/rewrite on paper | Click winner, `advanceBracketWinner` tree reduction |
| Best time | Not native (bracket-focused) | Separate stopwatch log | First-class manual BTO board + record highlight |
| Arena display | Web bracket page | None | 16:9 neon TV HUD with bracket + BTO |

## Sources

- `.planning/PROJECT.md` — v3.0 milestone goal, requirements, cluster-verified feature history (HIGH)
- `server/raceManager.js` — `seedIntoBracket`, `advanceBracketWinner`, `getFullState` BTO query, `registerGuest` (HIGH)
- `server/db.js` — schema: `users`, `bracket_matches`, `coupon_packages`, `next_round_tickets`, `marshal_winner_logs` (HIGH)
- `client/src/screens/BracketDashboard.jsx`, `RaceDirectorDashboard.jsx`, `RealtimeTV.jsx`, `components/cashier/CouponRegistrationForm.jsx` — existing surfaces (HIGH)
- `tamiya-developer-handover-srs.md`, `tamiya-web-app-blueprint-v20.md` — original flow intent (MEDIUM)
- Wikipedia, *Single-elimination tournament* — seeding/byes/dynamic bracket conventions (MEDIUM)
- No direct competitor product research performed — competitor row is inferential (LOW)

---

*Feature research for: physical-only Tamiya tournament flow (numbered registration, manual seeding, manual BTO)*
*Researched: 2026-09-17*