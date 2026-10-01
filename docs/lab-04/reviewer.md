# Lab 4 — Peer Review Record

**Author:** ธนนันท์ ครังตุ้ย — 67070507203 — GitHub: `@thananun-7203`

> This is a living Sprint 4 review record. It must contain only review activity that actually occurs. No approval, reviewer verdict, CI result, merge state, or Project-board state is pre-filled as completed.

## 1. Sprint 4 Workflow

Integration branch: `lab4-staging`

Issue plan prepared before implementation:

| Issue | Scope | Current review record |
|---|---|---|
| #50 | Sprint 4 Engineering Contract & Test Plan | PR #60 approved and merged to `lab4-staging`; Issue #50 closed |
| #51 | Actions Taken Data Model, Migration & Seed | PR #61 approved and merged to `lab4-staging`; Issue #51 closed |
| #52 | Actions Taken API & Authorization | PR #62 approved and merged to `lab4-staging`; Issue #52 closed |
| #53 | Actions Taken Ticket Detail UI | Implemented/verified on `feature/4-actions-ticket-detail-ui`; PR intentionally not opened yet |
| #54 | Final Ticket Workflow & Resolution Rules | Not started |
| #55 | IT Staff Dashboard | Not started |
| #56 | Requester Dashboard | Not started |
| #57 | Security, Regression & End-to-End Verification | Not started |
| #58 | Accessibility, Responsive & Visual QA | Not started |
| #59 | Final Evidence & Release Readiness | Not started |

Expected branch flow:

```text
lab4-staging
  <- feature/1-sprint4-engineering-contract
  <- feature branches for later approved issues

final release:
lab4-staging -> main
```

## 2. Issue #50 — Sprint 4 Engineering Contract & Test Plan

### Issue

- GitHub Issue: `#50 — [Lab 4] Issue_1: Sprint 4 Engineering Contract & Test Plan`
- Feature branch: `feature/1-sprint4-engineering-contract`
- Base branch: `lab4-staging`
- Baseline: Lab 3 release commit `6c9c2f7b47e7bedf777b6ccd5bd4eaafeb56d11a`
- Current state: PR #60 received review/fix/re-review, was **Approved**, and was merged into `lab4-staging` as merge commit `6a36d265aff8ef159b437bb85bee1de0f22aa99f`; Issue #50 is closed.

### Contract Files Prepared in the Working Tree

- `docs/lab-04/specification.md`
- `docs/lab-04/tests.md`
- `docs/lab-04/ui-spec.md`
- `docs/lab-04/api-spec.md`
- `docs/lab-04/reviewer.md`
- `docs/lab-04/ai-use.md`

### Baseline Reconnaissance Completed Before Drafting

The Issue #50 work reviewed the released Lab 3 contract and implementation before defining Sprint 4. Areas inspected include:

- Lab 3 `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, and prior review record.
- Prisma schema, Lab 3 migration, and idempotent seed behavior.
- Authentication/session/Origin/role/ownership rules.
- Staff Queue and Ticket Detail owner/priority/status behavior.
- Public Comments, Internal Notes, Attachments, and Requester resolution indication.
- Current React application shell/navigation and Zen Green responsive behavior.
- Server/client test structure, Playwright architecture, test-database guard, and hosted CI configuration.

### Baseline Verification Observed During Issue #50

- Client Vitest: **76/76 passing (11/11 files)**.
- Client production build: **Pass**.
- Server pure Lab 3 unit subset that does not require PostgreSQL: **22/22 passing (6/6 files)**.
- Server TypeScript build: **Pass**.
- Prisma schema validation: **Pass**.
- Full Server API/integration and Playwright suites were **not rerun** during this reconnaissance because Docker/Test PostgreSQL was unavailable and no safe `TEST_DATABASE_URL` was configured. The development database was intentionally not used.

These observations were made while the working tree still matched exact baseline SHA `6c9c2f7b47e7bedf777b6ccd5bd4eaafeb56d11a`. `tests.md` records the actual baseline commands and observed Vitest timestamps. The released Lab 3 documentation records the historical full release results separately; they are not represented here as a fresh Issue #50 rerun. Post-review verification is recorded separately against the exact fix head rather than being mixed into this baseline block.

### Pull Request

- PR: [#60 — `[Lab 4] Issue 1: Sprint 4 Engineering Contract & Test Plan`](https://github.com/thananun-7203/toktickit/pull/60)
- Head: `feature/1-sprint4-engineering-contract`
- Base: `lab4-staging`
- Initial contract commit: `67015c7` (`docs(lab4): define sprint 4 engineering contract`)
- PR opened after the student reviewed the working-tree draft and explicitly approved commit/PR creation.
- Issue #50 is referenced without a closing keyword because the PR targets the staging branch; close Issue #50 only after approved merge according to the staged workflow.

### Reviewer

- Reviewer: `Tanaboonnnnn` (collaborator)
- Review submitted: `2026-09-29T10:38:08Z`
- Exact reviewed head: `2dc560453b0d581c4ee9003b4fc9277f52d0c1ff`
- Verdict: **Changes Requested**

### Reviewer Feedback / Response Log

#### Round 1 — `Tanaboonnnnn` — Changes Requested

Reviewed head: `2dc560453b0d581c4ee9003b4fc9277f52d0c1ff`

The reviewer found the overall contract detailed and well connected to the Lab 3 baseline, but requested contract-level changes before it becomes the source of truth for Issues #51–#59. Blocking/important points were:

1. Clarify assignee/completion/`performedBy` semantics and cover reassign-vs-complete race.
2. Add backend idempotency for Action create; UI busy state/version checks alone cannot prevent duplicate rows after a lost response and retry.
3. Define Ticket aggregate concurrency beyond current-status checking because owner/priority/Action changes can make a snapshot stale without changing status.
4. Prevent prior-cycle Completed Actions from satisfying a new Resolve after Reopen.
5. Make `Recently Resolved` use actual resolution time rather than generic `updatedAt`.
6. Split or rename the combined Staff `Recent / Urgent` list so its predicate/order matches its name.
7. Define `actionDateTime` clearly as business time versus server audit time, including timezone/future boundaries.
8. Record cancellation provenance rather than leaving Cancelled without actor/time.
9. Synchronize this reviewer record with the real reviewer/head/verdict.
10. Tie verification evidence to an exact SHA/command/timestamp and distinguish baseline reconnaissance from later implementation verification.
11. Add explicit tests for lost-response create retry, Reopen->Resolve with only old-cycle work, and reassign-vs-complete race.
12. Clearly label student/project decisions separately from handout-fixed requirements.

#### Response to Round 1

The revision addresses the requested contract gaps across `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, and this review record:

- Completion is now **assignee-only**; `performedBy` is the authoritative current assignee who completes, with explicit reassign-vs-complete race behavior.
- Action create now requires per-Ticket UUID `clientRequestId`; exact lost-response retry returns the existing row while conflicting key reuse returns `409 IDEMPOTENCY_KEY_REUSE`.
- Ticket now has parent aggregate `version`; owner/IT Priority/status/Requester resolution indication/Action mutations increment it, and Resolve uses parent row lock/revalidation plus current child re-read.
- Ticket now has `workflowCycle`; Reopen increments it and only current-cycle Completed work qualifies the next Resolve.
- Ticket now has `resolvedAt`; Recently Resolved is ordered by real resolution time, survives Resolved->Closed, and is cleared on Reopen; legacy times are not fabricated.
- Staff Dashboard now separates `Recently Updated` from High-IT-Priority `Urgent Tickets`.
- `actionDateTime` is explicitly business occurrence time; server audit timestamps are separate; backdating/UTC normalization/future-skew rule and tests are defined.
- Completion/cancellation provenance adds `completedAt`, `cancelledById`, and `cancelledAt`.
- Baseline verification is explicitly tied to Lab 3 baseline SHA `6c9c2f7b47e7bedf777b6ccd5bd4eaafeb56d11a`, with commands/timestamps where observed; future review-fix verification will be reported against its exact head separately.
- Dedicated tests were added for lost-response create retry, old-cycle Resolve rejection, and reassign-vs-complete race.
- `Assumptions and Project Decisions` now explicitly distinguishes choices made by this project from handout-fixed requirements.

Response/fix commit: `5a904b3f2514ede8a34014fbec1eab06043dab30` (`docs(lab4): resolve issue 1 review blockers`).

Re-review result: **Approved in Round 2 at head `9f623b974c32a7905094e1b8f1bb18fbb99e3a8f`.**

#### Round 2 — `Tanaboonnnnn` — Approved

- Reviewed head: `9f623b974c32a7905094e1b8f1bb18fbb99e3a8f`
- Review submitted: `2026-09-29T11:27:24Z`
- Verdict: **Approved**
- Reviewer confirmed the Round 1 contract-level blockers were closed and that the contract was ready to serve as the implementation baseline for Issues #51–#59.
- One **non-blocking cleanup** remained: the Stakeholder Request Interpretation paragraph still contained older wording implying one support user could be assigned while another could perform/complete the Action. That wording did not match the updated BR-02/BR-05 assignee-only completion semantics.

#### Response to Round 2 Non-Blocking Cleanup

- Synchronized the Stakeholder Request Interpretation wording with the approved contract: an Action may be assigned to an eligible support user different from the Ticket Owner, but **only the current Action assignee may Complete**, and that authenticated assignee is recorded as `Performed by`.
- No schema/API/UI/test behavior was changed by this cleanup; it removes factual drift in the explanatory paragraph only.

Cleanup commit: `39e15b5ed737d2cf0e834cdde23b1cb75f6335bf` (`docs(lab4): align assignee completion wording`).

Re-review after cleanup: **Approved** at final reviewed head `48dbae6744f0bfae008a102b5616e45ea1da8d75`; PR #60 was merged by `Tanaboonnnnn` at `2026-09-29T11:43:40Z`.

## 3. Issue #51 — Actions Taken Data Model, Migration & Seed

### Issue

- GitHub Issue: `#51 — [Lab 4] Issue_2: Actions Taken Data Model, Migration & Seed`
- Feature branch: `feature/2-actions-data-foundation`
- Base branch: `lab4-staging`
- Baseline: Issue #50 merge commit `6a36d265aff8ef159b437bb85bee1de0f22aa99f`
- Implementation commit: `065da7ccab7f79db50d7c4f108e3e7dfe74958ce` (`feat(lab4): add actions data foundation`)
- Current state: PR #61 was re-reviewed **Approved** at head `899b7f0d657d8672eea30af0fc08f820c9517566`, merged to `lab4-staging` as `d3a06acbf257b25fa893d4ea1fc1a83ddca89b78`, and Issue #51 is closed.

### Implemented Data Foundation

- Added Prisma `ActionTakenStatus` and one-to-many `Ticket -> ActionTaken` model.
- Added creator/assignee/performer/canceller relations plus completion/cancellation provenance.
- Added per-Action `version`, per-Ticket `version`, `workflowCycle`, and nullable `resolvedAt`.
- Added per-Ticket `clientRequestId` uniqueness for later idempotent Action creation.
- Added migration-level checks for positive versions/cycles, text/follow-up consistency, and terminal lifecycle provenance.
- Preserved legacy rows with default Ticket `version=1`, `workflowCycle=1`, `resolvedAt=NULL`, and zero synthetic Actions.
- Extended create-only/idempotent seed coverage to all eight Ticket statuses, High/Medium/Low/null IT Priority, assigned/unassigned Tickets, zero/one/multiple Actions, all four Action statuses, prior/current workflow cycles, and zero/non-zero dashboard cases.

### Migration / Seed Verification

Verification was performed on a disposable PostgreSQL 16 database named `toktickit_lab4_test`, separate from the development database.

- Prisma format/generate/validate: **Pass**.
- Full migration deploy including Lab 4 migration: **Pass**.
- Targeted Lab 4 migration + seed tests: **5/5 passing (2/2 files)**.
- Full Server regression: **170/170 passing (23/23 files)**.
- Server TypeScript build: **Pass**.
- Client regression: **76/76 passing (11/11 files)**.
- Client production build: **Pass**.
- Development DB reset/destructive verification: **not used**.

### Pull Request / Review

- PR: [#61 — `[Lab 4] Issue 2: Actions Taken Data Model, Migration & Seed`](https://github.com/thananun-7203/toktickit/pull/61)
- Head: `feature/2-actions-data-foundation`
- Base: `lab4-staging`
- PR opened after implementation commit `065da7c` and evidence/docs commit `49904b8` were pushed.
- Reviewer requested: `Tanaboonnnnn`.
- Initial peer-review verdict: **Changes Requested** at head `899b7f0`; reviewer later rechecked the merged source of truth and confirmed the `ActionEvent` / `cancellationSource` blockers were not part of the approved contract.
- Final peer-review verdict: **Approved** by `Tanaboonnnnn` at head `899b7f0d657d8672eea30af0fc08f820c9517566`, submitted `2026-09-29T17:21:26Z`.
- PR #61 merged by `Tanaboonnnnn` at `2026-09-29T17:21:45Z`; merge commit `d3a06acbf257b25fa893d4ea1fc1a83ddca89b78`.
- Issue #51: **Closed**.

## 4. Issue #52 — Actions Taken API & Authorization

### Issue

- GitHub Issue: `#52 — [Lab 4] Issue_3: Actions Taken API & Authorization`
- Feature branch: `feature/3-actions-api-authorization`
- Base branch: `lab4-staging`
- Baseline: Issue #51 merge commit `d3a06acbf257b25fa893d4ea1fc1a83ddca89b78`
- Implementation commit: `6abc6c7f9f0e64fa0ba8367f1d77dfee0253e383` (`feat(lab4): implement actions taken api`)
- Test follow-up: `98b527412b4f4ca3686493ea1560c26592c645c6` (`test(lab4): strengthen actions api coverage`)
- Review-fix commit: `1d62aa0a0be4dc8330d1beff6f516610fc17f2da` (`fix(lab4): harden action idempotency and ticket versions`)
- Current state: PR #62 received Round 1 Changes Requested, was fixed/re-reviewed **Approved**, and merged into `lab4-staging` as `6b77a33eb199623a1d83db770bd6ec4ebf686cf4`; Issue #52 is closed.

### Implemented Backend

- Added role/ownership-safe `GET /api/v1/tickets/:id/actions-taken` with deterministic `actionDateTime DESC, id DESC` ordering.
- Added Staff/Admin `POST /api/v1/staff/tickets/:id/actions-taken` with approved-Origin/auth/password/role gates, active assignee locking, parent Ticket version locking, server-owned creator identity, workflow-cycle copy, and per-Ticket `clientRequestId` idempotency.
- Added active Action edit/reassign `PATCH /api/v1/staff/actions-taken/:id` with Action + Ticket optimistic versions, follow-up normalization, assignee revalidation, and atomic parent activity/version update.
- Added lifecycle `PATCH /api/v1/staff/actions-taken/:id/status` for the approved transition matrix, assignee-only completion, backend performer/completion timestamps, cancellation provenance, terminal immutability, and stale conflict handling.
- Extended Administrator user eligibility mutation so active assigned Actions must be reassigned before deactivate/demote; serializable retries revalidate rather than leaving an invalid assignee relation after a race.
- Exposed Staff Ticket Detail `version`, `workflowCycle`, and `resolvedAt` needed by the approved aggregate/API contract.
- Preserved existing Lab 3 owner behavior under concurrent test load by retrying serialization conflicts and revalidating Claim semantics on retry.
- PR #62 review fix persists immutable original-create intent as an internal SHA-256 fingerprint so a lost-response retry remains idempotent even after the Action has later been edited/reassigned.
- Owner, IT Priority, Ticket Status, and Requester `problem appears resolved` mutations now require `expectedVersion`, increment `Ticket.version` on success, and return `409 STALE_TICKET_STATE` for stale aggregate writes as defined by the approved contract.
- Existing clients were updated only to carry the Ticket version token through these mutation calls; no Issue #53 visual/Actions UI work was introduced.
- Aggregate/Action operations use Ticket-first row locking where applicable; account-eligibility changes keep User-first locking under Serializable retry/revalidation. Concurrency tests verify Owner-vs-Action and Action-assignment-vs-account-state races fail safely rather than producing deadlock-derived `500`s or invalid final assignees.

### Verification

Verification used disposable PostgreSQL 16 database `toktickit_lab4_issue52_test` on port `5545`, separate from the normal development database.

- Disposable migration reset/application of all six migrations: **Pass**.
- Lab 4 seed: **Pass**.
- Targeted Issue #52 + directly affected Lab 3 regression: **56/56 passing (5/5 files)**.
- Issue #52-specific tests in that run: **21/21 passing**.
- Full Server regression: **191/191 passing (26/26 files)**.
- Prisma validate: **Pass**.
- Server TypeScript build: **Pass**.
- Client regression: **76/76 passing (11/11 files)**.
- Client production build: **Pass**.
- Development DB destructive verification: **not used**.

Review-fix verification at `1d62aa0`:

- Disposable PostgreSQL 16 `toktickit_lab4_pr62_fix_test` on test-only port `5546`: **Pass**; seven migrations applied including immutable create-fingerprint migration.
- Targeted review-fix suite: **81/81 passing (7/7 files)**.
- Full Server regression: **196/196 passing (26/26 files)**.
- Server build / Prisma validate: **Pass**.
- Client regression: **76/76 passing (11/11 files)**.
- Client production build: **Pass**.
- Development DB destructive verification: **not used**.

### Pull Request / Review

- PR: [#62 — `[Lab 4] Issue 3: Actions Taken API & Authorization`](https://github.com/thananun-7203/toktickit/pull/62)
- Head: `feature/3-actions-api-authorization`
- Base: `lab4-staging`
- PR opened after implementation commit `6abc6c7`, strengthened test commit `98b5274`, and evidence/docs commit `6593135` were pushed.
- Reviewer requested: `Tanaboonnnnn`.
- Round 1 reviewer: `Tanaboonnnnn`.
- Round 1 reviewed head: `0290b66b5a1685e379593bc2cdca8001d379fb85`.
- Round 1 submitted: `2026-09-30T08:59:42Z`.
- Round 1 verdict: **Changes Requested**.
- Blocking feedback: (1) create idempotency must compare immutable original create intent rather than mutable Action columns; (2) existing Owner/IT Priority and the rest of the approved workflow-affecting Ticket writes must participate in `Ticket.version` so Action writes cannot accept stale aggregate snapshots.
- Additional review focus: document/verify lock ordering and concurrent race safety; synchronize this reviewer record with the actual PR state.
- Response commit: `1d62aa0a0be4dc8330d1beff6f516610fc17f2da` addresses both blockers plus lock-order/race coverage.
- Re-review reviewed head: `a4d13767163ff024890f49f5cba9a700c8192048`.
- Re-review submitted: `2026-09-30T16:51:09Z`.
- Re-review verdict: **Approved** by `Tanaboonnnnn`.
- Reviewer confirmed the immutable original-create idempotency fix, authoritative aggregate `Ticket.version` protocol, Claim retry semantics, lock/race strategy, authorization boundaries, and exact review-fix evidence; remaining route/service refactoring suggestions were explicitly non-blocking.
- PR #62 merged by `Tanaboonnnnn` at `2026-09-30T16:51:23Z`; merge commit `6b77a33eb199623a1d83db770bd6ec4ebf686cf4`.
- Issue #52: **Closed** (`2026-09-30T17:51:10Z`).

## 5. Issue #53 — Actions Taken Ticket Detail UI

### Issue

- GitHub Issue: `#53 — [Lab 4] Issue_4: Actions Taken Ticket Detail UI`
- Feature branch: `feature/4-actions-ticket-detail-ui`
- Base branch: `lab4-staging`
- Baseline: Issue #52 merge commit `6b77a33eb199623a1d83db770bd6ec4ebf686cf4`
- Implementation commit: `6d60a9336c55b6318978f332bcc9a43bae3ffae0` (`feat(lab4): add actions taken ticket detail ui`)
- Current state: implementation and local verification complete; **PR intentionally not opened yet** because the student requested a manual checkpoint before PR creation.

### Human-Approved Mockup Checkpoint

- Desktop and mobile mockups were reviewed by the student before frontend implementation.
- The student explicitly approved both mockups and authorized implementation while instructing the agent **not to open a PR yet**.
- The implemented UI keeps the established TokTickIT Zen Green visual language instead of introducing a separate Lab 4 theme.

### Implemented UI

- Added reusable `ActionsTakenPanel` to Staff Ticket Detail and Requester Ticket Detail.
- Staff/Admin view supports Add, Edit, Reassign, Planned -> In Progress, Complete, and Cancel flows using the existing Issue #52 API contract.
- Create/Edit forms include Action Date/Time, Description, Assignee, Follow-Up Required/Note, and text-only Attachment Notes; create status is not user-selectable and starts as Planned.
- Complete requires Result plus valid follow-up state; only the current assignee is offered Complete, while other Staff are directed to Reassign first.
- Completed/Cancelled Actions render read-only audit/provenance details with no edit/delete controls.
- Requester view reuses the Action list in read-only mode with no Staff mutation controls.
- Added loading, empty, API failure/Retry, field validation, stale Action/Ticket, ineligible-assignee, busy-submit, idempotent retry/recovery, and safe terminal-Ticket states.
- Unknown-response create retries preserve one `clientRequestId`; a recovered `200` replay refreshes authoritative Ticket state instead of guessing the parent version.
- Added modal focus entry/trap/restore, Escape handling, first-invalid focus, text labels that do not rely on color alone, and responsive rules for desktop/tablet/mobile stacking.
- Actions Taken appears before Public Comments/Internal Notes on Staff Ticket Detail and before Public Comments on Requester Ticket Detail, preserving the approved information hierarchy.

### Verification

Issue #53 implementation commit `6d60a93` was verified before evidence synchronization:

- Targeted Client Actions/Staff/Requester Ticket Detail regression: **31/31 passing (3/3 files)**; Vitest start `2026-10-01 14:33:53 +07`.
- Full Client regression: **90/90 passing (12/12 files)**; Vitest start `2026-10-01 14:34:25 +07`.
- Client production build: **Pass**.
- Disposable PostgreSQL 16 `toktickit_lab4_issue53_test` on test-only port `5548`: **Pass**; seven migrations applied and Lab 4 seed completed with 8 Tickets / 7 Actions Taken.
- Backend endpoints exercised by the UI: **53/53 passing (4/4 files)** across Actions API, Lab 4 authorization, Staff Ticket Detail, and Comments/Requester resolution indication; Vitest start `2026-10-01 14:40:09 +07`.
- Prisma validate / Server TypeScript build: **Pass**.
- Development DB destructive verification: **not used**.
- Manual browser QA verified the implemented desktop and tablet Actions panel/modal layout without page horizontal overflow. Mobile-specific `<=420px` stacking rules are implemented; final exact 390px real-browser/Playwright evidence remains part of the dedicated Issue #58 accessibility/responsive/visual gate rather than being overstated here.
- Temporary visual-QA harness/data were not included in the implementation commit.

### Pull Request / Review

- PR: **not opened by explicit student instruction**.
- Reviewer: **not requested yet**.
- Peer-review verdict: **not applicable yet**.
- Issue #53 remains **Open**.

## 6. Pull Requests I Authored — Lab 4

Populate only from actual PRs.

| PR | Branch | Base | Reviewer verdict | Merge state |
|---|---|---|---|---|
| [#60](https://github.com/thananun-7203/toktickit/pull/60) | `feature/1-sprint4-engineering-contract` | `lab4-staging` | Approved by `Tanaboonnnnn` at final reviewed head `48dbae6` | Merged (`6a36d26`) |
| [#61](https://github.com/thananun-7203/toktickit/pull/61) | `feature/2-actions-data-foundation` | `lab4-staging` | Approved by `Tanaboonnnnn` at `899b7f0` after source-of-truth clarification | Merged (`d3a06ac`) |
| [#62](https://github.com/thananun-7203/toktickit/pull/62) | `feature/3-actions-api-authorization` | `lab4-staging` | Approved by `Tanaboonnnnn` at `a4d1376` after Round 1 fixes | Merged (`6b77a33`) |

Issue #53 has no PR row yet because no PR has been opened.

## 7. Review Standard

Each Lab 4 implementation PR should be reviewed against:

1. `docs/lab-04/specification.md` numbered FR/BR/AC and Product Definition of Done.
2. Exact endpoint/security/conflict behavior in `api-spec.md`.
3. UI states, role behavior, responsive/accessibility rules in `ui-spec.md`.
4. Planned/actual test traceability in `tests.md`.
5. The corresponding GitHub Issue Scope/Completion Checklist.
6. Regression risk to approved Labs 1–3 behavior.
7. Backend authorization; hidden UI controls are not accepted as the only security mechanism.
8. Migration preservation and safe test-database evidence for database-changing PRs.
9. Concurrency/stale-update/duplicate-action behavior where relevant.
10. Actual hosted/local checks from the exact reviewed PR head; stale evidence must not be presented as current.

Requested changes remain blocking until fixed or the reviewer explicitly marks them non-blocking.

## 8. Kanban / Project Evidence

The existing workflow convention remains:

```text
Backlog -> Specified -> Started -> PR Review -> Fixing -> Done
```

Issue states/Project columns must be recorded from actual GitHub evidence. This file does not invent a current Project column when it has not been independently verified.

## 9. Final Release Review

To be completed only after Issues #50–#59 have real evidence:

- Release PR: `lab4-staging -> main`.
- Exact release head SHA.
- Exact-head hosted CI run.
- Reviewer identity and submitted verdict.
- Required changes and response commits, if any.
- Final approval and merge commit.
- Final `main` regression/evidence synchronization.
