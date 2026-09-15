import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configureTestDatabaseEnvironment } from "../src/testDatabaseGuard.js";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadLocalEnvFile(): void {
  const envPath = path.join(serverDir, ".env");
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    let value = rawValue.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

try {
  loadLocalEnvFile();
  configureTestDatabaseEnvironment(process.env);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Test database guard failed: ${message}`);
  process.exit(1);
}

const vitestCli = path.join(serverDir, "node_modules", "vitest", "vitest.mjs");
const result = spawnSync(process.execPath, [vitestCli, "run", ...process.argv.slice(2)], {
  cwd: serverDir,
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
