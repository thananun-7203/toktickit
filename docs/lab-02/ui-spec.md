# TokTickIT Lab 2 — UI Specification

Framework: React + TypeScript + Vite + Bootstrap 5.
Screens are client-side routes; the selected Development Requester lives in a React context (`RequesterContext`) and is sent as the `X-Dev-Requester-Id` header by the shared API client (FR-1, BR-1).

---

## 1. Zen Green Theme Tokens

| Token | Value | Usage |
|---|---|---|
| Primary Green | `#006B3C` | Header/nav background, primary buttons, active nav item |
| Secondary Green | `#0B7A46` | Button hover, links, focus rings, table header accents |
| Pale Green | `#EAF6EF` | Page/section backgrounds, badges, info alerts |
| Neutral text | Bootstrap default (`#212529`) | Body text |
| Danger | Bootstrap default | Error messages, destructive remove button |

Rules:
- All primary actions use Primary Green; hover state shifts to Secondary Green.
- Required fields show a red asterisk (*) after the label; validation messages render **directly below** the input in danger color with `.invalid-feedback`.
- Status badges on lists use Pale Green background with Secondary Green text.

## 2. Screens

### S1 — Select Development Requester
| Aspect | Desktop / Tablet / Mobile |
|---|---|
| Layout | Centered card (max-width 480px), app title above |
| Content | Radio-style list of **active** requesters (name + email); Continue button (disabled until selection) |
| States | Loading (spinner) · Error (retry alert) · Empty (no active requesters alert) |

On continue → requester stored in context; user lands on S3 (My Tickets). A persistent identity chip (name) appears in the navbar on all later screens with a "Switch" action returning to S1.

### S2 — Create Ticket
| Breakpoint | Form layout |
|---|---|
| Desktop ≥992px | Multi-column: Category + Related System side-by-side, Summary full width, Description full width, attachments dropzone full width |
| Tablet 768–991px | 2-column pairs |
| Mobile <768px | Single stacked column, no horizontal scroll |

Fields:
| Field | Control | Validation (client mirrors BR-3) |
|---|---|---|
| Category* | select | required |
| Related System* | select | required |
| Summary* | text input | required, ≤100 chars, live counter |
| Description* | textarea | required, ≤2000 chars, live counter |
| Attachments | file input + list | ≤5 files, ≤5 MB each, allowed types (BR-4); per-file error row |

States: Default · Busy (submit disabled + spinner) · Success (pale-green success panel showing generated Ticket Number, links to detail/list) · Error (danger alert + preserved form values).

### S3 — My Tickets
| Breakpoint | Presentation |
|---|---|
| Desktop/Tablet | Table: Ticket No · Summary · Category · System · Created · Status badge |
| Mobile | Cards (one per ticket), same fields stacked |

Toolbar: search box (debounced), category filter select, sort select (Newest/Oldest/Summary A-Z), page-size select. Pagination footer shows `Page x of y` with prev/next.
States: Loading skeleton · **Empty** ("No tickets yet" + CTA to Create) · **No results** (filter mismatch message + "Clear filters") · Error alert with retry.

### S4 — Ticket Detail (read-only)
Layout: definition-list of ticket metadata (number, status badge, requester, category, system, created) + description block + Attachments section.

Attachments rows: icon · filename · size · type · actions:
- Active → Download (secondary green outline button) + Remove (outline danger).
- Removed (`removedAt` set) → muted style, strikethrough name, badge "Removed", recorded removal reason, **no download/remove actions** (metadata only, FR-9).

States: Loading · NotFound (friendly panel + back link) · required removal-reason prompt followed by confirmation before soft delete · Success toast after actions. Cancelling either step leaves the attachment active; a blank reason is rejected before the API call.

## 3. Responsive & Accessibility Conventions

- Navbar collapses to hamburger below 768px (Bootstrap defaults).
- Touch targets ≥ 44px on mobile; tables never require horizontal scroll (cards instead).
- Every form control has an associated `<label>`; validation messages linked via `aria-describedby`; focus moves to first invalid field on failed submit.
- Colour is never the only signal: badges include text labels, errors include messages.
