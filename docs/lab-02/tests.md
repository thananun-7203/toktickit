# TokTickIT Lab 2 — Test Plan & Traceability

Tools: **Vitest** (Unit + UI), **Supertest** (API), **Playwright** (E2E), manual screenshots (Visual).
Test-first workflow: failing-first tests are run locally before implementation where practical, then rerun after the implementation and during regression. For Issue 5, the Red/Green runs happened locally; the feature's Git history combines tests, implementation, and documentation in the same feature commit rather than providing separate committed Red and Green snapshots. For Issue 6, Requested Priority server/client tests were also run Red locally before the implementation, then Green after DB/API/UI changes. For Issue 7, UI assertions for the requester dropdown/testing notices, Zen Green headings, priority badges, and Ticket Detail presentation were run Red before the UI refactor, then Green after the shared theme/app-shell work.

---

## 1. Unit Tests (Vitest — server)

| ID | File Path | Target FR/BR | Scenario | Expected | Final |
|---|---|---|---|---|---|
| U-1 | `server/tests/lab-02/tickets.unit.test.ts` | FR-04, BR-02 | Ticket number formatting | Produces `TKT-YYYY-NNNNN` with a zero-padded sequence | Pass |
| U-2 | `server/tests/lab-02/tickets.unit.test.ts` | BR-03 | Summary/description length validation | Over-limit trimmed values rejected; within-limit values accepted | Pass |
| U-3 | `server/tests/lab-02/tickets.unit.test.ts` | BR-06 | Requester activity filter | Inactive requester excluded from selectable list | Pass |
| U-4 | `server/tests/lab-02/tickets.unit.test.ts` | BR-03 | Required-field validation | Missing category/system/requested-priority/summary/description rejected | Pass |
| U-7 | `server/tests/lab-02/tickets.unit.test.ts` | FR-03, BR-03, AC-11 | Requested Priority validation | Only `Low`, `Medium`, `High` accepted; unsupported value rejected | Pass |

## 2. API Tests (Supertest — server)

| ID | File Path | Target FR/BR | Scenario | Expected | Final |
|---|---|---|---|---|---|
| A-1 | `server/tests/lab-02/reference-data.api.test.ts` | FR-02, BR-06 | GET requesters | 200; 4 active seeded; inactive absent | Pass |
| A-2 | `server/tests/lab-02/tickets.api.test.ts` | FR-03, FR-04, AC-11 | POST valid ticket | 201; Requested Priority persisted/returned; ticketNumber format BR-02; status New | Pass |
| A-3 | `server/tests/lab-02/tickets.api.test.ts` | BR-03 | POST over-length summary | 400 + `summary` field error; unit coverage separately verifies description limit | Pass |
| A-4 | `server/tests/lab-02/tickets.api.test.ts` | BR-03 | POST missing required fields | 400 + per-field messages including Requested Priority | Pass |
| A-5 | `server/tests/lab-02/ticketDetail.api.test.ts` | FR-06, BR-01 | GET other requester's ticket id | 404 (no existence leak) | Pass |
| A-6 | `server/tests/lab-02/myTickets.api.test.ts` | FR-05, BR-01 | List isolation (requesters R1 vs R2) | Each sees only own tickets | Pass |
| A-7 | `server/tests/lab-02/myTickets.api.test.ts` | FR-05 | Search by Summary substring or Ticket Number | Case-insensitive Summary search and Ticket Number search return only matching owned tickets | Pass |
| A-8 | `server/tests/lab-02/myTickets.api.test.ts` | FR-05 | Filter by category + sort oldest/newest | Correct order/subset | Pass |
| A-9 | `server/tests/lab-02/myTickets.api.test.ts` | FR-05 | Pagination | page/pageSize/totalItems/totalPages consistent | Pass |
| A-10 | `server/tests/lab-02/ticketDetail.api.test.ts` | FR-07, BR-04 | Upload 1 valid file | 201; appears in detail attachments | Pass |
| A-11 | `server/tests/lab-02/ticketDetail.api.test.ts` | BR-04 | Upload >5 MB or disallowed type | 400 naming offending file | Pass |
| A-12 | `server/tests/lab-02/ticketDetail.api.test.ts` | BR-04 | Upload beyond 5 active files | 400; count stays ≤5 | Pass |
| A-12C | `server/tests/lab-02/ticketDetail.api.test.ts` | BR-04 | 4 active files + 2 simultaneous one-file uploads | Exactly one upload succeeds; the capacity loser performs no storage write/cleanup; active metadata/storage stays at 5 | Pass |
| A-13 | `server/tests/lab-02/ticketDetail.api.test.ts` | FR-09, BR-05 | DELETE with reason, then download it | Remove → 200 with `removedAt` + `removalReason`; download fails; metadata/reason remain listed | Pass |
| A-13R | `server/tests/lab-02/ticketDetail.api.test.ts` | FR-09, BR-05 | DELETE with missing/blank reason | 400; attachment remains active; storage remains | Pass |
| A-13C | `server/tests/lab-02/ticketDetail.api.test.ts` | FR-09, BR-05 | 2 simultaneous DELETEs with reasons for one active attachment | Exactly one 200 and one 409; winner's reason + `removedAt` retained; storage object remains | Pass |
| A-14 | `server/tests/lab-02/reference-data.api.test.ts` | FR-03 | GET /api/v1/categories | 200; returns 4 seeded categories in id order | Pass |
| A-15 | `server/tests/lab-02/reference-data.api.test.ts` | FR-03 | GET /api/v1/related-systems | 200; returns ≥6 seeded related systems | Pass |
| A-16 | `server/tests/lab-02/tickets.api.test.ts` | FR-03, BR-03, AC-11 | POST unsupported Requested Priority | 400 + `requestedPriority` field error listing allowed values | Pass |

## 3. UI Tests (Vitest — client)

### Screen: Select Requester

| ID | File Path | Target | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-1 | `client/tests/lab-02/SelectRequester.test.tsx` | FR-01, FR-02, AC-10 | Requester selection renders active API options in dropdown with testing-only/active-requester notices | 4 active options listed; Continue disabled until one is chosen; testing/active-requester notices visible | Pass |

### Screen: Create Ticket

| ID | File Path | Target | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-2 | `client/tests/lab-02/CreateTicket.test.tsx` | FR-03 | Create form renders with all required fields | Category/System/Requested Priority selects, Summary, Description inputs present | Pass |
| UI-3 | `client/tests/lab-02/CreateTicket.test.tsx` | BR-03 | Client-side validation blocks submit when fields invalid | Requested Priority and other per-field messages visible; no create call fired | Pass |
| UI-4 | `client/tests/lab-02/CreateTicket.test.tsx` | FR-03 | Busy state during submit | Button disabled and Creating state shown while awaiting response | Pass |
| UI-7 | `client/tests/lab-02/CreateTicket.test.tsx` | BR-03, AC-04 | Validation messages render directly below invalid inputs | Summary/Description validation messages use `.invalid-feedback.d-block` | Pass |
| UI-8 | `client/tests/lab-02/CreateTicket.test.tsx` | BR-03, AC-04 | Required fields show asterisk indicator | Five required form labels contain the danger-colour `*` marker | Pass |
| UI-10 | `client/tests/lab-02/CreateTicket.test.tsx` | FR-03, AC-11 | Select Requested Priority and submit | `createTicket` receives the selected priority | Pass |

### Screen: My Tickets

| ID | File Path | Target | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-5 | `client/tests/lab-02/MyTickets.test.tsx` | FR-05, AC-10 | My Tickets renders Zen Green list + empty/no-results states | Desktop/tablet table and mobile-card DOM render correct fields; empty/no-results states work | Pass |
| UI-11 | `client/tests/lab-02/MyTickets.test.tsx` | FR-05, AC-10, AC-11 | My Tickets renders persisted Requested Priority | Priority visible with labelled Low/Medium/High badge styling in table/mobile-card data | Pass |

### Screen: Ticket Detail + Attachments

| ID | File Path | Target | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-6 | `client/tests/lab-02/TicketDetail.test.tsx` | FR-09 | Active attachment shows Download + Remove buttons | Two action buttons visible per active attachment row | Pass |
| UI-9 | `client/tests/lab-02/TicketDetail.test.tsx` | FR-09, AC-09 | Removal requires a reason; removed attachment shows muted metadata + reason only | Prompt/confirm precede DELETE; blank reason blocks API call; removed row shows name/size/type/reason and no actions | Pass |
| UI-12 | `client/tests/lab-02/TicketDetail.test.tsx` | FR-06, AC-10, AC-11 | Ticket Detail renders redesigned read-only metadata | Ticket Detail heading, Summary/Description sections, and Requested Priority badge visible | Pass |

## 4. E2E Tests (Playwright)

| ID | File Path | Scenario | Expected | Final |
|---|---|---|---|---|
| E-1 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Select requester → identity chip appears | Context stored; subsequent pages scoped to selected requester | Pass |
| E-2 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Create ticket via form, then search My Tickets by Summary/Ticket Number | Success view shows TKT-number; created ticket can be found by both search forms | Pass |
| E-3 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Open own ticket detail | Fields + attachments section rendered correctly | Pass |
| E-4 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Switch requester → list changes | Isolation proven end-to-end (AC-05) | Pass |
| E-5 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Upload file → remove with reason → download attempt blocked | Reason remains visible; soft-remove behaviour visible (AC-09) | Pass |
| E-6 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Select Requested Priority → create → list → detail | Persisted priority returned by API and visible in list/detail | Pass |
| E-7 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Exercise S1/S2/S3/S4 at desktop/tablet/mobile widths | No page-level horizontal overflow; My Tickets uses table at tablet/desktop and cards on mobile | Pass |
| E-8 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Reach Check System before/after requester selection from desktop navbar and mobile hamburger menu | System Check remains accessible at both layouts without horizontal overflow | Pass |

## 5. Visual Checks (manual screenshots)

| ID | Location | Scenario | Final |
|---|---|---|---|
| V-1 | `artifacts/lab-02/screenshots/01-*.png`, `03-*.png`, `07-*.png`, `10-*.png`, `12-*.png` | Desktop (≥992px): requester, Create, My Tickets, Detail/removed evidence — Zen Green applied | Pass |
| V-2 | `artifacts/lab-02/screenshots/04-create-ticket-tablet.png`, `08-my-tickets-tablet.png` | Tablet (820px): responsive layout intact without page-level horizontal overflow | Pass |
| V-3 | `artifacts/lab-02/screenshots/02-*.png`, `05-*.png`, `09-*.png`, `11-*.png` | Mobile (390px): hamburger/stacked/card/detail layouts, no page-level horizontal overflow | Pass |

## 6. AC → Test Traceability

Every Acceptance Criterion must map to at least one planned test.

| AC | Description | Mapped Test IDs |
|---|---|---|
| AC-01 | Requester selection stored in app context; all later API calls carry it | UI-1, E-1 |
| AC-02 | Requester list shows exactly 4 active requesters (inactive hidden) | A-1, A-14, U-3, UI-1 |
| AC-03 | Valid form creates ticket and displays generated Ticket Number | A-2, U-1, U-2, UI-2, E-2 |
| AC-04 | Invalid data shows per-field messages below inputs without network write | A-3, A-4, U-4, UI-7, UI-8 |
| AC-05 | My Tickets shows only tickets for the acting requester (isolation proof) | A-6, E-4 |
| AC-06 | Search/filter/sort/pagination return correct subsets | A-7, A-8, A-9 |
| AC-07 | Detail shows ticket metadata + attachments; other requester's id = 404 | A-5, E-3 |
| AC-08 | Upload within limits succeeds; exceeding limits fails clearly, including concurrent uploads | A-10, A-11, A-12, A-12C |
| AC-09 | Soft removal requires a reason; removed metadata/reason remain visible; download blocked; concurrent removal is atomic | A-13, A-13R, A-13C, UI-6, UI-9, E-5 |
| AC-10 | Zen Green theme + responsive Desktop/Tablet/Mobile | UI-1, UI-5, UI-11, UI-12, E-7, E-8, V-1, V-2, V-3 |
| AC-11 | Requested Priority required, persisted, returned, and displayed | U-7, A-2, A-16, UI-2, UI-3, UI-10, UI-11, UI-12, E-6 |

Every AC has ≥1 automated or manual test mapped.

## 7. FR → Test Traceability

| FR | Unit | API | UI | E2E |
|---|---|---|---|---|
| FR-01 | — | A-1 | UI-1 | E-1, E-7 |
| FR-02 | U-3 | A-1 | UI-1 | E-1 |
| FR-03 | U-2, U-4, U-7 | A-2–A-4, A-14–A-16 | UI-2–UI-4, UI-7, UI-8, UI-10 | E-2, E-6 |
| FR-04 | U-1 | A-2 | — | E-2 |
| FR-05 | — | A-6–A-9 | UI-5, UI-11 | E-2, E-4, E-6, E-7 |
| FR-06 | — | A-5 | UI-12 | E-3, E-6, E-7 |
| FR-07 | — | A-10–A-12, A-12C | — | E-5 |
| FR-08 | — | A-13 (download path) | — | E-5 |
| FR-09 | — | A-13, A-13R, A-13C | UI-6, UI-9 | E-5 |

Every Must-FR has ≥1 automated test; remaining gaps covered by Visual checks (V-1–V-3).

## 8. Final Issue 8 Regression

Final verification was rerun from `feature/8-final-evidence-release-readiness` after the evidence/documentation updates:

| Check | Result |
|---|---|
| Server Vitest/Supertest | **49/49 passed** |
| Client Vitest | **25/25 passed** |
| Server TypeScript build | **Pass** |
| Client TypeScript + Vite production build | **Pass** |
| Prisma schema validation | **Pass** |
| Playwright requester E2E | **1/1 passed** |
| Evidence-capture Playwright run | **1/1 passed** |
| `git diff --check` | **Pass** (Windows LF→CRLF warnings only) |

The Playwright runs used a clean PostgreSQL database (`toktickit_issue8`) with all Lab 2 migrations applied from zero and seeded reference/requester data, plus the configured SeaweedFS filer.
