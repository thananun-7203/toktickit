# TokTickIT Lab 3 — Final Evidence Index

This index maps the final Sprint 3 repository evidence to the requested Answer Part 1–9 submission areas. It records only evidence that exists in the repository or was verified from GitHub. Final Issue #40 review and the later `lab3-staging → main` release PR are intentionally left open until those actions actually occur.

## 1. Responsive / UI Evidence

### Real database-backed screenshot source

The screenshots embedded in this section are **real full-stack application captures**, not generated mockups and not Playwright `page.route()` UI fixtures.

- Canonical source DB: `toktickit_issue8_test` in the isolated Issue #40 PostgreSQL container.
- Screenshot DB: `toktickit_issue8_evidence`, cloned directly from `toktickit_issue8_test` before capture so mandatory password changes could be exercised without mutating the regression DB.
- Backend: real Express + Prisma application connected to the screenshot PostgreSQL DB.
- Frontend: real Vite/React application.
- Storage URL: isolated Issue #40 SeaweedFS filer.
- Capture validation: the temporary full-stack Playwright capture flow passed **1/1** and asserted the visible Ticket/User/Comment/Note values before writing each screenshot.
- No production/development DB was reset or modified for these screenshots.

The safe DB values used to cross-check the screenshots are stored in:

`artifacts/lab-03/screenshots/real-db-evidence.json`

The JSON contains no password hash or session secret. It records the canonical User/Ticket/Owner/Priority/Status/Public Comment/Internal Note values used by the UI evidence. Examples include:

- `TKT-2025-90001` — **Monthly report export is unavailable** — Requested Priority `High` — IT Priority `High` — Status `Open` — Requester `Somchai Jaidee` — Owner `Narin Support`.
- `TKT-2025-90002` — **CRM page shows an unexpected validation message** — Requested/IT Priority `Medium` — Status `Waiting for Requester` — Requester `Somsri Rakdee` — Owner `Malee Support`.
- `TKT-2025-90003` — **Report filter resets after navigation** — Requested/IT Priority `Low` — Status `Resolved` — Requester `Anan Kongthong` — Unassigned.
- Public Comment on `TKT-2025-90001`: `Support is investigating this issue and will share updates here.` by `Narin Support`.
- Internal Note on `TKT-2025-90001`: `Reproduced in the local support environment; continue diagnosis in the reporting service.` by `Narin Support`.

### Final real UI screenshot index

All screenshots below are under `artifacts/lab-03/screenshots/`.

| File | Evidence shown from the real application / DB |
|---|---|
| `real-01-login-desktop.png` | Real Login page at desktop width before authentication |
| `real-02-login-invalid-credentials.png` | Real backend invalid-credential response using the seeded Requester email |
| `real-03-change-password-mobile.png` | Mandatory first-login Change Password screen for seeded Requester `Somchai Jaidee` |
| `real-04-requester-my-tickets-desktop.png` | Somchai's real My Tickets list showing `TKT-2025-90001`, High priority, Open status |
| `real-05-requester-create-ticket-tablet.png` | Real Create Ticket form at 820 px with Category/Related System values loaded from PostgreSQL |
| `real-06-requester-ticket-detail-mobile.png` | Real Requester Ticket Detail for `TKT-2025-90001` including the Public Comment stored in DB |
| `real-07-requester-isolation-no-results.png` | Real ownership isolation: `Somsri Rakdee` searches for Somchai's `TKT-2025-90001` and receives No results |
| `real-08-staff-ticket-queue-desktop.png` | Real Staff Queue showing the three canonical Tickets, priorities, statuses, and owners |
| `real-09-staff-ticket-detail-mobile.png` | Real Staff Detail for `TKT-2025-90001`, including DB-backed Public Comment and Internal Note |
| `real-10-admin-user-management-desktop.png` | Real Administrator User Management list showing canonical Requester/Staff/Admin users |
| `real-11-admin-assigned-owner-conflict.png` | Real Admin safety conflict: Narin cannot be deactivated while owning `TKT-2025-90001` |
| `real-12-admin-create-user-mobile.png` | Real Create User modal at mobile width on the DB-backed Administrator screen |

### Screenshot previews

#### Login — Desktop

![Real Login Desktop](../../artifacts/lab-03/screenshots/real-01-login-desktop.png)

#### Login — Invalid credentials from real backend

![Real Login Invalid Credentials](../../artifacts/lab-03/screenshots/real-02-login-invalid-credentials.png)

#### Mandatory Change Password — Mobile

![Real Change Password Mobile](../../artifacts/lab-03/screenshots/real-03-change-password-mobile.png)

#### Requester — My Tickets (Desktop)

![Real Requester My Tickets Desktop](../../artifacts/lab-03/screenshots/real-04-requester-my-tickets-desktop.png)

#### Requester — Create Ticket (Tablet)

![Real Requester Create Ticket Tablet](../../artifacts/lab-03/screenshots/real-05-requester-create-ticket-tablet.png)

#### Requester — Ticket Detail (Mobile)

![Real Requester Ticket Detail Mobile](../../artifacts/lab-03/screenshots/real-06-requester-ticket-detail-mobile.png)

#### Requester — Ownership isolation / No results

![Real Requester Isolation No Results](../../artifacts/lab-03/screenshots/real-07-requester-isolation-no-results.png)

#### IT Staff — Ticket Queue (Desktop)

![Real Staff Ticket Queue Desktop](../../artifacts/lab-03/screenshots/real-08-staff-ticket-queue-desktop.png)

#### IT Staff — Ticket Detail (Mobile)

![Real Staff Ticket Detail Mobile](../../artifacts/lab-03/screenshots/real-09-staff-ticket-detail-mobile.png)

#### Administrator — User Management (Desktop)

![Real Admin User Management Desktop](../../artifacts/lab-03/screenshots/real-10-admin-user-management-desktop.png)

#### Administrator — Assigned-owner safety conflict

![Real Admin Assigned Owner Conflict](../../artifacts/lab-03/screenshots/real-11-admin-assigned-owner-conflict.png)

#### Administrator — Create User (Mobile)

![Real Admin Create User Mobile](../../artifacts/lab-03/screenshots/real-12-admin-create-user-mobile.png)

### Part 5 - Login / mandatory Password Change

Implementation/test evidence:

- `client/src/Login.tsx`, `client/src/ChangePassword.tsx`, authenticated shell/context.
- `server/src/authRoutes.ts`, authentication/session/password helpers and authorization middleware.
- `client/tests/lab-03/Login.test.tsx` — 7 tests.
- `client/tests/lab-03/ChangePassword.test.tsx` — 7 tests.
- `server/tests/lab-03/auth.api.test.ts`, `authorization.api.test.ts`, `auth.unit.test.ts`.
- `e2e/lab-03/authentication.spec.ts` — `E2E-AUTH-01/02`.

Screenshots:

- `artifacts/lab-03/screenshots/real-01-login-desktop.png`
- `artifacts/lab-03/screenshots/real-02-login-invalid-credentials.png`
- `artifacts/lab-03/screenshots/real-03-change-password-mobile.png`

### Part 6 - IT Staff Ticket Queue

Implementation/test evidence:

- Staff Queue server route/query implementation and `client/src/StaffTicketQueue.tsx`.
- `server/tests/lab-03/staff-queue.api.test.ts`, `staff-queue.unit.test.ts`.
- `client/tests/lab-03/StaffTicketQueue.test.tsx`.
- `e2e/lab-03/staff-queue-responsive.spec.ts` — `V-03`.
- PR #44 peer review documents database-layer pagination/sorting, duplicate-query rejection, eligible-owner semantics, responsive states, and final approval.

Screenshot:

- `artifacts/lab-03/screenshots/real-08-staff-ticket-queue-desktop.png`

### Part 7 - IT Staff Ticket Detail & Operations

Implementation/test evidence:

- Staff Ticket Detail server operations + `client/src/StaffTicketDetail.tsx`.
- Claim/Assign/Reassign, Requested vs IT Priority, explicit status transitions, Public Comments, Internal Notes pagination/privacy, Requester-resolution context, and attachment download continuity.
- `server/tests/lab-03/staff-ticket-detail.api.test.ts`, `comments-notes.api.test.ts`, `staff-ticket-operations.unit.test.ts`.
- `client/tests/lab-03/StaffTicketDetail.test.tsx`.
- `e2e/lab-03/staff-ticket-flow.spec.ts` — `E2E-STAFF-01/02` plus operational browser smoke.
- `e2e/lab-03/staff-ticket-detail-responsive.spec.ts` — `V-04/V-08`.
- PR #45 review/follow-up evidence in `reviewer.md`.

Screenshot:

- `artifacts/lab-03/screenshots/real-09-staff-ticket-detail-mobile.png`

### Part 8 - Administrator User Management

Implementation/test evidence:

- `server/src/adminUserRoutes.ts`, `adminUserOperations.ts`, shared serialization-conflict handling.
- `client/src/UserManagement.tsx` and API client functions.
- Admin-only list/search/role filter/create/edit/activation, initial-password reset, session invalidation, self-deactivation protection, last-active-Administrator protection, and assigned-owner invariants.
- `server/tests/lab-03/users-admin.api.test.ts`, `admin-user-operations.unit.test.ts`.
- `client/tests/lab-03/UserManagement.test.tsx` — 11 tests including modal accessibility follow-up.
- `e2e/lab-03/user-administration.spec.ts` — `E2E-ADMIN-01/02`.
- `e2e/lab-03/user-management-responsive.spec.ts` — `V-05/V-06`.
- PR #46 review plus PR #47 accessibility follow-up evidence in `reviewer.md`.

Screenshots:

- `artifacts/lab-03/screenshots/real-10-admin-user-management-desktop.png`
- `artifacts/lab-03/screenshots/real-11-admin-assigned-owner-conflict.png`
- `artifacts/lab-03/screenshots/real-12-admin-create-user-mobile.png`

### Part 9 - Zen Green responsive / boundary evidence

Representative final screenshots:

| # | File | Evidence |
|---|---|---|
| 01 | `real-01-login-desktop.png` | Real Login desktop / Zen Green |
| 02 | `real-02-login-invalid-credentials.png` | Real invalid-credential failure from backend |
| 03 | `real-03-change-password-mobile.png` | Real mandatory Password Change mobile |
| 04 | `real-04-requester-my-tickets-desktop.png` | DB-backed Requester list with canonical Ticket |
| 05 | `real-05-requester-create-ticket-tablet.png` | Real Create Ticket tablet with DB reference data |
| 06 | `real-06-requester-ticket-detail-mobile.png` | DB-backed Requester Ticket Detail + Public Comment |
| 07 | `real-07-requester-isolation-no-results.png` | Real cross-Requester ownership isolation |
| 08 | `real-08-staff-ticket-queue-desktop.png` | DB-backed Staff Queue with three canonical Tickets |
| 09 | `real-09-staff-ticket-detail-mobile.png` | DB-backed Staff Detail + Public Comment/Internal Note |
| 10 | `real-10-admin-user-management-desktop.png` | DB-backed Administrator User Management |
| 11 | `real-11-admin-assigned-owner-conflict.png` | Real assigned-owner deactivation conflict |
| 12 | `real-12-admin-create-user-mobile.png` | Real Create User modal mobile |

Automated responsive/accessibility evidence is still `V-01–V-08` in `docs/lab-03/tests.md`, covering 1280/820/390 layouts, page overflow checks, labels/focus visibility, text-readable state/badges, explicit Public/Internal distinction, and Administrator modal focus containment/Escape-close/focus restoration. The older routed visual-fixture screenshots remain useful automated QA artifacts, but the screenshots embedded above are the final **real DB-backed** submission evidence.

## 2. Feature / Security / Ownership Evidence

### Part 2 - Spec DD / engineering contract

Primary evidence:

- `docs/lab-03/specification.md` — FR/BR/AC, role authorization matrix, Ticket status transitions, migration invariants, security decisions, and Definition of Done.
- `docs/lab-03/api-spec.md` — final authenticated Requester/Staff/Admin REST contract and endpoint-to-Issue mapping.
- `docs/lab-03/ui-spec.md` — final screen/state/responsive contract.
- `docs/lab-03/reviewer.md` Issue 1 — peer-review corrections to the engineering contract before feature implementation.

Traceability principle: planned contracts were written before implementation and later corrected from real review/implementation results rather than retroactively inventing requirements.

### Part 3 - Test DD, traceability, security, regression

Primary evidence:

- `docs/lab-03/tests.md` — AC-to-test inventory, migration/security matrices, per-Issue verification, and final release-candidate results.
- `server/tests/lab-03/` — authentication, authorization, migration/seed, Staff Queue/Detail, Admin User Management, concurrency, and DB-guard coverage.
- `server/tests/lab-02/` — inherited Requester regression retained through Lab 3.
- `client/tests/lab-03/` plus `client/tests/lab-02/` — Login/Change Password/authenticated shell, Requester, Staff, Admin, and inherited UI regression.
- `e2e/lab-03/` — full-stack role E2E plus responsive/accessibility checks.

Issue #40 release-candidate evidence:

- Server: **164/164 (21/21 files)** after adding two CI re-entry guard regressions.
- Client: **75/75 (11/11 files)**.
- Playwright: **12/12**, covering Auth/Requester/Staff/Admin and `V-01–V-08`.
- Server and Client production builds: Pass.
- Prisma validate: Pass; E2E schema up to date.
- Direct authorization/security evidence includes Requester ownership isolation, Staff/Admin authorization, Internal Notes privacy, attachment boundaries, and Admin safety/race cases.

## 3. Search / Filter / Sort / Pagination / States

The detailed Requester, Staff Queue, Staff Detail, Administrator, security, migration, UI-state, E2E, and responsive evidence is preserved in Parts 2-9 above and in docs/lab-03/tests.md. No separate abbreviated copy replaces those detailed mappings.

## 4. Peer Review / CI Evidence

### Release-candidate baseline

- Integrated Lab 3 base before Issue #40 evidence-only work: `lab3-staging` merge commit `580f2b27b974b3425772eba51fe58e7649b7f457` (PR #47).
- Issues #33–#39: closed; PRs #41–#47: approved and merged.
- Issue #40: Final Evidence & Release Readiness, currently in progress on `feature/8-final-evidence-release-readiness`.
- Issue #40 release-candidate verification after the hosted-CI guard correction: Server **164/164**, Client **75/75**, Lab 3 Playwright **12/12**, Server/Client builds Pass, Prisma validate Pass, E2E migration status up to date.
- Issue #40 `npm audit --omit=dev` was not completed because the npm registry was unreachable (`ENOTFOUND`); no fresh audit result is claimed. The earlier completed Issue #39 audit remains historical evidence only.
- Hosted PR #48 subsequently verified production dependency audits successfully in both Server and Client jobs. CI also exposed and drove fixes for a test-database-guard re-entry defect and an 820 px Requester header overflow; both corrections retain strict safety/overflow assertions and have focused/full local regression evidence before re-running hosted CI.
- Hosted CI verification for the head reviewed by `Tanaboonnnnn`: GitHub Actions run `35339970766` passed **Server / Client / E2E** on exact reviewed head `b72334c03acb4ddee0af47e80c75c3f19dce1607`.

### Part 1 - Git workflow, Issues, PRs, review, repository structure

Primary evidence:

- `README.md` — current Lab 3 repository structure, local test/E2E setup, Git workflow, and `lab3-staging` release process.
- `docs/lab-03/reviewer.md` — complete author-side PR review history and peer-review activity.
- GitHub Issues: #33–#39 closed; #40 is the final readiness Issue.
- Author PRs: #41–#47 approved and merged into `lab3-staging`.
- Peer-review evidence: reviews by `thananun-7203` on `Tanaboonnnnn/toktickit` PRs #59, #60, and #61 are recorded in `reviewer.md`.
- `.github/workflows/ci.yml` — current server/client/Lab 3 E2E workflow used for Issue #40 hosted verification.

Author PR progression:

| Issue | PR | Final result |
|---|---|---|
| #33 Engineering Contract | #41 | Approved + merged |
| #34 User Migration/Auth Foundation | #42 | Approved + merged |
| #35 Authenticated Requester | #43 | Approved + merged |
| #36 IT Staff Ticket Queue | #44 | Approved + merged |
| #37 IT Staff Ticket Detail & Operations | #45 | Approved + merged |
| #38 Administrator User Management | #46 | Approved + merged |
| #39 Security/Regression/E2E/Visual QA | #47 | Changes Requested → fixed → re-review Approved + merged |
| #40 Final Evidence & Release Readiness | Issue #40 PR | Pending until opened/reviewed |

Kanban note: GitHub CLI verification of Project `Tok TickIT Individual Sprints` currently lacks the `read:project` token scope, so this file does not fabricate a final board-column state. The Project URL and initialization workflow remain recorded in `reviewer.md`; a final board screenshot/visual check can be supplied from the owner UI if required by the report.

### Part 4 - AI use and reflection

Primary evidence:

- `docs/lab-03/ai-use.md`.

It records:

- model: OpenAI ChatGPT — GPT-5.6 Sol,
- **10 selected real prompts** from planning, implementation/UI approval, and peer-review workflows,
- specification-agent assistance,
- Coding-Agent Log for Issues 2–8,
- a real debugging example from Prisma/PostgreSQL serialization conflict handling,
- final reflection on human oversight, peer review, isolated verification, and limitations of AI-generated assumptions.

## 5. Final Regression

### Final release gates

Before `lab3-staging → main` merge:

1. Issue #40 PR must be reviewed and approved.
2. Hosted CI for the Issue #40 head must report its actual result; do not infer green from local tests.
3. `reviewer.md`, `tests.md`, this evidence index, and `ai-use.md` must be synchronized to the reviewed head.
4. Issue #40 can then be closed and a separate release PR can be prepared from `lab3-staging` to `main`.
5. The release PR must not be merged without explicit student authorization.
