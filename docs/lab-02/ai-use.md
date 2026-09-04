# TokTickIT Lab 2 — AI Use & Reflection

## How AI was used

AI was used as a coding assistant throughout Lab 2 to help inspect the existing codebase, compare implementation against the Lab 2 specification/test plan, implement features incrementally, and verify the result with automated tests.

**LLM / Model used for the review-and-fix workflow recorded here:** OpenAI ChatGPT — **GPT-5.6 Sol**.

The implementation workflow followed these rules:

- Work one GitHub Issue / feature branch at a time.
- Read the existing specification, API spec, UI spec, and test plan before changing code.
- Prefer a test-first (Red → Green → Regression) workflow, with Red/Green runs performed locally unless the Git history explicitly shows separate test-only and implementation commits.
- Do not treat a feature as complete while required tests are missing or failing.
- Do not commit, push, or merge changes until the student has reviewed and explicitly approved that action.
- Keep `Lab_02_Implementation_Plan.md` untracked because it is a local planning file.

## Selected Key Prompts

The table below records selected prompts from the Lab 2 implementation/review workflow rather than reconstructing hypothetical prompts after the work was done.

| # | Selected prompt | Purpose / result |
|---|---|---|
| 1 | `ตรวจสอบ PR ของเพื่อนที มีการแก้ไขตามที่เราแนะนำยัง` | Re-check a peer PR against prior review comments and evidence. |
| 2 | `ทำการ PR อย่างละเอียด` | Perform a detailed PR inspection covering code, tests, CI, and review status. |
| 3 | `โอเคทำการแก้ไขตามที่เพื่อนแจ้งไปได้เลย` | Implement the peer review blockers for Issue 5 and rerun regression tests. |
| 4 | `ทำการ commit → push → comment` | Commit an approved fix set, push the feature branch, and post the requested re-review summary. |
| 5 | `อ่านทำความเข้าใจไฟล์นี้อย่างละเอียด` | Audit the Lab 2 labsheet as the source of truth and identify requirement/evidence gaps. |
| 6 | `คือมันต้องแก้อะไรบ้าง เยอะมั้ยถ้าปรับแก้ตอนนี้` | Estimate the impact of aligning the implementation with missing Lab Sheet requirements. |
| 7 | `ถ้าเพื่อนเม้นมาแบบนี้มันจริงมั้ย` | Verify a review comment about Removal Reason and Part 4 AI-use evidence against the Lab Sheet and repository. |
| 8 | `ทำการแก้ไข ตามที่เพื่อนแนะนำได้เลย` | Implement Removal Reason end-to-end and align `ai-use.md` with the submission rubric. |

## Prompt / Assistance Log

### Issue 4 — My Tickets review fixes

**Student request:** Fix the three blocking review comments in PR #24 in detail.

**AI assistance:**

- Updated the requester flow so selecting a Development Requester lands on My Tickets.
- Added a Create Ticket CTA to the My Tickets empty state.
- Added A-8 API coverage for `oldest` and `newest` sorting.
- Removed requester persistence from `localStorage` after checking the Lab 2 requester-context requirements.
- Updated API calls so `X-Dev-Requester-Id` is supplied from `RequesterContext` instead of browser storage.
- Added regression tests and ran client/server test suites and TypeScript checks.

**Human oversight:** The student tested the UI, reviewed the changes, then explicitly requested commit, push, and a re-review comment. The peer reviewer later approved and merged PR #24.

### Issue 5 — Ticket Detail & Attachments

**Student request:** Implement Issue 5 — Ticket Detail & Attachments according to the detailed Lab 2 plan.

**AI assistance:**

- Created `feature/5-ticket-detail-and-attachments` from the updated `lab2-staging` branch.
- Ran failing-first API coverage locally for ticket detail ownership and attachment lifecycle behavior before implementing the corresponding behavior.
- Implemented owned ticket detail retrieval.
- Implemented upload validation (allowed types, 5 MB/file, maximum five active files, and no partial DB persistence for a rejected batch).
- Added a storage abstraction with a SeaweedFS filer implementation and test override.
- Implemented attachment download and soft removal while retaining removed metadata.
- Added the Ticket Detail UI and active/removed attachment states.
- Connected My Tickets → Ticket Detail navigation.
- Added attachment selection/upload support to the Create Ticket screen.
- Added Playwright E2E coverage for requester selection → create → list → detail → download → soft remove → ownership isolation.
- Added a Docker Compose environment for isolated PostgreSQL + SeaweedFS E2E execution.
- Added a GitHub Actions E2E job.
- Hardened the attachment concurrency paths after peer review so capacity losers do not write storage and concurrent soft-removes return exactly one `200` and one `409`.
- Added the Lab Sheet Part 8 removal-reason flow end-to-end: required reason input, API validation, Prisma persistence, retained metadata display, and automated evidence.
- Audited this AI-use record against Part 4 and added the model name, eight selected key prompts, and the required "My Reflection" heading.

**TDD evidence note:** For Issue 5, the failing-first (Red) tests and later Green/regression runs were executed locally during development. Commit `a74694c` intentionally bundled the Issue 5 tests, implementation, and documentation, so the Git history does **not** demonstrate a separate committed Red snapshot. The evidence claimed here is the local test-first execution, not a test-only commit.

## Example of AI-assisted debugging

The first real Playwright run exposed a bug that component/API tests did not catch: downloaded PDFs were suggested as `attachment.pdf` instead of their original filename. The backend already sent the correct `Content-Disposition` header, but browser JavaScript could not read it because CORS did not expose that response header. The fix was to expose `Content-Disposition` through the Express CORS configuration, after which the complete E2E flow passed.

This was useful because it demonstrated why unit/API/UI tests and a real browser E2E test provide different kinds of evidence.

## My Reflection

AI reduced time spent on repetitive code inspection, test scaffolding, and tracing integration failures across React, Express, Prisma, SeaweedFS, Docker, and Playwright. However, the AI output was not accepted automatically. Changes were checked against the Lab 2 documents, exercised with automated tests, and kept uncommitted until student review.

The most important lesson was that passing isolated tests is not enough for a multi-layer feature. The real-browser E2E flow caught an integration detail (CORS-exposed download headers) that the focused tests did not reveal. Peer review remains necessary before merging the feature branch.
