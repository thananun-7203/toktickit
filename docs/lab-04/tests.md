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
├── ticket-workflow.api.test.ts
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

Observed on `feature/1-sprint4-engineering-contract` at Lab 3 release commit `6c9c2f7` during Issue #50 reconnaissance:

| Check | Baseline result |
|---|---|
| Client full Vitest regression | **Pass — 76/76 (11/11 files)** |
| Client production build | **Pass** |
| Server pure Lab 3 unit subset safe without DB | **Pass — 22/22 (6/6 files)** |
| Server TypeScript build | **Pass** |
| Prisma schema validation | **Pass** |
| Full Server API/integration rerun | **Not rerun in Issue #50** — Docker/Test PostgreSQL was unavailable and no `TEST_DATABASE_URL` was set; development DB was intentionally not used. |
| Full Playwright rerun | **Not rerun in Issue #50** — Docker-based dedicated E2E stack was unavailable. |

The released Lab 3 evidence records Server **165/165**, Client **76/76**, and Playwright **12/12** before Lab 4. Those historical numbers are baseline evidence, not a claim that the full suites were rerun in Issue #50.

## 4. Unit Tests

| Test ID | Requirement / AC | What it tests | Expected result | Planned file | Final |
|---|---|---|---|---|---|
| AT-U-01 | BR-14–BR-17 / AC-05 | Every allowed Action status transition | Helper accepts only Planned->In Progress/Completed/Cancelled and In Progress->Completed/Cancelled | `actions-taken.unit.test.ts` | Planned |
| AT-U-02 | BR-15 / AC-05 | Self/terminal/unsupported Action transitions | Rejected deterministically | `actions-taken.unit.test.ts` | Planned |
| AT-U-03 | BR-09–BR-13 / AC-03 | Action text/follow-up Unicode boundaries | 2,000 code points accepted, 2,001 rejected; follow-up conditional rule correct | `actions-taken.unit.test.ts` | Planned |
| AT-U-04 | BR-10 / AC-06 | Completed Result requirement | Blank Result rejected; valid result accepted | `actions-taken.unit.test.ts` | Planned |
| WF-U-01 | Section 7 / AC-10 | Final Ticket transition matrix | Existing eight-status helper matches approved matrix | existing/extended Staff operations unit test | Planned |
| WF-U-02 | BR-24–BR-26 / AC-11 | Resolution-gate decision helper if factored | Requires >=1 Completed and zero Planned/In Progress | `ticket-workflow.api.test.ts` or helper test | Planned |
| DASH-U-01 | BR-35–BR-40 / AC-16/17 | IT Priority ranking used by recent/urgent Staff list | High > Medium > Low > null deterministic | `staff-dashboard.api.test.ts` or helper test | Planned |

## 5. Actions Taken API / Integration Tests

| Test ID | AC | Scenario | Expected | Planned file | Final |
|---|---|---|---|---|---|
| AT-API-01 | AC-01 | Staff creates valid Action on active Ticket | `201`; correct ticket; Planned; authenticated creator; approved assignee; version 1 | `actions-taken.api.test.ts` | Planned |
| AT-API-02 | AC-01 | Administrator creates valid Action | Allowed per matrix | same | Planned |
| AT-API-03 | AC-01/18 | Requester calls Staff create endpoint | `403`; no row created | same / `authorization.api.test.ts` | Planned |
| AT-API-04 | AC-02 | Assignee is inactive Staff | `409 ACTION_ASSIGNEE_NOT_ELIGIBLE`; no row | same | Planned |
| AT-API-05 | AC-02 | Assignee is Requester/unknown | Rejected; no row | same | Planned |
| AT-API-06 | AC-03 | Follow-up true without note / false with supplied note | true+blank -> `400`; false normalizes persisted note to null | same | Planned |
| AT-API-07 | AC-03 | Description/result/follow-up/attachment-note boundaries | Correct 2,000/2,001 Unicode behavior | same | Planned |
| AT-API-08 | AC-08 | Ticket contains zero/one/multiple Actions | GET returns stable date-time/id order and correct fields | same | Planned |
| AT-API-09 | AC-08 | Owning Requester reads Actions | `200` all Actions for own Ticket | same | Planned |
| AT-API-10 | AC-08 | Other Requester reads Actions by Ticket id | `404`; no content leak | same | Planned |
| AT-API-11 | AC-04 | Active Action edit with correct expectedVersion | `200`; values changed; version incremented | same | Planned |
| AT-API-12 | AC-04 | Two edits use same version | one may win; stale loser `409 STALE_ACTION_TAKEN`; no lost update | same | Planned |
| AT-API-13 | AC-02/04 | Reassign while target concurrently becomes ineligible | invariant preserved; conflict; never points to inactive/Requester | same | Planned |
| AT-API-14 | AC-05 | Each allowed Action transition | succeeds; version increments | same | Planned |
| AT-API-15 | AC-05 | Self/terminal/forbidden Action transition | `409`; no mutation | same | Planned |
| AT-API-16 | AC-06 | Complete with valid Result | `200`; Completed; performer=current authenticated actor; version++ | same | Planned |
| AT-API-17 | AC-06 | Complete without Result or invalid follow-up | `400`; remains active | same | Planned |
| AT-API-18 | AC-07 | Cancel active Action | Cancelled row retained; no delete; terminal read-only | same | Planned |
| AT-API-19 | AC-07 | Edit Completed/Cancelled | `409 ACTION_NOT_EDITABLE`; unchanged | same | Planned |
| AT-API-20 | AC-01/09 | Create Action on Resolved/Closed/Cancelled Ticket | `409 ACTION_TICKET_NOT_ACTIVE`; no Action | same | Planned |
| AT-API-21 | AC-09 | Action mutation parent timestamp | parent Ticket `updatedAt` advances in same committed operation | same | Planned |
| AT-API-22 | AC-09/22 | Repeated stale/duplicate status request | at most one transition commits; later request conflict/no duplicate work | same | Planned |
| AT-API-23 | AC-01/18 | Wrong/missing/null Origin on Action mutation | `403`; no mutation | `authorization.api.test.ts` | Planned |
| AT-API-24 | AC-18 | Password-change-required user calls new Action endpoint | `403 PASSWORD_CHANGE_REQUIRED`; no mutation | `authorization.api.test.ts` | Planned |
| AT-API-25 | AC-26 | Admin deactivates/demotes user with Planned/In Progress assigned Action | `409 ACTIVE_ACTIONS_REQUIRE_REASSIGNMENT`; user and Action unchanged | `actions-taken.api.test.ts` / existing Admin route tests | Planned |
| AT-API-26 | AC-26 | Concurrent Action assign/reassign vs Admin deactivate/demote | at most one conflicting state change wins; final active Action assignee remains eligible | same | Planned |

## 6. Final Ticket Workflow API Tests

| Test ID | AC | Scenario | Expected | Planned file | Final |
|---|---|---|---|---|---|
| WF-API-01 | AC-10 | Every permitted Ticket transition | succeeds | `ticket-workflow.api.test.ts` | Planned |
| WF-API-02 | AC-10 | Representative forbidden/self transition | `409 INVALID_STATUS_TRANSITION`; unchanged | same | Planned |
| WF-API-03 | AC-10 | Unknown status | `400`; unchanged | same | Planned |
| WF-API-04 | AC-11 | Resolve with zero Actions | `409 RESOLUTION_GATE_NOT_MET` | same | Planned |
| WF-API-05 | AC-11 | Resolve with Completed + Planned/In Progress Action | `409`; unchanged | same | Planned |
| WF-API-06 | AC-11 | Resolve with >=1 Completed and remaining Actions only Completed/Cancelled | succeeds | same | Planned |
| WF-API-07 | AC-11 | Requester directly calls Staff status endpoint | `403`; gate cannot be bypassed | same / `authorization.api.test.ts` | Planned |
| WF-API-08 | AC-12 | Requester advisory indication then formal Reopened | indication cleared atomically; historical Actions remain | same | Planned |
| WF-API-09 | AC-13 | Two concurrent valid transitions from same current status | at most one commits; stale loser `409 STALE_TICKET_STATE` | same | Planned |
| WF-API-10 | AC-11/13 | Action state changes while Resolve is evaluated | atomic result; cannot resolve while an authoritative active Action exists | same | Planned |
| WF-API-11 | AC-19 | Pre-Lab-4 already Resolved/Closed zero-Action Ticket | remains readable/valid after migration; no retroactive mutation | `migration-regression.test.ts` | Planned |

## 7. Requester Dashboard API Tests

| Test ID | AC | Scenario | Expected | Planned file | Final |
|---|---|---|---|---|---|
| RD-API-01 | AC-14 | Requester with mixed owned statuses | Open/Waiting counts exactly match BR-31/32 | `requester-dashboard.api.test.ts` | Planned |
| RD-API-02 | AC-14 | Another Requester has many Tickets | none influence current Requester counts/lists | same | Planned |
| RD-API-03 | AC-14 | Recently Updated order | top 5 owned by `updatedAt DESC,id DESC` | same | Planned |
| RD-API-04 | AC-14 | Recently Resolved order | only current Resolved owned Tickets, top 5 deterministic | same | Planned |
| RD-API-05 | AC-15 | Requester has zero Tickets | `200`, counts 0, arrays empty | same | Planned |
| RD-API-06 | AC-18 | Staff/Admin calls Requester dashboard | `403` unless endpoint policy explicitly restricts to Requester as specified | same / authorization | Planned |
| RD-API-07 | AC-15/18 | No session/password gate | existing `401`/`403 PASSWORD_CHANGE_REQUIRED` semantics | same | Planned |

## 8. Staff Dashboard API Tests

| Test ID | AC | Scenario | Expected | Planned file | Final |
|---|---|---|---|---|---|
| SD-API-01 | AC-16 | Unassigned active calculation | only active statuses + owner null counted | `staff-dashboard.api.test.ts` | Planned |
| SD-API-02 | AC-16 | My active calculation | only active + owner=current authenticated user | same | Planned |
| SD-API-03 | AC-16 | Counts by status | all eight keys present; exact DB counts, zeros included | same | Planned |
| SD-API-04 | AC-16 | Active IT Priority grouping | High/Medium/Low/null counts exact; terminal excluded | same | Planned |
| SD-API-05 | AC-17 | My Active Actions | assignee=current + Planned/In Progress only, top 5 updated-desc/id-desc | same | Planned |
| SD-API-06 | AC-17 | Recent/Urgent Tickets | active top 5, High>Medium>Low>null then updated/id | same | Planned |
| SD-API-07 | AC-16/17 | Empty DB/query result | `200` zeros/empty arrays | same | Planned |
| SD-API-08 | AC-18 | Administrator loads Staff dashboard | allowed with same operational calculations scoped to authenticated admin for `my*` fields | same | Planned |
| SD-API-09 | AC-18 | Requester calls Staff dashboard | `403`; no operational data | same / authorization | Planned |
| SD-API-10 | AC-16 | Selected displayed metrics vs direct Prisma/SQL query | values exactly match authoritative query evidence | same | Planned |

## 9. Migration / Seed Tests

| Test ID | AC | Scenario | Expected | Planned file | Final |
|---|---|---|---|---|---|
| MIG-01 | AC-19 | Apply Lab 4 migration to Lab 3-shaped fixture | prior User/Ticket/Attachment/Comment/Note counts/relations preserved | `migration-regression.test.ts` | Planned |
| MIG-02 | AC-19 | Legacy active Ticket with zero Actions | remains usable; zero Action list; future Resolve gate applies | same | Planned |
| MIG-03 | AC-19 | Legacy Resolved/Closed zero-Action Ticket | status preserved; no synthetic Action invented | same | Planned |
| MIG-04 | AC-19 | Inject failure during Lab 4 migration transaction | full rollback/recovery leaves Lab 3 state intact | same/manual disposable DB evidence | Planned |
| MIG-05 | AC-19 | Verify new FKs/indexes/version/defaults | schema matches contract and Prisma validates | same | Planned |
| SEED-01 | AC-20 | First Lab 4 seed | required users/Tickets/zero-one-many Actions/dashboard fixtures exist | `seed-regression.test.ts` | Planned |
| SEED-02 | AC-20 | Seed rerun | no uncontrolled duplicates | same | Planned |
| SEED-03 | AC-20 | Mutate seeded Action/Ticket then rerun seed | mutable Action status/assignee/result/follow-up/performer and Ticket workflow are not reset | same | Planned |
| SEED-04 | AC-20 | Dashboard fixture coverage | both zero and non-zero metric cases available | same | Planned |

## 10. Authorization / Security Tests

These tests intentionally bypass normal UI controls.

| Test ID | AC | Scenario | Expected | Final |
|---|---|---|---|---|
| AZ4-01 | AC-01/18 | Requester POST/PATCH Action endpoints directly | `403`, no mutation | Planned |
| AZ4-02 | AC-08 | Requester GET another user's Actions | `404`, no Action content | Planned |
| AZ4-03 | AC-18 | Requester GET Staff dashboard | `403` | Planned |
| AZ4-04 | AC-18 | Staff/Admin GET Requester dashboard | `403` under role-specific endpoint contract | Planned |
| AZ4-05 | AC-01/18 | No session on new protected endpoint | `401` | Planned |
| AZ4-06 | AC-01/18 | mustChangePassword on new normal endpoint | `403 PASSWORD_CHANGE_REQUIRED` | Planned |
| AZ4-07 | AC-01/18 | wrong/missing/null Origin for new write endpoints | `403`, no mutation | Planned |
| AZ4-08 | AC-06 | client sends/spoofs creator/performer id | rejected/ignored; backend actor wins | Planned |
| AZ4-09 | AC-02 | assignee role/activation changes concurrently | final Action never references ineligible assignee due to mutation race | Planned |
| AZ4-10 | AC-21 | Existing Internal Note Requester direct access | still `403`, no note leak | Planned |
| AZ4-11 | AC-26 | Direct Admin deactivate/demote bypass with active Action assignment | backend returns `409`; no invalid final relation | Planned |

## 11. Client Component / UI Tests

### 11.1 Actions Taken — `client/tests/lab-04/ActionsTaken.test.tsx`

| Test ID | AC | UI behavior | Final |
|---|---|---|---|
| AT-UI-01 | AC-08 | multiple Actions render in stable order with required fields/status/assignee/performer/follow-up/attachment notes | Planned |
| AT-UI-02 | AC-01/03 | create mode labels required fields; conditional Follow-up Note appears/validates | Planned |
| AT-UI-03 | AC-02 | inactive-assignee conflict preserves draft and shows safe guidance | Planned |
| AT-UI-04 | AC-04 | edit/reassign active Action sends expectedVersion; stale conflict preserves draft/refresh path | Planned |
| AT-UI-05 | AC-05/06/07 | only permitted lifecycle controls; Complete Result validation; Cancel confirmation; terminal read-only | Planned |
| AT-UI-06 | AC-06 | Performed by is read-only/automatic, not a client input | Planned |
| AT-UI-07 | AC-09/22 | busy state blocks ordinary duplicate submit and safe failure preserves draft | Planned |
| AT-UI-08 | AC-08/18 | Requester Action section is read-only with no Staff controls | Planned |

### 11.2 Ticket Workflow — `client/tests/lab-04/TicketWorkflow.test.tsx`

| Test ID | AC | UI behavior | Final |
|---|---|---|---|
| WF-UI-01 | AC-10 | only permitted next Ticket statuses shown | Planned |
| WF-UI-02 | AC-11 | Resolved path explains resolution gate; backend conflict surfaced safely | Planned |
| WF-UI-03 | AC-12 | Requester indication visually advisory, not formal Resolved | Planned |
| WF-UI-04 | AC-13 | stale Ticket conflict offers refresh and does not show false success | Planned |
| WF-UI-05 | AC-12 | Reopened refresh clears advisory indication and re-enables Add Action | Planned |

### 11.3 Requester Dashboard — `client/tests/lab-04/RequesterDashboard.test.tsx`

| Test ID | AC | UI behavior | Final |
|---|---|---|---|
| RD-UI-01 | AC-14 | exact metric labels/values and recent lists render | Planned |
| RD-UI-02 | AC-15 | zero/empty states render intentionally | Planned |
| RD-UI-03 | AC-15 | Ticket rows/drill-down open Requester Ticket Detail | Planned |
| RD-UI-04 | AC-15/22 | loading and safe-failure Retry behavior | Planned |

### 11.4 Staff Dashboard — `client/tests/lab-04/StaffDashboard.test.tsx`

| Test ID | AC | UI behavior | Final |
|---|---|---|---|
| SD-UI-01 | AC-16 | operational cards/status/priority values render with text labels | Planned |
| SD-UI-02 | AC-17 | My Active Actions and Recent/Urgent lists render | Planned |
| SD-UI-03 | AC-17 | metric/list drill-down sends correct Queue/Ticket context | Planned |
| SD-UI-04 | AC-16/22 | loading/zero/empty/forbidden/safe-failure states | Planned |
| SD-UI-05 | AC-18 | Administrator can render Staff Dashboard under approved role path | Planned |

## 12. Responsive / Accessibility / Visual Tests

Playwright evidence widths remain 1280x900, approximately 820x1000, and approximately 390x844.

| Test ID | AC | Check | Expected | Final |
|---|---|---|---|---|
| V4-01 | AC-23 | Requester Dashboard at 1280/820/390 | no page horizontal overflow; cards/lists readable | Planned |
| V4-02 | AC-23 | Staff Dashboard at 1280/820/390 | no clipping/overlap; lists stack safely | Planned |
| V4-03 | AC-23 | Staff Ticket Detail Actions Taken at 1280/820/390 | create/edit/read-only controls usable, long text wraps | Planned |
| V4-04 | AC-23 | Requester Ticket Detail Actions Taken at 1280/820/390 | read-only Action list readable | Planned |
| V4-05 | AC-23 | visible keyboard focus for Dashboard links/Action controls | focus style visible | Planned |
| V4-06 | AC-23 | modal/dialog keyboard behavior if modal is used | focus enters/traps/restores; Escape safe | Planned |
| V4-07 | AC-23 | status/priority/private/shared/terminal cues | understandable without color alone | Planned |
| V4-08 | AC-23 | validation placement / first-invalid focus | adjacent errors and usable focus | Planned |
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

`Staff Login -> Dashboard/Queue -> Ticket Detail -> Create Action -> Reassign -> Start -> Edit -> Complete -> Requester Login -> owned Ticket Detail -> read completed Action`

Must prove real API/database behavior, not routed mock responses.

### E2E-AT-02 — Actions conflict / cancellation boundaries

Prove inactive-assignee rejection, stale Action handling, cancellation retention, and Requester write restriction on a controlled database.

### E2E-WF-01 — Ticket resolution gate

`Active Ticket -> create multiple Actions -> leave one active -> Resolve rejected -> complete/cancel active work -> Resolve succeeds -> Reopen -> indication cleared/new Action permitted`.

### E2E-DASH-01 — Requester Dashboard

Requester sees only owned metrics/recent rows; drill-down opens owned Ticket Detail; another Requester's seeded data is not exposed.

### E2E-DASH-02 — Staff Dashboard

Staff sees authoritative operational counts/current-user Actions/recent-urgent work; drill-down reaches Queue/Ticket Detail. Compare at least selected values with direct test-DB query evidence.

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
| AC-06 | AT-U-04, AT-API-16/17, AT-UI-05/06 |
| AC-07 | AT-API-18/19, AT-UI-05 |
| AC-08 | AT-API-08/09/10, AT-UI-01/08, PERF-03 |
| AC-09 | AT-API-21/22, AT-UI-07 |
| AC-10 | WF-U-01, WF-API-01/02/03, WF-UI-01 |
| AC-11 | WF-U-02, WF-API-04/05/06/07/10, WF-UI-02, E2E-WF-01 |
| AC-12 | WF-API-08, WF-UI-03/05, E2E-WF-01 |
| AC-13 | WF-API-09/10, WF-UI-04 |
| AC-14 | RD-API-01/02/03/04, RD-UI-01, E2E-DASH-01 |
| AC-15 | RD-API-05, RD-UI-02/03/04, E2E-DASH-01 |
| AC-16 | SD-API-01/02/03/04/10, SD-UI-01/04, PERF-01 |
| AC-17 | SD-API-05/06, SD-UI-02/03, E2E-DASH-02 |
| AC-18 | RD-API-06/07, SD-API-08/09, AZ4-01..08, SD-UI-05 |
| AC-19 | MIG-01..05, WF-API-11 |
| AC-20 | SEED-01..04 |
| AC-21 | REG-01..09, E2E-REG-01 |
| AC-22 | AT-UI-03/04/07, WF-UI-02/04, Dashboard safe-failure UI tests |
| AC-23 | V4-01..09, responsive component tests |
| AC-24 | exact-head hosted Server/Client/E2E CI evidence |
| AC-25 | final docs/reviewer/AI/evidence audit in Issue #59 |
| AC-26 | AT-API-25/26, AZ4-11, Administrator User Management conflict UI regression |

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
