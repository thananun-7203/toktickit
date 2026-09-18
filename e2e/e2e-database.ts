export function requireE2eDatabaseUrl(): string {
  const databaseUrl = process.env.E2E_DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "E2E_DATABASE_URL is required for Lab 3 Playwright. Point it to an explicit disposable E2E database.",
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

  return databaseUrl;
}
