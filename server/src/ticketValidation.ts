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

  if (typeof body.categoryId !== "number" || !Number.isInteger(body.categoryId)) {
    errors.categoryId = "Category is required";
  }
  if (typeof body.relatedSystemId !== "number" || !Number.isInteger(body.relatedSystemId)) {
    errors.relatedSystemId = "Related System is required";
  }

  if (typeof body.summary !== "string" || body.summary.trim().length === 0) {
    errors.summary = "Summary is required";
  } else if (body.summary.length > SUMMARY_MAX) {
    errors.summary = `Summary must be at most ${SUMMARY_MAX} characters`;
  }

  if (typeof body.description !== "string" || body.description.trim().length === 0) {
    errors.description = "Description is required";
  } else if (body.description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be at most ${DESCRIPTION_MAX} characters`;
  }

  return errors;
}
