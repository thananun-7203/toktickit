import { UserRole } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import {
  cleanupTestUsers,
  createSessionCookie,
  createTestUser,
  TEST_ORIGIN,
} from "./testAuth.js";

let requesterAId = 0;
let requesterBId = 0;
let staffId = 0;
let adminId = 0;
let requesterACookie = "";
let requesterBCookie = "";
let staffCookie = "";
let adminCookie = "";
let categoryId = 0;
let relatedSystemId = 0;
const createdTicketIds: number[] = [];

function payload(summary = "Authenticated requester regression") {
  return {
    categoryId,
    relatedSystemId,
    requestedPriority: "High",
    summary,
    description: "Requester identity must come from the authenticated session only.",
  };
}

async function createOwnedTicket(cookie: string, summary: string) {
  const res = await request(app)
    .post("/api/v1/tickets")
    .set("Origin", TEST_ORIGIN)
    .set("Cookie", cookie)
    .send(payload(summary));
  expect(res.status).toBe(201);
  createdTicketIds.push(res.body.id);
  return res.body as { id: number; requester: { id: number } };
}

beforeAll(async () => {
  const prisma = getPrisma();
  const [category, relatedSystem] = await Promise.all([
    prisma.category.findFirst({ orderBy: { id: "asc" } }),
    prisma.relatedSystem.findFirst({ orderBy: { id: "asc" } }),
  ]);
  if (!category || !relatedSystem) throw new Error("Reference data must be seeded before requester regression tests");
  categoryId = category.id;
  relatedSystemId = relatedSystem.id;

  const [requesterA, requesterB, staff, admin] = await Promise.all([
    createTestUser({ name: "Requester Regression A", mustChangePassword: false }),
    createTestUser({ name: "Requester Regression B", mustChangePassword: false }),
    createTestUser({ name: "Requester Regression Staff", role: UserRole.IT_STAFF, mustChangePassword: false }),
    createTestUser({ name: "Requester Regression Admin", role: UserRole.ADMINISTRATOR, mustChangePassword: false }),
  ]);
  requesterAId = requesterA.id;
  requesterBId = requesterB.id;
  staffId = staff.id;
  adminId = admin.id;

  [requesterACookie, requesterBCookie, staffCookie, adminCookie] = await Promise.all([
    createSessionCookie(requesterAId).then((session) => session.cookie),
    createSessionCookie(requesterBId).then((session) => session.cookie),
    createSessionCookie(staffId).then((session) => session.cookie),
    createSessionCookie(adminId).then((session) => session.cookie),
  ]);
});

afterEach(async () => {
  if (createdTicketIds.length === 0) return;
  const ids = createdTicketIds.splice(0, createdTicketIds.length);
  const prisma = getPrisma();
  await prisma.publicComment.deleteMany({ where: { ticketId: { in: ids } } });
  await prisma.internalNote.deleteMany({ where: { ticketId: { in: ids } } });
  await prisma.attachment.deleteMany({ where: { ticketId: { in: ids } } });
  await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
});

afterAll(async () => {
  await cleanupTestUsers([requesterAId, requesterBId, staffId, adminId].filter(Boolean));
});

describe("Lab 3 authenticated Requester regression", () => {
  it("REQ-01/REQ-13/AZ-09: session identity wins over every client-supplied requester identity", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets?requesterId=${requesterBId}`)
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", requesterACookie)
      .set("X-Dev-Requester-Id", String(requesterBId))
      .send({ ...payload(), requesterId: requesterBId });

    expect(res.status).toBe(201);
    createdTicketIds.push(res.body.id);
    expect(res.body.requester.id).toBe(requesterAId);
    expect(res.body.status).toBe("New");
    expect(res.body.requestedPriority).toBe("High");

    const persisted = await getPrisma().ticket.findUnique({ where: { id: res.body.id } });
    expect(persisted).toMatchObject({
      requesterId: requesterAId,
      requestedPriority: "High",
      itPriority: "High",
      ownerId: null,
      status: "New",
    });
  });

  it("REQ-03/REQ-06/AZ-10: My Tickets and Ticket Detail expose only the authenticated Requester's tickets", async () => {
    const own = await createOwnedTicket(requesterACookie, "Requester A own ticket");
    const other = await createOwnedTicket(requesterBCookie, "Requester B private ticket");

    const list = await request(app).get("/api/v1/tickets?pageSize=50").set("Cookie", requesterACookie);
    expect(list.status).toBe(200);
    const ids = list.body.items.map((item: { id: number }) => item.id);
    expect(ids).toContain(own.id);
    expect(ids).not.toContain(other.id);

    const hidden = await request(app).get(`/api/v1/tickets/${other.id}`).set("Cookie", requesterACookie);
    expect(hidden.status).toBe(404);
    expect(hidden.body.error.message).toMatch(/not found/i);
  });

  it("AZ-09: the retired development header cannot authenticate without a real session", async () => {
    const res = await request(app)
      .get("/api/v1/tickets")
      .set("X-Dev-Requester-Id", String(requesterAId));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("FR-13: the temporary public Requester directory has been removed", async () => {
    const res = await request(app).get("/api/v1/requesters");
    expect(res.status).toBe(404);
  });

  it("authorization matrix: IT Staff and Administrator cannot use Requester-only Ticket routes", async () => {
    for (const cookie of [staffCookie, adminCookie]) {
      const create = await request(app)
        .post("/api/v1/tickets")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookie)
        .send(payload());
      expect(create.status).toBe(403);
      expect(create.body.error.code).toBe("FORBIDDEN");

      const list = await request(app).get("/api/v1/tickets").set("Cookie", cookie);
      expect(list.status).toBe(403);
      expect(list.body.error.code).toBe("FORBIDDEN");
    }
  });
});
