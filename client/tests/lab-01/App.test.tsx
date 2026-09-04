import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    // App now lands on My Tickets per Lab 2 S1. Keep its initial data loading
    // deterministic in these legacy Lab 1 tests before navigating to Home.
    vi.spyOn(api, "getCategories").mockResolvedValue([]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([]);
    vi.spyOn(api, "getTickets").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    });
  });

  it("shows requester selection on a fresh app entry", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([TEST_REQUESTER]);

    render(
      <RequesterProvider>
        <App />
      </RequesterProvider>
    );

    expect(await screen.findByRole("option", { name: /Somchai Jaidee/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue/i })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: /My Tickets/i })).not.toBeInTheDocument();
  });

  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading and lands on My Tickets", async () => {
    renderWithRequester(TEST_REQUESTER);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /My Tickets/i })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: /Primary navigation/i });
    expect(within(nav).getByRole("button", { name: /My Tickets/i })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: /Create Ticket/i })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: /Check System/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Requester menu for Somchai Jaidee/i)).toBeInTheDocument();
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
    const nav = screen.getByRole("navigation", { name: /Primary navigation/i });
    await user.click(within(nav).getByRole("button", { name: /Check System/i }));
    await user.click(screen.getByRole("main").querySelector("button.btn-success")!);

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
    await waitFor(() => expect(screen.getByRole("navigation", { name: /Primary navigation/i })).toBeInTheDocument());
    const nav = screen.getByRole("navigation", { name: /Primary navigation/i });
    await user.click(within(nav).getByRole("button", { name: /Check System/i }));
    await user.click(screen.getByRole("main").querySelector("button.btn-success")!);

    expect(await screen.findByText("System Status: Offline")).toBeInTheDocument();
    expect(screen.getByText("Unable to connect to TokTickIT API")).toBeInTheDocument();
  });
});
