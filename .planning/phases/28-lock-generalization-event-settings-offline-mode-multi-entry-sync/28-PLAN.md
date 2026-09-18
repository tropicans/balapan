# Phase 28 Plan: Multi-Round Lock Hardening, Event Isolation & Offline Capabilities

## Objective
Deliver operational resilience and flexibility across edge-case tournament scenarios: multi-round lock protection, clean tournament state isolation per event, offline emergency authentication for venues without internet, and multi-entry participant support for Google Sheets synchronization.

## Requirements
- **ENH-01**: Reset dynamic 	ournament_settings keys (qualifying_status, ound2_status, ound3_status, ound4_status, ound5_status) upon switching active events in ventService.setActiveEvent(eventId).
- **ENH-02**: Generalize round lock checks in RaceManager.advanceBracketWinner and esetBracketMatch for any round (ound_number >= 2) using dynamic ound_status keys.
- **ENH-03**: Add local offline emergency login option in LoginScreen.jsx allowing organizers to log in with admin privileges without an internet connection using loginWithMock.
- **ENH-04**: Support multi-entry car registrations in GoogleSheetSyncModal.jsx and googleSheetService.js by adding llow_multi_entry: boolean parameter to syncParticipantsFromSheet and backend API /api/participants/sync-sheet.

## Tasks

### Task 1: ENH-01 & ENH-02 - Backend Lock Generalization & Event Settings Reset
- In server/services/eventService.js:
  - When setActiveEvent(id) is called, reset dynamic round/qualifying settings in 	ournament_settings so newly activated events do not inherit locked statuses from prior events.
- In server/raceManager.js:
  - In dvanceBracketWinner(matchId, winnerId, options): replace hardcoded ound_number === 2 check with generic dynamic round check:
    `javascript
    if (match.round_number >= 2 && RaceManager.getRoundStatus(match.round_number) === 'locked') {
      throw new Error(Babak  telah difinalisasi dan dikunci. Buka kunci Babak  terlebih dahulu jika ingin merevisi hasil.);
    }
    `
  - In esetBracketMatch(matchId): replace hardcoded ound_number === 2 check with generic dynamic check:
    `javascript
    if (match.round_number >= 2 && RaceManager.getRoundStatus(match.round_number) === 'locked') {
      throw new Error(Babak  telah difinalisasi dan dikunci. Buka kunci Babak  terlebih dahulu jika ingin mereset heat.);
    }
    `

### Task 2: ENH-03 - Emergency Offline Access on LoginScreen
- In client/src/components/auth/LoginScreen.jsx:
  - Add an "Akses Darurat / Offline (Venue Tanpa Internet)" collapsible or section.
  - Provide quick action buttons to log in directly via loginWithMock as Super Admin or Race Director.
  - Display clear warning/banner that this is intended for offline track environments without internet connectivity.

### Task 3: ENH-04 - Multi-Entry Support for Google Sheets Sync
- In server/services/googleSheetService.js:
  - Add llow_multi_entry = false to syncParticipantsFromSheet({ sheet_url, event_id, csv_override, allow_multi_entry }).
  - When llow_multi_entry is true, skip checking xistingNamesSet.has(normName) so subsequent cars by the same racer receive separate sequential participant numbers.
- In server/index.js:
  - Pass llow_multi_entry from eq.body into syncParticipantsFromSheet.
- In client/src/components/sync/GoogleSheetSyncModal.jsx:
  - Add a toggle/checkbox: "Izinkan Multi-Entry (Nama Pembalap Sama / Banyak Mobil)".
  - Pass llow_multi_entry in the POST request body.

### Task 4: Test Suite & Verification
- Create server/tests/phase-28-enhancements.test.js validating:
  1. ENH-01: Switching active events resets qualifying_status and ound2_status..round5_status to 'open'.
  2. ENH-02: dvanceBracketWinner and esetBracketMatch reject modifications on locked round 2, 3, 4, etc.
  3. ENH-04: syncParticipantsFromSheet with llow_multi_entry: true imports multiple entries for the same racer name.
- Register test in package.json.
- Verify all test suites pass and client build succeeds.