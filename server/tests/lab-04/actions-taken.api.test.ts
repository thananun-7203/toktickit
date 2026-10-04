import crypto from "node:crypto";
import request from "supertest";
import { ActionTakenStatus, UserRole } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSessionCookie, createTestUser, TEST_ORIGIN } from "../lab-03/testAuth.js";

describe("Lab 4 Actions Taken API", () => {
  const createdUserIds: number[] = [];
  const createdTicketIds: number[] = [];
  let categoryId: number;
  let systemId: number;
  let requesterAId: number;
  let requesterBId: number;
  let staffAId: number;
  let staffBId: number;
  let staffInactiveId: number;
  let adminId: number;
  let requesterACookie: string;
  let requesterBCookie: string;
  let staffACookie: string;
  let staffBCookie: string;
  let adminCookie: string;

  beforeAll(async () => {
    const prisma = getPrisma();
    const category = await prisma.category.findUnique({ where: { name: "Software" } });
    const system = await prisma.relatedSystem.findUnique({ where: { name: "Report Portal" } });
    if (!category || !system) throw new Error("Reference data must be seeded before Actions Taken API tests");
    categoryId = category.id;
    systemId = system.id;

    const [requesterA, requesterB, staffA, staffB, staffInactive, admin] = await Promise.all([
      createTestUser({ name: "Action Requester A" }),
      createTestUser({ name: "Action Requester B" }),
      createTestUser({ name: "Action Staff A", role: UserRole.IT_STAFF }),
      createTestUser({ name: "Action Staff B", role: UserRole.IT_STAFF }),
      createTestUser({ name: "Action Inactive", role: UserRole.IT_STAFF, isActive: false }),
      createTestUser({ name: "Action Admin", role: UserRole.ADMINISTRATOR }),
    ]);
    createdUserIds.push(requesterA.id, requesterB.id, staffA.id, staffB.id, staffInactive.id, admin.id);
    requesterAId = requesterA.id;
    requesterBId = requesterB.id;
    staffAId = staffA.id;
    staffBId = staffB.id;
    staffInactiveId = staffInactive.id;
    adminId = admin.id;
    requesterACookie = (await createSessionCookie(requesterA.id)).cookie;
    requesterBCookie = (await createSessionCookie(requesterB.id)).cookie;
    staffACookie = (await createSessionCookie(staffA.id)).cookie;
    staffBCookie = (await createSessionCookie(staffB.id)).cookie;
    adminCookie = (await createSessionCookie(admin.id)).cookie;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  async function ticket(options: {
    requesterId?: number;
    ownerId?: number | null;
    status?: string;
    version?: number;
    workflowCycle?: number;
  } = {}) {
    const marker = crypto.randomUUID().slice(0, 8);
    const row = await getPrisma().ticket.create({
      data: {
        ticketNumber: `TKT-ACT-${Date.now()}-${marker}`,
        summary: `Action API ${marker}`,
        description: "Action API test ticket",
        requestedPriority: "Medium",
        itPriority: "Medium",
        status: options.status ?? "Open",
        version: options.version ?? 1,
        workflowCycle: options.workflowCycle ?? 1,
        requesterId: options.requesterId ?? requesterAId,
        ownerId: options.ownerId === undefined ? staffAId : options.ownerId,
        categoryId,
        relatedSystemId: systemId,
      },
    });
    createdTicketIds.push(row.id);
    return row;
  }

  function createBody(ticketVersion = 1, overrides: Record<string, unknown> = {}) {
    return {
      clientRequestId: crypto.randomUUID(),
      expectedTicketVersion: ticketVersion,
      actionDateTime: new Date(Date.now() - 60_000).toISOString(),
      description: "Inspect reporting logs and reproduce the failure.",
      assigneeId: staffAId,
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: "Review the requester screenshot.",
      ...overrides,
    };
  }

  async function createViaApi(ticketId: number, cookie = staffACookie, body: Record<string, unknown> = createBody()) {
    return request(app)
      .post(`/api/v1/staff/tickets/${ticketId}/actions-taken`)
      .set("Cookie", cookie)
      .set("Origin", TEST_ORIGIN)
      .send(body);
  }

  it("AT-API-01/02/08/09/10/AZ4-02: Staff/Admin create and visible roles read with stable ordering and Requester isolation", async () => {
    const t = await ticket();
    const empty = await request(app).get(`/api/v1/tickets/${t.id}/actions-taken`).set("Cookie", requesterACookie);
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({ items: [] });

    const first = await createViaApi(t.id, staffACookie, createBody(1, {
      assigneeId: staffBId,
      actionDateTime: "2026-09-29T08:00:00.000Z",
    }));
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({
      ticketId: t.id,
      status: "Planned",
      version: 1,
      workflowCycle: 1,
      createdBy: { id: staffAId, role: "IT_STAFF" },
      assignee: { id: staffBId, role: "IT_STAFF" },
      performedBy: null,
      cancelledBy: null,
    });

    const second = await createViaApi(t.id, adminCookie, createBody(2, {
      assigneeId: adminId,
      actionDateTime: "2026-09-29T09:00:00.000Z",
    }));
    expect(second.status).toBe(201);
    expect(second.body.createdBy.id).toBe(adminId);

    const staffDetail = await request(app).get(`/api/v1/staff/tickets/${t.id}`).set("Cookie", staffACookie);
    expect(staffDetail.status).toBe(200);
    expect(staffDetail.body).toMatchObject({ version: 3, workflowCycle: 1, resolvedAt: null });

    const requesterDetail = await request(app).get(`/api/v1/tickets/${t.id}`).set("Cookie", requesterACookie);
    expect(requesterDetail.status).toBe(200);
    expect(requesterDetail.body).toMatchObject({ version: 3, workflowCycle: 1, resolvedAt: null });

    const own = await request(app).get(`/api/v1/tickets/${t.id}/actions-taken`).set("Cookie", requesterACookie);
    expect(own.status).toBe(200);
    expect(own.body.items.map((item: any) => item.id)).toEqual([second.body.id, first.body.id]);

    const staffRead = await request(app).get(`/api/v1/tickets/${t.id}/actions-taken`).set("Cookie", staffBCookie);
    expect(staffRead.status).toBe(200);
    expect(staffRead.body.items).toHaveLength(2);

    const otherRequester = await request(app).get(`/api/v1/tickets/${t.id}/actions-taken`).set("Cookie", requesterBCookie);
    expect(otherRequester.status).toBe(404);
  });

  it("AT-API-27/28: lost-response retry is idempotent and conflicting key reuse is rejected", async () => {
    const t = await ticket();
    const body = createBody(1, { assigneeId: staffBId });
    const first = await createViaApi(t.id, staffACookie, body);
    expect(first.status).toBe(201);

    const retry = await createViaApi(t.id, staffACookie, body);
    expect(retry.status).toBe(200);
    expect(retry.body.id).toBe(first.body.id);
    expect(await getPrisma().actionTaken.count({ where: { ticketId: t.id } })).toBe(1);
    expect((await getPrisma().ticket.findUniqueOrThrow({ where: { id: t.id } })).version).toBe(2);

    const changed = await createViaApi(t.id, staffACookie, { ...body, description: "Different logical payload" });
    expect(changed.status).toBe(409);
    expect(changed.body.error.code).toBe("IDEMPOTENCY_KEY_REUSE");

    const differentCreator = await createViaApi(t.id, adminCookie, body);
    expect(differentCreator.status).toBe(409);
    expect(differentCreator.body.error.code).toBe("IDEMPOTENCY_KEY_REUSE");
    expect(await getPrisma().actionTaken.count({ where: { ticketId: t.id } })).toBe(1);
  });

  it("AT-API-27R: retry compares immutable original create intent even after edit/reassign", async () => {
    const t = await ticket();
    const original = createBody(1, { assigneeId: staffAId });
    const first = await createViaApi(t.id, staffACookie, original);
    expect(first.status).toBe(201);
    expect((await getPrisma().ticket.findUniqueOrThrow({ where: { id: t.id } })).version).toBe(2);

    const mutated = await request(app)
      .patch(`/api/v1/staff/actions-taken/${first.body.id}`)
      .set("Cookie", staffACookie)
      .set("Origin", TEST_ORIGIN)
      .send({
        expectedVersion: 1,
        expectedTicketVersion: 2,
        assigneeId: staffBId,
        description: "Mutable state changed after the create response was lost.",
      });
    expect(mutated.status).toBe(200);
    expect(mutated.body.assignee.id).toBe(staffBId);
    const parentAfterMutation = await getPrisma().ticket.findUniqueOrThrow({ where: { id: t.id } });
    expect(parentAfterMutation.version).toBe(3);

    // The retry intentionally carries the old expectedTicketVersion from the
    // original POST. Idempotency lookup/fingerprint comparison happens first.
    const retry = await createViaApi(t.id, staffACookie, original);
    expect(retry.status).toBe(200);
    expect(retry.body.id).toBe(first.body.id);
    expect(retry.body.description).toBe("Mutable state changed after the create response was lost.");
    expect(retry.body.assignee.id).toBe(staffBId);
    expect(await getPrisma().actionTaken.count({ where: { ticketId: t.id } })).toBe(1);
    expect((await getPrisma().ticket.findUniqueOrThrow({ where: { id: t.id } })).version).toBe(3);

    const conflictingOriginalIntent = await createViaApi(t.id, staffACookie, {
      ...original,
      description: "A genuinely different original create payload",
    });
    expect(conflictingOriginalIntent.status).toBe(409);
    expect(conflictingOriginalIntent.body.error.code).toBe("IDEMPOTENCY_KEY_REUSE");
  });

  it("AT-API-32: Owner and IT Priority mutations invalidate stale Action expectedTicketVersion", async () => {
    const ownerTicket = await ticket({ ownerId: staffAId });
    const ownerChange = await request(app)
      .patch(`/api/v1/staff/tickets/${ownerTicket.id}/owner`)
      .set("Cookie", adminCookie)
      .set("Origin", TEST_ORIGIN)
      .send({ action: "assign", ownerId: staffBId, expectedVersion: ownerTicket.version });
    expect(ownerChange.status).toBe(200);
    expect(ownerChange.body.version).toBe(ownerTicket.version + 1);
    const staleAfterOwner = await createViaApi(ownerTicket.id, staffACookie, createBody(ownerTicket.version));
    expect(staleAfterOwner.status).toBe(409);
    expect(staleAfterOwner.body.error.code).toBe("STALE_TICKET_STATE");

    const priorityTicket = await ticket({ ownerId: staffAId });
    const priorityChange = await request(app)
      .patch(`/api/v1/staff/tickets/${priorityTicket.id}/it-priority`)
      .set("Cookie", staffACookie)
      .set("Origin", TEST_ORIGIN)
      .send({ itPriority: "High", expectedVersion: priorityTicket.version });
    expect(priorityChange.status).toBe(200);
    expect(priorityChange.body.version).toBe(priorityTicket.version + 1);
    const staleAfterPriority = await createViaApi(priorityTicket.id, staffACookie, createBody(priorityTicket.version));
    expect(staleAfterPriority.status).toBe(409);
    expect(staleAfterPriority.body.error.code).toBe("STALE_TICKET_STATE");
  });

  it("AT-API-33: concurrent Owner vs Action mutation has one aggregate-version winner and no 500", async () => {
    const t = await ticket({ ownerId: staffAId });
    const created = await createViaApi(t.id, staffACookie, createBody(1, { assigneeId: staffAId }));
    expect(created.status).toBe(201);

    const [ownerResult, actionResult] = await Promise.all([
      request(app)
        .patch(`/api/v1/staff/tickets/${t.id}/owner`)
        .set("Cookie", adminCookie).set("Origin", TEST_ORIGIN)
        .send({ action: "assign", ownerId: staffBId, expectedVersion: 2 }),
      request(app)
        .patch(`/api/v1/staff/actions-taken/${created.body.id}`)
        .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
        .send({ expectedVersion: 1, expectedTicketVersion: 2, description: "Competing aggregate mutation" }),
    ]);

    expect([ownerResult.status, actionResult.status].filter((status) => status === 200)).toHaveLength(1);
    expect([ownerResult.status, actionResult.status].filter((status) => status === 409)).toHaveLength(1);
    expect(ownerResult.status).not.toBe(500);
    expect(actionResult.status).not.toBe(500);
    expect((await getPrisma().ticket.findUniqueOrThrow({ where: { id: t.id } })).version).toBe(3);
  });

  it("AT-API-03/04/06/07/20/23: invalid create input and protected identities fail without mutation", async () => {
    const t = await ticket();
    const cases: Array<{ body: Record<string, unknown>; expectedCode?: string }> = [
      { body: createBody(1, { assigneeId: staffInactiveId }), expectedCode: "ACTION_ASSIGNEE_NOT_ELIGIBLE" },
      { body: createBody(1, { assigneeId: requesterAId }), expectedCode: "ACTION_ASSIGNEE_NOT_ELIGIBLE" },
      { body: createBody(1, { assigneeId: 999999999 }), expectedCode: "ACTION_ASSIGNEE_NOT_ELIGIBLE" },
      { body: createBody(1, { assigneeId: 999999999 }), expectedCode: "ACTION_ASSIGNEE_NOT_ELIGIBLE" },
      { body: createBody(1, { followUpRequired: true, followUpNote: "   " }) },
      { body: createBody(1, { description: "😀".repeat(2001) }) },
      { body: createBody(1, { createdById: adminId }) },
      { body: createBody(1, { performedById: adminId }) },
    ];
    for (const entry of cases) {
      const res = await createViaApi(t.id, staffACookie, entry.body);
      expect(res.status).toBe(entry.expectedCode ? 409 : 400);
      if (entry.expectedCode) expect(res.body.error.code).toBe(entry.expectedCode);
    }
    expect(await getPrisma().actionTaken.count({ where: { ticketId: t.id } })).toBe(0);

    for (const status of ["Resolved", "Closed", "Cancelled"]) {
      const terminal = await ticket({ status });
      const res = await createViaApi(terminal.id, staffACookie, createBody(1));
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("ACTION_TICKET_NOT_ACTIVE");
    }
  });

  it("AT-API-31: equivalent timezone offsets persist the same UTC instant and future values are rejected", async () => {
    const t = await ticket();
    const instant = new Date(Date.now() - 60_000);
    const offset = new Date(instant.getTime() + 7 * 60 * 60 * 1000).toISOString().replace("Z", "+07:00");
    const created = await createViaApi(t.id, staffACookie, createBody(1, { actionDateTime: offset }));
    expect(created.status).toBe(201);
    expect(new Date(created.body.actionDateTime).getTime()).toBe(instant.getTime());

    const t2 = await ticket();
    const future = new Date(Date.now() + 6 * 60 * 1000).toISOString();
    const rejected = await createViaApi(t2.id, staffACookie, createBody(1, { actionDateTime: future }));
    expect(rejected.status).toBe(400);
  });

  it("AT-API-06/07: accepts the 2,000-code-point boundary and normalizes follow-up note to null when false", async () => {
    const t = await ticket();
    const created = await createViaApi(t.id, staffACookie, createBody(1, {
      description: "😀".repeat(2000),
      followUpRequired: false,
      followUpNote: "This supplied note must not persist when follow-up is false.",
      attachmentNotes: "😀".repeat(2000),
    }));
    expect(created.status).toBe(201);
    expect(Array.from(created.body.description)).toHaveLength(2000);
    expect(Array.from(created.body.attachmentNotes)).toHaveLength(2000);
    expect(created.body.followUpRequired).toBe(false);
    expect(created.body.followUpNote).toBeNull();
  });

  it("AT-API-11/12/13/21: edit/reassign increments parent activity/version and rejects stale/ineligible updates", async () => {
    const t = await ticket();
    const created = await createViaApi(t.id, staffACookie, createBody(1));
    expect(created.status).toBe(201);
    await getPrisma().ticket.update({
      where: { id: t.id },
      data: { updatedAt: new Date("2020-01-01T00:00:00.000Z") },
    });

    const edited = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}`)
      .set("Cookie", staffACookie)
      .set("Origin", TEST_ORIGIN)
      .send({
        expectedVersion: 1,
        expectedTicketVersion: 2,
        assigneeId: staffBId,
        description: "Reassigned after reviewing the first diagnostic result.",
        followUpRequired: true,
        followUpNote: "Verify after the next report run.",
      });
    expect(edited.status).toBe(200);
    expect(edited.body.version).toBe(2);
    expect(edited.body.assignee.id).toBe(staffBId);
    const parentAfterEdit = await getPrisma().ticket.findUniqueOrThrow({ where: { id: t.id } });
    expect(parentAfterEdit.version).toBe(3);
    expect(parentAfterEdit.updatedAt.getTime()).toBeGreaterThan(new Date("2020-01-01T00:00:00.000Z").getTime());

    const staleAction = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}`)
      .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
      .send({ expectedVersion: 1, expectedTicketVersion: 3, description: "Stale edit" });
    expect(staleAction.status).toBe(409);
    expect(staleAction.body.error.code).toBe("STALE_ACTION_TAKEN");

    const staleTicket = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}`)
      .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
      .send({ expectedVersion: 2, expectedTicketVersion: 2, description: "Stale parent edit" });
    expect(staleTicket.status).toBe(409);
    expect(staleTicket.body.error.code).toBe("STALE_TICKET_STATE");

    const ineligible = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}`)
      .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
      .send({ expectedVersion: 2, expectedTicketVersion: 3, assigneeId: staffInactiveId });
    expect(ineligible.status).toBe(409);
    expect(ineligible.body.error.code).toBe("ACTION_ASSIGNEE_NOT_ELIGIBLE");

    const raceTicket = await ticket();
    const raceAction = await createViaApi(raceTicket.id, staffACookie, createBody(1));
    expect(raceAction.status).toBe(201);
    const [editA, editB] = await Promise.all([
      request(app)
        .patch(`/api/v1/staff/actions-taken/${raceAction.body.id}`)
        .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
        .send({ expectedVersion: 1, expectedTicketVersion: 2, description: "Concurrent edit A" }),
      request(app)
        .patch(`/api/v1/staff/actions-taken/${raceAction.body.id}`)
        .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
        .send({ expectedVersion: 1, expectedTicketVersion: 2, description: "Concurrent edit B" }),
    ]);
    expect([editA.status, editB.status].filter((status) => status === 200)).toHaveLength(1);
    expect([editA.status, editB.status].filter((status) => status === 409)).toHaveLength(1);
    expect((await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: raceAction.body.id } })).version).toBe(2);
  });

  it("AT-API-14/15/16/17/19/22/30/AZ4-12: lifecycle transitions, stale retry, assignee-only completion, validation, and terminal immutability", async () => {
    const t = await ticket();
    const created = await createViaApi(t.id, staffACookie, createBody(1, { assigneeId: staffBId }));

    const started = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}/status`)
      .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
      .send({ status: "In Progress", expectedVersion: 1, expectedTicketVersion: 2 });
    expect(started.status).toBe(200);
    expect(started.body).toMatchObject({ status: "In Progress", version: 2 });

    const repeatedStale = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}/status`)
      .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
      .send({ status: "In Progress", expectedVersion: 1, expectedTicketVersion: 2 });
    expect(repeatedStale.status).toBe(409);
    expect(["STALE_ACTION_TAKEN", "STALE_TICKET_STATE"]).toContain(repeatedStale.body.error.code);
    expect((await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: created.body.id } })).version).toBe(2);

    const selfTransition = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}/status`)
      .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
      .send({ status: "In Progress", expectedVersion: 2, expectedTicketVersion: 3 });
    expect(selfTransition.status).toBe(409);
    expect(selfTransition.body.error.code).toBe("INVALID_ACTION_STATUS_TRANSITION");

    const nonAssignee = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}/status`)
      .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
      .send({
        status: "Completed", expectedVersion: 2, expectedTicketVersion: 3,
        result: "Done", followUpRequired: false, followUpNote: null,
      });
    expect(nonAssignee.status).toBe(409);
    expect(nonAssignee.body.error.code).toBe("ACTION_COMPLETION_REQUIRES_ASSIGNEE");

    const missingResult = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}/status`)
      .set("Cookie", staffBCookie).set("Origin", TEST_ORIGIN)
      .send({ status: "Completed", expectedVersion: 2, expectedTicketVersion: 3, followUpRequired: false, followUpNote: null });
    expect(missingResult.status).toBe(400);

    const invalidFollowUp = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}/status`)
      .set("Cookie", staffBCookie).set("Origin", TEST_ORIGIN)
      .send({
        status: "Completed", expectedVersion: 2, expectedTicketVersion: 3,
        result: "Done", followUpRequired: true, followUpNote: "   ",
      });
    expect(invalidFollowUp.status).toBe(400);

    const completed = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}/status`)
      .set("Cookie", staffBCookie).set("Origin", TEST_ORIGIN)
      .send({
        status: "Completed", expectedVersion: 2, expectedTicketVersion: 3,
        result: "Export completed after worker restart.", followUpRequired: false, followUpNote: null,
      });
    expect(completed.status).toBe(200);
    expect(completed.body).toMatchObject({
      status: "Completed",
      version: 3,
      performedBy: { id: staffBId },
      cancelledBy: null,
    });
    expect(completed.body.completedAt).toEqual(expect.any(String));

    const terminalTransition = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}/status`)
      .set("Cookie", staffBCookie).set("Origin", TEST_ORIGIN)
      .send({ status: "Cancelled", expectedVersion: 3, expectedTicketVersion: 4 });
    expect(terminalTransition.status).toBe(409);
    expect(terminalTransition.body.error.code).toBe("INVALID_ACTION_STATUS_TRANSITION");

    const terminalEdit = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}`)
      .set("Cookie", staffBCookie).set("Origin", TEST_ORIGIN)
      .send({ expectedVersion: 3, expectedTicketVersion: 4, description: "Should not change" });
    expect(terminalEdit.status).toBe(409);
    expect(terminalEdit.body.error.code).toBe("ACTION_NOT_EDITABLE");

    const directCompleteTicket = await ticket();
    const directCompleteAction = await createViaApi(directCompleteTicket.id, staffACookie, createBody(1, { assigneeId: staffAId }));
    const directComplete = await request(app)
      .patch(`/api/v1/staff/actions-taken/${directCompleteAction.body.id}/status`)
      .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
      .send({
        status: "Completed", expectedVersion: 1, expectedTicketVersion: 2,
        result: "Completed directly from Planned", followUpRequired: false, followUpNote: null,
      });
    expect(directComplete.status).toBe(200);
    expect(directComplete.body.status).toBe("Completed");

    const cancelFromProgressTicket = await ticket();
    const cancelFromProgressAction = await createViaApi(cancelFromProgressTicket.id, staffACookie, createBody(1));
    const progress = await request(app)
      .patch(`/api/v1/staff/actions-taken/${cancelFromProgressAction.body.id}/status`)
      .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
      .send({ status: "In Progress", expectedVersion: 1, expectedTicketVersion: 2 });
    expect(progress.status).toBe(200);
    const cancelFromProgress = await request(app)
      .patch(`/api/v1/staff/actions-taken/${cancelFromProgressAction.body.id}/status`)
      .set("Cookie", adminCookie).set("Origin", TEST_ORIGIN)
      .send({ status: "Cancelled", expectedVersion: 2, expectedTicketVersion: 3 });
    expect(cancelFromProgress.status).toBe(200);
    expect(cancelFromProgress.body.status).toBe("Cancelled");
  });

  it("AT-API-18: cancellation records backend actor/time and leaves completion provenance null", async () => {
    const t = await ticket();
    const created = await createViaApi(t.id, staffACookie, createBody(1));
    const cancelled = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}/status`)
      .set("Cookie", adminCookie).set("Origin", TEST_ORIGIN)
      .send({ status: "Cancelled", expectedVersion: 1, expectedTicketVersion: 2 });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body).toMatchObject({ status: "Cancelled", performedBy: null, completedAt: null, cancelledBy: { id: adminId } });
    expect(cancelled.body.cancelledAt).toEqual(expect.any(String));
  });

  it("FU-API-01/02/04/05: required follow-up becomes outstanding and can be completed with both version tokens", async () => {
    const t = await ticket();
    const created = await createViaApi(t.id, staffACookie, createBody(1, { assigneeId: staffAId }));
    const completed = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}/status`)
      .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
      .send({
        status: "Completed", expectedVersion: 1, expectedTicketVersion: 2,
        result: "Completed with a required requester confirmation.",
        followUpRequired: true, followUpNote: "Confirm the next report export with the requester.",
      });
    expect(completed.status).toBe(200);
    expect(completed.body).toMatchObject({
      status: "Completed",
      followUpRequired: true,
      followUpStatus: "OUTSTANDING",
      followUpCompletedBy: null,
      followUpCompletedAt: null,
      version: 2,
    });

    const staleAction = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}/follow-up`)
      .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
      .send({ expectedVersion: 1, expectedTicketVersion: 3 });
    expect(staleAction.status).toBe(409);
    expect(staleAction.body.error.code).toBe("STALE_ACTION_TAKEN");

    const staleTicket = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}/follow-up`)
      .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
      .send({ expectedVersion: 2, expectedTicketVersion: 2 });
    expect(staleTicket.status).toBe(409);
    expect(staleTicket.body.error.code).toBe("STALE_TICKET_STATE");

    const followUpCompleted = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}/follow-up`)
      .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
      .send({ expectedVersion: 2, expectedTicketVersion: 3 });
    expect(followUpCompleted.status).toBe(200);
    expect(followUpCompleted.body).toMatchObject({
      status: "Completed",
      followUpStatus: "COMPLETED",
      followUpCompletedBy: { id: staffAId },
      version: 3,
    });
    expect(followUpCompleted.body.followUpCompletedAt).toEqual(expect.any(String));

    const savedTicket = await getPrisma().ticket.findUniqueOrThrow({ where: { id: t.id } });
    expect(savedTicket.version).toBe(4);
  });

  it("FU-API-03: Requester cannot complete an Action follow-up", async () => {
    const t = await ticket();
    const created = await createViaApi(t.id, staffACookie, createBody(1, { assigneeId: staffAId }));
    const completed = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}/status`)
      .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
      .send({
        status: "Completed", expectedVersion: 1, expectedTicketVersion: 2,
        result: "Completed; requester follow-up remains.",
        followUpRequired: true, followUpNote: "Confirm with requester.",
      });
    expect(completed.status).toBe(200);

    const attempt = await request(app)
      .patch(`/api/v1/staff/actions-taken/${created.body.id}/follow-up`)
      .set("Cookie", requesterACookie).set("Origin", TEST_ORIGIN)
      .send({ expectedVersion: 2, expectedTicketVersion: 3 });
    expect(attempt.status).toBe(403);
    expect(attempt.body.error.code).toBe("FORBIDDEN");
  });

  it("AT-API-29: reassign-vs-complete race commits at most one authoritative outcome", async () => {
    const t = await ticket();
    const created = await createViaApi(t.id, staffACookie, createBody(1, { assigneeId: staffAId }));

    const [reassign, complete] = await Promise.all([
      request(app)
        .patch(`/api/v1/staff/actions-taken/${created.body.id}`)
        .set("Cookie", adminCookie).set("Origin", TEST_ORIGIN)
        .send({ expectedVersion: 1, expectedTicketVersion: 2, assigneeId: staffBId }),
      request(app)
        .patch(`/api/v1/staff/actions-taken/${created.body.id}/status`)
        .set("Cookie", staffACookie).set("Origin", TEST_ORIGIN)
        .send({
          status: "Completed", expectedVersion: 1, expectedTicketVersion: 2,
          result: "Race completion", followUpRequired: false, followUpNote: null,
        }),
    ]);
    expect([reassign.status, complete.status].filter((status) => status === 200)).toHaveLength(1);
    expect([reassign.status, complete.status].filter((status) => status === 409)).toHaveLength(1);

    const saved = await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: created.body.id } });
    if (saved.status === ActionTakenStatus.COMPLETED) {
      expect(saved.assigneeId).toBe(staffAId);
      expect(saved.performedById).toBe(staffAId);
    } else {
      expect(saved.status).toBe(ActionTakenStatus.PLANNED);
      expect(saved.assigneeId).toBe(staffBId);
      expect(saved.performedById).toBeNull();
    }
  });

  it("AT-API-25/AZ4-11: Administrator cannot deactivate/demote a user with an active assigned Action", async () => {
    const actionOnlyAssignee = await createTestUser({
      name: `Action Only Assignee ${crypto.randomUUID().slice(0, 6)}`,
      role: UserRole.IT_STAFF,
    });
    createdUserIds.push(actionOnlyAssignee.id);
    const t = await ticket({ ownerId: null });
    const created = await createViaApi(t.id, staffACookie, createBody(1, { assigneeId: actionOnlyAssignee.id }));
    expect(created.status).toBe(201);

    const deactivate = await request(app)
      .patch(`/api/v1/admin/users/${actionOnlyAssignee.id}`)
      .set("Cookie", adminCookie).set("Origin", TEST_ORIGIN)
      .send({ isActive: false });
    expect(deactivate.status).toBe(409);
    expect(deactivate.body.error.code).toBe("ACTIVE_ACTIONS_REQUIRE_REASSIGNMENT");
    expect((await getPrisma().user.findUniqueOrThrow({ where: { id: actionOnlyAssignee.id } })).isActive).toBe(true);

    const demote = await request(app)
      .patch(`/api/v1/admin/users/${actionOnlyAssignee.id}`)
      .set("Cookie", adminCookie).set("Origin", TEST_ORIGIN)
      .send({ role: "REQUESTER" });
    expect(demote.status).toBe(409);
    expect(demote.body.error.code).toBe("ACTIVE_ACTIONS_REQUIRE_REASSIGNMENT");
  });

  it("AT-API-26/AZ4-09: concurrent create assignment vs deactivation preserves assignee eligibility", async () => {
    const raceTarget = await createTestUser({ name: `Action Race Target ${crypto.randomUUID().slice(0, 6)}`, role: UserRole.IT_STAFF });
    createdUserIds.push(raceTarget.id);
    const t = await ticket({ ownerId: null });

    const [createResult, deactivateResult] = await Promise.all([
      createViaApi(t.id, staffACookie, createBody(1, { assigneeId: raceTarget.id })),
      request(app)
        .patch(`/api/v1/admin/users/${raceTarget.id}`)
        .set("Cookie", adminCookie).set("Origin", TEST_ORIGIN)
        .send({ isActive: false }),
    ]);

    expect([createResult.status, deactivateResult.status].filter((status) => status === 200 || status === 201)).toHaveLength(1);
    expect([createResult.status, deactivateResult.status].filter((status) => status === 409)).toHaveLength(1);

    const savedUser = await getPrisma().user.findUniqueOrThrow({ where: { id: raceTarget.id } });
    const activeAssigned = await getPrisma().actionTaken.count({
      where: {
        ticketId: t.id,
        assigneeId: raceTarget.id,
        status: { in: [ActionTakenStatus.PLANNED, ActionTakenStatus.IN_PROGRESS] },
      },
    });
    const remainsEligible = savedUser.isActive
      && (savedUser.role === UserRole.IT_STAFF || savedUser.role === UserRole.ADMINISTRATOR);
    expect(activeAssigned > 0 ? remainsEligible : true).toBe(true);
  });

  it("AT-API-13/26/AZ4-09: concurrent reassign vs deactivation preserves assignee eligibility", async () => {
    const raceTarget = await createTestUser({ name: `Action Reassign Target ${crypto.randomUUID().slice(0, 6)}`, role: UserRole.IT_STAFF });
    createdUserIds.push(raceTarget.id);
    const t = await ticket({ ownerId: null });
    const created = await createViaApi(t.id, staffACookie, createBody(1, { assigneeId: staffAId }));
    expect(created.status).toBe(201);

    const [reassignResult, deactivateResult] = await Promise.all([
      request(app)
        .patch(`/api/v1/staff/actions-taken/${created.body.id}`)
        .set("Cookie", adminCookie).set("Origin", TEST_ORIGIN)
        .send({ expectedVersion: 1, expectedTicketVersion: 2, assigneeId: raceTarget.id }),
      request(app)
        .patch(`/api/v1/admin/users/${raceTarget.id}`)
        .set("Cookie", adminCookie).set("Origin", TEST_ORIGIN)
        .send({ isActive: false }),
    ]);

    expect([reassignResult.status, deactivateResult.status].filter((status) => status === 200)).toHaveLength(1);
    expect([reassignResult.status, deactivateResult.status].filter((status) => status === 409)).toHaveLength(1);

    const savedUser = await getPrisma().user.findUniqueOrThrow({ where: { id: raceTarget.id } });
    const savedAction = await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: created.body.id } });
    if (savedAction.assigneeId === raceTarget.id) {
      expect(savedUser.isActive).toBe(true);
      expect([UserRole.IT_STAFF, UserRole.ADMINISTRATOR]).toContain(savedUser.role);
    }
  });
});
