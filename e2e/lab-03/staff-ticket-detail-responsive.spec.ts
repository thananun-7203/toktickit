import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = path.resolve("../artifacts/lab-03/screenshots");

const staffUser = {
  id: 200,
  name: "Narin Support",
  email: "narin.staff@toktick.it",
  isActive: true,
  role: "IT_STAFF",
  mustChangePassword: false,
};

const assignees = [
  { id: 200, name: "Narin Support", email: "narin.staff@toktick.it", role: "IT_STAFF" },
  { id: 201, name: "Patchara Support", email: "patchara.staff@toktick.it", role: "IT_STAFF" },
];

const ticket = {
  id: 501,
  ticketNumber: "TKT-2026-00501",
  summary: "Cannot access internal system",
  description: "Requester receives Access Denied even though the account should have access. Please investigate the permission configuration.",
  requestedPriority: "High",
  itPriority: "Medium",
  status: "In Progress",
  problemAppearsResolvedAt: "2026-09-17T08:15:00.000Z",
  createdAt: "2026-09-15T08:00:00.000Z",
  updatedAt: "2026-09-16T09:30:00.000Z",
  requester: { id: 10, name: "Somsri Rakdee", email: "somsri@toktick.it" },
  category: { id: 1, name: "Access / Permissions" },
  relatedSystem: { id: 2, name: "Internal Portal" },
  owner: assignees[1],
  attachments: [
    { id: 70, fileName: "error-screenshot.png", mimeType: "image/png", sizeBytes: 245000, removedAt: null, removalReason: null },
    { id: 71, fileName: "system-log.pdf", mimeType: "application/pdf", sizeBytes: 1200000, removedAt: "2026-09-16T10:00:00.000Z", removalReason: "Duplicate" },
  ],
};

async function mockStaffDetailApis(page: Page) {
  await page.route("**/api/v1/auth/me", async (route) => route.fulfill({ json: staffUser }));
  await page.route("**/api/v1/categories", async (route) => route.fulfill({ json: [{ id: 1, name: "Access / Permissions" }] }));
  await page.route("**/api/v1/related-systems", async (route) => route.fulfill({ json: [{ id: 2, name: "Internal Portal" }] }));
  await page.route("**/api/v1/staff/assignees", async (route) => route.fulfill({ json: assignees }));
  await page.route("**/api/v1/tickets/501/public-comments", async (route) => route.fulfill({ json: { items: [
    { id: 1, content: "Requester-visible update", createdAt: "2026-09-16T11:00:00.000Z", author: assignees[0] },
  ] } }));
  await page.route("**/api/v1/staff/tickets**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/staff/tickets/501/internal-notes") {
      await route.fulfill({ json: {
        items: [
          { id: 2, content: "Private operational context", createdAt: "2026-09-16T11:30:00.000Z", author: assignees[1] },
        ],
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      } });
      return;
    }
    if (url.pathname === "/api/v1/staff/tickets/501") {
      await route.fulfill({ json: ticket });
      return;
    }
    await route.fulfill({ json: {
      items: [ticket],
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    } });
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function capture(page: Page, name: string) {
  if (!CAPTURE_EVIDENCE) return;
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, name), fullPage: true });
}

test("V-04/V-08 Staff Ticket Detail stays usable and communication visibility is explicit", async ({ page }) => {
  await mockStaffDetailApis(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: `Open ${ticket.ticketNumber}` }).click();
  await expect(page.getByRole("heading", { name: ticket.ticketNumber })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Operational Controls/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Public Comments" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Internal Notes" })).toBeVisible();
  await expect(page.getByText("error-screenshot.png")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 820, height: 1000 });
  await expect(page.locator(".staff-detail-grid")).toHaveCSS("grid-template-columns", /.+/);
  await expect(page.getByText("Visible to Requester", { exact: true })).toBeVisible();
  await expect(page.getByText("Not visible to Requester", { exact: true })).toBeVisible();
  await expect(page.getByText(/Internal Notes .* not visible to Requester/i)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeVisible();
  await expect(page.getByLabel("Assign / Reassign")).toBeVisible();
  await expect(page.getByLabel("IT Priority")).toBeVisible();
  await expect(page.getByLabel("Status")).toBeVisible();
  await expect(page.getByText("Requester says the problem appears resolved")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await capture(page, "07-staff-ticket-detail-mobile.png");
});
