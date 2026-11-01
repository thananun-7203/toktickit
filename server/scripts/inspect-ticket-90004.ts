import { getPrisma } from "../src/prisma.js";

const prisma = getPrisma();
const ticket = await prisma.ticket.findUnique({
  where: { ticketNumber: "TKT-2025-90004" },
  select: { id: true, ticketNumber: true, status: true, version: true, workflowCycle: true, resolvedAt: true },
});
console.log("TICKET", JSON.stringify(ticket));
if (ticket) {
  const actions = await prisma.actionTaken.findMany({
    where: { ticketId: ticket.id },
    orderBy: [{ workflowCycle: "asc" }, { id: "asc" }],
    select: { id: true, workflowCycle: true, status: true, result: true, followUpRequired: true, followUpNote: true, assigneeId: true, description: true },
  });
  console.log("ACTIONS", JSON.stringify(actions));
}
await prisma.$disconnect();
