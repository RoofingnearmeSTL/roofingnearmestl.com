import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isMissingTable, safeCode } from '../data-store/errors'
import { fetchExecutionsSince, n8nSettings, N8nError } from './client'
import { billingCycle, centralDate, countByDay, mergeDaily, parseBillingDay, parseLimit, sumCycle, usage, type Usage } from './usage'

// One n8n usage check, shared by the daily alert (/api/n8n-usage-check) and the owner dashboard.
// Daily counts are kept in the data store's metrics_daily table (source n8n, metric executions), because n8n may
// delete older run history: a count kept each day can't shrink later. Without the data store it still works from
// n8n's own history, and says the number may be low.

const SOURCE = 'n8n'
const METRIC = 'executions'
const RUN_KIND = 'n8n_usage'

export type UsageCheck =
  | { state: 'not_set_up'; missing: string[] }
  | {
    state: 'ok'
    usage: Usage
    /** Used count kept from earlier checks, before this one (null when nothing is kept). */
    usedBefore: number | null
    /** Projection from the last check (null when unknown). */
    projectedBefore: number | null
    /** Counted runs in the last 24 hours. */
    last24h: number
    stored: boolean
    complete: boolean
    lastCheckAt: string | null
    warning: string | null
    checkedAt: string
  }
  | { state: 'error'; message: string; lastCheckAt: string | null }

type Env = Record<string, string | undefined>

async function loadDaily(db: SupabaseClient, start: string, end: string): Promise<Record<string, number> | null> {
  const res = await db.from('metrics_daily').select('metric_date,value')
    .eq('source', SOURCE).eq('metric', METRIC).eq('dimension', '')
    .gte('metric_date', start).lt('metric_date', end).limit(400)
  if (res.error) {
    if (isMissingTable(res.error)) return null
    throw new N8nError(`Could not read metrics_daily (${safeCode(res.error.code)})`)
  }
  const out: Record<string, number> = {}
  for (const r of (res.data ?? []) as { metric_date?: unknown; value?: unknown }[]) {
    const v = Number(r.value)
    if (typeof r.metric_date === 'string' && Number.isFinite(v)) out[r.metric_date] = v
  }
  return out
}

async function lastRun(db: SupabaseClient): Promise<{ at: string | null; projected: number | null }> {
  const res = await db.from('sync_runs').select('finished_at,counts').eq('kind', RUN_KIND).eq('ok', true)
    .order('started_at', { ascending: false }).limit(1)
  if (res.error || !res.data?.length) return { at: null, projected: null }
  const row = res.data[0] as { finished_at?: unknown; counts?: Record<string, unknown> }
  const p = Number(row.counts?.projected)
  return { at: typeof row.finished_at === 'string' ? row.finished_at : null, projected: Number.isFinite(p) ? p : null }
}

export async function checkN8nUsage(args: {
  env: Env
  db: SupabaseClient | null
  now?: Date
  /** Save today's counts and record the run (the daily check does; the dashboard only reads). */
  save: boolean
  trigger?: 'cron' | 'manual'
  fetch?: typeof fetch
}): Promise<UsageCheck> {
  const now = args.now ?? new Date()
  const { settings, missing } = n8nSettings(args.env)
  const limit = parseLimit(args.env.N8N_MONTHLY_EXECUTION_LIMIT)
  if (!settings || !limit) {
    const names = [...missing]
    if (!limit && args.env.N8N_MONTHLY_EXECUTION_LIMIT && !names.includes('N8N_MONTHLY_EXECUTION_LIMIT')) names.push('N8N_MONTHLY_EXECUTION_LIMIT (a whole number, e.g. 2500)')
    return { state: 'not_set_up', missing: names }
  }
  const cycle = billingCycle(now, parseBillingDay(args.env.N8N_BILLING_DAY))
  const db = args.db

  let stored: Record<string, number> | null = null
  let previous: { at: string | null; projected: number | null } = { at: null, projected: null }
  try {
    if (db) {
      stored = await loadDaily(db, cycle.start, cycle.end)
      if (stored) previous = await lastRun(db)
    }
  } catch (e) {
    return { state: 'error', message: e instanceof N8nError ? e.message : 'Could not read the data store.', lastCheckAt: null }
  }

  let fresh: Record<string, number>
  let complete: boolean
  let last24h = 0
  try {
    const result = await fetchExecutionsSince(settings, cycle.startAt, { fetch: args.fetch })
    fresh = countByDay(result.executions, cycle.startAt)
    complete = result.complete
    last24h = Object.values(countByDay(result.executions, new Date(now.getTime() - 86_400_000))).reduce((a, b) => a + b, 0)
  } catch (e) {
    return { state: 'error', message: e instanceof N8nError ? e.message : 'Unexpected error while reading n8n.', lastCheckAt: previous.at }
  }

  const merged = mergeDaily(stored ?? {}, fresh)
  const usedBefore = stored ? sumCycle(stored, cycle) : null
  const u = usage(sumCycle(merged, cycle), limit, now, cycle)
  let warning: string | null = null
  if (!stored) warning = 'Counted from n8n\'s own run history only (the data store is not set up), so this may be lower than n8n\'s usage page if n8n has deleted older runs.'
  if (!complete) warning = 'n8n has more runs than this check reads in one go; the real number is at least this high.'

  if (args.save && db && stored) {
    const today = centralDate(now)
    const rows = Object.entries(merged)
      .filter(([day, n]) => day >= cycle.start && day <= today && n !== stored![day])
      .map(([day, n]) => ({ metric_date: day, source: SOURCE, metric: METRIC, dimension: '', value: n, recorded_at: now.toISOString() }))
    if (rows.length) {
      const up = await db.from('metrics_daily').upsert(rows, { onConflict: 'metric_date,source,metric,dimension' })
      if (up.error) return { state: 'error', message: `Could not save to metrics_daily (${safeCode(up.error.code)})`, lastCheckAt: previous.at }
    }
    await db.from('sync_runs').insert({
      kind: RUN_KIND, trigger: args.trigger ?? 'cron', started_at: now.toISOString(), finished_at: new Date().toISOString(), ok: true,
      partial: !complete, counts: { used: u.used, limit: u.limit, projected: u.projected, days_saved: rows.length },
    })
  }

  return {
    state: 'ok', usage: u, usedBefore, projectedBefore: previous.projected, last24h, stored: !!stored, complete,
    lastCheckAt: previous.at, warning, checkedAt: now.toISOString(),
  }
}
