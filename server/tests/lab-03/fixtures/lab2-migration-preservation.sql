-- Manual migration rehearsal fixture for MIG-01..MIG-06.
-- Prerequisite: the first four Lab 1/Lab 2 migrations have already been applied.

INSERT INTO "Category" ("id", "name")
VALUES (1, 'Software');

INSERT INTO "RelatedSystem" ("id", "name", "description")
VALUES (1, 'Report Portal', 'Reporting application');

INSERT INTO "DevelopmentRequester" ("id", "name", "email", "isActive")
VALUES
  (1, 'Legacy One', 'Legacy.One@TokTick.IT', true),
  (2, 'Legacy Two', 'legacy.two@toktick.it', false);

INSERT INTO "Ticket" (
  "id", "ticketNumber", "summary", "description", "status",
  "requesterId", "categoryId", "relatedSystemId", "requestedPriority"
)
VALUES
  (1, 'TKT-2026-00001', 'Legacy priority ticket', 'Preserve requester and priority.', 'Open', 1, 1, 1, 'High'),
  (2, 'TKT-2026-00002', 'Legacy null priority ticket', 'Preserve historical null priority.', 'New', 2, 1, 1, NULL);

INSERT INTO "Attachment" (
  "id", "fileName", "mimeType", "sizeBytes", "storageKey", "removedAt", "removalReason", "ticketId"
)
VALUES
  (1, 'evidence.pdf', 'application/pdf', 100, 'lab3-migration/evidence.pdf', NULL, NULL, 1),
  (2, 'old.png', 'image/png', 200, 'lab3-migration/old.png', CURRENT_TIMESTAMP, 'Duplicate upload', 2);
