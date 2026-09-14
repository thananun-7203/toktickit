# TokTickIT Lab 3 — UI Specification

Framework: React + TypeScript + Vite + Bootstrap 5. Lab 3 extends the existing Lab 2 Zen Green theme and responsive conventions. The application must look and behave like one product across Requester, IT Staff, and Administrator workflows.

## 1. Global Design Rules

### 1.1 Existing Zen Green Tokens

Reuse the Lab 2 theme tokens already defined in `client/src/theme.css`:

| Token | Value | Intended use |
|---|---|---|
| `--zen-green-900` | `#004f2d` | dark navbar/strong emphasis |
| `--zen-green-800` | `#006b3c` | primary action/header |
| `--zen-green-700` | `#0b7a46` | hover/link/focus accent |
| `--zen-green-100` | `#eaf6ef` | soft success/info/badge backgrounds |
| `--zen-green-050` | `#f4faf6` | page/section soft backgrounds |

Lab 3 may add semantic classes for roles, status, IT Priority, warnings, and private notes, but should not replace the core visual system.

### 1.2 Common Form Rules

- Every input has a visible `<label>`.
- Required fields use a text/asterisk indicator; colour is not the only signal.
- Client validation appears directly below the relevant field.
- Server field errors map back to the corresponding control where possible.
- Busy state disables the primary submit action and shows clear progress text/spinner.
- On validation failure, focus moves to the first invalid control.
- API failure preserves entered values where safe.
- Password controls include show/hide affordance if implemented accessibly; no password is displayed by default.

### 1.3 Common Feedback States

Where meaningful each screen supports:

- Loading.
- Saving / busy.
- Success.
- Validation error.
- Empty.
- No results.
- Forbidden.
- Not found.
- Business conflict.
- Safe API/server failure with retry guidance.

### 1.4 Responsive Targets

- Desktop evidence target: 1280 px wide.
- Tablet evidence target: approximately 820 px wide.
- Mobile evidence target: approximately 390 px wide.
- No page-level horizontal overflow.
- Touch targets approximately ≥44 px on mobile.
- Dense desktop tables convert to cards or simplified stacked rows on mobile when needed.

## 2. Authenticated Application Shell

### 2.1 Header

Common authenticated header:

- TokTickIT brand on left.
- Role-appropriate navigation in center/desktop.
- Current user profile control on right containing:
  - user's name,
  - role badge/label,
  - Change Password,
  - Logout.

The old Development Requester identity/menu and Switch Requester action are removed.

### 2.2 Role Navigation

#### Requester

- My Tickets.
- Create Ticket.
- Check System may remain as a utility if preserved from Lab 2.

#### IT Staff

- My Queue / Ticket Queue.
- Check System may remain as utility.

#### Administrator

- Users / User Management.
- Optional operational Ticket navigation only if implementation exposes the explicitly permitted Admin Ticket operations from the authorization matrix; User Management remains the primary landing destination.
- Check System may remain as utility.

### 2.3 Mobile Navigation

- Brand remains visible.
- Primary role navigation collapses to a hamburger/menu.
- Current user/profile access remains reachable.
- Role and Logout remain visible without requiring horizontal scrolling.

## 3. S1 — Login

### Purpose

Authenticate a real Lab 3 user with email/password and replace the Lab 2 requester selector entry screen.

### Layout

Desktop/tablet:

- Centered authentication card, maximum readable width about 480–560 px.
- TokTickIT brand / `Sign in to your account` heading.
- Email field.
- Password field.
- Primary `Sign in` button.
- Short local-lab help text only if needed; do not display seeded passwords on the login screen.

Mobile:

- Full-width card within page padding.
- No fixed-width control that clips at 390 px.

### States

| State | UI behavior |
|---|---|
| Default | Empty fields, sign-in action available. |
| Client validation | Required/email-format errors below fields. |
| Busy | Button disabled; `Signing in…`; duplicate submissions prevented. |
| Invalid credentials | Generic alert: `Email or password is incorrect.` |
| Inactive account | Safe alert such as `This account cannot sign in. Contact an administrator.` without extra account details. |
| Rate limited | Alert explains too many attempts and asks user to wait. |
| API failure | Safe connection/server alert; form values except password may remain, password field should be cleared after failed auth for safer UX. |

### Successful Navigation

- `mustChangePassword=true` → S2 Change Password.
- Requester → My Tickets.
- IT Staff → Ticket Queue.
- Administrator → User Management.

## 4. S2 — Mandatory / Normal Change Password

### Purpose

Allow an authenticated user to replace an initial password before entering the normal application and support later profile password change.

### Layout

- Centered Zen Green card.
- Heading `Change Password`.
- Context message:
  - mandatory mode: `You must change your initial password before continuing.`
  - normal profile mode: `Choose a new password for your account.`
- Current password.
- New password.
- Confirm new password.
- Password-rules helper:
  - at least 10 characters,
  - at least one letter,
  - at least one digit,
  - maximum 72 UTF-8 bytes (important for multibyte input such as Thai/emoji because Lab 3 uses bcrypt).
- Primary `Continue` in mandatory mode or `Save Password` in profile mode.

### States

- Default.
- Validation: required, rule failure, confirmation mismatch, new = current.
- Busy.
- Incorrect current password.
- Success.
- Safe API failure preserving new-password fields only as appropriate; implementation may clear password fields after server failure for safety.

### Mandatory Mode Restriction

The normal navigation is not available while `mustChangePassword=true`. The user may only change password or Logout.

## 5. Requester Screens — Lab 2 Regression

### 5.1 My Tickets

Preserve Lab 2 behavior:

- search by Ticket Number or Summary,
- Category/Related System filters,
- sort,
- page size/pagination,
- Requested Priority and status badges,
- desktop/tablet table,
- mobile cards,
- loading/empty/no-results/error states.

Changes for Lab 3:

- no Development Requester selector/context text,
- no Switch Requester,
- identity comes from authenticated shell,
- My Tickets no longer accepts/needs requester id from UI controls.

### 5.2 Create Ticket

Preserve Lab 2 fields and validation:

- Category.
- Related System.
- Requested Priority Low/Medium/High.
- Summary max 100.
- Description max 2,000.
- Attachments with Lab 2 type/size/count rules.

Changes:

- authenticated identity is implicit.
- no requester field.
- success continues to show generated Ticket Number and links to Ticket Detail/My Tickets.

### 5.3 Requester Ticket Detail

Preserve:

- read-only ticket metadata,
- Requested Priority,
- status,
- summary/description,
- attachment upload/download/remove with removal reason,
- removed attachment metadata.

Add:

- IT Priority shown read-only (`Not recorded` when null legacy value).
- Public Comments panel.
- `Problem Appears Resolved` action/indicator.

## 6. S4 — Requester Public Comments and Resolution Indication

### Public Comments Panel

- Section title `Public Comments`.
- Helper text: comments are shared with support staff.
- Comments are loaded from the dedicated `GET /api/v1/tickets/:id/public-comments` endpoint and posted through the matching `POST` endpoint; Ticket Detail responses do not inline the collection.
- Chronological comment list.
- Each comment displays:
  - author name,
  - role label,
  - timestamp,
  - plain-text content.
- Add-comment textarea max 2,000 characters with counter.
- `Post Comment` primary action.

States:

- Loading comments.
- No comments yet.
- Posting busy.
- Validation for blank/whitespace and over-limit.
- Success adds comment without full-page reset.
- Safe failure preserves content for retry.

### Problem Appears Resolved

If not yet indicated **and** current status is `New`, `Open`, `In Progress`, `Waiting for Requester`, or `Reopened`:

- Secondary/outline action `Problem Appears Resolved`.
- Confirmation dialog/panel explicitly states this does **not** formally close the Ticket.

If current status is `Resolved`, `Closed`, or `Cancelled`, do not show the action. The formal staff status is already terminal for this indication contract; a direct API attempt is rejected with `409`.

If already indicated:

- Informational Zen badge/panel `Requester indicated this problem appears resolved` plus timestamp.
- Formal status remains shown independently.
- If staff later moves the Ticket to `Reopened`, the indication is cleared and the Requester-facing action becomes available again for a future fresh indication.

## 7. S5 — IT Staff Ticket Queue

### Page Goal

Help staff locate, prioritize, and open work without an unreadable mega-grid.

### Header / Toolbar

- Heading `Ticket Queue`.
- Optional compact count summary: total results / unassigned count if easily derived, not a dashboard.
- Search input: Ticket Number, Summary, Requester name/email.
- Filters:
  - Status.
  - Requested Priority.
  - IT Priority.
  - Owner (`All`, `Unassigned`, `Mine`, optional specific owner).
  - Category.
  - Related System.
- Sort.
- Clear filters.

### Desktop Table

Recommended columns:

1. Ticket Number.
2. Updated / Created context.
3. Summary.
4. Category.
5. Requested Priority.
6. IT Priority.
7. Status.
8. Owner.
9. Open action.

Requester name may appear as secondary text under Summary or Ticket Number to avoid adding a very wide column.

### Tablet

- Keep a table if it remains readable without horizontal page overflow.
- May hide less critical text or stack Requester/Category under Summary.

### Mobile

Use queue cards:

- Ticket Number + Status badge.
- Summary.
- Requester.
- Requested / IT Priority badges.
- Owner (`Unassigned` clearly labelled).
- Updated date.
- full-width `Open Ticket` action.

### Queue States

- Loading skeleton/spinner.
- Empty queue: no tickets exist.
- No results: filters/search match nothing; `Clear filters` action.
- Forbidden: role does not permit queue.
- Failure: retry action.
- Invalid filter/query should be prevented client-side where possible and safely displayed if returned by API.

## 8. S6 — IT Staff Ticket Detail

### Page Structure

Use clear sections so read-only Requester data cannot be confused with staff-editable operational fields.

1. Page heading / Ticket Number / back to Queue.
2. Read-only Requester-submitted information.
3. Operational controls.
4. Summary / Description.
5. Tabbed or segmented communication area:
   - Public Comments.
   - Internal Notes.
   - Attachments.

### Read-Only Requester Data

- Requester name/email.
- Category.
- Related System.
- Requested Priority.
- Created date.
- Summary.
- Description.

### Operational Controls

#### Ticket Owner

- Current owner display.
- `Claim` when unassigned / not current user.
- Owner select for assign/reassign populated with active eligible assignees.
- No `Unassign` action in Lab 3; an assigned Ticket changes owner only through reassignment to another eligible owner.
- Saving indicator and conflict/error feedback.

#### IT Priority

- Editable select Low / Medium / High.
- Requested Priority stays adjacent/read-only for comparison.
- Saving state; success inline feedback.

#### Status

- Current status badge.
- Next-status control lists only transitions allowed by matrix.
- Resolve/Close/Reopen/Cancel confirmations where specified.
- Invalid transition conflict message if server state changed between load/save.
- A successful transition to `Reopened` clears the Requester-resolution indication; after refresh, no stale `appears resolved` banner is shown.

#### Requester Resolution Indication

- If set, show a distinct informational banner/timestamp.
- Do not automatically change status or preselect Resolved.

### Public Comments vs Internal Notes

These must be visually difficult to confuse.

#### Public Comments

- Green/shared communication styling.
- Label: `Visible to Requester`.
- Same append-only author/timestamp/content pattern as Requester view.
- Load/post through the dedicated Public Comment endpoints rather than relying on the operational Ticket Detail response.

#### Internal Notes

- Distinct neutral/amber/private styling.
- Strong label: `Internal Notes — not visible to Requester`.
- Composer should not be placed immediately adjacent to Public Comment composer without clear tab/heading distinction.
- Plain text only.
- Load/post through the dedicated `/api/v1/staff/tickets/:id/internal-notes` endpoints.

### Attachments

- Preserve Lab 2 active/removed distinction.
- Staff/Admin operational detail can view attachment metadata and download active attachments.
- Staff/Admin cannot upload attachments or soft-remove attachments in Lab 3; those mutation controls are Requester-only and must not appear in staff/admin UI.
- Removed attachment metadata remains visible for continuity, but removed files cannot be downloaded.

## 9. S7 — Administrator User Management

### Page Goal

One intentionally simple screen for the minimum account-management capability.

### Desktop Layout

Recommended two-pane or list + drawer pattern:

- Main list panel left/center.
- Create/Edit form as right-side panel/drawer/modal.

### User List

Required columns:

- Name.
- Email.
- Role badge.
- Status badge (`Active`, `Inactive`).
- Edit action.

Toolbar:

- search Name or Email.
- optional role filter.
- `Create User` primary action.

Pagination is not required.

### Create User Mode

Fields:

- Name*.
- Email*.
- Role* — Requester / IT Staff / Administrator exactly one.
- Active toggle/checkbox*.
- Initial Password*.
- Confirm Initial Password*.

Helper: initial password must be changed at first login.

States:

- validation,
- duplicate email conflict,
- invalid role/input,
- saving,
- success,
- safe failure.

### Edit User Mode

Editable:

- Name.
- Email.
- Role.
- Active state.

Separate action:

- `Set New Initial Password` opens a focused password form/confirmation.

Safety feedback:

- self-deactivation blocked with explicit explanation.
- last active Administrator role/deactivation blocked with explicit explanation.
- deactivating or changing an assigned IT Staff/Administrator to Requester is blocked while that user owns Tickets; show a clear `Reassign owned tickets before changing this account` conflict message and keep the form/user state unchanged.
- no Delete action anywhere in Lab 3.

### Mobile User Management

- User list becomes cards or compact rows.
- Search/filter/Create remain visible and usable.
- Edit form opens as full-width panel/modal below header.
- No side-by-side layout that forces horizontal scrolling.

## 10. Role / Priority / Status Badges

All badges include text; colour alone is never the signal.

### Role

- Requester: neutral/green-soft.
- IT Staff: blue/green-compatible semantic style.
- Administrator: purple/neutral distinctive style.

Exact colours may use Bootstrap semantic tokens but must retain accessible contrast and Zen Green harmony.

### Requested Priority / IT Priority

Reuse Lab 2 priority styles:

- Low — green.
- Medium — amber.
- High — red.
- Not recorded — neutral gray.

Labels must identify context where both appear (`Requested`, `IT`).

### Status

Use a consistent labelled mapping across Queue and Detail. Suggested semantic grouping:

- New — neutral.
- Open — blue.
- In Progress — green.
- Waiting for Requester — amber.
- Resolved — success green.
- Closed — dark neutral.
- Reopened — purple/blue.
- Cancelled — danger/gray.

## 11. Forbidden / Not Found Behavior

### Client Route Guard

- Not authenticated → Login.
- Must change password → Change Password.
- Authenticated wrong role → Forbidden panel or safe allowed landing page.

### Forbidden Panel

- Heading `Access not permitted`.
- Short explanation based on role, without protected resource details.
- Button back to role landing page.

### Requester Resource Not Found

For cross-owner Ticket ids use same UI as unknown id:

- `Ticket not found`.
- Back to My Tickets.
- Do not say `This ticket belongs to another requester`.

## 12. Accessibility Checklist

- [ ] All controls have accessible names/labels.
- [ ] Form errors linked to controls (`aria-describedby` or equivalent).
- [ ] Busy buttons communicate disabled/progress state.
- [ ] Keyboard focus is visible using Zen Green focus treatment.
- [ ] Dialogs/modals have headings and focus handling.
- [ ] Mobile hamburger has `aria-expanded` and accessible label.
- [ ] Status/priority/role meanings include text.
- [ ] Public vs Internal communication distinction includes explicit wording, not colour only.
- [ ] Table headers use semantic markup where tables are used.
- [ ] Empty/failure states remain understandable to screen readers.

## 13. Visual Evidence Plan

Final evidence should capture readable screenshots (not extreme zoom) for:

### Authentication

- Login default.
- invalid credentials.
- inactive account.
- busy state.
- safe API failure.
- mandatory Change Password.
- authenticated user/role display.
- logout/direct-access blocked.

### Staff Queue

- realistic desktop queue.
- filters/search/sort/pagination.
- assigned/unassigned.
- no-results and failure.
- tablet and mobile.

### Staff Ticket Detail

- owner/claim-reassign.
- IT Priority.
- permitted status transition.
- Public Comments.
- Internal Notes distinction.
- attachments.
- Requester-resolution indication.
- validation/failure/forbidden evidence where meaningful.

### Admin

- user list.
- search/filter.
- create.
- duplicate validation.
- edit.
- new initial password.
- self-deactivation blocked.
- last-admin blocked.
- forbidden non-Admin.
- desktop/tablet/mobile.

## 14. Screen-to-Issue Mapping

| Screen / UI area | Primary implementation issue |
|---|---|
| Login / Change Password / authenticated shell | Issue 2 |
| Requester regression + Public Comments / appears resolved | Issue 3 |
| IT Staff Ticket Queue | Issue 4 |
| IT Staff Ticket Detail / comments / notes / operations | Issue 5 |
| Administrator User Management | Issue 6 |
| Cross-role forbidden/failure/responsive/a11y/E2E polish | Issue 7 |
| Final screenshots/checklist | Issue 8 |
