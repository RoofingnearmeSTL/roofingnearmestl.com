// The combined customer follow-up email (FUP-01). Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildCustomerEmail, introVideoUrl } from "../src/lib/customer-email.ts";

const phones = { IL: "618-612-5192", MO: "314-202-7663" };
const VIDEO = "https://video.example.invalid/hello";
const base = {
  firstName: "Pat", service: "Roof Replacement", place: "Kirkwood", customerPhone: "314-555-2368",
  illinois: false, ilLicensePending: false, emergencyTarp: false, leadEmergency: false, urgentExterior: false,
  roofing: true, videoUrl: null, phones,
};
const make = (over = {}) => buildCustomerEmail({ ...base, ...over });
const ilExterior = { illinois: true, roofing: false, service: "Siding", place: "Waterloo" };
const ilPending = { illinois: true, ilLicensePending: true, roofing: false, service: "Roof Repair", place: "Waterloo" };
const bodyOf = (text) => text.split("\n\n").slice(0, -1).join("\n\n").replace(/RoofingnearmeSTL|Roofing Near Me STL LLC/g, "");

test("introVideoUrl accepts and trims https links", () => {
  assert.equal(introVideoUrl("https://youtu.be/abc123"), "https://youtu.be/abc123");
  assert.equal(introVideoUrl(" https://video.example.invalid/hello?t=1 "), "https://video.example.invalid/hello?t=1");
});

test("introVideoUrl rejects anything that is not a plain https link", () => {
  for (const bad of ["http://video.example.invalid/x", "javascript:alert(1)", "https://", "https://exa mple.com",
    'https://x.com/"><script>', "", undefined, 42, `https://example.com/${"a".repeat(490)}`]) {
    assert.equal(introVideoUrl(bad), null, String(bad));
  }
});

test("Missouri roofing without a video has every section and no video wording", () => {
  const { text, html, subject } = make();
  assert.equal(subject, "We got your request - RoofingnearmeSTL");
  for (const piece of [/Hi Pat,/, /request for Roof Replacement in Kirkwood/, /during business hours, we call as soon as your request comes in/,
    /call you at 314-555-2368 to set up your free inspection/, /whoever makes decisions about the home/, /Free Photo-Documented Roof Report/,
    /Photos of the problem area/, /best times to reach you/, /gate code, pets/, /Need us sooner\? Call 314-202-7663/]) {
    assert.match(text, piece);
    assert.match(html.replace(/<[^>]+>/g, " "), piece.source.includes("\\?") ? /Need us sooner\? Call 314-202-7663/ : piece);
  }
  assert.doesNotMatch(text, /video|Mike/i);
  assert.doesNotMatch(html, /video|Mike/i);
});

test("with a video the text has the link and the html has a button", () => {
  const { text, html } = make({ videoUrl: VIDEO });
  assert.match(text, /Meet Mike, the owner, in a short hello video:\nhttps:\/\/video\.example\.invalid\/hello/);
  assert.match(html, /href="https:\/\/video\.example\.invalid\/hello"/);
  assert.match(html, /Watch Mike&#39;s hello/);
  assert.ok(text.indexOf("Need us sooner") < text.indexOf("hello video"));
  assert.ok(text.indexOf("hello video") < text.indexOf("At your free inspection"));
});

test("Missouri emergency keeps the 24/7 line", () => {
  const { text } = make({ leadEmergency: true, emergencyTarp: true });
  assert.match(text, /If water is coming in right now, call our 24\/7 emergency line: 314-202-7663\./);
  assert.doesNotMatch(text, /Need us sooner/);
});

test("Missouri exterior work gets estimate wording, not the Roof Report", () => {
  const { text } = make({ roofing: false, service: "Siding" });
  assert.doesNotMatch(text, /Roof Report/);
  assert.match(text, /Questions about your project/);
  assert.match(text, /Need us sooner\? Call 314-202-7663/);
});

test("Illinois exterior has no roof wording in the body, with or without a video", () => {
  for (const videoUrl of [null, VIDEO]) {
    const { text } = make({ ...ilExterior, videoUrl });
    assert.doesNotMatch(bodyOf(text), /roof/i);
    assert.match(text, /Need us sooner\? Call 618-612-5192/);
  }
});

test("Illinois urgent exterior keeps the urgent sentence", () => {
  const { text } = make({ ...ilExterior, urgentExterior: true, leadEmergency: true });
  assert.match(text, /You marked this as urgent storm damage, so we'll call you back as fast as we can\. Need us sooner\? Call 618-612-5192\./);
  assert.doesNotMatch(text, /24\/7/);
});

test("Illinois license-pending points to a licensed roofer and has the small print", () => {
  for (const videoUrl of [null, VIDEO]) {
    const { text, html } = make({ ...ilPending, videoUrl });
    assert.match(text, /we'll point you to a licensed Illinois roofer/);
    assert.match(text, /Roofing in Illinois is pending our Illinois roofing license/);
    assert.match(html, /font-size:12px;color:#666[^>]*>Roofing in Illinois is pending/);
    assert.doesNotMatch(text, /Roof Report|24\/7|tarp|inspection/i);
  }
});

test("Illinois license-pending emergency keeps its wording and has no 'Need us sooner'", () => {
  const { text } = make({ ...ilPending, emergencyTarp: true, leadEmergency: true, roofing: true });
  assert.match(text, /call us at 618-612-5192 and we'll point you to a licensed Illinois roofer right away/);
  assert.doesNotMatch(text, /Need us sooner/);
  assert.doesNotMatch(text, /24\/7|tarp/i);
});

test("an Illinois email never gets Roof Report wording even if roofing is passed in", () => {
  assert.doesNotMatch(make({ illinois: true, roofing: true }).text, /Roof Report/);
});

test("html is escaped", () => {
  const { html } = make({ firstName: "<Pat>" });
  assert.match(html, /Hi &lt;Pat&gt;,/);
  assert.doesNotMatch(html, /<Pat>/);
});

test("source rules: no imports, no process.env, no offer words", () => {
  const src = fs.readFileSync("src/lib/customer-email.ts", "utf8");
  assert.doesNotMatch(src, /^import /m);
  assert.doesNotMatch(src, /process\.env/);
  const variants = [make(), make({ videoUrl: VIDEO }), make({ leadEmergency: true, emergencyTarp: true }), make({ roofing: false }),
    make(ilExterior), make({ ...ilExterior, urgentExterior: true }), make(ilPending), make({ ...ilPending, emergencyTarp: true })];
  for (const v of variants) assert.doesNotMatch(v.text, /discount|offer|sale|promo/i);
});
