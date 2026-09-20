# Quick Task 260918-unlock-qualifying: Add Interactive Unlock Qualifying UI to Race Director Dashboard

**Description:** Allow Race Director to unlock qualifying stage when it is locked ("KUALIFIKASI TERKUNCI") with an interactive button and confirmation modal calling `POST /api/tickets/unlock-qualifying`.

## Root Cause
In `client/src/screens/RaceDirectorDashboard.jsx`, the button displayed `KUALIFIKASI TERKUNCI` when locked, but was unconditionally `disabled={qualifyingLocked || loading}`, leaving users with no UI mechanism to unlock qualifying if it was previously locked.

## Plan
1. [ ] Update `client/src/screens/RaceDirectorDashboard.jsx`:
   - Import `Unlock` from `lucide-react`.
   - Destructure `apiUnlockQualifying` and `socket` from `useRace()`.
   - Add state `unlockQualifyingModalOpen`.
   - Add socket event listeners for `qualifying:locked` and `qualifying:unlocked`.
   - Implement `handleUnlockQualifying` calling `apiUnlockQualifying()`.
   - Replace disabled button with clickable "BUKA KUALIFIKASI" button when locked.
   - Add Cyberpunk confirmation modal for unlocking qualifying.
2. [ ] Verify client build (`npm run build`).
3. [ ] Commit and let git hook auto-rebuild local Docker container.
