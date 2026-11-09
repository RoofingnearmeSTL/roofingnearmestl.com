import { expect, test } from "@playwright/test";

const LINK = "Meet Mike, the owner: watch a short hello";

test.beforeEach(async ({ page }) => {
  await page.route("**/googletagmanager.com/**", (r) => r.abort());
  await page.route("**/connect.facebook.net/**", (r) => r.abort());
});

for (const path of ["/thank-you", "/thank-you?area=il", "/thank-you?area=il-pending"]) {
  test(`the intro video link shows on ${path} when INTRO_VIDEO_URL is https`, async ({ page }) => {
    await page.goto(path);
    const link = page.getByRole("link", { name: LINK });
    await expect(link).toHaveAttribute("href", "https://video.example.invalid/hello");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  });
}

test("the Missouri wording is unchanged", async ({ page }) => {
  await page.goto("/thank-you");
  await expect(page.getByText("We'll call within 30 mins")).toBeVisible();
});

test("an http intro video value shows no link", async ({ page }) => {
  await page.goto("http://localhost:3201/thank-you");
  await expect(page.getByRole("link", { name: LINK })).toHaveCount(0);
  await expect(page.getByText("We'll call within 30 mins")).toBeVisible();
});
