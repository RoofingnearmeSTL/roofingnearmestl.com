import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('vercel.json holds exactly the lead check, the Brain copy and the n8n usage crons', () => {
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'))
  assert.deepEqual(config.crons, [
    { path: '/api/lead-check', schedule: '0 13 * * *' },
    { path: '/api/sync/brain', schedule: '0 11 * * *' },
    { path: '/api/n8n-usage-check', schedule: '0 14 * * *' },
  ])
})
