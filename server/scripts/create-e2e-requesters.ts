import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "../src/password.js";

function requireSafeE2eTarget(): { initialPassword: string; suffix: string } {
  if (process.env.E2E_FIXTURE_CREATE_ALLOWED !== "1") {
    throw new Error("E2E_FIXTURE_CREATE_ALLOWED=1 is required before creating E2E fixtures");
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E fixture creation");

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL");
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use postgres:// or postgresql://");
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (!/(^|[_-])e2e($|[_-])/i.test(databaseName)) {
    throw new Error(`Refusing fixture creation for non-E2E database "${databaseName}"`);
  }

  const initialPassword = process.env.E2E_REQUESTER_INITIAL_PASSWORD;
  if (!initialPassword) throw new Error("E2E_REQUESTER_INITIAL_PASSWORD is required");

  const suffix = process.env.E2E_USER_SUFFIX?.trim();
  if (!suffix || !/^[A-Za-z0-9-]+$/.test(suffix)) {
    throw new Error("E2E_USER_SUFFIX must contain only letters, numbers, and hyphens");
  }
  return { initialPassword, suffix };
}

async function main() {
  const { initialPassword, suffix } = requireSafeE2eTarget();
  const prisma = new PrismaClient();
  try {
    const passwordHash = await hashPassword(initialPassword);
    const fixtures = [
      { name: "E2E Requester One", email: `e2e.requester.one.${suffix}@toktick.it`, role: UserRole.REQUESTER, isActive: true, mustChangePassword: true },
      { name: "E2E Requester Two", email: `e2e.requester.two.${suffix}@toktick.it`, role: UserRole.REQUESTER, isActive: true, mustChangePassword: true },
      { name: "E2E Staff One", email: `e2e.staff.one.${suffix}@toktick.it`, role: UserRole.IT_STAFF, isActive: true, mustChangePassword: true },
      { name: "E2E Staff Two", email: `e2e.staff.two.${suffix}@toktick.it`, role: UserRole.IT_STAFF, isActive: true, mustChangePassword: false },
      { name: "E2E Administrator", email: `e2e.admin.${suffix}@toktick.it`, role: UserRole.ADMINISTRATOR, isActive: true, mustChangePassword: true },
      { name: "E2E Inactive User", email: `e2e.inactive.${suffix}@toktick.it`, role: UserRole.REQUESTER, isActive: false, mustChangePassword: false },
    ];

    for (const fixture of fixtures) {
      await prisma.user.create({
        data: {
          ...fixture,
          passwordHash,
        },
      });
    }

    console.log(fixtures.map((fixture) => fixture.email).join("\n"));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
