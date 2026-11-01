import crypto from "node:crypto";
import request from "supertest";
import { ActionFollowUpStatus, ActionTakenStatus, UserRole } from "@prisma/client";
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
  let otherStaffId: number;
  let staffCookie: string;
  let requesterCookie: string;

  beforeAll(async () => {
    const prisma = getPrisma();
    const category = await prisma.category.findFirst({ orderBy: { id: "asc" } });
    const system = await prisma.relatedSystem.findFirst({ orderBy: { id: "asc" } });
    if (!category || !system) throw new Error("Reference data must be seeded before workflow tests");
    categoryId = category.id;
    systemId = system.id;

    const [requester, staff, otherStaff] = await Promise.all([
      createTestUser({ name: "Workflow Requester" }),
      createTestUser({ name: "Workflow Staff", role: UserRole.IT_STAFF }),
      createTestUser({ name: "Workflow Other Staff", role: UserRole.IT_STAFF }),
    ]);
    userIds.push(requester.id, staff.id, otherStaff.id);
    requesterId = requester.id;
    staffId = staff.id;
    otherStaffId = otherStaff.id;
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
    result?: string | null;
    followUpRequired?: boolean;
    followUpNote?: string | null;
  }) {
    const followUpRequired = options.followUpRequired ?? false;
    return getPrisma().actionTaken.create({
      data: {
        ticketId,
        clientRequestId: crypto.randomUUID(),
        workflowCycle: options.workflowCycle ?? 1,
        actionDateTime: new Date(Date.now() - 60_000),
        description: "Workflow test Action",
        followUpRequired,
        followUpNote: followUpRequired ? (options.followUpNote ?? "Workflow follow-up") : null,
        followUpStatus: followUpRequired ? ActionFollowUpStatus.OUTSTANDING : ActionFollowUpStatus.NOT_REQUIRED,
        result: options.status === ActionTakenStatus.COMPLETED ? (options.result ?? "Workflow test completed") : null,
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

  it("WF-API-09: concurrent valid transitions from one Ticket version have exactly one winner", async () => {
    const ticket = await createTicket();
    await addAction(ticket.id, { status: ActionTakenStatus.COMPLETED, result: "Resolution gate satisfied" });

    const [resolve, waitForRequester] = await Promise.all([
      changeStatus(ticket.id, "Resolved", ticket.version),
      changeStatus(ticket.id, "Waiting for Requester", ticket.version),
    ]);

    expect([resolve.status, waitForRequester.status].filter((status) => status === 200)).toHaveLength(1);
    expect([resolve.status, waitForRequester.status].filter((status) => status === 409)).toHaveLength(1);
    expect(resolve.status).not.toBe(500);
    expect(waitForRequester.status).not.toBe(500);
    const saved = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(saved.version).toBe(ticket.version + 1);
    expect(["Resolved", "Waiting for Requester"]).toContain(saved.status);
    expect(saved.status === "Resolved").toBe(resolve.status === 200);
  });

  it("WF-API-10: concurrent Action/Owner/IT Priority writes cannot invalidate a resolving snapshot", async () => {
    const scenarios = ["action", "owner", "priority"] as const;

    for (const scenario of scenarios) {
      const ticket = await createTicket();
      await addAction(ticket.id, { status: ActionTakenStatus.COMPLETED, result: "Resolution gate satisfied" });

      let aggregateMutation: Promise<request.Response>;
      if (scenario === "action") {
        aggregateMutation = request(app)
          .post(`/api/v1/staff/tickets/${ticket.id}/actions-taken`)
          .set("Cookie", staffCookie)
          .set("Origin", TEST_ORIGIN)
          .send({
            clientRequestId: crypto.randomUUID(),
            expectedTicketVersion: ticket.version,
            actionDateTime: new Date(Date.now() - 60_000).toISOString(),
            description: "Concurrent Action create",
            assigneeId: staffId,
            followUpRequired: false,
            followUpNote: null,
            attachmentNotes: null,
          });
      } else if (scenario === "owner") {
        aggregateMutation = request(app)
          .patch(`/api/v1/staff/tickets/${ticket.id}/owner`)
          .set("Cookie", staffCookie)
          .set("Origin", TEST_ORIGIN)
          .send({ action: "assign", ownerId: otherStaffId, expectedVersion: ticket.version });
      } else {
        aggregateMutation = request(app)
          .patch(`/api/v1/staff/tickets/${ticket.id}/it-priority`)
          .set("Cookie", staffCookie)
          .set("Origin", TEST_ORIGIN)
          .send({ itPriority: "High", expectedVersion: ticket.version });
      }

      const [resolve, mutation] = await Promise.all([
        changeStatus(ticket.id, "Resolved", ticket.version),
        aggregateMutation,
      ]);
      const mutationSuccess = scenario === "action" ? mutation.status === 201 : mutation.status === 200;

      expect([resolve.status, mutation.status].filter((status) => status === 200 || status === 201)).toHaveLength(1);
      expect(resolve.status).not.toBe(500);
      expect(mutation.status).not.toBe(500);
      expect(resolve.status === 200).not.toBe(mutationSuccess);
      const saved = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(saved.version).toBe(ticket.version + 1);
      expect(saved.status === "Resolved").toBe(resolve.status === 200);
      if (scenario === "owner" && mutationSuccess) expect(saved.ownerId).toBe(otherStaffId);
      if (scenario === "priority" && mutationSuccess) expect(saved.itPriority).toBe("High");
      if (scenario === "action" && mutationSuccess) {
        expect(await getPrisma().actionTaken.count({ where: { ticketId: ticket.id } })).toBe(2);
      }
    }
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

  it("WF-10: Resolve is blocked when a current-cycle Completed Action has an outstanding follow-up", async () => {
    const ticket = await createTicket();
    await addAction(ticket.id, {
      status: ActionTakenStatus.COMPLETED,
      result: "Completed but follow-up remains",
      followUpRequired: true,
      followUpNote: "Requester confirmation still required",
    });

    const result = await changeStatus(ticket.id, "Resolved", ticket.version);

    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("RESOLUTION_GATE_NOT_MET");
    const saved = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(saved).toMatchObject({ status: "In Progress", version: ticket.version, resolvedAt: null });
  });

  it("FU-API-06/07: completing the outstanding follow-up allows Resolve", async () => {
    const ticket = await createTicket();
    const action = await addAction(ticket.id, {
      status: ActionTakenStatus.COMPLETED,
      result: "Completed but follow-up remains",
      followUpRequired: true,
      followUpNote: "Requester confirmation still required",
    });

    const blocked = await changeStatus(ticket.id, "Resolved", ticket.version);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("RESOLUTION_GATE_NOT_MET");

    const completedFollowUp = await request(app)
      .patch(`/api/v1/staff/actions-taken/${action.id}/follow-up`)
      .set("Cookie", staffCookie)
      .set("Origin", TEST_ORIGIN)
      .send({ expectedVersion: action.version, expectedTicketVersion: ticket.version });
    expect(completedFollowUp.status).toBe(200);
    expect(completedFollowUp.body.followUpStatus).toBe("COMPLETED");

    const resolved = await changeStatus(ticket.id, "Resolved", ticket.version + 1);
    expect(resolved.status).toBe(200);
    expect(resolved.body.status).toBe("Resolved");
  });

});
