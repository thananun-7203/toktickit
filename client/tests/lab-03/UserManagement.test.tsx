import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserManagement from "../../src/UserManagement.js";
import * as api from "../../src/api.js";

const ADMIN: api.AdminUser = {
  id: 50,
  name: "Admin One",
  email: "admin.one@toktick.it",
  role: "ADMINISTRATOR",
  isActive: true,
  mustChangePassword: false,
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-17T08:00:00.000Z",
};

const STAFF: api.AdminUser = {
  id: 51,
  name: "Narin Support",
  email: "narin.staff@toktick.it",
  role: "IT_STAFF",
  isActive: true,
  mustChangePassword: false,
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-17T08:00:00.000Z",
};

const REQUESTER: api.AdminUser = {
  id: 52,
  name: "Somchai Jaidee",
  email: "somchai@toktick.it",
  role: "REQUESTER",
  isActive: false,
  mustChangePassword: true,
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-17T08:00:00.000Z",
};

function renderUsers() {
  return render(<UserManagement currentUserId={ADMIN.id} />);
}

describe("Lab 3 Administrator User Management", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getAdminUsers").mockResolvedValue([ADMIN, STAFF, REQUESTER]);
    vi.spyOn(api, "createAdminUser").mockResolvedValue({ ...REQUESTER, id: 53, isActive: true });
    vi.spyOn(api, "updateAdminUser").mockImplementation(async (id, input) => ({
      ...(id === STAFF.id ? STAFF : ADMIN),
      ...input,
    } as api.AdminUser));
    vi.spyOn(api, "setAdminInitialPassword").mockResolvedValue({ id: STAFF.id, mustChangePassword: true });
  });

  it("UI-ADM-01: lists Name, Email, Role, Status, and Edit actions", async () => {
    renderUsers();
    expect(await screen.findByRole("heading", { name: "User Management" })).toBeInTheDocument();
    expect(screen.getAllByText(STAFF.name).length).toBeGreaterThan(0);
    expect(screen.getAllByText(STAFF.email).length).toBeGreaterThan(0);
    expect(screen.getAllByText("IT Staff").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: `Edit ${STAFF.name}` })).toBeInTheDocument();
    expect(screen.queryByText(/passwordHash/i)).not.toBeInTheDocument();
  });

  it("UI-ADM-02: search and role filter request the documented list parameters", async () => {
    const getUsers = vi.mocked(api.getAdminUsers);
    const user = userEvent.setup();
    renderUsers();
    await screen.findByRole("button", { name: `Edit ${STAFF.name}` });

    await user.type(screen.getByLabelText("Search"), "narin");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(getUsers).toHaveBeenCalledWith({ search: "narin", role: undefined }));

    await user.selectOptions(screen.getByLabelText("Role filter"), "IT_STAFF");
    await waitFor(() => expect(getUsers).toHaveBeenCalledWith({ search: "narin", role: "IT_STAFF" }));
  });

  it("UI-ADM-03: Create User has one role control, activation state, and initial password", async () => {
    const user = userEvent.setup();
    renderUsers();
    await screen.findByRole("button", { name: `Edit ${STAFF.name}` });
    await user.click(screen.getByRole("button", { name: /Create User/i }));
    const dialog = screen.getByRole("dialog", { name: "Create User" });
    expect(within(dialog).getByLabelText(/Name/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Email/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Role/i)).toHaveValue("REQUESTER");
    expect(within(dialog).getByLabelText(/Status/i)).toHaveValue("active");
    expect(within(dialog).getByLabelText(/Initial Password/i)).toBeInTheDocument();
  });

  it("UI-ADM-04: create validates input and shows duplicate-email feedback", async () => {
    const user = userEvent.setup();
    const create = vi.mocked(api.createAdminUser);
    renderUsers();
    await screen.findByRole("button", { name: `Edit ${STAFF.name}` });
    await user.click(screen.getByRole("button", { name: /Create User/i }));
    const dialog = screen.getByRole("dialog", { name: "Create User" });
    await user.click(within(dialog).getByRole("button", { name: "Create User" }));
    expect(await within(dialog).findByText(/Name must be between/i)).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(/Name/i), "Duplicate User");
    await user.type(within(dialog).getByLabelText(/Email/i), "admin.one@toktick.it");
    await user.type(within(dialog).getByLabelText(/Initial Password/i), "Initial1234");
    create.mockRejectedValueOnce(new api.ApiError("exists", 409, "DUPLICATE_EMAIL"));
    await user.click(within(dialog).getByRole("button", { name: "Create User" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/already exists/i);
  });

  it("UI-ADM-05: Edit User saves name, email, role, and activation state", async () => {
    const user = userEvent.setup();
    renderUsers();
    await screen.findByRole("button", { name: `Edit ${STAFF.name}` });
    await user.click(screen.getByRole("button", { name: `Edit ${STAFF.name}` }));
    const dialog = screen.getByRole("dialog", { name: "Edit User" });
    const name = within(dialog).getByLabelText(/Name/i);
    await user.clear(name);
    await user.type(name, "Narin Updated");
    await user.selectOptions(within(dialog).getByLabelText(/Role/i), "ADMINISTRATOR");
    await user.click(within(dialog).getByRole("button", { name: /Save Changes/i }));
    await waitFor(() => expect(api.updateAdminUser).toHaveBeenCalledWith(STAFF.id, expect.objectContaining({ name: "Narin Updated", role: "ADMINISTRATOR", isActive: true })));
  });

  it("UI-ADM-06: Set Initial Password validates confirmation and submits a separate password flow", async () => {
    const user = userEvent.setup();
    renderUsers();
    await screen.findByRole("button", { name: `Edit ${STAFF.name}` });
    await user.click(screen.getByRole("button", { name: `Edit ${STAFF.name}` }));
    await user.click(screen.getByRole("button", { name: /Set New Initial Password/i }));
    const dialog = screen.getByRole("dialog", { name: "Set Initial Password" });
    await user.type(within(dialog).getByLabelText(/New Initial Password/i), "NewInitial123");
    await user.type(within(dialog).getByLabelText(/Confirm Password/i), "Different123");
    await user.click(within(dialog).getByRole("button", { name: "Set Password" }));
    expect(await within(dialog).findByText(/Passwords do not match/i)).toBeInTheDocument();
    expect(api.setAdminInitialPassword).not.toHaveBeenCalled();
    await user.clear(within(dialog).getByLabelText(/Confirm Password/i));
    await user.type(within(dialog).getByLabelText(/Confirm Password/i), "NewInitial123");
    await user.click(within(dialog).getByRole("button", { name: "Set Password" }));
    await waitFor(() => expect(api.setAdminInitialPassword).toHaveBeenCalledWith(STAFF.id, "NewInitial123", "NewInitial123"));
    expect(await screen.findByRole("status")).toHaveTextContent(/password change will be required/i);
  });

  it("UI-ADM-07: self-deactivation is blocked with clear feedback before mutation", async () => {
    const user = userEvent.setup();
    renderUsers();
    await screen.findByRole("button", { name: `Edit ${ADMIN.name}` });
    await user.click(screen.getByRole("button", { name: `Edit ${ADMIN.name}` }));
    const dialog = screen.getByRole("dialog", { name: "Edit User" });
    await user.selectOptions(within(dialog).getByLabelText(/Status/i), "inactive");
    await user.click(within(dialog).getByRole("button", { name: /Save Changes/i }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/cannot deactivate your own/i);
    expect(api.updateAdminUser).not.toHaveBeenCalled();
  });

  it("UI-ADM-08: last-active-Administrator conflict remains visible and does not falsely close Edit", async () => {
    const user = userEvent.setup();
    vi.mocked(api.updateAdminUser).mockRejectedValueOnce(new api.ApiError("blocked", 409, "LAST_ACTIVE_ADMIN_REQUIRED"));
    renderUsers();
    await screen.findByRole("button", { name: `Edit ${ADMIN.name}` });
    await user.click(screen.getByRole("button", { name: `Edit ${ADMIN.name}` }));
    const dialog = screen.getByRole("dialog", { name: "Edit User" });
    await user.selectOptions(within(dialog).getByLabelText(/Role/i), "IT_STAFF");
    await user.click(within(dialog).getByRole("button", { name: /Save Changes/i }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/At least one active Administrator/i);
    expect(screen.getByRole("dialog", { name: "Edit User" })).toBeInTheDocument();
  });

  it("UI-ADM-09: loading, no-results, and safe API failure states are meaningful", async () => {
    let resolveUsers!: (value: api.AdminUser[]) => void;
    vi.mocked(api.getAdminUsers).mockReturnValueOnce(new Promise((resolve) => { resolveUsers = resolve; }));
    const { unmount } = renderUsers();
    expect(screen.getByRole("status")).toHaveTextContent(/Loading users/i);
    resolveUsers([]);
    expect(await screen.findByRole("heading", { name: "No users" })).toBeInTheDocument();
    unmount();

    vi.mocked(api.getAdminUsers).mockRejectedValueOnce(new api.ApiError("failed", 500, "USER_LIST_FAILED"));
    renderUsers();
    expect(await screen.findByRole("alert")).toHaveTextContent(/Unable to load users/i);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("UI-ADM-10: assigned-owner conflict explains that Tickets must be reassigned first", async () => {
    const user = userEvent.setup();
    vi.mocked(api.updateAdminUser).mockRejectedValueOnce(new api.ApiError("blocked", 409, "ASSIGNED_TICKETS_REQUIRE_REASSIGNMENT"));
    renderUsers();
    await screen.findByRole("button", { name: `Edit ${STAFF.name}` });
    await user.click(screen.getByRole("button", { name: `Edit ${STAFF.name}` }));
    const editDialog = screen.getByRole("dialog", { name: "Edit User" });
    await user.selectOptions(within(editDialog).getByLabelText(/Status/i), "inactive");
    await user.click(within(editDialog).getByRole("button", { name: /Save Changes/i }));
    const confirm = screen.getByRole("dialog", { name: "Deactivate User" });
    await user.click(within(confirm).getByRole("button", { name: "Deactivate User" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Reassign this user's tickets/i);
    expect(screen.getByRole("dialog", { name: "Edit User" })).toBeInTheDocument();
  });
});
