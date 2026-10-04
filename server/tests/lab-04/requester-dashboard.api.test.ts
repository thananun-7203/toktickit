import crypto from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import * as prismaModule from "../../src/prisma.js";
import { createSessionCookie, createTestUser } from "../lab-03/testAuth.js";

const ACTIVE_STATUSES = ["New", "Open", "In Progress", "Waiting for Requester", "Reopened"] as const;

describe("Lab 4 Requester Dashboard API", () => {
  const userIds: number[] = [];
  const ticketIds: number[] = [];
  let categoryId: number;
  let systemId: number;
  let requesterId: number;
  let otherRequesterId: number;
  let emptyRequesterId: number;
  let requesterCookie: string;
  let staffCookie: string;
  let adminCookie: string;
  let mustChangeRequesterCookie: string;
  let terminalRecentlyUpdatedTicketId = -1;

  beforeAll(async () => {
    const prisma = getPrisma();
    const [category, system] = await Promise.all([
      prisma.category.findFirst({ orderBy: { id: "asc" } }),
      prisma.relatedSystem.findFirst({ orderBy: { id: "asc" } }),
    ]);
    if (!category || !system) throw new Error("Reference data must be seeded before dashboard tests");
    categoryId = category.id;
    systemId = system.id;

    const [requester, otherRequester, emptyRequester, staff, admin, mustChangeRequester] = await Promise.all([
      createTestUser({ name: "Requester Dashboard Owner" }),
      createTestUser({ name: "Requester Dashboard Other" }),
      createTestUser({ name: "Requester Dashboard Empty" }),
      createTestUser({ name: "Requester Dashboard Staff", role: UserRole.IT_STAFF }),
      createTestUser({ name: "Requester Dashboard Admin", role: UserRole.ADMINISTRATOR }),
      createTestUser({ name: "Requester Dashboard Must Change", mustChangePassword: true }),
    ]);
    userIds.push(requester.id, otherRequester.id, emptyRequester.id, staff.id, admin.id, mustChangeRequester.id);
    requesterId = requester.id;
    otherRequesterId = otherRequester.id;
    requesterCookie = (await createSessionCookie(requester.id)).cookie;
    emptyRequesterId = emptyRequester.id;
    staffCookie = (await createSessionCookie(staff.id)).cookie;
    adminCookie = (await createSessionCookie(admin.id)).cookie;
    mustChangeRequesterCookie = (await createSessionCookie(mustChangeRequester.id)).cookie;

    const now = Date.now();
    const ownedFixtures = [
      { status: "New", offset: 60_000, priority: "Low" },
      { status: "Open", offset: 120_000, priority: "Medium" },
      { status: "In Progress", offset: 180_000, priority: "High" },
      { status: "Waiting for Requester", offset: 240_000, priority: "High" },
      { status: "Reopened", offset: 300_000, priority: "Medium" },
      { status: "Resolved", offset: 360_000, priority: "Low", resolvedOffset: 90_000 },
      { status: "Closed", offset: -60_000, priority: "Medium", resolvedOffset: 30_000 },
      { status: "Resolved", offset: 480_000, priority: "High", resolvedOffset: 180_000 },
      { status: "Closed", offset: 540_000, priority: "Low", resolvedOffset: 240_000 },
      { status: "Resolved", offset: 600_000, priority: "Medium", resolvedOffset: undefined },
    ];

    for (let index = 0; index < ownedFixtures.length; index += 1) {
      const fixture = ownedFixtures[index];
      const ticketNumber = `TKT-RD-${Date.now()}-${index}-${crypto.randomUUID().slice(0, 6)}`;
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber,
          summary: `Requester dashboard fixture ${index}`,
          description: "Requester dashboard API test fixture.",
          requestedPriority: fixture.priority,
          itPriority: fixture.priority,
          status: fixture.status,
          requesterId,
          categoryId,
          relatedSystemId: systemId,
          updatedAt: new Date(now - fixture.offset),
          resolvedAt: fixture.resolvedOffset === undefined ? null : new Date(now - fixture.resolvedOffset),
        },
      });
      ticketIds.push(ticket.id);
      if (index === 6) terminalRecentlyUpdatedTicketId = ticket.id;
    }

    const otherTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-RD-OTHER-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
        summary: "Other requester must not leak",
        description: "Ownership isolation fixture.",
        requestedPriority: "High",
        itPriority: "High",
        status: "Waiting for Requester",
        requesterId: otherRequesterId,
        categoryId,
        relatedSystemId: systemId,
        updatedAt: new Date(now + 1_000),
        resolvedAt: new Date(now + 500),
      },
    });
    ticketIds.push(otherTicket.id);
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("RD-API-01/03/04: returns authoritative owned metrics and deterministic top-5 lists", async () => {
    const response = await request(app).get("/api/v1/requester/dashboard").set("Cookie", requesterCookie);
    expect(response.status).toBe(200);

    const prisma = getPrisma();
    const expectedOpen = await prisma.ticket.count({ where: { requesterId, status: { in: [...ACTIVE_STATUSES] } } });
    const expectedWaiting = await prisma.ticket.count({ where: { requesterId, status: "Waiting for Requester" } });
    expect(response.body.metrics).toEqual({ openTickets: expectedOpen, waitingForYou: expectedWaiting });

    const expectedUpdated = await prisma.ticket.findMany({
      where: { requesterId },
      select: { id: true },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 5,
    });
    expect(response.body.recentlyUpdatedTickets.map((ticket: { id: number }) => ticket.id)).toEqual(expectedUpdated.map((ticket) => ticket.id));
    expect(response.body.recentlyUpdatedTickets.map((ticket: { id: number }) => ticket.id)).toContain(terminalRecentlyUpdatedTicketId);

    const expectedResolved = await prisma.ticket.findMany({
      where: { requesterId, resolvedAt: { not: null }, status: { in: ["Resolved", "Closed"] } },
      select: { id: true },
      orderBy: [{ resolvedAt: "desc" }, { id: "desc" }],
      take: 5,
    });
    expect(response.body.recentlyResolvedTickets.map((ticket: { id: number }) => ticket.id)).toEqual(expectedResolved.map((ticket) => ticket.id));
    expect(response.body.recentlyResolvedTickets.every((ticket: { resolvedAt: string | null; status: string }) => ticket.resolvedAt !== null && ["Resolved", "Closed"].includes(ticket.status))).toBe(true);
  });

  it("RD-API-02: another Requester's Tickets do not affect or appear in the dashboard", async () => {
    const response = await request(app).get("/api/v1/requester/dashboard").set("Cookie", requesterCookie);
    expect(response.status).toBe(200);
    const allReturnedIds = [
      ...response.body.recentlyUpdatedTickets.map((ticket: { id: number }) => ticket.id),
      ...response.body.recentlyResolvedTickets.map((ticket: { id: number }) => ticket.id),
    ];
    const prisma = getPrisma();
    const otherIds = await prisma.ticket.findMany({ where: { requesterId: otherRequesterId }, select: { id: true } });
    expect(allReturnedIds).not.toEqual(expect.arrayContaining(otherIds.map((ticket) => ticket.id)));
  });

  it("RD-API-05: zero-Ticket Requester receives zero metrics and empty lists", async () => {
    const emptyCookie = (await createSessionCookie(emptyRequesterId)).cookie;
    const response = await request(app).get("/api/v1/requester/dashboard").set("Cookie", emptyCookie);
    expect(response.status).toBe(200);
    expect(response.body.metrics).toEqual({ openTickets: 0, waitingForYou: 0 });
    expect(response.body.recentlyUpdatedTickets).toEqual([]);
    expect(response.body.recentlyResolvedTickets).toEqual([]);
  });

  it("RD-API-06/07 and authorization: only Requesters may use the endpoint and password-change gate is enforced", async () => {
    const staffResponse = await request(app).get("/api/v1/requester/dashboard").set("Cookie", staffCookie);
    const adminResponse = await request(app).get("/api/v1/requester/dashboard").set("Cookie", adminCookie);
    const mustChangeResponse = await request(app).get("/api/v1/requester/dashboard").set("Cookie", mustChangeRequesterCookie);
    const anonymousResponse = await request(app).get("/api/v1/requester/dashboard");
    expect(staffResponse.status).toBe(403);
    expect(adminResponse.status).toBe(403);
    expect(mustChangeResponse.status).toBe(403);
    expect(mustChangeResponse.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    expect(anonymousResponse.status).toBe(401);
    expect(staffResponse.body.metrics).toBeUndefined();
    expect(adminResponse.body.metrics).toBeUndefined();
  });

  it("RD-API-08: returns a safe 500 envelope when a dashboard dependency fails", async () => {
    const prisma = prismaModule.getPrisma();
    const spy = vi.spyOn(prisma.ticket, "count").mockRejectedValue(new Error("database secret: password_hash"));
    try {
      const response = await request(app).get("/api/v1/requester/dashboard").set("Cookie", requesterCookie);
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: { code: "REQUESTER_DASHBOARD_FAILED", message: "Unable to load Requester Dashboard" } });
      expect(JSON.stringify(response.body)).not.toContain("password_hash");
    } finally {
      spy.mockRestore();
    }
  });
});
