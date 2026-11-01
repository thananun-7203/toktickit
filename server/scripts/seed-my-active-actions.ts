import { ActionFollowUpStatus, ActionTakenStatus, Prisma, UserRole } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const ACTIVE_TICKET_STATUSES = ["New", "Open", "In Progress", "Waiting for Requester", "Reopened"];
const ACTIVE_ACTION_STATUSES = [ActionTakenStatus.PLANNED, ActionTakenStatus.IN_PROGRESS];

function getDatabaseTarget(databaseUrl: string): { host: string; databaseName: string } {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use postgres:// or postgresql://.");
  }

  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname.toLowerCase())) {
    throw new Error("Refusing to write to a non-local database. Disposable test runs must use localhost.");
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  return { host: parsed.hostname.toLowerCase(), databaseName };
}

function requestIdForUser(userId: number): string {
  return `10000000-0000-4000-8000-${userId.toString(16).padStart(12, "0")}`;
}

function getDatabaseUrl(): string | undefined {
  const fromEnvironment = process.env.DATABASE_URL?.trim();
  if (fromEnvironment) return fromEnvironment;

  try {
    const envFile = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const match = envFile.match(/^\s*DATABASE_URL\s*=\s*(.*?)\s*$/m);
    return match?.[1]?.trim().replace(/^("([\s\S]*)"|'([\s\S]*)')$/, (_value, _quoted, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted);
  } catch {
    return undefined;
  }
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  process.env.DATABASE_URL = databaseUrl;

  const { host, databaseName } = getDatabaseTarget(databaseUrl);
  if (process.env.TOKTICKIT_DEMO_ACTIONS_ALLOW_WRITE !== "1") {
    throw new Error("Write protection is enabled. Explicit write approval is required.");
  }

  const isDisposableTestDatabase = /(^|[_-])tests?($|[_-])/i.test(databaseName);
  const isExplicitlyApprovedDevelopmentDatabase =
    host === "localhost" &&
    databaseName === "toktickit" &&
    process.env.TOKTICKIT_DEMO_ACTIONS_CONFIRM_DATABASE === "toktickit";
  if (!isDisposableTestDatabase && !isExplicitlyApprovedDevelopmentDatabase) {
    throw new Error(
      `Refusing to write to database '${databaseName}'. Use a disposable test database, or explicitly confirm the local 'toktickit' Development Database.`,
    );
  }

  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const users = await tx.user.findMany({
        where: {
          isActive: true,
          role: { in: [UserRole.IT_STAFF, UserRole.ADMINISTRATOR] },
        },
        select: { id: true, name: true, email: true },
        orderBy: { id: "asc" },
      });

      const tickets = await tx.ticket.findMany({
        where: { status: { in: ACTIVE_TICKET_STATUSES } },
        select: { id: true, ticketNumber: true, workflowCycle: true, summary: true },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      });

      const currentActions = await tx.actionTaken.findMany({
        where: {
          assigneeId: { in: users.map((user) => user.id) },
          status: { in: ACTIVE_ACTION_STATUSES },
          ticket: { is: { status: { in: ACTIVE_TICKET_STATUSES } } },
        },
        select: {
          assigneeId: true,
          ticketId: true,
          workflowCycle: true,
          clientRequestId: true,
          ticket: { select: { workflowCycle: true } },
        },
      });

      const activeCountByTicket = new Map<number, number>();
      for (const action of currentActions) {
        if (action.workflowCycle === action.ticket.workflowCycle) {
          activeCountByTicket.set(action.ticketId, (activeCountByTicket.get(action.ticketId) ?? 0) + 1);
        }
      }

      const report: Array<{ email: string; outcome: string; ticketNumber?: string }> = [];
      let created = 0;

      for (const user of users) {
        const hasCurrentAction = currentActions.some(
          (action) => action.assigneeId === user.id && action.workflowCycle === action.ticket.workflowCycle,
        );
        if (hasCurrentAction) {
          report.push({ email: user.email, outcome: "already has a current active Action" });
          continue;
        }

        const requestId = requestIdForUser(user.id);
        const candidateTickets = [...tickets].sort((left, right) =>
          (activeCountByTicket.get(left.id) ?? 0) - (activeCountByTicket.get(right.id) ?? 0) || left.id - right.id,
        );

        let selectedTicket: (typeof tickets)[number] | undefined;
        for (const ticket of candidateTickets) {
          const duplicate = await tx.actionTaken.findUnique({
            where: {
              ticketId_clientRequestId: { ticketId: ticket.id, clientRequestId: requestId },
            },
            select: { id: true },
          });
          if (!duplicate) {
            selectedTicket = ticket;
            break;
          }
        }

        if (!selectedTicket) {
          report.push({ email: user.email, outcome: tickets.length ? "no safe ticket available (stable key already exists)" : "no active Ticket available" });
          continue;
        }

        await tx.actionTaken.create({
          data: {
            ticketId: selectedTicket.id,
            clientRequestId: requestId,
            workflowCycle: selectedTicket.workflowCycle,
            actionDateTime: new Date(),
            description: `Review the current support progress for ${selectedTicket.ticketNumber} and continue the assigned investigation.`,
            result: null,
            followUpRequired: false,
            followUpNote: null,
            followUpStatus: ActionFollowUpStatus.NOT_REQUIRED,
            attachmentNotes: null,
            status: ActionTakenStatus.PLANNED,
            createdById: user.id,
            assigneeId: user.id,
          },
        });

        created += 1;
        activeCountByTicket.set(selectedTicket.id, (activeCountByTicket.get(selectedTicket.id) ?? 0) + 1);
        report.push({ email: user.email, outcome: "created", ticketNumber: selectedTicket.ticketNumber });
      }

      return { activeAccountCount: users.length, activeTicketCount: tickets.length, created, report };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    console.log(`My Active Actions seed completed on ${isDisposableTestDatabase ? "disposable test" : "explicitly approved Development"} database '${databaseName}'.`);
    console.log(`Active IT Staff/Admin accounts: ${result.activeAccountCount}; active Tickets: ${result.activeTicketCount}; Actions created: ${result.created}.`);
    for (const item of result.report) {
      console.log(`${item.email}: ${item.outcome}${item.ticketNumber ? ` (${item.ticketNumber})` : ""}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
