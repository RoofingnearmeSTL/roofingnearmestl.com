// Storm report helpers for proof packages (pure, no imports).
//
// Source: NOAA Storm Prediction Center (SPC) daily local storm reports, public CSV files at
// https://www.spc.noaa.gov/climo/reports/YYMMDD_rpts_{hail,wind,torn}.csv. An SPC "day" runs from 12:00 UTC on that
// date to 11:59 UTC the next morning, and report times are HHMM in UTC. Hail size is in hundredths of an inch
// (175 = 1.75"). Wind speed is in mph or "UNK". These are preliminary reports: SPC can still correct them.

const TZ = 'America/Chicago'
const DAY = 86_400_000

export type StormKind = 'hail' | 'wind' | 'tornado'

export type StormReport = {
  id: string
  kind: StormKind
  /** UTC instant of the report. */
  at: string
  /** Hail size in inches, wind speed in mph, or null when not given. */
  magnitude: number | null
  location: string
  county: string
  state: string
  lat: number
  lon: number
  comments: string
}

export type NearbyReport = StormReport & { miles: number; direction: string }

export const SPC_FILE: Record<StormKind, string> = { hail: 'hail', wind: 'wind', tornado: 'torn' }

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))

export function addDays(date: string, n: number): string {
  return new Date(Date.parse(date + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10)
}

/** YYMMDD for an SPC file name. */
export function spcCode(date: string): string {
  return date.slice(2, 4) + date.slice(5, 7) + date.slice(8, 10)
}

/**
 * SPC days to read for a date of loss, with `span` days either side (Central dates). A Central day starts at
 * 05:00 or 06:00 UTC, which is still inside the previous SPC day, so one extra day is read at the start.
 */
export function spcDaysFor(dateOfLoss: string, span: number): string[] {
  if (!isDate(dateOfLoss)) return []
  const s = Math.min(Math.max(Math.trunc(span), 0), 3)
  const out: string[] = []
  for (let d = -s - 1; d <= s; d++) out.push(addDays(dateOfLoss, d))
  return out
}

/** Central calendar date of an instant. */
export function centralDay(at: Date): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at)
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  return `${g('year')}-${g('month')}-${g('day')}`
}

export function formatCentralTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' }).format(d)
}

/** Split one CSV line. SPC files are plain; quotes are handled in case a comment ever contains a comma. */
function splitCsv(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === ',') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

/** Parse one SPC report file for one SPC day. Bad rows are skipped. */
export function parseSpcCsv(text: string, kind: StormKind, spcDay: string): StormReport[] {
  if (!isDate(spcDay) || typeof text !== 'string') return []
  const out: StormReport[] = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length && out.length < 2000; i++) {
    const line = lines[i].trim()
    if (!line || /^time,/i.test(line)) continue
    const f = splitCsv(line)
    if (f.length < 7) continue
    const hhmm = f[0].trim()
    if (!/^\d{3,4}$/.test(hhmm)) continue
    const hh = Number(hhmm.padStart(4, '0').slice(0, 2))
    const mm = Number(hhmm.padStart(4, '0').slice(2))
    if (hh > 23 || mm > 59) continue
    const date = hh >= 12 ? spcDay : addDays(spcDay, 1)
    const at = new Date(`${date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00Z`)
    const lat = Number(f[5])
    const lon = Number(f[6])
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue
    const rawMag = f[1].trim()
    let magnitude: number | null = null
    if (kind === 'hail' && /^\d{1,4}$/.test(rawMag)) magnitude = Number(rawMag) / 100
    if (kind === 'wind' && /^\d{1,3}$/.test(rawMag)) magnitude = Number(rawMag)
    out.push({
      id: `${kind}-${spcCode(spcDay)}-${i}`,
      kind, at: at.toISOString(), magnitude,
      location: f[2].trim().slice(0, 80), county: f[3].trim().slice(0, 60), state: f[4].trim().slice(0, 2),
      lat, lon, comments: f.slice(7).join(',').trim().slice(0, 400),
    })
  }
  return out
}

export function milesBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 3958.8
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

/** Compass direction from `from` to `to` (16 points). */
export function direction(from: { lat: number; lon: number }, to: { lat: number; lon: number }): string {
  const rad = (d: number) => (d * Math.PI) / 180
  const y = Math.sin(rad(to.lon - from.lon)) * Math.cos(rad(to.lat))
  const x = Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) - Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(rad(to.lon - from.lon))
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
  return POINTS[Math.round(deg / 22.5) % 16]
}

/** Reports within `radiusMiles` of the property whose Central date is within `span` days of the date of loss, nearest first. */
export function nearbyReports(reports: StormReport[], center: { lat: number; lon: number }, radiusMiles: number, dateOfLoss: string, span: number): NearbyReport[] {
  if (!isDate(dateOfLoss)) return []
  const from = addDays(dateOfLoss, -span)
  const to = addDays(dateOfLoss, span)
  const seen = new Set<string>()
  const out: NearbyReport[] = []
  for (const r of reports) {
    const day = centralDay(new Date(r.at))
    if (day < from || day > to) continue
    const miles = milesBetween(center, r)
    if (miles > radiusMiles) continue
    const key = `${r.kind}|${r.at}|${r.lat}|${r.lon}|${r.magnitude}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...r, miles: Math.round(miles * 10) / 10, direction: direction(center, r) })
  }
  return out.sort((a, b) => a.miles - b.miles || a.at.localeCompare(b.at))
}

const HAIL_NAMES: [number, string][] = [
  [4.5, 'grapefruit'], [4, 'softball'], [3, 'teacup'], [2.75, 'baseball'], [2.5, 'tennis ball'], [2, 'hen egg'],
  [1.75, 'golf ball'], [1.5, 'ping pong ball'], [1.25, 'half dollar'], [1, 'quarter'], [0.88, 'nickel'], [0.75, 'penny'],
]

/** "1.75 in (golf ball)", "60 mph", or a plain word when the size is unknown. */
export function describeMagnitude(r: Pick<StormReport, 'kind' | 'magnitude'>): string {
  if (r.kind === 'hail') {
    if (r.magnitude === null) return 'size not given'
    const name = HAIL_NAMES.find(([min]) => r.magnitude! >= min - 0.001)?.[1]
    return `${r.magnitude.toFixed(2)} in${name ? ` (${name})` : ''}`
  }
  if (r.kind === 'wind') return r.magnitude === null ? 'speed not given' : `${r.magnitude} mph`
  return 'tornado'
}

export const KIND_LABEL: Record<StormKind, string> = { hail: 'Hail', wind: 'Damaging wind', tornado: 'Tornado' }

/** Parse a U.S. Census geocoder "onelineaddress" answer. */
export function parseCensusGeocode(body: unknown): { matched: string; lat: number; lon: number } | null {
  const m = (body as { result?: { addressMatches?: unknown[] } } | null)?.result?.addressMatches
  if (!Array.isArray(m) || !m.length) return null
  const first = m[0] as { matchedAddress?: unknown; coordinates?: { x?: unknown; y?: unknown } }
  const lon = Number(first.coordinates?.x)
  const lat = Number(first.coordinates?.y)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return { matched: typeof first.matchedAddress === 'string' ? first.matchedAddress.slice(0, 200) : '', lat, lon }
}
