import { UserRole } from "@prisma/client";
import { getPrisma } from "../src/prisma.js";

// Lab 3 seed data. Stable natural keys + create-only upserts make reruns safe:
// mutable user/ticket state is never reset merely to restore demo defaults.
const CATEGORIES = ["Account and Access", "Hardware", "Software", "Network"];

const RELATED_SYSTEMS = [
  { name: "CRM", description: "Customer relationship management platform" },
  { name: "Report Portal", description: "Business reporting and export" },
  { name: "Payroll", description: "Monthly payroll processing" },
  { name: "Inventory", description: "Stock and warehouse management" },
  { name: "Email Service", description: "Corporate email and calendar" },
  { name: "HR System", description: "Human resources and onboarding" },
  { name: "ERP", description: "Enterprise resource planning" },
];

type SeedUser = {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  passwordHash: string;
};

// These are bcrypt cost-12 hashes of the documented local-only credentials in
// README.md. The seed never writes or derives a plaintext password in the DB.
const REQUESTER_INITIAL_HASH = "$2b$12$JGdTBEX1cC8Nu09pKeD0fe4r6YcpsEJGtnzE8M2A.0N2vQ6QHctyW";
const STAFF_INITIAL_HASH = "$2b$12$KqRrH.YdCk40W1SbC3r6ROaF2GrCGv984/oQ8FokYPpXlcMtOsvT6";
const ADMIN_INITIAL_HASH = "$2b$12$ZJLqAqzVKmvbCO9lX7cHUuBVNMxtZTZ1x6.rO2u9oweHs39pnAR8C";

const USERS: SeedUser[] = [
  { name: "Somchai Jaidee", email: "somchai@toktick.it", role: UserRole.REQUESTER, isActive: true, passwordHash: REQUESTER_INITIAL_HASH },
  { name: "Somsri Rakdee", email: "somsri@toktick.it", role: UserRole.REQUESTER, isActive: true, passwordHash: REQUESTER_INITIAL_HASH },
  { name: "Anan Kongthong", email: "anan@toktick.it", role: UserRole.REQUESTER, isActive: true, passwordHash: REQUESTER_INITIAL_HASH },
  { name: "Preecha Sombat", email: "preecha@toktick.it", role: UserRole.REQUESTER, isActive: true, passwordHash: REQUESTER_INITIAL_HASH },
  { name: "Noppadol Sitthirit", email: "noppadol@toktick.it", role: UserRole.REQUESTER, isActive: false, passwordHash: REQUESTER_INITIAL_HASH },
  { name: "Narin Support", email: "narin.staff@toktick.it", role: UserRole.IT_STAFF, isActive: true, passwordHash: STAFF_INITIAL_HASH },
  { name: "Malee Support", email: "malee.staff@toktick.it", role: UserRole.IT_STAFF, isActive: true, passwordHash: STAFF_INITIAL_HASH },
  { name: "Krit Support", email: "krit.staff@toktick.it", role: UserRole.IT_STAFF, isActive: true, passwordHash: STAFF_INITIAL_HASH },
  { name: "Inactive Support", email: "inactive.staff@toktick.it", role: UserRole.IT_STAFF, isActive: false, passwordHash: STAFF_INITIAL_HASH },
  { name: "Admin One", email: "admin.one@toktick.it", role: UserRole.ADMINISTRATOR, isActive: true, passwordHash: ADMIN_INITIAL_HASH },
  { name: "Admin Two", email: "admin.two@toktick.it", role: UserRole.ADMINISTRATOR, isActive: true, passwordHash: ADMIN_INITIAL_HASH },
];

async function createUserIfMissing(user: SeedUser) {
  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({ where: { email: user.email } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: true,
      passwordHash: user.passwordHash,
    },
  });
}

async function main() {
  const prisma = getPrisma();

  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const system of RELATED_SYSTEMS) {
    await prisma.relatedSystem.upsert({ where: { name: system.name }, update: {}, create: system });
  }

  const userByEmail = new Map<string, Awaited<ReturnType<typeof createUserIfMissing>>>();
  for (const user of USERS) {
    const ready = await createUserIfMissing(user);
    userByEmail.set(user.email, ready);
  }

  const category = await prisma.category.findUniqueOrThrow({ where: { name: "Software" } });
  const reportPortal = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Report Portal" } });
  const crm = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "CRM" } });
  const requester1 = userByEmail.get("somchai@toktick.it")!;
  const requester2 = userByEmail.get("somsri@toktick.it")!;
  const requester3 = userByEmail.get("anan@toktick.it")!;
  const staff1 = userByEmail.get("narin.staff@toktick.it")!;
  const staff2 = userByEmail.get("malee.staff@toktick.it")!;

  const ticket1 = await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-2025-90001" },
    update: {},
    create: {
      ticketNumber: "TKT-2025-90001",
      summary: "Monthly report export is unavailable",
      description: "The report export remains loading after the request is submitted.",
      requestedPriority: "High",
      itPriority: "High",
      status: "Open",
      requesterId: requester1.id,
      ownerId: staff1.id,
      categoryId: category.id,
      relatedSystemId: reportPortal.id,
    },
  });

  const ticket2 = await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-2025-90002" },
    update: {},
    create: {
      ticketNumber: "TKT-2025-90002",
      summary: "CRM page shows an unexpected validation message",
      description: "A normal customer update is rejected with a validation message.",
      requestedPriority: "Medium",
      itPriority: "Medium",
      status: "Waiting for Requester",
      requesterId: requester2.id,
      ownerId: staff2.id,
      categoryId: category.id,
      relatedSystemId: crm.id,
    },
  });

  await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-2025-90003" },
    update: {},
    create: {
      ticketNumber: "TKT-2025-90003",
      summary: "Report filter resets after navigation",
      description: "The selected filter is lost when returning from report detail.",
      requestedPriority: "Low",
      itPriority: "Low",
      status: "Resolved",
      requesterId: requester3.id,
      // Keep one canonical unassigned ticket for Queue/Claim coverage in later
      // Lab 3 issues while the other demo tickets remain assigned.
      ownerId: null,
      categoryId: category.id,
      relatedSystemId: reportPortal.id,
    },
  });

  const publicContent = "Support is investigating this issue and will share updates here.";
  const publicExists = await prisma.publicComment.findFirst({
    where: { ticketId: ticket1.id, authorId: staff1.id, content: publicContent },
  });
  if (!publicExists) {
    await prisma.publicComment.create({ data: { ticketId: ticket1.id, authorId: staff1.id, content: publicContent } });
  }

  const requesterContent = "The issue still occurs after signing in again.";
  const requesterCommentExists = await prisma.publicComment.findFirst({
    where: { ticketId: ticket2.id, authorId: requester2.id, content: requesterContent },
  });
  if (!requesterCommentExists) {
    await prisma.publicComment.create({ data: { ticketId: ticket2.id, authorId: requester2.id, content: requesterContent } });
  }

  const noteContent = "Reproduced in the local support environment; continue diagnosis in the reporting service.";
  const noteExists = await prisma.internalNote.findFirst({
    where: { ticketId: ticket1.id, authorId: staff1.id, content: noteContent },
  });
  if (!noteExists) {
    await prisma.internalNote.create({ data: { ticketId: ticket1.id, authorId: staff1.id, content: noteContent } });
  }

  const [requesterActive, requesterInactive, staffActive, staffInactive, adminActive, tickets, comments, notes] = await Promise.all([
    prisma.user.count({ where: { role: UserRole.REQUESTER, isActive: true } }),
    prisma.user.count({ where: { role: UserRole.REQUESTER, isActive: false } }),
    prisma.user.count({ where: { role: UserRole.IT_STAFF, isActive: true } }),
    prisma.user.count({ where: { role: UserRole.IT_STAFF, isActive: false } }),
    prisma.user.count({ where: { role: UserRole.ADMINISTRATOR, isActive: true } }),
    prisma.ticket.count(),
    prisma.publicComment.count(),
    prisma.internalNote.count(),
  ]);

  console.log(
    `Seed complete. Requesters ${requesterActive} active/${requesterInactive} inactive; ` +
      `Staff ${staffActive} active/${staffInactive} inactive; Admin ${adminActive} active; ` +
      `Tickets ${tickets}; PublicComments ${comments}; InternalNotes ${notes}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
