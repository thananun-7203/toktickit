import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { filterActiveRequesters } from "./requesterFilter.js";
import { requireDevRequester } from "./devRequester.js";
import { generateTicketNumber, isTicketNumberConflict } from "./ticketNumber.js";
import { validateTicketInput } from "./ticketValidation.js";
import { toPrismaOrderBy, validateTicketQuery } from "./ticketQuery.js";

type DevRequester = {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      devRequester?: DevRequester;
    }
  }
}

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

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
app.get("/api/categories", async (_req: Request, res: Response) => {
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

// ---------------------------------------------------------------------------
// Issue 2 — Development Requester Context
// Reference-data endpoints under /api/v1/ per api-spec.md.
// ---------------------------------------------------------------------------
app.get("/api/v1/requesters", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesters = await prisma.developmentRequester.findMany({
      select: { id: true, name: true, email: true, isActive: true },
      orderBy: { id: "asc" },
    });
    // Only active requesters are returned (BR-6); the inactive one is used for
    // isolation testing and must not be selectable.
    const active = filterActiveRequesters(requesters);
    res.json(active);
  } catch {
    res.status(500).json({ error: "Unable to load requesters" });
  }
});

app.get("/api/v1/categories", async (_req: Request, res: Response) => {
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

app.get("/api/v1/related-systems", async (_req: Request, res: Response) => {
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
// Issue 3 — Create Ticket
// POST /api/v1/tickets validates the payload (BR-3), generates the official
// Ticket Number (BR-2), and persists a New ticket owned by the acting requester
// (BR-1/BR-7). Identity is provided by the requireDevRequester middleware.
// ---------------------------------------------------------------------------
app.post(
  "/api/v1/tickets",
  requireDevRequester,
  async (req: Request, res: Response) => {
    try {
      const errors = validateTicketInput(req.body);
      if (Object.keys(errors).length > 0) {
        res.status(400).json({ error: { message: "Validation failed", fields: errors } });
        return;
      }

      const { categoryId, relatedSystemId, summary, description } = req.body as {
        categoryId: number;
        relatedSystemId: number;
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

      const requester = res.locals.devRequester!;

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
app.get("/api/v1/tickets", requireDevRequester, async (req: Request, res: Response) => {
  try {
    const { errors, parsed } = validateTicketQuery(req.query as Record<string, unknown>);
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: { message: "Validation failed", fields: errors } });
      return;
    }
    const q = parsed!;
    const prisma = getPrisma();
    const requester = res.locals.devRequester!;

    const where: Record<string, unknown> = { requesterId: requester.id };
    if (q.search) {
      (where as Record<string, unknown>).summary = { contains: q.search, mode: "insensitive" };
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
});

export default app;
