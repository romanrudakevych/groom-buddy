import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // GitHub Pages serves the app from /groom-buddy/; the deploy workflow sets VITE_BASE.
  base: process.env["VITE_BASE"] ?? "/",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
});
