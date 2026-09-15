import { afterAll, beforeAll, describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { UserRole } from "@prisma/client";
import {
  cleanupTestUsers,
  createSessionCookie,
  createTestUser,
} from "../lab-03/testAuth.js";

let categoriesCookie = "";
let categoriesUserId: number | null = null;

beforeAll(async () => {
  const user = await createTestUser({ role: UserRole.ADMINISTRATOR, mustChangePassword: false });
  categoriesUserId = user.id;
  categoriesCookie = (await createSessionCookie(user.id)).cookie;
});

afterAll(async () => {
  if (categoriesUserId !== null) await cleanupTestUsers([categoriesUserId]);
});

// Issue 4 — verifies GET /api/categories against the real database.
// Requires the DB to be migrated and seeded first.
describe("GET /api/categories", () => {
  it("returns 200 with the four seeded categories in id order", async () => {
    const res = await request(app).get("/api/categories").set("Cookie", categoriesCookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    expect(res.body.map((c: { id: number; name: string }) => c.name)).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);

    const ids = res.body.map((c: { id: number }) => c.id);
    expect([...ids].sort((a, b) => a - b)).toEqual(ids);
  });
});
