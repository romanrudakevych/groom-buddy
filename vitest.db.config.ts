import { defineConfig } from "vitest/config";

// Database tests against the local Supabase stack: `npm run db:start`, then `npm run test:db`.
export default defineConfig({
  test: {
    include: ["tests/db/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
