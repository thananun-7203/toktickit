# TokTickIT Lab 2 — Specification

| | |
|---|---|
| **Project** | TokTickIT — Requester Ticket MVP |
| **Lab** | Lab 2 |
| **Issue** | #15 (Lab 2 Issue_1 : Spec DD and Test Plan) |
| **Status** | Final release-readiness audit (Issue 8) |
| **Author** | Thananun Krungtui (67070507203) |

---

## 1. Scope

### In Scope
- Simulated multi-user ownership via a **Development Requester** selector (no real authentication).
- Ticket creation with backend validation and backend-generated Ticket Numbers.
- "My Tickets" list limited to the selected requester, with search, filter, sort, and pagination.
- Read-only Ticket Detail view.
- Attachment management: upload, download, and soft removal.
- Zen Green theme and responsive layout conventions.

### Out of Scope
- Real login / authentication / authorization (deferred to a later lab).
- Agent-side handling of tickets (assignment, status workflow, resolution).
- Editing or deleting ticket content after creation.
- Hard deletion of attachments.

## 2. Sprint Goal

The objective of this sprint is to build the **Requester Ticket MVP** — the minimum viable product that allows a requester to create, list, and manage support tickets with file attachments. The sprint delivers:

- A simulated multi-user identity layer (Development Requester selector) that enables ownership isolation testing without real authentication.
- A complete ticket lifecycle from creation through listing and detail view, with server-generated ticket numbers and server-side validation.
- Attachment management backed by object storage (SeaweedFS) with enforced size and type limits.
- The Zen Green design system and responsive layout foundations that will be reused across subsequent Lab sprints.
- A fully tested and documented foundation (spec, API contracts, UI spec, test plan) for future Agent-side and workflow features.

Success is measured by passing automated tests (Unit, API, UI, E2E), positive peer review, and working demo across Desktop/Tablet/Mobile viewports.

## 3. Stakeholder Request Interpretation

The Lab 2 handout specifies the following key requirements, interpreted and adopted as-is:

| Handout Requirement | Interpretation | Implementation |
|---|---|---|
| Simulated Development Requester identity | No real auth; a dropdown selects the acting requester, stored in app context and sent with every API call | `X-Dev-Requester-Id` header; React context in client |
| Ticket creation with validation | Required fields, including Requester-selected Requested Priority, are enforced both client-side and server-side | BR-03 validation limits; Requested Priority values `Low` / `Medium` / `High`; 400 error responses with per-field messages |
| Server-generated Ticket Number | Unique, deterministic format; not editable by user | `TKT-YYYY-NNNNN` per SDS v1.0 D-10; generated on POST only |
| My Tickets with search/filter/sort/pagination | List scoped to acting requester; free-text search matches Ticket Number or Summary; UI adapts across breakpoints | Prisma `where` scoped to requesterId with Ticket Number/Summary search; table (desktop) / cards (mobile) |
| Ticket Detail (read-only) | Metadata + attachments; other requesters' IDs yield not-found | GET `/api/v1/tickets/:id` with ownership enforcement (BR-01) |
| Attachment handling | Upload, download, soft-remove with a recorded reason; enforced limits | SeaweedFS adapter; `removedAt` + `removalReason` soft-removal metadata; max 5 MB × 5 files, jpg/jpeg/png/webp/pdf |
| Zen Green theme | Consistent colour system across all screens | `#006B3C` / `#0B7A46` / `#EAF6EF`; Bootstrap overrides |
| Responsive layout | No horizontal scroll on any supported viewport | Desktop (≥992px), Tablet (768–991px), Mobile (<768px) stacked/card |

## 4. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | The user can select an active Development Requester on entry; the selection is stored in application context and attached to subsequent API calls. | Must |
| FR-02 | Only **active** requesters are offered for selection. | Must |
| FR-03 | The user can create a ticket providing Category, Related System, Requested Priority, Summary, and Description; the system validates input before persisting. | Must |
| FR-04 | The backend generates a unique official Ticket Number at creation time; it is not editable by the client. | Must |
| FR-05 | The user can list **only their own** tickets, with free-text search by Ticket Number or Summary, category/system filters, sort, and pagination. | Must |
| FR-06 | The user can open a read-only detail view of one of their own tickets. | Must |
| FR-07 | The user can upload attachments to their own ticket within limits (see BR-04). | Must |
| FR-08 | The user can download any non-removed attachment of their own ticket. | Must |
| FR-09 | The user can soft-remove an attachment of their own ticket after providing a non-blank removal reason; removed items and the reason stay visible as metadata but cannot be downloaded. | Must |

## 5. Business Rules

| ID | Rule |
|---|---|
| BR-01 | **Ownership isolation:** every ticket query (list, detail, attachment access) is scoped to the requester sent by the client context. A requester never sees another requester's tickets or attachments. |
| BR-02 | Ticket Number format: `TKT-YYYY-NNNNN`, where `NNNNN` is a zero-padded sequence that resets annually, starting at `00001` (System-Level SDS v1.0, Decision D-10). Generated server-side only. |
| BR-03 | Validation limits: Summary is required, max 100 characters; Description is required, max 2,000 characters; Category and Related System are required and must exist; Requested Priority is required and must be one of `Low`, `Medium`, or `High`. |
| BR-04 | Attachment limits: max **5 MB per file**, max **5 files per ticket**, allowed types: `jpg, jpeg, png, webp, pdf` only. Uploads exceeding limits are rejected with a validation error; no partial persistence of rejected batches. |
| BR-05 | Attachment removal is **soft** and requires a non-blank reason: `removedAt` and `removalReason` are recorded atomically, the record remains listed as metadata (name, size, type, reason), storage is retained, and download returns an error. |
| BR-06 | Inactive requesters exist in the database for testing but are never returned by the requester list endpoint and cannot act as the acting requester. |
| BR-07 | Tickets are created in status `New`; status transitions are out of scope for Lab 2. |

## 6. UI Specification Summary

Full details in [`ui-spec.md`](./ui-spec.md).

**Screens:** 4 core screens built with React + TypeScript + Vite + Bootstrap 5:
- **S1 — Select Development Requester:** Zen Green selection card with an **active-requester dropdown**, explicit development/testing-only explanation, active-requester notice, and Continue disabled until selection. Stores the choice in React context (`RequesterContext`). Check System remains available as a utility before and after requester selection.
- **S2 — Create Ticket:** Form with Category, Related System, Requested Priority (`Low`/`Medium`/`High`), Summary (≤100), Description (≤2000), attachment dropzone. Responsive: Desktop multi-column, Tablet 2-column, Mobile stacked. Client-side validation with per-field messages below inputs.
- **S3 — My Tickets:** Searchable by Ticket Number or Summary, filterable, sortable Zen Green table (desktop/tablet) / card list (mobile) with pagination and labelled Requested Priority/Status badges. Empty state and no-results state handled.
- **S4 — Ticket Detail:** Read-only metadata grid + Summary/Description card + attachments panel. Active files show Download/Remove buttons; removal prompts for a required reason and confirmation; removed files show muted retained metadata including the recorded reason.

**Zen Green Theme:**
| Token | Value | Usage |
|---|---|---|
| Primary Green | `#006B3C` | Header/nav, primary buttons, active nav item |
| Secondary Green | `#0B7A46` | Button hover, links, focus rings, table header accents |
| Pale Green | `#EAF6EF` | Page backgrounds, badges, info alerts |

**Responsive breakpoints:** Desktop ≥992px, Tablet 768–991px, Mobile <768px — stacked/card layout, no horizontal scroll, touch targets ≥44px.

**State conventions:** Every interactive screen handles Loading (spinner) / Success / Error / Empty states; buttons disabled + spinner during busy; validation errors positioned directly below inputs with `.invalid-feedback`.

## 7. API Contract

Full details in [`api-spec.md`](./api-spec.md).

**Base:** `http://localhost:3000` by default · Versioned requester-ticket routes are rooted at **`/api/v1/`**.

| # | Method | Path | Purpose | Issue |
|---|---|---|---|---|
| 1 | GET | `/api/v1/requesters` | List active Development Requesters | 2 |
| 2 | POST | `/api/v1/tickets` | Create a ticket | 3 |
| 3 | GET | `/api/v1/tickets` | List own tickets (search/filter/sort/pagination) | 4 |
| 4 | GET | `/api/v1/tickets/:id` | Own ticket detail (enforces ownership) | 5 |
| 5 | POST | `/api/v1/tickets/:id/attachments` | Upload attachments (multipart, ≤5 files) | 5 |
| 6 | GET | `/api/v1/attachments/:id/download` | Download an active attachment | 5 |
| 7 | DELETE | `/api/v1/attachments/:id` | Soft-remove an attachment | 5 |

**Identity:** `X-Dev-Requester-Id` header sent on every ticket-scoped request (simulated, no real auth). Missing or inactive requester → `401`.

**Ownership enforcement (BR-01):** All list/detail/attachment queries filter by `requesterId` from the header. Unknown or other-requester ticket ids return `404` (no existence leak).

**Ticket Number:** Generated server-side on `POST /api/v1/tickets` only, format `TKT-YYYY-NNNNN` (BR-02, SDS v1.0 D-10).

**Attachment constraints (BR-04/BR-05):** Types `jpg, jpeg, png, webp, pdf` only; ≤5 MB per file; ≤5 active files per ticket; multipart upload; `DELETE` requires a non-blank reason and is soft (`removedAt` + `removalReason` set, metadata/storage retained, download blocked).

**Error shape:** `{ "error": { "message": string, "fields"?: Record<string, string> } }`.

## 8. Acceptance Criteria

| ID | Criterion | Verified by |
|---|---|---|
| AC-01 | Selecting a requester stores it in app context and all later API calls carry it. | UI-1, E-1 |
| AC-02 | The requester list shows exactly the active requesters from seed data (4 active; inactive hidden). | U-3, A-1, UI-1 |
| AC-03 | Submitting a valid form creates a ticket and displays its generated Ticket Number. | U-1, A-2, UI-2, E-2 |
| AC-04 | Submitting invalid data (empty fields, over-limit lengths) shows per-field messages below inputs without a network write. | U-2, U-4, A-3, A-4, UI-3, UI-7, UI-8 |
| AC-05 | My Tickets shows only tickets whose `requesterId` matches the acting requester (isolation proof with ≥2 requesters). | A-6, E-4 |
| AC-06 | Search/filter/sort/pagination return correct subsets (verified against seeded data). | A-7–A-9 |
| AC-07 | Detail view shows ticket metadata and its attachments; other requesters' ticket ids yield not-found. | A-5, E-3 |
| AC-08 | Uploading within limits succeeds; exceeding size/count/type limits fails with a clear message. | A-10–A-12 |
| AC-09 | Soft removal requires a reason; removed attachments remain visible with the recorded reason, concurrent removal is atomic, and downloading removed files fails. | A-13, A-13R, A-13C, UI-9, E-5 |
| AC-10 | Layouts follow Zen Green theme and remain usable at Desktop/Tablet/Mobile widths without horizontal scroll. | UI-1, UI-5, UI-11, UI-12, E-7, E-8, V-1–V-3 |
| AC-11 | Requested Priority is required on create, persists as `Low`/`Medium`/`High`, and is returned/displayed in Create/List/Detail flows. | U-7, A-2, A-16, UI-10–UI-12, E-6 |

## 9. Assumptions & Decisions

| ID | Decision / Assumption | Rationale |
|---|---|---|
| D-1 | No real authentication in Lab 2; identity simulated via `X-Dev-Requester-Id` header. | Lab 2 scope explicitly defers login to a later lab; header-based simulation mirrors how auth tokens will be sent, making migration trivial. |
| D-2 | Ticket Number format `TKT-YYYY-NNNNN` (annual reset). | Required by System-Level SDS v1.0, Decision D-10. Annual reset keeps sequence numbers compact; `NNNNN` supports up to 99,999 tickets per year. |
| D-3 | Initial ticket status is `New` (not `Open`). | Per Lab 2 labsheet specification — status value is a prescribed business rule, not a team decision. |
| D-4 | Attachment types restricted to `jpg, jpeg, png, webp, pdf`. | Per SDS v1.0 alignment — these are the most common screenshot/document formats in a support-ticket context; arbitrary file types are blocked to reduce storage and security risk. |
| D-5 | All API routes rooted at `/api/v1/`. | Provides a versioning convention from the start; future breaking changes can use `/api/v2/` without disrupting existing clients. |
| D-6 | Ownership violations (accessing another requester's ticket id) return `404` instead of `403`. | Best practice to avoid leaking the existence of tickets belonging to other requesters; a `403` would confirm the id exists. |
| D-7 | SeaweedFS chosen for local object storage. | Lightweight, single-binary deployment; simple REST API for volume/file operations; sufficient for local development without external cloud dependencies. |
| D-8 | Requested Priority uses requester-facing values `Low`, `Medium`, and `High`. | The Lab Sheet requires a Requested Priority field but does not prescribe its value set. A simple three-level requester-selected scale is sufficient for Lab 2 and remains distinct from future IT Priority / staff workflow, which is out of scope. |

## 10. Database Design Justification

Key schema decisions and their rationale:

**1. Soft-delete for attachments (`removedAt` + `removalReason`) instead of hard-delete**

The requirement (FR-09, BR-05) explicitly states that removed attachments must remain visible as metadata while blocking download. Lab 2 submission evidence also requires a removal reason, so new removals require a non-blank reason and store it with the soft-removal timestamp. `removalReason` is nullable in the schema only so pre-migration historical rows remain valid. A hard-delete would destroy this audit metadata entirely. Additionally:
- Soft-delete preserves an audit trail for future compliance or recovery needs.
- Active attachment count validation (`BR-04`: max 5 per ticket) correctly counts only non-removed files (`removedAt IS NULL`), while the full history remains queryable for reporting.
- Matches the established pattern from Lab 1's Category model where data integrity across the application is prioritized.

**2. Separate `RelatedSystem` entity rather than a free-text field**

Tickets reference a shared `RelatedSystem` entity via foreign key instead of storing a text string:
- Ensures consistent naming across all tickets — no "Report Portal" vs "report portal" mismatches when filtering/searching.
- Enables future extensions (system owners, SLA definitions, associated categories) without schema migration.
- Mirrors the `Category` entity pattern established in Lab 1, maintaining design consistency across the data model.
- Seed data (6+ related systems) provides realistic test data for filter/search validation.

**3. `requesterId` FK on Ticket as the ownership anchor (BR-01)**

Ownership isolation is enforced at the database level via a required foreign key to `DevelopmentRequester`, not via application-level filtering alone:
- Prisma queries add `where: { requesterId }` to every ticket/attachment query, ensuring isolation at the query level.
- Enables efficient indexed lookups for the My Tickets list (issue 4) without scanning unrelated records.
- Provides a clear, auditable ownership chain in the data model that is trivially extended when real authentication replaces the simulated header.

**4. Nullable storage for `requestedPriority`, required for all new API writes**

The Lab Sheet requires Requested Priority on requester-created tickets. The application accepts only `Low`, `Medium`, or `High` for new tickets, while the database column remains nullable so tickets created before the Issue 6 migration can still be read without rewriting historical user intent. Legacy rows display `Not recorded`; every new ticket created through the API must persist one of the three allowed values.

## 11. Definition of Done

- [x] All Must-priority FRs implemented in the integrated `lab2-staging` feature set.
- [x] Automated Unit, API (Supertest), UI (Vitest), and E2E (Playwright) coverage exists for the Lab 2 requester flow.
- [x] Traceability matrix (`tests.md`) maps every Must FR to automated evidence.
- [x] Final Desktop/Tablet/Mobile and Part 8 evidence screenshots captured and indexed in `docs/lab-02/evidence.md`.
- [x] Peer-review history through Issues 4–7 recorded in `docs/lab-02/reviewer.md`.
- [x] AI usage, selected prompts, and reflection recorded in `docs/lab-02/ai-use.md`.
- [ ] Final Issue 8 regression is green and recorded.
- [ ] Issue 8 peer review is approved and merged into `lab2-staging`.
- [ ] Release PR `lab2-staging` → `main` is explicitly approved and merged.

## 12. Data Changes (Prisma)

New entities added this lab (Category already exists from Lab 1):

### DevelopmentRequester
| Field | Type | Notes |
|---|---|---|
| id | Int (PK, autoincrement) | |
| name | String | Display name |
| email | String | Unique |
| isActive | Boolean | Seed: 4 true, 1 false |

### RelatedSystem
| Field | Type | Notes |
|---|---|---|
| id | Int (PK, autoincrement) | |
| name | String | Unique |
| description | String? | |

### Ticket
| Field | Type | Notes |
|---|---|---|
| id | Int (PK, autoincrement) | |
| ticketNumber | String (unique) | `TKT-YYYY-NNNNN` (BR-02) |
| summary | String (max 100) | BR-03 |
| description | String (max 2000) | BR-03 |
| requestedPriority | String? | New tickets require `Low` / `Medium` / `High`; nullable only for pre-migration historical rows |
| status | String | Default `New` (BR-07) |
| createdAt | DateTime | Auto |
| requesterId | FK → DevelopmentRequester | Ownership anchor (BR-01) |
| categoryId | FK → Category | Required |
| relatedSystemId | FK → RelatedSystem | Required |

### Attachment
| Field | Type | Notes |
|---|---|---|
| id | Int (PK, autoincrement) | |
| fileName | String | Original name |
| mimeType | String | |
| sizeBytes | Int | ≤ 5 MB enforced (BR-04) |
| storageKey | String | SeaweedFS file id / volume URL |
| removedAt | DateTime? | Null = active; set = soft-removed (BR-05) |
| removalReason | String? | Required by the API for new removals; nullable only for pre-migration historical rows |
| ticketId | FK → Ticket | Max 5 active files per ticket (BR-04) |

Seed additions (idempotent upsert): 4 Categories (existing), 6+ Related Systems, 4 Active + 1 Inactive Development Requesters.
