// n8n usage math (pure, no imports, no environment access), so tests can load it directly.
//
// n8n Cloud plans allow a fixed number of production executions per billing cycle. n8n counts one execution per
// top-level workflow run started by a trigger, webhook, schedule or poll. Manual runs from the editor,
// sub-workflow calls and error-workflow runs are not counted. Failed runs still count. This file mirrors that rule
// so the dashboard and the daily alert agree with n8n's own usage page as closely as possible.

const TZ = 'America/Chicago'
const DAY = 86_400_000

export const ALERT_THRESHOLDS = [75, 90, 100] as const

/** Execution modes n8n does not count toward the plan limit. */
const NOT_COUNTED = new Set(['manual', 'integrated', 'error', 'internal', 'cli', 'evaluation'])

export type Execution = { id: string; mode: string; startedAt: string }

export function countsTowardLimit(mode: unknown): boolean {
  return typeof mode === 'string' && mode.length > 0 && !NOT_COUNTED.has(mode)
}

/** The calendar date (YYYY-MM-DD) in Central time. */
export function centralDate(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** UTC instant of midnight Central on the given YYYY-MM-DD. */
export function centralMidnight(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  // Try both possible offsets (CDT -5, CST -6) and keep the one that lands on that date at 00:00 Central.
  for (const offsetHours of [5, 6]) {
    const guess = new Date(Date.UTC(y, m - 1, d, offsetHours))
    const hour = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).format(guess)
    if (centralDate(guess) === date && Number(hour) === 0) return guess
  }
  return new Date(Date.UTC(y, m - 1, d, 6))
}

function addMonths(date: string, months: number, day: number): string {
  const [y, m] = date.split('-').map(Number)
  const total = y * 12 + (m - 1) + months
  const year = Math.floor(total / 12)
  const month = (total % 12) + 1
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`
}

/** Billing day of month (1-31) from a setting; anything else means 1. */
export function parseBillingDay(raw: unknown): number {
  const n = typeof raw === 'string' ? Number(raw.trim()) : typeof raw === 'number' ? raw : NaN
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : 1
}

/** Monthly execution limit from a setting, or null when missing or not a positive whole number. */
export function parseLimit(raw: unknown): number | null {
  const n = typeof raw === 'string' ? Number(raw.trim().replace(/[,_]/g, '')) : NaN
  return Number.isInteger(n) && n > 0 && n <= 100_000_000 ? n : null
}

/**
 * The current billing cycle in Central dates: start (inclusive) and end (exclusive). A billing day past the end of a
 * short month falls on that month's last day, like most billing systems.
 */
export function billingCycle(now: Date, billingDay: number): { start: string; end: string; startAt: Date; endAt: Date; days: number } {
  const today = centralDate(now)
  const [y, m] = today.split('-').map(Number)
  const thisMonth = addMonths(`${y}-${String(m).padStart(2, '0')}-01`, 0, billingDay)
  const start = today >= thisMonth ? thisMonth : addMonths(thisMonth, -1, billingDay)
  const end = addMonths(start, 1, billingDay)
  const startAt = centralMidnight(start)
  const endAt = centralMidnight(end)
  return { start, end, startAt, endAt, days: Math.round((endAt.getTime() - startAt.getTime()) / DAY) }
}

/** Counted executions per Central date, for executions that started at or after `since`. */
export function countByDay(executions: Execution[], since: Date): Record<string, number> {
  const out: Record<string, number> = {}
  for (const e of executions) {
    if (!countsTowardLimit(e.mode)) continue
    const t = Date.parse(e.startedAt)
    if (!Number.isFinite(t) || t < since.getTime()) continue
    const day = centralDate(new Date(t))
    out[day] = (out[day] ?? 0) + 1
  }
  return out
}

/**
 * Merge stored daily counts with a fresh count. n8n may delete old run history, so a fresh count can be lower than
 * what an earlier check saw; the higher number per day wins and counts never go down.
 */
export function mergeDaily(stored: Record<string, number>, fresh: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = { ...stored }
  for (const [day, n] of Object.entries(fresh)) out[day] = Math.max(out[day] ?? 0, n)
  return out
}

export function sumCycle(daily: Record<string, number>, cycle: { start: string; end: string }): number {
  let total = 0
  for (const [day, n] of Object.entries(daily)) if (day >= cycle.start && day < cycle.end) total += n
  return total
}

export type UsageStatus = 'ok' | 'watch' | 'high' | 'over'

export type Usage = {
  used: number
  limit: number
  percent: number
  remaining: number
  status: UsageStatus
  cycle: { start: string; end: string; days: number }
  daysLeft: number
  projected: number
  projectedPercent: number
}

/** Usage numbers for the cycle. The projection assumes the pace so far continues to the end of the cycle. */
export function usage(used: number, limit: number, now: Date, cycle: { start: string; end: string; startAt: Date; endAt: Date; days: number }): Usage {
  const elapsedMs = Math.max(now.getTime() - cycle.startAt.getTime(), 0)
  const totalMs = cycle.endAt.getTime() - cycle.startAt.getTime()
  // Wait for a full day of data before projecting, so one early burst doesn't look like a crisis.
  const projected = elapsedMs < DAY ? used : Math.round((used / elapsedMs) * totalMs)
  const percent = Math.round((used / limit) * 1000) / 10
  const status: UsageStatus = used >= limit ? 'over' : percent >= 90 ? 'high' : percent >= 75 || projected > limit ? 'watch' : 'ok'
  return {
    used, limit, percent, remaining: Math.max(limit - used, 0), status,
    cycle: { start: cycle.start, end: cycle.end, days: cycle.days },
    // Calendar days until the reset date, counted in Central dates (DST days are 23 or 25 hours long).
    daysLeft: Math.max(Math.round((Date.parse(cycle.end) - Date.parse(centralDate(now))) / DAY), 0),
    projected, projectedPercent: Math.round((projected / limit) * 100),
  }
}

/** Thresholds (percent of the limit) passed when usage went from `before` to `after`. */
export function crossedThresholds(before: number, after: number, limit: number): number[] {
  return ALERT_THRESHOLDS.filter((t) => before < (limit * t) / 100 && after >= (limit * t) / 100)
}

export type AlertDecision = { send: boolean; reasons: string[]; subject: string }

/**
 * Whether the daily check should email. It emails only when something changed since the last check: a threshold was
 * passed, or the projection newly went over the limit. Quiet days send nothing, so the alert can't become noise.
 */
export function alertDecision(args: { before: number; after: Usage; projectedBefore: number | null }): AlertDecision {
  const { after } = args
  const crossed = crossedThresholds(args.before, after.used, after.limit)
  const reasons: string[] = []
  for (const t of crossed) {
    reasons.push(t >= 100
      ? `n8n has used its full plan of ${after.limit.toLocaleString('en-US')} runs for this billing cycle. New leads may stop reaching RoofLink until the cycle resets on ${after.cycle.end} or the plan is raised.`
      : `n8n has used ${t}% of this cycle's ${after.limit.toLocaleString('en-US')} runs.`)
  }
  const newlyProjectedOver = after.used < after.limit && after.projected > after.limit && (args.projectedBefore === null || args.projectedBefore <= after.limit)
  if (newlyProjectedOver && crossed.length === 0) {
    reasons.push(`At the current pace n8n will use about ${after.projected.toLocaleString('en-US')} runs this cycle, over the ${after.limit.toLocaleString('en-US')} in the plan.`)
  }
  const top = crossed.length ? crossed[crossed.length - 1] : null
  const subject = top === 100 ? 'n8n LIMIT REACHED: lead hand-off to RoofLink may stop'
    : top ? `n8n usage at ${top}% of the monthly limit`
      : 'n8n usage on pace to pass the monthly limit'
  return { send: reasons.length > 0, reasons, subject }
}

export function alertText(u: Usage, reasons: string[]): string {
  return [
    ...reasons,
    '',
    `Used so far: ${u.used.toLocaleString('en-US')} of ${u.limit.toLocaleString('en-US')} runs (${u.percent}%).`,
    `Billing cycle: ${u.cycle.start} to ${u.cycle.end} (${u.daysLeft} day${u.daysLeft === 1 ? '' : 's'} left).`,
    `On pace for about ${u.projected.toLocaleString('en-US')} runs by the end of the cycle.`,
    '',
    'What to do: open n8n, Settings, Usage and plan, to see the exact number and raise the plan if needed.',
    'Every lead is still saved on the website and emailed to you even if n8n stops, so no lead is lost; only the RoofLink hand-off would pause.',
    '',
    'Sent by the daily n8n usage check at roofingnearmestl.com/api/n8n-usage-check. Counts leave out manual test runs, like n8n does.',
  ].join('\n')
}
