import { PrismaClient } from "@prisma/client";
import { configureTestDatabaseEnvironment, isTestDatabaseProcess } from "./testDatabaseGuard.js";

// Lazy singleton: the client is created on first use, not at import time.
// This keeps route modules and tests that don't touch the DB (e.g. /api/health)
// free of database side effects.
let client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!client) {
    // Vitest and seed processes used by tests must never fall back to the normal
    // development DATABASE_URL. The guard runs before Prisma opens a connection.
    if (isTestDatabaseProcess()) configureTestDatabaseEnvironment(process.env);
    client = new PrismaClient();
  }
  return client;
}
