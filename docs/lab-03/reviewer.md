# TokTickIT Lab 3 — Peer Review Record

**Author:** ธนนันท์ ครังตุ้ย — 67070507203 — GitHub: [@thananun-7203](https://github.com/thananun-7203)<br>
**Repository:** `thananun-7203/toktickit`<br>
**Sprint integration branch:** `lab3-staging`<br>
**Issue 1 feature branch:** `feature/1-sprint3-engineering-contract`

> This is a living review record created before the main Lab 3 implementation. It must record only review activity that actually occurs. Do not pre-fill approvals or reviewer verdicts.

## 1. Planned Lab 3 Issue / PR Flow

| Lab 3 Issue | GitHub Issue | Planned feature scope | PR | Reviewer / verdict |
|---|---|---|---|---|
| Issue 1 | [#33](https://github.com/thananun-7203/toktickit/issues/33) | Sprint 3 Engineering Contract & Test Plan | [#41](https://github.com/thananun-7203/toktickit/pull/41) | **Approved and merged** |
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
- Final reviewed head: `70a682e` (`docs(lab3): close owner invariant race contract`)
- Merge commit: `478c940bf50a1d17c88ae13412223a1cff5684e8`
- Merged into `lab3-staging` on 2026-09-15 after approval from `Tanaboonnnnn`.
- PR opened after the Lab 2 baseline was rerun successfully on an isolated disposable PostgreSQL database.
- PR description records Server **49/49**, Client **25/25**, Server build, Client build, Prisma validation, and inherited seed rerun evidence.
- PR #41 targeted `lab3-staging`, so the PR description referenced Issue #33 without a closing keyword. Issue #33 was linked manually through GitHub Development, remained open throughout review, and was closed only after PR #41 was approved and merged.

### Reviewer feedback

Round 1 — `Tanaboonnnnn` submitted **Changes requested**. The requested contract fixes were: make attachment permissions consistent across all documents; choose one Public Comment response/loading shape; make the bcrypt rule byte-safe for multibyte passwords; define how `Problem Appears Resolved` behaves when a Ticket is reopened; use the real staging/Issue-link workflow rather than relying on a closing keyword; remove or fully define the extra Unassign scope; choose absolute vs idle session expiry; define missing/`null` Origin behavior; strengthen seed idempotency so reruns do not reset mutable state; and leave the contract-agreement DoD item unchecked until re-review is approved.

Round 2 — after those fixes, `Tanaboonnnnn` again submitted **Changes requested** with two blocking contradictions and four polish items: (1) preserve the Ticket-owner invariant when Admin deactivates/demotes an assigned owner, (2) remove the Reference Data API escape hatch and keep Categories/Related Systems authenticated-only, (3) choose one migration id strategy rather than preserve-id-or-map, (4) test Origin protection directly on Login POST, (5) define which Ticket statuses allow `Problem Appears Resolved`, and (6) update this review record so it no longer says the verdict is simply pending.

Round 3 — `Tanaboonnnnn` confirmed the Round 2 fixes and left one remaining blocker: owner assignment/reassignment must be atomic with concurrent Admin deactivate/demote operations so a race cannot commit a Ticket whose owner is inactive or has role `REQUESTER`. The reviewer also requested two polish items: normalized-email migration collisions should be detected in a preflight and abort explicitly rather than silently merging accounts, and hosted CI must not be claimed green while GitHub reports no checks for the PR head.

Round 4 — `Tanaboonnnnn` re-reviewed commit `70a682e` and submitted **Approved**. The reviewer confirmed that the owner-invariant concurrency contract, serialization/revalidation requirement, race-test coverage, normalized-email migration preflight, and earlier contract corrections were all resolved. Two implementation notes remain non-blocking: Issue 2 must implement the database concurrency strategy atomically as specified, and hosted CI must not be reported as green until GitHub has an actual hosted check result.

### How I responded

Round 1 was resolved before Issue 2 implementation began, including removing the extra Unassign action rather than expanding the workflow. Round 2 was addressed by blocking deactivate/demote-to-Requester for users who still own Tickets (`409 ASSIGNED_TICKETS_REQUIRE_REASSIGNMENT`), locking Reference Data APIs to authenticated roles, preserving `DevelopmentRequester.id` exactly as migrated `User.id`, adding direct Login Origin tests, and limiting `Problem Appears Resolved` to `New`, `Open`, `In Progress`, `Waiting for Requester`, and `Reopened`. Round 3 was addressed by requiring transaction-level serialization/revalidation across owner assignment/reassignment and Admin eligibility changes, adding assign-vs-deactivate/demote race tests (plus reassign coverage), and adding normalized-email collision preflight/abort behavior to the migration plan. Round 4 confirmed those fixes and approved the contract. GitHub reported **no hosted checks** for the reviewed PR head, so this record intentionally does not claim hosted CI was green for PR #41.

### Final verdict

**Approved.** `Tanaboonnnnn` approved PR #41 at reviewed head `70a682e`. The PR was then merged into `lab3-staging` as merge commit `478c940bf50a1d17c88ae13412223a1cff5684e8`. Issue #33 is closed after the merge. The approved Sprint 3 contract is now the source of truth for Issue 2 implementation; the reviewer’s remaining concurrency/hosted-CI comments are implementation reminders, not merge blockers for Issue 1.

## 5. Issue 2 — User Migration, Authentication & Authorization Foundation

- PR: #42 — `[Lab 3] Issue 2: User Migration, Authentication & Authorization Foundation`.
- Base/head: `lab3-staging` ← `feature/2-user-migration-auth`.
- Round 1 reviewer: `Tanaboonnnnn`.
- Round 1 reviewed head: `86fdbac61e2444ee45b83f3304e8c0aa164e3357`.
- Round 1 submitted: 2026-09-15T06:09:07Z.
- Round 2 reviewer: `Tanaboonnnnn`.
- Round 2 reviewed head: `848f39d29aae4c324539d924bfa7e694c5cb92c5`.
- Round 2 submitted: 2026-09-15T07:44:13Z.
- Round 3 reviewer: `Tanaboonnnnn`.
- Round 3 reviewed head: `dcd2dd7cb5b4ff9595fb59ca62c81aa59afe0152`.
- Round 3 submitted: 2026-09-15T08:44:39Z.
- Reviewer state: **Approved**.
- Verdict: **Approved and merged into `lab3-staging`.**
- Merged at: 2026-09-15T08:44:52Z.
- Merge commit: `9b594b9c5a61af3f97d73dbd10280b756c6dbfcd`.
- Issue #34 closed after merge at 2026-09-15T08:46:02Z.

### Round 1 reviewer feedback

The reviewer confirmed that the ID-preserving migration, hashed session token, bcrypt UTF-8 boundary, password/session rotation, migration preflight, deactivated-session invalidation, and non-destructive seed were strong. Three corrections were requested before merge:

1. **Reference-data auth bypass:** legacy `GET /api/categories` was still public while `/api/v1/categories` was protected. The reviewer required the alias to be protected or removed and required a negative authorization test so the older route could not bypass the Lab 3 authenticated-only Reference Data contract.
2. **Migration evidence accuracy:** `tests.md` marked `MIG-01`–`MIG-06`/`MIG-11` as passing while pointing to `migration-regression.test.ts`, but that automated file did not exist at reviewed head. The reviewer accepted either a real automated migration test or truthful, reproducible manual evidence with exact commands, fixtures, and results.
3. **Origin/CSRF gap on legacy mutations:** auth mutations enforced Origin, but the still-temporary Lab 2 Requester mutation routes did not. The reviewer requested the approved Origin boundary on Ticket creation, attachment upload, and attachment soft-remove even though requester-identity cutover itself remains scoped to Issue #35.

### Response to Round 1

- Protected legacy `GET /api/categories` with the same `requireAuth` + `requirePasswordChanged` gate as the v1 reference-data endpoints. Direct tests now assert unauthenticated `401` for `/api/categories`, `/api/v1/categories`, and `/api/v1/related-systems`, and confirm permitted authenticated roles can still read reference data.
- Added `requireApprovedOrigin` before every currently implemented non-auth mutation route: `POST /api/v1/tickets`, `POST /api/v1/tickets/:id/attachments`, and `DELETE /api/v1/attachments/:id`. Direct API tests exercise wrong, missing, and `Origin: null` across all three and assert no Ticket/Attachment mutation.
- Corrected migration evidence rather than inventing an automated test. `MIG-01`–`MIG-06` and `MIG-11` are now explicitly labelled **manual isolated PostgreSQL evidence**. Two committed SQL fixtures plus exact PowerShell/Docker/PostgreSQL commands and observed results are recorded in `tests.md`. The planned `migration-regression.test.ts` is explicitly marked as not present in Issue 2.
- Repeated the manual migration rehearsal on a fresh PostgreSQL 16 container: exact requester ids and Ticket ownership were preserved; historical attachment removal metadata survived; null/non-null priority behavior stayed correct; normalized-email collision aborted before the `User` table was created.
- Reran the isolated implementation suite after the fixes: Server **76/76** (11/11 files), Client **25/25** (5/5 files), Server build **Pass**, Client build **Pass**, Prisma validate **Pass**, production dependency audit **0 vulnerabilities**.
- Hosted CI is still not claimed green; PR #42 had no hosted status checks at the reviewed head.

### Round 2 reviewer feedback

The reviewer confirmed all Round 1 fixes at exact head `848f39d`, then found two new safety blockers plus one important seed correction and one deferred Issue 3 note:

1. **Tests could still write the development DB:** `npm test` still ran plain Vitest against the normal `DATABASE_URL`, while `seed-regression.test.ts` intentionally seeds and mutates User/Ticket rows. The reviewer required `TEST_DATABASE_URL` plus a fail-fast guard before Prisma/seed/mutation when the target is missing, does not look like a test database, or collides with the development database.
2. **The Lab 3 migration was not whole-file atomic:** the migration performed many schema/data mutations without explicit `BEGIN/COMMIT`. The reviewer required one transaction around the full migration plus a rehearsal that deliberately fails after mutation has begun and proves the original Lab 2 state is fully restored.
3. **Seed fixture needed unassigned ownership:** the engineering contract requires realistic assigned and unassigned Tickets, but all three demo Tickets were assigned. At least one canonical `ownerId=null` Ticket and an assertion for both states were requested.
4. **Temporary public requester directory:** `/api/v1/requesters` now reads the real `User` table. The reviewer explicitly deferred removal to Issue #35 but requested that the endpoint/selector be closed there before final integration.
5. **Evidence sync:** PR description still showed `75/75` while committed evidence had already reached `76/76`.

### Response to Round 2

- Added `server/src/testDatabaseGuard.ts` plus `server/scripts/run-tests.ts`; `npm test` now refuses to start without a distinct `TEST_DATABASE_URL` whose database name contains `test`, rejects dev/test target collisions (including local host aliases), and switches `DATABASE_URL` only after the target passes validation. `getPrisma()` repeats the guard for direct Vitest/test-seed processes before constructing Prisma.
- Added 4 direct unit tests for missing target, non-test database name, dev/test collision, and successful test target selection. Manual launcher checks also returned non-zero before Vitest/Prisma for all three unsafe cases.
- Wrapped the complete Lab 3 migration in explicit `BEGIN; ... COMMIT;`. A fresh disposable PostgreSQL rehearsal injected a deliberate division-by-zero immediately before `COMMIT`, after all Lab 3 mutation statements including the old-table `DROP` had executed. The connection failure rolled the transaction back: no `User` table or `Ticket.ownerId` survived, `DevelopmentRequester` returned, and the original 2 Ticket / 2 Attachment rows remained.
- Changed canonical demo Ticket `TKT-2025-90003` to `ownerId=null`; seed regression now asserts the canonical demo set contains both assigned and unassigned Tickets while preserving rerun safety.
- Marked `/api/v1/requesters` in code as a temporary Issue 2 compatibility endpoint that **must** be removed with the selector/header bridge in Issue #35; it is not being represented as final Lab 3 behavior.
- Updated README/`.env.example` with isolated test-database setup and safety behavior.
- Synced the live PR #42 description from the stale **75/75 (11/11)** server result to the current **80/80 (12/12)** result and added the guarded test-target / whole-migration rollback / assigned-unassigned seed evidence.
- Reran verification after the Round 2 fixes: Server **80/80** (12/12 files), Client **25/25** (5/5 files), Server build **Pass**, Client build **Pass**, Prisma validate **Pass**, production dependency audit **0 vulnerabilities**, normal migration preservation **Pass**, normalized-email collision rollback **Pass**, and injected post-mutation transaction rollback **Pass**.
- Hosted CI is still not claimed green because PR #42 currently reports no hosted checks.

### Round 3 final review

The reviewer re-checked exact head `dcd2dd7` across Issue #34, the approved contract, migration failure paths, test isolation, authentication/session behavior, Origin protection, seed coverage, and evidence. The two Round 2 safety blockers were confirmed resolved in executable code/tests, the PR was **Approved**, and the reviewer explicitly cleared Issue #34 to proceed to Issue #35.

Non-blocking follow-ups carried forward from the final review:

- Issue #35 must remove the temporary public `/api/v1/requesters` compatibility endpoint together with the Development Requester selector/header flow before final integration.
- The later status-workflow issue must enforce the exact eight-status domain from the contract; `Ticket.status` remains free-form at the Issue 2 foundation stage.
- The in-memory login limiter is acceptable for local-lab BR-08 behavior but must not be represented as production-grade rate limiting.
- Hosted CI still had no checks on the approved head, so Issue 2 evidence does not claim hosted CI green.

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
