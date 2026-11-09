// Parses the recommendations table in market/companies/<slug>/recommendations.md. Pure, no imports.

export type RecStatus = 'proposed' | 'approved' | 'in_progress' | 'done' | 'declined' | 'still_recommended' | 'unknown'

export type RecRow = {
  company: string
  rec_id: string
  rec_date: string | null
  idea: string
  evidence: string | null
  status: RecStatus
  status_text: string
  link: string | null
}

const MAX_ROWS = 500
const CELL_MAX = 2000
const LINK_MAX = 500

function splitRow(line: string): string[] {
  let t = line.trim()
  if (t.startsWith('|')) t = t.slice(1)
  if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1)
  const cells: string[] = []
  let cur = ''
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (c === '\\' && t[i + 1] === '|') {
      cur += '|'
      i++
    } else if (c === '|') {
      cells.push(cur.trim())
      cur = ''
    } else cur += c
  }
  cells.push(cur.trim())
  return cells
}

export function statusFrom(cell: string): RecStatus {
  if (cell.includes('✅') || /^done/i.test(cell)) return 'done'
  if (cell.includes('❌') || /declined|not a recommendation/i.test(cell)) return 'declined'
  if (cell.includes('🔨') || /in progress/i.test(cell)) return 'in_progress'
  if (cell.includes('👍') || /approved/i.test(cell)) return 'approved'
  if (cell.includes('🔁') || /still recommended/i.test(cell)) return 'still_recommended'
  if (cell.includes('💡') || /proposed/i.test(cell)) return 'proposed'
  return 'unknown'
}

const cap = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s)

export function parseRecommendations(company: string, text: string): { rows: RecRow[]; skipped: number } {
  const lines = text.split(/\r?\n/)
  let skipped = 0
  const rows: RecRow[] = []
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('|')) continue
    const head = splitRow(lines[i]).map((h) => h.toLowerCase())
    const idCol = head.findIndex((h) => h === 'id')
    const statusCol = head.findIndex((h) => h === 'status')
    if (idCol < 0 || statusCol < 0) continue
    const dateCol = head.findIndex((h) => h === 'date')
    const ideaCol = head.findIndex((h) => h === 'recommendation')
    const whyCol = head.findIndex((h) => h.startsWith('why'))
    const linkCol = head.findIndex((h) => h === 'link')
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j]
      if (!line.includes('|')) break
      const cells = splitRow(line)
      if (cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '')) continue
      const id = (cells[idCol] ?? '').trim()
      if (!/^[A-Z]{1,6}-\d{1,5}$/.test(id)) {
        skipped++
        continue
      }
      if (rows.length >= MAX_ROWS) break
      const dateRaw = dateCol >= 0 ? cells[dateCol] ?? '' : ''
      const linkRaw = linkCol >= 0 ? (cells[linkCol] ?? '').trim() : ''
      const statusText = cells[statusCol] ?? ''
      rows.push({
        company,
        rec_id: id,
        rec_date: /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null,
        idea: cap(ideaCol >= 0 ? cells[ideaCol] ?? '' : '', CELL_MAX),
        evidence: whyCol >= 0 ? cap(cells[whyCol] ?? '', CELL_MAX) || null : null,
        status: statusFrom(statusText),
        status_text: cap(statusText, CELL_MAX),
        link: linkRaw === '' || linkRaw === '—' || linkRaw === '-' ? null : cap(linkRaw, LINK_MAX),
      })
    }
    break
  }
  return { rows, skipped }
}
