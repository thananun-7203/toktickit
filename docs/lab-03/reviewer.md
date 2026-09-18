# TokTickIT Lab 3 — Peer Review Record

**Author:** ธนนันท์ ครังตุ้ย — 67070507203 — GitHub: [@thananun-7203](https://github.com/thananun-7203)<br>
**Repository:** `thananun-7203/toktickit`<br>
**Sprint integration branch:** `lab3-staging`<br>
**Issue 1 feature branch:** `feature/1-sprint3-engineering-contract`

> This is a living review record created before the main Lab 3 implementation. It must record only review activity that actually occurs. Do not pre-fill approvals or reviewer verdicts.

## 1. Lab 3 Issue / PR Flow

| Lab 3 Issue | GitHub Issue | Planned feature scope | PR | Reviewer / verdict |
|---|---|---|---|---|
| Issue 1 | [#33](https://github.com/thananun-7203/toktickit/issues/33) | Sprint 3 Engineering Contract & Test Plan | [#41](https://github.com/thananun-7203/toktickit/pull/41) | **Approved and merged** |
| Issue 2 | [#34](https://github.com/thananun-7203/toktickit/issues/34) | User Migration, Authentication & Authorization Foundation | [#42](https://github.com/thananun-7203/toktickit/pull/42) | **Approved and merged** |
| Issue 3 | [#35](https://github.com/thananun-7203/toktickit/issues/35) | Authenticated Requester & Lab 2 Regression | [#43](https://github.com/thananun-7203/toktickit/pull/43) | **Approved and merged** |
| Issue 4 | [#36](https://github.com/thananun-7203/toktickit/issues/36) | IT Staff Ticket Queue | [#44](https://github.com/thananun-7203/toktickit/pull/44) | **Approved and merged** |
| Issue 5 | [#37](https://github.com/thananun-7203/toktickit/issues/37) | IT Staff Ticket Detail & Operations | [#45](https://github.com/thananun-7203/toktickit/pull/45) | **Approved and merged** |
| Issue 6 | [#38](https://github.com/thananun-7203/toktickit/issues/38) | Administrator User Management | [#46](https://github.com/thananun-7203/toktickit/pull/46) | **Approved and merged** |
| Issue 7 | [#39](https://github.com/thananun-7203/toktickit/issues/39) | Security, Regression, E2E & Visual QA | [#47](https://github.com/thananun-7203/toktickit/pull/47) | **Approved and merged** |
| Issue 8 | [#40](https://github.com/thananun-7203/toktickit/issues/40) | Final Evidence & Release Readiness | [#48](https://github.com/thananun-7203/toktickit/pull/48) | **Review pending** |
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

- PR: [#43 — `[Lab 3] Issue 3: Authenticated Requester & Lab 2 Regression`](https://github.com/thananun-7203/toktickit/pull/43).
- Base/head: `lab3-staging` ← `feature/3-authenticated-requester`.
- Round 1 reviewer: `Tanaboonnnnn`.
- Round 1 reviewed head: `25b191bdf06c84b7af7beb4ffe6b20a06afc0f03`.
- Round 1 submitted: 2026-09-15T17:27:40Z.
- Round 2 reviewer: `Tanaboonnnnn`.
- Round 2 reviewed head: `a02a8c32e0543e047257541fd43bb041911fc28b`.
- Round 2 submitted: 2026-09-15T18:19:19Z.
- Round 3 reviewer: `Tanaboonnnnn`.
- Round 3 reviewed head: `01db49d972d981e62778ab9343ea4bc3aeb5be70`.
- Round 3 submitted: 2026-09-15T19:22:40Z.
- Reviewer state: **Approved**.
- Verdict: **Approved and merged into `lab3-staging`.**
- Merged at: 2026-09-15T19:22:56Z.
- Merge commit: `5261c3c59ae6131e5e607bdcbcc35fe6aff40c69`.
- Issue #35 is closed after merge.

### Round 1 reviewer feedback

The reviewer confirmed that the Requester cutover itself was strong: ownership comes from the authenticated session, the Development Requester selector/directory/header path is retired, Requester list/detail is isolated with `404`, and the end-to-end Requester flow is covered. Two blockers were raised before merge:

1. Public Comment length/counting: the review text stated a 200-character approved limit and correctly noted that JavaScript `string.length` counts UTF-16 code units rather than Unicode characters.
2. Public Comments and Attachment download used a negative authorization fallback (`REQUESTER ? own : any`) rather than an explicit role allow-list / Ticket visibility policy.

Non-blocking follow-ups requested by the reviewer were: keep `/auth/me` bootstrap errors separate from logged-out state with Retry; synchronize Client/Server digit semantics in Change Password; add direct Origin/no-mutation and password-change/inactive-session tests for the new unsafe mutations; add concurrency coverage for resolution indication; and expand direct Attachment-id isolation coverage.

### Response to Round 1

- Replaced the negative authorization fallback with a shared explicit allow-list Ticket visibility helper. `REQUESTER` is scoped to `requesterId = authenticatedUser.id`; `IT_STAFF` and `ADMINISTRATOR` are explicitly permitted according to the approved authorization matrix; an unsupported role cannot gain access by falling through a `not Requester` branch. Public Comment read/post and active Attachment download now reuse this policy, with direct policy tests.
- Kept the Public Comment maximum at **2,000 Unicode characters** because that is the actual Issue 1 contract approved at reviewed head `70a682e`: `BR-19` and `D-05` both state 2,000, and `api-spec.md` states trimmed `1–2,000` characters. The implementation bug identified by the reviewer was still fixed: server and client now count Unicode code points rather than UTF-16 code units, including emoji-boundary tests. The response to the reviewer explicitly calls out this source-of-truth mismatch rather than silently changing an approved business rule.
- Added a distinct auth bootstrap `error` state and Retry UI; a `/auth/me` network/5xx failure no longer masquerades as logout.
- Synchronized password digit semantics to Unicode decimal digits (`\p{Nd}`) on Client and Server and added a non-ASCII decimal-digit regression case.
- Added direct wrong/missing/`Origin: null` tests for Public Comment and Problem Appears Resolved with zero-mutation assertions, plus `mustChangePassword` and inactive-session coverage.
- Added simultaneous Problem Appears Resolved coverage and verifies both responses retain one persisted timestamp.
- Expanded Attachment direct-id isolation to prove another Requester cannot download/remove either active or already-removed attachments.
- Verification after the fixes: Server **99/99 (15/15 files)**, Client **44/44 (8/8 files)**, Server build **Pass**, Client build **Pass**, Prisma validate **Pass**, production dependency audit **0 vulnerabilities** for both server/client, `git diff --check` **Pass**, and Lab 3 Requester Playwright E2E **1/1 Pass** on a fresh isolated database/SeaweedFS environment.

### Round 2 reviewer feedback

The reviewer confirmed the Round 1 authorization/counting/security fixes and corrected the earlier 200-vs-2,000 Public Comment misunderstanding. Two new blockers remained:

1. **Logout failure safety:** `AuthContext.signOut()` cleared local auth state in `finally`, so a server-side `LOGOUT_FAILED` / session-revocation failure could still make the browser look logged out while the server session remained valid.
2. **Playwright retry reproducibility:** the E2E flow changed the seeded Somchai/Somsri initial passwords. A failed first attempt followed by a Playwright retry would reuse the already-mutated database and fail the next attempt at initial login; rerunning the suite on the same DB was also not deterministic.

The reviewer also suggested renaming the shared Ticket visibility helper so its name communicates that it is specifically for resources intentionally visible across Requester/Staff/Admin roles.

### Response to Round 2

- Changed `signOut()` so client auth state is cleared **only after** `logoutApi()` succeeds. On `LOGOUT_FAILED`/network failure the current authenticated user remains in memory and the UI shows `Logout failed. Your session may still be active. Please try again.` instead of pretending logout succeeded.
- Applied the same failure-safe behavior to the mandatory Change Password screen's Logout action. Client tests now cover both the normal authenticated shell and mandatory-password-change mode when Logout rejects.
- Replaced seeded-user password mutation in Playwright with **fresh dedicated E2E Requesters per attempt**. `test.beforeEach` creates a new pair of active Requesters with the documented initial password and `mustChangePassword=true`; Playwright executes `beforeEach` again on retries, so every attempt receives fresh credentials and ownership state instead of inheriting a previous attempt's password change or Ticket.
- Added `server/scripts/create-e2e-requesters.ts` with an explicit `E2E_FIXTURE_CREATE_ALLOWED=1` gate plus an E2E database-name guard before fixture creation. The normal development database is not an eligible target.
- Renamed the policy helper to `sharedResourceTicketVisibilityWhere` to reduce the risk of a later issue treating it as a universal Ticket-access policy.
- Round 2 fix implementation commit: `36b4f0b` (`fix(lab3): harden logout and e2e retry isolation`).
- Verification after Round 2 fixes: Server **99/99 (15/15 files)**, Client **46/46 (8/8 files)**, Server build **Pass**, Client build **Pass**, Prisma validate **Pass**, production dependency audit **0 vulnerabilities** on both server/client, and `git diff --check` **Pass**. The Requester Playwright E2E passed **twice consecutively against the same isolated E2E database**, with each run creating a fresh dedicated Requester pair; this demonstrates local rerun reproducibility in addition to per-attempt retry isolation.

### Round 3 final review

`Tanaboonnnnn` re-reviewed exact head `01db49d` and submitted **Approved**. The reviewer confirmed that both Round 2 blockers were closed: Logout failure no longer clears client authentication state when server-side revocation fails, and Playwright retries/reruns now use fresh dedicated E2E Requesters rather than mutating canonical seeded credentials. The reviewer also reconfirmed the explicit shared-resource Ticket visibility policy, the 2,000-character Public Comment contract, direct Origin/session-gate coverage, Attachment direct-id isolation, concurrent resolution indication, and bootstrap Retry behavior.

Two non-blocking polish notes were left for later work: keep the merged PR description synchronized with the Round 2 Client result (**46/46** rather than the historical Round 1 **44/44**), and begin splitting `app.ts` into route modules as the Staff implementation grows instead of allowing the central app file to become a monolith.

### Final verdict

**Approved.** PR #43 was approved at reviewed head `01db49d972d981e62778ab9343ea4bc3aeb5be70` and merged into `lab3-staging` as `5261c3c59ae6131e5e607bdcbcc35fe6aff40c69`. Issue #35 is closed. The next implementation issue is #36, IT Staff Ticket Queue.

Required review focus:

- Development Requester selector/header removed,
- authenticated ownership cannot be overridden by client requester id,
- full Lab 2 Requester regression,
- Public Comments,
- Problem Appears Resolved without formal resolve/close permission.

## 7. Issue 4 — IT Staff Ticket Queue

- GitHub Issue: [#36](https://github.com/thananun-7203/toktickit/issues/36).
- Feature branch: `feature/4-it-staff-ticket-queue`.
- Base branch: `lab3-staging`.
- PR: [#44](https://github.com/thananun-7203/toktickit/pull/44) — **Open**.
- Reviewer requested: `Tanaboonnnnn`.
- Round 1 review: `Tanaboonnnnn` returned **Changes requested** at exact head `0efe4c736d4046927f5c69db9fe6adcee6b061a9`.
- Reviewer feedback: move Queue filtering/sorting/pagination to the database layer instead of loading all matching Tickets into Node; reject duplicate query parameters; and lock explicit `owner=<id>` semantics to eligible active Staff/Admin users.
- Response: implemented all three findings. Standard sorts now use transactional `count + findMany(orderBy/skip/take)`. `priority_desc` pages across deterministic High → Medium → Low → unrecorded/other database buckets without loading the full result set. Duplicate parameters return `400 VALIDATION_ERROR`. Explicit owner ids must exist, be active, and have role `IT_STAFF` or `ADMINISTRATOR`; the API contract now documents this rule.
- Verification after Round 1 fixes: Server **115/115 (17/17)**, Client **54/54 (9/9)**, responsive Playwright `V-03` **1/1**, Server/Client builds **Pass**, Prisma validate **Pass**, production dependency audits **0 vulnerabilities**, and `git diff --check` **Pass**.
- Re-review: `Tanaboonnnnn` **APPROVED** exact head `3f9a8654ad0460cb6c8f21413f790aef6ff68c63`; the reviewer confirmed the database-layer pagination/sorting, duplicate-query rejection, and eligible-owner semantics were fixed and found no new blocking defect.
- Merge commit: `ea4147bd0f2a1f9775e43669db679ef7fcc8bb07`.
- Verdict: **APPROVED and merged**; Issue #36 is closed.

Pre-review implementation/evidence prepared:

- Staff/Admin-only `GET /api/v1/staff/tickets` plus active eligible assignee reference data.
- Search, documented filters, five sort modes, pagination/default ordering, invalid-query `400` field errors, assigned/unassigned clarity, and operational queue fields.
- Responsive Staff Queue UI with desktop/tablet table, mobile cards, explicit `Unassigned`, loading/empty/no-results/forbidden/failure states, and Open Ticket action.
- Staff Queue route logic is separated from the growing central `app.ts` rather than expanding it further.
- Initial pre-review verification: Server **111/111 (17/17)**, Client **54/54 (9/9)**, responsive Playwright `V-03` **1/1**, Server/Client builds **Pass**, Prisma validate **Pass**, production dependency audits **0 vulnerabilities**, and `git diff --check` **Pass**.
- Hosted CI is not claimed green before an actual PR check exists.

Required review focus:

- query behavior matches API spec,
- assigned/unassigned clarity,
- status/priority/owner fields are readable,
- no mega-grid / no horizontal page overflow,
- role authorization and failure/empty/no-results states.

## 8. Issue 5 — IT Staff Ticket Detail & Operations

- PR: #45 — `[Lab 3] Issue 5: IT Staff Ticket Detail & Operations`.
- Base/head: `lab3-staging` ← `feature/5-it-staff-ticket-detail`.
- Initial reviewer: `Peepipat-Suesoongnuen`.
- Initial reviewed head: `22672275a96f49303ffe01cc44a0771ce2991172`.
- Initial submitted: 2026-09-17T12:32:14Z.
- Initial reviewer state: **Approved**.
- Requested reviewer `Tanaboonnnnn` remains requested on the PR.

### Initial reviewer feedback

The reviewer confirmed the owner concurrency protocol, stale/eligibility conflicts, complete status-transition matrix, Reopened resolution-indication clearing, Staff-only Internal Notes authorization/backend authorship, accessibility labeling, and Issue #37 DoD coverage. The reviewer also reported that the focused Staff tests matched the claimed results and that `E2E-STAFF-01` passed in the reviewer environment.

Two non-blocking follow-ups were requested:

1. **Timing-marginal bcrypt/seed tests:** under full-suite load the reviewer saw three auth cases and seed regression exceed Vitest's default 5 s timeout even though isolated reruns and the base behavior passed. The reviewer recommended increasing timeout for hashing-heavy tests or using a cheaper test-only cost.
2. **Unbounded Internal Notes list:** the Internal Notes GET used an unbounded `findMany`; the reviewer recommended pagination for Tickets that accumulate many notes.

### Response to reviewer follow-ups

- Kept production-equivalent bcrypt behavior intact and raised the server Vitest `testTimeout` to **15 s** rather than lowering hashing cost. On the final full regression, one seed-regression test took about **5.96 s**, demonstrating that the old 5 s threshold could fail a correct run under load.
- Added database-backed Internal Notes pagination: optional positive `page`, `pageSize` default `50` / max `100`, deterministic `createdAt,id` ordering, transactional `count + findMany(skip/take)`, and validation for duplicate/invalid/unsafe-large pagination inputs.
- Updated the Staff UI to request **20 notes/page**, expose Previous/Next controls with page/count context, and reload the correct last page after posting a note rather than allowing the client list to grow without bound.
- Added server and client regression coverage for pagination, updated the API specification, and updated routed Playwright fixtures to use the paginated response shape.
- Verification after the follow-up fixes: focused Issue #37 server **35/35**, full Server **138/138 (19/19)**, Staff Detail client **10/10**, full Client **64/64 (10/10)**, Staff Playwright smoke/responsive **2/2**, Server/Client builds **Pass**, Prisma validate **Pass**, and production audits **0 vulnerabilities**.

### Current verdict

The initial review was **Approved**, both non-blocking reviewer suggestions were implemented, and the follow-up head `1356668fdc75aae1e97c5a1b52577d2214340bc2` was approved by `Tanaboonnnnn`. PR #45 was merged into `lab3-staging` as `35b5ad77f9072e554ef3c4943e5936e331055306`, and Issue #37 is closed. GitHub reported no hosted checks for the merged head, so no hosted-CI result is claimed for this PR.

Required review focus:

- claim/assign/reassign validation,
- Requested vs IT Priority separation,
- complete status-transition matrix enforcement,
- Public Comments vs Internal Notes visibility,
- append-only validation/safe rendering,
- Attachment continuity,
- direct authorization evidence.

## 9. Issue 6 — Administrator User Management

- PR: [#46](https://github.com/thananun-7203/toktickit/pull/46), merged into `lab3-staging`.
- Reviewed head: `e1e6b06cf3506572c457610c93ec83dc0bab9c99`.
- Reviewer: `Tanaboonnnnn` — **APPROVED** on the reviewed head.
- Merge commit: `cd61fa1dc660d35218b4d2187abfef36b1cc412f`.
- Reviewer feedback: no blocking correctness/spec findings. Two non-blocking follow-ups were recorded for later cleanup/final QA: (1) consider decomposing `UserManagement.tsx` into smaller Create/Edit/Initial-Password modal components if the Admin surface grows, and (2) strengthen modal accessibility with initial focus, focus trapping, and Escape-to-close behavior.
- Response: accepted both notes as deferred non-blocking cleanup; no post-approval code change was required for Issue #38.
- Verdict: **APPROVED and merged**.

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

- PR: [#47](https://github.com/thananun-7203/toktickit/pull/47), merged into `lab3-staging`.
- Reviewer: `Tanaboonnnnn`.
- Round 1 reviewed head: `3da919273d3ef122d27b52e3d109643b01e8f3ef`.
- Reviewer feedback: **Changes requested** — `e2e/lab-03/fullstack-fixtures.ts` still had a runtime fallback to the old Issue #35/Issue 3 E2E database. If `E2E_DATABASE_URL` was missing, final-QA fixtures could therefore write into the wrong database instead of failing safely.
- Response: removed the old database fallback from all current Lab 3 E2E entry points, added shared `requireE2eDatabaseUrl()` fail-fast validation, and updated the README example away from the Issue 3 database. A missing `E2E_DATABASE_URL` now exits before Playwright starts its web servers. Re-review verification used a fresh disposable PostgreSQL database `toktickit_pr47_r1_e2e` on port `5441` plus isolated SeaweedFS filer on `18890`; all **12/12** Lab 3 Playwright tests passed.
- Re-review: **APPROVED** on exact head `9097c27bdb45e8e1996db61a67abc30b72853119`; the reviewer confirmed the database-isolation blocker was fixed at its root cause and found no new substantive blocker.
- Merge commit: `580f2b27b974b3425772eba51fe58e7649b7f457`.
- Verdict: **APPROVED and merged**; Issue #39 is closed. GitHub reported no hosted checks for PR #47, so hosted CI is not retroactively claimed.
- PR #46 accessibility follow-up status: implemented in Issue #39 with Administrator modal initial focus, Tab/Shift+Tab focus containment, Escape-close, and focus restoration; responsive visual evidence was regenerated after the fix.
- PR #46 component-decomposition note: retained as non-blocking technical debt. Issue #39 did not materially expand `UserManagement.tsx` business scope, so no refactor was introduced solely for file-size cleanup during final QA.

Required review focus:

- unauthenticated vs forbidden vs not-found vs conflict behavior,
- protected-resource information leakage,
- complete Lab 2 regression,
- migration verification,
- complete role E2E,
- desktop/tablet/mobile visual checklist,
- accessibility/focus/overflow, including the deferred PR #46 Admin-modal initial-focus/focus-trap/Escape behavior,
- keep the PR #46 `UserManagement.tsx` decomposition note in view if Issue #39 changes the Admin UI materially,
- builds/Prisma/CI.

## 11. Issue 8 — Final Evidence & Release Readiness

- PR: [#48](https://github.com/thananun-7203/toktickit/pull/48), open against `lab3-staging` from `feature/8-final-evidence-release-readiness`.
- Initial PR head: `c57d0eaa553754928b780d2d8d703e24d8890e9b`.
- Requested reviewer: `Tanaboonnnnn`.
- Local release-candidate evidence before PR: Server **162/162 (21/21)**, Client **75/75 (11/11)**, Lab 3 Playwright **12/12**, Server/Client builds **Pass**, Prisma validate **Pass**, E2E migration status **up to date**, `git diff --check` **Pass**, and **13** final Lab 3 screenshots including failure/boundary states.
- Dependency-audit caveat: the local Issue #40 `npm audit --omit=dev` attempt could not reach `registry.npmjs.org` (`ENOTFOUND`), so no fresh local audit result is claimed. PR #48 CI now runs production dependency audits in the hosted environment.
- GitHub Project caveat: CLI verification of the final Kanban column state is unavailable with the current token because it lacks `read:project`; no board status is fabricated or modified by this Issue.
- Hosted CI Round 1 on `c57d0ea`: Client checks and production audit passed; Server migrations/seed/typecheck/Prisma/audit passed, but Server tests exposed a test-database-guard re-entry bug when CI had only `TEST_DATABASE_URL`, so E2E was skipped by dependency.
- Response to CI Round 1: made the test guard safely re-entrant after `TOKTICKIT_TEST_MODE=1` without weakening the saved development-target collision check; added two guard regression tests. CI-equivalent local verification with blank `DATABASE_URL` and only `TEST_DATABASE_URL` now passes focused guard **6/6**, full Server **164/164 (21/21)**, Server build, and Prisma validate.
- Hosted CI Round 2 on `51d6ea6`: Server and Client jobs were fully green, including production audits, but E2E failed two Requester overflow assertions at the 820 px tablet viewport on Linux headless Chromium. The shared cause was the Requester desktop header retaining three navigation buttons alongside brand/user controls until the old `<768px` breakpoint.
- Response to CI Round 2: move authenticated compact navigation to `≤991.98px` without changing tablet content layouts or weakening the no-overflow checks. Focused Requester/visual Playwright **3/3**, full Lab 3 Playwright **12/12**, and Client **75/75 + build** pass after the change.
- Reviewer feedback: Pending actual PR #48 review.
- Response: Pending actual reviewer feedback.
- Verdict: **Review/hosted-CI pending; not approved or merged.**

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
| `Tanaboonnnnn/toktickit` [#59](https://github.com/Tanaboonnnnn/toktickit/pull/59) | Shared Staff Ticket Queue/Detail authorization, search/filter/sort/pagination, deterministic ordering, responsive behavior, Requester regression | **Approved** at `c3091c1`; later merged |
| `Tanaboonnnnn/toktickit` [#60](https://github.com/Tanaboonnnnn/toktickit/pull/60) | Staff Ticket ownership/IT Priority/status workflow, concurrency, CSRF, UI permitted-next-action contract | **Changes requested** at `1a9159b` for owner-aware UI + diff hygiene; re-reviewed and **Approved** at `6f0ee1c`; later merged |
| `Tanaboonnnnn/toktickit` [#61](https://github.com/Tanaboonnnnn/toktickit/pull/61) | Public Comment/Internal Note privacy, Unicode validation, Requester resolution indication, UI/E2E privacy evidence | **Approved** at `268fe19`; later merged; two non-blocking follow-ups noted |
