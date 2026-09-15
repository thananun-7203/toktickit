import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { resetLoginRateLimitsForTests } from "../../src/authRoutes.js";
import { verifyPassword } from "../../src/password.js";
import { hashSessionToken, SESSION_TTL_MS } from "../../src/auth.js";
import {
  cleanupTestUsers,
  createSessionCookie,
  createTestUser,
  DEFAULT_TEST_PASSWORD,
  TEST_ORIGIN,
} from "./testAuth.js";

const createdUserIds: number[] = [];

async function testUser(options: Parameters<typeof createTestUser>[0] = {}) {
  const user = await createTestUser(options);
  createdUserIds.push(user.id);
  return user;
}

afterEach(async () => {
  resetLoginRateLimitsForTests();
  const ids = createdUserIds.splice(0, createdUserIds.length);
  await cleanupTestUsers(ids);
});

describe("Lab 3 authentication API", () => {
  it("AUTH-01/AUTH-10: active user logs in, receives a session, and /me returns only safe identity", async () => {
    const user = await testUser({ mustChangePassword: false });
    const beforeLogin = Date.now();

    const login = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send({ email: user.email.toUpperCase(), password: DEFAULT_TEST_PASSWORD });

    expect(login.status).toBe(200);
    const setCookie = login.headers["set-cookie"]?.[0] ?? "";
    expect(setCookie).toContain("toktickit_session=");
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).toMatch(/Max-Age=28800/i);
    expect(login.body.nextAction).toBe("APPLICATION");
    expect(login.body.user).toEqual(
      expect.objectContaining({ id: user.id, email: user.email, role: "REQUESTER", mustChangePassword: false }),
    );
    expect(login.body.user.passwordHash).toBeUndefined();

    const cookie = setCookie.split(";", 1)[0];
    const rawToken = decodeURIComponent(cookie.split("=", 2)[1]);
    const storedSession = await getPrisma().authSession.findFirstOrThrow({ where: { userId: user.id } });
    expect(storedSession.tokenHash).toBe(hashSessionToken(rawToken));
    expect(storedSession.tokenHash).not.toBe(rawToken);
    expect(storedSession.expiresAt.getTime()).toBeGreaterThanOrEqual(beforeLogin + SESSION_TTL_MS);
    expect(storedSession.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + SESSION_TTL_MS);

    const me = await request(app).get("/api/v1/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(200);
    expect(me.body.id).toBe(user.id);
    expect(me.body.passwordHash).toBeUndefined();
  });

  it("AUTH-02/AUTH-03: unknown email and wrong password use the same generic 401", async () => {
    const user = await testUser();
    const unknown = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send({ email: `unknown-${Date.now()}@toktick.it`, password: DEFAULT_TEST_PASSWORD });
    const wrong = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send({ email: user.email, password: ["Wrong", "Pass123"].join("") });

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
    expect(unknown.body.error).toMatchObject({ code: "INVALID_CREDENTIALS", message: "Invalid email or password" });
  });

  it("AUTH-04: inactive account with correct password cannot sign in", async () => {
    const user = await testUser({ isActive: false });
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send({ email: user.email, password: DEFAULT_TEST_PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("AUTH-05/AUTH-06: initial-password user is gated until a valid password change succeeds", async () => {
    const user = await testUser({ mustChangePassword: true });
    const agent = request.agent(app);

    const login = await agent
      .post("/api/v1/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send({ email: user.email, password: DEFAULT_TEST_PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.nextAction).toBe("CHANGE_PASSWORD");

    const gated = await agent.get("/api/v1/categories");
    expect(gated.status).toBe(403);
    expect(gated.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const nextPassword = ["Changed", "Pass456"].join("");
    const changed = await agent
      .post("/api/v1/auth/change-password")
      .set("Origin", TEST_ORIGIN)
      .send({
        currentPassword: DEFAULT_TEST_PASSWORD,
        newPassword: nextPassword,
        confirmPassword: nextPassword,
      });
    expect(changed.status).toBe(200);
    expect(changed.body.user.mustChangePassword).toBe(false);

    const allowed = await agent.get("/api/v1/categories");
    expect(allowed.status).toBe(200);

    const stored = await getPrisma().user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.mustChangePassword).toBe(false);
    await expect(verifyPassword(nextPassword, stored.passwordHash)).resolves.toBe(true);
    await expect(verifyPassword(DEFAULT_TEST_PASSWORD, stored.passwordHash)).resolves.toBe(false);
  });

  it("AUTH-07: weak/mismatched replacement password is rejected without credential mutation", async () => {
    const user = await testUser({ mustChangePassword: true });
    const { cookie } = await createSessionCookie(user.id);
    const before = await getPrisma().user.findUniqueOrThrow({ where: { id: user.id } });

    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", cookie)
      .send({ currentPassword: DEFAULT_TEST_PASSWORD, newPassword: "weak", confirmPassword: "different" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    const after = await getPrisma().user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.mustChangePassword).toBe(true);
  });

  it("U-06: new password equal to the current password is rejected without mutation", async () => {
    const user = await testUser({ mustChangePassword: true });
    const { cookie } = await createSessionCookie(user.id);
    const before = await getPrisma().user.findUniqueOrThrow({ where: { id: user.id } });

    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", cookie)
      .send({
        currentPassword: DEFAULT_TEST_PASSWORD,
        newPassword: DEFAULT_TEST_PASSWORD,
        confirmPassword: DEFAULT_TEST_PASSWORD,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.newPassword).toMatch(/differ from current/i);
    const after = await getPrisma().user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.mustChangePassword).toBe(true);
  });

  it("AUTH-08: incorrect current password is rejected and the existing credential remains valid", async () => {
    const user = await testUser({ mustChangePassword: true });
    const { cookie } = await createSessionCookie(user.id);
    const nextPassword = ["Changed", "Pass456"].join("");
    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", cookie)
      .send({ currentPassword: ["Wrong", "Pass123"].join(""), newPassword: nextPassword, confirmPassword: nextPassword });
    expect(res.status).toBe(401);
    const stored = await getPrisma().user.findUniqueOrThrow({ where: { id: user.id } });
    await expect(verifyPassword(DEFAULT_TEST_PASSWORD, stored.passwordHash)).resolves.toBe(true);
  });

  it("AUTH-09: logout invalidates the server session and the old cookie cannot be reused", async () => {
    const user = await testUser({ mustChangePassword: false });
    const login = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send({ email: user.email, password: DEFAULT_TEST_PASSWORD });
    const cookie = login.headers["set-cookie"][0].split(";", 1)[0];

    const logout = await request(app)
      .post("/api/v1/auth/logout")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", cookie);
    expect(logout.status).toBe(204);
    expect(await getPrisma().authSession.count({ where: { userId: user.id } })).toBe(0);

    const reused = await request(app).get("/api/v1/auth/me").set("Cookie", cookie);
    expect(reused.status).toBe(401);

    const noCookieLogout = await request(app).post("/api/v1/auth/logout").set("Origin", TEST_ORIGIN);
    expect(noCookieLogout.status).toBe(204);
  });

  it("AUTH-06: changing password invalidates all previous sessions and rotates the current session", async () => {
    const user = await testUser({ mustChangePassword: true });
    const first = await createSessionCookie(user.id);
    const second = await createSessionCookie(user.id);
    const nextPassword = ["Changed", "Pass456"].join("");

    const changed = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", first.cookie)
      .send({
        currentPassword: DEFAULT_TEST_PASSWORD,
        newPassword: nextPassword,
        confirmPassword: nextPassword,
      });

    expect(changed.status).toBe(200);
    expect(await getPrisma().authSession.findUnique({ where: { id: first.sessionId } })).toBeNull();
    expect(await getPrisma().authSession.findUnique({ where: { id: second.sessionId } })).toBeNull();
    expect(await getPrisma().authSession.count({ where: { userId: user.id } })).toBe(1);

    const oldSecond = await request(app).get("/api/v1/auth/me").set("Cookie", second.cookie);
    expect(oldSecond.status).toBe(401);

    const rotatedCookie = changed.headers["set-cookie"]?.[0]?.split(";", 1)[0];
    expect(rotatedCookie).toBeTruthy();
    const current = await request(app).get("/api/v1/auth/me").set("Cookie", rotatedCookie!);
    expect(current.status).toBe(200);
  });

  it("AUTH-11: session uses an absolute expiry and normal requests do not slide it", async () => {
    const user = await testUser({ mustChangePassword: false });
    const expiresAt = new Date(Date.now() + 60_000);
    const session = await createSessionCookie(user.id, { expiresAt });

    const beforeExpiry = await request(app).get("/api/v1/auth/me").set("Cookie", session.cookie);
    expect(beforeExpiry.status).toBe(200);
    const unchanged = await getPrisma().authSession.findUniqueOrThrow({ where: { id: session.sessionId } });
    expect(unchanged.expiresAt.getTime()).toBe(expiresAt.getTime());

    await getPrisma().authSession.update({ where: { id: session.sessionId }, data: { expiresAt: new Date(Date.now() - 1) } });
    const expired = await request(app).get("/api/v1/auth/me").set("Cookie", session.cookie);
    expect(expired.status).toBe(401);
    expect(await getPrisma().authSession.findUnique({ where: { id: session.sessionId } })).toBeNull();

    const unknown = await request(app).get("/api/v1/auth/me").set("Cookie", "toktickit_session=unknown-token");
    expect(unknown.status).toBe(401);
  });

  it("AUTH-12: five failed credentials are allowed, then the next attempt is rate limited", async () => {
    const user = await testUser();
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", TEST_ORIGIN)
        .send({ email: user.email, password: ["Wrong", "Pass123"].join("") });
      expect(res.status).toBe(401);
    }
    const limited = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send({ email: user.email, password: DEFAULT_TEST_PASSWORD });
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("LOGIN_RATE_LIMITED");
  });

  it("AUTH-13: successful authentication clears earlier failure count", async () => {
    const user = await testUser();
    for (let i = 0; i < 2; i += 1) {
      expect((await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", TEST_ORIGIN)
        .send({ email: user.email, password: ["Wrong", "Pass123"].join("") })).status).toBe(401);
    }

    const success = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send({ email: user.email, password: DEFAULT_TEST_PASSWORD });
    expect(success.status).toBe(200);

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", TEST_ORIGIN)
        .send({ email: user.email, password: ["Wrong", "Pass123"].join("") });
      expect(res.status).toBe(401);
    }
  });

  it("AUTH-14: login rejects wrong, missing, and null Origin before creating a session", async () => {
    const user = await testUser();
    const payload = { email: user.email, password: DEFAULT_TEST_PASSWORD };

    for (const origin of [undefined, "null", "https://wrong.example"]) {
      let call = request(app).post("/api/v1/auth/login");
      if (origin !== undefined) call = call.set("Origin", origin);
      const res = await call.send(payload);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ORIGIN_FORBIDDEN");
    }
    expect(await getPrisma().authSession.count({ where: { userId: user.id } })).toBe(0);

    const allowed = await request(app).post("/api/v1/auth/login").set("Origin", TEST_ORIGIN).send(payload);
    expect(allowed.status).toBe(200);
  });

  it("AUTH-15: deactivating a user invalidates access on the next protected request", async () => {
    const user = await testUser({ mustChangePassword: false });
    const session = await createSessionCookie(user.id);
    await getPrisma().user.update({ where: { id: user.id }, data: { isActive: false } });

    const res = await request(app).get("/api/v1/auth/me").set("Cookie", session.cookie);
    expect(res.status).toBe(401);
    expect(await getPrisma().authSession.count({ where: { userId: user.id } })).toBe(0);
  });

  it("password input above bcrypt's 72-byte boundary is rejected before authentication", async () => {
    const user = await testUser();
    const overLimit = `${"ก".repeat(24)}1A`;
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send({ email: user.email, password: overLimit });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.password).toMatch(/72 UTF-8 bytes/i);
  });
});
