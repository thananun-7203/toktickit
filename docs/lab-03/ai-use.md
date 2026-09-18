# TokTickIT Lab 3 — AI Use & Reflection

## 1. How AI Is Used in Sprint 3

AI is used as a **specification agent** and later as a **coding/review assistant**. The student remains responsible for approving scope, implementation decisions, Git actions, peer-review responses, and final submission evidence.

**LLM / model used at Sprint 3 initialization:** OpenAI ChatGPT — **GPT-5.6 Sol**.

Current working rules:

- Treat the Lab 3 handout as the Sprint 3 source of truth.
- Preserve the completed Lab 2 increment rather than rebuilding the project from scratch.
- Create/maintain Spec DD and Test DD before or alongside implementation, not reconstructed afterward.
- Work one GitHub Issue / feature branch at a time after the initial Issues are planned.
- Keep role/ownership authorization enforced on the backend.
- Run tests/regression before claiming completion.
- Record only real test/review/AI evidence.
- Do not commit/push/merge unless the student has authorized that Git action.

## 2. Selected Key Prompts — Specification, Implementation & Review

The prompts below are real user requests from the Lab 3 conversations. They were selected from the actual specification, implementation, UI-approval, and peer-review workflow rather than invented afterward.

| # | Selected prompt | Purpose / result |
|---|---|---|
| 1 | `ต่อไปคุณต้องพาฉันทำ Leb3 ฉันอยากให้คุณอ่านไฟล์ที่แนบไปอย่างละเอียดและบอกฉันทีว่าจะมีแผนการทำงานนี้ต่อยังไงขอแบบละเอียดและรอบคอบ ตอบแค่แผนการทำงานพออย่าพึ่งทำอะไร` | Read the 18-page Lab 3 handout and convert it into a careful implementation/release plan without modifying the repository. |
| 2 | `เราจะมีทั้งหมดกี่ Issue นะ` | Decompose Lab 3 into a stable set of eight implementation/evidence Issues plus the release PR. |
| 3 | `issue นี้ครอบคลุมละเอียดแล้วใช่มั้ย พอดีฉันไม่อยากมาเพิ่ม issue ทีหลังเหมือนรอบก่อนอีก` | Audit the Issue decomposition against the handout and explicitly include migration, security, regression, admin safety, E2E, and evidence work. |
| 4 | `คุณสามารถสร้าง issue ทั้งหมดมาก่อนแล้วค่อยทำไปทีละ issue ได้มั้ย ตอบคำถามฉันพอ` | Decide to create the complete Sprint backlog before coding so scope is visible from the start. |
| 5 | `โอเคเริ่มทำการตรวจ Lab 2 baseline , สร้าง GitHub Issues 1–8 ให้ครบทั้งหมด , จัดเข้า Kanban / Project ตามลำดับได้เลย ทำถึงตอนนี้ก่อนนะ` | Initialize the real Sprint 3 backlog and Project board while preserving the Lab 2 working tree. |
| 6 | `บอกขั้นตอนต่อไปที่ต้องทำที` | Establish the sequence baseline → `lab3-staging` → Issue 1 engineering contract → peer-reviewed PR → later Issues. |
| 7 | `โอเคเริ่มทำตามลำดับได้เลย และในส่วนการเริ่มเขียน specification.md, tests.md, ui-spec.md, api-spec.md และตั้งต้น reviewer.md, ai-use.md ให้ทำอย่างละเอียดเลยนะ` | Author the detailed pre-implementation Sprint 3 engineering contract and planned test traceability. |
| 8 | `ตรวจสอบทุกอย่างเรียบร้อยแล้ว เริ่มทำการ commit / push / เปิด PR #38 ได้` | Explicitly authorize the Git actions only after the Administrator feature had passed the student's manual verification. |
| 9 | `โอเคเก็บคำแนะนำตามรีวิวไว้แก้ไขทีหลัง ดำเนินการขั้นต่อไปได้เลย` | Preserve non-blocking PR #46 review notes for the later QA pass while moving into Issue #39 rather than silently dropping reviewer feedback. |
| 10 | `เพื่อน review PR #47 ให้แล้ว ตรวจสอบและแก้ไขที` | Read the exact peer review, fix the E2E database-isolation blocker, rerun the isolated 12-test Lab 3 Playwright suite, push the correction, and request re-review. |

## 3. Specification-Agent Assistance — Issue 1

### Student request

Prepare the Sprint 3 engineering contract in detail before implementation.

### AI assistance performed

- Read the Lab 3 handout and retained its scope boundaries.
- Read the existing Lab 2 Prisma schema, seed, server routes, Requester identity helper, client shell/API/context/theme, Lab 2 specification/API/UI/test/reviewer/AI-use documents, and E2E flow.
- Verified the Lab 2 final `main` commit before creating Sprint branches.
- Created `lab3-staging` from final Lab 2 `main` and created `feature/1-sprint3-engineering-contract` for Issue #33.
- Defined numbered Lab 3 Functional Requirements and Business Rules.
- Defined an explicit Requester / IT Staff / Administrator authorization matrix.
- Defined the complete required Ticket status set and an explicit transition matrix.
- Chose and documented a DB-backed opaque session with HttpOnly cookie, logout invalidation, password hashing, rate limiting, and Origin/CSRF considerations suitable for the course stack.
- Designed the Lab 2 Development Requester → User migration strategy with invariants that protect Ticket/Attachment data.
- Designed Public Comment / Internal Note visibility and validation rules.
- Defined Requester `Problem Appears Resolved` as a separate indication rather than a formal status change.
- Defined minimalist Administrator safety rules including self-deactivation and last-active-Administrator protection.
- Created detailed planned REST endpoints and safe error categories.
- Created responsive UI/state specifications for Login, Change Password, authenticated shell, Requester extensions, Staff Queue, Staff Detail, and User Management.
- Created planned unit/API/UI/security/migration/E2E/visual test inventory with AC traceability.
- Re-ran the previously blocked Lab 2 database-backed baseline after Docker Desktop became available: all **49/49** server tests passed against a disposable PostgreSQL database, Client remained **25/25**, builds/Prisma validation passed, and the temporary baseline containers/volumes were removed afterward without touching the development database.
- Opened PR [#41](https://github.com/thananun-7203/toktickit/pull/41) from `feature/1-sprint3-engineering-contract` to `lab3-staging` with the real baseline verification recorded in the PR description.

### Human oversight / decisions

The student explicitly chose:

- to use eight Issues and create them before implementation,
- to retain Completion Checklists during development,
- to proceed in order from Lab 2 baseline and Issue 1,
- to use GitHub Project `Tok TickIT Individual Sprints` for tracking.

The specification choices that are not dictated verbatim by the handout (session mechanism, password bounds, rate limit, exact status transitions, API paths, queue fields, comment length) must remain open to peer-review revision during Issue #33. They are documented rather than silently assumed.

## 4. Baseline / Environment Assistance

At Sprint startup AI checked the final Lab 2 repository state and ran non-destructive verification:

- `main` matched final Lab 2 release commit `e8e37957dc8dfad95d7ad90e640a00b51e2234e1`.
- Existing untracked Lab 2 report-only screenshots were left untouched.
- Client tests passed 25/25.
- Server pure Ticket unit tests passed 17/17.
- Server build passed.
- Client production build passed.
- Prisma validation passed.
- Docker Desktop was then started normally and AI created a **separate disposable Compose project** (`toktickit-lab3-baseline`) using a fresh PostgreSQL volume on local port `5434`; the user's existing development database was not reset or reused for destructive verification.
- All four inherited migrations applied successfully to that clean database and the Lab 2 seed produced 4 Categories, 7 Related Systems, and 5 Development Requesters (4 active). A second seed run produced the same logical counts.
- The complete DB-backed Lab 2 server suite then passed **49/49 tests across 7/7 files**, confirming the earlier API `500` results were caused by the missing database environment rather than a code regression.
- The disposable baseline containers/volumes were removed after the check.

## 5. Coding-Agent Log

### Issue 2 — Authentication Foundation

AI helped implement the `DevelopmentRequester → User` migration, DB-backed opaque sessions, Login/Logout, mandatory first-password change, inactive-account handling, rate limiting, Origin protection, and the safe test-database guard. It also helped rehearse the migration on disposable PostgreSQL databases, including normalized-email collision failure and whole-transaction rollback. Peer-review findings were applied and re-tested before PR #42 was approved and merged.

### Issue 3 — Authenticated Requester Regression

AI converted Requester ownership from the retired development header/selector to authenticated session identity, adapted Lab 2 create/list/detail/attachment behavior, added Public Comments and `Problem Appears Resolved`, and built fresh-user Playwright fixtures so retries do not poison seeded credentials. Review fixes centralized Ticket visibility policy and kept authenticated UI state intact when Logout fails. PR #43 passed regression and was approved/merged.

### Issue 4 — Staff Queue

AI implemented the IT Staff/Admin Queue API and responsive UI with search, filters, deterministic sorting, pagination, Requested/IT Priority, Owner filters, and assignee eligibility. Reviewer feedback led to stricter duplicate-query validation and database-backed priority pagination. PR #44 was re-tested, approved, and merged.

### Issue 5 — Staff Ticket Operations

AI implemented Staff Ticket Detail, Claim/Assign/Reassign, IT Priority, the explicit status-transition matrix, Public Comments, Internal Notes, Requester-resolution context, and Staff attachment download. Review follow-ups kept real bcrypt cost while increasing integration-test timeout headroom and replaced unbounded Internal Notes reads with database pagination. The approved UI was implemented only after the student accepted the mockup. PR #45 was approved and merged.

### Issue 6 — Administrator User Management

AI implemented Administrator-only user list/search/filter/create/edit/deactivate/initial-password reset, plus self-deactivation, last-active-Administrator, assigned-owner, session invalidation, and concurrency protections. Race testing exposed PostgreSQL serialization code `40001` arriving through Prisma as `P2010`; the shared conflict helper was hardened so owner/admin races return safe `409` responses instead of `500`. The User Management mockup was approved before frontend implementation. PR #46 was approved and merged; its modal-accessibility suggestion was completed in Issue 7.

### Issue 7 — Security / E2E / QA

AI closed the remaining direct authorization matrix gaps, created full-stack Auth/Requester/Staff/Admin Playwright coverage against disposable PostgreSQL + SeaweedFS, completed `V-01–V-08`, added readable Lab 3 screenshots, and implemented Administrator modal initial focus, focus trapping, Escape-close, and focus restoration. PR #47 review found one stale Issue 3 E2E database fallback; AI removed all current Lab 3 fallbacks, added explicit `E2E_DATABASE_URL` fail-fast validation, reran the fresh isolated suite **12/12**, and the re-review approved exact head `9097c27`.

### Issue 8 — Final Evidence / Release Readiness

AI is being used to reconcile final documentation with the merged implementation, index the submission evidence, add missing failure/boundary screenshots, modernize the Lab 3 CI workflow so its database guards are respected, and rerun the release-candidate test/build/Prisma/E2E checks. The student still controls the final Issue #40 PR and the later `lab3-staging → main` release decision.

## 6. Example AI-Assisted Debugging

One real debugging case occurred during Issue 6 concurrency testing. The `ADM-21/ADM-22` race cases intermittently returned HTTP `500` even though the intended loser of an assign/reassign versus deactivate/demote race should receive a safe stale-state `409`. AI inspected the actual Prisma error instead of assuming the documented `P2034` path and found PostgreSQL SQLSTATE `40001` wrapped as Prisma `P2010` with `meta.code=40001`. The fix centralized retryable serialization/deadlock detection and made both Staff owner mutation and Administrator user mutation map those raw conflicts to their existing `409` stale-state responses. Focused race tests then passed, and the later full server regressions remained green through the final **162/162** Issue 7 run.

## 7. My Reflection — Final

The most useful part of AI assistance in Lab 3 was keeping a large, cross-cutting change traceable from specification to code, tests, review, and evidence. Starting with the engineering contract made later decisions about authentication, ownership, status transitions, comments versus Internal Notes, migration, and Administrator safety easier to check instead of relying on what the UI happened to show.

The coding phase also showed why AI output cannot be accepted without verification. Several important improvements came from running the real system and from peer review: PostgreSQL serialization conflicts behaved differently from the initial Prisma assumption, Logout needed failure-safe client behavior, Internal Notes needed pagination, and the final E2E harness still contained a stale database fallback. In each case the useful workflow was inspect the actual failure, make the smallest correction, and prove it with focused plus regression tests.

I therefore used AI as a specification/coding/review assistant rather than as the final decision maker. Scope changes, UI approval, Git actions, peer-review responses, manual checks, and release authorization remained human-controlled. The main lesson from this Sprint is that AI is most valuable when its work is constrained by explicit requirements and independently checked by tests, isolated environments, and another reviewer.
