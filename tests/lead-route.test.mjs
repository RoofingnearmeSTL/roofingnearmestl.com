import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = ts.transpileModule(fs.readFileSync('src/app/api/lead/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function handler({ insertError = null, emailError = null, env = {} } = {}) {
  const calls = { inserts: [], emails: [], logs: [] }
  const environment = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'test-server-key',
    RESEND_API_KEY: 'test-email-key',
    LEAD_TO_EMAIL: 'recipient@example.invalid',
    ...env,
  }
  const exports = {}
  vm.runInNewContext(source, {
    exports, process: { env: environment },
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
  assert.deepEqual(JSON.parse(JSON.stringify(calls.inserts)), [[lead]])
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

for (const [material, label] of [['clay', 'Clay Tile'], ['slate', 'Slate Tile']]) {
  test(`${label} form payload persists age/emergency and emails every roofing detail`, async () => {
    const page = fs.readFileSync('src/app/page.tsx', 'utf8')
    const payloadSource = page.slice(page.indexOf('    const payload = {'), page.indexOf('\n    try {', page.indexOf('    const payload = {')))
    const compiled = ts.transpileModule(`${payloadSource}\nexports.payload = payload`, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText
    const form = new Map(Object.entries({ name: 'Tile Customer', phone: '3145550100', email: 'customer@example.invalid',
      address: '123 Example St', city: 'St Louis', service: 'Roof Repair', issue_type: 'Active leak',
      roof_age: '15-20 years', emergency: 'on', details: '<Leak>\nPlease tarp' }))
    const exports = {}
    vm.runInNewContext(compiled, { exports, fd: form, est: { size: '1800', pitch: 'medium', material, email: '' },
      utm: {}, price: 9800 })
    const payload = exports.payload
    assert.equal(payload.roof_material, label)
    assert.equal(payload.roof_age, '15-20 years')
    assert.equal(payload.emergency, true)
    assert.equal(payload.roof_size, '~1,800 sqft')
    assert.equal(payload.roof_pitch, 'Medium Pitch')
    assert.match(page, new RegExp(`<option value="${material}">${label}</option>`))
    assert.match(page, /name="roof_age"/)
    assert.match(page, /name="emergency" type="checkbox"/)
    const { calls, post } = handler()
    assert.equal((await post(payload)).status, 200)
    const row = calls.inserts[0][0]
    assert.deepEqual(Object.keys(row), ['name', 'phone', 'email', 'address', 'city', 'service_type', 'issue_type', 'roof_age', 'roof_size', 'roof_pitch', 'roof_material', 'emergency', 'message'])
    for (const key of Object.keys(row)) assert.equal(row[key], payload[key])
    const email = calls.emails[0]
    assert.equal(email.subject, 'New Roofing Lead: St Louis - Roof Repair - Active leak')
    for (const line of ['Name: Tile Customer', 'Phone: 3145550100', 'Email: customer@example.invalid',
      'Address: 123 Example St, St Louis', 'Service: Roof Repair', 'Issue: Active leak',
      'Age of Roof: 15-20 years', 'Emergency Tarp Needed: YES - Emergency',
      'Roof Size: ~1,800 sqft', 'Pitch: Medium Pitch', `Material: ${label}`, 'Message: <Leak>\nPlease tarp']) {
      assert.ok(email.text.includes(line), line)
    }
    assert.match(email.html, /&lt;Leak&gt;<br>Please tarp/)
    for (const value of ['15-20 years', 'YES - Emergency', '~1,800 sqft', 'Medium Pitch', label]) assert.ok(email.html.includes(value))
  })
}

test('unchecked emergency is No and numeric roofing details remain visible', async () => {
  const { calls, post } = handler()
  await post({ ...lead, emergency: false, roof_age: 0, roof_size: 1800 })
  assert.match(calls.emails[0].text, /Emergency Tarp Needed: No/)
  assert.match(calls.emails[0].text, /Age of Roof: 0/)
  assert.match(calls.emails[0].text, /Roof Size: 1800/)
})
