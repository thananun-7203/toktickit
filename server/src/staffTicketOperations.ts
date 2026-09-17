export const TICKET_STATUSES = [
  "New",
  "Open",
  "In Progress",
  "Waiting for Requester",
  "Resolved",
  "Closed",
  "Reopened",
  "Cancelled",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const IT_PRIORITIES = ["Low", "Medium", "High"] as const;
export type ItPriority = (typeof IT_PRIORITIES)[number];

const STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  New: ["Open", "Cancelled"],
  Open: ["In Progress", "Waiting for Requester", "Resolved", "Cancelled"],
  "In Progress": ["Waiting for Requester", "Resolved", "Cancelled"],
  "Waiting for Requester": ["In Progress", "Resolved", "Cancelled"],
  Resolved: ["Closed", "Reopened"],
  Closed: ["Reopened"],
  Reopened: ["In Progress", "Waiting for Requester", "Resolved", "Cancelled"],
  Cancelled: ["Reopened"],
};

export function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === "string" && (TICKET_STATUSES as readonly string[]).includes(value);
}

export function allowedNextStatuses(current: TicketStatus): readonly TicketStatus[] {
  return STATUS_TRANSITIONS[current];
}

export function isAllowedStatusTransition(current: TicketStatus, next: TicketStatus): boolean {
  return current !== next && STATUS_TRANSITIONS[current].includes(next);
}

export function isItPriority(value: unknown): value is ItPriority {
  return typeof value === "string" && (IT_PRIORITIES as readonly string[]).includes(value);
}
