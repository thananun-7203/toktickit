import { describe, it, expect } from "vitest";
import { filterActiveRequesters } from "../../src/requesterFilter.js";
import { buildTicketNumber, isTicketNumberConflict } from "../../src/ticketNumber.js";
import { validateTicketInput, SUMMARY_MAX, DESCRIPTION_MAX } from "../../src/ticketValidation.js";

// Lab 2 Issue 2 — Unit tests (U-3) for the requester activity filter (BR-6).
// Pure helper tested without a database connection.

const REQUESTERS = [
  { id: 1, name: "Somchai Jaidee", email: "somchai@toktick.it", isActive: true },
  { id: 2, name: "Somsri Rakdee", email: "somsri@toktick.it", isActive: true },
  { id: 3, name: "Noppadol Sitthirit", email: "noppadol@toktick.it", isActive: false },
];

describe("filterActiveRequesters (U-3)", () => {
  it("excludes inactive requesters from the selectable list", () => {
    const result = filterActiveRequesters(REQUESTERS);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.isActive)).toBe(true);
    expect(result.map((r) => r.email)).not.toContain("noppadol@toktick.it");
  });

  it("returns an empty array when given no requesters", () => {
    expect(filterActiveRequesters([])).toEqual([]);
  });
});

describe("buildTicketNumber (U-1)", () => {
  it("produces TKT-YYYY-NNNNN with zero-padded sequence", () => {
    expect(buildTicketNumber(2026, 1)).toBe("TKT-2026-00001");
    expect(buildTicketNumber(2026, 42)).toBe("TKT-2026-00042");
    expect(buildTicketNumber(2027, 99999)).toBe("TKT-2027-99999");
  });

  it("matches the required annual-reset regex pattern", () => {
    for (const s of [1, 7, 123, 12345]) {
      expect(buildTicketNumber(2026, s)).toMatch(/^TKT-\d{4}-\d{5}$/);
    }
  });
});

describe("validateTicketInput (U-2, U-4)", () => {
  const valid = {
    categoryId: 1,
    relatedSystemId: 1,
    summary: "Cannot export report",
    description: "Export button spins forever.",
  };

  it("accepts a valid payload (no errors)", () => {
    expect(validateTicketInput(valid)).toEqual({});
  });

  it("rejects a summary longer than the max (U-2)", () => {
    const errors = validateTicketInput({
      ...valid,
      summary: "a".repeat(SUMMARY_MAX + 1),
    });
    expect(errors.summary).toContain(`${SUMMARY_MAX} characters`);
  });

  it("rejects a description longer than the max (U-2)", () => {
    const errors = validateTicketInput({
      ...valid,
      description: "b".repeat(DESCRIPTION_MAX + 1),
    });
    expect(errors.description).toContain(`${DESCRIPTION_MAX} characters`);
  });

  it("rejects missing required fields (U-4)", () => {
    const errors = validateTicketInput({});
    expect(errors).toMatchObject({
      categoryId: expect.any(String),
      relatedSystemId: expect.any(String),
      summary: expect.any(String),
      description: expect.any(String),
    });
  });

  it("rejects non-positive / non-integer category being 400", () => {
    for (const bad of [0, -1, 1.5, "1"]) {
      const errors = validateTicketInput({ ...valid, categoryId: bad });
      expect(errors.categoryId).toContain("positive integer");
    }
  });

  it("validates length against the trimmed value", () => {
    // The raw value is over the limit only because of surrounding whitespace;
    // after trim it is within limits, so it must pass.
    const ok = `  ${"a".repeat(SUMMARY_MAX)}  `;
    expect(validateTicketInput({ ...valid, summary: ok })).toEqual({});
  });
});

describe("isTicketNumberConflict (retry helper)", () => {
  it("returns true for a P2002 ticketNumber unique violation", () => {
    expect(isTicketNumberConflict({ code: "P2002", meta: { target: ["ticketNumber"] } })).toBe(true);
    expect(isTicketNumberConflict({ code: "P2002", meta: { target: "ticketNumber" } })).toBe(true);
    expect(isTicketNumberConflict({ code: "P2002" })).toBe(true); // no target => conservative
  });

  it("returns false for non-P2002 or non-ticketNumber violations", () => {
    expect(isTicketNumberConflict({ code: "P2002", meta: { target: ["email"] } })).toBe(false);
    expect(isTicketNumberConflict({ code: "P2003" })).toBe(false);
    expect(isTicketNumberConflict(new Error("other"))).toBe(false);
    expect(isTicketNumberConflict(null)).toBe(false);
  });
});

describe("validateTicketQuery (U-5/U-6)", () => {
  // Import dynamically to avoid circular init issues in this file.
  it("applies defaults when query is empty", async () => {
    const { validateTicketQuery } = await import("../../src/ticketQuery.js");
    const { errors, parsed } = validateTicketQuery({});
    expect(errors).toEqual({});
    expect(parsed).toMatchObject({ sort: "newest", page: 1, pageSize: 10 });
    expect(parsed?.search).toBeUndefined();
  });

  it("parses search/category/sort/page correctly", async () => {
    const { validateTicketQuery } = await import("../../src/ticketQuery.js");
    const { errors, parsed } = validateTicketQuery({
      search: "  report  ",
      categoryId: "2",
      sort: "summary_asc",
      page: "2",
      pageSize: "5",
    });
    expect(errors).toEqual({});
    expect(parsed).toMatchObject({
      search: "report",
      categoryId: 2,
      sort: "summary_asc",
      page: 2,
      pageSize: 5,
    });
  });

  it("rejects invalid page/sort/ids with per-field errors", async () => {
    const { validateTicketQuery } = await import("../../src/ticketQuery.js");
    const { errors, parsed } = validateTicketQuery({
      page: "0",
      pageSize: "100",
      sort: "bad",
      categoryId: "-1",
    });
    expect(parsed).toBeNull();
    expect(errors.page).toMatch(/page/);
    expect(errors.pageSize).toMatch(/pageSize/);
    expect(errors.sort).toMatch(/sort/);
    expect(errors.categoryId).toMatch(/positive integer/);
  });

  it("treats blank search as no filter", async () => {
    const { validateTicketQuery } = await import("../../src/ticketQuery.js");
    const { errors, parsed } = validateTicketQuery({ search: "   " });
    expect(errors).toEqual({});
    expect(parsed?.search).toBeUndefined();
  });
});
