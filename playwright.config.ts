import { defineConfig, devices } from "@playwright/test";
import { localSupabase } from "./tests/support/local-supabase";

// E2E against the local Supabase stack: `npm run db:start`, then `npm run test:e2e`.
const supabase = localSupabase();
const PORT = 5174; // not the dev server's 5173, so both can run

export default defineConfig({
  testDir: "e2e",
  // The specs share one database, so run them one at a time.
  workers: 1,
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env["CI"],
    // Process env wins over .env files, so a developer's own .env never leaks into the run.
    env: {
      VITE_SUPABASE_URL: supabase.url,
      VITE_SUPABASE_PUBLISHABLE_KEY: supabase.anonKey,
      VITE_PUBLIC_URL: "",
      VITE_LOGIN_EMAIL: "",
      VITE_LOGIN_PASSWORD: "",
    },
  },
});
