import { defineConfig, devices } from "@playwright/test";
import { requireE2eDatabaseUrl } from "./e2e-database.js";

const databaseUrl = requireE2eDatabaseUrl();

const clientOrigin = "http://127.0.0.1:5174";

export default defineConfig({
  testDir: "./lab-03",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  outputDir: "../artifacts/lab-03/test-results",
  use: {
    baseURL: clientOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "npm --prefix ../server run dev",
      url: "http://127.0.0.1:3001/api/health",
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: "3001",
        DATABASE_URL: databaseUrl,
        CLIENT_ORIGIN: clientOrigin,
        SEAWEEDFS_FILER_URL: process.env.SEAWEEDFS_FILER_URL ?? "http://127.0.0.1:8888",
      },
    },
    {
      command: "npm --prefix ../client run dev -- --host 127.0.0.1 --port 5174",
      url: clientOrigin,
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_API_URL: "http://127.0.0.1:3001",
      },
    },
  ],
});
