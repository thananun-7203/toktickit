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

## 2. Selected Key Prompts — Initial Sprint 3 Specification Phase

The prompts below are real user requests from the Lab 3 planning/startup conversation. The list will be refined to the strongest 6–10 prompts for final submission rather than inventing prompts at the end.

| # | Selected prompt | Purpose / result |
|---|---|---|
| 1 | `ต่อไปคุณต้องพาฉันทำ Leb3 ฉันอยากให้คุณอ่านไฟล์ที่แนบไปอย่างละเอียดและบอกฉันทีว่าจะมีแผนการทำงานนี้ต่อยังไงขอแบบละเอียดและรอบคอบ ตอบแค่แผนการทำงานพออย่าพึ่งทำอะไร` | Read the 18-page Lab 3 handout and convert it into a careful implementation/release plan without modifying the repository. |
| 2 | `เราจะมีทั้งหมดกี่ Issue นะ` | Decompose Lab 3 into a stable set of eight implementation/evidence Issues plus the release PR. |
| 3 | `issue นี้ครอบคลุมละเอียดแล้วใช่มั้ย พอดีฉันไม่อยากมาเพิ่ม issue ทีหลังเหมือนรอบก่อนอีก` | Audit the Issue decomposition against the handout and explicitly include migration, security, regression, admin safety, E2E, and evidence work. |
| 4 | `คุณสามารถสร้าง issue ทั้งหมดมาก่อนแล้วค่อยทำไปทีละ issue ได้มั้ย ตอบคำถามฉันพอ` | Decide to create the complete Sprint backlog before coding so scope is visible from the start. |
| 5 | `โอเคเริ่มทำการตรวจ Lab 2 baseline , สร้าง GitHub Issues 1–8 ให้ครบทั้งหมด , จัดเข้า Kanban / Project ตามลำดับได้เลย ทำถึงตอนนี้ก่อนนะ` | Initialize the real Sprint 3 backlog and Project board while preserving the Lab 2 working tree. |
| 6 | `บอกขั้นตอนต่อไปที่ต้องทำที` | Establish the sequence baseline → `lab3-staging` → Issue 1 engineering contract → peer-reviewed PR → later Issues. |
| 7 | `โอเคเริ่มทำตามลำดับได้เลย และในส่วนการเริ่มเขียน specification.md, tests.md, ui-spec.md, api-spec.md และตั้งต้น reviewer.md, ai-use.md ให้ทำอย่างละเอียดเลยนะ` | Author the detailed pre-implementation Sprint 3 engineering contract and planned test traceability. |
| 8 | `https://github.com/users/thananun-7203/projects/2` | Identify the exact GitHub Project used to track Issues #33–#40 and verify Issue #33 is in Started. |

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

No Lab 3 feature implementation has been completed at the time this initial Issue 1 document is written. Add entries here during Issues 2–8 describing actual code/test/debug work rather than planned future behavior.

### Issue 2 — Authentication Foundation

Pending.

### Issue 3 — Authenticated Requester Regression

Pending.

### Issue 4 — Staff Queue

Pending.

### Issue 5 — Staff Ticket Operations

Pending.

### Issue 6 — Administrator User Management

Pending.

### Issue 7 — Security / E2E / QA

Pending.

### Issue 8 — Final Evidence / Release Readiness

Pending.

## 6. Example AI-Assisted Debugging

Pending until a real Lab 3 debugging case occurs. Do not reuse a hypothetical example. A final example should state the observed failure, what AI inspected/suggested, what was actually changed, and what test proved the fix.

## 7. My Reflection — Initial

The main value of AI at the start of Lab 3 was not writing feature code; it was turning a broad 18-page handout into a traceable engineering contract before implementation. Lab 3 has many cross-cutting rules — authentication, first-login password change, three roles, ownership, staff workflow, comments versus private notes, migration of Lab 2 data, and Administrator safety. Writing those rules down first reduces the risk of implementing a UI that appears correct while the backend permissions or data migration are incomplete.

The specification process also showed an important limitation of AI assistance: the handout intentionally leaves several engineering decisions to the student. The AI can propose a secure session approach, password policy, status-transition matrix, endpoint names, and query fields, but those choices must be reviewed against the existing codebase, implementation cost, tests, and peer feedback. For that reason the Issue 1 documents label planned decisions clearly and avoid claiming that implementation or review has already passed.

This reflection will be updated after the coding-agent, testing, peer-review, and release phases so the final report describes what actually happened rather than only the initial plan.
