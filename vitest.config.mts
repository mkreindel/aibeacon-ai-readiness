import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Pure logic runs in node; component tests opt into jsdom with
    // a "// @vitest-environment jsdom" comment at the top of the file.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "supabase/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
