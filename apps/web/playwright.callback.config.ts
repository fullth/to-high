import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["auth-callback.browser.spec.ts", "product-mvp.browser.spec.ts"],
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3101" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3101",
    timeout: 120000,
    url: "http://127.0.0.1:3101",
    reuseExistingServer: false,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:3999",
    },
  },
});
