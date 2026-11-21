import test from 'node:test'
import assert from 'node:assert/strict'
import { loadTs } from './helpers/load-ts.mjs'

// Unit tests for the remote MCP endpoint. No real network or Supabase: next/server and the server client are mocked,
// and the Supabase client is a chainable recorder that returns whatever each test sets up.

// A chainable, awaitable Supabase query mock. `resolve(ops)` returns { data, error, count } from the recorded ops.
function mockClient(resolve, seen = []) {
  const make = (table) => {
    const ops = { table, select: null, filters: [], order: null, limit: null, textSearch: null, single: false, head: false, count: null }
    seen.push(ops)
    const builder = {
      select(cols, opt) { ops.select = cols; if (opt) { ops.head = !!opt.head; ops.count = opt.count ?? null }; return builder },
      eq(col, val) { ops.filters.push(['eq', col, val]); return builder },
      gte(col, val) { ops.filters.push(['gte', col, val]); return builder },
      order(col, o) { ops.order = [col, o]; return builder },
      limit(n) { ops.limit = n; return builder },
      textSearch(col, q, o) { ops.textSearch = [col, q, o]; return builder },
      maybeSingle() { ops.single = true; return Promise.resolve(resolve(ops)) },
      then(res, rej) { return Promise.resolve(resolve(ops)).then(res, rej) },
    }
    return builder
  }
  return { client: { from: (table) => make(table) }, seen }
}

function load({ token = 'secret-token', client = null } = {}) {
  const mocks = {
    'next/server': { NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200, headers: options?.headers }) } },
    '@/lib/data-store/server-client': { serverSupabase: () => client },
  }
  const origErr = console.error
  const mod = loadTs('src/app/api/mcp/route.ts', { mocks, env: { MCP_AUTH_TOKEN: token } })
  const call = async (req) => {
    console.error = () => {}
    try { return await mod.POST(req) } finally { console.error = origErr }
  }
  return { mod, call }
}

const req = (body, headers = { authorization: 'Bearer secret-token' }) => ({
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  json: async () => body,
})

test('401 when the bearer token is missing or wrong', async () => {
  const { call } = load()
  assert.equal((await call(req({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, {}))).status, 401)
  assert.equal((await call(req({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { authorization: 'Bearer nope' }))).status, 401)
  assert.equal((await call(req({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { authorization: 'secret-token' }))).status, 401)
})

test('an unset MCP_AUTH_TOKEN denies every request (never open by default)', async () => {
  for (const token of ['', undefined]) {
    const { call } = load({ token })
    const r = await call(req({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { authorization: 'Bearer anything' }))
    assert.equal(r.status, 401)
  }
})

test('the 401 body is a JSON-RPC error and never echoes the token', async () => {
  const { call } = load()
  const r = await call(req({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { authorization: 'Bearer wrong' }))
  assert.equal(r.status, 401)
  assert.equal(r.data.error.code, -32001)
  assert.ok(!JSON.stringify(r).includes('secret-token'))
})

test('initialize returns protocol 2024-11-05, serverInfo and tools capability', async () => {
  const { call } = load()
  const r = await call(req({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }))
  assert.equal(r.status, 200)
  assert.equal(r.data.result.protocolVersion, '2024-11-05')
  assert.ok(r.data.result.serverInfo.name)
  assert.deepEqual(r.data.result.capabilities, { tools: {} })
})

test('tools/list returns all eight read-only tools with schemas', async () => {
  const { call } = load()
  const r = await call(req({ jsonrpc: '2.0', id: 2, method: 'tools/list' }))
  assert.equal(r.status, 200)
  const names = r.data.result.tools.map((t) => t.name)
  assert.deepEqual(
    [...names].sort(),
    ['brain_note', 'brain_recent', 'brain_search', 'business_snapshot', 'competitor_intel', 'leads_recent', 'metrics', 'recommendations_list'],
  )
  for (const t of r.data.result.tools) {
    assert.equal(typeof t.description, 'string')
    assert.equal(t.inputSchema.type, 'object')
  }
})

test('tools/call dispatches brain_search and shapes a text result from the mocked store', async () => {
  const { client, seen } = mockClient((ops) => {
    if (ops.table === 'brain_notes') {
      return { data: [{ path: 'docs/memory/decisions.md', title: 'Decisions', folder: 'docs/memory', body: 'Warranty is 10 years.', changed_at: '2026-11-10T00:00:00Z' }], error: null }
    }
    return { data: [], error: null }
  })
  const { call } = load({ client })
  const r = await call(req({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'brain_search', arguments: { query: 'warranty', limit: 3 } } }))
  assert.equal(r.status, 200)
  const content = r.data.result.content
  assert.equal(content[0].type, 'text')
  const payload = JSON.parse(content[0].text)
  assert.equal(payload.query, 'warranty')
  assert.equal(payload.results[0].path, 'docs/memory/decisions.md')
  assert.equal(payload.results[0].folder, 'docs/memory')
  // Confirms the query actually hit the store via full-text search with the limit applied.
  const notesOp = seen.find((o) => o.table === 'brain_notes')
  assert.equal(notesOp.textSearch[0], 'search')
  assert.equal(notesOp.textSearch[2].type, 'websearch')
  assert.equal(notesOp.limit, 3)
})

test('tools/call shapes leads_recent rows and only selects allow-listed columns', async () => {
  const { client, seen } = mockClient((ops) => {
    if (ops.table === 'leads') {
      return { data: [{ created_at: '2026-11-19T12:00:00Z', status: 'new', name: 'Pat', phone: '3145551212', city: 'Kirkwood', service_type: 'roof replacement', emergency: false }], error: null }
    }
    return { data: [], error: null }
  })
  const { call } = load({ client })
  const r = await call(req({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'leads_recent', arguments: { days: 7, limit: 10 } } }))
  const payload = JSON.parse(r.data.result.content[0].text)
  assert.equal(payload.count, 1)
  assert.equal(payload.leads[0].name, 'Pat')
  assert.equal(payload.leads[0].source, null)
  const leadsOp = seen.find((o) => o.table === 'leads')
  assert.ok(!leadsOp.select.includes('*'))
  assert.ok(!/gclid|fbclid|gbraid|wbraid|landing_page|page_url/.test(leadsOp.select))
})

test('business_snapshot summarises counts and the latest run', async () => {
  const { client } = mockClient((ops) => {
    if (ops.table === 'recommendations') return { data: null, error: null, count: 4 }
    if (ops.table === 'leads') return { data: null, error: null, count: 9 }
    if (ops.table === 'competitor_changes') return { data: [{ scan_date: '2026-11-15' }], error: null }
    if (ops.table === 'sync_runs') return { data: [{ kind: 'brain', started_at: '2026-11-20T11:00:00Z', finished_at: '2026-11-20T11:01:00Z', ok: true, partial: false }], error: null }
    return { data: [], error: null }
  })
  const { call } = load({ client })
  const r = await call(req({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'business_snapshot' } }))
  const payload = JSON.parse(r.data.result.content[0].text)
  assert.equal(payload.open_recommendations, 4)
  assert.equal(payload.leads_last_14_days, 9)
  assert.equal(payload.latest_competitor_scan, '2026-11-15')
  assert.equal(payload.latest_sync_run.state, 'ok')
})

test('an unknown tool is a JSON-RPC -32602 error', async () => {
  const { client } = mockClient(() => ({ data: [], error: null }))
  const { call } = load({ client })
  const r = await call(req({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'drop_table', arguments: {} } }))
  assert.equal(r.data.error.code, -32602)
})

test('no Supabase client yields a clear "not set up" tool result, not a crash', async () => {
  const { call } = load({ client: null })
  const r = await call(req({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'brain_recent', arguments: {} } }))
  assert.equal(r.status, 200)
  const payload = JSON.parse(r.data.result.content[0].text)
  assert.equal(payload.error, 'not_set_up')
  assert.equal(r.data.result.isError, true)
})

test('a missing table becomes a tool result, not a protocol error', async () => {
  const { client } = mockClient(() => ({ data: null, error: { code: 'PGRST205' } }))
  const { call } = load({ client })
  const r = await call(req({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'competitor_intel', arguments: {} } }))
  const payload = JSON.parse(r.data.result.content[0].text)
  assert.equal(payload.error, 'tables_not_set_up')
  assert.match(payload.hint, /20261109120000_data_store_dashboard_v1\.sql/)
})

test('an unknown method returns -32601', async () => {
  const { call } = load()
  const r = await call(req({ jsonrpc: '2.0', id: 9, method: 'resources/list' }))
  assert.equal(r.data.error.code, -32601)
})

test('a notification (no id) gets 202 and no body', async () => {
  const { call } = load()
  const r = await call(req({ jsonrpc: '2.0', method: 'notifications/initialized' }))
  assert.equal(r.status, 202)
})

test('GET is 405 with an Allow header', async () => {
  const { mod } = load()
  const r = mod.GET()
  assert.equal(r.status, 405)
  assert.equal(r.headers.Allow, 'POST')
})
