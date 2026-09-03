# TokTickIT Lab 2 — Test Plan & Traceability

Tools: **Vitest** (Unit + UI), **Supertest** (API), **Playwright** (E2E), manual screenshots (Visual).
Test-first workflow: failing-first tests are run locally before implementation where practical, then rerun after the implementation and during regression. For Issue 5, the Red/Green runs happened locally; the feature's Git history combines tests, implementation, and documentation in the same feature commit rather than providing separate committed Red and Green snapshots.

---

## 1. Unit Tests (Vitest — server)

| ID | File Path | Target FR/BR | Scenario | Expected | Final |
|---|---|---|---|---|---|
| U-1 | `server/tests/lab-02/tickets.unit.test.ts` | FR-4, BR-2 | Ticket number generation | Matches `^TKT-\d{4}-\d{5}$`; increments within the year, resets annually | Planned |
| U-2 | `server/tests/lab-02/tickets.unit.test.ts` | BR-3 | Summary length validation | >100 chars rejected, ≤100 accepted | Planned |
| U-3 | `server/tests/lab-02/tickets.unit.test.ts` | BR-6 | Requester activity filter | Inactive requester excluded from selectable list | Planned |
| U-4 | `server/tests/lab-02/tickets.unit.test.ts` | BR-3 | Required-field validation | Missing category/system/summary/description rejected | Planned |

## 2. API Tests (Supertest — server)

| ID | File Path | Target FR/BR | Scenario | Expected | Final |
|---|---|---|---|---|---|
| A-1 | `server/tests/lab-02/tickets.api.test.ts` | FR-2, BR-6 | GET requesters | 200; 4 active seeded; inactive absent | Planned |
| A-2 | `server/tests/lab-02/tickets.api.test.ts` | FR-3, FR-4 | POST valid ticket | 201; persisted; ticketNumber format BR-2; status New | Planned |
| A-3 | `server/tests/lab-02/tickets.api.test.ts` | BR-3 | POST over-length summary/description | 400 + `fields` map; nothing persisted | Planned |
| A-4 | `server/tests/lab-02/tickets.api.test.ts` | BR-3 | POST missing required fields | 400 + per-field messages | Planned |
| A-5 | `server/tests/lab-02/ticketDetail.api.test.ts` | FR-6, BR-1 | GET other requester's ticket id | 404 (no existence leak) | Pass |
| A-6 | `server/tests/lab-02/tickets.api.test.ts` | FR-5, BR-1 | List isolation (requesters R1 vs R2) | Each sees only own tickets | Planned |
| A-7 | `server/tests/lab-02/tickets.api.test.ts` | FR-5 | Search by summary substring | Only matching items returned | Planned |
| A-8 | `server/tests/lab-02/tickets.api.test.ts` | FR-5 | Filter by category + sort oldest/newest | Correct order/subset | Planned |
| A-9 | `server/tests/lab-02/tickets.api.test.ts` | FR-5 | Pagination | page/pageSize/totalItems/totalPages consistent | Planned |
| A-10 | `server/tests/lab-02/ticketDetail.api.test.ts` | FR-7, BR-4 | Upload 1 valid file | 201; appears in detail attachments | Pass |
| A-11 | `server/tests/lab-02/ticketDetail.api.test.ts` | BR-4 | Upload >5 MB or disallowed type | 400 naming offending file | Pass |
| A-12 | `server/tests/lab-02/ticketDetail.api.test.ts` | BR-4 | Upload beyond 5 active files | 400; count stays ≤5 | Pass |
| A-12C | `server/tests/lab-02/ticketDetail.api.test.ts` | BR-4 | 4 active files + 2 simultaneous one-file uploads | Exactly one upload succeeds; active metadata/storage stays at 5 with no orphan from the rejected request | Pass |
| A-13 | `server/tests/lab-02/ticketDetail.api.test.ts` | FR-9, BR-5 | DELETE attachment then download it | Remove → 200 w/ timestamp; download then fails; metadata still listed | Pass |
| A-14 | `server/tests/lab-02/reference-data.api.test.ts` | FR-3 | GET /api/v1/categories | 200; returns 4 active seeded categories | Planned |
| A-15 | `server/tests/lab-02/reference-data.api.test.ts` | FR-3 | GET /api/v1/related-systems | 200; returns ≥6 active seeded related systems | Planned |

## 3. UI Tests (Vitest — client)

### Screen: Select Requester

| ID | File Path | Target | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-1 | `client/tests/lab-02/SelectRequester.test.tsx` | FR-1, FR-2 | Requester select screen renders active options from API | 4 options listed; Continue disabled until one is chosen | Planned |

### Screen: Create Ticket

| ID | File Path | Target | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-2 | `client/tests/lab-02/CreateTicket.test.tsx` | FR-3 | Create form renders with all required fields | Category/System selects, Summary, Description inputs present | Planned |
| UI-3 | `client/tests/lab-02/CreateTicket.test.tsx` | BR-3 | Client-side validation blocks submit when fields invalid | Submit disabled; per-field messages visible; no fetch fired | Planned |
| UI-4 | `client/tests/lab-02/CreateTicket.test.tsx` | FR-3 | Busy state during submit | Button disabled + spinner shown while awaiting response | Planned |
| UI-7 | `client/tests/lab-02/CreateTicket.test.tsx` | BR-3, AC-4 | Validation messages render directly below each invalid input | `.invalid-feedback` elements present under Summary/Description/Category/System when invalid | Planned |
| UI-8 | `client/tests/lab-02/CreateTicket.test.tsx` | BR-3, AC-4 | Required fields show asterisk indicator | Red `*` present after label text for all required fields; matches ui-spec markup | Planned |

### Screen: My Tickets

| ID | File Path | Target | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-5 | `client/tests/lab-02/MyTickets.test.tsx` | FR-5 | My Tickets renders list + empty/no-results states | Table/card renders with correct columns; empty state message shown when 0 tickets; no-results state shown when filter mismatch | Planned |

### Screen: Ticket Detail + Attachments

| ID | File Path | Target | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-6 | `client/tests/lab-02/TicketDetail.test.tsx` | FR-9 | Active attachment shows Download + Remove buttons | Two action buttons visible per active attachment row | Pass |
| UI-9 | `client/tests/lab-02/TicketDetail.test.tsx` | FR-9, AC-9 | Removed attachment shows muted metadata only — no download/remove actions | `removedAt` non-null row: muted style, no action buttons; metadata fields (name, size, type) still present | Pass |

## 4. E2E Tests (Playwright)

| ID | File Path | Scenario | Expected | Final |
|---|---|---|---|---|
| E-1 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Select requester → identity chip appears | Context stored; subsequent pages scoped to selected requester | Pass |
| E-2 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Create ticket via form | Success view shows TKT-number; ticket appears in My Tickets | Pass |
| E-3 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Open own ticket detail | Fields + attachments section rendered correctly | Pass |
| E-4 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Switch requester → list changes | Isolation proven end-to-end (AC-5) | Pass |
| E-5 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Upload file → remove it → download attempt blocked | Soft-remove behaviour visible (AC-9) | Pass |

## 5. Visual Checks (manual screenshots)

| ID | Location | Scenario | Final |
|---|---|---|---|
| V-1 | `artifacts/lab-02/screenshots/` | Desktop (≥992px): Create form multi-column, My Tickets table — Zen Green applied | Planned |
| V-2 | `artifacts/lab-02/screenshots/` | Tablet (768–991px): 2-column layout intact | Planned |
| V-3 | `artifacts/lab-02/screenshots/` | Mobile (<768px): stacked layout, card list, no horizontal scroll | Planned |

## 6. AC → Test Traceability

Every Acceptance Criterion must map to at least one planned test.

| AC | Description | Mapped Test IDs |
|---|---|---|
| AC-1 | Requester selection stored in app context; all later API calls carry it | UI-1, E-1 |
| AC-2 | Requester list shows exactly 4 active requesters (inactive hidden) | A-1, A-14, U-3, UI-1 |
| AC-3 | Valid form creates ticket and displays generated Ticket Number | A-2, U-1, U-2, UI-2, E-2 |
| AC-4 | Invalid data shows per-field messages below inputs without network write | A-3, A-4, U-4, UI-7, UI-8 |
| AC-5 | My Tickets shows only tickets for the acting requester (isolation proof) | A-6, E-4 |
| AC-6 | Search/filter/sort/pagination return correct subsets | A-7, A-8, A-9 |
| AC-7 | Detail shows ticket metadata + attachments; other requester's id = 404 | A-5, E-3 |
| AC-8 | Upload within limits succeeds; exceeding limits fails clearly, including concurrent uploads | A-10, A-11, A-12, A-12C |
| AC-9 | Soft-removed attachments visible as metadata; download blocked | A-13, UI-6, UI-9, E-5 |
| AC-10 | Zen Green theme + responsive Desktop/Tablet/Mobile | V-1, V-2, V-3 |

Every AC has ≥1 automated or manual test mapped.

## 7. FR → Test Traceability

| FR | Unit | API | UI | E2E |
|---|---|---|---|---|
| FR-1 | — | A-1 | UI-1 | E-1 |
| FR-2 | U-3 | A-1 | UI-1 | E-1 |
| FR-3 | U-2, U-4 | A-2–A-4, A-14, A-15 | UI-2–UI-4, UI-7, UI-8 | E-2 |
| FR-4 | U-1 | A-2 | — | E-2 |
| FR-5 | — | A-6–A-9 | UI-5 | E-2, E-4 |
| FR-6 | — | A-5 | — | E-3 |
| FR-7 | — | A-10–A-12, A-12C | — | E-5 |
| FR-8 | — | A-13 (download path) | — | E-5 |
| FR-9 | — | A-13 | UI-6, UI-9 | E-5 |

Every Must-FR has ≥1 automated test; remaining gaps covered by Visual checks (V-1–V-3).
