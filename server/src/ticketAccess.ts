import { Prisma, UserRole } from "@prisma/client";
import type { AuthUser } from "./auth.js";

/**
 * Shared Ticket visibility policy for Lab 3 resources that are intentionally
 * visible to more than one role (for example Public Comments and active
 * attachment downloads).
 *
 * Keep this as an explicit allow-list. A new/unknown role must never gain
 * access simply because it is "not a Requester".
 */
export function ticketVisibilityWhere(user: AuthUser): Prisma.TicketWhereInput {
  switch (user.role) {
    case UserRole.REQUESTER:
      return { requesterId: user.id };
    case UserRole.IT_STAFF:
    case UserRole.ADMINISTRATOR:
      return {};
    default: {
      const exhaustive: never = user.role;
      throw new Error(`Unsupported user role: ${String(exhaustive)}`);
    }
  }
}
