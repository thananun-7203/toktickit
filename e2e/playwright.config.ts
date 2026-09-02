import { defineConfig, devices } from "@playwright/test";

const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://toktickit:toktickit@127.0.0.1:5433/toktickit?schema=public";

export default defineConfig({
  testDir: "./lab-02",
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  outputDir: "../artifacts/lab-02/test-results",
  use: {
    baseURL: "http://127.0.0.1:5174",
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
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        PORT: "3001",
        DATABASE_URL: databaseUrl,
        SEAWEEDFS_FILER_URL: process.env.SEAWEEDFS_FILER_URL ?? "http://127.0.0.1:8888",
      },
    },
    {
      command: "npm --prefix ../client run dev -- --host 127.0.0.1 --port 5174",
      url: "http://127.0.0.1:5174",
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        VITE_API_URL: "http://127.0.0.1:3001",
      },
    },
  ],
});
