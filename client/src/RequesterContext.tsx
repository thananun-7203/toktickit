import { createContext, useContext, useState, ReactNode } from "react";
import { Requester } from "./api.js";

// Lab 2 Issue 2 — React context storing the selected Development Requester.
// This simulated identity is attached to subsequent API calls (FR-1, BR-1).

interface RequesterContextValue {
  requester: Requester | null;
  selectRequester: (r: Requester) => void;
  clearRequester: () => void;
}

const RequesterContext = createContext<RequesterContextValue | undefined>(undefined);

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [requester, setRequester] = useState<Requester | null>(null);

  const selectRequester = (r: Requester) => setRequester(r);
  const clearRequester = () => setRequester(null);

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
