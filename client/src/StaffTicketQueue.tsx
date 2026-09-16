import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  Category,
  getCategories,
  getRelatedSystems,
  getStaffAssignees,
  getStaffQueue,
  RelatedSystem,
  REQUESTED_PRIORITIES,
  StaffAssignee,
  StaffQueueParams,
  StaffQueueResponse,
  StaffQueueTicket,
  TICKET_STATUSES,
} from "./api.js";

interface Props {
  onOpenTicket: (ticketId: number) => void;
}

const DEFAULT_PARAMS: StaffQueueParams = { sort: "updated_desc", page: 1, pageSize: 10 };

function dateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function priorityLabel(value: string | null): string {
  return value ?? "Not recorded";
}

function badgeToken(value: string | null): string {
  return (value ?? "not-recorded").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function QueueCard({ ticket, onOpenTicket }: { ticket: StaffQueueTicket; onOpenTicket: (id: number) => void }) {
  return (
    <article className="staff-queue-card">
      <div className="staff-queue-card-top">
        <strong>{ticket.ticketNumber}</strong>
        <span className={`queue-badge status-${badgeToken(ticket.status)}`}>{ticket.status}</span>
      </div>
      <h2>{ticket.summary}</h2>
      <p className="staff-queue-secondary">{ticket.requester.name} · {ticket.requester.email}</p>
      <dl className="staff-queue-card-grid">
        <div><dt>Category</dt><dd>{ticket.category.name}</dd></div>
        <div><dt>Owner</dt><dd>{ticket.owner?.name ?? <span className="owner-unassigned">Unassigned</span>}</dd></div>
        <div><dt>Requested</dt><dd><span className={`queue-badge priority-${badgeToken(ticket.requestedPriority)}`}>{priorityLabel(ticket.requestedPriority)}</span></dd></div>
        <div><dt>IT Priority</dt><dd><span className={`queue-badge priority-${badgeToken(ticket.itPriority)}`}>{priorityLabel(ticket.itPriority)}</span></dd></div>
      </dl>
      <p className="staff-queue-updated">Updated {dateTime(ticket.updatedAt)}</p>
      <button type="button" className="btn btn-success w-100" onClick={() => onOpenTicket(ticket.id)}>
        Open Ticket
      </button>
    </article>
  );
}

export default function StaffTicketQueue({ onOpenTicket }: Props) {
  const [params, setParams] = useState<StaffQueueParams>(DEFAULT_PARAMS);
  const [searchDraft, setSearchDraft] = useState("");
  const [data, setData] = useState<StaffQueueResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [assignees, setAssignees] = useState<StaffAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([getCategories(), getRelatedSystems(), getStaffAssignees()])
      .then(([nextCategories, nextSystems, nextAssignees]) => {
        if (!active) return;
        setCategories(nextCategories);
        setSystems(nextSystems);
        setAssignees(nextAssignees);
      })
      .catch(() => {
        // Queue loading still proceeds; reference controls simply remain minimal.
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getStaffQueue(params)
      .then((next) => {
        if (active) setData(next);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 403) setError("You do not have permission to open the Ticket Queue.");
        else setError("Unable to load the Ticket Queue. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [params, retryKey]);

  const hasFilters = useMemo(() => Boolean(
    params.search || params.status || params.requestedPriority || params.itPriority || params.owner !== undefined
      || params.categoryId || params.relatedSystemId,
  ), [params]);

  function update<K extends keyof StaffQueueParams>(key: K, value: StaffQueueParams[K]) {
    setParams((current) => ({ ...current, [key]: value || undefined, page: 1 }));
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = searchDraft.trim();
    if (Array.from(trimmed).length > 100) {
      setError("Search must be at most 100 characters.");
      return;
    }
    update("search", trimmed || undefined);
  }

  function clearFilters() {
    setSearchDraft("");
    setParams(DEFAULT_PARAMS);
  }

  const items = data?.items ?? [];

  return (
    <section className="zen-card content-card staff-queue-page" aria-labelledby="staff-queue-title">
      <div className="staff-queue-heading">
        <div>
          <h1 id="staff-queue-title" className="page-title">Ticket Queue</h1>
          <p className="page-subtitle">Find, prioritize, and open operational support work.</p>
        </div>
        {data && !loading && <div className="queue-result-count" aria-label={`${data.totalItems} queue results`}>{data.totalItems} tickets</div>}
      </div>

      <form className="staff-queue-search" onSubmit={submitSearch}>
        <label htmlFor="queue-search" className="form-label">Search</label>
        <div className="input-group">
          <input
            id="queue-search"
            className="form-control"
            value={searchDraft}
            placeholder="Ticket number, summary, requester name or email"
            onChange={(event) => setSearchDraft(event.target.value)}
          />
          <button className="btn btn-success" type="submit">Search</button>
        </div>
      </form>

      <div className="staff-queue-filters" aria-label="Ticket Queue filters">
        <label>Status<select aria-label="Status" className="form-select" value={params.status ?? ""} onChange={(e) => update("status", (e.target.value || undefined) as StaffQueueParams["status"])}><option value="">All statuses</option>{TICKET_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Requested Priority<select aria-label="Requested Priority" className="form-select" value={params.requestedPriority ?? ""} onChange={(e) => update("requestedPriority", (e.target.value || undefined) as StaffQueueParams["requestedPriority"])}><option value="">All</option>{REQUESTED_PRIORITIES.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>IT Priority<select aria-label="IT Priority" className="form-select" value={params.itPriority ?? ""} onChange={(e) => update("itPriority", (e.target.value || undefined) as StaffQueueParams["itPriority"])}><option value="">All</option>{REQUESTED_PRIORITIES.map((value) => <option key={value}>{value}</option>)}<option value="not_recorded">Not recorded</option></select></label>
        <label>Owner<select aria-label="Owner" className="form-select" value={params.owner ?? ""} onChange={(e) => update("owner", e.target.value === "" ? undefined : e.target.value === "unassigned" || e.target.value === "mine" ? e.target.value : Number(e.target.value))}><option value="">All owners</option><option value="unassigned">Unassigned</option><option value="mine">Mine</option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
        <label>Category<select aria-label="Category" className="form-select" value={params.categoryId ?? ""} onChange={(e) => update("categoryId", e.target.value ? Number(e.target.value) : undefined)}><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Related System<select aria-label="Related System" className="form-select" value={params.relatedSystemId ?? ""} onChange={(e) => update("relatedSystemId", e.target.value ? Number(e.target.value) : undefined)}><option value="">All systems</option>{systems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Sort<select aria-label="Sort" className="form-select" value={params.sort ?? "updated_desc"} onChange={(e) => update("sort", e.target.value as StaffQueueParams["sort"])}><option value="updated_desc">Recently updated</option><option value="created_desc">Newest created</option><option value="created_asc">Oldest created</option><option value="priority_desc">IT priority: high to low</option><option value="ticket_number_asc">Ticket number</option></select></label>
        <div className="staff-filter-action"><button type="button" className="btn btn-outline-secondary" onClick={clearFilters} disabled={!hasFilters}>Clear filters</button></div>
      </div>

      {error && (
        <div className="alert alert-danger staff-queue-state" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setRetryKey((value) => value + 1)}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="staff-queue-state" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Loading Ticket Queue…</div>
      ) : !error && items.length === 0 ? (
        <div className="staff-queue-empty">
          <h2>{hasFilters ? "No results" : "No tickets yet"}</h2>
          <p>{hasFilters ? "No tickets match the current search or filters." : "The shared Ticket Queue is currently empty."}</p>
          {hasFilters && <button type="button" className="btn btn-outline-success" onClick={clearFilters}>Clear filters</button>}
        </div>
      ) : !error ? (
        <>
          <div className="staff-queue-table-wrap">
            <table className="staff-queue-table">
              <thead><tr><th>Ticket</th><th>Updated</th><th>Summary</th><th>Category</th><th>Requested</th><th>IT Priority</th><th>Status</th><th>Owner</th><th><span className="visually-hidden">Action</span></th></tr></thead>
              <tbody>{items.map((ticket) => (
                <tr key={ticket.id}>
                  <td><strong>{ticket.ticketNumber}</strong></td>
                  <td><span>{dateTime(ticket.updatedAt)}</span><small>Created {dateTime(ticket.createdAt)}</small></td>
                  <td><strong>{ticket.summary}</strong><small>{ticket.requester.name}<br />{ticket.requester.email}</small></td>
                  <td>{ticket.category.name}<small>{ticket.relatedSystem.name}</small></td>
                  <td><span className={`queue-badge priority-${badgeToken(ticket.requestedPriority)}`}>{priorityLabel(ticket.requestedPriority)}</span></td>
                  <td><span className={`queue-badge priority-${badgeToken(ticket.itPriority)}`}>{priorityLabel(ticket.itPriority)}</span></td>
                  <td><span className={`queue-badge status-${badgeToken(ticket.status)}`}>{ticket.status}</span></td>
                  <td>{ticket.owner ? <span>{ticket.owner.name}<small>{ticket.owner.role.replace("_", " ")}</small></span> : <span className="owner-unassigned">Unassigned</span>}</td>
                  <td><button type="button" className="btn btn-sm btn-outline-success" aria-label={`Open ${ticket.ticketNumber}`} onClick={() => onOpenTicket(ticket.id)}>Open</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="staff-queue-cards">{items.map((ticket) => <QueueCard key={ticket.id} ticket={ticket} onOpenTicket={onOpenTicket} />)}</div>
          <div className="staff-queue-pagination" aria-label="Ticket Queue pagination">
            <span>Page {data?.page ?? 1} of {Math.max(data?.totalPages ?? 0, 1)}</span>
            <div>
              <button type="button" className="btn btn-outline-secondary btn-sm" disabled={(data?.page ?? 1) <= 1} onClick={() => setParams((current) => ({ ...current, page: Math.max((current.page ?? 1) - 1, 1) }))}>Previous</button>
              <button type="button" className="btn btn-outline-secondary btn-sm" disabled={(data?.page ?? 1) >= (data?.totalPages ?? 0)} onClick={() => setParams((current) => ({ ...current, page: (current.page ?? 1) + 1 }))}>Next</button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
