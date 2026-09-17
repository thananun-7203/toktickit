import { expect, test, type Page } from "@playwright/test";

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
  await page.route("**/api/v1/admin/users**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { items: users } });
      return;
    }
    await route.fulfill({ status: 500, json: { error: { message: "Unexpected mutation in responsive test" } } });
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

test("V-05 User Management stays usable at desktop, tablet, and mobile widths", async ({ page }) => {
  await mockAdminApis(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Create User/i })).toBeVisible();
  await expect(page.locator(".admin-users-table-wrap")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Narin Support" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

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

  await page.getByRole("button", { name: /Create User/i }).click();
  await expect(page.getByRole("dialog", { name: "Create User" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
