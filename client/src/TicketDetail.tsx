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
    if (!window.confirm(`Remove ${attachment.fileName}? The metadata will remain visible.`)) return;
    setRemovingId(attachment.id);
    setError(null);
    setNotice(null);
    try {
      await removeAttachment(attachment.id, requesterId);
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
    <div className="py-3">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
        <div>
          <button className="btn btn-link px-0 text-success" onClick={onBack}>← Back to My Tickets</button>
          <h2 className="h4 mb-1">{ticket.ticketNumber}</h2>
          <h3 className="h6 fw-normal text-secondary mb-0">{ticket.summary}</h3>
        </div>
        <span className="badge" style={{ backgroundColor: "#EAF6EF", color: "#0B7A46" }}>
          {ticket.status}
        </span>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-sm-4">Requester</dt><dd className="col-sm-8">{ticket.requester.name}</dd>
            <dt className="col-sm-4">Category</dt><dd className="col-sm-8">{ticket.category.name}</dd>
            <dt className="col-sm-4">Related System</dt><dd className="col-sm-8">{ticket.relatedSystem.name}</dd>
            <dt className="col-sm-4">Created</dt><dd className="col-sm-8">{new Date(ticket.createdAt).toLocaleString()}</dd>
          </dl>
        </div>
      </div>

      <section className="mb-4">
        <h3 className="h5">Description</h3>
        <div className="p-3 rounded" style={{ backgroundColor: "#EAF6EF" }}>{ticket.description}</div>
      </section>

      <section>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h3 className="h5 mb-0">Attachments</h3>
          <small className="text-secondary">{activeCount}/{MAX_ACTIVE_FILES} active</small>
        </div>

        <div className="border rounded p-3 mb-3">
          <label htmlFor="detailAttachments" className="form-label">Add attachments</label>
          <input
            id="detailAttachments"
            type="file"
            className="form-control"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
          />
          <div className="form-text">Up to 5 active files, 5 MB each. JPG, JPEG, PNG, WEBP or PDF.</div>
          {selectedFiles.length > 0 && (
            <ul className="small mt-2 mb-2">
              {selectedFiles.map((file) => <li key={`${file.name}-${file.size}`}>{file.name} ({formatSize(file.size)})</li>)}
            </ul>
          )}
          <button
            className="btn btn-success btn-sm mt-2"
            disabled={uploading || selectedFiles.length === 0}
            onClick={handleUpload}
          >
            {uploading ? "Uploading…" : "Upload selected"}
          </button>
        </div>

        {notice && (
          <div
            className="toast show mb-3"
            role="status"
            aria-live="polite"
            style={{ backgroundColor: "#EAF6EF", color: "#0B7A46" }}
          >
            <div className="toast-body">{notice}</div>
          </div>
        )}
        {error && <div className="alert alert-danger py-2">{error}</div>}

        {ticket.attachments.length === 0 ? (
          <p className="text-secondary">No attachments yet.</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {ticket.attachments.map((attachment) => {
              const removed = Boolean(attachment.removedAt);
              return (
                <div
                  key={attachment.id}
                  data-testid={`attachment-${attachment.id}`}
                  className={`border rounded p-3 d-flex flex-column flex-md-row justify-content-between gap-3 ${removed ? "text-secondary" : ""}`}
                >
                  <div>
                    <div className={removed ? "text-decoration-line-through" : "fw-semibold"}>{attachment.fileName}</div>
                    <small>{formatSize(attachment.sizeBytes)} · {attachment.mimeType}</small>
                    {removed && <span className="badge text-bg-secondary ms-2">Removed</span>}
                  </div>
                  {!removed && (
                    <div className="d-flex gap-2 align-items-center">
                      <button
                        className="btn btn-sm btn-outline-success"
                        aria-label={`Download ${attachment.fileName}`}
                        disabled={downloadingId === attachment.id}
                        onClick={() => handleDownload(attachment)}
                      >
                        {downloadingId === attachment.id ? "Downloading…" : "Download"}
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
            })}
          </div>
        )}
      </section>
    </div>
  );
}
