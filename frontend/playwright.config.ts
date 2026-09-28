import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.E2E_URL || "http://localhost:3000",
    headless: true,
    trace: "retain-on-failure",
  },
  reporter: "list",
  webServer: process.env.E2E_URL
    ? undefined
    : [
        {
          command: "npm run start --prefix ../backend",
          url: "http://localhost:4000/api/health",
          reuseExistingServer: !process.env.CI,
          timeout: 60000,
        },
        {
          command: "npm run start",
          url: "http://localhost:3000",
          reuseExistingServer: !process.env.CI,
          timeout: 60000,
        },
      ],
});
