import { Router } from "express";
import { ActionTakenStatus, Prisma, UserRole } from "@prisma/client";
import { requireAuth, requirePasswordChanged, requireRole } from "./auth.js";
import { getPrisma } from "./prisma.js";
import { actionStatusLabel } from "./actionTakenOperations.js";

export const staffDashboardRouter = Router();

const ACTIVE_TICKET_STATUSES = ["New", "Open", "In Progress", "Waiting for Requester", "Reopened"] as const;
const ALL_TICKET_STATUSES = [
  "New",
  "Open",
  "In Progress",
  "Waiting for Requester",
  "Resolved",
  "Closed",
  "Reopened",
  "Cancelled",
] as const;
const ACTIVE_ACTION_STATUSES = ["PLANNED", "IN_PROGRESS"] as const;

const ticketSummarySelect = Prisma.validator<Prisma.TicketSelect>()({
  id: true,
  ticketNumber: true,
  summary: true,
  status: true,
  itPriority: true,
  updatedAt: true,
});

type DashboardActionRow = {
  id: number;
  ticketId: number;
  description: string;
  status: string;
  updatedAt: Date;
  assigneeId: number;
  assigneeName: string;
  ticketNumber: string;
  ticketSummary: string;
};

staffDashboardRouter.get(
  "/dashboard",
  requireAuth,
  requirePasswordChanged,
  requireRole(UserRole.IT_STAFF, UserRole.ADMINISTRATOR),
  async (_req, res) => {
    try {
      const user = res.locals.authUser!;
      const prisma = getPrisma();
      const activeWhere: Prisma.TicketWhereInput = { status: { in: [...ACTIVE_TICKET_STATUSES] } };

      const [
        unassignedActiveTickets,
        myActiveTickets,
        statusGroups,
        priorityGroups,
        myActiveActions,
        recentlyUpdatedTickets,
        urgentTickets,
      ] = await Promise.all([
        prisma.ticket.count({ where: { ...activeWhere, ownerId: null } }),
        prisma.ticket.count({ where: { ...activeWhere, ownerId: user.id } }),
        Promise.all(ALL_TICKET_STATUSES.map(async (status) => [
          status,
          await prisma.ticket.count({ where: { status } }),
        ] as const)),
        Promise.all([
          prisma.ticket.count({ where: { ...activeWhere, itPriority: "High" } }),
          prisma.ticket.count({ where: { ...activeWhere, itPriority: "Medium" } }),
          prisma.ticket.count({ where: { ...activeWhere, itPriority: "Low" } }),
          prisma.ticket.count({ where: { ...activeWhere, itPriority: null } }),
        ]),
        prisma.$queryRaw<DashboardActionRow[]>(Prisma.sql`
          SELECT
            a."id",
            a."ticketId",
            a."description",
            a."status",
            a."updatedAt",
            a."assigneeId",
            assignee."name" AS "assigneeName",
            t."ticketNumber",
            t."summary" AS "ticketSummary"
          FROM "ActionTaken" a
          INNER JOIN "Ticket" t ON t."id" = a."ticketId"
          INNER JOIN "User" assignee ON assignee."id" = a."assigneeId"
          WHERE a."assigneeId" = ${user.id}
            AND a."status" IN ('PLANNED', 'IN_PROGRESS')
            AND t."status" IN ('New', 'Open', 'In Progress', 'Waiting for Requester', 'Reopened')
            AND a."workflowCycle" = t."workflowCycle"
          ORDER BY a."updatedAt" DESC, a."id" DESC
          LIMIT 5
        `),
        prisma.ticket.findMany({
          where: activeWhere,
          select: ticketSummarySelect,
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 5,
        }),
        prisma.ticket.findMany({
          where: { ...activeWhere, itPriority: "High" },
          select: ticketSummarySelect,
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 5,
        }),
      ]);

      const currentCycleActions = myActiveActions.map((action) => ({
        id: action.id,
        ticketId: action.ticketId,
        description: action.description,
            status: actionStatusLabel(action.status as ActionTakenStatus),
        updatedAt: action.updatedAt,
        assignee: { id: action.assigneeId, name: action.assigneeName },
        ticket: { ticketNumber: action.ticketNumber, summary: action.ticketSummary },
      }));

      const byStatus = Object.fromEntries(statusGroups) as Record<string, number>;
      res.json({
        metrics: {
          unassignedActiveTickets,
          myActiveTickets,
          byStatus,
          activeByItPriority: {
            High: priorityGroups[0],
            Medium: priorityGroups[1],
            Low: priorityGroups[2],
            "Not recorded": priorityGroups[3],
          },
        },
        myActiveActions: currentCycleActions.filter(Boolean),
        recentlyUpdatedTickets,
        urgentTickets,
      });
    } catch {
      res.status(500).json({ error: { code: "STAFF_DASHBOARD_FAILED", message: "Unable to load Staff Dashboard" } });
    }
  },
);
