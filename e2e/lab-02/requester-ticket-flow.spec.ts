import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API_URL = "http://127.0.0.1:3001";
const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = path.resolve("../artifacts/lab-02/screenshots");

test("E1-E8 requester create/list/detail/isolation/priority/attachment/responsive/navigation lifecycle", async ({ page, request }) => {
  const unique = `Lab 2 Final Evidence ${Date.now()}`;
  const attachmentName = "e2e-evidence.pdf";

  async function expectNoHorizontalOverflow() {
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBeFalsy();
  }

  async function capture(name: string) {
    if (!CAPTURE_EVIDENCE) return;
    await mkdir(EVIDENCE_DIR, { recursive: true });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, name), fullPage: true });
  }

  const requestersResponse = await request.get(`${API_URL}/api/v1/requesters`);
  expect(requestersResponse.ok()).toBeTruthy();
  const requesters = await requestersResponse.json();
  const somchai = requesters.find((r: { name: string }) => r.name === "Somchai Jaidee");
  const somsri = requesters.find((r: { name: string }) => r.name === "Somsri Rakdee");
  expect(somchai).toBeTruthy();
  expect(somsri).toBeTruthy();

  // E-1: choose the acting Development Requester.
  await page.goto("/");
  await page.setViewportSize({ width: 1280, height: 800 });
  await capture("01-requester-selection-desktop.png");
  await expect(page.getByRole("navigation", { name: "Utility navigation" }).getByRole("button", { name: "Check System" })).toBeVisible();
  await page.getByRole("navigation", { name: "Utility navigation" }).getByRole("button", { name: "Check System" }).click();
  await expect(page.getByText("System Status: Online")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByRole("menuitem", { name: /Check System/i })).toBeVisible();
  await capture("02-requester-selection-mobile-menu.png");
  await page.getByRole("button", { name: "Close navigation menu" }).click();

  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 820, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow();
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByLabel(/Development Requester/i).selectOption(String(somchai.id));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.getByLabel(/Requester menu for Somchai Jaidee/i)).toBeVisible();

  // E-8: System Check remains reachable in the Zen Green shell. Desktop shows
  // it directly in the navbar; mobile exposes the same destination in the
  // hamburger menu without adding page-level horizontal overflow.
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Check System" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByRole("menuitem", { name: /Check System/i })).toBeVisible();
  await page.getByRole("menuitem", { name: /Check System/i }).click();
  await expect(page.getByRole("heading", { name: "System Check" })).toBeVisible();
  await expectNoHorizontalOverflow();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();

  // E-2: create a ticket with an attachment, then find it in My Tickets.
  await page.getByRole("button", { name: "Create Ticket" }).first().click();
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 820, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow();
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByLabel(/Category/).selectOption({ label: "Software" });
  await page.getByLabel(/Related System/).selectOption({ label: "Report Portal" });
  await page.getByLabel(/Requested Priority/).selectOption("High");
  await page.getByLabel(/Summary/).fill(unique);
  await page.getByLabel(/Description/).fill("Playwright E2E ticket for final Lab 2 release evidence.");
  await page.getByLabel(/Attachments/i).setInputFiles({
    name: attachmentName,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nTokTickIT Lab 2 final E2E evidence\n"),
  });
  await capture("03-create-ticket-desktop.png");
  await page.setViewportSize({ width: 820, height: 1000 });
  await capture("04-create-ticket-tablet.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("05-create-ticket-mobile.png");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole("button", { name: "Create Ticket" }).last().click();
  await expect(page.getByText("Ticket created successfully")).toBeVisible();
  await capture("06-create-ticket-success.png");

  await page.getByRole("button", { name: "My Tickets" }).last().click();
  await page.getByLabel("Search").fill(unique);
  await expect(page.getByText(unique).first()).toBeVisible();
  await expect(page.getByText("High").first()).toBeVisible();
  await capture("07-my-tickets-desktop.png");

  // E-7: My Tickets keeps the table on desktop/tablet, switches to cards on
  // mobile, and never introduces page-level horizontal scrolling.
  await page.setViewportSize({ width: 820, height: 1000 });
  await expect(page.locator(".ticket-table-card")).toBeVisible();
  await expectNoHorizontalOverflow();
  await capture("08-my-tickets-tablet.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".ticket-mobile-card").first()).toBeVisible();
  await expectNoHorizontalOverflow();
  await capture("09-my-tickets-mobile.png");
  await page.setViewportSize({ width: 1280, height: 800 });

  const ownList = await request.get(
    `${API_URL}/api/v1/tickets?search=${encodeURIComponent(unique)}`,
    { headers: { "X-Dev-Requester-Id": String(somchai.id) } },
  );
  expect(ownList.ok()).toBeTruthy();
  const ownListBody = await ownList.json();
  expect(ownListBody.items).toHaveLength(1);
  expect(ownListBody.items[0].requestedPriority).toBe("High");
  const ticketId = ownListBody.items[0].id as number;
  const ticketNumber = ownListBody.items[0].ticketNumber as string;

  // The same My Tickets search box also finds the ticket by Ticket Number.
  await page.getByLabel("Search").fill(ticketNumber);
  await expect(page.getByText(unique).first()).toBeVisible();

  // E-3: open the owned ticket detail and download the active attachment.
  await page.getByRole("button", { name: `Open ${ticketNumber}` }).first().click();
  await expect(page.getByText(ticketNumber)).toBeVisible();
  await expect(page.getByText("Requested Priority")).toBeVisible();
  await expect(page.getByText("High")).toBeVisible();
  await expect(page.getByText(attachmentName)).toBeVisible();
  await capture("10-ticket-detail-active-desktop.png");

  // Responsive smoke checks for S4: the page must not introduce horizontal
  // scrolling at the Lab 2 desktop/tablet/mobile breakpoints.
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 820, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("11-ticket-detail-active-mobile.png");
  await page.setViewportSize({ width: 1280, height: 800 });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: `Download ${attachmentName}` }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(attachmentName);

  const detailBeforeRemove = await request.get(`${API_URL}/api/v1/tickets/${ticketId}`, {
    headers: { "X-Dev-Requester-Id": String(somchai.id) },
  });
  expect(detailBeforeRemove.ok()).toBeTruthy();
  const detailBeforeRemoveBody = await detailBeforeRemove.json();
  const attachmentId = detailBeforeRemoveBody.attachments.find(
    (a: { fileName: string }) => a.fileName === attachmentName,
  ).id as number;

  // E-5: soft-remove with a recorded reason; metadata stays, UI actions
  // disappear, and direct download is blocked.
  const removalReason = "E2E evidence cleanup";
  page.on("dialog", async (dialog) => {
    if (dialog.type() === "prompt") {
      await dialog.accept(removalReason);
    } else {
      await dialog.accept();
    }
  });
  await page.getByRole("button", { name: `Remove ${attachmentName}` }).click();
  await expect(page.getByText("Attachment removed successfully")).toBeVisible();
  const attachmentRow = page.getByTestId(`attachment-${attachmentId}`);
  await expect(attachmentRow).toContainText("Removed");
  await expect(attachmentRow).toContainText(`Removal reason: ${removalReason}`);
  await expect(attachmentRow.getByRole("button")).toHaveCount(0);
  await capture("12-ticket-detail-removed-reason.png");

  const blockedDownload = await request.get(`${API_URL}/api/v1/attachments/${attachmentId}/download`, {
    headers: { "X-Dev-Requester-Id": String(somchai.id) },
  });
  expect(blockedDownload.status()).toBe(409);

  // E-4: another requester cannot see/list/read the ticket.
  const otherDetail = await request.get(`${API_URL}/api/v1/tickets/${ticketId}`, {
    headers: { "X-Dev-Requester-Id": String(somsri.id) },
  });
  expect(otherDetail.status()).toBe(404);

  if (CAPTURE_EVIDENCE) {
    await mkdir(EVIDENCE_DIR, { recursive: true });
    await writeFile(
      path.join(EVIDENCE_DIR, "13-api-ownership-removal-evidence.json"),
      JSON.stringify({
        ticketNumber,
        requestedPriority: ownListBody.items[0].requestedPriority,
        activeAttachmentDownloadSuggestedFilename: download.suggestedFilename(),
        removalReason,
        removedAttachmentDownloadStatus: blockedDownload.status(),
        otherRequesterTicketDetailStatus: otherDetail.status(),
      }, null, 2) + "\n",
      "utf8",
    );
  }

  await page.getByLabel(/Requester menu for Somchai Jaidee/i).click();
  await page.getByRole("button", { name: "Switch" }).click();
  await page.getByLabel(/Development Requester/i).selectOption(String(somsri.id));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Search").fill(unique);
  await expect(page.getByText("No results")).toBeVisible();
  await capture("14-requester-isolation-no-results.png");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("No tickets yet")).toBeVisible();
  await capture("15-my-tickets-empty-state.png");
});
