import express, { Request, Response } from "express";
import cors from "cors";
import crypto from "node:crypto";
import multer from "multer";
import { UserRole } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import { authRouter } from "./authRoutes.js";
import {
  CLIENT_ORIGIN,
  requireApprovedOrigin,
  requireAuth,
  requirePasswordChanged,
  requireRole,
} from "./auth.js";
import { generateTicketNumber, isTicketNumberConflict } from "./ticketNumber.js";
import { validateTicketInput } from "./ticketValidation.js";
import { toPrismaOrderBy, validateTicketQuery } from "./ticketQuery.js";
import { getAttachmentStorage } from "./attachmentStorage.js";
import {
  MAX_ACTIVE_ATTACHMENTS,
  safeStorageFileName,
  validateAttachmentFiles,
} from "./attachmentValidation.js";
import { sharedResourceTicketVisibilityWhere } from "./ticketAccess.js";
import { staffQueueRouter } from "./staffQueueRoutes.js";
import { staffTicketDetailRouter } from "./staffTicketDetailRoutes.js";
import { adminUserRouter } from "./adminUserRoutes.js";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
  // Attachment downloads are fetched by the Vite client, so expose the
  // filename header to browser JavaScript instead of letting it be hidden by
  // CORS. The client uses it to preserve the original attachment filename.
  exposedHeaders: ["Content-Disposition"],
}));
app.use(express.json());
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/staff", staffQueueRouter);
app.use("/api/v1/staff", staffTicketDetailRouter);
app.use("/api/v1/admin", adminUserRouter);

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  // Keep a small buffer above the business-rule limit so the route can return
  // a validation error naming the offending file instead of a generic parser
  // failure for the common 5 MB + 1 byte case.
  limits: { files: 5, fileSize: 6 * 1024 * 1024 },
});

const parseAttachmentUpload = (req: Request, res: Response, next: express.NextFunction) => {
  attachmentUpload.array("files", 5)(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof multer.MulterError && err.code === "LIMIT_FILE_COUNT"
        ? "A ticket can have at most 5 files per upload"
        : "Attachment upload exceeds allowed limits";
      res.status(400).json({ error: { message } });
      return;
    }
    next();
  });
};

class AttachmentLimitError extends Error {}
class TicketNotFoundError extends Error {}

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Returns the required JSON so the Supertest test in tests/lab-01 can pass.
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// GET /api/categories reads categories from PostgreSQL through Prisma and
// returns each { id, name } in predictable (id) order.
// ---------------------------------------------------------------------------
app.get("/api/categories", requireAuth, requirePasswordChanged, async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });
    res.json(categories);
  } catch {
    res.status(500).json({ error: "Unable to load categories" });
  }
});

app.get("/api/v1/categories", requireAuth, requirePasswordChanged, async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });
    res.json(categories);
  } catch {
    res.status(500).json({ error: "Unable to load categories" });
  }
});

app.get("/api/v1/related-systems", requireAuth, requirePasswordChanged, async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const systems = await prisma.relatedSystem.findMany({
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });
    res.json(systems);
  } catch {
    res.status(500).json({ error: "Unable to load related systems" });
  }
});

// ---------------------------------------------------------------------------
// Lab 3 Issue 3 — Create Ticket under authenticated Requester identity.
// POST /api/v1/tickets validates the payload (BR-3), generates the official
// Ticket Number (BR-2), and persists a New ticket owned by the acting requester
// (BR-1/BR-7). Client-supplied requester identity is never trusted.
// ---------------------------------------------------------------------------
app.post(
  "/api/v1/tickets",
  requireApprovedOrigin,
  requireAuth,
  requirePasswordChanged,
  requireRole(UserRole.REQUESTER),
  async (req: Request, res: Response) => {
    try {
      const errors = validateTicketInput(req.body);
      if (Object.keys(errors).length > 0) {
        res.status(400).json({ error: { message: "Validation failed", fields: errors } });
        return;
      }

      const { categoryId, relatedSystemId, requestedPriority, summary, description } = req.body as {
        categoryId: number;
        relatedSystemId: number;
        requestedPriority: string;
        summary: string;
        description: string;
      };

      const prisma = getPrisma();

      // Ensure referenced ids exist (validateTicketInput only checks presence).
      const [category, relatedSystem] = await Promise.all([
        prisma.category.findUnique({ where: { id: categoryId } }),
        prisma.relatedSystem.findUnique({ where: { id: relatedSystemId } }),
      ]);
      if (!category || !relatedSystem) {
        res.status(404).json({ error: { message: "Unknown category or related system" } });
        return;
      }

      const requester = res.locals.authUser!;

      // Race-safe create: if two concurrent requests allocate the same
      // TKT-YYYY-NNNNN, the unique constraint (P2002) will reject the second.
      // Retry with a fresh ticketNumber up to 3 attempts before surfacing 500.
      const MAX_RETRIES = 3;
      let ticket: Awaited<ReturnType<typeof prisma.ticket.create>> | null = null;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const ticketNumber = await generateTicketNumber();
        try {
          ticket = await prisma.ticket.create({
            data: {
              ticketNumber,
              summary: summary.trim(),
              description: description.trim(),
              requestedPriority: requestedPriority.trim(),
              itPriority: requestedPriority.trim(),
              status: "New",
              requesterId: requester.id,
              categoryId,
              relatedSystemId,
            },
            include: {
              requester: { select: { id: true, name: true } },
              category: { select: { id: true, name: true } },
              relatedSystem: { select: { id: true, name: true } },
            },
          });
          break;
        } catch (err: unknown) {
          if (isTicketNumberConflict(err) && attempt < MAX_RETRIES - 1) {
            continue;
          }
          throw err;
        }
      }
      if (!ticket) throw new Error("Unable to create ticket after retries");

      res.status(201).json(ticket);
    } catch {
      res.status(500).json({ error: { message: "Unable to create ticket" } });
    }
  }
);

// ---------------------------------------------------------------------------
// Issue 4 — My Tickets (list own tickets with search/filter/sort/pagination)
// GET /api/v1/tickets returns only the acting requester's tickets (BR-1).
// Query: search (summary contains, case-insensitive), categoryId,
// relatedSystemId, sort (newest|oldest|summary_asc), page, pageSize.
// ---------------------------------------------------------------------------
app.get(
  "/api/v1/tickets",
  requireAuth,
  requirePasswordChanged,
  requireRole(UserRole.REQUESTER),
  async (req: Request, res: Response) => {
  try {
    const { errors, parsed } = validateTicketQuery(req.query as Record<string, unknown>);
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: { message: "Validation failed", fields: errors } });
      return;
    }
    const q = parsed!;
    const prisma = getPrisma();
    const requester = res.locals.authUser!;

    const where: Record<string, unknown> = { requesterId: requester.id };
    if (q.search) {
      where.OR = [
        { summary: { contains: q.search, mode: "insensitive" } },
        { ticketNumber: { contains: q.search, mode: "insensitive" } },
      ];
    }
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.relatedSystemId) where.relatedSystemId = q.relatedSystemId;

    const orderBy = toPrismaOrderBy(q.sort);
    const skip = (q.page - 1) * q.pageSize;
    const take = q.pageSize;

    const [totalItems, items] = await Promise.all([
      prisma.ticket.count({ where: where as never }),
      prisma.ticket.findMany({
        where: where as never,
        orderBy: orderBy as never,
        skip,
        take,
        include: {
          requester: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
        },
      }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / q.pageSize);

    res.json({
      items,
      page: q.page,
      pageSize: q.pageSize,
      totalItems,
      totalPages,
    });
  } catch {
    res.status(500).json({ error: { message: "Unable to load tickets" } });
  }
  },
);

app.get(
  "/api/v1/tickets/:id",
  requireAuth,
  requirePasswordChanged,
  requireRole(UserRole.REQUESTER),
  async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(404).json({ error: { message: "Ticket not found" } });
      return;
    }

    const prisma = getPrisma();
    const requester = res.locals.authUser!;
    const ticket = await prisma.ticket.findFirst({
      where: { id, requesterId: requester.id },
      include: {
        requester: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        attachments: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            sizeBytes: true,
            removedAt: true,
            removalReason: true,
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!ticket) {
      res.status(404).json({ error: { message: "Ticket not found" } });
      return;
    }

    res.json(ticket);
  } catch {
    res.status(500).json({ error: { message: "Unable to load ticket" } });
  }
  },
);

// Issue 5 — Upload attachments to an owned ticket.
app.post(
  "/api/v1/tickets/:id/attachments",
  requireApprovedOrigin,
  requireAuth,
  requirePasswordChanged,
  requireRole(UserRole.REQUESTER),
  parseAttachmentUpload,
  async (req: Request, res: Response) => {
    const writtenKeys: string[] = [];
    try {
      const ticketId = Number(req.params.id);
      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }

      const prisma = getPrisma();
      const requester = res.locals.authUser!;
      const ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, requesterId: requester.id },
        select: { id: true },
      });
      if (!ticket) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }

      const files = (req.files ?? []) as Express.Multer.File[];
      if (files.length === 0) {
        res.status(400).json({ error: { message: "At least one file is required" } });
        return;
      }

      const invalid = validateAttachmentFiles(files);
      if (invalid.length > 0) {
        res.status(400).json({ error: { message: `Invalid attachment(s): ${invalid.join(", ")}` } });
        return;
      }

      // Fast pre-check avoids writing to object storage when the ticket is
      // already known to be full. This is intentionally NOT the authoritative
      // concurrency check; a second check runs while holding a PostgreSQL row
      // lock below so simultaneous requests cannot both reserve the fifth slot.
      const activeCount = await prisma.attachment.count({
        where: { ticketId, removedAt: null },
      });
      if (activeCount + files.length > MAX_ACTIVE_ATTACHMENTS) {
        res.status(400).json({ error: { message: "A ticket can have at most 5 active attachments" } });
        return;
      }

      const storage = getAttachmentStorage();
      const pending = files.map((file) => ({
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey: `toktickit/tickets/${ticketId}/${crypto.randomUUID()}-${safeStorageFileName(file.originalname)}`,
        source: file,
      }));

      const created = await prisma.$transaction(async (tx) => {
        // Serialize attachment reservations for this ticket. The lock is held
        // until the transaction commits. The authoritative capacity check is
        // intentionally completed before any SeaweedFS write, so a request
        // that loses a capacity race creates no storage object to compensate.
        const locked = await tx.$queryRaw<Array<{ id: number }>>`
          SELECT "id"
          FROM "Ticket"
          WHERE "id" = ${ticketId} AND "requesterId" = ${requester.id}
          FOR UPDATE
        `;
        if (locked.length === 0) throw new TicketNotFoundError();

        const lockedActiveCount = await tx.attachment.count({
          where: { ticketId, removedAt: null },
        });
        if (lockedActiveCount + files.length > MAX_ACTIVE_ATTACHMENTS) {
          throw new AttachmentLimitError();
        }

        const rows = [] as Array<{
          id: number;
          fileName: string;
          mimeType: string;
          sizeBytes: number;
          removedAt: Date | null;
          removalReason: string | null;
        }>;
        for (const file of pending) {
          await storage.put(file.storageKey, file.source.buffer, file.source.mimetype);
          writtenKeys.push(file.storageKey);
          rows.push(
            await tx.attachment.create({
              data: {
                fileName: file.fileName,
                mimeType: file.mimeType,
                sizeBytes: file.sizeBytes,
                storageKey: file.storageKey,
                ticketId,
              },
              select: {
                id: true,
                fileName: true,
                mimeType: true,
                sizeBytes: true,
                removedAt: true,
                removalReason: true,
              },
            }),
          );
        }
        return rows;
      }, { timeout: 30_000 });

      res.status(201).json(created);
    } catch (err) {
      const storage = getAttachmentStorage();
      await Promise.allSettled(writtenKeys.map((key) => storage.delete(key)));
      if (err instanceof multer.MulterError) {
        res.status(400).json({ error: { message: "Attachment upload exceeds allowed limits" } });
        return;
      }
      if (err instanceof AttachmentLimitError) {
        res.status(400).json({ error: { message: "A ticket can have at most 5 active attachments" } });
        return;
      }
      if (err instanceof TicketNotFoundError) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }
      res.status(500).json({ error: { message: "Unable to upload attachments" } });
    }
  },
);

// Issue 5 — Download an active owned attachment via the storage proxy.
app.get(
  "/api/v1/attachments/:id/download",
  requireAuth,
  requirePasswordChanged,
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(404).json({ error: { message: "Attachment not found" } });
        return;
      }

      const user = res.locals.authUser!;
      const attachment = await getPrisma().attachment.findFirst({
        where: { id, ticket: sharedResourceTicketVisibilityWhere(user) },
      });
      if (!attachment) {
        res.status(404).json({ error: { message: "Attachment not found" } });
        return;
      }
      if (attachment.removedAt) {
        res.status(409).json({ error: { message: "Attachment has been removed" } });
        return;
      }

      let body: Buffer;
      try {
        body = await getAttachmentStorage().get(attachment.storageKey);
      } catch {
        res.status(502).json({ error: { message: "Unable to read attachment storage" } });
        return;
      }

      const headerName = attachment.fileName.replace(/[\r\n"]/g, "_");
      res.setHeader("Content-Type", attachment.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${headerName}"`);
      res.send(body);
    } catch {
      res.status(500).json({ error: { message: "Unable to download attachment" } });
    }
  },
);

// Issue 5 — Soft-remove an attachment while retaining metadata and storage.
app.delete(
  "/api/v1/attachments/:id",
  requireApprovedOrigin,
  requireAuth,
  requirePasswordChanged,
  requireRole(UserRole.REQUESTER),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(404).json({ error: { message: "Attachment not found" } });
        return;
      }

      const prisma = getPrisma();
      const requester = res.locals.authUser!;
      const attachment = await prisma.attachment.findFirst({
        where: { id, ticket: { requesterId: requester.id } },
      });
      if (!attachment) {
        res.status(404).json({ error: { message: "Attachment not found" } });
        return;
      }
      if (attachment.removedAt) {
        res.status(409).json({ error: { message: "Attachment already removed" } });
        return;
      }

      const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
      if (!reason) {
        res.status(400).json({ error: { message: "Removal reason is required" } });
        return;
      }

      const removedAt = new Date();
      // Make the state transition atomic. With concurrent DELETEs, only the
      // first request can change removedAt from NULL; the loser updates zero rows
      // and therefore returns the documented 409 instead of a second 200.
      const result = await prisma.attachment.updateMany({
        where: { id, removedAt: null },
        data: { removedAt, removalReason: reason },
      });
      if (result.count === 0) {
        res.status(409).json({ error: { message: "Attachment already removed" } });
        return;
      }

      const updated = await prisma.attachment.findUnique({
        where: { id },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          removedAt: true,
          removalReason: true,
        },
      });
      if (!updated) {
        res.status(404).json({ error: { message: "Attachment not found" } });
        return;
      }
      res.json(updated);
    } catch {
      res.status(500).json({ error: { message: "Unable to remove attachment" } });
    }
  },
);

// ---------------------------------------------------------------------------
// Lab 3 Issue 3 — Public Comments.
// Requesters may read/post only on their own Ticket. Staff/Admin access to the
// same public channel is allowed by the approved authorization matrix so later
// operational UI can reuse the endpoint without changing its security model.
// ---------------------------------------------------------------------------
app.get(
  "/api/v1/tickets/:id/public-comments",
  requireAuth,
  requirePasswordChanged,
  async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }

      const user = res.locals.authUser!;
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, ...sharedResourceTicketVisibilityWhere(user) },
        select: { id: true },
      });
      if (!ticket) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }

      const items = await prisma.publicComment.findMany({
        where: { ticketId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { id: true, name: true, role: true } },
        },
      });
      res.json({ items });
    } catch {
      res.status(500).json({ error: { message: "Unable to load public comments" } });
    }
  },
);

app.post(
  "/api/v1/tickets/:id/public-comments",
  requireApprovedOrigin,
  requireAuth,
  requirePasswordChanged,
  async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }

      const user = res.locals.authUser!;
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, ...sharedResourceTicketVisibilityWhere(user) },
        select: { id: true },
      });
      if (!ticket) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }

      const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
      const contentLength = Array.from(content).length;
      if (!content || contentLength > 2000) {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            fields: {
              content: !content
                ? "Comment is required"
                : "Comment must be at most 2000 characters",
            },
          },
        });
        return;
      }

      const created = await prisma.publicComment.create({
        data: { ticketId, authorId: user.id, content },
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { id: true, name: true, role: true } },
        },
      });
      res.status(201).json(created);
    } catch {
      res.status(500).json({ error: { message: "Unable to post public comment" } });
    }
  },
);

const RESOLUTION_INDICATION_ALLOWED_STATUSES = new Set([
  "New",
  "Open",
  "In Progress",
  "Waiting for Requester",
  "Reopened",
]);

app.post(
  "/api/v1/tickets/:id/problem-appears-resolved",
  requireApprovedOrigin,
  requireAuth,
  requirePasswordChanged,
  requireRole(UserRole.REQUESTER),
  async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }

      const requester = res.locals.authUser!;
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, requesterId: requester.id },
        select: { id: true, status: true, problemAppearsResolvedAt: true },
      });
      if (!ticket) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }

      if (!RESOLUTION_INDICATION_ALLOWED_STATUSES.has(ticket.status)) {
        res.status(409).json({
          error: {
            code: "RESOLUTION_INDICATION_NOT_ALLOWED",
            message: "Resolution indication is not allowed for the current Ticket status",
          },
        });
        return;
      }

      if (ticket.problemAppearsResolvedAt) {
        res.json({
          ticketId: ticket.id,
          problemAppearsResolvedAt: ticket.problemAppearsResolvedAt,
          status: ticket.status,
        });
        return;
      }

      const indicatedAt = new Date();
      const updated = await prisma.ticket.updateMany({
        where: {
          id: ticket.id,
          requesterId: requester.id,
          problemAppearsResolvedAt: null,
          status: { in: Array.from(RESOLUTION_INDICATION_ALLOWED_STATUSES) },
        },
        data: { problemAppearsResolvedAt: indicatedAt },
      });

      // A concurrent staff transition can change status between the initial
      // read and this guarded write. Re-read and return a safe conflict rather
      // than setting an indication against a terminal state.
      if (updated.count === 0) {
        const current = await prisma.ticket.findFirst({
          where: { id: ticket.id, requesterId: requester.id },
          select: { id: true, status: true, problemAppearsResolvedAt: true },
        });
        if (!current) {
          res.status(404).json({ error: { message: "Ticket not found" } });
          return;
        }
        if (!RESOLUTION_INDICATION_ALLOWED_STATUSES.has(current.status)) {
          res.status(409).json({
            error: {
              code: "RESOLUTION_INDICATION_NOT_ALLOWED",
              message: "Resolution indication is not allowed for the current Ticket status",
            },
          });
          return;
        }
        res.json({
          ticketId: current.id,
          problemAppearsResolvedAt: current.problemAppearsResolvedAt,
          status: current.status,
        });
        return;
      }

      res.json({
        ticketId: ticket.id,
        problemAppearsResolvedAt: indicatedAt,
        status: ticket.status,
      });
    } catch {
      res.status(500).json({ error: { message: "Unable to record resolution indication" } });
    }
  },
);

export default app;
