// Scraping activity for the owner dashboard: which competitor sites the weekly market watch reads, when each was
// last scanned (from the daily Brain copy of main), and which weekly scans are still waiting on their own branch
// for Mike to merge. Pure helpers first; the GitHub read is at the bottom.
import type { CompetitorScan } from './data'

export type TrackedCompany = { slug: string; name: string; domain: string; home: string | null }

export type ScrapeRow = {
  slug: string
  name: string
  domain: string
  /** "weekly" = read by the Monday job; "by_hand" = the site blocks simple fetches, read monthly in a browser. */
  how: 'weekly' | 'by_hand'
  lastScan: string | null
  status: 'current' | 'overdue' | 'never' | 'by_hand'
  pagesNow: number | null
  added: number
  removed: number
}

const DAY = 86_400_000
/** A weekly scan older than this many days is overdue (Monday job plus a couple of days to review and merge). */
export const OVERDUE_DAYS = 10

export function parseCompanies(text: string): TrackedCompany[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return []
  }
  const list = (data as { companies?: unknown } | null)?.companies
  if (!Array.isArray(list)) return []
  const out: TrackedCompany[] = []
  for (const c of list as Record<string, unknown>[]) {
    if (!c || typeof c.slug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(c.slug)) continue
    out.push({
      slug: c.slug,
      name: typeof c.name === 'string' ? c.name.slice(0, 100) : c.slug,
      domain: typeof c.domain === 'string' ? c.domain.slice(0, 100) : '',
      home: typeof c.home === 'string' && /^https:\/\//.test(c.home) ? c.home.slice(0, 200) : null,
    })
  }
  return out.slice(0, 100)
}

export function scrapeRows(companies: TrackedCompany[], scans: CompetitorScan[], now: Date): ScrapeRow[] {
  const bySlug = new Map(scans.map((s) => [s.company, s]))
  const rows = companies.map((c): ScrapeRow => {
    const s = bySlug.get(c.slug)
    const lastScan = s?.scanDate || null
    const how = c.home ? 'weekly' : 'by_hand'
    let status: ScrapeRow['status'] = how === 'by_hand' ? 'by_hand' : 'never'
    if (how === 'weekly' && lastScan) status = now.getTime() - Date.parse(lastScan + 'T00:00:00Z') > OVERDUE_DAYS * DAY ? 'overdue' : 'current'
    return { slug: c.slug, name: c.name, domain: c.domain, how, lastScan, status, pagesNow: s?.pagesNow ?? null, added: s?.added ?? 0, removed: s?.removed ?? 0 }
  })
  // Companies scanned but no longer in the list still show, so nothing silently disappears.
  for (const s of scans) {
    if (companies.some((c) => c.slug === s.company)) continue
    rows.push({ slug: s.company, name: s.name, domain: '', how: 'weekly', lastScan: s.scanDate || null, status: 'overdue', pagesNow: s.pagesNow, added: s.added, removed: s.removed })
  }
  return rows
}

/** Weekly scan branches (market-watch/YYYY-MM-DD) newer than the newest scan already on main, newest first. */
export function waitingScans(branches: string[], scans: CompetitorScan[]): string[] {
  const newestMerged = scans.reduce((m, s) => (s.scanDate > m ? s.scanDate : m), '')
  return branches
    .map((b) => /^market-watch\/(\d{4}-\d{2}-\d{2})$/.exec(b)?.[1] ?? null)
    .filter((d): d is string => !!d && d > newestMerged)
    .sort()
    .reverse()
}
