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
    "id": 7,
    "name": "Narin Support",
    "role": "IT_STAFF"
  },
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
  "actionDateTime": "2026-09-29T08:30:00.000Z",
  "description": "Check application logs and reproduce the export failure.",
  "assigneeId": 8,
  "followUpRequired": true,
  "followUpNote": "Ask the Requester to retry after the worker restart.",
  "attachmentNotes": "Use requester screenshot report-error.png"
}
```

Client must not send `createdById`, `performedById`, `status`, `version`, or Ticket identity in the body.

Validation:

- `actionDateTime`: required valid ISO date/time.
- `description`: trimmed non-blank, max 2,000 Unicode code points.
- `assigneeId`: positive integer resolving to active `IT_STAFF`/`ADMINISTRATOR` at mutation time.
- `followUpRequired`: Boolean required.
- `followUpNote`: trimmed required iff follow-up is true, max 2,000 Unicode code points; normalized to null when false.
- `attachmentNotes`: optional trimmed max 2,000 Unicode code points.
- Ticket must exist and current status must not be `Resolved`, `Closed`, or `Cancelled`.

Backend behavior:

1. Authorize authenticated Staff/Admin and approved Origin.
2. Lock/revalidate the target assignee as active/permitted using the existing owner-eligibility concurrency style or equivalent transaction-safe mechanism.
3. Re-read the Ticket state inside the mutation transaction.
4. Create Action with `status=PLANNED`, `createdById=authenticatedUser.id`, `performedById=null`, `version=1`.
5. Touch parent Ticket `updatedAt` in the same transaction.

Success `201`: created Action representation.

Conflicts:

- `409 ACTION_ASSIGNEE_NOT_ELIGIBLE` — selected assignee became inactive/ineligible.
- `409 ACTION_TICKET_NOT_ACTIVE` — Ticket is Resolved/Closed/Cancelled by the authoritative write point.
- `409 STALE_TICKET_STATE` — Ticket state changed during a serialized write where applicable.

## 6. PATCH `/api/v1/staff/actions-taken/:id`

Purpose: edit/reassign a Planned or In Progress Action without silently overwriting another user's change.

Roles: `IT_STAFF`, `ADMINISTRATOR`.

Origin: required.

Request may contain one or more editable fields plus mandatory version token:

```json
{
  "expectedVersion": 2,
  "actionDateTime": "2026-09-29T09:00:00.000Z",
  "description": "Inspect worker logs and restart the reporting process.",
  "assigneeId": 7,
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "Review report-error.png"
}
```

Rules:

- `expectedVersion`: required positive integer.
- At least one editable field is required.
- Action must be `Planned` or `In Progress`.
- Assignee rule/validation is identical to create when `assigneeId` changes.
- `createdBy`, `performedBy`, current status, createdAt, and Ticket id cannot be edited here.
- Follow-up normalization/validation is evaluated against the resulting record, not only fields included in the request.
- Update succeeds only where `id` and `version=expectedVersion` and active Action status still match; success increments version by 1.
- Parent Ticket `updatedAt` is touched in the same transaction.

Success `200`: updated Action representation.

Errors:

- `400 VALIDATION_ERROR` invalid body.
- `404` Action missing.
- `409 ACTION_NOT_EDITABLE` terminal Action.
- `409 ACTION_ASSIGNEE_NOT_ELIGIBLE` assignee conflict.
- `409 STALE_ACTION_TAKEN` version changed; no mutation.

## 7. PATCH `/api/v1/staff/actions-taken/:id/status`

Purpose: transition an Action lifecycle, including complete and cancel.

Roles: `IT_STAFF`, `ADMINISTRATOR`.

Origin: required.

Request:

```json
{
  "status": "Completed",
  "expectedVersion": 2,
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
- `expectedVersion` required.
- Completed requires Result non-blank (max 2,000 Unicode code points) and valid follow-up state.
- On Completed, backend sets `performedById=authenticatedUser.id` in the same conditional update; a client performer field is ignored/rejected.
- Cancelled does not delete the Action and leaves `performedById` null unless it was already non-null (which cannot occur from a valid non-terminal source).
- Terminal Actions cannot transition again.
- Successful transition increments version and touches parent Ticket `updatedAt` atomically.

Success `200`: updated Action representation.

Errors:

- `400 VALIDATION_ERROR` unknown status, missing Result/follow-up data, invalid version.
- `404` missing Action.
- `409 INVALID_ACTION_STATUS_TRANSITION` known but forbidden/self transition.
- `409 STALE_ACTION_TAKEN` stale version/current state.

## 8. Requester Dashboard API

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
  "recentlyResolved": []
}
```

Calculation contract:

- `openTickets`: owned count whose status is one of New/Open/In Progress/Waiting for Requester/Reopened.
- `waitingForRequester`: owned count exactly Waiting for Requester.
- `recentlyUpdated`: top 5 owned Tickets by `updatedAt DESC, id DESC`.
- `recentlyResolved`: top 5 owned current-Resolved Tickets by `updatedAt DESC, id DESC`.

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
  "recentUrgentTickets": []
}
```

Calculations:

- Active Ticket statuses = New/Open/In Progress/Waiting for Requester/Reopened.
- `unassignedActiveTickets`: active + owner null.
- `myActiveTickets`: active + owner current authenticated Staff/Admin id.
- `byStatus`: counts all Tickets over all 8 status keys; missing groups returned as `0`.
- `activeByItPriority`: active Ticket counts grouped High/Medium/Low/null (`Not recorded`).
- `myActiveActions`: top 5 Actions with assignee=current user and status Planned/In Progress, order `updatedAt DESC, id DESC`.
- `recentUrgentTickets`: top 5 active Tickets ordered by priority rank High > Medium > Low > null, then `updatedAt DESC, id DESC`.

Summary items expose only fields needed for the Dashboard and Ticket drill-down.

Errors: `401`, `403`, `500 STAFF_DASHBOARD_FAILED`.

## 10. Existing Ticket Status API — Sprint 4 Strengthening

### PATCH `/api/v1/staff/tickets/:id/status`

The Lab 3 path and eight-status transition matrix remain. Sprint 4 adds the final resolution gate and requires conflict handling to be atomic with the authoritative current state.

Request remains:

```json
{ "status": "Resolved" }
```

Rules preserved:

- IT Staff/Admin only.
- Approved Origin required.
- Unknown status -> `400`.
- Unsupported/self known transition -> `409 INVALID_STATUS_TRANSITION`.
- Transition to Reopened clears `problemAppearsResolvedAt` atomically.

Additional Resolved target gate:

Inside the same transaction/serialization boundary used to commit the status:

1. Re-read current Ticket status.
2. Verify the requested transition remains allowed.
3. Count Actions under the Ticket.
4. Require at least one `COMPLETED` Action.
5. Require zero `PLANNED`/`IN_PROGRESS` Actions.
6. Commit Ticket `status=Resolved` only when all checks still hold.

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

If another transition wins first:

`409 STALE_TICKET_STATE`.

Existing Tickets already Resolved/Closed at migration time are not rewritten and do not retroactively require synthetic Actions.

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
| Staff recent/urgent Ticket row | Staff Ticket Detail. |

Where one existing Queue parameter cannot express multiple active statuses, the client may land on the Queue with the strongest existing single filter and communicate the Dashboard context; adding an unsafe client-only hidden dataset is not allowed.

## 13. Duplicate, Stale, and Safe-Failure Rules

- UI submit/change buttons disable while their request is pending.
- Server conditional Action `version` prevents repeated/stale edit/status requests from silently winning twice.
- Ticket status keeps conditional current-state protection and atomic resolution-gate evaluation.
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
