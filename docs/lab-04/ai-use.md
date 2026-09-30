# Lab 4 — AI Use and Reflection

## 1. AI Tool Used

- **Model:** GPT-5.6 Sol in ChatGPT.
- **Primary role in Sprint 4 so far:** specification agent, repository reconnaissance assistant, and implementation/test assistant for the approved data/API increments.
- **Repository interaction:** ComGu Core was used to inspect the real `C:\toktickit` repository, create/push Lab 4 feature branches, read source/tests/docs, implement Issues #51–#52, run isolated PostgreSQL verification, and maintain evidence records.

This record includes only assistance that actually occurred. Later coding/debugging/review prompts must be appended from real Sprint 4 work rather than predicted in advance.

## 2. Selected Key Prompts Used So Far

The final submission requires 6–10 selected key prompts. The following are real prompts from Sprint 4 planning/Issue #50 work and may be refined to the strongest 6–10 examples before release.

### Prompt 1 — Read the Lab 4 handout and plan the work

> "อ่านทำความเข้าใจไฟล์ PDF นี้อย่างละเอียดและบอกแผนการทำงานมาให้ฉันดูอย่างละเอียดที"

**Use:** Asked the specification agent to ground Sprint planning in the actual Lab 4 handout before implementation.

### Prompt 2 — Confirm the staging/release workflow

> "lab4-staging → main แลปอื่นๆก็เริ่มจากแบบนี้ใช่มั้ย"

**Use:** Triggered a clarification of start-vs-release branch flow and comparison with Labs 2–3 rather than inventing a new Git process.

### Prompt 3 — Choose an appropriate Issue decomposition

> "ถ้าอยากให้แบ่งให้เหมาะสมที่สุดคุณคิดว่าควรแบ่งกี่ issue"

**Use:** Led to a 10-Issue Sprint plan that separates database/migration, API/authorization, UI, workflow, two dashboards, regression/E2E, accessibility/visual QA, and final release evidence.

### Prompt 4 — Prepare Lab 4 staging and Issues only

> "โอเคงั้น ขั้นแรกสุดที่อยากให้คุณทำตอนนี้คือเตรียม `lab4-staging` และสร้าง 10 Issues ก่อนตามที่คุณบอกมา แต่อย่าพึ่งเริ่มทำ Issue 1 นะ"

**Use:** Constrained the coding agent to initialization only and prevented premature feature work.

### Prompt 5 — Verify the previous-lab baseline workflow

> "ฉันมีคำถาม ตอนที่เราเริ่มทำแลป 3 เราก็ใช้ `main` ที่รวม Lab 2 เสร็จแล้วเป็น baseline มาทำหรอ ตรวจสอบให้หน่อย"

**Use:** Required verification from real Git history before treating the Lab 4 baseline approach as established practice.

### Prompt 6 — Begin Issue #50 with reconnaissance first

> "เริ่มทำ Issue #50 ตั้งแต่สร้าง feature branch แล้วสำรวจ Lab 3 baseline ก่อนเขียนเอกสาร อย่างละเอียดได้เลย"

**Use:** Caused the agent to create `feature/1-sprint4-engineering-contract`, inspect the real Lab 3 docs/schema/backend/frontend/tests/CI, and avoid writing the Sprint 4 contract until the baseline was understood.

### Prompt 7 — Draft the contract but stop before commit/PR

> "เริ่มทำขั้นต่อไปได้เลย และรอฉันตรวจสอบก่อนค่อยคอมมิดและเปิด PR"

**Use:** Authorized drafting of `docs/lab-04/*` while preserving a human review checkpoint before irreversible Git/PR workflow actions.

### Prompt 8 — Implement Issue #51 data foundation

> "โอเคงั้นลงมือทำ Issue #51 — Actions Taken Data Model, Migration & Seed ตามแผนที่วางไว้ได้เลย"

**Use:** Authorized the coding agent to branch from the reviewed `lab4-staging` baseline, implement the approved Prisma model/migration/seed foundation, add migration/rollback/seed regression tests, and verify the change only against a disposable PostgreSQL test database before opening a PR.

### Prompt 9 — Implement Issue #52 Actions API and authorization

> "โอเคลงมือทำตามแผนได้เลย"

**Use:** Authorized implementation of the previously reviewed Issue #52 plan: Actions Taken GET/create/edit/status endpoints, backend-only authorization, idempotency, optimistic concurrency, assignee eligibility races, targeted API/security tests, disposable-PostgreSQL verification, full regression, and PR preparation while keeping Issue #53 UI out of scope.

## 3. How AI Was Used in Issue #50

### Specification Agent Work

The AI was used to:

- read the complete 11-page Lab 4 handout and keep its terminology/scope as the source of truth;
- compare the handout with the released Lab 3 contract and actual implementation;
- identify decisions the handout intentionally leaves to the student, including Action lifecycle/assignment, automatic performer semantics, dashboard calculations, migration strategy, concurrency handling, and resolution gate;
- draft numbered Functional Requirements, Business Rules, Acceptance Criteria, API contracts, UI states, database decisions, test traceability, and Product Definition of Done;
- preserve explicit out-of-scope items rather than expanding the product; and
- maintain a human approval checkpoint before commit/PR.

### Repository / Verification Work

The AI inspected the actual repository rather than reasoning only from the handout. Important findings included:

- the Lab 3 release baseline is commit `6c9c2f7`;
- current Ticket status transition logic exists on both backend and UI and backend must remain authoritative;
- owner assignment already has strong transactional/stale-state protections;
- Actions Taken does not exist in the current Prisma schema;
- Dashboard screens/routes do not yet exist in the React shell;
- the current CI workflow still names Lab 2/Lab 3 branches and will need a later Lab 4 update;
- client regression/build and safe server unit/build/Prisma checks were run where possible without risking the development database.

## 4. Human Decisions / Guardrails

The student retained control over:

- choosing the 10-Issue decomposition;
- requiring the same staged Git workflow as earlier labs;
- requiring repository inspection before document drafting;
- preventing the AI from committing/opening a PR before manual review;
- approving/rejecting the proposed Sprint 4 engineering decisions before they become a committed contract; and
- later deciding whether peer-review requested changes should modify the contract.

## 4.1 Issue #51 Implementation Use

For Issue #51, the AI was used to translate the approved contract into the real Prisma/PostgreSQL increment, while keeping API/UI work out of scope. It inspected the existing migration/seed conventions, added the Action Taken relations and Ticket concurrency fields, wrote an additive transaction-wrapped migration, extended seed data without resetting mutable rows, and added tests that reconstruct a Lab 3-shaped schema before applying the Lab 4 migration.

One generated test-harness detail required correction during verification: JavaScript replacement-string handling converted PostgreSQL `DO $$` delimiters unexpectedly in the forced-rollback test. The implementation migration itself had already applied successfully; the harness was changed to a replacement callback, then the targeted tests passed **5/5** and the full Server regression passed **170/170** on the disposable test database. This is retained as an example of why generated test code was executed and corrected rather than assumed correct.

## 4.2 Issue #52 Implementation Use

For Issue #52, the AI mapped the approved API contract onto the existing Lab 3 authentication/Origin/RBAC and serializable-locking patterns rather than inventing a parallel security layer. It implemented Requester-owned read visibility, Staff/Admin write endpoints, server-authoritative creator/performer/canceller identity, per-Ticket create idempotency, Action/Ticket version conflicts, assignee eligibility locking, and the Admin invariant that a user with active assigned Actions cannot be deactivated or demoted until reassignment.

Verification again changed the implementation process rather than merely confirming generated code. During a scope audit, the AI temporarily removed a serializable retry helper from the existing Staff owner flow because it looked unrelated to Actions Taken. The directly affected Lab 3 regression then produced `409` for a normal Claim that should remain `200` under concurrent database load. The helper was restored with explicit Claim revalidation, after which the affected five-file suite passed **56/56** and the final full Server suite passed **191/191**. This correction is recorded because it demonstrates that scope reduction must still preserve established concurrency behavior.

The first peer review of PR #62 then found two implementation gaps against the already-approved contract. First, idempotency compared a retry with the Action's **current mutable fields**, which would incorrectly reject an original lost-response retry after a later edit/reassignment. Second, existing Owner/IT Priority mutations had not yet joined the parent `Ticket.version` protocol even though the contract also requires Status and Requester resolution-indication writes to participate. After human authorization to fix the review, the AI added immutable original-create fingerprint storage, extended the Ticket-version token across all four existing workflow-affecting mutation paths, updated existing clients to carry the token without changing visual UX, and added migration/concurrency regressions. The targeted review-fix suite passed **81/81**, full Server regression passed **196/196**, and Client regression remained **76/76** on disposable PostgreSQL-backed verification.

## 5. My Reflection — Draft for Finalization

Using the AI as a specification agent was most useful when it was constrained by two sources at the same time: the Lab 4 handout and the real Lab 3 implementation. Reading only the new handout would have made it easy to define rules that conflict with existing ownership, authentication, comments, attachments, or responsive behavior. Inspecting the repository first made the Sprint 4 contract more concrete because the proposed API, migration, and UI decisions could reuse existing patterns instead of creating a parallel design.

The most important control was keeping human checkpoints around scope and Git actions. I asked the AI to stop after planning, stop after branch/Issue setup, inspect the previous baseline before drafting, and now stop before commit/PR. This reduced the risk that generated assumptions would immediately become project history. The final reflection will be updated after implementation/review with concrete examples of where coding-agent suggestions were accepted, corrected, or rejected.

## 6. Items to Add Before Final Submission

- [ ] Keep only the strongest 6–10 real selected prompts after Sprint 4 is complete.
- [ ] Add implementation/debugging prompts from Actions Taken, dashboards, workflow, regression, and visual QA only when they actually occur.
- [ ] Add specific examples of AI mistakes/limitations and how they were verified or corrected.
- [ ] Finalize `My Reflection` in the student's own wording after peer review/release.
- [ ] Ensure no hidden chain-of-thought or secrets are included; record observable prompts, outputs, decisions, and verification only.

