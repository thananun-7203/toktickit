import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffTicketDetail from "../../src/StaffTicketDetail.js";
import * as api from "../../src/api.js";

const STAFF: api.StaffAssignee = {
  id: 20,
  name: "Narin Support",
  email: "narin.staff@toktick.it",
  role: "IT_STAFF",
};

const OTHER_STAFF: api.StaffAssignee = {
  id: 21,
  name: "Patchara Support",
  email: "patchara.staff@toktick.it",
  role: "IT_STAFF",
};

const TICKET: api.StaffTicketDetail = {
  id: 501,
  ticketNumber: "TKT-2026-00501",
  summary: "Cannot access internal system",
  description: "Requester receives Access Denied after signing in.",
  requestedPriority: "High",
  itPriority: "Medium",
  status: "In Progress",
  problemAppearsResolvedAt: "2026-09-17T08:15:00.000Z",
  createdAt: "2026-09-15T08:00:00.000Z",
  updatedAt: "2026-09-16T09:30:00.000Z",
  requester: { id: 10, name: "Somsri Rakdee", email: "somsri@toktick.it" },
  category: { id: 1, name: "Access / Permissions" },
  relatedSystem: { id: 2, name: "Internal Portal" },
  owner: OTHER_STAFF,
  attachments: [
    { id: 70, fileName: "error.png", mimeType: "image/png", sizeBytes: 1024, removedAt: null, removalReason: null },
    { id: 71, fileName: "old-log.pdf", mimeType: "application/pdf", sizeBytes: 2048, removedAt: "2026-09-16T10:00:00.000Z", removalReason: "Duplicate" },
  ],
};

const PUBLIC_COMMENT: api.PublicComment = {
  id: 1,
  content: "Requester-visible update",
  createdAt: "2026-09-16T11:00:00.000Z",
  author: STAFF,
};

const INTERNAL_NOTE: api.InternalNote = {
  id: 2,
  content: "Private operational context",
  createdAt: "2026-09-16T11:30:00.000Z",
  author: OTHER_STAFF,
};

function renderDetail(ticket: api.StaffTicketDetail = TICKET) {
  vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(ticket);
  return render(<StaffTicketDetail ticketId={ticket.id} currentUserId={STAFF.id} onBack={() => {}} />);
}

describe("Lab 3 IT Staff Ticket Detail", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getStaffAssignees").mockResolvedValue([STAFF, OTHER_STAFF]);
    vi.spyOn(api, "getPublicComments").mockResolvedValue([PUBLIC_COMMENT]);
    vi.spyOn(api, "getInternalNotes").mockResolvedValue([INTERNAL_NOTE]);
    vi.spyOn(api, "postPublicComment").mockResolvedValue(PUBLIC_COMMENT);
    vi.spyOn(api, "postInternalNote").mockResolvedValue(INTERNAL_NOTE);
    vi.spyOn(api, "updateStaffTicketOwner").mockResolvedValue({ id: TICKET.id, owner: STAFF, updatedAt: TICKET.updatedAt });
    vi.spyOn(api, "updateStaffTicketItPriority").mockResolvedValue({
      id: TICKET.id,
      requestedPriority: TICKET.requestedPriority,
      itPriority: "High",
      updatedAt: TICKET.updatedAt,
    });
    vi.spyOn(api, "updateStaffTicketStatus").mockResolvedValue({
      id: TICKET.id,
      status: "Resolved",
      problemAppearsResolvedAt: TICKET.problemAppearsResolvedAt,
      updatedAt: TICKET.updatedAt,
    });
  });

  it("UI-ST-01: clearly separates read-only Requester data from editable operational controls", async () => {
    renderDetail();
    expect(await screen.findByRole("heading", { name: TICKET.ticketNumber })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Requester Information/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Ticket Information/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Operational Controls/i })).toBeInTheDocument();
    expect(screen.getByText(TICKET.requester.email)).toBeInTheDocument();
    expect(screen.getByLabelText("Assign / Reassign")).toBeEnabled();
  });

  it("UI-ST-02: Claim and Reassign call the correct owner operations", async () => {
    const updateOwner = vi.mocked(api.updateStaffTicketOwner);
    const user = userEvent.setup();
    renderDetail();
    await screen.findByRole("heading", { name: TICKET.ticketNumber });

    await user.click(screen.getByRole("button", { name: "Claim" }));
    await waitFor(() => expect(updateOwner).toHaveBeenCalledWith(TICKET.id, { action: "claim" }));

    vi.mocked(api.updateStaffTicketOwner).mockResolvedValueOnce({ id: TICKET.id, owner: OTHER_STAFF, updatedAt: TICKET.updatedAt });
    await user.selectOptions(screen.getByLabelText("Assign / Reassign"), String(OTHER_STAFF.id));
    await user.click(screen.getByRole("button", { name: "Reassign" }));
    await waitFor(() => expect(updateOwner).toHaveBeenLastCalledWith(TICKET.id, { action: "assign", ownerId: OTHER_STAFF.id }));
  });

  it("UI-ST-03: Requested Priority stays read-only while IT Priority can be edited", async () => {
    const updatePriority = vi.mocked(api.updateStaffTicketItPriority);
    const user = userEvent.setup();
    renderDetail();
    await screen.findByRole("heading", { name: TICKET.ticketNumber });

    expect(screen.getByText("from requester · read-only")).toBeInTheDocument();
    expect(screen.queryByLabelText("Requested Priority")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("IT Priority"), "High");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updatePriority).toHaveBeenCalledWith(TICKET.id, "High"));
  });

  it("UI-ST-04: Status control offers only allowed next transitions", async () => {
    renderDetail();
    await screen.findByRole("heading", { name: TICKET.ticketNumber });
    const status = screen.getByLabelText("Status");
    const options = within(status).getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual([
      "Current: In Progress",
      "Waiting for Requester",
      "Resolved",
      "Cancelled",
    ]);
    expect(screen.queryByRole("option", { name: "Closed" })).not.toBeInTheDocument();
  });

  it("UI-ST-05: Public Comments and Internal Notes have explicit requester-visibility labels", async () => {
    renderDetail();
    expect(await screen.findByText("Requester-visible update")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Public Comments" })).toBeInTheDocument();
    expect(screen.getByText("Visible to Requester")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Internal Notes" })).toBeInTheDocument();
    expect(screen.getAllByText(/not visible to Requester/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Private operational context")).toBeInTheDocument();
  });

  it("UI-ST-06: blank Public Comment and Internal Note are rejected client-side", async () => {
    const user = userEvent.setup();
    renderDetail();
    await screen.findByRole("heading", { name: TICKET.ticketNumber });

    await user.click(screen.getByRole("button", { name: "Add Comment" }));
    expect(screen.getByText("Public Comment is required.")).toBeInTheDocument();
    expect(api.postPublicComment).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Add Note" }));
    expect(screen.getByText("Internal Note is required.")).toBeInTheDocument();
    expect(api.postInternalNote).not.toHaveBeenCalled();
  });

  it("UI-ST-07: attachments preserve active/removed continuity and removed files have no download control", async () => {
    renderDetail();
    await screen.findByRole("heading", { name: TICKET.ticketNumber });
    expect(screen.getByText("error.png")).toBeInTheDocument();
    expect(screen.getByText("old-log.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Removed · Duplicate/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Download/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Upload|Remove/ })).not.toBeInTheDocument();
  });

  it("UI-ST-08: Requester resolution indication is visible without changing the formal status", async () => {
    renderDetail();
    await screen.findByRole("heading", { name: TICKET.ticketNumber });
    expect(screen.getByText("Requester says the problem appears resolved")).toBeInTheDocument();
    expect(screen.getAllByText("In Progress").length).toBeGreaterThan(0);
    expect(api.updateStaffTicketStatus).not.toHaveBeenCalled();
  });

  it("UI-ST-09: operation conflict shows safe feedback and a Refresh path", async () => {
    vi.mocked(api.updateStaffTicketOwner).mockRejectedValueOnce(new api.ApiError(
      "stale",
      409,
      "STALE_TICKET_STATE",
    ));
    const getDetail = vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(TICKET);
    const user = userEvent.setup();
    render(<StaffTicketDetail ticketId={TICKET.id} currentUserId={STAFF.id} onBack={() => {}} />);
    await screen.findByRole("heading", { name: TICKET.ticketNumber });

    await user.click(screen.getByRole("button", { name: "Claim" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/changed while you were editing/i);
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(getDetail).toHaveBeenCalledTimes(2));
  });
});
