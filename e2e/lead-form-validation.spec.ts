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

const VALID = { name: "Test Homeowner", phone: "314-555-2368", email: "pat@example.com", city: "Kirkwood", zip: "63101", address: "123 Example St" };
type Field = keyof typeof VALID;

// Fills every required field with a valid value, except the ones listed in `skip`.
async function fillRequired(form: Locator, skip: Field[] = []) {
  for (const [field, value] of Object.entries(VALID) as [Field, string][]) {
    if (!skip.includes(field)) await form.locator(`input[name="${field}"]`).fill(value);
  }
}

test("an empty submit shows an inline error under every required field and sends nothing", async ({ page }) => {
  const captured = await mockLead(page);
  const form = await openForm(page);
  await submit(form).click();
  const name = form.locator('input[name="name"]');
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(await errorFor(name)).toHaveText(/Please enter your name/);
  const expected: [Field, string][] = [
    ["phone", "Please enter a valid 10-digit phone number"],
    ["email", "Please enter a valid email address"],
    ["city", "This field is required"],
    ["zip", "This field is required"],
    ["address", "This field is required"],
  ];
  for (const [field, message] of expected) {
    const input = form.locator(`input[name="${field}"]`);
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(await errorFor(input)).toHaveText(message);
  }
  expect(captured.body).toBeNull();
  await expect(page).not.toHaveURL(/thank-you/);
});

test("every required field shows a red star", async ({ page }) => {
  const form = await openForm(page);
  for (const field of Object.keys(VALID)) {
    const box = form.locator(`input[name="${field}"]`).locator("xpath=..");
    const star = box.locator('span[aria-hidden="true"]', { hasText: "*" });
    await expect(star).toBeVisible();
    await expect(star).toHaveClass(/\btext-red-600\b/);
  }
});

for (const field of ["address", "email", "phone"] as Field[]) {
  test(`a blank ${field} blocks the send`, async ({ page }) => {
    const captured = await mockLead(page);
    const form = await openForm(page);
    await fillRequired(form, [field]);
    await submit(form).click();
    const input = form.locator(`input[name="${field}"]`);
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    expect(captured.body).toBeNull();
    await expect(page).not.toHaveURL(/thank-you/);
  });
}

test("a street address or city of only spaces is treated as blank", async ({ page }) => {
  const captured = await mockLead(page);
  const form = await openForm(page);
  await fillRequired(form);
  await form.locator('input[name="city"]').fill("   ");
  await form.locator('input[name="address"]').fill("   ");
  await submit(form).click();
  const city = form.locator('input[name="city"]');
  await expect(city).toBeFocused();
  await expect(await errorFor(city)).toHaveText("This field is required");
  await expect(await errorFor(form.locator('input[name="address"]'))).toHaveText("This field is required");
  expect(captured.body).toBeNull();
});

test("Street address is in the main form, outside the optional details", async ({ page }) => {
  const form = await openForm(page);
  await expect(form.locator('input[name="address"]')).toBeVisible();
  await expect(form.locator('details input[name="address"]')).toHaveCount(0);
  await expect(form.locator("details summary")).toContainText("Add more details (optional)");
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

  await phone.fill("314-555-23");
  await phone.blur();
  await expect(await errorFor(phone)).toHaveText("Please enter a valid 10-digit phone number");
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
  await fillRequired(form, ["phone"]);
  const phone = form.locator('input[name="phone"]');
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
  await fillRequired(form, ["email"]);
  const email = form.locator('input[name="email"]');
  await email.fill("pat@");
  // Enter, not a click: leaving the field shows its error, which can move the button out from under a click.
  await email.press("Enter");
  await expect(email).toBeFocused();
  await expect(await errorFor(email)).toHaveText("Please enter a valid email address");
  expect(captured.body).toBeNull();
});

test("a short ZIP shows a plain inline error, focuses the field and sends nothing", async ({ page }) => {
  const captured = await mockLead(page);
  const form = await openForm(page);
  await fillRequired(form, ["zip"]);
  const zip = form.locator('input[name="zip"]');
  await zip.fill("6310");
  await zip.press("Enter");
  await expect(zip).toBeFocused();
  await expect(zip).toHaveAttribute("aria-invalid", "true");
  await expect(await errorFor(zip)).toHaveText(/5-digit ZIP/);
  expect(captured.body).toBeNull();
  await expect(page).not.toHaveURL(/thank-you/);
  await zip.fill("63101");
  await expect(zip).not.toHaveAttribute("aria-invalid", "true");
  await submit(form).click();
  await expect(page).toHaveURL(/\/thank-you$/);
  expect(captured.body?.zip).toBe("63101");
});

test("a complete form sends name, phone, email, street address, city and ZIP", async ({ page }) => {
  const captured = await mockLead(page);
  const form = await openForm(page);
  await fillRequired(form);
  await submit(form).click();
  await expect(page).toHaveURL(/\/thank-you$/);
  expect(captured.body).toMatchObject(VALID);
});

test("an email typo gets a suggestion that is applied only when tapped", async ({ page }) => {
  const captured = await mockLead(page);
  const form = await openForm(page);
  await fillRequired(form, ["email"]);
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
  await fillRequired(form, ["email"]);
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
  await expect(await errorFor(form.locator('input[name="address"]'))).toHaveText("This field is required");
  expect(captured.body).toBeNull();
});

async function fillAndSubmit(form: Locator) {
  await fillRequired(form);
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
