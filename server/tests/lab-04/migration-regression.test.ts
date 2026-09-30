import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const prismaCli = path.join(serverDir, "node_modules", "prisma", "build", "index.js");
const migrationRoot = path.join(serverDir, "prisma", "migrations");

const LAB3_MIGRATIONS = [
  "20260815040049_init",
  "20260827125959_lab2_dev_requester_context",
  "20260904123000_attachment_removal_reason",
  "20260904160000_ticket_requested_priority",
  "20260915040000_lab3_user_auth_foundation",
] as const;

const LAB4_MIGRATION = "20260929190000_lab4_actions_data_foundation";
const LAB4_IDEMPOTENCY_MIGRATION = "20260930153000_lab4_action_create_fingerprint";
const schemasToDrop = new Set<string>();

function quoteIdent(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function freshSchema(label: string): string {
  const schema = `lab4_${label}_${process.pid}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
  schemasToDrop.add(schema);
  return schema;
}

function migrationSql(name: string): string {
  return readFileSync(path.join(migrationRoot, name, "migration.sql"), "utf8");
}

function executeSqlInSchema(schema: string, sql: string, expectSuccess = true) {
  const input = `SET search_path TO ${quoteIdent(schema)}, public;\n${sql}`;
  const result = spawnSync(
    process.execPath,
    [prismaCli, "db", "execute", "--stdin", "--schema", "prisma/schema.prisma"],
    {
      cwd: serverDir,
      env: process.env,
      input,
      encoding: "utf8",
    },
  );

  if (expectSuccess && result.status !== 0) {
    throw new Error(`SQL execution failed for ${schema}:\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

async function createLab3Schema(schema: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.$executeRawUnsafe(`CREATE SCHEMA ${quoteIdent(schema)}`);
  for (const migration of LAB3_MIGRATIONS) {
    executeSqlInSchema(schema, migrationSql(migration));
  }
}

async function insertLab3Fixture(schema: string): Promise<void> {
  const prisma = getPrisma();
  const s = quoteIdent(schema);

  await prisma.$executeRawUnsafe(
    `INSERT INTO ${s}."Category" ("id", "name") VALUES (1, 'Software')`,
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO ${s}."RelatedSystem" ("id", "name", "description") VALUES (1, 'Report Portal', 'Migration fixture')`,
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO ${s}."User" ("id", "name", "email", "passwordHash", "role", "isActive", "mustChangePassword") VALUES
      (1, 'Legacy Requester', 'legacy.requester@toktick.it', 'fixture-hash', 'REQUESTER', true, false),
      (2, 'Legacy Staff', 'legacy.staff@toktick.it', 'fixture-hash', 'IT_STAFF', true, false)`,
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO ${s}."Ticket" (
      "id", "ticketNumber", "summary", "description", "requestedPriority", "itPriority", "status",
      "problemAppearsResolvedAt", "createdAt", "updatedAt", "requesterId", "ownerId", "categoryId", "relatedSystemId"
    ) VALUES (
      1, 'TKT-LAB4-MIG-001', 'Legacy resolved ticket', 'Must survive Lab 4 migration',
      'High', 'High', 'Resolved', NULL, '2026-09-01T00:00:00Z', '2026-09-02T00:00:00Z', 1, 2, 1, 1
    )`,
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO ${s}."Attachment" ("id", "fileName", "mimeType", "sizeBytes", "storageKey", "removedAt", "removalReason", "ticketId")
     VALUES (1, 'legacy.txt', 'text/plain', 12, 'legacy/key', NULL, NULL, 1)`,
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO ${s}."PublicComment" ("id", "ticketId", "authorId", "content")
     VALUES (1, 1, 2, 'Legacy public comment')`,
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO ${s}."InternalNote" ("id", "ticketId", "authorId", "content")
     VALUES (1, 1, 2, 'Legacy internal note')`,
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO ${s}."AuthSession" ("id", "tokenHash", "userId", "expiresAt")
     VALUES ('legacy-session', 'legacy-token-hash', 2, '2026-10-01T00:00:00Z')`,
  );
}

async function countRows(schema: string, table: string): Promise<number> {
  const rows = await getPrisma().$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM ${quoteIdent(schema)}.${quoteIdent(table)}`,
  );
  return Number(rows[0]?.count ?? 0n);
}

async function dropCreatedSchemas(): Promise<void> {
  const prisma = getPrisma();
  for (const schema of schemasToDrop) {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${quoteIdent(schema)} CASCADE`);
  }
  schemasToDrop.clear();
}

afterEach(dropCreatedSchemas);
afterAll(async () => {
  await dropCreatedSchemas();
  await getPrisma().$disconnect();
});

describe("Lab 4 migration regression", () => {
  it("MIG-01/MIG-02/MIG-03/MIG-05: upgrades a Lab 3-shaped schema without rewriting legacy data", async () => {
    const schema = freshSchema("preserve");
    await createLab3Schema(schema);
    await insertLab3Fixture(schema);

    const before = {
      users: await countRows(schema, "User"),
      sessions: await countRows(schema, "AuthSession"),
      tickets: await countRows(schema, "Ticket"),
      attachments: await countRows(schema, "Attachment"),
      comments: await countRows(schema, "PublicComment"),
      notes: await countRows(schema, "InternalNote"),
    };

    executeSqlInSchema(schema, migrationSql(LAB4_MIGRATION));

    const after = {
      users: await countRows(schema, "User"),
      sessions: await countRows(schema, "AuthSession"),
      tickets: await countRows(schema, "Ticket"),
      attachments: await countRows(schema, "Attachment"),
      comments: await countRows(schema, "PublicComment"),
      notes: await countRows(schema, "InternalNote"),
    };
    expect(after).toEqual(before);
    expect(await countRows(schema, "ActionTaken")).toBe(0);

    const legacyTickets = await getPrisma().$queryRawUnsafe<
      Array<{ status: string; ownerId: number | null; version: number; workflowCycle: number; resolvedAt: Date | null }>
    >(
      `SELECT "status", "ownerId", "version", "workflowCycle", "resolvedAt"
       FROM ${quoteIdent(schema)}."Ticket" WHERE "ticketNumber" = 'TKT-LAB4-MIG-001'`,
    );
    expect(legacyTickets).toHaveLength(1);
    expect(legacyTickets[0]).toMatchObject({
      status: "Resolved",
      ownerId: 2,
      version: 1,
      workflowCycle: 1,
      resolvedAt: null,
    });

    const actionColumns = await getPrisma().$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = '${schema}' AND table_name = 'ActionTaken'`,
    );
    const columnNames = new Set(actionColumns.map((row) => row.column_name));
    for (const required of [
      "clientRequestId",
      "workflowCycle",
      "performedById",
      "completedAt",
      "cancelledById",
      "cancelledAt",
      "version",
    ]) {
      expect(columnNames.has(required)).toBe(true);
    }

    const indexes = await getPrisma().$queryRawUnsafe<Array<{ indexname: string }>>(
      `SELECT indexname FROM pg_indexes WHERE schemaname = '${schema}' AND tablename = 'ActionTaken'`,
    );
    const indexNames = new Set(indexes.map((row) => row.indexname));
    expect(indexNames.has("ActionTaken_ticketId_clientRequestId_key")).toBe(true);
    expect(indexNames.has("ActionTaken_ticketId_workflowCycle_status_idx")).toBe(true);
    expect(indexNames.has("ActionTaken_assigneeId_status_updatedAt_idx")).toBe(true);

    const s = quoteIdent(schema);
    await getPrisma().$executeRawUnsafe(
      `INSERT INTO ${s}."ActionTaken" (
        "ticketId", "clientRequestId", "workflowCycle", "actionDateTime", "description",
        "followUpRequired", "status", "createdById", "assigneeId"
      ) VALUES (1, '11111111-1111-4111-8111-111111111111', 1, CURRENT_TIMESTAMP, 'Valid planned action', false, 'PLANNED', 2, 2)`,
    );

    await expect(
      getPrisma().$executeRawUnsafe(
        `INSERT INTO ${s}."ActionTaken" (
          "ticketId", "clientRequestId", "workflowCycle", "actionDateTime", "description",
          "followUpRequired", "status", "createdById", "assigneeId"
        ) VALUES (1, '11111111-1111-4111-8111-111111111111', 1, CURRENT_TIMESTAMP, 'Duplicate idempotency key', false, 'PLANNED', 2, 2)`,
      ),
    ).rejects.toThrow();

    await expect(
      getPrisma().$executeRawUnsafe(
        `INSERT INTO ${s}."ActionTaken" (
          "ticketId", "clientRequestId", "workflowCycle", "actionDateTime", "description",
          "followUpRequired", "status", "createdById", "assigneeId"
        ) VALUES (1, '22222222-2222-4222-8222-222222222222', 1, CURRENT_TIMESTAMP, 'Missing follow-up note', true, 'PLANNED', 2, 2)`,
      ),
    ).rejects.toThrow();

    await expect(
      getPrisma().$executeRawUnsafe(
        `INSERT INTO ${s}."ActionTaken" (
          "ticketId", "clientRequestId", "workflowCycle", "actionDateTime", "description", "result",
          "followUpRequired", "status", "createdById", "assigneeId", "performedById", "completedAt"
        ) VALUES (1, '33333333-3333-4333-8333-333333333333', 1, CURRENT_TIMESTAMP, 'Bad performer', 'Done', false, 'COMPLETED', 2, 1, 2, CURRENT_TIMESTAMP)`,
      ),
    ).rejects.toThrow();
  }, 45_000);

  it("MIG-06: immutable create-fingerprint migration preserves existing Actions and accepts only SHA-256 hex", async () => {
    const schema = freshSchema("fingerprint");
    await createLab3Schema(schema);
    await insertLab3Fixture(schema);
    executeSqlInSchema(schema, migrationSql(LAB4_MIGRATION));

    const s = quoteIdent(schema);
    await getPrisma().$executeRawUnsafe(
      `INSERT INTO ${s}."ActionTaken" (
        "ticketId", "clientRequestId", "workflowCycle", "actionDateTime", "description",
        "followUpRequired", "status", "createdById", "assigneeId"
      ) VALUES (1, '44444444-4444-4444-8444-444444444444', 1, CURRENT_TIMESTAMP, 'Pre-fingerprint Action', false, 'PLANNED', 2, 2)`,
    );

    executeSqlInSchema(schema, migrationSql(LAB4_IDEMPOTENCY_MIGRATION));
    expect(await countRows(schema, "ActionTaken")).toBe(1);
    const rows = await getPrisma().$queryRawUnsafe<Array<{ createFingerprint: string | null }>>(
      `SELECT "createFingerprint" FROM ${s}."ActionTaken" WHERE "clientRequestId" = '44444444-4444-4444-8444-444444444444'`,
    );
    expect(rows).toEqual([{ createFingerprint: null }]);

    await expect(
      getPrisma().$executeRawUnsafe(
        `UPDATE ${s}."ActionTaken" SET "createFingerprint" = 'not-a-valid-fingerprint'
         WHERE "clientRequestId" = '44444444-4444-4444-8444-444444444444'`,
      ),
    ).rejects.toThrow();
    const valid = "a".repeat(64);
    await getPrisma().$executeRawUnsafe(
      `UPDATE ${s}."ActionTaken" SET "createFingerprint" = '${valid}'
       WHERE "clientRequestId" = '44444444-4444-4444-8444-444444444444'`,
    );
  }, 45_000);

  it("MIG-04: a forced failure before COMMIT rolls the complete Lab 4 migration back", async () => {
    const schema = freshSchema("rollback");
    await createLab3Schema(schema);
    await insertLab3Fixture(schema);

    const beforeTicketCount = await countRows(schema, "Ticket");
    const original = migrationSql(LAB4_MIGRATION);
    const forcedFailure = original.replace(
      /COMMIT;\s*$/,
      () => "DO $$ BEGIN RAISE EXCEPTION 'LAB4_TEST_FORCED_FAILURE'; END $$;\nCOMMIT;\n",
    );
    const result = executeSqlInSchema(schema, forcedFailure, false);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain("LAB4_TEST_FORCED_FAILURE");

    expect(await countRows(schema, "Ticket")).toBe(beforeTicketCount);

    const newColumns = await getPrisma().$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = '${schema}' AND table_name = 'Ticket'
         AND column_name IN ('version', 'workflowCycle', 'resolvedAt')`,
    );
    expect(newColumns).toHaveLength(0);

    const actionTables = await getPrisma().$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = '${schema}' AND table_name = 'ActionTaken'`,
    );
    expect(actionTables).toHaveLength(0);

    const legacy = await getPrisma().$queryRawUnsafe<Array<{ status: string; ownerId: number | null }>>(
      `SELECT "status", "ownerId" FROM ${quoteIdent(schema)}."Ticket"
       WHERE "ticketNumber" = 'TKT-LAB4-MIG-001'`,
    );
    expect(legacy).toEqual([{ status: "Resolved", ownerId: 2 }]);
  }, 45_000);
});
