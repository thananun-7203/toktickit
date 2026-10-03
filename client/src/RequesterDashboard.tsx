import { useState } from "react";

interface Props {
  onOpenTicket: (ticketId: number) => void;
  onOpenMyTickets: () => void;
}

type MockTicket = {
  id: number;
  ticketNumber: string;
  summary: string;
  status: string;
  priority: "High" | "Medium" | "Low";
  updatedAt: string;
};

const MOCK_TICKETS: MockTicket[] = [
  {
    id: 1,
    ticketNumber: "TKT-2026-00124",
    summary: "Unable to access the internal reporting system",
    status: "Waiting for Requester",
    priority: "High",
    updatedAt: "Oct 3, 2026 · 4:18 PM",
  },
  {
    id: 2,
    ticketNumber: "TKT-2026-00121",
    summary: "Laptop cannot connect to the office Wi-Fi",
    status: "In Progress",
    priority: "Medium",
    updatedAt: "Oct 3, 2026 · 2:42 PM",
  },
  {
    id: 3,
    ticketNumber: "TKT-2026-00116",
    summary: "Request access to the project shared drive",
    status: "Open",
    priority: "Low",
    updatedAt: "Oct 2, 2026 · 11:06 AM",
  },
  {
    id: 4,
    ticketNumber: "TKT-2026-00109",
    summary: "Printer queue is stuck on the second floor",
    status: "Resolved",
    priority: "Medium",
    updatedAt: "Oct 1, 2026 · 3:25 PM",
  },
];

const MOCK_RESOLVED: MockTicket[] = [
  MOCK_TICKETS[3],
  {
    id: 5,
    ticketNumber: "TKT-2026-00098",
    summary: "Password reset request for the finance portal",
    status: "Closed",
    priority: "Low",
    updatedAt: "Sep 30, 2026 · 10:14 AM",
  },
];

function statusClass(status: string): string {
  return `requester-dashboard-status-${status.toLowerCase().replace(/\s+/g, "-")}`;
}

function priorityClass(priority: MockTicket["priority"]): string {
  return `requester-dashboard-priority-${priority.toLowerCase()}`;
}

function TicketRow({ ticket, onOpenTicket }: { ticket: MockTicket; onOpenTicket: (id: number) => void }) {
  return (
    <article className="requester-dashboard-ticket-row">
      <div className="requester-dashboard-ticket-main">
        <div className="requester-dashboard-ticket-heading">
          <strong>{ticket.ticketNumber}</strong>
          <span className={`requester-dashboard-badge ${statusClass(ticket.status)}`}>{ticket.status}</span>
        </div>
        <h3>{ticket.summary}</h3>
        <div className="requester-dashboard-ticket-meta">
          <span className={`requester-dashboard-badge ${priorityClass(ticket.priority)}`}>{ticket.priority} priority</span>
          <span>Updated {ticket.updatedAt}</span>
        </div>
      </div>
      <button type="button" className="btn btn-outline-success btn-sm requester-dashboard-open" onClick={() => onOpenTicket(ticket.id)}>
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
    <button type="button" className="requester-dashboard-metric" onClick={onOpen} aria-label={`${label}: ${value}. ${description}`}>
      <span className="requester-dashboard-metric-icon" aria-hidden="true">✓</span>
      <span className="requester-dashboard-metric-copy">
        <span className="requester-dashboard-metric-label">{label}</span>
        <strong>{value}</strong>
        <span className="requester-dashboard-metric-link">{description} <span aria-hidden="true">→</span></span>
      </span>
    </button>
  );
}

export default function RequesterDashboard({ onOpenTicket, onOpenMyTickets }: Props) {
  const [mockState, setMockState] = useState<"success" | "empty" | "error">("success");

  if (mockState === "empty") {
    return (
      <section className="requester-dashboard-page" aria-labelledby="requester-dashboard-title">
        <div className="requester-dashboard-heading">
          <div>
            <p className="requester-dashboard-eyebrow">REQUESTER WORKSPACE</p>
            <h1 id="requester-dashboard-title" className="page-title">Dashboard</h1>
            <p className="page-subtitle">A quick view of your support requests and the Tickets that need your attention.</p>
          </div>
        </div>
        <div className="requester-dashboard-metrics">
          <MetricCard label="Open Tickets" value={0} description="Open My Tickets" onOpen={onOpenMyTickets} />
          <MetricCard label="Waiting for You" value={0} description="View waiting Tickets" onOpen={onOpenMyTickets} />
        </div>
        <div className="requester-dashboard-empty-grid">
          <section className="zen-card requester-dashboard-card">
            <div className="requester-dashboard-card-heading">
              <div><span className="requester-dashboard-section-kicker">ACTIVITY</span><h2>Recently Updated</h2></div>
              <span className="requester-dashboard-count-label">Top 5</span>
            </div>
            <p className="requester-dashboard-empty">No recent Tickets</p>
          </section>
          <section className="zen-card requester-dashboard-card">
            <div className="requester-dashboard-card-heading">
              <div><span className="requester-dashboard-section-kicker">COMPLETED WORK</span><h2>Recently Resolved</h2></div>
              <span className="requester-dashboard-count-label">Top 5</span>
            </div>
            <p className="requester-dashboard-empty">No recently resolved Tickets</p>
          </section>
        </div>
        <button type="button" className="btn btn-outline-success" onClick={() => setMockState("success")}>Show sample data</button>
      </section>
    );
  }

  if (mockState === "error") {
    return (
      <section className="zen-card content-card requester-dashboard-state" role="alert" aria-labelledby="requester-dashboard-error-title">
        <div className="requester-dashboard-state-icon requester-dashboard-state-icon-error" aria-hidden="true">!</div>
        <h1 id="requester-dashboard-error-title">Unable to load Dashboard</h1>
        <p>The Dashboard response was unavailable. Your Tickets and workspace have not been changed.</p>
        <button type="button" className="btn btn-success" onClick={() => setMockState("success")}>Retry</button>
      </section>
    );
  }

  return (
    <section className="requester-dashboard-page" aria-labelledby="requester-dashboard-title">
      <div className="requester-dashboard-heading">
        <div>
          <p className="requester-dashboard-eyebrow">REQUESTER WORKSPACE</p>
          <h1 id="requester-dashboard-title" className="page-title">Dashboard</h1>
          <p className="page-subtitle">A quick view of your support requests and the Tickets that need your attention.</p>
        </div>
        <button type="button" className="btn btn-outline-success requester-dashboard-all-button" onClick={onOpenMyTickets}>View My Tickets</button>
      </div>

      <div className="requester-dashboard-metrics">
        <MetricCard label="Open Tickets" value={3} description="Open My Tickets" onOpen={onOpenMyTickets} />
        <MetricCard label="Waiting for You" value={1} description="View waiting Tickets" onOpen={onOpenMyTickets} />
      </div>

      <div className="requester-dashboard-list-grid">
        <section className="zen-card requester-dashboard-card" aria-labelledby="recently-updated-heading">
          <div className="requester-dashboard-card-heading">
            <div><span className="requester-dashboard-section-kicker">ACTIVITY</span><h2 id="recently-updated-heading">Recently Updated</h2></div>
            <span className="requester-dashboard-count-label">Top 5</span>
          </div>
          <div className="requester-dashboard-ticket-list">
            {MOCK_TICKETS.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} onOpenTicket={onOpenTicket} />)}
          </div>
        </section>

        <section className="zen-card requester-dashboard-card" aria-labelledby="recently-resolved-heading">
          <div className="requester-dashboard-card-heading">
            <div><span className="requester-dashboard-section-kicker">COMPLETED WORK</span><h2 id="recently-resolved-heading">Recently Resolved</h2></div>
            <span className="requester-dashboard-count-label">Top 5</span>
          </div>
          <div className="requester-dashboard-ticket-list">
            {MOCK_RESOLVED.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} onOpenTicket={onOpenTicket} />)}
          </div>
        </section>
      </div>

      <div className="requester-dashboard-mock-controls" aria-label="Mockup state controls">
        <span>Mockup preview</span>
        <button type="button" className="btn btn-sm btn-light" onClick={() => setMockState("empty")}>Preview empty</button>
        <button type="button" className="btn btn-sm btn-light" onClick={() => setMockState("error")}>Preview error</button>
      </div>
    </section>
  );
}
