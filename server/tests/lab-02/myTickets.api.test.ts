import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

// Lab 2 Issue 4 — GET /api/v1/tickets (A-6, A-7, A-8, A-9) + 401/400
// Requires DB migrated and seeded. Uses the five seeded requesters.

const R1 = 1; // Somchai Jaidee (active)
const R2 = 2; // Somsri Rakdee (active)

let createdIds: number[] = [];

afterEach(async () => {
  const ids = createdIds;
  createdIds = [];
  if (ids.length) {
    await getPrisma().ticket.deleteMany({ where: { id: { in: ids } } });
  }
});

async function createTicket(requesterId: number, overrides: Record<string, unknown> = {}) {
  const payload = {
    categoryId: 1,
    relatedSystemId: 1,
    summary: `Ticket ${Date.now()} ${Math.random().toString(36).slice(2, 6)}`,
    description: "Description for my tickets test.",
    ...overrides,
  };
  const res = await request(app)
    .post("/api/v1/tickets")
    .set("X-Dev-Requester-Id", String(requesterId))
    .send(payload);
  if (res.status !== 201) throw new Error(`createTicket failed ${res.status} ${JSON.stringify(res.body)}`);
  createdIds.push(res.body.id);
  return res.body as { id: number; summary: string; category: { id: number }; ticketNumber: string; createdAt: string };
}

describe("GET /api/v1/tickets", () => {
  it("returns 401 when X-Dev-Requester-Id is missing", async () => {
    const res = await request(app).get("/api/v1/tickets");
    expect(res.status).toBe(401);
  });

  it("returns 400 with per-field errors for invalid query", async () => {
    const res = await request(app)
      .get("/api/v1/tickets?page=0&pageSize=100&sort=bad")
      .set("X-Dev-Requester-Id", String(R1));
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toMatchObject({
      page: expect.any(String),
      pageSize: expect.any(String),
      sort: expect.any(String),
    });
  });

  it("A-6: isolates tickets by requester (R1 vs R2)", async () => {
    const t1 = await createTicket(R1, { summary: "R1 only ticket" });
    const t2 = await createTicket(R2, { summary: "R2 only ticket" });

    const r1Res = await request(app).get("/api/v1/tickets").set("X-Dev-Requester-Id", String(R1));
    expect(r1Res.status).toBe(200);
    expect(r1Res.body.items.map((t: { id: number }) => t.id)).toContain(t1.id);
    expect(r1Res.body.items.map((t: { id: number }) => t.id)).not.toContain(t2.id);

    const r2Res = await request(app).get("/api/v1/tickets").set("X-Dev-Requester-Id", String(R2));
    expect(r2Res.body.items.map((t: { id: number }) => t.id)).toContain(t2.id);
    expect(r2Res.body.items.map((t: { id: number }) => t.id)).not.toContain(t1.id);
  });

  it("A-7: search filters by summary (case-insensitive)", async () => {
    const uniq = Math.random().toString(36).slice(2, 8);
    const tMatch = await createTicket(R1, { summary: `SearchMe ${uniq} alpha` });
    const tNoMatch = await createTicket(R1, { summary: `Other ${uniq} beta` });

    const res = await request(app)
      .get(`/api/v1/tickets?search=${uniq} alpha`)
      .set("X-Dev-Requester-Id", String(R1));
    expect(res.status).toBe(200);
    const ids = res.body.items.map((t: { id: number }) => t.id);
    expect(ids).toContain(tMatch.id);
    expect(ids).not.toContain(tNoMatch.id);

    // case-insensitive check
    const resUpper = await request(app)
      .get(`/api/v1/tickets?search=${uniq.toUpperCase()} ALPHA`)
      .set("X-Dev-Requester-Id", String(R1));
    expect(resUpper.body.items.map((t: { id: number }) => t.id)).toContain(tMatch.id);
  });

  it("A-8: filters by categoryId and sorts oldest/newest correctly", async () => {
    const uniq = `a8-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Two matching category-1 tickets plus one category-2 ticket let this test
    // prove both the subset and chronological order without depending on seed data.
    const older = await createTicket(R1, { summary: `${uniq} older`, categoryId: 1 });
    const newer = await createTicket(R1, { summary: `${uniq} newer`, categoryId: 1 });
    const otherCategory = await createTicket(R1, { summary: `${uniq} excluded`, categoryId: 2 });

    const filtered = await request(app)
      .get(`/api/v1/tickets?search=${encodeURIComponent(uniq)}&categoryId=1&pageSize=50`)
      .set("X-Dev-Requester-Id", String(R1));
    expect(filtered.status).toBe(200);
    const fIds = filtered.body.items.map((t: { id: number }) => t.id);
    expect(fIds).toEqual(expect.arrayContaining([older.id, newer.id]));
    expect(fIds).not.toContain(otherCategory.id);

    const oldest = await request(app)
      .get(`/api/v1/tickets?search=${encodeURIComponent(uniq)}&categoryId=1&sort=oldest&pageSize=50`)
      .set("X-Dev-Requester-Id", String(R1));
    expect(oldest.status).toBe(200);
    expect(oldest.body.items.map((t: { id: number }) => t.id)).toEqual([older.id, newer.id]);

    const newest = await request(app)
      .get(`/api/v1/tickets?search=${encodeURIComponent(uniq)}&categoryId=1&sort=newest&pageSize=50`)
      .set("X-Dev-Requester-Id", String(R1));
    expect(newest.status).toBe(200);
    expect(newest.body.items.map((t: { id: number }) => t.id)).toEqual([newer.id, older.id]);
  });

  it("A-9: pagination returns consistent page/pageSize/totalItems/totalPages", async () => {
    // Scope this test to its own unique search marker. Other API test files run
    // concurrently and may create/delete R1 tickets, so relying on a shared
    // requester-wide base count makes pagination assertions flaky.
    const uniq = `a9-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await createTicket(R1, { summary: `${uniq} pag 1` });
    await createTicket(R1, { summary: `${uniq} pag 2` });
    await createTicket(R1, { summary: `${uniq} pag 3` });

    const p1 = await request(app)
      .get(`/api/v1/tickets?search=${encodeURIComponent(uniq)}&page=1&pageSize=2&sort=newest`)
      .set("X-Dev-Requester-Id", String(R1));
    expect(p1.status).toBe(200);
    expect(p1.body.page).toBe(1);
    expect(p1.body.pageSize).toBe(2);
    expect(p1.body.totalItems).toBe(3);
    expect(p1.body.totalPages).toBe(2);
    expect(p1.body.items).toHaveLength(2);

    const p2 = await request(app)
      .get(`/api/v1/tickets?search=${encodeURIComponent(uniq)}&page=2&pageSize=2&sort=newest`)
      .set("X-Dev-Requester-Id", String(R1));
    expect(p2.body.page).toBe(2);
    expect(p2.body.items).toHaveLength(1);
    // Items across pages should not overlap
    const p1Ids = p1.body.items.map((t: { id: number }) => t.id);
    const p2Ids = p2.body.items.map((t: { id: number }) => t.id);
    expect(p1Ids.some((id: number) => p2Ids.includes(id))).toBe(false);
  });

  it("returns empty list when filter matches nothing", async () => {
    await createTicket(R1, { summary: "exists ticket" });
    const res = await request(app)
      .get("/api/v1/tickets?search=__no_match_xyz__")
      .set("X-Dev-Requester-Id", String(R1));
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.totalItems).toBe(0);
    expect(res.body.totalPages).toBe(0);
  });
});
