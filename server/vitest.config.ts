import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Auth/seed coverage performs real bcrypt work. On a busy development
    // machine the default 5s Vitest timeout can be marginal even when the
    // behavior is correct, so give integration-style server tests a little
    // more headroom instead of weakening password hashing in test mode.
    testTimeout: 15_000,
  },
});
