import { describe, it, expect } from "vitest";
import { filterActiveRequesters } from "../../src/requesterFilter.js";

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
