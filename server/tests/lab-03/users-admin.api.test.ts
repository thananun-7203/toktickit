import crypto from "node:crypto";
import { UserRole } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword, verifyPassword } from "../../src/password.js";
import {
  createSessionCookie,
  DEFAULT_TEST_PASSWORD,
  TEST_ORIGIN,
} from "./testAuth.js";

describe("Lab 3 Administrator User Management", () => {
  const userIds: number[] = [];
  const ticketIds: number[] = [];
  let sharedPasswordHash = "";
  let categoryId = 0;
  let relatedSystemId = 0;
  let adminId = 0;
  let adminCookie = "";
  let staffId = 0;
  let staffCookie = "";
  let requesterId = 0;
  let requesterCookie = "";

  async function fixtureUser(options: {
    name?: string;
    email?: string;
    role?: UserRole;
    isActive?: boolean;
    mustChangePassword?: boolean;
  } = {}) {
    const suffix = crypto.randomUUID().slice(0, 10);
    const user = await getPrisma().user.create({
      data: {
        name: options.name ?? `Admin Fixture ${suffix}`,
        email: options.email ?? `admin-fixture-${suffix}@toktick.it`,
        role: options.role ?? UserRole.REQUESTER,
        isActive: options.isActive ?? true,
        mustChangePassword: options.mustChangePassword ?? false,
        passwordHash: sharedPasswordHash,
      },
    });
    userIds.push(user.id);
    return user;
  }

  async function fixtureTicket(ownerId: number | null = null) {
    const ticket = await getPrisma().ticket.create({
      data: {
        ticketNumber: `LAB3-ADM-${crypto.randomUUID()}`,
        summary: "Administrator owner invariant fixture",
        description: "Used to verify Administrator User Management safety.",
        requestedPriority: "Medium",
        itPriority: "Medium",
        status: "Open",
        requesterId,
        ownerId,
        categoryId,
        relatedSystemId,
      },
    });
    ticketIds.push(ticket.id);
    return ticket;
  }

  beforeAll(async () => {
    sharedPasswordHash = await hashPassword(DEFAULT_TEST_PASSWORD);
    const prisma = getPrisma();
    const [category, system] = await Promise.all([
      prisma.category.findFirst({ orderBy: { id: "asc" } }),
      prisma.relatedSystem.findFirst({ orderBy: { id: "asc" } }),
    ]);
    if (!category || !system) throw new Error("Reference data must be seeded before Administrator tests");
    categoryId = category.id;
    relatedSystemId = system.id;

    const admin = await fixtureUser({ name: "Admin API Actor", role: UserRole.ADMINISTRATOR });
    await fixtureUser({ name: "Admin API Backup", role: UserRole.ADMINISTRATOR });
    const staff = await fixtureUser({ name: "Admin API Staff", role: UserRole.IT_STAFF });
    const requester = await fixtureUser({ name: "Admin API Requester", role: UserRole.REQUESTER });
    adminId = admin.id;
    staffId = staff.id;
    requesterId = requester.id;
    [adminCookie, staffCookie, requesterCookie] = await Promise.all([
      createSessionCookie(admin.id).then((session) => session.cookie),
      createSessionCookie(staff.id).then((session) => session.cookie),
      createSessionCookie(requester.id).then((session) => session.cookie),
    ]);
  });

  afterEach(async () => {
    if (!ticketIds.length) return;
    const ids = ticketIds.splice(0, ticketIds.length);
    await getPrisma().ticket.deleteMany({ where: { id: { in: ids } } });
  });

  afterAll(async () => {
    const prisma = getPrisma();
    if (ticketIds.length) await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it("ADM-01: lists only safe user fields and never returns password hashes", async () => {
    const marker = crypto.randomUUID().slice(0, 8);
    const target = await fixtureUser({ name: `Safe List ${marker}` });
    const res = await request(app)
      .get(`/api/v1/admin/users?search=${encodeURIComponent(marker)}`)
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      id: target.id,
      name: `Safe List ${marker}`,
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: false,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain(sharedPasswordHash);
  });

  it("ADM-02/ADM-03: searches users by name or email case-insensitively", async () => {
    const marker = crypto.randomUUID().slice(0, 8);
    const target = await fixtureUser({
      name: `SearchName-${marker}`,
      email: `search-email-${marker}@toktick.it`,
    });
    const byName = await request(app)
      .get(`/api/v1/admin/users?search=${encodeURIComponent(`searchname-${marker}`)}`)
      .set("Cookie", adminCookie);
    expect(byName.status).toBe(200);
    expect(byName.body.items.map((item: { id: number }) => item.id)).toContain(target.id);

    const byEmail = await request(app)
      .get(`/api/v1/admin/users?search=${encodeURIComponent(`SEARCH-EMAIL-${marker}`)}`)
      .set("Cookie", adminCookie);
    expect(byEmail.status).toBe(200);
    expect(byEmail.body.items.map((item: { id: number }) => item.id)).toContain(target.id);
  });

  it("ADM-04: filters by exactly one permitted role and rejects invalid/duplicate query values", async () => {
    const marker = crypto.randomUUID().slice(0, 8);
    const staff = await fixtureUser({ name: `Role Marker ${marker}`, role: UserRole.IT_STAFF });
    await fixtureUser({ name: `Role Marker ${marker} Requester`, role: UserRole.REQUESTER });
    const filtered = await request(app)
      .get(`/api/v1/admin/users?search=${marker}&role=IT_STAFF`)
      .set("Cookie", adminCookie);
    expect(filtered.status).toBe(200);
    expect(filtered.body.items.map((item: { id: number }) => item.id)).toEqual([staff.id]);

    for (const query of ["role=SUPER_ADMIN", "role=IT_STAFF&role=REQUESTER", `search=${"x".repeat(101)}`]) {
      const invalid = await request(app).get(`/api/v1/admin/users?${query}`).set("Cookie", adminCookie);
      expect(invalid.status).toBe(400);
      expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("ADM-05: creates valid Requester/IT Staff/Admin accounts with one role and a forced initial-password change", async () => {
    for (const role of [UserRole.REQUESTER, UserRole.IT_STAFF, UserRole.ADMINISTRATOR]) {
      const suffix = crypto.randomUUID().slice(0, 8);
      const initialPassword = `Initial${suffix}9`;
      const res = await request(app)
        .post("/api/v1/admin/users")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", adminCookie)
        .send({
          name: `Created ${role} ${suffix}`,
          email: `CREATED-${role}-${suffix}@TokTick.IT `,
          role,
          isActive: true,
          initialPassword,
        });
      expect(res.status).toBe(201);
      userIds.push(res.body.id);
      expect(res.body).toMatchObject({
        role,
        isActive: true,
        mustChangePassword: true,
        email: `created-${role.toLowerCase()}-${suffix}@toktick.it`,
      });
      expect(res.body).not.toHaveProperty("passwordHash");
      const persisted = await getPrisma().user.findUniqueOrThrow({ where: { id: res.body.id } });
      await expect(verifyPassword(initialPassword, persisted.passwordHash)).resolves.toBe(true);
    }
  });

  it("ADM-06: rejects duplicate email case-insensitively without creating a second row", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const email = `duplicate-${suffix}@toktick.it`;
    await fixtureUser({ email });
    const res = await request(app)
      .post("/api/v1/admin/users")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", adminCookie)
      .send({
        name: "Duplicate User",
        email: email.toUpperCase(),
        role: "REQUESTER",
        isActive: true,
        initialPassword: "Duplicate123",
      });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DUPLICATE_EMAIL");
    expect(await getPrisma().user.count({ where: { email } })).toBe(1);
  });

  it("ADM-07/ADM-08: rejects invalid role, name, email, activation state, and initial password with field errors", async () => {
    const res = await request(app)
      .post("/api/v1/admin/users")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", adminCookie)
      .send({
        name: "   ",
        email: "not-an-email",
        role: "SUPER_ADMIN",
        isActive: "yes",
        initialPassword: "short",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields).toMatchObject({
      name: expect.any(String),
      email: expect.any(String),
      role: expect.any(String),
      isActive: expect.any(String),
      initialPassword: expect.any(String),
    });
  });

  it("ADM-09/ADM-10/ADM-11: edits name/email/role/activation and returns only safe normalized state", async () => {
    const target = await fixtureUser({ role: UserRole.REQUESTER, isActive: false });
    const suffix = crypto.randomUUID().slice(0, 8);
    const res = await request(app)
      .patch(`/api/v1/admin/users/${target.id}`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", adminCookie)
      .send({
        name: "  Updated Admin Target  ",
        email: `UPDATED-${suffix}@TokTick.IT `,
        role: "IT_STAFF",
        isActive: true,
      });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: target.id,
      name: "Updated Admin Target",
      email: `updated-${suffix}@toktick.it`,
      role: "IT_STAFF",
      isActive: true,
    });
    expect(res.body).not.toHaveProperty("passwordHash");
  });

  it("edit validation rejects empty/unknown fields and duplicate normalized email without mutation", async () => {
    const first = await fixtureUser();
    const second = await fixtureUser();
    for (const body of [{}, { passwordHash: "blocked" }, { role: "SUPER_ADMIN" }]) {
      const invalid = await request(app)
        .patch(`/api/v1/admin/users/${first.id}`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", adminCookie)
        .send(body);
      expect(invalid.status).toBe(400);
    }
    const duplicate = await request(app)
      .patch(`/api/v1/admin/users/${first.id}`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", adminCookie)
      .send({ email: second.email.toUpperCase() });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("DUPLICATE_EMAIL");
    expect((await getPrisma().user.findUniqueOrThrow({ where: { id: first.id } })).email).toBe(first.email);
  });

  it("ADM-12: Administrator cannot deactivate their own account", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${adminId}`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", adminCookie)
      .send({ isActive: false });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SELF_DEACTIVATION_FORBIDDEN");
    expect((await getPrisma().user.findUniqueOrThrow({ where: { id: adminId } })).isActive).toBe(true);
  });

  it("ADM-15: setting a new initial password forces change and invalidates every existing target session", async () => {
    const target = await fixtureUser({ role: UserRole.IT_STAFF, mustChangePassword: false });
    const oldSessionA = await createSessionCookie(target.id);
    const oldSessionB = await createSessionCookie(target.id);
    const newPassword = "ResetPassword456";
    const res = await request(app)
      .post(`/api/v1/admin/users/${target.id}/initial-password`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", adminCookie)
      .send({ initialPassword: newPassword, confirmPassword: newPassword });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: target.id, mustChangePassword: true });
    const persisted = await getPrisma().user.findUniqueOrThrow({ where: { id: target.id } });
    await expect(verifyPassword(newPassword, persisted.passwordHash)).resolves.toBe(true);
    expect(await getPrisma().authSession.count({ where: { id: { in: [oldSessionA.sessionId, oldSessionB.sessionId] } } })).toBe(0);
  });

  it("initial-password validation rejects weak/mismatched input without changing credentials", async () => {
    const target = await fixtureUser({ role: UserRole.REQUESTER, mustChangePassword: false });
    const before = await getPrisma().user.findUniqueOrThrow({ where: { id: target.id } });

    const weak = await request(app)
      .post(`/api/v1/admin/users/${target.id}/initial-password`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", adminCookie)
      .send({ initialPassword: "short", confirmPassword: "short" });
    expect(weak.status).toBe(400);
    expect(weak.body.error.code).toBe("VALIDATION_ERROR");

    const mismatch = await request(app)
      .post(`/api/v1/admin/users/${target.id}/initial-password`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", adminCookie)
      .send({ initialPassword: "ValidPassword123", confirmPassword: "DifferentPassword123" });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.error.fields.confirmPassword).toEqual(expect.any(String));

    const after = await getPrisma().user.findUniqueOrThrow({ where: { id: target.id } });
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.mustChangePassword).toBe(before.mustChangePassword);
  });

  it("ADM-16: target logs in with the new initial password and is forced to change it before normal APIs", async () => {
    const target = await fixtureUser({ role: UserRole.REQUESTER, mustChangePassword: false });
    const newPassword = "ForcedChange789";
    const reset = await request(app)
      .post(`/api/v1/admin/users/${target.id}/initial-password`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", adminCookie)
      .send({ initialPassword: newPassword, confirmPassword: newPassword });
    expect(reset.status).toBe(200);

    const oldLogin = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send({ email: target.email, password: DEFAULT_TEST_PASSWORD });
    expect(oldLogin.status).toBe(401);

    const login = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send({ email: target.email, password: newPassword });
    expect(login.status).toBe(200);
    expect(login.body.nextAction).toBe("CHANGE_PASSWORD");
    const cookie = login.headers["set-cookie"]?.[0]?.split(";")[0];
    expect(cookie).toBeTruthy();
    const blocked = await request(app).get("/api/v1/categories").set("Cookie", cookie!);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("ADM-17: Requester and IT Staff are forbidden from Administrator list/create/edit APIs", async () => {
    const target = await fixtureUser();
    for (const cookie of [requesterCookie, staffCookie]) {
      expect((await request(app).get("/api/v1/admin/users").set("Cookie", cookie)).status).toBe(403);
      expect((await request(app)
        .post("/api/v1/admin/users")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookie)
        .send({
          name: "Forbidden",
          email: `forbidden-${crypto.randomUUID()}@toktick.it`,
          role: "REQUESTER",
          isActive: true,
          initialPassword: "Forbidden123",
        })).status).toBe(403);
      expect((await request(app)
        .patch(`/api/v1/admin/users/${target.id}`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookie)
        .send({ name: "Forbidden Edit" })).status).toBe(403);
      expect((await request(app)
        .post(`/api/v1/admin/users/${target.id}/initial-password`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookie)
        .send({ initialPassword: "ForbiddenReset123", confirmPassword: "ForbiddenReset123" })).status).toBe(403);
    }
  });

  it("ADM-18: deactivation of a user who owns Tickets returns 409 with no user/Ticket mutation", async () => {
    const target = await fixtureUser({ role: UserRole.IT_STAFF, isActive: true });
    const ticket = await fixtureTicket(target.id);
    const res = await request(app)
      .patch(`/api/v1/admin/users/${target.id}`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", adminCookie)
      .send({ isActive: false });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ASSIGNED_TICKETS_REQUIRE_REASSIGNMENT");
    expect((await getPrisma().user.findUniqueOrThrow({ where: { id: target.id } })).isActive).toBe(true);
    expect((await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } })).ownerId).toBe(target.id);
  });

  it("ADM-19: demotion of an assigned Staff/Admin to REQUESTER returns 409 with no mutation", async () => {
    for (const role of [UserRole.IT_STAFF, UserRole.ADMINISTRATOR]) {
      const target = await fixtureUser({ role, isActive: true });
      const ticket = await fixtureTicket(target.id);
      const res = await request(app)
        .patch(`/api/v1/admin/users/${target.id}`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", adminCookie)
        .send({ role: "REQUESTER" });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("ASSIGNED_TICKETS_REQUIRE_REASSIGNMENT");
      expect((await getPrisma().user.findUniqueOrThrow({ where: { id: target.id } })).role).toBe(role);
      expect((await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } })).ownerId).toBe(target.id);
    }
  });

  it("ADM-20: concurrent assign and deactivate preserve the owner invariant", async () => {
    const target = await fixtureUser({ role: UserRole.IT_STAFF, isActive: true });
    const ticket = await fixtureTicket(null);
    const [assign, deactivate] = await Promise.all([
      request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/owner`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", staffCookie)
        .send({ action: "assign", ownerId: target.id }),
      request(app)
        .patch(`/api/v1/admin/users/${target.id}`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", adminCookie)
        .send({ isActive: false }),
    ]);
    expect([assign.status, deactivate.status].sort()).toEqual([200, 409]);
    const [savedUser, savedTicket] = await Promise.all([
      getPrisma().user.findUniqueOrThrow({ where: { id: target.id } }),
      getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } }),
    ]);
    expect(savedTicket.ownerId === target.id ? savedUser.isActive : savedTicket.ownerId === null).toBe(true);
    if (savedTicket.ownerId === target.id) expect(savedUser.role).toBe("IT_STAFF");
  });

  it("ADM-21: concurrent assign and demote-to-Requester preserve the owner invariant", async () => {
    const target = await fixtureUser({ role: UserRole.IT_STAFF, isActive: true });
    const ticket = await fixtureTicket(null);
    const [assign, demote] = await Promise.all([
      request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/owner`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", staffCookie)
        .send({ action: "assign", ownerId: target.id }),
      request(app)
        .patch(`/api/v1/admin/users/${target.id}`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", adminCookie)
        .send({ role: "REQUESTER" }),
    ]);
    expect([assign.status, demote.status].sort()).toEqual([200, 409]);
    const [savedUser, savedTicket] = await Promise.all([
      getPrisma().user.findUniqueOrThrow({ where: { id: target.id } }),
      getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } }),
    ]);
    if (savedTicket.ownerId === target.id) {
      expect(savedUser.isActive).toBe(true);
      expect(["IT_STAFF", "ADMINISTRATOR"]).toContain(savedUser.role);
    } else {
      expect(savedTicket.ownerId).toBeNull();
      expect(savedUser.role).toBe("REQUESTER");
    }
  });

  it("ADM-22: concurrent reassign and target deactivation preserve a valid final owner", async () => {
    const currentOwner = await fixtureUser({ role: UserRole.IT_STAFF, isActive: true });
    const target = await fixtureUser({ role: UserRole.IT_STAFF, isActive: true });
    const ticket = await fixtureTicket(currentOwner.id);
    const [reassign, deactivate] = await Promise.all([
      request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/owner`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", staffCookie)
        .send({ action: "assign", ownerId: target.id }),
      request(app)
        .patch(`/api/v1/admin/users/${target.id}`)
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", adminCookie)
        .send({ isActive: false }),
    ]);
    expect([reassign.status, deactivate.status].sort()).toEqual([200, 409]);
    const savedTicket = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    const savedOwner = await getPrisma().user.findUniqueOrThrow({ where: { id: savedTicket.ownerId! } });
    expect(savedOwner.isActive).toBe(true);
    expect(["IT_STAFF", "ADMINISTRATOR"]).toContain(savedOwner.role);
  });

  it("security: Administrator mutations reject missing/null/wrong Origin before any mutation", async () => {
    const target = await fixtureUser({ name: "Origin Protected" });
    for (const origin of [undefined, "null", "http://evil.example"] as const) {
      let pending = request(app)
        .patch(`/api/v1/admin/users/${target.id}`)
        .set("Cookie", adminCookie);
      if (origin !== undefined) pending = pending.set("Origin", origin);
      const res = await pending.send({ name: "Must Not Persist" });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ORIGIN_FORBIDDEN");
    }
    expect((await getPrisma().user.findUniqueOrThrow({ where: { id: target.id } })).name).toBe("Origin Protected");
  });
});
