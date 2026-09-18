import { expect, test } from "@playwright/test";
import {
  API_URL,
  captureEvidence,
  createDedicatedE2eUsers,
  completeMandatoryPasswordChange,
  logoutFromUserMenu,
  signIn,
  type E2eUsers,
} from "./fullstack-fixtures.js";

let users: E2eUsers;

test.beforeEach(async ({}, testInfo) => {
  const suffix = `auth-${Date.now()}-${testInfo.retry}-${testInfo.workerIndex}`;
  users = createDedicatedE2eUsers(suffix);
});

test("E2E-AUTH-01 invalid login, mandatory first change, logout, and direct access boundary", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email address").fill(users.requesterOneEmail);
  await page.getByLabel(/^Password$/).fill("WrongPassword123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("alert")).toContainText("Email or password is incorrect");
  await captureEvidence(page, "10-login-invalid-credentials.png");

  await signIn(page, users.requesterOneEmail, users.initialPassword);
  const replacementPassword = `AuthE2E${Date.now()}9A`;
  await completeMandatoryPasswordChange(page, users.initialPassword, replacementPassword, "My Tickets");

  const authenticatedStatus = await page.evaluate(async (apiUrl) => {
    const response = await fetch(`${apiUrl}/api/v1/categories`, { credentials: "include" });
    return response.status;
  }, API_URL);
  expect(authenticatedStatus).toBe(200);

  await logoutFromUserMenu(page, "E2E Requester One");
  const loggedOutStatus = await page.evaluate(async (apiUrl) => {
    const response = await fetch(`${apiUrl}/api/v1/categories`, { credentials: "include" });
    return response.status;
  }, API_URL);
  expect(loggedOutStatus).toBe(401);
});

test("E2E-AUTH-02 inactive login is safe and bootstrap failure is distinct from logout", async ({ page }) => {
  let failBootstrap = true;
  await page.route("**/api/v1/auth/me", async (route) => {
    if (failBootstrap) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "AUTHENTICATION_FAILED", message: "Backend unavailable" } }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Unable to verify your session" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await captureEvidence(page, "11-auth-bootstrap-error-retry.png");
  failBootstrap = false;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

  await page.getByLabel("Email address").fill(users.inactiveEmail);
  await page.getByLabel(/^Password$/).fill(users.initialPassword);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("alert")).toContainText(/cannot sign in.*administrator/i);
});
