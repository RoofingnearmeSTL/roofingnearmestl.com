import { expect, test, type Page } from "@playwright/test";
import { E2E_DASHBOARD_PASSWORD } from "./test-env";

// The owner dashboard. The test servers hold no database key, so no database is ever called.

async function blockTags(page: Page) {
  await page.route("**/googletagmanager.com/**", (r) => r.abort());
  await page.route("**/google-analytics.com/**", (r) => r.abort());
  await page.route("**/connect.facebook.net/**", (r) => r.abort());
}

test("the dashboard asks for a password and is not indexed", async ({ request }) => {
  const res = await request.get("/dashboard");
  expect(res.status()).toBe(401);
  expect(res.headers()["www-authenticate"]).toMatch(/^Basic realm=/);
  expect(res.headers()["x-robots-tag"]).toContain("noindex");
});

test("a wrong password is refused", async ({ request }) => {
  const res = await request.get("/dashboard/brain", { headers: { Authorization: "Basic " + Buffer.from("owner:wrong-password-here").toString("base64") } });
  expect(res.status()).toBe(401);
});

test("robots.txt disallows the dashboard and the sitemap leaves it out", async ({ request }) => {
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /dashboard");
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/dashboard");
});

test("with no dashboard password set the dashboard is a 404", async ({ request }) => {
  expect((await request.get("http://localhost:3201/dashboard")).status()).toBe(404);
  expect((await request.get("http://localhost:3201/dashboard/brain")).status()).toBe(404);
});

test.describe("signed in", () => {
  test.use({ httpCredentials: { username: "owner", password: E2E_DASHBOARD_PASSWORD } });

  test("the overview shows its sections, says what is not set up, and loads no ad tags", async ({ page }) => {
    await blockTags(page);
    const tagRequests: string[] = [];
    page.on("request", (r) => { if (/googletagmanager\.com|connect\.facebook\.net/.test(r.url())) tagRequests.push(r.url()); });
    const res = await page.goto("/dashboard");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Owner dashboard" })).toBeVisible();
    for (const name of ["Leads", "Competitors", "Brain", "How everything connects"]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    await expect(page.getByText("Not set up yet").first()).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect(tagRequests).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("the notes page renders the search box and the not-set-up message", async ({ page }) => {
    await blockTags(page);
    const res = await page.goto("/dashboard/brain?q=test");
    expect(res?.status()).toBe(200);
    await expect(page.getByLabel("Search notes")).toBeVisible();
    await expect(page.getByText("Not set up yet").first()).toBeVisible();
  });
});
