// Parses market/companies/<slug>/scans/<date>/changes.json (three historical shapes). Pure, no imports.

export type ChangeRow = {
  company: string
  scan_date: string
  compared_with: string | null
  pages_before: number | null
  pages_now: number | null
  pages_source: 'changes.json' | 'sitemap-urls.txt' | null
  sitemap_read: boolean | null
  homepage: string | null
  added_count: number
  removed_count: number
  added: string[]
  removed: string[]
  new_offer_lines: string[]
  removed_offer_lines: string[]
  robots_skipped: string[]
}

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const nonNegInt = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null)
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const strings = (v: unknown, max: number, each: number, urlOnly = false): string[] =>
  arr(v)
    .filter((x): x is string => typeof x === 'string' && (!urlOnly || /^https?:\/\//i.test(x)))
    .slice(0, max)
    .map((s) => (s.length > each ? s.slice(0, each) : s))

export function parseChangesJson(
  company: string,
  scanDate: string,
  text: string,
): { ok: true; row: ChangeRow } | { ok: false; reason: 'invalid_json' | 'not_object' } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'invalid_json' }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, reason: 'not_object' }
  const d = data as Record<string, unknown>
  const pagesNow = nonNegInt(d.pages_now)
  const home = typeof d.homepage === 'string' ? d.homepage : null
  return {
    ok: true,
    row: {
      company,
      scan_date: scanDate,
      compared_with: isDate(d.compared_with) ? d.compared_with : null,
      pages_before: nonNegInt(d.pages_before),
      pages_now: pagesNow,
      pages_source: pagesNow !== null ? 'changes.json' : null,
      sitemap_read: typeof d.sitemap_read === 'boolean' ? d.sitemap_read : null,
      homepage: home !== null ? home.slice(0, 200) : null,
      added_count: arr(d.added).length,
      removed_count: arr(d.removed).length,
      added: strings(d.added, 200, 500, true),
      removed: strings(d.removed, 200, 500, true),
      new_offer_lines: strings(d.new_offer_lines, 50, 300),
      removed_offer_lines: strings(d.removed_offer_lines, 50, 300),
      robots_skipped: strings(d.robots_skipped, 50, 500),
    },
  }
}

export function countSitemapLines(text: string): number {
  return text.split(/\r?\n/).filter((l) => l.trim() !== '').length
}

export function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// market/companies.json: tolerant of an array of {slug,name}, {companies:[...]}, or a {slug: name} object.
export function parseCompanies(text: string): Map<string, string> {
  const out = new Map<string, string>()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return out
  }
  const add = (slug: unknown, name: unknown) => {
    if (typeof slug === 'string' && /^[a-z0-9-]{1,80}$/.test(slug) && typeof name === 'string' && name.trim()) {
      out.set(slug, name.trim().slice(0, 120))
    }
  }
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { companies?: unknown }).companies)
      ? (data as { companies: unknown[] }).companies
      : null
  if (list) {
    for (const c of list) {
      if (c && typeof c === 'object') {
        const o = c as Record<string, unknown>
        add(o.slug ?? o.id, o.name ?? o.company_name)
      }
    }
  } else if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (typeof v === 'string') add(k, v)
      else if (v && typeof v === 'object') add(k, (v as Record<string, unknown>).name)
    }
  }
  return out
}
