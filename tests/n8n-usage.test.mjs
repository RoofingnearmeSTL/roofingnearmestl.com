import test from 'node:test'
import assert from 'node:assert/strict'
import { loadTs } from './helpers/load-ts.mjs'

const u = loadTs('src/lib/n8n/usage.ts')

test('only production runs count toward the n8n limit', () => {
  for (const mode of ['trigger', 'webhook', 'cron', 'retry']) assert.equal(u.countsTowardLimit(mode), true, mode)
  for (const mode of ['manual', 'integrated', 'error', '', undefined, 5]) assert.equal(u.countsTowardLimit(mode), false, String(mode))
})

test('settings are parsed safely', () => {
  assert.equal(u.parseLimit('2500'), 2500)
  assert.equal(u.parseLimit(' 10,000 '), 10000)
  for (const bad of ['', 'abc', '-5', '0', '2.5', undefined]) assert.equal(u.parseLimit(bad), null, String(bad))
  assert.equal(u.parseBillingDay('15'), 15)
  for (const bad of ['', '0', '32', 'x', undefined]) assert.equal(u.parseBillingDay(bad), 1, String(bad))
})

test('Central dates and midnights handle both offsets', () => {
  assert.equal(u.centralDate(new Date('2026-11-10T05:30:00Z')), '2026-11-09')
  assert.equal(u.centralDate(new Date('2026-11-10T06:30:00Z')), '2026-11-10')
  assert.equal(u.centralMidnight('2026-11-10').toISOString(), '2026-11-10T06:00:00.000Z') // CST
  assert.equal(u.centralMidnight('2026-07-04').toISOString(), '2026-07-04T05:00:00.000Z') // CDT
})

test('billing cycles start on the billing day and clamp to short months', () => {
  const c = u.billingCycle(new Date('2026-11-10T18:00:00Z'), 21)
  assert.equal(c.start, '2026-10-21')
  assert.equal(c.end, '2026-11-21')
  assert.equal(c.days, 31)
  const d = u.billingCycle(new Date('2026-11-25T18:00:00Z'), 21)
  assert.equal(d.start, '2026-11-21')
  assert.equal(d.end, '2026-12-21')
  const feb = u.billingCycle(new Date('2027-02-28T18:00:00Z'), 31)
  assert.equal(feb.start, '2027-02-28')
  assert.equal(feb.end, '2027-03-31')
  const jan = u.billingCycle(new Date('2027-02-10T18:00:00Z'), 31)
  assert.equal(jan.start, '2027-01-31')
  assert.equal(jan.end, '2027-02-28')
  const first = u.billingCycle(new Date('2026-11-01T07:00:00Z'), 1)
  assert.equal(first.start, '2026-11-01')
})

test('counts per day skip non-counted modes and old runs; merging never lowers a day', () => {
  const since = new Date('2026-11-01T05:00:00Z')
  const daily = u.countByDay([
    { id: '1', mode: 'webhook', startedAt: '2026-11-02T15:00:00Z' },
    { id: '2', mode: 'webhook', startedAt: '2026-11-02T16:00:00Z' },
    { id: '3', mode: 'manual', startedAt: '2026-11-02T16:00:00Z' },
    { id: '4', mode: 'trigger', startedAt: '2026-11-03T03:00:00Z' }, // still Nov 2 in Central
    { id: '5', mode: 'trigger', startedAt: '2026-10-30T12:00:00Z' },
    { id: '6', mode: 'trigger', startedAt: 'not a date' },
  ], since)
  assert.deepEqual(daily, { '2026-11-02': 3 })
  assert.deepEqual(u.mergeDaily({ '2026-11-01': 7, '2026-11-02': 5 }, { '2026-11-02': 3, '2026-11-03': 1 }), { '2026-11-01': 7, '2026-11-02': 5, '2026-11-03': 1 })
  assert.equal(u.sumCycle({ '2026-10-31': 9, '2026-11-01': 2, '2026-11-30': 3, '2026-12-01': 4 }, { start: '2026-11-01', end: '2026-12-01' }), 5)
})

test('usage, status and projection', () => {
  const cycle = u.billingCycle(new Date('2026-11-16T06:00:00Z'), 1) // November (DST ends Nov 1, so 30 days and 1 hour)
  const mid = new Date((cycle.startAt.getTime() + cycle.endAt.getTime()) / 2)
  const half = u.usage(1000, 2500, mid, cycle)
  assert.equal(half.percent, 40)
  assert.equal(half.remaining, 1500)
  assert.equal(half.projected, 2000)
  assert.equal(half.status, 'ok')
  assert.equal(half.daysLeft, 16) // the midpoint is 11:30 pm Nov 15 Central; the cycle resets Dec 1
  assert.equal(u.usage(1300, 2500, mid, cycle).status, 'watch') // on pace for 2,600
  assert.equal(u.usage(2300, 2500, mid, cycle).status, 'high')
  assert.equal(u.usage(2500, 2500, mid, cycle).status, 'over')
  // No projection in the first day of a cycle.
  assert.equal(u.usage(300, 2500, new Date('2026-11-01T12:00:00Z'), cycle).projected, 300)
})

test('alerts only when a threshold is passed or the pace newly goes over', () => {
  const cycle = u.billingCycle(new Date('2026-11-16T06:00:00Z'), 1)
  const mid = new Date((cycle.startAt.getTime() + cycle.endAt.getTime()) / 2)
  const at = (used) => u.usage(used, 2000, mid, cycle)
  assert.deepEqual(u.crossedThresholds(1400, 1900, 2000), [75, 90])
  assert.deepEqual(u.crossedThresholds(1500, 1600, 2000), [])
  const quiet = u.alertDecision({ before: 400, after: at(450), projectedBefore: 800 })
  assert.equal(quiet.send, false)
  const t75 = u.alertDecision({ before: 1490, after: at(1510), projectedBefore: 2980 })
  assert.equal(t75.send, true)
  assert.match(t75.subject, /75%/)
  const full = u.alertDecision({ before: 1990, after: at(2000), projectedBefore: 3900 })
  assert.match(full.subject, /LIMIT REACHED/)
  assert.match(full.reasons.join(' '), /RoofLink/)
  const pace = u.alertDecision({ before: 1000, after: at(1050), projectedBefore: 2000 })
  assert.equal(pace.send, true)
  assert.match(pace.subject, /on pace/)
  const paceAgain = u.alertDecision({ before: 1050, after: at(1100), projectedBefore: 2100 })
  assert.equal(paceAgain.send, false)
  const text = u.alertText(at(1510), t75.reasons)
  assert.match(text, /1,510 of 2,000/)
  assert.match(text, /no lead is lost/)
})
