import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = path.resolve("../artifacts/lab-04/screenshots");

const requester = {
  id: 801,
  name: "Evidence Requester",
  email: "evidence.requester@toktick.it",
  isActive: true,
  role: "REQUESTER",
  mustChangePassword: false,
};

const staff = {
  id: 802,
  name: "Evidence Staff",
  email: "evidence.staff@toktick.it",
  isActive: true,
  role: "IT_STAFF",
  mustChangePassword: false,
};

async function capture(page: Page, name: string) {
  if (!CAPTURE_EVIDENCE) return;
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, name), fullPage: true });
}

test("EV-01 Requester Dashboard empty state is readable and actionable", async ({ page }) => {
  await page.route("**/api/v1/auth/me", (route) => route.fulfill({ json: requester }));
  await page.route("**/api/v1/requester/dashboard", (route) => route.fulfill({
    json: {
      metrics: { openTickets: 0, waitingForYou: 0 },
      recentlyUpdatedTickets: [],
      recentlyResolvedTickets: [],
    },
  }));

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByText("Open Tickets")).toBeVisible();
  await expect(page.getByText("Waiting for You")).toBeVisible();
  await expect(page.getByText("No recent Tickets", { exact: true })).toBeVisible();
  await expect(page.getByText("No recently resolved Tickets", { exact: true })).toBeVisible();
  await capture(page, "requester-dashboard-empty-1280.png");
});

test("EV-02 Staff Dashboard empty state distinguishes all empty operational lists", async ({ page }) => {
  await page.route("**/api/v1/auth/me", (route) => route.fulfill({ json: staff }));
  await page.route("**/api/v1/staff/dashboard", (route) => route.fulfill({
    json: {
      metrics: {
        unassignedActiveTickets: 0,
        myActiveTickets: 0,
        byStatus: {
          New: 0,
          Open: 0,
          "In Progress": 0,
          "Waiting for Requester": 0,
          Resolved: 0,
          Closed: 0,
          Reopened: 0,
          Cancelled: 0,
        },
        activeByItPriority: { High: 0, Medium: 0, Low: 0, "Not recorded": 0 },
      },
      myActiveActions: [],
      recentlyUpdatedTickets: [],
      urgentTickets: [],
    },
  }));

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByText("No active Actions assigned to you.", { exact: true })).toBeVisible();
  await expect(page.getByText("No urgent Tickets.", { exact: true })).toBeVisible();
  await expect(page.getByText("No recently updated Tickets.", { exact: true })).toBeVisible();
  await expect(page.getByText("No active operational work is currently available.", { exact: true })).toBeVisible();
  await capture(page, "staff-dashboard-empty-1280.png");
});

test("EV-03 Requester Dashboard API failure shows a safe recovery state", async ({ page }) => {
  await page.route("**/api/v1/auth/me", (route) => route.fulfill({ json: requester }));
  await page.route("**/api/v1/requester/dashboard", (route) => route.fulfill({
    status: 500,
    json: { error: { code: "REQUESTER_DASHBOARD_FAILED", message: "Unable to load Requester Dashboard" } },
  }));

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Unable to load Dashboard", exact: true })).toBeVisible();
  await expect(page.getByText("The Dashboard response was unavailable. Your Tickets and workspace have not been changed.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await capture(page, "requester-dashboard-error-1280.png");
});

test("EV-04 Staff Dashboard API failure shows a safe recovery state", async ({ page }) => {
  await page.route("**/api/v1/auth/me", (route) => route.fulfill({ json: staff }));
  await page.route("**/api/v1/staff/dashboard", (route) => route.fulfill({
    status: 500,
    json: { error: { code: "STAFF_DASHBOARD_FAILED", message: "Unable to load Staff Dashboard" } },
  }));

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Unable to load Staff Dashboard", exact: true })).toBeVisible();
  await expect(page.getByText("Unable to load the Staff Dashboard. Your workspace has not been changed.", { exact: true })).toBeVisible();
  await capture(page, "staff-dashboard-error-1280.png");
});
