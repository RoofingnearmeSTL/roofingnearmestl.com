import { defineConfig, devices } from "@playwright/test";
import { E2E_DASHBOARD_PASSWORD } from "./e2e/test-env";

// Browser tests of the lead form, the thank-you page and the owner dashboard (e2e/). They run against the built site
// (`next build` first) and intercept /api/lead, so no real lead is ever saved or emailed.
// Two servers: 3200 has a test-only dashboard password and an https intro video; 3201 has no dashboard password and an
// http (so invalid) intro video. Every secret is set to '' in both: Next never overrides a variable that is already
// defined, so `next start` here holds none of the real .env.local secrets and the dashboard can make no database call.
// CI uses Playwright's Chromium; on Mike's PC they use the installed Microsoft Edge, so nothing extra is downloaded.
export { E2E_DASHBOARD_PASSWORD };
const PORT = 3200;
const PORT_NO_DASHBOARD = 3201;
const local = !process.env.CI;

const noSecrets = {
  SUPABASE_SERVICE_ROLE_KEY: "", RESEND_API_KEY: "", RESEND_LEAD_CHECK_KEY: "", LEAD_TO_EMAIL: "",
  LEAD_WEBHOOK_URL: "", LEAD_WEBHOOK_SECRET: "", TWILIO_ACCOUNT_SID: "", TWILIO_AUTH_TOKEN: "",
  TWILIO_FROM_NUMBER: "", LEAD_ALERT_PHONE: "", BRAIN_GITHUB_TOKEN: "", CRON_SECRET: "",
  N8N_API_URL: "", N8N_API_KEY: "", N8N_MONTHLY_EXECUTION_LIMIT: "",
};

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
  webServer: [
    {
      command: `npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: local,
      timeout: 120_000,
      env: { ...noSecrets, DASHBOARD_PASSWORD: E2E_DASHBOARD_PASSWORD, INTRO_VIDEO_URL: "https://video.example.invalid/hello" },
    },
    {
      command: `npx next start -p ${PORT_NO_DASHBOARD}`,
      url: `http://localhost:${PORT_NO_DASHBOARD}`,
      reuseExistingServer: local,
      timeout: 120_000,
      env: { ...noSecrets, DASHBOARD_PASSWORD: "", INTRO_VIDEO_URL: "http://video.example.invalid/hello" },
    },
  ],
});
