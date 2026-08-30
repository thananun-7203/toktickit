// Lab 2 Issue 3 — Ticket input validation (BR-3).
// Pure functions so they can be unit-tested without a database.

export const SUMMARY_MAX = 100;
export const DESCRIPTION_MAX = 2000;

export interface TicketInput {
  categoryId?: unknown;
  relatedSystemId?: unknown;
  summary?: unknown;
  description?: unknown;
}

// Returns a map of field -> message for every validation problem, or an empty
// object when the payload is valid.
export function validateTicketInput(body: TicketInput): Record<string, string> {
  const errors: Record<string, string> = {};

  // Referenced ids must be positive integers; values like 0 or negatives are
  // malformed payloads (400 per api-spec.md). The 404 "not found" path is meant
  // only for well-formed ids that do not exist (handled in app.ts).
  if (typeof body.categoryId !== "number" || !Number.isInteger(body.categoryId) || body.categoryId <= 0) {
    errors.categoryId = "Category must be a positive integer";
  }
  if (
    typeof body.relatedSystemId !== "number" ||
    !Number.isInteger(body.relatedSystemId) ||
    body.relatedSystemId <= 0
  ) {
    errors.relatedSystemId = "Related System must be a positive integer";
  }

  // Lengths are validated on the trimmed value so validation and the persisted
  // value stay consistent, matching the client's normalize-before-check.
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";

  if (summary.length === 0) {
    errors.summary = "Summary is required";
  } else if (summary.length > SUMMARY_MAX) {
    errors.summary = `Summary must be at most ${SUMMARY_MAX} characters`;
  }

  if (description.length === 0) {
    errors.description = "Description is required";
  } else if (description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be at most ${DESCRIPTION_MAX} characters`;
  }

  return errors;
}
