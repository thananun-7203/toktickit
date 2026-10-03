import crypto from "node:crypto";
import request from "supertest";
import { ActionTakenStatus, UserRole } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import * as prismaModule from "../../src/prisma.js";
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
  let otherStaffId: number;
  let requesterCookie: string;
  let staffCookie: string;
  let adminCookie: string;
  let priorActionId: number;
  let otherStaffActionId: number;
  let terminalActionId: number;
  let terminalTicketId: number;

  beforeAll(async () => {
    const prisma = getPrisma();
    const [category, system] = await Promise.all([
      prisma.category.findFirst({ orderBy: { id: "asc" } }),
      prisma.relatedSystem.findFirst({ orderBy: { id: "asc" } }),
    ]);
    if (!category || !system) throw new Error("Reference data must be seeded before dashboard tests");
    categoryId = category.id;
    systemId = system.id;

    const [requester, staff, admin, otherStaff] = await Promise.all([
      createTestUser({ name: "Dashboard Requester" }),
      createTestUser({ name: "Dashboard Staff", role: UserRole.IT_STAFF }),
      createTestUser({ name: "Dashboard Admin", role: UserRole.ADMINISTRATOR }),
      createTestUser({ name: "Dashboard Other Staff", role: UserRole.IT_STAFF }),
    ]);
    userIds.push(requester.id, staff.id, admin.id, otherStaff.id);
    requesterId = requester.id;
    staffId = staff.id;
    adminId = admin.id;
    otherStaffId = otherStaff.id;
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

    const [currentAction, priorAction, otherStaffAction, terminalAction, completedAction, cancelledAction] = await Promise.all([
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
      prisma.actionTaken.create({
        data: {
          ticketId: currentTicket.id,
          clientRequestId: crypto.randomUUID(),
          workflowCycle: 2,
          actionDateTime: new Date(Date.now() - 180_000),
          description: "Other staff dashboard action",
          status: ActionTakenStatus.IN_PROGRESS,
          followUpRequired: false,
          createdById: otherStaffId,
          assigneeId: otherStaffId,
        },
      }),
      prisma.actionTaken.create({
        data: {
          ticketId: currentTicket.id,
          clientRequestId: crypto.randomUUID(),
          workflowCycle: 1,
          actionDateTime: new Date(Date.now() - 240_000),
          description: "Terminal-parent negative action",
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
          workflowCycle: 2,
          actionDateTime: new Date(Date.now() - 300_000),
          description: "Completed negative action",
          status: ActionTakenStatus.COMPLETED,
          followUpRequired: false,
          createdById: staffId,
          assigneeId: staffId,
          performedById: staffId,
          completedAt: new Date(Date.now() - 300_000),
          result: "Completed for dashboard negative fixture",
        },
      }),
      prisma.actionTaken.create({
        data: {
          ticketId: currentTicket.id,
          clientRequestId: crypto.randomUUID(),
          workflowCycle: 2,
          actionDateTime: new Date(Date.now() - 360_000),
          description: "Cancelled negative action",
          status: ActionTakenStatus.CANCELLED,
          followUpRequired: false,
          createdById: staffId,
          assigneeId: staffId,
          cancelledById: staffId,
          cancelledAt: new Date(Date.now() - 360_000),
        },
      }),
    ]);
    actionIds.push(currentAction.id, priorAction.id, otherStaffAction.id, terminalAction.id, completedAction.id, cancelledAction.id);
    priorActionId = priorAction.id;
    otherStaffActionId = otherStaffAction.id;
    terminalActionId = terminalAction.id;

    const extraActiveActions = await Promise.all(Array.from({ length: 6 }, (_, index) => prisma.actionTaken.create({
      data: {
        ticketId: currentTicket.id,
        clientRequestId: crypto.randomUUID(),
        workflowCycle: 2,
        actionDateTime: new Date(Date.now() - (420_000 + index * 1_000)),
        description: `Extra active dashboard action ${index}`,
        status: ActionTakenStatus.IN_PROGRESS,
        followUpRequired: false,
        createdById: staffId,
        assigneeId: staffId,
      },
    })));
    actionIds.push(...extraActiveActions.map((action) => action.id));

    const terminalTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-SD-TERMINAL-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
        summary: "Dashboard terminal high ticket",
        description: "Terminal negative fixture.",
        requestedPriority: "High",
        itPriority: "High",
        status: "Closed",
        requesterId,
        ownerId: staffId,
        categoryId,
        relatedSystemId: systemId,
      },
    });
    ticketIds.push(terminalTicket.id);
    terminalTicketId = terminalTicket.id;
    await prisma.actionTaken.update({ where: { id: terminalAction.id }, data: { ticketId: terminalTicket.id } });

    for (let index = 0; index < 7; index += 1) {
      const urgentTicket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-SD-URGENT-${Date.now()}-${index}-${crypto.randomUUID().slice(0, 6)}`,
          summary: `Urgent ordering ${index}`,
          description: "Urgent ordering fixture.",
          requestedPriority: "High",
          itPriority: "High",
          status: "Open",
          requesterId,
          ownerId: staffId,
          categoryId,
          relatedSystemId: systemId,
        },
      });
      ticketIds.push(urgentTicket.id);
      await prisma.ticket.update({ where: { id: urgentTicket.id }, data: { updatedAt: new Date(Date.now() - index * 1_000) } });
    }
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

    const expectedActions = await prisma.actionTaken.findMany({
      where: { assigneeId: staffId, workflowCycle: 2, status: { in: [ActionTakenStatus.PLANNED, ActionTakenStatus.IN_PROGRESS] }, ticket: { status: { in: [...ACTIVE_STATUSES] } } },
      select: { id: true },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 5,
    });
    expect(response.body.myActiveActions.map((action: { id: number }) => action.id)).toEqual(expectedActions.map((action) => action.id));
    expect(response.body.myActiveActions).toHaveLength(5);
    expect(response.body.myActiveActions.every((action: { status: string }) => ["Planned", "In Progress"].includes(action.status))).toBe(true);
    const activeActionIds = response.body.myActiveActions.map((action: { id: number }) => action.id);
    expect(activeActionIds).not.toContain(priorActionId);
    expect(activeActionIds).not.toContain(otherStaffActionId);
    expect(activeActionIds).not.toContain(terminalActionId);
    const expectedRecent = await prisma.ticket.findMany({
      where: { status: { in: [...ACTIVE_STATUSES] } },
      select: { id: true },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 5,
    });
    expect(response.body.recentlyUpdatedTickets.map((ticket: { id: number }) => ticket.id)).toEqual(expectedRecent.map((ticket) => ticket.id));

    const expectedUrgent = await prisma.ticket.findMany({
      where: { status: { in: [...ACTIVE_STATUSES] }, itPriority: "High" },
      select: { id: true },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 5,
    });
    expect(response.body.urgentTickets.map((ticket: { id: number }) => ticket.id)).toEqual(expectedUrgent.map((ticket) => ticket.id));
    expect(response.body.urgentTickets).toHaveLength(5);
    expect(response.body.urgentTickets.every((ticket: { itPriority: string; status: string }) => ticket.itPriority === "High" && ACTIVE_STATUSES.includes(ticket.status as typeof ACTIVE_STATUSES[number]))).toBe(true);
    expect(response.body.urgentTickets.map((ticket: { id: number }) => ticket.id)).not.toContain(terminalTicketId);
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

  it("SD-API-12: returns a safe 500 envelope when the dashboard dependency fails", async () => {
    const prisma = prismaModule.getPrisma();
    const spy = vi.spyOn(prisma.ticket, "count").mockRejectedValue(new Error("database secret: password_hash"));
    try {
      const response = await request(app).get("/api/v1/staff/dashboard").set("Cookie", staffCookie);
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: { code: "STAFF_DASHBOARD_FAILED", message: "Unable to load Staff Dashboard" } });
      expect(JSON.stringify(response.body)).not.toContain("password_hash");
    } finally {
      spy.mockRestore();
    }
  });
});
