// Brain note parsing: paths, titles, links. Run: node --test tests/
import test from 'node:test'
import assert from 'node:assert/strict'
import { loadTs } from './helpers/load-ts.mjs'
import { isNotePath, changesJsonKey, recommendationsCompany, posixNormalize } from '../src/lib/brain/paths.ts'

const { parseNote, resolveLink } = loadTs('src/lib/brain/parse-note.ts')
const all = (...p) => new Set(p)

test('isNotePath accepts notes and rejects scans, hidden, non-md and traversal', () => {
  assert.equal(isNotePath('docs/memory/decisions.md'), true)
  assert.equal(isNotePath('market/companies/x/profile.md'), true)
  assert.equal(isNotePath('market/companies/x/scans/2026-10-29/home.md'), false)
  assert.equal(isNotePath('.github/a.md'), false)
  assert.equal(isNotePath('a.txt'), false)
  assert.equal(isNotePath('../x.md'), false)
  assert.equal(isNotePath('docs/node_modules/x.md'), false)
})

test('path key helpers', () => {
  assert.deepEqual(changesJsonKey('market/companies/john-beal/scans/2026-10-29/changes.json'), { company: 'john-beal', scanDate: '2026-10-29' })
  assert.equal(changesJsonKey('market/companies/x/scans/bad/changes.json'), null)
  assert.equal(recommendationsCompany('market/companies/john-beal/recommendations.md'), 'john-beal')
  assert.equal(recommendationsCompany('market/companies/john-beal/profile.md'), null)
  assert.equal(posixNormalize('a/b/../c'), 'a/c')
  assert.equal(posixNormalize('../x'), null)
})

test('titles come from frontmatter, first heading, then file name', () => {
  assert.equal(parseNote('a/x.md', '---\ntitle: "From FM"\n---\n# Heading\n', all()).title, 'From FM')
  assert.equal(parseNote('a/x.md', 'intro\n# The Heading\n', all()).title, 'The Heading')
  assert.equal(parseNote('a/some-note.md', 'no heading', all()).title, 'some-note')
  assert.equal(parseNote('a/x.md', '```\n# not a heading\n```\n# Real\n', all()).title, 'Real')
  assert.equal(parseNote('docs/a.md', 'x', all()).folder, 'docs')
  assert.equal(parseNote('a.md', 'x', all()).folder, '')
})

test('relative, root-relative and ../ links resolve; fragments and queries are stripped', () => {
  const paths = all('docs/playbooks/test-lead.md', 'docs/memory/lessons.md', 'docs/memory/decisions.md', 'docs/playbooks/a.md', 'README.md', 'docs/x y.md')
  const n = parseNote('docs/playbooks/a.md', [
    '[a](test-lead.md) [b](docs/memory/lessons.md) [c](../memory/decisions.md#top) [d](../../README.md?x=1) [e](../x%20y.md)',
  ].join('\n'), paths)
  assert.deepEqual(n.links.map((l) => l.to), ['README.md', 'docs/memory/decisions.md', 'docs/memory/lessons.md', 'docs/playbooks/test-lead.md', 'docs/x y.md'])
  assert.ok(n.links.every((l) => l.kind === 'link'))
})

test('schemes, anchors, images and fenced code are ignored; escaping the root is dropped', () => {
  const paths = all('a.md', 'b.md')
  const text = [
    '[w](http://x.com/b.md) [m](mailto:a@b.md) [t](tel:123) [d](data:text/plain,b.md) [h](#b.md) [i](javascript:b.md)',
    '![img](b.md)',
    '```',
    '[in fence](b.md)',
    '```',
    '[esc](../../b.md)',
  ].join('\n')
  assert.deepEqual(parseNote('a.md', text, paths).links, [])
})

test('wiki links match by base name; code mentions only when the target exists; link beats mention', () => {
  const paths = all('docs/memory/decisions.md', 'docs/a.md', 'other/Notes.md')
  const n = parseNote('docs/a.md', '[[decisions]] [[Notes|alias]] `docs/memory/decisions.md` `nothing/here.md`', paths)
  assert.deepEqual(n.links, [{ to: 'docs/memory/decisions.md', kind: 'wiki' }, { to: 'other/Notes.md', kind: 'wiki' }])
  const m = parseNote('docs/a.md', 'see `docs/memory/decisions.md` only', paths)
  assert.deepEqual(m.links, [{ to: 'docs/memory/decisions.md', kind: 'mention' }])
  const both = parseNote('docs/a.md', '[d](memory/decisions.md) and `docs/memory/decisions.md`', paths)
  assert.deepEqual(both.links, [{ to: 'docs/memory/decisions.md', kind: 'link' }])
})

test('self links are dropped and output is sorted', () => {
  const paths = all('a.md', 'b.md', 'c.md')
  const n = parseNote('a.md', '[c](c.md) [self](a.md) [b](b.md)', paths)
  assert.deepEqual(n.links.map((l) => l.to), ['b.md', 'c.md'])
})

test('a body over 200k characters is truncated', () => {
  const n = parseNote('a.md', 'x'.repeat(250_000), all())
  assert.equal(n.truncated, true)
  assert.equal(n.body.length, 200_000)
  assert.equal(n.sizeBytes, 250_000)
  assert.equal(parseNote('a.md', 'short', all()).truncated, false)
})

test('resolveLink works without an existence set and tries README.md folders', () => {
  assert.equal(resolveLink('docs/a.md', 'b.md'), 'docs/b.md')
  assert.equal(resolveLink('docs/a.md', 'https://x.com'), null)
  assert.equal(resolveLink('docs/a.md', '/abs.md'), null)
  assert.equal(resolveLink('docs/a.md', 'playbooks', all('docs/playbooks/README.md')), 'docs/playbooks/README.md')
})
