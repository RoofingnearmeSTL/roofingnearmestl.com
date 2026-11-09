import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const guardSource = ts.transpileModule(fs.readFileSync('src/lib/illinois-guard.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const guard = {}
vm.runInNewContext(guardSource, { exports: guard })

const contactCheck = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/contact-check.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: contactCheck })

const business = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/business.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: business })

const customerEmail = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/customer-email.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: customerEmail })

const source = ts.transpileModule(fs.readFileSync('src/app/api/lead/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function handler({ insertError = null, insertErrors = [], emailError = null, emailErrorsFirst = 0, env = {}, smsStatus = 201, bot = { isBot: false }, botThrows = false,
  emailCheck = 'ok', emailCheckThrows = false, emailCheckDelayMs = 0 } = {}) {
  const calls = { inserts: [], emails: [], logs: [], sms: [], emailChecks: [], insertSawPendingCheck: false }
  let checkSettled = true
  const environment = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'test-server-key',
    RESEND_API_KEY: 'test-email-key',
    LEAD_TO_EMAIL: 'recipient@example.invalid',
    ...env,
  }
  const exports = {}
  vm.runInNewContext(source, {
    exports, process: { env: environment }, btoa, URLSearchParams, AbortSignal, Date, setTimeout: (fn) => setTimeout(fn, 0),
    fetch: async (url, options) => { calls.sms.push({ url, ...options }); return { ok: smsStatus < 400, status: smsStatus } },
    console: Object.fromEntries(['log', 'error'].map(level => [level, (...args) => calls.logs.push(args)])),
    require(name) {
      if (name === 'next/server') return { NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) } }
      if (name === '@supabase/supabase-js') return { createClient(url, key, options) {
        calls.client = { url, key, options }
        return { from(table) { calls.table = table; return { insert(rows) {
          calls.inserts.push(rows)
          if (!checkSettled) calls.insertSawPendingCheck = true
          const n = calls.inserts.length - 1
          const result = { data: null, error: n < insertErrors.length ? insertErrors[n] : insertError }
          return Object.assign(Promise.resolve(result), { select: async () => result })
        } } } }
      } }
      if (name.endsWith('illinois-guard')) return guard
      if (name.endsWith('contact-check')) return contactCheck
      if (name.endsWith('/business')) return business
      if (name.endsWith('customer-email')) return customerEmail
      if (name.endsWith('email-domain-check')) return { checkEmailDomain: async (email) => {
        calls.emailChecks.push(email)
        if (emailCheckDelayMs) {
          checkSettled = false
          await new Promise((resolve) => setTimeout(resolve, emailCheckDelayMs))
          checkSettled = true
        }
        if (emailCheckThrows) throw new Error('dns down')
        return emailCheck
      } }
      if (name === 'botid/server') return { checkBotId: async () => { if (botThrows) throw new Error('botid down'); return bot } }
      if (name === 'resend') return { Resend: class {
        constructor(key) { calls.emailKey = key }
        emails = { send: async (payload) => {
          calls.emails.push(payload)
          if (payload.to === 'recipient@example.invalid' && calls.emails.filter((e) => e.to === payload.to).length <= emailErrorsFirst) {
            return { data: null, error: { name: 'rate_limit_exceeded' } }
          }
          return { data: { id: 'test-id' }, error: emailError }
        } }
      } }
      throw new Error(`Unexpected import: ${name}`)
    },
  })
  return { calls, post: body => exports.POST({ json: async () => body }) }
}

const noSource = { utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null, gclid: null, fbclid: null, landing_page: null, page_url: null }

const lead = {
  name: '<Customer>', phone: '3145550100', email: 'customer@example.invalid',
  address: '123 Example St', city: 'St Louis', service_type: 'repair', issue_type: 'leak',
  roof_age: 12, roof_size: 2000, roof_pitch: 'steep', roof_material: 'metal',
  emergency: true, message: 'Roof leak',
}

test('inserts all requested columns with server credentials, then emails configured recipient', async () => {
  const { calls, post } = handler()
  const response = await post(lead)
  assert.equal(response.status, 200)
  assert.deepEqual(JSON.parse(JSON.stringify(calls.inserts)), [[{ ...lead, ...noSource }]])
  assert.equal(calls.table, 'leads')
  assert.equal(calls.client.key, 'test-server-key')
  assert.equal(calls.client.options.auth.persistSession, false)
  assert.equal(calls.emails[0].to, 'recipient@example.invalid')
  assert.equal(calls.emails[0].replyTo, lead.email)
  assert.match(calls.emails[0].html, /&lt;Customer&gt;/)
  assert.match(calls.emails[0].text, /Roof leak/)
  assert.doesNotMatch(JSON.stringify([response, calls.logs]), /test-server-key|test-email-key|customer@example|123 Example/)
})

test('maps existing form fields and preserves explicit false and zero', async () => {
  const { calls, post } = handler()
  await post({ name: 'Test', phone: '3145550100', service: 'replacement', details: 'Details',
    est_size: 1800, est_pitch: 'low', est_material: 'metal', roof_age: 0, emergency: false })
  const row = calls.inserts[0][0]
  assert.equal(row.service_type, 'replacement')
  assert.equal(row.message, 'Details')
  assert.equal(row.roof_size, 1800)
  assert.equal(row.roof_pitch, 'low')
  assert.equal(row.roof_material, 'metal')
  assert.equal(row.roof_age, 0)
  assert.equal(row.emergency, false)
  assert.equal(row.issue_type, null)
})

test('schema failure returns 500 without sending email or leaking database details', async () => {
  const { calls, post } = handler({ insertError: { code: 'PGRST204', message: 'private schema details' } })
  const response = await post(lead)
  assert.equal(response.status, 500)
  assert.equal(calls.inserts.length, 1)
  assert.equal(calls.emails.length, 0)
  assert.doesNotMatch(JSON.stringify([response, calls.logs]), /private schema details/)
})

test('email failure does not fail a saved lead', async () => {
  const { calls, post } = handler({ emailError: { name: 'validation_error', message: 'private details' } })
  assert.equal((await post(lead)).status, 200)
  assert.equal(calls.inserts.length, 1)
  // one automatic retry, then the daily lead check takes over
  assert.equal(calls.emails.filter((e) => e.to === 'recipient@example.invalid').length, 2)
})

test('missing recipient never falls back to a hardcoded address', async () => {
  const { calls, post } = handler({ env: { LEAD_TO_EMAIL: '' } })
  assert.equal((await post(lead)).status, 200)
  assert.equal(calls.emails.length, 0)
})

test('missing service role key rejects the request without insert or secret disclosure', async () => {
  const { calls, post } = handler({ env: { SUPABASE_SERVICE_ROLE_KEY: '' } })
  const response = await post(lead)
  assert.equal(response.status, 500)
  assert.equal(calls.inserts.length, 0)
  assert.equal(calls.emails.length, 0)
})

test('requires name and phone before inserting', async () => {
  const { calls, post } = handler()
  assert.equal((await post({ name: 'Test' })).status, 400)
  assert.equal(calls.inserts.length, 0)
})

for (const [material, label] of [['clay', 'Clay Tile'], ['slate', 'Slate'], ['metal', 'Metal']]) {
  test(`${label} estimator selection persists age/emergency and emails every roofing detail`, async () => {
    // The estimator builds these extras; the shared LeadForm merges them into the payload.
    const { estimatorExtras } = await import('../src/lib/pricing.ts')
    const page = fs.readFileSync('src/app/page.tsx', 'utf8')
    const estimator = fs.readFileSync('src/components/roof-estimator.tsx', 'utf8')
    const leadForm = fs.readFileSync('src/components/lead-form.tsx', 'utf8')
    const payloadSource = leadForm.slice(leadForm.indexOf('    const payload = {'), leadForm.indexOf('\n    try {', leadForm.indexOf('    const payload = {')))
    const compiled = ts.transpileModule(`${payloadSource}\nexports.payload = payload`, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText
    const form = new Map(Object.entries({ name: 'Tile Customer', phone: '3145550100', email: 'customer@example.invalid',
      address: '123 Example St', city: 'St Louis', service: 'Roof Repair', issue_type: 'Active leak',
      roof_age: '15-20 years', emergency: 'on', details: '<Leak>\nPlease tarp' }))
    const exports = {}
    const extras = estimatorExtras({ squares: 18, shingle: material, pitch: 'medium', place: 'St. Louis, MO', state: 'MO' })
    vm.runInNewContext(compiled, { exports, fd: form, extras, utm: {}, shownAt: { current: 0 }, Date })
    const payload = exports.payload
    assert.equal(payload.roof_material, label)
    assert.equal(payload.roof_age, '15-20 years')
    assert.equal(payload.emergency, true)
    assert.equal(payload.roof_size, '18 SQ (~1,800 sq ft)')
    assert.equal(payload.roof_pitch, 'Medium Pitch (5/12 - 7/12)')
    assert.equal(payload.est_price, null) // custom quote: no price
    assert.equal(payload.est_price_low, null)
    assert.match(estimator, /estimatorExtras\(\{ squares, shingle, pitch, place, state \}\)/)
    // Homepage: the server page renders the estimator and form through the client wrapper, which shares the extras.
    const homeEstimate = fs.readFileSync('src/components/home-estimate.tsx', 'utf8')
    assert.match(page, /<HomeEstimateProvider>[\s\S]*<HomeLeadForm[\s\S]*<HomeEstimator \/>[\s\S]*<\/HomeEstimateProvider>/)
    assert.match(homeEstimate, /<RoofEstimator onChange=\{estimate\?\.setExtras\} \/>/)
    assert.match(homeEstimate, /<LeadForm extras=\{estimate\?\.extras\}/)
    assert.match(leadForm, /name="roof_age"/)
    assert.match(leadForm, /name="emergency" type="checkbox"/)
    const { calls, post } = handler()
    assert.equal((await post(payload)).status, 200)
    const row = calls.inserts[0][0]
    const leadColumns = ['name', 'phone', 'email', 'address', 'city', 'service_type', 'issue_type', 'roof_age', 'roof_size', 'roof_pitch', 'roof_material', 'emergency', 'message']
    assert.deepEqual(Object.keys(row), [...leadColumns, ...Object.keys(noSource)])
    for (const key of leadColumns) assert.equal(row[key], payload[key])
    const email = calls.emails[0]
    assert.equal(email.subject, 'New Roofing Lead: St Louis - Roof Repair - Active leak')
    for (const line of ['Name: Tile Customer', 'Phone: 3145550100', 'Email: customer@example.invalid',
      'Address: 123 Example St, St Louis', 'Service: Roof Repair', 'Issue: Active leak',
      'Age of Roof: 15-20 years', 'Emergency Tarp Needed: YES - Emergency',
      'Roof Size: 18 SQ (~1,800 sq ft)', 'Pitch: Medium Pitch (5/12 - 7/12)', `Material: ${label}`, 'Message: <Leak>\nPlease tarp']) {
      assert.ok(email.text.includes(line), line)
    }
    assert.match(email.html, /&lt;Leak&gt;<br>Please tarp/)
    for (const value of ['15-20 years', 'YES - Emergency', '18 SQ (~1,800 sq ft)', 'Medium Pitch (5/12 - 7/12)', label]) assert.ok(email.html.includes(value))
  })
}

test('priced estimator selection carries the estimate into the lead', async () => {
  const { estimatorExtras } = await import('../src/lib/pricing.ts')
  const extras = estimatorExtras({ squares: 18, shingle: 'architectural', pitch: 'steep', place: 'St. Charles, MO', state: 'MO' })
  assert.equal(extras.est_price, 13500)
  assert.equal(extras.est_price_low, 8100)
  assert.equal(extras.est_price_high, 13500)
  assert.equal(extras.roof_material, '30-Year Architectural')
  const il = estimatorExtras({ squares: 18, shingle: 'architectural', pitch: 'steep', place: 'Waterloo, IL', state: 'IL' })
  assert.equal(il.est_price, null) // Illinois: no roofing price
})

test('unchecked emergency is No and numeric roofing details remain visible', async () => {
  const { calls, post } = handler()
  await post({ ...lead, emergency: false, roof_age: 0, roof_size: 1800 })
  assert.match(calls.emails[0].text, /Emergency Tarp Needed: No/)
  assert.match(calls.emails[0].text, /Age of Roof: 0/)
  assert.match(calls.emails[0].text, /Roof Size: 1800/)
})

const twilio = { TWILIO_ACCOUNT_SID: 'AC123', TWILIO_AUTH_TOKEN: 'test-token', TWILIO_FROM_NUMBER: '+16185550100', LEAD_ALERT_PHONE: '+16185550199' }

test('no text alert is attempted until Twilio is configured', async () => {
  const { calls, post } = handler()
  assert.equal((await post(lead)).status, 200)
  assert.equal(calls.sms.length, 0)
})

test('configured Twilio sends one text alert with the lead summary', async () => {
  const { calls, post } = handler({ env: twilio })
  assert.equal((await post(lead)).status, 200)
  assert.equal(calls.sms.length, 1)
  const sms = calls.sms[0]
  assert.equal(sms.url, 'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json')
  assert.equal(sms.headers.Authorization, `Basic ${btoa('AC123:test-token')}`)
  const body = new URLSearchParams(sms.body)
  assert.equal(body.get('From'), '+16185550100')
  assert.equal(body.get('To'), '+16185550199')
  assert.equal(body.get('Body'), 'EMERGENCY - New roofing lead: <Customer> | 3145550100 | St Louis | repair | leak')
  assert.equal(calls.emails.filter((e) => e.to === 'recipient@example.invalid').length, 1)
})

test('a failed text alert does not fail a saved lead', async () => {
  const { calls, post } = handler({ env: twilio, smsStatus: 400 })
  assert.equal((await post(lead)).status, 200)
  assert.equal(calls.inserts.length, 1)
  assert.ok(calls.logs.some(([message]) => message === 'LEAD SMS FAILED'))
})

const hook = { LEAD_WEBHOOK_URL: 'https://hook.us2.make.com/abc123' }

test('no CRM webhook is sent until LEAD_WEBHOOK_URL is set', async () => {
  const { calls, post } = handler()
  assert.equal((await post(lead)).status, 200)
  assert.equal(calls.sms.length, 0)
})

test('configured CRM webhook receives the saved lead as JSON', async () => {
  const { calls, post } = handler({ env: hook })
  const response = await post({ ...lead, name: 'Pat Q Customer', est_location: 'St. Charles, MO', est_price: null, utm_source: 'google', utm_medium: 'cpc' })
  assert.equal(response.status, 200)
  assert.equal(calls.sms.length, 1)
  const call = calls.sms[0]
  assert.equal(call.url, hook.LEAD_WEBHOOK_URL)
  assert.equal(call.method, 'POST')
  assert.equal(call.headers['Content-Type'], 'application/json')
  assert.ok(call.signal)
  const sent = JSON.parse(call.body)
  assert.equal(sent.name, 'Pat Q Customer')
  assert.equal(sent.first_name, 'Pat')
  assert.equal(sent.last_name, 'Q Customer')
  assert.equal(sent.phone, '3145550100')
  assert.equal(sent.email, 'customer@example.invalid')
  assert.equal(sent.state, 'MO')
  assert.equal(sent.estimate_price, null)
  assert.equal(sent.lead_source, 'google / cpc')
  assert.equal(sent.emergency, true)
  assert.match(sent.submitted_at, /^\d{4}-\d{2}-\d{2}T/)
  // RoofLink "Create a new job" body: first name and address are required.
  const job = JSON.parse(sent.rooflink_job_json)
  assert.equal(job.job_type, 'r')
  assert.equal(job.bid_type, 'r') // service "repair"
  assert.equal(job.address, '123 Example St')
  assert.equal(job.city, 'St Louis')
  assert.equal(job.state, 'MO')
  assert.deepEqual(job.customer, { first_name: 'Pat', last_name: 'Q Customer', phone: '3145550100', email: 'customer@example.invalid' })
  assert.equal(job.platform, 'Website')
  assert.match(job.note.message, /^Website lead from roofingnearmestl\.com\nEMERGENCY - needs a tarp now\nService: repair\nIssue: leak/)
  assert.match(job.note.message, /Source: google \/ cpc/)
})

test('RoofLink job uses the city when no street address is given', async () => {
  const { calls, post } = handler({ env: hook })
  await post({ ...lead, name: 'Sam', address: '', city: 'Waterloo', est_location: 'Waterloo, IL', service_type: 'Siding', emergency: false, email: '' })
  const job = JSON.parse(JSON.parse(calls.sms[0].body).rooflink_job_json)
  assert.equal(job.address, 'Waterloo, IL')
  assert.equal(job.bid_type, undefined)
  assert.deepEqual(job.customer, { first_name: 'Sam', phone: '3145550100' })
  assert.match(job.note.message, /No street address given - call to confirm/)
})

test('a failed or non-https CRM webhook does not fail a saved lead', async () => {
  const failed = handler({ env: hook, smsStatus: 500 })
  assert.equal((await failed.post(lead)).status, 200)
  assert.equal(failed.calls.inserts.length, 1)
  assert.ok(failed.calls.logs.some(([message]) => message === 'LEAD WEBHOOK FAILED'))
  const insecure = handler({ env: { LEAD_WEBHOOK_URL: 'http://example.invalid/hook' } })
  assert.equal((await insecure.post(lead)).status, 200)
  assert.equal(insecure.calls.sms.length, 0)
  assert.ok(insecure.calls.logs.some(([message]) => message === 'LEAD WEBHOOK URL MUST START WITH https://'))
})

test('spam trap answers ok but saves and sends nothing', async () => {
  const { calls, post } = handler({ env: twilio })
  const response = await post({ ...lead, company: 'Bot LLC' })
  assert.equal(response.status, 200)
  assert.equal(calls.inserts.length, 0)
  assert.equal(calls.emails.length, 0)
  assert.equal(calls.sms.length, 0)
})

test('rejects phone numbers without 10 digits', async () => {
  const { calls, post } = handler()
  assert.equal((await post({ ...lead, phone: 'test' })).status, 400)
  assert.equal((await post({ ...lead, phone: '555-0100' })).status, 400)
  assert.equal(calls.inserts.length, 0)
})

test('clips long text, drops non-text values and ignores an invalid reply-to email', async () => {
  const { calls, post } = handler()
  await post({ ...lead, message: 'x'.repeat(5000), address: { $ne: 1 }, email: 'not-an-email' })
  const row = calls.inserts[0][0]
  assert.equal(row.message.length, 2000)
  assert.equal(row.address, null)
  assert.equal(row.email, null)
  assert.equal('replyTo' in calls.emails[0], false)
})

test('saves lead source fields and shows the source in the email', async () => {
  const { calls, post } = handler()
  await post({ ...lead, utm_source: 'facebook', utm_medium: 'social', utm_campaign: 'page', fbclid: 'fb123',
    landing_page: 'https://www.roofingnearmestl.com/?utm_source=facebook', page: 'https://www.roofingnearmestl.com/roof-repair' })
  const row = calls.inserts[0][0]
  assert.equal(row.utm_source, 'facebook')
  assert.equal(row.utm_campaign, 'page')
  assert.equal(row.fbclid, 'fb123')
  assert.equal(row.landing_page, 'https://www.roofingnearmestl.com/?utm_source=facebook')
  assert.equal(row.page_url, 'https://www.roofingnearmestl.com/roof-repair')
  assert.ok(calls.emails[0].text.includes('Source: facebook / social / page'))
  assert.ok(calls.emails[0].text.includes('Form Page: https://www.roofingnearmestl.com/roof-repair'))
})

test('an ad click without UTM tags is still labeled in the email', async () => {
  const { calls, post } = handler()
  await post({ ...lead, gclid: 'abc' })
  assert.ok(calls.emails[0].text.includes('Source: Google Ads click'))
  await post({ ...lead })
  assert.ok(calls.emails.filter((e) => e.to === 'recipient@example.invalid')[1].text.includes('Source: Direct or unknown'))
})

test('Illinois roofing requests are saved, tagged license pending, and flagged to the team', async () => {
  const cases = [
    { city: 'Waterloo', service_type: 'Roof Repair' },
    { city: "O'Fallon, IL", service_type: 'Roof Replacement' },
    { city: 'Columbia', address: '12 Main St, Columbia IL 62236', service_type: 'Storm Damage / Insurance' },
    { city: '', est_location: 'Belleville, IL', service_type: 'Roof Replacement' },
    { city: 'Belleville', service_type: 'Siding', emergency: true },
  ]
  for (const extra of cases) {
    const { calls, post } = handler()
    const response = await post({ ...lead, emergency: false, ...extra })
    assert.equal(response.status, 200, JSON.stringify(extra))
    assert.equal(response.data.area, 'il-pending')
    assert.equal(calls.inserts.length, 1)
    assert.equal(calls.inserts[0][0].status, 'il_license_pending')
    const owner = calls.emails.find((e) => e.to === 'recipient@example.invalid')
    assert.match(owner.subject, /^IL ROOFING - LICENSE PENDING - do not quote or schedule roofing - New Roofing Lead/)
    assert.match(owner.text, /^Illinois License Pending: YES .*Do NOT quote, schedule or do any roof work/)
  }
})

test('an Illinois roofing confirmation is honest about the license, in small print', async () => {
  const { calls, post } = handler()
  await post({ ...lead, city: 'Waterloo', service_type: 'Roof Repair', emergency: false })
  const email = calls.emails.find((e) => e.to === lead.email)
  assert.match(email.text, /point you to a licensed Illinois roofer/)
  assert.match(email.text, /siding, gutters, soffit, fascia and other exterior work/)
  assert.match(email.text, /Roofing in Illinois is pending our Illinois roofing license/)
  assert.match(email.html, /<p style="font-size:12px;color:#666;line-height:1.5">Roofing in Illinois is pending/)
  assert.doesNotMatch(email.text, /Free Photo-Documented Roof Report|24\/7/)
})

test('an Illinois emergency roof request gets a fast call back, never a tarp promise', async () => {
  const { calls, post } = handler()
  const response = await post({ ...lead, city: 'Waterloo', service_type: 'Siding', emergency: true })
  assert.equal(response.data.area, 'il-pending')
  assert.equal(calls.inserts[0][0].emergency, true)
  const owner = calls.emails.find((e) => e.to === 'recipient@example.invalid')
  assert.ok(owner.text.includes('Emergency Tarp Needed: YES - Emergency (Illinois: no roof tarp; call back fast)'))
  const email = calls.emails.find((e) => e.to === lead.email)
  assert.match(email.text, /call us at 618-612-5192 and we'll point you to a licensed Illinois roofer right away/)
  assert.doesNotMatch(email.text, /24\/7|tarp/i)
})

test('the CRM note never promises an Illinois roof tarp', async () => {
  const { calls, post } = handler({ env: hook })
  await post({ ...lead, city: 'Waterloo', service_type: 'Siding', emergency: true })
  await post({ ...lead, city: 'Belleville', service_type: 'Siding Repair', emergency: false, urgent: true })
  const [pending, urgent] = calls.sms.map((call) => JSON.parse(JSON.parse(call.body).rooflink_job_json).note.message)
  assert.match(pending, /EMERGENCY - Illinois: no roof tarp; call back fast/)
  assert.match(urgent, /URGENT - storm damage to siding, gutters or trim \(call back fast\)/)
  for (const note of [pending, urgent]) assert.doesNotMatch(note, /needs a tarp/)
})

test('urgent Illinois siding damage is flagged without counting as a roof request', async () => {
  const { calls, post } = handler()
  const response = await post({ ...lead, city: 'Belleville', service_type: 'Siding Repair', emergency: false, urgent: true })
  assert.equal(response.data.area, 'il')
  const row = calls.inserts[0][0]
  assert.equal(row.emergency, true)
  assert.equal(row.status, undefined) // table default "new"
  const owner = calls.emails.find((e) => e.to === 'recipient@example.invalid')
  assert.ok(owner.text.includes('Urgent: YES - storm damage to siding, gutters or trim (call back fast)'))
  assert.doesNotMatch(owner.subject, /LICENSE PENDING/)
  const email = calls.emails.find((e) => e.to === lead.email)
  assert.match(email.text, /urgent storm damage, so we'll call you back as fast as we can/)
})

test('Illinois exterior work and Missouri roofing still go through', async () => {
  const cases = [
    { city: 'Waterloo', service_type: 'Siding' },
    { city: 'Edwardsville', service_type: 'Gutters / Downspouts' },
    { city: "O'Fallon", service_type: 'Roof Repair' },
    { city: 'Columbia', service_type: 'Roof Replacement' },
    { city: 'St. Charles', address: '1 Main St, St Charles MO 63301', service_type: 'Roof Replacement' },
  ]
  for (const extra of cases) {
    const { calls, post } = handler()
    const response = await post({ ...lead, emergency: false, ...extra })
    assert.equal(response.status, 200, JSON.stringify(extra))
    assert.equal(calls.inserts.length, 1)
    assert.equal(calls.inserts[0][0].status, undefined)
    assert.notEqual(response.data.area, 'il-pending')
  }
})

test('phone taps are no longer sent as Google Ads or Meta conversions', () => {
  const tags = fs.readFileSync('src/components/google-ads.tsx', 'utf8')
  assert.doesNotMatch(tags, /send_to: ADS_CALL_SEND_TO/)
  assert.doesNotMatch(tags, /fbq\?\.\("track", "Contact"/)
  assert.match(tags, /click_to_call/)
})

test('the browser form always sends, shows the Illinois note in small print, and skips ad conversions for pending leads', () => {
  const form = fs.readFileSync('src/components/lead-form.tsx', 'utf8')
  assert.match(form, /isIllinoisRoofingRequest\(/)
  assert.doesNotMatch(form, /res\.status === 422|setSending\(false\);\n\s*return;/)
  assert.match(form, /ilRoofing && <p role="status" className="px-1 text-xs leading-snug text-zinc-500">/)
  assert.match(form, /name="urgent" type="checkbox"/)
  const conversion = fs.readFileSync('src/app/thank-you/conversion.tsx', 'utf8')
  assert.match(conversion, /lead\.ilPending === true\) \{[\s\S]*pendingTags\.delete\("ads"\);[\s\S]*pendingTags\.delete\("meta"\);/)
})

test('the customer gets an instant confirmation email when they give an email', async () => {
  const { calls, post } = handler()
  assert.equal((await post({ ...lead, name: 'Pat Q Customer', city: 'Kirkwood', service_type: 'Roof Replacement', emergency: false })).status, 200)
  const owner = calls.emails.filter((e) => e.to === 'recipient@example.invalid')
  const customer = calls.emails.filter((e) => e.to === lead.email)
  assert.equal(owner.length, 1)
  assert.equal(customer.length, 1)
  const email = customer[0]
  assert.equal(email.from, 'RoofingnearmeSTL <leads@roofingnearmestl.com>')
  assert.equal(email.replyTo, 'recipient@example.invalid') // replies reach the owner
  assert.equal(email.subject, 'We got your request - RoofingnearmeSTL')
  assert.match(email.text, /^Hi Pat,/)
  assert.match(email.text, /request for Roof Replacement in Kirkwood/)
  assert.match(email.text, /call you at 3145550100/)
  assert.match(email.text, /Free Photo-Documented Roof Report/)
  assert.match(email.text, /Need us sooner\? Call 314-202-7663/)
  assert.match(email.text, /421 Janice Dr, Waterloo, IL 62298/)
  assert.doesNotMatch(email.text, /discount|offer|sale|promo/i)
})

test('a Missouri emergency confirmation points to the 24/7 line', async () => {
  const { calls, post } = handler()
  await post({ ...lead, city: 'Arnold', emergency: true })
  const email = calls.emails.find((e) => e.to === lead.email)
  assert.match(email.text, /24\/7 emergency line: 314-202-7663/)
})

test('an Illinois exterior confirmation uses Illinois wording and phone, never roofing', async () => {
  const { calls, post } = handler()
  await post({ ...lead, city: 'Waterloo', service_type: 'Siding', emergency: false })
  const email = calls.emails.find((e) => e.to === lead.email)
  assert.match(email.text, /siding, gutter or soffit & fascia estimate/)
  assert.match(email.text, /Need us sooner\? Call 618-612-5192/)
  assert.match(email.text, /about your project/)
  const body = email.text.split('\n\n').slice(0, -1).join(' ').replace(/RoofingnearmeSTL|Roofing Near Me STL/g, '')
  assert.doesNotMatch(body, /roof/i) // body only, brand name aside
})

test('no customer email address means no confirmation email', async () => {
  const { calls, post } = handler()
  await post({ ...lead, email: '' })
  assert.equal(calls.emails.length, 1)
  assert.equal(calls.emails[0].to, 'recipient@example.invalid')
})

test('a failed team email is retried once and the retry succeeds', async () => {
  const { calls, post } = handler({ emailErrorsFirst: 1 })
  assert.equal((await post({ ...lead, emergency: false })).status, 200)
  assert.equal(calls.emails.filter((e) => e.to === 'recipient@example.invalid').length, 2)
  assert.ok(calls.logs.some((l) => l[0] === 'LEAD EMAIL SENT' && l[1].attempt === 2))
})

test('a BotID bot is saved and flagged, gets no customer email, and is not an ad conversion', async () => {
  const { calls, post } = handler({ bot: { isBot: true, isVerifiedBot: false } })
  const response = await post({ ...lead, emergency: false })
  assert.equal(response.status, 200)
  assert.equal(response.data.suspected, true)
  assert.equal(calls.inserts[0][0].status, 'suspected_bot')
  const owner = calls.emails.filter((e) => e.to === 'recipient@example.invalid')
  assert.equal(owner.length, 1)
  assert.match(owner[0].subject, /^\[POSSIBLE SPAM\] New Roofing Lead/)
  assert.match(owner[0].text, /^Possible spam: YES - looks automated \(BotID\)/)
  assert.equal(calls.emails.filter((e) => e.to === lead.email).length, 0)
})

test('a form sent faster than a person could type is flagged, never dropped', async () => {
  const { calls, post } = handler()
  const response = await post({ ...lead, emergency: false, form_ms: 400 })
  assert.equal(response.data.suspected, true)
  assert.equal(calls.inserts.length, 1)
  assert.match(calls.emails[0].text, /sent too fast/)
})

test('a normal lead (human, normal speed) is not flagged; a BotID outage never flags or blocks', async () => {
  for (const options of [{}, { botThrows: true }]) {
    const { calls, post } = handler(options)
    const response = await post({ ...lead, emergency: false, form_ms: 9000 })
    assert.equal(response.status, 200)
    assert.equal(response.data.suspected, undefined)
    assert.equal(calls.inserts[0][0].status, undefined)
    assert.equal(calls.emails.filter((e) => e.to === lead.email).length, 1)
  }
})

test('the form sends its timing and treats suspected bots like non-conversions; BotID protects /api/lead', () => {
  const form = fs.readFileSync('src/components/lead-form.tsx', 'utf8')
  assert.match(form, /form_ms: shownAt\.current/)
  assert.match(form, /ilPending: ilPending \|\| result\.suspected === true/)
  const client = fs.readFileSync('src/instrumentation-client.ts', 'utf8')
  assert.match(client, /path: "\/api\/lead", method: "POST"/)
  const config = fs.readFileSync('next.config.ts', 'utf8')
  assert.match(config, /export default withBotId\(nextConfig\)/)
})

// ---------- daily lead check (/api/lead-check) ----------
const checkSource = ts.transpileModule(fs.readFileSync('src/app/api/lead-check/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function checker({ leads = [], sent = [], secret = 'cron-test-secret', listKey, listError = null, sendKey = 'r', sendResult = null, listThrows = null } = {}) {
  const calls = { emails: [], logs: [], listKeys: [], sendKeys: [] }
  const environment = { NEXT_PUBLIC_SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'k', LEAD_TO_EMAIL: 'recipient@example.invalid', ...(sendKey ? { RESEND_API_KEY: sendKey } : {}), ...(listKey ? { RESEND_LEAD_CHECK_KEY: listKey } : {}), ...(secret ? { CRON_SECRET: secret } : {}) }
  const exports = {}
  vm.runInNewContext(checkSource, {
    exports, process: { env: environment }, Date, Set,
    console: Object.fromEntries(['log', 'error'].map(level => [level, (...args) => calls.logs.push(args)])),
    require(name) {
      if (name === 'next/server') return { NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) } }
      if (name === '@supabase/supabase-js') return { createClient: () => ({ from: () => {
        const q = { select: () => q, gte: () => q, neq: () => q, order: async () => ({ data: leads, error: null }) }
        return q
      } }) }
      if (name === 'resend') return { Resend: class {
        constructor(apiKey) {
          this.emails = {
            list: async () => { calls.listKeys.push(apiKey); if (listThrows) throw listThrows; return listError ? { data: null, error: listError } : { data: { data: sent }, error: null } },
            send: async (payload) => { calls.sendKeys.push(apiKey); calls.emails.push(payload); if (sendResult === 'throw') throw new Error('network down'); return sendResult ?? { data: { id: 'a' }, error: null } },
          }
        }
      } }
      throw new Error('Unexpected import: ' + name)
    },
  })
  return { calls, get: (auth) => exports.GET({ headers: { get: (h) => (h === 'authorization' ? auth : null) } }) }
}
const now = () => new Date().toISOString()
const teamEmail = (event = 'delivered') => ({ created_at: now(), to: ['recipient@example.invalid'], subject: 'New Roofing Lead: Kirkwood - Roof Repair - ', last_event: event })

test('lead check is off without CRON_SECRET and refuses a wrong secret', async () => {
  assert.equal((await checker({ secret: '' }).get('Bearer x')).status, 503)
  assert.equal((await checker().get('Bearer wrong')).status, 401)
})

test('lead check stays quiet when every saved lead has a delivered team email', async () => {
  const { calls, get } = checker({ leads: [{ created_at: now(), status: 'new' }, { created_at: now(), status: 'il_license_pending' }], sent: [teamEmail(), teamEmail('opened'), { created_at: now(), to: ['customer@example.invalid'], subject: 'We got your request - RoofingnearmeSTL', last_event: 'delivered' }] })
  const res = await get('Bearer cron-test-secret')
  assert.equal(res.data.ok, true)
  assert.equal(res.data.saved, 2)
  assert.equal(res.data.delivered, 2)
  assert.equal(calls.emails.length, 0)
})

test('lead check emails Mike when a saved lead has no delivered team email', async () => {
  const { calls, get } = checker({ leads: [{ created_at: now(), status: 'new', city: 'Arnold', service_type: 'Roof Repair' }, { created_at: now(), status: 'new' }], sent: [teamEmail(), teamEmail('bounced')] })
  const res = await get('Bearer cron-test-secret')
  assert.equal(res.data.ok, false)
  assert.equal(res.data.missing, 1)
  assert.equal(res.data.failed, 1)
  assert.equal(calls.emails.length, 1)
  assert.equal(calls.emails[0].to, 'recipient@example.invalid')
  assert.match(calls.emails[0].subject, /^LEAD CHECK: /)
  assert.match(calls.emails[0].text, /Arnold \| Roof Repair/)
})

test('lead check reads the email list with its own key and sends alerts with the sending key', async () => {
  const { calls, get } = checker({ listKey: 'full-access-test', leads: [{ created_at: now(), status: 'new' }], sent: [] })
  const res = await get('Bearer cron-test-secret')
  assert.equal(res.data.missing, 1)
  assert.deepEqual(calls.listKeys, ['full-access-test'])
  assert.deepEqual(calls.sendKeys, ['r'])
})

test('lead check falls back to the sending key for the list when no separate key is set', async () => {
  const { calls, get } = checker({ leads: [], sent: [] })
  await get('Bearer cron-test-secret')
  assert.deepEqual(calls.listKeys, ['r'])
})

test('lead check emails Mike when it cannot run, with the fix, and never includes a key', async () => {
  const { calls, get } = checker({ sendKey: 'send-secret-value', listError: { name: 'restricted_api_key', message: 'This API key is restricted to only send emails' } })
  const res = await get('Bearer cron-test-secret')
  assert.equal(res.status, 500)
  assert.equal(res.data.alerted, true)
  assert.equal(calls.emails.length, 1)
  assert.match(calls.emails[0].subject, /^LEAD CHECK FAILED/)
  assert.match(calls.emails[0].text, /restricted_api_key/)
  assert.match(calls.emails[0].text, /RESEND_LEAD_CHECK_KEY/)
  assert.match(calls.emails[0].text, /could not confirm/)
  assert.doesNotMatch(JSON.stringify(calls.emails[0]), /send-secret-value|cron-test-secret/)
})

test('lead check failure never throws when the alert email also fails', async () => {
  const { get } = checker({ sendKey: '', listError: { name: 'restricted_api_key' } })
  const res = await get('Bearer cron-test-secret')
  assert.equal(res.status, 500)
  assert.equal(res.data.alerted, false)
})

test('lead check reports alerted false when the alert send returns an error or throws', async () => {
  for (const sendResult of [{ data: null, error: { name: 'rate_limit_exceeded' } }, 'throw']) {
    const { calls, get } = checker({ sendResult, listError: { name: 'restricted_api_key' } })
    const res = await get('Bearer cron-test-secret')
    assert.equal(res.status, 500)
    assert.equal(res.data.alerted, false)
    assert.equal(calls.sendKeys.length, 1)
  }
})

test('lead check never logs or emails a raw error message', async () => {
  const leak = new Error('request failed with key send-secret-value and k and cron-test-secret')
  const { calls, get } = checker({ sendKey: 'send-secret-value', listThrows: leak })
  const res = await get('Bearer cron-test-secret')
  assert.equal(res.status, 500)
  assert.match(calls.emails[0].text, /Unexpected error \(Error\)/)
  assert.doesNotMatch(JSON.stringify([calls.emails, calls.logs]), /send-secret-value|cron-test-secret|request failed/)
})

// --- Phase 1 lead quality: phone check, email check, webhook secret ---

const ownerText = (calls) => calls.emails.find((e) => e.to === 'recipient@example.invalid').text
const hookBody = (calls) => JSON.parse(calls.sms[0].body)

test('a valid phone number is not flagged anywhere', async () => {
  const { calls, post } = handler({ env: hook })
  assert.equal((await post({ ...lead, phone: '314-555-2368' })).status, 200)
  assert.doesNotMatch(ownerText(calls), /Phone check/)
  const sent = hookBody(calls)
  assert.equal(sent.phone_check, 'ok')
  assert.doesNotMatch(JSON.parse(sent.rooflink_job_json).note.message, /Phone check/)
})

test('a phone number that breaks a rule is saved and flagged, never rejected', async () => {
  const cases = [['3145550150', 'fictional'], ['9115552368', 'n11'], ['1115552368', 'area_code'],
    ['3140552368', 'exchange'], ['2222222222', 'repeated'], ['23145552368', 'too_long']]
  for (const [phone, problem] of cases) {
    const { calls, post } = handler({ env: hook })
    const response = await post({ ...lead, phone })
    assert.equal(response.status, 200, problem)
    assert.equal(calls.inserts.length, 1, problem)
    assert.equal(calls.inserts[0][0].phone, phone, problem)
    const reason = contactCheck.PHONE_REASON[problem]
    assert.ok(ownerText(calls).includes(`Phone check: Looks invalid (${reason})`), problem)
    assert.match(calls.emails.find((e) => e.to === 'recipient@example.invalid').subject, /^New Roofing Lead/)
    const sent = hookBody(calls)
    assert.equal(sent.phone_check, 'invalid', problem)
    assert.ok(JSON.parse(sent.rooflink_job_json).note.message.includes(`Phone check: looks invalid (${reason})`), problem)
    assert.ok(!JSON.stringify(calls.logs).includes(phone), problem)
  }
})

test('email domain check result reaches the webhook; ok sends the confirmation', async () => {
  const { calls, post } = handler({ env: hook })
  assert.equal((await post(lead)).status, 200)
  assert.deepEqual(calls.emailChecks, ['customer@example.invalid'])
  assert.doesNotMatch(ownerText(calls), /Email check/)
  assert.equal(calls.emails.filter((e) => e.to === lead.email).length, 1)
  assert.equal(hookBody(calls).email_check, 'ok')
})

test('no mail server: the email is kept, the owner is told, the customer email is skipped', async () => {
  const { calls, post } = handler({ env: hook, emailCheck: 'no_mail_server' })
  assert.equal((await post(lead)).status, 200)
  assert.equal(calls.inserts[0][0].email, lead.email)
  assert.ok(ownerText(calls).includes('Email check: No mail server found for example.invalid'))
  assert.equal(calls.emails.filter((e) => e.to === lead.email).length, 0)
  const sent = hookBody(calls)
  assert.equal(sent.email_check, 'no_mail_server')
  assert.ok(JSON.parse(sent.rooflink_job_json).note.message.includes('Email check: no mail server found for example.invalid'))
  assert.ok(calls.logs.some(([message]) => message === 'CUSTOMER CONFIRMATION SKIPPED'))
  assert.doesNotMatch(JSON.stringify(calls.logs), /customer@example/)
})

test('an unknown or failed email check behaves like ok', async () => {
  for (const options of [{ emailCheck: 'unknown' }, { emailCheckThrows: true }]) {
    const { calls, post } = handler({ env: hook, ...options })
    assert.equal((await post(lead)).status, 200)
    assert.equal(calls.emails.filter((e) => e.to === lead.email).length, 1)
    assert.doesNotMatch(ownerText(calls), /Email check/)
    assert.equal(hookBody(calls).email_check, 'unknown')
  }
})

test('no email or a malformed email means email_check none and no DNS lookup', async () => {
  for (const email of ['', 'not-an-email']) {
    const { calls, post } = handler({ env: hook })
    assert.equal((await post({ ...lead, email })).status, 200)
    assert.equal(calls.emailChecks.length, 0)
    assert.equal(hookBody(calls).email_check, 'none')
  }
})

test('the email check runs alongside the save', async () => {
  const ok = handler({ emailCheckDelayMs: 30 })
  assert.equal((await ok.post(lead)).status, 200)
  assert.equal(ok.calls.insertSawPendingCheck, true)
  const failed = handler({ emailCheckDelayMs: 30, insertError: { code: 'X' } })
  assert.equal((await failed.post(lead)).status, 500)
  assert.equal(failed.calls.emails.length, 0)
})

test('X-Webhook-Secret is sent only when LEAD_WEBHOOK_SECRET is set and is never logged', async () => {
  const withSecret = handler({ env: { ...hook, LEAD_WEBHOOK_SECRET: 'test-hook-secret' } })
  const response = await withSecret.post(lead)
  assert.equal(withSecret.calls.sms[0].headers['X-Webhook-Secret'], 'test-hook-secret')
  assert.equal(withSecret.calls.sms[0].headers['Content-Type'], 'application/json')
  assert.doesNotMatch(JSON.stringify([withSecret.calls.logs, response, withSecret.calls.sms[0].body]), /test-hook-secret/)
  const trimmed = handler({ env: { ...hook, LEAD_WEBHOOK_SECRET: '  test-hook-secret\n' } })
  await trimmed.post(lead)
  assert.equal(trimmed.calls.sms[0].headers['X-Webhook-Secret'], 'test-hook-secret')
  for (const env of [{ ...hook, LEAD_WEBHOOK_SECRET: '' }, hook]) {
    const none = handler({ env })
    await none.post(lead)
    assert.ok(!('X-Webhook-Secret' in none.calls.sms[0].headers))
  }
})

test('the lead route runs on the Node.js runtime and starts the email check before the save', () => {
  const route = fs.readFileSync('src/app/api/lead/route.ts', 'utf8')
  assert.match(route, /export const runtime = 'nodejs'/)
  assert.ok(route.indexOf('checkEmailDomain(') < route.indexOf(".from('leads').insert"))
  assert.ok(route.indexOf(".from('leads').insert") < route.indexOf('await emailCheckPending'))
})

test('the browser form keeps native checks for no-JS and links inline errors', () => {
  const form = fs.readFileSync('src/components/lead-form.tsx', 'utf8')
  for (const piece of ['name="name" required', 'name="phone" required', 'name="email" required type="email"', '(?:\\D*\\d){10,}\\D*', 'noValidate={hydrated}',
    'aria-invalid=', 'aria-describedby=', 'from "@/lib/contact-check"', 'name="company" tabIndex={-1}', 'form_ms: shownAt.current']) {
    assert.ok(form.includes(piece), piece)
  }
})

// --- Owner decisions Nov 9 2026: combined follow-up email (FUP-01), lead-source fields (ATT-01), email required in the browser ---
const VIDEO = 'https://video.example.invalid/hello'
const mo = { name: 'Pat Q', phone: '3145552368', email: 'pat@example.invalid', city: 'Kirkwood', service_type: 'Roof Replacement', issue_type: 'leak' }
const toCustomer = (calls) => calls.emails.filter((e) => e.to === 'pat@example.invalid')
const toOwner = (calls) => calls.emails.filter((e) => e.to === 'recipient@example.invalid')

test('combined follow-up email through the route: all sections, no video, owner email unchanged', async () => {
  const { calls, post } = handler()
  assert.equal((await post(mo)).status, 200)
  const [customer] = toCustomer(calls)
  assert.equal(customer.subject, 'We got your request - RoofingnearmeSTL')
  assert.equal(customer.replyTo, 'recipient@example.invalid')
  for (const piece of [/Hi Pat,/, /during business hours, we call as soon as your request comes in/, /whoever makes decisions about the home/,
    /Free Photo-Documented Roof Report/, /Photos of the problem area/, /gate code, pets/, /Need us sooner\? Call 314-202-7663/]) assert.match(customer.text, piece)
  assert.doesNotMatch(customer.text + customer.html, /video/i)
  const [owner] = toOwner(calls)
  assert.equal(owner.subject, 'New Roofing Lead: Kirkwood - Roof Replacement - leak')
  assert.doesNotMatch(owner.text, /video|gate code|Help us get ready/i)
})

test('INTRO_VIDEO_URL adds a link and button for the customer only', async () => {
  const { calls, post } = handler({ env: { INTRO_VIDEO_URL: VIDEO } })
  await post(mo)
  const [customer] = toCustomer(calls)
  assert.match(customer.text, /https:\/\/video\.example\.invalid\/hello/)
  assert.match(customer.html, /href="https:\/\/video\.example\.invalid\/hello"/)
  assert.doesNotMatch(toOwner(calls)[0].text + toOwner(calls)[0].html, /video/i)
})

for (const bad of ['http://video.example.invalid/hello', 'javascript:alert(1)']) {
  test(`a non-https INTRO_VIDEO_URL (${bad.slice(0, 10)}) is ignored and logged without its value`, async () => {
    const { calls, post } = handler({ env: { INTRO_VIDEO_URL: bad } })
    assert.equal((await post(mo)).status, 200)
    const [customer] = toCustomer(calls)
    assert.doesNotMatch(customer.text + customer.html, /video|alert/i)
    assert.match(JSON.stringify(calls.logs), /INTRO_VIDEO_URL IGNORED: must be an https:\/\/ link/)
    assert.doesNotMatch(JSON.stringify(calls.logs), /video\.example|alert\(1\)/)
  })
}

test('with INTRO_VIDEO_URL set, bots, undeliverable emails and a missing owner inbox still get no customer email', async () => {
  const env = { INTRO_VIDEO_URL: VIDEO }
  const bot = handler({ env, bot: { isBot: true, isVerifiedBot: false } })
  await bot.post(mo)
  assert.equal(toCustomer(bot.calls).length, 0)
  const noMail = handler({ env, emailCheck: 'no_mail_server' })
  await noMail.post(mo)
  assert.equal(toCustomer(noMail.calls).length, 0)
  const noOwner = handler({ env: { ...env, LEAD_TO_EMAIL: '' } })
  await noOwner.post(mo)
  assert.equal(noOwner.calls.emails.length, 0)
})

test('Illinois emails with a video keep the Illinois rules', async () => {
  const env = { INTRO_VIDEO_URL: VIDEO }
  const ext = handler({ env })
  await ext.post({ ...mo, city: 'Waterloo, IL', service_type: 'Siding' })
  const body = toCustomer(ext.calls)[0].text.split('\n\n').slice(0, -1).join('\n\n').replace(/RoofingnearmeSTL|Roofing Near Me STL LLC/g, '')
  assert.doesNotMatch(body, /roof/i)
  assert.match(toCustomer(ext.calls)[0].text, /hello video/)
  const pending = handler({ env })
  await pending.post({ ...mo, city: 'Waterloo, IL', service_type: 'Roof Repair' })
  const text = toCustomer(pending.calls)[0].text
  assert.match(text, /Roofing in Illinois is pending our Illinois roofing license/)
  assert.doesNotMatch(text, /Roof Report|24\/7|tarp/i)
})

test('the customer html escapes the name', async () => {
  const { calls, post } = handler()
  await post({ ...mo, name: '<Customer>' })
  assert.match(toCustomer(calls)[0].html, /Hi &lt;Customer&gt;,/)
})

test('a lead with no email (old cached page or no JavaScript) is still saved', async () => {
  const { calls, post } = handler({ env: hook })
  const noEmail = { ...mo }
  delete noEmail.email
  const response = await post(noEmail)
  assert.equal(response.status, 200)
  assert.equal(calls.inserts.length, 1)
  assert.equal(calls.inserts[0][0].email, null)
  assert.equal(calls.emailChecks.length, 0)
  assert.equal(JSON.parse(calls.sms[0].body).email_check, 'none')
  assert.equal(toOwner(calls).length, 1)
  assert.equal(calls.emails.length, 1)
})

test('gbraid, wbraid and referrer are stored, clipped and labelled', async () => {
  const { calls, post } = handler({ env: hook })
  await post({ ...mo, gbraid: 'g'.repeat(400), wbraid: 'w'.repeat(400), referrer: 'r'.repeat(600) })
  const row = calls.inserts[0][0]
  assert.equal(row.gbraid.length, 300)
  assert.equal(row.wbraid.length, 300)
  assert.equal(row.referrer.length, 500)
  assert.match(toOwner(calls)[0].text, /Source: Google Ads click/)
  assert.equal(JSON.parse(calls.sms[0].body).gbraid.length, 300)
})

test('the new tracking keys are absent from the row when not sent', async () => {
  const { calls, post } = handler()
  await post({ ...mo, gbraid: '', wbraid: '  ' })
  const row = calls.inserts[0][0]
  for (const key of ['gbraid', 'wbraid', 'referrer']) assert.equal(key in row, false)
})

for (const key of ['gbraid', 'wbraid']) {
  test(`only a ${key} counts as a Google Ads click, and UTM tags still win`, async () => {
    const one = handler()
    await one.post({ ...mo, [key]: 'abc' })
    assert.match(toOwner(one.calls)[0].text, /Source: Google Ads click/)
    const tagged = handler()
    await tagged.post({ ...mo, [key]: 'abc', utm_source: 'google', utm_medium: 'cpc' })
    assert.match(toOwner(tagged.calls)[0].text, /Source: google \/ cpc/)
  })
}

test('PGRST204 with tracking fields retries once without them and still emails everyone', async () => {
  const { calls, post } = handler({ insertErrors: [{ code: 'PGRST204', message: 'private schema details' }] })
  const response = await post({ ...mo, gbraid: 'gb-1', referrer: 'https://www.google.com/' })
  assert.equal(response.status, 200)
  assert.equal(calls.inserts.length, 2)
  const second = calls.inserts[1][0]
  for (const key of ['gbraid', 'wbraid', 'referrer']) assert.equal(key in second, false)
  assert.equal(second.name, 'Pat Q')
  assert.equal(second.phone, '3145552368')
  assert.equal(second.email, 'pat@example.invalid')
  assert.equal(toOwner(calls).length, 1)
  assert.equal(toCustomer(calls).length, 1)
  assert.match(JSON.stringify(calls.logs), /SUPABASE INSERT RETRY WITHOUT gbraid\/wbraid\/referrer/)
  assert.doesNotMatch(JSON.stringify(calls.logs), /private schema details/)
})

test('PGRST204 on both tries returns 500 and sends nothing', async () => {
  const { calls, post } = handler({ insertError: { code: 'PGRST204', message: 'x' } })
  assert.equal((await post({ ...mo, gbraid: 'gb-1' })).status, 500)
  assert.equal(calls.inserts.length, 2)
  assert.equal(calls.emails.length, 0)
})

test('another insert error is not retried', async () => {
  const { calls, post } = handler({ insertError: { code: '23502', message: 'x' } })
  assert.equal((await post({ ...mo, gbraid: 'gb-1' })).status, 500)
  assert.equal(calls.inserts.length, 1)
  assert.equal(calls.emails.length, 0)
})

test('the form payload carries gbraid, wbraid and referrer', () => {
  const leadForm = fs.readFileSync('src/components/lead-form.tsx', 'utf8')
  const start = leadForm.indexOf('    const payload = {')
  const payloadSource = leadForm.slice(start, leadForm.indexOf('\n    try {', start))
  const compiled = ts.transpileModule(`${payloadSource}\nexports.payload = payload`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}
  vm.runInNewContext(compiled, { exports, fd: new Map(Object.entries({ name: 'Pat', phone: '3145552368', email: 'pat@example.invalid' })),
    extras: {}, utm: { gbraid: 'gb-1', wbraid: 'wb-1', referrer: 'https://www.google.com/' }, shownAt: { current: 0 }, Date })
  assert.equal(exports.payload.gbraid, 'gb-1')
  assert.equal(exports.payload.wbraid, 'wb-1')
  assert.equal(exports.payload.referrer, 'https://www.google.com/')
  assert.match(leadForm, /SOURCE_PARAMS = \[[^\]]*"gbraid", "wbraid"/)
  assert.match(leadForm, /slice\(0, 500\)/)
})

test('the email field sits in the main fields, not the closed details panel', () => {
  const leadForm = fs.readFileSync('src/components/lead-form.tsx', 'utf8')
  assert.ok(leadForm.indexOf('name="email"') > 0 && leadForm.indexOf('name="email"') < leadForm.indexOf('<details'))
  assert.doesNotMatch(leadForm, /details\.open = true/)
})
