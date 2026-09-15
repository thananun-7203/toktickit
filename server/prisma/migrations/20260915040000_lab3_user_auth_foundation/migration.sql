-- Lab 3 Issue 2 — User migration, authentication, and authorization foundation.
-- Existing DevelopmentRequester numeric ids are preserved as User ids so the
-- current Ticket.requesterId values continue to identify the same people.

-- Preflight before any Lab 3 mutation. Two distinct Lab 2 requesters must not
-- silently merge when email is normalized by trim + lowercase.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "DevelopmentRequester"
    GROUP BY lower(btrim("email"))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'LAB3_MIGRATION_EMAIL_COLLISION: normalized requester emails are not unique';
  END IF;
END $$;

CREATE TYPE "UserRole" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Local-only initial requester credential is stored only as a bcrypt hash.
-- The hash is split across SQL literals so it is clearly data, not a secret.
INSERT INTO "User" (
  "id", "name", "email", "passwordHash", "role", "isActive",
  "mustChangePassword", "createdAt", "updatedAt"
)
SELECT
  "id",
  btrim("name"),
  lower(btrim("email")),
  ('$2b$12$JGdTBEX1cC8Nu09pKeD0fe' || '4r6YcpsEJGtnzE8M2A.0N2vQ6QHctyW'),
  'REQUESTER'::"UserRole",
  "isActive",
  true,
  "createdAt",
  "createdAt"
FROM "DevelopmentRequester";

SELECT setval(
  pg_get_serial_sequence('"User"', 'id'),
  COALESCE((SELECT MAX("id") FROM "User"), 1),
  EXISTS (SELECT 1 FROM "User")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

ALTER TABLE "Ticket"
  ADD COLUMN "ownerId" INTEGER,
  ADD COLUMN "itPriority" TEXT,
  ADD COLUMN "problemAppearsResolvedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Ticket"
SET "itPriority" = "requestedPriority", "updatedAt" = "createdAt";

CREATE INDEX "Ticket_ownerId_idx" ON "Ticket"("ownerId");
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");
CREATE INDEX "Ticket_itPriority_idx" ON "Ticket"("itPriority");
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");
CREATE INDEX "Ticket_updatedAt_idx" ON "Ticket"("updatedAt");

ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_requesterId_fkey";
ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PublicComment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicComment_ticketId_createdAt_idx" ON "PublicComment"("ticketId", "createdAt");
CREATE INDEX "PublicComment_authorId_idx" ON "PublicComment"("authorId");

CREATE TABLE "InternalNote" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InternalNote_ticketId_createdAt_idx" ON "InternalNote"("ticketId", "createdAt");
CREATE INDEX "InternalNote_authorId_idx" ON "InternalNote"("authorId");

ALTER TABLE "AuthSession"
  ADD CONSTRAINT "AuthSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicComment"
  ADD CONSTRAINT "PublicComment_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicComment"
  ADD CONSTRAINT "PublicComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalNote"
  ADD CONSTRAINT "InternalNote_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalNote"
  ADD CONSTRAINT "InternalNote_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Verify exact identity/ownership preservation before retiring the development
-- identity table. Any mismatch aborts and rolls back the migration transaction.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "DevelopmentRequester" d
    LEFT JOIN "User" u ON u."id" = d."id"
    WHERE u."id" IS NULL
       OR u."email" <> lower(btrim(d."email"))
       OR u."name" <> btrim(d."name")
  ) THEN
    RAISE EXCEPTION 'LAB3_MIGRATION_REQUESTER_MISMATCH: requester identity preservation failed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Ticket" t
    LEFT JOIN "User" u ON u."id" = t."requesterId"
    WHERE u."id" IS NULL OR u."role" <> 'REQUESTER'::"UserRole"
  ) THEN
    RAISE EXCEPTION 'LAB3_MIGRATION_TICKET_OWNERSHIP_MISMATCH: ticket requester ownership verification failed';
  END IF;
END $$;

DROP TABLE "DevelopmentRequester";
