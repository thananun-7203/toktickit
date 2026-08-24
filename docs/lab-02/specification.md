# TokTickIT Lab 2 — Specification

| | |
|---|---|
| **Project** | TokTickIT — Requester Ticket MVP |
| **Lab** | Lab 2 |
| **Issue** | #15 (Lab 2 Issue_1 : Spec DD and Test Plan) |
| **Status** | Draft — pending review |
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

## 2. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | The user can select an active Development Requester on entry; the selection is stored in application context and attached to subsequent API calls. | Must |
| FR-2 | Only **active** requesters are offered for selection. | Must |
| FR-3 | The user can create a ticket providing Category, Related System, Summary, and Description; the system validates input before persisting. | Must |
| FR-4 | The backend generates a unique official Ticket Number at creation time; it is not editable by the client. | Must |
| FR-5 | The user can list **only their own** tickets, with free-text search, category filter, sort, and pagination. | Must |
| FR-6 | The user can open a read-only detail view of one of their own tickets. | Must |
| FR-7 | The user can upload attachments to their own ticket within limits (see BR-4). | Must |
| FR-8 | The user can download any non-removed attachment of their own ticket. | Must |
| FR-9 | The user can soft-remove an attachment of their own ticket; removed items stay visible as metadata but cannot be downloaded. | Must |

## 3. Business Rules

| ID | Rule |
|---|---|
| BR-1 | **Ownership isolation:** every ticket query (list, detail, attachment access) is scoped to the requester sent by the client context. A requester never sees another requester's tickets or attachments. |
| BR-2 | Ticket Number format: `TKT-YYYY-NNNNN`, where `NNNNN` is a zero-padded sequence that resets annually, starting at `00001` (System-Level SDS v1.0, Decision D-10). Generated server-side only. |
| BR-3 | Validation limits: Summary is required, max 100 characters; Description is required, max 2,000 characters; Category and Related System are required and must exist. |
| BR-4 | Attachment limits: max **5 MB per file**, max **5 files per ticket**, allowed types: `jpg, jpeg, png, webp, pdf` only. Uploads exceeding limits are rejected with a validation error; no partial persistence of rejected batches. |
| BR-5 | Attachment removal is **soft**: `removedAt` is set, the record remains listed as metadata (name, size, type), but download returns an error. |
| BR-6 | Inactive requesters exist in the database for testing but are never returned by the requester list endpoint and cannot act as the acting requester. |
| BR-7 | Tickets are created in status `Open`; status transitions are out of scope for Lab 2. |

## 4. Acceptance Criteria

| ID | Criterion | Verified by |
|---|---|---|
| AC-1 | Selecting a requester stores it in app context and all later API calls carry it. | E-1, UI-x |
| AC-2 | The requester list shows exactly the active requesters from seed data (4 active; inactive hidden). | A-1, U-3 |
| AC-3 | Submitting a valid form creates a ticket and displays its generated Ticket Number. | A-2, U-1, U-2, E-2 |
| AC-4 | Submitting invalid data (empty fields, over-limit lengths) shows per-field messages below inputs without a network write. | A-3/A-4, U-4, UI tests |
| AC-5 | My Tickets shows only tickets whose `requesterId` matches the acting requester (isolation proof with ≥2 requesters). | A-6, E-4 |
| AC-6 | Search/filter/sort/pagination return correct subsets (verified against seeded data). | A-7–A-9 |
| AC-7 | Detail view shows ticket metadata and its attachments; other requesters' ticket ids yield not-found. | A-5, E-3 |
| AC-8 | Uploading within limits succeeds; exceeding size/count/type limits fails with a clear message. | A-10–A-12 |
| AC-9 | Soft-removed attachments remain visible as metadata; downloading them fails. | A-13, E-5 |
| AC-10 | Layouts follow Zen Green theme and remain usable at Desktop/Tablet/Mobile widths without horizontal scroll. | Visual checks V-1–V-3 |

## 5. Definition of Done

- [ ] All Must-priority FRs implemented and demonstrated.
- [ ] Automated tests written first (TDD) and passing: Unit, API (Supertest), UI (Vitest), E2E (Playwright).
- [ ] Traceability matrix (`tests.md`) complete — every FR covered by at least one automated test.
- [ ] Zen Green theme applied consistently; responsive evidence captured.
- [ ] Peer review completed and recorded in `docs/lab-02/reviewer.md`.
- [ ] AI usage recorded in `docs/lab-02/ai-use.md`.
- [ ] Release PR merged to `main`.

## 6. Data Changes (Prisma)

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
| ticketNumber | String (unique) | `TKT-YYYY-NNNNN` (BR-2) |
| summary | String (max 100) | BR-3 |
| description | String (max 2000) | BR-3 |
| status | String | Default `Open` (BR-7) |
| createdAt | DateTime | Auto |
| requesterId | FK → DevelopmentRequester | Ownership anchor (BR-1) |
| categoryId | FK → Category | Required |
| relatedSystemId | FK → RelatedSystem | Required |

### Attachment
| Field | Type | Notes |
|---|---|---|
| id | Int (PK, autoincrement) | |
| fileName | String | Original name |
| mimeType | String | |
| sizeBytes | Int | ≤ 5 MB enforced (BR-4) |
| storageKey | String | SeaweedFS file id / volume URL |
| removedAt | DateTime? | Null = active; set = soft-removed (BR-5) |
| ticketId | FK → Ticket | Max 5 active files per ticket (BR-4) |

Seed additions (idempotent upsert): 4 Categories (existing), 6+ Related Systems, 4 Active + 1 Inactive Development Requesters.
