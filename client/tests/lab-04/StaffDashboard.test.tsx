import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffDashboard from "../../src/StaffDashboard.js";
import * as api from "../../src/api.js";

const DATA: api.StaffDashboardResponse = {
  metrics: {
    unassignedActiveTickets: 2,
    myActiveTickets: 4,
    byStatus: {
      New: 1,
      Open: 2,
      "In Progress": 3,
      "Waiting for Requester": 1,
      Resolved: 2,
      Closed: 5,
      Reopened: 1,
      Cancelled: 1,
    },
    activeByItPriority: { High: 3, Medium: 2, Low: 1, "Not recorded": 0 },
  },
  myActiveActions: [{
    id: 90,
    ticketId: 501,
    description: "Restart reporting worker",
    status: "In Progress",
    updatedAt: "2026-09-29T08:00:00.000Z",
    assignee: { id: 20, name: "Narin Support" },
    ticket: { ticketNumber: "TKT-2026-00501", summary: "Cannot export monthly report" },
  }],
  recentlyUpdatedTickets: [{
    id: 501,
    ticketNumber: "TKT-2026-00501",
    summary: "Cannot export monthly report",
    status: "In Progress",
    itPriority: "High",
    updatedAt: "2026-09-29T08:00:00.000Z",
  }],
  urgentTickets: [{
    id: 502,
    ticketNumber: "TKT-2026-00502",
    summary: "Printer queue unavailable",
    status: "Reopened",
    itPriority: "High",
    updatedAt: "2026-09-29T07:30:00.000Z",
  }],
};

describe("Lab 4 IT Staff Dashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("SD-UI-01/02: renders approved metrics, status/priority breakdowns, and separate work lists", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(DATA);
    render(<StaffDashboard onOpenTicket={() => {}} onOpenQueue={() => {}} />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Unassigned Active Tickets")).toBeInTheDocument();
    expect(screen.getByText("My Active Tickets")).toBeInTheDocument();
    expect(screen.getByText("Tickets by Status")).toBeInTheDocument();
    expect(screen.getByText("Active Tickets by IT Priority")).toBeInTheDocument();
    expect(screen.getByText("My Active Actions")).toBeInTheDocument();
    expect(screen.getByText("Recently Updated")).toBeInTheDocument();
    expect(screen.getByText("Urgent Tickets")).toBeInTheDocument();
    expect(screen.getByText("Restart reporting worker")).toBeInTheDocument();
    expect(screen.getByText("Printer queue unavailable")).toBeInTheDocument();
  });

  it("SD-UI-03: drills down with the documented Queue context and opens Ticket Detail", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(DATA);
    const openQueue = vi.fn();
    const openTicket = vi.fn();
    const user = userEvent.setup();
    render(<StaffDashboard onOpenTicket={openTicket} onOpenQueue={openQueue} />);
    await screen.findByRole("heading", { name: "Dashboard" });

    await user.click(screen.getByRole("button", { name: /Unassigned Active Tickets: 2/i }));
    expect(openQueue).toHaveBeenCalledWith({ owner: "unassigned", status: "active" });

    await user.click(screen.getByRole("button", { name: /High 3/i }));
    expect(openQueue).toHaveBeenCalledWith({ status: "active", itPriority: "High" });

    await user.click(screen.getAllByRole("button", { name: "Open Ticket" })[0]);
    expect(openTicket).toHaveBeenCalledWith(501);
  });

  it("SD-UI-04: renders safe loading, empty, forbidden, and failure states", async () => {
    let resolveDashboard: ((value: api.StaffDashboardResponse) => void) | undefined;
    vi.spyOn(api, "getStaffDashboard").mockImplementation(() => new Promise((resolve) => { resolveDashboard = resolve; }));
    render(<StaffDashboard onOpenTicket={() => {}} onOpenQueue={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading Dashboard");
    resolveDashboard?.({ ...DATA, myActiveActions: [], recentlyUpdatedTickets: [], urgentTickets: [], metrics: { ...DATA.metrics, unassignedActiveTickets: 0, myActiveTickets: 0, byStatus: Object.fromEntries(Object.keys(DATA.metrics.byStatus).map((key) => [key, 0])) as api.StaffDashboardResponse["metrics"]["byStatus"], activeByItPriority: { High: 0, Medium: 0, Low: 0, "Not recorded": 0 } } });
    await waitFor(() => expect(screen.getByText("No active operational work is currently available.")).toBeInTheDocument());

    vi.mocked(api.getStaffDashboard).mockRejectedValue(new api.ApiError("Forbidden", 403));
    // A remount represents navigation/retry into the same page under a forbidden session.
    render(<StaffDashboard onOpenTicket={() => {}} onOpenQueue={() => {}} />);
    await waitFor(() => expect(screen.getByText("Dashboard unavailable")).toBeInTheDocument());

    vi.mocked(api.getStaffDashboard).mockRejectedValue(new Error("offline"));
    render(<StaffDashboard onOpenTicket={() => {}} onOpenQueue={() => {}} />);
    await waitFor(() => expect(screen.getAllByText("Unable to load Staff Dashboard").length).toBeGreaterThan(0));
    expect(screen.getAllByRole("button", { name: "Retry" }).length).toBeGreaterThan(0);
  });
});
