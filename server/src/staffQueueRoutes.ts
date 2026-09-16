import { Router } from "express";
import { Prisma, UserRole } from "@prisma/client";
import { requireAuth, requirePasswordChanged, requireRole } from "./auth.js";
import { getPrisma } from "./prisma.js";
import { validateStaffQueueQuery, type StaffQueueSort } from "./staffQueueQuery.js";

export const staffQueueRouter = Router();

function comparePriority(a: string | null, b: string | null): number {
  const rank: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
  return (rank[b ?? ""] ?? 0) - (rank[a ?? ""] ?? 0);
}

function sortTickets<T extends { id: number; ticketNumber: string; createdAt: Date; updatedAt: Date; itPriority: string | null }>(
  items: T[],
  sort: StaffQueueSort,
): T[] {
  return items.sort((a, b) => {
    switch (sort) {
      case "created_desc":
        return b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id;
      case "created_asc":
        return a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id;
      case "priority_desc":
        return comparePriority(a.itPriority, b.itPriority) || b.updatedAt.getTime() - a.updatedAt.getTime() || b.id - a.id;
      case "ticket_number_asc":
        return a.ticketNumber.localeCompare(b.ticketNumber) || a.id - b.id;
      case "updated_desc":
      default:
        return b.updatedAt.getTime() - a.updatedAt.getTime() || b.id - a.id;
    }
  });
}

staffQueueRouter.get(
  "/tickets",
  requireAuth,
  requirePasswordChanged,
  requireRole(UserRole.IT_STAFF, UserRole.ADMINISTRATOR),
  async (req, res) => {
    try {
      const { errors, parsed } = validateStaffQueueQuery(req.query as Record<string, unknown>);
      if (!parsed) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Validation failed", fields: errors } });
        return;
      }

      const user = res.locals.authUser!;
      const where: Prisma.TicketWhereInput = {};
      if (parsed.search) {
        where.OR = [
          { ticketNumber: { contains: parsed.search, mode: "insensitive" } },
          { summary: { contains: parsed.search, mode: "insensitive" } },
          { requester: { name: { contains: parsed.search, mode: "insensitive" } } },
          { requester: { email: { contains: parsed.search, mode: "insensitive" } } },
        ];
      }
      if (parsed.status) where.status = parsed.status;
      if (parsed.requestedPriority) where.requestedPriority = parsed.requestedPriority;
      if (parsed.itPriority !== undefined) where.itPriority = parsed.itPriority;
      if (parsed.owner === "unassigned") where.ownerId = null;
      else if (parsed.owner === "mine") where.ownerId = user.id;
      else if (typeof parsed.owner === "number") where.ownerId = parsed.owner;
      if (parsed.categoryId) where.categoryId = parsed.categoryId;
      if (parsed.relatedSystemId) where.relatedSystemId = parsed.relatedSystemId;

      const rows = await getPrisma().ticket.findMany({
        where,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          requestedPriority: true,
          itPriority: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          requester: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      const sorted = sortTickets(rows, parsed.sort);
      const totalItems = sorted.length;
      const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / parsed.pageSize);
      const start = (parsed.page - 1) * parsed.pageSize;
      const items = sorted.slice(start, start + parsed.pageSize);

      res.json({ items, page: parsed.page, pageSize: parsed.pageSize, totalItems, totalPages });
    } catch {
      res.status(500).json({ error: { code: "STAFF_QUEUE_FAILED", message: "Unable to load Ticket Queue" } });
    }
  },
);

staffQueueRouter.get(
  "/assignees",
  requireAuth,
  requirePasswordChanged,
  requireRole(UserRole.IT_STAFF, UserRole.ADMINISTRATOR),
  async (_req, res) => {
    try {
      const items = await getPrisma().user.findMany({
        where: {
          isActive: true,
          role: { in: [UserRole.IT_STAFF, UserRole.ADMINISTRATOR] },
        },
        select: { id: true, name: true, email: true, role: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      });
      res.json(items);
    } catch {
      res.status(500).json({ error: { code: "ASSIGNEE_LIST_FAILED", message: "Unable to load staff assignees" } });
    }
  },
);
