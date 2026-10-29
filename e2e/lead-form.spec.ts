import { expect, test, type Page, type Route } from "@playwright/test";

// The lead form, the way a homeowner uses it. /api/lead is intercepted in every test: nothing is saved or emailed.

type Captured = { body: Record<string, unknown> | null };

async function mockLead(page: Page, reply: Record<string, unknown> = { ok: true }, status = 200): Promise<Captured> {
  const captured: Captured = { body: null };
  await page.route("**/api/lead", async (route: Route) => {
    captured.body = route.request().postDataJSON();
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(reply) });
  });
  return captured;
}

const leadForm = (page: Page) => page.locator("form").filter({ has: page.locator('input[name="phone"]') }).first();

test("a Missouri roofing lead is sent with its details and lands on the thank-you page", async ({ page }) => {
  const captured = await mockLead(page);
  await page.goto("/");
  const form = leadForm(page);
  await form.locator('input[name="name"]').fill("Test Homeowner");
  await form.locator('input[name="phone"]').fill("314-555-0100");
  await form.locator('input[name="city"]').fill("Kirkwood");
  await form.locator('select[name="service"]').selectOption("Roof Replacement");
  await form.getByRole("button", { name: /free photo report/i }).click();

  await expect(page).toHaveURL(/\/thank-you$/);
  await expect(page.getByRole("heading", { name: /You're All Set!/i })).toBeVisible();
  await expect(page.getByText("We'll call within 30 mins")).toBeVisible();
  expect(captured.body).toMatchObject({ name: "Test Homeowner", phone: "314-555-0100", city: "Kirkwood", service_type: "Roof Replacement", emergency: false });
  expect(typeof captured.body?.form_ms).toBe("number");
});

test("an Illinois roofing request shows the small license note, is still sent, and gets the Illinois thank-you page", async ({ page }) => {
  const captured = await mockLead(page, { ok: true, area: "il-pending" });
  await page.goto("/");
  const form = leadForm(page);
  await form.locator('input[name="name"]').fill("Test Homeowner");
  await form.locator('input[name="phone"]').fill("618-555-0100");
  await form.locator('input[name="city"]').fill("Waterloo");
  await form.locator('select[name="service"]').selectOption("Roof Repair");
  await expect(form.getByRole("status")).toContainText("pending our IL license");
  await form.getByRole("button", { name: /free photo report/i }).click();

  await expect(page).toHaveURL(/\/thank-you\?area=il-pending$/);
  await expect(page.getByText(/Roofing in Illinois is pending our Illinois roofing license/)).toBeVisible();
  await expect(page.getByText("We'll call within 30 mins")).toHaveCount(0);
  expect(captured.body).toMatchObject({ city: "Waterloo", service_type: "Roof Repair" });
});

test("an Illinois page offers exterior work only, with the storm-damage box instead of a roof tarp", async ({ page }) => {
  await page.goto("/siding-gutters-waterloo-il");
  const form = leadForm(page);
  await expect(form.locator('input[name="urgent"]')).toHaveCount(1);
  await expect(form.locator('input[name="emergency"]')).toHaveCount(0);
  const services = await form.locator('select[name="service"] option').allTextContents();
  expect(services).toContain("Christmas Lights");
  expect(services.some((s) => /^Roof|Leak|Storm Damage \/ Insurance/.test(s))).toBe(false);
});

test("if saving fails, the homeowner is told to call and stays on the page", async ({ page }) => {
  await mockLead(page, { error: "Unable to submit lead" }, 500);
  await page.goto("/");
  const form = leadForm(page);
  await form.locator('input[name="name"]').fill("Test Homeowner");
  await form.locator('input[name="phone"]').fill("314-555-0100");
  const dialog = page.waitForEvent("dialog");
  await form.getByRole("button", { name: /free photo report/i }).click();
  const message = await dialog;
  expect(message.message()).toContain("314-202-7663");
  expect(message.message()).toContain("618-612-5192");
  await message.dismiss();
  await expect(page).not.toHaveURL(/thank-you/);
});

test("the estimator shows a whole-roof price and never a per-square rate", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#roof-squares")).toBeVisible();
  const box = page.locator('[aria-live="polite"]').first();
  await expect(box).toContainText("$");
  await expect(box).not.toContainText("/SQ");
  await expect(page.locator("body")).not.toContainText(/per square(?! f)|Premium from/);
});
