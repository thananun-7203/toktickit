import { useEffect, useState } from "react";
import {
  createTicket,
  getCategories,
  getRelatedSystems,
  Category,
  RelatedSystem,
  Ticket,
} from "./api.js";
import { useRequester } from "./RequesterContext.js";

// Lab 2 Issue 3 — S2: Create Ticket screen (ui-spec.md).
// Zen Green theme, required-field asterisks, validation below inputs,
// and busy/error/success states. Mirrors backend BR-3 client-side.

const SUMMARY_MAX = 100;
const DESCRIPTION_MAX = 2000;

type LoadState = "loading" | "success" | "error";
type SubmitState = "idle" | "busy" | "success" | "error";

interface FormFields {
  categoryId: string;
  relatedSystemId: string;
  summary: string;
  description: string;
}

const EMPTY: FormFields = { categoryId: "", relatedSystemId: "", summary: "", description: "" };

function validate(fields: FormFields): Partial<Record<keyof FormFields, string>> {
  const errors: Partial<Record<keyof FormFields, string>> = {};
  if (!fields.categoryId) errors.categoryId = "Please select a category";
  if (!fields.relatedSystemId) errors.relatedSystemId = "Please select a related system";
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

export default function CreateTicket() {
  const { requester } = useRequester();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [fields, setFields] = useState<FormFields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormFields, string>>>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState<Ticket | null>(null);

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
    const nextErrors = validate(fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitState("busy");
    try {
      const ticket = await createTicket({
        categoryId: Number(fields.categoryId),
        relatedSystemId: Number(fields.relatedSystemId),
        summary: fields.summary.trim(),
        description: fields.description.trim(),
      });
      setCreated(ticket);
      setFields(EMPTY);
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
      <div className="container py-4" style={{ maxWidth: 720 }}>
        <div
          className="alert p-4 border rounded"
          style={{ backgroundColor: "#EAF6EF", borderColor: "#0B7A46", maxWidth: 640 }}
        >
          <h2 className="h5 text-success mb-2">Ticket created successfully</h2>
          <p className="mb-1">
            Ticket Number: <strong>{created.ticketNumber}</strong>
          </p>
          <p className="mb-0 text-secondary small">
            {created.summary} — Status: {created.status}
          </p>
        </div>
        <button
          className="btn btn-outline-success"
          onClick={() => {
            setCreated(null);
            setSubmitState("idle");
          }}
        >
          Create another ticket
        </button>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      <h1 className="h4 mb-1">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>
      <p className="text-secondary mb-4">
        Creating ticket as <span className="fw-semibold text-success">{requester?.name}</span>
      </p>

      {loadState === "loading" && (
        <p className="text-secondary">
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
          Loading form data…
        </p>
      )}

      {loadState === "error" && (
        <div className="alert alert-danger mb-1">Unable to load form data. Please try again.</div>
      )}

      {loadState === "success" && (
        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            <div className="col-12 col-md-6">
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

            <div className="col-12 col-md-6">
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

            <div className="col-12">
              <label htmlFor="summary" className="form-label">
                Summary <span className="text-danger">*</span>
              </label>
              <input
                id="summary"
                className={`form-control ${errors.summary ? "is-invalid" : ""}`}
                value={fields.summary}
                maxLength={SUMMARY_MAX}
                onChange={(e) => setField("summary", e.target.value)}
                placeholder="Brief summary of the issue"
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
                placeholder="Describe the issue in detail"
              />
              <div className="form-text text-end">{fields.description.length}/{DESCRIPTION_MAX}</div>
              {errors.description && (
                <div className="invalid-feedback d-block">{errors.description}</div>
              )}
            </div>
          </div>

          {serverError && <div className="alert alert-danger mt-3 mb-1">{serverError}</div>}

          <button
            type="submit"
            className="btn btn-success mt-4"
            disabled={submitState === "busy"}
          >
            {submitState === "busy" ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Creating…
              </>
            ) : (
              "Create Ticket"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
