import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = path.resolve("../artifacts/lab-03/screenshots");

const requester = {
  id: 900,
  name: "Visual Requester",
  email: "visual.requester@toktick.it",
  isActive: true,
  role: "REQUESTER",
  mustChangePassword: false,
};

const initialRequester = { ...requester, mustChangePassword: true };

const ticket = {
  id: 901,
  ticketNumber: "TKT-2026-00901",
  summary: "Visual QA requester ticket",
  description: "Requester responsive and accessibility verification fixture.",
  requestedPriority: "High",
  itPriority: "Medium",
  status: "New",
  problemAppearsResolvedAt: null,
  createdAt: "2026-09-18T01:00:00.000Z",
  requester: { id: requester.id, name: requester.name },
  category: { id: 1, name: "Software" },
  relatedSystem: { id: 1, name: "CRM" },
  attachments: [],
};

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function capture(page: Page, name: string) {
  if (!CAPTURE_EVIDENCE) return;
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, name), fullPage: true });
}

async function expectVisibleFocus(page: Page, selector: string) {
  const element = page.locator(selector);
  await element.focus();
  await expect(element).toBeFocused();
  const boxShadow = await element.evaluate((node) => getComputedStyle(node).boxShadow);
  expect(boxShadow).not.toBe("none");
}

async function installAuthVisualApi(page: Page) {
  await page.route("**/api/v1/auth/me", async (route) => json(route, { error: { code: "UNAUTHENTICATED", message: "Authentication required" } }, 401));
  await page.route("**/api/v1/auth/login", async (route) => json(route, { user: initialRequester, nextAction: "CHANGE_PASSWORD" }));
}

async function installRequesterVisualApi(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (pathname === "/api/v1/auth/me") return json(route, requester);
    if (pathname === "/api/v1/categories") return json(route, [{ id: 1, name: "Software" }]);
    if (pathname === "/api/v1/related-systems") return json(route, [{ id: 1, name: "CRM" }]);
    if (pathname === "/api/v1/tickets/901/public-comments") return json(route, { items: [] });
    if (pathname === "/api/v1/tickets/901") return json(route, ticket);
    if (pathname === "/api/v1/tickets" && request.method() === "GET") {
      return json(route, { items: [ticket], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 });
    }
    return json(route, { error: { message: `Unhandled visual API ${request.method()} ${pathname}` } }, 500);
  });
}

async function openRequesterView(page: Page, viewportWidth: number, name: "Create Ticket" | "My Tickets") {
  if (viewportWidth <= 991) {
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await page.getByRole("menuitem", { name: new RegExp(name) }).click();
    return;
  }
  await page.getByRole("button", { name, exact: true }).click();
}

test("V-01/V-06 Login and Change Password stay labelled, focused, and overflow-safe", async ({ page }) => {
  await installAuthVisualApi(page);

  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 820, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel(/^Password$/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    if (viewport.width === 1280) await capture(page, "01-login-desktop.png");
  }

  await expectVisibleFocus(page, "#login-email");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Email address is required")).toBeVisible();
  await expect(page.getByText("Password is required")).toBeVisible();
  await expect(page.locator("#login-email")).toBeFocused();

  await page.getByLabel("Email address").fill(requester.email);
  await page.getByLabel(/^Password$/).fill("InitialPassword123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("heading", { name: "Change Your Password" })).toBeVisible();

  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 820, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.locator("#change-currentPassword")).toBeVisible();
    await expect(page.locator("#change-newPassword")).toBeVisible();
    await expect(page.locator("#change-confirmPassword")).toBeVisible();
    await expect(page.getByLabel("Password requirements")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    if (viewport.width === 390) await capture(page, "02-change-password-mobile.png");
  }

  await expectVisibleFocus(page, "#change-currentPassword");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Current password is required")).toBeVisible();
  await expect(page.locator("#change-currentPassword")).toBeFocused();
});

test("V-02/V-06/V-07 Requester major screens remain responsive and communicate state with text", async ({ page }) => {
  await installRequesterVisualApi(page);

  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 820, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await expect(page.locator(".priority-badge:visible").filter({ hasText: "High" }).first()).toBeVisible();
    await expect(page.locator(".status-badge:visible").filter({ hasText: "New" }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    if (viewport.width === 1280) await capture(page, "03-requester-my-tickets-desktop.png");

    await openRequesterView(page, viewport.width, "Create Ticket");
    await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
    await expect(page.getByLabel(/Category/)).toBeVisible();
    await expect(page.getByLabel(/Related System/)).toBeVisible();
    await expect(page.getByLabel(/Requested Priority/)).toBeVisible();
    await expect(page.getByLabel(/Summary/)).toBeVisible();
    await expect(page.getByLabel(/Description/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    if (viewport.width === 820) await capture(page, "04-requester-create-ticket-tablet.png");

    await page.locator("form").getByRole("button", { name: /Create Ticket/ }).click();
    await expect(page.getByText("Please select a category")).toBeVisible();
    await expect(page.getByText("Summary is required")).toBeVisible();
    await expectVisibleFocus(page, "#categoryId");

    await openRequesterView(page, viewport.width, "My Tickets");
    await page.getByRole("button", { name: `Open ${ticket.ticketNumber}` }).click();
    await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
    await expect(page.getByText("Requested Priority")).toBeVisible();
    await expect(page.getByText("IT Priority")).toBeVisible();
    await expect(page.getByText("Status", { exact: true })).toBeVisible();
    await expect(page.getByText("High", { exact: true })).toBeVisible();
    await expect(page.getByText("Medium", { exact: true })).toBeVisible();
    await expect(page.getByText("New", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    if (viewport.width === 390) await capture(page, "05-requester-ticket-detail-mobile.png");
  }
});
