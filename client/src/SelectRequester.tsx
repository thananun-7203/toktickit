import { useEffect, useState } from "react";
import { getRequesters, Requester } from "./api.js";
import { useRequester } from "./RequesterContext.js";

// Lab 2 Issue 2 — S1: Select Development Requester screen.
// Loads active requesters (BR-6) and stores the choice in RequesterContext (FR-1).

type UiState = "loading" | "success" | "error";

export default function SelectRequester() {
  const { selectRequester } = useRequester();
  const [state, setState] = useState<UiState>("loading");
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

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

  return (
    <div className="container py-5 d-flex justify-content-center">
      <div className="p-4 bg-white border rounded shadow-sm w-100" style={{ maxWidth: 480 }}>
        <h1 className="h4 mb-1">
          TokTickIT <span className="text-success">IT Service Desk</span>
        </h1>
        <p className="text-secondary mb-4">Select the Development Requester to continue.</p>

        {state === "loading" && (
          <p className="text-secondary">
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
            Loading requesters…
          </p>
        )}

        {state === "error" && (
          <div className="alert alert-danger mb-1">
            <p className="fw-semibold mb-1">Unable to load requesters</p>
            <p className="mb-0">Please check that the TokTickIT API is running.</p>
          </div>
        )}

        {state === "success" && requesters.length === 0 && (
          <div className="alert alert-info mb-1">No active requesters found.</div>
        )}

        {state === "success" && requesters.length > 0 && (
          <>
            <div className="mb-4">
              {requesters.map((requester) => (
                <div
                  key={requester.id}
                  className={`form-check mb-2 p-3 border rounded ${
                    selectedId === requester.id ? "border-success bg-pale-green" : ""
                  }`}
                  style={selectedId === requester.id ? { backgroundColor: "#EAF6EF" } : undefined}
                >
                  <input
                    className="form-check-input"
                    type="radio"
                    name="requester"
                    id={`requester-${requester.id}`}
                    value={requester.id}
                    checked={selectedId === requester.id}
                    onChange={() => setSelectedId(requester.id)}
                  />
                  <label className="form-check-label ms-2" htmlFor={`requester-${requester.id}`}>
                    <span className="d-block fw-semibold">{requester.name}</span>
                    <span className="text-secondary small">{requester.email}</span>
                  </label>
                </div>
              ))}
            </div>

            <button
              className="btn btn-success w-100"
              disabled={selectedId === null}
              onClick={handleContinue}
            >
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
}
