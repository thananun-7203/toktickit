import { Router } from "express";
import { ActionTakenStatus, Prisma, UserRole } from "@prisma/client";
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
import { isPrismaSerializationConflict } from "./prismaErrors.js";

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
  version: true,
  workflowCycle: true,
  resolvedAt: true,
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
class ResolutionGateNotMetError extends Error {}
class InvalidStatusTransitionError extends Error {}

async function runSerializableTicketTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const prisma = getPrisma();
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      });
    } catch (error) {
      lastError = error;
      if (!isPrismaSerializationConflict(error) || attempt === 2) throw error;
    }
  }
  throw lastError;
}

const INTERNAL_NOTES_DEFAULT_PAGE_SIZE = 50;
const INTERNAL_NOTES_MAX_PAGE_SIZE = 100;

function parseTicketId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseExpectedVersion(raw: unknown): number | null {
  return Number.isSafeInteger(raw) && Number(raw) > 0 ? Number(raw) : null;
}

function parsePositiveQueryInteger(
  raw: unknown,
  defaultValue: number,
  maximum?: number,
): number | null {
  if (raw === undefined) return defaultValue;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || (maximum !== undefined && value > maximum)) return null;
  return value;
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
    const expectedVersion = parseExpectedVersion(req.body?.expectedVersion);
    if (!expectedVersion) {
      res.status(400).json(validationError({ expectedVersion: "expectedVersion must be a positive integer" }));
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
      const result = await runSerializableTicketTransaction(async (tx) => {
        // Lock Ticket before any User row. Actions Taken mutations use the
        // same aggregate-first order (Ticket -> Action -> User). Admin account
        // eligibility mutations begin at User and rely on Serializable retry;
        // both paths revalidate semantics after retry so a deadlock/40001 loser
        // never turns into a different logical operation.
        const ticketRows = await tx.$queryRaw<Array<{ id: number; ownerId: number | null; version: number }>>(Prisma.sql`
          SELECT "id", "ownerId", "version"
          FROM "Ticket"
          WHERE "id" = ${ticketId}
          FOR UPDATE
        `);
        const before = ticketRows[0];
        if (!before) throw new TicketMissingError();
        if (before.version !== expectedVersion) throw new StaleTicketStateError();
        // A Claim is valid only while the Ticket is still unassigned. This
        // revalidation is essential when a Serializable transaction is retried:
        // the retry must not turn a lost Claim race into an implicit Reassign.
        if (action === "claim" && before.ownerId !== null) throw new StaleTicketStateError();

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
          where: { id: ticketId, ownerId: before.ownerId, version: expectedVersion },
          data: { ownerId: targetOwnerId, version: { increment: 1 } },
        });
        if (updated.count === 0) throw new StaleTicketStateError();

        return tx.ticket.findUniqueOrThrow({
          where: { id: ticketId },
          select: {
            id: true,
            version: true,
            owner: { select: { id: true, name: true, email: true, role: true } },
            updatedAt: true,
          },
        });
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
      if (error instanceof StaleTicketStateError || isPrismaSerializationConflict(error)) {
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
    const expectedVersion = parseExpectedVersion(req.body?.expectedVersion);
    if (!expectedVersion) {
      res.status(400).json(validationError({ expectedVersion: "expectedVersion must be a positive integer" }));
      return;
    }

    try {
      const prisma = getPrisma();
      const exists = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true, version: true } });
      if (!exists) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }
      if (exists.version !== expectedVersion) {
        res.status(409).json({ error: { code: "STALE_TICKET_STATE", message: "Ticket state changed; refresh and try again" } });
        return;
      }
      const changed = await prisma.ticket.updateMany({
        where: { id: ticketId, version: expectedVersion },
        data: { itPriority: req.body.itPriority, version: { increment: 1 } },
      });
      if (changed.count === 0) {
        res.status(409).json({ error: { code: "STALE_TICKET_STATE", message: "Ticket state changed; refresh and try again" } });
        return;
      }
      const updated = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticketId },
        select: { id: true, requestedPriority: true, itPriority: true, version: true, updatedAt: true },
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
    const expectedVersion = parseExpectedVersion(req.body?.expectedVersion);
    if (!expectedVersion) {
      res.status(400).json(validationError({ expectedVersion: "expectedVersion must be a positive integer" }));
      return;
    }

    try {
      const updated = await runSerializableTicketTransaction(async (tx) => {
        const ticketRows = await tx.$queryRaw<Array<{
          id: number;
          status: string;
          version: number;
          workflowCycle: number;
        }>>(Prisma.sql`
          SELECT "id", "status", "version", "workflowCycle"
          FROM "Ticket"
          WHERE "id" = ${ticketId}
          FOR UPDATE
        `);
        const current = ticketRows[0];
        if (!current) throw new TicketMissingError();
        if (current.version !== expectedVersion) throw new StaleTicketStateError();
        if (!isTicketStatus(current.status) || !isAllowedStatusTransition(current.status, req.body.status)) {
          throw new InvalidStatusTransitionError();
        }

        if (req.body.status === "Resolved") {
          const currentCycleActions = await tx.actionTaken.findMany({
            where: { ticketId, workflowCycle: current.workflowCycle },
            select: { status: true, result: true },
          });
          const hasCompletedWithResult = currentCycleActions.some(
            (action) => action.status === ActionTakenStatus.COMPLETED && Boolean(action.result?.trim()),
          );
          const hasActive = currentCycleActions.some((action) =>
            action.status === ActionTakenStatus.PLANNED || action.status === ActionTakenStatus.IN_PROGRESS,
          );
          if (!hasCompletedWithResult || hasActive) {
            throw new ResolutionGateNotMetError();
          }
        }

        const data: Prisma.TicketUpdateInput = {
          status: req.body.status,
          version: { increment: 1 },
        };
        if (req.body.status === "Resolved") data.resolvedAt = new Date();
        if (req.body.status === "Reopened") {
          data.problemAppearsResolvedAt = null;
          data.resolvedAt = null;
          data.workflowCycle = { increment: 1 };
        }

        await tx.ticket.update({ where: { id: ticketId }, data });
        return tx.ticket.findUniqueOrThrow({
          where: { id: ticketId },
          select: {
            id: true,
            status: true,
            problemAppearsResolvedAt: true,
            resolvedAt: true,
            workflowCycle: true,
            version: true,
            updatedAt: true,
          },
        });
      });
      res.json(updated);
    } catch (error) {
      if (error instanceof TicketMissingError) {
        res.status(404).json({ error: { message: "Ticket not found" } });
        return;
      }
      if (error instanceof ResolutionGateNotMetError) {
        res.status(409).json({
          error: {
            code: "RESOLUTION_GATE_NOT_MET",
            message: "Ticket cannot be resolved until the current workflow cycle has a Completed Action with a Result and no Planned or In Progress Actions",
          },
        });
        return;
      }
      if (error instanceof InvalidStatusTransitionError) {
        res.status(409).json({
          error: { code: "INVALID_STATUS_TRANSITION", message: "Status transition is not allowed" },
        });
        return;
      }
      if (error instanceof StaleTicketStateError || isPrismaSerializationConflict(error)) {
        res.status(409).json({
          error: { code: "STALE_TICKET_STATE", message: "Ticket status changed; refresh and try again" },
        });
        return;
      }
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
      const page = parsePositiveQueryInteger(req.query.page, 1);
      const pageSize = parsePositiveQueryInteger(
        req.query.pageSize,
        INTERNAL_NOTES_DEFAULT_PAGE_SIZE,
        INTERNAL_NOTES_MAX_PAGE_SIZE,
      );
      const fields: Record<string, string> = {};
      if (page === null) fields.page = "page must be a positive integer";
      if (pageSize === null) fields.pageSize = `pageSize must be between 1 and ${INTERNAL_NOTES_MAX_PAGE_SIZE}`;
      const skip = page !== null && pageSize !== null ? (page - 1) * pageSize : 0;
      if (page !== null && pageSize !== null && !Number.isSafeInteger(skip)) {
        fields.page = "page is too large";
      }
      if (Object.keys(fields).length > 0) {
        res.status(400).json(validationError(fields));
        return;
      }

      const [totalItems, items] = await prisma.$transaction([
        prisma.internalNote.count({ where: { ticketId } }),
        prisma.internalNote.findMany({
          where: { ticketId },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          skip,
          take: pageSize!,
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: { id: true, name: true, role: true } },
          },
        }),
      ]);
      res.json({
        items,
        page,
        pageSize,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize!),
      });
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
