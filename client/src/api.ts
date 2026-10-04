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
  version?: number;
  workflowCycle?: number;
  resolvedAt?: string | null;
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
  version: number;
  workflowCycle: number;
  resolvedAt?: string | null;
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

export const TICKET_STATUSES = [
  "New",
  "Open",
  "In Progress",
  "Waiting for Requester",
  "Resolved",
  "Closed",
  "Reopened",
  "Cancelled",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export type StaffQueueSort =
  | "updated_desc"
  | "created_desc"
  | "created_asc"
  | "priority_desc"
  | "ticket_number_asc";

export interface StaffAssignee {
  id: number;
  name: string;
  email: string;
  role: "IT_STAFF" | "ADMINISTRATOR";
}

export interface StaffQueueTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: RequestedPriority | null;
  itPriority: RequestedPriority | null;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  requester: { id: number; name: string; email: string };
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  owner: StaffAssignee | null;
}

export interface StaffQueueParams {
  search?: string;
  status?: TicketStatus | "active";
  requestedPriority?: RequestedPriority;
  itPriority?: RequestedPriority | "not_recorded";
  owner?: "unassigned" | "mine" | number;
  categoryId?: number;
  relatedSystemId?: number;
  sort?: StaffQueueSort;
  page?: number;
  pageSize?: number;
}

export interface StaffQueueResponse {
  items: StaffQueueTicket[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface StaffTicketDetail extends StaffQueueTicket {
  description: string;
  problemAppearsResolvedAt: string | null;
  version: number;
  workflowCycle: number;
  resolvedAt: string | null;
  attachments: Attachment[];
}

export interface InternalNote {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; name: string; role: UserRole };
}

export interface InternalNotesResponse {
  items: InternalNote[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface StaffDashboardTicketSummary {
  id: number;
  ticketNumber: string;
  summary: string;
  status: TicketStatus;
  itPriority: RequestedPriority | null;
  updatedAt: string;
}

export interface StaffDashboardActionSummary {
  id: number;
  ticketId: number;
  description: string;
  status: ActionTakenStatus;
  updatedAt: string;
  assignee: { id: number; name: string };
  ticket: { ticketNumber: string; summary: string };
}

export interface StaffDashboardResponse {
  metrics: {
    unassignedActiveTickets: number;
    myActiveTickets: number;
    byStatus: Record<TicketStatus, number>;
    activeByItPriority: Record<RequestedPriority | "Not recorded", number>;
  };
  myActiveActions: StaffDashboardActionSummary[];
  recentlyUpdatedTickets: StaffDashboardTicketSummary[];
  urgentTickets: StaffDashboardTicketSummary[];
}

export interface RequesterDashboardTicketSummary {
  id: number;
  ticketNumber: string;
  summary: string;
  status: TicketStatus;
  itPriority: RequestedPriority | null;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface RequesterDashboardResponse {
  metrics: {
    openTickets: number;
    waitingForYou: number;
  };
  recentlyUpdatedTickets: RequesterDashboardTicketSummary[];
  recentlyResolvedTickets: RequesterDashboardTicketSummary[];
}

export const ACTION_TAKEN_STATUSES = ["Planned", "In Progress", "Completed", "Cancelled"] as const;
export type ActionTakenStatus = (typeof ACTION_TAKEN_STATUSES)[number];
export const ACTION_FOLLOW_UP_STATUSES = ["NOT_REQUIRED", "OUTSTANDING", "COMPLETED"] as const;
export type ActionFollowUpStatus = (typeof ACTION_FOLLOW_UP_STATUSES)[number];

export interface ActionActor {
  id: number;
  name: string;
  role: UserRole;
}

export interface ActionTaken {
  id: number;
  ticketId: number;
  clientRequestId: string;
  workflowCycle: number;
  actionDateTime: string;
  description: string;
  result: string | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  followUpStatus: ActionFollowUpStatus;
  followUpCompletedBy: ActionActor | null;
  followUpCompletedAt: string | null;
  attachmentNotes: string | null;
  status: ActionTakenStatus;
  createdBy: ActionActor;
  assignee: ActionActor;
  performedBy: ActionActor | null;
  completedAt: string | null;
  cancelledBy: ActionActor | null;
  cancelledAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActionTakenInput {
  clientRequestId: string;
  expectedTicketVersion: number;
  actionDateTime: string;
  description: string;
  assigneeId: number;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
}

export interface UpdateActionTakenInput {
  expectedVersion: number;
  expectedTicketVersion: number;
  actionDateTime?: string;
  description?: string;
  assigneeId?: number;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
}

export interface UpdateActionStatusInput {
  status: ActionTakenStatus;
  expectedVersion: number;
  expectedTicketVersion: number;
  result?: string;
  followUpRequired?: boolean;
  followUpNote?: string | null;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserListParams {
  search?: string;
  role?: UserRole;
}

export interface CreateAdminUserInput {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  initialPassword: string;
}

export interface UpdateAdminUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
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
  status?: TicketStatus;
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
  if (params.status) qs.set("status", params.status);
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

export async function indicateProblemAppearsResolved(ticketId: number, expectedVersion: number): Promise<{
  ticketId: number;
  problemAppearsResolvedAt: string;
  status: string;
  version: number;
}> {
  const res = await apiFetch(`/api/v1/tickets/${ticketId}/problem-appears-resolved`, {
    method: "POST",
    body: JSON.stringify({ expectedVersion }),
  });
  if (!res.ok) throw await responseError(res, "Unable to record resolution indication");
  return res.json();
}

export async function getStaffQueue(params: StaffQueueParams = {}): Promise<StaffQueueResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.requestedPriority) qs.set("requestedPriority", params.requestedPriority);
  if (params.itPriority) qs.set("itPriority", params.itPriority);
  if (params.owner !== undefined) qs.set("owner", String(params.owner));
  if (params.categoryId) qs.set("categoryId", String(params.categoryId));
  if (params.relatedSystemId) qs.set("relatedSystemId", String(params.relatedSystemId));
  if (params.sort) qs.set("sort", params.sort);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/api/v1/staff/tickets${suffix}`);
  if (!res.ok) throw await responseError(res, "Unable to load Ticket Queue");
  return res.json();
}

export async function getStaffAssignees(): Promise<StaffAssignee[]> {
  const res = await apiFetch("/api/v1/staff/assignees");
  if (!res.ok) throw await responseError(res, "Unable to load staff assignees");
  return res.json();
}

export async function getStaffTicketDetail(id: number): Promise<StaffTicketDetail> {
  const res = await apiFetch(`/api/v1/staff/tickets/${id}`);
  if (!res.ok) throw await responseError(res, "Unable to load Ticket Detail");
  return res.json();
}

export async function updateStaffTicketOwner(
  ticketId: number,
  input: ({ action: "claim" } | { action: "assign"; ownerId: number }) & { expectedVersion: number },
): Promise<Pick<StaffTicketDetail, "id" | "owner" | "version" | "updatedAt">> {
  const res = await apiFetch(`/api/v1/staff/tickets/${ticketId}/owner`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await responseError(res, "Unable to update Ticket owner");
  return res.json();
}

export async function updateStaffTicketItPriority(
  ticketId: number,
  itPriority: RequestedPriority,
  expectedVersion: number,
): Promise<Pick<StaffTicketDetail, "id" | "requestedPriority" | "itPriority" | "version" | "updatedAt">> {
  const res = await apiFetch(`/api/v1/staff/tickets/${ticketId}/it-priority`, {
    method: "PATCH",
    body: JSON.stringify({ itPriority, expectedVersion }),
  });
  if (!res.ok) throw await responseError(res, "Unable to update IT Priority");
  return res.json();
}

export async function updateStaffTicketStatus(
  ticketId: number,
  status: TicketStatus,
  expectedVersion: number,
): Promise<Pick<StaffTicketDetail, "id" | "status" | "problemAppearsResolvedAt" | "resolvedAt" | "workflowCycle" | "version" | "updatedAt">> {
  const res = await apiFetch(`/api/v1/staff/tickets/${ticketId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, expectedVersion }),
  });
  if (!res.ok) throw await responseError(res, "Unable to update Ticket status");
  return res.json();
}

export async function getInternalNotes(
  ticketId: number,
  page = 1,
  pageSize = 50,
): Promise<InternalNotesResponse> {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const res = await apiFetch(`/api/v1/staff/tickets/${ticketId}/internal-notes?${qs.toString()}`);
  if (!res.ok) throw await responseError(res, "Unable to load Internal Notes");
  return res.json();
}

export async function postInternalNote(ticketId: number, content: string): Promise<InternalNote> {
  const res = await apiFetch(`/api/v1/staff/tickets/${ticketId}/internal-notes`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw await responseError(res, "Unable to post Internal Note");
  return res.json();
}

export async function getStaffDashboard(): Promise<StaffDashboardResponse> {
  const res = await apiFetch("/api/v1/staff/dashboard");
  if (!res.ok) throw await responseError(res, "Unable to load Staff Dashboard");
  return res.json();
}

export async function getRequesterDashboard(): Promise<RequesterDashboardResponse> {
  const res = await apiFetch("/api/v1/requester/dashboard");
  if (!res.ok) throw await responseError(res, "Unable to load Requester Dashboard");
  return res.json();
}

export async function getActionsTaken(ticketId: number): Promise<ActionTaken[]> {
  const res = await apiFetch(`/api/v1/tickets/${ticketId}/actions-taken`);
  if (!res.ok) throw await responseError(res, "Unable to load Actions Taken");
  const data = await res.json();
  return data.items as ActionTaken[];
}

export async function createStaffActionTaken(
  ticketId: number,
  input: CreateActionTakenInput,
): Promise<{ action: ActionTaken; created: boolean }> {
  const res = await apiFetch(`/api/v1/staff/tickets/${ticketId}/actions-taken`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await responseError(res, "Unable to create Action Taken");
  return { action: await res.json() as ActionTaken, created: res.status === 201 };
}

export async function updateStaffActionTaken(
  actionId: number,
  input: UpdateActionTakenInput,
): Promise<ActionTaken> {
  const res = await apiFetch(`/api/v1/staff/actions-taken/${actionId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await responseError(res, "Unable to update Action Taken");
  return res.json();
}

export async function updateStaffActionStatus(
  actionId: number,
  input: UpdateActionStatusInput,
): Promise<ActionTaken> {
  const res = await apiFetch(`/api/v1/staff/actions-taken/${actionId}/status`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await responseError(res, "Unable to update Action status");
  return res.json();
}

export async function completeStaffActionFollowUp(
  actionId: number,
  expectedVersion: number,
  expectedTicketVersion: number,
): Promise<ActionTaken> {
  const res = await apiFetch(`/api/v1/staff/actions-taken/${actionId}/follow-up`, {
    method: "PATCH",
    body: JSON.stringify({ expectedVersion, expectedTicketVersion }),
  });
  if (!res.ok) throw await responseError(res, "Unable to complete Action follow-up");
  return res.json();
}

export async function getAdminUsers(params: AdminUserListParams = {}): Promise<AdminUser[]> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.role) qs.set("role", params.role);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/api/v1/admin/users${suffix}`);
  if (!res.ok) throw await responseError(res, "Unable to load users");
  const data = await res.json();
  return data.items as AdminUser[];
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminUser> {
  const res = await apiFetch("/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await responseError(res, "Unable to create user");
  return res.json();
}

export async function updateAdminUser(userId: number, input: UpdateAdminUserInput): Promise<AdminUser> {
  const res = await apiFetch(`/api/v1/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await responseError(res, "Unable to update user");
  return res.json();
}

export async function setAdminInitialPassword(
  userId: number,
  initialPassword: string,
  confirmPassword: string,
): Promise<{ id: number; mustChangePassword: true }> {
  const res = await apiFetch(`/api/v1/admin/users/${userId}/initial-password`, {
    method: "POST",
    body: JSON.stringify({ initialPassword, confirmPassword }),
  });
  if (!res.ok) throw await responseError(res, "Unable to set initial password");
  return res.json();
}

// Error thrown by createTicket; carries optional per-field validation messages.
export interface TicketError extends Error {
  fields?: Record<string, string>;
}
