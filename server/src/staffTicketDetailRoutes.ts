import { Router } from "express";
import { Prisma, UserRole } from "@prisma/client";
import {
  requireApprovedOrigin,
  requireAuth,
  requirePasswordChanged,
  requireRole,
} from "./auth.js";
import { getPrisma } from "./prisma.js";
import {
  isAllowedStatusTransition,
  isItPriority,
  isTicketStatus,
} from "./staffTicketOperations.js";

export const staffTicketDetailRouter = Router();

const staffOnly = [
  requireAuth,
  requirePasswordChanged,
  requireRole(UserRole.IT_STAFF, UserRole.ADMINISTRATOR),
] as const;

const detailSelect = Prisma.validator<Prisma.TicketSelect>()({
  id: true,
  ticketNumber: true,
  summary: true,
  description: true,
  requestedPriority: true,
  itPriority: true,
  status: true,
  problemAppearsResolvedAt: true,
  createdAt: true,
  updatedAt: true,
  requester: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true, email: true, role: true } },
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
});

class TicketMissingError extends Error {}
class OwnerNotEligibleError extends Error {}
class StaleTicketStateError extends Error {}

function parseTicketId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validationError(fields: Record<string, string>) {
  return { error: { code: "VALIDATION_ERROR", message: "Validation failed", fields } };
}

async function loadDetail(ticketId: number) {
  return getPrisma().ticket.findUnique({
    where: { id: ticketId },
    select: detailSelect,
  });
}

staffTicketDetailRouter.get(
  "/tickets/:id",
  ...staffOnly,
  async (req, res) => {
    try {
      const ticketId = parseTicketId(req.params.id);
      if (!ticketId) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }
      const ticket = await loadDetail(ticketId);
      if (!ticket) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }
      res.json(ticket);
    } catch {
      res.status(500).json({ error: { code: "STAFF_TICKET_DETAIL_FAILED", message: "Unable to load Ticket Detail" } });
    }
  },
);

staffTicketDetailRouter.patch(
  "/tickets/:id/owner",
  requireApprovedOrigin,
  ...staffOnly,
  async (req, res) => {
    const ticketId = parseTicketId(req.params.id);
    if (!ticketId) {
      res.status(404).json({ error: { message: "Ticket not found" } });
      return;
    }

    const action = req.body?.action;
    if (action !== "claim" && action !== "assign") {
      res.status(400).json(validationError({ action: "action must be claim or assign" }));
      return;
    }
    if (action === "claim" && req.body?.ownerId !== undefined) {
      res.status(400).json(validationError({ ownerId: "ownerId is not allowed when action is claim" }));
      return;
    }

    const authenticated = res.locals.authUser!;
    let targetOwnerId = authenticated.id;
    if (action === "assign") {
      const ownerId = Number(req.body?.ownerId);
      if (!Number.isInteger(ownerId) || ownerId <= 0) {
        res.status(400).json(validationError({ ownerId: "ownerId must be a positive integer" }));
        return;
      }
      targetOwnerId = ownerId;
    }

    try {
      const prisma = getPrisma();
      const result = await prisma.$transaction(async (tx) => {
        const before = await tx.ticket.findUnique({
          where: { id: ticketId },
          select: { id: true, ownerId: true },
        });
        if (!before) throw new TicketMissingError();

        const userIds = Array.from(new Set(
          [before.ownerId, targetOwnerId].filter((id): id is number => typeof id === "number"),
        )).sort((a, b) => a - b);

        const lockedUsers = await tx.$queryRaw<Array<{
          id: number;
          role: UserRole;
          isActive: boolean;
        }>>(Prisma.sql`
          SELECT "id", "role", "isActive"
          FROM "User"
          WHERE "id" IN (${Prisma.join(userIds)})
          ORDER BY "id"
          FOR UPDATE
        `);

        const target = lockedUsers.find((user) => user.id === targetOwnerId);
        const targetHasEligibleRole = target?.role === UserRole.IT_STAFF || target?.role === UserRole.ADMINISTRATOR;
        if (!target || !target.isActive || !targetHasEligibleRole) {
          throw new OwnerNotEligibleError();
        }

        const updated = await tx.ticket.updateMany({
          where: { id: ticketId, ownerId: before.ownerId },
          data: { ownerId: targetOwnerId },
        });
        if (updated.count === 0) throw new StaleTicketStateError();

        return tx.ticket.findUniqueOrThrow({
          where: { id: ticketId },
          select: {
            id: true,
            owner: { select: { id: true, name: true, email: true, role: true } },
            updatedAt: true,
          },
        });
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof TicketMissingError) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }
      if (error instanceof OwnerNotEligibleError) {
        res.status(409).json({
          error: { code: "OWNER_NOT_ELIGIBLE", message: "Selected owner is not an active IT Staff or Administrator" },
        });
        return;
      }
      if (error instanceof StaleTicketStateError || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) {
        res.status(409).json({
          error: { code: "STALE_TICKET_STATE", message: "Ticket ownership changed; refresh and try again" },
        });
        return;
      }
      res.status(500).json({ error: { code: "OWNER_UPDATE_FAILED", message: "Unable to update Ticket owner" } });
    }
  },
);

staffTicketDetailRouter.patch(
  "/tickets/:id/it-priority",
  requireApprovedOrigin,
  ...staffOnly,
  async (req, res) => {
    const ticketId = parseTicketId(req.params.id);
    if (!ticketId) {
      res.status(404).json({ error: { message: "Ticket not found" } });
      return;
    }
    if (!isItPriority(req.body?.itPriority)) {
      res.status(400).json(validationError({ itPriority: "itPriority must be Low, Medium, or High" }));
      return;
    }

    try {
      const prisma = getPrisma();
      const exists = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
      if (!exists) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }
      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { itPriority: req.body.itPriority },
        select: { id: true, requestedPriority: true, itPriority: true, updatedAt: true },
      });
      res.json(updated);
    } catch {
      res.status(500).json({ error: { code: "IT_PRIORITY_UPDATE_FAILED", message: "Unable to update IT Priority" } });
    }
  },
);

staffTicketDetailRouter.patch(
  "/tickets/:id/status",
  requireApprovedOrigin,
  ...staffOnly,
  async (req, res) => {
    const ticketId = parseTicketId(req.params.id);
    if (!ticketId) {
      res.status(404).json({ error: { message: "Ticket not found" } });
      return;
    }
    if (!isTicketStatus(req.body?.status)) {
      res.status(400).json(validationError({ status: "status is not a supported Ticket status" }));
      return;
    }

    try {
      const prisma = getPrisma();
      const current = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, status: true },
      });
      if (!current) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }
      if (!isTicketStatus(current.status) || !isAllowedStatusTransition(current.status, req.body.status)) {
        res.status(409).json({
          error: { code: "INVALID_STATUS_TRANSITION", message: "Status transition is not allowed" },
        });
        return;
      }

      const data: Prisma.TicketUpdateManyMutationInput = { status: req.body.status };
      if (req.body.status === "Reopened") data.problemAppearsResolvedAt = null;
      const changed = await prisma.ticket.updateMany({
        where: { id: ticketId, status: current.status },
        data,
      });
      if (changed.count === 0) {
        res.status(409).json({
          error: { code: "STALE_TICKET_STATE", message: "Ticket status changed; refresh and try again" },
        });
        return;
      }
      const updated = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticketId },
        select: { id: true, status: true, problemAppearsResolvedAt: true, updatedAt: true },
      });
      res.json(updated);
    } catch {
      res.status(500).json({ error: { code: "STATUS_UPDATE_FAILED", message: "Unable to update Ticket status" } });
    }
  },
);

staffTicketDetailRouter.get(
  "/tickets/:id/internal-notes",
  ...staffOnly,
  async (req, res) => {
    try {
      const ticketId = parseTicketId(req.params.id);
      if (!ticketId) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
      if (!ticket) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }
      const items = await prisma.internalNote.findMany({
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
      res.status(500).json({ error: { code: "INTERNAL_NOTES_FAILED", message: "Unable to load Internal Notes" } });
    }
  },
);

staffTicketDetailRouter.post(
  "/tickets/:id/internal-notes",
  requireApprovedOrigin,
  ...staffOnly,
  async (req, res) => {
    try {
      const ticketId = parseTicketId(req.params.id);
      if (!ticketId) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }
      const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
      const length = Array.from(content).length;
      if (!content || length > 2000) {
        res.status(400).json(validationError({
          content: !content ? "Internal Note is required" : "Internal Note must be at most 2000 characters",
        }));
        return;
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
      if (!ticket) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }
      const user = res.locals.authUser!;
      const created = await prisma.internalNote.create({
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
      res.status(500).json({ error: { code: "INTERNAL_NOTE_POST_FAILED", message: "Unable to post Internal Note" } });
    }
  },
);
