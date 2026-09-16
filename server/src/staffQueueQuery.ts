export const STAFF_QUEUE_STATUSES = [
  "New",
  "Open",
  "In Progress",
  "Waiting for Requester",
  "Resolved",
  "Closed",
  "Reopened",
  "Cancelled",
] as const;

export const STAFF_QUEUE_PRIORITIES = ["Low", "Medium", "High"] as const;
export const STAFF_QUEUE_SORTS = [
  "updated_desc",
  "created_desc",
  "created_asc",
  "priority_desc",
  "ticket_number_asc",
] as const;

export type StaffQueueSort = (typeof STAFF_QUEUE_SORTS)[number];

export interface ParsedStaffQueueQuery {
  search?: string;
  status?: string;
  requestedPriority?: string;
  itPriority?: string | null;
  owner?: "unassigned" | "mine" | number;
  categoryId?: number;
  relatedSystemId?: number;
  sort: StaffQueueSort;
  page: number;
  pageSize: number;
}

function single(raw: unknown): string | undefined {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return undefined;
}

function positiveInt(raw: unknown, field: string, errors: Record<string, string>): number | undefined {
  const value = single(raw);
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    errors[field] = `${field} must be a positive integer`;
    return undefined;
  }
  return parsed;
}

export function validateStaffQueueQuery(raw: Record<string, unknown>): {
  errors: Record<string, string>;
  parsed: ParsedStaffQueueQuery | null;
} {
  const errors: Record<string, string> = {};

  const searchRaw = single(raw.search);
  const search = searchRaw?.trim() || undefined;
  if (search && Array.from(search).length > 100) {
    errors.search = "search must be at most 100 characters";
  }

  const statusRaw = single(raw.status);
  const status = statusRaw || undefined;
  if (status && !(STAFF_QUEUE_STATUSES as readonly string[]).includes(status)) {
    errors.status = "status is not a supported Ticket status";
  }

  const requestedRaw = single(raw.requestedPriority);
  const requestedPriority = requestedRaw || undefined;
  if (requestedPriority && !(STAFF_QUEUE_PRIORITIES as readonly string[]).includes(requestedPriority)) {
    errors.requestedPriority = "requestedPriority must be Low, Medium, or High";
  }

  const itPriorityRaw = single(raw.itPriority);
  let itPriority: string | null | undefined;
  if (itPriorityRaw === "not_recorded") itPriority = null;
  else if (itPriorityRaw) {
    if (!(STAFF_QUEUE_PRIORITIES as readonly string[]).includes(itPriorityRaw)) {
      errors.itPriority = "itPriority must be Low, Medium, High, or not_recorded";
    } else {
      itPriority = itPriorityRaw;
    }
  }

  const ownerRaw = single(raw.owner);
  let owner: ParsedStaffQueueQuery["owner"];
  if (ownerRaw) {
    if (ownerRaw === "unassigned" || ownerRaw === "mine") owner = ownerRaw;
    else {
      const value = Number(ownerRaw);
      if (!Number.isInteger(value) || value <= 0) errors.owner = "owner must be unassigned, mine, or a positive user id";
      else owner = value;
    }
  }

  const categoryId = positiveInt(raw.categoryId, "categoryId", errors);
  const relatedSystemId = positiveInt(raw.relatedSystemId, "relatedSystemId", errors);

  const sortRaw = single(raw.sort);
  let sort: StaffQueueSort = "updated_desc";
  if (sortRaw) {
    if (!(STAFF_QUEUE_SORTS as readonly string[]).includes(sortRaw)) errors.sort = `sort must be one of ${STAFF_QUEUE_SORTS.join(", ")}`;
    else sort = sortRaw as StaffQueueSort;
  }

  let page = 1;
  const pageRaw = single(raw.page);
  if (pageRaw) {
    const value = Number(pageRaw);
    if (!Number.isInteger(value) || value < 1) errors.page = "page must be an integer >= 1";
    else page = value;
  }

  let pageSize = 10;
  const pageSizeRaw = single(raw.pageSize);
  if (pageSizeRaw) {
    const value = Number(pageSizeRaw);
    if (!Number.isInteger(value) || value < 1 || value > 50) errors.pageSize = "pageSize must be an integer between 1 and 50";
    else pageSize = value;
  }

  if (Object.keys(errors).length) return { errors, parsed: null };
  return {
    errors: {},
    parsed: {
      search,
      status,
      requestedPriority,
      itPriority,
      owner,
      categoryId,
      relatedSystemId,
      sort,
      page,
      pageSize,
    },
  };
}
