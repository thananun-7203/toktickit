import { useCallback, useEffect, useState } from "react";
import { getRequesterDashboard, type RequesterDashboardResponse, type RequesterDashboardTicketSummary } from "./api.js";

interface Props {
  onOpenTicket: (ticketId: number) => void;
  onOpenMyTickets: () => void;
}

type LoadState = "loading" | "success" | "error";

function statusClass(status: string): string {
  return `requester-dashboard-status-${status.toLowerCase().replace(/\s+/g, "-")}`;
}

function priorityClass(priority: RequesterDashboardTicketSummary["itPriority"]): string {
  return priority
    ? `requester-dashboard-priority-${priority.toLowerCase()}`
    : "requester-dashboard-priority-not-recorded";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function TicketRow({
  ticket,
  onOpenTicket,
}: {
  ticket: RequesterDashboardTicketSummary;
  onOpenTicket: (id: number) => void;
}) {
  return (
    <article className="requester-dashboard-ticket-row">
      <div className="requester-dashboard-ticket-main">
        <div className="requester-dashboard-ticket-heading">
          <strong>{ticket.ticketNumber}</strong>
          <span className={`requester-dashboard-badge ${statusClass(ticket.status)}`}>{ticket.status}</span>
        </div>
        <h3>{ticket.summary}</h3>
        <div className="requester-dashboard-ticket-meta">
          <span className={`requester-dashboard-badge ${priorityClass(ticket.itPriority)}`}>
            {ticket.itPriority ?? "Not recorded"} priority
          </span>
          <span>Updated {formatDate(ticket.updatedAt)}</span>
        </div>
      </div>
      <button
        type="button"
        className="btn btn-outline-success btn-sm requester-dashboard-open"
        onClick={() => onOpenTicket(ticket.id)}
      >
        Open Ticket
      </button>
    </article>
  );
}

function MetricCard({
  label,
  value,
  description,
  onOpen,
}: {
  label: string;
  value: number;
  description: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="requester-dashboard-metric"
      onClick={onOpen}
      aria-label={`${label}: ${value}. ${description}`}
    >
      <span className="requester-dashboard-metric-icon" aria-hidden="true">✓</span>
      <span className="requester-dashboard-metric-copy">
        <span className="requester-dashboard-metric-label">{label}</span>
        <strong>{value}</strong>
        <span className="requester-dashboard-metric-link">{description} <span aria-hidden="true">→</span></span>
      </span>
    </button>
  );
}

function DashboardList({
  title,
  kicker,
  emptyMessage,
  tickets,
  onOpenTicket,
  headingId,
}: {
  title: string;
  kicker: string;
  emptyMessage: string;
  tickets: RequesterDashboardTicketSummary[];
  onOpenTicket: (ticketId: number) => void;
  headingId: string;
}) {
  return (
    <section className="zen-card requester-dashboard-card" aria-labelledby={headingId}>
      <div className="requester-dashboard-card-heading">
        <div>
          <span className="requester-dashboard-section-kicker">{kicker}</span>
          <h2 id={headingId}>{title}</h2>
        </div>
        <span className="requester-dashboard-count-label">Top 5</span>
      </div>
      {tickets.length === 0 ? (
        <p className="requester-dashboard-empty">{emptyMessage}</p>
      ) : (
        <div className="requester-dashboard-ticket-list">
          {tickets.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} onOpenTicket={onOpenTicket} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function RequesterDashboard({ onOpenTicket, onOpenMyTickets }: Props) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [data, setData] = useState<RequesterDashboardResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("Unable to load Requester Dashboard");

  const loadDashboard = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage("Unable to load Requester Dashboard");
    try {
      const result = await getRequesterDashboard();
      setData(result);
      setLoadState("success");
    } catch (error) {
      setData(null);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load Requester Dashboard");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loadState === "loading") {
    return (
      <section className="zen-card content-card requester-dashboard-state" role="status" aria-live="polite">
        <div className="requester-dashboard-state-icon" aria-hidden="true">✓</div>
        <h1>Loading Dashboard</h1>
        <p>Loading your Ticket summary…</p>
      </section>
    );
  }

  if (loadState === "error") {
    const forbidden = errorMessage.toLowerCase().includes("forbidden") || errorMessage.includes("403");
    return (
      <section className="zen-card content-card requester-dashboard-state" role="alert" aria-labelledby="requester-dashboard-error-title">
        <div className="requester-dashboard-state-icon requester-dashboard-state-icon-error" aria-hidden="true">!</div>
        <h1 id="requester-dashboard-error-title">{forbidden ? "Dashboard unavailable" : "Unable to load Dashboard"}</h1>
        <p>{forbidden ? "This Dashboard is available only to authenticated Requesters." : "The Dashboard response was unavailable. Your Tickets and workspace have not been changed."}</p>
        {!forbidden && <button type="button" className="btn btn-success" onClick={() => void loadDashboard()}>Retry</button>}
      </section>
    );
  }

  const dashboard = data!;

  return (
    <section className="requester-dashboard-page" aria-labelledby="requester-dashboard-title">
      <div className="requester-dashboard-heading">
        <div>
          <p className="requester-dashboard-eyebrow">REQUESTER WORKSPACE</p>
          <h1 id="requester-dashboard-title" className="page-title">Dashboard</h1>
          <p className="page-subtitle">A quick view of your support requests and the Tickets that need your attention.</p>
        </div>
        <button type="button" className="btn btn-outline-success requester-dashboard-all-button" onClick={onOpenMyTickets}>
          View My Tickets
        </button>
      </div>

      <div className="requester-dashboard-metrics">
        <MetricCard
          label="Open Tickets"
          value={dashboard.metrics.openTickets}
          description="Open My Tickets"
          onOpen={onOpenMyTickets}
        />
        <MetricCard
          label="Waiting for You"
          value={dashboard.metrics.waitingForYou}
          description="View waiting Tickets"
          onOpen={onOpenMyTickets}
        />
      </div>

      <div className="requester-dashboard-list-grid">
        <DashboardList
          title="Recently Updated"
          kicker="ACTIVITY"
          emptyMessage="No recent Tickets"
          tickets={dashboard.recentlyUpdatedTickets}
          onOpenTicket={onOpenTicket}
          headingId="recently-updated-heading"
        />
        <DashboardList
          title="Recently Resolved"
          kicker="COMPLETED WORK"
          emptyMessage="No recently resolved Tickets"
          tickets={dashboard.recentlyResolvedTickets}
          onOpenTicket={onOpenTicket}
          headingId="recently-resolved-heading"
        />
      </div>
    </section>
  );
}
