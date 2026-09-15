import crypto from "node:crypto";
import { UserRole } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import {
  cleanupTestUsers,
  createSessionCookie,
  createTestUser,
  TEST_ORIGIN,
} from "./testAuth.js";

let requesterAId = 0;
let requesterBId = 0;
let staffId = 0;
let adminId = 0;
let requesterACookie = "";
let requesterBCookie = "";
let staffCookie = "";
let adminCookie = "";
let categoryId = 0;
let relatedSystemId = 0;
const ticketIds: number[] = [];

async function createTicket(status = "New", requesterId = requesterAId) {
  const ticket = await getPrisma().ticket.create({
    data: {
      ticketNumber: `LAB3-COM-${crypto.randomUUID()}`,
      summary: `Comments test ${status}`,
      description: "Ticket used to verify requester public comments and resolution indication.",
      requestedPriority: "Medium",
      itPriority: "Medium",
      status,
      requesterId,
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
  if (!category || !relatedSystem) throw new Error("Reference data must be seeded before comments tests");
  categoryId = category.id;
  relatedSystemId = relatedSystem.id;

  const [requesterA, requesterB, staff, admin] = await Promise.all([
    createTestUser({ name: "Comment Requester A", mustChangePassword: false }),
    createTestUser({ name: "Comment Requester B", mustChangePassword: false }),
    createTestUser({ name: "Comment Staff", role: UserRole.IT_STAFF, mustChangePassword: false }),
    createTestUser({ name: "Comment Admin", role: UserRole.ADMINISTRATOR, mustChangePassword: false }),
  ]);
  requesterAId = requesterA.id;
  requesterBId = requesterB.id;
  staffId = staff.id;
  adminId = admin.id;

  [requesterACookie, requesterBCookie, staffCookie, adminCookie] = await Promise.all([
    createSessionCookie(requesterAId).then((session) => session.cookie),
    createSessionCookie(requesterBId).then((session) => session.cookie),
    createSessionCookie(staffId).then((session) => session.cookie),
    createSessionCookie(adminId).then((session) => session.cookie),
  ]);
});

afterEach(async () => {
  if (ticketIds.length === 0) return;
  const ids = ticketIds.splice(0, ticketIds.length);
  const prisma = getPrisma();
  await prisma.publicComment.deleteMany({ where: { ticketId: { in: ids } } });
  await prisma.internalNote.deleteMany({ where: { ticketId: { in: ids } } });
  await prisma.attachment.deleteMany({ where: { ticketId: { in: ids } } });
  await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
});

afterAll(async () => {
  await cleanupTestUsers([requesterAId, requesterBId, staffId, adminId].filter(Boolean));
});

describe("Lab 3 Public Comments", () => {
  it("COM-01/COM-02: Requester posts to own Ticket; backend assigns author/time and list is chronological", async () => {
    const ticket = await createTicket();
    const first = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/public-comments`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", requesterACookie)
      .send({ content: "  First requester update  " });
    const second = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/public-comments`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", requesterACookie)
      .send({ content: "Second requester update" });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.content).toBe("First requester update");
    expect(first.body.author).toMatchObject({ id: requesterAId, role: "REQUESTER" });
    expect(first.body.createdAt).toEqual(expect.any(String));

    const list = await request(app)
      .get(`/api/v1/tickets/${ticket.id}/public-comments`)
      .set("Cookie", requesterACookie);
    expect(list.status).toBe(200);
    expect(list.body.items.map((item: { id: number }) => item.id)).toEqual([first.body.id, second.body.id]);
  });

  it("COM-03: another Requester cannot read or post comments on a protected Ticket", async () => {
    const ticket = await createTicket();
    const read = await request(app)
      .get(`/api/v1/tickets/${ticket.id}/public-comments`)
      .set("Cookie", requesterBCookie);
    const post = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/public-comments`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", requesterBCookie)
      .send({ content: "Should stay hidden" });
    expect(read.status).toBe(404);
    expect(post.status).toBe(404);
    expect(await getPrisma().publicComment.count({ where: { ticketId: ticket.id } })).toBe(0);
  });

  it("COM-04/COM-05: IT Staff and Administrator may use the same public channel", async () => {
    const ticket = await createTicket();
    for (const [cookie, role] of [[staffCookie, "IT_STAFF"], [adminCookie, "ADMINISTRATOR"]] as const) {
      const post = await request(app)
        .post(`/api/v1/tickets/${ticket.id}/public-comments`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookie)
        .send({ content: `Public update from ${role}` });
      expect(post.status).toBe(201);
      expect(post.body.author.role).toBe(role);
    }

    const requesterView = await request(app)
      .get(`/api/v1/tickets/${ticket.id}/public-comments`)
      .set("Cookie", requesterACookie);
    expect(requesterView.status).toBe(200);
    expect(requesterView.body.items).toHaveLength(2);
  });

  it("COM-06/COM-07: blank and 2,001-char comments are rejected; 2,000 chars is accepted", async () => {
    const ticket = await createTicket();
    for (const content of ["   ", "x".repeat(2001)]) {
      const invalid = await request(app)
        .post(`/api/v1/tickets/${ticket.id}/public-comments`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", requesterACookie)
        .send({ content });
      expect(invalid.status).toBe(400);
      expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
    }

    const boundary = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/public-comments`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", requesterACookie)
      .send({ content: "x".repeat(2000) });
    expect(boundary.status).toBe(201);
    expect(boundary.body.content).toHaveLength(2000);
  });
});

describe("Lab 3 Problem Appears Resolved", () => {
  it("COM-08/COM-12: allowed statuses record an indication without changing formal status", async () => {
    for (const status of ["New", "Open", "In Progress", "Waiting for Requester", "Reopened"]) {
      const ticket = await createTicket(status);
      const res = await request(app)
        .post(`/api/v1/tickets/${ticket.id}/problem-appears-resolved`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", requesterACookie);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ticketId: ticket.id, status });
      expect(res.body.problemAppearsResolvedAt).toEqual(expect.any(String));

      const persisted = await getPrisma().ticket.findUnique({ where: { id: ticket.id } });
      expect(persisted?.status).toBe(status);
      expect(persisted?.problemAppearsResolvedAt).not.toBeNull();
    }
  });

  it("COM-09: repeating the indication is idempotent and retains the original timestamp", async () => {
    const ticket = await createTicket("Open");
    const first = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/problem-appears-resolved`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", requesterACookie);
    const second = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/problem-appears-resolved`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", requesterACookie);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.problemAppearsResolvedAt).toBe(first.body.problemAppearsResolvedAt);
  });

  it("COM-13: terminal statuses return 409 with no indication or status mutation", async () => {
    for (const status of ["Resolved", "Closed", "Cancelled"]) {
      const ticket = await createTicket(status);
      const res = await request(app)
        .post(`/api/v1/tickets/${ticket.id}/problem-appears-resolved`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", requesterACookie);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("RESOLUTION_INDICATION_NOT_ALLOWED");

      const persisted = await getPrisma().ticket.findUnique({ where: { id: ticket.id } });
      expect(persisted?.status).toBe(status);
      expect(persisted?.problemAppearsResolvedAt).toBeNull();
    }
  });

  it("ownership boundary: another Requester cannot indicate resolution on someone else's Ticket", async () => {
    const ticket = await createTicket("New", requesterAId);
    const res = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/problem-appears-resolved`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", requesterBCookie);
    expect(res.status).toBe(404);
    expect((await getPrisma().ticket.findUnique({ where: { id: ticket.id } }))?.problemAppearsResolvedAt).toBeNull();
  });
});
