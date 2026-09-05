import { useEffect, useState } from "react";
import { checkSystem, Category, getRequesters, Requester } from "./api.js";
import { useRequester } from "./RequesterContext.js";

// Lab 2 Issue 2 — S1: Select Development Requester screen.
// Loads active requesters (BR-6) and stores the choice in RequesterContext (FR-1).

type UiState = "loading" | "success" | "error";
type CheckState = "idle" | "loading" | "success" | "error";

export default function SelectRequester() {
  const { selectRequester } = useRequester();
  const [state, setState] = useState<UiState>("loading");
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [systemCategories, setSystemCategories] = useState<Category[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    getRequesters()
      .then((data) => {
        if (cancelled) return;
        setRequesters(data);
        setState("success");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleContinue() {
    const selected = requesters.find((r) => r.id === selectedId);
    if (selected) selectRequester(selected);
  }

  async function handleCheckSystem() {
    setMobileMenuOpen(false);
    setCheckState("loading");
    try {
      const result = await checkSystem();
      setSystemCategories(result.categories);
      setCheckState("success");
    } catch {
      setCheckState("error");
    }
  }

  return (
    <div className="select-requester-page">
      <header className="zen-navbar">
        <div className="zen-navbar-inner align-items-center">
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
                <button type="button" role="menuitem" onClick={handleCheckSystem}>
                  <span aria-hidden="true">⌁</span> Check System
                </button>
              </div>
            )}
          </div>

          <div className="brand-lockup" aria-label="TokTickIT">
            <span className="brand-mark" aria-hidden="true" />
            <span>TokTickIT</span>
          </div>

          <nav className="app-nav-links selection-nav-links" aria-label="Utility navigation">
            <button type="button" className="app-nav-button" onClick={handleCheckSystem}>
              <span className="nav-icon" aria-hidden="true">⌁</span>
              Check System
            </button>
          </nav>
        </div>
      </header>

      <main className="selection-content">
        <div className="selection-breadcrumb" aria-label="Page context">
          <span aria-hidden="true">⌂</span> &nbsp;›&nbsp; Development Requester Selection
        </div>

        {checkState !== "idle" && (
          <section className="zen-card content-card selection-system-check mb-3" aria-live="polite">
            {checkState === "loading" && (
              <div className="text-secondary">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Checking system…
              </div>
            )}
            {checkState === "success" && (
              <>
                <div className="fw-semibold text-success mb-2">System Status: Online</div>
                <div className="small text-secondary mb-2">Supported Request Categories</div>
                <div className="d-flex flex-wrap gap-2">
                  {systemCategories.map((category) => (
                    <span key={category.id} className="badge rounded-pill text-bg-light border">
                      {category.name}
                    </span>
                  ))}
                </div>
              </>
            )}
            {checkState === "error" && (
              <div className="text-danger">
                <strong>System Status: Offline</strong>
                <div className="small mt-1">Unable to connect to TokTickIT API</div>
              </div>
            )}
          </section>
        )}

        <section className="zen-card selection-card">
          <div className="selection-hero">
            <div className="selection-icon" aria-hidden="true">◎</div>
            <h1 className="page-title mb-2">Select Development Requester</h1>
            <p className="page-subtitle mb-1">
              Choose a development requester to simulate the current requester context for Lab 2.
            </p>
            <p className="page-subtitle">This is for testing only and is not a login screen.</p>
          </div>

          <div className="selection-form">
            {state === "loading" && (
              <p className="text-secondary mb-0">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Loading requesters…
              </p>
            )}

            {state === "error" && (
              <div className="alert alert-danger mb-0">
                <p className="fw-semibold mb-1">Unable to load requesters</p>
                <p className="mb-0">Please check that the TokTickIT API is running.</p>
              </div>
            )}

            {state === "success" && requesters.length === 0 && (
              <div className="alert alert-info mb-0">No active requesters found.</div>
            )}

            {state === "success" && requesters.length > 0 && (
              <>
                <div className="mb-3">
                  <label htmlFor="developmentRequester" className="form-label">
                    Development Requester <span className="text-danger">*</span>
                  </label>
                  <select
                    id="developmentRequester"
                    className="form-select form-select-lg"
                    value={selectedId ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSelectedId(value ? Number(value) : null);
                    }}
                  >
                    <option value="">Select a requester…</option>
                    {requesters.map((requester) => (
                      <option key={requester.id} value={requester.id}>
                        {requester.name} — {requester.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="zen-info mb-3">
                  <span className="info-dot" aria-hidden="true">i</span>
                  <span>Only active development requesters are shown.</span>
                </div>
              </>
            )}
          </div>

          {state === "success" && requesters.length > 0 && (
            <div className="selection-actions">
              <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setSelectedId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-success px-4"
                disabled={selectedId === null}
                onClick={handleContinue}
              >
                <span aria-hidden="true">→</span> Continue
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
