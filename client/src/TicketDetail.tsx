import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  Attachment,
  downloadAttachment,
  getPublicComments,
  getTicketDetail,
  indicateProblemAppearsResolved,
  postPublicComment,
  PublicComment,
  removeAttachment,
  TicketDetail as TicketDetailModel,
  uploadAttachments,
} from "./api.js";

type LoadState = "loading" | "success" | "not-found" | "error";

interface TicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ACTIVE_FILES = 5;
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function priorityClass(priority: TicketDetailModel["requestedPriority"]): string {
  if (!priority) return "priority-not-recorded";
  return `priority-${priority.toLowerCase()}`;
}

function statusClass(status: string): string {
  return `status-${status.toLowerCase().replace(/\s+/g, "-")}`;
}

function fileLabel(fileName: string): string {
  const extension = fileName.split(".").pop()?.toUpperCase();
  return extension && extension.length <= 4 ? extension : "FILE";
}

function validateSelectedFiles(files: File[], activeCount: number): string | null {
  if (files.length === 0) return "Select at least one attachment";
  if (files.length > MAX_ACTIVE_FILES || activeCount + files.length > MAX_ACTIVE_FILES) {
    return "A ticket can have at most 5 active attachments";
  }
  const invalid = files.filter((file) => {
    const lower = file.name.toLowerCase();
    const extAllowed = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
    return !extAllowed || !ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_BYTES;
  });
  return invalid.length ? `Invalid attachment(s): ${invalid.map((f) => f.name).join(", ")}` : null;
}

export default function TicketDetail({ ticketId, onBack }: TicketDetailProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [ticket, setTicket] = useState<TicketDetailModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [commentsState, setCommentsState] = useState<"loading" | "success" | "error">("loading");
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [postingComment, setPostingComment] = useState(false);
  const [indicatingResolved, setIndicatingResolved] = useState(false);

  const load = useCallback(async () => {
    setLoadState("loading");
    setError(null);
    try {
      const detail = await getTicketDetail(ticketId);
      setTicket(detail);
      setLoadState("success");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setTicket(null);
        setLoadState("not-found");
      } else {
        setError(err instanceof Error ? err.message : "Unable to load ticket");
        setLoadState("error");
      }
    }
  }, [ticketId]);

  const loadComments = useCallback(async () => {
    setCommentsState("loading");
    try {
      const items = await getPublicComments(ticketId);
      setComments(items);
      setCommentsState("success");
    } catch {
      setCommentsState("error");
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const activeCount = useMemo(
    () => ticket?.attachments.filter((attachment) => !attachment.removedAt).length ?? 0,
    [ticket],
  );

  async function handleRemove(attachment: Attachment) {
    const enteredReason = window.prompt(`Why are you removing ${attachment.fileName}?`);
    if (enteredReason === null) return;
    const reason = enteredReason.trim();
    if (!reason) {
      setError("Removal reason is required");
      return;
    }
    if (!window.confirm(`Remove ${attachment.fileName}? The metadata and removal reason will remain visible.`)) return;
    setRemovingId(attachment.id);
    setError(null);
    setNotice(null);
    try {
      await removeAttachment(attachment.id, reason);
      setNotice("Attachment removed successfully");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove attachment");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleDownload(attachment: Attachment) {
    setDownloadingId(attachment.id);
    setError(null);
    try {
      const { blob, fileName } = await downloadAttachment(attachment.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download attachment");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleUpload() {
    const validation = validateSelectedFiles(selectedFiles, activeCount);
    if (validation) {
      setError(validation);
      return;
    }
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      await uploadAttachments(ticketId, selectedFiles);
      setSelectedFiles([]);
      const input = document.getElementById("detailAttachments") as HTMLInputElement | null;
      if (input) input.value = "";
      setNotice("Attachment upload complete");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload attachments");
    } finally {
      setUploading(false);
    }
  }

  async function handlePostComment() {
    const content = commentDraft.trim();
    if (!content) {
      setCommentError("Comment is required");
      return;
    }
    if (content.length > 2000) {
      setCommentError("Comment must be at most 2000 characters");
      return;
    }

    setPostingComment(true);
    setCommentError(null);
    try {
      const created = await postPublicComment(ticketId, content);
      setComments((current) => [...current, created]);
      setCommentDraft("");
      setCommentsState("success");
    } catch (err) {
      if (err instanceof ApiError && err.fields?.content) {
        setCommentError(err.fields.content);
      } else {
        setCommentError(err instanceof Error ? err.message : "Unable to post comment");
      }
    } finally {
      setPostingComment(false);
    }
  }

  async function handleProblemAppearsResolved() {
    if (!ticket) return;
    const confirmed = window.confirm(
      "This tells support that the problem appears resolved. It does not formally close or resolve the Ticket. Continue?",
    );
    if (!confirmed) return;

    setIndicatingResolved(true);
    setError(null);
    try {
      const result = await indicateProblemAppearsResolved(ticket.id);
      setTicket((current) => current ? {
        ...current,
        problemAppearsResolvedAt: result.problemAppearsResolvedAt,
        status: result.status,
      } : current);
      setNotice("Support has been notified that the problem appears resolved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record resolution indication");
    } finally {
      setIndicatingResolved(false);
    }
  }

  if (loadState === "loading") {
    return (
      <div className="py-4">
        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
        Loading ticket…
      </div>
    );
  }

  if (loadState === "not-found") {
    return (
      <div className="py-4">
        <div className="alert alert-warning">Ticket not found or you do not have access to it.</div>
        <button className="btn btn-outline-success" onClick={onBack}>Back to My Tickets</button>
      </div>
    );
  }

  if (loadState === "error" || !ticket) {
    return (
      <div className="py-4">
        <div className="alert alert-danger">{error ?? "Unable to load ticket"}</div>
        <button className="btn btn-outline-danger me-2" onClick={load}>Retry</button>
        <button className="btn btn-outline-success" onClick={onBack}>Back to My Tickets</button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-heading">
        <button className="btn btn-link px-0 pt-0 ticket-link text-decoration-none" onClick={onBack}>← Back to My Tickets</button>
        <h1 className="page-title">Ticket Detail</h1>
        <p className="page-subtitle">View all the details and updates for this support request.</p>
      </div>

      <section className="zen-card detail-card p-0 overflow-hidden mb-4">
        <div className="detail-metadata-grid">
          <div className="detail-meta-item">
            <span className="detail-meta-label">Ticket No.</span>
            <span className="detail-meta-value text-success">{ticket.ticketNumber}</span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">Created</span>
            <span className="detail-meta-value">{new Date(ticket.createdAt).toLocaleString()}</span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">Requester</span>
            <span className="detail-meta-value">{ticket.requester.name}</span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">Category</span>
            <span className="detail-meta-value">{ticket.category.name}</span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">Related System</span>
            <span className="detail-meta-value">{ticket.relatedSystem.name}</span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">Requested Priority</span>
            <span className={`priority-badge ${priorityClass(ticket.requestedPriority)}`}>
              {ticket.requestedPriority ?? "Not recorded"}
            </span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">IT Priority</span>
            <span className={`priority-badge ${priorityClass(ticket.itPriority ?? null)}`}>
              {ticket.itPriority ?? "Not recorded"}
            </span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">Status</span>
            <span className={`status-badge ${statusClass(ticket.status)}`}>{ticket.status}</span>
          </div>
        </div>
      </section>

      <section className="zen-card content-card mb-4">
        <h2 className="h6 fw-bold mb-2">Summary</h2>
        <p className="mb-4">{ticket.summary}</p>
        <h2 className="h6 fw-bold mb-2">Description</h2>
        <p className="mb-0 text-secondary" style={{ whiteSpace: "pre-wrap" }}>{ticket.description}</p>
      </section>

      <section className="zen-card content-card mb-4" aria-labelledby="resolution-heading">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <h2 id="resolution-heading" className="h5 mb-1">Problem status from you</h2>
            <p className="small text-secondary mb-0">
              Let support know if the problem appears resolved. This does not change the formal Ticket status.
            </p>
          </div>
          {ticket.problemAppearsResolvedAt ? (
            <div className="resolution-indicated" role="status">
              <strong>Requester indicated this problem appears resolved</strong>
              <span>{new Date(ticket.problemAppearsResolvedAt).toLocaleString()}</span>
            </div>
          ) : ["New", "Open", "In Progress", "Waiting for Requester", "Reopened"].includes(ticket.status) ? (
            <button
              type="button"
              className="btn btn-outline-success"
              disabled={indicatingResolved}
              onClick={() => void handleProblemAppearsResolved()}
            >
              {indicatingResolved ? "Saving…" : "Problem Appears Resolved"}
            </button>
          ) : null}
        </div>
      </section>

      <section>
        <div className="zen-card attachment-panel mb-3">
          <div className="attachment-panel-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <h2 className="h5 mb-1">Attachments <span className="badge rounded-pill text-bg-light">{ticket.attachments.length}</span></h2>
              <small className="text-secondary">{activeCount}/{MAX_ACTIVE_FILES} active</small>
            </div>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <label htmlFor="detailAttachments" className="btn btn-outline-success btn-sm mb-0">Add attachments</label>
              <input
                id="detailAttachments"
                type="file"
                className="visually-hidden"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
              />
              <button
                className="btn btn-success btn-sm"
                disabled={uploading || selectedFiles.length === 0}
                onClick={handleUpload}
              >
                {uploading ? "Uploading…" : "Upload selected"}
              </button>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="px-4 py-3 border-bottom bg-light-subtle">
              <div className="small fw-semibold mb-1">Selected files</div>
              <ul className="small mb-0 ps-3">
                {selectedFiles.map((file) => <li key={`${file.name}-${file.size}`}>{file.name} ({formatSize(file.size)})</li>)}
              </ul>
            </div>
          )}

          {notice && (
            <div className="zen-info m-3" role="status" aria-live="polite">
              <span className="info-dot" aria-hidden="true">✓</span>
              <span>{notice}</span>
            </div>
          )}
          {error && <div className="alert alert-danger m-3 py-2">{error}</div>}

          {ticket.attachments.length === 0 ? (
            <p className="text-secondary px-4 py-4 mb-0">No attachments yet.</p>
          ) : (
            ticket.attachments.map((attachment) => {
              const removed = Boolean(attachment.removedAt);
              return (
                <div
                  key={attachment.id}
                  data-testid={`attachment-${attachment.id}`}
                  className={`attachment-row d-flex flex-column flex-md-row justify-content-between gap-3 ${removed ? "removed" : ""}`}
                >
                  <div className="d-flex gap-3 align-items-start min-w-0">
                    <div className="file-icon" aria-hidden="true">{fileLabel(attachment.fileName)}</div>
                    <div className="min-w-0">
                      <div className={removed ? "fw-semibold text-decoration-line-through" : "fw-semibold"}>{attachment.fileName}</div>
                      <small className="text-secondary">{formatSize(attachment.sizeBytes)} · {attachment.mimeType}</small>
                      {removed && (
                        <div className="small mt-2">
                          <span className="status-badge status-new me-2">Removed</span>
                          <strong>Removal reason:</strong> {attachment.removalReason ?? "Not recorded (legacy)"}
                        </div>
                      )}
                    </div>
                  </div>
                  {!removed && (
                    <div className="d-flex gap-2 align-items-center attachment-actions">
                      <button
                        className="btn btn-sm btn-outline-success"
                        aria-label={`Download ${attachment.fileName}`}
                        disabled={downloadingId === attachment.id}
                        onClick={() => handleDownload(attachment)}
                      >
                        {downloadingId === attachment.id ? "Downloading…" : "↓ Download"}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        aria-label={`Remove ${attachment.fileName}`}
                        disabled={removingId === attachment.id}
                        onClick={() => handleRemove(attachment)}
                      >
                        {removingId === attachment.id ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="small text-secondary">Up to 5 active files, 5 MB each. JPG, JPEG, PNG, WEBP or PDF.</div>
      </section>

      <section className="zen-card comments-panel mt-4" aria-labelledby="public-comments-heading">
        <div className="comments-panel-header">
          <div>
            <h2 id="public-comments-heading" className="h5 mb-1">Public Comments</h2>
            <p className="small text-secondary mb-0">Comments here are shared with support staff.</p>
          </div>
        </div>

        <div className="comments-list" aria-live="polite">
          {commentsState === "loading" && (
            <div className="text-secondary py-3">
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
              Loading comments…
            </div>
          )}
          {commentsState === "error" && (
            <div className="alert alert-danger my-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span>Unable to load public comments.</span>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void loadComments()}>Retry</button>
            </div>
          )}
          {commentsState === "success" && comments.length === 0 && (
            <p className="text-secondary py-3 mb-0">No public comments yet.</p>
          )}
          {comments.map((comment) => (
            <article key={comment.id} className="public-comment">
              <div className="public-comment-meta">
                <strong>{comment.author.name}</strong>
                <span className="role-badge">{comment.author.role.replace("_", " ")}</span>
                <span>{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{comment.content}</p>
            </article>
          ))}
        </div>

        <div className="comment-compose">
          <label htmlFor="publicComment" className="form-label">Add a public comment</label>
          <textarea
            id="publicComment"
            className={`form-control ${commentError ? "is-invalid" : ""}`}
            rows={4}
            maxLength={2000}
            value={commentDraft}
            disabled={postingComment}
            onChange={(e) => {
              setCommentDraft(e.target.value);
              setCommentError(null);
            }}
            placeholder="Share an update with support staff"
          />
          <div className="d-flex justify-content-between gap-3 mt-1">
            <div>{commentError && <div className="invalid-feedback d-block">{commentError}</div>}</div>
            <small className="text-secondary">{commentDraft.length}/2000</small>
          </div>
          <div className="text-end mt-3">
            <button
              type="button"
              className="btn btn-success"
              disabled={postingComment}
              onClick={() => void handlePostComment()}
            >
              {postingComment ? "Posting…" : "Post Comment"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
