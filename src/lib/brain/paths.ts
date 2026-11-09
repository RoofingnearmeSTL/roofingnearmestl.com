// Path rules for the Brain-Data copy. Pure, no imports.

export const NOTE_EXCLUDE = /^market\/companies\/[^/]+\/scans\//
export const COMPANIES_JSON = 'market/companies.json'

export function isNotePath(p: string): boolean {
  if (typeof p !== 'string' || p.length > 400 || p.length === 0) return false
  if (!/\.md$/i.test(p)) return false
  if (NOTE_EXCLUDE.test(p)) return false
  const segs = p.split('/')
  for (const s of segs) {
    if (s === '' || s.startsWith('.') || s === '..') return false
  }
  if (p.includes('node_modules/')) return false
  return true
}

export function changesJsonKey(p: string): { company: string; scanDate: string } | null {
  const m = /^market\/companies\/([a-z0-9-]{1,80})\/scans\/(\d{4}-\d{2}-\d{2})\/changes\.json$/.exec(p)
  return m ? { company: m[1], scanDate: m[2] } : null
}

export function recommendationsCompany(p: string): string | null {
  const m = /^market\/companies\/([a-z0-9-]{1,80})\/recommendations\.md$/.exec(p)
  return m ? m[1] : null
}

export function dirname(p: string): string {
  const i = p.lastIndexOf('/')
  return i < 0 ? '' : p.slice(0, i)
}

// Resolves '.' and '..'. Returns null when the path escapes the root.
export function posixNormalize(p: string): string | null {
  const out: string[] = []
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') {
      if (out.length === 0) return null
      out.pop()
    } else out.push(seg)
  }
  return out.join('/')
}
