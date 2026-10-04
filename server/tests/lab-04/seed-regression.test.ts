import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ActionFollowUpStatus } from "@prisma/client";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxCli = path.join(serverDir, "node_modules", "tsx", "dist", "cli.mjs");

const DEMO_TICKETS = Array.from({ length: 8 }, (_, index) => `TKT-2025-9000${index + 1}`);
const ACTION_REQUEST_IDS = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
  "00000000-0000-4000-8000-000000000005",
  "00000000-0000-4000-8000-000000000006",
  "00000000-0000-4000-8000-000000000007",
] as const;

type ActionSnapshot = {
  id: number;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  assigneeId: number;
  result: string | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  followUpStatus: "NOT_REQUIRED" | "OUTSTANDING" | "COMPLETED";
  attachmentNotes: string | null;
  version: number;
};

type TicketSnapshot = {
  id: number;
  status: string;
  ownerId: number | null;
  itPriority: string | null;
  version: number;
  workflowCycle: number;
  resolvedAt: Date | null;
};

let actionRestore: ActionSnapshot | null = null;
let ticketRestore: TicketSnapshot | null = null;

function runSeed(): void {
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
  if (actionRestore) {
    await prisma.actionTaken.update({
      where: { id: actionRestore.id },
      data: {
        status: actionRestore.status,
        assigneeId: actionRestore.assigneeId,
        result: actionRestore.result,
        followUpRequired: actionRestore.followUpRequired,
        followUpNote: actionRestore.followUpNote,
        followUpStatus: actionRestore.followUpStatus,
        attachmentNotes: actionRestore.attachmentNotes,
        version: actionRestore.version,
      },
    });
    actionRestore = null;
  }
  if (ticketRestore) {
    await prisma.ticket.update({
      where: { id: ticketRestore.id },
      data: {
        status: ticketRestore.status,
        ownerId: ticketRestore.ownerId,
        itPriority: ticketRestore.itPriority,
        version: ticketRestore.version,
        workflowCycle: ticketRestore.workflowCycle,
        resolvedAt: ticketRestore.resolvedAt,
      },
    });
    ticketRestore = null;
  }
});

afterAll(async () => {
  await getPrisma().$disconnect();
});

describe("Lab 4 seed regression", () => {
  it("SEED-01/SEED-02: creates representative Lab 4 fixtures once and remains idempotent", async () => {
    runSeed();
    const prisma = getPrisma();

    const before = {
      tickets: await prisma.ticket.count({ where: { ticketNumber: { in: DEMO_TICKETS } } }),
      actions: await prisma.actionTaken.count({ where: { clientRequestId: { in: [...ACTION_REQUEST_IDS] } } }),
    };
    runSeed();
    const after = {
      tickets: await prisma.ticket.count({ where: { ticketNumber: { in: DEMO_TICKETS } } }),
      actions: await prisma.actionTaken.count({ where: { clientRequestId: { in: [...ACTION_REQUEST_IDS] } } }),
    };

    expect(after).toEqual(before);
    expect(after.tickets).toBe(8);
    expect(after.actions).toBe(7);

    const tickets = await prisma.ticket.findMany({
      where: { ticketNumber: { in: DEMO_TICKETS } },
      select: { ticketNumber: true, status: true, ownerId: true, itPriority: true, resolvedAt: true },
    });
    expect(new Set(tickets.map((ticket) => ticket.status))).toEqual(
      new Set(["New", "Open", "In Progress", "Waiting for Requester", "Resolved", "Closed", "Reopened", "Cancelled"]),
    );
    expect(tickets.some((ticket) => ticket.ownerId === null)).toBe(true);
    expect(tickets.some((ticket) => ticket.ownerId !== null)).toBe(true);
    expect(new Set(tickets.map((ticket) => ticket.itPriority))).toEqual(new Set(["High", "Medium", "Low", null]));

    const actionStatuses = await prisma.actionTaken.findMany({
      where: { clientRequestId: { in: [...ACTION_REQUEST_IDS] } },
      select: { status: true },
    });
    expect(new Set(actionStatuses.map((action) => action.status))).toEqual(
      new Set(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
    );

    const zeroAction = await prisma.ticket.findUniqueOrThrow({
      where: { ticketNumber: "TKT-2025-90003" },
      include: { actionsTaken: true },
    });
    const oneAction = await prisma.ticket.findUniqueOrThrow({
      where: { ticketNumber: "TKT-2025-90002" },
      include: { actionsTaken: true },
    });
    const multipleActions = await prisma.ticket.findUniqueOrThrow({
      where: { ticketNumber: "TKT-2025-90001" },
      include: { actionsTaken: true },
    });
    expect(zeroAction.actionsTaken).toHaveLength(0);
    expect(oneAction.actionsTaken).toHaveLength(1);
    expect(multipleActions.actionsTaken.length).toBeGreaterThanOrEqual(2);

    const completedDifferentFromOwner = await prisma.actionTaken.findUniqueOrThrow({
      where: {
        ticketId_clientRequestId: {
          ticketId: multipleActions.id,
          clientRequestId: ACTION_REQUEST_IDS[0],
        },
      },
      include: { ticket: true },
    });
    expect(completedDifferentFromOwner.status).toBe("COMPLETED");
    expect(completedDifferentFromOwner.assigneeId).not.toBe(completedDifferentFromOwner.ticket.ownerId);
    expect(completedDifferentFromOwner.performedById).toBe(completedDifferentFromOwner.assigneeId);
    expect(completedDifferentFromOwner.completedAt).not.toBeNull();

    const cancelled = await prisma.actionTaken.findFirstOrThrow({
      where: { clientRequestId: ACTION_REQUEST_IDS[3] },
    });
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelledById).not.toBeNull();
    expect(cancelled.cancelledAt).not.toBeNull();

    const reopened = await prisma.ticket.findUniqueOrThrow({
      where: { ticketNumber: "TKT-2025-90007" },
      include: { actionsTaken: { orderBy: { workflowCycle: "asc" } } },
    });
    expect(reopened.workflowCycle).toBe(2);
    expect(reopened.actionsTaken.map((action) => action.workflowCycle)).toEqual([1, 2]);
    expect(reopened.actionsTaken[0]?.status).toBe("COMPLETED");
    expect(reopened.actionsTaken[1]?.status).toBe("PLANNED");
  });

  it("SEED-03: rerun does not reset mutable Action or Ticket workflow state", async () => {
    runSeed();
    const prisma = getPrisma();
    const action = await prisma.actionTaken.findFirstOrThrow({
      where: { clientRequestId: ACTION_REQUEST_IDS[1] },
    });
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-2025-90006" } });
    const staff3 = await prisma.user.findUniqueOrThrow({ where: { email: "krit.staff@toktick.it" } });

    actionRestore = {
      id: action.id,
      status: action.status,
      assigneeId: action.assigneeId,
      result: action.result,
      followUpRequired: action.followUpRequired,
      followUpNote: action.followUpNote,
      followUpStatus: action.followUpStatus,
      attachmentNotes: action.attachmentNotes,
      version: action.version,
    };
    ticketRestore = {
      id: ticket.id,
      status: ticket.status,
      ownerId: ticket.ownerId,
      itPriority: ticket.itPriority,
      version: ticket.version,
      workflowCycle: ticket.workflowCycle,
      resolvedAt: ticket.resolvedAt,
    };

    await prisma.actionTaken.update({
      where: { id: action.id },
      data: {
        status: "IN_PROGRESS",
        assigneeId: staff3.id,
        result: "Preserve this in-progress diagnostic draft.",
        followUpRequired: false,
        followUpNote: null,
        followUpStatus: ActionFollowUpStatus.NOT_REQUIRED,
        attachmentNotes: "Preserved mutable attachment note.",
        version: 7,
      },
    });
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "Reopened",
        ownerId: null,
        itPriority: "High",
        version: 8,
        workflowCycle: 3,
        resolvedAt: null,
      },
    });

    runSeed();

    const actionAfter = await prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } });
    expect(actionAfter.status).toBe("IN_PROGRESS");
    expect(actionAfter.assigneeId).toBe(staff3.id);
    expect(actionAfter.result).toBe("Preserve this in-progress diagnostic draft.");
    expect(actionAfter.followUpRequired).toBe(false);
    expect(actionAfter.followUpNote).toBeNull();
    expect(actionAfter.attachmentNotes).toBe("Preserved mutable attachment note.");
    expect(actionAfter.version).toBe(7);

    const ticketAfter = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(ticketAfter.status).toBe("Reopened");
    expect(ticketAfter.ownerId).toBeNull();
    expect(ticketAfter.itPriority).toBe("High");
    expect(ticketAfter.version).toBe(8);
    expect(ticketAfter.workflowCycle).toBe(3);
    expect(ticketAfter.resolvedAt).toBeNull();
  });

  it("SEED-04: provides zero and non-zero dashboard calculation fixtures", async () => {
    runSeed();
    const prisma = getPrisma();
    const activeStatuses = ["New", "Open", "In Progress", "Waiting for Requester", "Reopened"];

    const zeroRequester = await prisma.user.findUniqueOrThrow({ where: { email: "preecha@toktick.it" } });
    const nonZeroRequester = await prisma.user.findUniqueOrThrow({ where: { email: "somchai@toktick.it" } });
    expect(await prisma.ticket.count({ where: { requesterId: zeroRequester.id, status: { in: activeStatuses } } })).toBe(0);
    expect(await prisma.ticket.count({ where: { requesterId: nonZeroRequester.id, status: { in: activeStatuses } } })).toBeGreaterThan(0);

    const staffWithAction = await prisma.user.findUniqueOrThrow({ where: { email: "narin.staff@toktick.it" } });
    const staffWithoutAction = await prisma.user.findUniqueOrThrow({ where: { email: "krit.staff@toktick.it" } });
    expect(
      await prisma.actionTaken.count({
        where: {
          assigneeId: staffWithAction.id,
          status: { in: ["PLANNED", "IN_PROGRESS"] },
          ticket: { status: { in: activeStatuses } },
        },
      }),
    ).toBeGreaterThan(0);
    expect(
      await prisma.actionTaken.count({
        where: {
          assigneeId: staffWithoutAction.id,
          status: { in: ["PLANNED", "IN_PROGRESS"] },
          ticket: { status: { in: activeStatuses } },
        },
      }),
    ).toBe(0);

    expect(await prisma.ticket.count({ where: { ownerId: null, status: { in: activeStatuses } } })).toBeGreaterThan(0);
    expect(await prisma.ticket.count({ where: { itPriority: "High", status: { in: activeStatuses } } })).toBeGreaterThan(0);
  });
});
