import crypto from "node:crypto";
import request from "supertest";
import { ActionTakenStatus, UserRole } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSessionCookie, createTestUser, TEST_ORIGIN } from "../lab-03/testAuth.js";

describe("Lab 4 Ticket workflow and resolution", () => {
  const userIds: number[] = [];
  const ticketIds: number[] = [];
  let categoryId: number;
  let systemId: number;
  let requesterId: number;
  let staffId: number;
  let staffCookie: string;
  let requesterCookie: string;

  beforeAll(async () => {
    const prisma = getPrisma();
    const category = await prisma.category.findFirst({ orderBy: { id: "asc" } });
    const system = await prisma.relatedSystem.findFirst({ orderBy: { id: "asc" } });
    if (!category || !system) throw new Error("Reference data must be seeded before workflow tests");
    categoryId = category.id;
    systemId = system.id;

    const [requester, staff] = await Promise.all([
      createTestUser({ name: "Workflow Requester" }),
      createTestUser({ name: "Workflow Staff", role: UserRole.IT_STAFF }),
    ]);
    userIds.push(requester.id, staff.id);
    requesterId = requester.id;
    staffId = staff.id;
    requesterCookie = (await createSessionCookie(requester.id)).cookie;
    staffCookie = (await createSessionCookie(staff.id)).cookie;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  async function createTicket(options: { status?: string; version?: number; workflowCycle?: number; resolvedAt?: Date | null } = {}) {
    const ticket = await getPrisma().ticket.create({
      data: {
        ticketNumber: `TKT-WF-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        summary: "Workflow resolution test",
        description: "Lab 4 workflow test ticket.",
        requestedPriority: "Medium",
        itPriority: "Medium",
        status: options.status ?? "In Progress",
        version: options.version ?? 1,
        workflowCycle: options.workflowCycle ?? 1,
        resolvedAt: options.resolvedAt ?? null,
        requesterId,
        ownerId: staffId,
        categoryId,
        relatedSystemId: systemId,
      },
    });
    ticketIds.push(ticket.id);
    return ticket;
  }

  async function addAction(ticketId: number, options: {
    status: ActionTakenStatus;
    workflowCycle?: number;
  }) {
    return getPrisma().actionTaken.create({
      data: {
        ticketId,
        clientRequestId: crypto.randomUUID(),
        workflowCycle: options.workflowCycle ?? 1,
        actionDateTime: new Date(Date.now() - 60_000),
        description: "Workflow test Action",
        followUpRequired: false,
        result: options.status === ActionTakenStatus.COMPLETED ? "Workflow test completed" : null,
        status: options.status,
        createdById: staffId,
        assigneeId: staffId,
        performedById: options.status === ActionTakenStatus.COMPLETED ? staffId : null,
        completedAt: options.status === ActionTakenStatus.COMPLETED ? new Date() : null,
        cancelledById: options.status === ActionTakenStatus.CANCELLED ? staffId : null,
        cancelledAt: options.status === ActionTakenStatus.CANCELLED ? new Date() : null,
      },
    });
  }

  async function changeStatus(ticketId: number, status: string, expectedVersion: number, cookie = staffCookie) {
    return request(app)
      .patch(`/api/v1/staff/tickets/${ticketId}/status`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", cookie)
      .send({ status, expectedVersion });
  }

  it("WF-01: Resolve is blocked when the current cycle has no Completed Action", async () => {
    const ticket = await createTicket();
    const before = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    const result = await changeStatus(ticket.id, "Resolved", ticket.version);

    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("RESOLUTION_GATE_NOT_MET");
    const after = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(after).toMatchObject({ status: before.status, version: before.version, resolvedAt: null });
  });

  it("WF-02: Resolve is blocked when a current-cycle Action is still Planned or In Progress", async () => {
    for (const status of [ActionTakenStatus.PLANNED, ActionTakenStatus.IN_PROGRESS]) {
      const ticket = await createTicket();
      await addAction(ticket.id, { status: ActionTakenStatus.COMPLETED });
      await addAction(ticket.id, { status });
      const result = await changeStatus(ticket.id, "Resolved", ticket.version);
      expect(result.status).toBe(409);
      expect(result.body.error.code).toBe("RESOLUTION_GATE_NOT_MET");
      const saved = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(saved.status).toBe("In Progress");
    }
  });

  it("WF-03: Resolve ignores prior-cycle Actions and requires a Completed Action in the current cycle", async () => {
    const ticket = await createTicket({ workflowCycle: 2 });
    await addAction(ticket.id, { status: ActionTakenStatus.COMPLETED, workflowCycle: 1 });
    const result = await changeStatus(ticket.id, "Resolved", ticket.version);
    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("RESOLUTION_GATE_NOT_MET");
  });

  it("WF-04: Resolve succeeds with a current-cycle Completed Action and records server resolvedAt", async () => {
    const ticket = await createTicket();
    await addAction(ticket.id, { status: ActionTakenStatus.COMPLETED });
    const result = await changeStatus(ticket.id, "Resolved", ticket.version);

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      id: ticket.id,
      status: "Resolved",
      workflowCycle: 1,
      version: ticket.version + 1,
    });
    expect(result.body.resolvedAt).toEqual(expect.any(String));
    const saved = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(saved.resolvedAt).not.toBeNull();
    expect(saved.status).toBe("Resolved");
  });

  it("WF-05: Closed preserves resolvedAt", async () => {
    const resolvedAt = new Date("2026-10-01T09:00:00.000Z");
    const ticket = await createTicket({ status: "Resolved", resolvedAt });
    const result = await changeStatus(ticket.id, "Closed", ticket.version);
    expect(result.status).toBe(200);
    expect(result.body.resolvedAt).toBe(resolvedAt.toISOString());
    const saved = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(saved.resolvedAt?.toISOString()).toBe(resolvedAt.toISOString());
  });

  it("WF-06: Reopen clears resolved timestamps, increments workflowCycle, and preserves historical Actions", async () => {
    const resolvedAt = new Date("2026-10-01T09:00:00.000Z");
    const ticket = await createTicket({ status: "Resolved", resolvedAt, workflowCycle: 1 });
    const oldAction = await addAction(ticket.id, { status: ActionTakenStatus.COMPLETED, workflowCycle: 1 });
    const result = await changeStatus(ticket.id, "Reopened", ticket.version);

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      status: "Reopened",
      problemAppearsResolvedAt: null,
      resolvedAt: null,
      workflowCycle: 2,
      version: ticket.version + 1,
    });
    expect(await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: oldAction.id } })).toMatchObject({ workflowCycle: 1, status: ActionTakenStatus.COMPLETED });
  });

  it("WF-07: stale workflow updates return 409 without changing the Ticket", async () => {
    const ticket = await createTicket();
    await getPrisma().ticket.update({ where: { id: ticket.id }, data: { version: { increment: 1 } } });
    const result = await changeStatus(ticket.id, "Resolved", ticket.version);
    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("STALE_TICKET_STATE");
    expect((await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } })).status).toBe("In Progress");
  });

  it("WF-08: Requester cannot change Staff workflow status", async () => {
    const ticket = await createTicket({ status: "Open" });
    const result = await changeStatus(ticket.id, "In Progress", ticket.version, requesterCookie);
    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe("FORBIDDEN");
  });

  it("WF-09: Cancelled current-cycle Actions do not block Resolve when a Completed Action exists", async () => {
    const ticket = await createTicket();
    await addAction(ticket.id, { status: ActionTakenStatus.COMPLETED });
    await addAction(ticket.id, { status: ActionTakenStatus.CANCELLED });
    const result = await changeStatus(ticket.id, "Resolved", ticket.version);
    expect(result.status).toBe(200);
    expect(result.body.status).toBe("Resolved");
  });
});
