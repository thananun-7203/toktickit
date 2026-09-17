import { describe, expect, it } from "vitest";
import {
  allowedNextStatuses,
  isAllowedStatusTransition,
  isTicketStatus,
  TICKET_STATUSES,
} from "../../src/staffTicketOperations.js";

describe("Lab 3 Staff Ticket status rules", () => {
  it("U-09: returns every approved allowed transition", () => {
    const expected = {
      New: ["Open", "Cancelled"],
      Open: ["In Progress", "Waiting for Requester", "Resolved", "Cancelled"],
      "In Progress": ["Waiting for Requester", "Resolved", "Cancelled"],
      "Waiting for Requester": ["In Progress", "Resolved", "Cancelled"],
      Resolved: ["Closed", "Reopened"],
      Closed: ["Reopened"],
      Reopened: ["In Progress", "Waiting for Requester", "Resolved", "Cancelled"],
      Cancelled: ["Reopened"],
    } as const;

    for (const status of TICKET_STATUSES) {
      expect(allowedNextStatuses(status)).toEqual(expected[status]);
      for (const next of expected[status]) {
        expect(isAllowedStatusTransition(status, next)).toBe(true);
      }
    }
  });

  it("U-10: rejects self, forbidden, and unknown transitions", () => {
    for (const status of TICKET_STATUSES) {
      expect(isAllowedStatusTransition(status, status)).toBe(false);
    }
    expect(isAllowedStatusTransition("New", "Resolved")).toBe(false);
    expect(isAllowedStatusTransition("Closed", "Open")).toBe(false);
    expect(isAllowedStatusTransition("Cancelled", "Closed")).toBe(false);
    expect(isTicketStatus("Unknown")).toBe(false);
  });
});
