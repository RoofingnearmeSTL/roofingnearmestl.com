import { dirname, posixNormalize } from './paths'

export const MAX_BODY_CHARS = 200_000

export type NoteLink = { to: string; kind: 'link' | 'wiki' | 'mention' }

export type ParsedNote = {
  title: string
  folder: string
  body: string
  truncated: boolean
  sizeBytes: number
  links: NoteLink[]
}

const SCHEME = /^[a-z][a-z0-9+.-]*:/i

function titleOf(path: string, text: string): string {
  let t = ''
  if (/^---\r?\n/.test(text)) {
    const end = text.indexOf('\n---', 4)
    if (end > 0) {
      const m = /^title:\s*(.+)$/m.exec(text.slice(4, end))
      if (m) t = m[1].trim().replace(/^["']|["']$/g, '')
    }
  }
  if (!t) {
    let inFence = false
    for (const line of text.split(/\r?\n/)) {
      if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
      if (inFence) continue
      const m = /^#\s+(.+?)\s*#*\s*$/.exec(line)
      if (m) {
        t = m[1].trim()
        break
      }
    }
  }
  if (!t) t = (path.split('/').pop() ?? path).replace(/\.md$/i, '')
  return t.slice(0, 300)
}

// Resolves a link target from a note to a repo path. Without allPaths no existence checks are made.
export function resolveLink(fromPath: string, target: string, allPaths?: Set<string>): string | null {
  if (!target || SCHEME.test(target) || target.startsWith('#') || target.startsWith('/')) return null
  let t = target.replace(/[#?].*$/, '')
  if (!t) return null
  try {
    t = decodeURI(t)
  } catch {
    // keep as is
  }
  const variants = (p: string): string[] => (/\.md$/i.test(p) ? [p] : [p + '.md', p.replace(/\/$/, '') + '/README.md'])
  const rel = posixNormalize(dirname(fromPath) ? `${dirname(fromPath)}/${t}` : t)
  const root = posixNormalize(t)
  const candidates: string[] = []
  if (rel !== null) candidates.push(...variants(rel))
  if (root !== null) candidates.push(...variants(root))
  if (allPaths) {
    for (const c of candidates) if (allPaths.has(c)) return c
  }
  const first = candidates.find((c) => /\.md$/i.test(c))
  if (!first) return null
  // Without an existence check prefer the relative reading; with one, keep the first for the sync to filter later.
  return first
}

export function parseNote(path: string, text: string, allPaths: Set<string>): ParsedNote {
  const truncated = text.length > MAX_BODY_CHARS
  const body = truncated ? text.slice(0, MAX_BODY_CHARS) : text
  const sizeBytes = new TextEncoder().encode(text).length

  // Strip fenced code blocks before looking for links.
  const kept: string[] = []
  let inFence = false
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (!inFence) kept.push(line)
  }
  const prose = kept.join('\n')

  const found = new Map<string, 'link' | 'wiki' | 'mention'>()
  const rank = { link: 3, wiki: 2, mention: 1 } as const
  const add = (to: string | null, kind: 'link' | 'wiki' | 'mention') => {
    if (!to || to === path || !/\.md$/i.test(to)) return
    const cur = found.get(to)
    if (!cur || rank[kind] > rank[cur]) found.set(to, kind)
  }

  // Markdown links, not images.
  const linkRe = /(!?)\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(prose))) {
    if (m[1] === '!') continue
    add(resolveLink(path, m[2], allPaths), 'link')
  }

  // Wiki links, matched by file name.
  const sorted = [...allPaths].sort()
  const wikiRe = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g
  while ((m = wikiRe.exec(prose))) {
    const name = m[1].trim().toLowerCase().replace(/\.md$/, '')
    const hit = sorted.find((p) => (p.split('/').pop() ?? '').replace(/\.md$/i, '').toLowerCase() === name)
    if (hit) add(hit, 'wiki')
  }

  // Inline code that names a note.
  const codeRe = /`([^`\n]+)`/g
  while ((m = codeRe.exec(prose))) {
    const c = m[1].trim()
    if (!/^[\w./-]+\.md$/.test(c)) continue
    const rel = posixNormalize(dirname(path) ? `${dirname(path)}/${c}` : c)
    const root = posixNormalize(c)
    const hit = [rel, root].find((p): p is string => p !== null && allPaths.has(p))
    if (hit) add(hit, 'mention')
  }

  const links = [...found.entries()].map(([to, kind]) => ({ to, kind })).sort((a, b) => (a.to < b.to ? -1 : a.to > b.to ? 1 : 0))
  return { title: titleOf(path, text), folder: dirname(path), body, truncated, sizeBytes, links }
}
