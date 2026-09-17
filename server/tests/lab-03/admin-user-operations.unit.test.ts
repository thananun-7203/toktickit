import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  isEligibleTicketOwnerState,
  removesActiveAdministrator,
  wouldLeaveZeroActiveAdministrators,
} from "../../src/adminUserOperations.js";

describe("Lab 3 Administrator User Management rules", () => {
  it("ADM-13: identifies deactivation of the final active Administrator as unsafe", () => {
    expect(wouldLeaveZeroActiveAdministrators(
      UserRole.ADMINISTRATOR,
      true,
      UserRole.ADMINISTRATOR,
      false,
      1,
    )).toBe(true);
    expect(wouldLeaveZeroActiveAdministrators(
      UserRole.ADMINISTRATOR,
      true,
      UserRole.ADMINISTRATOR,
      false,
      2,
    )).toBe(false);
  });

  it("ADM-14: identifies demotion of the final active Administrator as unsafe", () => {
    expect(removesActiveAdministrator(
      UserRole.ADMINISTRATOR,
      true,
      UserRole.IT_STAFF,
      true,
    )).toBe(true);
    expect(wouldLeaveZeroActiveAdministrators(
      UserRole.ADMINISTRATOR,
      true,
      UserRole.REQUESTER,
      true,
      1,
    )).toBe(true);
  });

  it("owner eligibility remains exactly active IT Staff or Administrator", () => {
    expect(isEligibleTicketOwnerState(UserRole.IT_STAFF, true)).toBe(true);
    expect(isEligibleTicketOwnerState(UserRole.ADMINISTRATOR, true)).toBe(true);
    expect(isEligibleTicketOwnerState(UserRole.REQUESTER, true)).toBe(false);
    expect(isEligibleTicketOwnerState(UserRole.IT_STAFF, false)).toBe(false);
    expect(isEligibleTicketOwnerState(UserRole.ADMINISTRATOR, false)).toBe(false);
  });
});
