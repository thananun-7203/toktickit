import { UserRole } from "@prisma/client";

export function isEligibleTicketOwnerState(role: UserRole, isActive: boolean): boolean {
  return isActive && (role === UserRole.IT_STAFF || role === UserRole.ADMINISTRATOR);
}

export function removesActiveAdministrator(
  currentRole: UserRole,
  currentIsActive: boolean,
  nextRole: UserRole,
  nextIsActive: boolean,
): boolean {
  return currentRole === UserRole.ADMINISTRATOR
    && currentIsActive
    && (nextRole !== UserRole.ADMINISTRATOR || !nextIsActive);
}

export function wouldLeaveZeroActiveAdministrators(
  currentRole: UserRole,
  currentIsActive: boolean,
  nextRole: UserRole,
  nextIsActive: boolean,
  activeAdministratorCount: number,
): boolean {
  return removesActiveAdministrator(currentRole, currentIsActive, nextRole, nextIsActive)
    && activeAdministratorCount <= 1;
}
