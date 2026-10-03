import { defineConfig, devices } from "@playwright/test";

const clientOrigin = "http://127.0.0.1:5174";

export default defineConfig({
  testDir: "./lab-04",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: clientOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm --prefix ../client run dev -- --host 127.0.0.1 --port 5174",
    url: clientOrigin,
    timeout: 60_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      VITE_API_URL: "http://127.0.0.1:3001",
    },
  },
});
