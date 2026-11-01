-- Lab 4 Issue #52 review fix — persist the immutable logical create intent
-- separately from mutable ActionTaken fields. Existing pre-API/seed rows keep
-- NULL because their original create request cannot be reconstructed safely.
BEGIN;

ALTER TABLE "ActionTaken"
  ADD COLUMN "createFingerprint" CHAR(64);

ALTER TABLE "ActionTaken"
  ADD CONSTRAINT "ActionTaken_createFingerprint_check"
  CHECK (
    "createFingerprint" IS NULL
    OR "createFingerprint" ~ '^[0-9a-f]{64}$'
  );

COMMIT;
