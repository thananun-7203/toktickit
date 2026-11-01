import crypto from "node:crypto";
import request from "supertest";
import { UserRole } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSessionCookie, createTestUser, TEST_ORIGIN } from "../lab-03/testAuth.js";

describe("Lab 4 Actions Taken authorization", () => {
  const userIds: number[] = [];
  const ticketIds: number[] = [];
  let categoryId: number;
  let systemId: number;
  let requesterId: number;
  let staffId: number;
  let requesterCookie: string;
  let staffCookie: string;
  let mustChangeCookie: string;

  beforeAll(async () => {
    const prisma = getPrisma();
    const category = await prisma.category.findUniqueOrThrow({ where: { name: "Software" } });
    const system = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Report Portal" } });
    categoryId = category.id;
    systemId = system.id;
    const requester = await createTestUser({ name: "AZ4 Requester" });
    const staff = await createTestUser({ name: "AZ4 Staff", role: UserRole.IT_STAFF });
    const mustChange = await createTestUser({ name: "AZ4 Must Change", role: UserRole.IT_STAFF, mustChangePassword: true });
    userIds.push(requester.id, staff.id, mustChange.id);
    requesterId = requester.id;
    staffId = staff.id;
    requesterCookie = (await createSessionCookie(requester.id)).cookie;
    staffCookie = (await createSessionCookie(staff.id)).cookie;
    mustChangeCookie = (await createSessionCookie(mustChange.id)).cookie;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  async function createTicket() {
    const marker = crypto.randomUUID().slice(0, 8);
    const row = await getPrisma().ticket.create({
      data: {
        ticketNumber: `TKT-AZ4-${Date.now()}-${marker}`,
        summary: "Authorization test",
        description: "Authorization test ticket",
        status: "Open",
        requesterId,
        ownerId: staffId,
        categoryId,
        relatedSystemId: systemId,
      },
    });
    ticketIds.push(row.id);
    return row;
  }

  function body() {
    return {
      clientRequestId: crypto.randomUUID(),
      expectedTicketVersion: 1,
      actionDateTime: new Date(Date.now() - 60_000).toISOString(),
      description: "Authorization protected Action",
      assigneeId: staffId,
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
    };
  }

  it("AT-API-24/AZ4-05/06: new Actions endpoints require authentication and completed password change", async () => {
    const t = await createTicket();
    const unauth = await request(app).get(`/api/v1/tickets/${t.id}/actions-taken`);
    expect(unauth.status).toBe(401);

    const gatedRead = await request(app).get(`/api/v1/tickets/${t.id}/actions-taken`).set("Cookie", mustChangeCookie);
    expect(gatedRead.status).toBe(403);
    expect(gatedRead.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const gatedWrite = await request(app)
      .post(`/api/v1/staff/tickets/${t.id}/actions-taken`)
      .set("Cookie", mustChangeCookie).set("Origin", TEST_ORIGIN).send(body());
    expect(gatedWrite.status).toBe(403);
    expect(gatedWrite.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("AZ4-01: Requester cannot create or mutate Actions Taken through Staff endpoints", async () => {
    const t = await createTicket();
    const create = await request(app)
      .post(`/api/v1/staff/tickets/${t.id}/actions-taken`)
      .set("Cookie", requesterCookie).set("Origin", TEST_ORIGIN).send(body());
    expect(create.status).toBe(403);
    expect(await getPrisma().actionTaken.count({ where: { ticketId: t.id } })).toBe(0);

    const action = await getPrisma().actionTaken.create({
      data: {
        ticketId: t.id,
        clientRequestId: crypto.randomUUID(),
        workflowCycle: t.workflowCycle,
        actionDateTime: new Date(Date.now() - 60_000),
        description: "Requester write protection fixture",
        followUpRequired: false,
        createdById: staffId,
        assigneeId: staffId,
      },
    });
    const edit = await request(app)
      .patch(`/api/v1/staff/actions-taken/${action.id}`)
      .set("Cookie", requesterCookie).set("Origin", TEST_ORIGIN)
      .send({ expectedVersion: 1, expectedTicketVersion: 1, description: "Requester must not edit" });
    expect(edit.status).toBe(403);

    const status = await request(app)
      .patch(`/api/v1/staff/actions-taken/${action.id}/status`)
      .set("Cookie", requesterCookie).set("Origin", TEST_ORIGIN)
      .send({ status: "In Progress", expectedVersion: 1, expectedTicketVersion: 1 });
    expect(status.status).toBe(403);
    expect((await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: action.id } })).version).toBe(1);
  });

  it("AT-API-23/AZ4-07: missing/null/wrong Origin rejects every Action write before mutation", async () => {
    for (const origin of [undefined, "null", "http://evil.example"] as const) {
      const t = await createTicket();
      let pending = request(app)
        .post(`/api/v1/staff/tickets/${t.id}/actions-taken`)
        .set("Cookie", staffCookie);
      if (origin !== undefined) pending = pending.set("Origin", origin);
      const res = await pending.send(body());
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ORIGIN_FORBIDDEN");
      expect(await getPrisma().actionTaken.count({ where: { ticketId: t.id } })).toBe(0);
    }

    const t = await createTicket();
    const action = await getPrisma().actionTaken.create({
      data: {
        ticketId: t.id,
        clientRequestId: crypto.randomUUID(),
        workflowCycle: t.workflowCycle,
        actionDateTime: new Date(Date.now() - 60_000),
        description: "Origin protection fixture",
        followUpRequired: false,
        createdById: staffId,
        assigneeId: staffId,
      },
    });
    const edit = await request(app)
      .patch(`/api/v1/staff/actions-taken/${action.id}`)
      .set("Cookie", staffCookie)
      .send({ expectedVersion: 1, expectedTicketVersion: 1, description: "Must not edit without Origin" });
    expect(edit.status).toBe(403);
    expect(edit.body.error.code).toBe("ORIGIN_FORBIDDEN");

    const status = await request(app)
      .patch(`/api/v1/staff/actions-taken/${action.id}/status`)
      .set("Cookie", staffCookie).set("Origin", "null")
      .send({ status: "In Progress", expectedVersion: 1, expectedTicketVersion: 1 });
    expect(status.status).toBe(403);
    expect(status.body.error.code).toBe("ORIGIN_FORBIDDEN");
    expect((await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: action.id } })).version).toBe(1);
  });

  it("AZ4-08: client cannot spoof creator/performer/cancellation provenance", async () => {
    const t = await createTicket();
    const res = await request(app)
      .post(`/api/v1/staff/tickets/${t.id}/actions-taken`)
      .set("Cookie", staffCookie).set("Origin", TEST_ORIGIN)
      .send({
        ...body(),
        createdById: requesterId,
        performedById: requesterId,
        cancelledById: requesterId,
      });
    expect(res.status).toBe(400);
    expect(await getPrisma().actionTaken.count({ where: { ticketId: t.id } })).toBe(0);
  });
});
