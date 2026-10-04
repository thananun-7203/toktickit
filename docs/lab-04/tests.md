# TokTickIT Lab 4 — Test Plan & Traceability

This Test DD is created with Issue #50 before the main Sprint 4 implementation. `Planned` means the behavior is contractually required but the Lab 4 test has not yet been implemented/executed. Final statuses and exact paths must be synchronized only from real evidence.

## 1. Test Strategy

Tools and levels continue the released Lab 3 approach:

- **Vitest** — pure server unit tests and React component/UI tests.
- **Supertest** — API/integration/authorization/business-state tests against an isolated PostgreSQL test database.
- **Prisma/PostgreSQL** — migration, rollback/recovery, seed idempotency, query correctness, and database-integrity evidence.
- **Playwright** — project-owned browser E2E, responsive, keyboard/focus, and visual smoke flows.
- **Hosted GitHub Actions** — Server, Client, and E2E gates on Lab 4 PR/release heads.
- **Manual visual inspection** — final Zen Green/accessibility/readability/screenshots where automation cannot prove visual quality alone.

Required coverage categories from the Lab 4 handout are represented below: unit, API/integration, UI component, UI style, responsive, authorization, workflow, migration/regression, performance-smoke, and E2E.

### Test Database Safety

Existing Lab 3 `TEST_DATABASE_URL` guard remains mandatory. Server integration tests must fail fast when:

- `TEST_DATABASE_URL` is missing;
- target database name does not look like a test database; or
- test target resolves to the normal development database/schema.

Migration/recovery rehearsals use disposable Lab 3-shaped databases. Development data is never reset merely to make a Lab 4 test pass.

## 2. Planned Repository Structure

Minimum handout-required paths plus supporting files:

```text
server/tests/lab-04/
├── actions-taken.unit.test.ts
├── actions-taken.api.test.ts
├── workflow.api.test.ts
├── requester-dashboard.api.test.ts
├── staff-dashboard.api.test.ts
├── authorization.api.test.ts
├── migration-regression.test.ts
├── seed-regression.test.ts
└── dashboard-performance-smoke.test.ts

client/tests/lab-04/
├── StaffDashboard.test.tsx
├── RequesterDashboard.test.tsx
├── ActionsTaken.test.tsx
└── TicketWorkflow.test.tsx

e2e/lab-04/
├── actions-taken-flow.spec.ts
├── ticket-resolution.spec.ts
├── dashboards.spec.ts
└── visual-accessibility.spec.ts
```

Closely related tests may be consolidated if the final traceability table is updated truthfully.

## 3. Baseline Before Lab 4 Implementation

Observed on `feature/1-sprint4-engineering-contract` while the working tree still matched the Lab 3 release baseline commit `6c9c2f7b47e7bedf777b6ccd5bd4eaafeb56d11a`. These are **baseline reconnaissance results**, not Lab 4 implementation verification.

| Check | Baseline result |
|---|---|
| Client full Vitest regression | **Pass — 76/76 (11/11 files)**; command `cd client && npm test`; Vitest start `2026-09-29 16:49:59 +07`. |
| Client production build | **Pass**; command `cd client && npm run build`; same baseline verification session after the 76/76 run. |
| Server pure Lab 3 unit subset safe without DB | **Pass — 22/22 (6/6 files)**; command `npx vitest run tests/lab-03/auth.unit.test.ts tests/lab-03/staff-queue.unit.test.ts tests/lab-03/staff-ticket-operations.unit.test.ts tests/lab-03/admin-user-operations.unit.test.ts tests/lab-03/test-database-guard.unit.test.ts tests/lab-03/ticket-access.unit.test.ts`; Vitest start `2026-09-29 16:50:47 +07`. |
| Server TypeScript build | **Pass**; command `cd server && npm run build`; same baseline verification session. |
| Prisma schema validation | **Pass**; command `cd server && npx prisma validate` with a non-production test-shaped `DATABASE_URL` used only to satisfy Prisma validation environment loading; same baseline verification session. |
| Full Server API/integration rerun | **Not rerun in Issue #50** — Docker/Test PostgreSQL was unavailable and no `TEST_DATABASE_URL` was set; development DB was intentionally not used. |
| Full Playwright rerun | **Not rerun in Issue #50** — Docker-based dedicated E2E stack was unavailable. |

The released Lab 3 evidence records Server **165/165**, Client **76/76**, and Playwright **12/12** before Lab 4. Those historical numbers are baseline evidence, not a claim that the full suites were rerun in Issue #50. Any post-review/final Lab 4 verification must be reported separately against the exact PR/release head SHA.

### 3.1 Issue #51 — Actions Data Foundation Verification

Implementation commit: `065da7ccab7f79db50d7c4f108e3e7dfe74958ce` (`feat(lab4): add actions data foundation`).

Verification used a disposable PostgreSQL 16 container with database name `toktickit_lab4_test` on a separate test-only port. It was not the normal development database. The Lab 4 migration was applied through the complete migration chain before seeding/testing.

| Check | Result |
|---|---|
| `npx prisma format` / `npx prisma generate` / `npx prisma validate` | **Pass** |
| `npx prisma migrate deploy` on disposable PostgreSQL | **Pass — all 6 migrations applied**, including `20260929190000_lab4_actions_data_foundation` |
| Lab 4 seed first run | **Pass** — 8 canonical Tickets, 7 canonical Actions Taken, existing Lab 3 comments/notes retained |
| `migration-regression.test.ts` + `seed-regression.test.ts` | **Pass — 5/5 tests (2/2 files)**; Vitest start `2026-09-29 19:14:24 +07` |
| Full Server regression | **Pass — 170/170 tests (23/23 files)**; Vitest start `2026-09-29 19:17:55 +07` |
| Server TypeScript build | **Pass** |
| Client full Vitest regression | **Pass — 76/76 tests (11/11 files)**; Vitest start `2026-09-29 19:19:11 +07` |
| Client production build | **Pass** |
| `git diff --check` / staged diff check before implementation commit | **Pass** |

The migration regression creates isolated schemas inside the disposable test database, reconstructs a Lab 3-shaped schema/data fixture, applies the Lab 4 migration, verifies legacy row preservation/defaults/indexes/constraints, and separately injects a failure before `COMMIT` to prove complete rollback. The seed regression verifies first-run coverage, repeat-run idempotency, preservation of mutated Action/Ticket state, and zero/non-zero dashboard fixtures.

### 3.2 Issue #52 — Actions Taken API & Authorization Verification

Implementation commits:

- `6abc6c7f9f0e64fa0ba8367f1d77dfee0253e383` — `feat(lab4): implement actions taken api`
- `98b527412b4f4ca3686493ea1560c26592c645c6` — `test(lab4): strengthen actions api coverage`
- `1d62aa0a0be4dc8330d1beff6f516610fc17f2da` — `fix(lab4): harden action idempotency and ticket versions`

Verification used a disposable PostgreSQL 16 container/database named `toktickit_lab4_issue52_test` on test-only port `5545`. The normal development PostgreSQL service on port `15432` was not reset or used as the test target. The disposable database was reset intentionally, all six existing migrations were applied, and the Lab 4 seed completed before API verification.

| Check | Result |
|---|---|
| Disposable DB migrate/reset + Lab 4 seed | **Pass** — six migrations applied; seed reported 8 Tickets / 7 canonical Actions Taken |
| Issue #52 + directly affected Lab 3 targeted regression | **Pass — 56/56 tests (5/5 files)**; Vitest start `2026-09-30 15:24:32 +07` |
| Issue #52-specific test files inside that run | **Pass — 21/21 tests** (`actions-taken.unit`, `actions-taken.api`, `authorization.api`) |
| Full Server regression | **Pass — 191/191 tests (26/26 files)**; Vitest start `2026-09-30 15:25:09 +07`, duration `34.39s` |
| Prisma validate | **Pass** |
| Server TypeScript build | **Pass** |
| Client full Vitest regression | **Pass — 76/76 tests (11/11 files)**; Vitest start `2026-09-30 15:09:29 +07` |
| Client production build | **Pass** |
| `git diff --check` / staged diff checks | **Pass** |

The Issue #52 suite directly exercises backend-only authorization and workflow behavior rather than relying on hidden UI controls: Requester write rejection, owning/cross-Requester reads, Origin/password gates, server-owned creator/performer/canceller identity, active-assignee eligibility, idempotent lost-response retry, Action/Ticket stale versions, all approved Action transitions, completion/cancellation provenance, concurrent edit/reassign races, and Admin deactivate/demote conflicts with active assigned Actions.

#### PR #62 Review-Fix Verification

The first PR #62 review identified two blocking gaps: create-idempotency was comparing against mutable Action columns, and existing Owner/IT Priority/Ticket Status/Requester resolution-indication writes had not yet joined the approved `Ticket.version` aggregate protocol. The fix persists an immutable original-create fingerprint and extends `expectedVersion` + Ticket-version increment behavior across all four existing workflow-affecting Ticket mutation paths. No new visual UI was introduced; existing clients now pass the aggregate token already returned by Ticket Detail.

Verification for review-fix commit `1d62aa0a0be4dc8330d1beff6f516610fc17f2da` used disposable PostgreSQL 16 database `toktickit_lab4_pr62_fix_test` on test-only port `5546`; the development DB was not used or reset.

| Review-fix check | Result |
|---|---|
| Prisma migration reset/application | **Pass — 7 migrations**, including `20260930153000_lab4_action_create_fingerprint` |
| Lab 4 seed | **Pass — 8 Tickets / 7 canonical Actions Taken** |
| Targeted PR #62 review-fix suite | **Pass — 81/81 tests (7/7 files)**; Vitest start `2026-09-30 22:27:52 +07` |
| Full Server regression | **Pass — 196/196 tests (26/26 files)**; Vitest start `2026-09-30 22:28:59 +07`, duration `36.99s` |
| Server TypeScript build / Prisma validate | **Pass** |
| Client regression | **Pass — 76/76 tests (11/11 files)**; Vitest start `2026-09-30 22:30:13 +07` |
| Client production build | **Pass** |
| `git diff --check` / staged checks before review-fix commit | **Pass** |

Review-specific regression evidence includes: `create -> edit/reassign -> retry original POST` returns the existing Action without another parent-version increment; materially different original intent still returns `409 IDEMPOTENCY_KEY_REUSE`; Owner/IT Priority changes invalidate an old Action `expectedTicketVersion`; status/Requester-indication callers use the same Ticket token; concurrent Owner-vs-Action mutation has one aggregate-version winner and no `500`; Action assign/reassign-vs-user eligibility races preserve the active-assignee invariant; and the additive fingerprint migration preserves pre-existing Actions while validating persisted fingerprints.

### 3.3 Issue #53 — Actions Taken Ticket Detail UI Verification

Implementation commit: `6d60a9336c55b6318978f332bcc9a43bae3ffae0` (`feat(lab4): add actions taken ticket detail ui`).

The UI was implemented only after the student reviewed and approved both desktop and mobile mockups. Verification used mocked component boundaries for detailed UI-state assertions and a disposable PostgreSQL-backed Server regression for the real API paths consumed by the UI. For manual browser verification, the existing development database was subsequently migrated forward and seeded; it was **not reset** and no destructive reset was used.

| Check | Result |
|---|---|
| Targeted `ActionsTaken` + Staff/Requester Ticket Detail Client regression | **Pass — 31/31 tests (3/3 files)**; Vitest start `2026-10-01 14:33:53 +07` |
| Issue #53 `ActionsTaken.test.tsx` inside targeted run | **Pass — 14/14 tests** |
| Full Client regression | **Pass — 90/90 tests (12/12 files)**; Vitest start `2026-10-01 14:34:25 +07` |
| Client production build | **Pass** |
| Disposable PostgreSQL migrate/reset + Lab 4 seed | **Pass — 7 migrations; 8 Tickets / 7 Actions Taken** |
| Server endpoints directly consumed by Ticket Detail/Actions UI | **Pass — 53/53 tests (4/4 files)**; Vitest start `2026-10-01 14:40:09 +07` |
| Prisma validate / Server TypeScript build | **Pass** |
| `git diff --check` / staged implementation diff | **Pass** |
| Development DB destructive verification | **Not used** |

The Issue #53 component suite covers multiple/empty Actions, Staff create/edit/reassign/start/complete/cancel controls, assignee-only completion, Result/follow-up validation, terminal read-only state, Requester read-only state, loading/failure Retry, stale Action/Ticket and ineligible-assignee feedback, draft preservation, duplicate-submit busy state, stable `clientRequestId` retry identity, recovered-idempotent-create parent refresh, Action occurrence time versus audit time, future-time validation, modal Escape/focus trap/restore, and first-invalid focus.

Manual visual QA used the real `ActionsTakenPanel`/Zen Green CSS with seeded representative Action states. Desktop and tablet layouts rendered without page horizontal overflow; Add Action modal remained scrollable/usable. CSS includes dedicated `<=700px` and `<=420px` stacking for cards, fields, controls, audit rows, and modal footer. Because the Windows Chrome headless runtime enforced an approximately 499–500 CSS-pixel minimum inner width even when requesting a 390px capture, **final exact 390px browser evidence is intentionally deferred to Issue #58** rather than claimed here without trustworthy evidence.

### 3.4 Issue #54 — Final Ticket Workflow & Resolution Verification

Implementation branch: `feature/5-final-ticket-workflow-resolution`.

The Issue #54 frontend was implemented only after the student approved the final production-like mockup. The mockup was compared against the actual `StaffTicketDetail.tsx`, `ActionsTakenPanel.tsx`, and existing Zen Green CSS before implementation. Public Comments and Internal Notes remain in their existing two-column structure and wording.

| Check | Result |
|---|---|
| `workflow.api.test.ts` | **Pass — 10/10 tests** |
| Directly affected Lab 3 `staff-ticket-detail.api.test.ts` | **Pass — 16/16 tests** |
| Combined workflow/detail Server targeted run | **Pass — 26/26 tests (2/2 files)** |
| Post-fix Lab 4 Server verification | **Pass — targeted Resolution Gate + Requester Dashboard/API filter tests**, verified against disposable PostgreSQL `toktickit_issue56_tests_20261004` |
| Full Lab 4 Server suite | **Pass — 219/219 tests across 29/29 files**, run with file parallelism disabled against disposable PostgreSQL `toktickit_issue56_tests_20261004` |
| Full Lab 3 Server suite | **Pass — 116/116 tests (14/14 files)** |
| Lab 1–2 Server suite | **Pass — 49/49 tests (7/7 files)** |
| Client full Vitest regression | **Pass — 107/107 tests (14/14 files)** |
| Server TypeScript build | **Pass** |
| Client production build | **Pass** |
| Disposable PostgreSQL test database | **Pass** — `toktickit_lab4_test`; migrations + seed applied; development DB was not used as the test target |
| `git diff --check` | **Pass** |

The Issue #54 API tests cover Resolution Gate with zero Actions; Completed + active Action blocking; Completed without a non-blank Result; Completed with an outstanding follow-up; current-cycle qualification; prior-cycle rejection after Reopen; server-owned `resolvedAt`; Resolved -> Closed preservation; Reopen timestamp/cycle/version changes; stale workflow conflicts; Requester authorization; and Cancelled Actions not blocking a valid Resolve. Client tests cover safe Resolution Gate feedback and authoritative Reopen state updates. Full cycle-2 Add Action browser/E2E verification remains part of the later E2E/accessibility gates.

## 4. Unit Tests

| Test ID | Requirement / AC | What it tests | Expected result | Planned file | Final |
|---|---|---|---|---|---|
| AT-U-01 | BR-14–BR-17 / AC-05 | Every allowed Action status transition | Helper accepts only Planned->In Progress/Completed/Cancelled and In Progress->Completed/Cancelled | `actions-taken.unit.test.ts` | **Pass — `98b5274`** |
| AT-U-02 | BR-15 / AC-05 | Self/terminal/unsupported Action transitions | Rejected deterministically | `actions-taken.unit.test.ts` | **Pass — `98b5274`** |
| AT-U-03 | BR-09–BR-13 / AC-03 | Project-chosen Action text/follow-up Unicode boundaries | 2,000 code points accepted, 2,001 rejected; follow-up conditional rule correct | `actions-taken.unit.test.ts` | **Pass — `98b5274`** |
| AT-U-04 | BR-10 / AC-06 | Completed Result requirement | Blank Result rejected; valid result accepted | `actions-taken.unit.test.ts` | **Pass via AT-API-17 integration — `98b5274`** |
| AT-U-05 | AC-28 | Immutable original-create fingerprint | same normalized create intent hashes identically; materially changed intent differs | `actions-taken.unit.test.ts` | **Pass — `1d62aa0`** |
| WF-U-01 | Section 7 / AC-10 | Final Ticket transition matrix | Existing eight-status helper plus Staff Detail API coverage matches approved matrix; Resolve is additionally gate-protected | existing Staff operations + `workflow.api.test.ts` | **Pass — 25/25 targeted Server workflow/detail run** |
| WF-U-02 | BR-24–BR-30 / AC-11 | Resolution-gate decision | Requires >=1 current-cycle Completed with non-blank Result, zero current-cycle Planned/In Progress, and zero current-cycle non-cancelled outstanding follow-ups | `workflow.api.test.ts` | **Pass — 10/10 workflow tests** |
| DASH-U-01 | BR-35–BR-41 / AC-16/17 | Staff Dashboard list predicates/order | Recently Updated uses updated-desc; Urgent is High IT Priority + updated-desc | `staff-dashboard.api.test.ts` or helper test | Planned |
| TIME-U-01 | BR-08 / AC-27 | Action business-time parser/bounds | ISO offsets normalize to same UTC instant; backdate allowed; > server-now+5m rejected | `actions-taken.unit.test.ts` | **Pass — `98b5274`** |

## 5. Actions Taken API / Integration Tests

| Test ID | AC | Scenario | Expected | Planned file | Final |
|---|---|---|---|---|---|
| AT-API-01 | AC-01/28 | Staff creates valid Action on active Ticket | `201`; correct ticket/current workflow cycle; Planned; authenticated creator; approved assignee; Action version 1; parent version increments | `actions-taken.api.test.ts` | **Pass — `98b5274`** |
| AT-API-02 | AC-01 | Administrator creates valid Action | Allowed per matrix | same | **Pass — `98b5274`** |
| AT-API-03 | AC-01/18 | Requester calls Staff create endpoint | `403`; no row created | same / `authorization.api.test.ts` | **Pass — `98b5274`** |
| AT-API-04 | AC-02 | Assignee is inactive Staff | `409 ACTION_ASSIGNEE_NOT_ELIGIBLE`; no row | same | **Pass — `98b5274`** |
| AT-API-05 | AC-02 | Assignee is Requester/unknown | Rejected; no row | same | **Pass — `98b5274`** |
| AT-API-06 | AC-03 | Follow-up true without note / false with supplied note | true+blank -> `400`; false normalizes persisted note to null | same | **Pass — `98b5274`** |
| AT-API-07 | AC-03 | Description/result/follow-up/attachment-note boundaries | Correct 2,000/2,001 Unicode behavior | same | **Pass — `98b5274`** |
| AT-API-08 | AC-08 | Ticket contains zero/one/multiple Actions | GET returns stable date-time/id order and correct fields | same | **Pass — `98b5274`** |
| AT-API-09 | AC-08 | Owning Requester reads Actions | `200` all Actions for own Ticket | same | **Pass — `98b5274`** |
| AT-API-10 | AC-08 | Other Requester reads Actions by Ticket id | `404`; no content leak | same | **Pass — `98b5274`** |
| AT-API-11 | AC-04/13 | Active Action edit with correct Action + Ticket expected versions | `200`; values changed; both versions increment as contracted | same | **Pass — `98b5274`** |
| AT-API-12 | AC-04 | Two edits use same version | one may win; stale loser `409 STALE_ACTION_TAKEN`; no lost update | same | **Pass — `98b5274`** |
| AT-API-13 | AC-02/04 | Reassign while target concurrently becomes ineligible | invariant preserved; conflict; never points to inactive/Requester | same | **Pass — `98b5274`** |
| AT-API-14 | AC-05 | Each allowed Action transition | succeeds; version increments | same | **Pass — `98b5274`** |
| AT-API-15 | AC-05 | Self/terminal/forbidden Action transition | `409`; no mutation | same | **Pass — `98b5274`** |
| AT-API-16 | AC-06 | Current assignee completes with valid Result | `200`; Completed; performer=current assignee/authenticated actor; completedAt set; versions increment | same | **Pass — `98b5274`** |
| AT-API-17 | AC-06 | Complete without Result or invalid follow-up | `400`; remains active | same | **Pass — `98b5274`** |
| AT-API-18 | AC-07 | Cancel active Action | Cancelled row retained; cancelledBy/current server cancelledAt recorded; no delete; terminal read-only | same | **Pass — `98b5274`** |
| AT-API-19 | AC-07 | Edit Completed/Cancelled | `409 ACTION_NOT_EDITABLE`; unchanged | same | **Pass — `98b5274`** |
| AT-API-20 | AC-01/09 | Create Action on Resolved/Closed/Cancelled Ticket | `409 ACTION_TICKET_NOT_ACTIVE`; no Action | same | **Pass — `98b5274`** |
| AT-API-21 | AC-09/13 | Action mutation parent aggregate | parent Ticket `updatedAt` advances and `version` increments in same committed operation | same | **Pass — `98b5274`** |
| AT-API-22 | AC-09/22 | Repeated stale Action status request | at most one transition commits; later request conflict/no duplicate terminal mutation | same | **Pass — `98b5274`** |
| AT-API-23 | AC-01/18 | Wrong/missing/null Origin on Action mutation | `403`; no mutation | `authorization.api.test.ts` | **Pass — `98b5274`** |
| AT-API-24 | AC-18 | Password-change-required user calls new Action endpoint | `403 PASSWORD_CHANGE_REQUIRED`; no mutation | `authorization.api.test.ts` | **Pass — `98b5274`** |
| AT-API-25 | AC-26 | Admin deactivates/demotes user with Planned/In Progress assigned Action | `409 ACTIVE_ACTIONS_REQUIRE_REASSIGNMENT`; user and Action unchanged | `actions-taken.api.test.ts` / existing Admin route tests | **Pass — `98b5274`** |
| AT-API-26 | AC-26 | Concurrent Action assign/reassign vs Admin deactivate/demote | at most one conflicting state change wins; final active Action assignee remains eligible | same | **Pass — `98b5274`** |
| AT-API-27 | AC-28 | **POST create succeeds, response is treated as lost, then identical request retries same `clientRequestId`** | second call returns existing Action (`200`), one row total, parent version increments only once | same | **Pass — `98b5274`** |
| AT-API-28 | AC-28 | Same Ticket/`clientRequestId` reused with materially different create payload | `409 IDEMPOTENCY_KEY_REUSE`; original row unchanged | same | **Pass — `98b5274`** |
| AT-API-29 | AC-06 | **Reassign and Complete race on same active Action/version** | if reassign wins, former assignee cannot Complete; if Complete wins, row becomes terminal and reassign fails; performer always equals authoritative assignee at completion | same | **Pass — `98b5274`** |
| AT-API-30 | AC-06 | Non-assignee directly attempts Complete without prior reassign | `409 ACTION_COMPLETION_REQUIRES_ASSIGNEE`; unchanged | same | **Pass — `98b5274`** |
| AT-API-31 | AC-27 | Action Date/Time timezone/future boundary | equivalent offsets persist same UTC; backdated valid; >now+5m `400` | same | **Pass — `98b5274`** |
| AT-API-27R | AC-28 | **Create -> edit/reassign mutable Action -> retry original POST with same key/original payload** | `200` same id/current row; no duplicate; no second parent-version increment; changed original intent still conflicts | same | **Pass — `1d62aa0`** |
| AT-API-32 | AC-13 | Owner or IT Priority changes after Action client loaded parent version | workflow mutation increments Ticket version; later Action write using old token -> `409 STALE_TICKET_STATE` | same | **Pass — `1d62aa0`** |
| AT-API-33 | AC-13 | Concurrent Owner mutation vs Action edit on same Ticket version | exactly one commits; stale loser `409`; parent version increments once; no `500` | same | **Pass — `1d62aa0`** |

## 6. Final Ticket Workflow API Tests

| Test ID | AC | Scenario | Expected | Planned file | Final |
|---|---|---|---|---|---|
| WF-API-01 | AC-10 | Every permitted Ticket transition | succeeds when its transition rules and, for Resolve, gate conditions are satisfied | `workflow.api.test.ts` + `staff-ticket-detail.api.test.ts` | **Pass — covered by 25/25 targeted run** |
| WF-API-02 | AC-10 | Representative forbidden/self transition | `409 INVALID_STATUS_TRANSITION`; unchanged | `staff-ticket-detail.api.test.ts` | **Pass — existing Lab 3 regression** |
| WF-API-03 | AC-10 | Unknown status | `400`; unchanged | `staff-ticket-detail.api.test.ts` | **Pass — existing Lab 3 regression** |
| WF-API-04 | AC-11 | Resolve with zero Actions | `409 RESOLUTION_GATE_NOT_MET` | `workflow.api.test.ts` | **Pass — WF-01** |
| WF-API-05 | AC-11 | Resolve with Completed + Planned/In Progress Action | `409`; unchanged | `workflow.api.test.ts` | **Pass — WF-02** |
| WF-API-06 | AC-11 | Resolve with >=1 current-cycle Completed with Result and remaining current-cycle Actions only Completed/Cancelled without outstanding follow-up | succeeds; resolvedAt set | `workflow.api.test.ts` | **Pass — WF-04/WF-09** |
| WF-API-15 | AC-11 | Resolve with current-cycle Completed + non-blank Result but outstanding follow-up | `409 RESOLUTION_GATE_NOT_MET`; unchanged | `workflow.api.test.ts` | **Pass — WF-10** |
| WF-API-07 | AC-11 | Requester directly calls Staff status endpoint | `403`; gate cannot be bypassed | `workflow.api.test.ts` | **Pass — WF-08** |
| WF-API-08 | AC-12 | Requester advisory indication then formal Reopened | indication remains advisory; Reopened clears resolution timestamps and preserves historical Actions | `staff-ticket-detail.api.test.ts` + `workflow.api.test.ts` | **Pass — existing ST-13 + WF-06** |
| WF-API-09 | AC-13 | Two concurrent valid transitions from same Ticket version | at most one commits; stale loser `409 STALE_TICKET_STATE` | same | Planned |
| WF-API-10 | AC-11/13 | Action/owner/priority aggregate changes while Resolve is evaluated | parent version/row lock + child re-read prevent stale Resolve | same | Planned |
| WF-API-11 | AC-19 | Pre-Lab-4 already Resolved/Closed zero-Action Ticket | remains readable/valid after migration; no retroactive mutation | `migration-regression.test.ts` | Planned |
| WF-API-12 | AC-11/12 | **Resolve cycle 1 -> Reopen -> attempt Resolve cycle 2 with only cycle-1 Completed Action** | rejected `409 RESOLUTION_GATE_NOT_MET`; old Action remains historical but does not qualify cycle 2 | `workflow.api.test.ts` | **Pass — WF-03** |
| WF-API-13 | AC-11/12 | Reopened cycle 2 creates/completes current-cycle Action then Resolve | succeeds; resolvedAt reset to new server time | `workflow.api.test.ts` | Planned — covered by future end-to-end cycle test |
| WF-API-14 | AC-14 | Resolved -> Closed | resolvedAt preserved so recently-resolved metric can still include it | `workflow.api.test.ts` | **Pass — WF-05** |

## 7. Requester Dashboard API Tests

| Test ID | AC | Scenario | Expected | Planned file | Final |
|---|---|---|---|---|---|
| RD-API-01 | AC-14 | Requester with mixed owned statuses | Open/Waiting counts exactly match BR-31/32 | `requester-dashboard.api.test.ts` | **Pass — 5/5 requester dashboard API tests** |
| RD-API-02 | AC-14 | Another Requester has many Tickets | none influence current Requester counts/lists | same | **Pass** |
| RD-API-03 | AC-14 | Recently Updated order | top 5 owned by `updatedAt DESC,id DESC` | same | **Pass** |
| RD-API-04 | AC-14 | Recently Resolved order | owned Resolved/Closed with non-null resolvedAt only, top 5 by resolvedAt desc/id desc; legacy null excluded | same | **Pass** |
| RD-API-05 | AC-15 | Requester has zero Tickets | `200`, counts 0, arrays empty | same | **Pass** |
| RD-API-06 | AC-18 | Staff/Admin calls Requester dashboard | `403` unless endpoint policy explicitly restricts to Requester as specified | same / authorization | **Pass** |
| RD-API-07 | AC-15/18 | No session/password gate | `401` for anonymous; `403 PASSWORD_CHANGE_REQUIRED` for a Requester whose password change is required | `requester-dashboard.api.test.ts` / `RD-API-06/07 and authorization` | **Pass — exact Requester Dashboard authorization test at current PR head** |

## 8. Staff Dashboard API Tests

| Test ID | AC | Scenario | Expected | Planned file | Final |
|---|---|---|---|---|---|
| SD-API-01 | AC-16 | Unassigned active calculation | only active statuses + owner null counted | `staff-dashboard.api.test.ts` | **Pass** |
| SD-API-02 | AC-16 | My active calculation | only active + owner=current authenticated user | same | **Pass** |
| SD-API-03 | AC-16 | Counts by status | all eight keys present; exact DB counts, zeros included | same | **Pass** |
| SD-API-04 | AC-16 | Active IT Priority grouping | High/Medium/Low/null counts exact; terminal excluded | same | **Pass** |
| SD-API-05 | AC-17 | My Active Actions | assignee=current + Planned/In Progress + active parent + current workflow cycle only, top 5 updated-desc/id-desc | same | **Pass** |
| SD-API-06 | AC-17 | Recently Updated Tickets | active top 5 by updatedAt desc/id desc | same | **Pass** |
| SD-API-11 | AC-17 | Urgent Tickets | active `itPriority=High` only, top 5 by updatedAt desc/id desc | same | **Pass** |
| SD-API-12 | AC-22 | Staff Dashboard dependency failure | `500 STAFF_DASHBOARD_FAILED`; safe generic message; no internal error detail leaks | same | **Pass** |
| SD-API-07 | AC-16/17 | Empty DB/query result | `200` zeros/empty arrays | same | **Pass** |
| SD-API-08 | AC-18 | Administrator loads Staff dashboard | allowed with same operational calculations scoped to authenticated admin for `my*` fields | same | **Pass** |
| SD-API-09 | AC-18 | Requester calls Staff dashboard | `403`; no operational data | same / authorization | **Pass** |
| SD-API-10 | AC-16 | Selected displayed metrics vs direct Prisma/SQL query | values exactly match authoritative query evidence | same | **Pass** |

## 9. Migration / Seed Tests

| Test ID | AC | Scenario | Expected | Planned file | Final |
|---|---|---|---|---|---|
| MIG-01 | AC-19 | Apply Lab 4 migration to Lab 3-shaped fixture | prior User/Ticket/Attachment/Comment/Note counts/relations preserved | `migration-regression.test.ts` | **Pass — `065da7c`** |
| MIG-02 | AC-19 | Legacy active Ticket with zero Actions | remains usable; zero Action list; future Resolve gate applies | same | **Pass — `065da7c`** |
| MIG-03 | AC-19 | Legacy Resolved/Closed zero-Action Ticket | status preserved; no synthetic Action invented | same | **Pass — `065da7c`** |
| MIG-04 | AC-19 | Inject failure during Lab 4 migration transaction | full rollback/recovery leaves Lab 3 state intact | same/manual disposable DB evidence | **Pass — `065da7c`** |
| MIG-05 | AC-19 | Verify new FKs/indexes/Action+Ticket versions/workflowCycle/resolvedAt/idempotency uniqueness/provenance defaults | schema matches contract and Prisma validates | same | **Pass — `065da7c`** |
| MIG-06 | AC-19/28 | Add immutable create-fingerprint storage after existing Lab 4 Actions | existing Action rows preserved with null legacy fingerprint; stored value accepts only 64-char lowercase SHA-256 hex | same | **Pass — `1d62aa0`** |
| SEED-01 | AC-20 | First Lab 4 seed | required users/Tickets/zero-one-many Actions/dashboard fixtures exist | `seed-regression.test.ts` | **Pass — `065da7c`** |
| SEED-02 | AC-20 | Seed rerun | no uncontrolled duplicates | same | **Pass — `065da7c`** |
| SEED-03 | AC-20 | Mutate seeded Action/Ticket then rerun seed | mutable Action status/assignee/result/follow-up/provenance and Ticket workflow cycle/version/resolution are not reset | same | **Pass — `065da7c`** |
| SEED-04 | AC-20 | Dashboard fixture coverage | both zero and non-zero metric cases available | same | **Pass — `065da7c`** |

## 10. Authorization / Security Tests

These tests intentionally bypass normal UI controls.

| Test ID | AC | Scenario | Expected | Final |
|---|---|---|---|---|
| AZ4-01 | AC-01/18 | Requester POST/PATCH Action endpoints directly | `403`, no mutation | **Pass — `98b5274`** |
| AZ4-02 | AC-08 | Requester GET another user's Actions | `404`, no Action content | **Pass — `98b5274`** |
| AZ4-03 | AC-18 | Requester GET Staff dashboard | `403` | Planned |
| AZ4-04 | AC-18 | Staff/Admin GET Requester dashboard | `403` under role-specific endpoint contract | Planned |
| AZ4-05 | AC-01/18 | No session on new protected endpoint | `401` | **Pass — `98b5274`** |
| AZ4-06 | AC-01/18 | mustChangePassword on new normal endpoint | `403 PASSWORD_CHANGE_REQUIRED` | **Pass — `98b5274`** |
| AZ4-07 | AC-01/18 | wrong/missing/null Origin for new write endpoints | `403`, no mutation | **Pass — `98b5274`** |
| AZ4-08 | AC-06 | client sends/spoofs creator/performer id | rejected/ignored; backend actor wins | **Pass — `98b5274`** |
| AZ4-09 | AC-02 | assignee role/activation changes concurrently | final Action never references ineligible assignee due to mutation race | **Pass — `98b5274`** |
| AZ4-10 | AC-21 | Existing Internal Note Requester direct access | still `403`, no note leak | Planned |
| AZ4-11 | AC-26 | Direct Admin deactivate/demote bypass with active Action assignment | backend returns `409`; no invalid final relation | **Pass — `98b5274`** |
| AZ4-12 | AC-06 | Non-assignee Staff directly calls Complete endpoint | `409 ACTION_COMPLETION_REQUIRES_ASSIGNEE`; no performer spoof | **Pass — `98b5274`** |
| AZ4-13 | AC-13 | Stale `expectedTicketVersion` on owner/priority/status/problem-resolved mutation | `409 STALE_TICKET_STATE`; no partial mutation | **Pass — `1d62aa0`** |

## 11. Client Component / UI Tests

### 11.1 Actions Taken — `client/tests/lab-04/ActionsTaken.test.tsx`

| Test ID | AC | UI behavior | Final |
|---|---|---|---|
| AT-UI-01 | AC-08 | multiple Actions render in stable order with required fields/status/assignee/performer/follow-up/attachment notes | **Pass — `6d60a93`** |
| AT-UI-02 | AC-01/03 | create mode labels required fields; conditional Follow-up Note appears/validates | **Pass — `6d60a93`** |
| AT-UI-03 | AC-02 | inactive-assignee conflict preserves draft and shows safe guidance | **Pass — `6d60a93`** |
| AT-UI-04 | AC-04/13 | edit/reassign active Action sends Action + Ticket versions; stale conflict preserves draft/refresh path | **Pass — `6d60a93`** |
| AT-UI-05 | AC-05/06/07 | only permitted lifecycle controls; Complete available only to current assignee; Result validation; Cancel confirmation/provenance; terminal read-only | **Pass — `6d60a93`** |
| AT-UI-06 | AC-06 | Performed by is read-only/automatic and reflects current assignee completion, not arbitrary click actor | **Pass — `6d60a93`** |
| AT-UI-07 | AC-09/22/28 | busy state blocks ordinary duplicate click; create retains one clientRequestId across unknown-response retry; safe failure preserves draft | **Pass — `6d60a93`** |
| AT-UI-08 | AC-08/18 | Requester Action section is read-only with no Staff controls | **Pass — `6d60a93`** |
| AT-UI-09 | AC-27 | Action Date/Time is labelled as work occurrence time; audit timestamps are separate; timezone/future validation feedback is clear | **Pass — `6d60a93`** |

### 11.2 Ticket Workflow — `client/tests/lab-04/TicketWorkflow.test.tsx`

| Test ID | AC | UI behavior | Final |
|---|---|---|---|
| WF-UI-01 | AC-10 | only permitted next Ticket statuses shown | **Pass — existing UI-ST-04** |
| WF-UI-02 | AC-11 | Resolved path explains **current-cycle** resolution gate; prior-cycle Completed work does not appear as qualifying | **Pass — UI-ST-10 safe Resolution Gate feedback; current-cycle qualification is server-authoritative** |
| WF-UI-03 | AC-12 | Requester indication visually advisory, not formal Resolved | **Pass — existing UI-ST-08** |
| WF-UI-04 | AC-13 | stale Ticket conflict offers refresh and does not show false success | **Pass — existing UI-ST-09** |
| WF-UI-05 | AC-12 | Reopened refresh clears advisory/resolvedAt context, starts new work cycle, preserves historical prior-cycle Actions, and re-enables Add Action | **Partial — status/resolvedAt/workflowCycle state update covered by UI-ST-11; full Add Action cycle-2 browser/E2E flow remains planned** |

### 11.3 Requester Dashboard — `client/tests/lab-04/RequesterDashboard.test.tsx`

| Test ID | AC | UI behavior | Final |
|---|---|---|---|
| RD-UI-01 | AC-14 | exact metric labels/values and recent lists render | **Pass — `RequesterDashboard.test.tsx`** |
| RD-UI-02 | AC-15 | zero/empty states render intentionally | **Pass — `RequesterDashboard.test.tsx`** |
| RD-UI-03 | AC-15 | Ticket rows/drill-down open Requester Ticket Detail | **Pass — `RequesterDashboard.test.tsx`** |
| RD-UI-04 | AC-15/22 | loading and safe-failure Retry behavior | **Pass — `RequesterDashboard.test.tsx`** |
| RD-UI-05 | AC-14/15 | Waiting for You drill-down opens My Tickets with `Waiting for Requester` status context | **Pass — `RequesterDashboard.test.tsx`, `App.test.tsx`, `MyTickets.test.tsx`** |

### 11.4 Staff Dashboard — `client/tests/lab-04/StaffDashboard.test.tsx`

| Test ID | AC | UI behavior | Final |
|---|---|---|---|
| SD-UI-01 | AC-16 | operational cards/status/priority values render with text labels | **Pass — `StaffDashboard.test.tsx`** |
| SD-UI-02 | AC-17 | My Active Actions plus separate Recently Updated and Urgent lists render with correct labels | **Pass — `StaffDashboard.test.tsx`** |
| SD-UI-03 | AC-17 | metric/list drill-down sends correct Queue/Ticket context | **Pass — `StaffDashboard.test.tsx`** |
| SD-UI-04 | AC-16/22 | loading/zero/empty/forbidden/safe-failure states | **Pass — `StaffDashboard.test.tsx`** |
| SD-UI-05 | AC-18 | Administrator can render Staff Dashboard under approved role path | **Pass — `AuthenticatedShell.test.tsx`** |

## 12. Responsive / Accessibility / Visual Tests

Playwright evidence widths remain 1280x900, approximately 820x1000, and approximately 390x844.

| Test ID | AC | Check | Expected | Final |
|---|---|---|---|---|
| V4-01 | AC-23 | Requester Dashboard at 1280/820/390 | no page horizontal overflow; cards/lists readable | **Pass — Playwright `requester-dashboard-responsive.spec.ts`** |
| V4-02 | AC-23 | Staff Dashboard at 1280/820/390 | no clipping/overlap; lists stack safely | **Pass — Playwright real-browser test `e2e/lab-04/staff-dashboard-responsive.spec.ts` verifies 1280/820/390, grid stacking, action-button width, and no horizontal overflow** |
| V4-03 | AC-23 | Staff Ticket Detail Actions Taken at 1280/820/390 | create/edit/read-only controls usable, long text wraps | **Partial — desktop/tablet manual QA passed; <=420px rules implemented; exact 390 evidence deferred to Issue #58** |
| V4-04 | AC-23 | Requester Ticket Detail Actions Taken at 1280/820/390 | read-only Action list readable | **Partial — read-only component behavior passes; final multi-width browser evidence deferred to Issue #58** |
| V4-05 | AC-23 | visible keyboard focus for Dashboard links/Action controls | focus style visible | Planned |
| V4-06 | AC-23 | modal/dialog keyboard behavior if modal is used | focus enters/traps/restores; Escape safe | **Pass in Issue #53 component regression — `6d60a93`** |
| V4-07 | AC-23 | status/priority/private/shared/terminal cues | understandable without color alone | Planned |
| V4-08 | AC-23 | validation placement / first-invalid focus | adjacent errors and usable focus | **Pass in Issue #53 component regression — `6d60a93`** |
| V4-09 | AC-23/25 | final visual inspection | no placeholder/debug/obsolete controls or broken layouts | Planned |

## 13. Performance-Smoke Tests

These are local-lab smoke checks, not production load testing.

| Test ID | AC | Scenario | Expected | Final |
|---|---|---|---|---|
| PERF-01 | AC-16 | Staff dashboard on seeded dataset | concise query/result; no full Ticket collection materialized for counting | Planned |
| PERF-02 | AC-14 | Requester dashboard on seeded dataset | ownership-scoped count/top-5 queries use documented indexes/filters | Planned |
| PERF-03 | AC-08 | Actions list for a Ticket with multiple records | deterministic indexed parent/order query; no unrelated Action scan in response | Planned |

## 14. End-to-End Tests

### E2E-AT-01 — Actions Taken full-stack

Path:

`Staff Login -> Dashboard/Queue -> Ticket Detail -> Create Action -> Reassign to intended performer -> Start -> Edit -> Complete as current assignee -> Requester Login -> owned Ticket Detail -> read completed Action/provenance`

Must prove real API/database behavior, not routed mock responses.

### E2E-AT-02 — Actions conflict / cancellation boundaries

Prove inactive-assignee rejection, stale Action/Ticket handling, idempotent lost-response create retry, reassign-vs-complete race behavior, cancellation provenance/retention, and Requester write restriction on a controlled database.

### E2E-WF-01 — Ticket resolution gate

`Active Ticket cycle 1 -> create multiple Actions -> leave one active -> Resolve rejected -> complete/cancel current-cycle work -> Resolve succeeds -> Reopen -> cycle increments/old work becomes historical -> Resolve with only old Completed work rejected -> create/complete cycle-2 Action -> Resolve succeeds`.

### E2E-DASH-01 — Requester Dashboard

Requester sees only owned metrics/recent rows; drill-down opens owned Ticket Detail; another Requester's seeded data is not exposed.

### E2E-DASH-02 — Staff Dashboard

Staff sees authoritative operational counts/current-user Actions/separate Recently Updated and Urgent work; drill-down reaches Queue/Ticket Detail. Compare at least selected values with direct test-DB query evidence.

### E2E-REG-01 — Representative Labs 1–3 regression

At minimum preserve representative real-browser journeys for authentication/password, Requester create/list/detail/attachments/comments, Staff queue/detail/notes/workflow, and Administrator user management.

## 15. Labs 1–3 Regression Gates

| Test ID | AC | Regression area | Expected | Final |
|---|---|---|---|---|
| REG-01 | AC-21 | Authentication/Login/Logout/session/password-change | existing approved behavior passes | Planned final rerun |
| REG-02 | AC-21 | Requester Create/My Tickets/Ticket Detail | ownership/search/filter/sort/pagination preserved | Planned final rerun |
| REG-03 | AC-21 | Attachments | upload/download/soft-remove/storage/concurrency preserved | Planned final rerun |
| REG-04 | AC-21 | Public Comments / resolution indication | visibility/append-only/reopen behavior preserved | Planned final rerun |
| REG-05 | AC-21 | Staff Queue/Detail/owner/IT Priority | existing operations and owner invariant preserved | Planned final rerun |
| REG-06 | AC-21 | Internal Notes | Staff/Admin only, pagination/validation/plain-text preserved | Planned final rerun |
| REG-07 | AC-21 | Administrator User Management | last-admin/self/assigned-owner/password reset behavior preserved | Planned final rerun |
| REG-08 | AC-21/23 | shell/navigation/responsive | role destinations and 991.98px compact nav regression pass | Planned final rerun |
| REG-09 | AC-21 | Lab 3 test DB guard | unsafe test target still refused | Planned final rerun |

## 16. Hosted CI / Release Verification

Issue 8/10 must update hosted CI so Lab 4 paths are actually checked. Final evidence must include the exact reviewed head, not only an earlier green run.

Required release-head gates:

- Server `npm ci`, Prisma generate, migrate deploy on test DB, seed, typecheck, Prisma validate, production dependency audit, full tests, build.
- Client `npm ci`, typecheck, full tests, build, production dependency audit.
- E2E dedicated PostgreSQL/SeaweedFS stack, Lab 4 migrations/seed, project-owned Lab 4 Playwright suite.
- Failure artifacts retained for debugging.

## 17. Acceptance-Criterion Traceability

| AC | Planned evidence |
|---|---|
| AC-01 | AT-API-01/02/03, AT-UI-02, AZ4-01 |
| AC-02 | AT-API-04/05/13, AT-UI-03, AZ4-09 |
| AC-03 | AT-U-03, AT-API-06/07, AT-UI-02 |
| AC-04 | AT-API-11/12, AT-UI-04 |
| AC-05 | AT-U-01/02, AT-API-14/15, AT-UI-05 |
| AC-06 | AT-U-04, AT-API-16/17/29/30, AT-UI-05/06, AZ4-12 |
| AC-07 | AT-API-18/19, AT-UI-05 |
| AC-08 | AT-API-08/09/10, AT-UI-01/08, PERF-03 |
| AC-09 | AT-API-21/22/27/28, AT-UI-07 |
| AC-10 | WF-U-01, WF-API-01/02/03, WF-UI-01 |
| AC-11 | WF-U-02, WF-API-04/05/06/07/10/12/13, WF-UI-02, E2E-WF-01 |
| AC-12 | WF-API-08/12/13, WF-UI-03/05, E2E-WF-01 |
| AC-13 | WF-API-09/10, AT-API-11/21, WF-UI-04, AZ4-13 |
| AC-14 | RD-API-01/02/03/04, WF-API-14, RD-UI-01, E2E-DASH-01 |
| AC-15 | RD-API-05, RD-UI-02/03/04, E2E-DASH-01 |
| AC-16 | SD-API-01/02/03/04/10, SD-UI-01/04, PERF-01 |
| AC-17 | SD-API-05/06/11, SD-UI-02/03, E2E-DASH-02 |
| AC-18 | RD-API-06/07, SD-API-08/09, AZ4-01..08, SD-UI-05 |
| AC-19 | MIG-01..05, WF-API-11 |
| AC-20 | SEED-01..04 |
| AC-21 | REG-01..09, E2E-REG-01 |
| AC-22 | AT-UI-03/04/07, WF-UI-02/04, Dashboard safe-failure UI tests |
| AC-23 | V4-01..09, responsive component tests |
| AC-24 | exact-head hosted Server/Client/E2E CI evidence |
| AC-25 | final docs/reviewer/AI/evidence audit in Issue #59 |
| AC-26 | AT-API-25/26, AZ4-11, Administrator User Management conflict UI regression |
| AC-27 | TIME-U-01, AT-API-31, AT-UI-09 |
| AC-28 | AT-API-27/28, AT-UI-07, E2E-AT-02 |

## 18. Final Result Template

Do not mark these complete until real final evidence exists.

| Check | Final result |
|---|---|
| Server unit/API/integration | Pending |
| Client Vitest | Pending |
| Lab 3 -> Lab 4 migration preservation/recovery | Pending |
| Lab 4 seed idempotency | Pending |
| Prisma validate/migrate | Pending |
| Server build | Pending |
| Client build | Pending |
| Actions Taken E2E | Pending |
| Ticket Resolution E2E | Pending |
| Dashboard E2E | Pending |
| Labs 1–3 regression E2E | Pending |
| Desktop/tablet/mobile accessibility/visual QA | Pending |
| Dashboard DB-query comparison | Pending |
| Production dependency audits | Pending |
| Hosted CI exact reviewed release head | Pending |
