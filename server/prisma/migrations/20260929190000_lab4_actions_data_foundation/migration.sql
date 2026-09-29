-- Lab 4 Issue 2 — Actions Taken data foundation.
-- The migration is additive: existing Lab 1-3 rows are preserved, legacy
-- Tickets receive no synthetic Actions Taken, and historical resolution time
-- is not guessed from Ticket.updatedAt.

-- Keep the full Lab 4 foundation atomic. A failure in any DDL/constraint step
-- rolls the complete migration back.
BEGIN;

CREATE TYPE "ActionTakenStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

ALTER TABLE "Ticket"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "workflowCycle" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "resolvedAt" TIMESTAMP(3);

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_version_check" CHECK ("version" >= 1),
  ADD CONSTRAINT "Ticket_workflowCycle_check" CHECK ("workflowCycle" >= 1);

CREATE TABLE "ActionTaken" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "clientRequestId" UUID NOT NULL,
    "workflowCycle" INTEGER NOT NULL,
    "actionDateTime" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "result" TEXT,
    "followUpRequired" BOOLEAN NOT NULL,
    "followUpNote" TEXT,
    "attachmentNotes" TEXT,
    "status" "ActionTakenStatus" NOT NULL DEFAULT 'PLANNED',
    "createdById" INTEGER NOT NULL,
    "assigneeId" INTEGER NOT NULL,
    "performedById" INTEGER,
    "completedAt" TIMESTAMP(3),
    "cancelledById" INTEGER,
    "cancelledAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ActionTaken_version_check" CHECK ("version" >= 1),
    CONSTRAINT "ActionTaken_workflowCycle_check" CHECK ("workflowCycle" >= 1),
    CONSTRAINT "ActionTaken_description_check" CHECK (
      char_length(btrim("description")) BETWEEN 1 AND 2000
    ),
    CONSTRAINT "ActionTaken_result_length_check" CHECK (
      "result" IS NULL OR char_length(btrim("result")) BETWEEN 1 AND 2000
    ),
    CONSTRAINT "ActionTaken_follow_up_note_length_check" CHECK (
      "followUpNote" IS NULL OR char_length(btrim("followUpNote")) BETWEEN 1 AND 2000
    ),
    CONSTRAINT "ActionTaken_attachment_notes_length_check" CHECK (
      "attachmentNotes" IS NULL OR char_length(btrim("attachmentNotes")) BETWEEN 1 AND 2000
    ),
    CONSTRAINT "ActionTaken_follow_up_consistency_check" CHECK (
      ("followUpRequired" = true AND "followUpNote" IS NOT NULL AND char_length(btrim("followUpNote")) > 0)
      OR
      ("followUpRequired" = false AND "followUpNote" IS NULL)
    ),
    CONSTRAINT "ActionTaken_status_provenance_check" CHECK (
      (
        "status" = 'COMPLETED'
        AND "performedById" IS NOT NULL
        AND "performedById" = "assigneeId"
        AND "completedAt" IS NOT NULL
        AND "result" IS NOT NULL
        AND char_length(btrim("result")) > 0
        AND "cancelledById" IS NULL
        AND "cancelledAt" IS NULL
      )
      OR
      (
        "status" = 'CANCELLED'
        AND "performedById" IS NULL
        AND "completedAt" IS NULL
        AND "cancelledById" IS NOT NULL
        AND "cancelledAt" IS NOT NULL
      )
      OR
      (
        "status" IN ('PLANNED', 'IN_PROGRESS')
        AND "performedById" IS NULL
        AND "completedAt" IS NULL
        AND "cancelledById" IS NULL
        AND "cancelledAt" IS NULL
      )
    )
);

CREATE UNIQUE INDEX "ActionTaken_ticketId_clientRequestId_key"
  ON "ActionTaken"("ticketId", "clientRequestId");
CREATE INDEX "ActionTaken_ticketId_actionDateTime_id_idx"
  ON "ActionTaken"("ticketId", "actionDateTime", "id");
CREATE INDEX "ActionTaken_ticketId_workflowCycle_status_idx"
  ON "ActionTaken"("ticketId", "workflowCycle", "status");
CREATE INDEX "ActionTaken_assigneeId_status_updatedAt_idx"
  ON "ActionTaken"("assigneeId", "status", "updatedAt");
CREATE INDEX "ActionTaken_status_idx" ON "ActionTaken"("status");
CREATE INDEX "ActionTaken_createdById_idx" ON "ActionTaken"("createdById");
CREATE INDEX "ActionTaken_performedById_idx" ON "ActionTaken"("performedById");
CREATE INDEX "ActionTaken_cancelledById_idx" ON "ActionTaken"("cancelledById");

ALTER TABLE "ActionTaken"
  ADD CONSTRAINT "ActionTaken_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken"
  ADD CONSTRAINT "ActionTaken_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken"
  ADD CONSTRAINT "ActionTaken_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken"
  ADD CONSTRAINT "ActionTaken_performedById_fkey"
  FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken"
  ADD CONSTRAINT "ActionTaken_cancelledById_fkey"
  FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Legacy Ticket rows intentionally keep resolvedAt = NULL. Their exact
-- historical resolution moment is unknown and must not be fabricated.

COMMIT;
