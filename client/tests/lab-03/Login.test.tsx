import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import { AuthProvider } from "../../src/AuthContext.js";
import * as api from "../../src/api.js";

const BASE_USER: api.AuthUser = {
  id: 101,
  name: "Requester Login Test",
  email: "requester.login@toktick.it",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: false,
};

function renderApp() {
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  );
}

describe("Lab 3 Login UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getCurrentUser").mockRejectedValue(
      new api.ApiError("Authentication required", 401, "UNAUTHENTICATED"),
    );
    vi.spyOn(api, "getCategories").mockResolvedValue([]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([]);
    vi.spyOn(api, "getTickets").mockResolvedValue({
      items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0,
    });
  });

  it("renders the approved simple TokTickIT Login mockup without Forgot Password or app navigation", async () => {
    renderApp();
    expect(await screen.findByRole("heading", { name: /Sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: /^Sign In$/i })).toBeInTheDocument();
    expect(screen.getByLabelText("TokTickIT")).toBeInTheDocument();
    expect(screen.queryByText(/Forgot your password/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /Primary navigation/i })).not.toBeInTheDocument();
  });

  it("validates required/email fields before calling the Login API", async () => {
    const user = userEvent.setup();
    const loginSpy = vi.spyOn(api, "login");
    renderApp();
    await screen.findByRole("heading", { name: /Sign in to your account/i });

    await user.click(screen.getByRole("button", { name: /^Sign In$/i }));
    expect(screen.getByText(/Email address is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
    expect(loginSpy).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/Email address/i), "not-an-email");
    await user.type(screen.getByLabelText(/^Password$/i), "SomePassword1");
    await user.click(screen.getByRole("button", { name: /^Sign In$/i }));
    expect(screen.getByText(/Enter a valid email address/i)).toBeInTheDocument();
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it("uses generic invalid-credential feedback and clears the password field", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "login").mockRejectedValue(
      new api.ApiError("Invalid email or password", 401, "INVALID_CREDENTIALS"),
    );
    renderApp();
    await screen.findByRole("heading", { name: /Sign in to your account/i });

    await user.type(screen.getByLabelText(/Email address/i), "unknown@toktick.it");
    await user.type(screen.getByLabelText(/^Password$/i), "WrongPassword1");
    await user.click(screen.getByRole("button", { name: /^Sign In$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect.");
    expect(screen.getByLabelText(/^Password$/i)).toHaveValue("");
  });

  it("shows safe inactive-account and rate-limit feedback", async () => {
    const user = userEvent.setup();
    const loginSpy = vi.spyOn(api, "login")
      .mockRejectedValueOnce(new api.ApiError("This account cannot sign in", 403, "ACCOUNT_INACTIVE"))
      .mockRejectedValueOnce(new api.ApiError("Too many login attempts", 429, "LOGIN_RATE_LIMITED"));
    renderApp();
    await screen.findByRole("heading", { name: /Sign in to your account/i });

    const email = screen.getByLabelText(/Email address/i);
    const password = screen.getByLabelText(/^Password$/i);
    await user.type(email, "inactive@toktick.it");
    await user.type(password, "InitialPass1");
    await user.click(screen.getByRole("button", { name: /^Sign In$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot sign in.*administrator/i);

    await user.clear(email);
    await user.type(email, "limited@toktick.it");
    await user.type(password, "InitialPass1");
    await user.click(screen.getByRole("button", { name: /^Sign In$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Too many sign-in attempts/i);
    expect(loginSpy).toHaveBeenCalledTimes(2);
  });

  it("disables duplicate submission while Login is busy", async () => {
    const user = userEvent.setup();
    let resolveLogin!: (result: { user: api.AuthUser; nextAction: "APPLICATION" }) => void;
    vi.spyOn(api, "login").mockImplementation(() => new Promise((resolve) => { resolveLogin = resolve; }));
    renderApp();
    await screen.findByRole("heading", { name: /Sign in to your account/i });

    await user.type(screen.getByLabelText(/Email address/i), BASE_USER.email);
    await user.type(screen.getByLabelText(/^Password$/i), "ValidPassword1");
    await user.click(screen.getByRole("button", { name: /^Sign In$/i }));
    expect(screen.getByRole("button", { name: /Signing in/i })).toBeDisabled();

    resolveLogin({ user: BASE_USER, nextAction: "APPLICATION" });
    expect(await screen.findByRole("heading", { name: /My Tickets/i })).toBeInTheDocument();
  });

  it("routes an initial-password Login directly to mandatory Change Your Password", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "login").mockResolvedValue({
      user: { ...BASE_USER, mustChangePassword: true },
      nextAction: "CHANGE_PASSWORD",
    });
    renderApp();
    await screen.findByRole("heading", { name: /Sign in to your account/i });

    await user.type(screen.getByLabelText(/Email address/i), BASE_USER.email);
    await user.type(screen.getByLabelText(/^Password$/i), "InitialPass1");
    await user.click(screen.getByRole("button", { name: /^Sign In$/i }));

    expect(await screen.findByRole("heading", { name: /Change Your Password/i })).toBeInTheDocument();
    expect(screen.getByText(/must change your initial password/i)).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /Primary navigation/i })).not.toBeInTheDocument();
  });
});
