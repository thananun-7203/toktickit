-- Manual migration rehearsal fixture for MIG-11.
-- Prerequisite: the first four Lab 1/Lab 2 migrations have already been applied.

INSERT INTO "DevelopmentRequester" ("id", "name", "email", "isActive")
VALUES
  (1, 'Collision One', 'Test.User@TokTick.IT', true),
  (2, 'Collision Two', ' test.user@toktick.it ', true);
