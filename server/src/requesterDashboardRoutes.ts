import { Router } from "express";
import { Prisma, UserRole } from "@prisma/client";
import { requireAuth, requirePasswordChanged, requireRole } from "./auth.js";
import { getPrisma } from "./prisma.js";
import { ACTIVE_TICKET_STATUSES } from "./staffDashboardRoutes.js";

export const requesterDashboardRouter = Router();

const ticketSummarySelect = Prisma.validator<Prisma.TicketSelect>()({
  id: true,
  ticketNumber: true,
  summary: true,
  status: true,
  itPriority: true,
  updatedAt: true,
  resolvedAt: true,
});

requesterDashboardRouter.get(
  "/dashboard",
  requireAuth,
  requirePasswordChanged,
  requireRole(UserRole.REQUESTER),
  async (_req, res) => {
    try {
      const requester = res.locals.authUser!;
      const prisma = getPrisma();
      const owned = { requesterId: requester.id };

      const [openTickets, waitingForYou, recentlyUpdatedTickets, recentlyResolvedTickets] = await Promise.all([
        prisma.ticket.count({
          where: { ...owned, status: { in: [...ACTIVE_TICKET_STATUSES] } },
        }),
        prisma.ticket.count({
          where: { ...owned, status: "Waiting for Requester" },
        }),
        prisma.ticket.findMany({
          where: owned,
          select: ticketSummarySelect,
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 5,
        }),
        prisma.ticket.findMany({
          where: {
            ...owned,
            resolvedAt: { not: null },
            status: { in: ["Resolved", "Closed"] },
          },
          select: ticketSummarySelect,
          orderBy: [{ resolvedAt: "desc" }, { id: "desc" }],
          take: 5,
        }),
      ]);

      res.json({
        metrics: { openTickets, waitingForYou },
        recentlyUpdatedTickets,
        recentlyResolvedTickets,
      });
    } catch {
      res.status(500).json({
        error: {
          code: "REQUESTER_DASHBOARD_FAILED",
          message: "Unable to load Requester Dashboard",
        },
      });
    }
  },
);
