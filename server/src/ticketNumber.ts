import { getPrisma } from "./prisma.js";

// Lab 2 Issue 3 — Ticket Number generation (BR-2).
// Format: TKT-YYYY-NNNNN, where NNNNN is a zero-padded sequence that resets
// annually (System-Level SDS v1.0, Decision D-10). Generated server-side only
// and never editable by the client.

function pad(n: number): string {
  return String(n).padStart(5, "0");
}

// Deterministic, testable core: builds the ticket number for a given year and
// the sequence number. Safe to call in unit tests without a database.
export function buildTicketNumber(year: number, sequence: number): string {
  return `TKT-${year}-${pad(sequence)}`;
}

// Finds the highest existing sequence for the given year by scanning the
// previously generated Ticket Numbers (TKT-YYYY-NNNNN).
async function currentSequenceForYear(year: number): Promise<number> {
  const prisma = getPrisma();
  const prefix = `TKT-${year}-`;
  const tickets = await prisma.ticket.findMany({
    where: { ticketNumber: { startsWith: prefix } },
    select: { ticketNumber: true },
  });

  let maxSeq = 0;
  for (const t of tickets) {
    const match = /^TKT-\d{4}-(\d{5})$/.exec(t.ticketNumber);
    if (match) {
      const seq = Number(match[1]);
      if (seq > maxSeq) maxSeq = seq;
    }
  }
  return maxSeq;
}

// Allocates the next unique ticket number for the current year. The candidate is
// current max + 1; callers that persist the ticket should handle a P2002 unique
// violation by retrying (see app.ts POST /api/v1/tickets) — this keeps the
// generator pure and testable while still handling the race where two requests
// allocate the same number concurrently. Returns the candidate ticketNumber.
export async function generateTicketNumber(now: Date = new Date()): Promise<string> {
  const year = now.getFullYear();
  const current = await currentSequenceForYear(year);
  return buildTicketNumber(year, current + 1);
}

// Returns true for a Prisma unique-constraint violation on ticketNumber (P2002).
// Exported so callers and tests can identify a retriable collision.
export function isTicketNumberConflict(err: unknown): boolean {
  const e = err as { code?: string; meta?: { target?: string[] | string } };
  if (e?.code !== "P2002") return false;
  const target = e.meta?.target;
  if (!target) return true; // no target => assume retriable (conservative)
  const asString = Array.isArray(target) ? target.join(",") : String(target);
  return asString.includes("ticketNumber");
}
