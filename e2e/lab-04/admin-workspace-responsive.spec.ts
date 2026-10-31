import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = path.resolve("../artifacts/lab-04/issue-58");

const adminUser = {
  id: 401,
  name: "Issue 58 Administrator",
  email: "issue58.admin@toktick.it",
  isActive: true,
  role: "ADMINISTRATOR",
  mustChangePassword: false,
};

const dashboard = {
  metrics: {
    unassignedActiveTickets: 2,
    myActiveTickets: 1,
    byStatus: {
      New: 1, Open: 2, "In Progress": 1, "Waiting for Requester": 1,
      Resolved: 1, Closed: 1, Reopened: 0, Cancelled: 0,
    },
    activeByItPriority: { High: 1, Medium: 2, Low: 1, "Not recorded": 0 },
  },
  myActiveActions: [],
  recentlyUpdatedTickets: [],
  urgentTickets: [],
};

async function mockAdminApis(page: Page) {
  await page.route("**/api/v1/auth/me", (route) => route.fulfill({ json: adminUser }));
  await page.route("**/api/v1/staff/dashboard", (route) => route.fulfill({ json: dashboard }));
  await page.route("**/api/v1/staff/tickets**", (route) => route.fulfill({
    json: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
  }));
  await page.route("**/api/v1/staff/assignees", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/v1/admin/users/summary", (route) => route.fulfill({
    json: { totalUsers: 24, byRole: { ADMINISTRATOR: 2, IT_STAFF: 4, REQUESTER: 18 } },
  }));
  await page.route("**/api/v1/admin/users", (route) => route.fulfill({ json: { items: [] } }));
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(async () => page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  )).toBe(true);
}

async function capture(page: Page, name: string) {
  if (!CAPTURE_EVIDENCE) return;
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, name), fullPage: true });
}

test("Issue 58 Administrator workspace navigation and dashboard remain usable at 1280/820/390", async ({ page }) => {
  await mockAdminApis(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  let nav = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(nav.getByRole("button", { name: "Dashboard" })).toBeVisible();
  await expect(nav.getByRole("button", { name: "Ticket Queue" })).toBeVisible();
  await expect(nav.getByRole("button", { name: "User Management" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "My Active Actions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Urgent Tickets" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recently Updated" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await capture(page, "administrator-dashboard-1280.png");

  await page.setViewportSize({ width: 820, height: 1000 });
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await capture(page, "administrator-dashboard-820.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByRole("menuitem", { name: "Ticket Queue" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "User Management" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Ticket Queue" }).click();
  await expect(page.getByRole("heading", { name: /Ticket Queue/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await capture(page, "administrator-ticket-queue-390.png");

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("menuitem", { name: "User Management" }).click();
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await expect(page.getByText("Total Users")).toBeVisible();
  await expect(page.getByText("24", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await capture(page, "administrator-user-management-390.png");

  const createUser = page.getByRole("button", { name: /Create User/i });
  await createUser.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Create User" });
  const nameInput = dialog.locator("input[data-autofocus]");
  await expect(nameInput).toBeFocused();
  const submit = dialog.getByRole("button", { name: "Create User", exact: true });
  await submit.focus();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close Create User" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(submit).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(createUser).toBeFocused();
});
