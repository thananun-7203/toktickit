import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  downloadAttachment,
  getInternalNotes,
  getPublicComments,
  getStaffAssignees,
  getStaffTicketDetail,
  InternalNote,
  postInternalNote,
  postPublicComment,
  PublicComment,
  RequestedPriority,
  REQUESTED_PRIORITIES,
  StaffAssignee,
  StaffTicketDetail as StaffTicketDetailModel,
  TicketStatus,
  updateStaffTicketItPriority,
  updateStaffTicketOwner,
  updateStaffTicketStatus,
} from "./api.js";

interface Props {
  ticketId: number;
  currentUserId: number;
  onBack: () => void;
}

type LoadState = "loading" | "success" | "not-found" | "error";
type PanelState = "loading" | "success" | "error";

const MAX_MESSAGE_CHARACTERS = 2000;
const INTERNAL_NOTES_PAGE_SIZE = 20;

const STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  New: ["Open", "Cancelled"],
  Open: ["In Progress", "Waiting for Requester", "Resolved", "Cancelled"],
  "In Progress": ["Waiting for Requester", "Resolved", "Cancelled"],
  "Waiting for Requester": ["In Progress", "Resolved", "Cancelled"],
  Resolved: ["Closed", "Reopened"],
  Closed: ["Reopened"],
  Reopened: ["In Progress", "Waiting for Requester", "Resolved", "Cancelled"],
  Cancelled: ["Reopened"],
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function badgeToken(value: string | null): string {
  return (value ?? "not-recorded").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.code === "OWNER_NOT_ELIGIBLE") {
    return "That owner is no longer eligible. Refresh the assignee list and choose an active IT Staff or Administrator.";
  }
  if (error instanceof ApiError && error.code === "STALE_TICKET_STATE") {
    return "This Ticket changed while you were editing it. Refresh the page state and try again.";
  }
  if (error instanceof ApiError && error.code === "INVALID_STATUS_TRANSITION") {
    return "That status transition is no longer allowed because the Ticket state changed.";
  }
  return error instanceof Error ? error.message : fallback;
}

export default function StaffTicketDetail({ ticketId, currentUserId, onBack }: Props) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [ticket, setTicket] = useState<StaffTicketDetailModel | null>(null);
  const [assignees, setAssignees] = useState<StaffAssignee[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationNotice, setOperationNotice] = useState<string | null>(null);

  const [ownerDraft, setOwnerDraft] = useState("");
  const [priorityDraft, setPriorityDraft] = useState<RequestedPriority>("Medium");
  const [statusDraft, setStatusDraft] = useState<TicketStatus | "">("");
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [priorityBusy, setPriorityBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const [comments, setComments] = useState<PublicComment[]>([]);
  const [commentsState, setCommentsState] = useState<PanelState>("loading");
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [postingComment, setPostingComment] = useState(false);

  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [notesState, setNotesState] = useState<PanelState>("loading");
  const [notesPage, setNotesPage] = useState(1);
  const [notesTotalItems, setNotesTotalItems] = useState(0);
  const [notesTotalPages, setNotesTotalPages] = useState(0);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [postingNote, setPostingNote] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const loadDetail = useCallback(async () => {
    setLoadState("loading");
    setPageError(null);
    try {
      const [detail, nextAssignees] = await Promise.all([
        getStaffTicketDetail(ticketId),
        getStaffAssignees(),
      ]);
      setTicket(detail);
      setAssignees(nextAssignees);
      setOwnerDraft(detail.owner ? String(detail.owner.id) : "");
      setPriorityDraft(detail.itPriority ?? "Medium");
      setStatusDraft("");
      setLoadState("success");
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setTicket(null);
        setLoadState("not-found");
      } else {
        setPageError(errorMessage(error, "Unable to load Ticket Detail"));
        setLoadState("error");
      }
    }
  }, [ticketId]);

  const loadComments = useCallback(async () => {
    setCommentsState("loading");
    try {
      setComments(await getPublicComments(ticketId));
      setCommentsState("success");
    } catch {
      setCommentsState("error");
    }
  }, [ticketId]);

  const loadNotes = useCallback(async (page = notesPage) => {
    setNotesState("loading");
    try {
      const result = await getInternalNotes(ticketId, page, INTERNAL_NOTES_PAGE_SIZE);
      setNotes(result.items);
      setNotesPage(result.page);
      setNotesTotalItems(result.totalItems);
      setNotesTotalPages(result.totalPages);
      setNotesState("success");
    } catch {
      setNotesState("error");
    }
  }, [notesPage, ticketId]);

  useEffect(() => {
    setNotesPage(1);
  }, [ticketId]);

  useEffect(() => {
    void loadDetail();
    void loadComments();
  }, [loadDetail, loadComments]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const allowedStatuses = useMemo(() => ticket ? STATUS_TRANSITIONS[ticket.status] : [], [ticket]);
  const ownerIsCurrentUser = ticket?.owner?.id === currentUserId;

  function beginOperation() {
    setOperationError(null);
    setOperationNotice(null);
  }

  async function handleClaim() {
    if (!ticket) return;
    beginOperation();
    setOwnerBusy(true);
    try {
      const updated = await updateStaffTicketOwner(ticket.id, { action: "claim" });
      setTicket((current) => current ? { ...current, owner: updated.owner, updatedAt: updated.updatedAt } : current);
      setOwnerDraft(updated.owner ? String(updated.owner.id) : "");
      setOperationNotice("Ticket ownership updated.");
    } catch (error) {
      setOperationError(errorMessage(error, "Unable to claim Ticket"));
    } finally {
      setOwnerBusy(false);
    }
  }

  async function handleAssign() {
    if (!ticket || !ownerDraft) return;
    const ownerId = Number(ownerDraft);
    if (!Number.isInteger(ownerId) || ownerId <= 0) return;
    beginOperation();
    setOwnerBusy(true);
    try {
      const updated = await updateStaffTicketOwner(ticket.id, { action: "assign", ownerId });
      setTicket((current) => current ? { ...current, owner: updated.owner, updatedAt: updated.updatedAt } : current);
      setOperationNotice(ticket.owner ? "Ticket reassigned successfully." : "Ticket assigned successfully.");
    } catch (error) {
      setOperationError(errorMessage(error, "Unable to assign Ticket"));
    } finally {
      setOwnerBusy(false);
    }
  }

  async function handlePrioritySave() {
    if (!ticket) return;
    beginOperation();
    setPriorityBusy(true);
    try {
      const updated = await updateStaffTicketItPriority(ticket.id, priorityDraft);
      setTicket((current) => current ? {
        ...current,
        requestedPriority: updated.requestedPriority,
        itPriority: updated.itPriority,
        updatedAt: updated.updatedAt,
      } : current);
      setOperationNotice("IT Priority saved.");
    } catch (error) {
      setOperationError(errorMessage(error, "Unable to update IT Priority"));
    } finally {
      setPriorityBusy(false);
    }
  }

  async function handleStatusSave() {
    if (!ticket || !statusDraft) return;
    if (["Resolved", "Closed", "Reopened", "Cancelled"].includes(statusDraft)) {
      const confirmed = window.confirm(`Change Ticket status from ${ticket.status} to ${statusDraft}?`);
      if (!confirmed) return;
    }
    beginOperation();
    setStatusBusy(true);
    try {
      const updated = await updateStaffTicketStatus(ticket.id, statusDraft);
      setTicket((current) => current ? {
        ...current,
        status: updated.status,
        problemAppearsResolvedAt: updated.problemAppearsResolvedAt,
        updatedAt: updated.updatedAt,
      } : current);
      setStatusDraft("");
      setOperationNotice(`Status changed to ${updated.status}.`);
    } catch (error) {
      setOperationError(errorMessage(error, "Unable to change Ticket status"));
    } finally {
      setStatusBusy(false);
    }
  }

  async function handlePostComment() {
    const content = commentDraft.trim();
    if (!content) {
      setCommentError("Public Comment is required.");
      return;
    }
    if (Array.from(content).length > MAX_MESSAGE_CHARACTERS) {
      setCommentError(`Public Comment must be at most ${MAX_MESSAGE_CHARACTERS} characters.`);
      return;
    }
    setPostingComment(true);
    setCommentError(null);
    try {
      const created = await postPublicComment(ticketId, content);
      setComments((current) => [...current, created]);
      setCommentsState("success");
      setCommentDraft("");
    } catch (error) {
      setCommentError(error instanceof ApiError && error.fields?.content
        ? error.fields.content
        : errorMessage(error, "Unable to post Public Comment"));
    } finally {
      setPostingComment(false);
    }
  }

  async function handlePostNote() {
    const content = noteDraft.trim();
    if (!content) {
      setNoteError("Internal Note is required.");
      return;
    }
    if (Array.from(content).length > MAX_MESSAGE_CHARACTERS) {
      setNoteError(`Internal Note must be at most ${MAX_MESSAGE_CHARACTERS} characters.`);
      return;
    }
    setPostingNote(true);
    setNoteError(null);
    try {
      await postInternalNote(ticketId, content);
      setNoteDraft("");
      const targetPage = Math.max(1, Math.ceil((notesTotalItems + 1) / INTERNAL_NOTES_PAGE_SIZE));
      if (targetPage === notesPage) {
        await loadNotes(targetPage);
      } else {
        setNotesPage(targetPage);
      }
    } catch (error) {
      setNoteError(error instanceof ApiError && error.fields?.content
        ? error.fields.content
        : errorMessage(error, "Unable to post Internal Note"));
    } finally {
      setPostingNote(false);
    }
  }

  async function handleDownload(id: number) {
    setDownloadingId(id);
    setPageError(null);
    try {
      const { blob, fileName } = await downloadAttachment(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setPageError(errorMessage(error, "Unable to download attachment"));
    } finally {
      setDownloadingId(null);
    }
  }

  if (loadState === "loading") {
    return <div className="staff-detail-loading" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Loading Ticket Detail…</div>;
  }

  if (loadState === "not-found") {
    return (
      <section className="zen-card content-card">
        <div className="alert alert-warning">Ticket not found.</div>
        <button type="button" className="btn btn-outline-success" onClick={onBack}>← Back to Ticket Queue</button>
      </section>
    );
  }

  if (loadState === "error" || !ticket) {
    return (
      <section className="zen-card content-card">
        <div className="alert alert-danger">{pageError ?? "Unable to load Ticket Detail"}</div>
        <button type="button" className="btn btn-outline-danger me-2" onClick={() => void loadDetail()}>Retry</button>
        <button type="button" className="btn btn-outline-success" onClick={onBack}>← Back to Ticket Queue</button>
      </section>
    );
  }

  return (
    <section className="zen-card staff-ticket-detail" aria-labelledby="staff-ticket-detail-title">
      <header className="staff-detail-heading">
        <button type="button" className="btn btn-link ticket-link px-0 py-0" onClick={onBack}>← Back to Ticket Queue</button>
        <div className="staff-detail-title-row">
          <h1 id="staff-ticket-detail-title" className="page-title">{ticket.ticketNumber}</h1>
          <span className={`queue-badge status-${badgeToken(ticket.status)}`}>{ticket.status}</span>
        </div>
        <p className="staff-detail-summary">{ticket.summary}</p>
        <p className="staff-detail-created">Created {formatDateTime(ticket.createdAt)} by {ticket.requester.name}</p>
      </header>

      {pageError && <div className="alert alert-danger mb-3">{pageError}</div>}

      <div className="staff-detail-grid">
        <div className="staff-detail-column">
          <section className="staff-detail-section" aria-labelledby="requester-info-title">
            <h2 id="requester-info-title" className="staff-detail-section-title"><span aria-hidden="true">●</span> Requester Information <small>Read-only</small></h2>
            <dl className="staff-detail-definition-grid">
              <div><dt>Name</dt><dd>{ticket.requester.name}</dd></div>
              <div><dt>Email</dt><dd>{ticket.requester.email}</dd></div>
            </dl>
          </section>

          <section className="staff-detail-section" aria-labelledby="ticket-info-title">
            <h2 id="ticket-info-title" className="staff-detail-section-title"><span aria-hidden="true">▤</span> Ticket Information <small>Read-only</small></h2>
            <dl className="staff-detail-definition-grid ticket-info-grid">
              <div><dt>Category</dt><dd>{ticket.category.name}</dd></div>
              <div><dt>Related System</dt><dd>{ticket.relatedSystem.name}</dd></div>
              <div><dt>Requested Priority</dt><dd><span className={`queue-badge priority-${badgeToken(ticket.requestedPriority)}`}>{ticket.requestedPriority ?? "Not recorded"}</span></dd></div>
              <div><dt>Created Date</dt><dd>{formatDateTime(ticket.createdAt)}</dd></div>
              <div className="staff-detail-wide"><dt>Summary</dt><dd>{ticket.summary}</dd></div>
              <div className="staff-detail-wide"><dt>Description</dt><dd className="staff-detail-description">{ticket.description}</dd></div>
            </dl>
          </section>

          <section className="staff-detail-section" aria-labelledby="attachments-title">
            <div className="staff-detail-section-title-row">
              <h2 id="attachments-title" className="staff-detail-section-title mb-0"><span aria-hidden="true">⌕</span> Attachments</h2>
              <span className="staff-detail-count">{ticket.attachments.length} attachment{ticket.attachments.length === 1 ? "" : "s"}</span>
            </div>
            {ticket.attachments.length === 0 ? (
              <p className="staff-detail-empty">No attachments.</p>
            ) : (
              <div className="staff-attachment-list">
                {ticket.attachments.map((attachment) => {
                  const removed = Boolean(attachment.removedAt);
                  return (
                    <article key={attachment.id} className={`staff-attachment-row ${removed ? "is-removed" : ""}`}>
                      <div className="staff-attachment-icon" aria-hidden="true">▧</div>
                      <div className="staff-attachment-copy">
                        <strong>{attachment.fileName}</strong>
                        <span>{formatSize(attachment.sizeBytes)} · {attachment.mimeType}</span>
                        {removed && <span className="staff-attachment-removal">Removed{attachment.removalReason ? ` · ${attachment.removalReason}` : ""}</span>}
                      </div>
                      {removed ? (
                        <span className="queue-badge staff-removed-badge">Removed</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          disabled={downloadingId === attachment.id}
                          onClick={() => void handleDownload(attachment.id)}
                        >
                          {downloadingId === attachment.id ? "Downloading…" : "↓ Download"}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
            <p className="staff-detail-helper mb-0">Staff can view and download active Requester attachments. Upload and remove actions are not available here.</p>
          </section>
        </div>

        <div className="staff-detail-column">
          <section className="staff-detail-section operational-section" aria-labelledby="operational-title">
            <h2 id="operational-title" className="staff-detail-section-title"><span aria-hidden="true">⚙</span> Operational Controls <small>Editable</small></h2>

            {operationError && (
              <div className="alert alert-danger py-2 staff-operation-feedback" role="alert">
                <span>{operationError}</span>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void loadDetail()}>Refresh</button>
              </div>
            )}
            {operationNotice && <div className="staff-operation-success" role="status">✓ {operationNotice}</div>}

            <div className="staff-control-row current-owner-row">
              <div className="staff-control-label">Current Owner</div>
              <div className="staff-current-owner">
                {ticket.owner ? (
                  <>
                    <span className="staff-avatar" aria-hidden="true">{initials(ticket.owner.name)}</span>
                    <span><strong>{ticket.owner.name}{ownerIsCurrentUser ? " (You)" : ""}</strong><small>{ticket.owner.role.replace("_", " ")}</small></span>
                  </>
                ) : <span className="owner-unassigned">Unassigned</span>}
              </div>
              {!ownerIsCurrentUser && (
                <button type="button" className="btn btn-sm btn-outline-success" disabled={ownerBusy} onClick={() => void handleClaim()}>
                  {ownerBusy ? "Saving…" : "Claim"}
                </button>
              )}
            </div>

            <div className="staff-control-row">
              <label htmlFor="owner-select" className="staff-control-label">Assign / Reassign</label>
              <select id="owner-select" className="form-select" value={ownerDraft} disabled={ownerBusy} onChange={(event) => setOwnerDraft(event.target.value)}>
                <option value="" disabled>Select eligible owner</option>
                {assignees.map((person) => <option key={person.id} value={person.id}>{person.name} ({person.role})</option>)}
              </select>
              <button type="button" className="btn btn-success btn-sm" disabled={ownerBusy || !ownerDraft || Number(ownerDraft) === ticket.owner?.id} onClick={() => void handleAssign()}>
                {ownerBusy ? "Saving…" : ticket.owner ? "Reassign" : "Assign"}
              </button>
            </div>

            <div className="staff-control-row priority-comparison-row">
              <div className="staff-control-label">Requested Priority</div>
              <div><span className={`queue-badge priority-${badgeToken(ticket.requestedPriority)}`}>{ticket.requestedPriority ?? "Not recorded"}</span> <small className="staff-inline-note">from requester · read-only</small></div>
            </div>

            <div className="staff-control-row">
              <label htmlFor="it-priority-select" className="staff-control-label">IT Priority</label>
              <select id="it-priority-select" className="form-select" value={priorityDraft} disabled={priorityBusy} onChange={(event) => setPriorityDraft(event.target.value as RequestedPriority)}>
                {REQUESTED_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
              </select>
              <button type="button" className="btn btn-success btn-sm" disabled={priorityBusy || priorityDraft === ticket.itPriority} onClick={() => void handlePrioritySave()}>
                {priorityBusy ? "Saving…" : "Save"}
              </button>
            </div>

            <div className="staff-control-row">
              <label htmlFor="status-select" className="staff-control-label">Status</label>
              <select id="status-select" className="form-select" value={statusDraft} disabled={statusBusy || allowedStatuses.length === 0} onChange={(event) => setStatusDraft(event.target.value as TicketStatus | "")}>
                <option value="">{allowedStatuses.length ? `Current: ${ticket.status}` : "No next status available"}</option>
                {allowedStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
              <button type="button" className="btn btn-success btn-sm" disabled={statusBusy || !statusDraft} onClick={() => void handleStatusSave()}>
                {statusBusy ? "Saving…" : "Change"}
              </button>
            </div>
            {allowedStatuses.length > 0 && <div className="staff-status-hint">ⓘ Allowed next status: {allowedStatuses.join(", ")}</div>}

            {ticket.problemAppearsResolvedAt && (
              <div className="requester-resolution-banner" role="status">
                <span className="requester-resolution-icon" aria-hidden="true">✓</span>
                <div>
                  <strong>Requester says the problem appears resolved</strong>
                  <span>Indicated {formatDateTime(ticket.problemAppearsResolvedAt)}. This does not change the formal Ticket status.</span>
                </div>
              </div>
            )}
          </section>

          <section className="staff-detail-section communication-section public-section" aria-labelledby="staff-public-comments-title">
            <div className="staff-detail-section-title-row">
              <h2 id="staff-public-comments-title" className="staff-detail-section-title mb-0"><span aria-hidden="true">●</span> Public Comments</h2>
              <span className="visibility-label visible-label">Visible to Requester</span>
            </div>
            <div className="staff-message-compose">
              <textarea
                className={`form-control ${commentError ? "is-invalid" : ""}`}
                rows={3}
                value={commentDraft}
                disabled={postingComment}
                placeholder="Add a public comment…"
                aria-label="Add a public comment"
                onChange={(event) => { setCommentDraft(event.target.value); setCommentError(null); }}
              />
              <div className="staff-compose-footer">
                <span className={commentError ? "text-danger" : "text-secondary"}>{commentError ?? `${Array.from(commentDraft).length}/${MAX_MESSAGE_CHARACTERS}`}</span>
                <button type="button" className="btn btn-success btn-sm" disabled={postingComment} onClick={() => void handlePostComment()}>{postingComment ? "Posting…" : "Add Comment"}</button>
              </div>
            </div>
            <MessageList state={commentsState} items={comments} empty="No public comments yet." onRetry={() => void loadComments()} />
          </section>

          <section className="staff-detail-section communication-section private-section" aria-labelledby="staff-internal-notes-title">
            <div className="staff-detail-section-title-row">
              <h2 id="staff-internal-notes-title" className="staff-detail-section-title mb-0"><span aria-hidden="true">▣</span> Internal Notes</h2>
              <span className="visibility-label private-label">Not visible to Requester</span>
            </div>
            <p className="staff-private-warning">Internal Notes — not visible to Requester. Use this area only for operational context.</p>
            <div className="staff-message-compose">
              <textarea
                className={`form-control ${noteError ? "is-invalid" : ""}`}
                rows={3}
                value={noteDraft}
                disabled={postingNote}
                placeholder="Add an internal note…"
                aria-label="Add an internal note"
                onChange={(event) => { setNoteDraft(event.target.value); setNoteError(null); }}
              />
              <div className="staff-compose-footer">
                <span className={noteError ? "text-danger" : "text-secondary"}>{noteError ?? `${Array.from(noteDraft).length}/${MAX_MESSAGE_CHARACTERS}`}</span>
                <button type="button" className="btn btn-dark btn-sm" disabled={postingNote} onClick={() => void handlePostNote()}>{postingNote ? "Posting…" : "Add Note"}</button>
              </div>
            </div>
            <MessageList state={notesState} items={notes} empty="No internal notes yet." onRetry={() => void loadNotes()} privateMode />
            {notesState === "success" && notesTotalItems > 0 && (
              <div className="staff-notes-pagination" aria-label="Internal Notes pagination">
                <span>
                  {notesTotalItems} note{notesTotalItems === 1 ? "" : "s"} · Page {notesPage} of {Math.max(notesTotalPages, 1)}
                </span>
                <div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    aria-label="Previous Internal Notes page"
                    disabled={notesPage <= 1}
                    onClick={() => setNotesPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    aria-label="Next Internal Notes page"
                    disabled={notesTotalPages === 0 || notesPage >= notesTotalPages}
                    onClick={() => setNotesPage((page) => Math.min(notesTotalPages, page + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

function MessageList({
  state,
  items,
  empty,
  onRetry,
  privateMode = false,
}: {
  state: PanelState;
  items: Array<PublicComment | InternalNote>;
  empty: string;
  onRetry: () => void;
  privateMode?: boolean;
}) {
  if (state === "loading") return <div className="staff-message-state"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Loading…</div>;
  if (state === "error") return <div className="staff-message-state text-danger"><span>Unable to load messages.</span><button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>Retry</button></div>;
  if (!items.length) return <p className="staff-detail-empty">{empty}</p>;
  return (
    <div className="staff-message-list">
      {items.map((item) => (
        <article key={item.id} className={`staff-message ${privateMode ? "staff-message-private" : ""}`}>
          <span className="staff-avatar" aria-hidden="true">{initials(item.author.name)}</span>
          <div className="staff-message-body">
            <div className="staff-message-meta">
              <strong>{item.author.name}</strong>
              <span>{item.author.role.replace("_", " ")}</span>
              <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
            </div>
            <p>{item.content}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
