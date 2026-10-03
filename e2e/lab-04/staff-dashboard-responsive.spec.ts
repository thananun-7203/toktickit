import { expect, test, type Page } from "@playwright/test";

const staffUser = {
  id: 200,
  name: "Responsive Dashboard Staff",
  email: "responsive.dashboard@toktick.it",
  isActive: true,
  role: "IT_STAFF",
  mustChangePassword: false,
};

const dashboard = {
  metrics: {
    unassignedActiveTickets: 3,
    myActiveTickets: 4,
    byStatus: {
      New: 1,
      Open: 2,
      "In Progress": 3,
      "Waiting for Requester": 1,
      Resolved: 1,
      Closed: 2,
      Reopened: 1,
      Cancelled: 0,
    },
    activeByItPriority: { High: 2, Medium: 3, Low: 1, "Not recorded": 1 },
  },
  myActiveActions: [
    {
      id: 1,
      ticketId: 501,
      description: "Investigate the reported access issue",
      status: "In Progress",
      updatedAt: "2026-10-03T09:00:00.000Z",
      assignee: { id: 200, name: staffUser.name },
      ticket: { ticketNumber: "TKT-2026-00501", summary: "Cannot access internal system" },
    },
  ],
  recentlyUpdatedTickets: [
    { id: 501, ticketNumber: "TKT-2026-00501", summary: "Cannot access internal system", status: "In Progress", itPriority: "High", updatedAt: "2026-10-03T09:00:00.000Z" },
    { id: 502, ticketNumber: "TKT-2026-00502", summary: "Long summary used for responsive wrapping verification", status: "Open", itPriority: "Medium", updatedAt: "2026-10-03T08:00:00.000Z" },
  ],
  urgentTickets: [
    { id: 501, ticketNumber: "TKT-2026-00501", summary: "Cannot access internal system", status: "In Progress", itPriority: "High", updatedAt: "2026-10-03T09:00:00.000Z" },
  ],
};

async function mockDashboardApis(page: Page) {
  await page.route("**/api/v1/auth/me", async (route) => route.fulfill({ json: staffUser }));
  await page.route("**/api/v1/staff/dashboard", async (route) => route.fulfill({ json: dashboard }));
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function expectGridColumns(page: Page, selector: string, count: number) {
  await expect.poll(async () => page.locator(selector).evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length)).toBe(count);
}

async function expectActionButtonsStack(page: Page) {
  await expect.poll(async () => page.locator(".staff-dashboard-action-row .btn").first().evaluate((button) => {
    const parent = button.parentElement;
    return parent ? button.getBoundingClientRect().width / parent.getBoundingClientRect().width : 0;
  })).toBeGreaterThan(0.9);
  await expect.poll(async () => page.locator(".staff-dashboard-recent-row .btn").first().evaluate((button) => {
    const parent = button.parentElement;
    return parent ? button.getBoundingClientRect().width / parent.getBoundingClientRect().width : 0;
  })).toBeGreaterThan(0.9);
}

test("V4-02 Staff Dashboard is usable at 1280, 820, and 390 CSS pixels", async ({ page }) => {
  await mockDashboardApis(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expectGridColumns(page, ".staff-dashboard-metrics", 2);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 820, height: 1000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expectGridColumns(page, ".staff-dashboard-summary-grid", 1);
  await expectGridColumns(page, ".staff-dashboard-work-grid", 1);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expectGridColumns(page, ".staff-dashboard-metrics", 1);
  await expectActionButtonsStack(page);
  await expectNoHorizontalOverflow(page);
});
