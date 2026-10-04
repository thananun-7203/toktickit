import { ActionFollowUpStatus, ActionTakenStatus, UserRole } from "@prisma/client";
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

type SeedAction = {
  ticketId: number;
  clientRequestId: string;
  workflowCycle: number;
  actionDateTime: Date;
  description: string;
  result?: string | null;
  followUpRequired: boolean;
  followUpNote?: string | null;
  followUpStatus: ActionFollowUpStatus;
  attachmentNotes?: string | null;
  status: ActionTakenStatus;
  createdById: number;
  assigneeId: number;
  performedById?: number | null;
  completedAt?: Date | null;
  cancelledById?: number | null;
  cancelledAt?: Date | null;
  version?: number;
};

const ACTION_REQUEST_IDS = {
  reportRestartCompleted: "00000000-0000-4000-8000-000000000001",
  reportFollowUpPlanned: "00000000-0000-4000-8000-000000000002",
  crmValidationInProgress: "00000000-0000-4000-8000-000000000003",
  workerLogCancelled: "00000000-0000-4000-8000-000000000004",
  reopenedHistoricalCompleted: "00000000-0000-4000-8000-000000000005",
  reopenedCurrentPlanned: "00000000-0000-4000-8000-000000000006",
  closedPermissionCompleted: "00000000-0000-4000-8000-000000000007",
} as const;

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

async function createActionIfMissing(action: SeedAction) {
  const prisma = getPrisma();
  const existing = await prisma.actionTaken.findUnique({
    where: {
      ticketId_clientRequestId: {
        ticketId: action.ticketId,
        clientRequestId: action.clientRequestId,
      },
    },
  });
  if (existing) return existing;

  return prisma.actionTaken.create({ data: action });
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
  const requester4 = userByEmail.get("preecha@toktick.it")!;
  const staff1 = userByEmail.get("narin.staff@toktick.it")!;
  const staff2 = userByEmail.get("malee.staff@toktick.it")!;
  const staff3 = userByEmail.get("krit.staff@toktick.it")!;
  const admin1 = userByEmail.get("admin.one@toktick.it")!;

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

  const ticket3 = await prisma.ticket.upsert({
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

  const ticket4 = await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-2025-90004" },
    update: {},
    create: {
      ticketNumber: "TKT-2025-90004",
      summary: "New access request is waiting for triage",
      description: "A newly submitted access request is ready for initial support triage.",
      requestedPriority: "Medium",
      itPriority: null,
      status: "New",
      requesterId: requester1.id,
      ownerId: null,
      categoryId: category.id,
      relatedSystemId: crm.id,
    },
  });

  const ticket5 = await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-2025-90005" },
    update: {},
    create: {
      ticketNumber: "TKT-2025-90005",
      summary: "Reporting worker intermittently stops processing",
      description: "Support is actively diagnosing intermittent report worker failures.",
      requestedPriority: "High",
      itPriority: "High",
      status: "In Progress",
      requesterId: requester2.id,
      ownerId: staff3.id,
      categoryId: category.id,
      relatedSystemId: reportPortal.id,
    },
  });

  const ticket6 = await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-2025-90006" },
    update: {},
    create: {
      ticketNumber: "TKT-2025-90006",
      summary: "Closed CRM permission correction",
      description: "The requested CRM permission was corrected, verified, resolved, and later closed.",
      requestedPriority: "Low",
      itPriority: "Low",
      status: "Closed",
      resolvedAt: new Date("2026-09-20T03:00:00.000Z"),
      requesterId: requester4.id,
      ownerId: staff1.id,
      categoryId: category.id,
      relatedSystemId: crm.id,
    },
  });

  const ticket7 = await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-2025-90007" },
    update: {},
    create: {
      ticketNumber: "TKT-2025-90007",
      summary: "Report export issue reopened after recurrence",
      description: "A previously resolved report-export problem has recurred and entered a new work cycle.",
      requestedPriority: "High",
      itPriority: "Medium",
      status: "Reopened",
      version: 3,
      workflowCycle: 2,
      requesterId: requester1.id,
      ownerId: staff2.id,
      categoryId: category.id,
      relatedSystemId: reportPortal.id,
    },
  });

  const ticket8 = await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-2025-90008" },
    update: {},
    create: {
      ticketNumber: "TKT-2025-90008",
      summary: "Cancelled duplicate software request",
      description: "The requester confirmed this Ticket duplicated an existing request.",
      requestedPriority: "Medium",
      itPriority: null,
      status: "Cancelled",
      requesterId: requester4.id,
      ownerId: null,
      categoryId: category.id,
      relatedSystemId: crm.id,
    },
  });

  // Lab 4 canonical Actions Taken. Stable clientRequestId values are the
  // natural keys, and create-only behavior prevents seed reruns from resetting
  // mutable Action workflow state.
  await createActionIfMissing({
    ticketId: ticket1.id,
    clientRequestId: ACTION_REQUEST_IDS.reportRestartCompleted,
    workflowCycle: 1,
    actionDateTime: new Date("2026-09-18T02:00:00.000Z"),
    description: "Restarted the reporting worker after reproducing the export timeout.",
    result: "Monthly report export completed successfully after the worker restart.",
    followUpRequired: false,
    followUpNote: null,
    followUpStatus: ActionFollowUpStatus.NOT_REQUIRED,
    attachmentNotes: "Use the requester report-error screenshot for comparison.",
    status: ActionTakenStatus.COMPLETED,
    createdById: staff1.id,
    // Deliberately different from Ticket Owner to prove Action assignment is
    // independent while completion still records the current assignee.
    assigneeId: staff2.id,
    performedById: staff2.id,
    completedAt: new Date("2026-09-18T02:20:00.000Z"),
    version: 2,
  });

  await createActionIfMissing({
    ticketId: ticket1.id,
    clientRequestId: ACTION_REQUEST_IDS.reportFollowUpPlanned,
    workflowCycle: 1,
    actionDateTime: new Date("2026-09-18T03:00:00.000Z"),
    description: "Confirm export stability after the next scheduled reporting run.",
    result: null,
    followUpRequired: true,
    followUpNote: "Check the next scheduled export and record whether the timeout returns.",
    followUpStatus: ActionFollowUpStatus.NOT_REQUIRED,
    attachmentNotes: null,
    status: ActionTakenStatus.PLANNED,
    createdById: staff1.id,
    assigneeId: staff1.id,
  });

  await createActionIfMissing({
    ticketId: ticket2.id,
    clientRequestId: ACTION_REQUEST_IDS.crmValidationInProgress,
    workflowCycle: 1,
    actionDateTime: new Date("2026-09-19T01:30:00.000Z"),
    description: "Compare the rejected CRM update with the current validation rules.",
    result: null,
    followUpRequired: false,
    followUpNote: null,
    followUpStatus: ActionFollowUpStatus.NOT_REQUIRED,
    attachmentNotes: null,
    status: ActionTakenStatus.IN_PROGRESS,
    createdById: staff2.id,
    assigneeId: staff2.id,
  });

  await createActionIfMissing({
    ticketId: ticket5.id,
    clientRequestId: ACTION_REQUEST_IDS.workerLogCancelled,
    workflowCycle: 1,
    actionDateTime: new Date("2026-09-21T04:00:00.000Z"),
    description: "Collect an additional verbose worker log after the next failure.",
    result: null,
    followUpRequired: false,
    followUpNote: null,
    followUpStatus: ActionFollowUpStatus.NOT_REQUIRED,
    attachmentNotes: null,
    status: ActionTakenStatus.CANCELLED,
    createdById: staff3.id,
    assigneeId: staff3.id,
    cancelledById: admin1.id,
    cancelledAt: new Date("2026-09-21T04:15:00.000Z"),
    version: 2,
  });

  await createActionIfMissing({
    ticketId: ticket7.id,
    clientRequestId: ACTION_REQUEST_IDS.reopenedHistoricalCompleted,
    workflowCycle: 1,
    actionDateTime: new Date("2026-09-10T02:00:00.000Z"),
    description: "Applied the original report export recovery during the first workflow cycle.",
    result: "Export recovered and the first cycle was resolved.",
    followUpRequired: false,
    followUpNote: null,
    followUpStatus: ActionFollowUpStatus.NOT_REQUIRED,
    attachmentNotes: null,
    status: ActionTakenStatus.COMPLETED,
    createdById: staff1.id,
    assigneeId: staff1.id,
    performedById: staff1.id,
    completedAt: new Date("2026-09-10T02:30:00.000Z"),
    version: 2,
  });

  await createActionIfMissing({
    ticketId: ticket7.id,
    clientRequestId: ACTION_REQUEST_IDS.reopenedCurrentPlanned,
    workflowCycle: 2,
    actionDateTime: new Date("2026-09-22T06:00:00.000Z"),
    description: "Investigate the recurrence using the current reopened workflow cycle.",
    result: null,
    followUpRequired: true,
    followUpNote: "Compare the new failure signature with the first-cycle recovery evidence.",
    followUpStatus: ActionFollowUpStatus.NOT_REQUIRED,
    attachmentNotes: null,
    status: ActionTakenStatus.PLANNED,
    createdById: staff2.id,
    assigneeId: staff2.id,
  });

  await createActionIfMissing({
    ticketId: ticket6.id,
    clientRequestId: ACTION_REQUEST_IDS.closedPermissionCompleted,
    workflowCycle: 1,
    actionDateTime: new Date("2026-09-20T02:30:00.000Z"),
    description: "Corrected the CRM permission and verified access before resolution.",
    result: "Requester access was verified successfully before the Ticket was closed.",
    followUpRequired: false,
    followUpNote: null,
    followUpStatus: ActionFollowUpStatus.NOT_REQUIRED,
    attachmentNotes: null,
    status: ActionTakenStatus.COMPLETED,
    createdById: staff1.id,
    assigneeId: staff1.id,
    performedById: staff1.id,
    completedAt: new Date("2026-09-20T02:50:00.000Z"),
    version: 2,
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

  const [requesterActive, requesterInactive, staffActive, staffInactive, adminActive, tickets, actions, comments, notes] = await Promise.all([
    prisma.user.count({ where: { role: UserRole.REQUESTER, isActive: true } }),
    prisma.user.count({ where: { role: UserRole.REQUESTER, isActive: false } }),
    prisma.user.count({ where: { role: UserRole.IT_STAFF, isActive: true } }),
    prisma.user.count({ where: { role: UserRole.IT_STAFF, isActive: false } }),
    prisma.user.count({ where: { role: UserRole.ADMINISTRATOR, isActive: true } }),
    prisma.ticket.count(),
    prisma.actionTaken.count(),
    prisma.publicComment.count(),
    prisma.internalNote.count(),
  ]);

  console.log(
    `Seed complete. Requesters ${requesterActive} active/${requesterInactive} inactive; ` +
      `Staff ${staffActive} active/${staffInactive} inactive; Admin ${adminActive} active; ` +
      `Tickets ${tickets}; ActionsTaken ${actions}; PublicComments ${comments}; InternalNotes ${notes}.`,
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
