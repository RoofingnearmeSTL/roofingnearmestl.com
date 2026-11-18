import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

// /free-inspection ad landing page. /api/lead and /api/estimate-email are intercepted in every test:
// nothing is saved or emailed. Prices in the mocked replies are pricing.ts numbers for 20 SQ architectural, steep.
const PRICE = { price: 15000, low: 9000, high: 15000 };
const READY = {
  status: "ready",
  estimate: { squares: 20, sizeLabel: "20 SQ (about 2,000 sq ft of roof)", materialLabel: "30-Year Architectural", pitchLabel: "Steep Pitch (8/12 - 12/12+)", ...PRICE },
};

type Calls = { lead: Record<string, unknown>[]; estimate: Record<string, unknown>[] };

async function mock(page: Page, leadReply: { status?: number; body: Record<string, unknown> }, estimateReply: Record<string, unknown> = { ok: true, estimate: READY.estimate, email: "sent" }) {
  const calls: Calls = { lead: [], estimate: [] };
  await page.route("**/api/lead", async (route: Route) => {
    calls.lead.push(route.request().postDataJSON());
    await route.fulfill({ status: leadReply.status ?? 200, contentType: "application/json", body: JSON.stringify(leadReply.body) });
  });
  await page.route("**/api/estimate-email", async (route: Route) => {
    calls.estimate.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(estimateReply) });
  });
  return calls;
}

async function open(page: Page) {
  await page.goto("/free-inspection");
  const form = page.locator("form").filter({ has: page.locator('input[name="property_state"]') });
  await expect(form).toHaveAttribute("novalidate", ""); // hydrated
  return form;
}

const field = (form: Locator, name: string) => form.locator(`[name="${name}"]`);
// The project form area (form, then result): prices may appear here only after a request is saved.
const formArea = (page: Page) => page.locator("#project-form");

async function contact(form: Locator) {
  await field(form, "name").fill("Test Homeowner");
  await field(form, "phone").fill("314-555-2368");
  await field(form, "email").fill("pat@example.com");
  await field(form, "address").fill("123 Example St");
  await field(form, "city").fill("Kirkwood");
  await field(form, "zip").fill("63122");
}

async function moReplacement(form: Locator) {
  await form.getByText("Missouri", { exact: true }).click();
  await form.getByLabel("Service needed").selectOption("Roof Replacement");
}

test.beforeEach(async ({ page }) => {
  // Backstop: nothing reaches a real endpoint.
  await page.route("**/api/lead", (route) => route.abort());
  await page.route("**/api/estimate-email", (route) => route.abort());
});

test("headline, supporting copy and no prices before a request is saved", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your Next Exterior Project Starts Here.");
  await expect(page.getByText("Tell us what your home needs. Get straightforward answers and a clear next step.")).toBeVisible();
  await expect(formArea(page)).not.toContainText(/\$\d/);
  await expect(page.locator("video")).toHaveCount(0); // no ad video yet: no empty player
});

test("a Missouri roof replacement saves once, then shows the server's rough estimate", async ({ page }) => {
  const calls = await mock(page, { body: { ok: true, ref: "ref-1", email: "sent", estimate: READY, estimate_token: "v1.test-token" } });
  const form = await open(page);
  await moReplacement(form);
  await expect(form.getByText("Submit your request to view a rough roof replacement estimate and receive a copy by email.")).toBeVisible();
  await form.getByLabel("Roof size in squares").fill("20");
  await form.getByLabel("Material").selectOption("architectural");
  await form.getByLabel("Roof pitch").selectOption("steep");
  await contact(form);
  await expect(formArea(page)).not.toContainText(/\$\d/);
  await form.getByRole("button", { name: "Send Request & Get Rough Estimate" }).click();

  await expect(page.getByText("Your project request is received. Here's your rough estimate.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your Rough Roof Replacement Estimate" })).toBeVisible();
  await expect(page.getByText("$15,000").first()).toBeVisible();
  await expect(page.getByText(/This is a rough planning estimate based on the information you entered/)).toBeVisible();
  await expect(page.getByText("A copy of this estimate was sent to the email address on your request.")).toBeVisible();
  expect(calls.lead).toHaveLength(1);
  const sent = calls.lead[0];
  expect(sent).toMatchObject({ form: "project-request", property_state: "MO", service_type: "Roof Replacement", address: "123 Example St", zip: "63122" });
  expect(sent.estimate_request).toEqual({ size: 20, material: "architectural", pitch: "steep" });
  expect(sent).not.toHaveProperty("est_price");

  // A refresh keeps the result, re-checks it with the server token and never sends another lead.
  await page.reload();
  await expect(page.getByText("$15,000").first()).toBeVisible();
  expect(calls.lead).toHaveLength(1);
  expect(calls.estimate.at(-1)).toMatchObject({ token: "v1.test-token", send: false });

  // Adjusting doesn't create a lead; emailing the update uses the token.
  await page.getByText("Adjust your estimate").click();
  await page.getByRole("slider").fill("24");
  await page.getByRole("button", { name: "Email My Updated Estimate" }).click();
  await expect(page.getByText("Your updated estimate was sent to the email address on your request.")).toBeVisible();
  expect(calls.estimate.at(-1)).toMatchObject({ token: "v1.test-token", send: true, inputs: { size: 24, material: "architectural", pitch: "steep" } });
  expect(calls.lead).toHaveLength(1);
});

test("a failed save keeps every answer and shows no price", async ({ page }) => {
  await mock(page, { status: 500, body: { error: "Unable to submit lead" } });
  const form = await open(page);
  await moReplacement(form);
  await form.getByLabel("Roof size in squares").fill("20");
  await form.getByLabel("Material").selectOption("architectural");
  await form.getByLabel("Roof pitch").selectOption("steep");
  await contact(form);
  await form.getByRole("button", { name: "Send Request & Get Rough Estimate" }).click();
  await expect(form.getByRole("alert")).toContainText("Your answers are still filled in");
  await expect(field(form, "address")).toHaveValue("123 Example St");
  await expect(form.getByLabel("Roof size in squares")).toHaveValue("20");
  await expect(formArea(page)).not.toContainText(/\$\d/);
});

test("I don't know my roof size: sends without a guess and gets the right message", async ({ page }) => {
  const calls = await mock(page, { body: { ok: true, ref: "ref-2", email: "sent", estimate: { status: "needs_measurements" } } });
  const form = await open(page);
  await moReplacement(form);
  await form.getByText("I don't know my roof size").click();
  await contact(form);
  await form.getByRole("button", { name: "Get My Free Inspection →" }).click();
  await expect(page.getByText("Your project request is received. We'll contact you to arrange the next step and confirm the details needed for your quote.")).toBeVisible();
  expect((calls.lead[0].estimate_request as { size: unknown }).size).toBeNull();
  await expect(formArea(page)).not.toContainText(/\$\d/);
});

test("Illinois offers exterior services only, with the approved roofing wording", async ({ page }) => {
  const calls = await mock(page, { body: { ok: true, ref: "ref-3", area: "il", email: "sent" } });
  const form = await open(page);
  await form.getByText("Illinois", { exact: true }).click();
  const options = await form.getByLabel("Service needed").locator("option").allTextContents();
  expect(options.some((o) => /roof|leak/i.test(o))).toBe(false);
  await expect(form.getByText(/Roofing coming soon after IL license/)).toBeVisible();
  await form.getByLabel("Service needed").selectOption("Siding");
  await expect(form.getByLabel("Roof size in squares")).toHaveCount(0);
  await contact(form);
  await field(form, "city").fill("Waterloo");
  await field(form, "zip").fill("62298");
  await form.getByRole("button", { name: "Get My Free Inspection →" }).click();
  await expect(page.getByText("Your project request is received. We'll contact you to discuss the details and arrange the next step.")).toBeVisible();
  await expect(page.getByRole("status").getByRole("link", { name: "618-612-5192" })).toBeVisible();
  expect(calls.lead[0]).toMatchObject({ property_state: "IL", service_type: "Siding" });
  expect(calls.lead[0]).not.toHaveProperty("estimate_request");
});

test("a Missouri roof replacement with an Illinois ZIP shows the license note and no estimator", async ({ page }) => {
  const form = await open(page);
  await moReplacement(form);
  await field(form, "zip").fill("62298");
  await expect(form.getByText(/Roofing in Illinois is pending our IL license/)).toBeVisible();
  await expect(form.getByLabel("Roof size in squares")).toHaveCount(0);
});

test("an empty submit shows inline errors, focuses the first one and sends nothing", async ({ page }) => {
  const calls = await mock(page, { body: { ok: true } });
  const form = await open(page);
  await form.getByRole("button", { name: "Get My Free Inspection →" }).click();
  await expect(form.getByText("Choose the state the property is in.")).toBeVisible();
  await expect(form.getByText("Choose the service you need.")).toBeVisible();
  await expect(form.getByText("This field is required").first()).toBeVisible();
  await expect(form.locator('input[name="property_state"]').first()).toBeFocused();
  expect(calls.lead).toHaveLength(0);
});

test("roof size is required unless the visitor says they don't know it", async ({ page }) => {
  const calls = await mock(page, { body: { ok: true } });
  const form = await open(page);
  await moReplacement(form);
  await contact(form);
  await form.getByRole("button", { name: "Get My Free Inspection →" }).click();
  await expect(form.getByText(/Enter a whole number from 10 to 40/)).toBeVisible();
  await expect(form.getByLabel("Roof size in squares")).toBeFocused();
  expect(calls.lead).toHaveLength(0);
});

test("phone: the sticky bar calls the selected state's number and hides over the form", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout only");
  const form = await open(page);
  const bar = page.getByRole("navigation", { name: "Call or start your project" });
  await page.getByRole("heading", { name: "Good to know before you start" }).scrollIntoViewIfNeeded();
  await expect(bar.getByRole("link", { name: /314-202-7663/ })).toBeInViewport();
  await bar.getByRole("button", { name: "Start My Project" }).click();
  await expect(form).toBeInViewport();
  await expect(bar).not.toBeInViewport();
  await form.getByText("Illinois", { exact: true }).click();
  await page.getByRole("heading", { name: "Good to know before you start" }).scrollIntoViewIfNeeded();
  await expect(bar.getByRole("link", { name: /618-612-5192/ })).toBeInViewport();
});
