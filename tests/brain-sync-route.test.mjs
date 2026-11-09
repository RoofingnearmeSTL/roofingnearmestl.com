import test from 'node:test'
import assert from 'node:assert/strict'
import { loadTs } from './helpers/load-ts.mjs'

function load({ client = {}, result = { ok: true, status: 200, partial: false, commit: 'abc1234', counts: { notes_total: 3 }, skipped: 0, runId: 1 }, throwIt = false, env = {} } = {}) {
  const seen = { args: null, logs: [], errors: [] }
  const mocks = {
    'next/server': { NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) } },
    '@/lib/data-store/server-client': { serverSupabase: () => client },
    '@/lib/data-store/brain-store': { createSupabaseBrainStore: () => ({ fake: 'store' }) },
    '@/lib/brain/sync': { runBrainSync: async (a) => { seen.args = a; if (throwIt) throw new Error('boom with secret-detail'); return result } },
  }
  const mod = loadTs('src/app/api/sync/brain/route.ts', { mocks, env: { CRON_SECRET: 'cron-test-secret', ...env } })
  const origLog = console.log, origErr = console.error
  const call = async (req) => {
    console.log = (...a) => seen.logs.push(a); console.error = (...a) => seen.errors.push(a)
    try { return await mod.GET(req) } finally { console.log = origLog; console.error = origErr }
  }
  return { call, seen, mod }
}
const req = (headers = { authorization: 'Bearer cron-test-secret' }, qs = '') => ({
  url: `https://example.invalid/api/sync/brain${qs}`,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
})

test('no CRON_SECRET is 503 and a wrong bearer is 401', async () => {
  const { call } = load({ env: { CRON_SECRET: '' } })
  assert.equal((await call(req())).status, 503)
  const t = load()
  assert.equal((await t.call(req({ authorization: 'Bearer nope' }))).status, 401)
  assert.equal((await t.call(req({}))).status, 401)
})

test('no database client is 503 supabase_missing', async () => {
  const { call } = load({ client: null })
  const r = await call(req())
  assert.equal(r.status, 503)
  assert.deepEqual(r.data, { ok: false, setup: 'supabase_missing' })
})

test('trigger comes from the user agent; full and allow_large_delete pass through', async () => {
  const t = load()
  await t.call(req({ authorization: 'Bearer cron-test-secret', 'user-agent': 'vercel-cron/1.0' }))
  assert.equal(t.seen.args.trigger, 'cron')
  assert.equal(t.seen.args.full, false)
  await t.call(req({ authorization: 'Bearer cron-test-secret', 'user-agent': 'curl/8' }, '?full=1&allow_large_delete=1'))
  assert.equal(t.seen.args.trigger, 'manual')
  assert.equal(t.seen.args.full, true)
  assert.equal(t.seen.args.allowLargeDelete, true)
})

test('results map to the contract statuses', async () => {
  const ok = await load().call(req())
  assert.equal(ok.status, 200)
  assert.deepEqual(ok.data, { ok: true, partial: false, commit: 'abc1234', counts: { notes_total: 3 }, skipped: 0 })
  const tables = await load({ result: { ok: false, status: 503, setup: 'tables_missing', runId: null } }).call(req())
  assert.equal(tables.status, 503)
  assert.equal(tables.data.setup, 'tables_missing')
  assert.match(tables.data.hint, /20261109120000_data_store_dashboard_v1\.sql/)
  for (const setup of ['token_missing', 'repo_invalid']) {
    const r = await load({ result: { ok: false, status: 503, setup, runId: 1 } }).call(req())
    assert.deepEqual([r.status, r.data], [503, { ok: false, setup }])
  }
  const fail = load({ result: { ok: false, status: 500, error: 'GitHub answered 500.', runId: 1 } })
  const f = await fail.call(req())
  assert.deepEqual([f.status, f.data], [500, { ok: false, error: 'GitHub answered 500.' }])
})

test('a thrown error is a generic 500 and logs carry no message', async () => {
  const t = load({ throwIt: true })
  const r = await t.call(req())
  assert.deepEqual([r.status, r.data], [500, { ok: false, error: 'Unexpected error' }])
  assert.ok(!JSON.stringify([t.seen.logs, t.seen.errors, r]).includes('secret-detail'))
})
