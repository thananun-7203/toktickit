import { createContext, useContext, useState, ReactNode } from "react";
import { Requester } from "./api.js";

// Lab 2 Issue 2 — React context storing the selected Development Requester.
// This simulated identity is attached to subsequent API calls (FR-1, BR-1).
// The selection is persisted to localStorage so a page refresh keeps the
// acting requester instead of returning to the selector.

const STORAGE_KEY = "toktickit.dev-requester";

interface RequesterContextValue {
  requester: Requester | null;
  selectRequester: (r: Requester) => void;
  clearRequester: () => void;
}

const RequesterContext = createContext<RequesterContextValue | undefined>(undefined);

function loadStoredRequester(): Requester | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === "number" && typeof parsed.name === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [requester, setRequester] = useState<Requester | null>(loadStoredRequester);

  const selectRequester = (r: Requester) => {
    setRequester(r);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
    } catch {
      // Storage may be unavailable (e.g. private mode); non-fatal.
    }
  };

  const clearRequester = () => {
    setRequester(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // non-fatal
    }
  };

  return (
    <RequesterContext.Provider value={{ requester, selectRequester, clearRequester }}>
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester(): RequesterContextValue {
  const ctx = useContext(RequesterContext);
  if (!ctx) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return ctx;
}
