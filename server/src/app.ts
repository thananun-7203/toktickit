import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { filterActiveRequesters } from "./requesterFilter.js";
import { requireDevRequester } from "./devRequester.js";
import { generateTicketNumber } from "./ticketNumber.js";
import { validateTicketInput } from "./ticketValidation.js";

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

      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: await generateTicketNumber(),
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

      res.status(201).json(ticket);
    } catch {
      res.status(500).json({ error: { message: "Unable to create ticket" } });
    }
  }
);

export default app;
