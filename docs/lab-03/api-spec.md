# TokTickIT Lab 3 — REST API Specification

This document records the final Sprint 3 REST contract after implementation and review. It extends the existing Lab 2 `/api/v1` API and replaces `X-Dev-Requester-Id` ownership with authenticated session identity.

## 1. Global Conventions

### 1.1 Base URL

- Local server default: `http://localhost:3000`
- Versioned application routes: `/api/v1/...`
- Health check remains `GET /api/health`.

### 1.2 Authentication

- Successful login sets an `HttpOnly` cookie named `toktickit_session`.
- Client requests to protected endpoints use `credentials: "include"`.
- Protected endpoints do **not** accept `requesterId` as identity proof.
- The Lab 2 `X-Dev-Requester-Id` header is retired from the Lab 3 application flow.
- Server session is opaque and DB-backed; only a hash of the random session token is persisted.

### 1.3 CORS / CSRF

- Credentialed CORS uses an explicit configured client origin; wildcard origin is not allowed.
- State-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) must include an `Origin` header exactly matching the configured client origin. Missing Origin, `Origin: null`, or a mismatched Origin is rejected with `403` before mutation.
- Cookie uses `SameSite=Lax`; `Secure=true` outside local HTTP development.

### 1.4 Standard Success / Error Behavior

JSON success payloads use explicit objects unless an endpoint is documented as a stream.

Standard error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "fields": {
      "email": "Email is required"
    }
  }
}
```

`fields` is optional and appears for field-addressable validation errors.

Status categories:

| Status | Meaning |
|---|---|
| `400` | Invalid input / query / validation. |
| `401` | Missing, expired, or invalid authentication. |
| `403` | Authenticated but operation forbidden; may include `PASSWORD_CHANGE_REQUIRED`. |
| `404` | Resource missing or intentionally hidden to avoid cross-owner information leakage. |
| `409` | Valid request conflicts with current business state (invalid status transition, already removed attachment, last-admin rule, etc.). |
| `429` | Login-attempt rate limit reached. |
| `500` | Unexpected server failure with safe message. |
| `502` | Existing attachment-storage upstream read/write failure where applicable. |

### 1.5 Safe Resource Visibility

- Requester access to another Requester's Ticket/Attachment returns `404`, not a revealing `403`, where the endpoint is resource-specific.
- Requester access to an Internal Note collection is `403`; response contains no note metadata/content.
- Admin-only endpoint access by Requester/IT Staff is `403`.

### 1.6 Pagination Shape

List APIs that paginate return:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "totalItems": 0,
  "totalPages": 0
}
```

## 2. Authentication and Session API

### 2.1 POST `/api/v1/auth/login`

Purpose: authenticate an active user.

Origin requirement: this state-changing unauthenticated endpoint is still covered by section 1.3. The server checks `Origin` **before** credential lookup/rate-limit/session work; wrong, missing, or `Origin: null` returns `403` and creates no session.

Request:

```json
{
  "email": "somsri@toktick.it",
  "password": "LocalPass123"
}
```

Validation:

- `email`: required string, trimmed/lowercased for lookup, syntactically valid email, max 254 chars.
- `password`: required string; do not trim silently; reject input whose UTF-8 byte length exceeds 72 so bcrypt never silently truncates credential input.

Success `200`:

```json
{
  "user": {
    "id": 2,
    "name": "Somsri Rakdee",
    "email": "somsri@toktick.it",
    "role": "REQUESTER",
    "isActive": true,
    "mustChangePassword": true
  },
  "nextAction": "CHANGE_PASSWORD"
}
```

If password change is not required, `nextAction` is `APPLICATION`.

Errors:

- `400 VALIDATION_ERROR` malformed request.
- `401 INVALID_CREDENTIALS` for unknown email or wrong password; same message.
- `403 ACCOUNT_INACTIVE` for an inactive account, with no additional account disclosure.
- `429 LOGIN_RATE_LIMITED` after 5 failed attempts for same normalized email in the active 15-minute window.
- `500 AUTHENTICATION_FAILED` safe unexpected failure.

On success:

- Create DB-backed session with an absolute 8-hour expiry measured from successful login; normal requests do not extend it.
- Set `toktickit_session` cookie.
- Clear failed-login counter for that normalized email.

### 2.2 POST `/api/v1/auth/logout`

Authentication: any current session; idempotent when cookie is missing/expired.

Success: `204 No Content`.

Behavior:

- Delete/invalidate current server session when it exists.
- Expire `toktickit_session` cookie.
- Reuse of old cookie must not restore access.

### 2.3 GET `/api/v1/auth/me`

Purpose: bootstrap authenticated client state.

Success `200`:

```json
{
  "id": 7,
  "name": "Narin Support",
  "email": "narin.staff@toktick.it",
  "role": "IT_STAFF",
  "isActive": true,
  "mustChangePassword": false
}
```

Errors: `401` missing/expired/invalid session.

Password hash/session token are never returned.

### 2.4 POST `/api/v1/auth/change-password`

Authentication: required. Allowed when `mustChangePassword=true` and as a normal profile password action.

Request:

```json
{
  "currentPassword": "InitialPass123",
  "newPassword": "ChangedPass456",
  "confirmPassword": "ChangedPass456"
}
```

Rules:

- Current password must match.
- New password: at least 10 characters, at least one letter and one digit, and UTF-8 byte length ≤72 for bcrypt compatibility.
- New password and confirmation must match.
- New password must differ from current password.
- On success set new hash and `mustChangePassword=false`.
- Invalidate all other sessions for this user; current session may be rotated/reissued.

Success `200`:

```json
{
  "user": {
    "id": 2,
    "name": "Somsri Rakdee",
    "email": "somsri@toktick.it",
    "role": "REQUESTER",
    "isActive": true,
    "mustChangePassword": false
  }
}
```

Errors: `400` field validation, `401` current password/session invalid, `500` safe failure.

## 3. Reference Data API

These endpoints continue to serve Create Ticket/filters. In Lab 3 they are authenticated-only and available to `REQUESTER`, `IT_STAFF`, and `ADMINISTRATOR`. Unauthenticated access returns `401`; an implementation PR must not make these endpoints public without a reviewed contract change.

### 3.1 GET `/api/v1/categories`

Roles: Requester, IT Staff, Administrator.

Success `200`:

```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" }
]
```

### 3.2 GET `/api/v1/related-systems`

Roles: Requester, IT Staff, Administrator.

Success `200`: array of `{ id, name }`.

## 4. Requester Ticket APIs — Lab 2 Continuation

All routes in this section require authenticated role `REQUESTER` unless stated otherwise. Identity comes from the session.

### 4.1 POST `/api/v1/tickets`

Purpose: Create Requester Ticket.

Request:

```json
{
  "categoryId": 1,
  "relatedSystemId": 2,
  "requestedPriority": "High",
  "summary": "Cannot export monthly report",
  "description": "Export remains loading after I click the button."
}
```

Lab 2 validation remains:

- Category/System positive existing ids.
- Requested Priority exactly `Low`, `Medium`, or `High`.
- Summary required, trimmed for validation/persistence, max 100.
- Description required, trimmed for validation/persistence, max 2,000.

Server behavior:

- `requesterId = authenticatedUser.id`; ignore/reject any client requester identity field.
- Generates Ticket Number `TKT-YYYY-NNNNN` with existing retry logic.
- Initial status `New`.
- `itPriority = requestedPriority` for new Lab 3 Ticket.
- `ownerId = null`.

Success `201`: Ticket summary object.

### 4.2 GET `/api/v1/tickets`

Purpose: My Tickets for authenticated Requester only.

Query:

| Param | Type | Default | Rule |
|---|---|---|---|
| `search` | string | none | Ticket Number OR Summary, case-insensitive. |
| `categoryId` | positive int | none | Exact filter. |
| `relatedSystemId` | positive int | none | Exact filter. |
| `sort` | `newest`, `oldest`, `summary_asc` | `newest` | Preserve Lab 2 behavior. |
| `page` | int ≥1 | 1 | |
| `pageSize` | 1–50 | 10 | |

Success `200`: standard pagination shape; items scoped to authenticated user.

### 4.3 GET `/api/v1/tickets/:id`

Purpose: Requester Ticket Detail.

Success `200` includes:

- Lab 2 Ticket fields.
- Attachments including removed metadata/reason.
- `itPriority` and current `status` as read-only Requester-visible operational context.
- `problemAppearsResolvedAt`.
- Public Comments are **not** embedded in this response. The client retrieves them only through `GET /api/v1/tickets/:id/public-comments` in section 5.

Errors: `404` unknown or not owned.

### 4.4 POST `/api/v1/tickets/:id/attachments`

Multipart field `files`.

Lab 2 rules preserved:

- 1–5 files/request.
- ≤5 MB/file.
- allowed JPG/JPEG, PNG, WEBP, PDF.
- maximum 5 active attachments/Ticket.
- concurrency-safe capacity check.
- no orphan storage for rejected concurrency loser.
- owned Ticket only.

Success `201`: created attachment metadata.

### 4.5 GET `/api/v1/attachments/:id/download`

Roles:

- Requester: active attachment on own Ticket only.
- IT Staff/Administrator: active attachment on any Ticket.

This is the only Attachment endpoint in section 4 intentionally shared with staff/admin; upload and soft-remove remain Requester-only.

Errors: `403` role forbidden where applicable, `404` unknown/hidden resource, `409` removed, `502` storage failure.

### 4.6 DELETE `/api/v1/attachments/:id`

Soft remove; owned Ticket only.

Request:

```json
{ "reason": "Uploaded the wrong document" }
```

Reason required/non-blank. Existing atomic concurrency behavior remains: one simultaneous removal can succeed, later/current-state conflict returns `409`.

## 5. Public Comments and Requester Resolution Indication

### 5.1 GET `/api/v1/tickets/:id/public-comments`

Roles:

- Requester: own Ticket only.
- IT Staff/Administrator: any Ticket.

Success `200`:

```json
{
  "items": [
    {
      "id": 10,
      "content": "I can reproduce this after signing in.",
      "createdAt": "2026-09-13T10:00:00.000Z",
      "author": {
        "id": 2,
        "name": "Somsri Rakdee",
        "role": "REQUESTER"
      }
    }
  ]
}
```

Ordered oldest→newest, then id ascending.

### 5.2 POST `/api/v1/tickets/:id/public-comments`

Roles/visibility same as GET.

Request:

```json
{ "content": "The error still occurs after restart." }
```

Validation: trimmed content 1–2,000 chars; backend assigns author/time.

Success `201`: created comment.

Errors: `400`, `403` role forbidden, `404` missing/hidden Ticket.

### 5.3 POST `/api/v1/tickets/:id/problem-appears-resolved`

Role: Requester, own Ticket only.

Request body: none.

Behavior:

- Set `problemAppearsResolvedAt` only when null.
- Do **not** change status.
- Allowed current statuses: `New`, `Open`, `In Progress`, `Waiting for Requester`, `Reopened`.
- Current status `Resolved`, `Closed`, or `Cancelled` → `409 RESOLUTION_INDICATION_NOT_ALLOWED` with no mutation.
- Repeated call while already set is idempotent and returns the existing indication.
- If staff later transitions the Ticket to `Reopened`, that status mutation clears `problemAppearsResolvedAt`; the Requester may create a fresh indication afterward.

Success `200`:

```json
{
  "ticketId": 42,
  "problemAppearsResolvedAt": "2026-09-13T11:30:00.000Z",
  "status": "Waiting for Requester"
}
```

## 6. IT Staff Ticket Queue API

Roles: `IT_STAFF`, `ADMINISTRATOR`.

### 6.1 GET `/api/v1/staff/tickets`

Searchable fields:

- Ticket Number.
- Summary.
- Requester name/email.

Filters:

| Param | Values / rule |
|---|---|
| `search` | Optional trimmed free text, max 100. |
| `status` | One approved Ticket status. |
| `requestedPriority` | `Low`, `Medium`, `High`. |
| `itPriority` | `Low`, `Medium`, `High`, `not_recorded`. |
| `owner` | `unassigned`, `mine`, or the positive user id of an active `IT_STAFF` / `ADMINISTRATOR` returned by the assignee list; other ids are rejected with a validation error. |
| `categoryId` | positive int. |
| `relatedSystemId` | positive int. |
| `sort` | `updated_desc` (default), `created_desc`, `created_asc`, `priority_desc`, `ticket_number_asc`. |
| `page` | ≥1, default 1. |
| `pageSize` | 1–50, default 10. |

Multiple filters may combine with AND. Each query parameter may appear at most once; duplicate parameters are rejected with `400 VALIDATION_ERROR` rather than silently choosing one value.

Success `200` item example:

```json
{
  "id": 42,
  "ticketNumber": "TKT-2026-00042",
  "summary": "Cannot export monthly report",
  "category": { "id": 1, "name": "Software" },
  "requester": { "id": 2, "name": "Somsri Rakdee", "email": "somsri@toktick.it" },
  "requestedPriority": "High",
  "itPriority": "High",
  "status": "New",
  "owner": null,
  "createdAt": "2026-09-13T09:00:00.000Z",
  "updatedAt": "2026-09-13T09:00:00.000Z"
}
```

Invalid query → `400` with field errors.

### 6.2 GET `/api/v1/staff/tickets/:id`

Roles: IT Staff/Admin.

Success `200` includes:

- full Ticket metadata,
- Requester info,
- Requested Priority (read-only),
- IT Priority,
- owner,
- status,
- `problemAppearsResolvedAt`,
- attachments including removed metadata,
- but **not** Public Comments or Internal Notes collections.

Communication is loaded through the dedicated section 5 Public Comment endpoints and section 8 Internal Note endpoints. This endpoint must never put Internal Notes into Requester-facing response serializers.

## 7. IT Staff Ticket Operations

### 7.1 PATCH `/api/v1/staff/tickets/:id/owner`

Roles: IT Staff/Admin.

Claim request:

```json
{ "action": "claim" }
```

Assign/reassign request:

```json
{ "action": "assign", "ownerId": 12 }
```

Rules:

- Target owner active and role IT Staff/Admin.
- Claim sets owner to authenticated user.
- `ownerId` is ignored/not allowed for claim.
- Lab 3 does not expose an unassign action; once a Ticket is assigned, ownership changes by reassignment to another eligible owner.
- Claim/assign/reassign must preserve the owner invariant atomically with concurrent Administrator role/activation changes. The operation must use a database transaction plus a serialization mechanism on the affected owner user(s) (for example row-level locking, serializable transaction semantics, or an equivalent conditional-write strategy), re-read `isActive`/`role` after serialization, and update the Ticket only while the target still satisfies the owner rule.
- Reassignment must coordinate both the current owner and target owner in a deterministic order where multiple user rows are involved so that a concurrent deactivate/demote cannot commit an invalid owner reference.
- If a concurrent Admin change wins first and the target is no longer eligible, the owner mutation returns `409 OWNER_NOT_ELIGIBLE` (or an equivalent documented conflict) and does not change the Ticket. If the owner mutation wins first, a competing deactivate/demote must observe the assignment and fail with `409 ASSIGNED_TICKETS_REQUIRE_REASSIGNMENT`.
- Other stale/current-state concurrency conflicts return `409` rather than silently overwriting newer state.

Success `200`: updated owner + `updatedAt`.

### 7.2 PATCH `/api/v1/staff/tickets/:id/it-priority`

Request:

```json
{ "itPriority": "High" }
```

Allowed `Low`, `Medium`, `High`.

Requested Priority is not changed.

Success `200`: `requestedPriority`, `itPriority`, `updatedAt`.

### 7.3 PATCH `/api/v1/staff/tickets/:id/status`

Request:

```json
{ "status": "In Progress" }
```

Allowed transition checked against `specification.md` matrix.

When the requested target status is `Reopened`, the same server-side mutation also sets `problemAppearsResolvedAt = null`.

Success `200`: current status + `updatedAt`.

Errors:

- `400` invalid status string.
- `404` Ticket missing.
- `409 INVALID_STATUS_TRANSITION` known status but transition not allowed.

The API does not rely on a client confirmation flag for safety; confirmation is UI feedback. Server authorization + transition validation remain authoritative.

## 8. Internal Notes

### 8.1 GET `/api/v1/staff/tickets/:id/internal-notes`

Roles: IT Staff/Admin only.

Optional query parameters:

- `page`: positive integer, default `1`.
- `pageSize`: `1–100`, default `50`.
- duplicate/invalid pagination parameters → `400 VALIDATION_ERROR`.

Success `200`: paginated append-only note list oldest→newest with
`items`, `page`, `pageSize`, `totalItems`, and `totalPages`.

Requester direct call → `403` and no note content.

### 8.2 POST `/api/v1/staff/tickets/:id/internal-notes`

Roles: IT Staff/Admin only.

Request:

```json
{ "content": "Confirmed issue is limited to the reporting service." }
```

Validation: trimmed 1–2,000 chars. Backend author/time.

Success `201`: created note.

## 9. Administrator User Management API

All endpoints require `ADMINISTRATOR`.

### 9.1 GET `/api/v1/admin/users`

Query:

| Param | Rule |
|---|---|
| `search` | Optional name/email substring, case-insensitive, max 100. |
| `role` | Optional `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`. |

Pagination is not required for Lab 3.

Success `200`:

```json
{
  "items": [
    {
      "id": 2,
      "name": "Somsri Rakdee",
      "email": "somsri@toktick.it",
      "role": "REQUESTER",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-08-25T00:00:00.000Z",
      "updatedAt": "2026-09-13T00:00:00.000Z"
    }
  ]
}
```

No password hash returned.

### 9.2 POST `/api/v1/admin/users`

Request:

```json
{
  "name": "Alex Thompson",
  "email": "alex.thompson@toktick.it",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "InitialPass123"
}
```

Validation:

- Name trimmed 1–100.
- Email valid, normalized, unique case-insensitively.
- Role exactly one permitted role.
- `isActive` boolean.
- Initial password follows BR-05.

Behavior: hash password; set `mustChangePassword=true`.

Success `201`: safe user object.

Errors: `400`, `409 DUPLICATE_EMAIL`.

### 9.3 PATCH `/api/v1/admin/users/:id`

Request may include one or more:

```json
{
  "name": "Alex T.",
  "email": "alex.t@toktick.it",
  "role": "IT_STAFF",
  "isActive": false
}
```

Rules:

- Duplicate email → `409`.
- Invalid role/input → `400`.
- Admin cannot set own `isActive=false` → `409 SELF_DEACTIVATION_FORBIDDEN`.
- Changing/deactivating the last active Administrator so zero active Administrators remain → `409 LAST_ACTIVE_ADMIN_REQUIRED`.
- Role change from Administrator to another role counts toward last-admin safety.
- If the target user currently owns one or more Tickets, setting `isActive=false` or changing role to `REQUESTER` → `409 ASSIGNED_TICKETS_REQUIRE_REASSIGNMENT`; neither the user nor any Ticket is mutated. The Tickets must be reassigned through the staff owner endpoint first.
- The assigned-Ticket check and user eligibility mutation occur in the same database transaction and serialize on the target user using the same owner-invariant strategy as section 7.1. After serialization, the server re-reads current owned Tickets before committing. This prevents assign/reassign racing with deactivate/demote from producing an invalid `Ticket.ownerId`.
- No delete behavior.

Success `200`: updated safe user object.

### 9.4 POST `/api/v1/admin/users/:id/initial-password`

Request:

```json
{
  "initialPassword": "NewInitial123",
  "confirmPassword": "NewInitial123"
}
```

Rules:

- Password policy applies.
- Sets new hash.
- Sets `mustChangePassword=true`.
- Invalidates existing sessions for target user.
- Does not return the plaintext password after request processing.

Success `200`:

```json
{
  "id": 12,
  "mustChangePassword": true
}
```

## 10. Staff Assignment Reference Data

### 10.1 GET `/api/v1/staff/assignees`

Roles: IT Staff/Admin.

Returns active users whose role is `IT_STAFF` or `ADMINISTRATOR`, sorted by name/id, for owner controls.

Success `200`:

```json
[
  { "id": 9, "name": "Narin Support", "email": "narin.staff@toktick.it", "role": "IT_STAFF" }
]
```

Inactive users are excluded.

## 11. Session / Password-Change Authorization Gate

Protected request order:

1. Resolve session cookie.
2. Reject expired/missing session `401`.
3. Resolve current user and reject inactive user `401` while invalidating session.
4. If `mustChangePassword=true`, allow only `/auth/me`, `/auth/change-password`, `/auth/logout`; reject normal app APIs with `403 PASSWORD_CHANGE_REQUIRED`.
5. Apply role authorization.
6. Apply ownership/resource visibility rules.
7. Validate input/business state.
8. Execute mutation/query.

This order prevents client-controlled identity from bypassing authentication and keeps safe-error behavior consistent.

## 12. Final Endpoint Inventory / Issue Mapping

| Group | Endpoint | Implementation issue |
|---|---|---|
| Auth | `POST /auth/login` | Issue 2 |
| Auth | `POST /auth/logout` | Issue 2 |
| Auth | `GET /auth/me` | Issue 2 |
| Auth | `POST /auth/change-password` | Issue 2 |
| Requester | Lab 2 Ticket/Attachment endpoints using session identity | Issue 3 |
| Requester | Public Comments / Problem Appears Resolved | Issue 3 |
| Staff | Queue / assignee list | Issue 4 |
| Staff | Operational detail / owner / priority / status | Issue 5 |
| Staff | Public Comments / Internal Notes | Issue 5 |
| Admin | User list/search/filter/create/edit | Issue 6 |
| Admin | Set initial password | Issue 6 |
| Cross-cutting | authorization/safe errors/regression | Issue 7 |
