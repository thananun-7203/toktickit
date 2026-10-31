# Lab 4 — AI Use and Reflection

## 1. AI Tool Used

- **Model:** GPT-5.6 Sol in ChatGPT.
- **Primary role in Sprint 4:** specification agent, repository reconnaissance assistant, mockup/UI implementation assistant, implementation/test assistant, regression-evidence auditor, and peer-review correction assistant for Issues #50–#58.
- **Repository interaction:** ComGu Core was used to inspect the real `C:\toktickit` repository, create/push Lab 4 feature branches, read source/tests/docs, implement the approved increments, run isolated PostgreSQL verification, and maintain evidence records. ComGu Desktop/temporary browser harnesses were used for observable visual QA without committing authentication bypasses or QA-only files.

The ten prompts below are actual selected prompts preserved from Sprint planning and early implementation. Later dashboard/workflow/regression/visual-QA assistance is recorded in the observable work log below. Exact later-chat prompt wording is not reconstructed from memory or invented.

## 2. Selected Key Prompts Used So Far

The final submission requires 6–10 selected key prompts. These ten real prompts are retained as the selected set; they show the student's planning, approval checkpoints, and implementation authorization.

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

### Prompt 10 — Approve desktop/mobile mockups and implement Issue #53 without opening a PR

> "โอเค mockup ผ่านทั้งคอมและมือถือแล้ว ลงมือทำได้เลย แต่อย่าพึ่งเปิด PR นะ"

**Use:** Preserved a human UI checkpoint before coding. After both mockups were approved, the AI implemented the Actions Taken Ticket Detail UI on a dedicated branch, but stopped before PR creation exactly as requested.

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

## 4.3 Issue #53 UI / Mockup / Verification Use

For Issue #53, the AI first produced Actions Taken desktop/mobile mockups and revised them after the student compared them with the existing TokTickIT Sign-in and Ticket Queue Zen Green theme. The mockup was also corrected against the Lab 4 contract before coding: Action Date/Time was added, Create no longer exposed a Status selector, file upload was replaced with text-only Attachment Notes, completion/follow-up/audit states were made explicit, and Requester read-only behavior plus error/empty/loading/responsive states were included. Implementation started only after the student explicitly approved both desktop and mobile mockups.

The UI implementation reused one `ActionsTakenPanel` for Staff interactive and Requester read-only contexts, wired the approved Issue #52 API instead of duplicating backend rules in the browser, and added focused component tests for create/edit/reassign/start/complete/cancel, stale conflicts, ineligible assignees, idempotent retry, draft preservation, terminal immutability, modal keyboard behavior, and audit provenance. Verification exposed one additional client-side consistency issue: when a lost-response create is recovered by a `200` idempotent replay, simply rendering the returned Action would leave the local parent Ticket version stale. The UI was changed to refresh authoritative Ticket state on recovered replay rather than guessing a version increment. Final Issue #53 Client regression passed **90/90**, targeted backend/API regression passed **53/53** on disposable PostgreSQL, and the production builds/Prisma validation passed.

Visual QA used a temporary harness that rendered the real component and production CSS with representative Actions. That harness was intentionally removed before commit. Desktop/tablet layouts were inspected successfully; a limitation of the Windows Chrome headless runtime prevented trustworthy exact-390-CSS-pixel evidence because its inner viewport would not go below roughly 499–500 pixels. Rather than record a false pass, exact 390px browser/Playwright evidence remains assigned to the planned Issue #58 visual/accessibility gate; the `<=420px` production CSS rules themselves were implemented during Issue #53.

## 4.4 Issues #55–#58 — Dashboard, Workflow, Regression, and Visual QA Use

For Issue #55 (IT Staff Dashboard), the AI implemented the server-authoritative dashboard aggregate, UI summaries, deterministic ordering, and responsive checks. Peer review required stronger negative fixtures and exact Admin navigation regression. The AI added the missing tests rather than treating the first green local run as sufficient evidence.

For Issue #56 (Requester Dashboard), the AI made an out-of-scope change to Resolution Gate follow-up semantics while working on the Dashboard. `Tanaboonnnnn` identified that this contradicted the approved workflow contract. The change was returned to the approved behavior and the separate follow-up design was moved to Issue #67. Further review found a mounted My Tickets component retaining stale `Waiting for Requester` filter state; the navigation synchronization and regression flow were corrected before approval.

For Issue #67 (Resolution Gate & Follow-Up Workflow), the first UI implementation inferred the current workflow cycle from the maximum cycle found on Actions. Review identified that this could display a false Ready state after Reopen when only historical Actions existed. The AI changed the UI to use authoritative `Ticket.workflowCycle` and added `FU-UI-03` for the historical-cycle scenario.

For Issue #57 (Security, Regression & End-to-End Verification), the initial evidence wording overstated a representative Lab 3 regression subset as a full Labs 1–3 rerun. Review required the documentation to distinguish representative evidence from deferred release-final regression, add the controlled PostgreSQL E2E-AT-02 integration scenario, and align performance claims with the assertions actually executed. The evidence wording and test traceability were corrected; deferred full release gates remained explicit.

For Issue #58 (Accessibility, Responsive & Visual QA), the first browser evidence focused too narrowly on Administrator screens. Review required cross-role coverage for Requester/Staff Dashboards and Ticket Detail/Actions Taken, plus real Development DB screenshots and a final human visual review. The AI expanded the browser coverage and documented 16 fixture-backed screenshots separately from 12 live-Development-DB screenshots. The dependency lockfile changes were also explained as intentional security updates with their source commits, rather than left unexplained.

### Observable limitations and verification corrections

- The AI can make a plausible but incorrect scope change; the Requester Dashboard work demonstrated why the approved contract and peer review must override an unapproved generated behavior change.
- The AI initially used the wrong source of truth for current workflow cycle; the reviewer found the Reopen edge case and a dedicated regression test was added.
- The AI can overstate test completeness if representative and full-suite evidence are not distinguished. The PR #69 review corrected the wording and kept release-final gates pending.
- Fixture screenshots do not prove live database state. The Issue #58 record separates the 16 deterministic responsive screenshots from 12 read-only live Development DB screenshots, and does not claim mobile live-DB verification.
- Hosted CI is meaningful only for the exact reviewed commit. The reviewer records identify the exact head and CI run for each approved PR.

## 5. My Reflection — Draft for Student Review

Using the AI as a specification agent was most useful when it was constrained by two sources at the same time: the Lab 4 handout and the real Lab 3 implementation. Reading only the new handout would have made it easy to define rules that conflict with existing ownership, authentication, comments, attachments, or responsive behavior. Inspecting the repository first made the Sprint 4 contract more concrete because the proposed API, migration, and UI decisions could reuse existing patterns instead of creating a parallel design.

The most important lesson was that generated code and green tests were not enough by themselves. During the Requester Dashboard work, the AI changed the Resolution Gate behavior outside the approved Issue scope; the reviewer caught the contract conflict, and the behavior had to be restored and separated into its own Issue. During the follow-up work, the reviewer also found that the UI could use an old Action cycle after Reopen, so the implementation was corrected to use the Ticket's authoritative workflow cycle. These examples showed me why I needed to compare code with the specification and ask for review instead of accepting the first implementation.

I also learned to describe evidence carefully. A representative regression run is not the same as a full release regression, and a screenshot made with mocked data is not proof of live database content. The final QA record separates those evidence types and keeps unfinished release gates visible. AI was useful for implementation, test design, and organizing evidence, but I still needed to make scope decisions, inspect the results, and rely on peer review before considering the work complete.

**Student action required:** read this draft and change any first-person statement that does not match the student's own experience before submitting the final PDF.

## 6. Items to Add Before Final Submission

- [x] Keep only the strongest 6–10 real selected prompts after Sprint 4 is complete (10 actual prompts retained).
- [x] Record later implementation/debugging/review work from Actions Taken, dashboards, workflow, regression, and visual QA without inventing verbatim prompt wording.
- [x] Add specific examples of AI mistakes/limitations and how they were verified or corrected.
- [ ] Finalize `My Reflection` in the student's own wording after peer review/release.
- [x] Ensure no hidden chain-of-thought or secrets are included; record observable prompts, outputs, decisions, and verification only.

