import { ActionTakenStatus } from "@prisma/client";
import crypto from "node:crypto";

export const ACTION_STATUS_LABELS = ["Planned", "In Progress", "Completed", "Cancelled"] as const;
export type ActionStatusLabel = (typeof ACTION_STATUS_LABELS)[number];

const STATUS_TO_ENUM: Record<ActionStatusLabel, ActionTakenStatus> = {
  Planned: ActionTakenStatus.PLANNED,
  "In Progress": ActionTakenStatus.IN_PROGRESS,
  Completed: ActionTakenStatus.COMPLETED,
  Cancelled: ActionTakenStatus.CANCELLED,
};

const ENUM_TO_STATUS: Record<ActionTakenStatus, ActionStatusLabel> = {
  [ActionTakenStatus.PLANNED]: "Planned",
  [ActionTakenStatus.IN_PROGRESS]: "In Progress",
  [ActionTakenStatus.COMPLETED]: "Completed",
  [ActionTakenStatus.CANCELLED]: "Cancelled",
};

const ALLOWED_TRANSITIONS: Record<ActionTakenStatus, readonly ActionTakenStatus[]> = {
  [ActionTakenStatus.PLANNED]: [ActionTakenStatus.IN_PROGRESS, ActionTakenStatus.COMPLETED, ActionTakenStatus.CANCELLED],
  [ActionTakenStatus.IN_PROGRESS]: [ActionTakenStatus.COMPLETED, ActionTakenStatus.CANCELLED],
  [ActionTakenStatus.COMPLETED]: [],
  [ActionTakenStatus.CANCELLED]: [],
};

export function parseActionStatusLabel(value: unknown): ActionTakenStatus | null {
  if (typeof value !== "string" || !(ACTION_STATUS_LABELS as readonly string[]).includes(value)) return null;
  return STATUS_TO_ENUM[value as ActionStatusLabel];
}

export function actionStatusLabel(value: ActionTakenStatus): ActionStatusLabel {
  return ENUM_TO_STATUS[value];
}

export function isActiveActionStatus(value: ActionTakenStatus): boolean {
  return value === ActionTakenStatus.PLANNED || value === ActionTakenStatus.IN_PROGRESS;
}

export function isAllowedActionTransition(current: ActionTakenStatus, next: ActionTakenStatus): boolean {
  return current !== next && ALLOWED_TRANSITIONS[current].includes(next);
}

export function unicodeLength(value: string): number {
  return Array.from(value).length;
}

export function isCanonicalUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function parsePositiveInteger(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number.NaN;
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function parseActionBusinessTime(value: unknown, nowMs = Date.now()): Date | null {
  if (typeof value !== "string") return null;
  // Require an explicit UTC/offset suffix so the same input cannot mean a
  // different instant on servers with different local time zones.
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/i);
  if (!match) return null;
  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw = "0"] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw);
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getTime() > nowMs + 5 * 60 * 1000) return null;
  return date;
}

export function normalizeOptionalText(value: unknown, maxCodePoints = 2000): { value: string | null; valid: boolean } {
  if (value === undefined || value === null) return { value: null, valid: true };
  if (typeof value !== "string") return { value: null, valid: false };
  const normalized = value.trim();
  if (!normalized) return { value: null, valid: true };
  if (unicodeLength(normalized) > maxCodePoints) return { value: null, valid: false };
  return { value: normalized, valid: true };
}

export function createActionFingerprint(input: {
  createdById: number;
  actionDateTime: Date;
  description: string;
  assigneeId: number;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
}): string {
  // JSON array fixes field order and keeps null/boolean/number distinctions
  // explicit. expectedTicketVersion and clientRequestId are intentionally not
  // part of the logical create payload equivalence contract.
  const canonical = JSON.stringify([
    input.createdById,
    input.actionDateTime.toISOString(),
    input.description,
    input.assigneeId,
    input.followUpRequired,
    input.followUpNote,
    input.attachmentNotes,
  ]);
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}
