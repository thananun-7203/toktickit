# TokTickIT Lab 3 — Peer Review Record

**Author:** ธนนันท์ ครังตุ้ย — 67070507203 — GitHub: [@thananun-7203](https://github.com/thananun-7203)<br>
**Repository:** `thananun-7203/toktickit`<br>
**Sprint integration branch:** `lab3-staging`<br>
**Issue 1 feature branch:** `feature/1-sprint3-engineering-contract`

> This is a living review record created before the main Lab 3 implementation. It must record only review activity that actually occurs. Do not pre-fill approvals or reviewer verdicts.

## 1. Planned Lab 3 Issue / PR Flow

| Lab 3 Issue | GitHub Issue | Planned feature scope | PR | Reviewer / verdict |
|---|---|---|---|---|
| Issue 1 | [#33](https://github.com/thananun-7203/toktickit/issues/33) | Sprint 3 Engineering Contract & Test Plan | [#41](https://github.com/thananun-7203/toktickit/pull/41) | Changes requested — round 3 atomic-owner fix in progress |
| Issue 2 | [#34](https://github.com/thananun-7203/toktickit/issues/34) | User Migration, Authentication & Authorization Foundation | Pending | Pending |
| Issue 3 | [#35](https://github.com/thananun-7203/toktickit/issues/35) | Authenticated Requester & Lab 2 Regression | Pending | Pending |
| Issue 4 | [#36](https://github.com/thananun-7203/toktickit/issues/36) | IT Staff Ticket Queue | Pending | Pending |
| Issue 5 | [#37](https://github.com/thananun-7203/toktickit/issues/37) | IT Staff Ticket Detail & Operations | Pending | Pending |
| Issue 6 | [#38](https://github.com/thananun-7203/toktickit/issues/38) | Administrator User Management | Pending | Pending |
| Issue 7 | [#39](https://github.com/thananun-7203/toktickit/issues/39) | Security, Regression, E2E & Visual QA | Pending | Pending |
| Issue 8 | [#40](https://github.com/thananun-7203/toktickit/issues/40) | Final Evidence & Release Readiness | Pending | Pending |
| Release | — | `lab3-staging → main` | Pending | Pending |

## 2. Project / Kanban Workflow

GitHub Project: **Tok TickIT Individual Sprints**<br>
Project URL: `https://github.com/users/thananun-7203/projects/2`

Workflow columns used for Lab 3:

```text
Backlog → Specified → Started → PR Review → Fixing → Done
```

At Sprint 3 initialization:

- Issues #33–#40 were created before implementation.
- Issue #33 was moved to `Started` when Sprint 3 contract work began.
- Issues #34–#40 remain planned/backlog until their turn.

Final evidence must show all required Lab 3 Issues in `Done` before release submission.

## 3. Review Standard

Each implementation PR should be reviewed against:

1. The approved Lab 3 `specification.md`.
2. The endpoint/security behavior in `api-spec.md`.
3. UI/state/responsive behavior in `ui-spec.md`.
4. Planned test/traceability coverage in `tests.md`.
5. The GitHub Issue scope and Completion Checklist.
6. Regression risk to completed Lab 2 behavior.
7. Server-side authorization — hidden buttons are not accepted as the only security control.
8. Actual CI/test evidence from the PR head.

Requested changes must be fixed before merge unless the reviewer clearly marks them non-blocking.

## 4. Issue 1 — Sprint 3 Engineering Contract & Test Plan

### Issue

- GitHub Issue: [#33](https://github.com/thananun-7203/toktickit/issues/33)
- Feature branch: `feature/1-sprint3-engineering-contract`
- Base branch: `lab3-staging`

### Initial contract scope prepared

- `docs/lab-03/specification.md`
- `docs/lab-03/tests.md`
- `docs/lab-03/ui-spec.md`
- `docs/lab-03/api-spec.md`
- `docs/lab-03/reviewer.md`
- `docs/lab-03/ai-use.md`

The first four documents are designed to exist before the main Lab 3 implementation PRs, as required by the Lab 3 Spec DD / Test DD workflow.

### Pull Request

- PR: [#41 — `[Lab 3] Issue 1: Sprint 3 Engineering Contract & Test Plan`](https://github.com/thananun-7203/toktickit/pull/41)
- Head: `feature/1-sprint3-engineering-contract`
- Base: `lab3-staging`
- Initial commit: `afb88b6` (`docs(lab3): define sprint 3 engineering contract`)
- PR opened after the Lab 2 baseline was rerun successfully on an isolated disposable PostgreSQL database.
- PR description records Server **49/49**, Client **25/25**, Server build, Client build, Prisma validation, and inherited seed rerun evidence.
- PR #41 targets `lab3-staging`, so the PR description references Issue #33 without a closing keyword. Issue #33 is linked manually through GitHub Development and remains open during review; it is closed only after the student confirms the merge workflow is complete.

### Reviewer feedback

Round 1 — `Tanaboonnnnn` submitted **Changes requested**. The requested contract fixes were: make attachment permissions consistent across all documents; choose one Public Comment response/loading shape; make the bcrypt rule byte-safe for multibyte passwords; define how `Problem Appears Resolved` behaves when a Ticket is reopened; use the real staging/Issue-link workflow rather than relying on a closing keyword; remove or fully define the extra Unassign scope; choose absolute vs idle session expiry; define missing/`null` Origin behavior; strengthen seed idempotency so reruns do not reset mutable state; and leave the contract-agreement DoD item unchecked until re-review is approved.

Round 2 — after those fixes, `Tanaboonnnnn` again submitted **Changes requested** with two blocking contradictions and four polish items: (1) preserve the Ticket-owner invariant when Admin deactivates/demotes an assigned owner, (2) remove the Reference Data API escape hatch and keep Categories/Related Systems authenticated-only, (3) choose one migration id strategy rather than preserve-id-or-map, (4) test Origin protection directly on Login POST, (5) define which Ticket statuses allow `Problem Appears Resolved`, and (6) update this review record so it no longer says the verdict is simply pending.

Round 3 — `Tanaboonnnnn` confirmed the Round 2 fixes and left one remaining blocker: owner assignment/reassignment must be atomic with concurrent Admin deactivate/demote operations so a race cannot commit a Ticket whose owner is inactive or has role `REQUESTER`. The reviewer also requested two polish items: normalized-email migration collisions should be detected in a preflight and abort explicitly rather than silently merging accounts, and hosted CI must not be claimed green while GitHub reports no checks for the PR head.

### How I responded

Round 1 was resolved before Issue 2 implementation began, including removing the extra Unassign action rather than expanding the workflow. Round 2 was addressed by blocking deactivate/demote-to-Requester for users who still own Tickets (`409 ASSIGNED_TICKETS_REQUIRE_REASSIGNMENT`), locking Reference Data APIs to authenticated roles, preserving `DevelopmentRequester.id` exactly as migrated `User.id`, adding direct Login Origin tests, and limiting `Problem Appears Resolved` to `New`, `Open`, `In Progress`, `Waiting for Requester`, and `Reopened`. Round 3 is addressed by requiring transaction-level serialization/revalidation across owner assignment/reassignment and Admin eligibility changes, adding assign-vs-deactivate/demote race tests (plus reassign coverage), and adding normalized-email collision preflight/abort behavior to the migration plan. GitHub currently reports **no hosted checks** for this PR head, so this review record does not claim hosted CI is green. Final verdict remains pending until the next re-review is submitted.

### Final verdict

Pending.

## 5. Issue 2 — User Migration, Authentication & Authorization Foundation

- PR: Pending.
- Reviewer feedback: Pending.
- Response: Pending.
- Verdict: Pending.

Required review focus when this Issue starts:

- no loss of existing Ticket/Attachment ownership,
- password hashes only (no plaintext),
- session/logout invalidation,
- mandatory first-password change,
- direct backend RBAC tests,
- inactive-account behavior,
- safe authentication errors,
- idempotent seed/migration evidence.

## 6. Issue 3 — Authenticated Requester & Lab 2 Regression

- PR: Pending.
- Reviewer feedback: Pending.
- Response: Pending.
- Verdict: Pending.

Required review focus:

- Development Requester selector/header removed,
- authenticated ownership cannot be overridden by client requester id,
- full Lab 2 Requester regression,
- Public Comments,
- Problem Appears Resolved without formal resolve/close permission.

## 7. Issue 4 — IT Staff Ticket Queue

- PR: Pending.
- Reviewer feedback: Pending.
- Response: Pending.
- Verdict: Pending.

Required review focus:

- query behavior matches API spec,
- assigned/unassigned clarity,
- status/priority/owner fields are readable,
- no mega-grid / no horizontal page overflow,
- role authorization and failure/empty/no-results states.

## 8. Issue 5 — IT Staff Ticket Detail & Operations

- PR: Pending.
- Reviewer feedback: Pending.
- Response: Pending.
- Verdict: Pending.

Required review focus:

- claim/assign/reassign validation,
- Requested vs IT Priority separation,
- complete status-transition matrix enforcement,
- Public Comments vs Internal Notes visibility,
- append-only validation/safe rendering,
- Attachment continuity,
- direct authorization evidence.

## 9. Issue 6 — Administrator User Management

- PR: Pending.
- Reviewer feedback: Pending.
- Response: Pending.
- Verdict: Pending.

Required review focus:

- minimal scope only,
- one role per user,
- duplicate email handling,
- activation/deactivation,
- new initial password + forced change,
- self-deactivation blocked,
- last-active-Administrator protected,
- non-Admin forbidden.

## 10. Issue 7 — Security, Regression, E2E & Visual QA

- PR: Pending.
- Reviewer feedback: Pending.
- Response: Pending.
- Verdict: Pending.

Required review focus:

- unauthenticated vs forbidden vs not-found vs conflict behavior,
- protected-resource information leakage,
- complete Lab 2 regression,
- migration verification,
- complete role E2E,
- desktop/tablet/mobile visual checklist,
- accessibility/focus/overflow,
- builds/Prisma/CI.

## 11. Issue 8 — Final Evidence & Release Readiness

- PR: Pending.
- Reviewer feedback: Pending.
- Response: Pending.
- Verdict: Pending.

Required review focus:

- final documentation agrees with final implementation,
- all test results are from current integrated head,
- evidence screenshots are readable and real rendered UI,
- GitHub/Kanban/reviewer/AI-use evidence complete,
- no stale `Pending` wording used as final status,
- final release DoD satisfied.

## 12. Release PR — `lab3-staging → main`

Release PR: Pending.

Release merge must not occur until:

- all implementation Issues are reviewed and integrated,
- final regression is green,
- Issue 8 release-readiness review is approved,
- the student explicitly authorizes the release merge.

## 13. Pull Requests I Review for Peers

Record actual Lab 3 peer-review activity here as it occurs.

| Repository / PR | Review focus | Review result |
|---|---|---|
| Pending | Pending | Pending |
