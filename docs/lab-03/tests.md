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
├── requester-regression.api.test.ts
├── staff-queue.api.test.ts
├── staff-ticket-detail.api.test.ts
├── comments-notes.api.test.ts
├── users-admin.api.test.ts
└── migration-regression.test.ts
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
| U-01 | BR-03 | `auth.unit.test.ts` | normalize email | trim/lowercase deterministic | Planned |
| U-02 | BR-05 | `auth.unit.test.ts` | password below 10 chars / above 72 UTF-8 bytes | rejected | Planned |
| U-03 | BR-05 | `auth.unit.test.ts` | password without letter or digit | rejected | Planned |
| U-04 | BR-05 | `auth.unit.test.ts` | valid ASCII and multibyte password boundaries | accepted at ≤72 bytes; Thai/emoji input exceeding 72 bytes rejected even when under 72 characters | Planned |
| U-05 | BR-06 | `auth.unit.test.ts` | new password confirmation mismatch | rejected | Planned |
| U-06 | BR-06 | `auth.unit.test.ts` | new password equals current | rejected | Planned |
| U-07 | BR-19 | `comments-notes.api.test.ts` or helper test | blank/whitespace comment/note | rejected | Planned |
| U-08 | BR-19 | helper test | 2,000 chars accepted / 2,001 rejected | correct boundary | Planned |
| U-09 | status matrix | `staff-ticket-detail.api.test.ts` or helper | each allowed transition | helper returns allowed | Planned |
| U-10 | status matrix | same | disallowed/self transition | helper rejects | Planned |
| U-11 | Queue spec | `staff-queue.api.test.ts` or helper | valid queue query parsing/defaults | deterministic parsed query | Planned |
| U-12 | Queue spec | same | invalid page/pageSize/sort/status/priority | field errors | Planned |

## 4. Authentication API / Integration Tests

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| AUTH-01 | AC-01 | `auth.api.test.ts` | active user + valid credentials | `200`, session cookie, safe user data | Planned |
| AUTH-02 | AC-02 | `auth.api.test.ts` | unknown email | `401` generic invalid-credentials response | Planned |
| AUTH-03 | AC-02 | `auth.api.test.ts` | existing email + wrong password | same `401` shape/message as unknown email | Planned |
| AUTH-04 | AC-03 | `auth.api.test.ts` | inactive account + correct password | sign-in denied safely | Planned |
| AUTH-05 | AC-04 | `auth.api.test.ts` | initial-password login | authenticated but `mustChangePassword=true`, normal API blocked | Planned |
| AUTH-06 | AC-04 | `auth.api.test.ts` | valid mandatory password change | hash changes, flag false, normal API available | Planned |
| AUTH-07 | AC-04 | `auth.api.test.ts` | invalid password rule/mismatch | `400`, no credential mutation | Planned |
| AUTH-08 | AC-04 | `auth.api.test.ts` | incorrect current password | rejected; old password still valid | Planned |
| AUTH-09 | AC-05 | `auth.api.test.ts` | logout then reuse cookie | protected endpoint `401` | Planned |
| AUTH-10 | AC-01 | `auth.api.test.ts` | `GET /auth/me` valid session | safe identity + role; no hash/token | Planned |
| AUTH-11 | AC-05 | `auth.api.test.ts` | absolute 8-hour expiry boundary / unknown session | request before expiry allowed; at/after expiry `401`; normal requests do not slide expiry | Planned |
| AUTH-12 | AC-02 | `auth.api.test.ts` | 5 failed login attempts then next attempt | documented `429` within window | Planned |
| AUTH-13 | AC-02 | `auth.api.test.ts` | successful login after failures (before limit) | counter cleared | Planned |
| AUTH-14 | AC-06 | `auth.api.test.ts` | direct `POST /api/v1/auth/login` with wrong, missing, or `null` Origin | each rejected `403` before credential/session processing; matching Origin reaches normal login behavior | Planned |
| AUTH-15 | AC-03 | `auth.api.test.ts` | active session user is later deactivated | subsequent protected request denied/session invalidated | Planned |
| AUTH-16 | AC-06 | `authorization.api.test.ts` | wrong, missing, or `null` Origin on another state-changing authenticated request | each rejected `403` with no mutation; matching Origin allowed | Planned |

## 5. Direct Authorization Matrix Tests

These tests intentionally call APIs directly rather than relying on hidden frontend controls.

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| AZ-01 | AC-06 | `authorization.api.test.ts` | no session → Requester ticket list | `401` | Planned |
| AZ-02 | AC-06 | same | Requester → Staff Queue | `403` | Planned |
| AZ-03 | AC-26 | same | Requester → Admin users | `403` | Planned |
| AZ-04 | AC-26 | same | IT Staff → Admin users | `403` | Planned |
| AZ-05 | AC-06 | same | Admin → Admin users | allowed | Planned |
| AZ-06 | AC-06 | same | IT Staff → Staff Queue | allowed | Planned |
| AZ-07 | AC-06 | same | user requiring password change → normal protected API | `403 PASSWORD_CHANGE_REQUIRED` | Planned |
| AZ-08 | AC-18 | same | Requester → Internal Notes endpoint | `403`, no note content | Planned |
| AZ-09 | AC-07 | same | Requester sends another `requesterId` in body/query/header | ignored/rejected; cannot impersonate | Planned |
| AZ-10 | AC-07 | same | Requester opens another Requester's Ticket id | `404`, no existence leak | Planned |
| AZ-11 | AC-09 | same | Requester opens/downloads another Requester's Attachment id | `404`, no existence leak | Planned |
| AZ-12 | AC-20 | same | IT Staff/Admin downloads active attachment on any Ticket | allowed; file returned | Planned |
| AZ-13 | AC-20 | same | IT Staff/Admin attempts Requester attachment upload or soft-remove | `403`; no attachment mutation | Planned |
| AZ-14 | AC-06 | same | unauthenticated request to Categories / Related Systems reference data | `401`; reference data remains authenticated-only | Planned |

## 6. Requester Regression API Tests

Existing Lab 2 tests should remain meaningful, adapted from Development Requester header identity to authenticated session identity.

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| REQ-01 | AC-08 | `requester-regression.api.test.ts` | create valid Ticket as Requester | `201`, generated number, status New, requester=session user | Planned |
| REQ-02 | AC-08 | same | invalid required fields/lengths/priority | `400` field errors | Planned |
| REQ-03 | AC-08 | same | My Tickets requester isolation | only own items | Planned |
| REQ-04 | AC-08 | same | search Summary / Ticket Number | correct own subset | Planned |
| REQ-05 | AC-08 | same | Category/System filter + sort + pagination | existing Lab 2 semantics preserved | Planned |
| REQ-06 | AC-08 | same | owned Ticket Detail | metadata returned | Planned |
| REQ-07 | AC-09 | same | valid attachment upload | succeeds; active metadata visible | Planned |
| REQ-08 | AC-09 | same | invalid type / >5MB / >5 active | rejected, no invalid partial persistence | Planned |
| REQ-09 | AC-09 | same | concurrent capacity race | maximum remains 5, no orphan storage for loser | Planned |
| REQ-10 | AC-09 | same | soft remove with reason | metadata/reason retained; download blocked | Planned |
| REQ-11 | AC-09 | same | blank removal reason | rejected; attachment active | Planned |
| REQ-12 | AC-09 | same | concurrent removal | one success, one conflict | Planned |
| REQ-13 | AC-15 | same | new Ticket creation | IT Priority initially equals Requested Priority | Planned |

## 7. Public Comments / Requester Resolution API Tests

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| COM-01 | AC-10 | `comments-notes.api.test.ts` | Requester posts Public Comment to own Ticket | `201`, backend author/time | Planned |
| COM-02 | AC-10 | same | Requester reads own Public Comments | chronological list | Planned |
| COM-03 | AC-10 | same | other Requester reads/posts to protected Ticket | `404` | Planned |
| COM-04 | AC-17 | same | IT Staff posts Public Comment | visible later to owning Requester | Planned |
| COM-05 | AC-17 | same | Admin reads/posts Public Comment | allowed per matrix | Planned |
| COM-06 | AC-19 | same | blank/whitespace comment | `400` | Planned |
| COM-07 | AC-19 | same | comment length boundary | 2,000 accepted; 2,001 rejected | Planned |
| COM-08 | AC-11 | same | own Requester marks Problem Appears Resolved | timestamp set, Ticket status unchanged | Planned |
| COM-09 | AC-11 | same | repeat appears-resolved action | idempotent; original indication retained | Planned |
| COM-10 | AC-11 | `authorization.api.test.ts` | Requester calls staff status API | `403` | Planned |
| COM-11 | AC-11 | `staff-ticket-detail.api.test.ts` | staff transitions indicated Ticket to `Reopened` | status becomes Reopened and indication is cleared atomically | Planned |
| COM-12 | AC-11 | `comments-notes.api.test.ts` | Requester marks own Ticket in `New`, `Open`, `In Progress`, `Waiting for Requester`, or `Reopened` | allowed; timestamp set without status change | Planned |
| COM-13 | AC-11 | same | Requester attempts indication in `Resolved`, `Closed`, or `Cancelled` | `409 RESOLUTION_INDICATION_NOT_ALLOWED`; timestamp/status unchanged | Planned |

## 8. IT Staff Queue API Tests

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| Q-01 | AC-12 | `staff-queue.api.test.ts` | default queue | updated-desc order, pagination metadata | Planned |
| Q-02 | AC-12 | same | search Ticket Number | matching items | Planned |
| Q-03 | AC-12 | same | search Summary | matching items | Planned |
| Q-04 | AC-12 | same | search Requester name/email | matching items | Planned |
| Q-05 | AC-12 | same | filter Status | exact subset | Planned |
| Q-06 | AC-12 | same | filter Requested Priority / IT Priority | exact subset | Planned |
| Q-07 | AC-13 | same | owner=`unassigned` | only owner null | Planned |
| Q-08 | AC-13 | same | owner=`mine` | only authenticated staff-owned Tickets | Planned |
| Q-09 | AC-12 | same | Category/System filters combined | AND semantics | Planned |
| Q-10 | AC-12 | same | supported sort options | deterministic order | Planned |
| Q-11 | AC-12 | same | invalid page/pageSize/filter/sort | `400` fields; no server crash | Planned |
| Q-12 | AC-13 | same | item fields | owner/status/requested+IT priority/updated context present | Planned |

## 9. IT Staff Ticket Detail / Operations API Tests

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| ST-01 | AC-20 | `staff-ticket-detail.api.test.ts` | open operational detail | Ticket, requester, owner, priorities, status, attachment metadata; comments/notes are fetched from dedicated endpoints | Planned |
| ST-02 | AC-14 | same | claim unassigned Ticket | owner=current staff | Planned |
| ST-03 | AC-14 | same | assign active IT Staff | owner updated | Planned |
| ST-04 | AC-14 | same | assign active Administrator | allowed per matrix | Planned |
| ST-05 | AC-14 | same | assign inactive user | rejected | Planned |
| ST-06 | AC-14 | same | assign Requester as owner | rejected | Planned |
| ST-08 | AC-15 | same | update IT Priority | IT Priority changes, Requested Priority unchanged | Planned |
| ST-09 | AC-15 | same | invalid IT Priority | `400`, no mutation | Planned |
| ST-10 | AC-16 | same | each permitted status transition | succeeds | Planned |
| ST-11 | AC-16 | same | each representative forbidden/self transition | `409`, status unchanged | Planned |
| ST-12 | AC-16 | same | unknown status string | `400` | Planned |
| ST-13 | AC-20/11 | same | detail after indication then transition to Reopened | indication visible before reopen, cleared after reopen | Planned |
| ST-14 | AC-20 | same | historical null IT Priority | safe `null`/Not recorded, no crash | Planned |

## 10. Internal Notes API Tests

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| NOTE-01 | AC-18 | `comments-notes.api.test.ts` | IT Staff posts Internal Note | `201`, backend author/time | Planned |
| NOTE-02 | AC-18 | same | IT Staff reads notes | chronological list | Planned |
| NOTE-03 | AC-18 | same | Administrator reads/posts notes | allowed | Planned |
| NOTE-04 | AC-18 | same | Requester direct GET notes | `403`, no content | Planned |
| NOTE-05 | AC-18 | same | Requester direct POST note | `403` | Planned |
| NOTE-06 | AC-19 | same | blank/whitespace note | `400` | Planned |
| NOTE-07 | AC-19 | same | 2,000/2,001 char boundary | accepted/rejected respectively | Planned |

## 11. Administrator API Tests

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| ADM-01 | AC-21 | `users-admin.api.test.ts` | list users | safe fields only; no hashes | Planned |
| ADM-02 | AC-21 | same | search name | matching list | Planned |
| ADM-03 | AC-21 | same | search email | matching list | Planned |
| ADM-04 | AC-21 | same | role filter | matching role | Planned |
| ADM-05 | AC-22 | same | create valid Requester/IT Staff/Admin | exactly one role, initial-password flag true | Planned |
| ADM-06 | AC-22 | same | duplicate email different case | `409`, no duplicate row | Planned |
| ADM-07 | AC-22 | same | invalid role | `400` | Planned |
| ADM-08 | AC-22 | same | invalid name/email/password | field validation | Planned |
| ADM-09 | AC-23 | same | edit name/email | updated safe user | Planned |
| ADM-10 | AC-23 | same | change role with valid safety state | updated | Planned |
| ADM-11 | AC-23 | same | activate/deactivate normal user | updated | Planned |
| ADM-12 | AC-24 | same | Admin deactivates self | `409`, still active | Planned |
| ADM-13 | AC-25 | same | deactivate last active Admin | `409`, still active | Planned |
| ADM-14 | AC-25 | same | change last active Admin to non-Admin | `409` | Planned |
| ADM-15 | AC-23 | same | set new initial password | flag true; old sessions invalidated | Planned |
| ADM-16 | AC-23 | same | target user logs in with new initial password | must change before normal app | Planned |
| ADM-17 | AC-26 | `authorization.api.test.ts` | Requester/IT Staff hit admin list/create/edit | `403` | Planned |
| ADM-18 | AC-31 | `users-admin.api.test.ts` | deactivate an IT Staff/Admin who currently owns ≥1 Ticket | `409 ASSIGNED_TICKETS_REQUIRE_REASSIGNMENT`; user remains active and Ticket owner unchanged | Planned |
| ADM-19 | AC-31 | same | change an assigned IT Staff/Admin role to `REQUESTER` | same `409`; role and Ticket owner unchanged until Tickets are reassigned | Planned |

## 12. Migration / Seed / Regression Tests

| ID | AC | Planned file / method | Scenario | Expected | Final |
|---|---|---|---|---|---|
| MIG-01 | AC-27 | `migration-regression.test.ts` | apply Lab 3 migrations to disposable Lab 2-shaped DB | migration succeeds from zero/current Lab2 migrations | Planned |
| MIG-02 | AC-27 | same | compare Ticket count before/after | unchanged | Planned |
| MIG-03 | AC-27 | same | compare Attachment count/removal metadata | unchanged; removed reason retained | Planned |
| MIG-04 | AC-27 | same | verify each `DevelopmentRequester` becomes `User` with the exact same numeric id and each old Ticket still points to that id/logical email/name | numeric and logical ownership preserved | Planned |
| MIG-05 | AC-27 | same | non-null Requested Priority → initial IT Priority | copied | Planned |
| MIG-06 | AC-27 | same | historical null Requested Priority | remains readable; IT Priority null | Planned |
| MIG-07 | AC-28 | seed verification | run seed twice | no duplicate users/reference rows | Planned |
| MIG-08 | AC-28 | seed verification | account counts | ≥4 active + 1 inactive Requester; ≥3 active + 1 inactive Staff; ≥1 active Admin | Planned |
| MIG-09 | AC-28 | seed verification | seeded Tickets/comments/notes | realistic distribution; no sensitive content | Planned |
| MIG-10 | AC-28 | seed verification | seed once → mutate seeded password/role/active state/Ticket status-owner-priority → seed again | no duplicate rows and mutable state is not reset to original demo values | Planned |
| REG-01 | AC-08/09 | existing Lab 2 server suite adapted/retained | full Requester regression | green | Planned |
| REG-02 | AC-08/09 | existing Lab 2 client suite adapted/retained | Requester UI regression | green | Planned |

## 13. Client UI Tests

### 13.1 Login

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-AUTH-01 | AC-01 | `Login.test.tsx` | render | email/password/sign-in labels | Planned |
| UI-AUTH-02 | AC-02 | same | invalid input | field validation; no request | Planned |
| UI-AUTH-03 | AC-01 | same | submit pending | button disabled + busy text | Planned |
| UI-AUTH-04 | AC-02 | same | `401` | generic error | Planned |
| UI-AUTH-05 | AC-03 | same | inactive response | safe inactive feedback | Planned |
| UI-AUTH-06 | AC-02 | same | `429` | rate-limit feedback | Planned |
| UI-AUTH-07 | AC-29 | same | `500` | safe failure; email preserved, password cleared/prevented exposure | Planned |

### 13.2 Change Password

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-PWD-01 | AC-04 | `ChangePassword.test.tsx` | mandatory mode | rule guidance + Logout; normal nav absent | Planned |
| UI-PWD-02 | AC-04 | same | mismatch/weak password | inline validation | Planned |
| UI-PWD-03 | AC-04 | same | valid submit busy/success | continue to role app | Planned |
| UI-PWD-04 | AC-04 | same | server validation/failure | safe feedback | Planned |

### 13.3 Authenticated Shell

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-SHELL-01 | AC-06 | `AuthenticatedShell.test.tsx` | Requester | only Requester nav + name/role/logout | Planned |
| UI-SHELL-02 | AC-06 | same | IT Staff | Staff nav; no Admin Users | Planned |
| UI-SHELL-03 | AC-06 | same | Admin | Admin Users + approved destinations | Planned |
| UI-SHELL-04 | AC-05 | same | logout | auth state cleared/login rendered | Planned |
| UI-SHELL-05 | AC-04 | same | must-change account | Change Password gate | Planned |

### 13.4 Requester Ticket Detail Extensions

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-REQ-01 | AC-10 | `RequesterTicketDetail.test.tsx` | comments render | author/role/time/content | Planned |
| UI-REQ-02 | AC-10/19 | same | blank comment | inline validation; no API post | Planned |
| UI-REQ-03 | AC-10 | same | comment post failure | content preserved | Planned |
| UI-REQ-04 | AC-11 | same | appears-resolved confirmation | explains not formal close | Planned |
| UI-REQ-05 | AC-11 | same | indicated state | timestamp badge; status independent | Planned |

### 13.5 Staff Queue

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-Q-01 | AC-12/13 | `StaffTicketQueue.test.tsx` | realistic data | required columns/badges/owner/open action | Planned |
| UI-Q-02 | AC-12 | same | search/filter/sort | API params updated/reset page | Planned |
| UI-Q-03 | AC-12 | same | pagination | metadata/buttons correct | Planned |
| UI-Q-04 | AC-13 | same | unassigned | explicit Unassigned label | Planned |
| UI-Q-05 | AC-29 | same | loading | loading feedback | Planned |
| UI-Q-06 | AC-29 | same | empty | queue empty state | Planned |
| UI-Q-07 | AC-29 | same | no results | clear-filter CTA | Planned |
| UI-Q-08 | AC-29 | same | failure/forbidden | safe states | Planned |

### 13.6 Staff Ticket Detail

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-ST-01 | AC-20 | `StaffTicketDetail.test.tsx` | render | read-only requester vs editable operations clearly separated | Planned |
| UI-ST-02 | AC-14 | same | claim/reassign | controls call correct APIs + busy states | Planned |
| UI-ST-03 | AC-15 | same | IT Priority | Requested stays read-only; IT editable | Planned |
| UI-ST-04 | AC-16 | same | status options | only allowed next statuses offered | Planned |
| UI-ST-05 | AC-17/18 | same | Public vs Internal | explicit visible/private labels and distinct sections | Planned |
| UI-ST-06 | AC-19 | same | blank note/comment | validation | Planned |
| UI-ST-07 | AC-20 | same | attachments | active/removed continuity | Planned |
| UI-ST-08 | AC-20 | same | Requester resolution indication | visible without auto status mutation | Planned |
| UI-ST-09 | AC-29 | same | conflict/failure | safe feedback + refresh/retry path | Planned |

### 13.7 Administrator User Management

| ID | AC | Planned file | Scenario | Expected | Final |
|---|---|---|---|---|---|
| UI-ADM-01 | AC-21 | `UserManagement.test.tsx` | list | Name/Email/Role/Status/Edit | Planned |
| UI-ADM-02 | AC-21 | same | search/filter | visible results update | Planned |
| UI-ADM-03 | AC-22 | same | create form | required controls + one-role select + initial password | Planned |
| UI-ADM-04 | AC-22 | same | duplicate/invalid | field/conflict feedback | Planned |
| UI-ADM-05 | AC-23 | same | edit | name/email/role/active save | Planned |
| UI-ADM-06 | AC-23 | same | set initial password | separate flow + success indicator | Planned |
| UI-ADM-07 | AC-24 | same | self-deactivation conflict | clear blocked feedback | Planned |
| UI-ADM-08 | AC-25 | same | last-admin conflict | clear blocked feedback | Planned |
| UI-ADM-09 | AC-29 | same | loading/empty/failure | meaningful states | Planned |
| UI-ADM-10 | AC-31 | same | assigned owner deactivation/demotion conflict | clear `reassign tickets first` feedback; edited user state is not falsely shown as saved | Planned |

## 14. End-to-End Tests

| ID | AC | Planned file | Browser flow | Expected | Final |
|---|---|---|---|---|---|
| E2E-AUTH-01 | AC-01–06 | `authentication.spec.ts` | invalid login → valid initial login → mandatory change → role app → logout → direct access | each auth boundary enforced | Planned |
| E2E-AUTH-02 | AC-03/29 | same | inactive login + simulated safe backend failure | visible safe feedback | Planned |
| E2E-REQ-01 | AC-07–11 | `requester-regression.spec.ts` | login Requester → create → list/search → detail → attachment → public comment → appears resolved | Lab2 behavior + Lab3 extension works under authenticated identity | Planned |
| E2E-REQ-02 | AC-07/09 | same | second Requester attempts first Requester's Ticket/Attachment | protected/not found | Planned |
| E2E-STAFF-01 | AC-12–20 | `staff-ticket-flow.spec.ts` | login Staff → Queue search/filter → open → claim/reassign → priority → status → Public Comment → Internal Note → attachment | operational flow works | Planned |
| E2E-STAFF-02 | AC-16/18 | same | direct forbidden transition / Requester note endpoint evidence | backend rejects safely | Planned |
| E2E-ADMIN-01 | AC-21–26 | `user-administration.spec.ts` | login Admin → search → create user → edit → initial password reset → new user forced change | Admin flow works | Planned |
| E2E-ADMIN-02 | AC-24–26/31 | same | self-deactivate + last-admin protection + assigned-owner deactivate/demote + non-Admin direct access | safe blocks visible/API enforced; owner invariant preserved | Planned |

## 15. Responsive / Accessibility / Visual Tests

| ID | AC | Evidence target | Check | Final |
|---|---|---|---|---|
| V-01 | AC-30 | Login/Change Password 1280/820/390 | no clipping/overflow; focus/labels | Planned |
| V-02 | AC-30 | Requester major screens 1280/820/390 | Lab 2 responsive behavior preserved | Planned |
| V-03 | AC-30 | Staff Queue 1280/820/390 | table/card adaptation; badges readable | Planned |
| V-04 | AC-30 | Staff Detail 1280/820/390 | controls/comments/notes/attachments no overlap | Planned |
| V-05 | AC-30 | User Management 1280/820/390 | list/form adaptation no horizontal overflow | Planned |
| V-06 | AC-30 | all major forms | labels, validation placement, visible focus | Planned |
| V-07 | AC-30 | badges | role/status/priority meaning not colour-only | Planned |
| V-08 | AC-30 | communication | Public vs Internal distinction includes explicit text | Planned |

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
| AC-27 | MIG-01–MIG-06, REG-01/02 |
| AC-28 | MIG-07–MIG-10 |
| AC-29 | UI-AUTH-07, UI-Q-05–08, UI-ST-09, UI-ADM-09, E2E-AUTH-02 |
| AC-30 | V-01–V-08 plus responsive checks inside all four E2E files |
| AC-31 | ADM-18/19, UI-ADM-10, E2E-ADMIN-02 |

## 17. Issue → Test Focus

| Issue | Required test focus before PR approval |
|---|---|
| #33 Issue 1 | Contract/traceability review only; no implementation pass claim. |
| #34 Issue 2 | U-01–06, AUTH-01–16, key AZ tests, MIG foundation. |
| #35 Issue 3 | REQ-01–13, COM Requester tests, Requester UI/E2E regression. |
| #36 Issue 4 | Q-01–12, UI-Q suite, Queue responsive evidence. |
| #37 Issue 5 | ST/NOTE/COM staff tests, UI-ST, Staff E2E. |
| #38 Issue 6 | ADM suite, UI-ADM, Admin E2E. |
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

### Final Lab 3 regression template

| Check | Final result |
|---|---|
| Server unit/API/integration | Pending |
| Client Vitest | Pending |
| Migration from Lab 2-shaped DB | Pending |
| Seed idempotency | Pending |
| Server build | Pending |
| Client build | Pending |
| Prisma validate | Pending |
| Authentication E2E | Pending |
| Requester regression E2E | Pending |
| Staff workflow E2E | Pending |
| User administration E2E | Pending |
| Desktop/tablet/mobile visual QA | Pending |
| Hosted CI | Pending |
