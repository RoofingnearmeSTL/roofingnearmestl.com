import { expect, test, type Page } from "@playwright/test";
import zlib from "node:zlib";
import { E2E_DASHBOARD_PASSWORD } from "./test-env";

// The proof package builder and its storm lookup. No storm lookup reaches NOAA here: only bad input is sent, which
// the route refuses before any outside request.

const AUTH = { Authorization: "Basic " + Buffer.from(`owner:${E2E_DASHBOARD_PASSWORD}`).toString("base64") };

/** A small solid-colour PNG, made here so no image file is checked in. */
function png(width: number, height: number): Buffer {
  const crc = (buf: Buffer) => {
    let c = ~0;
    for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
    return ~c >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x60)]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

/** A one-page PDF with one line of text. */
function pdf(): Buffer {
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const stream = "BT /F1 24 Tf 72 700 Td (Hail history test page) Tj ET";
  objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

async function blockTags(page: Page) {
  await page.route("**/googletagmanager.com/**", (r) => r.abort());
  await page.route("**/google-analytics.com/**", (r) => r.abort());
  await page.route("**/connect.facebook.net/**", (r) => r.abort());
}

test("the builder and its storm lookup need the dashboard password", async ({ request }) => {
  expect((await request.get("/dashboard/proof-package")).status()).toBe(401);
  expect((await request.get("/dashboard/proof-package/storms?date=2026-05-10&address=x")).status()).toBe(401);
  expect((await request.get("http://localhost:3201/dashboard/proof-package")).status()).toBe(404);
});

test("the storm lookup refuses bad input before any outside request", async ({ request }) => {
  const noDate = await request.get("/dashboard/proof-package/storms?address=11%20N%204th%20St%2C%20St.%20Louis%2C%20MO", { headers: AUTH });
  expect(noDate.status()).toBe(400);
  expect((await noDate.json()).error).toMatch(/date of loss/);
  const future = await request.get("/dashboard/proof-package/storms?date=2999-01-01&address=11%20N%204th%20St%2C%20St.%20Louis%2C%20MO", { headers: AUTH });
  expect(future.status()).toBe(400);
  const shortAddress = await request.get("/dashboard/proof-package/storms?date=2026-05-10&address=abc", { headers: AUTH });
  expect(shortAddress.status()).toBe(400);
  expect(shortAddress.headers()["cache-control"]).toContain("no-store");
});

test("the n8n usage check is off without its cron secret", async ({ request }) => {
  expect((await request.get("/api/n8n-usage-check")).status()).toBe(503);
});

test.describe("signed in", () => {
  test.use({ httpCredentials: { username: "owner", password: E2E_DASHBOARD_PASSWORD } });

  test("builds a report from a photo and a PDF, previews it, downloads it and keeps the draft", async ({ page }) => {
    await blockTags(page);
    const res = await page.goto("/dashboard/proof-package");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Evidence package builder" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    await page.getByLabel("Homeowner name", { exact: true }).fill("Test Homeowner 1");
    await page.getByLabel("Street address", { exact: true }).fill("123 Example St");
    await page.getByLabel("City, state and ZIP", { exact: true }).fill("Kirkwood, MO 63122");
    await page.getByLabel("Storm event date (date of loss)", { exact: true }).fill("2026-05-10");

    await page.locator('input[type="file"][accept^="image"]').setInputFiles({ name: "roof.png", mimeType: "image/png", buffer: png(40, 30) });
    await expect(page.getByText("Photo 1 · no date in the file")).toBeVisible();
    await page.getByLabel("Caption", { exact: true }).fill("Hail hit on the north slope");

    await page.locator('input[type="file"][accept^="application/pdf"]').setInputFiles({ name: "hail-history.pdf", mimeType: "application/pdf", buffer: pdf() });
    await expect(page.getByText("hail-history.pdf · 1 of 1 page included")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("checkbox", { name: "Include a ventilation section in the report" }).check();
    await page.getByLabel("Attic floor area (sq ft)").fill("1500");
    await page.getByLabel("Intake NFA measured (sq in)").fill("100");
    await page.getByLabel("Exhaust NFA measured (sq in)").fill("300");
    await expect(page.getByText("Needs 720 sq in in total")).toBeVisible();

    await page.getByRole("checkbox", { name: "Include the ice & water shield calculation" }).check();
    await page.getByLabel("Roof pitch (rise per 12)").fill("5");
    await page.getByLabel("Soffit overhang (in)").fill("13");
    await expect(page.getByText("2 courses required.")).toBeVisible();
    await page.getByRole("button", { name: "Add the St. Louis County re-roofing checklist items" }).click();
    await expect(page.getByText("Check before citing R905.1.2")).toBeVisible();

    await page.getByRole("button", { name: "Add Mike's 4 Building Experts Institute certificates" }).click();
    await expect(page.getByText("Building Experts Institute certificates · 4 of 4 pages included")).toBeVisible({ timeout: 20_000 });

    await page.getByRole("tab", { name: "Preview" }).click();
    const report = page.frameLocator('iframe[title="Report preview"]');
    await expect(report.getByRole("heading", { level: 1, name: "Roof System Evidence Package" })).toBeVisible();
    await expect(report.getByText("123 Example St").first()).toBeVisible();
    await expect(report.getByText("Result: 2 full courses of ice & water shield required at the eaves to meet IRC R905.1.2.")).toBeVisible();
    await expect(report.getByText("Attachment A. Inspector certifications (Building Experts Institute)")).toBeVisible();
    await expect(report.getByText("Hail hit on the north slope")).toBeVisible();
    await expect(report.getByText("does not meet the code minimum")).toBeVisible();
    await expect(report.getByText("Attachment B. hail-history").first()).toBeVisible();
    await expect(report.getByText("314-202-7663").first()).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download report (.html)" }).click()]);
    expect(download.suggestedFilename()).toMatch(/^Evidence package - 123 Example St - \d{4}-\d{2}-\d{2}\.html$/);
    const html = (await (await download.createReadStream()).toArray()).join("");
    expect(html).toContain("Hail hit on the north slope");
    expect(html).toContain("data:image/jpeg;base64,");
    expect(html).not.toContain("blob:");
    expect(html).not.toMatch(/<script/i);

    await page.getByRole("tab", { name: "Edit" }).click();
    await expect(page.getByText("Saved on this computer")).toBeVisible({ timeout: 10_000 });
    await page.reload();
    await expect(page.getByLabel("Open a draft").locator("option", { hasText: "123 Example St" })).toHaveCount(1);
    await page.getByLabel("Open a draft").selectOption({ label: (await page.getByLabel("Open a draft").locator("option", { hasText: "123 Example St" }).textContent()) ?? "" });
    await expect(page.getByLabel("Caption", { exact: true })).toHaveValue("Hail hit on the north slope");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("an Illinois property shows the roofing warning and uses the Illinois number", async ({ page }) => {
    await blockTags(page);
    await page.goto("/dashboard/proof-package");
    await page.getByLabel("Street address", { exact: true }).fill("1 Example Ave");
    await page.getByLabel("City, state and ZIP", { exact: true }).fill("Waterloo, IL 62298");
    await expect(page.getByText("we don't offer roofing in Illinois")).toBeVisible();
    await page.getByRole("tab", { name: "Preview" }).click();
    const report = page.frameLocator('iframe[title="Report preview"]');
    await expect(report.getByText("618-612-5192").first()).toBeVisible();
    await expect(report.getByText("314-202-7663")).toHaveCount(0);
  });
});
