# TokTickIT Lab 2 — API Specification

Base URL: `http://localhost:4000` · All bodies are JSON unless marked *multipart*.
Errors use a consistent shape: `{ "error": { "message": string, "fields"?: Record<string,string> } }`.

**Development Requester context:** every ticket-scoped request must send header
`X-Dev-Requester-Id: <requesterId>` (simulated identity, see specification FR-1/BR-1).
Missing or unknown/inactive requester → `401`.

---

## Endpoints Overview

| # | Method | Path | Purpose | Issue |
|---|---|---|---|---|
| 1 | GET | `/api/v1/requesters` | List active Development Requesters | 2 |
| 2 | POST | `/api/v1/tickets` | Create a ticket | 3 |
| 3 | GET | `/api/v1/tickets` | List own tickets (search/filter/sort/pagination) | 4 |
| 4 | GET | `/api/v1/tickets/:id` | Own ticket detail | 5 |
| 5 | POST | `/api/v1/tickets/:id/attachments` | Upload attachments (multipart) | 5 |
| 6 | GET | `/api/v1/attachments/:id/download` | Download an active attachment | 5 |
| 7 | DELETE | `/api/v1/attachments/:id` | Soft-remove an attachment | 5 |
| 8 | GET | `/api/v1/categories` | List active categories (dropdown) | 3 |
| 9 | GET | `/api/v1/related-systems` | List active related systems (dropdown) | 3 |

---

## 1. GET /api/v1/requesters

Returns **active** requesters only (BR-6).

**Response `200`:**
```json
[
  { "id": 1, "name": "Somchai Jaidee", "email": "somchai@toktick.it", "isActive": true }
]
```

## 2. POST /api/v1/tickets

Header: `X-Dev-Requester-Id`.

**Request:**
```json
{
  "categoryId": 1,
  "relatedSystemId": 2,
  "summary": "Cannot export monthly report",
  "description": "Export button spins forever after clicking."
}
```

**Validation (BR-3):** all fields required; `summary` ≤ 100 chars; `description` ≤ 2,000 chars; referenced ids must exist.

**Response `201`:** full ticket object incl. server-generated `ticketNumber` (BR-2):
```json
{
  "id": 12,
  "ticketNumber": "TKT-2026-00001",
  "status": "New",
  "summary": "...",
  "description": "...",
  "createdAt": "2026-08-24T03:15:00.000Z",
  "requester": { "id": 1, "name": "Somchai Jaidee" },
  "category": { "id": 1, "name": "Software" },
  "relatedSystem": { "id": 2, "name": "Report Portal" }
}
```

**Errors:** `400` field validation (with `fields` map), `401` requester missing/invalid, `404` unknown category/system id.

## 3. GET /api/v1/tickets

Header: `X-Dev-Requester-Id`. Returns **only that requester's** tickets (BR-1).

**Query parameters:**
| Param | Type | Default | Notes |
|---|---|---|---|
| search | string | — | Case-insensitive match on `summary` |
| categoryId | int | — | Exact filter |
| relatedSystemId | int | — | Exact filter |
| sort | `newest` \| `oldest` \| `summary_asc` | `newest` | By `createdAt` / `summary` |
| page | int ≥ 1 | `1` | |
| pageSize | int 1–50 | `10` | |

**Response `200`:**
```json
{
  "items": [ /* ticket objects as above */ ],
  "page": 1,
  "pageSize": 10,
  "totalItems": 23,
  "totalPages": 3
}
```

## 4. GET /api/v1/tickets/:id

Header: `X-Dev-Requester-Id`.

**Response `200`:** ticket object plus `attachments` array:
```json
{
  "...": "ticket fields",
  "attachments": [
    { "id": 3, "fileName": "screenshot.png", "mimeType": "image/png",
      "sizeBytes": 2048, "removedAt": null }
  ]
}
```
Removed attachments still appear (metadata) with non-null `removedAt` (BR-5).

**Errors:** `404` when id does not exist **or belongs to another requester** (no existence leak, BR-1).

## 5. POST /api/v1/tickets/:id/attachments  *(multipart/form-data)*

Field `files`: 1–5 binary parts (BR-4).

**Rules (BR-4):** each file ≤ 5 MB; allowed types `jpg, jpeg, png, webp, pdf` only; total **active** attachments per ticket ≤ 5; ticket must belong to the acting requester.

**Response `201`:** updated attachments array.

**Errors:** `400` limit/type violations (message lists offending files), `401`, `404`.

## 6. GET /api/v1/attachments/:id/download

Header: `X-Dev-Requester-Id`. Streams file content via SeaweedFS proxy.

**Response `200`:** `Content-Type` = stored mime, `Content-Disposition: attachment; filename="..."`.

**Errors:** `404` unknown/not owned; `409` when `removedAt` is set (BR-5); upstream storage failure → `502`.

## 7. DELETE /api/v1/attachments/:id  *(soft remove)*

Header: `X-Dev-Requester-Id`. Sets `removedAt`; keeps storage object and DB row (BR-5).

**Response `200`:** attachment object with `removedAt` timestamp.
**Errors:** `404`; `409` if already removed.

## 8. GET /api/v1/categories

Returns **active** categories for populating the Create Ticket form dropdown (S2).
No authentication required.

**Response `200`:**
```json
[
  { "id": 1, "name": "Software" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Network" },
  { "id": 4, "name": "Access" }
]
```

**Errors:** none under normal conditions; returns empty array if seed has not run.

## 9. GET /api/v1/related-systems

Returns **active** related systems for populating the Create Ticket form dropdown (S2).
No authentication required.

**Response `200`:**
```json
[
  { "id": 1, "name": "CRM" },
  { "id": 2, "name": "Report Portal" }
]
```

**Errors:** none under normal conditions; returns empty array if seed has not run.
