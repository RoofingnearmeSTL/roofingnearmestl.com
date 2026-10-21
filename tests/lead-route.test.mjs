import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = ts.transpileModule(fs.readFileSync('src/app/api/lead/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function handler({ insertError = null, emailError = null, env = {}, smsStatus = 201 } = {}) {
  const calls = { inserts: [], emails: [], logs: [], sms: [] }
  const environment = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'test-server-key',
    RESEND_API_KEY: 'test-email-key',
    LEAD_TO_EMAIL: 'recipient@example.invalid',
    ...env,
  }
  const exports = {}
  vm.runInNewContext(source, {
    exports, process: { env: environment }, btoa, URLSearchParams, AbortSignal, Date,
    fetch: async (url, options) => { calls.sms.push({ url, ...options }); return { ok: smsStatus < 400, status: smsStatus } },
    console: Object.fromEntries(['log', 'error'].map(level => [level, (...args) => calls.logs.push(args)])),
    require(name) {
      if (name === 'next/server') return { NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) } }
      if (name === '@supabase/supabase-js') return { createClient(url, key, options) {
        calls.client = { url, key, options }
        return { from(table) { calls.table = table; return { insert(rows) {
          calls.inserts.push(rows)
          const result = { data: null, error: insertError }
          return Object.assign(Promise.resolve(result), { select: async () => result })
        } } } }
      } }
      if (name === 'resend') return { Resend: class {
        constructor(key) { calls.emailKey = key }
        emails = { send: async (payload) => {
          calls.emails.push(payload)
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
  assert.equal(calls.emails.length, 0)
  assert.doesNotMatch(JSON.stringify([response, calls.logs]), /private schema details/)
})

test('email failure does not fail a saved lead', async () => {
  const { calls, post } = handler({ emailError: { name: 'validation_error', message: 'private details' } })
  assert.equal((await post(lead)).status, 200)
  assert.equal(calls.inserts.length, 1)
  assert.equal(calls.emails.length, 1)
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
    vm.runInNewContext(compiled, { exports, fd: form, extras, utm: {} })
    const payload = exports.payload
    assert.equal(payload.roof_material, label)
    assert.equal(payload.roof_age, '15-20 years')
    assert.equal(payload.emergency, true)
    assert.equal(payload.roof_size, '18 SQ (~1,800 sq ft)')
    assert.equal(payload.roof_pitch, 'Medium Pitch (5/12 - 7/12)')
    assert.equal(payload.est_price, null) // custom quote: no price
    assert.equal(payload.est_price_low, null)
    assert.match(estimator, /estimatorExtras\(\{ squares, shingle, pitch, place, state \}\)/)
    assert.match(page, /<RoofEstimator onChange=\{setEstimateExtras\} \/>/)
    assert.match(page, /<LeadForm extras=\{estimateExtras\}/)
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
  assert.equal(calls.emails.length, 1)
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
  const response = await post({ ...lead, name: 'Pat Q Customer', est_location: 'Waterloo, IL', est_price: null, utm_source: 'google', utm_medium: 'cpc' })
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
  assert.equal(sent.state, 'IL')
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
  assert.equal(job.state, 'IL')
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
  assert.ok(calls.emails[1].text.includes('Source: Direct or unknown'))
})
