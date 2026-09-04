import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyTickets from "../../src/MyTickets.js";
import * as api from "../../src/api.js";

const CATS: api.Category[] = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];
const SYSTEMS: api.RelatedSystem[] = [
  { id: 1, name: "CRM" },
  { id: 2, name: "Payroll" },
];

const TICKETS: api.Ticket[] = [
  {
    id: 1,
    ticketNumber: "TKT-2026-00001",
    summary: "Cannot export report",
    description: "details",
    status: "New",
    requestedPriority: "High",
    createdAt: new Date().toISOString(),
    requester: { id: 1, name: "Somchai" },
    category: { id: 1, name: "Account and Access" },
    relatedSystem: { id: 1, name: "CRM" },
  },
  {
    id: 2,
    ticketNumber: "TKT-2026-00002",
    summary: "Login fails",
    description: "details",
    status: "New",
    requestedPriority: "Low",
    createdAt: new Date().toISOString(),
    requester: { id: 1, name: "Somchai" },
    category: { id: 2, name: "Hardware" },
    relatedSystem: { id: 2, name: "Payroll" },
  },
];

describe("MyTickets (UI-5)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getCategories").mockResolvedValue(CATS);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue(SYSTEMS);
  });

  it("UI-5/UI-11: renders Requested Priority in list/table-card data", async () => {
    vi.spyOn(api, "getTickets").mockResolvedValue({
      items: TICKETS,
      page: 1,
      pageSize: 10,
      totalItems: 2,
      totalPages: 1,
    });
    render(<MyTickets requesterId={1} />);

    expect(await screen.findAllByText("TKT-2026-00001")).toHaveLength(2); // table + card (both in DOM, CSS hidden)
    expect(screen.getAllByText("Cannot export report").length).toBeGreaterThanOrEqual(1);
    // toolbar
    expect(screen.getByLabelText(/Search/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search ticket no\. or summary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
    expect(screen.getByLabelText(/System/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Sort/)).toBeInTheDocument();
    expect(screen.getAllByText("High").length).toBeGreaterThanOrEqual(1);
    // Zen Green badge
    const badges = screen.getAllByText("New");
    expect(badges[0].style.backgroundColor).toBeTruthy();
  });

  it("UI-5: shows empty state with actionable Create Ticket CTA", async () => {
    const user = userEvent.setup();
    const onCreateTicket = vi.fn();
    vi.spyOn(api, "getTickets").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    });
    render(<MyTickets requesterId={1} onCreateTicket={onCreateTicket} />);
    await waitFor(() => expect(screen.queryByText("Loading tickets…")).not.toBeInTheDocument());
    expect(await screen.findByText("No tickets yet")).toBeInTheDocument();
    const createButton = screen.getByRole("button", { name: /Create Ticket/i });
    expect(createButton).toBeInTheDocument();
    await user.click(createButton);
    expect(onCreateTicket).toHaveBeenCalledTimes(1);
  });

  it("UI-5: shows no-results when filter yields no items", async () => {
    const spy = vi.spyOn(api, "getTickets").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    });
    render(<MyTickets requesterId={1} />);
    await waitFor(() => expect(spy).toHaveBeenCalled());

    // Initially empty, then type search to trigger no-results with filter
    // But even with no filter, after debounce we can verify Clear filters appears when search active
    const user = userEvent.setup();
    // The component starts with empty search; set search to trigger filter path
    // Mock again for filtered call
    spy.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    });
    await user.type(screen.getByLabelText(/Search/), "nope");
    await waitFor(() => expect(screen.getByText("No results")).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByRole("button", { name: /Clear filters/i })).toBeInTheDocument();
  });

  it("calls getTickets with search and pagination params", async () => {
    const spy = vi.spyOn(api, "getTickets").mockResolvedValue({
      items: TICKETS,
      page: 1,
      pageSize: 10,
      totalItems: 2,
      totalPages: 1,
    });
    render(<MyTickets requesterId={1} />);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ sort: "newest", page: 1 }), 1);

    // change page size
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(/Page size/), "5");
    await waitFor(() => expect(spy).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 5 }), 1));
  });

  it("opens a ticket detail from the list", async () => {
    const onOpenTicket = vi.fn();
    vi.spyOn(api, "getTickets").mockResolvedValue({
      items: TICKETS,
      page: 1,
      pageSize: 10,
      totalItems: 2,
      totalPages: 1,
    });
    const user = userEvent.setup();
    render(<MyTickets requesterId={1} onOpenTicket={onOpenTicket} />);

    const buttons = await screen.findAllByRole("button", { name: /Open TKT-2026-00001/i });
    await user.click(buttons[0]);
    expect(onOpenTicket).toHaveBeenCalledWith(1);
  });
});
