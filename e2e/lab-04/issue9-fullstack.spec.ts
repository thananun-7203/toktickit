import { expect, test, type Page } from "@playwright/test";
import {
  API_URL,
  createDedicatedE2eUsers,
  logoutFromUserMenu,
  signIn,
  signInAndCompleteMandatoryChange,
  type E2eUsers,
} from "../lab-03/fullstack-fixtures.js";

let users: E2eUsers;

test.beforeEach(async ({}, testInfo) => {
  users = createDedicatedE2eUsers(`issue9-${Date.now()}-${testInfo.retry}-${testInfo.workerIndex}`);
});

async function createTicketAsRequester(page: Page, summary: string) {
  const requesterPassword = `Issue9Requester${Date.now()}A9`;
  await signInAndCompleteMandatoryChange(page, users.requesterOneEmail, users.initialPassword, requesterPassword, "Dashboard");
  await page.getByRole("button", { name: "Create Ticket" }).first().click();
  await page.getByLabel(/Category/).selectOption({ label: "Software" });
  await page.getByLabel(/Related System/).selectOption({ label: "CRM" });
  await page.getByLabel(/Requested Priority/).selectOption("High");
  await page.getByLabel(/Summary/).fill(summary);
  await page.getByLabel(/Description/).fill("Issue 9 full-stack regression Ticket.");
  await page.locator("form").getByRole("button", { name: /Create Ticket/ }).click();
  await expect(page.getByText("Ticket created successfully")).toBeVisible();

  const ticket = await page.evaluate(async ({ apiUrl, summary }) => {
    const response = await fetch(`${apiUrl}/api/v1/tickets?search=${encodeURIComponent(summary)}`, { credentials: "include" });
    if (!response.ok) throw new Error(`Unable to resolve Issue 9 Ticket: ${response.status}`);
    const body = await response.json() as { items: Array<{ id: number; ticketNumber: string }> };
    if (!body.items[0]) throw new Error("Issue 9 Ticket was not returned from My Tickets");
    return body.items[0];
  }, { apiUrl: API_URL, summary });

  await logoutFromUserMenu(page, "E2E Requester One");
  return { ticket, requesterPassword };
}

test("E2E-ISSUE9-AT-WF: Actions Taken, follow-up gate, Resolve, Reopen, and cycle isolation", async ({ page }) => {
  const summary = `Issue 9 Actions Workflow ${Date.now()}`;
  const { ticket } = await createTicketAsRequester(page, summary);
  await signInAndCompleteMandatoryChange(page, users.staffOneEmail, users.initialPassword, `Issue9Staff${Date.now()}B8`, "Dashboard");

  await page.getByRole("button", { name: "Ticket Queue" }).click();
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  await page.getByLabel("Search").fill(summary);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: `Open ${ticket.ticketNumber}` }).click();
  await expect(page.getByRole("heading", { name: ticket.ticketNumber })).toBeVisible();

  await page.getByRole("button", { name: "Claim" }).click();
  await expect(page.getByText("Ticket ownership updated.")).toBeVisible();
  await page.getByLabel("Status").selectOption("Open");
  await page.getByRole("button", { name: "Change" }).click();
  await expect(page.getByText("Status changed to Open.")).toBeVisible();
  await page.getByLabel("Status").selectOption("In Progress");
  await page.getByRole("button", { name: "Change" }).click();
  await expect(page.getByText("Status changed to In Progress.")).toBeVisible();

  await page.getByRole("button", { name: /Add Action/ }).first().click();
  const createDialog = page.getByRole("dialog", { name: "Add Action" });
  await createDialog.getByLabel(/Description/).fill("Investigate and verify the reported software issue");
  const currentStaffId = await page.evaluate(async (apiUrl) => {
    const response = await fetch(`${apiUrl}/api/v1/auth/me`, { credentials: "include" });
    const body = await response.json() as { id?: number };
    if (!response.ok || !body.id) throw new Error("Unable to resolve current Staff user");
    return body.id;
  }, API_URL);
  await createDialog.getByLabel("Assignee").selectOption(String(currentStaffId));
  await createDialog.getByRole("radio").first().check();
  await createDialog.getByLabel(/Follow-up Note/).fill("Confirm the fix with the requester");
  await createDialog.getByRole("button", { name: "Create Action" }).click();
  await expect(page.getByText("Action created successfully.")).toBeVisible();
  await expect(page.getByText("Blocked", { exact: true })).toBeVisible();

  const actionCard = page.locator(".action-card").filter({ hasText: "Investigate and verify the reported software issue" });
  const startButton = actionCard.getByRole("button", { name: "Start" });
  await startButton.click();
  await expect(page.getByText("Action moved to In Progress.")).toBeVisible();
  await expect(actionCard.getByText("In Progress", { exact: true })).toBeVisible();
  await actionCard.getByRole("button", { name: "Complete" }).click();
  const completeDialog = page.getByRole("dialog", { name: "Complete Action" });
  await completeDialog.getByLabel(/Result/).fill("Verified the fix and confirmed the system is operational");
  await completeDialog.getByRole("button", { name: "Complete Action" }).click();
  await expect(page.getByText("Action completed successfully.")).toBeVisible();
  await expect(actionCard).toContainText("Outstanding");
  await expect(page.getByText("Blocked", { exact: true })).toBeVisible();

  await actionCard.getByRole("button", { name: "Mark Follow-up Complete" }).click();
  await expect(page.getByText("Follow-up marked as completed.")).toBeVisible();
  await expect(actionCard).toContainText("Completed");
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();

  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByLabel("Status").selectOption("Resolved");
  await page.getByRole("button", { name: "Change" }).click();
  await expect(page.getByText("Status changed to Resolved.")).toBeVisible();

  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByLabel("Status").selectOption("Reopened");
  await page.getByRole("button", { name: "Change" }).click();
  await expect(page.getByText("Status changed to Reopened.")).toBeVisible();
  await expect(page.getByText("Blocked", { exact: true })).toBeVisible();
  await expect(page.getByText("Current-cycle Completed Action with non-blank Result")).toBeVisible();

  await page.getByRole("button", { name: /Add Action/ }).first().click();
  const cycleTwoDialog = page.getByRole("dialog", { name: "Add Action" });
  await cycleTwoDialog.getByLabel(/Description/).fill("Cycle 2 verification work");
  const cycleTwoStaffId = await page.evaluate(async (apiUrl) => {
    const response = await fetch(`${apiUrl}/api/v1/auth/me`, { credentials: "include" });
    const body = await response.json() as { id?: number };
    if (!response.ok || !body.id) throw new Error("Unable to resolve current Staff user for Cycle 2");
    return body.id;
  }, API_URL);
  await cycleTwoDialog.getByLabel("Assignee").selectOption(String(cycleTwoStaffId));
  await cycleTwoDialog.getByRole("button", { name: "Create Action" }).click();
  await expect(page.getByText("Action created successfully.")).toBeVisible();

  const cycleTwoCard = page.locator(".action-card").filter({ hasText: "Cycle 2 verification work" });
  await cycleTwoCard.getByRole("button", { name: "Complete" }).click();
  const cycleTwoComplete = page.getByRole("dialog", { name: "Complete Action" });
  await cycleTwoComplete.getByLabel(/Result/).fill("Cycle 2 verification completed");
  await cycleTwoComplete.getByRole("button", { name: "Complete Action" }).click();
  await expect(page.getByText("Action completed successfully.")).toBeVisible();
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();

  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByLabel("Status").selectOption("Resolved");
  await page.getByRole("button", { name: "Change" }).click();
  await expect(page.getByText("Status changed to Resolved.")).toBeVisible();

  const finalState = await page.evaluate(async ({ apiUrl, id }) => {
    const response = await fetch(`${apiUrl}/api/v1/staff/tickets/${id}`, { credentials: "include" });
    if (!response.ok) throw new Error(`Unable to verify final Ticket: ${response.status}`);
    const body = await response.json() as { status: string; workflowCycle: number };
    return body;
  }, { apiUrl: API_URL, id: ticket.id });
  expect(finalState.status).toBe("Resolved");
  expect(finalState.workflowCycle).toBe(2);
});

test("E2E-ISSUE9-DASH: Requester and Staff dashboards use the integrated full-stack data", async ({ page }) => {
  const summary = `Issue 9 Dashboard ${Date.now()}`;
  const { ticket, requesterPassword } = await createTicketAsRequester(page, summary);

  await signIn(page, users.requesterOneEmail, requesterPassword);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByText("Open Tickets")).toBeVisible();
  await expect(page.getByText("Waiting for You")).toBeVisible();
  await page.getByRole("button", { name: "My Tickets" }).last().click();
  await expect(page.getByText(summary).first()).toBeVisible();
  await logoutFromUserMenu(page, "E2E Requester One");

  await signInAndCompleteMandatoryChange(page, users.staffOneEmail, users.initialPassword, `Issue9StaffAgain${Date.now()}D6`, "Dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByText("Unassigned Active Tickets")).toBeVisible();
  await expect(page.getByText("My Active Tickets")).toBeVisible();
  await expect(page.getByText("Recently Updated")).toBeVisible();

  const dashboardStatus = await page.evaluate(async (apiUrl) => {
    const response = await fetch(`${apiUrl}/api/v1/staff/dashboard`, { credentials: "include" });
    const body = await response.json() as { metrics?: { myActiveTickets?: number } };
    return { status: response.status, myActiveTickets: body.metrics?.myActiveTickets };
  }, API_URL);
  expect(dashboardStatus.status).toBe(200);
  expect(dashboardStatus.myActiveTickets).toBeGreaterThanOrEqual(0);

  await page.getByRole("button", { name: "Ticket Queue" }).click();
  await page.getByLabel("Search").fill(summary);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("button", { name: `Open ${ticket.ticketNumber}` })).toBeVisible();
});
