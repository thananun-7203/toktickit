export function requireE2eDatabaseUrl(): string {
  const databaseUrl = process.env.E2E_DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "E2E_DATABASE_URL is required for Lab 3/Lab 4 Playwright. Point it to an explicit disposable E2E database.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("E2E_DATABASE_URL must be a valid PostgreSQL URL");
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("E2E_DATABASE_URL must use postgres:// or postgresql://");
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (!/(^|[_-])(test|tests|e2e)($|[_-])/i.test(databaseName)) {
    throw new Error(
      `E2E_DATABASE_URL must point to a database with a test/e2e marker in its name (for example "toktickit_lab4_e2e"); received "${databaseName}".`,
    );
  }

  const developmentUrl = process.env.TOKTICKIT_DEVELOPMENT_DATABASE_URL?.trim();
  if (developmentUrl) {
    let development: URL;
    try {
      development = new URL(developmentUrl);
    } catch {
      throw new Error("TOKTICKIT_DEVELOPMENT_DATABASE_URL must be a valid PostgreSQL URL");
    }
    const target = (url: URL) => {
      const host = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname.toLowerCase())
        ? "local"
        : url.hostname.toLowerCase();
      const port = url.port || "5432";
      const name = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
      const schema = url.searchParams.get("schema") ?? "public";
      return `${host}:${port}/${name}?schema=${schema}`.toLowerCase();
    };
    if (target(parsed) === target(development)) {
      throw new Error("E2E_DATABASE_URL resolves to the configured Development database; refusing to run Playwright.");
    }
  }

  return databaseUrl;
}
