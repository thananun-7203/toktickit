-- Lab 4 Issue #67 — required follow-up is not outstanding until the Action is completed.
BEGIN;

ALTER TABLE "ActionTaken"
  DROP CONSTRAINT IF EXISTS "ActionTaken_follow_up_lifecycle_check";

UPDATE "ActionTaken"
SET "followUpStatus" = 'NOT_REQUIRED',
    "followUpCompletedById" = NULL,
    "followUpCompletedAt" = NULL
WHERE "followUpRequired" = true
  AND "status" IN ('PLANNED', 'IN_PROGRESS', 'CANCELLED');

ALTER TABLE "ActionTaken"
  ADD CONSTRAINT "ActionTaken_follow_up_lifecycle_check" CHECK (
    ("followUpRequired" = false
      AND "followUpStatus" = 'NOT_REQUIRED'
      AND "followUpCompletedById" IS NULL
      AND "followUpCompletedAt" IS NULL)
    OR
    ("followUpRequired" = true
      AND "status" IN ('PLANNED', 'IN_PROGRESS', 'CANCELLED')
      AND "followUpStatus" = 'NOT_REQUIRED'
      AND "followUpCompletedById" IS NULL
      AND "followUpCompletedAt" IS NULL)
    OR
    ("followUpRequired" = true
      AND "status" = 'COMPLETED'
      AND "followUpStatus" = 'OUTSTANDING'
      AND "followUpCompletedById" IS NULL
      AND "followUpCompletedAt" IS NULL)
    OR
    ("followUpRequired" = true
      AND "status" = 'COMPLETED'
      AND "followUpStatus" = 'COMPLETED'
      AND "followUpCompletedById" IS NOT NULL
      AND "followUpCompletedAt" IS NOT NULL)
  );

COMMIT;
