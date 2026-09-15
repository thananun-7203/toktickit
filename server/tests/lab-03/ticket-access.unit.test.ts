import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import type { AuthUser } from "../../src/auth.js";
import { ticketVisibilityWhere } from "../../src/ticketAccess.js";

function user(role: UserRole, id = 42): AuthUser {
  return {
    id,
    name: "Access Test",
    email: "access.test@toktick.it",
    role,
    isActive: true,
    mustChangePassword: false,
  };
}

describe("shared Ticket visibility policy", () => {
  it("scopes Requester visibility to the authenticated owner", () => {
    expect(ticketVisibilityWhere(user(UserRole.REQUESTER, 77))).toEqual({ requesterId: 77 });
  });

  it("explicitly allows IT Staff and Administrator to shared Ticket resources", () => {
    expect(ticketVisibilityWhere(user(UserRole.IT_STAFF))).toEqual({});
    expect(ticketVisibilityWhere(user(UserRole.ADMINISTRATOR))).toEqual({});
  });

  it("denies an unknown runtime role instead of treating it as non-Requester access", () => {
    const invalid = { ...user(UserRole.REQUESTER), role: "UNKNOWN" as UserRole };
    expect(() => ticketVisibilityWhere(invalid)).toThrow(/Unsupported user role/);
  });
});
