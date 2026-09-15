const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export const REQUESTED_PRIORITIES = ["Low", "Medium", "High"] as const;
export type RequestedPriority = (typeof REQUESTED_PRIORITIES)[number];

export interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority | null;
  itPriority?: RequestedPriority | null;
  status: string;
  problemAppearsResolvedAt?: string | null;
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
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface PublicComment {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; name: string; role: UserRole };
}

export interface NewTicketInput {
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: RequestedPriority;
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

  const categoriesRes = await apiFetch("/api/categories");
  if (!categoriesRes.ok) {
    throw new Error(`Categories request failed with status ${categoriesRes.status}`);
  }

  const categories: Category[] = await categoriesRes.json();

  return { online: true, categories };
}

// Shared credentialed fetch wrapper for Lab 3. Requester identity comes only
// from the HttpOnly server session cookie; client-supplied requester ids are
// never attached as identity proof.
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
}

async function responseError(res: Response, fallback: string): Promise<ApiError> {
  const data = await res.json().catch(() => ({}));
  return new ApiError(
    data?.error?.message ?? fallback,
    res.status,
    data?.error?.code,
    data?.error?.fields,
  );
}

export async function getCurrentUser(): Promise<AuthUser> {
  const res = await apiFetch("/api/v1/auth/me");
  if (!res.ok) throw await responseError(res, "Unable to load current user");
  return res.json();
}

export async function login(email: string, password: string): Promise<{ user: AuthUser; nextAction: "CHANGE_PASSWORD" | "APPLICATION" }> {
  const res = await apiFetch("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw await responseError(res, "Unable to sign in");
  return res.json();
}

export async function logout(): Promise<void> {
  const res = await apiFetch("/api/v1/auth/logout", { method: "POST" });
  if (!res.ok) throw await responseError(res, "Unable to sign out");
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ user: AuthUser }> {
  const res = await apiFetch("/api/v1/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await responseError(res, "Unable to change password");
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
export async function createTicket(input: NewTicketInput): Promise<Ticket> {
  const res = await apiFetch("/api/v1/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
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
): Promise<GetTicketsResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.categoryId) qs.set("categoryId", String(params.categoryId));
  if (params.relatedSystemId) qs.set("relatedSystemId", String(params.relatedSystemId));
  if (params.sort) qs.set("sort", params.sort);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/api/v1/tickets${suffix}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message ?? `Failed to load tickets (${res.status})`);
  }
  return res.json();
}

export async function getTicketDetail(id: number): Promise<TicketDetail> {
  const res = await apiFetch(`/api/v1/tickets/${id}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error?.message ?? `Failed to load ticket (${res.status})`, res.status);
  }
  return data as TicketDetail;
}

export async function uploadAttachments(
  ticketId: number,
  files: File[],
): Promise<Attachment[]> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  const res = await apiFetch(`/api/v1/tickets/${ticketId}/attachments`, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error?.message ?? `Failed to upload attachments (${res.status})`, res.status);
  }
  return data as Attachment[];
}

export async function removeAttachment(id: number, reason: string): Promise<Attachment> {
  const res = await apiFetch(
    `/api/v1/attachments/${id}`,
    { method: "DELETE", body: JSON.stringify({ reason }) },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error?.message ?? `Failed to remove attachment (${res.status})`, res.status);
  }
  return data as Attachment;
}

export async function downloadAttachment(
  id: number,
): Promise<{ blob: Blob; fileName: string }> {
  const res = await apiFetch(`/api/v1/attachments/${id}/download`);
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

export async function getPublicComments(ticketId: number): Promise<PublicComment[]> {
  const res = await apiFetch(`/api/v1/tickets/${ticketId}/public-comments`);
  if (!res.ok) throw await responseError(res, "Unable to load public comments");
  const data = await res.json();
  return data.items as PublicComment[];
}

export async function postPublicComment(ticketId: number, content: string): Promise<PublicComment> {
  const res = await apiFetch(`/api/v1/tickets/${ticketId}/public-comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw await responseError(res, "Unable to post public comment");
  return res.json();
}

export async function indicateProblemAppearsResolved(ticketId: number): Promise<{
  ticketId: number;
  problemAppearsResolvedAt: string;
  status: string;
}> {
  const res = await apiFetch(`/api/v1/tickets/${ticketId}/problem-appears-resolved`, {
    method: "POST",
  });
  if (!res.ok) throw await responseError(res, "Unable to record resolution indication");
  return res.json();
}

// Error thrown by createTicket; carries optional per-field validation messages.
export interface TicketError extends Error {
  fields?: Record<string, string>;
}
