/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // GitHub Pages serves the app from /groom-buddy/; the deploy workflow sets VITE_BASE.
  base: process.env["VITE_BASE"] ?? "/",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  test: {
    // Unit tests run in node; component tests opt into jsdom with `// @vitest-environment jsdom`.
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
  },
});
