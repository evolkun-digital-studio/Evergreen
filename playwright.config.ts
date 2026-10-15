import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// Runs against an already-running server: E2E_BASE_URL (default http://localhost:3000).
const systemChrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    launchOptions: existsSync(systemChrome) ? { executablePath: systemChrome } : {},
  },
});
