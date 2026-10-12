import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside React Server Components; unit tests run plain Node.
      "server-only": fileURLToPath(new URL("./tests/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Snapshots and URL assertions assume the production origin.
    env: { NEXT_PUBLIC_SITE_URL: "https://evergreen.example" },
    include: ["tests/unit/**/*.test.ts"],
    testTimeout: 20_000,
  },
});
