import { Router } from "express";
import crypto from "node:crypto";
import { getPrisma } from "./prisma.js";
import {
  clearSessionCookie,
  getSessionTokenFromRequest,
  hashSessionToken,
  newSessionToken,
  normalizeEmail,
  requireApprovedOrigin,
  requireAuth,
  SESSION_TTL_MS,
  setSessionCookie,
} from "./auth.js";
import { hashPassword, utf8ByteLength, validatePassword, verifyPassword } from "./password.js";

export const authRouter = Router();

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_FAILURE_LIMIT = 5;
const failures = new Map<string, { count: number; firstFailureAt: number }>();

// Valid bcrypt hash used only to make unknown-email verification follow the
// same expensive comparison path. Authentication never succeeds without User.
const DUMMY_BCRYPT_HASH = [
  "$2b$12$jPyEOo93eF0y",
  "jON0vYlwkO9lC5xqMKEeUib0vr7cksi3itPfoiREW",
].join("");

function safeUser(user: {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}

function rateState(email: string, now = Date.now()) {
  const state = failures.get(email);
  if (!state) return null;
  if (now - state.firstFailureAt >= LOGIN_WINDOW_MS) {
    failures.delete(email);
    return null;
  }
  return state;
}

function recordFailure(email: string, now = Date.now()): void {
  const state = rateState(email, now);
  if (!state) {
    failures.set(email, { count: 1, firstFailureAt: now });
    return;
  }
  state.count += 1;
}

export function resetLoginRateLimitsForTests(): void {
  failures.clear();
}

function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

authRouter.post("/login", requireApprovedOrigin, async (req, res) => {
  try {
    const emailInput = typeof req.body?.email === "string" ? req.body.email : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const email = normalizeEmail(emailInput);
    const fields: Record<string, string> = {};
    if (!email || !isValidEmail(email)) fields.email = "A valid email is required";
    if (!password) fields.password = "Password is required";
    else if (utf8ByteLength(password) > 72) fields.password = "Password must be at most 72 UTF-8 bytes";
    if (Object.keys(fields).length) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Validation failed", fields } });
      return;
    }

    const state = rateState(email);
    if (state && state.count >= LOGIN_FAILURE_LIMIT) {
      res.status(429).json({ error: { code: "LOGIN_RATE_LIMITED", message: "Too many login attempts. Try again later." } });
      return;
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email } });
    const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_BCRYPT_HASH);
    if (!user || !passwordMatches) {
      recordFailure(email);
      res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ error: { code: "ACCOUNT_INACTIVE", message: "This account cannot sign in" } });
      return;
    }

    failures.delete(email);
    const rawToken = newSessionToken();
    await prisma.authSession.create({
      data: {
        tokenHash: hashSessionToken(rawToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });
    setSessionCookie(res, rawToken);
    res.json({
      user: safeUser(user),
      nextAction: user.mustChangePassword ? "CHANGE_PASSWORD" : "APPLICATION",
    });
  } catch {
    res.status(500).json({ error: { code: "AUTHENTICATION_FAILED", message: "Unable to sign in" } });
  }
});

authRouter.post("/logout", requireApprovedOrigin, async (req, res) => {
  try {
    const token = getSessionTokenFromRequest(req);
    if (token) {
      await getPrisma().authSession.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
    }
    clearSessionCookie(res);
    res.status(204).end();
  } catch {
    res.status(500).json({ error: { code: "LOGOUT_FAILED", message: "Unable to sign out" } });
  }
});

authRouter.get("/me", requireAuth, (_req, res) => {
  res.json(safeUser(res.locals.authUser!));
});

authRouter.post("/change-password", requireApprovedOrigin, requireAuth, async (req, res) => {
  try {
    const user = res.locals.authUser!;
    const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
    const confirmPassword = typeof req.body?.confirmPassword === "string" ? req.body.confirmPassword : "";

    const fields: Record<string, string> = {};
    if (!currentPassword) fields.currentPassword = "Current password is required";
    const policy = validatePassword(newPassword);
    if (!policy.valid) fields.newPassword = policy.message!;
    if (newPassword !== confirmPassword) fields.confirmPassword = "Passwords do not match";
    if (Object.keys(fields).length) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Validation failed", fields } });
      return;
    }

    const prisma = getPrisma();
    const credential = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    if (!credential || !(await verifyPassword(currentPassword, credential.passwordHash))) {
      res.status(401).json({ error: { code: "INVALID_CURRENT_PASSWORD", message: "Current password is incorrect" } });
      return;
    }
    if (await verifyPassword(newPassword, credential.passwordHash)) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Validation failed", fields: { newPassword: "New password must differ from current password" } },
      });
      return;
    }

    const passwordHash = await hashPassword(newPassword);
    const rawToken = newSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false },
      });
      await tx.authSession.deleteMany({ where: { userId: user.id } });
      await tx.authSession.create({ data: { tokenHash, userId: user.id, expiresAt } });
      return saved;
    });

    setSessionCookie(res, rawToken);
    res.json({ user: safeUser(updated) });
  } catch {
    res.status(500).json({ error: { code: "PASSWORD_CHANGE_FAILED", message: "Unable to change password" } });
  }
});
