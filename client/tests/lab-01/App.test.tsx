import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { RequesterProvider, useRequester } from "../../src/RequesterContext.js";

// The dashboard requires a selected Development Requester (Issue 2). This
// harness renders App inside the provider and pre-selects a requester so the
// Lab 1 dashboard tests keep working.
function PreselectedApp({ requester }: { requester: api.Requester }) {
  const { selectRequester } = useRequester();
  useEffect(() => {
    selectRequester(requester);
  }, [selectRequester, requester]);
  return <App />;
}

function renderWithRequester(requester: api.Requester) {
  return render(
    <RequesterProvider>
      <PreselectedApp requester={requester} />
    </RequesterProvider>
  );
}

const TEST_REQUESTER: api.Requester = {
  id: 1,
  name: "Somchai Jaidee",
  email: "somchai@toktick.it",
  isActive: true,
};

describe("App", () => {
  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    renderWithRequester(TEST_REQUESTER);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows Online and the seeded categories on success", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });

    renderWithRequester(TEST_REQUESTER);
    await user.click(screen.getByRole("button", { name: /Check System/i }));

    expect(await screen.findByText("System Status: Online")).toBeInTheDocument();
    expect(screen.getByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("network error"));

    renderWithRequester(TEST_REQUESTER);
    await user.click(screen.getByRole("button", { name: /Check System/i }));

    expect(await screen.findByText("System Status: Offline")).toBeInTheDocument();
    expect(screen.getByText("Unable to connect to TokTickIT API")).toBeInTheDocument();
  });
});
