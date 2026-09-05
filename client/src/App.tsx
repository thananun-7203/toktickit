import { useEffect, useState } from "react";
import { checkSystem, Category } from "./api.js";
import { useRequester } from "./RequesterContext.js";
import SelectRequester from "./SelectRequester.js";
import CreateTicket from "./CreateTicket.js";
import MyTickets from "./MyTickets.js";
import TicketDetail from "./TicketDetail.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";
type View = "home" | "create" | "my-tickets" | "ticket-detail";

export default function App() {
  const { requester, clearRequester } = useRequester();
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  // ui-spec S1: after a Development Requester is selected, the requester
  // workflow lands on S3 (My Tickets), not the legacy Lab 1 home screen.
  const [view, setView] = useState<View>("my-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // App stays mounted while the selector is shown, so resetting only the
  // initial state is not enough: Switch -> select another requester must also
  // land on My Tickets instead of preserving the previous requester's view.
  useEffect(() => {
    if (requester) {
      setSelectedTicketId(null);
      setView("my-tickets");
      setMobileMenuOpen(false);
    }
  }, [requester?.id]);

  function openTicket(ticketId: number) {
    setSelectedTicketId(ticketId);
    setView("ticket-detail");
  }

  function showMyTickets() {
    setSelectedTicketId(null);
    setView("my-tickets");
    setMobileMenuOpen(false);
  }

  function showCreateTicket() {
    setSelectedTicketId(null);
    setView("create");
    setMobileMenuOpen(false);
  }

  function showSystemCheck() {
    setSelectedTicketId(null);
    setView("home");
    setMobileMenuOpen(false);
  }

  if (!requester) {
    return <SelectRequester />;
  }

  async function handleCheck() {
    setState("loading");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="app-shell">
      <header className="zen-navbar">
        <div className="zen-navbar-inner">
          <div className="mobile-nav-wrap">
            <button
              type="button"
              className="mobile-menu-toggle"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              <span aria-hidden="true">☰</span>
            </button>

            {mobileMenuOpen && (
              <div className="mobile-nav-panel" role="menu">
                <button type="button" role="menuitem" onClick={showMyTickets}>
                  <span aria-hidden="true">≡</span> My Tickets
                </button>
                <button type="button" role="menuitem" onClick={showCreateTicket}>
                  <span aria-hidden="true">+</span> Create Ticket
                </button>
                <button type="button" role="menuitem" onClick={showSystemCheck}>
                  <span aria-hidden="true">⌁</span> Check System
                </button>
                <div className="mobile-nav-requester">
                  <span className="small text-secondary">Current Requester</span>
                  <strong>{requester.name}</strong>
                  <button
                    type="button"
                    className="mobile-switch-button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      clearRequester();
                    }}
                  >
                    Switch requester
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="brand-lockup" aria-label="TokTickIT">
            <span className="brand-mark" aria-hidden="true" />
            <span>TokTickIT</span>
          </div>

          <nav className="app-nav-links" aria-label="Primary navigation">
            <button
              className={`app-nav-button ${view === "my-tickets" || view === "ticket-detail" ? "active" : ""}`}
              onClick={showMyTickets}
            >
              <span className="nav-icon" aria-hidden="true">≡</span>
              My Tickets
            </button>
            <button
              className={`app-nav-button ${view === "create" ? "active" : ""}`}
              onClick={showCreateTicket}
            >
              <span className="nav-icon" aria-hidden="true">+</span>
              Create Ticket
            </button>
            <button
              className={`app-nav-button ${view === "home" ? "active" : ""}`}
              onClick={showSystemCheck}
            >
              <span className="nav-icon" aria-hidden="true">⌁</span>
              Check System
            </button>
          </nav>

          <details className="requester-menu">
            <summary aria-label={`Requester menu for ${requester.name}`}>
              <span className="requester-avatar" aria-hidden="true">●</span>
              <span className="requester-name">{requester.name}</span>
              <span aria-hidden="true">⌄</span>
            </summary>
            <div className="requester-dropdown">
              <div className="small text-secondary px-2 py-1">Development Requester</div>
              <div className="fw-semibold px-2 pb-2">{requester.name}</div>
              <button className="btn btn-light btn-sm" onClick={clearRequester}>Switch</button>
            </div>
          </details>
        </div>
      </header>

      <main className="app-content">
        {view === "create" ? (
          <CreateTicket onOpenTicket={openTicket} onGoToTickets={showMyTickets} />
        ) : view === "ticket-detail" && selectedTicketId !== null ? (
          <TicketDetail
            ticketId={selectedTicketId}
            requesterId={requester.id}
            onBack={showMyTickets}
          />
        ) : view === "my-tickets" ? (
          <MyTickets
            requesterId={requester.id}
            onCreateTicket={showCreateTicket}
            onOpenTicket={openTicket}
          />
        ) : (
          <section className="zen-card content-card">
            <h1 className="page-title">System Check</h1>
            <p className="page-subtitle mb-4">Check the TokTickIT API connection and available request categories.</p>
            <button
              className="btn btn-success"
              onClick={handleCheck}
              disabled={state === "loading"}
            >
              {state === "loading" ? "Loading…" : "Check System"}
            </button>

            {state === "loading" && (
              <p className="mt-3 text-secondary">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Checking system…
              </p>
            )}

            {state === "success" && (
              <div className="mt-3">
                <p className="fw-semibold text-success mb-3">System Status: Online</p>
                <h2 className="h6 text-uppercase text-secondary mb-2">Supported Request Categories</h2>
                <ol className="list-group list-group-numbered">
                  {categories.map((category) => (
                    <li key={category.id} className="list-group-item">{category.name}</li>
                  ))}
                </ol>
              </div>
            )}

            {state === "error" && (
              <div className="alert alert-danger mt-3 mb-1">
                <p className="fw-semibold mb-1">System Status: Offline</p>
                <p className="mb-0">Unable to connect to TokTickIT API</p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
