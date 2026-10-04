# TokTickIT Lab 4 — REST API Specification

This document defines the planned Sprint 4 REST contract before implementation. It extends the released Lab 3 `/api/v1` API and preserves all approved authentication, ownership, comment/note, attachment, Staff Ticket, and Administrator endpoints unless this document explicitly strengthens a Lab 4 workflow rule.

## 1. API Conventions Preserved from Lab 3

### 1.1 Base and Authentication

- Versioned application routes remain under `/api/v1`.
- Protected requests use the opaque DB-backed `toktickit_session` HttpOnly cookie with `credentials: "include"`.
- Client-supplied Requester/creator/performer identity is never accepted as authority.
- Existing `requireAuth`, password-change gate, and explicit role authorization remain authoritative.
- State-changing requests require the approved `Origin`; wrong, missing, or `Origin: null` is rejected before mutation.

### 1.2 Standard Error Shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "fields": {
      "description": "Action Description is required"
    }
  }
}
```

`fields` is optional.

| Status | Meaning |
|---|---|
| `400` | Invalid input/query/field validation or unknown enum value. |
| `401` | Missing/expired/invalid authentication. |
| `403` | Authenticated but forbidden, password change required, or Origin rejected. |
| `404` | Resource missing or intentionally hidden to preserve Requester ownership isolation. |
| `409` | Current business state/version conflicts with the valid request. |
| `429` | Existing Login rate limit. |
| `500` | Unexpected safe server failure. |
| `502` | Existing attachment-storage upstream failure where applicable. |

### 1.3 Resource Visibility

- Requester may read Actions/Dashboard data only through owned Ticket scope.
- Staff/Admin may read accessible operational Ticket data according to the Lab 3 matrix.
- Internal Notes remain Staff/Admin-only and never appear in Requester Action/Dashboard responses.
- Dashboard endpoints return concise summary objects, never entire unrestricted Ticket collections.

## 2. New Endpoint Overview

| Group | Endpoint | Roles | Purpose |
|---|---|---|---|
| Actions | `GET /api/v1/tickets/:id/actions-taken` | Requester-own, IT Staff, Admin | Read Ticket Actions Taken. |
| Actions | `POST /api/v1/staff/tickets/:id/actions-taken` | IT Staff, Admin | Create Planned Action. |
| Actions | `PATCH /api/v1/staff/actions-taken/:id` | IT Staff, Admin | Edit/reassign active Action. |
| Actions | `PATCH /api/v1/staff/actions-taken/:id/status` | IT Staff, Admin | Transition/complete/cancel Action. |
| Dashboard | `GET /api/v1/requester/dashboard` | Requester | Ownership-safe summary. |
| Dashboard | `GET /api/v1/staff/dashboard` | IT Staff, Admin | Operational summary. |
| Ticket workflow | existing `PATCH /api/v1/staff/tickets/:id/status` | IT Staff, Admin | Add final resolution gate + atomic conflict behavior. |

## 3. Shared Actions Taken Representation

Successful Action reads return a safe object such as:

```json
{
  "id": 301,
  "ticketId": 42,
  "clientRequestId": "b56d2fe5-4972-49ec-963d-b271d58d8219",
  "workflowCycle": 2,
  "actionDateTime": "2026-09-29T08:30:00.000Z",
  "description": "Reproduced the report export timeout and restarted the reporting worker.",
  "result": "Export completed successfully after restart.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "See requester attachment report-error.png",
  "status": "Completed",
  "createdBy": {
    "id": 7,
    "name": "Narin Support",
    "role": "IT_STAFF"
  },
  "assignee": {
    "id": 8,
    "name": "Malee Support",
    "role": "IT_STAFF"
  },
  "performedBy": {
    "id": 8,
    "name": "Malee Support",
    "role": "IT_STAFF"
  },
  "completedAt": "2026-09-29T08:35:00.000Z",
  "cancelledBy": null,
  "cancelledAt": null,
  "version": 3,
  "createdAt": "2026-09-29T08:00:00.000Z",
  "updatedAt": "2026-09-29T08:35:00.000Z"
}
```

Requester receives the same work-information fields because the Lab 4 requirement says Requesters see all Actions Taken on owned Tickets. No Internal Note content or auth/session secrets are embedded.

Action status JSON labels are exactly:

- `Planned`
- `In Progress`
- `Completed`
- `Cancelled`

## 4. GET `/api/v1/tickets/:id/actions-taken`

Purpose: load the complete Actions Taken list for one visible Ticket.

Authorization:

- Requester: own Ticket only.
- IT Staff: any Ticket.
- Administrator: any Ticket.
- Another Requester's Ticket id returns `404` for Requester.

Ordering:

`actionDateTime DESC`, then `id DESC`.

Success `200`:

```json
{
  "items": [
    { "id": 301, "ticketId": 42, "status": "Completed", "version": 3 }
  ]
}
```

An empty Ticket returns `200 { "items": [] }`.

Errors: `401`, `403 PASSWORD_CHANGE_REQUIRED`, `404`, `500 ACTIONS_TAKEN_LOAD_FAILED`.

## 5. POST `/api/v1/staff/tickets/:id/actions-taken`

Purpose: create a new Planned Action under a non-terminal Ticket.

Roles: `IT_STAFF`, `ADMINISTRATOR`.

Origin: required.

Request:

```json
{
  "clientRequestId": "b56d2fe5-4972-49ec-963d-b271d58d8219",
  "expectedTicketVersion": 7,
  "actionDateTime": "2026-09-29T08:30:00.000Z",
  "description": "Check application logs and reproduce the export failure.",
  "assigneeId": 8,
  "followUpRequired": true,
  "followUpNote": "Ask the Requester to retry after the worker restart.",
  "attachmentNotes": "Use requester screenshot report-error.png"
}
```

Client must not send `createdById`, `performedById`, `completedAt`, `cancelledById`, `cancelledAt`, `workflowCycle`, Action `status`, Action `version`, or Ticket identity in the body.

Validation:

- `clientRequestId`: required UUID generated once for the logical create attempt and reused unchanged if that request must be retried after an unknown/lost response.
- `expectedTicketVersion`: required positive integer from the currently loaded Ticket aggregate.
- `actionDateTime`: required valid ISO date/time representing when the work occurred; normalize offset to UTC; backdating is allowed; values later than server-now + 5 minutes are rejected.
- `description`: trimmed non-blank, max 2,000 Unicode code points.
- `assigneeId`: positive integer resolving to active `IT_STAFF`/`ADMINISTRATOR` at mutation time.
- `followUpRequired`: Boolean required.
- `followUpNote`: trimmed required iff follow-up is true, max 2,000 Unicode code points; normalized to null when false.
- `attachmentNotes`: optional trimmed max 2,000 Unicode code points.
- Ticket must exist and current status must not be `Resolved`, `Closed`, or `Cancelled`.

Backend behavior:

1. Authorize authenticated Staff/Admin and approved Origin.
2. Resolve the idempotency key first within the Ticket scope. If `(ticketId, clientRequestId)` already exists and its `createdById` plus normalized logical create payload match this retry, return the existing row with `200` **without requiring the old `expectedTicketVersion` to still match**. `expectedTicketVersion` is not part of payload-equivalence comparison because the successful first create itself increments that version.
   - Implementation note after PR #62 review: persist an opaque SHA-256 `createFingerprint` of the **original normalized logical create intent** (authenticated creator id, normalized Action Date/Time, Description, original assignee, Follow-Up Required/Note, Attachment Notes). Compare retries against this immutable fingerprint rather than the Action's current mutable columns, so `create -> later edit/reassign -> retry original POST` still returns the same Action with `200`. Legacy/pre-fingerprint rows may keep this internal value null because their original POST intent cannot be reconstructed safely.
3. If the key exists but creator or materially normalized create data differ, reject with `409 IDEMPOTENCY_KEY_REUSE`.
4. Only when the key is new, lock/revalidate the parent Ticket and require `Ticket.version == expectedTicketVersion`.
5. Revalidate the target assignee as active/permitted using the existing owner-eligibility concurrency style or equivalent transaction-safe mechanism.
6. Re-read the Ticket status/workflow cycle and reject terminal Tickets.
7. Create the row with `status=PLANNED`, `workflowCycle=Ticket.workflowCycle`, `createdById=authenticatedUser.id`, `performedById=null`, `completedAt=null`, `cancelledById=null`, `cancelledAt=null`, `version=1`.
8. Touch parent Ticket `updatedAt` and increment parent Ticket `version` in the same transaction only for the first successful creation; an exact idempotent replay does not create another row or increment the Ticket again.

Success:

- first successful creation: `201` + created Action representation;
- exact retry with same Ticket/key/equivalent normalized create payload: `200` + the existing Action representation.

Conflicts:

- `409 ACTION_ASSIGNEE_NOT_ELIGIBLE` — selected assignee became inactive/ineligible.
- `409 ACTION_TICKET_NOT_ACTIVE` — Ticket is Resolved/Closed/Cancelled by the authoritative write point.
- `409 STALE_TICKET_STATE` — parent Ticket version/state changed since the client loaded it.
- `409 IDEMPOTENCY_KEY_REUSE` — same Ticket/create key reused with materially different normalized create input.

When `followUpRequired=true`, a newly completed Action has `followUpStatus=OUTSTANDING`; otherwise it has `followUpStatus=NOT_REQUIRED`.

## 6. PATCH `/api/v1/staff/actions-taken/:id`

Purpose: edit/reassign a Planned or In Progress Action without silently overwriting another user's change.

Roles: `IT_STAFF`, `ADMINISTRATOR`.

Origin: required.

Request may contain one or more editable fields plus mandatory version token:

```json
{
  "expectedVersion": 2,
  "expectedTicketVersion": 8,
  "actionDateTime": "2026-09-29T09:00:00.000Z",
  "description": "Inspect worker logs and restart the reporting process.",
  "assigneeId": 7,
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "Review report-error.png"
}
```

Rules:

- `expectedVersion`: required positive Action version.
- `expectedTicketVersion`: required positive parent Ticket version.
- At least one editable field is required.
- Action must be `Planned` or `In Progress`.
- If `actionDateTime` is edited, the same business-time rule as create applies: normalize ISO offset to UTC, allow backdating, reject values later than server-now + 5 minutes.
- Assignee rule/validation is identical to create when `assigneeId` changes.
- `createdBy`, `performedBy`, current status, createdAt, and Ticket id cannot be edited here.
- Follow-up normalization/validation is evaluated against the resulting record, not only fields included in the request.
- Update succeeds only when Action `version=expectedVersion`, parent Ticket `version=expectedTicketVersion`, and active Action status still match; success increments both Action and Ticket versions.
- Parent Ticket `updatedAt` is touched in the same transaction.

Success `200`: updated Action representation.

Errors:

- `400 VALIDATION_ERROR` invalid body.
- `404` Action missing.
- `409 ACTION_NOT_EDITABLE` terminal Action.
- `409 ACTION_ASSIGNEE_NOT_ELIGIBLE` assignee conflict.
- `409 STALE_ACTION_TAKEN` version changed; no mutation.
- `409 STALE_TICKET_STATE` parent aggregate version changed; no mutation.

## 7. PATCH `/api/v1/staff/actions-taken/:id/status`

Purpose: transition an Action lifecycle, including complete and cancel.

Roles: `IT_STAFF`, `ADMINISTRATOR`.

Origin: required.

Request:

```json
{
  "status": "Completed",
  "expectedVersion": 2,
  "expectedTicketVersion": 8,
  "result": "Export completed successfully after the reporting worker restart.",
  "followUpRequired": false,
  "followUpNote": null
}
```

Allowed transitions:

| Current | Allowed target |
|---|---|
| Planned | In Progress, Completed, Cancelled |
| In Progress | Completed, Cancelled |
| Completed | none |
| Cancelled | none |

Rules:

- `status` must be one supported target label.
- `expectedVersion` and `expectedTicketVersion` required.
- Completed requires Result non-blank (max 2,000 Unicode code points) and valid follow-up state.
- **Only the current assignee may complete.** The backend requires `authenticatedUser.id == current assigneeId`, sets `performedById` to that same id and `completedAt=serverNow` in the same conditional transaction. If reassign wins first, the former assignee's completion attempt fails stale/forbidden; if completion wins first, the terminal row cannot be reassigned.
- Cancel may be performed by permitted Staff/Admin; it does not delete the Action and records `cancelledById=authenticatedUser.id` plus `cancelledAt=serverNow` while leaving performer/completedAt null.
- Terminal Actions cannot transition again.
- Successful transition increments Action version plus parent Ticket version and touches parent `updatedAt` atomically.

Success `200`: updated Action representation.

Errors:

- `400 VALIDATION_ERROR` unknown status, missing Result/follow-up data, invalid version.
- `404` missing Action.
- `409 INVALID_ACTION_STATUS_TRANSITION` known but forbidden/self transition.
- `409 STALE_ACTION_TAKEN` stale version/current state.
- `409 STALE_TICKET_STATE` parent Ticket version changed.
- `409 ACTION_COMPLETION_REQUIRES_ASSIGNEE` authenticated actor is not the authoritative current assignee attempting Complete.

## 8. PATCH `/api/v1/staff/actions-taken/:id/follow-up`

Purpose: explicitly complete an outstanding follow-up attached to a terminal `Completed` Action so it no longer blocks the Ticket Resolution Gate.

Roles: `IT_STAFF`, `ADMINISTRATOR`. Approved Origin is required.

Request:

```json
{
  "expectedVersion": 4,
  "expectedTicketVersion": 12
}
```

Rules:

- Both version tokens are required positive integers.
- The Action must be `Completed`, `followUpRequired=true`, and `followUpStatus=OUTSTANDING`.
- The authenticated Staff/Admin is recorded as `followUpCompletedById`; the server records `followUpCompletedAt`.
- The Action remains terminal `Completed`; this endpoint changes only follow-up lifecycle state/provenance.
- Action `version` and parent Ticket `version` each increment atomically.
- Requesters cannot call this endpoint.

Success `200`: updated Action representation with `followUpStatus=Completed` and completion provenance.

Errors:

- `400 VALIDATION_ERROR` missing/invalid version tokens or unexpected body keys.
- `404` Action missing.
- `409 FOLLOW_UP_NOT_OUTSTANDING` when the Action is not an eligible outstanding follow-up.
- `409 STALE_ACTION_TAKEN` when Action version changed.
- `409 STALE_TICKET_STATE` when parent Ticket version changed.

## 9. Requester Dashboard API

### GET `/api/v1/requester/dashboard`

Role: `REQUESTER` only.

Purpose: concise summary calculated only from `requesterId = authenticatedUser.id`.

Success `200`:

```json
{
  "metrics": {
    "openTickets": 3,
    "waitingForRequester": 1
  },
  "recentlyUpdated": [
    {
      "id": 42,
      "ticketNumber": "TKT-2026-00042",
      "summary": "Cannot export monthly report",
      "status": "Waiting for Requester",
      "requestedPriority": "High",
      "itPriority": "High",
      "updatedAt": "2026-09-29T08:35:00.000Z"
    }
  ],
  "recentlyResolved": [
    {
      "id": 41,
      "ticketNumber": "TKT-2026-00041",
      "summary": "VPN certificate issue",
      "status": "Closed",
      "resolvedAt": "2026-09-29T07:10:00.000Z"
    }
  ]
}
```

Calculation contract:

- `openTickets`: owned count whose status is one of New/Open/In Progress/Waiting for Requester/Reopened.
- `waitingForRequester`: owned count exactly Waiting for Requester.
- `recentlyUpdated`: top 5 owned Tickets by `updatedAt DESC, id DESC`.
- `recentlyResolved`: top 5 owned Tickets with `resolvedAt != null` and current status `Resolved` or `Closed`, ordered `resolvedAt DESC, id DESC`. `resolvedAt` is set by formal Resolve, preserved through Close, cleared on Reopen, and is not fabricated for legacy rows.

No matching rows produce zero values/empty arrays, not `404`.

Authorization tests must prove another Requester's Tickets cannot influence or appear in any value/list.

Errors: `401`, `403`, `500 REQUESTER_DASHBOARD_FAILED`.

## 9. IT Staff Dashboard API

### GET `/api/v1/staff/dashboard`

Roles: `IT_STAFF`, `ADMINISTRATOR`.

Purpose: concise operational summary from authoritative data.

Success `200`:

```json
{
  "metrics": {
    "unassignedActiveTickets": 2,
    "myActiveTickets": 4,
    "byStatus": {
      "New": 1,
      "Open": 2,
      "In Progress": 3,
      "Waiting for Requester": 1,
      "Resolved": 2,
      "Closed": 5,
      "Reopened": 1,
      "Cancelled": 1
    },
    "activeByItPriority": {
      "High": 3,
      "Medium": 2,
      "Low": 1,
      "Not recorded": 0
    }
  },
  "myActiveActions": [],
  "recentlyUpdatedTickets": [],
  "urgentTickets": []
}
```

Calculations:

- Active Ticket statuses = New/Open/In Progress/Waiting for Requester/Reopened.
- `unassignedActiveTickets`: active + owner null.
- `myActiveTickets`: active + owner current authenticated Staff/Admin id.
- `byStatus`: counts all Tickets over all 8 status keys; missing groups returned as `0`.
- `activeByItPriority`: active Ticket counts grouped High/Medium/Low/null (`Not recorded`).
- `myActiveActions`: top 5 Actions with assignee=current user, status Planned/In Progress, active parent Ticket, and `Action.workflowCycle = Ticket.workflowCycle`, order `Action.updatedAt DESC, id DESC`.
- `recentlyUpdatedTickets`: top 5 active Tickets ordered `updatedAt DESC, id DESC`.
- `urgentTickets`: top 5 active Tickets with `itPriority=High`, ordered `updatedAt DESC, id DESC`.

Summary items expose only fields needed for the Dashboard and Ticket drill-down.

Errors: `401`, `403`, `500 STAFF_DASHBOARD_FAILED`.

## 10. Existing Ticket Status API — Sprint 4 Strengthening

### PATCH `/api/v1/staff/tickets/:id/status`

The Lab 3 path and eight-status transition matrix remain. Sprint 4 adds the final resolution gate and requires conflict handling to be atomic with the authoritative current state.

When `status` is `Resolved`, the authoritative current-cycle Actions must satisfy all of the following:

- at least one `Completed` Action has a non-blank `result` after trim;
- no current-cycle Action is `Planned` or `In Progress`;

Cancelled current-cycle Actions do not block the gate. Prior-cycle Actions do not participate in the gate.

`followUpRequired` and `followUpNote` remain Action-level validation fields. A current-cycle non-cancelled Action with `followUpRequired=true` remains an outstanding follow-up and blocks resolution until the approved workflow state is satisfied.

Request is strengthened with the parent aggregate version:

```json
{ "status": "Resolved", "expectedVersion": 12 }
```

Rules preserved:

- IT Staff/Admin only.
- Approved Origin required.
- `expectedVersion` is required and must match the current Ticket `version`.
- Unknown status -> `400`.
- Unsupported/self known transition -> `409 INVALID_STATUS_TRANSITION`.
- Transition to Reopened clears `problemAppearsResolvedAt` atomically.

Additional Resolved target gate:

Inside the same transaction/serialization boundary used to commit the status:

1. Lock/re-read the parent Ticket row.
2. Require `Ticket.version == expectedVersion` and verify the requested transition remains allowed.
3. Read authoritative Actions where `workflowCycle = Ticket.workflowCycle` inside the same transaction.
4. Require at least one current-cycle `COMPLETED` Action.
5. Require zero current-cycle `PLANNED`/`IN_PROGRESS` Actions.
6. Commit `status=Resolved`, `resolvedAt=serverNow`, `updatedAt=serverNow`, and `version=version+1` only when all checks still hold.

If the gate fails:

`409 RESOLUTION_GATE_NOT_MET`

```json
{
  "error": {
    "code": "RESOLUTION_GATE_NOT_MET",
    "message": "Complete or cancel active Actions Taken before resolving this Ticket"
  }
}
```

If another workflow-affecting mutation wins first (including owner/priority/Action changes even if formal status did not change):

`409 STALE_TICKET_STATE`.

Existing Tickets already Resolved/Closed at migration time are not rewritten and do not retroactively require synthetic Actions.

### Reopened target behavior

Within the same locked/version-checked transaction, a successful transition to `Reopened`:

- clears `problemAppearsResolvedAt`;
- clears `resolvedAt`;
- increments `workflowCycle` by 1;
- increments Ticket `version` by 1; and
- preserves all earlier Actions with their original `workflowCycle` values.

The next transition to Resolved must qualify using only Actions from the new current cycle.

### Existing workflow-affecting Ticket APIs

Sprint 4 strengthens the existing Lab 3 mutation payloads so stale aggregate state is detectable even when Ticket status is unchanged:

- `PATCH /api/v1/staff/tickets/:id/owner` includes `expectedVersion` alongside claim/assign/reassign input;
- `PATCH /api/v1/staff/tickets/:id/it-priority` includes `expectedVersion`;
- `PATCH /api/v1/staff/tickets/:id/status` includes `expectedVersion` as above;
- `POST /api/v1/tickets/:id/problem-appears-resolved` includes `expectedVersion` from the Requester Ticket Detail snapshot.

Each successful mutation increments Ticket `version`. A mismatch returns `409 STALE_TICKET_STATE` with no partial mutation. Staff/Requester Ticket Detail responses therefore include current `version`; Staff detail also exposes `workflowCycle` where needed for operational diagnostics, while Requester UI need not display the numeric token.

Implementation locking strategy after PR #62 review:

- aggregate/Action mutations acquire the parent **Ticket first**, then the Action row when applicable, then any assignee User rows needed for eligibility revalidation;
- existing Administrator account-eligibility mutation begins from the target User because that user is the resource being changed, then checks Ticket ownership/active Action assignment inside the same serializable transaction;
- both directions run at Serializable isolation with retry/revalidation. A serialization/deadlock loser must retry the same logical operation and re-check current aggregate/user state; it must not silently turn a lost Claim/Assign/Reassign into a different operation;
- regression coverage includes concurrent Owner-vs-Action mutation and Action assign/reassign-vs-user deactivate/demote, with the invariant that at most one conflicting write commits and no `500` or ineligible final assignee is produced.

## 11. Existing Administrator User Update — Sprint 4 Strengthening

### PATCH `/api/v1/admin/users/:id`

All Lab 3 self-deactivation, last-active-admin, Ticket-owner, email, role, and activation rules remain. Sprint 4 adds the active Action assignee invariant.

When a requested update would set `isActive=false` or change an `IT_STAFF`/`ADMINISTRATOR` to `REQUESTER`:

- if the target user is assigned one or more `Planned`/`In Progress` Actions Taken, reject with `409 ACTIVE_ACTIONS_REQUIRE_REASSIGNMENT`;
- Completed/Cancelled historical Actions do not block the account change;
- re-check active Action assignment and existing Ticket ownership inside the same serialized transaction/locking strategy as the account eligibility mutation;
- concurrent Action assignment/reassignment and account deactivate/demote must never commit a final state where an active Action points to an inactive user or Requester.

Example conflict:

```json
{
  "error": {
    "code": "ACTIVE_ACTIONS_REQUIRE_REASSIGNMENT",
    "message": "Reassign or finish this user's active Actions Taken before changing account eligibility"
  }
}
```

## 12. Drill-Down Contract

The API may return resource ids/summary fields; navigation remains a client responsibility. The approved mapping is:

| Dashboard item | Destination |
|---|---|
| Requester Recent/Resolved Ticket row | Requester Ticket Detail for that owned id. |
| Requester Open card | My Tickets, active-status context when supported. |
| Requester Waiting card | My Tickets filtered to Waiting for Requester. |
| Staff Unassigned card | Ticket Queue with `owner=unassigned` and active-status context. |
| Staff My Tickets card | Ticket Queue with `owner=mine` and active-status context. |
| Staff status/priority card | Ticket Queue with equivalent existing filter. |
| Staff current-user Action row | Parent Staff Ticket Detail, Actions Taken section. |
| Staff Recently Updated Ticket row | Staff Ticket Detail. |
| Staff Urgent Ticket row | Staff Ticket Detail or High-IT-Priority Queue context. |

Where one existing Queue parameter cannot express multiple active statuses, the client may land on the Queue with the strongest existing single filter and communicate the Dashboard context; adding an unsafe client-only hidden dataset is not allowed.

## 13. Duplicate, Stale, and Safe-Failure Rules

- UI submit/change buttons disable while their request is pending.
- Action create is backend-idempotent via `(ticketId, clientRequestId)`; an exact lost-response retry returns the existing Action and does not re-increment Ticket version.
- Server conditional Action `version` prevents repeated/stale edit/status requests from silently winning twice.
- Ticket workflow writes use parent `version`; Resolve additionally locks/revalidates the parent and re-reads current-cycle Actions before commit.
- A conflict response must not clear user-entered edit fields automatically; UI provides refresh/retry guidance.
- `500` responses use safe generic messages and do not include Prisma stack traces, SQL, hashes, cookies, or secrets.
- Read failures do not mutate state.

## 14. Existing API Regression Contract

The following Lab 3 API groups remain supported and covered by regression tests:

- `/api/v1/auth/*` Login/Logout/Me/Change Password.
- authenticated Categories/Related Systems.
- Requester Ticket create/list/detail.
- Requester Attachment upload/download/soft-remove with existing limits/concurrency/storage behavior.
- Public Comments and Requester `Problem Appears Resolved`.
- Staff Queue/assignee list/Ticket Detail/owner/IT Priority/status.
- Internal Notes.
- Administrator User Management and initial-password reset.

Lab 4 implementation must not relax their authorization or safe-error semantics while adding the routes above.
