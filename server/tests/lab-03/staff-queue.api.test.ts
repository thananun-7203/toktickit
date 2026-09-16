import crypto from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { cleanupTestUsers, createSessionCookie, createTestUser } from "./testAuth.js";

describe("GET /api/v1/staff/tickets", () => {
  const stamp = crypto.randomUUID().slice(0, 8);
  const userIds: number[] = [];
  const ticketIds: number[] = [];
  let categoryAId = 0;
  let categoryBId = 0;
  let systemAId = 0;
  let systemBId = 0;
  let staffId = 0;
  let staffCookie = "";
  let otherStaffId = 0;
  let adminCookie = "";
  let requesterCookie = "";
  let gatedStaffCookie = "";

  beforeAll(async () => {
    const prisma = getPrisma();
    const requesterA = await createTestUser({ name: `Queue Requester Alpha ${stamp}`, email: `queue.alpha.${stamp}@toktick.it` });
    const requesterB = await createTestUser({ name: `Queue Requester Beta ${stamp}`, email: `queue.beta.${stamp}@toktick.it` });
    const staff = await createTestUser({ role: UserRole.IT_STAFF, name: `Queue Staff ${stamp}` });
    const otherStaff = await createTestUser({ role: UserRole.IT_STAFF, name: `Queue Staff Other ${stamp}` });
    const inactiveStaff = await createTestUser({ role: UserRole.IT_STAFF, name: `Queue Staff Inactive ${stamp}`, isActive: false });
    const gatedStaff = await createTestUser({ role: UserRole.IT_STAFF, name: `Queue Staff Must Change ${stamp}`, mustChangePassword: true });
    const admin = await createTestUser({ role: UserRole.ADMINISTRATOR, name: `Queue Admin ${stamp}` });
    userIds.push(requesterA.id, requesterB.id, staff.id, otherStaff.id, inactiveStaff.id, gatedStaff.id, admin.id);
    staffId = staff.id;
    otherStaffId = otherStaff.id;
    staffCookie = (await createSessionCookie(staff.id)).cookie;
    adminCookie = (await createSessionCookie(admin.id)).cookie;
    requesterCookie = (await createSessionCookie(requesterA.id)).cookie;
    gatedStaffCookie = (await createSessionCookie(gatedStaff.id)).cookie;

    const categoryA = await prisma.category.create({ data: { name: `Queue Software ${stamp}` } });
    const categoryB = await prisma.category.create({ data: { name: `Queue Hardware ${stamp}` } });
    const systemA = await prisma.relatedSystem.create({ data: { name: `Queue CRM ${stamp}` } });
    const systemB = await prisma.relatedSystem.create({ data: { name: `Queue ERP ${stamp}` } });
    categoryAId = categoryA.id; categoryBId = categoryB.id;
    systemAId = systemA.id; systemBId = systemB.id;

    const rows = [
      { num: "00001", summary: `Alpha export ${stamp}`, req: requesterA.id, rp: "Low", ip: "Low", status: "New", ownerId: null, cat: categoryA.id, sys: systemA.id, day: 1 },
      { num: "00002", summary: `Beta network ${stamp}`, req: requesterB.id, rp: "High", ip: "High", status: "Open", ownerId: staff.id, cat: categoryB.id, sys: systemB.id, day: 4 },
      { num: "00003", summary: `Gamma report ${stamp}`, req: requesterA.id, rp: "Medium", ip: null, status: "In Progress", ownerId: otherStaff.id, cat: categoryA.id, sys: systemB.id, day: 3 },
      { num: "00004", summary: `Delta access ${stamp}`, req: requesterB.id, rp: "High", ip: "Medium", status: "Waiting for Requester", ownerId: staff.id, cat: categoryA.id, sys: systemA.id, day: 2 },
    ];
    for (const row of rows) {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2099-${row.num}-${stamp}`,
          summary: row.summary,
          description: "Queue test",
          requestedPriority: row.rp,
          itPriority: row.ip,
          status: row.status,
          requesterId: row.req,
          ownerId: row.ownerId,
          categoryId: row.cat,
          relatedSystemId: row.sys,
          createdAt: new Date(`2026-01-0${row.day}T00:00:00.000Z`),
        },
      });
      await prisma.ticket.update({ where: { id: ticket.id }, data: { updatedAt: new Date(`2026-02-0${row.day}T00:00:00.000Z`) } });
      ticketIds.push(ticket.id);
    }
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await prisma.category.deleteMany({ where: { id: { in: [categoryAId, categoryBId] } } });
    await prisma.relatedSystem.deleteMany({ where: { id: { in: [systemAId, systemBId] } } });
    await cleanupTestUsers(userIds);
  });

  it("AZ-02/AZ-06: requires auth and permits Staff/Admin but rejects Requester", async () => {
    expect((await request(app).get("/api/v1/staff/tickets")).status).toBe(401);
    expect((await request(app).get("/api/v1/staff/tickets").set("Cookie", requesterCookie)).status).toBe(403);
    expect((await request(app).get("/api/v1/staff/tickets").set("Cookie", staffCookie)).status).toBe(200);
    expect((await request(app).get("/api/v1/staff/tickets").set("Cookie", adminCookie)).status).toBe(200);
    const gated = await request(app).get("/api/v1/staff/tickets").set("Cookie", gatedStaffCookie);
    expect(gated.status).toBe(403);
    expect(gated.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("returns only active IT Staff/Administrators in assignee reference data", async () => {
    const res = await request(app).get("/api/v1/staff/assignees").set("Cookie", staffCookie);
    expect(res.status).toBe(200);
    expect(res.body.some((item: any) => item.id === staffId)).toBe(true);
    expect(res.body.some((item: any) => item.name === `Queue Staff Inactive ${stamp}`)).toBe(false);
    expect(res.body.every((item: any) => item.role === "IT_STAFF" || item.role === "ADMINISTRATOR")).toBe(true);
    expect((await request(app).get("/api/v1/staff/assignees").set("Cookie", requesterCookie)).status).toBe(403);
  });

  it("Q-01/Q-12: default queue is updated-desc with metadata and operational fields", async () => {
    const res = await request(app).get(`/api/v1/staff/tickets?search=${stamp}`).set("Cookie", staffCookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, pageSize: 10, totalItems: 4, totalPages: 1 });
    expect(res.body.items.map((x: any) => x.summary)).toEqual([
      `Beta network ${stamp}`, `Gamma report ${stamp}`, `Delta access ${stamp}`, `Alpha export ${stamp}`,
    ]);
    expect(res.body.items[0]).toEqual(expect.objectContaining({
      ticketNumber: expect.any(String), requestedPriority: "High", itPriority: "High", status: "Open",
      requester: expect.objectContaining({ name: expect.any(String), email: expect.any(String) }),
      category: expect.objectContaining({ id: expect.any(Number), name: expect.any(String) }),
      owner: expect.objectContaining({ id: staffId, name: expect.any(String) }),
      createdAt: expect.any(String), updatedAt: expect.any(String),
    }));
  });

  it("Q-02/Q-03/Q-04: searches Ticket Number, Summary, and Requester name/email", async () => {
    for (const search of [`00003-${stamp}`, `Delta access ${stamp}`, `Queue Requester Alpha ${stamp}`, `queue.beta.${stamp}@toktick.it`]) {
      const res = await request(app).get(`/api/v1/staff/tickets?search=${encodeURIComponent(search)}`).set("Cookie", staffCookie);
      expect(res.status).toBe(200);
      expect(res.body.totalItems).toBeGreaterThan(0);
    }
  });

  it("Q-05/Q-06: filters status and Requested/IT priority including not_recorded", async () => {
    const status = await request(app).get(`/api/v1/staff/tickets?search=${stamp}&status=Open`).set("Cookie", staffCookie);
    expect(status.body.items.map((x: any) => x.status)).toEqual(["Open"]);
    const priority = await request(app).get(`/api/v1/staff/tickets?search=${stamp}&requestedPriority=High&itPriority=Medium`).set("Cookie", staffCookie);
    expect(priority.body.items).toHaveLength(1);
    const missing = await request(app).get(`/api/v1/staff/tickets?search=${stamp}&itPriority=not_recorded`).set("Cookie", staffCookie);
    expect(missing.body.items).toHaveLength(1);
    expect(missing.body.items[0].itPriority).toBeNull();
  });

  it("Q-07/Q-08: filters unassigned, mine, and explicit owner id", async () => {
    const unassigned = await request(app).get(`/api/v1/staff/tickets?search=${stamp}&owner=unassigned`).set("Cookie", staffCookie);
    expect(unassigned.body.items).toHaveLength(1);
    expect(unassigned.body.items[0].owner).toBeNull();
    const mine = await request(app).get(`/api/v1/staff/tickets?search=${stamp}&owner=mine`).set("Cookie", staffCookie);
    expect(mine.body.items).toHaveLength(2);
    const other = await request(app).get(`/api/v1/staff/tickets?search=${stamp}&owner=${otherStaffId}`).set("Cookie", staffCookie);
    expect(other.body.items).toHaveLength(1);
  });

  it("Q-09: combines Category and Related System filters with AND semantics", async () => {
    const res = await request(app).get(`/api/v1/staff/tickets?search=${stamp}&categoryId=${categoryAId}&relatedSystemId=${systemAId}`).set("Cookie", staffCookie);
    expect(res.body.items.map((x: any) => x.summary).sort()).toEqual([`Alpha export ${stamp}`, `Delta access ${stamp}`].sort());
  });

  it("Q-10: supports all documented deterministic sort modes", async () => {
    const expectedFirst: Record<string, string> = {
      updated_desc: `Beta network ${stamp}`,
      created_desc: `Beta network ${stamp}`,
      created_asc: `Alpha export ${stamp}`,
      priority_desc: `Beta network ${stamp}`,
      ticket_number_asc: `Alpha export ${stamp}`,
    };
    for (const [sort, first] of Object.entries(expectedFirst)) {
      const res = await request(app).get(`/api/v1/staff/tickets?search=${stamp}&sort=${sort}`).set("Cookie", staffCookie);
      expect(res.status).toBe(200);
      expect(res.body.items[0].summary).toBe(first);
    }
  });

  it("Q-01/Q-10: paginates after sorting and returns consistent metadata", async () => {
    const page1 = await request(app).get(`/api/v1/staff/tickets?search=${stamp}&page=1&pageSize=2`).set("Cookie", staffCookie);
    const page2 = await request(app).get(`/api/v1/staff/tickets?search=${stamp}&page=2&pageSize=2`).set("Cookie", staffCookie);
    expect(page1.body).toMatchObject({ page: 1, pageSize: 2, totalItems: 4, totalPages: 2 });
    expect(page2.body).toMatchObject({ page: 2, pageSize: 2, totalItems: 4, totalPages: 2 });
    expect(page1.body.items).toHaveLength(2);
    expect(page2.body.items).toHaveLength(2);
  });

  it("Q-11: invalid query returns 400 field errors without crashing", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets?status=Nope&requestedPriority=Urgent&itPriority=Urgent&owner=0&categoryId=x&relatedSystemId=-2&sort=bad&page=0&pageSize=99")
      .set("Cookie", staffCookie);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields).toEqual(expect.objectContaining({ status: expect.any(String), sort: expect.any(String), page: expect.any(String) }));
  });
});
