// /free-inspection: estimate rules, the sealed update token, the "Email My Updated Estimate" endpoint and the page's
// wording rules (Mike's brief, Nov 14 2026). Run: node --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import crypto from 'node:crypto'
import ts from 'typescript'

const loadTs = (file, imports = {}, extra = {}) => {
  const out = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports: out, require: (name) => { if (name in imports) return imports[name]; throw new Error(`Unexpected import: ${name}`) }, ...extra })
  return out
}
const pricing = loadTs('src/lib/pricing.ts')
const offer = loadTs('src/lib/estimate-offer.ts', { './pricing': pricing })
const token = loadTs('src/lib/estimate-token.ts', { 'node:crypto': crypto }, { Buffer, Date })
const business = loadTs('src/lib/business.ts')
const customerEmail = loadTs('src/lib/customer-email.ts')
const env = { SUPABASE_SERVICE_ROLE_KEY: 'test-server-key' }
const read = (file) => fs.readFileSync(file, 'utf8')

// ── Estimate rules ────────────────────────────────────────────────────────────────────────────────────────────
test('the rough estimate is exactly pricing.ts, whole-roof totals', () => {
  for (const [size, material, pitch] of [[10, '3tab', 'low'], [18, 'architectural', 'medium'], [40, 'architectural', 'steep']]) {
    const outcome = offer.roughEstimate({ size, material, pitch })
    assert.equal(outcome.status, 'ready')
    const expected = pricing.estimate(size, material, pitch)
    assert.equal(outcome.estimate.price, expected.price)
    assert.equal(outcome.estimate.low, expected.low)
    assert.equal(outcome.estimate.high, expected.high)
  }
})

test('no roof size never produces a number (no default size)', () => {
  assert.equal(offer.roughEstimate({ size: null, material: 'architectural', pitch: 'medium' }).status, 'needs_measurements')
  assert.equal(offer.roughEstimate({ size: null, material: null, pitch: null }).status, 'needs_measurements')
  assert.equal(offer.canShowNumber({ size: null, material: 'architectural', pitch: 'medium' }), false)
})

test('clay, metal and slate are custom quotes with no number', () => {
  for (const material of ['clay', 'metal', 'slate']) {
    const outcome = offer.roughEstimate({ size: 20, material, pitch: 'medium' })
    assert.equal(outcome.status, 'custom_quote')
    assert.equal(outcome.estimate, undefined)
  }
})

test('estimator inputs from a browser are checked strictly', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(offer.parseEstimateInputs({ size: 18, material: 'architectural', pitch: 'low' }))), { size: 18, material: 'architectural', pitch: 'low' })
  assert.deepEqual(JSON.parse(JSON.stringify(offer.parseEstimateInputs({ size: null }))), { size: null, material: null, pitch: null })
  assert.equal(offer.parseEstimateInputs({ size: 24, material: 'metal' }).material, 'metal')
  for (const bad of [null, 'x', { size: 9, material: 'architectural', pitch: 'low' }, { size: 41, material: 'architectural', pitch: 'low' },
    { size: 18.5, material: 'architectural', pitch: 'low' }, { size: '18', material: 'architectural', pitch: 'low' },
    { size: 18, material: 'gold', pitch: 'low' }, { size: 18, material: 'architectural', pitch: 'flat' }, { size: 18, material: 'architectural' }]) {
    assert.equal(offer.parseEstimateInputs(bad), null, JSON.stringify(bad))
  }
})

test('only a Missouri roof replacement with nothing Illinois about it is eligible', () => {
  assert.equal(offer.estimateEligible({ state: 'MO', service: 'Roof Replacement', illinois: false }), true)
  assert.equal(offer.estimateEligible({ state: 'IL', service: 'Roof Replacement', illinois: true }), false)
  assert.equal(offer.estimateEligible({ state: 'MO', service: 'Roof Replacement', illinois: true }), false)
  assert.equal(offer.estimateEligible({ state: 'MO', service: 'Roof Repair', illinois: false }), false)
  assert.equal(offer.estimateEligible({ state: '', service: 'Roof Replacement', illinois: false }), false)
})

test('the notice and success wording match the brief word for word', () => {
  assert.equal(offer.ROUGH_ESTIMATE_NOTICE, 'This is a rough planning estimate based on the information you entered, not a final quote. Actual cost depends on verified roof measurements, roof condition, materials, and project scope. Your inspection determines the final quote.')
  assert.equal(offer.ESTIMATE_OFFER_TEXT, 'Submit your request to view a rough roof replacement estimate and receive a copy by email.')
  assert.equal(offer.ROUGH_ESTIMATE_HEADLINE, 'Your Rough Roof Replacement Estimate')
  assert.equal(offer.SUCCESS_MESSAGES.estimate, "Your project request is received. Here's your rough estimate.")
})

// ── Sealed token ──────────────────────────────────────────────────────────────────────────────────────────────
const claims = { ref: 'ref-1', email: 'pat@example.invalid', firstName: 'Pat', exp: Date.now() + 60_000 }

test('the token round-trips on the server and hides the address from the browser', () => {
  const sealed = token.sealEstimateToken(claims, env)
  assert.match(sealed, /^v1\./)
  assert.ok(!sealed.includes('pat') && !Buffer.from(sealed.slice(3), 'base64url').toString('latin1').includes('pat@'))
  assert.deepEqual(JSON.parse(JSON.stringify(token.openEstimateToken(sealed, env))), claims)
})

test('a changed, expired, foreign or garbage token is refused', () => {
  const sealed = token.sealEstimateToken(claims, env)
  const raw = Buffer.from(sealed.slice(3), 'base64url')
  raw[raw.length - 1] ^= 1
  assert.equal(token.openEstimateToken(`v1.${raw.toString('base64url')}`, env), null)
  assert.equal(token.openEstimateToken(token.sealEstimateToken({ ...claims, exp: Date.now() - 1 }, env), env), null)
  assert.equal(token.openEstimateToken(sealed, { SUPABASE_SERVICE_ROLE_KEY: 'another-key' }), null)
  assert.equal(token.openEstimateToken(sealed, { ESTIMATE_TOKEN_SECRET: 'own-secret', ...env }), null)
  for (const junk of [undefined, '', 'v1.', 'v2.abc', 42, 'v1.' + 'A'.repeat(3000)]) assert.equal(token.openEstimateToken(junk, env), null)
  assert.equal(token.sealEstimateToken(claims, {}), null)
})

test('the send limiter stops repeats, rapid sends and too many sends', () => {
  const limiter = token.createSendLimiter({ minGapMs: 60_000, maxSends: 3 })
  assert.equal(limiter.check('r', 'a', 0), 'ok')
  limiter.record('r', 'a', 0)
  assert.equal(limiter.check('r', 'a', 999_999), 'duplicate')
  assert.equal(limiter.check('r', 'b', 30_000), 'too_soon')
  assert.equal(limiter.check('r', 'b', 61_000), 'ok')
  limiter.record('r', 'b', 61_000)
  limiter.record('r', 'c', 200_000)
  assert.equal(limiter.check('r', 'd', 900_000), 'limit')
  assert.equal(limiter.check('other', 'a', 0), 'ok')
})

// ── Emails ────────────────────────────────────────────────────────────────────────────────────────────────────
const phones = { IL: '618-612-5192', MO: '314-202-7663' }
const ready = offer.roughEstimate({ size: 20, material: 'architectural', pitch: 'medium' }).estimate
const emailEstimate = { headline: offer.ROUGH_ESTIMATE_HEADLINE, notice: offer.ROUGH_ESTIMATE_NOTICE, ...ready }
const base = { firstName: 'Pat', service: 'Roof Replacement', place: 'Kirkwood', customerPhone: '314-555-2368', illinois: false, ilLicensePending: false,
  emergencyTarp: false, leadEmergency: false, urgentExterior: false, roofing: true, videoUrl: null, phones }

test('the confirmation email carries the estimate, the notice and the Missouri phone', () => {
  const mail = customerEmail.buildCustomerEmail({ ...base, roughEstimate: emailEstimate })
  for (const part of [`$${ready.price.toLocaleString('en-US')}`, `$${ready.low.toLocaleString('en-US')}`, `$${ready.high.toLocaleString('en-US')}`, offer.ROUGH_ESTIMATE_NOTICE, '314-202-7663', ready.sizeLabel]) {
    assert.ok(mail.text.includes(part), part)
  }
  assert.ok(mail.html.includes(offer.ROUGH_ESTIMATE_NOTICE))
  assert.doesNotMatch(mail.text + mail.html, /per square|\/SQ\b/i)
})

test('an Illinois email never carries an estimate, even if one is passed in', () => {
  const mail = customerEmail.buildCustomerEmail({ ...base, illinois: true, ilLicensePending: true, roofing: false, roughEstimate: emailEstimate })
  assert.doesNotMatch(mail.text, /Rough estimate/)
  assert.equal(mail.subject, customerEmail.CUSTOMER_EMAIL_SUBJECT)
})

test('the updated-estimate email has the numbers, the notice and how to book', () => {
  const mail = customerEmail.buildEstimateUpdateEmail({ firstName: 'Pat', estimate: emailEstimate, moPhone: phones.MO, ilPhone: phones.IL })
  assert.ok(mail.text.includes(offer.ROUGH_ESTIMATE_NOTICE))
  assert.ok(mail.text.includes(`$${ready.price.toLocaleString('en-US')}`))
  assert.match(mail.text, /arrange your free inspection[\s\S]*314-202-7663/)
})

// ── "Email My Updated Estimate" endpoint ──────────────────────────────────────────────────────────────────────
const routeSource = ts.transpileModule(read('src/app/api/estimate-email/route.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function emailRoute({ bot = { isBot: false }, emailError = null, extraEnv = {} } = {}) {
  const calls = { emails: [], options: [], logs: [] }
  const exports = {}
  vm.runInNewContext(routeSource, {
    exports, process: { env: { ...env, RESEND_API_KEY: 'test-email-key', LEAD_TO_EMAIL: 'owner@example.invalid', ...extraEnv } }, Number, URL,
    console: Object.fromEntries(['log', 'error'].map((level) => [level, (...args) => calls.logs.push(args)])),
    require(name) {
      if (name === 'next/server') return { NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) } }
      if (name === 'resend') return { Resend: class { emails = { send: async (payload, options) => { calls.emails.push(payload); calls.options.push(options); return { data: { id: 'x' }, error: emailError } } } } }
      if (name === 'botid/server') return { checkBotId: async () => bot }
      if (name.endsWith('/business')) return business
      if (name.endsWith('customer-email')) return customerEmail
      if (name.endsWith('estimate-offer')) return offer
      if (name.endsWith('estimate-token')) return token
      throw new Error(`Unexpected import: ${name}`)
    },
  })
  const post = (body, headers = {}) => exports.POST({ json: async () => body, headers: { get: (key) => headers[key] ?? null } })
  return { calls, post }
}
const goodToken = () => token.sealEstimateToken({ ...claims, ref: crypto.randomUUID() }, env)
const inputs = { size: 22, material: 'architectural', pitch: 'steep' }

test('a missing or forged token gets nothing', async () => {
  const { calls, post } = emailRoute()
  for (const t of [undefined, 'v1.forged', token.sealEstimateToken(claims, { SUPABASE_SERVICE_ROLE_KEY: 'x' })]) {
    const res = await post({ token: t, inputs, send: true })
    assert.equal(res.status, 401)
  }
  assert.equal(calls.emails.length, 0)
})

test('checking a token (send: false) returns the server estimate and sends nothing', async () => {
  const { calls, post } = emailRoute()
  const res = await post({ token: goodToken(), inputs, send: false })
  assert.equal(res.status, 200)
  assert.equal(res.data.estimate.price, pricing.estimate(22, 'architectural', 'steep').price)
  assert.equal(calls.emails.length, 0)
})

test('an update goes only to the address in the token, recalculated on the server, with an idempotency key', async () => {
  const { calls, post } = emailRoute()
  const res = await post({ token: goodToken(), inputs, send: true, email: 'attacker@example.invalid', to: 'attacker@example.invalid', price: 1 })
  assert.equal(res.data.email, 'sent')
  assert.equal(calls.emails.length, 1)
  assert.equal(calls.emails[0].to, 'pat@example.invalid')
  assert.ok(calls.emails[0].text.includes(`$${pricing.estimate(22, 'architectural', 'steep').price.toLocaleString('en-US')}`))
  assert.match(calls.options[0].idempotencyKey, /^estimate-update\/.+\/22-architectural-steep$/)
  assert.doesNotMatch(JSON.stringify(calls.logs), /pat@example/)
})

test('the same estimate twice, rapid updates and abusive volumes are limited', async () => {
  const { calls, post } = emailRoute()
  const t = goodToken()
  assert.equal((await post({ token: t, inputs, send: true })).data.email, 'sent')
  assert.equal((await post({ token: t, inputs, send: true })).data.email, 'duplicate')
  const quick = await post({ token: t, inputs: { ...inputs, size: 23 }, send: true })
  assert.equal(quick.status, 429)
  assert.equal(quick.data.email, 'too_soon')
  assert.equal(calls.emails.length, 1)
})

test('custom-quote or missing inputs never get a number by email', async () => {
  const { calls, post } = emailRoute()
  for (const bad of [{ size: 22, material: 'slate', pitch: 'steep' }, { size: null }, { size: 99, material: 'architectural', pitch: 'low' }]) {
    assert.equal((await post({ token: goodToken(), inputs: bad, send: true })).status, 400)
  }
  assert.equal(calls.emails.length, 0)
})

test('another site, a bot or a failed send are refused or reported honestly', async () => {
  const cross = await emailRoute().post({ token: goodToken(), inputs, send: true }, { origin: 'https://evil.example', host: 'www.roofingnearmestl.com' })
  assert.equal(cross.status, 403)
  const botted = emailRoute({ bot: { isBot: true, isVerifiedBot: false } })
  assert.equal((await botted.post({ token: goodToken(), inputs, send: true })).status, 403)
  assert.equal(botted.calls.emails.length, 0)
  const failing = await emailRoute({ emailError: { name: 'application_error' } }).post({ token: goodToken(), inputs, send: true })
  assert.equal(failing.data.email, 'failed')
  assert.equal(failing.data.estimate.price, pricing.estimate(22, 'architectural', 'steep').price)
})

// ── Page rules ────────────────────────────────────────────────────────────────────────────────────────────────
test('the page keeps unconfirmed claims and missing media switched off', () => {
  const config = read('src/lib/free-inspection.ts')
  assert.match(config, /TWO_WEEK_START_CONFIRMED = false/)
  assert.match(config, /CLEANUP_CONFIRMED = false/)
  assert.match(config, /AD_VIDEO:[^=]*= null/)
  assert.doesNotMatch(config, /cleaner than we found/i)
})

test('Illinois gets no roofing service choice; the page never hard-codes a price', () => {
  const config = read('src/lib/free-inspection.ts')
  assert.match(config, /IL: \[\.\.\.IL_LEAD_SERVICES\]/)
  for (const s of business.IL_LEAD_SERVICES) assert.doesNotMatch(s, /roof/i)
  for (const file of ['src/app/free-inspection/page.tsx', 'src/app/free-inspection/project-request.tsx']) {
    assert.doesNotMatch(read(file), /\$\d/, file)
  }
})

test('the page uses the brief wording and the right buttons', () => {
  const page = read('src/app/free-inspection/page.tsx')
  const form = read('src/app/free-inspection/project-request.tsx')
  assert.ok(page.includes('Your Next Exterior Project Starts Here.'))
  assert.ok(page.includes('Tell us what your home needs. Get straightforward answers and a clear next step.'))
  assert.ok(page.includes("Let&apos;s Talk About Your Project."))
  assert.ok(form.includes('Send My Project Request'))
  assert.ok(form.includes('Send Request &amp; Get Rough Estimate') || form.includes('Send Request & Get Rough Estimate'))
  assert.ok(form.includes('Email My Updated Estimate'))
  assert.ok(form.includes("I don&apos;t know my roof size"))
  assert.doesNotMatch(form, /defaultChecked|checked=\{true\}/) // no prechecked boxes
  assert.match(read('src/components/mobile-call-bar.tsx'), /"\/free-inspection"/)
})
