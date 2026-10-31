# Lab 4 — Final Evidence Index

**Status:** Local integrated release-candidate verification is recorded. This index is not the final submission PDF; exact-head hosted CI/review, Project-board proof, final reflection approval, and release PR remain pending.

**Integration baseline:** `lab4-staging` merge commit `4c1226246856a5df95f11984f063c9ff1a42d287` (PR #70). At the start of Issue #59, `lab4-staging` was 56 commits ahead of `main` and 0 commits behind. Issue #59 remains open; implementation PR [#71](https://github.com/thananun-7203/toktickit/pull/71) is open against `lab4-staging`, with `Tanaboonnnnn` requested for review. The separate `lab4-staging -> main` release PR has not been opened.

## Evidence rules

- Keep deterministic Playwright fixture screenshots separate from live Development DB screenshots.
- The 16 fixture-backed responsive screenshots are suitable for layout/interaction evidence at 1280/820/390 CSS pixels.
- The 12 live Development DB screenshots document real role-specific records and UI states. They were captured in a desktop browser session only; they are not mobile/tablet live-DB evidence.
- The live Development DB verification was read-only. It was not reset, seeded, migrated, or written during the recorded sessions.
- Historical local test results and merged feature-PR CI results are not substitutes for a fresh exact-release-head test run and hosted CI.
- A closed GitHub Issue does not prove its Project-board column. Record a Project screenshot or verified Project field value before claiming every Issue is in `Done`.

## Answer Part 1 — Project workflow and GitHub management

**Sources:** `README.md` (Git Workflow), `reviewer.md` (Sprint 4 Workflow, PR history, Kanban / Project Evidence), GitHub Issues #50–#59, and PRs #60–#70.

| Work item | Evidence |
|---|---|
| Integration/release branch convention | `lab4-staging -> main`, with one feature branch and reviewed PR per implementation Issue |
| Completed implementation increments | Issues #50–#58 and PRs #60–#70; Resolution Gate is Issue #67 / PR #68 |
| Current final-evidence task | Issue #59 is open; PR #71 is open against `lab4-staging`, with peer review and exact-head hosted CI pending |
| Project board columns | **Pending independent verification.** Do not infer `Done` from Issue closed state. Add a genuine GitHub Project screenshot here before final PDF generation. |
| README and ignore rules | Root `README.md` and `.gitignore` |

## Answer Part 2 — Requirements and specification

**Sources:**

- `docs/lab-04/specification.md` — scope, Functional Requirements, Business Rules, Acceptance Criteria, decisions, and Product Definition of Done.
- `docs/lab-04/api-spec.md` — endpoint, authorization, version/conflict, and workflow contracts.
- `docs/lab-04/ui-spec.md` — role-specific screens, states, responsive behavior, and accessibility.
- PR #60 — approved Engineering Contract and Test Plan baseline.

**Status:** The specification baseline is approved and implemented through the merged feature PRs. Local integrated tests/builds pass as recorded in `tests.md`; exact-head hosted CI, final release review, and final PDF remain pending.

## Answer Part 3 — Test plan, execution, and results

**Source:** `docs/lab-04/tests.md`.

Feature-level evidence is recorded there with test IDs, acceptance-criteria traceability, exact historical commands/results, issue/PR scope, and explicit distinctions between representative regression and full release regression.

**Release-final local verification (1 November 2026):** Server 230/230 tests (30 files), Client 112/112 tests (14 files), Server and Client builds, Prisma validation, all 9 E2E migrations, migration/seed regression, production dependency audits (0 vulnerabilities in each tree), and combined Lab 3/Lab 4 full-stack Playwright 19/19 passed against isolated test databases. Exact commands/results are recorded in `tests.md` Section 18.

**Still pending:** exact-head hosted CI and peer approval for the Issue #59 PR; actual GitHub Project-board evidence; the student's final review of the AI reflection; and the separate reviewed `lab4-staging -> main` Release PR. Do not mark these complete based only on local test results.

The CI workflow now runs the Lab 3 regression specs plus the Lab 4 full-stack E2E configuration against a dedicated `toktickit_lab4_e2e` database. Local execution passed 19/19 tests; hosted CI on the exact Issue #59 PR head remains pending.

## Answer Part 4 — AI use and reflection

**Source:** `docs/lab-04/ai-use.md`.

- Ten real planning/contract/implementation prompts are currently recorded.
- Later implementation and peer-review corrections are summarized as observable assistance/verification events; no prompt wording is invented.
- The reflection is a draft and requires the student's own review/edit before final submission.

## Answer Part 5 — IT Staff Dashboard

**Fixture-backed responsive screenshots:**

- `artifacts/lab-04/issue-58/staff-dashboard-1280.png`
- `artifacts/lab-04/issue-58/staff-dashboard-820.png`
- `artifacts/lab-04/issue-58/staff-dashboard-390.png`

**Live Development DB evidence:** `artifacts/lab-04/issue-58/staff-live-devdb-dashboard.png` and `staff-live-devdb-ticket-detail.png`.

**Tests:** Staff Dashboard API/UI tests, responsive Playwright, E2E dashboard flow, and the live DB observations in `tests.md`.

**Database comparison:** Requester and Staff Dashboard API tests compare selected metrics with parameterized PostgreSQL `COUNT(*) FILTER` aggregates and compare ordered top lists with independent Prisma queries. The SQL-backed tests passed 9/9 on the isolated test database; see `tests.md` Section 18.

## Answer Part 6 — Actions Taken

**Fixture-backed responsive screenshots:**

- `staff-ticket-actions-1280.png`, `staff-ticket-actions-820.png`, `staff-ticket-actions-390.png`
- `requester-ticket-actions-1280.png`, `requester-ticket-actions-820.png`, `requester-ticket-actions-390.png`

All six paths are under `artifacts/lab-04/issue-58/`.

**Live Development DB evidence:**

- Staff: `staff-live-devdb-actions-comments.png`
- Requester: `requester-live-devdb-actions-comments.png`, `requester-live-devdb-actions-followups.png`, `requester-live-devdb-public-comments.png`

**Tests:** Actions Taken API/authorization/component tests, Requester read-only behavior, assignee/follow-up conflict tests, and `E2E-ISSUE9-AT-WF`.

## Answer Part 7 — Ticket workflow and Resolution Gate

**Evidence:** `staff-ticket-actions-390.png` (fixture-backed Resolution Gate / Follow-up UI), `tests.md` workflow API/UI traceability, and `e2e/lab-04/issue9-fullstack.spec.ts` (`E2E-ISSUE9-AT-WF`).

The full-stack E2E covers create Ticket, Staff claim/status changes, Action create/start/complete, follow-up completion, Resolve, Reopen, current-cycle isolation, and a second-cycle Resolve. Repeat this flow on the dedicated release E2E database and exact release head before finalization.

## Answer Part 8 — Requester Dashboard

**Fixture-backed responsive screenshots:**

- `artifacts/lab-04/issue-58/requester-dashboard-1280.png`
- `artifacts/lab-04/issue-58/requester-dashboard-820.png`
- `artifacts/lab-04/issue-58/requester-dashboard-390.png`

**Live Development DB evidence:** `requester-live-devdb-dashboard.png`, `requester-live-devdb-ticket-detail.png`, and the Requester Action/communications screenshots listed in Part 6.

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

All screenshot paths are under `artifacts/lab-04/issue-58/`. `tests.md` records the manual visual review and the distinction between fixture and live DB evidence. The live DB screenshots are desktop-only.

## Final PDF release gate

Do not generate or label the Answer Part 1–9 PDF as final until all of the following are true:

1. Issue #59 documentation, README, CI, and evidence changes are reviewed and merged into `lab4-staging` by the reviewer.
2. Release-final local gates remain passing, exact-head hosted CI passes, and any remaining gates are either passed or explicitly documented as not applicable with justification.
3. Dashboard aggregate/query comparison remains passing through the PostgreSQL-backed API test assertions in `tests.md`; preserve that evidence on the final release head.
4. The GitHub Project board screenshot/columns are verified from the actual Project.
5. The student has reviewed and finalized the AI reflection wording.
6. The separate `lab4-staging -> main` release PR receives exact-head hosted CI and peer approval, and is merged by the reviewer.
7. The final PDF is generated from the final `main` state and its evidence paths are checked.
