import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = path.resolve("../artifacts/lab-04/screenshots");

const staffUser = {
  id: 200, name: "Narin Support", email: "narin.staff@toktick.it",
  isActive: true, role: "IT_STAFF", mustChangePassword: false,
};
const requesterUser = {
  id: 10, name: "Somsri Rakdee", email: "somsri@toktick.it",
  isActive: true, role: "REQUESTER", mustChangePassword: false,
};
const assignee = { id: 200, name: "Narin Support", email: "narin.staff@toktick.it", role: "IT_STAFF" };
const ticket = {
  id: 501, ticketNumber: "TKT-2026-00501",
  summary: "Access issue with a deliberately long summary to verify safe wrapping on narrow screens",
  description: "Requester receives Access Denied even though the account should have access. Please investigate the permission configuration. Long descriptions must wrap without forcing horizontal page scrolling.",
  requestedPriority: "High", itPriority: "Medium", status: "In Progress", version: 5, workflowCycle: 1,
  problemAppearsResolvedAt: null, createdAt: "2026-09-15T08:00:00.000Z", updatedAt: "2026-10-29T09:30:00.000Z",
  requester: { id: 10, name: "Somsri Rakdee", email: "somsri@toktick.it" },
  category: { id: 1, name: "Access / Permissions" }, relatedSystem: { id: 2, name: "Internal Portal" },
  owner: assignee, attachments: [],
};
const action = {
  id: 901, ticketId: 501, clientRequestId: "e2e-issue58-action-901", workflowCycle: 1,
  actionDateTime: "2026-10-29T08:00:00.000Z",
  description: "Verified permission mapping and completed the access repair. This long action description is used to verify that detailed work notes wrap safely on mobile.",
  result: "Access restored and verified with requester.", followUpRequired: true,
  followUpNote: "Confirm access after the next scheduled synchronization.", followUpStatus: "OUTSTANDING",
  followUpCompletedBy: null, followUpCompletedAt: null,
  attachmentNotes: "Reference: access-review-2026-10-29.pdf; retain this note with the ticket audit history.",
  status: "Completed", createdBy: assignee, assignee, performedBy: assignee,
  completedAt: "2026-10-29T08:45:00.000Z", cancelledBy: null, cancelledAt: null,
  version: 2, createdAt: "2026-10-29T08:01:00.000Z", updatedAt: "2026-10-29T08:45:00.000Z",
};

async function mockSharedApis(page: Page, role: "IT_STAFF" | "REQUESTER") {
  const user = role === "IT_STAFF" ? staffUser : requesterUser;
  await page.route("**/api/v1/auth/me", (route) => route.fulfill({ json: user }));
  await page.route("**/api/v1/tickets/501/actions-taken", (route) => route.fulfill({ json: { items: [action] } }));
  await page.route("**/api/v1/tickets/501/public-comments", (route) => route.fulfill({ json: { items: [
    { id: 1, content: "Requester-visible update", createdAt: "2026-10-29T09:00:00.000Z", author: assignee },
  ] } }));
  await page.route("**/api/v1/categories", (route) => route.fulfill({ json: [{ id: 1, name: "Access / Permissions" }] }));
  await page.route("**/api/v1/related-systems", (route) => route.fulfill({ json: [{ id: 2, name: "Internal Portal" }] }));
  await page.route("**/api/v1/staff/assignees", (route) => route.fulfill({ json: [assignee] }));
  await page.route("**/api/v1/staff/dashboard", (route) => route.fulfill({ json: {
    metrics: { unassignedActiveTickets: 1, myActiveTickets: 1, byStatus: { "In Progress": 1 }, activeByItPriority: { Medium: 1 } },
    myActiveActions: [], recentlyUpdatedTickets: [], urgentTickets: [],
  } }));
  await page.route("**/api/v1/requester/dashboard", (route) => route.fulfill({ json: {
    metrics: { openTickets: 1, waitingForYou: 0 },
    recentlyUpdatedTickets: [{ id: 501, ticketNumber: ticket.ticketNumber, summary: ticket.summary, status: ticket.status, itPriority: ticket.itPriority, updatedAt: ticket.updatedAt, resolvedAt: null }],
    recentlyResolvedTickets: [],
  } }));
  await page.route("**/api/v1/staff/tickets**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/staff/tickets/501/internal-notes") {
      await route.fulfill({ json: { items: [{ id: 2, content: "Private operational context", createdAt: "2026-10-29T09:15:00.000Z", author: assignee }], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
    } else if (url.pathname === "/api/v1/staff/tickets/501") {
      await route.fulfill({ json: ticket });
    } else {
      await route.fulfill({ json: { items: [ticket], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } });
    }
  });
  await page.route("**/api/v1/tickets**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/tickets/501") return route.fulfill({ json: ticket });
    if (url.pathname === "/api/v1/tickets") return route.fulfill({ json: {
      items: [ticket], page: 1, pageSize: 10, totalItems: 1, totalPages: 1,
    } });
    return route.fallback();
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function capture(page: Page, name: string) {
  if (!CAPTURE_EVIDENCE) return;
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, name), fullPage: true });
}

test("V4-03 Staff Ticket Detail / Actions Taken: responsive, keyboard, focus and workflow cues", async ({ page }) => {
  await mockSharedApis(page, "IT_STAFF");
  for (const viewport of [{ width: 1280, height: 900 }, { width: 820, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    if (viewport.width === 1280) {
      await page.goto("/");
      await page.getByRole("button", { name: "Ticket Queue" }).click();
      await page.getByRole("button", { name: `Open ${ticket.ticketNumber}` }).click();
    }
    await expect(page.getByRole("heading", { name: ticket.ticketNumber })).toBeVisible();
    const panel = page.locator(".actions-panel");
    await expect(panel.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
    await expect(panel.getByText("Completed", { exact: true })).toBeVisible();
    await expect(panel.getByText("Outstanding", { exact: true })).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Resolution Gate" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Public Comments" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Internal Notes" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const addAction = panel.getByRole("button", { name: "Add Action" }).first();
    await expect(addAction).toBeVisible();
    await expect.poll(async () => {
      const bounds = await addAction.boundingBox();
      return bounds !== null && bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1;
    }).toBe(true);
    const attachmentNote = panel.getByText(action.attachmentNotes);
    await expect(attachmentNote).toBeVisible();
    await expect.poll(() => attachmentNote.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);

    if (viewport.width === 1280) {
      const add = panel.getByRole("button", { name: "Add Action" }).first();
      await add.focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      await expect(add).toBeFocused();
      await expect.poll(() => add.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: "Add Action" });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByLabel(/Description/)).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Create Action" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(add).toBeFocused();
    }
    await capture(page, `staff-ticket-actions-${viewport.width}.png`);
  }
});

test("V4-04 Requester Ticket Detail / Actions Taken is read-only and responsive", async ({ page }) => {
  await mockSharedApis(page, "REQUESTER");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "My Tickets" }).click();
  const openTicket = page.getByRole("button", { name: `Open ${ticket.ticketNumber}` });
  await openTicket.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect.poll(() => openTicket.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Ticket Detail", exact: true })).toBeVisible();
  const panel = page.locator(".actions-panel");
  await expect(panel.getByText("Completed", { exact: true })).toBeVisible();
  await expect(panel.getByText("Outstanding", { exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: /Add Action|Edit|Reassign|Start|Complete|Cancel|Mark Follow-up Complete/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Public Comments" })).toBeVisible();

  for (const viewport of [{ width: 1280, height: 900 }, { width: 820, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect(panel.getByText(action.description)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await capture(page, `requester-ticket-actions-${viewport.width}.png`);
  }
});
