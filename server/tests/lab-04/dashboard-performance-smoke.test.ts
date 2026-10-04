import { performance } from "node:perf_hooks";
import crypto from "node:crypto";
import request from "supertest";
import { UserRole } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSessionCookie, createTestUser, TEST_ORIGIN } from "../lab-03/testAuth.js";

describe("Lab 4 dashboard and Actions performance smoke", () => {
  let staffCookie: string;
  let requesterCookie: string;
  let actionTicketId: number;
  const createdUserIds: number[] = [];
  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    const prisma = getPrisma();
    const [staff, requester] = await Promise.all([
      createTestUser({ name: "Performance Smoke Staff", role: UserRole.IT_STAFF }),
      createTestUser({ name: "Performance Smoke Requester" }),
    ]);
    createdUserIds.push(staff.id, requester.id);
    const category = await prisma.category.findFirstOrThrow({ orderBy: { id: "asc" } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ orderBy: { id: "asc" } });
    const actionTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-PERF-${Date.now()}`,
        summary: "Performance smoke action ticket",
        description: "Performance smoke fixture.",
        status: "In Progress",
        requesterId: requester.id,
        ownerId: staff.id,
        categoryId: category.id,
        relatedSystemId: system.id,
      },
    });
    createdTicketIds.push(actionTicket.id);
    await prisma.actionTaken.create({
      data: {
        ticketId: actionTicket.id,
        clientRequestId: crypto.randomUUID(),
        workflowCycle: 1,
        actionDateTime: new Date(Date.now() - 60_000),
        description: "Performance smoke Action",
        followUpRequired: false,
        createdById: staff.id,
        assigneeId: staff.id,
      },
    });
    staffCookie = (await createSessionCookie(staff.id)).cookie;
    requesterCookie = (await createSessionCookie(requester.id)).cookie;
    actionTicketId = actionTicket.id;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  async function measure(path: string, cookie: string) {
    const started = performance.now();
    const response = await request(app).get(path).set("Cookie", cookie).set("Origin", TEST_ORIGIN);
    return { response, elapsedMs: performance.now() - started };
  }

  it("PERF-01: Staff Dashboard returns concise seeded operational data without materializing the Ticket collection", async () => {
    const { response, elapsedMs } = await measure("/api/v1/staff/dashboard", staffCookie);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("metrics");
    expect(response.body).toHaveProperty("recentlyUpdatedTickets");
    expect(response.body).toHaveProperty("urgentTickets");
    expect(response.body.recentlyUpdatedTickets.length).toBeLessThanOrEqual(5);
    expect(response.body.urgentTickets.length).toBeLessThanOrEqual(5);
    expect(elapsedMs).toBeLessThan(1500);
  });

  it("PERF-02: Requester Dashboard returns ownership-scoped top lists", async () => {
    const { response, elapsedMs } = await measure("/api/v1/requester/dashboard", requesterCookie);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("metrics");
    expect(response.body).toHaveProperty("recentlyUpdatedTickets");
    expect(response.body).toHaveProperty("recentlyResolvedTickets");
    expect(response.body.recentlyUpdatedTickets.length).toBeLessThanOrEqual(5);
    expect(response.body.recentlyResolvedTickets.length).toBeLessThanOrEqual(5);
    expect(elapsedMs).toBeLessThan(1500);
  });

  it("PERF-03: Actions list returns only the Ticket-scoped ordered collection", async () => {
    const { response, elapsedMs } = await measure(`/api/v1/tickets/${actionTicketId}/actions-taken`, staffCookie);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBeLessThanOrEqual(20);
    for (let index = 1; index < response.body.items.length; index += 1) {
      const previous = response.body.items[index - 1];
      const current = response.body.items[index];
      expect(new Date(previous.actionDateTime).getTime()).toBeGreaterThanOrEqual(new Date(current.actionDateTime).getTime());
    }
    expect(elapsedMs).toBeLessThan(1500);
  });
});
