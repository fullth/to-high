import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["budget.browser.spec.ts", "turn-limit.browser.spec.ts"],
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3103" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command:
      "npm run build && npm run start -- --hostname 127.0.0.1 --port 3103",
    timeout: 120000,
    url: "http://127.0.0.1:3103",
    reuseExistingServer: false,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:3999",
    },
  },
});
