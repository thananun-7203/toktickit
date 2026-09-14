# TokTickIT Lab 3 — Sprint 3 Engineering Specification

| | |
|---|---|
| **Project** | TokTickIT |
| **Lab** | Lab 3 — Users, Roles, IT Staff Ticketing, and Admin Screens |
| **Issue** | #33 — Sprint 3 Engineering Contract & Test Plan |
| **Integration branch** | `lab3-staging` |
| **Feature branch** | `feature/1-sprint3-engineering-contract` |
| **Author** | Thananun Krungtui (67070507203) |
| **Status** | Initial engineering contract — before Lab 3 implementation |

---

## 1. Sprint Goal

Sprint 3 converts the Lab 2 requester-only development prototype into a role-aware multi-user support application. The sprint replaces the temporary Development Requester selector with real authentication, preserves all completed Requester ticket and attachment behavior, introduces the first operational IT Staff queue/detail workflow, and adds a deliberately minimal Administrator user-management capability. The increment is complete only when authentication, authorization, migration, ticket workflow, comments/notes, user administration, responsive Zen Green UI, regression coverage, and final evidence all agree with this contract.

## 2. Stakeholder Request — Interpretation

The stakeholder needs TokTickIT to stop relying on a development-only requester identity and begin operating with real users. Users sign in with email and password, users with an initial password must replace it before using normal application features, and every server endpoint must enforce role and ownership rules rather than trusting hidden frontend controls.

Requester functionality from Lab 2 must remain available, but ownership now comes from the authenticated account. IT Staff need a shared work queue and operational Ticket Detail workflow that supports ownership, IT Priority, controlled status transitions, Public Comments, and Internal Notes. Requesters may communicate publicly and indicate that a reported problem appears resolved, but they do not formally resolve or close tickets. Administrators manage user accounts through a small User Management screen and must be protected from unsafe operations that would remove all active administrators.

The Lab 2 Zen Green visual language remains the application design foundation; Lab 3 extends it rather than introducing a second design system.

## 3. Scope

### 3.1 Included

- Real email/password authentication.
- Mandatory first-login password change for accounts marked as using an initial password.
- Logout and current-user retrieval.
- Server-side role-based authorization for `Requester`, `IT_STAFF`, and `ADMINISTRATOR`.
- Migration from `DevelopmentRequester` identity to authenticated `User` identity without discarding existing Lab 2 Ticket or Attachment data.
- Preservation of all Lab 2 Requester behavior: Create Ticket, My Tickets, search/filter/sort/pagination, Ticket Detail, attachment upload/download/soft removal, Requested Priority, ownership isolation, responsive Zen Green UI, and existing validation.
- Requester Public Comments.
- Requester `Problem Appears Resolved` indication without granting formal resolve/close permission.
- IT Staff Ticket Queue with search, filters, sorting, pagination, ownership/status/priority context, and responsive UI.
- IT Staff Ticket Detail with claim/assign/reassign, IT Priority, permitted status transitions, Public Comments, Internal Notes, attachment continuity, validation, and safe errors.
- Minimal Administrator User Management: user list, search by name/email, optional role filter, create, edit basic account data, exactly one role, activation/deactivation, and setting a new initial password.
- Idempotent Lab 3 seed data for active/inactive Requesters, IT Staff, at least one Administrator, realistic tickets, Public Comments, and Internal Notes.
- Unit, API/integration, UI, authorization/security, migration/regression, responsive, accessibility, E2E, and visual-evidence coverage.
- GitHub Issue → feature branch → peer-reviewed PR → `lab3-staging` → release PR → `main` workflow.

### 3.2 Explicitly Excluded

- Email invitations or password-reset email.
- Self-registration / Requester-created accounts.
- Multi-factor authentication.
- Social login or SSO.
- Multiple roles assigned to one user.
- User deletion, bulk user actions, import/export, role-history, or account-history screens.
- Departments, organizations, profile photos, multi-tenant administration, or extended user profiles.
- Account unlocking or administrator approval workflows.
- Actions Taken by IT Staff.
- Formal SLA calculations, escalations, notification services, dashboards, or KPI analytics beyond simple queue counts.
- Production-grade cloud/deployment changes.
- Advanced Admin list behavior such as mandatory pagination, multi-column sorting, or multiple simultaneous filters.

## 4. Roles and Authorization Matrix

Backend authorization is authoritative. The frontend may hide unavailable controls, but direct API calls must still be rejected when the authenticated role is not permitted.

Legend: **Y** = permitted, **Own** = only owned/submitted resource, **N** = forbidden.

| Operation | Requester | IT Staff | Administrator |
|---|---:|---:|---:|
| Sign in / sign out / read own session | Y | Y | Y |
| Change own password | Y | Y | Y |
| Read Categories / Related Systems reference data | Y | Y | Y |
| Create Ticket | Y | N | N |
| List Requester tickets | Own | N | N |
| Open Requester Ticket Detail | Own | N | N |
| View attachment metadata | Own ticket | Any ticket | Any ticket |
| Download active attachments | Own ticket | Any ticket | Any ticket |
| Upload attachments | Own ticket | N | N |
| Soft-remove attachments | Own ticket | N | N |
| Read/post Public Comments | Own ticket | Any ticket | Any ticket |
| Indicate `Problem Appears Resolved` | Own ticket | N | N |
| Open IT Staff Ticket Queue | N | Y | Y |
| Open operational Ticket Detail | N | Y | Y |
| Claim / assign / reassign Ticket owner | N | Y | Y |
| Update IT Priority | N | Y | Y |
| Update Ticket status | N | Y | Y |
| Read/post Internal Notes | N | Y | Y |
| List/search/filter users | N | N | Y |
| Create/edit user account | N | N | Y |
| Activate/deactivate user | N | N | Y |
| Set a new initial password | N | N | Y |

### 4.1 Administrator Ticket-Operation Decision

Lab 3 keeps Administrator and IT Staff responsibilities conceptually separate in navigation and primary workflow, but the approved authorization matrix explicitly permits Administrators to access operational Ticket APIs where the Lab 3 rules refer to Administrator visibility/ownership/IT Priority. The Admin landing navigation remains User Management first; no extra dashboard is required. This avoids an implicit privilege assumption: the permission is documented and testable rather than accidental.

## 5. Functional Requirements

### 5.1 Authentication and Session

| ID | Requirement |
|---|---|
| FR-01 | An active user can authenticate with a unique email address and valid password. |
| FR-02 | Invalid credentials return a safe generic authentication error without confirming whether an account exists. |
| FR-03 | An inactive user cannot establish authenticated application access. |
| FR-04 | The backend exposes the current authenticated user identity, role, activation state, and password-change requirement without returning password data. |
| FR-05 | Logout invalidates the active session so the same session cannot access protected APIs afterward. |
| FR-06 | A user whose account requires a password change is restricted to authentication/session and change-password functions until a valid new password is saved. |
| FR-07 | After a successful mandatory password change, the user proceeds into the normal application shell for their role. |
| FR-08 | Authentication attempts are rate-limited according to BR-08. |

### 5.2 Authenticated Application Shell

| ID | Requirement |
|---|---|
| FR-09 | The authenticated shell displays the current user's name and role. |
| FR-10 | Navigation exposes only destinations permitted for the authenticated role. |
| FR-11 | The shell provides Logout and an allowed password-change action. |
| FR-12 | Direct access to protected client routes/screens without a valid session is blocked and redirects to Login or a safe forbidden state. |

### 5.3 Requester Regression and Extensions

| ID | Requirement |
|---|---|
| FR-13 | The Development Requester selector, Change Requester action, and `X-Dev-Requester-Id` identity mechanism are removed from the normal Lab 3 workflow. |
| FR-14 | Requester identity for Create Ticket, My Tickets, Ticket Detail, and Attachment operations is derived only from the authenticated backend session. |
| FR-15 | An authenticated Requester can create a Ticket using Category, Related System, Requested Priority, Summary, Description, and permitted Attachments under the existing Lab 2 validation rules. |
| FR-16 | An authenticated Requester can list only their own Tickets with Lab 2 search/filter/sort/pagination behavior preserved. |
| FR-17 | An authenticated Requester can open only their own Ticket Detail and use permitted Lab 2 attachment actions. |
| FR-18 | A Requester can read and append Public Comments on their own Ticket. |
| FR-19 | A Requester can indicate that their own reported problem appears resolved only while the Ticket is in an allowed non-terminal status defined by BR-26. |
| FR-20 | A Requester cannot formally set Ticket status to `Resolved` or `Closed`. |

### 5.4 IT Staff Ticket Queue

| ID | Requirement |
|---|---|
| FR-21 | IT Staff/Administrator can retrieve a shared Ticket Queue. |
| FR-22 | The Queue supports search, filters, sorting, pagination, and documented defaults/validation. |
| FR-23 | Queue items expose a justified operational subset including Ticket Number, Summary, Category, Requested Priority, IT Priority, Status, Owner, Created/Updated context, and an open-detail action. |
| FR-24 | The Queue clearly distinguishes assigned and unassigned Tickets. |
| FR-25 | Queue UI provides loading, empty, no-results, forbidden, and safe-failure feedback and remains usable on desktop, tablet, and mobile. |

### 5.5 IT Staff Ticket Detail and Operations

| ID | Requirement |
|---|---|
| FR-26 | IT Staff/Administrator can open operational Ticket Detail for any Ticket. |
| FR-27 | Ticket Detail separates read-only Requester-submitted data from editable operational fields. |
| FR-28 | IT Staff/Administrator can claim an unassigned Ticket or assign/reassign an owner according to BR-20–BR-22. Lab 3 does not add an unassign action. |
| FR-29 | IT Staff/Administrator can update IT Priority without modifying Requested Priority. |
| FR-30 | IT Staff/Administrator can perform only status transitions permitted by the approved transition matrix. |
| FR-31 | IT Staff/Administrator can read and append Public Comments. |
| FR-32 | IT Staff/Administrator can read and append Internal Notes. |
| FR-33 | Public Comments and Internal Notes are visually distinct to reduce accidental disclosure. |
| FR-34 | Existing Lab 2 attachments remain visible and operational under the approved authorization rules. |
| FR-35 | Staff can see the Requester's `Problem Appears Resolved` indication without treating it as formal status resolution. |

### 5.6 Administrator User Management

| ID | Requirement |
|---|---|
| FR-36 | Administrator can list users showing Name, Email, Role, Status, and Edit action. |
| FR-37 | Administrator can search users by name or email and optionally filter by role. |
| FR-38 | Administrator can create a user with name, unique email, exactly one permitted role, activation state, and initial password. |
| FR-39 | Administrator can edit user name, email, role, and activation state subject to Administrator-safety and assigned-owner invariants. |
| FR-40 | Administrator can set a new initial password that requires change at the user's next login. |
| FR-41 | The system prevents duplicate email addresses and invalid role values. |
| FR-42 | The system prevents an Administrator from deactivating their own account. |
| FR-43 | The system prevents any change that would leave zero active Administrators. |
| FR-44 | Non-Administrators are forbidden from Administrator User Management APIs/screens. |

## 6. Business Rules

### 6.1 Authentication / Account Rules

| ID | Rule |
|---|---|
| BR-01 | Only an active user with valid credentials may authenticate. |
| BR-02 | A user marked `mustChangePassword=true` cannot enter normal application workflows until a valid replacement password is saved. |
| BR-03 | User email is normalized with trim + lowercase for comparison/storage and must be unique case-insensitively. |
| BR-04 | Passwords are never stored in plaintext; only a one-way password hash is persisted. |
| BR-05 | Password policy: at least 10 characters, containing at least one letter and one digit, and no more than 72 UTF-8 bytes because Lab 3 uses bcrypt; leading/trailing spaces are treated as part of the password rather than silently trimmed. |
| BR-06 | A new password must match confirmation and must differ from the current/initial password. |
| BR-07 | Authentication errors use a generic message such as `Invalid email or password`; inactive-account UI may state that access is unavailable without exposing additional account details. |
| BR-08 | Login attempts are limited to 5 failed attempts for the same normalized email within 15 minutes; the next attempt is rejected with `429` until the window expires. Successful authentication clears the failure counter. This is a local-lab protection, not a production anti-abuse system. |
| BR-09 | Logout invalidates the current server-side session immediately. |
| BR-10 | Session secrets/tokens are never returned in normal JSON payloads or committed to source control. |

### 6.2 Identity / Ownership Rules

| ID | Rule |
|---|---|
| BR-11 | Authenticated session identity, never a client-supplied requester id, determines Requester ownership. |
| BR-12 | A Requester may list/read/modify permitted Ticket or Attachment resources only when `ticket.requesterId == authenticatedUser.id`. |
| BR-13 | Cross-requester Ticket/Attachment access returns `404` where practical so the API does not confirm another user's protected resource exists. |
| BR-14 | Existing Lab 2 Development Requesters are migrated/evolved to `User` records while retaining Ticket ownership. |

### 6.3 Comments and Notes Rules

| ID | Rule |
|---|---|
| BR-15 | Public Comments are visible to the owning Requester, IT Staff, and Administrator. |
| BR-16 | Internal Notes are visible only to IT Staff and Administrator. Requester access is forbidden without returning note content. |
| BR-17 | Public Comments and Internal Notes are append-only in Lab 3; editing and deletion are not implemented. |
| BR-18 | Comment/Note author and creation timestamp are assigned by the backend from the authenticated session/server clock. |
| BR-19 | Comment/Note content must contain non-whitespace text, maximum 2,000 characters, and is rendered as plain text (React escaping; no raw HTML injection). |

### 6.4 Ticket Ownership / Priority Rules

| ID | Rule |
|---|---|
| BR-20 | A Ticket may have zero or one primary operational owner. |
| BR-21 | A primary owner must be an active user with role `IT_STAFF` or `ADMINISTRATOR`. |
| BR-22 | Claim sets owner to the authenticated permitted staff user; assign/reassign requires the target user to satisfy BR-21. |
| BR-23 | Requested Priority remains the Requester-submitted value and is never overwritten by staff operations. |
| BR-24 | For every new Lab 3 Ticket, IT Priority initially copies Requested Priority. IT Staff/Administrator may later set IT Priority to `Low`, `Medium`, or `High`. |
| BR-25 | Historical Tickets whose pre-Lab-3 Requested Priority is null remain readable; their IT Priority may remain null until staff sets it. UI displays `Not recorded` rather than inventing historical intent. |

### 6.5 Requester Resolution Indication

| ID | Rule |
|---|---|
| BR-26 | A Requester may set `problemAppearsResolvedAt` for their own Ticket only while status is `New`, `Open`, `In Progress`, `Waiting for Requester`, or `Reopened`. The indication does not change Ticket status. Requests in `Resolved`, `Closed`, or `Cancelled` return `409` with no mutation. |
| BR-27 | Repeating the action while the indication is already set is idempotent and retains the original timestamp. Any formal transition to `Reopened` clears `problemAppearsResolvedAt`; the Requester may set a fresh indication again afterward. |
| BR-28 | Requesters cannot directly call the staff status-transition endpoint. |

### 6.6 Administrator Safety Rules

| ID | Rule |
|---|---|
| BR-29 | Exactly one role is stored per user in Lab 3. |
| BR-30 | Administrator cannot deactivate their own account. |
| BR-31 | The system rejects deactivation or role change of the last active Administrator when it would leave zero active Administrators. |
| BR-32 | Users are deactivated rather than deleted. User deletion is not exposed by the API. |
| BR-33 | Setting a new initial password sets `mustChangePassword=true`; existing authenticated sessions for that target user are invalidated so the new credential state takes effect safely. |
| BR-34 | If a user currently owns one or more Tickets, Administrator User Management cannot deactivate that user or change their role to `REQUESTER`. The operation returns `409 ASSIGNED_TICKETS_REQUIRE_REASSIGNMENT` with no user/Ticket mutation; all owned Tickets must be reassigned first. |

## 7. Ticket Status Transition Matrix

Required statuses: `New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`.

Only `IT_STAFF` and `ADMINISTRATOR` may execute formal status transitions. Requesters use the separate BR-26 indication.

| Current | Allowed next status | Confirmation / validation |
|---|---|---|
| `New` | `Open`, `Cancelled` | Cancellation requires explicit confirmation in UI. |
| `Open` | `In Progress`, `Waiting for Requester`, `Resolved`, `Cancelled` | Resolve/Cancel requires confirmation. |
| `In Progress` | `Waiting for Requester`, `Resolved`, `Cancelled` | Resolve/Cancel requires confirmation. |
| `Waiting for Requester` | `In Progress`, `Resolved`, `Cancelled` | Resolve/Cancel requires confirmation. |
| `Resolved` | `Closed`, `Reopened` | Close/Reopen requires confirmation. |
| `Closed` | `Reopened` | Reopen requires confirmation. |
| `Reopened` | `In Progress`, `Waiting for Requester`, `Resolved`, `Cancelled` | Resolve/Cancel requires confirmation. |
| `Cancelled` | `Reopened` | Reopen requires confirmation. |

Additional rules:

- No self-transition (`Open → Open`).
- Unsupported transitions return `409 Conflict` with a safe message and do not mutate the Ticket.
- Every transition whose target status is `Reopened` clears `problemAppearsResolvedAt` in the same mutation so a stale Requester-resolution indication is not shown after reopening.
- Lab 3 does not require Actions Taken, therefore no Actions-Taken completion precondition is applied to `Resolved`/`Closed` in this sprint.
- Status history/audit log is not required in Lab 3; only the current status and `updatedAt` are required.

## 8. Authentication / Session Decision

### 8.1 Chosen Mechanism

Lab 3 will use an **opaque server-side session**:

1. On successful login the server generates a cryptographically random session token.
2. Only a SHA-256 hash of that token is stored in an `AuthSession` row.
3. The raw token is sent to the browser in an `HttpOnly` cookie named `toktickit_session`.
4. The cookie uses `SameSite=Lax`; `Secure` is enabled outside local HTTP development; the cookie path is `/`.
5. The server resolves the cookie on protected requests and checks session expiry plus current user activation/password-change state.
6. Logout deletes the active session row and expires the cookie.
7. Sessions use an **absolute 8-hour lifetime from successful login**. The expiry is not extended by normal requests; expiration is checked server-side on every protected request.

### 8.2 Password Hashing

- Use `bcrypt` with cost factor 12 unless implementation constraints documented in the Issue 2 PR justify an equivalent approved password-hashing library.
- Plaintext passwords exist only in request memory during validation/hash comparison and are never logged.

### 8.3 CSRF / Origin Considerations

- Authentication is cookie-based, so state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) must include an `Origin` header that exactly matches the configured client origin in addition to `SameSite=Lax`.
- A missing `Origin`, `Origin: null`, or mismatched Origin on a state-changing authenticated request is rejected with `403` and no mutation. Read-only `GET` requests do not require this Origin check.
- CORS must use an explicit client origin and `credentials: true`; wildcard origin is not allowed with credentialed requests.
- GET endpoints must not perform state changes.

### 8.4 Safe Authentication Errors

- Invalid email and invalid password share the same `401` response message.
- Missing/expired session returns `401`.
- Authenticated user with insufficient role returns `403`.
- `mustChangePassword=true` attempting normal protected endpoints returns `403` with an explicit safe code such as `PASSWORD_CHANGE_REQUIRED` so the client can route to Change Password.

## 9. Data Changes and Migration Strategy

The Lab 2 database is evolved in place. Existing Ticket and Attachment rows are not discarded.

### 9.1 New / Evolved Models

#### User

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | Every existing `DevelopmentRequester.id` is preserved exactly as the corresponding migrated `User.id`; new Staff/Admin ids are allocated above the migrated maximum. |
| `name` | String | Required, trimmed, 1–100 chars. |
| `email` | String unique | Normalized lowercase. |
| `passwordHash` | String | Never plaintext. |
| `role` | enum | `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`. |
| `isActive` | Boolean | Default true. |
| `mustChangePassword` | Boolean | True for seeded/admin-reset initial passwords. |
| `createdAt` | DateTime | Preserved/backfilled where possible. |
| `updatedAt` | DateTime | `@updatedAt`. |

Recommended indexes: unique `email`; index `(role, isActive)` for staff/admin candidate lookups.

#### AuthSession

| Field | Type | Notes |
|---|---|---|
| `id` | Int/UUID PK | Internal identifier. |
| `tokenHash` | String unique | SHA-256 of cookie token. |
| `userId` | FK → User | Session owner. |
| `expiresAt` | DateTime | Required. |
| `createdAt` | DateTime | Server time. |

Indexes: `tokenHash` unique; `userId`; `expiresAt`.

#### Ticket — Lab 3 additions/evolution

- `requesterId` FK changes from `DevelopmentRequester` to `User` with role expectation `REQUESTER` for new tickets.
- `ownerId Int?` FK → `User` (active `IT_STAFF`/`ADMINISTRATOR`).
- `itPriority` nullable enum/string (`Low`, `Medium`, `High`) for historical compatibility; new tickets initialize from Requested Priority.
- `status` constrained to the Lab 3 status set.
- `problemAppearsResolvedAt DateTime?`.
- `updatedAt DateTime @updatedAt`.
- Existing `requestedPriority`, category/system, summary/description, attachments remain.

Recommended indexes: `requesterId`, `ownerId`, `status`, `itPriority`, `createdAt`, `updatedAt`, plus existing category/system indexes.

#### PublicComment

`id`, `ticketId`, `authorId`, `content`, `createdAt`; indexes `(ticketId, createdAt)` and `authorId`.

#### InternalNote

`id`, `ticketId`, `authorId`, `content`, `createdAt`; indexes `(ticketId, createdAt)` and `authorId`.

### 9.2 Migration Steps

1. Add User/role/password/session and operational Ticket/comment/note structures in a migration-safe form.
2. Copy/evolve each Lab 2 `DevelopmentRequester` into a `User` with role `REQUESTER` while preserving the numeric id exactly (`User.id = DevelopmentRequester.id`). After explicit-id inserts, advance the User id sequence/identity to at least the migrated maximum before creating new Staff/Admin users. Lab 3 does not use an alternate old→new requester-id mapping strategy.
3. Assign documented local initial passwords as hashes and set `mustChangePassword=true` for migrated Requesters.
4. Repoint each existing Ticket requester FK to the corresponding User; verify counts and ownership before removing the obsolete relation/model.
5. Preserve existing Ticket Number, Summary, Description, Requested Priority, status, Category, Related System, timestamps, and Attachment rows.
6. Add `ownerId = null` for migrated Tickets unless seed/demo data intentionally assigns an owner later.
7. Set `itPriority = requestedPriority` when historical `requestedPriority` is non-null; otherwise leave null.
8. Add `updatedAt` with safe backfill from `createdAt` for historical Tickets.
9. Remove/retire Development Requester API/client state only after migration verification succeeds.
10. Run migration on a disposable/clean Lab 2-shaped test database and verify Ticket/Attachment counts and ownership before using it on the normal development database.

### 9.3 Migration Invariants

- Ticket count before migration = Ticket count after migration.
- Attachment count before migration = Attachment count after migration.
- Every pre-Lab-3 Ticket remains linked to the same logical Requester email/name.
- Every migrated Requester keeps the same numeric id, so each pre-Lab-3 `Ticket.requesterId` continues to identify the same person after its FK is repointed to `User`.
- Existing removed attachments keep `removedAt` and `removalReason`.
- No plaintext password is introduced during migration/seed.

## 10. Seed Decisions

Seed behavior must be idempotent and safe to run repeatedly.

Idempotency means more than avoiding duplicate rows. Seed records use stable identifiers/natural keys and create missing demo data, but a rerun must not overwrite mutable application state that may have changed after the first seed. In particular, a rerun must not reset an existing seeded user's password hash, role, or activation state, and must not reset an existing Ticket's status, owner, or IT Priority merely to restore the original demo values.

Minimum local-development accounts:

- 4 active Requesters and 1 inactive Requester.
- 3 active IT Staff and 1 inactive IT Staff.
- At least 1 active Administrator; seed two active Administrators where practical so last-admin safety tests can be deterministic without mutating the only bootstrap account.

Seed must also create or preserve:

- Existing Lab 2 categories and related systems.
- Realistic tickets distributed across Requesters, statuses, Requested Priorities, IT Priorities, and assigned/unassigned ownership.
- Example Public Comments and Internal Notes using non-sensitive fictional content.
- Local-only documented initial credentials. Credentials must not be real personal passwords or production secrets.

## 11. UI Specification Summary

Full screen/state details are defined in [`ui-spec.md`](./ui-spec.md).

Major Lab 3 screens:

- **S1 Login** — email/password, validation, busy, invalid credential, inactive/safe failure.
- **S2 Mandatory Change Password** — current/initial password, new password, confirmation, password-rule guidance, validation, success continuation.
- **S3 Authenticated Requester My Tickets / Create / Detail** — Lab 2 behavior preserved, Development Requester controls removed, current authenticated user shown.
- **S4 Requester Ticket Detail Extensions** — Public Comments + Problem Appears Resolved.
- **S5 IT Staff Ticket Queue** — operational queue, search/filter/sort/pagination, badges, owner context.
- **S6 IT Staff Ticket Detail** — owner, IT Priority, status transitions, comments/notes, attachments.
- **S7 Administrator User Management** — list/search/filter/create/edit/activate/deactivate/set initial password.

Common states: loading, saving/busy, validation, success, empty, no-results, forbidden, not-found, conflict, and safe API failure where meaningful.

## 12. API Contract Summary

The detailed REST contract is in [`api-spec.md`](./api-spec.md).

Required capability groups:

- `/api/v1/auth/*` — login, logout, current user, password change.
- Requester Ticket/Attachment APIs — existing Lab 2 routes continue but derive identity from session rather than `X-Dev-Requester-Id`.
- Public Comment / Requester-resolution-indication APIs.
- `/api/v1/staff/*` — queue, operational detail, ownership, IT Priority, status.
- Internal Note APIs restricted to IT Staff/Administrator.
- `/api/v1/admin/users*` — list/search/filter/create/edit/activation/new-initial-password.

Error categories are deliberately distinct: `400` invalid input, `401` unauthenticated, `403` authenticated but forbidden/password-change-required, `404` missing or intentionally hidden protected resource, `409` business-state conflict, `429` login rate limit, `500` unexpected failure, and `502` existing attachment-storage upstream failure where applicable.

## 13. Acceptance Criteria

| ID | Observable criterion |
|---|---|
| AC-01 | Active user + valid credentials creates authenticated access and returns safe current-user data. |
| AC-02 | Invalid credentials do not reveal whether the email exists; repeated failed attempts reach the documented rate limit. |
| AC-03 | Inactive account cannot enter the application. |
| AC-04 | Initial-password user cannot access normal application screens/APIs until a valid password change succeeds. |
| AC-05 | Logout invalidates the session and protected direct access afterward returns/behaves unauthenticated. |
| AC-06 | Role-specific navigation shows only permitted destinations while backend direct authorization independently rejects forbidden operations. |
| AC-07 | Client-supplied requester identity cannot override authenticated Requester ownership. |
| AC-08 | All Lab 2 Requester create/list/detail/search/filter/sort/pagination behaviors work with authenticated identity. |
| AC-09 | Lab 2 attachment upload/download/soft-removal/removal-reason and ownership protections still work after migration. |
| AC-10 | Requester can post/read Public Comments on own Ticket; another Requester cannot read them. |
| AC-11 | Requester can mark Problem Appears Resolved only in `New`, `Open`, `In Progress`, `Waiting for Requester`, or `Reopened`; the action never changes formal Ticket status, terminal-state attempts are rejected, and a later formal transition to `Reopened` clears any stale indication. |
| AC-12 | IT Staff Queue supports documented search/filters/sort/pagination and returns consistent metadata. |
| AC-13 | Queue distinguishes assigned/unassigned Tickets and shows Requested Priority, IT Priority, Status, and Owner consistently. |
| AC-14 | IT Staff/Administrator can claim/assign/reassign only to an active permitted owner. |
| AC-15 | Requested Priority remains unchanged when staff modifies IT Priority. |
| AC-16 | Every permitted status transition succeeds; every unapproved transition is rejected without mutation. |
| AC-17 | Public Comments are visible to permitted Requester/IT Staff/Admin users and record backend author/time. |
| AC-18 | Internal Notes are visible only to IT Staff/Admin; Requester direct access is forbidden with no note content leakage. |
| AC-19 | Empty/whitespace or over-limit comment/note content is rejected; valid content renders safely as text. |
| AC-20 | Operational Ticket Detail preserves Attachment continuity: IT Staff/Administrator can view metadata and download active attachments, but cannot upload or soft-remove them; Requester-resolution indication follows the reopen-clearing rule. |
| AC-21 | Administrator list shows Name, Email, Role, Status, Edit and supports name/email search plus optional role filter. |
| AC-22 | Administrator can create a user with exactly one valid role and initial password; duplicate email/invalid input is rejected. |
| AC-23 | Administrator can edit name/email/role/activation and set a new initial password that forces next-login password change. |
| AC-24 | Administrator cannot deactivate self. |
| AC-25 | System rejects any operation that would leave zero active Administrators. |
| AC-26 | Requester and IT Staff cannot access Admin User Management APIs/screens. |
| AC-27 | Lab 2 → Lab 3 migration preserves existing Ticket/Attachment counts and logical Requester ownership. |
| AC-28 | Lab 3 seed is idempotent: reruns do not create duplicates, still satisfy required account/demo-data availability, and do not reset mutable password/role/activation/Ticket workflow state that was changed after the first seed. |
| AC-29 | Major Lab 3 screens provide meaningful loading/validation/success/empty/no-results/forbidden/failure feedback. |
| AC-30 | Major Lab 3 screens are usable at desktop, tablet, and mobile sizes with no page-level horizontal overflow and accessible labels/focus behavior. |
| AC-31 | If an active IT Staff/Administrator owns one or more Tickets, Administrator User Management rejects deactivation or demotion to `REQUESTER` with `409 ASSIGNED_TICKETS_REQUIRE_REASSIGNMENT` until those Tickets are reassigned. |

Every AC must map to at least one planned test in `tests.md` before implementation PRs are completed.

## 14. Product Definition of Done

Sprint 3 is product-complete only when all applicable items below are true:

- [ ] `specification.md`, `tests.md`, `ui-spec.md`, and `api-spec.md` agree on roles, business rules, statuses, API behavior, UI states, and migration decisions for the Issue 1 contract; mark complete only after the contract review is approved.
- [x] Every AC has at least one planned test/evidence mapping in `tests.md`.
- [x] Lab 2 baseline is recorded with a clean isolated DB verification: server **49/49**, client **25/25**, builds and Prisma validation pass; earlier environment-only failures are distinguished from code regressions.
- [ ] Lab 2 data migration is verified on a disposable Lab 2-shaped database without losing Tickets or Attachments.
- [ ] Authentication/password/session implementation follows this contract and no plaintext password/secrets are committed.
- [ ] Server-side authorization covers every protected endpoint; hidden UI is never the only control.
- [ ] Development Requester selector/header identity is removed from the Lab 3 user flow.
- [ ] Requester Lab 2 regression suite passes with authenticated identity.
- [ ] IT Staff Queue and Ticket Detail operational workflows satisfy their ACs.
- [ ] Public Comments and Internal Notes satisfy visibility, author/time, append-only, validation, and safe-rendering rules.
- [ ] Administrator User Management satisfies list/search/create/edit/role/activation/initial-password and safety rules.
- [ ] Server unit/API/integration/authorization/migration tests pass from the integrated Lab 3 branch.
- [ ] Client UI tests pass.
- [ ] Lab 3 Playwright E2E flows for authentication, staff workflow, and user administration pass on a controlled test database.
- [ ] Server build, Client production build, Prisma validation/migrations, and hosted CI pass.
- [ ] Desktop/tablet/mobile visual checklist passes without clipping, overlap, or page-level horizontal overflow.
- [ ] `reviewer.md` contains actual PR/reviewer/comment/response/approval evidence, not predicted history.
- [ ] `ai-use.md` contains the model used, 6–10 real selected prompts, and a truthful reflection.
- [ ] Issues #33–#40 are in the expected Project workflow state and implementation Issues are peer-reviewed before integration.
- [ ] Final `lab3-staging` regression is green before the release PR.
- [ ] Release PR `lab3-staging → main` is approved/merged only after explicit student authorization.
- [ ] Final submission evidence is taken from final `main` and organized as Answer Part 1–9.

## 15. Assumptions and Decisions

| ID | Decision | Rationale |
|---|---|---|
| D-01 | Opaque DB-backed session in an HttpOnly cookie. | Supports logout invalidation and avoids storing authentication tokens in client JavaScript. |
| D-02 | `bcrypt` cost 12; passwords require at least 10 characters, at least one letter and digit, and at most 72 UTF-8 bytes. | Keeps the policy compatible with bcrypt's 72-byte input limit, including multibyte Thai/emoji input. |
| D-03 | Login rate limit 5 failures / 15 minutes per normalized email. | Satisfies the required login-attempt rule without implementing advanced account locking. |
| D-04 | Admin is explicitly permitted by the authorization matrix to operational Ticket APIs, but User Management remains its primary UI responsibility. | Makes Lab wording about Admin visibility/owner/IT Priority explicit rather than relying on accidental privilege. |
| D-05 | Comments/notes max 2,000 chars and render as plain text. | Prevents unbounded content and avoids raw-HTML injection complexity. |
| D-06 | Requester resolution indication is a timestamp separate from Ticket status and is cleared on any transition to `Reopened`. | Preserves stakeholder rule that Requester may indicate resolution but IT Staff formally resolves/closes, while avoiding stale resolved indications after reopening. |
| D-07 | Historical null Requested Priority / IT Priority stays `Not recorded` rather than being invented during migration. | Preserves historical data meaning. |
| D-08 | User list pagination is not required in Lab 3. | Handout explicitly excludes mandatory Admin pagination. |
| D-09 | Queue default order is most recently updated first, tie-break by id descending. | Operational queues prioritize recent activity and remain deterministic. |
| D-10 | Issue 1 documents planned contracts; final statuses/evidence are updated only from actual implementation/test/review results. | Prevents documentation from claiming work before it exists. |
| D-11 | Lab 2 Requester ids are preserved exactly during `DevelopmentRequester → User` migration. | Removes migration ambiguity, keeps existing `Ticket.requesterId` values stable, and makes ownership verification deterministic. |
| D-12 | `Problem Appears Resolved` is allowed only in non-terminal workflow states: `New`, `Open`, `In Progress`, `Waiting for Requester`, and `Reopened`. | Prevents a Requester from adding a redundant/confusing resolution indication after staff has already formally resolved, closed, or cancelled the Ticket. |
