import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffTicketQueue from "../../src/StaffTicketQueue.js";
import * as api from "../../src/api.js";

const TICKET: api.StaffQueueTicket = {
  id: 501,
  ticketNumber: "TKT-2026-00501",
  summary: "Cannot export monthly report",
  requestedPriority: "High",
  itPriority: "Medium",
  status: "In Progress",
  createdAt: "2026-09-15T08:00:00.000Z",
  updatedAt: "2026-09-16T09:30:00.000Z",
  requester: { id: 10, name: "Somsri Rakdee", email: "somsri@toktick.it" },
  category: { id: 1, name: "Software" },
  relatedSystem: { id: 2, name: "CRM" },
  owner: { id: 20, name: "Narin Support", email: "narin.staff@toktick.it", role: "IT_STAFF" },
};

const UNASSIGNED: api.StaffQueueTicket = {
  ...TICKET,
  id: 502,
  ticketNumber: "TKT-2026-00502",
  summary: "Unassigned hardware issue",
  itPriority: null,
  status: "New",
  owner: null,
};

function response(items = [TICKET, UNASSIGNED], page = 1, totalPages = 1): api.StaffQueueResponse {
  return { items, page, pageSize: 10, totalItems: items.length, totalPages };
}

describe("Lab 3 IT Staff Ticket Queue", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Software" }]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([{ id: 2, name: "CRM" }]);
    vi.spyOn(api, "getStaffAssignees").mockResolvedValue([
      { id: 20, name: "Narin Support", email: "narin.staff@toktick.it", role: "IT_STAFF" },
    ]);
  });

  it("UI-Q-01/UI-Q-04: renders required queue context, badges, Unassigned, and open action", async () => {
    const open = vi.fn();
    vi.spyOn(api, "getStaffQueue").mockResolvedValue(response());
    const user = userEvent.setup();
    render(<StaffTicketQueue onOpenTicket={open} />);

    expect(await screen.findByRole("heading", { name: "Ticket Queue" })).toBeInTheDocument();
    expect(screen.getAllByText(TICKET.ticketNumber).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Somsri Rakdee/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("High").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Medium").length).toBeGreaterThan(0);
    expect(screen.getAllByText("In Progress").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not recorded").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: `Open ${TICKET.ticketNumber}` }));
    expect(open).toHaveBeenCalledWith(TICKET.id);
  });

  it("UI-Q-02: sends search/filter/sort params and resets page to 1", async () => {
    const getQueue = vi.spyOn(api, "getStaffQueue").mockResolvedValue(response());
    const user = userEvent.setup();
    render(<StaffTicketQueue onOpenTicket={() => {}} />);
    await screen.findAllByText(TICKET.ticketNumber);

    await user.type(screen.getByLabelText("Search"), "monthly report");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(getQueue).toHaveBeenLastCalledWith(expect.objectContaining({ search: "monthly report", page: 1 })));

    await user.selectOptions(screen.getByLabelText("Status"), "In Progress");
    await user.selectOptions(screen.getByLabelText("Requested Priority"), "High");
    await user.selectOptions(screen.getByLabelText("IT Priority"), "Medium");
    await user.selectOptions(screen.getByLabelText("Owner"), "unassigned");
    await user.selectOptions(screen.getByLabelText("Category"), "1");
    await user.selectOptions(screen.getByLabelText("Related System"), "2");
    await user.selectOptions(screen.getByLabelText("Sort"), "priority_desc");
    await waitFor(() => expect(getQueue).toHaveBeenLastCalledWith(expect.objectContaining({
      status: "In Progress",
      requestedPriority: "High",
      itPriority: "Medium",
      owner: "unassigned",
      categoryId: 1,
      relatedSystemId: 2,
      sort: "priority_desc",
      page: 1,
    })));
  });

  it("UI-Q-03: renders pagination metadata and requests the next page", async () => {
    const getQueue = vi.spyOn(api, "getStaffQueue")
      .mockResolvedValueOnce({ ...response([TICKET], 1, 2), totalItems: 2 })
      .mockResolvedValue({ ...response([UNASSIGNED], 2, 2), totalItems: 2 });
    const user = userEvent.setup();
    render(<StaffTicketQueue onOpenTicket={() => {}} />);
    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(getQueue).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });

  it("UI-Q-05: shows a loading state while the queue request is pending", async () => {
    let resolve!: (value: api.StaffQueueResponse) => void;
    vi.spyOn(api, "getStaffQueue").mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<StaffTicketQueue onOpenTicket={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent(/Loading Ticket Queue/i);
    resolve(response());
    expect((await screen.findAllByText(TICKET.ticketNumber)).length).toBeGreaterThan(0);
  });

  it("UI-Q-06: shows the empty-queue state when no tickets exist", async () => {
    vi.spyOn(api, "getStaffQueue").mockResolvedValue(response([]));
    render(<StaffTicketQueue onOpenTicket={() => {}} />);
    expect(await screen.findByRole("heading", { name: "No tickets yet" })).toBeInTheDocument();
  });

  it("UI-Q-07: shows no-results plus Clear filters when a filter matches nothing", async () => {
    vi.spyOn(api, "getStaffQueue").mockResolvedValue(response([]));
    const user = userEvent.setup();
    render(<StaffTicketQueue onOpenTicket={() => {}} />);
    await screen.findByRole("heading", { name: "No tickets yet" });
    await user.selectOptions(screen.getByLabelText("Status"), "Closed");
    expect(await screen.findByRole("heading", { name: "No results" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Clear filters" }).some((button) => !button.hasAttribute("disabled"))).toBe(true);
  });

  it("UI-Q-08: shows safe forbidden/failure feedback and Retry", async () => {
    const getQueue = vi.spyOn(api, "getStaffQueue")
      .mockRejectedValueOnce(new api.ApiError("Forbidden", 403, "FORBIDDEN"))
      .mockResolvedValue(response());
    const user = userEvent.setup();
    render(<StaffTicketQueue onOpenTicket={() => {}} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/do not have permission/i);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect((await screen.findAllByText(TICKET.ticketNumber)).length).toBeGreaterThan(0);
    expect(getQueue).toHaveBeenCalledTimes(2);
  });
});
