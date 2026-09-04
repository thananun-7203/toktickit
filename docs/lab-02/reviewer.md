# Lab 2 — Peer Review Record

**Author:** ธนนันท์ ครังตุ้ย - 67070507203 - GitHub: [@thananun-7203](https://github.com/thananun-7203)<br>
**Peer reviewer:** Peepipat Suesoongnuen — 67070507207 — GitHub: [@Peepipat-Suesoongnuen](https://github.com/Peepipat-Suesoongnuen)<br>
**Peer reviewer:** ธนากร สร้อยสน — 67070507205 — GitHub: [@cottonlnwza](https://github.com/cottonlnwza)

## Pull Requests I authored (partner review status)

| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| [thananun-7203/toktickit#20](https://github.com/thananun-7203/toktickit/pull/20) | `feature/1-spec-and-test-plan` | Changes requested, revised, approved by `Peepipat-Suesoongnuen`, and merged on 2026-08-26 |
| [thananun-7203/toktickit#21](https://github.com/thananun-7203/toktickit/pull/21) | `feature/2-dev-requester-context` | Changes requested, revised, approved by `Peepipat-Suesoongnuen`, and merged on 2026-08-29 |
| [thananun-7203/toktickit#22](https://github.com/thananun-7203/toktickit/pull/22) | `feature/3-ticket-creation` | Changes requested, revised, approved by `Peepipat-Suesoongnuen`, and merged on 2026-08-30 |
| [thananun-7203/toktickit#23](https://github.com/thananun-7203/toktickit/pull/23) | `chore/followup-ticket-retry-ci` | Ticket-number retry and hosted CI follow-up approved by `Peepipat-Suesoongnuen`; merged on 2026-08-31 |
| [thananun-7203/toktickit#24](https://github.com/thananun-7203/toktickit/pull/24) | `feature/4-my-tickets` | Changes requested for requester landing, empty-state CTA, and A-8 sorting coverage; revised, approved, and merged on 2026-09-02 |
| [thananun-7203/toktickit#25](https://github.com/thananun-7203/toktickit/pull/25) | `feature/5-ticket-detail-and-attachments` | Multiple review rounds by `Peepipat-Suesoongnuen` and `cottonlnwza`; concurrency, removal-reason, TDD wording, and AI-use evidence fixes accepted; merged on 2026-09-04 |
| [thananun-7203/toktickit#29](https://github.com/thananun-7203/toktickit/pull/29) | `feature/6-functional-alignment-requested-priority` | Requested Priority and Ticket Number/Summary search reviewed and approved by `cottonlnwza`; merged on 2026-09-04 |
| [thananun-7203/toktickit#30](https://github.com/thananun-7203/toktickit/pull/30) | `feature/7-zen-green-ui-alignment` | Zen Green UI, requester dropdown, responsive layouts, badges, and Check System compatibility approved by `cottonlnwza`; merged on 2026-09-04 |

The notes below preserve the main review history that led to the approved Lab 2 implementation. Requested changes were resolved in follow-up work before merge. Issue 8 is the final evidence/release-readiness audit and remains uncommitted/unpushed until the student approves that step.

## Review feedback and how I responded

### PR #20 — Issue 1: Specification and Test Plan

Reviewer feedback:

- The initial Ticket Status must be `New`, not `Open`, because this is a Lab 2 business rule.
- Specification, API contract, test plan, schema/model expectations, and UI references must use the same status value.
- The review also checked that reference-data endpoints and test traceability were complete.

How I responded:

- Updated the Lab 2 documents so initial Ticket Status is consistently `New`.
- Aligned the API/test expectations and reference-data coverage with the specification.
- Rechecked the traceability information before the follow-up review.

Follow-up result: `Peepipat-Suesoongnuen` confirmed the requested changes were covered and approved PR #20.

### PR #21 — Issue 2: Development Requester Context & Database Seed

Reviewer feedback:

- Prepare the requester identity plumbing so later Create/My Tickets/Attachment issues do not need repeated refactoring.
- Add reusable handling for `X-Dev-Requester-Id` and requester context.
- The initial review also suggested browser persistence for the requester selection.

How I responded:

- Added the shared requester-context/API identity plumbing needed by later Lab 2 screens.
- Implemented the requested follow-up and received approval.
- During the later Issue 4 review, requester identity was rechecked against the current Lab 2 contract and browser persistence was removed so `RequesterContext` remains the source of truth for the active development requester.

Follow-up result: PR #21 was approved by `Peepipat-Suesoongnuen` and merged.

### PR #22 / #23 — Issue 3: Create Ticket and follow-up CI

Reviewer feedback:

- Verify that the Create Ticket API contract matches this repository's `/api/v1/...` routes and `X-Dev-Requester-Id` identity header.
- Keep server-side Ticket Number generation robust against unique-number conflicts.
- Improve evidence by adding hosted CI.
- Keep validation and field-level error handling aligned with the UI specification.

How I responded:

- Kept the repository's documented `/api/v1/tickets` + `X-Dev-Requester-Id` contract consistent across code and docs.
- Preserved server-side `TKT-YYYY-NNNNN` generation and validation rules.
- Added the ticket-number retry/CI follow-up in PR #23.
- Kept per-field validation and Create Ticket busy/success states covered by tests.

Follow-up result: PR #22 was approved, then PR #23 was approved as the retry/hosted-CI follow-up.

### PR #24 — Issue 4: My Tickets

Reviewer feedback:

- After selecting a Development Requester, the flow must land on My Tickets.
- The My Tickets empty state needs an actionable Create Ticket CTA.
- A-8 must prove `oldest` and `newest` sorting, not only category filtering/summary ordering.

How I responded:

- Changed the post-selection flow to land on My Tickets.
- Added the Create Ticket CTA to the empty state.
- Added API assertions for both `oldest` and `newest` ordering.
- Rechecked requester identity handling and kept `RequesterContext` as the current source of truth.

Follow-up result: all three blockers were confirmed fixed and PR #24 was approved and merged.

### PR #25 — Issue 5: Ticket Detail & Attachments

Reviewer feedback across several rounds:

- Make the maximum-five-active-attachments rule concurrency-safe.
- Ensure a losing concurrent upload does not leave orphan SeaweedFS storage or metadata.
- Make simultaneous soft-removal atomic so exactly one request succeeds and the other conflicts.
- Keep the TDD wording aligned with evidence actually available in Git history/local runs.
- Add the Lab Sheet Part 8 removal reason and retain it with removed attachment metadata.
- Align `ai-use.md` with the required model name, selected prompts, and My Reflection section.

How I responded:

- Moved the authoritative attachment capacity check under a database row lock before storage write.
- Added concurrency regression coverage for `4 active + 2 simultaneous uploads`.
- Implemented atomic conditional soft removal and regression coverage for simultaneous DELETE requests.
- Required a non-blank `removalReason`, stored it with `removedAt`, displayed it in Ticket Detail, and blocked download after removal.
- Corrected TDD documentation so it claims local Red/Green execution rather than a separate committed Red snapshot.
- Updated `ai-use.md` for the Lab Sheet Part 4 format.

Follow-up result: final review by `cottonlnwza` approved head `b157502`; PR #25 was merged into `lab2-staging`.

### PR #29 — Issue 6: Requested Priority & My Tickets Search

Reviewer feedback / result:

- Requested Priority was verified across Prisma, API validation, Create Ticket, My Tickets, and Ticket Detail.
- Search by both Ticket Number and Summary was verified while preserving requester isolation.
- No IT Staff / IT Priority workflow was introduced outside Lab 2 scope.
- A priority-badge visual improvement was suggested as non-blocking follow-up work.

How I responded:

- Kept the allowed requester-facing values as `Low`, `Medium`, and `High`.
- Kept historical database compatibility while requiring priority for every new API-created ticket.
- Included Ticket Number/Summary search in the final API/UI/E2E behavior.
- Addressed the visual priority-badge suggestion in Issue 7.

Status: approved by `cottonlnwza` and merged into `lab2-staging`.

### PR #30 — Issue 7: Zen Green UI Alignment

Reviewer feedback / result:

- Zen Green color tokens, requester dropdown, Create Ticket/My Tickets/Ticket Detail redesign, and responsive layouts were accepted.
- Priority and Status badges were accepted.
- Mobile hamburger navigation and table-to-card behavior were accepted.
- Check System remained available and Lab 1 compatibility was preserved.
- Playwright evidence confirmed no page-level horizontal overflow at 1280 px, 820 px, and 390 px.

Status: approved by `cottonlnwza` and merged into `lab2-staging`.

## Hosted CI / verification status

| PR | Verification before merge |
|----|---------------------------|
| #23 | Hosted CI follow-up added for the Create Ticket work |
| #24 | Server and Client checks passed |
| #25 | Server, Client, and E2E checks passed on the final approved head |
| #29 | Server, Client, and E2E checks passed |
| #30 | Server, Client, and E2E checks passed |

Current Issue 8 local final-regression evidence is maintained in `docs/lab-02/tests.md`. Hosted CI/reviewer evidence for Issue 8 will be added only after its PR is explicitly approved for commit/push/opening.

## Pull Requests I reviewed for my partners

The following Lab 2 pull requests have GitHub review activity from `@thananun-7203` and belong to the peer reviewers named above.

| Repository / PR | Review focus | Evidence recorded |
|---|---|---|
| [Peepipat-Suesoongnuen/TokTickIT#22](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/22) | Development Requester context, API and selector-screen alignment | GitHub review submitted by `@thananun-7203` |
| [Peepipat-Suesoongnuen/TokTickIT#23](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/23) | Create Ticket backend generation, UI, and validation | GitHub review submitted by `@thananun-7203` |
| [Peepipat-Suesoongnuen/TokTickIT#37](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/37) | Lab 2 release readiness and final integration | GitHub review submitted by `@thananun-7203` |
| [cottonlnwza/toktickit#23](https://github.com/cottonlnwza/toktickit/pull/23) | Lab 2 engineering-contract documentation | GitHub review submitted by `@thananun-7203` |
| [cottonlnwza/toktickit#24](https://github.com/cottonlnwza/toktickit/pull/24) | Database models, migrations, and seed data | GitHub review submitted by `@thananun-7203` |
| [cottonlnwza/toktickit#25](https://github.com/cottonlnwza/toktickit/pull/25) | Development Requester context | GitHub review submitted by `@thananun-7203` |
| [cottonlnwza/toktickit#26](https://github.com/cottonlnwza/toktickit/pull/26) | Create Ticket workflow | GitHub review submitted by `@thananun-7203` |
| [cottonlnwza/toktickit#27](https://github.com/cottonlnwza/toktickit/pull/27) | My Tickets list workflow | GitHub review submitted by `@thananun-7203` |
| [cottonlnwza/toktickit#28](https://github.com/cottonlnwza/toktickit/pull/28) | Requester Ticket Detail and Attachments | GitHub review submitted by `@thananun-7203` |

Status: the authored Lab 2 PRs listed above through Issue 7 are merged into `lab2-staging`. Issue 8 remains the final evidence/release-readiness change. The later `lab2-staging` → `main` merge is a separate release operation and is not performed until explicitly approved.
