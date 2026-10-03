import crypto from "node:crypto";
import request from "supertest";
import { ActionTakenStatus, UserRole } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSessionCookie, createTestUser, TEST_ORIGIN } from "../lab-03/testAuth.js";

const ACTIVE_STATUSES = ["New", "Open", "In Progress", "Waiting for Requester", "Reopened"];
const ALL_STATUSES = ["New", "Open", "In Progress", "Waiting for Requester", "Resolved", "Closed", "Reopened", "Cancelled"];

describe("Lab 4 Staff Dashboard API", () => {
  const userIds: number[] = [];
  const ticketIds: number[] = [];
  const actionIds: number[] = [];
  let categoryId: number;
  let systemId: number;
  let requesterId: number;
  let staffId: number;
  let adminId: number;
  let requesterCookie: string;
  let staffCookie: string;
  let adminCookie: string;

  beforeAll(async () => {
    const prisma = getPrisma();
    const [category, system] = await Promise.all([
      prisma.category.findFirst({ orderBy: { id: "asc" } }),
      prisma.relatedSystem.findFirst({ orderBy: { id: "asc" } }),
    ]);
    if (!category || !system) throw new Error("Reference data must be seeded before dashboard tests");
    categoryId = category.id;
    systemId = system.id;

    const [requester, staff, admin] = await Promise.all([
      createTestUser({ name: "Dashboard Requester" }),
      createTestUser({ name: "Dashboard Staff", role: UserRole.IT_STAFF }),
      createTestUser({ name: "Dashboard Admin", role: UserRole.ADMINISTRATOR }),
    ]);
    userIds.push(requester.id, staff.id, admin.id);
    requesterId = requester.id;
    staffId = staff.id;
    adminId = admin.id;
    requesterCookie = (await createSessionCookie(requester.id)).cookie;
    staffCookie = (await createSessionCookie(staff.id)).cookie;
    adminCookie = (await createSessionCookie(admin.id)).cookie;

    const statuses = await Promise.all(ALL_STATUSES.map((status, index) => prisma.ticket.create({
      data: {
        ticketNumber: `TKT-SD-${Date.now()}-${index}-${crypto.randomUUID().slice(0, 6)}`,
        summary: `Dashboard status ${status}`,
        description: "Staff dashboard API test ticket.",
        requestedPriority: "Medium",
        itPriority: index % 4 === 0 ? "High" : index % 4 === 1 ? "Medium" : index % 4 === 2 ? "Low" : null,
        status,
        requesterId,
        ownerId: status === "New" ? null : staffId,
        categoryId,
        relatedSystemId: systemId,
      },
    })));
    ticketIds.push(...statuses.map((ticket) => ticket.id));

    const currentTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-SD-ACTION-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
        summary: "Dashboard current-cycle Action",
        description: "Dashboard active Action test ticket.",
        requestedPriority: "High",
        itPriority: "High",
        status: "In Progress",
        workflowCycle: 2,
        requesterId,
        ownerId: staffId,
        categoryId,
        relatedSystemId: systemId,
      },
    });
    ticketIds.push(currentTicket.id);

    const [currentAction, priorAction] = await Promise.all([
      prisma.actionTaken.create({
        data: {
          ticketId: currentTicket.id,
          clientRequestId: crypto.randomUUID(),
          workflowCycle: 2,
          actionDateTime: new Date(Date.now() - 60_000),
          description: "Current-cycle dashboard action",
          status: ActionTakenStatus.IN_PROGRESS,
          followUpRequired: false,
          createdById: staffId,
          assigneeId: staffId,
        },
      }),
      prisma.actionTaken.create({
        data: {
          ticketId: currentTicket.id,
          clientRequestId: crypto.randomUUID(),
          workflowCycle: 1,
          actionDateTime: new Date(Date.now() - 120_000),
          description: "Prior-cycle dashboard action",
          status: ActionTakenStatus.IN_PROGRESS,
          followUpRequired: false,
          createdById: staffId,
          assigneeId: staffId,
        },
      }),
    ]);
    actionIds.push(currentAction.id, priorAction.id);
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.actionTaken.deleteMany({ where: { id: { in: actionIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("SD-API-01..07/10: returns authoritative operational metrics and concise lists", async () => {
    const response = await request(app).get("/api/v1/staff/dashboard").set("Cookie", staffCookie);
    expect(response.status).toBe(200);

    const prisma = getPrisma();
    const expectedUnassigned = await prisma.ticket.count({ where: { status: { in: ACTIVE_STATUSES }, ownerId: null } });
    const expectedMine = await prisma.ticket.count({ where: { status: { in: ACTIVE_STATUSES }, ownerId: staffId } });
    expect(response.body.metrics.unassignedActiveTickets).toBe(expectedUnassigned);
    expect(response.body.metrics.myActiveTickets).toBe(expectedMine);

    for (const status of ALL_STATUSES) {
      const expected = await prisma.ticket.count({ where: { status } });
      expect(response.body.metrics.byStatus[status]).toBe(expected);
    }
    for (const priority of ["High", "Medium", "Low"] as const) {
      const expected = await prisma.ticket.count({ where: { status: { in: ACTIVE_STATUSES }, itPriority: priority } });
      expect(response.body.metrics.activeByItPriority[priority]).toBe(expected);
    }
    const expectedNotRecorded = await prisma.ticket.count({ where: { status: { in: ACTIVE_STATUSES }, itPriority: null } });
    expect(response.body.metrics.activeByItPriority["Not recorded"]).toBe(expectedNotRecorded);

    expect(response.body.myActiveActions).toHaveLength(1);
    expect(response.body.myActiveActions[0].description).toBe("Current-cycle dashboard action");
    expect(response.body.recentlyUpdatedTickets).toHaveLength(Math.min(5, expectedMine));
    expect(response.body.urgentTickets.every((ticket: { itPriority: string }) => ticket.itPriority === "High")).toBe(true);
    expect(response.body.recentlyUpdatedTickets.every((ticket: { status: string }) => ACTIVE_STATUSES.includes(ticket.status))).toBe(true);
  });

  it("SD-API-08: Administrator can use the Staff Dashboard", async () => {
    const response = await request(app).get("/api/v1/staff/dashboard").set("Cookie", adminCookie);
    expect(response.status).toBe(200);
    expect(response.body.metrics).toHaveProperty("unassignedActiveTickets");
    expect(response.body.metrics).toHaveProperty("myActiveTickets");
  });

  it("SD-API-09: Requester is forbidden without receiving operational data", async () => {
    const response = await request(app).get("/api/v1/staff/dashboard").set("Cookie", requesterCookie);
    expect(response.status).toBe(403);
    expect(response.body.metrics).toBeUndefined();
  });
});
