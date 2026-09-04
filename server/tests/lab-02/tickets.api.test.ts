import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

// Lab 2 Issue 3 — POST /api/v1/tickets (A-2, A-3, A-4) plus the middleware
// 401 path. Requires the DB to be migrated and seeded.

const ACTIVE_REQUESTER_ID = 1; // Somchai Jaidee (seeded active)

const validPayload = {
  categoryId: 1, // Account and Access
  relatedSystemId: 1, // CRM
  requestedPriority: "Medium",
  summary: "Cannot export monthly report",
  description: "Export button spins forever after clicking.",
};

// Tracks ticket ids created during a test so every test is isolated: cleanup
// runs even if an assertion fails mid-test, keeping re-runs reproducible.
let createdTicketIds: number[] = [];

afterEach(async () => {
  const ids = createdTicketIds;
  createdTicketIds = [];
  if (ids.length === 0) return;
  const prisma = getPrisma();
  await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
});

describe("POST /api/v1/tickets", () => {
  it("A-4: returns 401 when the X-Dev-Requester-Id header is missing", async () => {
    const res = await request(app).post("/api/v1/tickets").send(validPayload);
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/header/i);
  });

  it("A-4: returns 401 when the requester header is inactive", async () => {
    const res = await request(app)
      .post("/api/v1/tickets")
      .set("X-Dev-Requester-Id", "5") // Noppadol = inactive
      .send(validPayload);
    expect(res.status).toBe(401);
  });

  it("A-4: returns 400 with per-field messages when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/v1/tickets")
      .set("X-Dev-Requester-Id", String(ACTIVE_REQUESTER_ID))
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toBeDefined();
    expect(res.body.error.fields).toMatchObject({
      categoryId: expect.any(String),
      relatedSystemId: expect.any(String),
      requestedPriority: expect.any(String),
      summary: expect.any(String),
      description: expect.any(String),
    });
  });

  it("A-16: returns 400 for an unsupported Requested Priority", async () => {
    const res = await request(app)
      .post("/api/v1/tickets")
      .set("X-Dev-Requester-Id", String(ACTIVE_REQUESTER_ID))
      .send({ ...validPayload, requestedPriority: "Urgent" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.requestedPriority).toMatch(/Low.*Medium.*High/i);
  });

  it("A-3: returns 400 when summary is too long", async () => {
    const res = await request(app)
      .post("/api/v1/tickets")
      .set("X-Dev-Requester-Id", String(ACTIVE_REQUESTER_ID))
      .send({ ...validPayload, summary: "a".repeat(101) });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.summary).toMatch(/100 characters/);
  });

  it("A-3: returns 400 with per-field messages when ids are not positive integers", async () => {
    for (const bad of [0, -1, 1.5, "1"]) {
      const res = await request(app)
        .post("/api/v1/tickets")
        .set("X-Dev-Requester-Id", String(ACTIVE_REQUESTER_ID))
        .send({ ...validPayload, categoryId: bad });
      expect(res.status).toBe(400);
      expect(res.body.error.fields.categoryId).toMatch(/positive integer/);
    }
  });

  it("A-2: creates a ticket with a generated Ticket Number and status New", async () => {
    const res = await request(app)
      .post("/api/v1/tickets")
      .set("X-Dev-Requester-Id", String(ACTIVE_REQUESTER_ID))
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);
    expect(res.body.status).toBe("New");
    expect(res.body.requestedPriority).toBe("Medium");
    expect(res.body.summary).toBe(validPayload.summary);
    expect(res.body.requester.id).toBe(ACTIVE_REQUESTER_ID);
    expect(res.body.category.id).toBe(1);
    expect(res.body.relatedSystem.id).toBe(1);

    const persisted = await getPrisma().ticket.findUnique({ where: { id: res.body.id } });
    expect(persisted?.requestedPriority).toBe("Medium");

    createdTicketIds.push(res.body.id);
  });
});
