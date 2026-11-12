import test from 'node:test'
import assert from 'node:assert/strict'
import { loadTs } from './helpers/load-ts.mjs'

const mw = loadTs('src/lib/dashboard/market-watch.ts')
const activity = loadTs('src/lib/dashboard/activity.ts', { mocks: { 'server-only': {} } })
const exif = loadTs('src/lib/proof-package/exif.ts')
const client = loadTs('src/lib/n8n/client.ts', { mocks: { 'server-only': {} } })

const COMPANIES = JSON.stringify({ companies: [
  { slug: 'alpha-roofing', name: 'Alpha Roofing', domain: 'alpha.example', home: 'https://alpha.example/' },
  { slug: 'blocked-co', name: 'Blocked Co', domain: 'blocked.example', home: null },
  { slug: 'new-co', name: 'New Co', domain: 'new.example', home: 'https://new.example/' },
  { slug: 'Bad Slug!', name: 'x' },
] })
const scan = (company, scanDate, extra = {}) => ({ company, name: company, scanDate, comparedWith: null, pagesBefore: null, pagesNow: 40, added: 2, removed: 1, offerLines: 0, syncedAt: null, ...extra })

test('companies.json is parsed safely', () => {
  const list = mw.parseCompanies(COMPANIES)
  assert.deepEqual(list.map((c) => c.slug), ['alpha-roofing', 'blocked-co', 'new-co'])
  assert.equal(list[1].home, null)
  assert.deepEqual(mw.parseCompanies('not json'), [])
  assert.deepEqual(mw.parseCompanies('{"companies": 5}'), [])
})

test('scrape rows show current, overdue, never and by-hand sites, and keep dropped companies', () => {
  const now = new Date('2026-11-11T15:00:00Z')
  const rows = mw.scrapeRows(mw.parseCompanies(COMPANIES), [scan('alpha-roofing', '2026-11-09'), scan('blocked-co', '2026-10-01'), scan('gone-co', '2026-10-20')], now)
  const by = Object.fromEntries(rows.map((r) => [r.slug, r.status]))
  assert.deepEqual(by, { 'alpha-roofing': 'current', 'blocked-co': 'by_hand', 'new-co': 'never', 'gone-co': 'overdue' })
  const old = mw.scrapeRows(mw.parseCompanies(COMPANIES), [scan('alpha-roofing', '2026-10-26')], now)
  assert.equal(old.find((r) => r.slug === 'alpha-roofing').status, 'overdue')
})

test('only scan branches newer than the newest merged scan are waiting', () => {
  const branches = ['market-watch/2026-10-29', 'market-watch/2026-11-09', 'market-watch/2026-11-02', 'market-watch/oops', 'feature/x']
  assert.deepEqual(mw.waitingScans(branches, [scan('a', '2026-10-29')]), ['2026-11-09', '2026-11-02'])
  assert.deepEqual(mw.waitingScans(branches, [scan('a', '2026-11-09')]), [])
})

test('website updates: merged into main only, newest first, live when merged before the deployed commit', () => {
  const pulls = [
    { number: 75, title: 'ZIP box', merged_at: '2026-11-10T02:00:00Z', html_url: 'https://github.com/RoofingnearmeSTL/roofingnearmestl.com/pull/75', base: { ref: 'main' } },
    { number: 76, title: 'Dashboard v2', merged_at: '2026-11-12T02:00:00Z', html_url: 'javascript:alert(1)', base: { ref: 'main' } },
    { number: 70, title: 'Closed, not merged', merged_at: null, base: { ref: 'main' } },
    { number: 71, title: 'Into another branch', merged_at: '2026-11-01T00:00:00Z', base: { ref: 'feature/x' } },
  ]
  const ups = activity.siteUpdatesFrom(pulls, '2026-11-11T00:00:00Z')
  assert.deepEqual(ups.map((u) => [u.number, u.live]), [[76, false], [75, true]])
  assert.equal(ups[0].url, 'https://github.com/RoofingnearmeSTL/roofingnearmestl.com/pull/76')
  assert.deepEqual(activity.siteUpdatesFrom(pulls, null).map((u) => u.live), [null, null])
})

function jpegWithExif(date) {
  const dateBytes = Buffer.from(date + '\0', 'ascii') // 20 bytes
  const tiff = Buffer.alloc(44 + dateBytes.length)
  tiff.write('II', 0, 'ascii'); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4)
  tiff.writeUInt16LE(1, 8) // IFD0: one entry
  tiff.writeUInt16LE(0x8769, 10); tiff.writeUInt16LE(4, 12); tiff.writeUInt32LE(1, 14); tiff.writeUInt32LE(26, 18)
  tiff.writeUInt32LE(0, 22)
  tiff.writeUInt16LE(1, 26) // Exif IFD: one entry
  tiff.writeUInt16LE(0x9003, 28); tiff.writeUInt16LE(2, 30); tiff.writeUInt32LE(dateBytes.length, 32); tiff.writeUInt32LE(44, 36)
  tiff.writeUInt32LE(0, 40)
  dateBytes.copy(tiff, 44)
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiff])
  const seg = Buffer.alloc(4); seg.writeUInt16BE(0xffe1, 0); seg.writeUInt16BE(payload.length + 2, 2)
  const buf = Buffer.concat([Buffer.from([0xff, 0xd8]), seg, payload, Buffer.from([0xff, 0xd9])])
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)
}

test('the date taken is read from a JPEG and junk is ignored', () => {
  assert.equal(exif.readExifDate(jpegWithExif('2026:05:14 10:41:00')), '2026-05-14T10:41:00Z')
  assert.equal(exif.readExifDate(jpegWithExif('0000:00:00 00:00:00')), null)
  assert.equal(exif.readExifDate(new Uint8Array([1, 2, 3, 4]).buffer), null)
  assert.equal(exif.readExifDate(new ArrayBuffer(0)), null)
})

test('the n8n reader pages back to the cycle start, sends the key only in its header, and hides raw errors', async () => {
  const calls = []
  const pages = [
    { data: [{ id: 3, mode: 'webhook', startedAt: '2026-11-10T10:00:00Z' }, { id: 2, mode: 'manual', startedAt: '2026-11-09T10:00:00Z' }], nextCursor: 'c1' },
    { data: [{ id: 1, mode: 'trigger', startedAt: '2026-11-02T10:00:00Z' }, { id: 0, mode: 'trigger', startedAt: '2026-10-30T10:00:00Z' }], nextCursor: 'c2' },
  ]
  const fakeFetch = async (url, init) => {
    calls.push({ url, key: init.headers['X-N8N-API-KEY'] })
    return { ok: true, status: 200, json: async () => pages[calls.length - 1] }
  }
  const out = await client.fetchExecutionsSince({ baseUrl: 'https://example.app.n8n.cloud', apiKey: 'test-key' }, new Date('2026-11-01T05:00:00Z'), { fetch: fakeFetch })
  assert.equal(calls.length, 2) // stops once a page reaches back past the start
  assert.ok(calls.every((c) => c.key === 'test-key' && !c.url.includes('test-key')))
  assert.match(calls[1].url, /cursor=c1/)
  assert.deepEqual(out.executions.map((e) => e.id), ['3', '2', '1'])
  assert.equal(out.complete, true)

  const denied = async () => ({ ok: false, status: 403, json: async () => ({ message: 'secret detail' }) })
  await assert.rejects(client.fetchExecutionsSince({ baseUrl: 'https://example.app.n8n.cloud', apiKey: 'k' }, new Date(), { fetch: denied }), (e) => /free trial/.test(e.message) && !/secret detail/.test(e.message))

  assert.equal(client.n8nBaseUrl('https://example.app.n8n.cloud/api/v1/'), 'https://example.app.n8n.cloud')
  assert.equal(client.n8nBaseUrl('http://example.app.n8n.cloud'), null)
  assert.deepEqual(client.n8nSettings({}).missing, ['N8N_API_URL', 'N8N_API_KEY', 'N8N_MONTHLY_EXECUTION_LIMIT'])
})
