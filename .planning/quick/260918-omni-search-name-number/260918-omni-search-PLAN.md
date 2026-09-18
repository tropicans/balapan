# Quick Task 260918-omni-search: Facilitate Omni-Search (Number and Name) Across All Panels

**Description:** Enable searching and selecting participants by both Participant Number (`#5`, `12`) AND Racer Name / Team across all management panels, including BTO Manager, Winner Registration, Cashier Coupon Registration, and Dashboard filters.

## Context & Problem
Previously:
- In `BtoManager.jsx`, input validation strictly required numbers (`isNaN(clean)` returned early), preventing officials from finding racers by name.
- In `WinnerRegistrationPanel.jsx`, input validation also blocked non-numeric text (`isNaN(clean)`), requiring operators to know the exact participant number.
- In `CouponRegistrationForm.jsx`, cashier had to scroll through a plain dropdown `<select>` without an instant search/filter by name or number.
- In `CashierDashboard.jsx` and `AdminUserDashboard.jsx`, the user search filter checked name/team/email, but missed `participant_number`.

## Execution Plan
1. [ ] **BTO Manager (`client/src/components/director/BtoManager.jsx`)**:
   - Update lookup effect to support omni-search: query `/api/participants?search=${query}` for both numbers and names.
   - Render dropdown suggestions list with `#nomor`, `nama`, `tim` when searching or when multiple matches are found.
   - Clicking a candidate selects `selectedParticipant`.
   - Allow submitting via `selectedParticipant.participant_number` or numeric input.
   - Update label and placeholder to indicate Number or Name.

2. [ ] **Winner Registration Panel (`client/src/components/bracket/WinnerRegistrationPanel.jsx`)**:
   - Remove `isNaN(clean)` block; query `/api/participants?search=${query}`.
   - Render dropdown suggestions list for name searches.
   - Selecting a candidate checks eligibility for `participant_number` in `selectedRound`.
   - Update label and placeholder to indicate Number or Name.

3. [ ] **Cashier Coupon Registration Form (`client/src/components/cashier/CouponRegistrationForm.jsx`)**:
   - Add instant search filter box above the racer select dropdown to filter racers by `#nomor`, `nama`, or `tim`.

4. [ ] **Cashier & Admin Dashboards (`CashierDashboard.jsx`, `AdminUserDashboard.jsx`)**:
   - Include `participant_number` in the search filter logic.

5. [ ] **Verification**:
   - Run test suites: `npm test`.
   - Build client: `npm --prefix client run build`.
