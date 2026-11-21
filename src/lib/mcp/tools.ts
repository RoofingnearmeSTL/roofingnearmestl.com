import type { SupabaseClient } from '@supabase/supabase-js'
import { MissingTableError, StoreError, isMissingTable, safeCode } from '../data-store/errors'

// Read-only MCP tools over the existing data store (DATA-03/DATA-04 tables + the leads table). Each tool is a pure
// function of a Supabase client and its arguments, so it is unit-testable with a mocked client (tests/mcp.test.mjs).
// Nothing here opens the data to the public: the route handler (src/app/api/mcp/route.ts) gates every call behind the
// MCP_AUTH_TOKEN bearer, and serverSupabase() uses the server-only service-role key. Queries are read-only (no insert,
// update, delete). Column lists are explicit allow-lists; never select '*'. "Tables not set up" is handled by the
// dispatcher (null client / MissingTableError) as a clear tool result, never a crash.

export const MIGRATION_HINT =
  'Run supabase/migrations/20261109120000_data_store_dashboard_v1.sql in the Supabase SQL Editor'

type Args = Record<string, unknown>
type Row = Record<string, unknown>
type DbErr = { code?: unknown } | null | undefined

const DAY = 86_400_000
const REC_STATUSES = new Set(['proposed', 'approved', 'in_progress', 'done', 'declined', 'still_recommended', 'unknown'])
const COMPANY_RE = /^[a-z0-9-]{1,80}$/
const SOURCE_RE = /^[a-z0-9_]{1,40}$/
const METRIC_RE = /^[a-z0-9_]{1,60}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Throw a typed error on a Supabase error so the dispatcher can shape it; otherwise return nothing.
function throwOn(error: DbErr, table: string): void {
  if (!error) return
  if (isMissingTable(error)) throw new MissingTableError()
  throw new StoreError(`read ${table}`, safeCode(error && typeof error === 'object' ? error.code : undefined))
}

function intArg(v: unknown, def: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  if (!Number.isFinite(n)) return def
  return Math.min(max, Math.max(min, Math.trunc(n)))
}
function strArg(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}
function boolArg(v: unknown, def: boolean): boolean {
  return typeof v === 'boolean' ? v : def
}
function matchArg(v: unknown, re: RegExp): string | undefined {
  const s = strArg(v, 80)
  return s && re.test(s) ? s : undefined
}
function sinceIso(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString()
}
function arr(v: unknown, cap: number): unknown[] {
  return Array.isArray(v) ? v.slice(0, cap) : []
}
function snippet(body: unknown): string {
  return (typeof body === 'string' ? body : '').replace(/\s+/g, ' ').trim().slice(0, 240)
}

export type ToolDef = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  run: (client: SupabaseClient, args: Args) => Promise<unknown>
}

export const TOOL_DEFS: ToolDef[] = [
  {
    name: 'brain_search',
    description:
      'Full-text search Mike\'s Brain-Data notes (business memory: decisions, playbooks, roadmap). Returns path, title, folder and a short body snippet for each hit.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search words (full-text / websearch syntax).' },
        limit: { type: 'integer', description: 'Max results (1-50).', default: 8, minimum: 1, maximum: 50 },
      },
      required: ['query'],
      additionalProperties: false,
    },
    async run(client, args) {
      const query = strArg(args.query, 200)
      const limit = intArg(args.limit, 8, 1, 50)
      if (!query) return { query: '', results: [] }
      const res = await client
        .from('brain_notes')
        .select('path,title,folder,body,changed_at')
        .textSearch('search', query, { type: 'websearch', config: 'english' })
        .limit(limit)
      throwOn(res.error as DbErr, 'brain_notes')
      const rows = (res.data ?? []) as unknown as Row[]
      return {
        query,
        results: rows.map((r) => ({
          path: r.path ?? '',
          title: r.title ?? r.path ?? '',
          folder: r.folder ?? '',
          changed_at: r.changed_at ?? null,
          snippet: snippet(r.body),
        })),
      }
    },
  },
  {
    name: 'brain_note',
    description: 'Fetch the full body of one Brain-Data note by its path (e.g. "docs/memory/decisions.md").',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Exact note path.' } },
      required: ['path'],
      additionalProperties: false,
    },
    async run(client, args) {
      const path = strArg(args.path, 400)
      if (!path) return { found: false, path: '' }
      const res = await client
        .from('brain_notes')
        .select('path,title,folder,body,truncated,changed_at,commit_sha')
        .eq('path', path)
        .maybeSingle()
      throwOn(res.error as DbErr, 'brain_notes')
      const r = (res.data ?? null) as Row | null
      if (!r) return { found: false, path }
      return {
        found: true,
        note: {
          path: r.path ?? path,
          title: r.title ?? path,
          folder: r.folder ?? '',
          body: typeof r.body === 'string' ? r.body : '',
          truncated: r.truncated === true,
          changed_at: r.changed_at ?? null,
          commit: typeof r.commit_sha === 'string' ? r.commit_sha.slice(0, 7) : null,
        },
      }
    },
  },
  {
    name: 'brain_recent',
    description: 'List the most recently changed Brain-Data notes (by changed_at, newest first).',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'integer', description: 'Look back this many days.', default: 14, minimum: 1, maximum: 3650 },
        limit: { type: 'integer', description: 'Max notes (1-200).', default: 20, minimum: 1, maximum: 200 },
      },
      additionalProperties: false,
    },
    async run(client, args) {
      const days = intArg(args.days, 14, 1, 3650)
      const limit = intArg(args.limit, 20, 1, 200)
      const since = sinceIso(days)
      const res = await client
        .from('brain_notes')
        .select('path,title,folder,changed_at')
        .gte('changed_at', since)
        .order('changed_at', { ascending: false })
        .limit(limit)
      throwOn(res.error as DbErr, 'brain_notes')
      const rows = (res.data ?? []) as unknown as Row[]
      return {
        days,
        since,
        notes: rows.map((r) => ({
          path: r.path ?? '',
          title: r.title ?? r.path ?? '',
          folder: r.folder ?? '',
          changed_at: r.changed_at ?? null,
        })),
      }
    },
  },
  {
    name: 'competitor_intel',
    description:
      'Recent competitor scan changes (added/removed pages and offer lines) from the weekly competitor crawl copy. Optionally filter by company slug.',
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'Company slug (lowercase, a-z0-9-). Omit for all.' },
        limit: { type: 'integer', description: 'Max scans (1-200).', default: 20, minimum: 1, maximum: 200 },
      },
      additionalProperties: false,
    },
    async run(client, args) {
      const limit = intArg(args.limit, 20, 1, 200)
      const company = matchArg(args.company, COMPANY_RE)
      let q = client
        .from('competitor_changes')
        .select(
          'company,company_name,scan_date,compared_with,pages_before,pages_now,added_count,removed_count,new_offer_lines,removed_offer_lines,synced_at',
        )
        .order('scan_date', { ascending: false })
        .limit(limit)
      if (company) q = q.eq('company', company)
      const res = await q
      throwOn(res.error as DbErr, 'competitor_changes')
      const rows = (res.data ?? []) as unknown as Row[]
      return {
        company: company ?? null,
        scans: rows.map((r) => ({
          company: r.company ?? '',
          company_name: r.company_name ?? r.company ?? '',
          scan_date: r.scan_date ?? null,
          compared_with: r.compared_with ?? null,
          pages_before: typeof r.pages_before === 'number' ? r.pages_before : null,
          pages_now: typeof r.pages_now === 'number' ? r.pages_now : null,
          added: typeof r.added_count === 'number' ? r.added_count : 0,
          removed: typeof r.removed_count === 'number' ? r.removed_count : 0,
          new_offer_lines: arr(r.new_offer_lines, 50),
          removed_offer_lines: arr(r.removed_offer_lines, 50),
          synced_at: r.synced_at ?? null,
        })),
      }
    },
  },
  {
    name: 'recommendations_list',
    description:
      'List growth/SEO recommendations drawn from competitor analysis. Defaults to open items only; filter by status or company.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'One of: proposed, approved, in_progress, done, declined, still_recommended, unknown.',
        },
        open_only: { type: 'boolean', description: 'Only items not done/declined.', default: true },
        company: { type: 'string', description: 'Company slug (lowercase, a-z0-9-).' },
        limit: { type: 'integer', description: 'Max rows (1-500).', default: 50, minimum: 1, maximum: 500 },
      },
      additionalProperties: false,
    },
    async run(client, args) {
      const limit = intArg(args.limit, 50, 1, 500)
      const openOnly = boolArg(args.open_only, true)
      const status = matchArg(args.status, /^[a-z_]{1,30}$/)
      const company = matchArg(args.company, COMPANY_RE)
      let q = client
        .from('recommendations')
        .select('company,rec_id,rec_date,idea,evidence,status,status_text,link,is_open')
        .order('rec_date', { ascending: false })
        .limit(limit)
      if (openOnly) q = q.eq('is_open', true)
      if (status && REC_STATUSES.has(status)) q = q.eq('status', status)
      if (company) q = q.eq('company', company)
      const res = await q
      throwOn(res.error as DbErr, 'recommendations')
      const rows = (res.data ?? []) as unknown as Row[]
      return {
        open_only: openOnly,
        status: status && REC_STATUSES.has(status) ? status : null,
        company: company ?? null,
        recommendations: rows.map((r) => ({
          company: r.company ?? '',
          rec_id: r.rec_id ?? '',
          rec_date: r.rec_date ?? null,
          idea: typeof r.idea === 'string' ? r.idea : '',
          evidence: typeof r.evidence === 'string' ? r.evidence : null,
          status: r.status ?? 'unknown',
          status_text: typeof r.status_text === 'string' ? r.status_text : null,
          link: typeof r.link === 'string' ? r.link : null,
          is_open: r.is_open === true,
        })),
      }
    },
  },
  {
    name: 'metrics',
    description:
      'Daily business metrics (ad/GA4/call/website totals) from metrics_daily. Filter by source, metric and a since date (YYYY-MM-DD).',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'e.g. google_ads, ga4, meta_ads, calls, website.' },
        metric: { type: 'string', description: 'e.g. clicks, cost_usd, sessions, calls_answered.' },
        since: { type: 'string', description: 'Earliest metric_date, YYYY-MM-DD.' },
      },
      additionalProperties: false,
    },
    async run(client, args) {
      const source = matchArg(args.source, SOURCE_RE)
      const metric = matchArg(args.metric, METRIC_RE)
      const sinceRaw = strArg(args.since, 10)
      const since = DATE_RE.test(sinceRaw) ? sinceRaw : undefined
      let q = client
        .from('metrics_daily')
        .select('metric_date,source,metric,dimension,value')
        .order('metric_date', { ascending: false })
        .limit(500)
      if (source) q = q.eq('source', source)
      if (metric) q = q.eq('metric', metric)
      if (since) q = q.gte('metric_date', since)
      const res = await q
      throwOn(res.error as DbErr, 'metrics_daily')
      const rows = (res.data ?? []) as unknown as Row[]
      return {
        source: source ?? null,
        metric: metric ?? null,
        since: since ?? null,
        rows: rows.map((r) => ({
          metric_date: r.metric_date ?? null,
          source: r.source ?? '',
          metric: r.metric ?? '',
          dimension: r.dimension ?? '',
          value: typeof r.value === 'number' ? r.value : Number(r.value ?? 0),
        })),
      }
    },
  },
  {
    name: 'leads_recent',
    description:
      'Recent leads from Mike\'s own site (contact + job details). This is the owner\'s private CRM data, returned only to the bearer-token holder and never published. Newest first.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'integer', description: 'Look back this many days.', default: 14, minimum: 1, maximum: 365 },
        limit: { type: 'integer', description: 'Max leads (1-200).', default: 50, minimum: 1, maximum: 200 },
      },
      additionalProperties: false,
    },
    async run(client, args) {
      const days = intArg(args.days, 14, 1, 365)
      const limit = intArg(args.limit, 50, 1, 200)
      const since = sinceIso(days)
      // Explicit allow-list of base leads columns a roofer needs to act on a lead. No click-IDs/landing URLs, no '*'.
      const cols =
        'created_at,status,name,phone,email,address,city,service_type,issue_type,message,emergency,utm_source,utm_medium'
      const res = await client
        .from('leads')
        .select(cols)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit)
      throwOn(res.error as DbErr, 'leads')
      const rows = (res.data ?? []) as unknown as Row[]
      return {
        days,
        since,
        count: rows.length,
        leads: rows.map((r) => ({
          created_at: r.created_at ?? null,
          status: r.status ?? 'new',
          name: r.name ?? null,
          phone: r.phone ?? null,
          email: r.email ?? null,
          address: r.address ?? null,
          city: r.city ?? null,
          service_type: r.service_type ?? null,
          issue_type: r.issue_type ?? null,
          message: r.message ?? null,
          emergency: r.emergency === true,
          source: r.utm_source ?? null,
          medium: r.utm_medium ?? null,
        })),
      }
    },
  },
  {
    name: 'business_snapshot',
    description:
      'One-call summary: open-recommendation count, leads in the last 14 days, latest competitor scan date, and the latest sync run status.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async run(client) {
      const since = sinceIso(14)
      const openRecs = await client.from('recommendations').select('rec_id', { count: 'exact', head: true }).eq('is_open', true)
      throwOn(openRecs.error as DbErr, 'recommendations')
      const leads14 = await client.from('leads').select('created_at', { count: 'exact', head: true }).gte('created_at', since)
      throwOn(leads14.error as DbErr, 'leads')
      const scan = await client.from('competitor_changes').select('scan_date').order('scan_date', { ascending: false }).limit(1)
      throwOn(scan.error as DbErr, 'competitor_changes')
      const run = await client
        .from('sync_runs')
        .select('kind,started_at,finished_at,ok,partial')
        .order('started_at', { ascending: false })
        .limit(1)
      throwOn(run.error as DbErr, 'sync_runs')
      const scanRow = ((scan.data ?? []) as unknown as Row[])[0] ?? null
      const runRow = ((run.data ?? []) as unknown as Row[])[0] ?? null
      const state = runRow ? (runRow.ok === true ? 'ok' : runRow.ok === false ? 'failed' : 'running') : null
      return {
        open_recommendations: typeof openRecs.count === 'number' ? openRecs.count : 0,
        leads_last_14_days: typeof leads14.count === 'number' ? leads14.count : 0,
        latest_competitor_scan: scanRow ? (scanRow.scan_date ?? null) : null,
        latest_sync_run: runRow
          ? {
              kind: runRow.kind ?? null,
              started_at: runRow.started_at ?? null,
              finished_at: runRow.finished_at ?? null,
              state,
              partial: runRow.partial === true,
            }
          : null,
      }
    },
  },
]

export const TOOLS: Map<string, ToolDef> = new Map(TOOL_DEFS.map((t) => [t.name, t]))

// Public listing (MCP tools/list): name, description and input schema only — never the run implementation.
export function toolList(): { name: string; description: string; inputSchema: Record<string, unknown> }[] {
  return TOOL_DEFS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))
}
