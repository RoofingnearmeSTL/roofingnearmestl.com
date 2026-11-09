import type { SupabaseClient } from '@supabase/supabase-js'
import { MissingTableError, StoreError, isMissingTable, safeCode } from './errors'

export type NoteRow = {
  path: string
  folder: string
  title: string
  body: string
  truncated: boolean
  size_bytes: number
  links: { to: string; kind: string }[]
  git_sha: string
  commit_sha: string | null
  changed_at: string
}
export type LinkRow = { from_path: string; to_path: string; kind: string }
export type ScanRow = Record<string, unknown> & { company: string; scan_date: string; git_sha: string }
export type RecommendationRow = Record<string, unknown> & { company: string; rec_id: string }

export type RunResult = {
  ok: boolean
  partial?: boolean
  commitSha?: string | null
  counts?: Record<string, number>
  skipped?: { path: string; reason: string }[]
  error?: string | null
}

export interface BrainStore {
  startRun(a: { kind: string; trigger: 'cron' | 'manual' }): Promise<number>
  finishRun(id: number, r: RunResult): Promise<void>
  listNotes(): Promise<{ path: string; gitSha: string; links: { to: string; kind: string }[] }[]>
  upsertNotes(rows: NoteRow[]): Promise<void>
  deleteNotes(paths: string[]): Promise<void>
  listLinks(): Promise<LinkRow[]>
  upsertLinks(rows: LinkRow[]): Promise<void>
  deleteLinks(pairs: { from_path: string; to_path: string }[]): Promise<void>
  listScans(): Promise<{ company: string; scan_date: string; git_sha: string }[]>
  upsertScans(rows: ScanRow[]): Promise<void>
  deleteScans(keys: { company: string; scan_date: string }[]): Promise<void>
  listRecommendationKeys(): Promise<{ company: string; rec_id: string }[]>
  upsertRecommendations(rows: RecommendationRow[]): Promise<void>
  deleteRecommendations(keys: { company: string; rec_id: string }[]): Promise<void>
}

const PAGE = 1000
const chunks = <T,>(a: T[], n: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n))
  return out
}

export function createSupabaseBrainStore(client: SupabaseClient): BrainStore {
  function check(op: string, error: { code?: unknown } | null) {
    if (!error) return
    if (isMissingTable(error)) throw new MissingTableError()
    throw new StoreError(op, safeCode(error.code))
  }

  async function paged<T>(op: string, table: string, columns: string): Promise<T[]> {
    const all: T[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await client.from(table).select(columns).range(from, from + PAGE - 1)
      check(op, error)
      const page = (data ?? []) as unknown as T[]
      all.push(...page)
      if (page.length < PAGE) break
    }
    return all
  }

  return {
    async startRun({ kind, trigger }) {
      const { data, error } = await client.from('sync_runs').insert({ kind, trigger }).select('id').single()
      check('start run', error)
      return (data as { id: number }).id
    },
    async finishRun(id, r) {
      const { error } = await client
        .from('sync_runs')
        .update({
          finished_at: new Date().toISOString(),
          ok: r.ok,
          partial: r.partial ?? false,
          commit_sha: r.commitSha ?? null,
          counts: r.counts ?? {},
          skipped: r.skipped ?? [],
          error: r.error ? r.error.slice(0, 500) : null,
        })
        .eq('id', id)
      check('finish run', error)
    },
    async listNotes() {
      const rows = await paged<{ path: string; git_sha: string; links: { to: string; kind: string }[] }>('read notes', 'brain_notes', 'path,git_sha,links')
      return rows.map((r) => ({ path: r.path, gitSha: r.git_sha, links: Array.isArray(r.links) ? r.links : [] }))
    },
    async upsertNotes(rows) {
      for (const batch of chunks(rows, 50)) {
        const { error } = await client.from('brain_notes').upsert(batch, { onConflict: 'path' })
        check('save notes', error)
      }
    },
    async deleteNotes(paths) {
      for (const c of chunks(paths, 100)) {
        const { error } = await client.from('brain_notes').delete().in('path', c)
        check('delete notes', error)
      }
    },
    listLinks: () => paged<LinkRow>('read links', 'brain_links', 'from_path,to_path,kind'),
    async upsertLinks(rows) {
      for (const batch of chunks(rows, 500)) {
        const { error } = await client.from('brain_links').upsert(batch, { onConflict: 'from_path,to_path' })
        check('save links', error)
      }
    },
    async deleteLinks(pairs) {
      const byFrom = new Map<string, string[]>()
      for (const p of pairs) byFrom.set(p.from_path, [...(byFrom.get(p.from_path) ?? []), p.to_path])
      for (const [from, tos] of byFrom) {
        for (const c of chunks(tos, 100)) {
          const { error } = await client.from('brain_links').delete().eq('from_path', from).in('to_path', c)
          check('delete links', error)
        }
      }
    },
    listScans: () => paged('read scans', 'competitor_changes', 'company,scan_date,git_sha'),
    async upsertScans(rows) {
      for (const batch of chunks(rows, 50)) {
        const { error } = await client.from('competitor_changes').upsert(batch, { onConflict: 'company,scan_date' })
        check('save scans', error)
      }
    },
    async deleteScans(keys) {
      const byCompany = new Map<string, string[]>()
      for (const k of keys) byCompany.set(k.company, [...(byCompany.get(k.company) ?? []), k.scan_date])
      for (const [company, dates] of byCompany) {
        for (const c of chunks(dates, 100)) {
          const { error } = await client.from('competitor_changes').delete().eq('company', company).in('scan_date', c)
          check('delete scans', error)
        }
      }
    },
    listRecommendationKeys: () => paged('read recommendations', 'recommendations', 'company,rec_id'),
    async upsertRecommendations(rows) {
      for (const batch of chunks(rows, 200)) {
        const { error } = await client.from('recommendations').upsert(batch, { onConflict: 'company,rec_id' })
        check('save recommendations', error)
      }
    },
    async deleteRecommendations(keys) {
      const byCompany = new Map<string, string[]>()
      for (const k of keys) byCompany.set(k.company, [...(byCompany.get(k.company) ?? []), k.rec_id])
      for (const [company, ids] of byCompany) {
        for (const c of chunks(ids, 100)) {
          const { error } = await client.from('recommendations').delete().eq('company', company).in('rec_id', c)
          check('delete recommendations', error)
        }
      }
    },
  }
}
