import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelectRequester from "../../src/SelectRequester.js";
import * as api from "../../src/api.js";
import { RequesterProvider, useRequester } from "../../src/RequesterContext.js";

const REQUESTERS: api.Requester[] = [
  { id: 1, name: "Somchai Jaidee", email: "somchai@toktick.it", isActive: true },
  { id: 2, name: "Somsri Rakdee", email: "somsri@toktick.it", isActive: true },
  { id: 3, name: "Anan Kongthong", email: "anan@toktick.it", isActive: true },
  { id: 4, name: "Preecha Sombat", email: "preecha@toktick.it", isActive: true },
];

function Capturer() {
  const { requester } = useRequester();
  return requester ? <div data-testid="selected">{requester.name}</div> : null;
}

function renderWithProvider() {
  return render(
    <RequesterProvider>
      <SelectRequester />
      <Capturer />
    </RequesterProvider>
  );
}

describe("SelectRequester (UI-1)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the home screen with the active requesters from API", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue(REQUESTERS);
    renderWithProvider();

    const requesterSelect = await screen.findByLabelText(/Development Requester/i);
    expect(requesterSelect).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Somchai Jaidee/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Somsri Rakdee/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Anan Kongthong/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Preecha Sombat/i })).toBeInTheDocument();
    expect(screen.getByText(/testing only and is not a login screen/i)).toBeInTheDocument();
    expect(screen.getByText(/Only active development requesters are shown/i)).toBeInTheDocument();
    expect(screen.queryByText(/Authentication coming in Lab 3/i)).not.toBeInTheDocument();
  });

  it("keeps Continue disabled until a requester is chosen, then stores selection", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getRequesters").mockResolvedValue(REQUESTERS);
    renderWithProvider();

    const button = await screen.findByRole("button", { name: /Continue/i });
    expect(button).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/Development Requester/i), "1");
    expect(button).toBeEnabled();

    await user.click(button);
    expect(screen.getByTestId("selected")).toHaveTextContent("Somchai Jaidee");
  });

  it("keeps Check System available before a requester is selected", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getRequesters").mockResolvedValue(REQUESTERS);
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [{ id: 1, name: "Hardware" }],
    });
    renderWithProvider();

    const checkButton = await screen.findByRole("button", { name: /Check System/i });
    await user.click(checkButton);

    expect(await screen.findByText("System Status: Online")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
  });

  it("starts with no selected requester even if stale localStorage data exists", async () => {
    localStorage.setItem("toktickit.dev-requester", JSON.stringify(REQUESTERS[0]));
    vi.spyOn(api, "getRequesters").mockResolvedValue(REQUESTERS);

    renderWithProvider();

    expect(await screen.findByRole("button", { name: /Continue/i })).toBeDisabled();
    expect(screen.queryByTestId("selected")).not.toBeInTheDocument();
  });

  it("shows an error alert when the requesters API fails", async () => {
    vi.spyOn(api, "getRequesters").mockRejectedValue(new Error("network error"));
    renderWithProvider();

    expect(await screen.findByText(/Unable to load requesters/i)).toBeInTheDocument();
  });
});
