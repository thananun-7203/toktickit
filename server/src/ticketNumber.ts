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

// Allocates the next unique ticket number for the current year in a race-safe
// manner. Constructs candidate numbers above the current max and relies on the
// unique constraint to reject collisions (on conflict the caller can retry).
export async function generateTicketNumber(now: Date = new Date()): Promise<string> {
  const year = now.getFullYear();
  const current = await currentSequenceForYear(year);
  return buildTicketNumber(year, current + 1);
}
