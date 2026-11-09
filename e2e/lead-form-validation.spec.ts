import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

// Inline errors, focus and the email typo suggestion. /api/lead is intercepted in every test: nothing is saved or emailed.

type Captured = { body: Record<string, unknown> | null };

// Backstop: a test that forgets its own mock can never reach the real endpoint.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/lead", (route) => route.abort());
});

async function mockLead(page: Page, reply: Record<string, unknown> = { ok: true }): Promise<Captured> {
  const captured: Captured = { body: null };
  await page.route("**/api/lead", async (route: Route) => {
    captured.body = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(reply) });
  });
  return captured;
}

const leadForm = (page: Page) => page.locator("form").filter({ has: page.locator('input[name="phone"]') }).first();

async function openForm(page: Page, path = "/") {
  await page.goto(path);
  const form = leadForm(page);
  await expect(form).toHaveAttribute("novalidate", ""); // hydrated
  return form;
}

// The error message element linked to an input through aria-describedby.
async function errorFor(input: Locator) {
  const ids = ((await input.getAttribute("aria-describedby")) ?? "").split(" ");
  const id = ids.find((value) => value.endsWith("-error")) ?? "missing";
  return input.page().locator(`[id="${id}"]`);
}

const submit = (form: Locator) => form.getByRole("button", { name: /free (photo report|exterior quote)/i });

test("an empty submit shows plain errors, focuses the name field and sends nothing", async ({ page }) => {
  const captured = await mockLead(page);
  const form = await openForm(page);
  await submit(form).click();
  const name = form.locator('input[name="name"]');
  const phone = form.locator('input[name="phone"]');
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(await errorFor(name)).toHaveText(/Please enter your name/);
  await expect(phone).toHaveAttribute("aria-invalid", "true");
  await expect(await errorFor(phone)).toHaveText(/Please enter your phone number/);
  const email = form.locator('input[name="email"]');
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(await errorFor(email)).toHaveText(/Please enter your email/);
  expect(captured.body).toBeNull();
  await expect(page).not.toHaveURL(/thank-you/);
});

test("errors appear on blur and clear once fixed", async ({ page }) => {
  await mockLead(page);
  const form = await openForm(page);
  const name = form.locator('input[name="name"]');
  const phone = form.locator('input[name="phone"]');
  await name.focus();
  await name.blur();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await name.fill("Test Homeowner");
  await expect(name).not.toHaveAttribute("aria-invalid", "true");

  await phone.fill("314-555-0150");
  await phone.blur();
  await expect(await errorFor(phone)).toContainText("555-0100 to 555-0199");
  await phone.fill("911-555-2368");
  await phone.blur();
  await expect(await errorFor(phone)).toContainText(/service numbers/);
  await phone.fill("314-555-2368");
  await phone.blur();
  await expect(phone).not.toHaveAttribute("aria-invalid", "true");
});

test("a made-up phone number blocks the send and focuses the phone field", async ({ page }) => {
  const captured = await mockLead(page);
  const form = await openForm(page);
  const phone = form.locator('input[name="phone"]');
  await form.locator('input[name="name"]').fill("Test Homeowner");
  await form.locator('input[name="email"]').fill("pat@example.com");
  await phone.fill("314-555-0150");
  // Enter, not a click: leaving the field shows its error, which can move the button out from under a click.
  await phone.press("Enter");
  await expect(phone).toBeFocused();
  expect(captured.body).toBeNull();
  await phone.fill("314-555-2368");
  await submit(form).click();
  await expect(page).toHaveURL(/\/thank-you$/);
  expect(captured.body?.phone).toBe("314-555-2368");
});

test("an incomplete email blocks the send and focuses the email field", async ({ page }) => {
  const captured = await mockLead(page);
  const form = await openForm(page);
  await form.locator('input[name="name"]').fill("Test Homeowner");
  await form.locator('input[name="phone"]').fill("314-555-2368");
  const email = form.locator('input[name="email"]');
  await email.fill("pat@");
  // Enter, not a click: leaving the field shows its error, which can move the button out from under a click.
  await email.press("Enter");
  await expect(email).toBeFocused();
  await expect(await errorFor(email)).toHaveText(/looks incomplete/);
  expect(captured.body).toBeNull();
});

test("email is required: a missing email blocks the send with a plain message", async ({ page }) => {
  const captured = await mockLead(page);
  const form = await openForm(page);
  await form.locator('input[name="name"]').fill("Test Homeowner");
  await form.locator('input[name="phone"]').fill("314-555-2368");
  await submit(form).click();
  const email = form.locator('input[name="email"]');
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(await errorFor(email)).toHaveText(/Please enter your email/);
  expect(captured.body).toBeNull();
  await expect(page).not.toHaveURL(/thank-you/);
});

test("an email typo gets a suggestion that is applied only when tapped", async ({ page }) => {
  const captured = await mockLead(page);
  const form = await openForm(page);
  await form.locator('input[name="name"]').fill("Test Homeowner");
  await form.locator('input[name="phone"]').fill("314-555-2368");
  const email = form.locator('input[name="email"]');
  await email.fill("pat@gmial.com");
  await email.blur();
  await expect(form.getByText(/Did you mean pat@gmail\.com\?/)).toBeVisible();
  await expect(email).toHaveValue("pat@gmial.com");
  await form.getByRole("button", { name: "Use pat@gmail.com" }).click();
  await expect(email).toHaveValue("pat@gmail.com");
  await expect(form.getByText(/Did you mean/)).toHaveCount(0);
  await submit(form).click();
  await expect(page).toHaveURL(/\/thank-you$/);
  expect(captured.body?.email).toBe("pat@gmail.com");
});

test("ignoring the suggestion sends the email exactly as typed", async ({ page }) => {
  const captured = await mockLead(page);
  const form = await openForm(page);
  await form.locator('input[name="name"]').fill("Test Homeowner");
  await form.locator('input[name="phone"]').fill("314-555-2368");
  const email = form.locator('input[name="email"]');
  await email.fill("pat@yahoo.con");
  await email.blur();
  await expect(form.getByText(/Did you mean pat@yahoo\.com\?/)).toBeVisible();
  await submit(form).click();
  await expect(page).toHaveURL(/\/thank-you$/);
  expect(captured.body?.email).toBe("pat@yahoo.con");
});

test("the Illinois exterior form has the same inline errors", async ({ page }) => {
  const captured = await mockLead(page);
  const form = await openForm(page, "/siding-gutters-waterloo-il");
  await submit(form).click();
  const name = form.locator('input[name="name"]');
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  expect(captured.body).toBeNull();
});

async function fillAndSubmit(form: Locator) {
  await form.locator('input[name="name"]').fill("Test Homeowner");
  await form.locator('input[name="phone"]').fill("314-555-2368");
  await form.locator('input[name="email"]').fill("pat@example.com");
  await submit(form).click();
}

test("gbraid on the landing URL reaches the payload", async ({ page }) => {
  const captured = await mockLead(page);
  const form = await openForm(page, "/?gbraid=test-gbraid-1");
  await fillAndSubmit(form);
  await expect(page).toHaveURL(/\/thank-you$/);
  expect(captured.body?.gbraid).toBe("test-gbraid-1");
  expect(captured.body?.wbraid).toBe("");
});

test("a remembered wbraid survives a later page", async ({ page }) => {
  const captured = await mockLead(page, { ok: true, area: "il" });
  await openForm(page, "/?wbraid=test-wbraid-1");
  const form = await openForm(page, "/siding-gutters-waterloo-il");
  await fillAndSubmit(form);
  await expect(page).toHaveURL(/\/thank-you/);
  expect(captured.body?.wbraid).toBe("test-wbraid-1");
});

test("the referring website reaches the payload", async ({ page }) => {
  const captured = await mockLead(page);
  await page.goto("/", { referer: "https://www.google.com/" });
  const form = leadForm(page);
  await expect(form).toHaveAttribute("novalidate", "");
  await fillAndSubmit(form);
  await expect(page).toHaveURL(/\/thank-you$/);
  expect(String(captured.body?.referrer)).toMatch(/^https:\/\/www\.google\.com/);
});
