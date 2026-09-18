---
status: in-progress
title: Same Heat Winner Multi-Slot Registration
date: 2026-09-18
---

# Quick Task: Same Heat Winner Multi-Slot Registration

## User Intent
"jika 1 orang menang kemudian dilomba selanjutnya dia menang juga, jangan elu tarok di heat selanjutnya, tapi di heat yang sama"

## Root Cause
In `server/services/winnerService.js`:
```javascript
for (const m of openMatches) {
  // Ensure a racer is NEVER placed against themselves in the same heat
  if (m.user_id_1 === user.id || m.user_id_2 === user.id || m.user_id_3 === user.id) {
    continue;
  }
  ...
```
This check forcibly skipped the current open heat if the racer was already registered in any lane of that heat, putting their subsequent win into the next heat.

## Changes Required
1. In `server/services/winnerService.js`:
   Remove the check that prevents placing a racer against themselves in the same heat.
   Allow consecutive wins by the same participant to fill remaining open lanes (A -> B -> C) in the current pending heat before moving to the next heat.
2. In `server/tests/winner-registration.test.js`:
   Update and expand unit tests to verify that consecutive wins by the same participant fill the same heat across open lanes.
3. Verify test suite.
4. Docker build and up, git commit & push.
