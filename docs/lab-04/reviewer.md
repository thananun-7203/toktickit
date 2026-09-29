# Lab 4 — Peer Review Record

**Author:** ธนนันท์ ครังตุ้ย — 67070507203 — GitHub: `@thananun-7203`

> This is a living Sprint 4 review record. It must contain only review activity that actually occurs. No approval, reviewer verdict, CI result, merge state, or Project-board state is pre-filled as completed.

## 1. Sprint 4 Workflow

Integration branch: `lab4-staging`

Issue plan prepared before implementation:

| Issue | Scope | Current review record |
|---|---|---|
| #50 | Sprint 4 Engineering Contract & Test Plan | PR #60 — Round 1 fixes pushed in `5a904b3`; re-review pending |
| #51 | Actions Taken Data Model, Migration & Seed | Not started |
| #52 | Actions Taken API & Authorization | Not started |
| #53 | Actions Taken Ticket Detail UI | Not started |
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
- Current state: PR #60 received **Changes Requested** from `Tanaboonnnnn`; Round 1 contract fixes were pushed and are awaiting re-review.

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

Re-review after cleanup: **pending**.

## 3. Pull Requests I Authored — Lab 4

Populate only from actual PRs.

| PR | Branch | Base | Reviewer verdict | Merge state |
|---|---|---|---|---|
| [#60](https://github.com/thananun-7203/toktickit/pull/60) | `feature/1-sprint4-engineering-contract` | `lab4-staging` | Approved by `Tanaboonnnnn` at `9f623b9`; non-blocking wording cleanup applied, final re-review pending | Open |

## 4. Review Standard

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

## 5. Kanban / Project Evidence

The existing workflow convention remains:

```text
Backlog -> Specified -> Started -> PR Review -> Fixing -> Done
```

Issue states/Project columns must be recorded from actual GitHub evidence. This file does not invent a current Project column when it has not been independently verified.

## 6. Final Release Review

To be completed only after Issues #50–#59 have real evidence:

- Release PR: `lab4-staging -> main`.
- Exact release head SHA.
- Exact-head hosted CI run.
- Reviewer identity and submitted verdict.
- Required changes and response commits, if any.
- Final approval and merge commit.
- Final `main` regression/evidence synchronization.
