# TokTickIT Lab 2 — UI Specification

Framework: React + TypeScript + Vite + Bootstrap 5.
Screens are client-side routes; the selected Development Requester lives in a React context (`RequesterContext`) and is sent as the `X-Dev-Requester-Id` header by the shared API client (FR-01, BR-01).

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
- Requested Priority uses labelled pill badges: `Low` (green), `Medium` (amber), `High` (red). Colour supplements the text and is never the only signal.
- Requester-facing screens share one Zen Green app shell: TokTickIT brand, My Tickets/Create Ticket/Check System navigation on desktop/tablet, and a Development Requester menu with a Switch action.

## 2. Screens

### S1 — Select Development Requester
| Aspect | Desktop / Tablet / Mobile |
|---|---|
| Layout | Centered Zen Green card with responsive padding, TokTickIT header, and Development Requester context breadcrumb |
| Content | **Dropdown** populated with active requester name + email; development/testing-only explanation; “Only active development requesters are shown” notice; Continue disabled until selection |
| States | Loading (spinner) · Error (retry alert) · Empty (no active requesters alert) |

On continue → requester stored in context; user lands on S3 (My Tickets). A persistent identity chip (name) appears in the navbar on all later screens with a "Switch" action returning to S1.

**Check System** is retained as a utility before and after requester selection. On S1 it is reachable from the desktop/tablet header or the mobile hamburger menu. After selection it remains in the main desktop/tablet navbar and mobile hamburger menu.

### S2 — Create Ticket
| Breakpoint | Form layout |
|---|---|
| Desktop ≥992px | Multi-column: Category + Related System, Requested Priority, then Summary/Description and attachments |
| Tablet 768–991px | 2-column pairs |
| Mobile <768px | Single stacked column, no horizontal scroll |

Fields:
| Field | Control | Validation (client mirrors BR-03) |
|---|---|---|
| Category* | select | required |
| Related System* | select | required |
| Requested Priority* | select (`Low` / `Medium` / `High`) | required |
| Summary* | text input | required, ≤100 chars, live counter |
| Description* | textarea | required, ≤2000 chars, live counter |
| Attachments | dashed upload area + file input/list | ≤5 files, ≤5 MB each, allowed types (BR-04); per-file error row |

States: Default · Busy (submit disabled + spinner) · Success (pale-green success panel showing generated Ticket Number, links to detail/list) · Error (danger alert + preserved form values).

### S3 — My Tickets
| Breakpoint | Presentation |
|---|---|
| Desktop/Tablet | Zen card table: Ticket No · Summary · Category · Requested Priority badge · System · Created · Status badge |
| Mobile | Zen cards (one per ticket), same fields with explicit labels and priority/status badges |

Toolbar: debounced search box for **Ticket Number or Summary**, category/system filter selects, sort select (Newest/Oldest/Summary A-Z), page-size select. Pagination footer shows `Page x of y` with prev/next.
States: Loading skeleton · **Empty** ("No tickets yet" + CTA to Create) · **No results** (filter mismatch message + "Clear filters") · Error alert with retry.

### S4 — Ticket Detail (read-only)
Layout: responsive metadata grid (number, created, requester, category, related system, requested priority badge, status badge) + separate Summary/Description card + Attachments panel.

Attachments rows: icon · filename · size · type · actions:
- Active → Download (secondary green outline button) + Remove (outline danger).
- Removed (`removedAt` set) → muted style, strikethrough name, badge "Removed", recorded removal reason, **no download/remove actions** (metadata only, FR-09).

States: Loading · NotFound (friendly panel + back link) · required removal-reason prompt followed by confirmation before soft delete · Success toast after actions. Cancelling either step leaves the attachment active; a blank reason is rejected before the API call.

## 3. Responsive & Accessibility Conventions

- Below 768px the app shell becomes compact: brand + requester/profile control remain visible while My Tickets/Create Ticket/Check System move into a hamburger menu; requester switching stays available from the profile control/menu.
- Touch targets ≥ 44px on mobile; tables never require horizontal scroll (cards instead).
- Every form control has an associated `<label>`; validation messages linked via `aria-describedby`; focus moves to first invalid field on failed submit.
- Colour is never the only signal: badges include text labels, errors include messages.
