# TokTickIT Lab 2 — Test Plan & Traceability

Tools: **Vitest** (Unit + UI), **Supertest** (API), **Playwright** (E2E), manual screenshots (Visual).
Locations: server unit/API tests in `server/tests/lab-02/`, UI tests in `client/tests/lab-02/`, E2E in `e2e/lab-02/`.

Test-first workflow: failing tests for each issue are committed before its implementation.

---

## 1. Unit Tests (Vitest — server)

| ID | Target FR/BR | Scenario | Expected |
|---|---|---|---|
| U-1 | FR-4, BR-2 | Ticket number generation | Matches `^TKT-\d{4}-\d{5}$`; increments within the year, resets annually |
| U-2 | BR-3 | Summary length validation | >100 chars rejected, ≤100 accepted |
| U-3 | BR-6 | Requester activity filter | Inactive requester excluded from selectable list |
| U-4 | BR-3 | Required-field validation | Missing category/system/summary/description rejected |

## 2. API Tests (Supertest)

| ID | Target FR/BR | Scenario | Expected |
|---|---|---|---|
| A-1 | FR-2, BR-6 | GET requesters | 200; 4 active seeded; inactive absent |
| A-2 | FR-3, FR-4 | POST valid ticket | 201; persisted; ticketNumber format BR-2; status Open |
| A-3 | BR-3 | POST over-length summary/description | 400 + `fields` map; nothing persisted |
| A-4 | BR-3 | POST missing required fields | 400 + per-field messages |
| A-5 | FR-6, BR-1 | GET other requester's ticket id | 404 (no leak) |
| A-6 | FR-5, BR-1 | List isolation (requesters R1 vs R2) | Each sees only own tickets |
| A-7 | FR-5 | Search by summary substring | Only matching items returned |
| A-8 | FR-5 | Filter by category + sort oldest/newest | Correct order/subset |
| A-9 | FR-5 | Pagination | page/pageSize/totalItems/totalPages consistent |
| A-10 | FR-7, BR-4 | Upload 1 valid file | 201; appears in detail attachments |
| A-11 | BR-4 | Upload >5 MB or disallowed type | 400 naming offending file |
| A-12 | BR-4 | Upload beyond 5 active files | 400; count stays ≤5 |
| A-13 | FR-9, BR-5 | DELETE attachment then download it | Remove → 200 w/ timestamp; download then fails; metadata still listed |

## 3. UI Tests (Vitest — client)

| ID | Target | Scenario | Expected |
|---|---|---|---|
| UI-1 | FR-1 | Requester select screen renders active options from API | Options listed; Continue disabled until chosen |
| UI-2 | FR-3 | Create form renders required asterisks + Zen Green classes | Markup matches ui-spec |
| UI-3 | BR-3 | Client-side validation blocks submit & shows messages below inputs | Messages visible; no fetch fired |
| UI-4 | FR-3 | Busy state during submit | Button disabled + spinner |
| UI-5 | FR-5 | My Tickets renders list + empty/no-results states | Correct state per mocked data |
| UI-6 | FR-9 | Removed attachment shows muted style, no download button | Metadata-only rendering |

## 4. E2E Tests (Playwright — `e2e/lab-02/requester-ticket-flow.spec.ts`)

| ID | Scenario | Expected |
|---|---|---|
| E-1 | Select requester → identity chip appears | Context stored; subsequent pages scoped |
| E-2 | Create ticket via form | Success view shows TKT-number; ticket appears in My Tickets |
| E-3 | Open own ticket detail | Fields + attachments section correct |
| E-4 | Switch requester → list changes | Isolation proven end-to-end (AC-5) |
| E-5 | Upload file → remove it → download attempt blocked | Soft-remove behaviour visible (AC-9) |

## 5. Visual Checks (manual screenshots → `artifacts/lab-02/screenshots/`)

| ID | Scenario |
|---|---|
| V-1 | Desktop (≥992px): Create form multi-column, My Tickets table — Zen Green |
| V-2 | Tablet (768–991px): 2-column layout intact |
| V-3 | Mobile (<768px): stacked layout, card list, no horizontal scroll |

## 6. Traceability Matrix (FR ↔ automated coverage)

| FR | Unit | API | UI | E2E |
|---|---|---|---|---|
| FR-1 | — | A-1 | UI-1 | E-1 |
| FR-2 | U-3 | A-1 | UI-1 | E-1 |
| FR-3 | U-2, U-4 | A-2–A-4 | UI-2–UI-4 | E-2 |
| FR-4 | U-1 | A-2 | — | E-2 |
| FR-5 | — | A-6–A-9 | UI-5 | E-2, E-4 |
| FR-6 | — | A-5 | — | E-3 |
| FR-7 | — | A-10–A-12 | — | E-5 |
| FR-8 | — | A-13 (download path) | — | E-5 |
| FR-9 | — | A-13 | UI-6 | E-5 |

Every Must-FR has ≥1 automated test; gaps are covered by visual/manual checks above.
