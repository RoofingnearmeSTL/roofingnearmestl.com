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

const source = ts.transpileModule(fs.readFileSync('src/app/api/lead/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function handler({ insertError = null, emailError = null, emailErrorsFirst = 0, env = {}, smsStatus = 201, bot = { isBot: false }, botThrows = false } = {}) {
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
    exports, process: { env: environment }, btoa, URLSearchParams, AbortSignal, Date, setTimeout: (fn) => setTimeout(fn, 0),
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
      if (name.endsWith('illinois-guard')) return guard
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
