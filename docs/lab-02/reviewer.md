# TokTickIT Lab 2 — Peer Review Record

This file records peer-review evidence for the Lab 2 feature workflow.

## Review Log

| Feature / PR | Reviewer | Initial result | Follow-up | Final status |
|---|---|---|---|---|
| Issue 4 — My Tickets, PR #24 | Peepipat-Suesoongnuen | Changes requested: requester landing flow, empty-state Create Ticket CTA, and missing A-8 oldest/newest assertions | All three points fixed; regression tests added and CI passed | Approved and merged into `lab2-staging` |
| Issue 5 — Ticket Detail & Attachments, PR #25 | Peepipat-Suesoongnuen / cottonlnwza | Changes requested across review rounds: attachment concurrency/failure paths, TDD wording, then Lab Sheet evidence gaps for removal reason and AI-use format | Concurrency fixes reached head `1fd9977` with hosted server/client/E2E CI green. Latest review confirmed concurrency fixes and requested Removal Reason + Part 4 AI-use evidence alignment; both follow-up gaps are now implemented and verified locally, with push/re-review pending. | Changes requested |

## Issue 5 Reviewer Checklist

The Issue 5 reviewer should verify the following before approval:

- [ ] `GET /api/v1/tickets/:id` returns only the acting requester's ticket and uses 404 for another requester's ticket.
- [ ] Ticket Detail is read-only and displays ticket metadata, description, and attachment metadata.
- [ ] Upload accepts only JPG/JPEG/PNG/WEBP/PDF, maximum 5 MB per file, and maximum five active attachments.
- [ ] An invalid/rejected upload batch does not partially persist attachment metadata.
- [ ] Attachment data is stored through the SeaweedFS storage adapter in the real E2E environment.
- [ ] Download preserves the original filename and is scoped to the acting requester.
- [ ] Remove requires a non-blank reason and is a soft removal: timestamp/reason metadata remain visible, storage is retained, and the file can no longer be downloaded through the API.
- [ ] Removed attachments have no Download/Remove actions in the UI.
- [ ] My Tickets can open Ticket Detail on desktop and mobile layouts.
- [ ] Create Ticket can optionally upload attachments after successful ticket creation.
- [ ] Server tests, client tests, TypeScript checks, and Playwright E2E all pass.

## Review Notes for Issue 5

Initial review of PR #25 confirmed that requester ownership, soft removal, download/remove behavior, storage cleanup, Create Ticket attachment flow, and hosted client/server/E2E CI were otherwise in good shape.

Two blockers were requested before approval:

1. Make the max-five-active-attachments rule concurrency-safe and add a regression test proving that `4 active + 2 simultaneous uploads` never produces more than five active attachments or orphan storage/metadata.
2. Correct the TDD documentation so it states what can actually be proven: failing-first tests were run locally, while the Issue 5 feature commit bundled tests and implementation rather than committing a separate Red snapshot.

The first follow-up was pushed as head `25cf7d5`. Hosted CI run `33765029030` passed server `45/45`, client `23/23`, and Playwright E2E `1/1`. The second peer review explicitly confirmed both original blockers as fixed, then identified two additional concurrency/failure-path blockers:

1. A capacity-race loser could still write a SeaweedFS object before acquiring the authoritative Ticket row lock, then rely on best-effort cleanup if it lost the capacity check.
2. Two simultaneous soft-remove requests could both read `removedAt = null` and both return 200 instead of exactly one 200 and one 409.

The local second follow-up moves the authoritative row lock/count before any storage write, strengthens A-12C to prove the losing request performs no storage write or cleanup, makes soft removal an atomic conditional update, and adds A-13C for simultaneous DELETEs. Local verification after these changes: server `46/46`, client `23/23`, server/client TypeScript checks passed, Playwright E2E `1/1`, and the two concurrency tests passed in three repeated runs. Hosted CI and final re-review evidence will be recorded after the next push.

At head `1fd9977`, the next peer review confirmed both concurrency fixes and the exact-head hosted CI as good, then identified two Lab Sheet submission gaps: (1) soft removal must record and display a removal reason for Part 8 evidence, and (2) `ai-use.md` must identify the LLM/model, provide a 6–10 selected-prompt Markdown table, and present "My Reflection" for Part 4.

The local third follow-up adds nullable `Attachment.removalReason` migration support for historical rows, requires a non-blank reason for all new removals, records `removedAt` + `removalReason` in the same atomic conditional update, displays the reason on removed attachment metadata, and exercises the reason through API/UI/E2E tests. `ai-use.md` now records OpenAI ChatGPT — GPT-5.6 Sol for this review/fix workflow, eight selected prompts, and a `My Reflection` section. Local verification: server `47/47`, client `24/24`, server/client TypeScript checks passed, Playwright E2E `1/1`, Prisma schema validation passed, and A-12C/A-13C concurrency tests passed in three repeated runs. Hosted CI and final re-review evidence will be recorded after the next push.
