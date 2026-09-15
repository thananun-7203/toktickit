import express from "express";
import { UserRole } from "@prisma/client";
import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { requireAuth, requirePasswordChanged, requireRole } from "../../src/auth.js";
import { getPrisma } from "../../src/prisma.js";
import {
  cleanupTestUsers,
  createSessionCookie,
  createTestUser,
  TEST_ORIGIN,
} from "./testAuth.js";

const createdUserIds: number[] = [];

async function userWithSession(options: Parameters<typeof createTestUser>[0] = {}) {
  const user = await createTestUser(options);
  createdUserIds.push(user.id);
  const session = await createSessionCookie(user.id);
  return { user, ...session };
}

afterEach(async () => {
  const ids = createdUserIds.splice(0, createdUserIds.length);
  await cleanupTestUsers(ids);
});

describe("Lab 3 authorization foundation", () => {
  it("AZ-01/AZ-14: protected app/reference-data routes reject an unauthenticated request", async () => {
    expect((await request(app).get("/api/v1/categories")).status).toBe(401);
    expect((await request(app).get("/api/v1/related-systems")).status).toBe(401);
  });

  it("AZ-07: must-change users are authenticated but blocked from normal reference data", async () => {
    const { cookie } = await userWithSession({ mustChangePassword: true });
    const res = await request(app).get("/api/v1/categories").set("Cookie", cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("authenticated users of each approved role can read reference data after the password gate", async () => {
    for (const role of [UserRole.REQUESTER, UserRole.IT_STAFF, UserRole.ADMINISTRATOR]) {
      const { cookie } = await userWithSession({ role, mustChangePassword: false });
      const categories = await request(app).get("/api/v1/categories").set("Cookie", cookie);
      const systems = await request(app).get("/api/v1/related-systems").set("Cookie", cookie);
      expect(categories.status).toBe(200);
      expect(systems.status).toBe(200);
    }
  });

  it("AUTH-16: another state-changing endpoint rejects wrong/missing/null Origin without mutation", async () => {
    for (const origin of [undefined, "null", "https://wrong.example"]) {
      const { user, cookie, sessionId } = await userWithSession({ mustChangePassword: false });
      let call = request(app).post("/api/v1/auth/logout").set("Cookie", cookie);
      if (origin !== undefined) call = call.set("Origin", origin);
      const res = await call;
      expect(res.status).toBe(403);
      expect(await getPrisma().authSession.findUnique({ where: { id: sessionId } })).not.toBeNull();
      expect(user.isActive).toBe(true);
    }

    const { cookie, sessionId } = await userWithSession({ mustChangePassword: false });
    const allowed = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie)
      .set("Origin", TEST_ORIGIN);
    expect(allowed.status).toBe(204);
    expect(await getPrisma().authSession.findUnique({ where: { id: sessionId } })).toBeNull();
  });

  it("reusable requireRole middleware permits Admin and rejects Requester", async () => {
    const protectedApp = express();
    protectedApp.get(
      "/admin-only",
      requireAuth,
      requirePasswordChanged,
      requireRole(UserRole.ADMINISTRATOR),
      (_req, res) => res.json({ ok: true }),
    );

    const requesterSession = await userWithSession({ role: UserRole.REQUESTER, mustChangePassword: false });
    const adminSession = await userWithSession({ role: UserRole.ADMINISTRATOR, mustChangePassword: false });

    const forbidden = await request(protectedApp).get("/admin-only").set("Cookie", requesterSession.cookie);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe("FORBIDDEN");

    const allowed = await request(protectedApp).get("/admin-only").set("Cookie", adminSession.cookie);
    expect(allowed.status).toBe(200);
    expect(allowed.body).toEqual({ ok: true });
  });
});
