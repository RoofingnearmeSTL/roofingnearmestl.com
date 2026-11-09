// Small, safe markdown reader for the dashboard note view. Produces data (never HTML strings).
import { resolveLink } from './parse-note'

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'strong'; v: Inline[] }
  | { t: 'em'; v: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; external: boolean; v: Inline[] }

export type Block =
  | { t: 'h'; level: number; v: Inline[] }
  | { t: 'p'; v: Inline[] }
  | { t: 'ul'; items: Inline[][] }
  | { t: 'ol'; items: Inline[][] }
  | { t: 'quote'; v: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'table'; head: Inline[][]; rows: Inline[][][] }
  | { t: 'hr' }

const MAX_CHARS = 400_000
const MAX_BLOCKS = 5000

export function noteHref(path: string): string {
  return '/dashboard/brain?note=' + encodeURIComponent(path)
}

function linkFor(target: string, fromPath: string): { href: string; external: boolean } | null {
  const t = target.trim()
  if (/^https?:\/\//i.test(t)) return { href: t, external: true }
  if (/^[a-z][a-z0-9+.-]*:/i.test(t) || t.startsWith('#') || t.startsWith('//')) return null
  const resolved = resolveLink(fromPath, t.startsWith('/') ? t.slice(1) : t)
  return resolved ? { href: noteHref(resolved), external: false } : null
}

export function parseInline(src: string, fromPath: string): Inline[] {
  const out: Inline[] = []
  let text = ''
  const flush = () => { if (text) { out.push({ t: 'text', v: text }); text = '' } }
  let i = 0
  while (i < src.length) {
    const rest = src.slice(i)
    let m: RegExpExecArray | null
    if ((m = /^!\[([^\]]*)\]\([^)]*\)/.exec(rest))) { text += `[image: ${m[1]}]`; i += m[0].length; continue }
    if ((m = /^`([^`\n]+)`/.exec(rest))) { flush(); out.push({ t: 'code', v: m[1] }); i += m[0].length; continue }
    if ((m = /^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(rest))) {
      const link = linkFor(m[2], fromPath)
      if (link) { flush(); out.push({ t: 'link', ...link, v: parseInline(m[1], fromPath) }) } else text += m[1]
      i += m[0].length; continue
    }
    if ((m = /^\*\*([^*]+)\*\*/.exec(rest)) || (m = /^__([^_]+)__/.exec(rest))) { flush(); out.push({ t: 'strong', v: parseInline(m[1], fromPath) }); i += m[0].length; continue }
    if ((m = /^\*([^*\s][^*]*)\*/.exec(rest))) { flush(); out.push({ t: 'em', v: parseInline(m[1], fromPath) }); i += m[0].length; continue }
    text += src[i]; i++
  }
  flush()
  return out
}

function splitRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
  const cells: string[] = []
  let cur = ''
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') { cur += '|'; i++ } else if (s[i] === '|') { cells.push(cur.trim()); cur = '' } else cur += s[i]
  }
  cells.push(cur.trim())
  return cells
}

export function parseMarkdown(text: string, fromPath: string): Block[] {
  const lines = (text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text).split(/\r?\n/)
  const blocks: Block[] = []
  let i = 0
  // Skip frontmatter.
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((l, idx) => idx > 0 && l.trim() === '---')
    if (end > 0) i = end + 1
  }
  while (i < lines.length && blocks.length < MAX_BLOCKS) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    if (/^```/.test(line)) {
      const buf: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++])
      i++
      blocks.push({ t: 'code', v: buf.join('\n') })
      continue
    }
    let m: RegExpExecArray | null
    if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) { blocks.push({ t: 'h', level: m[1].length, v: parseInline(m[2], fromPath) }); i++; continue }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { blocks.push({ t: 'hr' }); i++; continue }
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
      const head = splitRow(line).map((c) => parseInline(c, fromPath))
      i += 2
      const rows: Inline[][][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(splitRow(lines[i]).map((c) => parseInline(c, fromPath))); i++ }
      blocks.push({ t: 'table', head, rows })
      continue
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: Inline[][] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) { items.push(parseInline(lines[i].replace(/^\s*[-*+]\s+/, ''), fromPath)); i++ }
      blocks.push({ t: 'ul', items }); continue
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: Inline[][] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { items.push(parseInline(lines[i].replace(/^\s*\d+[.)]\s+/, ''), fromPath)); i++ }
      blocks.push({ t: 'ol', items }); continue
    }
    if (/^>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''))
      blocks.push({ t: 'quote', v: parseInline(buf.join(' '), fromPath) }); continue
    }
    const buf: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*[-*+]\s|\s*\d+[.)]\s|>)/.test(lines[i]) && !lines[i].trim().startsWith('|')) buf.push(lines[i++].trim())
    if (!buf.length) { buf.push(lines[i++].trim()) }
    blocks.push({ t: 'p', v: parseInline(buf.join(' '), fromPath) })
  }
  return blocks
}
