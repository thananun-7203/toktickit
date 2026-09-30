import { ActionTakenStatus, Prisma, UserRole } from "@prisma/client";
import { Router } from "express";
import {
  requireApprovedOrigin,
  requireAuth,
  requirePasswordChanged,
  requireRole,
} from "./auth.js";
import {
  actionStatusLabel,
  createActionFingerprint,
  isActiveActionStatus,
  isAllowedActionTransition,
  isCanonicalUuid,
  normalizeOptionalText,
  parseActionBusinessTime,
  parseActionStatusLabel,
  parsePositiveInteger,
  unicodeLength,
} from "./actionTakenOperations.js";
import { getPrisma } from "./prisma.js";
import { isPrismaSerializationConflict } from "./prismaErrors.js";
import { sharedResourceTicketVisibilityWhere } from "./ticketAccess.js";

export const actionTakenRouter = Router();

const staffOnly = [
  requireAuth,
  requirePasswordChanged,
  requireRole(UserRole.IT_STAFF, UserRole.ADMINISTRATOR),
] as const;

const ACTIVE_TICKET_STATUSES = new Set(["New", "Open", "In Progress", "Waiting for Requester", "Reopened"]);
const TEXT_MAX = 2000;

const actionSelect = Prisma.validator<Prisma.ActionTakenSelect>()({
  id: true,
  ticketId: true,
  clientRequestId: true,
  workflowCycle: true,
  actionDateTime: true,
  description: true,
  result: true,
  followUpRequired: true,
  followUpNote: true,
  attachmentNotes: true,
  status: true,
  createdBy: { select: { id: true, name: true, role: true } },
  assignee: { select: { id: true, name: true, role: true } },
  performedBy: { select: { id: true, name: true, role: true } },
  completedAt: true,
  cancelledBy: { select: { id: true, name: true, role: true } },
  cancelledAt: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});

type ActionRow = Prisma.ActionTakenGetPayload<{ select: typeof actionSelect }>;

class TicketMissingError extends Error {}
class ActionMissingError extends Error {}
class AssigneeNotEligibleError extends Error {}
class ActionTicketNotActiveError extends Error {}
class StaleTicketStateError extends Error {}
class StaleActionError extends Error {}
class ActionNotEditableError extends Error {}
class InvalidActionTransitionError extends Error {}
class CompletionRequiresAssigneeError extends Error {}
class IdempotencyKeyReuseError extends Error {}
class ActionValidationError extends Error {
  constructor(readonly fields: Record<string, string>) {
    super("Action validation failed");
  }
}

function validationError(fields: Record<string, string>) {
  return { error: { code: "VALIDATION_ERROR", message: "Validation failed", fields } };
}

function parseResourceId(raw: string): number | null {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function serializeAction(action: ActionRow) {
  return {
    ...action,
    status: actionStatusLabel(action.status),
  };
}

function parseRequiredText(value: unknown, field: string, fields: Record<string, string>): string | null {
  if (typeof value !== "string") {
    fields[field] = `${field} is required`;
    return null;
  }
  const normalized = value.trim();
  const length = unicodeLength(normalized);
  if (!normalized) fields[field] = `${field} is required`;
  else if (length > TEXT_MAX) fields[field] = `${field} must be at most ${TEXT_MAX} characters`;
  return Object.prototype.hasOwnProperty.call(fields, field) ? null : normalized;
}

function parseOptionalBodyText(value: unknown, field: string, fields: Record<string, string>): string | null {
  const parsed = normalizeOptionalText(value, TEXT_MAX);
  if (!parsed.valid) fields[field] = `${field} must be text with at most ${TEXT_MAX} characters`;
  return parsed.value;
}

function parseFollowUp(
  requiredValue: unknown,
  noteValue: unknown,
  fields: Record<string, string>,
): { followUpRequired: boolean; followUpNote: string | null } | null {
  if (typeof requiredValue !== "boolean") {
    fields.followUpRequired = "followUpRequired must be a boolean";
    return null;
  }
  const note = parseOptionalBodyText(noteValue, "followUpNote", fields);
  if (requiredValue && !note) fields.followUpNote = "followUpNote is required when followUpRequired is true";
  return Object.keys(fields).length > 0 ? null : {
    followUpRequired: requiredValue,
    followUpNote: requiredValue ? note : null,
  };
}

function assertAllowedKeys(body: Record<string, unknown>, allowed: readonly string[], fields: Record<string, string>): void {
  const allow = new Set(allowed);
  for (const key of Object.keys(body)) {
    if (!allow.has(key)) fields[key] = `${key} is not allowed`;
  }
}

function eligibleRole(role: UserRole): boolean {
  return role === UserRole.IT_STAFF || role === UserRole.ADMINISTRATOR;
}

async function lockEligibleUsers(tx: Prisma.TransactionClient, userIds: number[]): Promise<Map<number, { id: number; role: UserRole; isActive: boolean }>> {
  const ids = Array.from(new Set(userIds)).sort((a, b) => a - b);
  if (ids.length === 0) return new Map();
  const rows = await tx.$queryRaw<Array<{ id: number; role: UserRole; isActive: boolean }>>(Prisma.sql`
    SELECT "id", "role", "isActive"
    FROM "User"
    WHERE "id" IN (${Prisma.join(ids)})
    ORDER BY "id"
    FOR UPDATE
  `);
  return new Map(rows.map((row) => [row.id, row]));
}

async function loadAction(tx: Prisma.TransactionClient, actionId: number): Promise<ActionRow> {
  return tx.actionTaken.findUniqueOrThrow({ where: { id: actionId }, select: actionSelect });
}

async function runSerializableActionTransaction<T>(
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

actionTakenRouter.get(
  "/tickets/:id/actions-taken",
  requireAuth,
  requirePasswordChanged,
  async (req, res) => {
    try {
      const ticketId = parseResourceId(req.params.id);
      if (!ticketId) {
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
      const items = await prisma.actionTaken.findMany({
        where: { ticketId },
        orderBy: [{ actionDateTime: "desc" }, { id: "desc" }],
        select: actionSelect,
      });
      res.json({ items: items.map(serializeAction) });
    } catch {
      res.status(500).json({ error: { code: "ACTIONS_TAKEN_LOAD_FAILED", message: "Unable to load Actions Taken" } });
    }
  },
);

actionTakenRouter.post(
  "/staff/tickets/:id/actions-taken",
  requireApprovedOrigin,
  ...staffOnly,
  async (req, res) => {
    const ticketId = parseResourceId(req.params.id);
    if (!ticketId) {
      res.status(404).json({ error: { message: "Ticket not found" } });
      return;
    }

    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body as Record<string, unknown> : {};
    const fields: Record<string, string> = {};
    assertAllowedKeys(body, [
      "clientRequestId", "expectedTicketVersion", "actionDateTime", "description",
      "assigneeId", "followUpRequired", "followUpNote", "attachmentNotes",
    ], fields);
    if (!isCanonicalUuid(body.clientRequestId)) fields.clientRequestId = "clientRequestId must be a UUID";
    const expectedTicketVersion = parsePositiveInteger(body.expectedTicketVersion);
    if (!expectedTicketVersion) fields.expectedTicketVersion = "expectedTicketVersion must be a positive integer";
    const actionDateTime = parseActionBusinessTime(body.actionDateTime);
    if (!actionDateTime) fields.actionDateTime = "actionDateTime must be a valid ISO date/time no later than 5 minutes in the future";
    const description = parseRequiredText(body.description, "description", fields);
    const assigneeId = parsePositiveInteger(body.assigneeId);
    if (!assigneeId) fields.assigneeId = "assigneeId must be a positive integer";
    const followUp = parseFollowUp(body.followUpRequired, body.followUpNote, fields);
    const attachmentNotes = parseOptionalBodyText(body.attachmentNotes, "attachmentNotes", fields);
    if (Object.keys(fields).length > 0) {
      res.status(400).json(validationError(fields));
      return;
    }

    const actor = res.locals.authUser!;
    const createFingerprint = createActionFingerprint({
      createdById: actor.id,
      actionDateTime: actionDateTime!,
      description: description!,
      assigneeId: assigneeId!,
      followUpRequired: followUp!.followUpRequired,
      followUpNote: followUp!.followUpNote,
      attachmentNotes,
    });
    try {
      const result = await runSerializableActionTransaction(async (tx) => {
        const existing = await tx.actionTaken.findUnique({
          where: { ticketId_clientRequestId: { ticketId, clientRequestId: body.clientRequestId as string } },
          select: {
            id: true,
            createFingerprint: true,
          },
        });
        if (existing) {
          if (existing.createFingerprint !== createFingerprint) throw new IdempotencyKeyReuseError();
          return { status: 200, action: await loadAction(tx, existing.id) };
        }

        const ticketRows = await tx.$queryRaw<Array<{ id: number; status: string; version: number; workflowCycle: number }>>(Prisma.sql`
          SELECT "id", "status", "version", "workflowCycle"
          FROM "Ticket"
          WHERE "id" = ${ticketId}
          FOR UPDATE
        `);
        const ticket = ticketRows[0];
        if (!ticket) throw new TicketMissingError();
        if (ticket.version !== expectedTicketVersion) throw new StaleTicketStateError();
        if (!ACTIVE_TICKET_STATUSES.has(ticket.status)) throw new ActionTicketNotActiveError();

        const users = await lockEligibleUsers(tx, [assigneeId!]);
        const assignee = users.get(assigneeId!);
        if (!assignee || !assignee.isActive || !eligibleRole(assignee.role)) throw new AssigneeNotEligibleError();

        const created = await tx.actionTaken.create({
          data: {
            ticketId,
            clientRequestId: body.clientRequestId as string,
            createFingerprint,
            workflowCycle: ticket.workflowCycle,
            actionDateTime: actionDateTime!,
            description: description!,
            followUpRequired: followUp!.followUpRequired,
            followUpNote: followUp!.followUpNote,
            attachmentNotes,
            createdById: actor.id,
            assigneeId: assigneeId!,
          },
          select: { id: true },
        });
        await tx.ticket.update({
          where: { id: ticketId },
          data: { version: { increment: 1 } },
          select: { id: true },
        });
        return { status: 201, action: await loadAction(tx, created.id) };
      });
      res.status(result.status).json(serializeAction(result.action));
    } catch (error) {
      if (error instanceof TicketMissingError) res.status(404).json({ error: { message: "Ticket not found" } });
      else if (error instanceof AssigneeNotEligibleError) res.status(409).json({ error: { code: "ACTION_ASSIGNEE_NOT_ELIGIBLE", message: "Selected assignee is not an active IT Staff or Administrator" } });
      else if (error instanceof ActionTicketNotActiveError) res.status(409).json({ error: { code: "ACTION_TICKET_NOT_ACTIVE", message: "Actions can be created only on active Tickets" } });
      else if (error instanceof StaleTicketStateError || isPrismaSerializationConflict(error)) res.status(409).json({ error: { code: "STALE_TICKET_STATE", message: "Ticket state changed; refresh and try again" } });
      else if (error instanceof IdempotencyKeyReuseError) res.status(409).json({ error: { code: "IDEMPOTENCY_KEY_REUSE", message: "clientRequestId was already used with different Action data" } });
      else res.status(500).json({ error: { code: "ACTION_CREATE_FAILED", message: "Unable to create Action Taken" } });
    }
  },
);

actionTakenRouter.patch(
  "/staff/actions-taken/:id",
  requireApprovedOrigin,
  ...staffOnly,
  async (req, res) => {
    const actionId = parseResourceId(req.params.id);
    if (!actionId) {
      res.status(404).json({ error: { message: "Action Taken not found" } });
      return;
    }
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body as Record<string, unknown> : {};
    const fields: Record<string, string> = {};
    const editableKeys = ["actionDateTime", "description", "assigneeId", "followUpRequired", "followUpNote", "attachmentNotes"] as const;
    assertAllowedKeys(body, ["expectedVersion", "expectedTicketVersion", ...editableKeys], fields);
    const expectedVersion = parsePositiveInteger(body.expectedVersion);
    const expectedTicketVersion = parsePositiveInteger(body.expectedTicketVersion);
    if (!expectedVersion) fields.expectedVersion = "expectedVersion must be a positive integer";
    if (!expectedTicketVersion) fields.expectedTicketVersion = "expectedTicketVersion must be a positive integer";
    if (!editableKeys.some((key) => Object.prototype.hasOwnProperty.call(body, key))) fields.action = "At least one editable field is required";

    let actionDateTime: Date | undefined;
    let description: string | undefined;
    let assigneeId: number | undefined;
    let attachmentNotes: string | null | undefined;
    if (Object.prototype.hasOwnProperty.call(body, "actionDateTime")) {
      const parsed = parseActionBusinessTime(body.actionDateTime);
      if (!parsed) fields.actionDateTime = "actionDateTime must be a valid ISO date/time no later than 5 minutes in the future";
      else actionDateTime = parsed;
    }
    if (Object.prototype.hasOwnProperty.call(body, "description")) description = parseRequiredText(body.description, "description", fields) ?? undefined;
    if (Object.prototype.hasOwnProperty.call(body, "assigneeId")) {
      const parsed = parsePositiveInteger(body.assigneeId);
      if (!parsed) fields.assigneeId = "assigneeId must be a positive integer";
      else assigneeId = parsed;
    }
    if (Object.prototype.hasOwnProperty.call(body, "followUpRequired") && typeof body.followUpRequired !== "boolean") {
      fields.followUpRequired = "followUpRequired must be a boolean";
    }
    if (Object.prototype.hasOwnProperty.call(body, "followUpNote") && body.followUpNote !== null && typeof body.followUpNote !== "string") {
      fields.followUpNote = "followUpNote must be text or null";
    }
    if (Object.prototype.hasOwnProperty.call(body, "attachmentNotes")) attachmentNotes = parseOptionalBodyText(body.attachmentNotes, "attachmentNotes", fields);
    if (Object.keys(fields).length > 0) {
      res.status(400).json(validationError(fields));
      return;
    }

    try {
      const updated = await runSerializableActionTransaction(async (tx) => {
        const initial = await tx.actionTaken.findUnique({ where: { id: actionId }, select: { ticketId: true } });
        if (!initial) throw new ActionMissingError();
        const ticketRows = await tx.$queryRaw<Array<{ id: number; version: number }>>(Prisma.sql`
          SELECT "id", "version" FROM "Ticket" WHERE "id" = ${initial.ticketId} FOR UPDATE
        `);
        const ticket = ticketRows[0];
        if (!ticket) throw new ActionMissingError();
        if (ticket.version !== expectedTicketVersion) throw new StaleTicketStateError();

        const actionRows = await tx.$queryRaw<Array<{
          id: number; ticketId: number; status: ActionTakenStatus; version: number; assigneeId: number;
          followUpRequired: boolean; followUpNote: string | null;
        }>>(Prisma.sql`
          SELECT "id", "ticketId", "status", "version", "assigneeId", "followUpRequired", "followUpNote"
          FROM "ActionTaken" WHERE "id" = ${actionId} FOR UPDATE
        `);
        const current = actionRows[0];
        if (!current) throw new ActionMissingError();
        if (current.version !== expectedVersion) throw new StaleActionError();
        if (!isActiveActionStatus(current.status)) throw new ActionNotEditableError();

        const resultingFollowUpRequired = Object.prototype.hasOwnProperty.call(body, "followUpRequired")
          ? body.followUpRequired as boolean
          : current.followUpRequired;
        let resultingFollowUpNote = current.followUpNote;
        if (Object.prototype.hasOwnProperty.call(body, "followUpNote")) {
          const parsed = normalizeOptionalText(body.followUpNote, TEXT_MAX);
          if (!parsed.valid) throw new ActionValidationError({ followUpNote: `followUpNote must be at most ${TEXT_MAX} characters` });
          resultingFollowUpNote = parsed.value;
        }
        if (resultingFollowUpRequired && !resultingFollowUpNote) {
          throw new ActionValidationError({ followUpNote: "followUpNote is required when followUpRequired is true" });
        }
        if (!resultingFollowUpRequired) resultingFollowUpNote = null;

        const targetAssigneeId = assigneeId ?? current.assigneeId;
        if (assigneeId !== undefined) {
          const users = await lockEligibleUsers(tx, [current.assigneeId, targetAssigneeId]);
          const target = users.get(targetAssigneeId);
          if (!target || !target.isActive || !eligibleRole(target.role)) throw new AssigneeNotEligibleError();
        }

        await tx.actionTaken.update({
          where: { id: actionId },
          data: {
            ...(actionDateTime !== undefined ? { actionDateTime } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(assigneeId !== undefined ? { assigneeId } : {}),
            followUpRequired: resultingFollowUpRequired,
            followUpNote: resultingFollowUpNote,
            ...(attachmentNotes !== undefined ? { attachmentNotes } : {}),
            version: { increment: 1 },
          },
          select: { id: true },
        });
        await tx.ticket.update({ where: { id: current.ticketId }, data: { version: { increment: 1 } }, select: { id: true } });
        return loadAction(tx, actionId);
      });
      res.json(serializeAction(updated));
    } catch (error) {
      if (error instanceof ActionMissingError) res.status(404).json({ error: { message: "Action Taken not found" } });
      else if (error instanceof ActionValidationError) res.status(400).json(validationError(error.fields));
      else if (error instanceof AssigneeNotEligibleError) res.status(409).json({ error: { code: "ACTION_ASSIGNEE_NOT_ELIGIBLE", message: "Selected assignee is not an active IT Staff or Administrator" } });
      else if (error instanceof ActionNotEditableError) res.status(409).json({ error: { code: "ACTION_NOT_EDITABLE", message: "Terminal Actions cannot be edited" } });
      else if (error instanceof StaleActionError) res.status(409).json({ error: { code: "STALE_ACTION_TAKEN", message: "Action Taken changed; refresh and try again" } });
      else if (error instanceof StaleTicketStateError || isPrismaSerializationConflict(error)) res.status(409).json({ error: { code: "STALE_TICKET_STATE", message: "Ticket state changed; refresh and try again" } });
      else res.status(500).json({ error: { code: "ACTION_UPDATE_FAILED", message: "Unable to update Action Taken" } });
    }
  },
);

actionTakenRouter.patch(
  "/staff/actions-taken/:id/status",
  requireApprovedOrigin,
  ...staffOnly,
  async (req, res) => {
    const actionId = parseResourceId(req.params.id);
    if (!actionId) {
      res.status(404).json({ error: { message: "Action Taken not found" } });
      return;
    }
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body as Record<string, unknown> : {};
    const fields: Record<string, string> = {};
    assertAllowedKeys(body, ["status", "expectedVersion", "expectedTicketVersion", "result", "followUpRequired", "followUpNote"], fields);
    const targetStatus = parseActionStatusLabel(body.status);
    if (!targetStatus) fields.status = "status must be Planned, In Progress, Completed, or Cancelled";
    const expectedVersion = parsePositiveInteger(body.expectedVersion);
    const expectedTicketVersion = parsePositiveInteger(body.expectedTicketVersion);
    if (!expectedVersion) fields.expectedVersion = "expectedVersion must be a positive integer";
    if (!expectedTicketVersion) fields.expectedTicketVersion = "expectedTicketVersion must be a positive integer";

    let result: string | null | undefined;
    let completedFollowUp: { followUpRequired: boolean; followUpNote: string | null } | undefined;
    if (targetStatus === ActionTakenStatus.COMPLETED) {
      if (Object.prototype.hasOwnProperty.call(body, "result")) {
        result = parseRequiredText(body.result, "result", fields);
      }
      if (Object.prototype.hasOwnProperty.call(body, "followUpRequired") || Object.prototype.hasOwnProperty.call(body, "followUpNote")) {
        completedFollowUp = parseFollowUp(body.followUpRequired, body.followUpNote, fields) ?? undefined;
      }
    } else {
      for (const key of ["result", "followUpRequired", "followUpNote"]) {
        if (Object.prototype.hasOwnProperty.call(body, key)) fields[key] = `${key} is allowed only when completing an Action`;
      }
    }
    if (Object.keys(fields).length > 0) {
      res.status(400).json(validationError(fields));
      return;
    }

    const actor = res.locals.authUser!;
    try {
      const updated = await runSerializableActionTransaction(async (tx) => {
        const initial = await tx.actionTaken.findUnique({ where: { id: actionId }, select: { ticketId: true } });
        if (!initial) throw new ActionMissingError();
        const ticketRows = await tx.$queryRaw<Array<{ id: number; version: number }>>(Prisma.sql`
          SELECT "id", "version" FROM "Ticket" WHERE "id" = ${initial.ticketId} FOR UPDATE
        `);
        const ticket = ticketRows[0];
        if (!ticket) throw new ActionMissingError();
        if (ticket.version !== expectedTicketVersion) throw new StaleTicketStateError();

        const actionRows = await tx.$queryRaw<Array<{
          id: number; ticketId: number; status: ActionTakenStatus; version: number; assigneeId: number;
        }>>(Prisma.sql`
          SELECT "id", "ticketId", "status", "version", "assigneeId"
          FROM "ActionTaken" WHERE "id" = ${actionId} FOR UPDATE
        `);
        const current = actionRows[0];
        if (!current) throw new ActionMissingError();
        if (current.version !== expectedVersion) throw new StaleActionError();
        if (!isAllowedActionTransition(current.status, targetStatus!)) throw new InvalidActionTransitionError();

        const data: Prisma.ActionTakenUpdateInput = {
          status: targetStatus!,
          version: { increment: 1 },
        };
        if (targetStatus === ActionTakenStatus.COMPLETED) {
          if (actor.id !== current.assigneeId) throw new CompletionRequiresAssigneeError();
          const completionFields: Record<string, string> = {};
          if (result === undefined || result === null) completionFields.result = "result is required";
          if (!completedFollowUp) completionFields.followUpRequired = "followUpRequired must be provided when completing an Action";
          if (Object.keys(completionFields).length > 0) throw new ActionValidationError(completionFields);
          const completionFollowUp = completedFollowUp!;
          const users = await lockEligibleUsers(tx, [current.assigneeId]);
          const assignee = users.get(current.assigneeId);
          if (!assignee || !assignee.isActive || !eligibleRole(assignee.role)) throw new AssigneeNotEligibleError();
          data.result = result;
          data.followUpRequired = completionFollowUp.followUpRequired;
          data.followUpNote = completionFollowUp.followUpNote;
          data.performedBy = { connect: { id: actor.id } };
          data.completedAt = new Date();
        } else if (targetStatus === ActionTakenStatus.CANCELLED) {
          data.cancelledBy = { connect: { id: actor.id } };
          data.cancelledAt = new Date();
        }

        await tx.actionTaken.update({ where: { id: actionId }, data, select: { id: true } });
        await tx.ticket.update({ where: { id: current.ticketId }, data: { version: { increment: 1 } }, select: { id: true } });
        return loadAction(tx, actionId);
      });
      res.json(serializeAction(updated));
    } catch (error) {
      if (error instanceof ActionMissingError) res.status(404).json({ error: { message: "Action Taken not found" } });
      else if (error instanceof ActionValidationError) res.status(400).json(validationError(error.fields));
      else if (error instanceof InvalidActionTransitionError) res.status(409).json({ error: { code: "INVALID_ACTION_STATUS_TRANSITION", message: "Action status transition is not allowed" } });
      else if (error instanceof CompletionRequiresAssigneeError) res.status(409).json({ error: { code: "ACTION_COMPLETION_REQUIRES_ASSIGNEE", message: "Only the current assignee may complete this Action" } });
      else if (error instanceof AssigneeNotEligibleError) res.status(409).json({ error: { code: "ACTION_ASSIGNEE_NOT_ELIGIBLE", message: "Current assignee is no longer eligible" } });
      else if (error instanceof StaleActionError) res.status(409).json({ error: { code: "STALE_ACTION_TAKEN", message: "Action Taken changed; refresh and try again" } });
      else if (error instanceof StaleTicketStateError || isPrismaSerializationConflict(error)) res.status(409).json({ error: { code: "STALE_TICKET_STATE", message: "Ticket state changed; refresh and try again" } });
      else res.status(500).json({ error: { code: "ACTION_STATUS_UPDATE_FAILED", message: "Unable to update Action status" } });
    }
  },
);
