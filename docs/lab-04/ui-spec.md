# TokTickIT Lab 4 — UI Specification

Framework: React + TypeScript + Vite + Bootstrap 5. Sprint 4 extends the released Lab 3 Zen Green application. New Dashboard and Actions Taken screens must look and behave like the same product; they do not introduce a second design system.

## 1. Existing Zen Green Foundation

Reuse the existing `client/src/theme.css` tokens/components and Lab 3 behavior:

- `--zen-green-900` dark navigation/strong emphasis.
- `--zen-green-800` primary actions/headers.
- `--zen-green-700` links/hover/focus accents.
- `--zen-green-100` soft badges/success/info.
- `--zen-green-050` soft section backgrounds.
- Existing cards, tables, responsive cards, badges, forms, alerts, spinners, pagination, modal/dialog patterns, and role badges.
- Existing mobile navigation breakpoint at `max-width: 991.98px` remains the shell baseline unless implementation evidence requires a reviewed adjustment.

### 1.1 Evidence Viewports

- Desktop: 1280 px wide.
- Tablet: approximately 820 px wide.
- Mobile: approximately 390 px wide.
- No page-level horizontal overflow.
- Touch controls approximately >=44 px where practical on mobile.

## 2. Common Interaction Rules

- Every form control has a visible label or an equivalent accessible name.
- Required fields use text/asterisk and validation text; color is not the only signal.
- Client validation appears near the relevant field and server field errors map back to controls where possible.
- On client validation failure, focus moves to the first invalid control.
- Busy mutations disable their primary action and display progress text/spinner to prevent ordinary duplicate clicks.
- Recoverable API/business conflicts preserve safe draft values where practical.
- Safe failures offer Retry/Refresh guidance without showing stack traces or internal database details.
- Status, priority, visibility, and terminal/read-only meaning are communicated with text/icon/structure in addition to color.
- User-entered work/comment/note text renders as plain text with whitespace preserved appropriately; no raw HTML rendering.

## 3. Final Authenticated Application Shell

### 3.1 Common Header

Preserve:

- TokTickIT brand.
- Current user name and role.
- Change Password.
- Logout.
- Collapsed mobile navigation under the established shell breakpoint.

### 3.2 Requester Navigation

Primary destinations:

1. **Dashboard** — new default landing page for Requester.
2. **My Tickets** — existing Lab 2/3 detailed list.
3. **Create Ticket** — existing Requester flow.
4. Existing Check System utility may remain if still useful and not visually dominant.

Active-page indication must distinguish Dashboard vs My Tickets/Create Ticket/Ticket Detail.

### 3.3 IT Staff Navigation

Primary destinations:

1. **Dashboard** — new default landing page for IT Staff.
2. **Ticket Queue** — existing operational list.

Staff Ticket Detail is reached through Dashboard/Queue drill-down and keeps the Queue navigation context active where appropriate.

### 3.4 Administrator Navigation

Primary destinations:

1. **User Management** — existing Admin responsibility remains available.
2. **Dashboard** — reuses Staff operational Dashboard under the approved Staff-equivalent Ticket permission.
3. **Ticket Queue** may be reachable from Dashboard drill-down/operational navigation where implementation exposes existing Admin Ticket permissions.

No separate advanced Administrator analytics screen is required.

## 4. S1 — Requester Dashboard

### Purpose

Give the authenticated Requester a concise view of owned work requiring attention without replacing My Tickets.

### Desktop Layout

- Page title `Dashboard` and short ownership-focused subtitle.
- Top metric-card row:
  - `Open Tickets`.
  - `Waiting for You`.
- Two concise lists/cards below:
  - `Recently Updated` (up to 5).
  - `Recently Resolved` (up to 5).
- Each Ticket row displays enough context for recognition, for example Ticket Number, Summary, Status, priority context where useful, and Updated time.
- Each row has an accessible `Open Ticket` action to owned Ticket Detail.
- Metric cards have labels, numeric value, and an accessible drill-down action where practical.

### Tablet/Mobile

- Metric cards stack or use a two-column grid that becomes one column on narrow screens.
- Recent lists render as cards/stacked rows rather than a wide table.
- Ticket number/status/summary remain readable without horizontal scrolling.
- Navigation collapses using the existing shell behavior.

### States

| State | UI behavior |
|---|---|
| Loading | Skeleton/spinner or clear `Loading Dashboard...` status; no stale counts presented as current. |
| Success | Counts/lists rendered from one authoritative Dashboard response. |
| Zero metrics | Numeric `0`, not blank or `-`. |
| Empty recent list | `No recent Tickets` / `No recently resolved Tickets`. |
| Forbidden/session issue | Existing auth/forbidden shell behavior. |
| Safe API failure | Alert + Retry; existing My Tickets navigation remains reachable. |

### Ownership

The UI never sends a Requester id to select dashboard ownership. Identity comes from the authenticated session.

## 5. S2 — IT Staff / Administrator Operational Dashboard

### Purpose

Provide a concise operational starting point and surface current-user work without replacing Ticket Queue/Ticket Detail.

### Desktop Layout

Top summary area:

- `Unassigned Active Tickets` card.
- `My Active Tickets` card.
- `Tickets by Status` compact grouped card/section across all eight statuses.
- `Active Tickets by IT Priority` card/section including `Not recorded`.

Work lists:

- `My Active Actions` — up to 5 Actions assigned to current user with Action status, Ticket Number, brief description, assignee context, updated time, and `Open Ticket` action.
- `Recently Updated` — up to 5 active Tickets ordered by latest Ticket `updatedAt`.
- `Urgent Tickets` — up to 5 active Tickets whose IT Priority is `High`, ordered by latest Ticket `updatedAt`.

Each actionable value/list row goes to Ticket Queue or Ticket Detail. Dashboard does not contain full Ticket edit controls.

### Administrator Behavior

- Administrator sees the same operational cards/lists when opening Dashboard.
- No extra account-count cards are required for the minimum Sprint 4 UI.
- User Management remains available separately.

### Responsive

- Metric sections use a responsive card grid.
- Status/priority groups wrap rather than forcing a wide row.
- Work lists become stacked cards on mobile.
- No metric value depends on color alone.

### States

Loading, success, zero/empty, forbidden, and safe-failure states follow the common rules. A zero count is valid success, not an error.

## 6. S3 — Actions Taken on IT Staff Ticket Detail

The existing Staff Ticket Detail remains the base screen. Preserve its Requester Information, Ticket Information, Attachment, Operational Controls, Public Comments, and Internal Notes behavior.

### 6.1 Placement

Add an **Actions Taken** section after the core Ticket/operational summary and before communication/private-note content, so structured work is visually separated from Public Comments and Internal Notes.

Section header:

- `Actions Taken`.
- Count of Action records.
- `+ Add Action` for permitted Staff/Admin only when Ticket status is not Resolved/Closed/Cancelled.

### 6.2 List / Card Content

Every Action item displays:

- Action Date/Time, labelled/helper-texted as the time the work actually occurred.
- Action Description.
- Status.
- Assignee.
- Result or `Not recorded yet` while active.
- `Performed by` / `Completed at` or `Not completed yet` while active.
- `Cancelled by` / `Cancelled at` for Cancelled rows.
- Follow-Up Required Yes/No.
- Follow-up Note when required.
- Attachment Notes when present.
- Created by / `Recorded at` server timestamp in subdued audit metadata so it is not confused with Action Date/Time.
- Updated timestamp where useful.

Stable order is newest Action Date/Time first, then id descending.

### 6.3 Active Action Controls

For `Planned` / `In Progress` Actions:

- `View / Edit` action.
- Assignee can be changed to an active eligible IT Staff/Administrator.
- Lifecycle action buttons/select:
  - Planned -> Start / Cancel for permitted Staff/Admin; **Complete only when current user is the Action assignee**.
  - In Progress -> Cancel for permitted Staff/Admin; **Complete only when current user is the Action assignee**.
- A non-assignee who needs to take over the work must first use the approved Reassign flow (subject to version/conflict checks), then complete as the new current assignee. The UI must not imply that merely clicking Complete makes an arbitrary Staff user the performer.
- Completion opens edit/confirmation state requiring Result and valid Follow-up fields.
- Cancel requires explicit confirmation because it is terminal.

### 6.4 Terminal Action Behavior

For Completed/Cancelled:

- Read-only presentation.
- No Edit/Reassign/Status controls.
- Completed shows automatic performer.
- Completed shows `Completed at`; Cancelled clearly displays `Cancelled`, `Cancelled by`, and `Cancelled at`, not just color.
- No Delete action exists.

## 7. S4 — Action Create / Edit Mode

Implementation may use an accessible modal/dialog, inline panel, or dedicated card form, but one consistent pattern must be used across desktop/mobile.

### Fields

| Field | Create | Edit active | Notes |
|---|---:|---:|---|
| Action Date/Time | Editable, required | Editable | **Business occurrence time** (`When did this work happen?`). Defaults to current date/time, may be backdated, must not exceed server-now + 5 minutes; stored UTC/displayed in browser locale. |
| Action Description | Editable, required | Editable | Max 2,000 code points. |
| Assignee | Editable, required | Editable | Active Staff/Admin options only; backend revalidates. |
| Result | Optional | Editable | Required when completing. |
| Follow-Up Required | Required Yes/No | Editable | Boolean. |
| Follow-up Note | Conditional | Conditional | Required and shown when Yes; hidden/cleared when No. |
| Attachment Notes | Optional | Editable | Text reference to existing file(s), not file upload. |
| Performed by | Not editable | Not editable | Automatic and equal to the current assignee who completes. |
| Status | Planned initial | Via lifecycle control | Not an arbitrary free-edit field. |

`Created/Recorded at`, `Updated at`, `Completed at`, and `Cancelled at` are server audit timestamps and are never user-editable.

### Validation / Conflict

- Field errors render below fields.
- Client may pre-check obviously invalid future Action Date/Time but server validation is authoritative; equivalent timezone offsets must display/round-trip as the same instant.
- Inactive/ineligible assignee conflict leaves form open, preserves other entered values, refreshes assignee options where practical, and shows safe guidance.
- `STALE_ACTION_TAKEN` keeps draft state and prompts user to refresh the current Action before retrying.
- `STALE_TICKET_STATE` indicates that owner/priority/status/Actions changed after the Ticket snapshot loaded; refresh is required before another workflow-affecting mutation.
- The create form generates one UUID `clientRequestId` for a logical submission and retains that same key while retrying an unknown/lost response. A new key is generated only after confirmed success or when the user intentionally starts a new Action form. This is not visible as an editable field.
- API `500` preserves non-sensitive form fields and offers retry/cancel.
- Busy state prevents duplicate submit.

### Accessible Dialog Rules (if modal is used)

- Dialog has title and semantic accessible role.
- Initial focus enters the dialog.
- Tab stays within modal controls while open.
- Escape closes only when no mutation is in progress.
- Focus returns to the control that opened the dialog.
- Mobile dialog content remains scrollable without controls clipping below viewport.

## 8. S5 — Requester Ticket Detail Actions Taken

Requester existing Ticket Detail remains read-only for operational work and keeps Attachment/Public Comment/Problem Appears Resolved behavior.

Add an **Actions Taken** read-only section:

- List all Actions for that owned Ticket in the same deterministic order.
- Show Action Date/Time, Description, Result, Status, Assignee, Performed by/Completed at or Cancelled by/Cancelled at, Follow-Up Required/Note, Attachment Notes, and appropriate creator/Recorded-at metadata.
- No Add/Edit/Reassign/Start/Complete/Cancel controls.
- No Internal Note content is mixed into this section.
- Empty state: `No Actions Taken have been recorded for this Ticket yet.`

Cross-requester ownership remains backend enforced; the UI does not use a Requester selector.

## 9. S6 — Final Ticket Workflow / Resolution Feedback

### Status Control

- Existing Staff Ticket Detail Status control displays only transitions allowed from the currently loaded status.
- Client transition map is UX guidance only; backend remains authoritative.
- Terminal/important transitions retain explicit confirmation.

### Resolution Gate UX

When Staff selects `Resolved`:

- If the currently loaded **current workflow cycle** shows no Completed Action or still contains Planned/In Progress Actions, UI may proactively explain the gate and disable/guide the action. Completed Actions shown from older cycles remain historical and do not qualify the current resolution gate.
- The request must still be validated by the backend because UI state may be stale.
- `409 RESOLUTION_GATE_NOT_MET` shows concise guidance such as `Complete at least one Action in the current work cycle and complete or cancel all active current-cycle Actions before resolving this Ticket.`
- `409 STALE_TICKET_STATE` tells the user the Ticket or related workflow work changed and offers Refresh.

### Requester Advisory Indication

Preserve the existing informational banner/indicator for `Problem Appears Resolved`. It never renders as formal Resolved status and does not bypass the resolution gate.

The Requester Ticket Detail keeps the current Ticket `version` as hidden concurrency state and submits it with the advisory mutation. If `409 STALE_TICKET_STATE` is returned because Staff/Action workflow changed meanwhile, the UI must refresh the Ticket rather than silently applying the indication to an older aggregate snapshot.

### Reopen

After a successful Reopened transition:

- refreshed status shows Reopened.
- Requester resolution indication is cleared.
- previous `resolvedAt` is cleared and a new workflow cycle begins.
- Add Action becomes available again.
- Historical Completed/Cancelled Actions remain visible as previous-cycle work, but they do not satisfy the new cycle's resolution gate.

## 10. Drill-Down Behavior

| Source | Destination / context |
|---|---|
| Requester Open Tickets card | My Tickets root or active context; no client-side hidden cross-owner data. |
| Requester Waiting for You card | My Tickets with the `Waiting for Requester` status filter applied. |
| Requester recent Ticket | Requester Ticket Detail. |
| Staff Unassigned card | Ticket Queue with unassigned context. |
| Staff My Active card | Ticket Queue with owner=mine context. |
| Staff status/priority metric | Ticket Queue with matching existing filter. |
| My Active Action row | Parent Staff Ticket Detail; Actions Taken section visible. |
| Recently Updated Ticket row | Staff Ticket Detail. |
| Urgent Ticket row | Staff Ticket Detail or High-IT-Priority Queue context. |

Navigation must preserve an understandable Back action (`Back to Dashboard`, `Back to Ticket Queue`, or existing role context) without creating browser-dead-end screens.

## 11. Feedback and Failure Matrix

| Condition | Required UI behavior |
|---|---|
| Dashboard API loading | Visible loading status. |
| Dashboard zero values | Render `0`; lists have intentional empty copy. |
| Dashboard 403 | Safe permission message/navigation; no hidden data. |
| Dashboard 500 | Safe error + Retry. |
| Actions load empty | Explicit no-actions message. |
| Action field validation | Inline errors, focus first invalid control. |
| Inactive assignee | Keep draft; safe conflict message; refresh candidates. |
| Stale Action version | Keep draft; refresh/retry guidance. |
| Create response lost / retry | Reuse the same hidden `clientRequestId`; an idempotent `200` replay is treated as confirmed success rather than creating another card. |
| Create idempotency key reused with different payload | Preserve form; explain conflict; generate a new key only when the user intentionally starts a distinct Action submission. |
| Complete attempted by non-assignee | Explain that the Action must be reassigned before that user can complete it. |
| Invalid Action transition | Safe conflict; refresh current Action. |
| Resolution gate failure | Explain required work state; no false success status. |
| Stale Ticket status | Safe conflict; refresh Ticket. |
| Duplicate click | Button disabled/busy; backend still state/version safe. |
| Recoverable server failure | Preserve safe entered values and offer Retry/Cancel. |
| Not found | Existing safe not-found pattern, no ownership leak. |

### Administrator User Management — New Lab 4 Conflict

Preserve the existing Edit User flow. If account deactivation/demotion returns `ACTIVE_ACTIONS_REQUIRE_REASSIGNMENT`, keep the user unchanged and show a clear conflict message explaining that active Actions Taken must be reassigned, completed, or cancelled first. This is separate from the existing `ASSIGNED_TICKETS_REQUIRE_REASSIGNMENT` Ticket-owner conflict; both may apply and neither is hidden only in frontend logic.

## 12. Responsive / Accessibility Checklist

The final evidence for all major Lab 4 screens must verify:

- [ ] Desktop 1280 layout readable with sensible card/list density.
- [ ] Tablet ~820 layout uses compact shell navigation and no horizontal page overflow.
- [ ] Mobile ~390 layout stacks cards/forms/controls without clipping or overlap.
- [ ] Dashboard metric labels/values remain readable at all widths.
- [ ] Actions Taken active/terminal/read-only meaning is not color-only.
- [ ] Public Comments vs Internal Notes vs Actions Taken remain structurally and textually distinct.
- [ ] All form inputs have labels/accessibility names.
- [ ] Keyboard focus is visibly rendered.
- [ ] Keyboard-only user can reach Dashboard drill-down and Action controls.
- [ ] Modal/dialog focus is contained/restored where a modal is used.
- [ ] Validation is adjacent to the relevant field.
- [ ] Busy controls are disabled and communicate progress.
- [ ] Long summary/description/attachment-note text wraps safely.
- [ ] No page-level horizontal overflow.
- [ ] No off-screen primary action at mobile width.
- [ ] No placeholder/debug/obsolete Lab 2/3 UI remains in final evidence.

## 13. Existing Screen Regression Checklist

Lab 4 UI changes must not remove or weaken:

- Login and mandatory/normal Change Password.
- Requester My Tickets, Create Ticket, Ticket Detail, Attachments, Public Comments, Problem Appears Resolved.
- IT Staff Ticket Queue and existing Ticket Detail operational controls.
- Internal Notes Staff/Admin-only visual distinction.
- Administrator User Management including create/edit/deactivate/initial-password conflict feedback.
- Current user/role display, Logout, responsive mobile navigation, and Zen Green focus states.
