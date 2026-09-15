import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TicketDetail from "../../src/TicketDetail.js";
import * as api from "../../src/api.js";

const DETAIL: api.TicketDetail = {
  id: 12,
  ticketNumber: "TKT-2026-00012",
  summary: "Cannot export report",
  description: "Export fails after clicking the button.",
  status: "New",
  requestedPriority: "High",
  createdAt: "2026-09-01T08:00:00.000Z",
  requester: { id: 1, name: "Somchai Jaidee" },
  category: { id: 1, name: "Software" },
  relatedSystem: { id: 2, name: "Report Portal" },
  attachments: [
    {
      id: 3,
      fileName: "active.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2048,
      removedAt: null,
      removalReason: null,
    },
    {
      id: 4,
      fileName: "removed.png",
      mimeType: "image/png",
      sizeBytes: 1024,
      removedAt: "2026-09-01T09:00:00.000Z",
      removalReason: "Duplicate screenshot",
    },
  ],
};

describe("TicketDetail", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(DETAIL);
    vi.spyOn(api, "getPublicComments").mockResolvedValue([]);
  });

  it("UI-6/UI-9/UI-12: renders Requested Priority and attachment states", async () => {
    render(<TicketDetail ticketId={12} onBack={vi.fn()} />);

    expect(await screen.findByText("TKT-2026-00012")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Ticket Detail/i })).toBeInTheDocument();
    expect(screen.getByText("Export fails after clicking the button.")).toBeInTheDocument();
    expect(screen.getByText("Requested Priority")).toBeInTheDocument();
    expect(screen.getByText("High")).toHaveClass("priority-badge", "priority-high");
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();

    const activeRow = screen.getByTestId("attachment-3");
    expect(activeRow).toHaveTextContent("active.pdf");
    expect(activeRow).toHaveTextContent("2 KB");
    expect(activeRow).toHaveTextContent("application/pdf");
    expect(activeRow.querySelector("button[aria-label='Download active.pdf']")).toBeInTheDocument();
    expect(activeRow.querySelector("button[aria-label='Remove active.pdf']")).toBeInTheDocument();

    const removedRow = screen.getByTestId("attachment-4");
    expect(removedRow).toHaveTextContent("removed.png");
    expect(removedRow).toHaveTextContent("Removed");
    expect(removedRow).toHaveTextContent("Removal reason: Duplicate screenshot");
    expect(removedRow.querySelector("button")).not.toBeInTheDocument();
  });

  it("shows friendly not-found state with back action", async () => {
    const onBack = vi.fn();
    vi.spyOn(api, "getTicketDetail").mockRejectedValue(new api.ApiError("Ticket not found", 404));
    const user = userEvent.setup();

    render(<TicketDetail ticketId={999} onBack={onBack} />);

    expect(await screen.findByText(/Ticket not found/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Back to My Tickets/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("confirms soft removal then refreshes detail", async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("No longer needed");
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const removeSpy = vi.spyOn(api, "removeAttachment").mockResolvedValue({
      ...DETAIL.attachments[0],
      removedAt: "2026-09-01T10:00:00.000Z",
      removalReason: "No longer needed",
    });
    vi.spyOn(api, "getTicketDetail")
      .mockResolvedValueOnce(DETAIL)
      .mockResolvedValueOnce({
        ...DETAIL,
        attachments: [
          {
            ...DETAIL.attachments[0],
            removedAt: "2026-09-01T10:00:00.000Z",
            removalReason: "No longer needed",
          },
          DETAIL.attachments[1],
        ],
      });

    render(<TicketDetail ticketId={12} onBack={vi.fn()} />);
    await screen.findByText("active.pdf");
    await user.click(screen.getByRole("button", { name: "Remove active.pdf" }));

    expect(promptSpy).toHaveBeenCalled();
    expect(confirmSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith(3, "No longer needed");
    expect(await screen.findByText(/Attachment removed/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("attachment-3")).toHaveTextContent("Removed");
      expect(screen.getByTestId("attachment-3")).toHaveTextContent("Removal reason: No longer needed");
    });
  });

  it("does not remove when the removal reason is blank", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "prompt").mockReturnValue("   ");
    const confirmSpy = vi.spyOn(window, "confirm");
    const removeSpy = vi.spyOn(api, "removeAttachment");

    render(<TicketDetail ticketId={12} onBack={vi.fn()} />);
    await screen.findByText("active.pdf");
    await user.click(screen.getByRole("button", { name: "Remove active.pdf" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/Removal reason is required/i)).toBeInTheDocument();
  });

  it("uploads selected valid attachments and refreshes detail", async () => {
    const user = userEvent.setup();
    const uploadSpy = vi.spyOn(api, "uploadAttachments").mockResolvedValue(DETAIL.attachments);
    render(<TicketDetail ticketId={12} onBack={vi.fn()} />);
    await screen.findByText("TKT-2026-00012");

    const file = new File(["pdf bytes"], "evidence.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText(/Add attachments/i), file);
    await user.click(screen.getByRole("button", { name: /Upload selected/i }));

    expect(uploadSpy).toHaveBeenCalledWith(12, [file]);
    expect(await screen.findByText(/Attachment upload complete/i)).toBeInTheDocument();
  });
});
