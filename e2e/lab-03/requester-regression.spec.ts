import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const API_URL = "http://127.0.0.1:3001";

function requesterInitialPassword(): string {
  if (process.env.E2E_REQUESTER_INITIAL_PASSWORD) return process.env.E2E_REQUESTER_INITIAL_PASSWORD;
  const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
  const match = readme.match(/^\| Requester \|[^|]+\| `([^`]+)` \|$/m);
  if (!match) throw new Error("Unable to resolve the documented local Requester initial password");
  return match[1];
}

async function expectNoHorizontalOverflow(page: Page) {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBeFalsy();
}

async function loginAndCompleteMandatoryChange(page: Page, email: string, replacementPassword: string) {
  const initialPassword = requesterInitialPassword();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel(/^Password$/).fill(initialPassword);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByRole("heading", { name: "Change Your Password" })).toBeVisible();
  await page.getByLabel(/^Current password$/).fill(initialPassword);
  await page.getByLabel(/^New password$/).fill(replacementPassword);
  await page.getByLabel(/^Confirm new password$/).fill(replacementPassword);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
}

test("E2E-REQ-01/02 authenticated Requester regression", async ({ page }) => {
  const stamp = Date.now();
  const unique = `Lab 3 requester E2E ${stamp}`;
  const comment = `Requester update ${stamp}`;
  const attachmentName = "lab3-requester-e2e.pdf";
  const somchaiPassword = `SomchaiE2E${stamp}A1`;
  const somsriPassword = `SomsriE2E${stamp}B2`;

  await page.setViewportSize({ width: 1280, height: 800 });
  await loginAndCompleteMandatoryChange(page, "somchai@toktick.it", somchaiPassword);

  await expect(page.getByLabel(/User menu for Somchai Jaidee/i)).toBeVisible();
  await expect(page.getByText(/Development Requester/i)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Create Ticket" }).first().click();
  await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
  await page.getByLabel(/Category/).selectOption({ label: "Software" });
  await page.getByLabel(/Related System/).selectOption({ label: "CRM" });
  await page.getByLabel(/Requested Priority/).selectOption("High");
  await page.getByLabel(/Summary/).fill(unique);
  await page.getByLabel(/Description/).fill("Authenticated Requester Lab 3 Playwright regression ticket.");
  await page.getByLabel(/Attachments/i).setInputFiles({
    name: attachmentName,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nTokTickIT Lab 3 Requester E2E\n"),
  });
  await page.locator("form").getByRole("button", { name: /Create Ticket/ }).click();
  await expect(page.getByText("Ticket created successfully")).toBeVisible();

  await page.getByRole("button", { name: "My Tickets" }).last().click();
  await page.getByLabel("Search").fill(unique);
  await expect(page.getByText(unique).first()).toBeVisible();
  await expect(page.getByText("High").first()).toBeVisible();

  const openButton = page.getByRole("button", { name: /^Open TKT-/ }).first();
  await expect(openButton).toBeVisible();
  await openButton.click();
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  await expect(page.getByText("Requested Priority")).toBeVisible();
  await expect(page.getByText("IT Priority")).toBeVisible();
  await expect(page.getByText(attachmentName)).toBeVisible();

  const ownedIds = await page.evaluate(async ({ apiUrl, uniqueSummary, fileName }) => {
    const listResponse = await fetch(
      `${apiUrl}/api/v1/tickets?search=${encodeURIComponent(uniqueSummary)}`,
      { credentials: "include" },
    );
    if (!listResponse.ok) throw new Error(`Unable to resolve E2E ticket: ${listResponse.status}`);
    const listBody = await listResponse.json() as { items: Array<{ id: number }> };
    const ticketId = listBody.items[0]?.id;
    if (!ticketId) throw new Error("E2E ticket was not returned from My Tickets");

    const detailResponse = await fetch(`${apiUrl}/api/v1/tickets/${ticketId}`, { credentials: "include" });
    if (!detailResponse.ok) throw new Error(`Unable to resolve E2E attachment: ${detailResponse.status}`);
    const detailBody = await detailResponse.json() as {
      attachments: Array<{ id: number; fileName: string }>;
    };
    const attachmentId = detailBody.attachments.find((item) => item.fileName === fileName)?.id;
    if (!attachmentId) throw new Error("E2E attachment was not returned from Ticket Detail");
    return { ticketId, attachmentId };
  }, { apiUrl: API_URL, uniqueSummary: unique, fileName: attachmentName });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: `Download ${attachmentName}` }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(attachmentName);

  await page.getByLabel("Add a public comment").fill(comment);
  await page.getByRole("button", { name: "Post Comment" }).click();
  await expect(page.getByText(comment)).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Problem Appears Resolved" }).click();
  await expect(page.getByText("Requester indicated this problem appears resolved", { exact: true })).toBeVisible();
  await expect(page.getByText("New", { exact: true })).toBeVisible();

  for (const viewport of [
    { width: 820, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow(page);
  }

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByLabel(/User menu for Somchai Jaidee/i).click();
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

  await loginAndCompleteMandatoryChange(page, "somsri@toktick.it", somsriPassword);
  await page.getByLabel("Search").fill(unique);
  await expect(page.getByText("No results")).toBeVisible();
  await expect(page.getByText(unique)).toHaveCount(0);

  const crossRequesterStatuses = await page.evaluate(async ({ apiUrl, ticketId, attachmentId }) => {
    const ticketResponse = await fetch(`${apiUrl}/api/v1/tickets/${ticketId}`, { credentials: "include" });
    const attachmentResponse = await fetch(`${apiUrl}/api/v1/attachments/${attachmentId}/download`, {
      credentials: "include",
    });
    return {
      ticket: ticketResponse.status,
      attachment: attachmentResponse.status,
    };
  }, { apiUrl: API_URL, ...ownedIds });
  expect(crossRequesterStatuses).toEqual({ ticket: 404, attachment: 404 });
});
