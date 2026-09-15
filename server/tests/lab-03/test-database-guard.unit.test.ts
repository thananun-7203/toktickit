import { describe, expect, it } from "vitest";
import {
  assertSafeTestDatabaseEnvironment,
  configureTestDatabaseEnvironment,
} from "../../src/testDatabaseGuard.js";

describe("Lab 3 test database safety guard", () => {
  it("fails when TEST_DATABASE_URL is missing", () => {
    expect(() => assertSafeTestDatabaseEnvironment({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/toktickit?schema=public",
    })).toThrow(/TEST_DATABASE_URL is required/i);
  });

  it("fails when the test database name does not contain a test marker", () => {
    expect(() => assertSafeTestDatabaseEnvironment({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/toktickit?schema=public",
      TEST_DATABASE_URL: "postgresql://user:pass@localhost:5433/scratch?schema=public",
    })).toThrow(/test marker/i);
  });

  it("fails when TEST_DATABASE_URL resolves to the development database", () => {
    expect(() => assertSafeTestDatabaseEnvironment({
      DATABASE_URL: "postgresql://dev:one@localhost:5432/toktickit_test?schema=public",
      TEST_DATABASE_URL: "postgresql://tester:two@127.0.0.1:5432/toktickit_test?schema=public",
    })).toThrow(/same database\/schema/i);
  });

  it("switches DATABASE_URL only after a distinct test target passes the guard", () => {
    const env: Record<string, string | undefined> = {
      DATABASE_URL: "postgresql://user:pass@localhost:5432/toktickit?schema=public",
      TEST_DATABASE_URL: "postgresql://user:pass@localhost:5435/toktickit_test?schema=public",
    };
    const selected = configureTestDatabaseEnvironment(env);
    expect(selected).toBe(env.TEST_DATABASE_URL);
    expect(env.DATABASE_URL).toBe(env.TEST_DATABASE_URL);
    expect(env.TOKTICKIT_DEVELOPMENT_DATABASE_URL).toContain("/toktickit?");
    expect(env.TOKTICKIT_TEST_MODE).toBe("1");
  });
});
