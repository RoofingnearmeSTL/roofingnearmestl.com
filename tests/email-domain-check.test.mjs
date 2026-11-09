// Email domain check: every test passes a fake DNS, so no real lookup is ever made.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkEmailDomain } from "../src/lib/email-domain-check.ts";

function fake({ mx = [], a = [], aaaa = [], throwSync = false } = {}) {
  const state = { asked: [], cancelled: false };
  const answer = (value) => {
    if (value === "hang") return new Promise(() => {});
    if (typeof value === "string") return Promise.reject(Object.assign(new Error(value), { code: value }));
    return Promise.resolve(value);
  };
  return {
    state,
    dns: {
      resolveMx(host) { state.asked.push(host); if (throwSync) throw new Error("boom"); return answer(mx); },
      resolve4(host) { state.asked.push(host); return answer(a); },
      resolve6(host) { state.asked.push(host); return answer(aaaa); },
      cancel() { state.cancelled = true; },
    },
  };
}
const run = (opts, email = "pat@example.com", extra = {}) => { const f = fake(opts); return checkEmailDomain(email, { dns: f.dns, ...extra }).then((r) => [r, f.state]); };

test("MX records mean ok; null MX and unknown domains mean no mail server", async () => {
  assert.equal((await run({ mx: [{ exchange: "mx.example.com", priority: 10 }] }))[0], "ok");
  assert.equal((await run({ mx: [{ exchange: "", priority: 0 }] }))[0], "no_mail_server");
  assert.equal((await run({ mx: [{ exchange: ".", priority: 0 }] }))[0], "no_mail_server");
  assert.equal((await run({ mx: "ENOTFOUND" }))[0], "no_mail_server");
});

test("falls back to A and AAAA when there is no MX", async () => {
  assert.equal((await run({ mx: "ENODATA", a: ["192.0.2.1"] }))[0], "ok");
  assert.equal((await run({ mx: "ENODATA", a: "ENODATA", aaaa: ["2001:db8::1"] }))[0], "ok");
  assert.equal((await run({ mx: "ENODATA", a: "ENODATA", aaaa: "ENODATA" }))[0], "no_mail_server");
});

test("DNS trouble is unknown, never a verdict", async () => {
  assert.equal((await run({ mx: "ESERVFAIL" }))[0], "unknown");
  assert.equal((await run({ mx: "ETIMEOUT" }))[0], "unknown");
  assert.equal((await run({ mx: "ENODATA", a: "ESERVFAIL", aaaa: "ENODATA" }))[0], "unknown");
  assert.equal((await run({ throwSync: true }))[0], "unknown");
});

test("a hanging lookup gives up at the timeout and is cancelled", async () => {
  const started = Date.now();
  const [result, state] = await run({ mx: "hang" }, "pat@example.com", { timeoutMs: 30 });
  assert.equal(result, "unknown");
  assert.ok(Date.now() - started < 500);
  assert.equal(state.cancelled, true);
});

test("the domain is normalised, and bad addresses never reach DNS", async () => {
  const [, state] = await run({ mx: [{ exchange: "mx.example.com", priority: 10 }] }, "Pat@EXAMPLE.com.");
  assert.deepEqual(state.asked, ["example.com"]);
  for (const email of ["", "no-at-sign", "pat@localhost", "pat@[192.0.2.1]"]) {
    const [result, s] = await run({}, email);
    assert.equal(result, "unknown", email);
    assert.deepEqual(s.asked, [], email);
  }
});

test("the default timeout is 1.5 seconds", () => {
  assert.match(fs.readFileSync("src/lib/email-domain-check.ts", "utf8"), /1500/);
});
