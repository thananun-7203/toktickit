type Environment = Record<string, string | undefined>;

const LOCAL_HOST_ALIASES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function parseDatabaseUrl(raw: string, label: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL URL`);
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error(`${label} must use postgres:// or postgresql://`);
  }
  if (!parsed.hostname || !parsed.pathname || parsed.pathname === "/") {
    throw new Error(`${label} must include a database host and database name`);
  }

  try {
    decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  } catch {
    throw new Error(`${label} contains an invalid encoded database name`);
  }

  return parsed;
}

function databaseTarget(url: URL): string {
  const hostname = LOCAL_HOST_ALIASES.has(url.hostname.toLowerCase())
    ? "local"
    : url.hostname.toLowerCase();
  const port = url.port || "5432";
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  const schema = url.searchParams.get("schema") ?? "public";
  return `${hostname}:${port}/${database}?schema=${schema}`.toLowerCase();
}

export function requireE2eDatabaseUrl(env: Environment = process.env): string {
  const databaseUrl = env.E2E_DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "E2E_DATABASE_URL is required for Lab 3/Lab 4 Playwright. Point it to an explicit disposable E2E database.",
    );
  }

  const e2e = parseDatabaseUrl(databaseUrl, "E2E_DATABASE_URL");
  const databaseName = decodeURIComponent(e2e.pathname.replace(/^\/+/, ""));
  if (!/(^|[_-])(test|tests|e2e)($|[_-])/i.test(databaseName)) {
    throw new Error(
      `E2E_DATABASE_URL must point to a database with a test/e2e marker in its name (for example "toktickit_lab4_e2e"); received "${databaseName}".`,
    );
  }

  const developmentUrl = env.TOKTICKIT_DEVELOPMENT_DATABASE_URL?.trim();
  if (!developmentUrl) {
    throw new Error(
      "TOKTICKIT_DEVELOPMENT_DATABASE_URL is required to verify that the E2E target is separate from the Development database; refusing to run Playwright.",
    );
  }

  const development = parseDatabaseUrl(
    developmentUrl,
    "TOKTICKIT_DEVELOPMENT_DATABASE_URL",
  );
  if (databaseTarget(e2e) === databaseTarget(development)) {
    throw new Error(
      "E2E_DATABASE_URL resolves to the configured Development database; refusing to run Playwright.",
    );
  }

  return databaseUrl;
}
