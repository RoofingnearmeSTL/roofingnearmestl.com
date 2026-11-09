import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRecommendations } from '../src/lib/brain/parse-recommendations.ts'

const table = (rows) => [
  '# Recommendations', '', '| ID | Date | Recommendation | Why (evidence) | Status | Link |', '|---|---|---|---|---|---|', ...rows, '', 'after',
].join('\n')

test('parses a 6-column table and maps every status', () => {
  const t = table([
    '| JB-001 | 2026-10-22 | Add a tarp page | Competitor has one | 💡 Proposed | [x](a.md) |',
    '| JB-002 | 2026-10-22 | Idea two | why | 👍 Approved | — |',
    '| JB-003 | 2026-10-23 | Idea three | why | 🔨 In progress | - |',
    '| US-003 | 2026-10-24 | Idea four | why | ✅ Done | |',
    '| US-004 | 2026-10-24 | Idea five | why | ❌ Not a recommendation to copy | |',
    '| US-005 | 2026-10-24 | Idea six | why | 🔁 Still recommended | |',
    '| US-006 | 2026-10-24 | Idea seven | why | whatever | |',
  ])
  const { rows, skipped } = parseRecommendations('john-beal', t)
  assert.equal(skipped, 0)
  assert.deepEqual(rows.map((r) => r.status), ['proposed', 'approved', 'in_progress', 'done', 'declined', 'still_recommended', 'unknown'])
  assert.equal(rows[0].rec_id, 'JB-001')
  assert.equal(rows[0].company, 'john-beal')
  assert.equal(rows[0].rec_date, '2026-10-22')
  assert.equal(rows[0].idea, 'Add a tarp page')
  assert.equal(rows[0].evidence, 'Competitor has one')
  assert.equal(rows[0].link, '[x](a.md)')
  assert.equal(rows[1].link, null)
  assert.equal(rows[2].link, null)
  assert.equal(rows[3].link, null)
})

test('escaped pipes stay inside one cell; bad date becomes null', () => {
  const { rows } = parseRecommendations('x', table(['| AB-001 | soon | Use a \\| b | why | 💡 | |']))
  assert.equal(rows.length, 1)
  assert.equal(rows[0].idea, 'Use a | b')
  assert.equal(rows[0].rec_date, null)
})

test('rows without a valid id are skipped and counted; no table gives no rows', () => {
  const { rows, skipped } = parseRecommendations('x', table(['| nope | 2026-10-22 | a | b | 💡 | |', '| AB-001 | 2026-10-22 | a | b | 💡 | |']))
  assert.equal(rows.length, 1)
  assert.equal(skipped, 1)
  assert.deepEqual(parseRecommendations('x', 'just text, no table').rows, [])
  assert.deepEqual(parseRecommendations('x', '| A | B |\n|---|---|\n| 1 | 2 |').rows, [])
})

test('reordered columns are found by header name', () => {
  const t = '| Status | ID | Link | Recommendation | Date | Why (evidence) |\n|---|---|---|---|---|---|\n| ✅ | ZZ-010 | — | The idea | 2026-11-01 | The reason |'
  const { rows } = parseRecommendations('x', t)
  assert.equal(rows[0].rec_id, 'ZZ-010')
  assert.equal(rows[0].status, 'done')
  assert.equal(rows[0].idea, 'The idea')
  assert.equal(rows[0].evidence, 'The reason')
  assert.equal(rows[0].rec_date, '2026-11-01')
})

test('caps at 500 rows', () => {
  const many = Array.from({ length: 600 }, (_, i) => `| AB-${i + 1} | 2026-10-22 | a | b | 💡 | |`)
  assert.equal(parseRecommendations('x', table(many)).rows.length, 500)
})
