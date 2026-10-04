import { expect, test, type Page } from "@playwright/test";

const requesterUser = {
  id: 301,
  name: "Requester Dashboard Responsive",
  email: "requester.dashboard.responsive@toktick.it",
  isActive: true,
  role: "REQUESTER",
  mustChangePassword: false,
};

const dashboard = {
  metrics: { openTickets: 3, waitingForYou: 1 },
  recentlyUpdatedTickets: [
    {
      id: 601,
      ticketNumber: "TKT-2026-00601",
      summary: "Long summary used for responsive wrapping verification on the Requester Dashboard",
      status: "In Progress",
      itPriority: "High",
      updatedAt: "2026-10-03T09:00:00.000Z",
      resolvedAt: null,
    },
  ],
  recentlyResolvedTickets: [
    {
      id: 600,
      ticketNumber: "TKT-2026-00600",
      summary: "Printer issue",
      status: "Resolved",
      itPriority: "Medium",
      updatedAt: "2026-10-02T09:00:00.000Z",
      resolvedAt: "2026-10-02T08:30:00.000Z",
    },
  ],
};

async function mockDashboardApis(page: Page) {
  await page.route("**/api/v1/auth/me", async (route) => route.fulfill({ json: requesterUser }));
  await page.route("**/api/v1/requester/dashboard", async (route) => route.fulfill({ json: dashboard }));
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function expectButtonsStack(page: Page) {
  await expect.poll(async () => page.locator(".requester-dashboard-open").first().evaluate((button) => {
    const parent = button.parentElement;
    return parent ? button.getBoundingClientRect().width / parent.getBoundingClientRect().width : 0;
  })).toBeGreaterThan(0.9);
}

test("V4-01 Requester Dashboard is usable at 1280, 820, and 390 CSS pixels", async ({ page }) => {
  await mockDashboardApis(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect.poll(async () => page.locator(".requester-dashboard-metrics").evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length)).toBe(2);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 820, height: 1000 });
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect.poll(async () => page.locator(".requester-dashboard-list-grid").evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length)).toBe(1);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect.poll(async () => page.locator(".requester-dashboard-metrics").evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length)).toBe(1);
  await expectButtonsStack(page);
  await expectNoHorizontalOverflow(page);
});
