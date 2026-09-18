import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TicketDetail from "../../src/TicketDetail.js";
import * as api from "../../src/api.js";

const DETAIL: api.TicketDetail = {
  id: 501,
  ticketNumber: "TKT-2026-00501",
  summary: "Requester extension test",
  description: "Testing public comments and resolution indication.",
  status: "New",
  requestedPriority: "High",
  itPriority: "Medium",
  problemAppearsResolvedAt: null,
  createdAt: "2026-09-15T10:00:00.000Z",
  requester: { id: 301, name: "Authenticated Requester" },
  category: { id: 1, name: "Software" },
  relatedSystem: { id: 1, name: "CRM" },
  attachments: [],
};

describe("Lab 3 Requester Ticket Detail extensions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(DETAIL);
    vi.spyOn(api, "getPublicComments").mockResolvedValue([]);
  });

  it("shows read-only IT Priority, Public Comments, and the resolution indication action", async () => {
    render(<TicketDetail ticketId={DETAIL.id} onBack={vi.fn()} />);
    expect(await screen.findByText(DETAIL.ticketNumber)).toBeInTheDocument();
    expect(screen.getByText("IT Priority")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /Public Comments/i })).toBeInTheDocument();
    expect(screen.getByText(/No public comments yet/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Add a public comment/i)).not.toHaveAttribute("maxlength");
    expect(screen.getByText("0/2000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Problem Appears Resolved/i })).toBeInTheDocument();
  });

  it("counts Public Comment characters by Unicode code point", async () => {
    const postSpy = vi.spyOn(api, "postPublicComment").mockResolvedValue({
      id: 702,
      content: "ok",
      createdAt: "2026-09-15T10:06:00.000Z",
      author: { id: 301, name: "Authenticated Requester", role: "REQUESTER" },
    });
    render(<TicketDetail ticketId={DETAIL.id} onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: /Public Comments/i });
    const textarea = screen.getByLabelText(/Add a public comment/i);
    const atLimit = "😀".repeat(2000);
    fireEvent.change(textarea, { target: { value: atLimit } });
    expect(screen.getByText("2000/2000")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Post Comment/i }));
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith(DETAIL.id, atLimit));

    fireEvent.change(textarea, { target: { value: `${atLimit}😀` } });
    fireEvent.click(screen.getByRole("button", { name: /Post Comment/i }));
    expect(screen.getByText(/Comment must be at most 2000 characters/i)).toBeInTheDocument();
  });

  it("posts a Public Comment and refreshes the dedicated comment list without resetting Ticket Detail", async () => {
    const user = userEvent.setup();
    const created: api.PublicComment = {
      id: 701,
      content: "The issue still occurs after restart.",
      createdAt: "2026-09-15T10:05:00.000Z",
      author: { id: 301, name: "Authenticated Requester", role: "REQUESTER" },
    };
    vi.spyOn(api, "postPublicComment").mockResolvedValue(created);
    vi.spyOn(api, "getPublicComments")
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([created]);

    render(<TicketDetail ticketId={DETAIL.id} onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: /Public Comments/i });
    const textarea = screen.getByLabelText(/Add a public comment/i);
    await user.type(textarea, created.content);
    await user.click(screen.getByRole("button", { name: /Post Comment/i }));

    expect(api.postPublicComment).toHaveBeenCalledWith(DETAIL.id, created.content);
    expect(await screen.findByText(created.content)).toBeInTheDocument();
    expect(screen.getAllByText(/Authenticated Requester/i).length).toBeGreaterThanOrEqual(2);
    expect(textarea).toHaveValue("");
    expect(screen.getByText(DETAIL.summary)).toBeInTheDocument();
  });

  it("preserves the Public Comment draft when posting fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "postPublicComment").mockRejectedValue(
      new api.ApiError("Unable to post public comment", 500),
    );

    render(<TicketDetail ticketId={DETAIL.id} onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: /Public Comments/i });
    const textarea = screen.getByLabelText(/Add a public comment/i);
    const draft = "Please keep this update so I can retry.";
    await user.type(textarea, draft);
    await user.click(screen.getByRole("button", { name: /Post Comment/i }));

    expect(await screen.findByText(/Unable to post public comment/i)).toBeInTheDocument();
    expect(textarea).toHaveValue(draft);
  });

  it("blocks a blank Public Comment client-side", async () => {
    const user = userEvent.setup();
    const postSpy = vi.spyOn(api, "postPublicComment");
    render(<TicketDetail ticketId={DETAIL.id} onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: /Public Comments/i });
    await user.type(screen.getByLabelText(/Add a public comment/i), "   ");
    await user.click(screen.getByRole("button", { name: /Post Comment/i }));
    expect(screen.getByText(/Comment is required/i)).toBeInTheDocument();
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("confirms Problem Appears Resolved, keeps formal status, and shows the indication", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const indicatedAt = "2026-09-15T10:10:00.000Z";
    vi.spyOn(api, "indicateProblemAppearsResolved").mockResolvedValue({
      ticketId: DETAIL.id,
      status: "New",
      problemAppearsResolvedAt: indicatedAt,
    });
    vi.spyOn(api, "getTicketDetail")
      .mockResolvedValueOnce(DETAIL)
      .mockResolvedValueOnce({ ...DETAIL, problemAppearsResolvedAt: indicatedAt });

    render(<TicketDetail ticketId={DETAIL.id} onBack={vi.fn()} />);
    await screen.findByText(DETAIL.ticketNumber);
    await user.click(screen.getByRole("button", { name: /Problem Appears Resolved/i }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/does not formally close/i));
    expect(api.indicateProblemAppearsResolved).toHaveBeenCalledWith(DETAIL.id);
    await waitFor(() => expect(screen.getByText(/Requester indicated this problem appears resolved/i)).toBeInTheDocument());
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("hides the indication action for terminal statuses", async () => {
    vi.spyOn(api, "getTicketDetail").mockResolvedValue({ ...DETAIL, status: "Resolved" });
    render(<TicketDetail ticketId={DETAIL.id} onBack={vi.fn()} />);
    await screen.findByText(DETAIL.ticketNumber);
    expect(screen.queryByRole("button", { name: /Problem Appears Resolved/i })).not.toBeInTheDocument();
  });
});
