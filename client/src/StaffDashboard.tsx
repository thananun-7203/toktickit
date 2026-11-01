import { useEffect, useState } from "react";
import { ApiError, getStaffDashboard, StaffDashboardResponse, StaffQueueParams, TICKET_STATUSES } from "./api.js";

interface Props {
  onOpenTicket: (ticketId: number) => void;
  onOpenQueue: (params?: Partial<StaffQueueParams>) => void;
}

const PRIORITIES = ["High", "Medium", "Low", "Not recorded"] as const;

function dateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function badgeToken(value: string | null): string {
  return (value ?? "not-recorded").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function MetricCard({ label, value, onOpen }: { label: string; value: number; onOpen: () => void }) {
  return (
    <button type="button" className="staff-dashboard-metric" onClick={onOpen} aria-label={`${label}: ${value}. Open related Tickets`}>
      <span className="staff-dashboard-metric-label">{label}</span>
      <strong>{value}</strong>
      <span className="staff-dashboard-metric-link">Open related Tickets <span aria-hidden="true">→</span></span>
    </button>
  );
}

export default function StaffDashboard({ onOpenTicket, onOpenQueue }: Props) {
  const [data, setData] = useState<StaffDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setForbidden(false);
    getStaffDashboard()
      .then((next) => { if (active) setData(next); })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
        else setError("Unable to load the Staff Dashboard. Your workspace has not been changed.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retryKey]);

  if (loading) {
    return <section className="zen-card content-card staff-dashboard-state" aria-labelledby="staff-dashboard-title" role="status">
      <span className="spinner-border text-success" aria-hidden="true" />
      <h1 id="staff-dashboard-title">Loading Dashboard...</h1>
      <p>Preparing the latest operational summary.</p>
    </section>;
  }

  if (forbidden) {
    return <section className="zen-card content-card staff-dashboard-state" role="alert">
      <div className="staff-dashboard-state-icon" aria-hidden="true">×</div>
      <h1>Dashboard unavailable</h1>
      <p>You do not have permission to open the Staff Dashboard.</p>
    </section>;
  }

  if (error || !data) {
    return <section className="zen-card content-card staff-dashboard-state" role="alert">
      <div className="staff-dashboard-state-icon staff-dashboard-state-icon-error" aria-hidden="true">!</div>
      <h1>Unable to load Staff Dashboard</h1>
      <p>{error ?? "The Dashboard response was unavailable."}</p>
      <button type="button" className="btn btn-success" onClick={() => setRetryKey((value) => value + 1)}>Retry</button>
    </section>;
  }

  const { metrics, myActiveActions, recentlyUpdatedTickets, urgentTickets } = data;
  const hasAnyWork = metrics.unassignedActiveTickets > 0 || metrics.myActiveTickets > 0 || myActiveActions.length > 0 || recentlyUpdatedTickets.length > 0 || urgentTickets.length > 0;

  return (
    <section className="staff-dashboard-page" aria-labelledby="staff-dashboard-title">
      <div className="staff-dashboard-heading">
        <div>
          <p className="staff-dashboard-eyebrow">IT OPERATIONS</p>
          <h1 id="staff-dashboard-title" className="page-title">Dashboard</h1>
          <p className="page-subtitle">Operational overview of active Tickets and work assigned to you.</p>
        </div>
      </div>

      <div className="staff-dashboard-metrics">
        <MetricCard label="Unassigned Active Tickets" value={metrics.unassignedActiveTickets} onOpen={() => onOpenQueue({ owner: "unassigned", status: "active" })} />
        <MetricCard label="My Active Tickets" value={metrics.myActiveTickets} onOpen={() => onOpenQueue({ owner: "mine", status: "active" })} />
      </div>

      <div className="staff-dashboard-summary-grid">
        <section className="zen-card staff-dashboard-card" aria-labelledby="status-heading">
          <div className="staff-dashboard-card-heading"><div><span className="staff-dashboard-section-kicker">WORKFLOW</span><h2 id="status-heading">Tickets by Status</h2></div></div>
          <div className="staff-dashboard-status-list">
            {TICKET_STATUSES.map((status) => (
              <button key={status} type="button" className="staff-dashboard-status-row" onClick={() => onOpenQueue({ status })}>
                <span><span className={`staff-dashboard-badge status-${badgeToken(status)}`}>{status}</span></span>
                <strong>{metrics.byStatus[status] ?? 0}</strong>
                <span className="staff-dashboard-row-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </section>

        <section className="zen-card staff-dashboard-card" aria-labelledby="priority-heading">
          <div className="staff-dashboard-card-heading"><div><span className="staff-dashboard-section-kicker">ACTIVE WORK</span><h2 id="priority-heading">Active Tickets by IT Priority</h2></div></div>
          <div className="staff-dashboard-priority-list">
            {PRIORITIES.map((priority) => (
              <button key={priority} type="button" className="staff-dashboard-priority-row" onClick={() => onOpenQueue({ status: "active", itPriority: priority === "Not recorded" ? "not_recorded" : priority as "Low" | "Medium" | "High" })}>
                <span><span className={`staff-dashboard-badge priority-${badgeToken(priority)}`}>{priority}</span></span>
                <strong>{metrics.activeByItPriority[priority] ?? 0}</strong>
                <span className="staff-dashboard-row-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
          <p className="staff-dashboard-card-note">Counts include only active Ticket statuses; missing IT Priority is shown as Not recorded.</p>
        </section>
      </div>

      <div className="staff-dashboard-work-grid">
        <section className="zen-card staff-dashboard-card" aria-labelledby="actions-heading">
          <div className="staff-dashboard-card-heading"><div><span className="staff-dashboard-section-kicker">YOUR WORK</span><h2 id="actions-heading">My Active Actions</h2></div><span className="staff-dashboard-count-label">Top 5</span></div>
          {myActiveActions.length === 0 ? <div className="staff-dashboard-list-empty">No active Actions assigned to you.</div> : (
            <div className="staff-dashboard-action-list">
              {myActiveActions.map((action) => (
                <article key={action.id} className="staff-dashboard-action-row">
                  <div className="staff-dashboard-action-main">
                    <div className="staff-dashboard-ticket-line"><strong>{action.ticket.ticketNumber}</strong><span className={`staff-dashboard-badge status-${badgeToken(action.status)}`}>{action.status}</span></div>
                    <p>{action.description}</p>
                    <span>Updated {dateTime(action.updatedAt)} · Assigned to you</span>
                  </div>
                  <button type="button" className="btn btn-outline-success btn-sm" onClick={() => onOpenTicket(action.ticketId)}>Open Ticket</button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="zen-card staff-dashboard-card" aria-labelledby="urgent-heading">
          <div className="staff-dashboard-card-heading"><div><span className="staff-dashboard-section-kicker">ATTENTION</span><h2 id="urgent-heading">Urgent Tickets</h2></div><span className="staff-dashboard-count-label">High IT Priority · Top 5</span></div>
          {urgentTickets.length === 0 ? <div className="staff-dashboard-list-empty">No urgent Tickets.</div> : (
            <div className="staff-dashboard-compact-list">
              {urgentTickets.map((ticket) => (
                <button key={ticket.id} type="button" className="staff-dashboard-compact-row" onClick={() => onOpenTicket(ticket.id)}>
                  <span><strong>{ticket.ticketNumber}</strong><span>{ticket.summary}</span></span>
                  <span><span className={`staff-dashboard-badge status-${badgeToken(ticket.status)}`}>{ticket.status}</span><small>{dateTime(ticket.updatedAt)}</small></span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="zen-card staff-dashboard-card staff-dashboard-recent-card" aria-labelledby="recent-heading">
        <div className="staff-dashboard-card-heading"><div><span className="staff-dashboard-section-kicker">ACTIVITY</span><h2 id="recent-heading">Recently Updated</h2></div><span className="staff-dashboard-count-label">Active Tickets · Top 5</span></div>
        {recentlyUpdatedTickets.length === 0 ? <div className="staff-dashboard-list-empty">No recently updated Tickets.</div> : (
          <div className="staff-dashboard-recent-list">
            {recentlyUpdatedTickets.map((ticket) => (
              <article key={ticket.id} className="staff-dashboard-recent-row">
                <div>
                  <div className="staff-dashboard-ticket-line"><strong>{ticket.ticketNumber}</strong><span className={`staff-dashboard-badge status-${badgeToken(ticket.status)}`}>{ticket.status}</span></div>
                  <p>{ticket.summary}</p>
                  <span>IT Priority: {ticket.itPriority ?? "Not recorded"} · Updated {dateTime(ticket.updatedAt)}</span>
                </div>
                <button type="button" className="btn btn-success btn-sm" onClick={() => onOpenTicket(ticket.id)}>Open Ticket</button>
              </article>
            ))}
          </div>
        )}
      </section>

      {!hasAnyWork && <p className="staff-dashboard-all-empty" role="status">No active operational work is currently available.</p>}
    </section>
  );
}
