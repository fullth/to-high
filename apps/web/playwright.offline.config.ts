import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: ["streaming-api.spec.ts", "guest-capability.spec.ts", "budget-api.spec.ts"],
  workers: 1,
  reporter: "list",
});
