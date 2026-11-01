import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionsTakenPanel from "../../src/ActionsTakenPanel.js";
import * as api from "../../src/api.js";

const CURRENT_USER_ID = 11;
const OTHER_USER_ID = 12;

const ASSIGNEES: api.StaffAssignee[] = [
  { id: CURRENT_USER_ID, name: "Narin Support", email: "narin@toktick.it", role: "IT_STAFF" },
  { id: OTHER_USER_ID, name: "Malee Support", email: "malee@toktick.it", role: "IT_STAFF" },
];

const BASE_ACTION: api.ActionTaken = {
  id: 101,
  ticketId: 501,
  clientRequestId: "11111111-1111-4111-8111-111111111111",
  workflowCycle: 1,
  actionDateTime: "2026-09-18T08:30:00.000Z",
  description: "Review report module configuration",
  result: null,
  followUpRequired: true,
  followUpNote: "Re-check after config change",
  followUpStatus: "OUTSTANDING",
  followUpCompletedBy: null,
  followUpCompletedAt: null,
  attachmentNotes: "Log file analysis completed.",
  status: "In Progress",
  createdBy: { id: OTHER_USER_ID, name: "Malee Support", role: "IT_STAFF" },
  assignee: { id: CURRENT_USER_ID, name: "Narin Support", role: "IT_STAFF" },
  performedBy: null,
  completedAt: null,
  cancelledBy: null,
  cancelledAt: null,
  version: 2,
  createdAt: "2026-09-18T08:31:00.000Z",
  updatedAt: "2026-09-18T08:40:00.000Z",
};

const COMPLETED_ACTION: api.ActionTaken = {
  ...BASE_ACTION,
  id: 102,
  clientRequestId: "22222222-2222-4222-8222-222222222222",
  actionDateTime: "2026-09-18T09:30:00.000Z",
  description: "Checked application logs for filter state error",
  result: "Issue identified and configuration corrected.",
  followUpRequired: false,
  followUpNote: null,
  followUpStatus: "NOT_REQUIRED",
  followUpCompletedBy: null,
  followUpCompletedAt: null,
  status: "Completed",
  performedBy: { id: CURRENT_USER_ID, name: "Narin Support", role: "IT_STAFF" },
  completedAt: "2026-09-18T09:50:00.000Z",
  version: 3,
  updatedAt: "2026-09-18T09:50:00.000Z",
};

const CANCELLED_ACTION: api.ActionTaken = {
  ...BASE_ACTION,
  id: 103,
  clientRequestId: "33333333-3333-4333-8333-333333333333",
  actionDateTime: "2026-09-18T07:30:00.000Z",
  description: "Restarted report service to clear cache",
  followUpRequired: false,
  followUpNote: null,
  followUpStatus: "NOT_REQUIRED",
  followUpCompletedBy: null,
  followUpCompletedAt: null,
  attachmentNotes: null,
  status: "Cancelled",
  assignee: { id: OTHER_USER_ID, name: "Malee Support", role: "IT_STAFF" },
  cancelledBy: { id: CURRENT_USER_ID, name: "Narin Support", role: "IT_STAFF" },
  cancelledAt: "2026-09-18T07:45:00.000Z",
  version: 2,
  updatedAt: "2026-09-18T07:45:00.000Z",
};

function renderPanel(overrides: Partial<React.ComponentProps<typeof ActionsTakenPanel>> = {}) {
  const props: React.ComponentProps<typeof ActionsTakenPanel> = {
    ticketId: 501,
    ticketStatus: "In Progress",
    ticketVersion: 5,
    workflowCycle: 1,
    currentUserId: CURRENT_USER_ID,
    assignees: ASSIGNEES,
    onTicketVersionChange: vi.fn(),
    onRefreshTicket: vi.fn().mockResolvedValue(6),
    ...overrides,
  };
  return { ...render(<ActionsTakenPanel {...props} />), props };
}

function actionCardFor(description: string): HTMLElement {
  const card = screen.getByText(description).closest<HTMLElement>(".action-card");
  if (!card) throw new Error(`Action card not found for: ${description}`);
  return card;
}

describe("Lab 4 Actions Taken Ticket Detail UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getActionsTaken").mockResolvedValue([COMPLETED_ACTION, BASE_ACTION, CANCELLED_ACTION]);
    vi.spyOn(api, "createStaffActionTaken");
    vi.spyOn(api, "updateStaffActionTaken");
    vi.spyOn(api, "updateStaffActionStatus");
    vi.spyOn(api, "completeStaffActionFollowUp");
  });

  it("AT-UI-01: renders multiple Actions in server-stable order with required fields and provenance", async () => {
    renderPanel();
    expect(await screen.findByText(COMPLETED_ACTION.description)).toBeInTheDocument();
    const cards = document.querySelectorAll(".action-card");
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent(COMPLETED_ACTION.description);
    expect(cards[1]).toHaveTextContent(BASE_ACTION.description);
    expect(screen.getByText("Issue identified and configuration corrected.")).toBeInTheDocument();
    expect(screen.getByText("Re-check after config change")).toBeInTheDocument();
    expect(screen.getAllByText("Log file analysis completed.").length).toBeGreaterThan(0);
    expect(screen.getByText("Performed by")).toBeInTheDocument();
    expect(screen.getByText("Cancelled by")).toBeInTheDocument();
    expect(screen.getAllByText(/Recorded at/).length).toBe(3);
  });

  it("AT-UI-02: create mode starts Planned automatically and validates conditional Follow-up Note", async () => {
    vi.mocked(api.getActionsTaken).mockResolvedValue([]);
    const user = userEvent.setup();
    renderPanel();
    await user.click(await screen.findByRole("button", { name: /Add Action/i }));
    const dialog = screen.getByRole("dialog", { name: "Add Action" });
    expect(within(dialog).getByText((_, element) => element?.classList.contains("action-info-banner") === true)).toHaveTextContent("New Actions start as Planned automatically.");
    expect(within(dialog).queryByLabelText(/Status/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/Follow-up Note/)).not.toBeInTheDocument();
    await user.click(within(dialog).getByLabelText("Yes"));
    expect(within(dialog).getByLabelText(/Follow-up Note/)).toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText(/Description/));
    await user.click(within(dialog).getByRole("button", { name: "Create Action" }));
    expect(within(dialog).getByText("Description is required.")).toBeInTheDocument();
    expect(within(dialog).getByText(/Follow-up Note is required/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Description/)).toHaveFocus();
  });

  it("AT-UI-03: inactive-assignee conflict keeps create draft and offers safe refresh guidance", async () => {
    vi.mocked(api.getActionsTaken).mockResolvedValue([]);
    vi.mocked(api.createStaffActionTaken).mockRejectedValueOnce(new api.ApiError(
      "ineligible", 409, "ACTION_ASSIGNEE_NOT_ELIGIBLE",
    ));
    const user = userEvent.setup();
    const refresh = vi.fn();
    renderPanel({ onRefreshTicket: refresh });
    await user.click(await screen.findByRole("button", { name: /Add Action/i }));
    const dialog = screen.getByRole("dialog");
    const description = within(dialog).getByLabelText(/Description/);
    await user.type(description, "Preserve this draft during the conflict");
    await user.click(within(dialog).getByRole("button", { name: "Create Action" }));
    expect(await within(dialog).findByText(/assignee is no longer eligible/i)).toBeInTheDocument();
    expect(description).toHaveValue("Preserve this draft during the conflict");
    await user.click(within(dialog).getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("AT-UI-04: edit sends both versions and stale conflict preserves the draft with Refresh", async () => {
    vi.mocked(api.updateStaffActionTaken).mockRejectedValueOnce(new api.ApiError("stale", 409, "STALE_ACTION_TAKEN"));
    const user = userEvent.setup();
    const refresh = vi.fn();
    renderPanel({ onRefreshTicket: refresh });
    await screen.findByText(BASE_ACTION.description);
    const activeCard = actionCardFor(BASE_ACTION.description);
    await user.click(within(activeCard).getByRole("button", { name: "Edit" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Action" });
    const description = within(dialog).getByLabelText(/Description/);
    await user.clear(description);
    await user.type(description, "Draft remains after stale conflict");
    await user.click(within(dialog).getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(api.updateStaffActionTaken).toHaveBeenCalledWith(BASE_ACTION.id, expect.objectContaining({
      expectedVersion: BASE_ACTION.version,
      expectedTicketVersion: 5,
      description: "Draft remains after stale conflict",
    })));
    expect(await within(dialog).findByText(/Action changed after you opened it/i)).toBeInTheDocument();
    expect(description).toHaveValue("Draft remains after stale conflict");
    await user.click(within(dialog).getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("AT-UI-04R: Reassign sends Action + Ticket versions and updates the visible assignee", async () => {
    const reassigned = { ...BASE_ACTION, assignee: { id: OTHER_USER_ID, name: "Malee Support", role: "IT_STAFF" as const }, version: 3 };
    vi.mocked(api.updateStaffActionTaken).mockResolvedValueOnce(reassigned);
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(BASE_ACTION.description);
    const card = actionCardFor(BASE_ACTION.description);
    await user.click(within(card).getByRole("button", { name: "Reassign" }));
    const dialog = screen.getByRole("dialog", { name: "Reassign Action" });
    await user.selectOptions(within(dialog).getByLabelText(/Assignee/), String(OTHER_USER_ID));
    await user.click(within(dialog).getByRole("button", { name: "Reassign Action" }));
    await waitFor(() => expect(api.updateStaffActionTaken).toHaveBeenCalledWith(BASE_ACTION.id, {
      expectedVersion: BASE_ACTION.version,
      expectedTicketVersion: 5,
      assigneeId: OTHER_USER_ID,
    }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(actionCardFor(BASE_ACTION.description)).toHaveTextContent("Malee Support");
  });

  it("AT-UI-05: active lifecycle controls enforce assignee-only Complete, validate Result, and terminal rows are read-only", async () => {
    const plannedOther: api.ActionTaken = {
      ...BASE_ACTION,
      id: 104,
      status: "Planned",
      description: "Planned work assigned to another Staff member",
      assignee: { id: OTHER_USER_ID, name: "Malee Support", role: "IT_STAFF" },
      version: 1,
    };
    vi.mocked(api.getActionsTaken).mockResolvedValue([plannedOther, BASE_ACTION, COMPLETED_ACTION, CANCELLED_ACTION]);
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(plannedOther.description);
    const otherCard = actionCardFor(plannedOther.description);
    expect(within(otherCard).getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(within(otherCard).queryByRole("button", { name: "Complete" })).not.toBeInTheDocument();
    expect(within(otherCard).getByText("Assignee completes")).toBeInTheDocument();

    const assignedCard = actionCardFor(BASE_ACTION.description);
    await user.click(within(assignedCard).getByRole("button", { name: "Complete" }));
    const completeDialog = screen.getByRole("dialog", { name: "Complete Action" });
    await user.click(within(completeDialog).getByRole("button", { name: "Complete Action" }));
    expect(within(completeDialog).getByText(/Result is required/i)).toBeInTheDocument();

    const completedCard = actionCardFor(COMPLETED_ACTION.description);
    expect(within(completedCard).queryByRole("button", { name: /Edit|Reassign|Complete|Cancel/ })).not.toBeInTheDocument();
    const cancelledCard = actionCardFor(CANCELLED_ACTION.description);
    expect(within(cancelledCard).queryByRole("button", { name: /Edit|Reassign|Complete|Cancel/ })).not.toBeInTheDocument();
  });

  it("AT-UI-05T: active Actions on a terminal Ticket are read-only and explain Reopen", async () => {
    vi.mocked(api.getActionsTaken).mockResolvedValue([BASE_ACTION]);
    renderPanel({ ticketStatus: "Resolved" });
    const card = await screen.findByText(BASE_ACTION.description).then(() => actionCardFor(BASE_ACTION.description));
    expect(within(card).queryByRole("button", { name: /Edit|Reassign|Start|Complete|Cancel/ })).not.toBeInTheDocument();
    expect(within(card).getByText(/Reopen Ticket before changing this Action/i)).toBeInTheDocument();
  });

  it("AT-UI-10: consecutive mutations use the authoritative refreshed Ticket version", async () => {
    const planned = { ...BASE_ACTION, status: "Planned" as const, version: 1 };
    const started = { ...planned, status: "In Progress" as const, version: 3 };
    const reassigned = { ...started, assignee: { id: OTHER_USER_ID, name: "Malee Support", role: "IT_STAFF" as const }, version: 4 };
    vi.mocked(api.updateStaffActionStatus).mockResolvedValueOnce(started);
    vi.mocked(api.updateStaffActionTaken).mockResolvedValueOnce(reassigned);
    const refresh = vi.fn()
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(7);
    const user = userEvent.setup();
    vi.mocked(api.getActionsTaken).mockResolvedValue([planned]);
    renderPanel({ onRefreshTicket: refresh });
    await screen.findByText(planned.description);
    const card = actionCardFor(planned.description);
    await user.click(within(card).getByRole("button", { name: "Start" }));
    await waitFor(() => expect(api.updateStaffActionStatus).toHaveBeenCalledWith(planned.id, expect.objectContaining({ expectedTicketVersion: 5 })));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    const updatedCard = actionCardFor(planned.description);
    await user.click(within(updatedCard).getByRole("button", { name: "Reassign" }));
    const dialog = screen.getByRole("dialog", { name: "Reassign Action" });
    await user.selectOptions(within(dialog).getByLabelText(/Assignee/), String(OTHER_USER_ID));
    await user.click(within(dialog).getByRole("button", { name: "Reassign Action" }));
    await waitFor(() => expect(api.updateStaffActionTaken).toHaveBeenCalledWith(planned.id, expect.objectContaining({ expectedTicketVersion: 6 })));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("AT-UI-11: Refresh reports parent Ticket failure without closing the dialog", async () => {
    vi.mocked(api.getActionsTaken).mockResolvedValue([BASE_ACTION]);
    vi.mocked(api.updateStaffActionTaken).mockRejectedValueOnce(new api.ApiError("stale", 409, "STALE_ACTION_TAKEN"));
    const refresh = vi.fn().mockRejectedValue(new Error("parent refresh failed"));
    const user = userEvent.setup();
    renderPanel({ onRefreshTicket: refresh });
    const card = await screen.findByText(BASE_ACTION.description).then(() => actionCardFor(BASE_ACTION.description));
    await user.click(within(card).getByRole("button", { name: "Edit" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Action" });
    await user.click(within(dialog).getByRole("button", { name: "Save Changes" }));
    const refreshButton = await within(dialog).findByRole("button", { name: "Refresh" });
    await user.click(refreshButton);
    await waitFor(() => expect(screen.getByText(/Unable to refresh current Ticket state/i)).toBeInTheDocument());
    expect(screen.getByRole("dialog", { name: "Edit Action" })).toBeInTheDocument();
  });

  it("AT-UI-05C: Cancel requires explicit confirmation and then renders backend cancellation provenance read-only", async () => {
    const cancelled = {
      ...BASE_ACTION,
      status: "Cancelled" as const,
      cancelledBy: { id: CURRENT_USER_ID, name: "Narin Support", role: "IT_STAFF" as const },
      cancelledAt: "2026-09-18T10:15:00.000Z",
      version: 3,
    };
    vi.mocked(api.updateStaffActionStatus).mockResolvedValueOnce(cancelled);
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(BASE_ACTION.description);
    const card = actionCardFor(BASE_ACTION.description);
    await user.click(within(card).getByRole("button", { name: "Cancel" }));
    const dialog = screen.getByRole("dialog", { name: "Cancel Action" });
    expect(within(dialog).getByText(/Cancellation is terminal/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel Action" }));
    await waitFor(() => expect(api.updateStaffActionStatus).toHaveBeenCalledWith(BASE_ACTION.id, {
      status: "Cancelled",
      expectedVersion: BASE_ACTION.version,
      expectedTicketVersion: 5,
    }));
    const savedCard = actionCardFor(BASE_ACTION.description);
    expect(savedCard).toHaveTextContent("Cancelled by");
    expect(savedCard).toHaveTextContent("Narin Support");
    expect(within(savedCard).queryByRole("button", { name: /Edit|Reassign|Complete|Cancel/ })).not.toBeInTheDocument();
  });

  it("AT-UI-06: successful completion renders backend-owned performer/completed-at provenance", async () => {
    const completed = { ...COMPLETED_ACTION, id: BASE_ACTION.id, description: BASE_ACTION.description };
    vi.mocked(api.updateStaffActionStatus).mockResolvedValueOnce(completed);
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(BASE_ACTION.description);
    const activeCard = actionCardFor(BASE_ACTION.description);
    await user.click(within(activeCard).getByRole("button", { name: "Complete" }));
    const dialog = screen.getByRole("dialog", { name: "Complete Action" });
    await user.type(within(dialog).getByLabelText(/Result/), "Verified successfully");
    await user.click(within(dialog).getByRole("button", { name: "Complete Action" }));
    await waitFor(() => expect(api.updateStaffActionStatus).toHaveBeenCalledWith(BASE_ACTION.id, expect.objectContaining({
      status: "Completed",
      expectedVersion: BASE_ACTION.version,
      expectedTicketVersion: 5,
    })));
    await screen.findByText(BASE_ACTION.description);
    const savedCard = actionCardFor(BASE_ACTION.description);
    expect(savedCard).toHaveTextContent("Performed by");
    expect(savedCard).toHaveTextContent("Narin Support");
    expect(savedCard).toHaveTextContent("Completed at");
  });

  it("FU-UI-01/02: outstanding follow-up has explicit lifecycle state and completion control", async () => {
    const requiredCompleted = {
      ...COMPLETED_ACTION,
      followUpRequired: true,
      followUpNote: "Confirm the next export with requester.",
      followUpStatus: "OUTSTANDING" as const,
      followUpCompletedBy: null,
      followUpCompletedAt: null,
      version: 4,
    };
    vi.mocked(api.getActionsTaken).mockResolvedValue([requiredCompleted]);
    const completed = {
      ...requiredCompleted,
      followUpStatus: "COMPLETED" as const,
      followUpCompletedBy: { id: CURRENT_USER_ID, name: "Narin Support", role: "IT_STAFF" as const },
      followUpCompletedAt: "2026-09-18T10:05:00.000Z",
      version: 5,
    };
    vi.mocked(api.completeStaffActionFollowUp).mockResolvedValueOnce(completed);
    const refresh = vi.fn().mockResolvedValue(6);
    const user = userEvent.setup();
    renderPanel({ onRefreshTicket: refresh });
    const card = await screen.findByText(requiredCompleted.description).then(() => actionCardFor(requiredCompleted.description));
    expect(within(card).getByText("Outstanding")).toBeInTheDocument();
    await user.click(within(card).getByRole("button", { name: "Mark Follow-up Complete" }));
    await waitFor(() => expect(api.completeStaffActionFollowUp).toHaveBeenCalledWith(requiredCompleted.id, 4, 5));
    expect(within(actionCardFor(requiredCompleted.description)).getByText("Follow-Up Status").nextElementSibling).toHaveTextContent("Completed");
    expect(refresh).toHaveBeenCalled();
  });

  it("FU-UI-03: Resolution Gate uses the Ticket workflow cycle when only historical Actions are loaded", async () => {
    const historicalCompleted = {
      ...COMPLETED_ACTION,
      workflowCycle: 1,
      followUpRequired: true,
      followUpNote: "Historical-cycle follow-up",
      followUpStatus: "OUTSTANDING" as const,
      followUpCompletedBy: null,
      followUpCompletedAt: null,
    };
    vi.mocked(api.getActionsTaken).mockResolvedValue([historicalCompleted]);

    renderPanel({ workflowCycle: 2 });

    await screen.findByText(historicalCompleted.description);
    const gate = screen.getByRole("heading", { name: "Resolution Gate" }).closest("section");
    expect(gate).not.toBeNull();
    expect(gate).toHaveTextContent("Blocked");
    expect(gate).toHaveTextContent("Current-cycle Completed Action with non-blank Result");
    expect(gate).toHaveTextContent("No current-cycle Planned / In Progress Actions");
    expect(gate).toHaveTextContent("No current-cycle outstanding follow-up");
    expect(within(gate as HTMLElement).getByText("! Current-cycle Completed Action with non-blank Result")).toBeInTheDocument();
    expect(within(gate as HTMLElement).getByText("✓ No current-cycle Planned / In Progress Actions")).toBeInTheDocument();
    expect(within(gate as HTMLElement).getByText("✓ No current-cycle outstanding follow-up")).toBeInTheDocument();
  });

  it("AT-UI-07: unknown create failure preserves draft and reuses one clientRequestId on retry", async () => {
    vi.mocked(api.getActionsTaken).mockResolvedValue([]);
    const saved = { ...BASE_ACTION, id: 201, status: "Planned" as const, version: 1 };
    vi.mocked(api.createStaffActionTaken)
      .mockRejectedValueOnce(new api.ApiError("temporary failure", 500, "ACTION_CREATE_FAILED"))
      .mockResolvedValueOnce({ action: saved, created: true });
    const user = userEvent.setup();
    renderPanel();
    await user.click(await screen.findByRole("button", { name: /Add Action/i }));
    const dialog = screen.getByRole("dialog");
    const description = within(dialog).getByLabelText(/Description/);
    await user.type(description, "Retry this exact logical Action");
    const submit = within(dialog).getByRole("button", { name: "Create Action" });
    await user.click(submit);
    expect(await within(dialog).findByText("temporary failure")).toBeInTheDocument();
    expect(description).toHaveValue("Retry this exact logical Action");
    await user.click(submit);
    await waitFor(() => expect(api.createStaffActionTaken).toHaveBeenCalledTimes(2));
    const first = vi.mocked(api.createStaffActionTaken).mock.calls[0][1];
    const second = vi.mocked(api.createStaffActionTaken).mock.calls[1][1];
    expect(second.clientRequestId).toBe(first.clientRequestId);
    await waitFor(() => expect(document.querySelector(".actions-feedback-success")).toHaveTextContent("Action created successfully."));
  });

  it("AT-UI-07B: busy state disables submit and prevents ordinary duplicate create clicks", async () => {
    vi.mocked(api.getActionsTaken).mockResolvedValue([]);
    let resolveCreate!: (value: { action: api.ActionTaken; created: boolean }) => void;
    vi.mocked(api.createStaffActionTaken).mockImplementationOnce(() => new Promise((resolve) => { resolveCreate = resolve; }));
    const user = userEvent.setup();
    renderPanel();
    await user.click(await screen.findByRole("button", { name: /Add Action/i }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Description/), "One logical submission only");
    const submit = within(dialog).getByRole("button", { name: "Create Action" });
    await user.click(submit);
    expect(within(dialog).getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(api.createStaffActionTaken).toHaveBeenCalledTimes(1);
    resolveCreate({ action: { ...BASE_ACTION, id: 301, status: "Planned", version: 1 }, created: true });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.createStaffActionTaken).toHaveBeenCalledTimes(1);
  });

  it("AT-UI-07R: recovered idempotent create retry refreshes the authoritative Ticket version", async () => {
    vi.mocked(api.getActionsTaken).mockResolvedValue([]);
    const recovered = { ...BASE_ACTION, id: 302, status: "Planned" as const, version: 1 };
    vi.mocked(api.createStaffActionTaken).mockResolvedValueOnce({ action: recovered, created: false });
    const refresh = vi.fn().mockResolvedValue(6);
    const bump = vi.fn();
    const user = userEvent.setup();
    renderPanel({ onRefreshTicket: refresh, onTicketVersionChange: bump });
    await user.click(await screen.findByRole("button", { name: /Add Action/i }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Description/), "Recover original logical create");
    await user.click(within(dialog).getByRole("button", { name: "Create Action" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(bump).toHaveBeenCalledWith(6);
    await waitFor(() => expect(document.querySelector(".actions-feedback-success")).toHaveTextContent("original Action submission was recovered"));
  });

  it("AT-UI-07C: list load failure is safe and Retry reloads Actions", async () => {
    vi.mocked(api.getActionsTaken)
      .mockRejectedValueOnce(new api.ApiError("temporary load failure", 500, "ACTIONS_TAKEN_LOAD_FAILED"))
      .mockResolvedValueOnce([BASE_ACTION]);
    const user = userEvent.setup();
    renderPanel();
    expect(await screen.findByText("Unable to load Actions Taken.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(BASE_ACTION.description)).toBeInTheDocument();
    expect(api.getActionsTaken).toHaveBeenCalledTimes(2);
  });

  it("AT-UI-08: Requester Actions section is read-only and terminal Ticket has no Add control", async () => {
    renderPanel({ readOnly: true, currentUserId: undefined, assignees: [] });
    expect(await screen.findByText(BASE_ACTION.description)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add Action|Edit|Reassign|Start|Complete|Cancel/ })).not.toBeInTheDocument();

    vi.mocked(api.getActionsTaken).mockResolvedValue([]);
    const { unmount } = renderPanel({ ticketId: 777, ticketStatus: "Resolved" });
    expect(await screen.findByText(/No Actions Taken have been recorded/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add Action/ })).not.toBeInTheDocument();
    expect(screen.getByText(/cannot be added while this Ticket is Resolved/i)).toBeInTheDocument();
    unmount();
  });

  it("AT-UI-09/V4-06/V4-08: occurrence/audit time are distinct, future input focuses validation, Escape closes and restores focus", async () => {
    vi.mocked(api.getActionsTaken).mockResolvedValue([]);
    const user = userEvent.setup();
    renderPanel();
    const add = await screen.findByRole("button", { name: /Add Action/i });
    add.focus();
    await user.click(add);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/When did this work actually happen/i)).toBeInTheDocument();
    const dateInput = within(dialog).getByLabelText(/Action Date\/Time/);
    const future = new Date(Date.now() + 10 * 60_000);
    const local = new Date(future.getTime() - future.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    await user.clear(dateInput);
    await user.type(dateInput, local);
    await user.type(within(dialog).getByLabelText(/Description/), "Future time validation");
    await user.click(within(dialog).getByRole("button", { name: "Create Action" }));
    expect(within(dialog).getByText(/cannot be more than 5 minutes in the future/i)).toBeInTheDocument();
    expect(dateInput).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(add).toHaveFocus();
  });
});
