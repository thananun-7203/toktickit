import crypto from "node:crypto";
import { UserRole } from "@prisma/client";
import { getPrisma } from "../../src/prisma.js";
import {
  CLIENT_ORIGIN,
  hashSessionToken,
  newSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
} from "../../src/auth.js";
import { hashPassword } from "../../src/password.js";

export const TEST_ORIGIN = CLIENT_ORIGIN;
export const DEFAULT_TEST_PASSWORD = ["Test", "Pass123"].join("");

export async function createTestUser(options: {
  role?: UserRole;
  isActive?: boolean;
  mustChangePassword?: boolean;
  password?: string;
  email?: string;
  name?: string;
} = {}) {
  const suffix = crypto.randomUUID().slice(0, 12);
  return getPrisma().user.create({
    data: {
      name: options.name ?? `Test User ${suffix}`,
      email: options.email ?? `test-${suffix}@toktick.it`,
      role: options.role ?? UserRole.REQUESTER,
      isActive: options.isActive ?? true,
      mustChangePassword: options.mustChangePassword ?? false,
      passwordHash: await hashPassword(options.password ?? DEFAULT_TEST_PASSWORD),
    },
  });
}

export async function createSessionCookie(
  userId: number,
  options: { expiresAt?: Date; token?: string } = {},
): Promise<{ cookie: string; token: string; sessionId: string }> {
  const token = options.token ?? newSessionToken();
  const session = await getPrisma().authSession.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt: options.expiresAt ?? new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return {
    cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    token,
    sessionId: session.id,
  };
}

export async function cleanupTestUsers(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const prisma = getPrisma();
  await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
