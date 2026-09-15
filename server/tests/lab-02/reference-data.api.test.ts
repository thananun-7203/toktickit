import { afterAll, beforeAll, describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { UserRole } from "@prisma/client";
import { cleanupTestUsers, createSessionCookie, createTestUser } from "../lab-03/testAuth.js";

// Lab 2 Issue 2 — reference-data endpoints and Development Requester list.
// A-1  : GET /api/v1/requesters       returns active requesters only (BR-6)
// A-14 : GET /api/v1/categories       returns active categories (dropdown)
// A-15 : GET /api/v1/related-systems  returns active related systems (dropdown)
// Requires the DB to be migrated and seeded (4 categories, 7 systems, 5 requesters).

let referenceCookie = "";
let referenceUserId: number | null = null;

beforeAll(async () => {
  const user = await createTestUser({ role: UserRole.ADMINISTRATOR, mustChangePassword: false });
  referenceUserId = user.id;
  referenceCookie = (await createSessionCookie(user.id)).cookie;
});

afterAll(async () => {
  if (referenceUserId !== null) await cleanupTestUsers([referenceUserId]);
});

describe("GET /api/v1/requesters (A-1)", () => {
  it("returns 200 with only the four active requesters", async () => {
    const res = await request(app).get("/api/v1/requesters");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(4);
    for (const requester of res.body) {
      expect(requester).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          email: expect.any(String),
          isActive: true,
        })
      );
    }
    // The single inactive requester must not appear (BR-6).
    const emails = res.body.map((r: { email: string }) => r.email);
    expect(emails).toEqual(expect.arrayContaining([
      "somchai@toktick.it",
      "somsri@toktick.it",
      "anan@toktick.it",
      "preecha@toktick.it",
    ]));
    expect(emails).not.toContain("noppadol@toktick.it");
  });
});

describe("GET /api/v1/categories (A-14)", () => {
  it("returns 200 with the four seeded categories in id order", async () => {
    const res = await request(app).get("/api/v1/categories").set("Cookie", referenceCookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    expect(res.body.map((c: { name: string }) => c.name)).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);
  });
});

describe("GET /api/v1/related-systems (A-15)", () => {
  it("returns 200 with at least six related systems", async () => {
    const res = await request(app).get("/api/v1/related-systems").set("Cookie", referenceCookie);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(6);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
      })
    );
  });
});
