import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import CreateTicket from "../../src/CreateTicket.js";
import * as api from "../../src/api.js";
import { RequesterProvider, useRequester } from "../../src/RequesterContext.js";

const TEST_REQUESTER: api.Requester = {
  id: 1,
  name: "Somchai Jaidee",
  email: "somchai@toktick.it",
  isActive: true,
};

const CATEGORIES: api.Category[] = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];

const SYSTEMS: api.RelatedSystem[] = [{ id: 1, name: "CRM" }, { id: 2, name: "Payroll" }];

function Harness() {
  const { selectRequester } = useRequester();
  useEffect(() => {
    selectRequester(TEST_REQUESTER);
  }, [selectRequester]);
  return <CreateTicket />;
}

function renderForm() {
  return render(
    <RequesterProvider>
      <Harness />
    </RequesterProvider>
  );
}

describe("CreateTicket", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getCategories").mockResolvedValue(CATEGORIES);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue(SYSTEMS);
  });

  it("UI-2: renders the form with required-field asterisks and dropdowns", async () => {
    renderForm();
    await screen.findByText(/Loading form data/);
    await waitFor(() => expect(screen.queryByText(/Loading form data/)).not.toBeInTheDocument());

    expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Related System/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Summary/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Attachments/i)).toBeInTheDocument();

    // Zen Green primary action button.
    const submit = screen.getByRole("button", { name: /Create Ticket/i });
    expect(submit).toHaveClass("btn-success");
  });

  it("UI-3: blocks submit and shows validation messages below inputs", async () => {
    const user = userEvent.setup();
    const createSpy = vi.spyOn(api, "createTicket");
    renderForm();
    await waitFor(() => expect(screen.queryByText(/Loading form data/)).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Create Ticket/i }));

    expect(createSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/Please select a category/i)).toBeInTheDocument();
    expect(screen.getByText(/Please select a related system/i)).toBeInTheDocument();
    expect(screen.getByText("Summary is required")).toBeInTheDocument();
    expect(screen.getByText("Description is required")).toBeInTheDocument();
  });

  it("UI-4: shows a busy state while submitting", async () => {
    const user = userEvent.setup();
    let resolveCreate!: (t: api.Ticket) => void;
    const promise = new Promise<api.Ticket>((resolve) => {
      resolveCreate = resolve;
    });
    vi.spyOn(api, "createTicket").mockImplementation(() => promise);

    renderForm();
    await waitFor(() => expect(screen.queryByText(/Loading form data/)).not.toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText(/Category/), "1");
    await user.selectOptions(screen.getByLabelText(/Related System/), "1");
    await user.type(screen.getByLabelText(/Summary/), "Unit test ticket");
    await user.type(screen.getByLabelText(/Description/), "Description of the unit test ticket.");

    await user.click(screen.getByRole("button", { name: /Create Ticket/i }));
    expect(screen.getByRole("button", { name: /Creating/ })).toBeDisabled();
    expect(api.createTicket).toHaveBeenCalledWith(
      expect.objectContaining({ summary: "Unit test ticket" }),
      TEST_REQUESTER.id,
    );

    resolveCreate({
      id: 1,
      ticketNumber: "TKT-2026-00001",
      summary: "Unit test ticket",
      description: "Description of the unit test ticket.",
      status: "New",
      createdAt: new Date().toISOString(),
      requester: { id: 1, name: "Somchai Jaidee" },
      category: { id: 1, name: "Account and Access" },
      relatedSystem: { id: 1, name: "CRM" },
    });

    expect(await screen.findByText("Ticket created successfully")).toBeInTheDocument();
    expect(await screen.findByText(/TKT-2026-00001/)).toBeInTheDocument();
  });

  it("UI-5: maps server-side field errors below their inputs", async () => {
    const user = userEvent.setup();
    const createSpy = vi.spyOn(api, "createTicket").mockRejectedValue(
      Object.assign(new Error("Validation failed"), {
        fields: { relatedSystemId: "Related System must be a positive integer" },
      }),
    );

    renderForm();
    await waitFor(() => expect(screen.queryByText(/Loading form data/)).not.toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText(/Category/), "1");
    await user.selectOptions(screen.getByLabelText(/Related System/), "1");
    await user.type(screen.getByLabelText(/Summary/), "Server error ticket");
    await user.type(screen.getByLabelText(/Description/), "Checking per-field error mapping.");

    await user.click(screen.getByRole("button", { name: /Create Ticket/i }));

    expect(await screen.findByText(/Related System must be a positive integer/i)).toBeInTheDocument();
    expect(createSpy).toHaveBeenCalled();
    // Top-level server message still surfaces, but not as a raw JSON blob.
    expect(screen.getByText("Validation failed")).toBeInTheDocument();
    expect(screen.queryByText(/"relatedSystemId"/)).not.toBeInTheDocument();
  });

  it("validates attachment type/size before creating the ticket", async () => {
    // Bypass the browser accept= filter in this test so we can exercise our
    // own validation branch for a deliberately disallowed file type.
    const user = userEvent.setup({ applyAccept: false });
    const createSpy = vi.spyOn(api, "createTicket");
    renderForm();
    await waitFor(() => expect(screen.queryByText(/Loading form data/)).not.toBeInTheDocument());

    const bad = new File(["bad"], "malware.exe", { type: "application/octet-stream" });
    await user.upload(screen.getByLabelText(/Attachments/i), bad);
    expect(screen.getByText(/malware\.exe.*not an allowed type/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Category/), "1");
    await user.selectOptions(screen.getByLabelText(/Related System/), "1");
    await user.type(screen.getByLabelText(/Summary/), "Attachment validation");
    await user.type(screen.getByLabelText(/Description/), "Should not submit with invalid attachment.");
    await user.click(screen.getByRole("button", { name: /Create Ticket/i }));

    expect(createSpy).not.toHaveBeenCalled();
  });

  it("uploads selected attachments after ticket creation", async () => {
    const user = userEvent.setup();
    const createdTicket: api.Ticket = {
      id: 42,
      ticketNumber: "TKT-2026-00042",
      summary: "Create with attachment",
      description: "description",
      status: "New",
      createdAt: new Date().toISOString(),
      requester: { id: 1, name: "Somchai Jaidee" },
      category: { id: 1, name: "Account and Access" },
      relatedSystem: { id: 1, name: "CRM" },
    };
    vi.spyOn(api, "createTicket").mockResolvedValue(createdTicket);
    const uploadSpy = vi.spyOn(api, "uploadAttachments").mockResolvedValue([]);
    renderForm();
    await waitFor(() => expect(screen.queryByText(/Loading form data/)).not.toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText(/Category/), "1");
    await user.selectOptions(screen.getByLabelText(/Related System/), "1");
    await user.type(screen.getByLabelText(/Summary/), "Create with attachment");
    await user.type(screen.getByLabelText(/Description/), "description");
    const file = new File(["pdf"], "evidence.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText(/Attachments/i), file);
    await user.click(screen.getByRole("button", { name: /Create Ticket/i }));

    expect(uploadSpy).toHaveBeenCalledWith(42, [file], TEST_REQUESTER.id);
    expect(await screen.findByText(/Ticket created successfully/i)).toBeInTheDocument();
  });
});
