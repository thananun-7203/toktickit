import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = path.resolve("../artifacts/lab-03/screenshots");

const staffUser = {
  id: 200,
  name: "Responsive Queue Staff",
  email: "responsive.staff@toktick.it",
  isActive: true,
  role: "IT_STAFF",
  mustChangePassword: false,
};

const queueItems = [
  {
    id: 501,
    ticketNumber: "TKT-2026-00501",
    summary: "Cannot export monthly report",
    requestedPriority: "High",
    itPriority: "Medium",
    status: "In Progress",
    createdAt: "2026-09-15T08:00:00.000Z",
    updatedAt: "2026-09-16T09:30:00.000Z",
    requester: { id: 10, name: "Somsri Rakdee", email: "somsri@toktick.it" },
    category: { id: 1, name: "Software" },
    relatedSystem: { id: 2, name: "CRM" },
    owner: { id: 200, name: "Responsive Queue Staff", email: "responsive.staff@toktick.it", role: "IT_STAFF" },
  },
  {
    id: 502,
    ticketNumber: "TKT-2026-00502",
    summary: "Unassigned hardware issue with a realistically long summary",
    requestedPriority: "Low",
    itPriority: null,
    status: "New",
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: "2026-09-16T08:00:00.000Z",
    requester: { id: 11, name: "Somchai Jaidee", email: "somchai@toktick.it" },
    category: { id: 3, name: "Hardware" },
    relatedSystem: { id: 4, name: "Laptop Fleet" },
    owner: null,
  },
];

async function mockQueueApis(page: Page) {
  await page.route("**/api/v1/auth/me", async (route) => route.fulfill({ json: staffUser }));
  await page.route("**/api/v1/categories", async (route) => route.fulfill({ json: [
    { id: 1, name: "Software" }, { id: 3, name: "Hardware" },
  ] }));
  await page.route("**/api/v1/related-systems", async (route) => route.fulfill({ json: [
    { id: 2, name: "CRM" }, { id: 4, name: "Laptop Fleet" },
  ] }));
  await page.route("**/api/v1/staff/assignees", async (route) => route.fulfill({ json: [
    { id: 200, name: "Responsive Queue Staff", email: "responsive.staff@toktick.it", role: "IT_STAFF" },
  ] }));
  await page.route("**/api/v1/staff/tickets**", async (route) => route.fulfill({
    json: { items: queueItems, page: 1, pageSize: 10, totalItems: queueItems.length, totalPages: 1 },
  }));
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function capture(page: Page, name: string) {
  if (!CAPTURE_EVIDENCE) return;
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, name), fullPage: true });
}

test("V-03 Staff Queue adapts at desktop, tablet, and mobile widths", async ({ page }) => {
  await mockQueueApis(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  await expect(page.locator(".staff-queue-table-wrap")).toBeVisible();
  await expect(page.locator(".staff-queue-cards")).toBeHidden();
  await expectNoHorizontalOverflow(page);
  await capture(page, "06-staff-ticket-queue-desktop.png");

  await page.setViewportSize({ width: 820, height: 900 });
  await expect(page.locator(".staff-queue-table-wrap")).toBeVisible();
  await expect(page.locator(".staff-queue-table .owner-unassigned")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".staff-queue-table-wrap")).toBeHidden();
  await expect(page.locator(".staff-queue-cards")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Ticket" }).first()).toBeVisible();
  await expect(page.locator(".staff-queue-card .owner-unassigned")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
