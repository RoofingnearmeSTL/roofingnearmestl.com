// The daily Brain copy (DATA-04): mocked GitHub fetch and an in-memory store. Nothing real is ever called.
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { loadTs } from './helpers/load-ts.mjs'

const TOKEN = 'test-brain-token-SENTINEL'
const BODY_SENTINEL = 'secret-response-body-SENTINEL'
const cache = new Map()
const sync = loadTs('src/lib/brain/sync.ts', { mocks: { 'server-only': {} }, cache })
const errors = loadTs('src/lib/data-store/errors.ts', { cache })
const { runBrainSync } = sync

const sha = (s) => crypto.createHash('sha1').update(s).digest('hex')
const HEAD = sha('head-commit')

function fakeGitHub(files, { truncated = false, fail = null } = {}) {
  const requests = []
  const bySha = new Map()
  const tree = Object.entries(files).map(([path, f]) => {
    const text = typeof f === 'string' ? f : f.text
    const s = sha(path + text)
    bySha.set(s, text)
    return { path, sha: s, type: 'blob', size: typeof f === 'object' && f.size !== undefined ? f.size : Buffer.byteLength(text) }
  })
  const res = (status, body, headers = {}) => ({
    ok: status >= 200 && status < 300, status,
    headers: { get: (k) => headers[k.toLowerCase()] ?? null },
    text: async () => body,
  })
  const fetch = async (url, opts) => {
    requests.push({ url, headers: opts?.headers ?? {} })
    if (fail) {
      const r = fail(url, requests.length)
      if (r === 'throw') throw new Error('network down ' + TOKEN)
      if (r) return res(r.status, BODY_SENTINEL, r.headers)
    }
    if (url.endsWith('/commits/main')) return res(200, HEAD)
    if (url.includes('/git/trees/')) return res(200, JSON.stringify({ tree, truncated }))
    const m = /\/git\/blobs\/([0-9a-f]+)$/.exec(url)
    if (m && bySha.has(m[1])) return res(200, bySha.get(m[1]))
    return res(404, BODY_SENTINEL)
  }
  return { fetch, requests, tree, shaOf: (p) => tree.find((t) => t.path === p).sha }
}

function fakeStore({ missing = false, notes = [], links = [], scans = [], recs = [] } = {}) {
  const calls = []
  const s = {
    calls, notes: new Map(notes.map((n) => [n.path, n])), links: [...links], scans: [...scans], recs: [...recs], runs: [],
    async startRun(a) { calls.push(['startRun', a]); if (missing) throw new errors.MissingTableError(); s.runs.push({ id: 1 }); return 1 },
    async finishRun(id, r) { calls.push(['finishRun', id, r]); s.finish = r },
    async listNotes() { return [...s.notes.values()].map((n) => ({ path: n.path, gitSha: n.gitSha ?? n.git_sha, links: n.links ?? [] })) },
    async upsertNotes(rows) { calls.push(['upsertNotes', rows]); for (const r of rows) s.notes.set(r.path, { ...r, gitSha: r.git_sha }) },
    async deleteNotes(p) { calls.push(['deleteNotes', p]); p.forEach((x) => s.notes.delete(x)) },
    async listLinks() { return s.links },
    async upsertLinks(rows) { calls.push(['upsertLinks', rows]); for (const r of rows) { s.links = s.links.filter((l) => !(l.from_path === r.from_path && l.to_path === r.to_path)); s.links.push(r) } },
    async deleteLinks(pairs) { calls.push(['deleteLinks', pairs]); s.links = s.links.filter((l) => !pairs.some((p) => p.from_path === l.from_path && p.to_path === l.to_path)) },
    async listScans() { return s.scans },
    async upsertScans(rows) { calls.push(['upsertScans', rows]); for (const r of rows) { s.scans = s.scans.filter((x) => !(x.company === r.company && x.scan_date === r.scan_date)); s.scans.push(r) } },
    async deleteScans(k) { calls.push(['deleteScans', k]) },
    async listRecommendationKeys() { return s.recs },
    async upsertRecommendations(rows) { calls.push(['upsertRecommendations', rows]) },
    async deleteRecommendations(k) { calls.push(['deleteRecommendations', k]) },
  }
  return s
}

const REC = '| ID | Date | Recommendation | Why (evidence) | Status | Link |\n|---|---|---|---|---|---|\n| JB-001 | 2026-10-22 | Idea | Why | 💡 Proposed | — |\n| JB-002 | 2026-10-22 | Idea 2 | Why | ✅ Done | — |\n'
const baseFiles = () => ({
  'README.md': '# Home\n[a](docs/a.md) [b](docs/b.md)',
  'docs/a.md': '# A\n[home](../README.md)',
  'docs/b.md': '# B\nno links',
  'market/companies.json': JSON.stringify([{ slug: 'john-beal', name: 'John Beal Roofing' }, { slug: 'us-roofing', name: 'US Roofing' }]),
  'market/companies/john-beal/recommendations.md': REC,
  'market/companies/john-beal/scans/2026-10-29/home.md': '# raw scan, must not be a note',
  'market/companies/john-beal/scans/2026-10-29/changes.json': JSON.stringify({ compared_with: '2026-10-22', pages_now: 40, added: ['https://x.test/a'], removed: [] }),
  'market/companies/us-roofing/scans/2026-10-29/changes.json': JSON.stringify({ added: [], removed: [] }),
  'market/companies/us-roofing/scans/2026-10-29/sitemap-urls.txt': 'https://x.test/1\nhttps://x.test/2\n',
})
const run = (gh, store, over = {}) => runBrainSync({ env: { BRAIN_GITHUB_TOKEN: TOKEN }, fetch: gh.fetch, store, trigger: 'manual', ...over })
const callsOf = (store, name) => store.calls.filter((c) => c[0] === name)
const noLeak = (...things) => {
  const s = JSON.stringify(things)
  assert.ok(!s.includes(TOKEN), 'token leaked')
  assert.ok(!s.includes(BODY_SENTINEL), 'response body leaked')
}

test('first run copies notes (not raw scans), scans, recommendations and links', async () => {
  const gh = fakeGitHub(baseFiles())
  const store = fakeStore()
  const r = await run(gh, store)
  assert.equal(r.ok, true)
  assert.equal(r.status, 200)
  assert.equal(r.commit, HEAD.slice(0, 7))
  const notes = callsOf(store, 'upsertNotes')[0][1]
  assert.deepEqual(notes.map((n) => n.path).sort(), ['README.md', 'docs/a.md', 'docs/b.md', 'market/companies/john-beal/recommendations.md'])
  assert.ok(notes.every((n) => n.commit_sha === HEAD))
  assert.ok(!notes.some((n) => n.path.includes('/scans/')))
  const scans = callsOf(store, 'upsertScans')[0][1]
  assert.equal(scans.length, 2)
  const us = scans.find((x) => x.company === 'us-roofing')
  assert.equal(us.pages_now, 2)
  assert.equal(us.pages_source, 'sitemap-urls.txt')
  assert.equal(us.company_name, 'US Roofing')
  assert.equal(scans.find((x) => x.company === 'john-beal').pages_source, 'changes.json')
  const recs = callsOf(store, 'upsertRecommendations')[0][1]
  assert.deepEqual(recs.map((x) => x.rec_id), ['JB-001', 'JB-002'])
  assert.ok(recs.every((x) => !('is_open' in x)))
  const links = callsOf(store, 'upsertLinks')[0][1]
  assert.deepEqual(links.map((l) => `${l.from_path}>${l.to_path}`).sort(), ['README.md>docs/a.md', 'README.md>docs/b.md', 'docs/a.md>README.md'])
  assert.equal(store.finish.ok, true)
  assert.equal(store.finish.counts.notes_total, 4)
  assert.equal(store.finish.counts.notes_changed, 4)
  assert.equal(store.finish.counts.scans_changed, 2)
  assert.equal(store.finish.counts.recommendations_total, 2)
  assert.equal(store.finish.commitSha, HEAD)
  for (const q of gh.requests) {
    assert.ok(q.url.startsWith('https://api.github.com/repos/RoofingnearmeSTL/Brain-Data/'), q.url)
    assert.equal(q.headers.Authorization, `Bearer ${TOKEN}`)
    assert.equal(q.headers['X-GitHub-Api-Version'], '2022-11-28')
  }
  noLeak(r, store.calls)
})

test('second run fetches only the changed note plus always-fetched files; full fetches all', async () => {
  const files = baseFiles()
  const gh1 = fakeGitHub(files)
  const store = fakeStore()
  await run(gh1, store)
  const gh2 = fakeGitHub({ ...files, 'docs/b.md': '# B changed\n' })
  const before = callsOf(store, 'upsertNotes').length
  const r2 = await run(gh2, store)
  assert.equal(r2.ok, true)
  const blobUrls = gh2.requests.filter((q) => q.url.includes('/git/blobs/'))
  assert.equal(blobUrls.length, 3) // companies.json, recommendations.md, docs/b.md
  const up = callsOf(store, 'upsertNotes')
  assert.equal(up.length, before + 1)
  assert.deepEqual(up.at(-1)[1].map((n) => n.path), ['docs/b.md'])
  assert.equal(callsOf(store, 'upsertScans').length, 1) // unchanged scans not rewritten
  const gh3 = fakeGitHub(files)
  await run(gh3, store, { full: true })
  const blobs3 = gh3.requests.filter((q) => q.url.includes('/git/blobs/'))
  assert.equal(blobs3.length, 1 + 4 + 2 + 1) // companies, 4 notes, 2 changes.json, 1 sitemap
})

test('missing token: setup token_missing, run recorded, GitHub never called', async () => {
  const gh = fakeGitHub(baseFiles())
  const store = fakeStore()
  const r = await runBrainSync({ env: {}, fetch: gh.fetch, store, trigger: 'cron' })
  assert.equal(r.status, 503)
  assert.equal(r.setup, 'token_missing')
  assert.equal(store.finish.ok, false)
  assert.equal(store.finish.error, 'BRAIN_GITHUB_TOKEN is not set')
  assert.equal(gh.requests.length, 0)
  const blank = await runBrainSync({ env: { BRAIN_GITHUB_TOKEN: '   ' }, fetch: gh.fetch, store: fakeStore(), trigger: 'cron' })
  assert.equal(blank.setup, 'token_missing')
})

test('tables missing: setup tables_missing, no fetch', async () => {
  const gh = fakeGitHub(baseFiles())
  const r = await run(gh, fakeStore({ missing: true }))
  assert.equal(r.status, 503)
  assert.equal(r.setup, 'tables_missing')
  assert.equal(gh.requests.length, 0)
})

test('repo validation and override', async () => {
  const gh = fakeGitHub(baseFiles())
  const store = fakeStore()
  const bad = await runBrainSync({ env: { BRAIN_GITHUB_TOKEN: TOKEN, BRAIN_GITHUB_REPO: 'bad repo' }, fetch: gh.fetch, store, trigger: 'manual' })
  assert.equal(bad.status, 503)
  assert.equal(bad.setup, 'repo_invalid')
  assert.equal(store.calls.length, 0)
  const ok = await runBrainSync({ env: { BRAIN_GITHUB_TOKEN: TOKEN, BRAIN_GITHUB_REPO: 'Other/Repo' }, fetch: gh.fetch, store, trigger: 'manual' })
  assert.equal(ok.ok, true)
  assert.ok(gh.requests.every((q) => q.url.startsWith('https://api.github.com/repos/Other/Repo/')))
})

const writes = ['upsertNotes', 'upsertScans', 'upsertRecommendations', 'upsertLinks', 'deleteNotes', 'deleteScans', 'deleteRecommendations', 'deleteLinks']
const GH_CASES = [
  ['401', () => ({ status: 401 }), /refused the token \(401\)/],
  ['403 rate limit', () => ({ status: 403, headers: { 'x-ratelimit-remaining': '0' } }), /rate limit reached/],
  ['403 no access', () => ({ status: 403 }), /said no access \(403\)/],
  ['404', () => ({ status: 404 }), /could not find the repo or branch \(404\)/],
  ['500', () => ({ status: 500 }), /GitHub answered 500\./],
  ['network throw', () => 'throw', /Could not reach GitHub/],
]
for (const [name, make, msg] of GH_CASES) {
  test(`GitHub ${name} keeps the old copy and records a fixed message`, async () => {
    const gh = fakeGitHub(baseFiles(), { fail: () => make() })
    const store = fakeStore()
    const logs = []
    const orig = console.log
    console.log = (...a) => logs.push(a)
    let r
    try { r = await run(gh, store) } finally { console.log = orig }
    assert.equal(r.ok, false)
    assert.equal(r.status, 500)
    assert.match(r.error, msg)
    for (const w of writes) assert.equal(callsOf(store, w).length, 0, w)
    assert.equal(store.finish.ok, false)
    assert.match(store.finish.error, msg)
    noLeak(r, store.calls, logs)
  })
}

test('a blob failing midway writes nothing', async () => {
  const gh = fakeGitHub(baseFiles(), { fail: (url) => (url.includes('/git/blobs/') && gh.requests.filter((q) => q.url.includes('/blobs/')).length === 3 ? { status: 502 } : null) })
  const store = fakeStore()
  const r = await run(gh, store)
  assert.equal(r.ok, false)
  assert.equal(r.error, 'GitHub answered 502.')
  for (const w of writes) assert.equal(callsOf(store, w).length, 0, w)
  noLeak(r, store.calls)
})

test('deleted notes, scans and recommendations are removed', async () => {
  const files = baseFiles()
  const store = fakeStore()
  await run(fakeGitHub(files), store)
  store.scans = [{ company: 'john-beal', scan_date: '2026-10-29', git_sha: 'x' }, { company: 'gone-co', scan_date: '2026-10-01', git_sha: 'x' }]
  store.recs = [{ company: 'john-beal', rec_id: 'JB-001' }, { company: 'john-beal', rec_id: 'JB-002' }, { company: 'john-beal', rec_id: 'JB-099' }, { company: 'gone-co', rec_id: 'GC-001' }]
  store.notes.set('old/gone.md', { path: 'old/gone.md', gitSha: 'z', links: [] })
  const r = await run(fakeGitHub(files), store, { full: true })
  assert.equal(r.ok, true)
  assert.deepEqual(callsOf(store, 'deleteNotes').at(-1)[1], ['old/gone.md'])
  assert.deepEqual(callsOf(store, 'deleteScans').at(-1)[1], [{ company: 'gone-co', scan_date: '2026-10-01' }])
  assert.deepEqual(callsOf(store, 'deleteRecommendations').at(-1)[1].map((k) => k.rec_id).sort(), ['GC-001', 'JB-099'])
})

test('wipe guard refuses to remove more than half; allowLargeDelete lifts it; empty tree fails first', async () => {
  const stored = Array.from({ length: 30 }, (_, i) => ({ path: `old/n${i}.md`, gitSha: 'a', links: [] }))
  const ten = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`new/n${i}.md`, `# N${i}`]))
  const store = fakeStore({ notes: stored })
  const r = await run(fakeGitHub(ten), store)
  assert.equal(r.ok, false)
  assert.match(r.error, /Refused to remove 30 of 30 notes/)
  assert.equal(callsOf(store, 'deleteNotes').length, 0)
  const keep = Object.fromEntries(stored.slice(0, 10).map((n) => [n.path, '# kept']))
  const store2 = fakeStore({ notes: stored })
  const r2 = await run(fakeGitHub({ ...keep }), store2)
  assert.match(r2.error, /Refused to remove 20 of 30 notes/)
  assert.equal(callsOf(store2, 'deleteNotes').length, 0)
  const store3 = fakeStore({ notes: stored })
  const r3 = await run(fakeGitHub({ ...keep }), store3, { allowLargeDelete: true })
  assert.equal(r3.ok, true)
  assert.equal(callsOf(store3, 'deleteNotes')[0][1].length, 20)
  const store4 = fakeStore({ notes: stored })
  const r4 = await run(fakeGitHub({ 'a.txt': 'x' }), store4)
  assert.equal(r4.ok, false)
  assert.match(r4.error, /no notes/)
  for (const w of writes) assert.equal(callsOf(store4, w).length, 0)
})

test('caps: big files skipped, too many notes, truncated tree, fetch cap makes a partial run', async () => {
  const big = fakeGitHub({ ...baseFiles(), 'docs/huge.md': { text: '# huge', size: 2_000_000 } })
  const s1 = fakeStore()
  const r1 = await run(big, s1)
  assert.equal(r1.ok, true)
  assert.equal(r1.skipped, 1)
  assert.deepEqual(s1.finish.skipped, [{ path: 'docs/huge.md', reason: 'too_large' }])
  assert.ok(!callsOf(s1, 'upsertNotes')[0][1].some((n) => n.path === 'docs/huge.md'))
  assert.ok(big.requests.every((q) => !q.url.includes(big.shaOf('docs/huge.md'))))

  const many = fakeGitHub(Object.fromEntries(Array.from({ length: 2001 }, (_, i) => [`n/${i}.md`, '# x'])))
  const s2 = fakeStore()
  const r2 = await run(many, s2)
  assert.equal(r2.ok, false)
  assert.match(r2.error, /Too many notes \(2001 > 2000\)/)
  for (const w of writes) assert.equal(callsOf(s2, w).length, 0)

  const trunc = fakeGitHub(baseFiles(), { truncated: true })
  const s3 = fakeStore()
  const r3 = await run(trunc, s3)
  assert.equal(r3.ok, false)
  assert.match(r3.error, /too large to list/)

  const lots = fakeGitHub(Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`n/${i}.md`, `# N${i}`])))
  const s4 = fakeStore({ notes: [{ path: 'old/keep.md', gitSha: 'q', links: [] }] })
  const r4 = await run(lots, s4, { allowLargeDelete: true })
  assert.equal(r4.ok, true)
  assert.equal(r4.partial, true)
  assert.equal(s4.finish.counts.files_fetched, 400)
  assert.equal(callsOf(s4, 'upsertNotes').flatMap((c) => c[1]).length, 400)
  assert.equal(s4.finish.counts.notes_changed, 400)
})

test('invalid changes.json is skipped and the run still succeeds', async () => {
  const gh = fakeGitHub({ ...baseFiles(), 'market/companies/john-beal/scans/2026-11-05/changes.json': '{oops' })
  const store = fakeStore()
  const r = await run(gh, store)
  assert.equal(r.ok, true)
  assert.ok(store.finish.skipped.some((s) => s.reason === 'invalid_json'))
})

test('links diff: stale links deleted, new inserted, links to missing notes never inserted', async () => {
  const files = { 'a.md': '# A\n[b](b.md) [ghost](ghost.md)', 'b.md': '# B' }
  const store = fakeStore({
    notes: [{ path: 'a.md', gitSha: 'old', links: [] }, { path: 'b.md', gitSha: 'old', links: [] }],
    links: [{ from_path: 'b.md', to_path: 'a.md', kind: 'link' }],
  })
  const r = await run(fakeGitHub(files), store)
  assert.equal(r.ok, true)
  assert.deepEqual(callsOf(store, 'deleteLinks')[0][1], [{ from_path: 'b.md', to_path: 'a.md' }])
  const up = callsOf(store, 'upsertLinks')[0][1]
  assert.deepEqual(up, [{ from_path: 'a.md', to_path: 'b.md', kind: 'link' }])
})
