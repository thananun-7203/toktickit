# Lab 4 — Peer Review Record

**Author:** ธนนันท์ ครังตุ้ย — 67070507203 — GitHub: `@thananun-7203`

> This is a living Sprint 4 review record. It must contain only review activity that actually occurs. No approval, reviewer verdict, CI result, merge state, or Project-board state is pre-filled as completed.

## 1. Sprint 4 Workflow

Integration branch: `lab4-staging`

Issue plan prepared before implementation:

| Issue | Scope | Current review record |
|---|---|---|
| #50 | Sprint 4 Engineering Contract & Test Plan | PR #60 opened against `lab4-staging`; peer review pending |
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
- Baseline: Lab 3 release commit `6c9c2f7`
- Current state: contract committed and PR #60 opened against `lab4-staging`; peer review pending.

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

The released Lab 3 documentation records the historical release results separately; they are not represented here as a fresh Issue #50 rerun.

### Pull Request

- PR: [#60 — `[Lab 4] Issue 1: Sprint 4 Engineering Contract & Test Plan`](https://github.com/thananun-7203/toktickit/pull/60)
- Head: `feature/1-sprint4-engineering-contract`
- Base: `lab4-staging`
- Initial contract commit: `67015c7` (`docs(lab4): define sprint 4 engineering contract`)
- PR opened after the student reviewed the working-tree draft and explicitly approved commit/PR creation.
- Issue #50 is referenced without a closing keyword because the PR targets the staging branch; close Issue #50 only after approved merge according to the staged workflow.

### Reviewer

**Not assigned/recorded for Lab 4 Issue #50 yet.** Add the actual reviewer identity only after review is requested or submitted.

### Reviewer Feedback / Response Log

No peer-review comments have been submitted yet.

When review occurs, record each round using this structure:

```text
Round N
- Reviewer:
- Reviewed head:
- Verdict:
- Blocking comments:
- Non-blocking comments:
- Response/fix commit:
- Re-review result:
```

## 3. Pull Requests I Authored — Lab 4

Populate only from actual PRs.

| PR | Branch | Base | Reviewer verdict | Merge state |
|---|---|---|---|---|
| [#60](https://github.com/thananun-7203/toktickit/pull/60) | `feature/1-sprint4-engineering-contract` | `lab4-staging` | Pending peer review | Open |

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
