import { Router } from "express";
import { Prisma, UserRole } from "@prisma/client";
import {
  normalizeEmail,
  requireApprovedOrigin,
  requireAuth,
  requirePasswordChanged,
  requireRole,
} from "./auth.js";
import { hashPassword, validatePassword } from "./password.js";
import { getPrisma } from "./prisma.js";
import {
  isEligibleTicketOwnerState,
  removesActiveAdministrator,
  wouldLeaveZeroActiveAdministrators,
} from "./adminUserOperations.js";
import { isPrismaSerializationConflict } from "./prismaErrors.js";

export const adminUserRouter = Router();

const adminOnly = [
  requireAuth,
  requirePasswordChanged,
  requireRole(UserRole.ADMINISTRATOR),
] as const;

const safeUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
});

const USER_ROLES = new Set<UserRole>([
  UserRole.REQUESTER,
  UserRole.IT_STAFF,
  UserRole.ADMINISTRATOR,
]);

// Serializes Administrator account-safety decisions with each other. Ticket
// assignment/reassignment uses a row lock on the affected owner user, while
// Administrator eligibility mutations below take the same user-row lock. The
// advisory lock additionally prevents two simultaneous Admin changes from
// both deciding that they may remove the final active Administrator.
const ADMIN_USER_MUTATION_LOCK = 3_800_038;

class UserMissingError extends Error {}
class SelfDeactivationError extends Error {}
class LastActiveAdminError extends Error {}
class AssignedTicketsError extends Error {}

function validationError(fields: Record<string, string>) {
  return { error: { code: "VALIDATION_ERROR", message: "Validation failed", fields } };
}

function parseUserId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseName(value: unknown, fields: Record<string, string>): string | null {
  if (typeof value !== "string") {
    fields.name = "Name is required";
    return null;
  }
  const name = value.trim();
  const length = Array.from(name).length;
  if (length < 1 || length > 100) {
    fields.name = "Name must be between 1 and 100 characters";
    return null;
  }
  return name;
}

function parseEmail(value: unknown, fields: Record<string, string>): string | null {
  if (typeof value !== "string") {
    fields.email = "A valid email is required";
    return null;
  }
  const email = normalizeEmail(value);
  if (!email || !isValidEmail(email)) {
    fields.email = "A valid email is required";
    return null;
  }
  return email;
}

function parseRole(value: unknown, fields: Record<string, string>): UserRole | null {
  if (typeof value !== "string" || !USER_ROLES.has(value as UserRole)) {
    fields.role = "Role must be REQUESTER, IT_STAFF, or ADMINISTRATOR";
    return null;
  }
  return value as UserRole;
}

function isUniqueEmailConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

adminUserRouter.get("/users", ...adminOnly, async (req, res) => {
  try {
    const fields: Record<string, string> = {};
    let search: string | undefined;
    let role: UserRole | undefined;

    if (req.query.search !== undefined) {
      if (typeof req.query.search !== "string") {
        fields.search = "search must appear at most once";
      } else {
        const normalizedSearch = req.query.search.trim();
        if (normalizedSearch.length > 100) fields.search = "search must be at most 100 characters";
        else if (normalizedSearch) search = normalizedSearch;
      }
    }

    if (req.query.role !== undefined) {
      if (typeof req.query.role !== "string" || !USER_ROLES.has(req.query.role as UserRole)) {
        fields.role = "role must be REQUESTER, IT_STAFF, or ADMINISTRATOR";
      } else {
        role = req.query.role as UserRole;
      }
    }

    if (Object.keys(fields).length > 0) {
      res.status(400).json(validationError(fields));
      return;
    }

    const items = await getPrisma().user.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        } : {}),
      },
      select: safeUserSelect,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    res.json({ items });
  } catch {
    res.status(500).json({ error: { code: "USER_LIST_FAILED", message: "Unable to load users" } });
  }
});

adminUserRouter.post("/users", requireApprovedOrigin, ...adminOnly, async (req, res) => {
  const fields: Record<string, string> = {};
  const name = parseName(req.body?.name, fields);
  const email = parseEmail(req.body?.email, fields);
  const role = parseRole(req.body?.role, fields);
  const isActive = req.body?.isActive;
  if (typeof isActive !== "boolean") fields.isActive = "isActive must be a boolean";
  const passwordPolicy = validatePassword(req.body?.initialPassword);
  if (!passwordPolicy.valid) fields.initialPassword = passwordPolicy.message!;
  if (Object.keys(fields).length > 0) {
    res.status(400).json(validationError(fields));
    return;
  }

  try {
    const passwordHash = await hashPassword(req.body.initialPassword);
    const created = await getPrisma().user.create({
      data: {
        name: name!,
        email: email!,
        role: role!,
        isActive,
        passwordHash,
        mustChangePassword: true,
      },
      select: safeUserSelect,
    });
    res.status(201).json(created);
  } catch (error) {
    if (isUniqueEmailConflict(error)) {
      res.status(409).json({ error: { code: "DUPLICATE_EMAIL", message: "A user with this email already exists" } });
      return;
    }
    res.status(500).json({ error: { code: "USER_CREATE_FAILED", message: "Unable to create user" } });
  }
});

adminUserRouter.patch("/users/:id", requireApprovedOrigin, ...adminOnly, async (req, res) => {
  const userId = parseUserId(req.params.id);
  if (!userId) {
    res.status(404).json({ error: { message: "User not found" } });
    return;
  }

  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const allowedKeys = new Set(["name", "email", "role", "isActive"]);
  const suppliedKeys = Object.keys(body);
  const fields: Record<string, string> = {};
  for (const key of suppliedKeys) {
    if (!allowedKeys.has(key)) fields[key] = `${key} is not editable`;
  }
  if (!suppliedKeys.some((key) => allowedKeys.has(key))) {
    fields.user = "At least one editable field is required";
  }

  let name: string | undefined;
  let email: string | undefined;
  let role: UserRole | undefined;
  let isActive: boolean | undefined;
  if (Object.prototype.hasOwnProperty.call(body, "name")) name = parseName(body.name, fields) ?? undefined;
  if (Object.prototype.hasOwnProperty.call(body, "email")) email = parseEmail(body.email, fields) ?? undefined;
  if (Object.prototype.hasOwnProperty.call(body, "role")) role = parseRole(body.role, fields) ?? undefined;
  if (Object.prototype.hasOwnProperty.call(body, "isActive")) {
    if (typeof body.isActive !== "boolean") fields.isActive = "isActive must be a boolean";
    else isActive = body.isActive;
  }
  if (Object.keys(fields).length > 0) {
    res.status(400).json(validationError(fields));
    return;
  }

  try {
    const actor = res.locals.authUser!;
    const prisma = getPrisma();
    const updated = await prisma.$transaction(async (tx) => {
      // Keep the PostgreSQL advisory lock result out of Prisma's result set:
      // pg_advisory_xact_lock returns SQL `void`, which Prisma cannot decode.
      // The subquery still executes the lock while the outer query returns a
      // normal integer value.
      await tx.$queryRaw<Array<{ locked: number }>>(Prisma.sql`
        SELECT 1 AS "locked"
        FROM (SELECT pg_advisory_xact_lock(${ADMIN_USER_MUTATION_LOCK})) AS acquired
      `);

      const rows = await tx.$queryRaw<Array<{
        id: number;
        role: UserRole;
        isActive: boolean;
      }>>(Prisma.sql`
        SELECT "id", "role", "isActive"
        FROM "User"
        WHERE "id" = ${userId}
        FOR UPDATE
      `);
      const current = rows[0];
      if (!current) throw new UserMissingError();

      const nextRole = role ?? current.role;
      const nextActive = isActive ?? current.isActive;

      if (actor.id === userId && isActive === false) throw new SelfDeactivationError();

      const removesActiveAdmin = removesActiveAdministrator(
        current.role,
        current.isActive,
        nextRole,
        nextActive,
      );
      if (removesActiveAdmin) {
        const activeAdmins = await tx.user.count({
          where: { role: UserRole.ADMINISTRATOR, isActive: true },
        });
        if (wouldLeaveZeroActiveAdministrators(
          current.role,
          current.isActive,
          nextRole,
          nextActive,
          activeAdmins,
        )) throw new LastActiveAdminError();
      }

      const remainsEligibleOwner = isEligibleTicketOwnerState(nextRole, nextActive);
      if (!remainsEligibleOwner) {
        const ownedTickets = await tx.ticket.count({ where: { ownerId: userId } });
        if (ownedTickets > 0) throw new AssignedTicketsError();
      }

      const saved = await tx.user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(role !== undefined ? { role } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
        select: safeUserSelect,
      });

      if (isActive === false) {
        await tx.authSession.deleteMany({ where: { userId } });
      }
      return saved;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 10_000,
    });
    res.json(updated);
  } catch (error) {
    if (error instanceof UserMissingError) {
      res.status(404).json({ error: { message: "User not found" } });
      return;
    }
    if (error instanceof SelfDeactivationError) {
      res.status(409).json({ error: { code: "SELF_DEACTIVATION_FORBIDDEN", message: "You cannot deactivate your own account" } });
      return;
    }
    if (error instanceof LastActiveAdminError) {
      res.status(409).json({ error: { code: "LAST_ACTIVE_ADMIN_REQUIRED", message: "At least one active Administrator is required" } });
      return;
    }
    if (error instanceof AssignedTicketsError) {
      res.status(409).json({
        error: { code: "ASSIGNED_TICKETS_REQUIRE_REASSIGNMENT", message: "Reassign owned Tickets before changing this user's eligibility" },
      });
      return;
    }
    if (isUniqueEmailConflict(error)) {
      res.status(409).json({ error: { code: "DUPLICATE_EMAIL", message: "A user with this email already exists" } });
      return;
    }
    if (isPrismaSerializationConflict(error)) {
      res.status(409).json({ error: { code: "STALE_USER_STATE", message: "User state changed; refresh and try again" } });
      return;
    }
    res.status(500).json({ error: { code: "USER_UPDATE_FAILED", message: "Unable to update user" } });
  }
});

adminUserRouter.post("/users/:id/initial-password", requireApprovedOrigin, ...adminOnly, async (req, res) => {
  const userId = parseUserId(req.params.id);
  if (!userId) {
    res.status(404).json({ error: { message: "User not found" } });
    return;
  }

  const initialPassword = req.body?.initialPassword;
  const confirmPassword = req.body?.confirmPassword;
  const fields: Record<string, string> = {};
  const policy = validatePassword(initialPassword);
  if (!policy.valid) fields.initialPassword = policy.message!;
  if (typeof confirmPassword !== "string" || initialPassword !== confirmPassword) {
    fields.confirmPassword = "Passwords do not match";
  }
  if (Object.keys(fields).length > 0) {
    res.status(400).json(validationError(fields));
    return;
  }

  try {
    const prisma = getPrisma();
    const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!exists) {
      res.status(404).json({ error: { message: "User not found" } });
      return;
    }
    const passwordHash = await hashPassword(initialPassword);
    const result = await prisma.$transaction(async (tx) => {
      const saved = await tx.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePassword: true },
        select: { id: true, mustChangePassword: true },
      });
      await tx.authSession.deleteMany({ where: { userId } });
      return saved;
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: { code: "INITIAL_PASSWORD_UPDATE_FAILED", message: "Unable to set initial password" } });
  }
});
