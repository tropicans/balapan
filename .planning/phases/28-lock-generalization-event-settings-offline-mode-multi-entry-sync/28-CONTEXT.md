# Phase 28 Context: Lock Generalization, Event Settings, Offline Mode & Multi-Entry Sync

## Overview
Phase 28 delivers operational resilience and flexibility across edge-case tournament scenarios: multi-round lock protection, clean tournament state isolation per event, offline emergency authentication for venues without internet, and multi-entry participant support for Google Sheets synchronization.

## Requirements Covered
- **ENH-01**: Isolate or reset dynamic `tournament_settings` keys (`qualifying_status`, `round*_status`, `ticket_stage`) upon switching active events.
- **ENH-02**: Generalize round lock checks in `RaceManager.advanceBracketWinner` and `resetBracketMatch` for any round (`round_number >= 2`) using dynamic `round${round}_status` keys.
- **ENH-03**: Add local offline emergency login option in `LoginScreen.jsx` to guarantee staff access during stadium/track internet outages.
- **ENH-04**: Add multi-entry racer support toggle in `GoogleSheetSyncModal.jsx` and `googleSheetService.js` allowing multiple car entries per racer name.

## Decisions (Auto-Selected)
1. **Event Switch Settings Reset (`ENH-01`)**:
   - In `eventService.setActiveEvent(eventId)`, in addition to updating event statuses, reset dynamic settings (`qualifying_status`, `round2_status`, `round3_status`, `round4_status`, `round5_status`) to `'open'`, ensuring each activated event operates with a fresh round lifecycle.
2. **Dynamic Round Lock Guard (`ENH-02`)**:
   - Dynamically inspect `match.round_number` and check `SELECT value FROM tournament_settings WHERE key = ?` with `round${match.round_number}_status`. If `'locked'`, block winner advance and reset operations with descriptive error message.
3. **Emergency Offline Login (`ENH-03`)**:
   - Expose an "Mode Offline / Darurat" button in `LoginScreen.jsx` providing immediate local staff role access (Super Admin, Race Director, Kasir) using the backend's deterministic mock auth endpoint, enabling 100% operation without active WAN/Google connection.
4. **Multi-Entry Sync Option (`ENH-04`)**:
   - Add parameter `allow_multi_entry: boolean` to `syncParticipantsFromSheet`. If `true`, existing participant check is bypassed and each row generates a unique sequential participant number, allowing racers with multiple cars to be imported accurately.
