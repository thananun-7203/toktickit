import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  Attachment,
  downloadAttachment,
  getTicketDetail,
  removeAttachment,
  TicketDetail as TicketDetailModel,
  uploadAttachments,
} from "./api.js";

type LoadState = "loading" | "success" | "not-found" | "error";

interface TicketDetailProps {
  ticketId: number;
  requesterId: number;
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

export default function TicketDetail({ ticketId, requesterId, onBack }: TicketDetailProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [ticket, setTicket] = useState<TicketDetailModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoadState("loading");
    setError(null);
    try {
      const detail = await getTicketDetail(ticketId, requesterId);
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
  }, [ticketId, requesterId]);

  useEffect(() => {
    load();
  }, [load]);

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
      await removeAttachment(attachment.id, requesterId, reason);
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
      const { blob, fileName } = await downloadAttachment(attachment.id, requesterId);
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
      await uploadAttachments(ticketId, selectedFiles, requesterId);
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
    </div>
  );
}
