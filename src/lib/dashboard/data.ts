import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { startOfDayChicago } from './time'
import { isMissingTable, isMissingColumn, safeCode } from '../data-store/errors'
import { isNotePath } from '../brain/paths'

// Dashboard data layer. Every function takes the (possibly null) server client and returns one of three states, so the
// page can show numbers, "not set up yet", or a plain error. Privacy contract: the only lead columns ever selected
// are LEAD_COLUMNS and OPTIONAL_LEAD_COLUMNS, rows are reduced to time/status/source bucket at once, and click-ID
// values never leave this file. Never select '*'.

export const LEAD_COLUMNS = ['created_at', 'status', 'utm_source', 'utm_medium', 'gclid', 'fbclid'] as const
export const OPTIONAL_LEAD_COLUMNS = ['gbraid', 'wbraid'] as const
export const MIGRATION_HINT = 'Run supabase/migrations/20261109120000_data_store_dashboard_v1.sql in the Supabase SQL Editor'

export type NotSetUp = { state: 'not_set_up'; reason: 'supabase' | 'tables'; hint?: string }
export type Failed = { state: 'error'; message: string }
export type Result<T> = ({ state: 'ok'; source: string; checkedAt: string } & T) | NotSetUp | Failed

type Row = Record<string, unknown>
type DbErr = { code?: unknown } | null

function problem(err: DbErr, table: string): NotSetUp | Failed {
  if (isMissingTable(err)) return { state: 'not_set_up', reason: 'tables', hint: MIGRATION_HINT }
  return { state: 'error', message: `Could not read ${table} (${safeCode(err?.code)})` }
}
const noDb = (): NotSetUp => ({ state: 'not_set_up', reason: 'supabase' })
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const DAY = 86_400_000

// ---- Leads -------------------------------------------------------------------------------------------------------

export type LeadSummary = {
  lastLeadAt: string | null
  lastLeadStatus: string | null
  today: number
  last7: number
  last30: number
  byStatus: Record<string, number>
  bySource: { label: string; count: number }[]
  capped: boolean
}

function bucket(row: Row): string {
  const clip = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 40) : null)
  const src = clip(row.utm_source)
  if (src) {
    const med = clip(row.utm_medium)
    return med ? `${src} / ${med}` : src
  }
  if (str(row.gclid) || str(row.gbraid) || str(row.wbraid)) return 'Google Ads click'
  if (str(row.fbclid)) return 'Facebook / Instagram click'
  return 'Direct or unknown'
}

export async function getLeadSummary(db: SupabaseClient | null, now: Date): Promise<Result<LeadSummary>> {
  if (!db) return noDb()
  const since = new Date(now.getTime() - 30 * DAY).toISOString()
  const run = (cols: readonly string[]) =>
    db.from('leads').select(cols.join(',')).gte('created_at', since).order('created_at', { ascending: false }).limit(5000)
  let res = await run([...LEAD_COLUMNS, ...OPTIONAL_LEAD_COLUMNS])
  if (res.error && isMissingColumn(res.error as DbErr)) res = await run(LEAD_COLUMNS)
  if (res.error) return problem(res.error as DbErr, 'leads')
  const rows = ((res.data ?? []) as unknown as Row[]).map((r) => ({
    createdAt: str(r.created_at) ?? '',
    status: str(r.status) ?? 'new',
    source: bucket(r),
  }))
  const last = await db.from('leads').select('created_at,status').neq('status', 'test').order('created_at', { ascending: false }).limit(1)
  if (last.error) return problem(last.error as DbErr, 'leads')
  const lastRow = ((last.data ?? []) as unknown as Row[])[0]

  const dayStart = startOfDayChicago(now).getTime()
  const t7 = now.getTime() - 7 * DAY
  let today = 0, last7 = 0, last30 = 0
  const byStatus: Record<string, number> = {}
  const sources = new Map<string, number>()
  for (const r of rows) {
    const t = Date.parse(r.createdAt)
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
    if (r.status === 'test' || Number.isNaN(t)) continue
    last30++
    if (t >= t7) last7++
    if (t >= dayStart) today++
    sources.set(r.source, (sources.get(r.source) ?? 0) + 1)
  }
  const sorted = [...sources.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  const bySource = sorted.slice(0, 8).map(([label, count]) => ({ label, count }))
  const other = sorted.slice(8).reduce((s, [, c]) => s + c, 0)
  if (other > 0) bySource.push({ label: 'Other', count: other })
  return {
    state: 'ok', source: 'Supabase leads table (time, status and source tags only)', checkedAt: now.toISOString(),
    lastLeadAt: str(lastRow?.created_at), lastLeadStatus: str(lastRow?.status),
    today, last7, last30, byStatus, bySource, capped: rows.length === 5000,
  }
}

// ---- Competitors -------------------------------------------------------------------------------------------------

export type CompetitorScan = {
  company: string; name: string; scanDate: string; comparedWith: string | null
  pagesBefore: number | null; pagesNow: number | null; added: number; removed: number; offerLines: number; syncedAt: string | null
}
export type Recommendation = { company: string; id: string; date: string | null; idea: string; status: string; open: boolean }
export type Competitors = { scans: CompetitorScan[]; open: Recommendation[]; byStatus: Record<string, number> }

export async function getCompetitors(db: SupabaseClient | null): Promise<Result<Competitors>> {
  if (!db) return noDb()
  const scansRes = await db.from('competitor_changes')
    .select('company,company_name,scan_date,compared_with,pages_before,pages_now,pages_source,added_count,removed_count,new_offer_lines,synced_at')
    .order('scan_date', { ascending: false }).limit(300)
  if (scansRes.error) return problem(scansRes.error as DbErr, 'competitor_changes')
  const recRes = await db.from('recommendations')
    .select('company,rec_id,rec_date,idea,evidence,status,status_text,link,is_open,synced_at')
    .order('rec_date', { ascending: false }).limit(500)
  if (recRes.error) return problem(recRes.error as DbErr, 'recommendations')
  const latest = new Map<string, CompetitorScan>()
  for (const r of (scansRes.data ?? []) as unknown as Row[]) {
    const company = str(r.company)
    if (!company || latest.has(company)) continue
    latest.set(company, {
      company, name: str(r.company_name) ?? company, scanDate: str(r.scan_date) ?? '', comparedWith: str(r.compared_with),
      pagesBefore: num(r.pages_before), pagesNow: num(r.pages_now), added: num(r.added_count) ?? 0, removed: num(r.removed_count) ?? 0,
      offerLines: Array.isArray(r.new_offer_lines) ? r.new_offer_lines.length : 0, syncedAt: str(r.synced_at),
    })
  }
  const recs = ((recRes.data ?? []) as unknown as Row[]).map((r) => ({
    company: str(r.company) ?? '', id: str(r.rec_id) ?? '', date: str(r.rec_date), idea: str(r.idea) ?? '',
    status: str(r.status) ?? 'unknown', open: r.is_open === true,
  }))
  const byStatus: Record<string, number> = {}
  for (const r of recs) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
  return {
    state: 'ok', source: 'Brain-Data market/companies/<company>/scans/<date>/changes.json and recommendations.md (daily copy)',
    checkedAt: new Date().toISOString(), scans: [...latest.values()].sort((a, b) => (a.name < b.name ? -1 : 1)),
    open: recs.filter((r) => r.open), byStatus,
  }
}

// ---- Brain -------------------------------------------------------------------------------------------------------

export type SyncRun = { id: number; trigger: string; startedAt: string | null; finishedAt: string | null; state: 'ok' | 'failed' | 'did_not_finish' | 'running'; partial: boolean; commit: string | null; error: string | null; notes: number | null }
export type BrainSummary = { noteCount: number; recent: { path: string; title: string; changedAt: string | null }[]; runs: SyncRun[]; lastOk: SyncRun | null }

export async function getBrainSummary(db: SupabaseClient | null, now: Date = new Date()): Promise<Result<BrainSummary>> {
  if (!db) return noDb()
  const count = await db.from('brain_notes').select('path', { count: 'exact', head: true })
  if (count.error) return problem(count.error as DbErr, 'brain_notes')
  const recent = await db.from('brain_notes').select('path,title,folder,changed_at').order('changed_at', { ascending: false }).limit(12)
  if (recent.error) return problem(recent.error as DbErr, 'brain_notes')
  const runsRes = await db.from('sync_runs')
    .select('id,trigger,started_at,finished_at,ok,partial,commit_sha,counts,error').eq('kind', 'brain').order('started_at', { ascending: false }).limit(5)
  if (runsRes.error) return problem(runsRes.error as DbErr, 'sync_runs')
  const runs: SyncRun[] = ((runsRes.data ?? []) as unknown as Row[]).map((r) => {
    const startedAt = str(r.started_at)
    let state: SyncRun['state'] = r.ok === true ? 'ok' : r.ok === false ? 'failed' : 'running'
    if (state === 'running' && startedAt && now.getTime() - Date.parse(startedAt) > 10 * 60_000) state = 'did_not_finish'
    const counts = (r.counts && typeof r.counts === 'object' ? r.counts : {}) as Row
    return {
      id: num(r.id) ?? 0, trigger: str(r.trigger) ?? 'cron', startedAt, finishedAt: str(r.finished_at), state, partial: r.partial === true,
      commit: str(r.commit_sha)?.slice(0, 7) ?? null, error: str(r.error), notes: num(counts.notes_total),
    }
  })
  return {
    state: 'ok', source: 'Daily copy of GitHub Brain-Data (main) in the Supabase brain_notes table', checkedAt: now.toISOString(),
    noteCount: count.count ?? 0,
    recent: ((recent.data ?? []) as unknown as Row[]).map((r) => ({ path: str(r.path) ?? '', title: str(r.title) ?? '', changedAt: str(r.changed_at) })),
    runs, lastOk: runs.find((r) => r.state === 'ok') ?? null,
  }
}

// ---- Search and notes --------------------------------------------------------------------------------------------

export function cleanQuery(q: unknown): string {
  if (typeof q !== 'string') return ''
  return q.normalize('NFKC').replace(/[^\p{L}\p{N}\s._-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

export type NoteHit = { path: string; title: string; folder: string; changedAt: string | null; snippet: string }

function snippetOf(body: string, q: string): string {
  const first = q.split(' ')[0]
  const at = first ? body.toLowerCase().indexOf(first.toLowerCase()) : -1
  const start = at > 40 ? at - 40 : 0
  return body.slice(start, start + 160).replace(/\s+/g, ' ').trim()
}

export async function searchNotes(db: SupabaseClient | null, raw: unknown): Promise<Result<{ hits: NoteHit[]; query: string }>> {
  const q = cleanQuery(raw)
  if (!q) return { state: 'ok', source: 'brain_notes', checkedAt: new Date().toISOString(), hits: [], query: '' }
  if (!db) return noDb()
  const cols = 'path,title,folder,changed_at,body'
  const escaped = q.replace(/[\\%_]/g, (c) => '\\' + c)
  const titleRes = await db.from('brain_notes').select(cols).ilike('title', `%${escaped}%`).limit(20)
  if (titleRes.error) return problem(titleRes.error as DbErr, 'brain_notes')
  const textRes = await db.from('brain_notes').select(cols).textSearch('search', q, { type: 'websearch', config: 'english' }).limit(20)
  if (textRes.error) return problem(textRes.error as DbErr, 'brain_notes')
  const seen = new Set<string>()
  const hits: NoteHit[] = []
  for (const r of [...((titleRes.data ?? []) as unknown as Row[]), ...((textRes.data ?? []) as unknown as Row[])]) {
    const path = str(r.path)
    if (!path || seen.has(path) || hits.length >= 20) continue
    seen.add(path)
    hits.push({ path, title: str(r.title) ?? path, folder: str(r.folder) ?? '', changedAt: str(r.changed_at), snippet: snippetOf(str(r.body) ?? '', q) })
  }
  return { state: 'ok', source: 'Daily copy of GitHub Brain-Data (main)', checkedAt: new Date().toISOString(), hits, query: q }
}

export type NoteView = {
  found: boolean
  note?: { path: string; title: string; folder: string; body: string; truncated: boolean; changedAt: string | null; commit: string | null }
  linksTo: { path: string; kind: string }[]
  linkedFrom: { path: string; kind: string }[]
}

export async function getNote(db: SupabaseClient | null, path: unknown): Promise<Result<NoteView>> {
  if (!db) return noDb()
  const ok = typeof path === 'string' && isNotePath(path) && /^[\w .\/-]+$/.test(path)
  const now = new Date().toISOString()
  if (!ok) return { state: 'ok', source: 'brain_notes', checkedAt: now, found: false, linksTo: [], linkedFrom: [] }
  const p = path as string
  const noteRes = await db.from('brain_notes').select('path,title,folder,body,truncated,changed_at,commit_sha').eq('path', p).maybeSingle()
  if (noteRes.error) return problem(noteRes.error as DbErr, 'brain_notes')
  const r = noteRes.data as unknown as Row | null
  if (!r) return { state: 'ok', source: 'brain_notes', checkedAt: now, found: false, linksTo: [], linkedFrom: [] }
  const back = await db.from('brain_links').select('from_path,kind').eq('to_path', p)
  if (back.error) return problem(back.error as DbErr, 'brain_links')
  const out = await db.from('brain_links').select('to_path,kind').eq('from_path', p)
  if (out.error) return problem(out.error as DbErr, 'brain_links')
  return {
    state: 'ok', source: 'Daily copy of GitHub Brain-Data (main)', checkedAt: now, found: true,
    note: { path: str(r.path) ?? p, title: str(r.title) ?? p, folder: str(r.folder) ?? '', body: str(r.body) ?? '', truncated: r.truncated === true, changedAt: str(r.changed_at), commit: str(r.commit_sha)?.slice(0, 7) ?? null },
    linkedFrom: ((back.data ?? []) as unknown as Row[]).map((x) => ({ path: str(x.from_path) ?? '', kind: str(x.kind) ?? 'link' })),
    linksTo: ((out.data ?? []) as unknown as Row[]).map((x) => ({ path: str(x.to_path) ?? '', kind: str(x.kind) ?? 'link' })),
  }
}

export type GraphData = { nodes: { id: string; title: string; group: string }[]; edges: { from: string; to: string }[] }

export async function getGraph(db: SupabaseClient | null): Promise<Result<GraphData>> {
  if (!db) return noDb()
  const notes = await db.from('brain_notes').select('path,title,folder').order('path', { ascending: true }).limit(2000)
  if (notes.error) return problem(notes.error as DbErr, 'brain_notes')
  const links = await db.from('brain_links').select('from_path,to_path').limit(10000)
  if (links.error) return problem(links.error as DbErr, 'brain_links')
  return {
    state: 'ok', source: 'Daily copy of GitHub Brain-Data (main)', checkedAt: new Date().toISOString(),
    nodes: ((notes.data ?? []) as unknown as Row[]).map((r) => {
      const path = str(r.path) ?? ''
      return { id: path, title: str(r.title) ?? path, group: path.includes('/') ? path.split('/')[0] : 'root' }
    }),
    edges: ((links.data ?? []) as unknown as Row[]).map((r) => ({ from: str(r.from_path) ?? '', to: str(r.to_path) ?? '' })),
  }
}
