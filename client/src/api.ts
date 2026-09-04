const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const DEV_REQUESTER_HEADER = "X-Dev-Requester-Id";

export interface Category {
  id: number;
  name: string;
}

export interface Requester {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  status: string;
  createdAt: string;
  requester: { id: number; name: string };
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
}

export interface Attachment {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  removedAt: string | null;
  removalReason: string | null;
}

export interface TicketDetail extends Ticket {
  attachments: Attachment[];
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export interface NewTicketInput {
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
}

// Issue 2 + Issue 4 — call the backend.
// Loads the health check first, then the categories.
export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error(`Health check failed with status ${healthRes.status}`);
  }
  const health = await healthRes.json();
  if (health.status !== "ok") {
    throw new Error("Health check reported a non-ok status");
  }

  const categoriesRes = await fetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) {
    throw new Error(`Categories request failed with status ${categoriesRes.status}`);
  }

  const categories: Category[] = await categoriesRes.json();

  return { online: true, categories };
}

// Shared fetch wrapper: attaches the X-Dev-Requester-Id header (simulated
// identity, api-spec.md FR-1 / BR-1) when a requester id is supplied by the
// React context owner. Public/reference-data requests can omit requesterId.
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  requesterId?: number,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (requesterId !== undefined) {
    headers.set(DEV_REQUESTER_HEADER, String(requesterId));
  }
  return fetch(`${API_URL}${path}`, { ...init, headers });
}

// Lab 2 Issue 2 — Development Requester selection.
// Loads the active requesters used to populate the selector (FR-2, BR-6).
export async function getRequesters(): Promise<Requester[]> {
  const res = await apiFetch("/api/v1/requesters");
  if (!res.ok) {
    throw new Error(`Requesters request failed with status ${res.status}`);
  }
  return res.json();
}

// Lab 2 Issue 3 — dropdown reference data for the Create Ticket form.
export async function getCategories(): Promise<Category[]> {
  const res = await apiFetch("/api/v1/categories");
  if (!res.ok) {
    throw new Error(`Categories request failed with status ${res.status}`);
  }
  return res.json();
}

export async function getRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await apiFetch("/api/v1/related-systems");
  if (!res.ok) {
    throw new Error(`Related systems request failed with status ${res.status}`);
  }
  return res.json();
}

// Lab 2 Issue 3 — create a new ticket (POST /api/v1/tickets).
export async function createTicket(input: NewTicketInput, requesterId: number): Promise<Ticket> {
  const res = await apiFetch("/api/v1/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  }, requesterId);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Carry both the top-level message and any per-field validation errors so
    // the UI can render field errors below the matching inputs.
    const err = new Error(
      (data?.error?.message as string) ?? "Unable to create ticket",
    ) as TicketError;
    err.fields = data?.error?.fields as Record<string, string> | undefined;
    throw err;
  }
  return data as Ticket;
}

// Lab 2 Issue 4 — My Tickets list (GET /api/v1/tickets).
export interface GetTicketsParams {
  search?: string;
  categoryId?: number;
  relatedSystemId?: number;
  sort?: "newest" | "oldest" | "summary_asc";
  page?: number;
  pageSize?: number;
}

export interface GetTicketsResponse {
  items: Ticket[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export async function getTickets(
  params: GetTicketsParams = {},
  requesterId: number,
): Promise<GetTicketsResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.categoryId) qs.set("categoryId", String(params.categoryId));
  if (params.relatedSystemId) qs.set("relatedSystemId", String(params.relatedSystemId));
  if (params.sort) qs.set("sort", params.sort);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/api/v1/tickets${suffix}`, {}, requesterId);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message ?? `Failed to load tickets (${res.status})`);
  }
  return res.json();
}

export async function getTicketDetail(id: number, requesterId: number): Promise<TicketDetail> {
  const res = await apiFetch(`/api/v1/tickets/${id}`, {}, requesterId);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error?.message ?? `Failed to load ticket (${res.status})`, res.status);
  }
  return data as TicketDetail;
}

export async function uploadAttachments(
  ticketId: number,
  files: File[],
  requesterId: number,
): Promise<Attachment[]> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  const res = await apiFetch(
    `/api/v1/tickets/${ticketId}/attachments`,
    { method: "POST", body: form },
    requesterId,
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error?.message ?? `Failed to upload attachments (${res.status})`, res.status);
  }
  return data as Attachment[];
}

export async function removeAttachment(id: number, requesterId: number, reason: string): Promise<Attachment> {
  const res = await apiFetch(
    `/api/v1/attachments/${id}`,
    { method: "DELETE", body: JSON.stringify({ reason }) },
    requesterId,
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error?.message ?? `Failed to remove attachment (${res.status})`, res.status);
  }
  return data as Attachment;
}

export async function downloadAttachment(
  id: number,
  requesterId: number,
): Promise<{ blob: Blob; fileName: string }> {
  const res = await apiFetch(`/api/v1/attachments/${id}/download`, {}, requesterId);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data?.error?.message ?? `Failed to download attachment (${res.status})`, res.status);
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/i);
  return {
    blob: await res.blob(),
    fileName: match?.[1] ?? "attachment",
  };
}

// Error thrown by createTicket; carries optional per-field validation messages.
export interface TicketError extends Error {
  fields?: Record<string, string>;
}
