import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = path.resolve("../artifacts/lab-03/screenshots");

const adminUser = {
  id: 500,
  name: "Admin One",
  email: "admin.one@toktick.it",
  isActive: true,
  role: "ADMINISTRATOR",
  mustChangePassword: false,
};

const users = [
  { ...adminUser, createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-17T08:00:00.000Z" },
  { id: 501, name: "Narin Support", email: "narin.staff@toktick.it", role: "IT_STAFF", isActive: true, mustChangePassword: false, createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-17T08:00:00.000Z" },
  { id: 502, name: "Somchai Jaidee", email: "somchai@toktick.it", role: "REQUESTER", isActive: false, mustChangePassword: true, createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-17T08:00:00.000Z" },
];

async function mockAdminApis(page: Page) {
  await page.route("**/api/v1/auth/me", async (route) => route.fulfill({ json: adminUser }));
  await page.route("**/api/v1/staff/dashboard", async (route) => route.fulfill({ json: { metrics: { unassignedActiveTickets: 0, myActiveTickets: 0, byStatus: {}, activeByItPriority: {} }, myActiveActions: [], recentlyUpdatedTickets: [], urgentTickets: [] } }));
  await page.route("**/api/v1/admin/users**", async (route) => {
    if (route.request().method() === "GET") {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/v1/admin/users/summary") {
        const byRole: Record<"ADMINISTRATOR" | "IT_STAFF" | "REQUESTER", number> = {
          ADMINISTRATOR: 0,
          IT_STAFF: 0,
          REQUESTER: 0,
        };
        for (const user of users) byRole[user.role as keyof typeof byRole] += 1;
        await route.fulfill({ json: { totalUsers: users.length, byRole } });
        return;
      }
      await route.fulfill({ json: { items: users } });
      return;
    }
    await route.fulfill({ status: 500, json: { error: { message: "Unexpected mutation in responsive test" } } });
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function capture(page: Page, name: string, fullPage = true) {
  if (!CAPTURE_EVIDENCE) return;
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, name), fullPage });
}

test("V-05/V-06 User Management stays usable and modal focus stays contained", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await mockAdminApis(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "User Management" }).click();
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Create User/i })).toBeVisible();
  await expect(page.locator(".admin-users-table-wrap")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Narin Support" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await capture(page, "08-admin-user-management-desktop.png");

  await page.setViewportSize({ width: 820, height: 1000 });
  await expect(page.getByLabel("Search")).toBeVisible();
  await expect(page.getByLabel("Role filter")).toBeVisible();
  await expect(page.locator(".admin-users-table-wrap")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeVisible();
  await expect(page.locator(".admin-users-table-wrap")).toBeHidden();
  await expect(page.locator(".admin-users-cards")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit User" }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const opener = page.getByRole("button", { name: /Create User/i });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Create User" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel(/Name/i)).toBeFocused();
  await capture(page, "09-admin-create-user-mobile.png", false);

  const close = dialog.getByRole("button", { name: "Close Create User" });
  const submit = dialog.getByRole("button", { name: "Create User", exact: true });
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(submit).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();

  await expectNoHorizontalOverflow(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  expect(pageErrors).toEqual([]);
});
