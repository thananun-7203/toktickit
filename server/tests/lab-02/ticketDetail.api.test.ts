import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import {
  AttachmentStorage,
  resetAttachmentStorageForTests,
  setAttachmentStorageForTests,
} from "../../src/attachmentStorage.js";
import { TEST_ORIGIN } from "../lab-03/testAuth.js";

const R1 = 1;
const R2 = 2;

let createdTicketIds: number[] = [];

class MemoryStorage implements AttachmentStorage {
  readonly objects = new Map<string, Buffer>();
  putCalls = 0;
  deleteCalls = 0;
  failDeletes = false;

  async put(key: string, body: Buffer): Promise<void> {
    this.putCalls += 1;
    this.objects.set(key, Buffer.from(body));
  }

  async get(key: string): Promise<Buffer> {
    const body = this.objects.get(key);
    if (!body) throw new Error("missing object");
    return Buffer.from(body);
  }

  async delete(key: string): Promise<void> {
    this.deleteCalls += 1;
    if (this.failDeletes) throw new Error("simulated cleanup failure");
    this.objects.delete(key);
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  setAttachmentStorageForTests(storage);
});

afterEach(async () => {
  const ids = createdTicketIds;
  createdTicketIds = [];
  try {
    if (ids.length) {
      const prisma = getPrisma();
      await prisma.attachment.deleteMany({ where: { ticketId: { in: ids } } });
      await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
    }
  } finally {
    resetAttachmentStorageForTests();
  }
});

async function createTicket(requesterId: number) {
  const res = await request(app)
    .post("/api/v1/tickets")
    .set("Origin", TEST_ORIGIN)
    .set("X-Dev-Requester-Id", String(requesterId))
    .send({
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: "High",
      summary: `Detail test ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`,
      description: "Ticket detail API test description.",
    });
  if (res.status !== 201) throw new Error(`createTicket failed: ${res.status}`);
  createdTicketIds.push(res.body.id);
  return res.body as { id: number; ticketNumber: string };
}

describe("GET /api/v1/tickets/:id", () => {
  it("returns the acting requester's ticket with attachments metadata", async () => {
    const ticket = await createTicket(R1);

    const res = await request(app)
      .get(`/api/v1/tickets/${ticket.id}`)
      .set("X-Dev-Requester-Id", String(R1));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticket.id);
    expect(res.body.ticketNumber).toBe(ticket.ticketNumber);
    expect(res.body.requester.id).toBe(R1);
    expect(res.body.requestedPriority).toBe("High");
    expect(res.body.attachments).toEqual([]);
  });

  it("A-5: returns 404 for another requester's ticket without leaking existence", async () => {
    const ticket = await createTicket(R2);

    const res = await request(app)
      .get(`/api/v1/tickets/${ticket.id}`)
      .set("X-Dev-Requester-Id", String(R1));

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/not found/i);
  });

  it("returns 404 for an unknown ticket id", async () => {
    const res = await request(app)
      .get("/api/v1/tickets/2147483647")
      .set("X-Dev-Requester-Id", String(R1));

    expect(res.status).toBe(404);
  });
});

describe("Ticket attachments", () => {
  it("A-10: uploads a valid file and returns it in ticket detail", async () => {
    const ticket = await createTicket(R1);
    const body = Buffer.from("sample screenshot bytes");

    const upload = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/attachments`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R1))
      .attach("files", body, { filename: "screenshot.png", contentType: "image/png" });

    expect(upload.status).toBe(201);
    expect(upload.body).toHaveLength(1);
    expect(upload.body[0]).toMatchObject({
      fileName: "screenshot.png",
      mimeType: "image/png",
      sizeBytes: body.length,
      removedAt: null,
    });

    const detail = await request(app)
      .get(`/api/v1/tickets/${ticket.id}`)
      .set("X-Dev-Requester-Id", String(R1));
    expect(detail.body.attachments).toHaveLength(1);
    expect(detail.body.attachments[0].fileName).toBe("screenshot.png");
    expect(storage.objects.size).toBe(1);
  });

  it("A-11: rejects disallowed or oversized files without partial persistence", async () => {
    const ticket = await createTicket(R1);

    const badType = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/attachments`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R1))
      .attach("files", Buffer.from("valid part"), { filename: "okay.pdf", contentType: "application/pdf" })
      .attach("files", Buffer.from("bad part"), { filename: "script.exe", contentType: "application/octet-stream" });
    expect(badType.status).toBe(400);
    expect(badType.body.error.message).toMatch(/script\.exe/i);

    const tooLarge = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/attachments`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R1))
      .attach("files", Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: "too-large.pdf",
        contentType: "application/pdf",
      });
    expect(tooLarge.status).toBe(400);
    expect(tooLarge.body.error.message).toMatch(/too-large\.pdf/i);

    const detail = await request(app)
      .get(`/api/v1/tickets/${ticket.id}`)
      .set("X-Dev-Requester-Id", String(R1));
    expect(detail.body.attachments).toEqual([]);
    expect(storage.objects.size).toBe(0);
  });

  it("A-12: rejects uploads that would exceed five active attachments", async () => {
    const ticket = await createTicket(R1);
    const first = request(app)
      .post(`/api/v1/tickets/${ticket.id}/attachments`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R1));
    for (let i = 1; i <= 5; i++) {
      first.attach("files", Buffer.from(`file-${i}`), {
        filename: `file-${i}.pdf`,
        contentType: "application/pdf",
      });
    }
    expect((await first).status).toBe(201);

    const sixth = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/attachments`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R1))
      .attach("files", Buffer.from("sixth"), { filename: "sixth.pdf", contentType: "application/pdf" });
    expect(sixth.status).toBe(400);
    expect(sixth.body.error.message).toMatch(/5 active/i);

    const detail = await request(app)
      .get(`/api/v1/tickets/${ticket.id}`)
      .set("X-Dev-Requester-Id", String(R1));
    expect(detail.body.attachments).toHaveLength(5);
  });

  it("A-12C: 4 active + 2 simultaneous uploads never exceeds five and leaves no orphan storage", async () => {
    const ticket = await createTicket(R1);
    const initial = request(app)
      .post(`/api/v1/tickets/${ticket.id}/attachments`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R1));
    for (let i = 1; i <= 4; i++) {
      initial.attach("files", Buffer.from(`initial-${i}`), {
        filename: `initial-${i}.pdf`,
        contentType: "application/pdf",
      });
    }
    expect((await initial).status).toBe(201);
    expect(storage.objects.size).toBe(4);
    expect(storage.putCalls).toBe(4);

    // If the losing request writes to storage before the authoritative
    // capacity check, this makes compensation fail and exposes the orphan.
    // A correct flow never calls delete for the capacity loser at all.
    storage.failDeletes = true;

    const [uploadA, uploadB] = await Promise.all([
      request(app)
        .post(`/api/v1/tickets/${ticket.id}/attachments`)
        .set("Origin", TEST_ORIGIN)
        .set("X-Dev-Requester-Id", String(R1))
        .attach("files", Buffer.from("concurrent-a"), {
          filename: "concurrent-a.pdf",
          contentType: "application/pdf",
        }),
      request(app)
        .post(`/api/v1/tickets/${ticket.id}/attachments`)
        .set("Origin", TEST_ORIGIN)
        .set("X-Dev-Requester-Id", String(R1))
        .attach("files", Buffer.from("concurrent-b"), {
          filename: "concurrent-b.pdf",
          contentType: "application/pdf",
        }),
    ]);

    expect([uploadA.status, uploadB.status].sort()).toEqual([201, 400]);

    const detail = await request(app)
      .get(`/api/v1/tickets/${ticket.id}`)
      .set("X-Dev-Requester-Id", String(R1));
    const active = detail.body.attachments.filter(
      (attachment: { removedAt: string | null }) => attachment.removedAt === null,
    );
    expect(active).toHaveLength(5);

    const persistedCount = await getPrisma().attachment.count({
      where: { ticketId: ticket.id, removedAt: null },
    });
    expect(persistedCount).toBe(5);
    expect(storage.objects.size).toBe(5);
    expect(storage.putCalls).toBe(5);
    expect(storage.deleteCalls).toBe(0);
  });

  it("returns a JSON 400 when one multipart request contains more than five files", async () => {
    const ticket = await createTicket(R1);
    const upload = request(app)
      .post(`/api/v1/tickets/${ticket.id}/attachments`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R1));
    for (let i = 1; i <= 6; i++) {
      upload.attach("files", Buffer.from(`file-${i}`), {
        filename: `batch-${i}.pdf`,
        contentType: "application/pdf",
      });
    }

    const res = await upload;
    expect(res.status).toBe(400);
    expect(res.type).toMatch(/json/);
    expect(res.body.error.message).toMatch(/5 files/i);
  });

  it("A-13: soft-removes an attachment, keeps metadata, and blocks download", async () => {
    const ticket = await createTicket(R1);
    const body = Buffer.from("download me");
    const upload = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/attachments`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R1))
      .attach("files", body, { filename: "report.pdf", contentType: "application/pdf" });
    const attachment = upload.body[0] as { id: number };

    const download = await request(app)
      .get(`/api/v1/attachments/${attachment.id}/download`)
      .set("X-Dev-Requester-Id", String(R1));
    expect(download.status).toBe(200);
    expect(download.headers["content-type"]).toMatch(/application\/pdf/);
    expect(download.headers["content-disposition"]).toMatch(/report\.pdf/);
    expect(Buffer.compare(download.body, body)).toBe(0);

    const removed = await request(app)
      .delete(`/api/v1/attachments/${attachment.id}`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R1))
      .send({ reason: "Duplicate evidence" });
    expect(removed.status).toBe(200);
    expect(removed.body.removedAt).toEqual(expect.any(String));
    expect(removed.body.removalReason).toBe("Duplicate evidence");

    const blocked = await request(app)
      .get(`/api/v1/attachments/${attachment.id}/download`)
      .set("X-Dev-Requester-Id", String(R1));
    expect(blocked.status).toBe(409);

    const detail = await request(app)
      .get(`/api/v1/tickets/${ticket.id}`)
      .set("X-Dev-Requester-Id", String(R1));
    expect(detail.body.attachments[0].removedAt).not.toBeNull();
    expect(detail.body.attachments[0].removalReason).toBe("Duplicate evidence");
    expect(storage.objects.size).toBe(1);

    const removedAgain = await request(app)
      .delete(`/api/v1/attachments/${attachment.id}`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R1))
      .send({ reason: "Second attempt" });
    expect(removedAgain.status).toBe(409);
    expect(removedAgain.body.error.message).toMatch(/already removed/i);
  });

  it("A-13R: requires a non-blank removal reason and keeps the attachment active on validation failure", async () => {
    const ticket = await createTicket(R1);
    const upload = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/attachments`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R1))
      .attach("files", Buffer.from("reason required"), {
        filename: "reason-required.pdf",
        contentType: "application/pdf",
      });
    const attachmentId = upload.body[0].id as number;

    const missing = await request(app)
      .delete(`/api/v1/attachments/${attachmentId}`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R1))
      .send({});
    expect(missing.status).toBe(400);
    expect(missing.body.error.message).toMatch(/reason/i);

    const blank = await request(app)
      .delete(`/api/v1/attachments/${attachmentId}`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R1))
      .send({ reason: "   " });
    expect(blank.status).toBe(400);
    expect(blank.body.error.message).toMatch(/reason/i);

    const detail = await request(app)
      .get(`/api/v1/tickets/${ticket.id}`)
      .set("X-Dev-Requester-Id", String(R1));
    expect(detail.body.attachments[0].removedAt).toBeNull();
    expect(detail.body.attachments[0].removalReason).toBeNull();
    expect(storage.objects.size).toBe(1);
  });

  it("A-13C: two simultaneous removes return exactly one 200 and one 409", async () => {
    const ticket = await createTicket(R1);
    const upload = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/attachments`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R1))
      .attach("files", Buffer.from("remove race"), {
        filename: "remove-race.pdf",
        contentType: "application/pdf",
      });
    const attachmentId = upload.body[0].id as number;

    const [removeA, removeB] = await Promise.all([
      request(app)
        .delete(`/api/v1/attachments/${attachmentId}`)
        .set("Origin", TEST_ORIGIN)
        .set("X-Dev-Requester-Id", String(R1))
        .send({ reason: "Concurrent reason A" }),
      request(app)
        .delete(`/api/v1/attachments/${attachmentId}`)
        .set("Origin", TEST_ORIGIN)
        .set("X-Dev-Requester-Id", String(R1))
        .send({ reason: "Concurrent reason B" }),
    ]);

    expect([removeA.status, removeB.status].sort()).toEqual([200, 409]);

    const detail = await request(app)
      .get(`/api/v1/tickets/${ticket.id}`)
      .set("X-Dev-Requester-Id", String(R1));
    expect(detail.body.attachments[0].removedAt).not.toBeNull();
    expect(["Concurrent reason A", "Concurrent reason B"]).toContain(
      detail.body.attachments[0].removalReason,
    );
    expect(storage.objects.size).toBe(1);
  });

  it("returns 502 when the attachment storage cannot be read", async () => {
    const ticket = await createTicket(R1);
    const upload = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/attachments`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R1))
      .attach("files", Buffer.from("storage failure test"), {
        filename: "storage.pdf",
        contentType: "application/pdf",
      });
    const attachmentId = upload.body[0].id as number;

    setAttachmentStorageForTests({
      async put() {},
      async get() {
        throw new Error("SeaweedFS unavailable");
      },
      async delete() {},
    });

    const download = await request(app)
      .get(`/api/v1/attachments/${attachmentId}/download`)
      .set("X-Dev-Requester-Id", String(R1));

    expect(download.status).toBe(502);
    expect(download.body.error.message).toMatch(/storage/i);
  });

  it("does not expose another requester's attachment", async () => {
    const ticket = await createTicket(R2);
    const upload = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/attachments`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R2))
      .attach("files", Buffer.from("private"), { filename: "private.pdf", contentType: "application/pdf" });
    const id = upload.body[0].id as number;

    const download = await request(app)
      .get(`/api/v1/attachments/${id}/download`)
      .set("X-Dev-Requester-Id", String(R1));
    expect(download.status).toBe(404);

    const remove = await request(app)
      .delete(`/api/v1/attachments/${id}`)
      .set("Origin", TEST_ORIGIN)
      .set("X-Dev-Requester-Id", String(R1))
      .send({ reason: "Should not be accepted" });
    expect(remove.status).toBe(404);
  });
});
