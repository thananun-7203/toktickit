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

    expect(await screen.findByText("Somchai Jaidee")).toBeInTheDocument();
    expect(screen.getByText("Somsri Rakdee")).toBeInTheDocument();
    expect(screen.getByText("Anan Kongthong")).toBeInTheDocument();
    expect(screen.getByText("Preecha Sombat")).toBeInTheDocument();
  });

  it("keeps Continue disabled until a requester is chosen, then stores selection", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getRequesters").mockResolvedValue(REQUESTERS);
    renderWithProvider();

    const button = await screen.findByRole("button", { name: /Continue/i });
    expect(button).toBeDisabled();

    await user.click(screen.getByLabelText(/Somchai Jaidee/i));
    expect(button).toBeEnabled();

    await user.click(button);
    expect(screen.getByTestId("selected")).toHaveTextContent("Somchai Jaidee");
  });

  it("shows an error alert when the requesters API fails", async () => {
    vi.spyOn(api, "getRequesters").mockRejectedValue(new Error("network error"));
    renderWithProvider();

    expect(await screen.findByText(/Unable to load requesters/i)).toBeInTheDocument();
  });
});
