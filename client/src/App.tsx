import { useState } from "react";
import { checkSystem, Category } from "./api.js";
import { useRequester } from "./RequesterContext.js";
import SelectRequester from "./SelectRequester.js";
import CreateTicket from "./CreateTicket.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";
type View = "home" | "create";

export default function App() {
  const { requester, clearRequester } = useRequester();
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [view, setView] = useState<View>("home");

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
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">
          TokTickIT <span className="text-success">IT Service Desk</span>
        </h1>
        <div className="text-end">
          <span
            className="badge rounded-pill text-success px-3 py-2 d-inline-block"
            style={{ backgroundColor: "#EAF6EF" }}
          >
            {requester.name}
          </span>
          <button
            className="btn btn-link btn-sm d-block px-0 text-secondary"
            onClick={clearRequester}
          >
            Switch
          </button>
        </div>
      </div>

      <div className="d-flex gap-2 mb-4">
        <button
          className={`btn btn-sm ${view === "home" ? "btn-success" : "btn-outline-success"}`}
          onClick={() => setView("home")}
        >
          Home
        </button>
        <button
          className={`btn btn-sm ${view === "create" ? "btn-success" : "btn-outline-success"}`}
          onClick={() => setView("create")}
        >
          Create Ticket
        </button>
      </div>

      {view === "create" ? (
        <CreateTicket />
      ) : (
        <>
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
                  <li key={category.id} className="list-group-item">
                    {category.name}
                  </li>
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
        </>
      )}
    </div>
  );
}
