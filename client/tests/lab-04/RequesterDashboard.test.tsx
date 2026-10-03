import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RequesterDashboard from "../../src/RequesterDashboard.js";
import * as api from "../../src/api.js";

const DATA: api.RequesterDashboardResponse = {
  metrics: { openTickets: 3, waitingForYou: 1 },
  recentlyUpdatedTickets: [
    {
      id: 101,
      ticketNumber: "TKT-2026-00101",
      summary: "Wi-Fi cannot connect",
      status: "In Progress",
      itPriority: "Medium",
      updatedAt: "2026-10-03T10:00:00.000Z",
      resolvedAt: null,
    },
  ],
  recentlyResolvedTickets: [
    {
      id: 99,
      ticketNumber: "TKT-2026-00099",
      summary: "Printer issue",
      status: "Resolved",
      itPriority: "Low",
      updatedAt: "2026-10-02T09:00:00.000Z",
      resolvedAt: "2026-10-02T08:30:00.000Z",
    },
  ],
};

describe("Lab 4 Requester Dashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("RD-UI-01: renders approved metrics and recent lists", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(DATA);
    render(<RequesterDashboard onOpenTicket={() => {}} onOpenMyTickets={() => {}} />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Open Tickets")).toBeInTheDocument();
    expect(screen.getByText("Waiting for You")).toBeInTheDocument();
    expect(screen.getByText("ACTIVITY")).toBeInTheDocument();
    expect(screen.getByText("COMPLETED WORK")).toBeInTheDocument();
    expect(screen.getByText("Wi-Fi cannot connect")).toBeInTheDocument();
    expect(screen.getByText("Printer issue")).toBeInTheDocument();
    expect(screen.getByText("3", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("1", { selector: "strong" })).toBeInTheDocument();
  });

  it("RD-UI-03: opens the owned Ticket Detail from a recent row", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(DATA);
    const openTicket = vi.fn();
    const user = userEvent.setup();
    render(<RequesterDashboard onOpenTicket={openTicket} onOpenMyTickets={() => {}} />);
    await screen.findByRole("heading", { name: "Dashboard" });

    await user.click(screen.getAllByRole("button", { name: "Open Ticket" })[0]);
    expect(openTicket).toHaveBeenCalledWith(101);
  });

  it("RD-UI-05: sends the Waiting for You drill-down to its dedicated handler", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(DATA);
    const openWaitingTickets = vi.fn();
    const user = userEvent.setup();
    render(
      <RequesterDashboard
        onOpenTicket={() => {}}
        onOpenMyTickets={() => {}}
        onOpenWaitingTickets={openWaitingTickets}
      />,
    );
    await screen.findByRole("heading", { name: "Dashboard" });

    await user.click(screen.getByRole("button", { name: /Waiting for You: 1\. View waiting Tickets/i }));
    expect(openWaitingTickets).toHaveBeenCalledTimes(1);
  });

  it("RD-UI-02: renders intentional zero/empty states", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue({
      metrics: { openTickets: 0, waitingForYou: 0 },
      recentlyUpdatedTickets: [],
      recentlyResolvedTickets: [],
    });
    render(<RequesterDashboard onOpenTicket={() => {}} onOpenMyTickets={() => {}} />);
    await waitFor(() => expect(screen.getByText("No recent Tickets")).toBeInTheDocument());
    expect(screen.getByText("No recently resolved Tickets")).toBeInTheDocument();
  });

  it("RD-UI-04: renders loading and safe failure retry states", async () => {
    let resolveDashboard: ((value: api.RequesterDashboardResponse) => void) | undefined;
    vi.spyOn(api, "getRequesterDashboard").mockImplementation(() => new Promise((resolve) => { resolveDashboard = resolve; }));
    render(<RequesterDashboard onOpenTicket={() => {}} onOpenMyTickets={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading Dashboard");
    resolveDashboard?.({ ...DATA, recentlyUpdatedTickets: [], recentlyResolvedTickets: [] });
    await waitFor(() => expect(screen.getByText("No recent Tickets")).toBeInTheDocument());

    vi.mocked(api.getRequesterDashboard).mockRejectedValue(new Error("offline"));
    const { unmount } = render(<RequesterDashboard onOpenTicket={() => {}} onOpenMyTickets={() => {}} />);
    await waitFor(() => expect(screen.getByText("Unable to load Dashboard")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    unmount();

    vi.mocked(api.getRequesterDashboard).mockRejectedValue(new api.ApiError("Forbidden", 403));
    render(<RequesterDashboard onOpenTicket={() => {}} onOpenMyTickets={() => {}} />);
    await waitFor(() => expect(screen.getByText("Dashboard unavailable")).toBeInTheDocument());
  });
});
