import { useEffect, useState } from "react";
import { checkSystem, Category } from "./api.js";
import { useAuth } from "./AuthContext.js";
import Login from "./Login.js";
import ChangePassword from "./ChangePassword.js";
import CreateTicket from "./CreateTicket.js";
import MyTickets from "./MyTickets.js";
import TicketDetail from "./TicketDetail.js";
import StaffTicketQueue from "./StaffTicketQueue.js";

type UiState = "idle" | "loading" | "success" | "error";
type View = "home" | "create" | "my-tickets" | "ticket-detail" | "staff-queue" | "staff-ticket-detail";

function AuthLoading() {
  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="auth-header-inner">
          <div className="brand-lockup" aria-label="TokTickIT">
            <span className="brand-mark" aria-hidden="true" />
            <span>TokTickIT</span>
          </div>
        </div>
      </header>
      <main className="auth-main">
        <div className="auth-loading" role="status">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          Checking your session…
        </div>
      </main>
    </div>
  );
}

function AuthBootstrapError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="auth-header-inner">
          <div className="brand-lockup" aria-label="TokTickIT">
            <span className="brand-mark" aria-hidden="true" />
            <span>TokTickIT</span>
          </div>
        </div>
      </header>
      <main className="auth-main">
        <section className="auth-card" aria-labelledby="session-error-title">
          <h1 id="session-error-title">Unable to verify your session</h1>
          <p className="auth-subtitle">{message}</p>
          <div className="alert alert-danger auth-alert" role="alert">
            TokTickIT could not reach the authentication service. Your sign-in state has not been changed.
          </div>
          <button type="button" className="btn btn-success auth-primary" onClick={onRetry}>
            Retry
          </button>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const { state: authState, user, signOut, refresh, bootstrapError } = useAuth();
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [view, setView] = useState<View>("my-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      setSelectedTicketId(null);
      setView(user.role === "IT_STAFF" ? "staff-queue" : "my-tickets");
      setMobileMenuOpen(false);
      setShowChangePassword(false);
    }
  }, [user?.id]);

  if (authState === "loading") return <AuthLoading />;
  if (authState === "error") {
    return (
      <AuthBootstrapError
        message={bootstrapError ?? "Unable to verify your session. Please try again."}
        onRetry={() => void refresh()}
      />
    );
  }
  if (!user) return <Login />;
  if (user.mustChangePassword) return <ChangePassword mandatory />;
  if (showChangePassword) {
    return <ChangePassword mandatory={false} onDone={() => setShowChangePassword(false)} onCancel={() => setShowChangePassword(false)} />;
  }

  async function handleLogout() {
    if (logoutBusy) return;
    setLogoutBusy(true);
    setLogoutError(null);
    try {
      await signOut();
      setMobileMenuOpen(false);
    } catch {
      setLogoutError("Logout failed. Your session may still be active. Please try again.");
    } finally {
      setLogoutBusy(false);
    }
  }

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

  const isRequester = user.role === "REQUESTER";
  const isStaff = user.role === "IT_STAFF";

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
                {isRequester && (
                  <>
                    <button type="button" role="menuitem" onClick={showMyTickets}><span aria-hidden="true">≡</span> My Tickets</button>
                    <button type="button" role="menuitem" onClick={showCreateTicket}><span aria-hidden="true">+</span> Create Ticket</button>
                    <button type="button" role="menuitem" onClick={showSystemCheck}><span aria-hidden="true">⌁</span> Check System</button>
                  </>
                )}
                {isStaff && (
                  <button type="button" role="menuitem" onClick={() => { setView("staff-queue"); setSelectedTicketId(null); setMobileMenuOpen(false); }}>
                    <span aria-hidden="true">≡</span> Ticket Queue
                  </button>
                )}
                <div className="mobile-nav-user">
                  <strong>{user.name}</strong>
                  <span className="role-badge">{user.role.replace("_", " ")}</span>
                  <button type="button" onClick={() => { setMobileMenuOpen(false); setShowChangePassword(true); }}>Change Password</button>
                  <button type="button" disabled={logoutBusy} onClick={() => void handleLogout()}>{logoutBusy ? "Logging out…" : "Logout"}</button>
                </div>
              </div>
            )}
          </div>

          <div className="brand-lockup" aria-label="TokTickIT">
            <span className="brand-mark" aria-hidden="true" />
            <span>TokTickIT</span>
          </div>

          {isRequester && (
            <nav className="app-nav-links" aria-label="Primary navigation">
              <button className={`app-nav-button ${view === "my-tickets" || view === "ticket-detail" ? "active" : ""}`} onClick={showMyTickets}>
                <span className="nav-icon" aria-hidden="true">≡</span> My Tickets
              </button>
              <button className={`app-nav-button ${view === "create" ? "active" : ""}`} onClick={showCreateTicket}>
                <span className="nav-icon" aria-hidden="true">+</span> Create Ticket
              </button>
              <button className={`app-nav-button ${view === "home" ? "active" : ""}`} onClick={showSystemCheck}>
                <span className="nav-icon" aria-hidden="true">⌁</span> Check System
              </button>
            </nav>
          )}
          {isStaff && (
            <nav className="app-nav-links" aria-label="Primary navigation">
              <button className={`app-nav-button ${view === "staff-queue" || view === "staff-ticket-detail" ? "active" : ""}`} onClick={() => { setView("staff-queue"); setSelectedTicketId(null); }}>
                <span className="nav-icon" aria-hidden="true">≡</span> Ticket Queue
              </button>
            </nav>
          )}

          <details className="user-menu">
            <summary aria-label={`User menu for ${user.name}`}>
              <span className="user-avatar" aria-hidden="true">●</span>
              <span className="user-summary-copy">
                <span className="user-name">{user.name}</span>
                <span className="user-role">{user.role.replace("_", " ")}</span>
              </span>
              <span aria-hidden="true">⌄</span>
            </summary>
            <div className="user-dropdown">
              <div className="fw-semibold px-2 pt-1">{user.name}</div>
              <div className="small text-secondary px-2 pb-2">{user.email}</div>
              <div className="px-2 pb-2"><span className="role-badge">{user.role.replace("_", " ")}</span></div>
              <button className="btn btn-light btn-sm" onClick={() => setShowChangePassword(true)}>Change Password</button>
              <button className="btn btn-light btn-sm text-danger" disabled={logoutBusy} onClick={() => void handleLogout()}>{logoutBusy ? "Logging out…" : "Logout"}</button>
            </div>
          </details>
        </div>
      </header>

      <main className="app-content">
        {logoutError && (
          <div className="alert alert-danger" role="alert">
            {logoutError}
          </div>
        )}
        {isStaff && view === "staff-queue" ? (
          <StaffTicketQueue onOpenTicket={(ticketId) => { setSelectedTicketId(ticketId); setView("staff-ticket-detail"); }} />
        ) : isStaff && view === "staff-ticket-detail" && selectedTicketId !== null ? (
          <section className="zen-card content-card role-placeholder">
            <button type="button" className="btn btn-link px-0" onClick={() => { setSelectedTicketId(null); setView("staff-queue"); }}>← Back to Ticket Queue</button>
            <h1 className="page-title">Ticket Detail</h1>
            <p className="page-subtitle">Ticket #{selectedTicketId} selected. Staff operational detail and mutations are implemented in Issue #37.</p>
          </section>
        ) : !isRequester ? (
          <section className="zen-card content-card role-placeholder">
            <h1 className="page-title">{user.role === "IT_STAFF" ? "Ticket Queue" : "User Management"}</h1>
            <p className="page-subtitle">
              Authentication is ready. This role workspace is implemented in the next dedicated Lab 3 issue.
            </p>
          </section>
        ) : view === "create" ? (
          <CreateTicket onOpenTicket={openTicket} onGoToTickets={showMyTickets} />
        ) : view === "ticket-detail" && selectedTicketId !== null ? (
          <TicketDetail ticketId={selectedTicketId} onBack={showMyTickets} />
        ) : view === "my-tickets" ? (
          <MyTickets onCreateTicket={showCreateTicket} onOpenTicket={openTicket} />
        ) : (
          <section className="zen-card content-card">
            <h1 className="page-title">System Check</h1>
            <p className="page-subtitle mb-4">Check the TokTickIT API connection and available request categories.</p>
            <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
              {state === "loading" ? "Loading…" : "Check System"}
            </button>

            {state === "loading" && <p className="mt-3 text-secondary"><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />Checking system…</p>}
            {state === "success" && (
              <div className="mt-3">
                <p className="fw-semibold text-success mb-3">System Status: Online</p>
                <h2 className="h6 text-uppercase text-secondary mb-2">Supported Request Categories</h2>
                <ol className="list-group list-group-numbered">
                  {categories.map((category) => <li key={category.id} className="list-group-item">{category.name}</li>)}
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
