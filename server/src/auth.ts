import crypto from "node:crypto";
import { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { getPrisma } from "./prisma.js";

export const SESSION_COOKIE_NAME = "toktickit_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

function useSecureSessionCookie(): boolean {
  // Local HTTP development is the only intended non-Secure case. Production
  // remains Secure even if CLIENT_ORIGIN was accidentally left on http://.
  return process.env.NODE_ENV === "production" || CLIENT_ORIGIN.startsWith("https://");
}

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
};

declare global {
  namespace Express {
    interface Locals {
      authUser?: AuthUser;
      authSessionId?: string;
    }
  }
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function newSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function readCookie(req: Request, name: string): string | null {
  const header = req.header("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    const raw = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

export function getSessionTokenFromRequest(req: Request): string | null {
  return readCookie(req, SESSION_COOKIE_NAME);
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureSessionCookie(),
    path: "/",
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureSessionCookie(),
    path: "/",
  });
}

export function requireApprovedOrigin(req: Request, res: Response, next: NextFunction): void {
  const origin = req.header("origin");
  if (!origin || origin === "null" || origin !== CLIENT_ORIGIN) {
    res.status(403).json({
      error: { code: "ORIGIN_FORBIDDEN", message: "Request origin is not allowed" },
    });
    return;
  }
  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = getSessionTokenFromRequest(req);
    if (!token) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication required" } });
      return;
    }

    const prisma = getPrisma();
    const tokenHash = hashSessionToken(token);
    const session = await prisma.authSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            mustChangePassword: true,
          },
        },
      },
    });

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      if (session) await prisma.authSession.deleteMany({ where: { id: session.id } });
      clearSessionCookie(res);
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication required" } });
      return;
    }

    if (!session.user.isActive) {
      await prisma.authSession.deleteMany({ where: { userId: session.user.id } });
      clearSessionCookie(res);
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication required" } });
      return;
    }

    res.locals.authUser = session.user;
    res.locals.authSessionId = session.id;
    next();
  } catch {
    res.status(500).json({ error: { code: "AUTHENTICATION_FAILED", message: "Unable to verify authentication" } });
  }
}

export function requirePasswordChanged(_req: Request, res: Response, next: NextFunction): void {
  if (res.locals.authUser?.mustChangePassword) {
    res.status(403).json({
      error: { code: "PASSWORD_CHANGE_REQUIRED", message: "Password change required" },
    });
    return;
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const user = res.locals.authUser;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Operation not permitted" } });
      return;
    }
    next();
  };
}
