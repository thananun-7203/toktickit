import { expect, test, type Page, type Route } from "@playwright/test";

const adminUser = {
  id: 500,
  name: "Admin One",
  email: "admin.one@toktick.it",
  isActive: true,
  role: "ADMINISTRATOR",
  mustChangePassword: false,
};

const initialUsers = [
  { ...adminUser, createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-17T08:00:00.000Z" },
  { id: 501, name: "Narin Support", email: "narin.staff@toktick.it", role: "IT_STAFF", isActive: true, mustChangePassword: false, createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-17T08:00:00.000Z" },
];

async function fulfillJson(route: Route, json: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(json) });
}

async function installAdminFlowApi(page: Page) {
  let authenticated = false;
  let users = structuredClone(initialUsers);
  let nextId = 502;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/v1/auth/me") {
      if (!authenticated) {
        await fulfillJson(route, { error: { message: "Authentication required" } }, 401);
        return;
      }
      await fulfillJson(route, adminUser);
      return;
    }
    if (path === "/api/v1/auth/login" && method === "POST") {
      authenticated = true;
      await fulfillJson(route, { user: adminUser, nextAction: "APPLICATION" });
      return;
    }

    if (path === "/api/v1/admin/users" && method === "GET") {
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      const role = url.searchParams.get("role");
      const items = users.filter((user) =>
        (!search || user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search))
        && (!role || user.role === role),
      );
      await fulfillJson(route, { items });
      return;
    }

    if (path === "/api/v1/admin/users" && method === "POST") {
      const body = JSON.parse(request.postData() ?? "{}") as Record<string, unknown>;
      const created = {
        id: nextId++,
        name: String(body.name),
        email: String(body.email).trim().toLowerCase(),
        role: String(body.role),
        isActive: Boolean(body.isActive),
        mustChangePassword: true,
        createdAt: "2026-09-18T00:00:00.000Z",
        updatedAt: "2026-09-18T00:00:00.000Z",
      };
      users = [...users, created];
      await fulfillJson(route, created, 201);
      return;
    }

    const userMatch = path.match(/^\/api\/v1\/admin\/users\/(\d+)$/);
    if (userMatch && method === "PATCH") {
      const id = Number(userMatch[1]);
      const body = JSON.parse(request.postData() ?? "{}") as { name?: string; email?: string; role?: string; isActive?: boolean };
      if (id === 501 && body.isActive === false) {
        await fulfillJson(route, {
          error: {
            code: "ASSIGNED_TICKETS_REQUIRE_REASSIGNMENT",
            message: "Reassign owned Tickets before changing this user's eligibility",
          },
        }, 409);
        return;
      }
      users = users.map((user) => user.id === id ? { ...user, ...body, updatedAt: "2026-09-18T00:05:00.000Z" } : user);
      await fulfillJson(route, users.find((user) => user.id === id));
      return;
    }

    const passwordMatch = path.match(/^\/api\/v1\/admin\/users\/(\d+)\/initial-password$/);
    if (passwordMatch && method === "POST") {
      const id = Number(passwordMatch[1]);
      users = users.map((user) => user.id === id ? { ...user, mustChangePassword: true } : user);
      await fulfillJson(route, { id, mustChangePassword: true });
      return;
    }

    await fulfillJson(route, { error: { message: `Unhandled mocked API ${method} ${path}` } }, 500);
  });
}

test("Administrator browser UI flow covers create, edit, initial password, and safety conflict", async ({ page }) => {
  await installAdminFlowApi(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  await page.getByLabel("Email address").fill(adminUser.email);
  await page.locator("#login-password").fill("ValidPassword123!");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await page.getByLabel("Search").fill("Narin");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("button", { name: "Edit Narin Support" })).toBeVisible();
  await page.getByLabel("Role filter").selectOption("IT_STAFF");
  await expect(page.getByRole("button", { name: "Edit Narin Support" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();

  await page.getByRole("button", { name: /Create User/i }).click();
  let dialog = page.getByRole("dialog", { name: "Create User" });
  await dialog.getByLabel(/Name/i).fill("New Requester");
  await dialog.getByLabel(/Email/i).fill("new.requester@toktick.it");
  await dialog.getByLabel(/Role/i).selectOption("REQUESTER");
  await dialog.getByLabel(/Initial Password/i).fill("InitialPass123");
  await dialog.getByRole("button", { name: "Create User", exact: true }).click();
  await expect(page.getByText(/User created successfully/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit New Requester" })).toBeVisible();

  await page.getByRole("button", { name: "Edit New Requester" }).click();
  dialog = page.getByRole("dialog", { name: "Edit User" });
  await dialog.getByLabel(/Name/i).fill("New Requester Updated");
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText(/User changes saved successfully/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit New Requester Updated" })).toBeVisible();

  await page.getByRole("button", { name: "Edit New Requester Updated" }).click();
  await page.getByRole("button", { name: "Set New Initial Password" }).click();
  dialog = page.getByRole("dialog", { name: "Set Initial Password" });
  await dialog.getByLabel(/New Initial Password/i).fill("NewInitial123");
  await dialog.getByLabel(/Confirm Password/i).fill("NewInitial123");
  await dialog.getByRole("button", { name: "Set Password" }).click();
  await expect(page.getByText(/Existing sessions were ended/i)).toBeVisible();

  await page.getByRole("button", { name: "Edit Narin Support" }).click();
  dialog = page.getByRole("dialog", { name: "Edit User" });
  await dialog.getByLabel(/Status/i).selectOption("inactive");
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  const confirm = page.getByRole("dialog", { name: "Deactivate User" });
  await confirm.getByRole("button", { name: "Deactivate User", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Reassign this user's tickets");
  await expect(page.getByRole("dialog", { name: "Edit User" })).toBeVisible();
});
