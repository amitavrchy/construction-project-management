import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "marketing.spec.ts",
  workers: 1,
  use: { baseURL: "http://localhost:3002", headless: true },
  webServer: {
    command: "npm run start",
    url: "http://localhost:3002",
    env: { PORT: "3002" },
    reuseExistingServer: !process.env.CI,
  },
});
