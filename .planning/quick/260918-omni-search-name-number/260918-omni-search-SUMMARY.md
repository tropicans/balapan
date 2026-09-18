---
status: complete
quick_id: 260918-omni-search
date: 2026-09-18
commit: pending
---

# Quick Task Summary: 260918-omni-search Facilitate Omni-Search (Number and Name) Across All Panels

## Completed Items
1. **BTO Manager (`client/src/components/director/BtoManager.jsx`)**:
   - Removed strict `isNaN` numeric check on input.
   - Integrated live omni-search via `/api/participants?search=...` supporting numbers (`#12`, `12`), racer names, and team names.
   - Added cyber-themed autocomplete suggestions dropdown showing matching racers (`#Nomor`, `Nama`, `[Tim]`) with one-click selection.
   - Added instant clear button `(X)` and auto-selected badge with auto-focus to lap time input.
   - Updated form submit to send both `participant_number` and `user_id`.

2. **Winner Registration Panel (`client/src/components/bracket/WinnerRegistrationPanel.jsx`)**:
   - Removed strict `isNaN` block, enabling operators to search by racer name or number.
   - Added autocomplete suggestions dropdown for candidate selection.
   - Selecting a candidate automatically resolves their participant number and checks scrutineering/eligibility in `selectedRound`.
   - Updated placeholder and label to `Cari Nomor (#) atau Nama Pembalap`.

3. **Cashier Coupon Registration Form (`client/src/components/cashier/CouponRegistrationForm.jsx`)**:
   - Added instant omni-search filter input above the registered racer `<select>` dropdown.
   - Cashiers can type `#nomor`, name, or team to instantly filter down candidate racers.
   - Updated `<select>` options to include `#{participant_number}` badge and live matching counter.

4. **Cashier Dashboard (`client/src/screens/CashierDashboard.jsx`)**:
   - Updated `filteredUsers` to match `participant_number` in addition to name, team, and email.
   - Added `#{participant_number}` tag to racer cards and updated search placeholder.

5. **Admin User Dashboard (`client/src/screens/AdminUserDashboard.jsx`)**:
   - Updated `filteredUsers` to match `participant_number` and `team_name`.
   - Updated search placeholder to indicate `#nomor`, name, team, email, and role.

## Verification
- `npm --prefix client run build`: compiled cleanly with 0 errors.
- `npm test`: all 19 test suites passed 100% green.
