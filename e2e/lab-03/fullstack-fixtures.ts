import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page } from "@playwright/test";

export const API_URL = "http://127.0.0.1:3001";
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://toktickit:toktickit@127.0.0.1:5435/toktickit_e2e_issue3?schema=public";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "server");

export type E2eUsers = {
  requesterOneEmail: string;
  requesterTwoEmail: string;
  staffOneEmail: string;
  staffTwoEmail: string;
  adminEmail: string;
  inactiveEmail: string;
  initialPassword: string;
};

export function fixtureInitialPassword(): string {
  if (process.env.E2E_REQUESTER_INITIAL_PASSWORD) return process.env.E2E_REQUESTER_INITIAL_PASSWORD;
  const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
  const match = readme.match(/^\| Requester \|[^|]+\| `([^`]+)` \|$/m);
  if (!match) throw new Error("Unable to resolve the documented local E2E initial password");
  return match[1];
}

export function createDedicatedE2eUsers(suffix: string): E2eUsers {
  const tsxCli = path.join(serverDir, "node_modules", "tsx", "dist", "cli.mjs");
  const fixtureScript = path.join(serverDir, "scripts", "create-e2e-requesters.ts");
  const initialPassword = fixtureInitialPassword();
  execFileSync(process.execPath, [tsxCli, fixtureScript], {
    cwd: serverDir,
    env: {
      ...process.env,
      DATABASE_URL: E2E_DATABASE_URL,
      E2E_FIXTURE_CREATE_ALLOWED: "1",
      E2E_REQUESTER_INITIAL_PASSWORD: initialPassword,
      E2E_USER_SUFFIX: suffix,
    },
    stdio: "inherit",
  });

  return {
    requesterOneEmail: `e2e.requester.one.${suffix}@toktick.it`,
    requesterTwoEmail: `e2e.requester.two.${suffix}@toktick.it`,
    staffOneEmail: `e2e.staff.one.${suffix}@toktick.it`,
    staffTwoEmail: `e2e.staff.two.${suffix}@toktick.it`,
    adminEmail: `e2e.admin.${suffix}@toktick.it`,
    inactiveEmail: `e2e.inactive.${suffix}@toktick.it`,
    initialPassword,
  };
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel(/^Password$/).fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

export async function completeMandatoryPasswordChange(
  page: Page,
  currentPassword: string,
  newPassword: string,
  landingHeading: string,
) {
  await expect(page.getByRole("heading", { name: "Change Your Password" })).toBeVisible();
  await page.getByLabel(/^Current password$/).fill(currentPassword);
  await page.getByLabel(/^New password$/).fill(newPassword);
  await page.getByLabel(/^Confirm new password$/).fill(newPassword);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: landingHeading })).toBeVisible();
}

export async function signInAndCompleteMandatoryChange(
  page: Page,
  email: string,
  initialPassword: string,
  newPassword: string,
  landingHeading: string,
) {
  await signIn(page, email, initialPassword);
  await completeMandatoryPasswordChange(page, initialPassword, newPassword, landingHeading);
}

export async function logoutFromUserMenu(page: Page, userName: string) {
  await page.getByLabel(new RegExp(`User menu for ${userName}`, "i")).click();
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
}
