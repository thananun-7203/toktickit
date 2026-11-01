# Lab 4 — Final Evidence Index

This index maps the Lab 4 repository evidence to the requested Answer Part 1–9 submission areas. It records repository artifacts and observed results only.

**Current status:** PR #71 was approved by `Tanaboonnnnn` at exact head `bb22818b8b593ebdd1b067d932987e0519136c80` and merged into `lab4-staging` as merge commit `a8c94002bee0dc73d7dcfc48eb4cedbba16c5c15`. Exact-head hosted CI Run #65 passed (client/server/e2e). The student supplied a GitHub Project screenshot showing the visible Lab 4 Issues #53–#59 in `Done` and confirmed the AI Reflection and Gemini Pro entry are accurate. The separate `lab4-staging -> main` Release PR and its exact-head CI/review remain pending.

**Integration baseline:** `lab4-staging` now includes PR #71 merge commit `a8c94002bee0dc73d7dcfc48eb4cedbba16c5c15`. The latest compare reports `lab4-staging` 63 commits ahead of `main` and 0 behind. Issue #59 is closed; [PR #71](https://github.com/thananun-7203/toktickit/pull/71) was approved at exact head `bb22818b8b593ebdd1b067d932987e0519136c80`, passed hosted CI Run #65, and was merged by `Tanaboonnnnn`. The separate `lab4-staging -> main` release PR has not yet been opened.

## Evidence rules

- Keep deterministic Playwright fixture screenshots separate from live Development DB screenshots.
- The 16 fixture-backed responsive screenshots are suitable for layout/interaction evidence at 1280/820/390 CSS pixels.
- Four additional browser screenshots document Requester/Staff Dashboard empty and API-failure recovery states; these are deterministic UI fixtures, not live database records.
- The 12 live Development DB screenshots document real role-specific records and UI states. They were captured in a desktop browser session only; they are not mobile/tablet live-DB evidence.
- Issue #59 consolidates the 16 responsive fixture screenshots, 12 live Development DB screenshots, and 4 new boundary-state screenshots under `artifacts/lab-04/screenshots/`; the original Issue #58 evidence remains preserved under `artifacts/lab-04/issue-58/`.
- The live Development DB verification was read-only. It was not reset, seeded, migrated, or written during the recorded sessions.
- Historical local test results and merged feature-PR CI results are not substitutes for a fresh exact-release-head test run and hosted CI.
- A closed GitHub Issue does not prove its Project-board column. Record a Project screenshot or verified Project field value before claiming every Issue is in `Done`.

## Screenshot previews

The screenshots below are embedded previews of the actual repository image files, following the image-preview format used in the Lab 3 evidence index. Fixture-backed screenshots demonstrate responsive layouts and deterministic UI states; Development DB screenshots show the read-only live application evidence. They are kept clearly separated so fixture data is not mistaken for live database data.

### Fixture-backed responsive UI

#### Administrator

![Administrator Dashboard — Desktop 1280](../../artifacts/lab-04/screenshots/administrator-dashboard-1280.png)

![Administrator Dashboard — Tablet 820](../../artifacts/lab-04/screenshots/administrator-dashboard-820.png)

![Administrator Ticket Queue — Mobile 390](../../artifacts/lab-04/screenshots/administrator-ticket-queue-390.png)

![Administrator User Management — Mobile 390](../../artifacts/lab-04/screenshots/administrator-user-management-390.png)

#### Requester Dashboard

![Requester Dashboard — Desktop 1280](../../artifacts/lab-04/screenshots/requester-dashboard-1280.png)

![Requester Dashboard — Tablet 820](../../artifacts/lab-04/screenshots/requester-dashboard-820.png)

![Requester Dashboard — Mobile 390](../../artifacts/lab-04/screenshots/requester-dashboard-390.png)

#### IT Staff Dashboard

![Staff Dashboard — Desktop 1280](../../artifacts/lab-04/screenshots/staff-dashboard-1280.png)

![Staff Dashboard — Tablet 820](../../artifacts/lab-04/screenshots/staff-dashboard-820.png)

![Staff Dashboard — Mobile 390](../../artifacts/lab-04/screenshots/staff-dashboard-390.png)

#### Requester Ticket Actions

![Requester Ticket Actions — Desktop 1280](../../artifacts/lab-04/screenshots/requester-ticket-actions-1280.png)

![Requester Ticket Actions — Tablet 820](../../artifacts/lab-04/screenshots/requester-ticket-actions-820.png)

![Requester Ticket Actions — Mobile 390](../../artifacts/lab-04/screenshots/requester-ticket-actions-390.png)

#### Staff Ticket Actions and Resolution Gate

![Staff Ticket Actions — Desktop 1280](../../artifacts/lab-04/screenshots/staff-ticket-actions-1280.png)

![Staff Ticket Actions — Tablet 820](../../artifacts/lab-04/screenshots/staff-ticket-actions-820.png)

![Staff Ticket Actions — Mobile 390](../../artifacts/lab-04/screenshots/staff-ticket-actions-390.png)

### Live Development DB screenshots

These captures show the real application connected to the Development DB. The recorded verification was read-only; no reset, seed, migration, or write was performed.

#### IT Staff

![Staff Dashboard — Live Development DB](../../artifacts/lab-04/screenshots/staff-live-devdb-dashboard.png)

![Staff Ticket Detail — Live Development DB](../../artifacts/lab-04/screenshots/staff-live-devdb-ticket-detail.png)

![Staff Actions and Comments — Live Development DB](../../artifacts/lab-04/screenshots/staff-live-devdb-actions-comments.png)

#### Requester

![Requester Dashboard — Live Development DB](../../artifacts/lab-04/screenshots/requester-live-devdb-dashboard.png)

![Requester Ticket Detail — Live Development DB](../../artifacts/lab-04/screenshots/requester-live-devdb-ticket-detail.png)

![Requester Actions and Comments — Live Development DB](../../artifacts/lab-04/screenshots/requester-live-devdb-actions-comments.png)

![Requester Follow-ups — Live Development DB](../../artifacts/lab-04/screenshots/requester-live-devdb-actions-followups.png)

![Requester Public Comments — Live Development DB](../../artifacts/lab-04/screenshots/requester-live-devdb-public-comments.png)

#### Administrator

![Administrator Dashboard — Live Development DB](../../artifacts/lab-04/screenshots/administrator-live-devdb-dashboard.png)

![Administrator Ticket Queue — Live Development DB](../../artifacts/lab-04/screenshots/administrator-live-devdb-ticket-queue.png)

![Administrator User Management — Live Development DB](../../artifacts/lab-04/screenshots/administrator-live-devdb-user-management.png)

![Administrator Create User Dialog — Live Development DB](../../artifacts/lab-04/screenshots/administrator-live-devdb-create-user-dialog.png)

### Dashboard empty and API-failure states

![Requester Dashboard — Empty State](../../artifacts/lab-04/screenshots/requester-dashboard-empty-1280.png)

![Staff Dashboard — Empty State](../../artifacts/lab-04/screenshots/staff-dashboard-empty-1280.png)

![Requester Dashboard — API Failure and Retry](../../artifacts/lab-04/screenshots/requester-dashboard-error-1280.png)

![Staff Dashboard — API Failure](../../artifacts/lab-04/screenshots/staff-dashboard-error-1280.png)

## Answer Part 1 — Project workflow and GitHub management

**Sources:** `README.md` (Git Workflow), `reviewer.md` (Sprint 4 Workflow, PR history, Kanban / Project Evidence), GitHub Issues #50–#59, and PRs #60–#71.

| Work item | Evidence |
|---|---|
| Integration/release branch convention | `lab4-staging -> main`, with one feature branch and reviewed PR per implementation Issue |
| Completed implementation increments | Issues #50–#58 and PRs #60–#70; Resolution Gate is Issue #67 / PR #68 |
| Current final-evidence task | Issue #59 is closed; PR #71 is merged into `lab4-staging` by `Tanaboonnnnn` after exact-head approval and hosted CI Run #65 |
| Project board columns | Student-provided screenshot of **Tok TickIT Individual Sprints** shows the visible Lab 4 issue cards #53, #54, #55, #56, #67, #57, #58, and #59 in the `Done` column. Preserve the original screenshot in the final submission evidence bundle. |
| README and ignore rules | Root `README.md` and `.gitignore` |

## Answer Part 2 — Requirements and specification

**Sources:**

- `docs/lab-04/specification.md` — scope, Functional Requirements, Business Rules, Acceptance Criteria, decisions, and Product Definition of Done.
- `docs/lab-04/api-spec.md` — endpoint, authorization, version/conflict, and workflow contracts.
- `docs/lab-04/ui-spec.md` — role-specific screens, states, responsive behavior, and accessibility.
- PR #60 — approved Engineering Contract and Test Plan baseline.

**Status:** The specification baseline is approved and implemented through the merged feature PRs. Local integrated tests/builds pass as recorded in `tests.md`; PR #71 exact-head hosted CI, peer review, and reviewer-controlled merge into `lab4-staging` are complete. The separate release PR and final PDF remain pending.

## Answer Part 3 — Test plan, execution, and results

**Source:** `docs/lab-04/tests.md`.

Feature-level evidence is recorded there with test IDs, acceptance-criteria traceability, exact historical commands/results, issue/PR scope, and explicit distinctions between representative regression and full release regression.

**Release-final local verification (1 November 2026):** Server 230/230 tests (30 files), Client 112/112 tests (14 files), Server and Client builds, Prisma validation, all 9 E2E migrations, migration/seed regression, production dependency audits (0 vulnerabilities in each tree), and combined Lab 3/Lab 4 full-stack Playwright 23/23 passed against isolated test databases. Exact commands/results are recorded in `tests.md` Section 18.

**Still pending:** a fresh exact-release-head hosted CI run and independent review on the separate `lab4-staging -> main` Release PR, followed by reviewer-controlled merge and final PDF generation. The Project-board screenshot and student AI Reflection confirmation have been supplied.

The CI workflow now runs the Lab 3 regression specs plus the Lab 4 full-stack E2E configuration against a dedicated `toktickit_lab4_e2e` database. Local execution passed 23/23 tests, including four new Dashboard empty/error-state checks; hosted CI Run #65 passed on PR #71 exact re-reviewed head `bb22818`, and `Tanaboonnnnn` approved and merged that head into `lab4-staging`.

## Answer Part 4 — AI use and reflection

**Source:** `docs/lab-04/ai-use.md`.

- Ten selected prompt summaries are recorded in ai-use.md; they are summaries rather than verbatim transcripts.
- Later implementation and peer-review corrections are summarized as observable assistance/verification events; no prompt wording is invented.
- The student confirmed that both first-person reflection paragraphs and the Gemini Pro model entry accurately describe their actual work. A minor typographical correction was made without changing the reflection's meaning.

## Answer Part 5 — IT Staff Dashboard

**Fixture-backed responsive screenshots:**

- `artifacts/lab-04/screenshots/staff-dashboard-1280.png`
- `artifacts/lab-04/screenshots/staff-dashboard-820.png`
- `artifacts/lab-04/screenshots/staff-dashboard-390.png`

**Live Development DB evidence:** `artifacts/lab-04/screenshots/staff-live-devdb-dashboard.png` and `staff-live-devdb-ticket-detail.png`.

**Tests:** Staff Dashboard API/UI tests, responsive Playwright, E2E dashboard flow, and the live DB observations in `tests.md`.

**Database comparison:** Requester and Staff Dashboard API tests compare selected metrics with parameterized PostgreSQL `COUNT(*) FILTER` aggregates and compare ordered top lists with independent Prisma queries. The SQL-backed tests passed 9/9 on the isolated test database; see `tests.md` Section 18.

## Answer Part 6 — Actions Taken

**Fixture-backed responsive screenshots:**

- `staff-ticket-actions-1280.png`, `staff-ticket-actions-820.png`, `staff-ticket-actions-390.png`
- `requester-ticket-actions-1280.png`, `requester-ticket-actions-820.png`, `requester-ticket-actions-390.png`

All six paths are under `artifacts/lab-04/screenshots/`.

**Live Development DB evidence:**

- Staff: `artifacts/lab-04/screenshots/staff-live-devdb-actions-comments.png`
- Requester: `artifacts/lab-04/screenshots/requester-live-devdb-actions-comments.png`, `requester-live-devdb-actions-followups.png`, `requester-live-devdb-public-comments.png`

**Tests:** Actions Taken API/authorization/component tests, Requester read-only behavior, assignee/follow-up conflict tests, and `E2E-ISSUE9-AT-WF`.

## Answer Part 7 — Ticket workflow and Resolution Gate

**Evidence:** `artifacts/lab-04/screenshots/staff-ticket-actions-390.png` (fixture-backed Resolution Gate / Follow-up UI), `tests.md` workflow API/UI traceability, and `e2e/lab-04/issue9-fullstack.spec.ts` (`E2E-ISSUE9-AT-WF`).

The full-stack E2E covers create Ticket, Staff claim/status changes, Action create/start/complete, follow-up completion, Resolve, Reopen, current-cycle isolation, and a second-cycle Resolve. Repeat this flow on the dedicated release E2E database and exact release head before finalization.

## Answer Part 8 — Requester Dashboard

**Fixture-backed responsive screenshots:**

- `artifacts/lab-04/screenshots/requester-dashboard-1280.png`
- `artifacts/lab-04/screenshots/requester-dashboard-820.png`
- `artifacts/lab-04/screenshots/requester-dashboard-390.png`

**Live Development DB evidence:** `artifacts/lab-04/screenshots/requester-live-devdb-dashboard.png`, `requester-live-devdb-ticket-detail.png`, and the Requester Action/communications screenshots listed in Part 6.

**Tests:** Requester Dashboard API/UI tests, ownership/authorization regressions, waiting-for-requester drill-down, and `E2E-ISSUE9-DASH`.

## Answer Part 9 — Responsive, accessibility, and visual QA

**Fixture-backed screenshots (16):**

- Administrator: `administrator-dashboard-1280.png`, `administrator-dashboard-820.png`, `administrator-ticket-queue-390.png`, `administrator-user-management-390.png`.
- Requester Dashboard: `requester-dashboard-1280.png`, `requester-dashboard-820.png`, `requester-dashboard-390.png`.
- Staff Dashboard: `staff-dashboard-1280.png`, `staff-dashboard-820.png`, `staff-dashboard-390.png`.
- Requester Ticket Detail: `requester-ticket-actions-1280.png`, `requester-ticket-actions-820.png`, `requester-ticket-actions-390.png`.
- Staff Ticket Detail: `staff-ticket-actions-1280.png`, `staff-ticket-actions-820.png`, `staff-ticket-actions-390.png`.

**Live Development DB screenshots (12):**

- Staff (3): `staff-live-devdb-dashboard.png`, `staff-live-devdb-ticket-detail.png`, `staff-live-devdb-actions-comments.png`.
- Requester (5): `requester-live-devdb-dashboard.png`, `requester-live-devdb-ticket-detail.png`, `requester-live-devdb-actions-comments.png`, `requester-live-devdb-actions-followups.png`, `requester-live-devdb-public-comments.png`.
- Administrator (4): `administrator-live-devdb-dashboard.png`, `administrator-live-devdb-ticket-queue.png`, `administrator-live-devdb-user-management.png`, `administrator-live-devdb-create-user-dialog.png`.

All 16 responsive fixture and 12 live Development DB screenshots are under `artifacts/lab-04/screenshots/`. `tests.md` records the manual visual review and the distinction between fixture and live DB evidence. The live DB screenshots are desktop-only.

**Failure/boundary screenshots (4):**

- `requester-dashboard-empty-1280.png` — zero Tickets and both empty dashboard lists.
- `staff-dashboard-empty-1280.png` — zero active work, My Active Actions, Urgent Tickets, and Recently Updated Tickets.
- `requester-dashboard-error-1280.png` — safe API-failure message and Retry control.
- `staff-dashboard-error-1280.png` — safe Staff Dashboard API-failure state.

These four browser-rendered fixture screenshots are also under `artifacts/lab-04/screenshots/`; their automated checks are `EV-01` through `EV-04` in `e2e/lab-04/dashboard-boundary-evidence.spec.ts`.

## Final PDF release gate

Do not generate or label the Answer Part 1–9 PDF as final until all of the following are true:

1. Issue #59 documentation, README, CI, and evidence changes are reviewed and merged into `lab4-staging` by the reviewer.
2. Release-final local gates remain passing, exact-head hosted CI passes, and any remaining gates are either passed or explicitly documented as not applicable with justification.
3. Dashboard aggregate/query comparison remains passing through the PostgreSQL-backed API test assertions in `tests.md`; preserve that evidence on the final release head.
4. The student-provided GitHub Project screenshot verifies the visible Lab 4 issue cards in the `Done` column; preserve the screenshot in the final PDF evidence.
5. The student confirmed the AI reflection wording and Gemini Pro entry; the typo correction is included in the release branch.
6. The separate `lab4-staging -> main` release PR receives exact-head hosted CI and peer approval, and is merged by the reviewer.
7. The final PDF is generated from the final `main` state and its evidence paths are checked.
