# TokTickIT Lab 3 — Test Plan & Traceability

This test plan is created before the main Lab 3 implementation. Final status remains `Planned` until the corresponding automated/manual evidence actually runs on the implementation branch or final integrated branch.

## 1. Test Strategy

Tools:

- **Vitest** — server unit tests and client UI/component tests.
- **Supertest** — API/integration/authorization tests.
- **Playwright** — real-browser end-to-end workflows and responsive checks.
- **Prisma/PostgreSQL** — migration and database-integrity verification.
- **Manual visual inspection** — final Zen Green/readability/accessibility checklist and screenshot evidence.

Test levels:

1. Pure unit tests for password/query/status/input helpers where practical.
2. API/integration tests for authentication, authorization, ownership, queue, operations, comments/notes, admin rules, and failure behavior.
3. UI component tests for screen modes, validation, role navigation, and state rendering.
4. Migration/regression tests proving Lab 2 data and behavior survive Lab 3 evolution.
5. E2E flows proving real browser behavior across auth → role workflow → logout.
6. Responsive/visual checks at desktop/tablet/mobile widths.

## 2. Planned Test File Structure

Server:

```text
server/tests/lab-03/
├── auth.unit.test.ts
├── auth.api.test.ts
├── authorization.api.test.ts
├── test-database-guard.unit.test.ts
├── fixtures/
│   ├── lab2-migration-preservation.sql
│   └── lab2-email-collision.sql
├── requester-regression.api.test.ts
├── staff-queue.api.test.ts
├── staff-ticket-detail.api.test.ts
├── comments-notes.api.test.ts
├── users-admin.api.test.ts
└── migration-regression.test.ts  (planned automated migration coverage; not present in Issue 2)
```

Client:

```text
client/tests/lab-03/
├── Login.test.tsx
├── ChangePassword.test.tsx
├── AuthenticatedShell.test.tsx
├── RequesterTicketDetail.test.tsx
├── StaffTicketQueue.test.tsx
├── StaffTicketDetail.test.tsx
└── UserManagement.test.tsx
```

E2E:

```text
e2e/lab-03/
├── authentication.spec.ts
├── requester-regression.spec.ts
├── staff-ticket-flow.spec.ts
└── user-administration.spec.ts
```

The final implementation may consolidate closely related tests, but `tests.md` must be updated truthfully with actual file paths before final release evidence.

## 3. Server Unit Tests

| ID | Target | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| U-01 | BR-03 | `auth.unit.test.ts` | normalize email | trim/lowercase deterministic | **Pass** |
| U-02 | BR-05 | `auth.unit.test.ts` | password below 10 chars / above 72 UTF-8 bytes | rejected | **Pass** |
| U-03 | BR-05 | `auth.unit.test.ts` | password without letter or digit | rejected | **Pass** |
| U-04 | BR-05 | `auth.unit.test.ts` | valid ASCII and multibyte password boundaries | accepted at ≤72 bytes; Thai/emoji input exceeding 72 bytes rejected even when under 72 characters | **Pass** |
| U-05 | BR-06 | `auth.unit.test.ts` | new password confirmation mismatch | rejected | **Pass via AUTH-07 API coverage** |
| U-06 | BR-06 | `auth.unit.test.ts` | new password equals current | rejected | **Pass via `auth.api.test.ts`** |
| U-07 | BR-19 | `comments-notes.api.test.ts` | blank/whitespace Public Comment | rejected | **Pass** |
| U-08 | BR-19 | `comments-notes.api.test.ts` | 2,000 chars accepted / 2,001 rejected for Public Comment | correct boundary | **Pass** |
| U-09 | status matrix | `staff-ticket-detail.api.test.ts` or helper | each allowed transition | helper returns allowed | Planned |
| U-10 | status matrix | same | disallowed/self transition | helper rejects | Planned |
| U-11 | Queue spec | `staff-queue.unit.test.ts` | valid queue query parsing/defaults | deterministic parsed query | **Pass** |
| U-12 | Queue spec | same | invalid page/pageSize/sort/status/priority | field errors | **Pass** |

## 4. Authentication API / Integration Tests

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| AUTH-01 | AC-01 | `auth.api.test.ts` | active user + valid credentials | `200`, session cookie, safe user data | **Pass** |
| AUTH-02 | AC-02 | `auth.api.test.ts` | unknown email | `401` generic invalid-credentials response | **Pass** |
| AUTH-03 | AC-02 | `auth.api.test.ts` | existing email + wrong password | same `401` shape/message as unknown email | **Pass** |
| AUTH-04 | AC-03 | `auth.api.test.ts` | inactive account + correct password | sign-in denied safely | **Pass** |
| AUTH-05 | AC-04 | `auth.api.test.ts` | initial-password login | authenticated but `mustChangePassword=true`, normal API blocked | **Pass** |
| AUTH-06 | AC-04 | `auth.api.test.ts` | valid mandatory password change | hash changes, flag false, normal API available | **Pass** |
| AUTH-07 | AC-04 | `auth.api.test.ts` | invalid password rule/mismatch | `400`, no credential mutation | **Pass** |
| AUTH-08 | AC-04 | `auth.api.test.ts` | incorrect current password | rejected; old password still valid | **Pass** |
| AUTH-09 | AC-05 | `auth.api.test.ts` | logout then reuse cookie | protected endpoint `401` | **Pass** |
| AUTH-10 | AC-01 | `auth.api.test.ts` | `GET /auth/me` valid session | safe identity + role; no hash/token | **Pass** |
| AUTH-11 | AC-05 | `auth.api.test.ts` | absolute 8-hour expiry boundary / unknown session | request before expiry allowed; at/after expiry `401`; normal requests do not slide expiry | **Pass** |
| AUTH-12 | AC-02 | `auth.api.test.ts` | 5 failed login attempts then next attempt | documented `429` within window | **Pass** |
| AUTH-13 | AC-02 | `auth.api.test.ts` | successful login after failures (before limit) | counter cleared | **Pass** |
| AUTH-14 | AC-06 | `auth.api.test.ts` | direct `POST /api/v1/auth/login` with wrong, missing, or `null` Origin | each rejected `403` before credential/session processing; matching Origin reaches normal login behavior | **Pass** |
| AUTH-15 | AC-03 | `auth.api.test.ts` | active session user is later deactivated | subsequent protected request denied/session invalidated | **Pass** |
| AUTH-16 | AC-06 | `authorization.api.test.ts` | wrong, missing, or `null` Origin on another state-changing request, including legacy Requester Ticket/Attachment mutations | each rejected `403` before mutation; matching Origin allowed on the authenticated logout control case | **Pass** |

## 5. Direct Authorization Matrix Tests

These tests intentionally call APIs directly rather than relying on hidden frontend controls.

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| AZ-01 | AC-06 | `authorization.api.test.ts` | no session → Requester ticket list | `401` | **Pass** |
| AZ-02 | AC-06 | `staff-queue.api.test.ts` | Requester → Staff Queue | `403` | **Pass** |
| AZ-03 | AC-26 | same | Requester → Admin users | `403` | **Pass** |
| AZ-04 | AC-26 | same | IT Staff → Admin users | `403` | **Pass** |
| AZ-05 | AC-06 | same | Admin → Admin users | allowed | **Pass** |
| AZ-06 | AC-06 | `staff-queue.api.test.ts` | IT Staff/Admin → Staff Queue | allowed | **Pass** |
| AZ-07 | AC-06 | same | user requiring password change → normal protected API | `403 PASSWORD_CHANGE_REQUIRED` | **Pass** |
| AZ-08 | AC-18 | same | Requester → Internal Notes endpoint | `403`, no note content | **Pass** |
| AZ-09 | AC-07 | `requester-regression.api.test.ts` | Requester sends another `requesterId` in body/query/header, including retired development header | ignored for ownership; no session means `401`; cannot impersonate | **Pass** |
| AZ-10 | AC-07 | `requester-regression.api.test.ts` | Requester opens another Requester's Ticket id | `404`, no existence leak | **Pass** |
| AZ-11 | AC-09 | adapted `ticketDetail.api.test.ts` | Requester opens/downloads another Requester's Attachment id | `404`, no existence leak | **Pass** |
| AZ-12 | AC-20 | same | IT Staff/Admin downloads active attachment on any Ticket | allowed; file returned | **Pass** |
| AZ-13 | AC-20 | same | IT Staff/Admin attempts Requester attachment upload or soft-remove | `403`; no attachment mutation | **Pass** |
| AZ-14 | AC-06 | same | unauthenticated request to `/api/categories`, `/api/v1/categories`, or `/api/v1/related-systems` | `401`; legacy alias and v1 reference data remain authenticated-only | **Pass** |

## 6. Requester Regression API Tests

Existing Lab 2 tests should remain meaningful, adapted from Development Requester header identity to authenticated session identity.

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| REQ-01 | AC-08 | `requester-regression.api.test.ts` + adapted `tickets.api.test.ts` | create valid Ticket as Requester | `201`, generated number, status New, requester=session user | **Pass** |
| REQ-02 | AC-08 | adapted `tickets.api.test.ts` | invalid required fields/lengths/priority | `400` field errors | **Pass** |
| REQ-03 | AC-08 | `requester-regression.api.test.ts` + adapted `myTickets.api.test.ts` | My Tickets requester isolation | only own items | **Pass** |
| REQ-04 | AC-08 | adapted `myTickets.api.test.ts` | search Summary / Ticket Number | correct own subset | **Pass** |
| REQ-05 | AC-08 | adapted `myTickets.api.test.ts` | Category/System filter + sort + pagination | existing Lab 2 semantics preserved | **Pass** |
| REQ-06 | AC-08 | `requester-regression.api.test.ts` + adapted `ticketDetail.api.test.ts` | owned Ticket Detail | metadata returned | **Pass** |
| REQ-07 | AC-09 | adapted `ticketDetail.api.test.ts` | valid attachment upload | succeeds; active metadata visible | **Pass** |
| REQ-08 | AC-09 | adapted `ticketDetail.api.test.ts` | invalid type / >5MB / >5 active | rejected, no invalid partial persistence | **Pass** |
| REQ-09 | AC-09 | adapted `ticketDetail.api.test.ts` | concurrent capacity race | maximum remains 5, no orphan storage for loser | **Pass** |
| REQ-10 | AC-09 | adapted `ticketDetail.api.test.ts` | soft remove with reason | metadata/reason retained; download blocked | **Pass** |
| REQ-11 | AC-09 | adapted `ticketDetail.api.test.ts` | blank removal reason | rejected; attachment active | **Pass** |
| REQ-12 | AC-09 | adapted `ticketDetail.api.test.ts` | concurrent removal | one success, one conflict | **Pass** |
| REQ-13 | AC-15 | `requester-regression.api.test.ts` | new Ticket creation | IT Priority initially equals Requested Priority | **Pass** |

## 7. Public Comments / Requester Resolution API Tests

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| COM-01 | AC-10 | `comments-notes.api.test.ts` | Requester posts Public Comment to own Ticket | `201`, backend author/time | **Pass** |
| COM-02 | AC-10 | same | Requester reads own Public Comments | chronological list | **Pass** |
| COM-03 | AC-10 | same | other Requester reads/posts to protected Ticket | `404` | **Pass** |
| COM-04 | AC-17 | same | IT Staff posts Public Comment | visible later to owning Requester | **Pass** |
| COM-05 | AC-17 | same | Admin reads/posts Public Comment | allowed per matrix | **Pass** |
| COM-06 | AC-19 | same | blank/whitespace comment | `400` | **Pass** |
| COM-07 | AC-19 | same | comment length boundary | 2,000 accepted; 2,001 rejected | **Pass** |
| COM-08 | AC-11 | same | own Requester marks Problem Appears Resolved | timestamp set, Ticket status unchanged | **Pass** |
| COM-09 | AC-11 | same | repeat appears-resolved action | idempotent; original indication retained | **Pass** |
| COM-10 | AC-11 | `authorization.api.test.ts` | Requester calls staff status API | `403` | Planned |
| COM-11 | AC-11 | `staff-ticket-detail.api.test.ts` | staff transitions indicated Ticket to `Reopened` | status becomes Reopened and indication is cleared atomically | Planned |
| COM-12 | AC-11 | `comments-notes.api.test.ts` | Requester marks own Ticket in `New`, `Open`, `In Progress`, `Waiting for Requester`, or `Reopened` | allowed; timestamp set without status change | **Pass** |
| COM-13 | AC-11 | same | Requester attempts indication in `Resolved`, `Closed`, or `Cancelled` | `409 RESOLUTION_INDICATION_NOT_ALLOWED`; timestamp/status unchanged | **Pass** |

## 8. IT Staff Queue API Tests

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| Q-01 | AC-12 | `staff-queue.api.test.ts` | default queue | updated-desc order, pagination metadata | **Pass** |
| Q-02 | AC-12 | same | search Ticket Number | matching items | **Pass** |
| Q-03 | AC-12 | same | search Summary | matching items | **Pass** |
| Q-04 | AC-12 | same | search Requester name/email | matching items | **Pass** |
| Q-05 | AC-12 | same | filter Status | exact subset | **Pass** |
| Q-06 | AC-12 | same | filter Requested Priority / IT Priority | exact subset | **Pass** |
| Q-07 | AC-13 | same | owner=`unassigned` | only owner null | **Pass** |
| Q-08 | AC-13 | same | owner=`mine` | only authenticated staff-owned Tickets | **Pass** |
| Q-09 | AC-12 | same | Category/System filters combined | AND semantics | **Pass** |
| Q-10 | AC-12 | same | supported sort options | deterministic order | **Pass** |
| Q-11 | AC-12 | same | invalid page/pageSize/filter/sort | `400` fields; no server crash | **Pass** |
| Q-12 | AC-13 | same | item fields | owner/status/requested+IT priority/updated context present | **Pass** |

## 9. IT Staff Ticket Detail / Operations API Tests

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| ST-01 | AC-20 | `staff-ticket-detail.api.test.ts` | open operational detail | Ticket, requester, owner, priorities, status, attachment metadata; comments/notes are fetched from dedicated endpoints | **Pass** |
| ST-02 | AC-14 | same | claim unassigned Ticket | owner=current staff | **Pass** |
| ST-03 | AC-14 | same | assign active IT Staff | owner updated | **Pass** |
| ST-04 | AC-14 | same | assign active Administrator | allowed per matrix | **Pass** |
| ST-05 | AC-14 | same | assign inactive user | rejected | **Pass** |
| ST-06 | AC-14 | same | assign Requester as owner | rejected | **Pass** |
| ST-08 | AC-15 | same | update IT Priority | IT Priority changes, Requested Priority unchanged | **Pass** |
| ST-09 | AC-15 | same | invalid IT Priority | `400`, no mutation | **Pass** |
| ST-10 | AC-16 | same | each permitted status transition | succeeds | **Pass** |
| ST-11 | AC-16 | same | each representative forbidden/self transition | `409`, status unchanged | **Pass** |
| ST-12 | AC-16 | same | unknown status string | `400` | **Pass** |
| ST-13 | AC-20/11 | same | detail after indication then transition to Reopened | indication visible before reopen, cleared after reopen | **Pass** |
| ST-14 | AC-20 | same | historical null IT Priority | safe `null`/Not recorded, no crash | **Pass** |

## 10. Internal Notes API Tests

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| NOTE-01 | AC-18 | `comments-notes.api.test.ts` | IT Staff posts Internal Note | `201`, backend author/time | **Pass** |
| NOTE-02 | AC-18 | same | IT Staff reads notes | chronological list | **Pass** |
| NOTE-03 | AC-18 | same | Administrator reads/posts notes | allowed | **Pass** |
| NOTE-04 | AC-18 | same | Requester direct GET notes | `403`, no content | **Pass** |
| NOTE-05 | AC-18 | same | Requester direct POST note | `403` | **Pass** |
| NOTE-06 | AC-19 | same | blank/whitespace note | `400` | **Pass** |
| NOTE-07 | AC-19 | same | 2,000/2,001 char boundary | accepted/rejected respectively | **Pass** |
| NOTE-08 | AC-18 | same | page/pageSize pagination, duplicate/unsafe pagination query | deterministic chronological page + metadata; invalid input `400` | **Pass — review regression** |

## 11. Administrator API Tests

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| ADM-01 | AC-21 | `users-admin.api.test.ts` | list users | safe fields only; no hashes | **Pass** |
| ADM-02 | AC-21 | same | search name | matching list | **Pass** |
| ADM-03 | AC-21 | same | search email | matching list | **Pass** |
| ADM-04 | AC-21 | same | role filter | matching role | **Pass** |
| ADM-05 | AC-22 | same | create valid Requester/IT Staff/Admin | exactly one role, initial-password flag true | **Pass** |
| ADM-06 | AC-22 | same | duplicate email different case | `409`, no duplicate row | **Pass** |
| ADM-07 | AC-22 | same | invalid role | `400` | **Pass** |
| ADM-08 | AC-22 | same | invalid name/email/password | field validation | **Pass** |
| ADM-09 | AC-23 | same | edit name/email | updated safe user | **Pass** |
| ADM-10 | AC-23 | same | change role with valid safety state | updated | **Pass** |
| ADM-11 | AC-23 | same | activate/deactivate normal user | updated | **Pass** |
| ADM-12 | AC-24 | same | Admin deactivates self | `409`, still active | **Pass** |
| ADM-13 | AC-25 | `admin-user-operations.unit.test.ts` + route integration path | deactivate last active Admin | `409`, still active | **Pass** |
| ADM-14 | AC-25 | same | change last active Admin to non-Admin | `409` | **Pass** |
| ADM-15 | AC-23 | `users-admin.api.test.ts` | set new initial password | flag true; old sessions invalidated | **Pass** |
| ADM-16 | AC-23 | same | target user logs in with new initial password | must change before normal app | **Pass** |
| ADM-17 | AC-26 | `users-admin.api.test.ts` | Requester/IT Staff hit admin list/create/edit | `403` | **Pass** |
| ADM-18 | AC-31 | `users-admin.api.test.ts` | deactivate an IT Staff/Admin who currently owns ≥1 Ticket | `409 ASSIGNED_TICKETS_REQUIRE_REASSIGNMENT`; user remains active and Ticket owner unchanged | **Pass** |
| ADM-19 | AC-31 | same | change an assigned IT Staff/Admin role to `REQUESTER` | same `409`; role and Ticket owner unchanged until Tickets are reassigned | **Pass** |
| ADM-20 | AC-32 | `users-admin.api.test.ts` | concurrently assign an unassigned Ticket to eligible user X and deactivate X | at most one state-changing operation succeeds; final DB state is either assigned+active or unassigned+inactive, never assigned+inactive | **Pass** |
| ADM-21 | AC-32 | same | concurrently assign an unassigned Ticket to eligible user X and demote X to `REQUESTER` | at most one state-changing operation succeeds; final DB state is either assigned+eligible-role or unassigned+Requester, never Ticket owned by Requester | **Pass** |
| ADM-22 | AC-32 | same | concurrently reassign a Ticket to eligible user X while Admin deactivates or demotes X | one side conflicts as required; final non-null owner always remains active IT Staff/Admin | **Pass** |

## 12. Migration / Seed / Regression Tests

| ID | AC | Planned file / method | Scenario | Expected | Final |
|---|---|---|---|---|---|
| MIG-01 | AC-27 | manual isolated PostgreSQL rehearsal; fixture `server/tests/lab-03/fixtures/lab2-migration-preservation.sql`; exact commands in §18 | apply Lab 3 migration to a disposable DB after the four Lab 1/Lab 2 migrations | migration succeeds from the Lab 2 schema | **Pass — manual isolated PostgreSQL evidence** |
| MIG-02 | AC-27 | same manual rehearsal | compare Ticket count before/after | unchanged | **Pass — 2 → 2** |
| MIG-03 | AC-27 | same manual rehearsal | compare Attachment count/removal metadata | unchanged; removed reason retained | **Pass — 2 → 2; removal metadata retained** |
| MIG-04 | AC-27 | same manual rehearsal | verify each `DevelopmentRequester` becomes `User` with the exact same numeric id and each old Ticket still points to that id/logical email/name | numeric and logical ownership preserved | **Pass — exact ids 1/2 preserved** |
| MIG-05 | AC-27 | same manual rehearsal | non-null Requested Priority → initial IT Priority | copied | **Pass — High → High** |
| MIG-06 | AC-27 | same manual rehearsal | historical null Requested Priority | remains readable; IT Priority null | **Pass** |
| MIG-07 | AC-28 | `seed-regression.test.ts` | run seed twice | no duplicate users/reference rows | **Pass** |
| MIG-08 | AC-28 | `seed-regression.test.ts` | account counts | ≥4 active + 1 inactive Requester; ≥3 active + 1 inactive Staff; ≥1 active Admin | **Pass** |
| MIG-09 | AC-28 | `seed-regression.test.ts` | seeded Tickets/comments/notes | realistic distribution; assigned and unassigned Tickets both present; no sensitive content | **Pass** |
| MIG-10 | AC-28 | `seed-regression.test.ts` | seed once → mutate seeded password/role/active state/Ticket status-owner-priority → seed again | no duplicate rows and mutable state is not reset to original demo values | **Pass** |
| MIG-11 | AC-27 | manual isolated PostgreSQL rehearsal; fixture `server/tests/lab-03/fixtures/lab2-email-collision.sql`; exact commands in §18 | Lab 2-shaped DB contains two distinct Development Requesters whose emails collide after trim+lowercase | migration aborts explicitly before User/Ticket mutation; no silent merge/overwrite/partial ownership rewrite | **Pass — manual isolated collision preflight evidence** |
| MIG-12 | AC-27 | manual injected-failure rehearsal in §18 | force a SQL error after the Lab 3 migration has already created/copied/altered data but before `COMMIT` | whole migration transaction rolls back: no `User` table, original `DevelopmentRequester` + Ticket/Attachment rows remain, no Lab 3 Ticket columns survive | **Pass — manual post-mutation rollback evidence** |
| REG-01 | AC-08/09 | existing Lab 2 server suite adapted/retained + Lab 3 Requester regression tests | full Requester regression under authenticated session identity | green | **Pass — included in final 162/162 server tests** |
| REG-02 | AC-08/09 | existing Lab 2 client suite adapted/retained + Lab 3 Requester UI tests | Requester UI regression under authenticated shell | green | **Pass — included in final 75/75 client tests** |

## 13. Client UI Tests

### 13.1 Login

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-AUTH-01 | AC-01 | `Login.test.tsx` | render | email/password/sign-in labels | **Pass** |
| UI-AUTH-02 | AC-02 | same | invalid input | field validation; no request | **Pass** |
| UI-AUTH-03 | AC-01 | same | submit pending | button disabled + busy text | **Pass** |
| UI-AUTH-04 | AC-02 | same | `401` | generic error | **Pass** |
| UI-AUTH-05 | AC-03 | same | inactive response | safe inactive feedback | **Pass** |
| UI-AUTH-06 | AC-02 | same | `429` | rate-limit feedback | **Pass** |
| UI-AUTH-07 | AC-29 | same | `500` | safe failure; email preserved, password cleared/prevented exposure | Planned |

### 13.2 Change Password

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-PWD-01 | AC-04 | `ChangePassword.test.tsx` | mandatory mode | rule guidance + Logout; normal nav absent | **Pass** |
| UI-PWD-02 | AC-04 | same | mismatch/weak password | inline validation | **Pass** |
| UI-PWD-03 | AC-04 | same | valid submit busy/success | continue to role app | **Pass** |
| UI-PWD-04 | AC-04 | same | server validation/failure | safe feedback | **Pass** |
| UI-PWD-05 | AC-05 | same | mandatory-mode Logout API failure | remain authenticated/in password-change gate; show retryable logout failure | **Pass** |

### 13.3 Authenticated Shell

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-SHELL-01 | AC-06 | `AuthenticatedShell.test.tsx` | Requester | only Requester nav + name/role/logout | **Pass** |
| UI-SHELL-02 | AC-06 | same | IT Staff | Staff nav; no Admin Users | **Pass** |
| UI-SHELL-03 | AC-06 | same | Admin | Admin Users + approved destinations | Planned |
| UI-SHELL-04 | AC-05 | same | logout | auth state cleared/login rendered | **Pass** |
| UI-SHELL-05 | AC-04 | `Login.test.tsx` + `ChangePassword.test.tsx` | must-change account | Change Password gate | **Pass** |
| UI-SHELL-06 | AC-05/29 | `AuthenticatedShell.test.tsx` | Logout API rejects / revoke not confirmed | authenticated UI remains; explicit retryable failure; no false Login state | **Pass** |

### 13.4 Requester Ticket Detail Extensions

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-REQ-01 | AC-10 | `RequesterTicketDetail.test.tsx` | comments render | author/role/time/content | **Pass** |
| UI-REQ-02 | AC-10/19 | same | blank comment | inline validation; no API post | **Pass** |
| UI-REQ-03 | AC-10 | same | comment post failure | content preserved | **Pass** |
| UI-REQ-04 | AC-11 | same | appears-resolved confirmation | explains not formal close | **Pass** |
| UI-REQ-05 | AC-11 | same | indicated state | timestamp badge; status independent | **Pass** |

### 13.5 Staff Queue

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-Q-01 | AC-12/13 | `StaffTicketQueue.test.tsx` | realistic data | required columns/badges/owner/open action | **Pass** |
| UI-Q-02 | AC-12 | same | search/filter/sort | API params updated/reset page | **Pass** |
| UI-Q-03 | AC-12 | same | pagination | metadata/buttons correct | **Pass** |
| UI-Q-04 | AC-13 | same | unassigned | explicit Unassigned label | **Pass** |
| UI-Q-05 | AC-29 | same | loading | loading feedback | **Pass** |
| UI-Q-06 | AC-29 | same | empty | queue empty state | **Pass** |
| UI-Q-07 | AC-29 | same | no results | clear-filter CTA | **Pass** |
| UI-Q-08 | AC-29 | same | failure/forbidden | safe states | **Pass** |

### 13.6 Staff Ticket Detail

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-ST-01 | AC-20 | `StaffTicketDetail.test.tsx` | render | read-only requester vs editable operations clearly separated | **Pass** |
| UI-ST-02 | AC-14 | same | claim/reassign | controls call correct APIs + busy states | **Pass** |
| UI-ST-03 | AC-15 | same | IT Priority | Requested stays read-only; IT editable | **Pass** |
| UI-ST-04 | AC-16 | same | status options | only allowed next statuses offered | **Pass** |
| UI-ST-05 | AC-17/18 | same | Public vs Internal | explicit visible/private labels and distinct sections | **Pass** |
| UI-ST-06 | AC-19 | same | blank note/comment | validation | **Pass** |
| UI-ST-07 | AC-20 | same | attachments | active/removed continuity | **Pass** |
| UI-ST-08 | AC-20 | same | Requester resolution indication | visible without auto status mutation | **Pass** |
| UI-ST-09 | AC-29 | same | conflict/failure | safe feedback + refresh/retry path | **Pass** |

### 13.7 Administrator User Management

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-ADM-01 | AC-21 | `UserManagement.test.tsx` | list | Name/Email/Role/Status/Edit | **Pass** |
| UI-ADM-02 | AC-21 | same | search/filter | visible results update | **Pass** |
| UI-ADM-03 | AC-22 | same | create form | required controls + one-role select + initial password | **Pass** |
| UI-ADM-04 | AC-22 | same | duplicate/invalid | field/conflict feedback | **Pass** |
| UI-ADM-05 | AC-23 | same | edit | name/email/role/active save | **Pass** |
| UI-ADM-06 | AC-23 | same | set initial password | separate flow + success indicator | **Pass** |
| UI-ADM-07 | AC-24 | same | self-deactivation conflict | clear blocked feedback | **Pass** |
| UI-ADM-08 | AC-25 | same | last-admin conflict | clear blocked feedback | **Pass** |
| UI-ADM-09 | AC-29 | same | loading/empty/failure | meaningful states | **Pass** |
| UI-ADM-10 | AC-31 | same | assigned owner deactivation/demotion conflict | clear `reassign tickets first` feedback; edited user state is not falsely shown as saved | **Pass** |

## 14. End-to-End Tests

| ID | AC | Planned file | Browser flow | Expected | Final |
|---|---|---|---|---|---|
| E2E-AUTH-01 | AC-01–06 | `authentication.spec.ts` | invalid login → valid initial login → mandatory change → role app → logout → direct access | each auth boundary enforced | **Pass** |
| E2E-AUTH-02 | AC-03/29 | same | inactive login + simulated safe backend failure | visible safe feedback | **Pass** |
| E2E-REQ-01 | AC-07–11 | `e2e/lab-03/requester-regression.spec.ts` with `playwright.lab3.config.ts` | login Requester → mandatory password change → create → list/search → detail → attachment upload/download → public comment → appears resolved → logout | Lab 2 behavior + Lab 3 extension works under authenticated identity | **Pass** |
| E2E-REQ-02 | AC-07/09 | same | second Requester searches for first Requester's Ticket, then directly requests first Requester's Ticket/Attachment using the second Requester's browser session | UI shows no result; direct Ticket and Attachment requests return `404` | **Pass** |
| E2E-STAFF-01 | AC-12–20 | `staff-ticket-flow.spec.ts` | login Staff → Queue search/filter → open → claim/reassign → priority → status → Public Comment → Internal Note → attachment | operational flow works | **Pass** |
| E2E-STAFF-02 | AC-16/18 | same | direct forbidden transition / Requester note endpoint evidence | backend rejects safely | **Pass** |
| E2E-ADMIN-01 | AC-21–26 | `user-administration.spec.ts` | login Admin → search → create user → edit → initial password reset → new user forced change | Admin flow works | **Pass** |
| E2E-ADMIN-02 | AC-24–26/31 | same | self-deactivate + last-admin protection + assigned-owner deactivate/demote + non-Admin direct access | safe blocks visible/API enforced; owner invariant preserved | **Pass** |

## 15. Responsive / Accessibility / Visual Tests

| ID | AC | Evidence target | Check | Final |
|---|---|---|---|---|
| V-01 | AC-30 | Login/Change Password 1280/820/390 | no clipping/overflow; focus/labels | **Pass** |
| V-02 | AC-30 | Requester major screens 1280/820/390 | Lab 2 responsive behavior preserved | **Pass** |
| V-03 | AC-30 | `staff-queue-responsive.spec.ts` at 1280/820/390 | table/card adaptation; badges readable; no horizontal overflow | **Pass** |
| V-04 | AC-30 | Staff Detail 1280/820/390 | controls/comments/notes/attachments no overlap | **Pass** |
| V-05 | AC-30 | `user-management-responsive.spec.ts` at 1280/820/390 | list/form adaptation no horizontal overflow | **Pass** |
| V-06 | AC-30 | all major forms | labels, validation placement, visible focus | **Pass** |
| V-07 | AC-30 | badges | role/status/priority meaning not colour-only | **Pass** |
| V-08 | AC-30 | communication | Public vs Internal distinction includes explicit text | **Pass** |

## 16. Acceptance Criteria → Planned Test Traceability

| AC | Planned test IDs |
|---|---|
| AC-01 | AUTH-01, AUTH-10, UI-AUTH-01, UI-AUTH-03, E2E-AUTH-01 |
| AC-02 | U-01, AUTH-02, AUTH-03, AUTH-12, AUTH-13, UI-AUTH-04, UI-AUTH-06 |
| AC-03 | AUTH-04, AUTH-15, UI-AUTH-05, E2E-AUTH-02 |
| AC-04 | U-02–U-06, AUTH-05–AUTH-08, AZ-07, UI-PWD-01–04, E2E-AUTH-01 |
| AC-05 | AUTH-09, AUTH-11, UI-SHELL-04, E2E-AUTH-01 |
| AC-06 | AUTH-14, AUTH-16, AZ-01–AZ-07, AZ-14, UI-SHELL-01–05, E2E-AUTH-01 |
| AC-07 | AZ-09, AZ-10, REQ-03, E2E-REQ-02 |
| AC-08 | REQ-01–REQ-06, REG-01, REG-02, E2E-REQ-01 |
| AC-09 | AZ-11, REQ-07–REQ-12, REG-01/02, E2E-REQ-01/02 |
| AC-10 | COM-01–COM-03, UI-REQ-01–03, E2E-REQ-01 |
| AC-11 | COM-08–COM-13, ST-13, UI-REQ-04/05, E2E-REQ-01 |
| AC-12 | U-11/12, Q-01–Q-11, UI-Q-01–03, E2E-STAFF-01 |
| AC-13 | Q-07/08/12, UI-Q-01/04, E2E-STAFF-01 |
| AC-14 | ST-02–ST-06, UI-ST-02, E2E-STAFF-01 |
| AC-15 | REQ-13, ST-08/09, UI-ST-03, E2E-STAFF-01 |
| AC-16 | U-09/10, ST-10–ST-12, UI-ST-04/09, E2E-STAFF-01/02 |
| AC-17 | COM-04/05, UI-ST-05, E2E-STAFF-01 |
| AC-18 | AZ-08, NOTE-01–NOTE-05, UI-ST-05, E2E-STAFF-01/02 |
| AC-19 | U-07/08, COM-06/07, NOTE-06/07, UI-REQ-02, UI-ST-06 |
| AC-20 | AZ-12/13, ST-01/13/14, UI-ST-01/07/08, E2E-STAFF-01 |
| AC-21 | ADM-01–04, UI-ADM-01/02, E2E-ADMIN-01 |
| AC-22 | ADM-05–08, UI-ADM-03/04, E2E-ADMIN-01 |
| AC-23 | ADM-09–11/15/16, UI-ADM-05/06, E2E-ADMIN-01 |
| AC-24 | ADM-12, UI-ADM-07, E2E-ADMIN-02 |
| AC-25 | ADM-13/14, UI-ADM-08, E2E-ADMIN-02 |
| AC-26 | AZ-03–05, ADM-17, E2E-ADMIN-02 |
| AC-27 | MIG-01–MIG-06, MIG-11, MIG-12, REG-01/02 |
| AC-28 | MIG-07–MIG-10 |
| AC-29 | UI-AUTH-07, UI-Q-05–08, UI-ST-09, UI-ADM-09, E2E-AUTH-02 |
| AC-30 | V-01–V-08 plus responsive checks inside all four E2E files |
| AC-31 | ADM-18/19, UI-ADM-10, E2E-ADMIN-02 |
| AC-32 | ADM-20–ADM-22 |

## 17. Issue → Test Focus

| Issue | Required test focus before PR approval |
|---|---|
| #33 Issue 1 | Contract/traceability review only; no implementation pass claim. |
| #34 Issue 2 | U-01–06, AUTH-01–16, key AZ tests, MIG foundation. |
| #35 Issue 3 | REQ-01–13, COM Requester tests, Requester UI/E2E regression. |
| #36 Issue 4 | Q-01–12, UI-Q suite, Queue responsive evidence. |
| #37 Issue 5 | ST/NOTE/COM staff tests, owner-invariant concurrency coverage with Issue 6, UI-ST, Staff E2E. |
| #38 Issue 6 | ADM suite including assigned-owner race tests, UI-ADM, Admin E2E. |
| #39 Issue 7 | full AZ/security, migration/regression, all E2E, visual/accessibility/build. |
| #40 Issue 8 | final main-ready rerun + evidence/status update only. |

## 18. Baseline and Final Regression Recording

### Lab 2 baseline before Lab 3 implementation

Verified Sprint 3 starting baseline:

- Git `main` is at Lab 2 final release commit `e8e37957dc8dfad95d7ad90e640a00b51e2234e1`.
- The DB-backed verification used a **disposable isolated Docker Compose project** named `toktickit-lab3-baseline` with a fresh PostgreSQL volume exposed on local port `5434`. The existing development database/container was not reset, migrated, or deleted.
- All four existing Lab 1/Lab 2 Prisma migrations applied successfully to the clean baseline database.
- The existing Lab 2 seed ran successfully twice with the same logical counts: **4 Categories, 7 Related Systems, 5 Development Requesters (4 active)**, providing an idempotency smoke check for the inherited seed.
- Server Vitest/Supertest baseline: **49/49 passed (7/7 test files)** against the isolated database.
- Client Vitest baseline: **25/25 passed (5/5 test files)**.
- Server TypeScript build: **Pass**.
- Client production build: **Pass**.
- Prisma schema validation: **Pass**.
- The earlier `500` API failures observed while Docker/PostgreSQL was unavailable were therefore confirmed to be an environment precondition problem rather than a Lab 2 code regression.
- The isolated baseline containers/volumes were removed after verification, leaving the user's existing development database untouched.

This is the comparison point for Issues 2–8. Any later regression claim must distinguish failures introduced by Lab 3 changes from test-environment failures.

### Issue 2 verification — User migration, authentication, and authorization foundation

Issue #34 was verified against a **disposable PostgreSQL 16 container** named `toktickit-lab3-issue2-pg` exposed on local port `5434`; final verification did not reset or delete the existing development database.

#### Reproducible manual migration rehearsal used for PR #42 re-review

`MIG-01`–`MIG-06` and `MIG-11` are **manual isolated PostgreSQL evidence**, not an automated `migration-regression.test.ts` result on the Issue 2 branch. The committed fixtures are:

- `server/tests/lab-03/fixtures/lab2-migration-preservation.sql`
- `server/tests/lab-03/fixtures/lab2-email-collision.sql`

The re-review rehearsal was repeated on a fresh PostgreSQL 16 container using local port `5435` so it could not touch the development database. From the repository root in PowerShell:

```powershell
$name = 'toktickit-lab3-pr42-review-pg'
docker run --name $name `
  -e POSTGRES_USER=toktickit `
  -e POSTGRES_PASSWORD=toktickit `
  -e POSTGRES_DB=toktickit `
  -p 5435:5432 -d postgres:16

do {
  Start-Sleep -Milliseconds 500
  docker exec $name pg_isready -U toktickit
} until ($LASTEXITCODE -eq 0)

docker exec $name psql -U toktickit -d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE tok_preserve;'
docker exec $name psql -U toktickit -d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE tok_collision;'

$lab2Migrations = @(
  'server/prisma/migrations/20260815040049_init/migration.sql',
  'server/prisma/migrations/20260827125959_lab2_dev_requester_context/migration.sql',
  'server/prisma/migrations/20260904123000_attachment_removal_reason/migration.sql',
  'server/prisma/migrations/20260904160000_ticket_requested_priority/migration.sql'
)

foreach ($db in @('tok_preserve', 'tok_collision')) {
  foreach ($file in $lab2Migrations) {
    Get-Content -Raw $file |
      docker exec -i $name psql -U toktickit -d $db -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "Lab 2 migration failed: $file" }
  }
}

Get-Content -Raw server/tests/lab-03/fixtures/lab2-migration-preservation.sql |
  docker exec -i $name psql -U toktickit -d tok_preserve -v ON_ERROR_STOP=1

Get-Content -Raw server/tests/lab-03/fixtures/lab2-email-collision.sql |
  docker exec -i $name psql -U toktickit -d tok_collision -v ON_ERROR_STOP=1

Get-Content -Raw server/prisma/migrations/20260915040000_lab3_user_auth_foundation/migration.sql |
  docker exec -i $name psql -U toktickit -d tok_preserve -v ON_ERROR_STOP=1
```

The preservation query used after migration was:

```sql
SELECT u."id", u."name", u."email", u."role", u."isActive", u."mustChangePassword",
       t."id" AS ticket_id, t."requesterId", t."requestedPriority", t."itPriority", t."status"
FROM "User" u
LEFT JOIN "Ticket" t ON t."requesterId" = u."id"
ORDER BY u."id", t."id";

SELECT "id", "fileName", "removedAt" IS NOT NULL AS removed, "removalReason", "ticketId"
FROM "Attachment"
ORDER BY "id";

SELECT (SELECT COUNT(*) FROM "User") AS users,
       (SELECT COUNT(*) FROM "Ticket") AS tickets,
       (SELECT COUNT(*) FROM "Attachment") AS attachments;
```

Observed result: requester ids `1`/`2` became User ids `1`/`2`; Ticket requester ids stayed `1`/`2`; `High` copied to IT Priority while the historical null stayed null; the removed attachment retained `Duplicate upload`; counts were **2 Users / 2 Tickets / 2 Attachments**.

For the collision case, the exact failure/rollback check was:

```powershell
$lab3Migration = Get-Content -Raw server/prisma/migrations/20260915040000_lab3_user_auth_foundation/migration.sql
$lab3Migration |
  docker exec -i $name psql -U toktickit -d tok_collision -v ON_ERROR_STOP=1
$collisionExit = $LASTEXITCODE
if ($collisionExit -eq 0) { throw 'Expected normalized-email collision migration to fail' }

@"
SELECT to_regclass('public."User"') AS user_table,
       to_regclass('public."DevelopmentRequester"') AS dev_requester_table,
       (SELECT COUNT(*) FROM "DevelopmentRequester") AS dev_requesters;
"@ | docker exec -i $name psql -U toktickit -d tok_collision -v ON_ERROR_STOP=1 -P pager=off

docker rm -f $name
```

It exited non-zero with `LAB3_MIGRATION_EMAIL_COLLISION`. The follow-up query returned no `User` table, the original `DevelopmentRequester` table still present, and **2** source requester rows, confirming the preflight failed before Lab 3 mutation. The disposable container was then removed.

#### Round 2 safety re-review — isolated test target + whole-migration rollback

The second PR #42 re-review identified two repository-safety gaps. Both were reworked and re-verified against a fresh PostgreSQL 16 container named `toktickit-lab3-pr42-r2-pg` on local port `5435`; the normal development database on port `5432` was not migrated, reset, seeded, or deleted.

- **Test-database guard:** `npm test` now starts through `server/scripts/run-tests.ts`. Before Vitest/Prisma starts, it requires `TEST_DATABASE_URL`, requires the database name to contain `test`, rejects a test target that resolves to the same host/port/database/schema as the development `DATABASE_URL`, preserves the development URL only for comparison, then switches `DATABASE_URL` to the approved test target. `getPrisma()` repeats the same safety configuration for direct Vitest/test-seed processes before creating a Prisma client.
- `.env.example` now documents a distinct `TEST_DATABASE_URL`, and `test-database-guard.unit.test.ts` covers missing target, non-test database name, dev/test collision (including `localhost` vs `127.0.0.1`), and the valid switch case.
- Manual fail-fast checks of the real test launcher returned exit code `1` for all three unsafe cases: missing `TEST_DATABASE_URL`, database name `scratch`, and a test URL resolving to the same database/schema as the development URL. No Vitest suite/Prisma connection started in those rejected cases.
- **Whole migration transaction:** `20260915040000_lab3_user_auth_foundation/migration.sql` now explicitly wraps the complete preflight → schema/data copy → FK changes → verification → old-table removal sequence in `BEGIN; ... COMMIT;`.

To prove rollback after mutation had already begun, the Lab 2 schema + preservation fixture were loaded into `tok_rollback_test`, then the committed migration text was used with a temporary in-memory fault inserted immediately before its final `COMMIT`:

```powershell
$name = 'toktickit-lab3-pr42-r2-pg'
$migration = Get-Content -Raw server/prisma/migrations/20260915040000_lab3_user_auth_foundation/migration.sql
$faulted = [regex]::Replace(
  $migration,
  '(?m)^COMMIT;\s*$',
  "SELECT 1 / 0;`nCOMMIT;"
)

$faulted |
  docker exec -i $name psql -U toktickit -d tok_rollback_test -v ON_ERROR_STOP=1
$rollbackExit = $LASTEXITCODE
if ($rollbackExit -eq 0) { throw 'Expected injected post-mutation failure' }

@"
SELECT to_regclass('public."User"') AS user_table,
       to_regclass('public."DevelopmentRequester"') AS dev_requester_table,
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name='Ticket' AND column_name='ownerId'
       ) AS owner_column_exists,
       (SELECT COUNT(*) FROM "DevelopmentRequester") AS dev_requesters,
       (SELECT COUNT(*) FROM "Ticket") AS tickets,
       (SELECT COUNT(*) FROM "Attachment") AS attachments;
"@ | docker exec -i $name psql -U toktickit -d tok_rollback_test -v ON_ERROR_STOP=1 -P pager=off
```

The injected failure occurred only **after** the migration had already executed `CREATE TYPE`, `CREATE TABLE`, data copy, Ticket `ALTER/UPDATE`, FK changes, comment/note tables, verification, and `DROP TABLE "DevelopmentRequester"` inside the open transaction. PostgreSQL then disconnected on the deliberate division-by-zero error and rolled the transaction back. The verification result was: `User` table absent, `DevelopmentRequester` present, `ownerId` column absent, and original counts still **2 Development Requesters / 2 Tickets / 2 Attachments**. The disposable `toktickit-lab3-pr42-r2-pg` container was removed after the final verification; the existing development PostgreSQL container remained running and untouched.

The same transaction-wrapped migration also passed the normal preservation rehearsal: exact requester ids `1`/`2`, Ticket ownership, removal metadata, and priority/null behavior were unchanged. The normalized-email collision case still failed before mutation and rolled back cleanly.

- **Lab 2-shaped migration preservation:** a disposable database was built from the four inherited Lab 1/Lab 2 migrations, then populated with 2 Development Requesters, 2 Tickets, and 2 Attachments before applying `20260915040000_lab3_user_auth_foundation`.
  - Development Requester numeric ids `1` and `2` became `User.id` `1` and `2` exactly.
  - Both Ticket rows retained the same `requesterId` values and statuses.
  - The non-null historical Requested Priority `High` produced initial IT Priority `High`; the null historical Requested Priority kept IT Priority null.
  - Attachment count remained **2 → 2**, including the pre-existing `removedAt`/`Duplicate upload` removal metadata.
  - The migrated initial requester hash successfully verified against the documented local-only `RequesterInit123` credential and `mustChangePassword=true`.
- **Normalized-email collision preflight:** a separate Lab 2-shaped database containing `Test.User@TokTick.IT` and ` test.user@toktick.it ` aborted with `LAB3_MIGRATION_EMAIL_COLLISION` before the `User` table or any Lab 3 mutation was created. No silent merge/overwrite occurred.
- **Clean migration + seed:** a fresh isolated test database applied all five migrations successfully. The seed then ran repeatedly with the same required logical result: **4 active + 1 inactive Requester, 3 active + 1 inactive IT Staff, 2 active Administrators, 3 demo Tickets, 2 Public Comments, and 1 Internal Note**. The three canonical demo Tickets include both **assigned and unassigned** ownership, and the seed regression asserts both states exist.
- **Seed state preservation:** automated `MIG-10` mutates a seeded password hash/role/activation state and Ticket status/owner/IT Priority, reruns the seed, and confirms the mutable state is not reset. Seed tests also verify the documented local Requester/Staff/Admin initial credentials against their bcrypt cost-12 hashes.
- **Authentication/security:** `AUTH-01–AUTH-16` pass, including generic invalid credentials, inactive-account denial, mandatory password change, old-session invalidation/rotation, absolute 8-hour session expiry, login rate limiting, inactive-session invalidation, and wrong/missing/`null` Origin rejection. Origin checks now run before all currently implemented state-changing routes: auth mutations plus legacy Requester Ticket creation, attachment upload, and attachment soft-remove. Session JSON never exposes password hashes/tokens; the cookie is `HttpOnly`, `SameSite=Lax`, and the database stores only SHA-256 token hashes.
- **Authorization foundation:** password-change gating and authenticated-only Categories/Related Systems pass direct API tests, including the legacy `/api/categories` alias that previously bypassed the Lab 3 reference-data rule; reusable role middleware is covered. Requester ownership/session conversion remains intentionally scoped to Issue #35, so the Lab 2 development-requester compatibility bridge is temporary rather than being misreported as final Lab 3 ownership behavior.
- Server Vitest/Supertest: **80/80 passed (12/12 test files)** against `TEST_DATABASE_URL` after the second PR #42 safety-review fixes, including the 4 test-target guard cases.
- Client Vitest regression: **25/25 passed (5/5 test files)**.
- Server TypeScript build: **Pass**.
- Client production build: **Pass**.
- Prisma schema validation: **Pass**.
- Production dependency audit (`npm audit --omit=dev`): **0 vulnerabilities reported** after using `bcrypt` 6 and current compatible Express transitive patches. Development-tool audit findings are not claimed resolved by Issue 2 and do not alter this production-dependency result.
- Hosted CI: **not claimed green here**; use the actual PR check result after the Issue 2 PR exists.

### Issue 3 verification — Authenticated Requester & Lab 2 regression

Issue #35 was verified with the existing development PostgreSQL database left untouched. DB-backed server tests used the disposable PostgreSQL 16 container `toktickit-lab3-issue3-test` on local port `5435` and the isolated database `toktickit_test_issue3`. The final browser run used a separately created fresh database `toktickit_e2e_issue3_20260915d` in the same disposable container plus an isolated SeaweedFS Compose project named `toktickit-lab3-issue3-e2e`.

Final Issue 3 evidence:

- **Authenticated Requester ownership:** `requester-regression.api.test.ts` proves session identity wins over client-supplied `requesterId` values in body/query and over the retired `X-Dev-Requester-Id` header. The header alone cannot authenticate, and `GET /api/v1/requesters` is retired (`404`). Runtime source scan across `client/src` and `server/src` found **0** references to the retired Development Requester selector/header/context/filter path.
- **Lab 2 Requester regression:** adapted create/list/search/filter/sort/pagination/detail/attachment tests now use real authenticated sessions. `REQ-01`–`REQ-13` are green, including attachment capacity/removal concurrency and Requested Priority → initial IT Priority continuity.
- **Public Comments / Requester resolution:** `COM-01`–`COM-09`, `COM-12`, and `COM-13` are green. Requesters are ownership-scoped, comment author/time comes from the backend, blank/over-limit input is rejected, allowed resolution-indication statuses preserve formal Ticket status, repeat indication is idempotent, and terminal statuses return the documented conflict. `COM-10`/`COM-11` remain intentionally planned because the formal Staff status API is Issue #37 scope.
- **Client auth/requester UI:** Login, mandatory Change Password, authenticated shell, Requester Ticket Detail comments, comment-failure draft preservation, and resolution-indication UI are covered. The Login screen intentionally has no Forgot Password action in current scope.
- **Server Vitest/Supertest:** **99/99 passed (15/15 test files)** on the PR #43 Round 1 fix head using an isolated `TEST_DATABASE_URL`. This includes direct shared Ticket-visibility policy tests, Origin/session-gate tests for the new Public Comment / Problem Appears Resolved mutations, concurrent resolution-indication coverage, and expanded direct Attachment-id isolation.
- **Client Vitest:** **46/46 passed (8/8 test files)** after PR #43 Round 2 fixes. Added coverage includes bootstrap-error Retry state, Unicode-decimal password semantics, Unicode-safe Public Comment character counting, authenticated-shell Logout failure, and mandatory-password-change Logout failure.
- **Requester Playwright E2E:** **1/1 passed** using `e2e/playwright.lab3.config.ts`. The flow covers Requester login → mandatory password change → Create Ticket with attachment → My Tickets search → Ticket Detail → attachment download → Public Comment → Problem Appears Resolved without formal status change → responsive no-horizontal-overflow smoke checks → logout → second Requester isolation. The second Requester's browser session receives `404` for direct access to the first Requester's Ticket and active Attachment.
- **E2E default:** running `npm test` from `e2e/` now targets the Lab 3 configuration; the old Lab 2 browser flow is retained only as explicit historical `npm run test:lab2` evidence.
- **Server TypeScript build:** **Pass**.
- **Client production build:** **Pass**.
- **Prisma schema validation:** **Pass**.
- **Production dependency audit:** `npm audit --omit=dev` reports **0 vulnerabilities** for both server and client.
- **PR #43 Round 1 fix final rerun:** Prisma schema validation **Pass**, `git diff --check` **Pass**, production dependency audit **0 vulnerabilities** for server/client, and Lab 3 Requester Playwright E2E **1/1 Pass** on a fresh isolated `toktickit_pr43_r1_e2e` database with isolated SeaweedFS.
- **PR #43 Round 2 logout safety:** client auth state now changes to unauthenticated only after the server Logout call succeeds. `LOGOUT_FAILED`/network failure leaves the authenticated UI/gate intact and shows explicit retryable feedback; tests cover both the normal application shell and mandatory Change Password screen.
- **PR #43 Round 2 retry isolation:** Playwright no longer mutates the canonical seeded Somchai/Somsri credentials. Every test attempt creates a fresh pair of dedicated E2E Requesters through `server/scripts/create-e2e-requesters.ts`; the helper requires an explicit fixture-creation flag and an E2E-marked database name. Because Playwright re-runs `beforeEach` for retries, a failed attempt cannot poison the next attempt's credentials. The full Requester E2E passed **twice consecutively against the same isolated `toktickit_pr43_r2_e2e` database**, proving ordinary reruns start from fresh user state as well.
- **PR #43 Round 2 final rerun:** Server **99/99 (15/15)**, Client **46/46 (8/8)**, Server build **Pass**, Client build **Pass**, Prisma validate **Pass**, `npm audit --omit=dev` **0 vulnerabilities** for both server/client, `git diff --check` **Pass**, and Requester E2E **1/1 Pass** on each of two consecutive runs against the same isolated E2E database.
- **Disposable environment cleanup:** the Issue 3 PostgreSQL container and isolated SeaweedFS containers/volumes/network were removed after verification; the normal development PostgreSQL container/database was not reset or removed.
- **PR #43 peer review:** Round 1 returned **Changes requested** at head `25b191b`. The authorization blocker was fixed by replacing negative role fallback with one shared explicit allow-list Ticket visibility policy used by Public Comments and Attachment download. Reviewer polish items were also addressed with a separate auth-bootstrap error/Retry state, synchronized Unicode decimal-digit password validation, direct Origin/must-change/inactive tests for the new unsafe mutations, concurrent resolution-indication coverage, and expanded direct Attachment-id isolation.
- **Public Comment length clarification:** Round 1 feedback stated that the approved limit was 200 characters, but the approved Issue 1 contract at exact reviewed head `70a682e` states **2,000 characters** in `BR-19` and `D-05`, and `api-spec.md` states trimmed content `1–2,000` characters. Issue 3 therefore keeps the reviewed 2,000-character business rule and fixes the actual counting bug by counting Unicode code points rather than UTF-16 code units on both server and client.
- **PR #43 final review/merge:** `Tanaboonnnnn` approved exact head `01db49d972d981e62778ab9343ea4bc3aeb5be70`; PR #43 was merged into `lab3-staging` as `5261c3c59ae6131e5e607bdcbcc35fe6aff40c69`, and Issue #35 is closed.
- **Hosted CI:** GitHub reported no hosted checks for the approved/merged head, so this evidence does not claim hosted CI was green.

### Issue 4 verification — IT Staff Ticket Queue

Issue #36 was implemented on `feature/4-it-staff-ticket-queue` from the post-Issue-3 `lab3-staging` baseline. Initial pre-review DB-backed verification used a disposable PostgreSQL 16 container named `toktickit-issue4-test` on local port `5435`. PR #44 Round 1 fix verification was rerun from a fresh migration + seed in disposable container `toktickit-pr44-r1-clean` on local port `5436` with database `toktickit_pr44_r1_clean_test`; the normal development PostgreSQL database on port `5432` was not reset or replaced.

Issue 4 evidence after PR #44 Round 1 fixes:

- **Queue API / RBAC:** `GET /api/v1/staff/tickets` requires an authenticated, password-changed `IT_STAFF` or `ADMINISTRATOR` session. Requester access is rejected with `403`; authenticated Staff/Admin access succeeds. `GET /api/v1/staff/assignees` returns active eligible Staff/Admin users for the Owner filter.
- **Queue query contract:** `staffQueueQuery.ts` validates the approved eight Ticket statuses, Requested/IT Priority values, Owner (`unassigned`, `mine`, or an active eligible Staff/Admin user id), Category/System ids, five documented sort modes, page/pageSize, and a trimmed maximum-100-character search. Duplicate query parameters are rejected with `400 VALIDATION_ERROR` instead of silently selecting one value. `U-11/U-12` and `Q-01–Q-12` are green.
- **Search/filter/sort/pagination:** API tests cover Ticket Number, Summary, Requester name/email search; Status, Requested Priority, IT Priority including `not_recorded`, Owner, Category and Related System filters; deterministic sorting; AND semantics; invalid/duplicate-query `400` field errors; and consistent pagination metadata. Standard sorts use database `orderBy/skip/take` inside a transaction with `count`; `priority_desc` uses deterministic High → Medium → Low → unrecorded/other database buckets and never loads the full matching dataset into Node.
- **Owner filter semantics:** `/staff/assignees` exposes only active `IT_STAFF`/`ADMINISTRATOR` users, and explicit `owner=<id>` now accepts only that same eligible set. Requester ids, inactive Staff/Admin ids, and nonexistent ids return `400 VALIDATION_ERROR`.
- **Queue UI:** `StaffTicketQueue.tsx` implements the approved Ticket Queue with search, filters, sort, result count, Requested/IT Priority and Status badges, explicit `Unassigned`, pagination, and Open Ticket action. Staff navigation is enabled without exposing Requester actions. `UI-Q-01–UI-Q-08` and `UI-SHELL-02` are green.
- **Responsive behavior:** `staff-queue-responsive.spec.ts` verifies the desktop table at 1280 px, tablet table at 820 px, mobile cards at 390 px, readable `Unassigned`/Open action context, and no horizontal page overflow. `V-03` is **Pass**.
- **Issue-boundary behavior:** the Queue can open a selected Ticket, but Staff operational Ticket Detail mutations remain intentionally deferred to Issue #37; Issue #36 does not introduce claim/assign/reassign, IT Priority mutation, status mutation, Internal Notes, or Staff attachment mutation controls.
- **Server Vitest/Supertest:** **115/115 passed (17/17 test files)** against the fresh isolated Round 1 `TEST_DATABASE_URL` after migration + seed.
- **Client Vitest:** **54/54 passed (9/9 test files)**.
- **Responsive Playwright:** **1/1 passed** for `V-03` after correcting the test locator to target the visible table/card `Unassigned` indicator rather than the hidden Owner-filter option.
- **Server TypeScript build:** **Pass**.
- **Client production build:** **Pass**.
- **Prisma schema validation:** **Pass**.
- **Production dependency audit:** `npm audit --omit=dev` reports **0 vulnerabilities** for both server and client.
- **PR #44 Round 1 review fixes:** focused Staff Queue tests passed **16/16 (2/2 files)** before the full regression. A first disposable review database was intentionally discarded after an earlier test-fixture sequence advanced reference-data ids; the final full regression was repeated from a fresh migrated/seeded database and passed completely.
- **Diff hygiene:** `git diff --check` **Pass** on the Round 1 fix working tree.
- **Disposable environment cleanup:** both PR #44 Round 1 disposable PostgreSQL containers were removed after verification; the normal development PostgreSQL container/database was not reset or removed.
- **Hosted CI:** no hosted CI result is claimed before the Issue #36 PR reports an actual check.

Representative PR #44 Round 1 final commands (run while the disposable database was available):

```powershell
# Server regression (separate test DB only)
$env:TEST_DATABASE_URL='postgresql://toktickit:toktickit@127.0.0.1:5436/toktickit_pr44_r1_clean_test?schema=public'
cd server
npm test
npm run build
npx prisma validate
npm audit --omit=dev

# Client regression
cd ../client
npm test -- --run
npm run build
npm audit --omit=dev

# Staff Queue responsive browser regression
cd ../e2e
$env:E2E_DATABASE_URL='postgresql://toktickit:toktickit@127.0.0.1:5436/toktickit_pr44_r1_clean_test?schema=public'
npx playwright test lab-03/staff-queue-responsive.spec.ts --config playwright.lab3.config.ts
```

### Issue 5 verification — IT Staff Ticket Detail & Operations

Issue #37 implementation continues on `feature/5-it-staff-ticket-detail` from the merged PR #44 `lab3-staging` baseline. The normal development database was not reset or replaced. DB-backed verification used isolated disposable PostgreSQL only.

Current Issue 5 / PR #45 evidence after reviewer follow-up fixes:

- **Staff Ticket Detail/API:** focused Issue #37 server coverage for operational detail, owner claim/assign/reassign, IT Priority, status transitions, Requester-resolution indication, Internal Notes, Public Comments integration, attachment visibility/download, Origin protection, owner concurrency, and Internal Notes pagination passed **35/35 (3/3 test files)** against an isolated disposable PostgreSQL database.
- **Reviewer timeout follow-up:** server Vitest now uses a **15,000 ms test timeout** for the integration-style server suite. Password hashing cost is unchanged; the fix gives real bcrypt/seed work enough headroom under machine load instead of weakening password security in tests. The final full run showed a seed-regression case taking about **5.96 s**, confirming why the default 5 s limit was marginal.
- **Internal Notes pagination follow-up:** `GET /api/v1/staff/tickets/:id/internal-notes` now supports `page` + `pageSize`, defaults to `1 / 50`, caps page size at `100`, rejects duplicate/invalid/unsafe-large pagination with `400 VALIDATION_ERROR`, and uses database `count + findMany(skip/take)` in one transaction with deterministic `createdAt,id` ordering. The Staff UI requests **20 notes/page** and exposes Previous/Next controls instead of silently loading an unbounded list.
- **Full Server regression:** **138/138 passed (19/19 test files)** on the current reviewer-fix working tree against the isolated test database; Lab 1/Lab 2 and previous Lab 3 behavior remained green.
- **Staff Ticket Detail UI:** `StaffTicketDetail.tsx` implements the approved Zen Green/TokTickIT mockup with clearly separated read-only Requester information and editable operational controls, Claim/Assign/Reassign, Requested-vs-IT Priority, allowed-next-status control, Requester-resolution indication, Public Comments, Internal Notes, and active/removed Attachment continuity. Staff UI exposes download only; it does not expose Requester-only attachment upload/remove controls.
- **UI-ST suite:** the original `UI-ST-01`–`UI-ST-09` coverage remains green and a reviewer-regression pagination case was added; `StaffTicketDetail.test.tsx` now passes **10/10**.
- **Full Client regression:** **64/64 passed (10/10 test files)** on the current reviewer-fix working tree.
- **Responsive V-04:** `staff-ticket-detail-responsive.spec.ts` passed at **1280 / 820 / 390 px**, including operational controls, Public Comments, Internal Notes, Attachments, mobile navigation context, and no horizontal page overflow. `V-04` is **Pass**.
- **Browser Staff UI + responsive smoke:** `staff-ticket-detail-responsive.spec.ts` and `staff-ticket-flow.spec.ts` pass **2/2** after the pagination response change. The flow covers Sign In UI → Ticket Queue search/filter → Ticket Detail → Claim/Reassign → IT Priority → Status → Public Comment → paginated Internal Note integration → active/removed Attachment presentation/download. These project Playwright cases use routed API responses, so they remain supporting UI evidence rather than a new claim of full-stack `E2E-STAFF-01`.
- **Peer full-stack evidence:** reviewer `Peepipat-Suesoongnuen` reported running `E2E-STAFF-01` successfully during the initial PR #45 review. This is recorded as reviewer evidence, distinct from the repository's routed-browser smoke above.
- **Manual Staff workflow verification:** after the automated checks above, the user manually exercised the Issue #37 workflow in the running local application, including creating/opening a Ticket from the Staff queue, operational controls, comments/notes, responsive Ticket Detail presentation, and Attachment upload/download after the local SeaweedFS master/volume/filer services were restored. The user reported the manual verification complete before PR preparation.
- **Server TypeScript build:** **Pass**.
- **Client production build:** **Pass**.
- **Prisma schema validation:** **Pass**.
- **Production dependency audit:** `npm audit --omit=dev` reports **0 vulnerabilities** for both server and client.
- **Initial PR #45 peer review:** `Peepipat-Suesoongnuen` submitted **Approved** on exact head `22672275a96f49303ffe01cc44a0771ce2991172`. The reviewer identified two non-blocking follow-ups: bcrypt/seed tests were timing-marginal under load, and Internal Notes were read with an unbounded `findMany`. Both are addressed in the follow-up working tree described above; re-review is requested after commit/push.
- **Hosted CI:** no hosted CI result is claimed unless GitHub reports an actual check for the current PR head.

### Issue 6 verification — Administrator User Management

Issue #38 implementation is on `feature/6-administrator-user-management` from merge commit `35b5ad77f9072e554ef3c4943e5936e331055306` (PR #45 merged into `lab3-staging`). The normal development database was not reset, migrated, or replaced. DB-backed verification used a fresh disposable PostgreSQL 16 container on local port `5438`.

Current Issue 6 evidence after the approved Administrator UI mockup and implementation:

- **Administrator User Management API:** added Admin-only list/search/role-filter, create, edit, activate/deactivate, and set-new-initial-password endpoints. Responses use safe user fields only; password hashes are never returned.
- **Validation/account lifecycle:** create/edit normalize email with trim + lowercase, enforce case-insensitive uniqueness through normalized storage + the database unique constraint, restrict users to exactly one approved role, validate name/email/activation/password inputs, and set `mustChangePassword=true` for initial-password flows.
- **Session safety:** setting a new initial password invalidates all existing sessions for the target user. Deactivation also deletes existing target sessions; normal auth middleware continues to deny inactive users.
- **Administrator safety:** self-deactivation returns `409 SELF_DEACTIVATION_FORBIDDEN`; helper-backed last-active-Administrator logic blocks a deactivation or demotion that would leave zero active Administrators.
- **Assigned-owner invariant:** deactivation or demotion to `REQUESTER` for a user who still owns Tickets returns `409 ASSIGNED_TICKETS_REQUIRE_REASSIGNMENT` with no user/Ticket mutation. Administrator user mutation serializes on the target user row so it coordinates with the Staff owner mutation protocol introduced in Issue #37.
- **Concurrency coverage:** `ADM-20`–`ADM-22` exercise assign/reassign racing with deactivate/demote. Exactly one competing state change succeeds and final non-null Ticket owners remain active `IT_STAFF`/`ADMINISTRATOR` users.
- **Shared serialization mapping hardening:** Issue #38 race coverage exposed PostgreSQL raw SQLSTATE `40001` arriving through Prisma as `P2010` rather than `P2034`. A shared helper now maps both Prisma `P2034` and raw `40001`/`40P01` retryable conflicts to the existing safe `409` stale-state behavior; this closes the Issue #37 reassign-vs-Admin-change edge case without changing successful owner behavior.
- **Focused Issue #38 tests:** `users-admin.api.test.ts` + `admin-user-operations.unit.test.ts` pass **22/22 (2/2 test files)**, covering `ADM-01`–`ADM-22`, initial-password validation, Origin protection, and owner-eligibility rule checks.
- **Full Server regression:** **160/160 passed (21/21 test files)** against the isolated Issue #38 database; Lab 1/Lab 2 and previous Lab 3 authentication/requester/staff behavior remained green.
- **Server TypeScript build:** **Pass**.
- **Prisma schema validation:** **Pass**.
- **Server production dependency audit:** `npm audit --omit=dev` reports **0 vulnerabilities**.
- **Diff hygiene:** `git diff --check` **Pass**; only repository line-ending normalization warnings were reported.
- **Approved Administrator UI:** the User Management mockup was revised to match the existing TokTickIT Ticket Queue header/Zen Green design and was approved before frontend implementation. Out-of-scope mockup concepts such as Delete User, Department, and Trash were intentionally not implemented because Issue #38 excludes them.
- **Administrator UI:** `UserManagement.tsx` provides Admin-only list/search/role-filter, Create User, Edit User, activation/deactivation confirmation, and a separate Set Initial Password flow. It uses the exact Lab 3 password rules and displays safe conflict feedback for self-deactivation, last-active-Administrator protection, assigned Ticket ownership, duplicate email, and stale state.
- **UI-ADM suite:** `UI-ADM-01`–`UI-ADM-10` pass **10/10** in `UserManagement.test.tsx`. The authenticated-shell regression was updated from the former Administrator placeholder to the real User Management navigation and remains green.
- **Full Client regression:** **74/74 passed (11/11 test files)** after Administrator User Management implementation.
- **Client production build:** **Pass**.
- **Client production dependency audit:** `npm audit --omit=dev` reports **0 vulnerabilities**.
- **Responsive V-05:** `user-management-responsive.spec.ts` passes at **1280 / 820 / 390 px**, including desktop/table/card adaptation, Create User modal behavior, mobile navigation, and no page-level horizontal overflow. `V-05` is **Pass**.
- **Administrator routed-browser smoke:** `user-administration.spec.ts` passes a browser workflow covering Sign In UI → User Management → search/role filter → create → edit → set initial password → assigned-owner deactivation conflict. The test uses routed/mock API responses and is supporting UI interaction evidence only; it does **not** claim full-stack `E2E-ADMIN-01` or `E2E-ADMIN-02` Pass. Those rows remain Planned until run against the real isolated backend/database stack.
- **Manual local verification:** the student manually verified the Administrator login/User Management flow in the local development app after implementation and reported no remaining Issue #38 UI problems before commit/push/PR preparation.

### Issue 7 final integrated verification — Security, Regression, E2E & Visual QA

Issue #39 verification used isolated disposable infrastructure only. PostgreSQL `toktickit_issue7_e2e` ran on local port `5440`, with an isolated SeaweedFS master/volume/filer stack and filer exposed on `18889`. The normal development PostgreSQL/SeaweedFS services were not reset, migrated, or deleted.

- **Security authorization closure:** direct API coverage now marks `AZ-01`, `AZ-03`, `AZ-04`, `AZ-05`, `AZ-08`, `AZ-12`, and `AZ-13` Pass. Staff/Admin active-attachment download is allowed while Staff/Admin attachment upload/soft-remove remains forbidden; Requester Internal Notes access returns `403` without leaking note content.
- **Full Server regression:** **162/162 passed (21/21 files)** on the isolated Issue #39 test database.
- **Full Client regression:** **75/75 passed (11/11 files)**.
- **Full-stack Playwright:** **12/12 passed** in one integrated Lab 3 run, covering Authentication, authenticated Requester regression, Staff workflow/authorization, Administrator workflow/safety, and responsive/accessibility checks.
- **Authentication E2E:** `E2E-AUTH-01/02` Pass, including invalid credentials, mandatory initial-password change, logout/direct-access gating, inactive-account feedback, and bootstrap-failure Retry behavior.
- **Staff full-stack E2E:** `E2E-STAFF-01/02` Pass against the real backend/PostgreSQL/SeaweedFS stack, including Queue search/filter, Ticket Detail, Claim/Reassign, IT Priority, Status, Public Comment, Internal Note, Attachment download, invalid transition rejection, and Requester Internal Notes denial.
- **Administrator full-stack E2E:** `E2E-ADMIN-01/02` Pass against the real backend/database, including search/create/edit/initial-password reset plus self-deactivation, last-active-Administrator, assigned-owner, and non-Admin authorization boundaries.
- **Accessibility review follow-up:** Administrator modals now implement initial focus, Tab/Shift+Tab focus containment, Escape-close, and focus restoration. The modal required-field marker layout was also corrected for mobile presentation.
- **Responsive/visual:** `V-01`–`V-08` are Pass. Automated checks cover 1280/820/390 layouts, no page-level horizontal overflow, labels/validation/focus, text-readable badge meaning, and explicit Public/Internal visibility text. Nine Lab 3 screenshots were regenerated under `artifacts/lab-03/screenshots` and visually inspected for representative Login, Requester, Staff, and Administrator screens.
- **Lab 2-shaped migration preservation rerun:** a fresh disposable database `toktickit_issue7_migration_test` applied the four Lab 1/Lab 2 migrations, loaded the committed preservation fixture, then applied the Lab 3 migration successfully. Final state remained **2 Users / 2 Tickets / 2 Attachments**, with **0 orphan requester references / 0 orphan attachment references**, exact requester ids preserved, `High → High` IT Priority continuity, historical null preserved, and `Duplicate upload` removal metadata retained.
- **Seed regression:** `MIG-07`–`MIG-10` remain green inside the final server suite, including repeated seed behavior and mutable-state preservation.
- **Build/schema/dependencies:** Server build Pass; Client production build Pass; Prisma validate Pass; Prisma migration status reports the Issue #39 E2E database up to date; `npm audit --omit=dev` reports **0 vulnerabilities** for server and client.
- **Manual final verification:** after the final integrated automated run and visual evidence review, the student manually rechecked the running local application across Requester, IT Staff, and Administrator flows, including the Administrator modal keyboard/focus behavior and responsive layouts, and reported the Issue #39 final check complete before commit/push/PR preparation.
- **PR #47 Round 1 E2E database-isolation fix:** reviewer `Tanaboonnnnn` requested removal of the stale `toktickit_e2e_issue3` runtime fallback. Lab 3 Playwright now requires an explicit `E2E_DATABASE_URL` through shared `requireE2eDatabaseUrl()` validation; missing configuration fails with exit code `1` before web-server startup. The fix covers `playwright.lab3.config.ts`, the shared full-stack fixture helper, and the Requester regression entry point. Re-review verification migrated/seeded a fresh disposable `toktickit_pr47_r1_e2e` database on port `5441`, used an isolated SeaweedFS filer on `18890`, and passed the complete Lab 3 Playwright suite **12/12**.
- **Hosted CI:** not claimed green unless GitHub reports an actual check for the PR head.

### Issue 8 release-candidate verification — Final Evidence & Release Readiness

Issue #40 reran the integrated release candidate from merged `lab3-staging` head `580f2b27b974b3425772eba51fe58e7649b7f457` plus the evidence/CI-only Issue #40 working-tree changes. Verification again used disposable infrastructure only; the normal development PostgreSQL/SeaweedFS services were not reset, migrated, or deleted.

- **Isolated infrastructure:** PostgreSQL container `toktickit-issue8-final-pg` exposed local port `5442` with separate databases `toktickit_issue8_test` and `toktickit_issue8_e2e`; isolated SeaweedFS filer was exposed on `18891`.
- **Schema/seed:** all five migrations applied successfully to both databases, both seeds completed successfully, and Prisma migration status reported the E2E database **up to date**.
- **Initial full Server regression before hosted-CI correction:** **162/162 passed (21/21 files)** against `toktickit_issue8_test`.
- **Server build / Prisma:** TypeScript build **Pass**; `prisma validate` **Pass**.
- **Full Client regression:** **75/75 passed (11/11 files)**.
- **Client production build:** **Pass**.
- **Full Lab 3 Playwright:** **12/12 passed** against the real backend + `toktickit_issue8_e2e` + isolated SeaweedFS stack. `E2E-AUTH-01/02`, `E2E-REQ-01/02`, `E2E-STAFF-01/02`, `E2E-ADMIN-01/02`, and `V-01`–`V-08` remain green on the release candidate.
- **Final visual evidence:** the existing nine representative screenshots were regenerated where their routed fixtures ran, and four real boundary/failure screenshots were added: invalid Login, auth-bootstrap Retry state, cross-Requester isolation/no-results, and Administrator assigned-owner conflict. `artifacts/lab-03/screenshots/` now contains **13** final evidence images.
- **Dependency audit caveat:** the Issue #40 `npm audit --omit=dev` attempt could not reach `registry.npmjs.org` (`ENOTFOUND`), so **no Issue #40 audit result is claimed**. The last completed Issue #39 audit remained `0 vulnerabilities`, but it is retained only as historical evidence rather than relabeled as a new Issue #40 result.
- **CI workflow readiness:** `.github/workflows/ci.yml` was updated for Lab 3 safety contracts: `lab3-staging`/manual triggers, explicit `TEST_DATABASE_URL` with a test-marked DB, a dedicated E2E-marked database, server/client builds, Prisma validation, and the current Lab 3 Playwright suite. Hosted CI remains pending until GitHub executes the workflow on the Issue #40 PR head.
- **PR #48 hosted CI Round 1:** Client tests/build/production audit passed. Server migrations, seed, typecheck, Prisma validate, and production audit also passed, but the Server test step failed because the test-database guard was not re-entrant when CI supplied only `TEST_DATABASE_URL`: `run-tests.ts` correctly selected the test database, then the later Prisma lazy-init guard call misread that already-selected `DATABASE_URL` as the development target and rejected it as identical.
- **Hosted-CI guard correction:** `assertSafeTestDatabaseEnvironment()` now ignores the already-selected `DATABASE_URL` as a development candidate only after `TOKTICKIT_TEST_MODE=1`, while a real saved `TOKTICKIT_DEVELOPMENT_DATABASE_URL` still participates in the collision check. `configureTestDatabaseEnvironment()` also avoids capturing the test URL as a development URL during re-entry. Two regression tests cover CI-only `TEST_DATABASE_URL` re-entry and continued rejection of a saved development target that matches the test DB.
- **Post-fix CI-equivalent Server verification:** with `DATABASE_URL` explicitly blank and only `TEST_DATABASE_URL` supplied, focused guard tests **6/6** and the full Server suite **164/164 (21/21 files)** passed; Server build and Prisma validate also passed.
- **PR #48 hosted CI Round 2:** Server and Client jobs both passed completely, including production dependency audits, Server **164/164**, Client **75/75**, builds, Prisma validation, migrations, and seed. The E2E job then exposed a Linux-headless responsive defect at **820 px**: Requester pages kept the three-button desktop navigation plus brand/user menu in one row, making the document horizontally overflow. The failure was reproducible in both the full-stack Requester flow and `V-02/V-06/V-07`; the other 10 Playwright tests passed.
- **Responsive correction after Round 2:** authenticated navigation now switches to the compact menu at `max-width: 991.98px`, while tablet page/table/detail layouts remain unchanged. Playwright navigation helpers use the same breakpoint. No overflow tolerance was added; the existing strict `scrollWidth <= viewport` assertions remain. Focused Requester/visual Playwright passed **3/3**, the full Lab 3 Playwright suite passed **12/12**, and Client regression/build passed **75/75 (11/11) + build** after the correction.
- **PR #48 hosted CI Round 3 on `a2134f2`: PASS.** GitHub Actions run `35329863392` completed successfully with all three jobs green: Server, Client, and E2E. Server included migrations/seed/typecheck/Prisma validation/production dependency audit/**164/164** tests/build; Client included typecheck/**75/75** tests/build/production dependency audit; E2E provisioned its dedicated PostgreSQL/SeaweedFS stack, applied migrations/seed, and passed the full Lab 3 Playwright suite.

### Final Lab 3 regression template

| Check | Final result |
|---|---|
| Server unit/API/integration | **Pass — 164/164 (21/21 files) after hosted-CI guard correction** |
| Client Vitest | **Pass — 75/75 (11/11 files)** |
| Migration from Lab 2-shaped DB | **Pass — Issue #39 isolated preservation rerun; 2 Users / 2 Tickets / 2 Attachments; 0 orphans** |
| Seed idempotency | **Pass — `MIG-07`–`MIG-10` in final server regression** |
| Server build | **Pass** |
| Client build | **Pass** |
| Prisma validate | **Pass** |
| Authentication E2E | **Pass — `E2E-AUTH-01/02`** |
| Requester regression E2E | **Pass — `E2E-REQ-01/02`** |
| Staff workflow E2E | **Pass — `E2E-STAFF-01/02` full-stack** |
| User administration E2E | **Pass — `E2E-ADMIN-01/02` full-stack** |
| Desktop/tablet/mobile visual QA | **Pass — `V-01`–`V-08`; 13 Lab 3 screenshots including failure/boundary states** |
| Issue #40 dependency audit | **Not claimed — npm registry DNS/network unavailable (`ENOTFOUND`)** |
| Hosted CI | **Pass — PR #48 run `35329863392` on `a2134f2`: Server / Client / E2E all green** |
