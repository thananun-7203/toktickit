import { useEffect, useState } from "react";
import {
  createTicket,
  getCategories,
  getRelatedSystems,
  Category,
  RelatedSystem,
  REQUESTED_PRIORITIES,
  RequestedPriority,
  Ticket,
  uploadAttachments,
} from "./api.js";
import { useRequester } from "./RequesterContext.js";

// Lab 2 Issue 3 — S2: Create Ticket screen (ui-spec.md).
// Zen Green theme, required-field asterisks, validation below inputs,
// and busy/error/success states. Mirrors backend BR-3 client-side.

const SUMMARY_MAX = 100;
const DESCRIPTION_MAX = 2000;
const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_MAX_FILES = 5;
const ATTACHMENT_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

type LoadState = "loading" | "success" | "error";
type SubmitState = "idle" | "busy" | "success" | "error";

interface FormFields {
  categoryId: string;
  relatedSystemId: string;
  requestedPriority: string;
  summary: string;
  description: string;
}

const EMPTY: FormFields = {
  categoryId: "",
  relatedSystemId: "",
  requestedPriority: "",
  summary: "",
  description: "",
};

interface CreateTicketProps {
  onOpenTicket?: (ticketId: number) => void;
  onGoToTickets?: () => void;
}

function validateAttachments(files: File[]): Record<string, string> {
  const errors: Record<string, string> = {};
  if (files.length > ATTACHMENT_MAX_FILES) {
    errors.__count = `You can attach at most ${ATTACHMENT_MAX_FILES} files`;
  }
  for (const file of files) {
    const lower = file.name.toLowerCase();
    const extensionAllowed = ATTACHMENT_EXTENSIONS.some((ext) => lower.endsWith(ext));
    if (!extensionAllowed || !ATTACHMENT_TYPES.includes(file.type)) {
      errors[file.name] = `${file.name} — not an allowed type`;
    } else if (file.size > ATTACHMENT_MAX_BYTES) {
      errors[file.name] = `${file.name} — file must be 5 MB or smaller`;
    }
  }
  return errors;
}

function validate(fields: FormFields): Partial<Record<keyof FormFields, string>> {
  const errors: Partial<Record<keyof FormFields, string>> = {};
  if (!fields.categoryId) errors.categoryId = "Please select a category";
  if (!fields.relatedSystemId) errors.relatedSystemId = "Please select a related system";
  if (!fields.requestedPriority) errors.requestedPriority = "Please select a requested priority";
  // Length is validated against the trimmed value so the client matches the
  // server and the persisted value stays consistent.
  const summary = fields.summary.trim();
  const description = fields.description.trim();
  if (!summary) errors.summary = "Summary is required";
  else if (summary.length > SUMMARY_MAX)
    errors.summary = `Summary must be at most ${SUMMARY_MAX} characters`;
  if (!description) errors.description = "Description is required";
  else if (description.length > DESCRIPTION_MAX)
    errors.description = `Description must be at most ${DESCRIPTION_MAX} characters`;
  return errors;
}

export default function CreateTicket({ onOpenTicket, onGoToTickets }: CreateTicketProps) {
  const { requester } = useRequester();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [fields, setFields] = useState<FormFields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormFields, string>>>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState<Ticket | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<Record<string, string>>({});
  const [postCreateWarning, setPostCreateWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCategories(), getRelatedSystems()])
      .then(([cats, systems]) => {
        if (cancelled) return;
        setCategories(cats);
        setRelatedSystems(systems);
        setLoadState("success");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setField(name: keyof FormFields, value: string) {
    setFields((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
    setServerError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requester) return;
    const nextErrors = validate(fields);
    setErrors(nextErrors);
    const nextAttachmentErrors = validateAttachments(selectedFiles);
    setAttachmentErrors(nextAttachmentErrors);
    if (Object.keys(nextErrors).length > 0 || Object.keys(nextAttachmentErrors).length > 0) return;

    setSubmitState("busy");
    setPostCreateWarning(null);
    try {
      const ticket = await createTicket(
        {
          categoryId: Number(fields.categoryId),
          relatedSystemId: Number(fields.relatedSystemId),
          requestedPriority: fields.requestedPriority as RequestedPriority,
          summary: fields.summary.trim(),
          description: fields.description.trim(),
        },
        requester.id,
      );
      setCreated(ticket);
      if (selectedFiles.length > 0) {
        try {
          await uploadAttachments(ticket.id, selectedFiles, requester.id);
        } catch (err) {
          setPostCreateWarning(
            `Ticket was created, but attachments could not be uploaded: ${
              err instanceof Error ? err.message : "unknown upload error"
            }`,
          );
        }
      }
      setFields(EMPTY);
      setSelectedFiles([]);
      setAttachmentErrors({});
      setSubmitState("success");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Unable to create ticket");
      // Map server-side per-field errors below their inputs (e.g. stale
      // dropdown values may arrive as positive-integer validation failures).
      if (err instanceof Error && "fields" in err) {
        const serverFields = (err as unknown as { fields?: Record<string, string> }).fields;
        if (serverFields) {
          const mapped: Partial<Record<keyof FormFields, string>> = {};
          if (serverFields.categoryId) mapped.categoryId = serverFields.categoryId;
          if (serverFields.relatedSystemId) mapped.relatedSystemId = serverFields.relatedSystemId;
          if (serverFields.requestedPriority) mapped.requestedPriority = serverFields.requestedPriority;
          if (serverFields.summary) mapped.summary = serverFields.summary;
          if (serverFields.description) mapped.description = serverFields.description;
          setErrors((e) => ({ ...e, ...mapped }));
        }
      }
      setSubmitState("error");
    }
  }

  if (submitState === "success" && created) {
    return (
      <div>
        <div className="page-heading">
          <h1 className="page-title">Create Ticket</h1>
          <p className="page-subtitle">Provide the details below to open a new support request.</p>
        </div>
        <div className="zen-card content-card mb-3" style={{ maxWidth: 760 }}>
          <div className="zen-info mb-3">
            <span className="info-dot" aria-hidden="true">✓</span>
            <div>
              <h2 className="h5 mb-1">Ticket created successfully</h2>
              <div>Ticket Number: <strong>{created.ticketNumber}</strong></div>
            </div>
          </div>
          <p className="mb-0 text-secondary">{created.summary} — Status: {created.status}</p>
        </div>
        {postCreateWarning && <div className="alert alert-warning">{postCreateWarning}</div>}
        <div className="d-flex flex-wrap gap-2">
          {onOpenTicket && (
            <button className="btn btn-success" onClick={() => onOpenTicket(created.id)}>
              View ticket
            </button>
          )}
          {onGoToTickets && (
            <button className="btn btn-outline-success" onClick={onGoToTickets}>
              My Tickets
            </button>
          )}
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              setCreated(null);
              setPostCreateWarning(null);
              setSubmitState("idle");
            }}
          >
            Create another ticket
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-heading">
        <h1 className="page-title">Create Ticket</h1>
        <p className="page-subtitle">Provide the details below to open a new support request.</p>
      </div>

      {loadState === "loading" && (
        <div className="zen-card content-card text-secondary">
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
          Loading form data…
        </div>
      )}

      {loadState === "error" && (
        <div className="alert alert-danger">Unable to load form data. Please try again.</div>
      )}

      {loadState === "success" && (
        <form onSubmit={handleSubmit} noValidate className="zen-card form-card">
          <div className="row g-3">
            <div className="col-12 col-md-6 col-lg-4">
              <label htmlFor="categoryId" className="form-label">
                Category <span className="text-danger">*</span>
              </label>
              <select
                id="categoryId"
                className={`form-select ${errors.categoryId ? "is-invalid" : ""}`}
                value={fields.categoryId}
                onChange={(e) => setField("categoryId", e.target.value)}
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && <div className="invalid-feedback d-block">{errors.categoryId}</div>}
            </div>

            <div className="col-12 col-md-6 col-lg-4">
              <label htmlFor="relatedSystemId" className="form-label">
                Related System <span className="text-danger">*</span>
              </label>
              <select
                id="relatedSystemId"
                className={`form-select ${errors.relatedSystemId ? "is-invalid" : ""}`}
                value={fields.relatedSystemId}
                onChange={(e) => setField("relatedSystemId", e.target.value)}
              >
                <option value="">Select related system…</option>
                {relatedSystems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.relatedSystemId && (
                <div className="invalid-feedback d-block">{errors.relatedSystemId}</div>
              )}
            </div>

            <div className="col-12 col-md-6 col-lg-4">
              <label htmlFor="requestedPriority" className="form-label">
                Requested Priority <span className="text-danger">*</span>
              </label>
              <select
                id="requestedPriority"
                className={`form-select ${errors.requestedPriority ? "is-invalid" : ""}`}
                value={fields.requestedPriority}
                onChange={(e) => setField("requestedPriority", e.target.value)}
              >
                <option value="">Select requested priority…</option>
                {REQUESTED_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
              {errors.requestedPriority && (
                <div className="invalid-feedback d-block">{errors.requestedPriority}</div>
              )}
            </div>

            <div className="col-12">
              <label htmlFor="summary" className="form-label">
                Ticket Summary <span className="text-danger">*</span>
              </label>
              <input
                id="summary"
                className={`form-control ${errors.summary ? "is-invalid" : ""}`}
                value={fields.summary}
                maxLength={SUMMARY_MAX}
                onChange={(e) => setField("summary", e.target.value)}
                placeholder="Enter a short summary of your issue"
              />
              <div className="form-text text-end">{fields.summary.length}/{SUMMARY_MAX}</div>
              {errors.summary && <div className="invalid-feedback d-block">{errors.summary}</div>}
            </div>

            <div className="col-12">
              <label htmlFor="description" className="form-label">
                Description <span className="text-danger">*</span>
              </label>
              <textarea
                id="description"
                className={`form-control ${errors.description ? "is-invalid" : ""}`}
                rows={5}
                value={fields.description}
                maxLength={DESCRIPTION_MAX}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Provide detailed information about your request, including any relevant steps, errors, or impact."
              />
              <div className="form-text text-end">{fields.description.length}/{DESCRIPTION_MAX}</div>
              {errors.description && (
                <div className="invalid-feedback d-block">{errors.description}</div>
              )}
            </div>

            <div className="col-12">
              <label htmlFor="attachments" className="form-label">Attachments <span className="fw-normal text-secondary">(Optional)</span></label>
              <div className="attachment-dropzone">
                <div className="fw-semibold mb-2">↥ &nbsp;Tap to upload or browse</div>
                <input
                  id="attachments"
                  type="file"
                  className={`form-control ${Object.keys(attachmentErrors).length > 0 ? "is-invalid" : ""}`}
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    setSelectedFiles(files);
                    setAttachmentErrors(validateAttachments(files));
                    setServerError(null);
                  }}
                />
                <div className="attachment-hint">PDF, JPG, PNG, WEBP up to 5 MB each. Up to 5 files.</div>
              </div>
              {selectedFiles.length > 0 && (
                <div className="mt-2 d-flex flex-column gap-1">
                  {selectedFiles.map((file) => (
                    <div key={`${file.name}-${file.size}`} className="small">
                      <span>{file.name}</span>
                      {attachmentErrors[file.name] ? (
                        <div className="text-danger">{attachmentErrors[file.name]}</div>
                      ) : (
                        <span className="text-secondary"> · {(file.size / 1024).toFixed(1)} KB</span>
                      )}
                    </div>
                  ))}
                  {attachmentErrors.__count && <div className="text-danger small">{attachmentErrors.__count}</div>}
                </div>
              )}
            </div>
          </div>

          {serverError && <div className="alert alert-danger mt-3 mb-1">{serverError}</div>}

          <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 mt-4 pt-3 border-top">
            <button
              type="button"
              className="btn btn-outline-secondary px-4"
              onClick={() => {
                setFields(EMPTY);
                setErrors({});
                setSelectedFiles([]);
                setAttachmentErrors({});
                setServerError(null);
                onGoToTickets?.();
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-success px-4"
              disabled={submitState === "busy"}
            >
              {submitState === "busy" ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Creating…
                </>
              ) : (
                <>+&nbsp; Create Ticket</>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
