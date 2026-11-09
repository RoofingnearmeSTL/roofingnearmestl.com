import 'server-only'
import { createGitHubReader, GitHubError, type TreeEntry } from './github'
import { COMPANIES_JSON, changesJsonKey, isNotePath, recommendationsCompany } from './paths'
import { parseNote } from './parse-note'
import { parseRecommendations } from './parse-recommendations'
import { countSitemapLines, humanizeSlug, parseChangesJson, parseCompanies } from './parse-changes'
import type { BrainStore, LinkRow, NoteRow, RecommendationRow, ScanRow } from '../data-store/brain-store'
import { MissingTableError, StoreError } from '../data-store/errors'

export const MAX_NOTES = 2000
export const MAX_FILE_BYTES = 1_000_000
export const MAX_FETCHES_PER_RUN = 400
export const TIME_BUDGET_MS = 45_000
export const WIPE_GUARD_MIN = 20
export const WIPE_GUARD_SHARE = 0.5
export const DEFAULT_REPO = 'RoofingnearmeSTL/Brain-Data'

const REPO_RE = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/
const CONCURRENCY = 6

export type SyncResult = {
  ok: boolean
  status: number
  setup?: 'tables_missing' | 'token_missing' | 'repo_invalid'
  error?: string
  partial?: boolean
  commit?: string
  counts?: Record<string, number>
  skipped?: number
  runId: number | null
}

export type SyncArgs = {
  env: Record<string, string | undefined>
  fetch: typeof fetch
  store: BrainStore
  now?: () => Date
  trigger: 'cron' | 'manual'
  full?: boolean
  allowLargeDelete?: boolean
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  let failed = false
  const worker = async () => {
    while (!failed) {
      const i = next++
      if (i >= items.length) return
      try {
        await fn(items[i])
      } catch (e) {
        failed = true
        throw e
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

const keyOf = (a: string, b: string) => `${a}\u0000${b}`

export async function runBrainSync(args: SyncArgs): Promise<SyncResult> {
  const { env, store, trigger, full = false, allowLargeDelete = false } = args
  const now = args.now ?? (() => new Date())

  // (a) repo
  const repo = env.BRAIN_GITHUB_REPO?.trim() || DEFAULT_REPO
  if (!REPO_RE.test(repo)) {
    return { ok: false, status: 503, setup: 'repo_invalid', error: 'BRAIN_GITHUB_REPO must look like owner/name', runId: null }
  }

  // (b) run row
  let runId: number
  try {
    runId = await store.startRun({ kind: 'brain', trigger })
  } catch (e) {
    if (e instanceof MissingTableError) return { ok: false, status: 503, setup: 'tables_missing', runId: null }
    return { ok: false, status: 500, error: e instanceof StoreError ? e.message : 'Unexpected error', runId: null }
  }

  const fail = async (status: number, error: string, extra: { setup?: SyncResult['setup']; commitSha?: string } = {}): Promise<SyncResult> => {
    try {
      await store.finishRun(runId, { ok: false, error, commitSha: extra.commitSha ?? null })
    } catch {
      // ignore: the original failure is what matters
    }
    return { ok: false, status, error, setup: extra.setup, runId }
  }

  // (c) token
  const token = env.BRAIN_GITHUB_TOKEN?.trim()
  if (!token) return fail(503, 'BRAIN_GITHUB_TOKEN is not set', { setup: 'token_missing' })

  try {
    const reader = createGitHubReader({ token, repo, fetch: args.fetch })
    const started = now().getTime()
    let fetchedCount = 0
    let partial = false
    const skipped: { path: string; reason: string }[] = []
    const canFetch = () => {
      if (fetchedCount >= MAX_FETCHES_PER_RUN || now().getTime() - started > TIME_BUDGET_MS) {
        partial = true
        return false
      }
      fetchedCount++
      return true
    }

    // (d) READ PHASE
    const headSha = await reader.headSha()
    const { entries, truncated } = await reader.tree(headSha)
    if (truncated) return fail(500, 'The Brain repo is too large to list in one call.', { commitSha: headSha })
    const blobs = entries.filter((e) => e.type === 'blob')
    const byPath = new Map<string, TreeEntry>(blobs.map((e) => [e.path, e]))
    const notePaths = blobs.filter((e) => isNotePath(e.path))
    if (notePaths.length > MAX_NOTES) return fail(500, `Too many notes (${notePaths.length} > ${MAX_NOTES}); nothing was changed.`, { commitSha: headSha })
    if (notePaths.length === 0) return fail(500, 'The Brain repo has no notes; nothing was changed.', { commitSha: headSha })

    const allNotePaths = new Set(notePaths.map((e) => e.path))
    const fetchableNotes = notePaths.filter((e) => {
      if (e.size > MAX_FILE_BYTES) {
        skipped.push({ path: e.path, reason: 'too_large' })
        return false
      }
      return true
    })

    const existing = await store.listNotes()
    const existingSha = new Map(existing.map((n) => [n.path, n.gitSha]))
    const changedNotes = fetchableNotes.filter((e) => full || existingSha.get(e.path) !== e.sha)
    const recFiles = fetchableNotes.filter((e) => recommendationsCompany(e.path) !== null)
    const noteFetchSet = new Map<string, TreeEntry>()
    for (const e of recFiles) noteFetchSet.set(e.path, e)
    for (const e of changedNotes) noteFetchSet.set(e.path, e)

    const existingScans = await store.listScans()
    const existingScanSha = new Map(existingScans.map((s) => [keyOf(s.company, s.scan_date), s.git_sha]))
    const treeScans = blobs
      .map((e) => ({ e, k: changesJsonKey(e.path) }))
      .filter((x): x is { e: TreeEntry; k: { company: string; scanDate: string } } => x.k !== null)
    const scansToFetch = treeScans.filter((x) => full || existingScanSha.get(keyOf(x.k.company, x.k.scanDate)) !== x.e.sha)

    // Fetch phase (no store writes).
    const noteTexts = new Map<string, string>()
    let companiesText: string | null = null
    const scanResults: ScanRow[] = []

    const companiesEntry = byPath.get(COMPANIES_JSON)
    if (companiesEntry && companiesEntry.size <= MAX_FILE_BYTES && canFetch()) {
      companiesText = await reader.blobText(companiesEntry.sha)
    }
    const companyNames = companiesText ? parseCompanies(companiesText) : new Map<string, string>()
    const nameOf = (slug: string) => companyNames.get(slug) ?? humanizeSlug(slug)

    await mapLimit([...noteFetchSet.values()], CONCURRENCY, async (e) => {
      if (!canFetch()) return
      noteTexts.set(e.path, await reader.blobText(e.sha))
    })

    const syncedAt = now().toISOString()
    await mapLimit(scansToFetch, CONCURRENCY, async ({ e, k }) => {
      if (!canFetch()) return
      const text = await reader.blobText(e.sha)
      const parsed = parseChangesJson(k.company, k.scanDate, text)
      if (!parsed.ok) {
        skipped.push({ path: e.path, reason: parsed.reason === 'invalid_json' ? 'invalid_json' : 'not_object' })
        return
      }
      const row = parsed.row
      if (row.pages_now === null) {
        const sitemapPath = e.path.replace(/changes\.json$/, 'sitemap-urls.txt')
        const sm = byPath.get(sitemapPath)
        if (sm && sm.size <= MAX_FILE_BYTES && canFetch()) {
          row.pages_now = countSitemapLines(await reader.blobText(sm.sha))
          row.pages_source = 'sitemap-urls.txt'
        }
      }
      scanResults.push({ ...row, company_name: nameOf(k.company), source_path: e.path, git_sha: e.sha, synced_at: syncedAt })
    })

    // (e) PARSE
    const changedAt = now().toISOString()
    const noteRows: NoteRow[] = []
    for (const e of changedNotes) {
      const text = noteTexts.get(e.path)
      if (text === undefined) continue // not fetched (partial run): keep the old copy
      const p = parseNote(e.path, text, allNotePaths)
      noteRows.push({
        path: e.path,
        folder: p.folder,
        title: p.title,
        body: p.body,
        truncated: p.truncated,
        size_bytes: p.sizeBytes,
        links: p.links,
        git_sha: e.sha,
        commit_sha: headSha,
        changed_at: changedAt,
      })
    }

    const recRows: RecommendationRow[] = []
    const parsedCompanies = new Set<string>()
    const treeCompanies = new Set<string>()
    for (const e of notePaths) {
      const c = recommendationsCompany(e.path)
      if (c) treeCompanies.add(c)
    }
    for (const e of recFiles) {
      const text = noteTexts.get(e.path)
      const company = recommendationsCompany(e.path)
      if (text === undefined || !company) continue
      parsedCompanies.add(company)
      for (const r of parseRecommendations(company, text).rows) {
        recRows.push({ ...r, source_path: e.path, synced_at: syncedAt })
      }
    }

    // Deletion planning (still no writes).
    const removedNotes = existing.map((n) => n.path).filter((p) => !allNotePaths.has(p))
    if (!allowLargeDelete && existing.length >= WIPE_GUARD_MIN && removedNotes.length > existing.length * WIPE_GUARD_SHARE) {
      return fail(
        500,
        `Refused to remove ${removedNotes.length} of ${existing.length} notes in one run. Check BRAIN_GITHUB_REPO; if this is intended, run by hand with ?allow_large_delete=1.`,
        { commitSha: headSha },
      )
    }
    const treeScanKeys = new Set(treeScans.map((x) => keyOf(x.k.company, x.k.scanDate)))
    const removedScans =
      treeScans.length === 0 && existingScans.length > 0
        ? []
        : existingScans.filter((s) => !treeScanKeys.has(keyOf(s.company, s.scan_date))).map((s) => ({ company: s.company, scan_date: s.scan_date }))
    const recKeysNow = new Set(recRows.map((r) => keyOf(r.company, r.rec_id)))
    const storedRecs = await store.listRecommendationKeys()
    const staleRecs = storedRecs.filter((k) => {
      if (!treeCompanies.has(k.company)) return true
      return parsedCompanies.has(k.company) && !recKeysNow.has(keyOf(k.company, k.rec_id))
    })

    // (f) WRITE PHASE
    if (noteRows.length) await store.upsertNotes(noteRows)
    if (scanResults.length) await store.upsertScans(scanResults)
    if (recRows.length) await store.upsertRecommendations(recRows)
    if (staleRecs.length) await store.deleteRecommendations(staleRecs)
    if (removedNotes.length) await store.deleteNotes(removedNotes)
    if (removedScans.length) await store.deleteScans(removedScans)

    // Links
    const removedSet = new Set(removedNotes)
    const finalPaths = new Set<string>([...existing.map((n) => n.path).filter((p) => !removedSet.has(p)), ...noteRows.map((r) => r.path)])
    const newLinks = new Map(noteRows.map((r) => [r.path, r.links]))
    const desired = new Map<string, LinkRow>()
    for (const p of finalPaths) {
      const links = newLinks.get(p) ?? existing.find((n) => n.path === p)?.links ?? []
      for (const l of links) {
        if (l.to !== p && finalPaths.has(l.to)) desired.set(keyOf(p, l.to), { from_path: p, to_path: l.to, kind: l.kind })
      }
    }
    const current = await store.listLinks()
    const currentMap = new Map(current.map((l) => [keyOf(l.from_path, l.to_path), l]))
    const linksToDelete = current.filter((l) => !desired.has(keyOf(l.from_path, l.to_path))).map((l) => ({ from_path: l.from_path, to_path: l.to_path }))
    const linksToUpsert = [...desired.entries()].filter(([k, l]) => currentMap.get(k)?.kind !== l.kind).map(([, l]) => l)
    if (linksToDelete.length) await store.deleteLinks(linksToDelete)
    if (linksToUpsert.length) await store.upsertLinks(linksToUpsert)

    // (g) finish
    const counts = {
      notes_total: finalPaths.size,
      notes_changed: noteRows.length,
      notes_removed: removedNotes.length,
      links_total: desired.size,
      links_added: linksToUpsert.filter((l) => !currentMap.has(keyOf(l.from_path, l.to_path))).length,
      links_removed: linksToDelete.length,
      scans_total: treeScans.length,
      scans_changed: scanResults.length,
      scans_removed: removedScans.length,
      recommendations_total: recRows.length,
      recommendations_removed: staleRecs.length,
      files_fetched: fetchedCount,
      files_skipped: skipped.length,
    }
    await store.finishRun(runId, { ok: true, partial, commitSha: headSha, counts, skipped: skipped.slice(0, 100) })
    return { ok: true, status: 200, partial, commit: headSha.slice(0, 7), counts, skipped: skipped.length, runId }
  } catch (e) {
    if (e instanceof GitHubError) return fail(500, e.message)
    if (e instanceof MissingTableError) return fail(503, 'Data store tables are missing', { setup: 'tables_missing' })
    if (e instanceof StoreError) return fail(500, e.message)
    return fail(500, 'Unexpected error')
  }
}
