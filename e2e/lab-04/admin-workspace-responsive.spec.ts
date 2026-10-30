import { expect, test, type Page } from "@playwright/test";

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

  await page.setViewportSize({ width: 820, height: 1000 });
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByRole("menuitem", { name: "Ticket Queue" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "User Management" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Ticket Queue" }).click();
  await expect(page.getByRole("heading", { name: /Ticket Queue/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("menuitem", { name: "User Management" }).click();
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await expect(page.getByText("Total Users")).toBeVisible();
  await expect(page.getByText("24", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
