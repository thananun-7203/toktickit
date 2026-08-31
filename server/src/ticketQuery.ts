// Lab 2 Issue 4 — My Tickets query validation + helpers (FR-5).
// Pure functions so they can be unit-tested without a database.
// Query comes from req.query (all strings). Validates per api-spec.md section 3.

export const SORT_OPTIONS = ["newest", "oldest", "summary_asc"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const DEFAULT_SORT: SortOption = "newest";
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_MAX = 50;

export interface ParsedTicketQuery {
  search?: string;
  categoryId?: number;
  relatedSystemId?: number;
  sort: SortOption;
  page: number;
  pageSize: number;
}

function toSingle(value: unknown): string | undefined {
  if (Array.isArray(value)) return value[0] as string | undefined;
  if (typeof value === "string") return value;
  if (value == null) return undefined;
  return undefined;
}

// Validates raw query (req.query) and returns either errors or parsed values.
export function validateTicketQuery(raw: Record<string, unknown>): {
  errors: Record<string, string>;
  parsed: ParsedTicketQuery | null;
} {
  const errors: Record<string, string> = {};

  // search: optional, trimmed; empty => undefined (no filter)
  const rawSearch = toSingle(raw.search);
  let search: string | undefined;
  if (rawSearch !== undefined) {
    const trimmed = rawSearch.trim();
    if (trimmed.length > 0) search = trimmed;
  }

  // categoryId: optional, must be positive int if provided
  let categoryId: number | undefined;
  const rawCategoryId = toSingle(raw.categoryId);
  if (rawCategoryId !== undefined && rawCategoryId !== "") {
    const n = Number(rawCategoryId);
    if (!Number.isInteger(n) || n <= 0) {
      errors.categoryId = "categoryId must be a positive integer";
    } else {
      categoryId = n;
    }
  }

  // relatedSystemId: same
  let relatedSystemId: number | undefined;
  const rawRelatedSystemId = toSingle(raw.relatedSystemId);
  if (rawRelatedSystemId !== undefined && rawRelatedSystemId !== "") {
    const n = Number(rawRelatedSystemId);
    if (!Number.isInteger(n) || n <= 0) {
      errors.relatedSystemId = "relatedSystemId must be a positive integer";
    } else {
      relatedSystemId = n;
    }
  }

  // sort: must be one of SORT_OPTIONS
  let sort: SortOption = DEFAULT_SORT;
  const rawSort = toSingle(raw.sort);
  if (rawSort !== undefined && rawSort !== "") {
    if ((SORT_OPTIONS as readonly string[]).includes(rawSort)) {
      sort = rawSort as SortOption;
    } else {
      errors.sort = `sort must be one of ${SORT_OPTIONS.join(", ")}`;
    }
  }

  // page: int >=1
  let page = DEFAULT_PAGE;
  const rawPage = toSingle(raw.page);
  if (rawPage !== undefined && rawPage !== "") {
    const n = Number(rawPage);
    if (!Number.isInteger(n) || n < 1) {
      errors.page = "page must be an integer >= 1";
    } else {
      page = n;
    }
  }

  // pageSize: int 1-50
  let pageSize = DEFAULT_PAGE_SIZE;
  const rawPageSize = toSingle(raw.pageSize);
  if (rawPageSize !== undefined && rawPageSize !== "") {
    const n = Number(rawPageSize);
    if (!Number.isInteger(n) || n < 1 || n > PAGE_SIZE_MAX) {
      errors.pageSize = `pageSize must be an integer between 1 and ${PAGE_SIZE_MAX}`;
    } else {
      pageSize = n;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors, parsed: null };
  }

  return {
    errors: {},
    parsed: { search, categoryId, relatedSystemId, sort, page, pageSize },
  };
}

// Builds Prisma orderBy for the tickets list.
export function toPrismaOrderBy(sort: SortOption): Array<Record<string, string>> {
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "summary_asc":
      return [{ summary: "asc" }, { id: "asc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}
