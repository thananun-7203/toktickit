# TokTickIT Lab 2 — Peer Review Record

This file records peer-review evidence for the Lab 2 feature workflow.

## Review Log

| Feature / PR | Reviewer | Initial result | Follow-up | Final status |
|---|---|---|---|---|
| Issue 4 — My Tickets, PR #24 | Peepipat-Suesoongnuen | Changes requested: requester landing flow, empty-state Create Ticket CTA, and missing A-8 oldest/newest assertions | All three points fixed; regression tests added and CI passed | Approved and merged into `lab2-staging` |
| Issue 5 — Ticket Detail & Attachments, PR #25 | Peepipat-Suesoongnuen | Changes requested: concurrent uploads could exceed five active attachments; TDD wording overstated what Git history proves | Both fixes implemented and verified locally; commit/push and re-review are still pending | Changes requested |

## Issue 5 Reviewer Checklist

The Issue 5 reviewer should verify the following before approval:

- [ ] `GET /api/v1/tickets/:id` returns only the acting requester's ticket and uses 404 for another requester's ticket.
- [ ] Ticket Detail is read-only and displays ticket metadata, description, and attachment metadata.
- [ ] Upload accepts only JPG/JPEG/PNG/WEBP/PDF, maximum 5 MB per file, and maximum five active attachments.
- [ ] An invalid/rejected upload batch does not partially persist attachment metadata.
- [ ] Attachment data is stored through the SeaweedFS storage adapter in the real E2E environment.
- [ ] Download preserves the original filename and is scoped to the acting requester.
- [ ] Remove is a soft removal: metadata remains visible and the file can no longer be downloaded through the API.
- [ ] Removed attachments have no Download/Remove actions in the UI.
- [ ] My Tickets can open Ticket Detail on desktop and mobile layouts.
- [ ] Create Ticket can optionally upload attachments after successful ticket creation.
- [ ] Server tests, client tests, TypeScript checks, and Playwright E2E all pass.

## Review Notes for Issue 5

Initial review of PR #25 confirmed that requester ownership, soft removal, download/remove behavior, storage cleanup, Create Ticket attachment flow, and hosted client/server/E2E CI were otherwise in good shape.

Two blockers were requested before approval:

1. Make the max-five-active-attachments rule concurrency-safe and add a regression test proving that `4 active + 2 simultaneous uploads` never produces more than five active attachments or orphan storage/metadata.
2. Correct the TDD documentation so it states what can actually be proven: failing-first tests were run locally, while the Issue 5 feature commit bundled tests and implementation rather than committing a separate Red snapshot.

Local follow-up verification after addressing the blockers: server `45/45`, client `23/23`, TypeScript checks passed, and Playwright E2E `1/1` passed. Hosted CI/re-review evidence will be recorded after the fixes are pushed.
