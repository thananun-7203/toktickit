import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import { AuthProvider } from "../../src/AuthContext.js";
import * as api from "../../src/api.js";

function renderApp() {
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  );
}

const REQUESTER: api.AuthUser = {
  id: 301,
  name: "Authenticated Requester",
  email: "authenticated.requester@toktick.it",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: false,
};

describe("Lab 3 authenticated application shell", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getCategories").mockResolvedValue([]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([]);
    vi.spyOn(api, "getTickets").mockResolvedValue({
      items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0,
    });
  });

  it("shows current Requester name/role and only Requester navigation", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(REQUESTER);
    renderApp();
    const nav = await screen.findByRole("navigation", { name: /Primary navigation/i });
    expect(within(nav).getByRole("button", { name: /My Tickets/i })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: /Create Ticket/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/User menu for Authenticated Requester/i)).toBeInTheDocument();
    expect(screen.getAllByText("REQUESTER").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Development Requester/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Switch requester/i)).not.toBeInTheDocument();
  });

  it("opens normal profile Change Password with Save Password and Cancel", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(REQUESTER);
    renderApp();
    const menu = await screen.findByLabelText(/User menu for Authenticated Requester/i);
    await user.click(menu);
    await user.click(screen.getByRole("button", { name: /Change Password/i }));

    expect(await screen.findByRole("heading", { name: /Change Your Password/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save Password/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Continue$/i })).not.toBeInTheDocument();
  });

  it("Logout invalidates client access and returns to Login", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(REQUESTER);
    const logoutSpy = vi.spyOn(api, "logout").mockResolvedValue();
    renderApp();
    const menu = await screen.findByLabelText(/User menu for Authenticated Requester/i);
    await user.click(menu);
    await user.click(screen.getByRole("button", { name: /^Logout$/i }));

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("heading", { name: /Sign in to your account/i })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /Primary navigation/i })).not.toBeInTheDocument();
  });

  it("does not expose Requester navigation to IT Staff or Administrator", async () => {
    for (const role of ["IT_STAFF", "ADMINISTRATOR"] as const) {
      vi.restoreAllMocks();
      vi.spyOn(api, "getCurrentUser").mockResolvedValue({ ...REQUESTER, id: role === "IT_STAFF" ? 302 : 303, role });
      const rendered = renderApp();
      expect(await screen.findByRole("heading", { name: role === "IT_STAFF" ? /Ticket Queue/i : /User Management/i })).toBeInTheDocument();
      expect(screen.queryByRole("navigation", { name: /Primary navigation/i })).not.toBeInTheDocument();
      rendered.unmount();
    }
  });
});
