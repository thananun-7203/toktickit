import { expect, test, type Page, type Route } from "@playwright/test";
import {
  API_URL,
  createDedicatedE2eUsers,
  logoutFromUserMenu,
  signIn,
  signInAndCompleteMandatoryChange,
} from "./fullstack-fixtures.js";

const staffUser = {
  id: 200,
  name: "Narin Support",
  email: "narin.staff@toktick.it",
  isActive: true,
  role: "IT_STAFF",
  mustChangePassword: false,
};

const otherStaff = {
  id: 201,
  name: "Patchara Support",
  email: "patchara.staff@toktick.it",
  role: "IT_STAFF",
};

const initialTicket = {
  id: 501,
  ticketNumber: "TKT-2026-00501",
  summary: "Cannot access internal system",
  description: "Requester receives Access Denied even though the account should have access.",
  requestedPriority: "High",
  itPriority: "Medium",
  status: "In Progress",
  problemAppearsResolvedAt: "2026-09-17T08:15:00.000Z",
  createdAt: "2026-09-15T08:00:00.000Z",
  updatedAt: "2026-09-16T09:30:00.000Z",
  requester: { id: 10, name: "Somsri Rakdee", email: "somsri@toktick.it" },
  category: { id: 1, name: "Access / Permissions" },
  relatedSystem: { id: 2, name: "Internal Portal" },
  owner: otherStaff,
  attachments: [
    { id: 70, fileName: "error-screenshot.png", mimeType: "image/png", sizeBytes: 245000, removedAt: null, removalReason: null },
    { id: 71, fileName: "old-log.pdf", mimeType: "application/pdf", sizeBytes: 2048, removedAt: "2026-09-16T10:00:00.000Z", removalReason: "Duplicate" },
  ],
};

async function fulfillJson(route: Route, json: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(json) });
}

async function installStaffFlowApi(page: Page) {
  let authenticated = false;
  let ticket = structuredClone(initialTicket);
  let publicComments = [
    { id: 1, content: "Requester-visible update", createdAt: "2026-09-16T11:00:00.000Z", author: staffUser },
  ];
  let internalNotes = [
    { id: 2, content: "Private operational context", createdAt: "2026-09-16T11:30:00.000Z", author: otherStaff },
  ];

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
      await fulfillJson(route, staffUser);
      return;
    }

    if (path === "/api/v1/auth/login" && method === "POST") {
      authenticated = true;
      await fulfillJson(route, { user: staffUser, nextAction: "APPLICATION" });
      return;
    }

    if (path === "/api/v1/categories") {
      await fulfillJson(route, [{ id: 1, name: "Access / Permissions" }]);
      return;
    }
    if (path === "/api/v1/related-systems") {
      await fulfillJson(route, [{ id: 2, name: "Internal Portal" }]);
      return;
    }
    if (path === "/api/v1/staff/assignees") {
      await fulfillJson(route, [staffUser, otherStaff]);
      return;
    }

    if (path === "/api/v1/staff/tickets" && method === "GET") {
      await fulfillJson(route, { items: [ticket], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 });
      return;
    }

    if (path === "/api/v1/staff/tickets/501" && method === "GET") {
      await fulfillJson(route, ticket);
      return;
    }

    if (path === "/api/v1/staff/tickets/501/owner" && method === "PATCH") {
      const body = JSON.parse(request.postData() ?? "{}") as { action?: string; ownerId?: number };
      ticket = {
        ...ticket,
        owner: body.action === "claim" ? staffUser : body.ownerId === otherStaff.id ? otherStaff : staffUser,
        updatedAt: "2026-09-17T09:00:00.000Z",
      };
      await fulfillJson(route, { id: ticket.id, owner: ticket.owner, updatedAt: ticket.updatedAt });
      return;
    }

    if (path === "/api/v1/staff/tickets/501/it-priority" && method === "PATCH") {
      const body = JSON.parse(request.postData() ?? "{}") as { itPriority: "Low" | "Medium" | "High" };
      ticket = { ...ticket, itPriority: body.itPriority, updatedAt: "2026-09-17T09:05:00.000Z" };
      await fulfillJson(route, {
        id: ticket.id,
        requestedPriority: ticket.requestedPriority,
        itPriority: ticket.itPriority,
        updatedAt: ticket.updatedAt,
      });
      return;
    }

    if (path === "/api/v1/staff/tickets/501/status" && method === "PATCH") {
      const body = JSON.parse(request.postData() ?? "{}") as { status: string };
      ticket = { ...ticket, status: body.status, updatedAt: "2026-09-17T09:10:00.000Z" };
      await fulfillJson(route, {
        id: ticket.id,
        status: ticket.status,
        problemAppearsResolvedAt: ticket.problemAppearsResolvedAt,
        updatedAt: ticket.updatedAt,
      });
      return;
    }

    if (path === "/api/v1/tickets/501/public-comments" && method === "GET") {
      await fulfillJson(route, { items: publicComments });
      return;
    }
    if (path === "/api/v1/tickets/501/public-comments" && method === "POST") {
      const body = JSON.parse(request.postData() ?? "{}") as { content: string };
      const created = { id: 3, content: body.content, createdAt: "2026-09-17T09:15:00.000Z", author: staffUser };
      publicComments = [...publicComments, created];
      await fulfillJson(route, created, 201);
      return;
    }

    if (path === "/api/v1/staff/tickets/501/internal-notes" && method === "GET") {
      await fulfillJson(route, {
        items: internalNotes,
        page: 1,
        pageSize: 20,
        totalItems: internalNotes.length,
        totalPages: internalNotes.length === 0 ? 0 : 1,
      });
      return;
    }
    if (path === "/api/v1/staff/tickets/501/internal-notes" && method === "POST") {
      const body = JSON.parse(request.postData() ?? "{}") as { content: string };
      const created = { id: 4, content: body.content, createdAt: "2026-09-17T09:20:00.000Z", author: staffUser };
      internalNotes = [...internalNotes, created];
      await fulfillJson(route, created, 201);
      return;
    }

    if (path === "/api/v1/attachments/70/download" && method === "GET") {
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": 'attachment; filename="error-screenshot.png"',
        },
        body: Buffer.from("mock attachment"),
      });
      return;
    }

    await fulfillJson(route, { error: { message: `Unhandled mocked API ${method} ${path}` } }, 500);
  });
}

test("Staff browser UI flow smoke covers the Ticket Detail operational workflow", async ({ page }) => {
  await installStaffFlowApi(page);
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  await page.getByLabel("Email address").fill(staffUser.email);
  await page.locator("#login-password").fill("ValidPassword123!");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  await page.getByLabel("Search").fill("internal system");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByLabel("Status").selectOption("In Progress");
  await page.getByRole("button", { name: `Open ${initialTicket.ticketNumber}` }).click();

  await expect(page.getByRole("heading", { name: initialTicket.ticketNumber })).toBeVisible();
  await page.getByRole("button", { name: "Claim" }).click();
  await expect(page.getByText("Ticket ownership updated.")).toBeVisible();

  await page.getByLabel("Assign / Reassign").selectOption(String(otherStaff.id));
  await page.getByRole("button", { name: "Reassign" }).click();
  await expect(page.getByText("Ticket reassigned successfully.")).toBeVisible();

  await page.getByLabel("IT Priority").selectOption("High");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("IT Priority saved.")).toBeVisible();

  await page.getByLabel("Status").selectOption("Resolved");
  await page.getByRole("button", { name: "Change" }).click();
  await expect(page.getByText("Status changed to Resolved.")).toBeVisible();

  await page.getByLabel("Add a public comment").fill("Public resolution update");
  await page.getByRole("button", { name: "Add Comment" }).click();
  await expect(page.getByText("Public resolution update")).toBeVisible();

  await page.getByLabel("Add an internal note").fill("Private troubleshooting note");
  await page.getByRole("button", { name: "Add Note" }).click();
  await expect(page.getByText("Private troubleshooting note")).toBeVisible();

  await expect(page.getByText("error-screenshot.png")).toBeVisible();
  await expect(page.getByText("old-log.pdf")).toBeVisible();
  await expect(page.getByText(/Removed · Duplicate/)).toBeVisible();
  await page.getByRole("button", { name: /Download/ }).click();
});

test("E2E-STAFF-01/02 full-stack Staff workflow and authorization boundaries", async ({ page }, testInfo) => {
  const suffix = `staff-${Date.now()}-${testInfo.retry}-${testInfo.workerIndex}`;
  const users = createDedicatedE2eUsers(suffix);
  const requesterPassword = `RequesterStaffE2E${Date.now()}9A`;
  const staffPassword = `StaffWorkflowE2E${Date.now()}8B`;
  const summary = `Issue 39 Staff full-stack ${Date.now()}`;
  const attachmentName = "issue39-staff-fullstack.pdf";

  await signInAndCompleteMandatoryChange(
    page,
    users.requesterOneEmail,
    users.initialPassword,
    requesterPassword,
    "My Tickets",
  );
  await page.getByRole("button", { name: "Create Ticket" }).first().click();
  await page.getByLabel(/Category/).selectOption({ label: "Software" });
  await page.getByLabel(/Related System/).selectOption({ label: "CRM" });
  await page.getByLabel(/Requested Priority/).selectOption("High");
  await page.getByLabel(/Summary/).fill(summary);
  await page.getByLabel(/Description/).fill("Full-stack Staff E2E ticket created by an authenticated Requester.");
  await page.getByLabel(/Attachments/i).setInputFiles({
    name: attachmentName,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nTokTickIT Issue 39 Staff full-stack E2E\n"),
  });
  await page.locator("form").getByRole("button", { name: /Create Ticket/ }).click();
  await expect(page.getByText("Ticket created successfully")).toBeVisible();

  const ticketId = await page.evaluate(async ({ apiUrl, uniqueSummary }) => {
    const response = await fetch(`${apiUrl}/api/v1/tickets?search=${encodeURIComponent(uniqueSummary)}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error(`Unable to resolve requester ticket: ${response.status}`);
    const body = await response.json() as { items: Array<{ id: number }> };
    if (!body.items[0]) throw new Error("Requester ticket missing from list");
    return body.items[0].id;
  }, { apiUrl: API_URL, uniqueSummary: summary });

  await logoutFromUserMenu(page, "E2E Requester One");
  await signInAndCompleteMandatoryChange(
    page,
    users.staffOneEmail,
    users.initialPassword,
    staffPassword,
    "Ticket Queue",
  );

  await page.getByLabel("Search").fill(summary);
  await page.getByRole("button", { name: "Search" }).click();
  const open = page.getByRole("button", { name: /^Open TKT-/ }).first();
  await expect(open).toBeVisible();
  await open.click();

  await page.getByRole("button", { name: "Claim" }).click();
  await expect(page.getByText("Ticket ownership updated.")).toBeVisible();

  await page.getByLabel("Assign / Reassign").selectOption({ label: "E2E Staff Two (IT_STAFF)" });
  await page.getByRole("button", { name: "Reassign" }).click();
  await expect(page.getByText("Ticket reassigned successfully.")).toBeVisible();

  await page.getByLabel("IT Priority").selectOption("Low");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("IT Priority saved.")).toBeVisible();

  await page.getByLabel("Status").selectOption("Open");
  await page.getByRole("button", { name: "Change" }).click();
  await expect(page.getByText("Status changed to Open.")).toBeVisible();
  await page.getByLabel("Status").selectOption("In Progress");
  await page.getByRole("button", { name: "Change" }).click();
  await expect(page.getByText("Status changed to In Progress.")).toBeVisible();

  const publicText = `Full-stack public update ${Date.now()}`;
  const privateText = `Full-stack private note ${Date.now()}`;
  await page.getByLabel("Add a public comment").fill(publicText);
  await page.getByRole("button", { name: "Add Comment" }).click();
  await expect(page.getByText(publicText)).toBeVisible();
  await page.getByLabel("Add an internal note").fill(privateText);
  await page.getByRole("button", { name: "Add Note" }).click();
  await expect(page.getByText(privateText)).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(attachmentName);

  const invalidTransition = await page.evaluate(async ({ apiUrl, id }) => {
    const response = await fetch(`${apiUrl}/api/v1/staff/tickets/${id}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "New" }),
    });
    return { status: response.status, body: await response.json() };
  }, { apiUrl: API_URL, id: ticketId });
  expect(invalidTransition.status).toBe(409);
  expect((invalidTransition.body as { error?: { code?: string } }).error?.code).toBe("INVALID_STATUS_TRANSITION");

  await logoutFromUserMenu(page, "E2E Staff One");
  await signIn(page, users.requesterOneEmail, requesterPassword);
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  const forbiddenNotes = await page.evaluate(async ({ apiUrl, id }) => {
    const response = await fetch(`${apiUrl}/api/v1/staff/tickets/${id}/internal-notes`, { credentials: "include" });
    const body = await response.json();
    return { status: response.status, body };
  }, { apiUrl: API_URL, id: ticketId });
  expect(forbiddenNotes.status).toBe(403);
  expect(JSON.stringify(forbiddenNotes.body)).not.toContain(privateText);
});
