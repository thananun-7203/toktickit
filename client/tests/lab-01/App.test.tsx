import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { AuthProvider } from "../../src/AuthContext.js";

const REQUESTER: api.AuthUser = {
  id: 1,
  name: "Somchai Jaidee",
  email: "somchai@toktick.it",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: false,
};

function renderApp() {
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  );
}

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getCategories").mockResolvedValue([]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([]);
    vi.spyOn(api, "getTickets").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    });
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue({
      metrics: { openTickets: 0, waitingForYou: 0 },
      recentlyUpdatedTickets: [],
      recentlyResolvedTickets: [],
    });
  });

  it("shows the Login page when there is no authenticated session", async () => {
    vi.spyOn(api, "getCurrentUser").mockRejectedValue(
      new api.ApiError("Authentication required", 401, "UNAUTHENTICATED"),
    );

    renderApp();

    expect(await screen.findByRole("heading", { name: /Sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.queryByText(/Development Requester/i)).not.toBeInTheDocument();
  });

  it("renders authenticated Requester navigation and lands on the Requester Dashboard", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(REQUESTER);
    renderApp();

    await waitFor(
      () => expect(screen.getByRole("heading", { name: /Dashboard/i })).toBeInTheDocument(),
      { timeout: 3000 },
    );
    const nav = screen.getByRole("navigation", { name: /Primary navigation/i });
    expect(within(nav).getByRole("button", { name: /My Tickets/i })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: /Create Ticket/i })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: /Check System/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/User menu for Somchai Jaidee/i)).toBeInTheDocument();
    expect(screen.queryByText(/Switch requester/i)).not.toBeInTheDocument();
  });

  it("shows Online and protected categories on authenticated System Check", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(REQUESTER);
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });

    renderApp();
    const nav = await screen.findByRole("navigation", { name: /Primary navigation/i });
    await user.click(within(nav).getByRole("button", { name: /Check System/i }));
    await user.click(within(screen.getByRole("main")).getByRole("button", { name: /^Check System$/i }));

    expect(await screen.findByText("System Status: Online")).toBeInTheDocument();
    expect(screen.getByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
  });

  it("routes the Requester Waiting for You metric to a status-filtered My Tickets view", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(REQUESTER);
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue({
      metrics: { openTickets: 2, waitingForYou: 1 },
      recentlyUpdatedTickets: [],
      recentlyResolvedTickets: [],
    });
    const getTicketsSpy = vi.spyOn(api, "getTickets").mockResolvedValue({
      items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0,
    });

    renderApp();
    await screen.findByRole("heading", { name: /Dashboard/i });
    await user.click(screen.getByRole("button", { name: /Waiting for You: 1\. View waiting Tickets/i }));

    expect(await screen.findByRole("heading", { name: /My Tickets/i })).toBeInTheDocument();
    expect(getTicketsSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "Waiting for Requester" }));
  });

  it("clears the Waiting for Requester context when primary My Tickets is selected", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(REQUESTER);
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue({
      metrics: { openTickets: 2, waitingForYou: 1 },
      recentlyUpdatedTickets: [],
      recentlyResolvedTickets: [],
    });
    const getTicketsSpy = vi.spyOn(api, "getTickets").mockResolvedValue({
      items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0,
    });

    renderApp();
    await screen.findByRole("heading", { name: /Dashboard/i });
    const nav = screen.getByRole("navigation", { name: /Primary navigation/i });
    await user.click(screen.getByRole("button", { name: /Waiting for You: 1\. View waiting Tickets/i }));
    await screen.findByRole("heading", { name: /My Tickets/i });
    expect(getTicketsSpy).toHaveBeenLastCalledWith(expect.objectContaining({ status: "Waiting for Requester" }));

    await user.click(within(nav).getByRole("button", { name: /My Tickets/i }));

    await waitFor(() => expect(getTicketsSpy).toHaveBeenLastCalledWith(expect.not.objectContaining({ status: expect.anything() })));
  });

  it("shows an Offline error message when the authenticated System Check fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(REQUESTER);
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("network error"));

    renderApp();
    await waitFor(() => expect(screen.getByRole("navigation", { name: /Primary navigation/i })).toBeInTheDocument());
    const nav = screen.getByRole("navigation", { name: /Primary navigation/i });
    await user.click(within(nav).getByRole("button", { name: /Check System/i }));
    await user.click(within(screen.getByRole("main")).getByRole("button", { name: /^Check System$/i }));

    expect(await screen.findByText("System Status: Offline")).toBeInTheDocument();
    expect(screen.getByText("Unable to connect to TokTickIT API")).toBeInTheDocument();
  });
});
