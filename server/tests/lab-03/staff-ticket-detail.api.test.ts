import crypto from "node:crypto";
import { UserRole } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import {
  resetAttachmentStorageForTests,
  setAttachmentStorageForTests,
} from "../../src/attachmentStorage.js";
import {
  cleanupTestUsers,
  createSessionCookie,
  createTestUser,
  TEST_ORIGIN,
} from "./testAuth.js";

describe("Lab 3 IT Staff Ticket Detail and operations", () => {
  const ticketIds: number[] = [];
  const userIds: number[] = [];
  let categoryId = 0;
  let relatedSystemId = 0;
  let requesterId = 0;
  let requesterCookie = "";
  let staffId = 0;
  let staffCookie = "";
  let otherStaffId = 0;
  let otherStaffCookie = "";
  let adminId = 0;
  let adminCookie = "";
  let inactiveStaffId = 0;

  async function createTicket(options: {
    status?: string;
    ownerId?: number | null;
    requestedPriority?: string | null;
    itPriority?: string | null;
    problemAppearsResolvedAt?: Date | null;
  } = {}) {
    const ticket = await getPrisma().ticket.create({
      data: {
        ticketNumber: `LAB3-ST-${crypto.randomUUID()}`,
        summary: "Staff detail integration test",
        description: "Operational Ticket Detail test fixture.",
        requestedPriority: options.requestedPriority === undefined ? "Medium" : options.requestedPriority,
        itPriority: options.itPriority === undefined ? "Medium" : options.itPriority,
        status: options.status ?? "New",
        problemAppearsResolvedAt: options.problemAppearsResolvedAt ?? null,
        requesterId,
        ownerId: options.ownerId ?? null,
        categoryId,
        relatedSystemId,
      },
    });
    ticketIds.push(ticket.id);
    return ticket;
  }

  beforeAll(async () => {
    const prisma = getPrisma();
    const [category, relatedSystem] = await Promise.all([
      prisma.category.findFirst({ orderBy: { id: "asc" } }),
      prisma.relatedSystem.findFirst({ orderBy: { id: "asc" } }),
    ]);
    if (!category || !relatedSystem) throw new Error("Reference data must be seeded before Staff Detail tests");
    categoryId = category.id;
    relatedSystemId = relatedSystem.id;

    const [requester, staff, otherStaff, admin, inactiveStaff] = await Promise.all([
      createTestUser({ name: "Staff Detail Requester" }),
      createTestUser({ name: "Staff Detail Agent", role: UserRole.IT_STAFF }),
      createTestUser({ name: "Staff Detail Other", role: UserRole.IT_STAFF }),
      createTestUser({ name: "Staff Detail Admin", role: UserRole.ADMINISTRATOR }),
      createTestUser({ name: "Staff Detail Inactive", role: UserRole.IT_STAFF, isActive: false }),
    ]);
    userIds.push(requester.id, staff.id, otherStaff.id, admin.id, inactiveStaff.id);
    requesterId = requester.id;
    staffId = staff.id;
    otherStaffId = otherStaff.id;
    adminId = admin.id;
    inactiveStaffId = inactiveStaff.id;
    [requesterCookie, staffCookie, otherStaffCookie, adminCookie] = await Promise.all([
      createSessionCookie(requester.id).then((s) => s.cookie),
      createSessionCookie(staff.id).then((s) => s.cookie),
      createSessionCookie(otherStaff.id).then((s) => s.cookie),
      createSessionCookie(admin.id).then((s) => s.cookie),
    ]);
  });

  afterEach(async () => {
    if (!ticketIds.length) return;
    const ids = ticketIds.splice(0, ticketIds.length);
    const prisma = getPrisma();
    await prisma.publicComment.deleteMany({ where: { ticketId: { in: ids } } });
    await prisma.internalNote.deleteMany({ where: { ticketId: { in: ids } } });
    await prisma.attachment.deleteMany({ where: { ticketId: { in: ids } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
  });

  afterAll(async () => {
    await cleanupTestUsers(userIds);
  });

  it("ST-01: Staff/Admin opens operational detail with attachment metadata but no embedded comments/notes", async () => {
    const ticket = await createTicket({ ownerId: otherStaffId });
    await getPrisma().attachment.createMany({
      data: [
        { ticketId: ticket.id, fileName: "active.txt", mimeType: "text/plain", sizeBytes: 5, storageKey: `test/${ticket.id}/active` },
        { ticketId: ticket.id, fileName: "removed.txt", mimeType: "text/plain", sizeBytes: 7, storageKey: `test/${ticket.id}/removed`, removedAt: new Date(), removalReason: "Duplicate" },
      ],
    });
    await getPrisma().publicComment.create({ data: { ticketId: ticket.id, authorId: requesterId, content: "Public" } });
    await getPrisma().internalNote.create({ data: { ticketId: ticket.id, authorId: staffId, content: "Private" } });

    for (const cookie of [staffCookie, adminCookie]) {
      const res = await request(app).get(`/api/v1/staff/tickets/${ticket.id}`).set("Cookie", cookie);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: ticket.id,
        requestedPriority: "Medium",
        itPriority: "Medium",
        status: "New",
        requester: { id: requesterId, email: expect.any(String) },
        owner: { id: otherStaffId },
        category: { id: categoryId },
        relatedSystem: { id: relatedSystemId },
      });
      expect(res.body.attachments).toHaveLength(2);
      expect(res.body.attachments[1]).toEqual(expect.objectContaining({ removedAt: expect.any(String), removalReason: "Duplicate" }));
      expect(res.body).not.toHaveProperty("publicComments");
      expect(res.body).not.toHaveProperty("internalNotes");
    }

    const requester = await request(app).get(`/api/v1/staff/tickets/${ticket.id}`).set("Cookie", requesterCookie);
    expect(requester.status).toBe(403);
  });

  it("ST-02: claims an unassigned Ticket for the authenticated Staff user", async () => {
    const ticket = await createTicket();
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${ticket.id}/owner`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", staffCookie)
      .send({ action: "claim" });
    expect(res.status).toBe(200);
    expect(res.body.owner).toMatchObject({ id: staffId, role: "IT_STAFF" });
    expect((await getPrisma().ticket.findUnique({ where: { id: ticket.id } }))?.ownerId).toBe(staffId);
  });

  it("owner concurrency: simultaneous claims cannot both overwrite the same unassigned Ticket", async () => {
    const ticket = await createTicket();
    const [first, second] = await Promise.all([
      request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/owner`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", staffCookie)
        .send({ action: "claim" }),
      request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/owner`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", otherStaffCookie)
        .send({ action: "claim" }),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    const persisted = await getPrisma().ticket.findUnique({ where: { id: ticket.id } });
    expect([staffId, otherStaffId]).toContain(persisted?.ownerId);
  });

  it("ST-03/ST-04: assigns or reassigns to active Staff and Administrator", async () => {
    const ticket = await createTicket({ ownerId: staffId });
    for (const ownerId of [otherStaffId, adminId]) {
      const res = await request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/owner`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", staffCookie)
        .send({ action: "assign", ownerId });
      expect(res.status).toBe(200);
      expect(res.body.owner.id).toBe(ownerId);
    }
  });

  it("ST-05/ST-06: rejects inactive Staff and Requester owner targets without mutation", async () => {
    for (const invalidOwnerId of [inactiveStaffId, requesterId]) {
      const ticket = await createTicket({ ownerId: staffId });
      const res = await request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/owner`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", staffCookie)
        .send({ action: "assign", ownerId: invalidOwnerId });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("OWNER_NOT_ELIGIBLE");
      expect((await getPrisma().ticket.findUnique({ where: { id: ticket.id } }))?.ownerId).toBe(staffId);
    }
  });

  it("owner mutation validation rejects malformed action/body and requester access", async () => {
    const ticket = await createTicket();
    const malformed = await request(app)
      .patch(`/api/v1/staff/tickets/${ticket.id}/owner`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", staffCookie)
      .send({ action: "claim", ownerId: otherStaffId });
    expect(malformed.status).toBe(400);

    const requester = await request(app)
      .patch(`/api/v1/staff/tickets/${ticket.id}/owner`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", requesterCookie)
      .send({ action: "claim" });
    expect(requester.status).toBe(403);
  });

  it("ST-08: updates IT Priority without changing Requested Priority", async () => {
    const ticket = await createTicket({ requestedPriority: "Low", itPriority: "Low" });
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${ticket.id}/it-priority`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", adminCookie)
      .send({ itPriority: "High" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ requestedPriority: "Low", itPriority: "High" });
    const persisted = await getPrisma().ticket.findUnique({ where: { id: ticket.id } });
    expect(persisted?.requestedPriority).toBe("Low");
    expect(persisted?.itPriority).toBe("High");
  });

  it("ST-09: rejects invalid IT Priority with no mutation", async () => {
    const ticket = await createTicket({ itPriority: "Medium" });
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${ticket.id}/it-priority`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", staffCookie)
      .send({ itPriority: "Urgent" });
    expect(res.status).toBe(400);
    expect((await getPrisma().ticket.findUnique({ where: { id: ticket.id } }))?.itPriority).toBe("Medium");
  });

  it("ST-10: every approved status transition succeeds", async () => {
    const matrix: Record<string, string[]> = {
      New: ["Open", "Cancelled"],
      Open: ["In Progress", "Waiting for Requester", "Resolved", "Cancelled"],
      "In Progress": ["Waiting for Requester", "Resolved", "Cancelled"],
      "Waiting for Requester": ["In Progress", "Resolved", "Cancelled"],
      Resolved: ["Closed", "Reopened"],
      Closed: ["Reopened"],
      Reopened: ["In Progress", "Waiting for Requester", "Resolved", "Cancelled"],
      Cancelled: ["Reopened"],
    };
    for (const [from, targets] of Object.entries(matrix)) {
      for (const target of targets) {
        const ticket = await createTicket({ status: from });
        const res = await request(app)
          .patch(`/api/v1/staff/tickets/${ticket.id}/status`)
          .set("Origin", TEST_ORIGIN)
          .set("Cookie", staffCookie)
          .send({ status: target });
        expect(res.status, `${from} -> ${target}`).toBe(200);
        expect(res.body.status).toBe(target);
      }
    }
  });

  it("ST-11: representative forbidden and self transitions return 409 without mutation", async () => {
    for (const [from, target] of [["New", "Resolved"], ["Open", "Open"], ["Closed", "Open"], ["Cancelled", "Closed"]]) {
      const ticket = await createTicket({ status: from });
      const res = await request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/status`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", staffCookie)
        .send({ status: target });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
      expect((await getPrisma().ticket.findUnique({ where: { id: ticket.id } }))?.status).toBe(from);
    }
  });

  it("COM-10: Requester cannot call the Staff status-transition endpoint", async () => {
    const ticket = await createTicket({ status: "Open" });
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${ticket.id}/status`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", requesterCookie)
      .send({ status: "In Progress" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect((await getPrisma().ticket.findUnique({ where: { id: ticket.id } }))?.status).toBe("Open");
  });

  it("ST-12: unknown status returns 400", async () => {
    const ticket = await createTicket({ status: "Open" });
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${ticket.id}/status`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", staffCookie)
      .send({ status: "Escalated" });
    expect(res.status).toBe(400);
    expect((await getPrisma().ticket.findUnique({ where: { id: ticket.id } }))?.status).toBe("Open");
  });

  it("ST-13: operational detail exposes resolution indication and Reopened clears it atomically", async () => {
    const indicatedAt = new Date("2026-09-17T00:00:00.000Z");
    const ticket = await createTicket({ status: "Resolved", problemAppearsResolvedAt: indicatedAt });
    const before = await request(app).get(`/api/v1/staff/tickets/${ticket.id}`).set("Cookie", staffCookie);
    expect(before.body.problemAppearsResolvedAt).toBe(indicatedAt.toISOString());

    const reopen = await request(app)
      .patch(`/api/v1/staff/tickets/${ticket.id}/status`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", staffCookie)
      .send({ status: "Reopened" });
    expect(reopen.status).toBe(200);
    expect(reopen.body).toMatchObject({ status: "Reopened", problemAppearsResolvedAt: null });
    const persisted = await getPrisma().ticket.findUnique({ where: { id: ticket.id } });
    expect(persisted?.problemAppearsResolvedAt).toBeNull();
  });

  it("ST-14: historical null Requested/IT Priority remains readable", async () => {
    const ticket = await createTicket({ requestedPriority: null, itPriority: null });
    const res = await request(app).get(`/api/v1/staff/tickets/${ticket.id}`).set("Cookie", otherStaffCookie);
    expect(res.status).toBe(200);
    expect(res.body.requestedPriority).toBeNull();
    expect(res.body.itPriority).toBeNull();
  });

  it("AZ-12/AZ-13: Staff/Admin may download active attachments but cannot upload or soft-remove them", async () => {
    const ticket = await createTicket();
    const body = Buffer.from("staff-visible attachment");
    const attachment = await getPrisma().attachment.create({
      data: {
        ticketId: ticket.id,
        fileName: "staff-visible.txt",
        mimeType: "text/plain",
        sizeBytes: body.length,
        storageKey: `test/${ticket.id}/staff-visible`,
      },
    });
    setAttachmentStorageForTests({
      async put() {},
      async get(key) {
        if (key !== attachment.storageKey) throw new Error("missing object");
        return Buffer.from(body);
      },
      async delete() {},
    });

    try {
      for (const cookie of [staffCookie, adminCookie]) {
        const download = await request(app)
          .get(`/api/v1/attachments/${attachment.id}/download`)
          .set("Cookie", cookie);
        expect(download.status).toBe(200);
        expect(download.headers["content-type"]).toMatch(/text\/plain/);
        expect(download.headers["content-disposition"]).toMatch(/staff-visible\.txt/);
      }

      const upload = await request(app)
        .post(`/api/v1/tickets/${ticket.id}/attachments`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", staffCookie)
        .attach("files", Buffer.from("blocked"), { filename: "blocked.txt", contentType: "text/plain" });
      expect(upload.status).toBe(403);

      const remove = await request(app)
        .delete(`/api/v1/attachments/${attachment.id}`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", adminCookie)
        .send({ reason: "Staff must not remove Requester evidence" });
      expect(remove.status).toBe(403);
      expect((await getPrisma().attachment.findUnique({ where: { id: attachment.id } }))?.removedAt).toBeNull();
    } finally {
      resetAttachmentStorageForTests();
    }
  });

  it("security: every Staff mutation rejects missing/null/wrong Origin before mutation", async () => {
    for (const origin of [undefined, "null", "http://evil.example"] as const) {
      const ticket = await createTicket({ status: "New", itPriority: "Medium" });
      let pending = request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/it-priority`)
        .set("Cookie", staffCookie);
      if (origin !== undefined) pending = pending.set("Origin", origin);
      const res = await pending.send({ itPriority: "High" });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ORIGIN_FORBIDDEN");
      expect((await getPrisma().ticket.findUnique({ where: { id: ticket.id } }))?.itPriority).toBe("Medium");
    }
  });
});
