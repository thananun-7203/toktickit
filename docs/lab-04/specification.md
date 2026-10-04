# TokTickIT Lab 4 — Sprint 4 Engineering Specification

| | |
|---|---|
| **Project** | TokTickIT |
| **Lab** | Lab 4 — Actions Taken, Dashboards, and Final Regression |
| **Issue** | #50 — Sprint 4 Engineering Contract & Test Plan |
| **Integration branch** | `lab4-staging` |
| **Feature branch** | `feature/1-sprint4-engineering-contract` |
| **Author** | Thananun Krungtui (67070507203) |
| **Status** | Initial engineering contract draft — before Lab 4 implementation |

> This contract extends the released Lab 3 baseline at commit `6c9c2f7`. It intentionally records planned behavior before implementation. Actual test/review/release evidence must be synchronized later in `tests.md`, `reviewer.md`, and final evidence; this file must not claim unperformed work.

## 1. Sprint Goal

Sprint 4 completes TokTickIT's core service-desk workflow by adding structured Actions Taken under each Ticket, finalizing the Ticket lifecycle and resolution gate, adding concise role-appropriate dashboards, and hardening the complete Labs 1–3 application. The increment is complete only when new work records, dashboards, workflow rules, authorization, migration, regression, responsive/accessibility behavior, and release evidence agree with this contract while all approved earlier functionality remains intact.

## 2. Stakeholder Request Interpretation

TokTickIT already receives Tickets and supports authenticated Requester, IT Staff, and Administrator workflows. Sprint 4 adds a structured record of the actual work performed on a Ticket without replacing the Ticket Owner's coordinating responsibility. An Action Taken may be assigned to an eligible support user who can be different from the Ticket Owner; only the Action's current assignee may complete it, and the backend records that authenticated assignee as `Performed by` rather than trusting client-supplied identity.

Requesters continue to see only their own Tickets and may view all Actions Taken on those Tickets, but they cannot create, edit, assign, complete, or cancel Actions Taken. Their `Problem Appears Resolved` indication remains advisory. IT Staff/Administrators formally control workflow status and may resolve a Ticket only when the work-record gate defined below is satisfied.

Dashboards are concise summaries, not replacement list screens. Requester metrics are ownership-scoped; Staff metrics come from authoritative backend queries and link into existing detailed Ticket views where practical. The released Zen Green application shell, security model, earlier Ticket behavior, comments, notes, attachments, authentication, and Administrator user-management behavior remain the regression baseline.

## 3. Scope

### 3.1 In Scope

- A one-to-many `Ticket -> ActionTaken` work-record model with migration-safe Prisma/PostgreSQL evolution.
- Action Taken fields and lifecycle covering Action Date/Time, Action Description, Result, Performed by (automatic), Follow-Up Required, conditional Follow-up Note, Attachment Notes, approved assignee, status, creator audit identity, timestamps, and stale-update version.
- Staff/Admin create, read, edit/reassign, status-transition, complete, and cancel behavior for Actions Taken on accessible Tickets.
- Requester read-only visibility of all Actions Taken on owned Tickets.
- Inactive/ineligible Action assignee rejection and backend role enforcement for every write.
- Final eight-status Ticket transition matrix and backend-enforced resolution gate.
- Concurrency-safe Ticket status changes and Action Taken optimistic/stale-update handling.
- Requester Dashboard with exact ownership-safe counts/lists and drill-down rules.
- IT Staff Dashboard with exact operational counts/lists, current-user Actions Taken, and drill-down rules. Administrator may reuse this Dashboard.
- Idempotent Lab 4 seed data covering major Ticket states, assigned/unassigned ownership, zero/one/multiple Actions Taken, and zero/non-zero dashboard cases.
- Unit, API/integration, UI component, authorization, workflow, migration/regression, performance-smoke, responsive/accessibility, and E2E coverage.
- Final regression of all approved Labs 1–3 authentication, Requester, IT Staff, Administrator, Public Comment, Internal Note, Attachment, ownership, and role-navigation behavior.
- Zen Green UI extensions for dashboards and Actions Taken using the existing shell and responsive targets.
- Final release/evidence readiness, README synchronization, and staged `feature -> lab4-staging -> main` workflow.

### 3.2 Explicitly Out of Scope

- Automatic SLA clocks, escalation engines, on-call scheduling, or breach notifications.
- Email, SMS, LINE, push, or other external notification services.
- Inventory consumption, spare parts, purchasing, or service cost accounting.
- Time-sheet billing, payroll, or detailed labor-cost calculation.
- Multi-level approval workflows or electronic signatures.
- Advanced BI/report builders, data warehouses, or exports for analytics.
- Multi-tenant organizations or production-scale cloud operations.
- A new Ticket history/audit-history product screen beyond the structured Actions Taken required here.
- Deleting Actions Taken records. Cancellation is a lifecycle state; rows remain preserved.
- Requester modification of Actions Taken.
- Any other product feature not explicitly approved by this Sprint 4 contract.

## 4. Roles and Authorization Matrix

Backend authorization is authoritative. Hiding a control in React is never sufficient authorization.

Legend: **Y** = permitted, **Own** = owned/submitted Ticket only, **N** = forbidden.

| Operation | Requester | IT Staff | Administrator |
|---|---:|---:|---:|
| Read own dashboard | Y | N | N |
| Read Staff dashboard | N | Y | Y |
| Read Actions Taken | Own | Any Ticket | Any Ticket |
| Create Action Taken | N | Y | Y |
| Edit/reassign active Action Taken | N | Y | Y |
| Transition/complete/cancel Action Taken | N | Y | Y |
| Create Action on `Resolved` / `Closed` / `Cancelled` Ticket | N | N | N |
| Formal Ticket status transition | N | Y | Y |
| Indicate `Problem Appears Resolved` | Own | N | N |
| Existing Public Comment behavior | Own | Any Ticket | Any Ticket |
| Existing Internal Note behavior | N | Y | Y |
| Existing Requester attachment upload/remove | Own | N | N |
| Existing active attachment download | Own | Any Ticket | Any Ticket |
| Existing Administrator User Management | N | N | Y |

## 5. Functional Requirements

### 5.1 Actions Taken

| ID | Requirement |
|---|---|
| FR-01 | A Ticket can contain zero, one, or many Actions Taken records. |
| FR-02 | IT Staff/Administrator can retrieve Actions Taken for an accessible Ticket; an owning Requester can retrieve the same Requester-visible Action information for their own Ticket. |
| FR-03 | IT Staff/Administrator can create an Action Taken on a non-terminal Ticket using valid Action Date/Time, Description, approved assignee, follow-up fields, and Attachment Notes. |
| FR-04 | Action Taken creation records the authenticated creator on the backend; the client cannot choose or spoof the creator. |
| FR-05 | IT Staff/Administrator can edit/reassign an Action while it is `Planned` or `In Progress`, subject to validation and stale-version checks. |
| FR-06 | IT Staff/Administrator can perform only the approved Action status transitions: `Planned -> In Progress/Completed/Cancelled` and `In Progress -> Completed/Cancelled`; only the Action's current assignee may perform the `Completed` transition. |
| FR-07 | Completing an Action automatically records the authenticated current assignee as `Performed by` and records a server `completedAt`; the client cannot submit/override performer identity. |
| FR-08 | Completing an Action requires a non-blank Result and all conditional follow-up validation to pass. |
| FR-09 | Cancelled/Completed Actions remain readable and cannot be deleted or returned to an active status. |
| FR-10 | Requesters can view all Actions Taken for owned Tickets but cannot create, edit, assign, transition, complete, or cancel them. |
| FR-11 | Actions Taken lists use a deterministic ordering and expose clear loading, empty, forbidden, validation, conflict, not-found, and safe-failure states. |
| FR-12 | Successful Action create/edit/status changes refresh the associated Ticket's operational `updatedAt` and increment its workflow concurrency `version` in the same transaction. |

### 5.2 Final Ticket Workflow

| ID | Requirement |
|---|---|
| FR-13 | The supported Ticket statuses remain `New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, and `Cancelled`. |
| FR-14 | IT Staff/Administrator can perform only transitions in the final matrix in Section 7; Requester cannot call the formal status-transition API. |
| FR-15 | The backend enforces the resolution gate in BR-24–BR-26 even when the normal UI is bypassed. |
| FR-16 | A Requester `Problem Appears Resolved` indication never changes formal Ticket status. |
| FR-17 | Transition to `Reopened` clears `problemAppearsResolvedAt`/`resolvedAt`, increments `workflowCycle`, and permits new current-cycle Actions Taken again while preserving historical Actions. |
| FR-18 | Workflow-affecting Ticket mutations use a parent Ticket `version`; stale requests fail safely instead of silently overwriting newer owner/priority/status/Action state. |

### 5.3 Requester Dashboard

| ID | Requirement |
|---|---|
| FR-19 | An authenticated Requester can load a dashboard containing only data derived from their own Tickets. |
| FR-20 | The Requester Dashboard shows `Open Tickets`, `Waiting for You`, `Recently Updated`, and `Recently Resolved` according to BR-31–BR-34. |
| FR-21 | Dashboard actionable cards/items drill down to My Tickets or owned Ticket Detail without exposing another Requester's data. |
| FR-22 | Requester Dashboard supports loading, zero/empty, forbidden, and safe-failure feedback and does not duplicate the full My Tickets list. |

### 5.4 IT Staff Dashboard

| ID | Requirement |
|---|---|
| FR-23 | IT Staff/Administrator can load the operational Staff Dashboard from authoritative backend calculations. |
| FR-24 | Staff Dashboard shows `Unassigned Active Tickets`, `My Active Tickets`, counts by Ticket Status, active counts by IT Priority, current-user active Actions Taken, a separate `Recently Updated` list, and a separate `Urgent Tickets` list according to BR-35–BR-41. |
| FR-25 | Dashboard cards/items drill down to Ticket Queue, filtered Queue state, or Ticket Detail where practical. |
| FR-26 | Staff Dashboard returns concise summaries rather than complete Ticket collections and exposes safe loading/empty/forbidden/failure states. |

### 5.5 Final Hardening and Regression

| ID | Requirement |
|---|---|
| FR-27 | All approved Labs 1–3 screens and role workflows remain available to permitted users after Lab 4 migration/integration. |
| FR-28 | Authentication, password/session behavior, ownership isolation, comments, notes, attachments, queue/detail, Administrator user management, and role navigation preserve their approved behavior. |
| FR-29 | Important Lab 4 forms prevent duplicate submission and preserve entered data after recoverable validation/business/API failures where safe. |
| FR-30 | Major Lab 4 screens remain usable at 1280 px, ~820 px, and ~390 px with visible focus, keyboard operation, semantic labels, non-color cues, and no page-level horizontal overflow. |
| FR-31 | Final CI/regression covers the integrated `lab4-staging` release candidate and does not use the development database as a test target. |
| FR-32 | README setup, migration, seed, test, E2E, and demonstration instructions are synchronized before release. |

## 6. Actions Taken Business Rules

### 6.1 Identity, Assignment, and Visibility

| ID | Rule |
|---|---|
| BR-01 | Every Action Taken belongs to exactly one Ticket. |
| BR-02 | A Ticket has at most one primary Ticket Owner, but an Action Taken may be assigned to a different eligible support user. `Performed by` means the current Action assignee who actually completes the Action, not merely any Staff user who clicks a button. |
| BR-03 | `createdById` is always the authenticated IT Staff/Administrator who creates the Action and is never accepted from client input. |
| BR-04 | `assigneeId` is required and must reference an active `IT_STAFF` or `ADMINISTRATOR` at the moment of create/reassign. Requester or inactive assignees are rejected with no mutation. |
| BR-05 | `performedById` is null until completion. Only the current `assigneeId` user may complete the Action; the backend requires `authenticatedUser.id == assigneeId`, sets `performedById` to that same id, and records `completedAt` in the same mutation. Clients cannot set or override either field. |
| BR-06 | Requester may read all Requester-visible Action fields only when `ticket.requesterId == authenticatedUser.id`; cross-requester resource access returns `404` where practical. |
| BR-07 | IT Staff/Administrator may read Actions on any Ticket and may write only through backend-authorized Staff endpoints. |

### 6.2 Field and Validation Rules

| ID | Rule |
|---|---|
| BR-08 | `actionDateTime` is the user-entered **business occurrence time** for when the work happened; `createdAt`/`updatedAt` are server audit times. It is required, stored as UTC, displayed in browser locale, may be backdated, and may be edited only while active. To tolerate clock skew it must not be later than server-now + 5 minutes. Equivalent ISO offsets normalize to the same UTC instant. |
| BR-09 | `description` is required after trim, maximum 2,000 Unicode code points, and renders as plain text. The 2,000 limit is a project decision, not a handout-fixed value. |
| BR-10 | `result` is optional while `Planned`/`In Progress`, but is required after trim and maximum 2,000 Unicode code points when transitioning to `Completed`. The exact limit is a project decision. |
| BR-11 | `followUpRequired` is a required Boolean. When true, `followUpNote` is required after trim; when false, the persisted `followUpNote` is normalized to null. Follow-up Note maximum is 2,000 Unicode code points as a project decision. |
| BR-12 | `attachmentNotes` is optional plain text, trimmed when provided, maximum 2,000 Unicode code points as a project decision, and describes which existing Ticket attachment/file is relevant; it does not upload or create a new Attachment. |
| BR-13 | User-entered Action text renders as plain text; raw HTML is not rendered. |

### 6.3 Action Lifecycle and Mutability

Action status values are `Planned`, `In Progress`, `Completed`, and `Cancelled`.

| Current | Allowed next status |
|---|---|
| `Planned` | `In Progress`, `Completed`, `Cancelled` |
| `In Progress` | `Completed`, `Cancelled` |
| `Completed` | none |
| `Cancelled` | none |

| ID | Rule |
|---|---|
| BR-14 | New Actions are created as `Planned`; clients do not choose another initial status. |
| BR-15 | No Action self-transition is allowed. Unsupported known transitions return `409` with no mutation; unknown status input returns `400`. |
| BR-16 | Description/date/assignee/follow-up/attachment-note edits are allowed only while status is `Planned` or `In Progress`. |
| BR-17 | `Completed` and `Cancelled` are terminal immutable Action states. Completion records `performedById` + `completedAt`; cancellation records authenticated `cancelledById` + server `cancelledAt`. The row is retained for work traceability and is never deleted through a Lab 4 API. |
| BR-18 | An Action cannot be created on a Ticket currently `Resolved`, `Closed`, or `Cancelled`; the Ticket must be reopened before new active work is recorded. |
| BR-19 | Deterministic Action list ordering is `actionDateTime DESC`, then `id DESC`. |
| BR-20 | Action create/edit/status mutation also touches parent Ticket `updatedAt` and increments parent Ticket `version` in the same transaction so recent-work and stale aggregate behavior are consistent. |

### 6.4 Action Concurrency and Duplicate Safety

| ID | Rule |
|---|---|
| BR-21 | Every Action Taken row stores integer `version` starting at 1. Update/status requests include `expectedVersion`; the server updates only when the stored version matches and increments it atomically. |
| BR-22 | A version mismatch returns `409 STALE_ACTION_TAKEN` with no silent overwrite; the client preserves safe draft values and offers refresh/retry guidance. |
| BR-23 | Action create requires client-generated UUID `clientRequestId`, unique per Ticket. The first valid request creates the row; an exact retry from the same creator with the same Ticket/key and equivalent normalized logical create payload returns the existing Action instead of creating another row. The idempotency lookup occurs before enforcing a now-stale parent `expectedTicketVersion` because the first successful create increments that version. Reuse of the same key by a different creator or with materially different create payload returns `409 IDEMPOTENCY_KEY_REUSE`. UI busy states remain a UX guard but are not the backend idempotency mechanism. |

## 7. Ticket Status and Resolution Rules

Only `IT_STAFF` and `ADMINISTRATOR` may execute formal Ticket transitions.

| Current | Allowed next status | UI confirmation |
|---|---|---|
| `New` | `Open`, `Cancelled` | Cancel requires confirmation. |
| `Open` | `In Progress`, `Waiting for Requester`, `Resolved`, `Cancelled` | Resolve/Cancel requires confirmation. |
| `In Progress` | `Waiting for Requester`, `Resolved`, `Cancelled` | Resolve/Cancel requires confirmation. |
| `Waiting for Requester` | `In Progress`, `Resolved`, `Cancelled` | Resolve/Cancel requires confirmation. |
| `Resolved` | `Closed`, `Reopened` | Close/Reopen requires confirmation. |
| `Closed` | `Reopened` | Reopen requires confirmation. |
| `Reopened` | `In Progress`, `Waiting for Requester`, `Resolved`, `Cancelled` | Resolve/Cancel requires confirmation. |
| `Cancelled` | `Reopened` | Reopen requires confirmation. |

| ID | Rule |
|---|---|
| BR-24 | Formal transition to `Resolved` requires at least one current-cycle `Completed` Action Taken whose `workflowCycle` equals the Ticket's current `workflowCycle` and whose `Result` is non-blank after trim. Completed work from a prior cycle cannot satisfy a later Reopen->Resolve cycle. |
| BR-25 | Formal transition to `Resolved` is rejected while any current-cycle Action remains `Planned` or `In Progress`. `followUpRequired`/`followUpNote` remain Action data validated at Action create/complete time; they do not create a separate unresolved workflow state because Completed Actions are terminal and immutable. Historical prior-cycle Actions remain visible but do not participate in the current resolution gate. |
| BR-26 | The resolution gate is evaluated and the Ticket status mutation is committed atomically while the parent Ticket row is locked/revalidated and authoritative current-cycle Actions (`status` and `result`) are re-read in the same transaction; a client cannot bypass it by calling the API directly. Failure returns `409 RESOLUTION_GATE_NOT_MET` with no Ticket status mutation. |
| BR-27 | Existing Tickets already `Resolved` or `Closed` at migration time remain valid even when they have zero Actions Taken; migration does not rewrite historical status. The gate applies to future transitions into `Resolved`. |
| BR-28 | Requester `Problem Appears Resolved` remains advisory and never satisfies BR-24/BR-25 by itself. |
| BR-29 | Any transition to `Reopened` clears `problemAppearsResolvedAt` and `resolvedAt`, increments `workflowCycle` by 1, and increments Ticket `version` atomically. Existing completed/cancelled Actions remain historical prior-cycle records; new Actions copy the new current cycle. |
| BR-30 | Ticket workflow-affecting mutations use integer `version`. Status requests include `expectedVersion`; owner/IT Priority/Action mutations also increment the parent version. Status transition locks/re-reads the parent and authoritative child Actions, then commits only if the expected version/current state still match. A stale/concurrent loser returns `409 STALE_TICKET_STATE`. |

## 8. Dashboard Calculation Rules

### 8.1 Shared Definitions

- **Active Ticket statuses** = `New`, `Open`, `In Progress`, `Waiting for Requester`, `Reopened`.
- **Terminal/non-active for operational counts** = `Resolved`, `Closed`, `Cancelled`.
- Dashboard calculations use PostgreSQL authoritative data, not browser-side counting from a downloaded full list.
- "Recent" means deterministic top-N ordering, not an invented time window. This avoids ambiguous day boundaries and keeps legacy records meaningful. All stored timestamps remain UTC; the client displays them in browser locale.
- Dashboard Ticket summaries contain only fields required for cards/lists and drill-down; they are not full Ticket Detail payloads.

### 8.2 Requester Dashboard

| ID | Metric/list | Exact calculation | Empty behavior | Drill-down |
|---|---|---|---|---|
| BR-31 | `Open Tickets` | Count owned Tickets whose status is in Active Ticket statuses. | `0` | My Tickets with active-status filter where implemented; otherwise My Tickets root. |
| BR-32 | `Waiting for You` | Count owned Tickets with status exactly `Waiting for Requester`. | `0` | My Tickets filtered to `Waiting for Requester`. |
| BR-33 | `Recently Updated` | Top 5 owned Tickets ordered `updatedAt DESC, id DESC`. | Empty list with `No recent Tickets`. | Each item opens owned Ticket Detail. |
| BR-34 | `Recently Resolved` | Top 5 owned Tickets with `resolvedAt IS NOT NULL` and current status `Resolved` or `Closed`, ordered `resolvedAt DESC, id DESC`. `resolvedAt` is the server timestamp of the most recent formal transition into Resolved and is preserved when moving Resolved->Closed; it is cleared on Reopen. Legacy Resolved/Closed rows are not backfilled with an invented timestamp. | Empty list with `No recently resolved Tickets`. | Each item opens owned Ticket Detail. |

### 8.3 IT Staff Dashboard

| ID | Metric/list | Exact calculation | Empty behavior | Drill-down |
|---|---|---|---|---|
| BR-35 | `Unassigned Active Tickets` | Count active Tickets with `ownerId IS NULL`. | `0` | Ticket Queue with `owner=unassigned` plus active-status context. |
| BR-36 | `My Active Tickets` | Count active Tickets with `ownerId = authenticatedUser.id`. | `0` | Ticket Queue with `owner=mine` plus active-status context. |
| BR-37 | `Tickets by Status` | Count all Tickets grouped over the complete eight-status domain; missing groups return zero. | Eight zero values where no Tickets exist. | Queue filtered to selected status. |
| BR-38 | `Active Tickets by IT Priority` | Count active Tickets grouped as `High`, `Medium`, `Low`, and `Not recorded` (`itPriority IS NULL`). | Zero per bucket. | Queue filtered to selected IT Priority. |
| BR-39 | `My Active Actions` | Top 5 Actions where `assigneeId = authenticatedUser.id`, Action status is `Planned`/`In Progress`, parent Ticket is active, and `Action.workflowCycle = Ticket.workflowCycle`, ordered `Action.updatedAt DESC, id DESC`. Prior-cycle/terminal-Ticket work remains visible on Ticket Detail but is not presented as current active work. | Empty list with `No active Actions assigned to you`. | Parent Ticket Detail / Actions Taken section. |
| BR-40 | `Recently Updated` | Top 5 active Tickets ordered `updatedAt DESC, id DESC`. | Empty list with `No recently updated Tickets`. | Ticket Detail. |
| BR-41 | `Urgent Tickets` | Top 5 active Tickets with `itPriority = High`, ordered `updatedAt DESC, id DESC`. | Empty list with `No urgent Tickets`. | Ticket Detail / Queue filtered to High IT Priority. |

Administrator uses the same operational calculations under its documented Staff-equivalent Ticket permission. Optional Administrator-only user-account counts are deliberately not included in the Sprint 4 minimum to keep the dashboard concise; existing User Management remains the detailed source of truth.

### 8.4 Active Action Assignee Invariant

| ID | Rule |
|---|---|
| BR-42 | Administrator User Management cannot deactivate an `IT_STAFF`/`ADMINISTRATOR` or change that user to `REQUESTER` while the user is assigned one or more `Planned`/`In Progress` Actions Taken. The operation returns `409 ACTIVE_ACTIONS_REQUIRE_REASSIGNMENT`; terminal historical Actions do not block account changes. |
| BR-43 | Action create/reassign and Administrator deactivate/demote operations must preserve BR-04/BR-42 atomically through deterministic locking/serialization and revalidation. A race must never commit an active Action assigned to an inactive user or Requester. |

### 8.5 Ticket Aggregate Version Protocol

| ID | Rule |
|---|---|
| BR-44 | `Ticket.version` is an integer concurrency token starting at 1. Workflow-affecting writes — owner claim/assign/reassign, IT Priority, formal status, Requester resolution indication, and every Action create/edit/status mutation — increment it atomically. Public Comments/Internal Notes/attachment reads do not affect it. |
| BR-45 | Staff Ticket Detail returns Ticket `version`. Workflow-affecting Staff mutations include `expectedVersion`; stale requests return `409 STALE_TICKET_STATE` before silently overwriting newer aggregate state. |
| BR-46 | Parent-row lock/revalidation plus current-cycle child re-read is mandatory for Resolve and Action create/status operations that affect the resolution aggregate. Child state must not be evaluated from an earlier client snapshot. |

## 9. UI Specification Summary

Full screen/state details are maintained in [`ui-spec.md`](./ui-spec.md).

Major Lab 4 additions:

- **Requester Dashboard** — ownership-safe metric cards, recent/attention lists, direct Ticket drill-down, zero/empty/error states.
- **IT Staff Dashboard** — operational cards, current-user active Actions, separate Recently Updated and Urgent Ticket lists, Queue/Ticket drill-down.
- **Actions Taken on Ticket Detail** — deterministic list, create mode, active view/edit/reassign mode, lifecycle actions, terminal read-only mode, Requester read-only view.
- **Final Ticket Workflow** — only allowed next statuses offered in UI; resolution-gate guidance; backend remains authoritative.
- **Final shell/navigation** — Dashboard becomes a role-appropriate primary destination while existing My Tickets/Create Ticket, Ticket Queue, User Management, Change Password, and Logout remain reachable for their roles.

Shared UI states remain loading, busy, success, validation, empty/no-results, forbidden, not-found, business conflict, and safe API failure. Existing Zen Green tokens/components are reused. Responsive evidence targets remain desktop 1280 px, tablet ~820 px, and mobile ~390 px with no page-level horizontal overflow and visible keyboard focus.

## 10. Data Changes (Prisma/PostgreSQL)

Lab 4 evolves the Lab 3 database in place. Existing `User`, `AuthSession`, `Ticket`, `Attachment`, `PublicComment`, and `InternalNote` rows are not discarded or reconstructed.

### 10.1 New Enum

`ActionTakenStatus`:

- `PLANNED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

API/UI labels use `Planned`, `In Progress`, `Completed`, and `Cancelled`.

### 10.2 New `ActionTaken` Model

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | Autoincrement internal id. |
| `ticketId` | FK -> Ticket | Required parent Ticket. |
| `clientRequestId` | UUID/String | Required create-idempotency key; unique with `ticketId`. |
| `workflowCycle` | Int | Snapshot of parent Ticket workflow cycle at Action creation. |
| `actionDateTime` | DateTime | Required Action Date/Time, stored UTC. |
| `description` | String | Required, max 2,000 Unicode code points at application validation. |
| `result` | String? | Required only when completing. |
| `followUpRequired` | Boolean | Required. |
| `followUpNote` | String? | Required iff follow-up is true. |
| `attachmentNotes` | String? | Existing-file guidance only; does not create Attachment rows. |
| `status` | ActionTakenStatus | Default `PLANNED`. |
| `createdById` | FK -> User | Authenticated creator, immutable. |
| `assigneeId` | FK -> User | Active Staff/Admin assignee. |
| `performedById` | FK -> User? | Null until Completed; set to authenticated current assignee. |
| `completedAt` | DateTime? | Server audit timestamp set on completion. |
| `cancelledById` | FK -> User? | Authenticated Staff/Admin who cancels the Action. |
| `cancelledAt` | DateTime? | Server audit timestamp set on cancellation. |
| `version` | Int | Default 1; optimistic/stale-update guard. |
| `createdAt` | DateTime | Server timestamp. |
| `updatedAt` | DateTime | `@updatedAt`. |

User receives named relations for created, assigned, performed, and cancelled Actions; Ticket receives `actionsTaken ActionTaken[]`.

### 10.3 Ticket Fields Added for Sprint 4

| Field | Type | Notes |
|---|---|---|
| `version` | Int | Default 1; parent aggregate stale-update token. |
| `workflowCycle` | Int | Default 1; incremented only on formal Reopen. |
| `resolvedAt` | DateTime? | Server time of most recent transition into Resolved; preserved through Closed, cleared on Reopen. |

Recommended indexes:

- `(ticketId, actionDateTime, id)` — deterministic Ticket Action list.
- unique `(ticketId, clientRequestId)` — idempotent create retry protection.
- `(ticketId, workflowCycle, status)` — resolution-gate current-cycle lookup.
- `(assigneeId, status, updatedAt)` — current-user active Actions dashboard query.
- `(status)` — lifecycle/resolution checks.
- `(performedById)` and `(createdById)` where useful for relation lookup/audit joins.

### 10.4 Database Design Decisions

**D-DB-01 — Actions Taken is a separate child table rather than JSON or Internal Notes.** It has its own lifecycle, assignee, performer, follow-up validation, result, and concurrency semantics. Keeping it relational preserves queryability for the resolution gate and Staff dashboard and keeps private Internal Notes' separate visibility contract intact.

**D-DB-02 — Creator, assignee, performer, and canceller have explicit provenance fields.** Creator records who planned the row, assignee is the current responsible support user, performer is the assignee who completes it, and canceller records who terminated it without completion. Backend-owned audit identities avoid ambiguous client attribution.

**D-DB-03 — Row-level integer version for Actions Taken.** Lab 3 already treats stale workflow changes as conflicts. A simple version field makes Action edit/status conflicts explicit without depending on timestamp precision and prevents silent lost updates.

**D-DB-04 — Ticket parent version plus workflow cycle.** Ticket `version` closes stale aggregate writes even when formal status did not change, while `workflowCycle` prevents historical Completed Actions from satisfying a new resolution attempt after Reopen.

**D-DB-05 — `resolvedAt` is explicit rather than inferred from `updatedAt`.** This makes `Recently Resolved` a real resolution-time metric and preserves it through Closed without inventing historical dates for legacy rows.

**D-DB-06 — per-Ticket `clientRequestId` is persisted for create idempotency.** POST retry safety cannot rely on Action version because no row exists before the first create; a unique create key makes lost-response retry deterministic.

### 10.5 Migration / Legacy Behavior

- Additive migration creates `ActionTakenStatus`, `ActionTaken`, relations, constraints/indexes and adds `Ticket.version`, `Ticket.workflowCycle`, and nullable `Ticket.resolvedAt` without deleting/rebuilding existing Lab 3 models.
- Existing Ticket/User/comment/note/attachment counts and relations must remain unchanged.
- Legacy Tickets receive **zero synthetic Actions Taken**. Historical work is not invented.
- Existing `Resolved`/`Closed` Tickets with zero Actions remain valid (BR-27). `resolvedAt` remains null for those legacy rows because the exact historical resolution time is unknown; Sprint 4 does not backfill an invented time from `updatedAt`.
- Existing Tickets start with `workflowCycle=1` and `version=1`; no synthetic workflow history is created.
- Active legacy Tickets with zero Actions remain usable; a future attempt to transition into `Resolved` must satisfy the new resolution gate by recording/completing work first.
- Migration runs in an atomic PostgreSQL transaction where supported by the existing migration pattern. Recovery evidence must show failure does not leave a partial Action schema or damage Lab 3 data.
- Migration verification uses a disposable Lab 3-shaped database; normal development data is not reset to prove the migration.

### 10.6 Seed Decisions

Lab 4 seed extends the existing create-only/idempotent Lab 3 strategy:

- Preserve existing seeded users/Ticket mutable state on rerun.
- Ensure realistic Ticket coverage across all major statuses/priorities and assigned/unassigned ownership without resetting an already-mutated canonical Ticket.
- Create canonical demo coverage for zero, one, and multiple Actions Taken using stable Ticket/user/content keys and create only when that canonical Action is missing.
- Include `Planned`, `In Progress`, `Completed`, and `Cancelled` Action examples.
- Include at least one Action assigned to a different support user from the Ticket Owner, one Completed Action whose performer equals its assignee, one Cancelled Action with canceller/time provenance, and a Reopened Ticket with historical prior-cycle Actions plus current-cycle work.
- Provide zero and non-zero Requester/Staff dashboard metric cases.
- Seed rerun must not reset Action status, assignee, result, follow-up, performer, or Ticket workflow merely to restore demo defaults.

## 11. API Contract Summary

Detailed shapes and error behavior are maintained in [`api-spec.md`](./api-spec.md).

New capability groups:

- `GET /api/v1/tickets/:id/actions-taken` — Requester own Ticket or permitted Staff/Admin read.
- `POST /api/v1/staff/tickets/:id/actions-taken` — Staff/Admin idempotent create using `clientRequestId`.
- `PATCH /api/v1/staff/actions-taken/:id` — active Action edit/reassign with `expectedVersion`.
- `PATCH /api/v1/staff/actions-taken/:id/status` — lifecycle transition/complete/cancel with `expectedVersion`.
- `GET /api/v1/requester/dashboard` — Requester ownership-safe summary.
- `GET /api/v1/staff/dashboard` — IT Staff/Admin operational summary.
- Existing workflow-affecting Staff Ticket mutations — strengthened with Ticket `expectedVersion`; status adds current-cycle resolution gate and parent-row/child-state revalidation.

Error categories continue the Lab 3 convention: `400` invalid input, `401` unauthenticated, `403` forbidden/password-change-required/origin failure, `404` missing or intentionally hidden protected resource, `409` business/stale conflict, `429` existing Login rate limit, `500` unexpected safe failure, and `502` existing attachment-storage upstream failure where applicable.

All new state-changing endpoints use the existing approved-Origin/session/password-change/role gates. Read-only Dashboard endpoints do not require Origin but do require authenticated role/ownership authorization.

## 12. Acceptance Criteria

| ID | Observable criterion |
|---|---|
| AC-01 | Permitted Staff/Admin creates a valid Action under the correct non-terminal Ticket; backend records authenticated creator and approved active assignee, status starts Planned, and Requester cannot perform the same write. |
| AC-02 | Inactive Staff or Requester assignee is rejected without creating/reassigning the Action. |
| AC-03 | Action follow-up validation requires Follow-up Note exactly when `followUpRequired=true`; invalid text/length input is rejected without partial mutation. |
| AC-04 | Active Action edit/reassign succeeds with matching Action/Ticket versions; stale version returns safe conflict with no lost update. |
| AC-05 | Allowed Action transitions succeed; forbidden/self/terminal transitions are rejected without mutation. |
| AC-06 | Only the current assignee can Complete an Action; completion requires Result, records `performedBy=current assignee` plus `completedAt`, and a concurrent reassign-vs-complete race cannot produce ambiguous performer/assignee state. |
| AC-07 | Cancelling an Action retains the row, records authenticated `cancelledBy` + `cancelledAt`, makes it terminal read-only, and exposes no delete operation. |
| AC-08 | Actions Taken list is stable (`actionDateTime DESC`, id DESC), supports multiple different Actions on one Ticket, and Requester sees all Actions only for owned Tickets. |
| AC-09 | Action create/edit/status mutation touches parent Ticket `updatedAt`/`version`; exact retry of a successful create with the same `clientRequestId` returns the existing Action and never creates a duplicate row. |
| AC-10 | Every permitted final Ticket transition succeeds when its business rules are satisfied; forbidden/self transitions are rejected with no mutation. |
| AC-11 | Transition to Resolved is rejected unless the current `workflowCycle` contains at least one Completed Action with a non-blank Result, no current-cycle Action remains Planned/In Progress, and no current-cycle non-cancelled Action has outstanding follow-up; prior-cycle Completed Actions cannot satisfy the gate after Reopen. |
| AC-12 | Requester `Problem Appears Resolved` remains advisory; transition to Reopened clears advisory/resolution timestamps, increments workflow cycle, and preserves historical prior-cycle Actions. |
| AC-13 | Workflow-affecting Ticket writes use parent `version`; stale owner/priority/Action/status snapshots return safe conflict and Resolve re-reads authoritative current-cycle child state inside the same transaction. |
| AC-14 | Requester Dashboard returns only authenticated Requester data and exact Open/Waiting counts plus deterministic Recently Updated and true `resolvedAt`-ordered Recently Resolved lists; Closed-after-resolve remains eligible until Reopen clears `resolvedAt`. |
| AC-15 | Requester Dashboard zero/empty/error states are clear and drill-down never exposes another Requester's Ticket. |
| AC-16 | Staff Dashboard counts Unassigned/My Active Tickets, all status groups, and active IT Priority groups according to documented queries; selected displayed metrics match direct database query evidence. |
| AC-17 | Staff Dashboard shows current-user active Actions, a separate Recently Updated active-Ticket list, and a separate High-IT-Priority Urgent list with deterministic ordering and working Ticket/Queue drill-down. |
| AC-18 | Requester/Staff cannot call dashboard endpoints for a role they do not possess; Administrator may use the Staff dashboard per the approved matrix. |
| AC-19 | Lab 4 migration preserves all existing Lab 3 Users, Tickets, Attachments, Public Comments, Internal Notes, ownership, and status data; legacy Tickets with zero Actions remain valid. |
| AC-20 | Lab 4 seed is idempotent and demonstrates zero/one/multiple Actions plus zero/non-zero Dashboard metrics without resetting mutable application state on rerun. |
| AC-21 | Approved Labs 1–3 authentication, Requester, Staff, Administrator, Public Comment, Internal Note, Attachment, ownership, and role-navigation regression remains green after Lab 4 integration. |
| AC-22 | Important Lab 4 recoverable failures preserve safe user-entered drafts, report validation/business conflict near the relevant control, and do not produce duplicate writes. |
| AC-23 | Major Lab 4 screens pass desktop/tablet/mobile checks, visible focus/keyboard operation, semantic labels, non-color cues, and no page-level horizontal overflow. |
| AC-24 | Integrated Lab 4 CI executes Server, Client, and E2E gates for `lab4-staging`/Lab 4 PRs using isolated test databases and records truthful release-head evidence. |
| AC-25 | Final docs, README, reviewer evidence, AI-use record, screenshots, tests, and Product Definition of Done match the released implementation rather than predicted results. |
| AC-26 | Administrator deactivation/demotion of a user with active assigned Actions is rejected until those Actions are reassigned/cancelled/completed, and concurrent assignee/account changes never commit an ineligible active Action assignment. |
| AC-27 | `actionDateTime` is treated as editable business occurrence time, normalizes ISO offsets to UTC, allows backdating, rejects values later than server-now + 5 minutes, and remains distinct from server audit timestamps. |
| AC-28 | Lost-response retry of Action create with the same Ticket/`clientRequestId` and equivalent payload is idempotent; conflicting reuse of the key returns `409 IDEMPOTENCY_KEY_REUSE`. |

Every AC maps to at least one planned test in `tests.md` before implementation issues are completed.

## 13. Product Definition of Done

Sprint 4 is product-complete only when all applicable items below are true:

- [ ] `specification.md`, `tests.md`, `ui-spec.md`, and `api-spec.md` agree on Actions Taken, workflow, dashboards, API, UI, migration, security, and concurrency decisions.
- [ ] Every AC maps to planned automated/manual evidence and final paths/statuses are synchronized truthfully.
- [ ] Lab 3 release baseline is preserved through a tested additive migration; no earlier data is discarded.
- [ ] Actions Taken data model, migration, seed, idempotent create, authorization, API, UI, lifecycle, assignee-only completion, performer/cancellation provenance, concurrency, and Requester read-only behavior pass.
- [ ] No active Action can remain assigned to an inactive user or Requester after Administrator account changes or concurrent assignment/account races.
- [ ] Final Ticket transition matrix and current-workflow-cycle resolution gate are backend-enforced, parent-versioned, and stale-safe.
- [ ] Requester Dashboard metrics are ownership-safe and match authoritative queries.
- [ ] IT Staff Dashboard metrics/current-user Actions/separate Recently Updated and Urgent lists match authoritative queries; Administrator behavior matches the approved matrix.
- [ ] Labs 1–3 regression passes for authentication, Requester, Staff, Administrator, comments, notes, attachments, ownership, user management, and role navigation.
- [ ] Server unit/API/integration/authorization/migration tests pass from the integrated release candidate.
- [ ] Client component/UI tests pass from the integrated release candidate.
- [ ] Lab 4 project-owned Playwright E2E covers Actions Taken, Ticket resolution, Dashboards, and representative earlier-lab journeys on a dedicated test database.
- [ ] Server build, Client production build, Prisma validate/migrate/seed, dependency audits, and hosted CI pass on the exact reviewed release head.
- [ ] Desktop 1280 / tablet ~820 / mobile ~390 visual-accessibility checks pass with no clipping, overlap, or page-level horizontal overflow.
- [ ] No critical console errors, broken links, placeholder text, duplicate/obsolete controls, or unfinished Lab 4 UI remain.
- [ ] `.github/workflows/ci.yml` includes the Lab 4 staging/PR path before final integration so Lab 4 is covered by hosted checks.
- [ ] `reviewer.md` records only real PR/reviewer/comment/response/re-review/approval evidence.
- [ ] `ai-use.md` contains the actual model, 6–10 selected real prompts, and final personal reflection.
- [ ] README setup/seed/migration/test/E2E/demo instructions are current.
- [ ] Issues #50–#59 are completed through the approved feature-branch/peer-review workflow; Project/Kanban evidence is captured truthfully.
- [ ] Final `lab4-staging` regression is green, Release PR to `main` is approved, and final submission evidence is taken from released `main`.

## 14. Assumptions and Project Decisions

The handout fixes the required Action fields, role minimums, eight Ticket statuses, backend-authoritative dashboards, migration preservation, regression/accessibility expectations, and the need to demonstrate assign/edit/status-transition/complete/cancel/inactive-assignee behavior. The following rows are **project decisions made to resolve details the handout leaves open**; they must not be cited later as wording directly required by the instructor.

| ID | Decision | Rationale |
|---|---|---|
| D-01 | Add `assigneeId` and lifecycle status to Actions Taken even though the minimum field list focuses on work details. | Final Lab 4 evidence explicitly requires assign/edit/status-transition/complete/cancel and inactive-assignee rejection; the contract makes those required behaviors implementable and testable. |
| D-02 | Keep creator/assignee/performer/canceller provenance separate; only current assignee may Complete. | Removes ambiguity between who planned work, who owns the Action, who actually performed/completed it, and who cancelled it; reassign-before-complete is required when another user takes over. |
| D-03 | New Action starts `Planned`; terminal `Completed`/`Cancelled` rows are immutable and undeletable. | Supports planned work plus final traceability without introducing a separate audit-history feature. |
| D-04 | Result becomes mandatory on completion rather than on initial create. | A planned/in-progress action may not yet have an outcome; completion is the point where Result must exist. |
| D-05 | Resolution requires >=1 Completed Action and zero active Actions **in the current workflow cycle**; Reopen increments that cycle. | Prevents prior-cycle Completed work from satisfying a new Reopen->Resolve cycle while retaining historical Actions. Historical already-resolved/closed Tickets are grandfathered and are not rewritten. |
| D-06 | Dashboards use deterministic top-5 recency lists instead of an invented 7/30-day window. | The handout requires exact calculations but does not mandate a time window. Top-N ordering avoids ambiguous time-zone/day-boundary policy and works for legacy data. |
| D-07 | Operational Staff counts exclude `Resolved`, `Closed`, and `Cancelled` unless the metric explicitly counts all statuses. | Keeps `Unassigned`, `Mine`, priority, and urgent work focused on active service work while `Tickets by Status` still exposes the full lifecycle. |
| D-08 | Requester/Staff dashboard calculations remain backend-side and concise. | Required by the handout and prevents client-side counting from becoming an authorization/data-consistency source. |
| D-09 | Existing Lab 3 session/Origin/password-change/RBAC/ownership conventions remain the security baseline. | Lab 4 is an extension; weakening existing controls would violate final regression requirements. |
| D-10 | Existing Public Comments/Internal Notes remain separate and keep their Lab 3 append-only visibility contracts; Actions Taken does not reuse either model. | The records have different structure, purpose, and Requester visibility. |
| D-11 | Action mutations touch parent Ticket `updatedAt` and `version`. | Action work is operational Ticket activity and must invalidate stale workflow snapshots even when formal Ticket status is unchanged. |
| D-12 | Actions and Tickets both use integer optimistic versions; Resolve additionally locks/revalidates parent and re-reads current-cycle children atomically. | Closes stale aggregate writes that a status-only predicate cannot detect. |
| D-13 | Administrator reuses the Staff dashboard; no extra user-count cards are required for minimum Sprint 4. | The handout makes Admin user counts optional and the existing User Management screen remains the detailed source. |
| D-14 | Active Action assignee eligibility becomes an Administrator-safety invariant like the Lab 3 Ticket-owner invariant. | Rejecting only at initial assignment is insufficient because a later/concurrent account change could otherwise leave planned work assigned to an ineligible user. |
| D-15 | Action create uses per-Ticket UUID `clientRequestId` idempotency. | UI busy state cannot protect a successful POST whose response is lost and then retried. |
| D-16 | `actionDateTime` is business occurrence time; backdating is allowed and future values beyond 5 minutes of server clock are rejected. | Distinguishes user-entered work time from immutable server audit timestamps while allowing realistic delayed data entry and small clock skew. |
| D-17 | Action Description/Result/Follow-up/Attachment Notes use 2,000 Unicode-code-point limits. | The handout requires the fields but does not define exact text limits; this keeps parity with established Lab 3 long-text validation. |
| D-18 | Add explicit `resolvedAt` and do not backfill legacy resolution times. | Makes `Recently Resolved` semantically truthful and avoids treating arbitrary legacy `updatedAt` as a historical resolution event. |
| D-19 | Staff `Recently Updated` and `Urgent Tickets` are separate lists; Urgent means active `itPriority=High`. | Avoids calling a priority-first list "recent" and gives each list one clear predicate/order. |
| D-20 | Cancellation stores `cancelledById` and `cancelledAt`; completion stores `completedAt`. | Provides minimum lifecycle provenance without adding a separate generic audit-history product. |

## 15. Earlier-Increment Preservation Contract

The following Lab 3 decisions remain binding unless a later reviewed Sprint 4 change explicitly supersedes them:

- Opaque DB-backed `toktickit_session` HttpOnly session and existing password-change gate.
- Exact approved Origin on state-changing requests and credentialed CORS.
- Explicit role allow-lists and Requester ownership-derived resource visibility.
- Cross-requester protected-resource `404` behavior where practical.
- Ticket Owner eligibility restricted to active `IT_STAFF`/`ADMINISTRATOR` with transactional concurrency protection against Admin deactivation/demotion races.
- Requested Priority remains Requester intent and is not overwritten by IT Priority changes.
- Public Comments remain Requester-own/Staff/Admin visible, append-only, backend-authored/timestamped, plain text, max 2,000 Unicode code points.
- Internal Notes remain Staff/Admin-only, append-only, paginated, backend-authored/timestamped, plain text, max 2,000 Unicode code points, with no Requester content leak.
- Attachment ownership, upload/download/soft-removal, maximum-active-count concurrency, removed metadata, and Staff read/download-only behavior remain intact.
- Requester `Problem Appears Resolved` stays advisory and is cleared on Reopen.
- Test database guard continues to reject missing/unsafe/colliding test targets.
- Zen Green responsive/accessibility conventions and evidence widths remain the application design baseline.
