import { Router } from "express";
import { Prisma, UserRole } from "@prisma/client";
import { requireAuth, requirePasswordChanged, requireRole } from "./auth.js";
import { getPrisma } from "./prisma.js";
import { validateStaffQueueQuery, type StaffQueueSort } from "./staffQueueQuery.js";

export const staffQueueRouter = Router();

const queueSelect = Prisma.validator<Prisma.TicketSelect>()({
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
});

function standardOrderBy(sort: StaffQueueSort): Prisma.TicketOrderByWithRelationInput[] | null {
  switch (sort) {
    case "created_desc":
      return [{ createdAt: "desc" }, { id: "desc" }];
    case "created_asc":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "ticket_number_asc":
      return [{ ticketNumber: "asc" }, { id: "asc" }];
    case "priority_desc":
      return null;
    case "updated_desc":
    default:
      return [{ updatedAt: "desc" }, { id: "desc" }];
  }
}

async function findPriorityPage(
  tx: Prisma.TransactionClient,
  where: Prisma.TicketWhereInput,
  skip: number,
  take: number,
) {
  // Prisma cannot express the approved High > Medium > Low > unrecorded
  // business ordering directly. Keep the ordering/pagination in PostgreSQL by
  // paging across four disjoint priority buckets instead of loading all rows
  // and sorting them in Node.
  const groups: Prisma.TicketWhereInput[] = [
    { itPriority: "High" },
    { itPriority: "Medium" },
    { itPriority: "Low" },
    { OR: [{ itPriority: null }, { itPriority: { notIn: ["High", "Medium", "Low"] } }] },
  ];
  const counts = await Promise.all(
    groups.map((group) => tx.ticket.count({ where: { AND: [where, group] } })),
  );
  const totalItems = counts.reduce((sum, count) => sum + count, 0);
  const items: Array<Prisma.TicketGetPayload<{ select: typeof queueSelect }>> = [];
  let remainingSkip = skip;
  let remainingTake = take;

  for (let index = 0; index < groups.length && remainingTake > 0; index += 1) {
    const count = counts[index];
    if (remainingSkip >= count) {
      remainingSkip -= count;
      continue;
    }
    const groupTake = Math.min(remainingTake, count - remainingSkip);
    const rows = await tx.ticket.findMany({
      where: { AND: [where, groups[index]] },
      select: queueSelect,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: remainingSkip,
      take: groupTake,
    });
    items.push(...rows);
    remainingTake -= rows.length;
    remainingSkip = 0;
  }

  return { totalItems, items };
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
      const prisma = getPrisma();
      if (typeof parsed.owner === "number") {
        const eligibleOwner = await prisma.user.findFirst({
          where: {
            id: parsed.owner,
            isActive: true,
            role: { in: [UserRole.IT_STAFF, UserRole.ADMINISTRATOR] },
          },
          select: { id: true },
        });
        if (!eligibleOwner) {
          res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "Validation failed",
              fields: { owner: "owner must identify an active IT Staff or Administrator" },
            },
          });
          return;
        }
      }

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

      const skip = (parsed.page - 1) * parsed.pageSize;
      const result = await prisma.$transaction(async (tx) => {
        const orderBy = standardOrderBy(parsed.sort);
        if (!orderBy) {
          return findPriorityPage(tx, where, skip, parsed.pageSize);
        }
        const [totalItems, items] = await Promise.all([
          tx.ticket.count({ where }),
          tx.ticket.findMany({
            where,
            select: queueSelect,
            orderBy,
            skip,
            take: parsed.pageSize,
          }),
        ]);
        return { totalItems, items };
      });

      const { totalItems, items } = result;
      const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / parsed.pageSize);

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
