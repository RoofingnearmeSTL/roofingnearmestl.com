import test from 'node:test'
import assert from 'node:assert/strict'
import { loadTs } from './helpers/load-ts.mjs'
import { startOfDayChicago, formatCentral, timeAgo } from '../src/lib/dashboard/time.ts'
import { systemMap } from '../src/lib/dashboard/system-map.ts'
import { layoutGraph } from '../src/lib/dashboard/graph-layout.ts'

const { setupHealth } = loadTs('src/lib/dashboard/setup-health.ts')
const { parseMarkdown } = loadTs('src/lib/brain/markdown.ts')

test('setupHealth reports names only and flags an http video', () => {
  const names = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'LEAD_TO_EMAIL', 'RESEND_LEAD_CHECK_KEY', 'CRON_SECRET', 'LEAD_WEBHOOK_URL', 'LEAD_WEBHOOK_SECRET', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER', 'LEAD_ALERT_PHONE', 'INTRO_VIDEO_URL', 'NEXT_PUBLIC_GA4_ID', 'BRAIN_GITHUB_TOKEN']
  const env = Object.fromEntries(names.map((n) => [n, 'SENTINEL-VALUE-123']))
  const out = JSON.stringify(setupHealth(env))
  assert.doesNotMatch(out, /SENTINEL/)
  const some = setupHealth({ INTRO_VIDEO_URL: 'http://x.example.invalid/v' })
  assert.deepEqual(some.find((h) => h.id === 'video').missing, ['INTRO_VIDEO_URL (must be an https link)'])
  assert.deepEqual(some.find((h) => h.id === 'supabase').missing, ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
  assert.equal(setupHealth({ INTRO_VIDEO_URL: 'https://v.example.invalid/x' }).find((h) => h.id === 'video').ok, true)
})

test('systemMap statuses', () => {
  const h = (ok) => [{ id: 'crm', ok, missing: [] }, { id: 'supabase', ok, missing: [] }, { id: 'team_email', ok, missing: [] }, { id: 'texts', ok, missing: [] }, { id: 'lead_check', ok, missing: ok ? [] : ['CRON_SECRET'] }, { id: 'brain_copy', ok, missing: ok ? [] : ['BRAIN_GITHUB_TOKEN'] }, { id: 'ga4', ok, missing: [] }]
  const off = systemMap({ health: h(false), dataStore: 'not_set_up', lastBrainSync: null })
  const on = systemMap({ health: h(true), dataStore: 'ok', lastBrainSync: { ok: true, at: 'x' } })
  const by = (m, id) => m.nodes.find((n) => n.id === id).status
  assert.equal(by(off, 'n8n'), 'built_off')
  assert.equal(by(off, 'github_brain'), 'not_set_up')
  assert.equal(by(off, 'vercel_cron'), 'not_set_up')
  assert.equal(by(on, 'rooflink'), 'connected')
  assert.equal(by(on, 'github_brain'), 'connected')
  assert.equal(by(on, 'website'), 'connected')
  for (const n of [...off.nodes, ...on.nodes]) assert.ok(n.statusLabel)
})

test('time helpers', () => {
  assert.equal(startOfDayChicago(new Date('2026-11-09T15:00:00Z')).toISOString(), '2026-11-09T06:00:00.000Z') // CST
  assert.equal(startOfDayChicago(new Date('2026-07-09T15:00:00Z')).toISOString(), '2026-07-09T05:00:00.000Z') // CDT
  const now = new Date('2026-11-09T15:00:00Z')
  assert.equal(timeAgo(new Date('2026-11-09T14:59:40Z'), now), 'just now')
  assert.equal(timeAgo(new Date('2026-11-09T14:59:00Z'), now), '1 minute ago')
  assert.equal(timeAgo(new Date('2026-11-09T12:00:00Z'), now), '3 hours ago')
  assert.equal(timeAgo(new Date('2026-11-07T15:00:00Z'), now), '2 days ago')
  assert.equal(formatCentral(null), 'never')
  assert.match(formatCentral('2026-11-09T14:05:00Z'), /Nov 9, 2026.*8:05 AM CT/)
})

test('layoutGraph is deterministic, bounded and capped', () => {
  const nodes = Array.from({ length: 200 }, (_, i) => ({ id: 'n' + i, group: 'g' }))
  const edges = [{ from: 'n1', to: 'n2' }, { from: 'n1', to: 'missing' }]
  const a = layoutGraph(nodes, edges)
  assert.equal(a.length, 150)
  assert.deepEqual(a, layoutGraph(nodes, edges))
  for (const n of a) assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y) && n.x >= 24 && n.x <= 776 && n.y >= 24 && n.y <= 536)
  assert.equal(a.find((n) => n.id === 'n1').degree, 1)
  assert.deepEqual(layoutGraph([], []), [])
})

test('parseMarkdown is safe and resolves note links', () => {
  const flat = (b) => JSON.stringify(b)
  assert.match(flat(parseMarkdown('<script>alert(1)</script>', 'a.md')), /"t":"text"/)
  assert.doesNotMatch(flat(parseMarkdown('[x](javascript:alert(1))', 'a.md')), /"t":"link"/)
  assert.match(flat(parseMarkdown('[x](../memory/decisions.md)', 'docs/playbooks/a.md')), /"href":"\/dashboard\/brain\?note=docs%2Fmemory%2Fdecisions\.md"/)
  assert.match(flat(parseMarkdown('[x](https://example.invalid)', 'a.md')), /"external":true/)
  assert.match(flat(parseMarkdown('![pic](https://e.invalid/p.png)', 'a.md')), /\[image: pic\]/)
  const blocks = parseMarkdown('# T\n\n- a\n- b\n\n| h1 | h2 |\n|---|---|\n| 1 | 2 |\n\n```\ncode\n```\n', 'a.md')
  assert.deepEqual(blocks.map((b) => b.t), ['h', 'ul', 'table', 'code'])
})
