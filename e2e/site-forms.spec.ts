import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

// The project request form on the homepage, service and city pages and the roof cost guide (sitewide since
// Nov 15 2026). /api/lead and /api/estimate-email are intercepted in every test: nothing is saved or emailed.
// /free-inspection has its own spec (e2e/free-inspection.spec.ts) for the same component.

type Calls = { lead: Record<string, unknown>[] };

async function mockLead(page: Page, reply: Record<string, unknown>, status = 200): Promise<Calls> {
  const calls: Calls = { lead: [] };
  await page.route("**/api/lead", async (route: Route) => {
    calls.lead.push(route.request().postDataJSON());
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(reply) });
  });
  return calls;
}

test.beforeEach(async ({ page }) => {
  // Backstop: nothing reaches a real endpoint.
  await page.route("**/api/lead", (route) => route.abort());
  await page.route("**/api/estimate-email", (route) => route.abort());
});

async function open(page: Page, path: string, options?: { referer?: string }) {
  await page.goto(path, options);
  const form = page.locator("form[data-project-request]");
  await expect(form).toHaveAttribute("novalidate", ""); // hydrated
  return form;
}

const field = (form: Locator, name: string) => form.locator(`[name="${name}"]`);

async function contact(form: Locator, zip = "63122", city = "Kirkwood") {
  await field(form, "name").fill("Test Homeowner");
  await field(form, "phone").fill("314-555-2368");
  await field(form, "email").fill("pat@example.com");
  await field(form, "address").fill("123 Example St");
  await field(form, "city").fill(city);
  await field(form, "zip").fill(zip);
}

test("homepage: no instant prices, state first, and an exterior request stays on the page", async ({ page }) => {
  const calls = await mockLead(page, { ok: true, ref: "r-home", email: "sent" });
  const form = await open(page, "/");
  await expect(page.locator("main")).not.toContainText(/\$\d[\d,]*\s*(-|–|to)\s*\$\d/); // no written price ranges
  await expect(page.locator("#estimate")).not.toContainText(/\$\d/);
  await expect(page.locator("[data-estimate-boxes]")).toBeVisible();
  await expect(form.locator('input[name="property_state"]:checked')).toHaveCount(0);
  await form.getByText("Missouri", { exact: true }).click();
  await form.getByLabel("Service needed").selectOption("Siding");
  await contact(form);
  await form.getByRole("button", { name: "Get My Free Inspection →" }).click();
  await expect(page.getByText("Your project request is received. We'll contact you to discuss the details and arrange the next step.")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  expect(calls.lead).toHaveLength(1);
  expect(calls.lead[0]).toMatchObject({ form: "project-request", property_state: "MO", service_type: "Siding", address: "123 Example St" });
});

test("homepage: the estimator boxes carry size, material and pitch into the form; the price comes only after saving", async ({ page }) => {
  const calls = await mockLead(page, {
    ok: true, ref: "r-est", email: "sent", estimate_token: "v1.t",
    estimate: { status: "ready", estimate: { squares: 18, sizeLabel: "18 SQ (about 1,800 sq ft of roof)", materialLabel: "30-Year Architectural", pitchLabel: "Medium Pitch (5/12 - 7/12)", price: 10800, low: 8100, high: 13500 } },
  });
  const form = await open(page, "/");
  const boxes = page.locator("[data-estimate-boxes]");
  await boxes.getByLabel("Roof size in squares").fill("18");
  await boxes.getByLabel("Material").selectOption("architectural");
  await boxes.getByLabel("Roof pitch").selectOption("medium");
  await expect(boxes).toContainText("Your price shows after you send the request form");
  await expect(boxes).not.toContainText(/\$\d/);
  await boxes.getByRole("button", { name: "Continue to the Request Form" }).click();
  await expect(form.locator('input[name="property_state"][value="MO"]')).toBeChecked();
  await expect(form.getByLabel("Service needed")).toHaveValue("Roof Replacement");
  await expect(form.getByLabel("Roof size in squares")).toHaveValue("18");
  await expect(form.getByLabel("Material")).toHaveValue("architectural");
  await expect(form.getByLabel("Roof pitch")).toHaveValue("medium");
  await contact(form);
  await expect(page.locator("#estimate")).not.toContainText(/\$\d/);
  await form.getByRole("button", { name: "Send Request & Get Rough Estimate" }).click();
  await expect(page.getByText("$10,800").first()).toBeVisible();
  await expect(page.getByText(/This is a rough planning estimate/)).toBeVisible();
  expect(calls.lead[0].estimate_request).toEqual({ size: 18, material: "architectural", pitch: "medium" });
});

test("an Illinois page starts on Illinois, offers exterior work only, and keeps the town", async ({ page }) => {
  const calls = await mockLead(page, { ok: true, ref: "r-il", area: "il", email: "sent" });
  const form = await open(page, "/siding-gutters-waterloo-il");
  await expect(form.locator('input[name="property_state"][value="IL"]')).toBeChecked();
  const options = await form.getByLabel("Service needed").locator("option").allTextContents();
  expect(options.some((o) => /roof|leak/i.test(o))).toBe(false);
  await expect(field(form, "city")).toHaveValue("Waterloo");
  await form.getByLabel("Service needed").selectOption("Gutters / Downspouts");
  await contact(form, "62298", "Waterloo");
  await form.getByRole("button", { name: "Get My Free Inspection →" }).click();
  await expect(page.getByText("Your project request is received. We'll contact you to discuss the details and arrange the next step.")).toBeVisible();
  expect(calls.lead[0]).toMatchObject({ property_state: "IL", service_type: "Gutters / Downspouts" });
});

test("the roof replacement page starts on Missouri + Roof Replacement with the estimate inputs and no prices", async ({ page }) => {
  const form = await open(page, "/roof-replacement");
  await expect(form.locator('input[name="property_state"][value="MO"]')).toBeChecked();
  await expect(form.getByLabel("Service needed")).toHaveValue("Roof Replacement");
  await expect(form.getByLabel("Roof size in squares")).toBeVisible();
  await expect(page.locator("#estimate")).not.toContainText(/\$\d/);
  await expect(page.getByRole("heading", { name: "Rough Roof Replacement Estimate" })).toBeVisible();
});

test("the roof cost guide uses the same form", async ({ page }) => {
  const form = await open(page, "/blog/roof-replacement-cost-st-louis-mo");
  await expect(form.getByLabel("Service needed")).toHaveValue("Roof Replacement");
  await expect(form.getByText("Submit your request to view a rough roof replacement estimate and receive a copy by email.")).toBeVisible();
});

test("a failed save keeps every answer and offers both phone numbers", async ({ page }) => {
  await mockLead(page, { error: "Unable to submit lead" }, 500);
  const form = await open(page, "/");
  await form.getByText("Missouri", { exact: true }).click();
  await form.getByLabel("Service needed").selectOption("Siding");
  await contact(form);
  await form.getByRole("button", { name: "Get My Free Inspection →" }).click();
  const alert = form.getByRole("alert");
  await expect(alert).toContainText("Your answers are still filled in");
  await expect(alert).toContainText("314-202-7663");
  await expect(alert).toContainText("618-612-5192");
  await expect(field(form, "address")).toHaveValue("123 Example St");
});

test("an email typo gets a suggestion that is applied only when tapped", async ({ page }) => {
  const calls = await mockLead(page, { ok: true, ref: "r-typo", email: "sent" });
  const form = await open(page, "/");
  await form.getByText("Missouri", { exact: true }).click();
  await form.getByLabel("Service needed").selectOption("Siding");
  await contact(form);
  await field(form, "email").fill("pat@gmial.com");
  await field(form, "email").blur();
  await expect(form.getByText(/Did you mean pat@gmail\.com\?/)).toBeVisible();
  await form.getByRole("button", { name: "Use pat@gmail.com" }).click();
  await expect(field(form, "email")).toHaveValue("pat@gmail.com");
  await form.getByRole("button", { name: "Get My Free Inspection →" }).click();
  await expect(page.getByText(/Your project request is received/)).toBeVisible();
  expect(calls.lead[0].email).toBe("pat@gmail.com");
});

test("ad click IDs and the referring website reach the payload", async ({ page }) => {
  const calls = await mockLead(page, { ok: true, ref: "r-src", email: "sent" });
  await page.goto("/?wbraid=test-wbraid-1");
  const form = await open(page, "/?gbraid=test-gbraid-1", { referer: "https://www.google.com/" });
  await form.getByText("Missouri", { exact: true }).click();
  await form.getByLabel("Service needed").selectOption("Siding");
  await contact(form);
  await form.getByRole("button", { name: "Get My Free Inspection →" }).click();
  await expect(page.getByText(/Your project request is received/)).toBeVisible();
  expect(calls.lead[0].gbraid).toBe("test-gbraid-1");
  expect(String(calls.lead[0].landing_page)).toContain("gbraid=test-gbraid-1");
  expect(String(calls.lead[0].referrer)).toMatch(/^https:\/\/www\.google\.com/);
});

test("an empty submit shows inline errors and sends nothing", async ({ page }) => {
  const calls = await mockLead(page, { ok: true });
  const form = await open(page, "/");
  await form.getByRole("button", { name: "Get My Free Inspection →" }).click();
  await expect(form.getByText("Choose the state the property is in.")).toBeVisible();
  await expect(form.getByText("Please enter a valid email address")).toBeVisible();
  await expect(form.getByText("This field is required").first()).toBeVisible();
  await expect(form.locator('input[name="property_state"]').first()).toBeFocused();
  expect(calls.lead).toHaveLength(0);
});
