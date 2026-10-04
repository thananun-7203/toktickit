-- Lab 4 Issue #67 — explicit Action follow-up lifecycle.
-- Existing followUpRequired=true Actions become OUTSTANDING so the new
-- lifecycle preserves the existing Resolution Gate semantics.
BEGIN;

CREATE TYPE "ActionFollowUpStatus" AS ENUM ('NOT_REQUIRED', 'OUTSTANDING', 'COMPLETED');

ALTER TABLE "ActionTaken"
  ADD COLUMN "followUpStatus" "ActionFollowUpStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "followUpCompletedById" INTEGER,
  ADD COLUMN "followUpCompletedAt" TIMESTAMP(3);

UPDATE "ActionTaken"
SET "followUpStatus" = 'OUTSTANDING'
WHERE "followUpRequired" = true;

ALTER TABLE "ActionTaken"
  ADD CONSTRAINT "ActionTaken_follow_up_lifecycle_check" CHECK (
    ("followUpRequired" = false AND "followUpStatus" = 'NOT_REQUIRED'
      AND "followUpCompletedById" IS NULL AND "followUpCompletedAt" IS NULL)
    OR
    ("followUpRequired" = true AND "followUpStatus" = 'OUTSTANDING'
      AND "followUpCompletedById" IS NULL AND "followUpCompletedAt" IS NULL)
    OR
    ("followUpRequired" = true AND "followUpStatus" = 'COMPLETED'
      AND "followUpCompletedById" IS NOT NULL AND "followUpCompletedAt" IS NOT NULL)
  );

CREATE INDEX "ActionTaken_followUpStatus_idx"
  ON "ActionTaken"("followUpStatus");
CREATE INDEX "ActionTaken_followUpCompletedById_idx"
  ON "ActionTaken"("followUpCompletedById");

ALTER TABLE "ActionTaken"
  ADD CONSTRAINT "ActionTaken_followUpCompletedById_fkey"
  FOREIGN KEY ("followUpCompletedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
