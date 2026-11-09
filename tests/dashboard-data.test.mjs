import test from 'node:test'
import assert from 'node:assert/strict'
import { loadTs } from './helpers/load-ts.mjs'

const mod = () => loadTs('src/lib/dashboard/data.ts', { mocks: { 'server-only': {} } })
const D = mod()

// Recording fake: script(rec) returns {data,error,count} per query.
function fake(script) {
  const calls = []
  return {
    calls,
    from(table) {
      const rec = { table, select: null, filters: [], count: null }
      calls.push(rec)
      const b = new Proxy({}, {
        get(_, name) {
          if (name === 'then') return (res, rej) => Promise.resolve(script(rec) ?? { data: [], error: null }).then(res, rej)
          return (...args) => {
            if (name === 'select') { rec.select = args[0]; rec.count = args[1] ?? null } else rec.filters.push([name, ...args])
            return b
          }
        },
      })
      return b
    },
  }
}

const NOW = new Date('2026-11-09T15:00:00Z')
const CLICK = 'CLICKID-SENTINEL-999'
const leadRows = [
  { created_at: '2026-11-09T05:30:00Z', status: 'new', utm_source: null, utm_medium: null, gclid: null, fbclid: null }, // yesterday (Chicago)
  { created_at: '2026-11-09T06:30:00Z', status: 'new', utm_source: 'google', utm_medium: 'cpc', gclid: CLICK, fbclid: null },
  { created_at: '2026-11-05T12:00:00Z', status: 'new', utm_source: null, utm_medium: null, gclid: null, gbraid: CLICK, fbclid: null },
  { created_at: '2026-11-04T12:00:00Z', status: 'suspected_bot', utm_source: null, gclid: null, fbclid: CLICK },
  { created_at: '2026-11-08T12:00:00Z', status: 'test', utm_source: 'x', gclid: null, fbclid: null },
  { created_at: '2026-10-20T12:00:00Z', status: 'il_license_pending', utm_source: null, gclid: null, fbclid: null },
]

test('lead counts use the Chicago day, exclude test, and keep source buckets only', async () => {
  const db = fake((rec) => rec.select === 'created_at,status' ? { data: [{ created_at: '2026-11-09T06:30:00Z', status: 'new' }], error: null } : { data: leadRows, error: null })
  const r = await D.getLeadSummary(db, NOW)
  assert.equal(r.state, 'ok')
  assert.equal(r.today, 1)
  assert.equal(r.last7, 4)
  assert.equal(r.last30, 5)
  assert.equal(r.byStatus.test, 1)
  const labels = r.bySource.map((s) => s.label)
  assert.ok(labels.includes('google / cpc') && labels.includes('Google Ads click') && labels.includes('Facebook / Instagram click') && labels.includes('Direct or unknown'))
  assert.doesNotMatch(JSON.stringify(r), /CLICKID-SENTINEL/)
  assert.equal(r.capped, false)
})

test('a missing gbraid/wbraid column is retried without them', async () => {
  let n = 0
  const db = fake((rec) => {
    if (rec.table === 'leads' && rec.select !== 'created_at,status') { n++; if (n === 1) return { data: null, error: { code: '42703' } } }
    return { data: [], error: null }
  })
  const r = await D.getLeadSummary(db, NOW)
  assert.equal(r.state, 'ok')
  assert.match(db.calls[0].select, /gbraid/)
  assert.doesNotMatch(db.calls[1].select, /gbraid/)
})

test('5000 rows set the capped flag', async () => {
  const rows = Array.from({ length: 5000 }, () => ({ created_at: '2026-11-09T12:00:00Z', status: 'new' }))
  const r = await D.getLeadSummary(fake(() => ({ data: rows, error: null })), NOW)
  assert.equal(r.capped, true)
})

test('no query ever selects personal columns or *', async () => {
  const db = fake((rec) => {
    if (rec.table === 'brain_notes' && rec.count) return { count: 3, data: null, error: null }
    if (rec.table === 'brain_notes' && rec.select.includes('body')) return { data: [{ path: 'a.md', title: 'A', folder: '', changed_at: null, body: 'hello world' }], error: null }
    if (rec.table === 'brain_notes' && rec.select.includes('truncated')) return { data: { path: 'a.md', title: 'A', body: 'x', truncated: false }, error: null }
    return { data: [], error: null }
  })
  await D.getLeadSummary(db, NOW)
  await D.getCompetitors(db)
  await D.getBrainSummary(db, NOW)
  await D.searchNotes(db, 'roof')
  await D.getNote(db, 'docs/a.md')
  await D.getGraph(db)
  const leadSelects = db.calls.filter((c) => c.table === 'leads').map((c) => c.select).join(',')
  assert.doesNotMatch(leadSelects, /\b(name|phone|email|address|city|message|landing_page|page_url|referrer|utm_term|utm_content|utm_campaign)\b/)
  for (const c of db.calls) assert.notEqual(c.select, '*')
  assert.ok(db.calls.length > 8)
})

test('a missing database client means not set up for every function', async () => {
  for (const r of [await D.getLeadSummary(null, NOW), await D.getCompetitors(null), await D.getBrainSummary(null), await D.searchNotes(null, 'x'), await D.getNote(null, 'a.md'), await D.getGraph(null)]) {
    assert.deepEqual([r.state, r.reason], ['not_set_up', 'supabase'])
  }
})

test('missing key never creates a client', () => {
  let created = 0
  const { serverSupabase } = loadTs('src/lib/data-store/server-client.ts', { mocks: { 'server-only': {}, '@supabase/supabase-js': { createClient: () => { created++; return {} } } } })
  assert.equal(serverSupabase({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.invalid', SUPABASE_SERVICE_ROLE_KEY: '' }), null)
  assert.equal(serverSupabase({}), null)
  assert.equal(created, 0)
})

test('missing tables are reported with the migration file name', async () => {
  const r = await D.getBrainSummary(fake(() => ({ data: null, error: { code: 'PGRST205' } })), NOW)
  assert.equal(r.state, 'not_set_up')
  assert.equal(r.reason, 'tables')
  assert.match(r.hint, /20261109120000_data_store_dashboard_v1\.sql/)
  const e = await D.getBrainSummary(fake(() => ({ data: null, error: { code: 'XX000', message: 'secret detail' } })), NOW)
  assert.equal(e.state, 'error')
  assert.doesNotMatch(e.message, /secret/)
})

test('competitors: latest per company, open recommendations only', async () => {
  const db = fake((rec) => rec.table === 'competitor_changes'
    ? { data: [{ company: 'a', company_name: 'A Co', scan_date: '2026-11-05', added_count: 2, removed_count: 1, new_offer_lines: ['x'] }, { company: 'a', scan_date: '2026-10-29' }, { company: 'b', scan_date: '2026-11-01' }], error: null }
    : { data: [{ company: 'a', rec_id: 'AB-1', status: 'proposed', is_open: true, idea: 'i' }, { company: 'a', rec_id: 'AB-2', status: 'done', is_open: false, idea: 'j' }], error: null })
  const r = await D.getCompetitors(db)
  assert.equal(r.scans.length, 2)
  assert.equal(r.scans[0].scanDate, '2026-11-05')
  assert.deepEqual(r.open.map((x) => x.id), ['AB-1'])
})

test('a copy that started over 10 minutes ago and never finished is flagged', async () => {
  const db = fake((rec) => rec.table === 'sync_runs' ? { data: [{ id: 1, started_at: '2026-11-09T14:00:00Z', ok: null }], error: null } : rec.count ? { count: 2, error: null } : { data: [], error: null })
  const r = await D.getBrainSummary(db, NOW)
  assert.equal(r.runs[0].state, 'did_not_finish')
  assert.equal(r.noteCount, 2)
})

test('search: query cleaning, empty query, title escaping, no body returned', async () => {
  assert.equal(D.cleanQuery(`a,(b)%*:'"c`), 'a b c')
  assert.equal(D.cleanQuery('x'.repeat(200)).length, 80)
  assert.equal(D.cleanQuery(5), '')
  const none = fake(() => { throw new Error('no query expected') })
  assert.deepEqual((await D.searchNotes(none, '  ')).hits, [])
  assert.equal(none.calls.length, 0)
  const db = fake(() => ({ data: [{ path: 'a.md', title: 'A_b', folder: '', changed_at: null, body: 'some roof text here' }], error: null }))
  const r = await D.searchNotes(db, 'a_b roof')
  assert.match(JSON.stringify(db.calls[0].filters), /a\\\\_b/)
  assert.equal(r.hits.length, 1)
  assert.ok(r.hits[0].snippet.includes('roof'))
  assert.equal('body' in r.hits[0], false)
})

test('getNote rejects bad paths without querying', async () => {
  const db = fake(() => { throw new Error('no query expected') })
  for (const p of ['../secrets.md', 'a.txt', 'market/companies/x/scans/2026-10-29/home.md']) {
    const r = await D.getNote(db, p)
    assert.equal(r.found, false)
  }
  assert.equal(db.calls.length, 0)
})
