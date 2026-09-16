import { describe, expect, it } from "vitest";
import { validateStaffQueueQuery } from "../../src/staffQueueQuery.js";

describe("IT Staff Queue query validation", () => {
  it("U-11: parses documented defaults and valid filters", () => {
    expect(validateStaffQueueQuery({}).parsed).toEqual({
      search: undefined,
      status: undefined,
      requestedPriority: undefined,
      itPriority: undefined,
      owner: undefined,
      categoryId: undefined,
      relatedSystemId: undefined,
      sort: "updated_desc",
      page: 1,
      pageSize: 10,
    });

    const valid = validateStaffQueueQuery({
      search: " requester ",
      status: "In Progress",
      requestedPriority: "High",
      itPriority: "not_recorded",
      owner: "12",
      categoryId: "3",
      relatedSystemId: "4",
      sort: "priority_desc",
      page: "2",
      pageSize: "25",
    });
    expect(valid.errors).toEqual({});
    expect(valid.parsed).toMatchObject({
      search: "requester",
      status: "In Progress",
      requestedPriority: "High",
      itPriority: null,
      owner: 12,
      categoryId: 3,
      relatedSystemId: 4,
      sort: "priority_desc",
      page: 2,
      pageSize: 25,
    });
  });

  it("U-12: rejects invalid queue values with field errors", () => {
    const result = validateStaffQueueQuery({
      search: "x".repeat(101),
      status: "Unknown",
      requestedPriority: "Urgent",
      itPriority: "Urgent",
      owner: "0",
      categoryId: "nope",
      relatedSystemId: "-1",
      sort: "bad",
      page: "0",
      pageSize: "51",
    });
    expect(result.parsed).toBeNull();
    expect(Object.keys(result.errors).sort()).toEqual([
      "categoryId", "itPriority", "owner", "page", "pageSize", "relatedSystemId",
      "requestedPriority", "search", "sort", "status",
    ].sort());
  });
});
