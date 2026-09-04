import { expect, test } from "@playwright/test";

const API_URL = "http://127.0.0.1:3001";

test("E1-E5 requester create/list/detail/isolation/attachment lifecycle", async ({ page, request }) => {
  const unique = `E2E Issue5 ${Date.now()}`;
  const attachmentName = "e2e-evidence.pdf";

  const requestersResponse = await request.get(`${API_URL}/api/v1/requesters`);
  expect(requestersResponse.ok()).toBeTruthy();
  const requesters = await requestersResponse.json();
  const somchai = requesters.find((r: { name: string }) => r.name === "Somchai Jaidee");
  const somsri = requesters.find((r: { name: string }) => r.name === "Somsri Rakdee");
  expect(somchai).toBeTruthy();
  expect(somsri).toBeTruthy();

  // E-1: choose the acting Development Requester.
  await page.goto("/");
  await page.getByLabel(/Somchai Jaidee/i).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.getByText("Somchai Jaidee", { exact: true })).toBeVisible();

  // E-2: create a ticket with an attachment, then find it in My Tickets.
  await page.getByRole("button", { name: "Create Ticket" }).first().click();
  await page.getByLabel(/Category/).selectOption({ label: "Software" });
  await page.getByLabel(/Related System/).selectOption({ label: "Report Portal" });
  await page.getByLabel(/Summary/).fill(unique);
  await page.getByLabel(/Description/).fill("Playwright E2E ticket for Issue 5 attachment lifecycle.");
  await page.getByLabel(/Attachments/i).setInputFiles({
    name: attachmentName,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nTokTickIT Issue 5 E2E evidence\n"),
  });
  await page.getByRole("button", { name: "Create Ticket" }).last().click();
  await expect(page.getByText("Ticket created successfully")).toBeVisible();

  await page.getByRole("button", { name: "My Tickets" }).last().click();
  await page.getByLabel("Search").fill(unique);
  await expect(page.getByText(unique).first()).toBeVisible();

  const ownList = await request.get(
    `${API_URL}/api/v1/tickets?search=${encodeURIComponent(unique)}`,
    { headers: { "X-Dev-Requester-Id": String(somchai.id) } },
  );
  expect(ownList.ok()).toBeTruthy();
  const ownListBody = await ownList.json();
  expect(ownListBody.items).toHaveLength(1);
  const ticketId = ownListBody.items[0].id as number;
  const ticketNumber = ownListBody.items[0].ticketNumber as string;

  // E-3: open the owned ticket detail and download the active attachment.
  await page.getByRole("button", { name: `Open ${ticketNumber}` }).first().click();
  await expect(page.getByText(ticketNumber)).toBeVisible();
  await expect(page.getByText(attachmentName)).toBeVisible();

  // Responsive smoke checks for S4: the page must not introduce horizontal
  // scrolling at the Lab 2 desktop/tablet/mobile breakpoints.
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 820, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBeFalsy();
  }
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

  const blockedDownload = await request.get(`${API_URL}/api/v1/attachments/${attachmentId}/download`, {
    headers: { "X-Dev-Requester-Id": String(somchai.id) },
  });
  expect(blockedDownload.status()).toBe(409);

  // E-4: another requester cannot see/list/read the ticket.
  const otherDetail = await request.get(`${API_URL}/api/v1/tickets/${ticketId}`, {
    headers: { "X-Dev-Requester-Id": String(somsri.id) },
  });
  expect(otherDetail.status()).toBe(404);

  await page.getByRole("button", { name: "Switch" }).click();
  await page.getByLabel(/Somsri Rakdee/i).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Search").fill(unique);
  await expect(page.getByText("No results")).toBeVisible();
});
