import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { verifyPassword } from "../../src/password.js";

type UserSnapshot = {
  id: number;
  passwordHash: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
};

type TicketSnapshot = {
  id: number;
  status: string;
  ownerId: number | null;
  itPriority: string | null;
};

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let userRestore: UserSnapshot | null = null;
let ticketRestore: TicketSnapshot | null = null;

function runSeed(): void {
  const tsxCli = path.join(serverDir, "node_modules", "tsx", "dist", "cli.mjs");
  const result = spawnSync(process.execPath, [tsxCli, "prisma/seed.ts"], {
    cwd: serverDir,
    env: process.env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`seed failed: ${result.error?.message ?? "unknown process error"}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  }
}

afterEach(async () => {
  const prisma = getPrisma();
  if (userRestore) {
    await prisma.user.update({
      where: { id: userRestore.id },
      data: {
        passwordHash: userRestore.passwordHash,
        role: userRestore.role,
        isActive: userRestore.isActive,
      },
    });
    userRestore = null;
  }
  if (ticketRestore) {
    await prisma.ticket.update({
      where: { id: ticketRestore.id },
      data: {
        status: ticketRestore.status,
        ownerId: ticketRestore.ownerId,
        itPriority: ticketRestore.itPriority,
      },
    });
    ticketRestore = null;
  }
});

describe("Lab 3 seed regression", () => {
  it("MIG-07/MIG-08/MIG-09: repeated seed keeps stable rows and required demo coverage", async () => {
    runSeed();
    const prisma = getPrisma();
    const seedEmails = [
      "somchai@toktick.it",
      "somsri@toktick.it",
      "anan@toktick.it",
      "preecha@toktick.it",
      "noppadol@toktick.it",
      "narin.staff@toktick.it",
      "malee.staff@toktick.it",
      "krit.staff@toktick.it",
      "inactive.staff@toktick.it",
      "admin.one@toktick.it",
      "admin.two@toktick.it",
    ];
    const demoTicketNumbers = ["TKT-2025-90001", "TKT-2025-90002", "TKT-2025-90003"];
    const before = {
      categories: await prisma.category.count(),
      systems: await prisma.relatedSystem.count(),
      users: await prisma.user.count({ where: { email: { in: seedEmails } } }),
      tickets: await prisma.ticket.count({ where: { ticketNumber: { in: demoTicketNumbers } } }),
      comments: await prisma.publicComment.count({ where: { ticket: { ticketNumber: { in: demoTicketNumbers } } } }),
      notes: await prisma.internalNote.count({ where: { ticket: { ticketNumber: { in: demoTicketNumbers } } } }),
    };

    runSeed();
    const after = {
      categories: await prisma.category.count(),
      systems: await prisma.relatedSystem.count(),
      users: await prisma.user.count({ where: { email: { in: seedEmails } } }),
      tickets: await prisma.ticket.count({ where: { ticketNumber: { in: demoTicketNumbers } } }),
      comments: await prisma.publicComment.count({ where: { ticket: { ticketNumber: { in: demoTicketNumbers } } } }),
      notes: await prisma.internalNote.count({ where: { ticket: { ticketNumber: { in: demoTicketNumbers } } } }),
    };

    expect(after).toEqual(before);
    expect(after.users).toBe(11);
    expect(after.tickets).toBe(3);
    expect(after.comments).toBe(2);
    expect(after.notes).toBe(1);
    expect(await prisma.user.count({ where: { role: "REQUESTER", isActive: true } })).toBeGreaterThanOrEqual(4);
    expect(await prisma.user.count({ where: { role: "REQUESTER", isActive: false } })).toBeGreaterThanOrEqual(1);
    expect(await prisma.user.count({ where: { role: "IT_STAFF", isActive: true } })).toBeGreaterThanOrEqual(3);
    expect(await prisma.user.count({ where: { role: "IT_STAFF", isActive: false } })).toBeGreaterThanOrEqual(1);
    expect(await prisma.user.count({ where: { role: "ADMINISTRATOR", isActive: true } })).toBeGreaterThanOrEqual(1);

    const requester = await prisma.user.findUniqueOrThrow({ where: { email: "somchai@toktick.it" } });
    const staff = await prisma.user.findUniqueOrThrow({ where: { email: "narin.staff@toktick.it" } });
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin.one@toktick.it" } });
    expect(requester.mustChangePassword).toBe(true);
    expect(staff.mustChangePassword).toBe(true);
    expect(admin.mustChangePassword).toBe(true);
    await expect(verifyPassword("RequesterInit123", requester.passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("StaffInit123", staff.passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("AdminInit123", admin.passwordHash)).resolves.toBe(true);
  });

  it("MIG-10: seed rerun does not reset mutable User or Ticket state", async () => {
    runSeed();
    const prisma = getPrisma();
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin.two@toktick.it" } });
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-2025-90003" } });

    userRestore = {
      id: admin.id,
      passwordHash: admin.passwordHash,
      role: admin.role,
      isActive: admin.isActive,
    };
    ticketRestore = {
      id: ticket.id,
      status: ticket.status,
      ownerId: ticket.ownerId,
      itPriority: ticket.itPriority,
    };

    const changedHash = `test-preserved-hash-${Date.now()}`;
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: changedHash, role: "IT_STAFF", isActive: false },
    });
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "Reopened", ownerId: null, itPriority: "High" },
    });

    runSeed();

    const userAfter = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    const ticketAfter = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(userAfter.passwordHash).toBe(changedHash);
    expect(userAfter.role).toBe("IT_STAFF");
    expect(userAfter.isActive).toBe(false);
    expect(ticketAfter.status).toBe("Reopened");
    expect(ticketAfter.ownerId).toBeNull();
    expect(ticketAfter.itPriority).toBe("High");
  });
});
