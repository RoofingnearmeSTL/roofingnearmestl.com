import { defineConfig, devices } from "@playwright/test";

// Browser tests of the lead form (e2e/). They run against the built site (`next build` first) and intercept
// /api/lead, so no real lead is ever saved or emailed. CI uses Playwright's Chromium; on Mike's PC they use the
// installed Microsoft Edge, so nothing extra is downloaded.
const PORT = 3200;
const local = !process.env.CI;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: local ? 0 : 1,
  reporter: local ? "list" : [["github"], ["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...(local ? { channel: "msedge" } : {}) } },
    { name: "phone", use: { ...devices["Pixel 7"], ...(local ? { channel: "msedge" } : {}) } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: local,
    timeout: 120_000,
  },
});
