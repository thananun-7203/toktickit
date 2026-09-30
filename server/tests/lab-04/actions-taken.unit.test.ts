import { ActionTakenStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  actionStatusLabel,
  createActionFingerprint,
  isAllowedActionTransition,
  isCanonicalUuid,
  normalizeOptionalText,
  parseActionBusinessTime,
  parseActionStatusLabel,
  parsePositiveInteger,
  unicodeLength,
} from "../../src/actionTakenOperations.js";

describe("Lab 4 Actions Taken helpers", () => {
  it("AT-U-01/AT-U-02: accepts only the approved Action transition matrix", () => {
    expect(isAllowedActionTransition(ActionTakenStatus.PLANNED, ActionTakenStatus.IN_PROGRESS)).toBe(true);
    expect(isAllowedActionTransition(ActionTakenStatus.PLANNED, ActionTakenStatus.COMPLETED)).toBe(true);
    expect(isAllowedActionTransition(ActionTakenStatus.PLANNED, ActionTakenStatus.CANCELLED)).toBe(true);
    expect(isAllowedActionTransition(ActionTakenStatus.IN_PROGRESS, ActionTakenStatus.COMPLETED)).toBe(true);
    expect(isAllowedActionTransition(ActionTakenStatus.IN_PROGRESS, ActionTakenStatus.CANCELLED)).toBe(true);

    expect(isAllowedActionTransition(ActionTakenStatus.PLANNED, ActionTakenStatus.PLANNED)).toBe(false);
    expect(isAllowedActionTransition(ActionTakenStatus.IN_PROGRESS, ActionTakenStatus.PLANNED)).toBe(false);
    expect(isAllowedActionTransition(ActionTakenStatus.COMPLETED, ActionTakenStatus.CANCELLED)).toBe(false);
    expect(isAllowedActionTransition(ActionTakenStatus.CANCELLED, ActionTakenStatus.PLANNED)).toBe(false);
  });

  it("AT-U-01: maps exact API status labels to Prisma values and back", () => {
    expect(parseActionStatusLabel("Planned")).toBe(ActionTakenStatus.PLANNED);
    expect(parseActionStatusLabel("In Progress")).toBe(ActionTakenStatus.IN_PROGRESS);
    expect(parseActionStatusLabel("Completed")).toBe(ActionTakenStatus.COMPLETED);
    expect(parseActionStatusLabel("Cancelled")).toBe(ActionTakenStatus.CANCELLED);
    expect(parseActionStatusLabel("IN_PROGRESS")).toBeNull();
    expect(parseActionStatusLabel("Unknown")).toBeNull();
    expect(actionStatusLabel(ActionTakenStatus.IN_PROGRESS)).toBe("In Progress");
  });

  it("AT-U-03: counts Action text by Unicode code point and normalizes optional text", () => {
    expect(unicodeLength("😀".repeat(2000))).toBe(2000);
    expect(normalizeOptionalText(`  ${"😀".repeat(2000)}  `)).toEqual({ value: "😀".repeat(2000), valid: true });
    expect(normalizeOptionalText("😀".repeat(2001))).toEqual({ value: null, valid: false });
    expect(normalizeOptionalText("   ")).toEqual({ value: null, valid: true });
  });

  it("TIME-U-01: normalizes timezone offsets, permits backdating, and rejects >5 minute future values", () => {
    const now = Date.parse("2026-09-30T07:00:00.000Z");
    const utc = parseActionBusinessTime("2026-09-30T06:30:00.000Z", now);
    const offset = parseActionBusinessTime("2026-09-30T13:30:00+07:00", now);
    expect(utc?.toISOString()).toBe("2026-09-30T06:30:00.000Z");
    expect(offset?.toISOString()).toBe(utc?.toISOString());
    expect(parseActionBusinessTime("2025-01-01T00:00:00Z", now)).not.toBeNull();
    expect(parseActionBusinessTime("2026-09-30T07:05:00Z", now)).not.toBeNull();
    expect(parseActionBusinessTime("2026-09-30T07:05:00.001Z", now)).toBeNull();
    expect(parseActionBusinessTime("2026-09-30T14:00:00", now)).toBeNull();
    expect(parseActionBusinessTime("2026-02-31T06:30:00Z", now)).toBeNull();
  });

  it("validates canonical UUID and positive integer tokens", () => {
    expect(isCanonicalUuid("b56d2fe5-4972-49ec-963d-b271d58d8219")).toBe(true);
    expect(isCanonicalUuid("not-a-uuid")).toBe(false);
    expect(parsePositiveInteger(1)).toBe(1);
    expect(parsePositiveInteger(0)).toBeNull();
    expect(parsePositiveInteger("1")).toBeNull();
  });

  it("AT-U-05: create fingerprint is stable for original logical create intent and changes when intent changes", () => {
    const base = {
      createdById: 10,
      actionDateTime: new Date("2026-09-30T08:00:00.000Z"),
      description: "Inspect logs",
      assigneeId: 20,
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
    };
    const first = createActionFingerprint(base);
    const second = createActionFingerprint({ ...base });
    const changed = createActionFingerprint({ ...base, assigneeId: 21 });
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).toBe(first);
    expect(changed).not.toBe(first);
  });
});
