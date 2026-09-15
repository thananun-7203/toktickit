import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import { AuthProvider } from "../../src/AuthContext.js";
import * as api from "../../src/api.js";

const MUST_CHANGE_USER: api.AuthUser = {
  id: 201,
  name: "Initial Password User",
  email: "initial.user@toktick.it",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: true,
};

function renderApp() {
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  );
}

describe("Lab 3 Change Password UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(MUST_CHANGE_USER);
    vi.spyOn(api, "getCategories").mockResolvedValue([]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([]);
    vi.spyOn(api, "getTickets").mockResolvedValue({
      items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0,
    });
  });

  it("shows mandatory mode with exact password rules, Continue, Logout, and no normal navigation", async () => {
    renderApp();
    expect(await screen.findByRole("heading", { name: /Change Your Password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Current password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirm new password$/i)).toBeInTheDocument();
    expect(screen.getByText(/At least 10 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/Include at least one letter/i)).toBeInTheDocument();
    expect(screen.getByText(/Include at least one number/i)).toBeInTheDocument();
    expect(screen.getByText(/Maximum 72 UTF-8 bytes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Continue$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Logout$/i })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /Primary navigation/i })).not.toBeInTheDocument();
  });

  it("validates required fields, confirmation mismatch, and new=current before API submission", async () => {
    const user = userEvent.setup();
    const changeSpy = vi.spyOn(api, "changePassword");
    renderApp();
    await screen.findByRole("heading", { name: /Change Your Password/i });

    await user.click(screen.getByRole("button", { name: /^Continue$/i }));
    expect(screen.getByText(/Current password is required/i)).toBeInTheDocument();
    expect(screen.getByText(/New password is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirm your new password/i)).toBeInTheDocument();
    expect(changeSpy).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/^Current password$/i), "SamePassword1");
    await user.type(screen.getByLabelText(/^New password$/i), "SamePassword1");
    await user.type(screen.getByLabelText(/^Confirm new password$/i), "DifferentPassword2");
    await user.click(screen.getByRole("button", { name: /^Continue$/i }));
    expect(screen.getByText(/New password must differ from current password/i)).toBeInTheDocument();
    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    expect(changeSpy).not.toHaveBeenCalled();
  });

  it("enforces the UTF-8 byte boundary in the client helper feedback", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole("heading", { name: /Change Your Password/i });
    await user.type(screen.getByLabelText(/^Current password$/i), "CurrentPass1");
    const tooManyBytes = "ก".repeat(25) + "A1"; // 77 UTF-8 bytes.
    await user.type(screen.getByLabelText(/^New password$/i), tooManyBytes);
    await user.type(screen.getByLabelText(/^Confirm new password$/i), tooManyBytes);
    await user.click(screen.getByRole("button", { name: /^Continue$/i }));
    expect(screen.getByText(/at most 72 UTF-8 bytes/i)).toBeInTheDocument();
  });

  it("accepts the same Unicode decimal-digit semantics as the server", async () => {
    const user = userEvent.setup();
    const changeSpy = vi.spyOn(api, "changePassword").mockResolvedValue({
      user: { ...MUST_CHANGE_USER, mustChangePassword: false },
    });
    renderApp();
    await screen.findByRole("heading", { name: /Change Your Password/i });

    await user.type(screen.getByLabelText(/^Current password$/i), "InitialPass1");
    await user.type(screen.getByLabelText(/^New password$/i), "Replacement๑x");
    await user.type(screen.getByLabelText(/^Confirm new password$/i), "Replacement๑x");
    await user.click(screen.getByRole("button", { name: /^Continue$/i }));

    await waitFor(() => expect(changeSpy).toHaveBeenCalledTimes(1));
  });

  it("maps incorrect current password to the Current password field", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "changePassword").mockRejectedValue(
      new api.ApiError("Current password is incorrect", 401, "INVALID_CURRENT_PASSWORD"),
    );
    renderApp();
    await screen.findByRole("heading", { name: /Change Your Password/i });

    await user.type(screen.getByLabelText(/^Current password$/i), "WrongCurrent1");
    await user.type(screen.getByLabelText(/^New password$/i), "Replacement2");
    await user.type(screen.getByLabelText(/^Confirm new password$/i), "Replacement2");
    await user.click(screen.getByRole("button", { name: /^Continue$/i }));
    expect(await screen.findByText(/Current password is incorrect/i)).toBeInTheDocument();
  });

  it("continues into the Requester app after a successful mandatory password change", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "changePassword").mockResolvedValue({
      user: { ...MUST_CHANGE_USER, mustChangePassword: false },
    });
    renderApp();
    await screen.findByRole("heading", { name: /Change Your Password/i });

    await user.type(screen.getByLabelText(/^Current password$/i), "InitialPass1");
    await user.type(screen.getByLabelText(/^New password$/i), "Replacement2");
    await user.type(screen.getByLabelText(/^Confirm new password$/i), "Replacement2");
    await user.click(screen.getByRole("button", { name: /^Continue$/i }));

    expect(await screen.findByRole("heading", { name: /My Tickets/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/must change your initial password/i)).not.toBeInTheDocument());
  });
});
