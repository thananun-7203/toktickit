type EnvLike = Record<string, string | undefined>;

const LOCAL_HOST_ALIASES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function parseDatabaseUrl(raw: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL URL`);
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error(`${label} must use postgres:// or postgresql://`);
  }
  if (!url.pathname || url.pathname === "/") {
    throw new Error(`${label} must name a database`);
  }
  return url;
}

function canonicalTarget(raw: string, label: string): { key: string; database: string } {
  const url = parseDatabaseUrl(raw, label);
  const hostname = LOCAL_HOST_ALIASES.has(url.hostname.toLowerCase()) ? "local" : url.hostname.toLowerCase();
  const port = url.port || "5432";
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  const schema = url.searchParams.get("schema") ?? "public";
  return {
    key: `${hostname}:${port}/${database}?schema=${schema}`.toLowerCase(),
    database,
  };
}

export function assertSafeTestDatabaseEnvironment(env: EnvLike = process.env): string {
  const testUrl = env.TEST_DATABASE_URL?.trim();
  if (!testUrl) {
    throw new Error(
      "TEST_DATABASE_URL is required for server tests. Refusing to use DATABASE_URL as an implicit test target.",
    );
  }

  const testTarget = canonicalTarget(testUrl, "TEST_DATABASE_URL");
  if (!/(^|[_-])tests?($|[_-])/i.test(testTarget.database)) {
    throw new Error(
      `TEST_DATABASE_URL must point to a database with a test marker in its name (for example "toktickit_test"); received "${testTarget.database}".`,
    );
  }

  const developmentUrl = env.TOKTICKIT_DEVELOPMENT_DATABASE_URL?.trim() || env.DATABASE_URL?.trim();
  if (developmentUrl) {
    const developmentTarget = canonicalTarget(developmentUrl, "DATABASE_URL");
    if (developmentTarget.key === testTarget.key) {
      throw new Error("TEST_DATABASE_URL resolves to the same database/schema as DATABASE_URL; refusing to run tests.");
    }
  }

  return testUrl;
}

export function configureTestDatabaseEnvironment(env: EnvLike = process.env): string {
  if (!env.TOKTICKIT_DEVELOPMENT_DATABASE_URL && env.DATABASE_URL) {
    env.TOKTICKIT_DEVELOPMENT_DATABASE_URL = env.DATABASE_URL;
  }
  const testUrl = assertSafeTestDatabaseEnvironment(env);
  env.DATABASE_URL = testUrl;
  env.TOKTICKIT_TEST_MODE = "1";
  return testUrl;
}

export function isTestDatabaseProcess(env: EnvLike = process.env): boolean {
  return env.TOKTICKIT_TEST_MODE === "1" || env.VITEST === "true" || env.NODE_ENV === "test";
}
