import { describe, expect, it } from "vitest";
import { requireE2eDatabaseUrl } from "../../../e2e/e2e-database.js";

const safeEnvironment = {
  E2E_DATABASE_URL:
    "postgresql://tester:secret@127.0.0.1:5433/toktickit_lab4_e2e?schema=public",
  TOKTICKIT_DEVELOPMENT_DATABASE_URL:
    "postgresql://developer:secret@localhost:5432/toktickit?schema=public",
};

describe("Lab 4 Playwright E2E database safety guard", () => {
  it("requires an explicit E2E database URL", () => {
    expect(() => requireE2eDatabaseUrl({
      TOKTICKIT_DEVELOPMENT_DATABASE_URL: safeEnvironment.TOKTICKIT_DEVELOPMENT_DATABASE_URL,
    })).toThrow(/E2E_DATABASE_URL is required/i);
  });

  it("rejects E2E targets without a test/e2e marker", () => {
    expect(() => requireE2eDatabaseUrl({
      ...safeEnvironment,
      E2E_DATABASE_URL:
        "postgresql://tester:secret@127.0.0.1:5433/toktickit?schema=public",
    })).toThrow(/test\/e2e marker/i);
  });

  it("fails closed when the Development database identity is missing", () => {
    expect(() => requireE2eDatabaseUrl({
      E2E_DATABASE_URL: safeEnvironment.E2E_DATABASE_URL,
    })).toThrow(/TOKTICKIT_DEVELOPMENT_DATABASE_URL is required/i);
  });

  it("rejects a malformed Development database URL", () => {
    expect(() => requireE2eDatabaseUrl({
      ...safeEnvironment,
      TOKTICKIT_DEVELOPMENT_DATABASE_URL: "not-a-database-url",
    })).toThrow(/TOKTICKIT_DEVELOPMENT_DATABASE_URL must be a valid PostgreSQL URL/i);
  });

  it("rejects a Development URL that does not use PostgreSQL", () => {
    expect(() => requireE2eDatabaseUrl({
      ...safeEnvironment,
      TOKTICKIT_DEVELOPMENT_DATABASE_URL: "mysql://localhost:3306/toktickit",
    })).toThrow(/TOKTICKIT_DEVELOPMENT_DATABASE_URL must use postgres/i);
  });

  it("rejects the same database when localhost aliases differ", () => {
    expect(() => requireE2eDatabaseUrl({
      E2E_DATABASE_URL:
        "postgresql://tester:secret@127.0.0.1:5432/toktickit_lab4_e2e?schema=public",
      TOKTICKIT_DEVELOPMENT_DATABASE_URL:
        "postgresql://developer:secret@localhost:5432/toktickit_lab4_e2e?schema=public",
    })).toThrow(/configured Development database/i);
  });

  it("accepts a distinct E2E database when both identities are valid", () => {
    expect(requireE2eDatabaseUrl(safeEnvironment)).toBe(safeEnvironment.E2E_DATABASE_URL);
  });
});
