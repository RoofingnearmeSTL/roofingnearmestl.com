import { NextResponse } from 'next/server'
import { checkBasicAuth } from '@/lib/dashboard-auth'
import { nearbyReports, parseCensusGeocode, parseSpcCsv, SPC_FILE, spcCode, spcDaysFor, type StormKind, type StormReport } from '@/lib/proof-package/storms'

// Storm reports near a property for the proof package builder (owner dashboard only).
// GET ?address=<one line>&date=YYYY-MM-DD[&radius=10][&span=1]  or  ?lat=..&lon=..&date=..
// 1. Finds the address with the U.S. Census Bureau geocoder (free, public, no key).
// 2. Reads NOAA Storm Prediction Center daily hail, wind and tornado reports around the date of loss.
// 3. Returns the reports within the radius, nearest first.
// Nothing is saved. The proxy already requires the dashboard password; this checks it again (defense in depth).
export const runtime = 'nodejs'
export const maxDuration = 30

const KINDS: StormKind[] = ['hail', 'wind', 'tornado']
const DATE = /^\d{4}-\d{2}-\d{2}$/

const noStore = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' }
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: noStore })

async function getText(url: string, revalidate: number | false): Promise<{ status: number; text: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000), ...(revalidate === false ? { cache: 'no-store' as const } : { next: { revalidate } }) })
    if (!res.ok) return { status: res.status, text: '' }
    return { status: 200, text: (await res.text()).slice(0, 2_000_000) }
  } catch {
    return { status: 0, text: '' }
  }
}

export async function GET(req: Request) {
  if (checkBasicAuth(req.headers.get('authorization'), process.env.DASHBOARD_PASSWORD) !== 'ok') return new NextResponse('Not found', { status: 404, headers: noStore })
  const q = new URL(req.url).searchParams
  const date = (q.get('date') ?? '').trim()
  if (!DATE.test(date) || Number.isNaN(Date.parse(date))) return bad('Enter the date of loss.')
  const today = new Date().toISOString().slice(0, 10)
  if (date > today) return bad('The date of loss is in the future.')
  if (date < '2004-01-01') return bad('Storm reports are only checked back to 2004.')
  const radius = Math.min(Math.max(Number(q.get('radius') ?? 10) || 10, 1), 50)
  const span = Math.min(Math.max(Math.trunc(Number(q.get('span') ?? 1) || 0), 0), 3)

  let center: { lat: number; lon: number; matched: string } | null = null
  const lat = Number(q.get('lat'))
  const lon = Number(q.get('lon'))
  if (q.get('lat') && q.get('lon') && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    center = { lat, lon, matched: `${lat.toFixed(5)}, ${lon.toFixed(5)}` }
  } else {
    const address = (q.get('address') ?? '').trim().replace(/\s+/g, ' ')
    if (address.length < 8 || address.length > 200) return bad('Enter the full property address (street, city, state, ZIP).')
    const url = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?' + new URLSearchParams({ address, benchmark: 'Public_AR_Current', format: 'json' })
    const geo = await getText(url, 86400)
    if (geo.status !== 200) return bad('The U.S. Census address lookup did not answer. Try again in a minute, or enter the map coordinates instead.', 502)
    let parsed: ReturnType<typeof parseCensusGeocode> = null
    try { parsed = parseCensusGeocode(JSON.parse(geo.text)) } catch { parsed = null }
    if (!parsed) return bad('The address was not found. Check the street, city, state and ZIP, or enter the map coordinates instead.', 404)
    center = parsed
  }

  const days = spcDaysFor(date, span)
  const recent = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10)
  const all: StormReport[] = []
  const missing: string[] = []
  await Promise.all(days.flatMap((day) => KINDS.map(async (kind) => {
    // Recent days can still be corrected by SPC; older days are cached for a day.
    const res = await getText(`https://www.spc.noaa.gov/climo/reports/${spcCode(day)}_rpts_${SPC_FILE[kind]}.csv`, day >= recent ? false : 86400)
    if (res.status === 200) all.push(...parseSpcCsv(res.text, kind, day))
    else if (res.status !== 404) missing.push(`${day} ${kind}`)
  })))

  const reports = nearbyReports(all, center, radius, date, span)
  return NextResponse.json({
    place: center,
    radius, span, date,
    reports,
    unread: missing.sort(),
    source: 'NOAA Storm Prediction Center, preliminary local storm reports (spc.noaa.gov/climo/reports). Address location: U.S. Census Bureau geocoder.',
    checkedAt: new Date().toISOString(),
  }, { headers: noStore })
}
