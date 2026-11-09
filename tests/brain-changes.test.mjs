import test from 'node:test'
import assert from 'node:assert/strict'
import { parseChangesJson, countSitemapLines, parseCompanies, humanizeSlug } from '../src/lib/brain/parse-changes.ts'

const parse = (o) => parseChangesJson('john-beal', '2026-10-29', typeof o === 'string' ? o : JSON.stringify(o))

test('Oct 22 shape (pages_before / pages_now)', () => {
  const r = parse({ compared_with: '2026-10-15', pages_before: 10, pages_now: 12, added: ['https://a.test/x', 'https://a.test/y'], removed: [] })
  assert.equal(r.ok, true)
  assert.equal(r.row.pages_before, 10)
  assert.equal(r.row.pages_now, 12)
  assert.equal(r.row.pages_source, 'changes.json')
  assert.equal(r.row.added_count, 2)
  assert.equal(r.row.compared_with, '2026-10-15')
})

test('Oct 29 shape (only added/removed) has no page counts', () => {
  const r = parse({ compared_with: '2026-10-22', added: ['https://a.test/x'], removed: ['https://a.test/z'] })
  assert.equal(r.row.pages_now, null)
  assert.equal(r.row.pages_source, null)
  assert.equal(r.row.removed_count, 1)
})

test('current script shape keeps sitemap, homepage, offers and robots', () => {
  const r = parse({ scanned: '2026-11-05', sitemap_read: true, homepage: 'https://a.test/', robots_skipped: ['https://a.test/private'],
    new_offer_lines: ['10% off'], removed_offer_lines: ['free tarp'], added: [], removed: [] })
  assert.equal(r.row.sitemap_read, true)
  assert.equal(r.row.homepage, 'https://a.test/')
  assert.deepEqual(r.row.new_offer_lines, ['10% off'])
  assert.deepEqual(r.row.removed_offer_lines, ['free tarp'])
  assert.deepEqual(r.row.robots_skipped, ['https://a.test/private'])
})

test('invalid json and non-objects fail softly', () => {
  assert.deepEqual(parse('{nope'), { ok: false, reason: 'invalid_json' })
  assert.deepEqual(parse('[1]'), { ok: false, reason: 'not_object' })
  assert.deepEqual(parse('null'), { ok: false, reason: 'not_object' })
})

test('non-URL entries are dropped, long lists are capped but counted, bad dates become null', () => {
  const r = parse({ compared_with: 'last week', added: ['not a url', ...Array.from({ length: 300 }, (_, i) => `https://a.test/${i}`)] })
  assert.equal(r.row.added.length, 200)
  assert.equal(r.row.added_count, 301)
  assert.equal(r.row.compared_with, null)
})

test('sitemap lines, companies and slug names', () => {
  assert.equal(countSitemapLines('a\n\n  \nb\r\nc\n'), 3)
  const m = parseCompanies(JSON.stringify([{ slug: 'john-beal', name: 'John Beal Roofing' }, { slug: 'Bad Slug', name: 'x' }]))
  assert.equal(m.get('john-beal'), 'John Beal Roofing')
  assert.equal(m.size, 1)
  assert.equal(parseCompanies('{bad').size, 0)
  assert.equal(parseCompanies(JSON.stringify({ 'a-b': 'A B Co' })).get('a-b'), 'A B Co')
  assert.equal(humanizeSlug('john-beal-roofing'), 'John Beal Roofing')
})
