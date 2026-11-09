// Phone and email checks shared by the form and the server. Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  checkPhone, contactFieldError, isEmailSyntax, suggestEmail, PHONE_HELP, PHONE_REASON, CONTACT_MESSAGES,
} from "../src/lib/contact-check.ts";

const problem = (input) => { const r = checkPhone(input); return r.ok ? "ok" : r.problem; };

test("valid numbers pass and come back as 10 digits", () => {
  assert.deepEqual(checkPhone("314-555-2368"), { ok: true, digits: "3145552368" });
  assert.equal(checkPhone("+1 (314) 555-2368").digits, "3145552368");
  assert.equal(checkPhone("13142027663").digits, "3142027663");
  assert.equal(problem("(618) 612-5192"), "ok");
  assert.equal(problem("314.867.5309"), "ok");
  assert.equal(problem("314-555-0099"), "ok");
  assert.equal(problem("314-555-0200"), "ok");
});

test("each rule reports its own problem", () => {
  for (const v of ["", "test", "555-0100", "314-555-236"]) assert.equal(problem(v), "too_short", v);
  for (const v of ["23142027663", "314202766312"]) assert.equal(problem(v), "too_long", v);
  for (const v of ["2222222222", "1-222-222-2222", "0000000000", "1111111111"]) assert.equal(problem(v), "repeated", v);
  for (const v of ["014-555-2368", "114-555-2368"]) assert.equal(problem(v), "area_code", v);
  for (const v of ["211-555-2368", "411-555-2368", "911-555-2368"]) assert.equal(problem(v), "n11", v);
  for (const v of ["314-055-2368", "314-155-2368"]) assert.equal(problem(v), "exchange", v);
  for (const v of ["314-555-0100", "314-555-0150", "314-555-0199", "1-618-555-0123"]) assert.equal(problem(v), "fictional", v);
});

test("every problem has homeowner help and an owner reason, with no roofing words", () => {
  for (const key of Object.keys(PHONE_REASON)) {
    assert.ok(PHONE_HELP[key].includes("Please"), key);
    assert.ok(PHONE_REASON[key].length > 0, key);
  }
  for (const text of [...Object.values(PHONE_HELP), ...Object.values(PHONE_REASON), ...Object.values(CONTACT_MESSAGES)]) assert.doesNotMatch(text, /roof/i);
});

test("field errors", () => {
  assert.match(contactFieldError("name", ""), /Please enter your name/);
  assert.match(contactFieldError("name", "   "), /Please enter your name/);
  assert.equal(contactFieldError("name", "Pat"), undefined);
  assert.match(contactFieldError("phone", ""), /Please enter your phone number/);
  assert.equal(contactFieldError("phone", "314-555-0150"), PHONE_HELP.fictional);
  assert.equal(contactFieldError("phone", "314-555-2368"), undefined);
  assert.equal(contactFieldError("email", ""), CONTACT_MESSAGES.emailRequired);
  assert.equal(contactFieldError("email", "   "), CONTACT_MESSAGES.emailRequired);
  assert.match(contactFieldError("email", ""), /Please enter your email/);
  assert.match(contactFieldError("email", "pat@"), /looks incomplete/);
  assert.match(contactFieldError("email", "not-an-email"), /looks incomplete/);
  assert.equal(contactFieldError("email", "pat@gmail.com"), undefined);
  assert.equal(isEmailSyntax("a@b.co"), true);
  assert.equal(isEmailSyntax("a@b"), false);
  assert.equal(isEmailSyntax("a b@c.com"), false);
});

test("typo suggestions for common domains", () => {
  const fixes = {
    "pat@gmial.com": "pat@gmail.com", "pat@gamil.com": "pat@gmail.com", "pat@gmail.con": "pat@gmail.com",
    "pat@gmail.cmo": "pat@gmail.com", "pat@gmail.co": "pat@gmail.com", "pat@gmail": "pat@gmail.com",
    "Pat.Q@Yaho.com": "Pat.Q@yahoo.com", "pat@hotmial.com": "pat@hotmail.com", "pat@outlok.com": "pat@outlook.com",
    "pat@iclod.com": "pat@icloud.com", "pat@aol.con": "pat@aol.com", "pat@att.ent": "pat@att.net",
    "pat@sbcgloabl.net": "pat@sbcglobal.net", "pat@chater.net": "pat@charter.net", "pat@comcast.con": "pat@comcast.net",
    "pat@comcats.net": "pat@comcast.net", "pat@mybiz.con": "pat@mybiz.com",
  };
  for (const [input, expected] of Object.entries(fixes)) assert.equal(suggestEmail(input), expected, input);
  for (const input of ["pat@gmail.com", "pat@mail.com", "pat@ymail.com", "pat@email.com", "pat@outlook.de", "pat@yahoo.co.uk",
    "pat@chartermi.net", "pat@att.com", "pat@mybusiness.com", "", "not-an-email", "@gmail.con"]) {
    assert.equal(suggestEmail(input), null, input);
  }
});

test("the shared module ships to the browser: no imports, no environment", () => {
  const source = fs.readFileSync("src/lib/contact-check.ts", "utf8");
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.doesNotMatch(source, /process\.env/);
});

test("email is required and the messages say why", () => {
  assert.match(CONTACT_MESSAGES.emailRequired, /send you the details/);
  assert.doesNotMatch(CONTACT_MESSAGES.emailIncomplete, /optional|leave it blank/i);
  assert.equal(contactFieldError("email", "pat@gmail.com"), undefined);
});
