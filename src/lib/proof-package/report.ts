// Builds the evidence package as one self-contained HTML document (pure: no browser or network access).
// Layout follows Mike's own evidence package: a cover with purpose and a system-level opinion, then the inspection-based
// damage summary, the weather / hail impact summary, code and manufacturer requirements, the scope and cost summary,
// the photo report and the attachments. Every value from the form is escaped; images are only accepted as data:,
// blob: or same-site paths.
import { INSURANCE_SENTENCE, LEGAL_NAME, PHONES } from '../business'
import { CODE_LIBRARY } from './code-library'
import { CLADDING, FRAMING, iceBarrier, numberFrom } from './ice-barrier'
import { COMPONENTS, fillPlaceholders, inspectionDates, REPORT_TYPES, scopeLines, type ProofPackage } from './model'
import { describeMagnitude, formatCentralTime, KIND_LABEL, type NearbyReport } from './storms'
import { sanitizeVentInput, ventilation } from './ventilation'

export type ReportFile = { src: string; takenAt: string | null; width: number; height: number }
export type ReportOptions = { files: Record<string, ReportFile>; logoSrc: string | null; generatedAt: Date }

const BRAND = 'RoofingnearmeSTL'
const SITE = 'www.roofingnearmestl.com'

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** Only image sources that can't run code or reach another site: inline images, in-page blobs, or this site's paths. */
export function safeImgSrc(src: unknown): string | null {
  if (typeof src !== 'string') return null
  if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(src)) return src
  if (/^blob:https?:\/\/[A-Za-z0-9.:-]+\/[A-Za-z0-9-]+$/.test(src)) return src
  if (/^\/[A-Za-z0-9._/-]+$/.test(src) && !src.startsWith('//')) return src
  return null
}

/** Plain text to HTML: blank lines split blocks; lines starting with "- " become bullets; other lines keep their breaks. */
export function rich(text: string): string {
  const out: string[] = []
  for (const block of text.trim().split(/\n\s*\n/)) {
    const lines = block.split('\n')
    let para: string[] = []
    let list: string[] = []
    const flush = () => {
      if (para.length) out.push(`<p>${para.map(escapeHtml).join('<br>')}</p>`)
      if (list.length) out.push(`<ul>${list.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`)
      para = []
      list = []
    }
    for (const raw of lines) {
      const line = raw.trim()
      if (!line) continue
      const m = /^[-•*]\s+(.*)$/.exec(line)
      if (m) {
        if (para.length) { out.push(`<p>${para.map(escapeHtml).join('<br>')}</p>`); para = [] }
        list.push(m[1])
      } else {
        if (list.length) { out.push(`<ul>${list.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`); list = [] }
        para.push(line)
      }
    }
    flush()
  }
  return out.join('\n')
}

/** One bullet per non-empty line. */
export function bulletList(text: string): string {
  const items = text.split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
  return items.length ? `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` : ''
}

export function formatDate(d: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  const t = new Date(d + 'T12:00:00Z')
  return Number.isNaN(t.getTime()) ? d : new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' }).format(t)
}

function formatTaken(iso: string | null): string {
  if (!iso) return ''
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(t)
}

/** True when the property line names Illinois ("Waterloo, IL 62298"). */
export function isIllinois(cityStateZip: string): boolean {
  return /(^|[\s,])(IL|Ill\.?|Illinois)(\s+\d{5}(-\d{4})?)?\s*$/i.test(cityStateZip.trim())
}

/** "Hail 1.75 in (golf ball)", "Damaging wind (speed not given)", "Damaging wind 60 mph", "Tornado". */
export function reportLabel(r: Pick<NearbyReport, 'kind' | 'magnitude'>): string {
  if (r.kind === 'tornado') return 'Tornado'
  if (r.magnitude === null) return `${KIND_LABEL[r.kind]} (${describeMagnitude(r)})`
  return `${KIND_LABEL[r.kind]} ${describeMagnitude(r)}`
}

/** A small north-up plot of the storm reports around the property (no map tiles, so it prints anywhere). */
export function stormPlotSvg(reports: NearbyReport[], center: { lat: number; lon: number }, radiusMiles: number): string {
  const size = 300
  const mid = size / 2
  const scale = (mid - 24) / radiusMiles
  const rings = [0.25, 0.5, 0.75, 1].map((f) => {
    const r = radiusMiles * f
    return `<circle cx="${mid}" cy="${mid}" r="${(r * scale).toFixed(1)}" fill="none" stroke="#cbd5e1" stroke-dasharray="3 3"/>` +
      `<text x="${(mid + r * scale * 0.71 + 2).toFixed(1)}" y="${(mid - r * scale * 0.71 - 2).toFixed(1)}" font-size="9" fill="#64748b">${Number.isInteger(r) ? r : r.toFixed(1)} mi</text>`
  }).join('')
  const points = reports.map((r, i) => {
    const dx = (r.lon - center.lon) * Math.cos((center.lat * Math.PI) / 180) * 69.17
    const dy = (r.lat - center.lat) * 69.0
    const x = mid + dx * scale
    const y = mid - dy * scale
    const mark = r.kind === 'hail'
      ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(4 + Math.min(r.magnitude ?? 1, 4) * 2).toFixed(1)}" fill="#2563eb" fill-opacity="0.75" stroke="#1e3a8a"/>`
      : r.kind === 'wind'
        ? `<path d="M${x.toFixed(1)} ${(y - 7).toFixed(1)} L${(x + 6).toFixed(1)} ${(y + 5).toFixed(1)} L${(x - 6).toFixed(1)} ${(y + 5).toFixed(1)} Z" fill="#f59e0b" stroke="#92400e"/>`
        : `<rect x="${(x - 5).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="10" height="10" fill="#dc2626" stroke="#7f1d1d"/>`
    return `${mark}<text x="${(x + 8).toFixed(1)}" y="${(y + 3).toFixed(1)}" font-size="10" font-weight="700" fill="#0f172a">${i + 1}</text>`
  }).join('')
  return `<svg class="plot" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Storm reports around the property, north at the top">` +
    `<rect width="${size}" height="${size}" fill="#f8fafc" stroke="#e2e8f0"/>${rings}` +
    `<text x="${mid}" y="14" font-size="11" text-anchor="middle" fill="#334155" font-weight="700">N</text>` +
    `<path d="M${mid} 18 L${mid - 4} 26 L${mid + 4} 26 Z" fill="#334155"/>${points}` +
    `<circle cx="${mid}" cy="${mid}" r="6" fill="#16a34a" stroke="#14532d" stroke-width="2"/>` +
    `<text x="${mid}" y="${mid + 18}" font-size="10" text-anchor="middle" fill="#14532d" font-weight="700">Property</text></svg>`
}

const CSS = `
@page { size: letter; margin: 0.55in 0.6in 0.7in; @bottom-left { content: "Roof System Evidence Package"; font: 8.5pt Arial, sans-serif; color: #64748b; } @bottom-right { content: "${BRAND} · Page " counter(page) " of " counter(pages); font: 8.5pt Arial, sans-serif; color: #64748b; } }
* { box-sizing: border-box; }
body { margin: 0; font: 10.5pt/1.45 Arial, Helvetica, sans-serif; color: #0f172a; background: #fff; }
.page { max-width: 7.3in; margin: 0 auto; padding: 0.3in 0; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 12pt; padding-bottom: 8pt; border-bottom: 2.5px solid #0B6E99; }
.head img { height: 0.8in; width: auto; }
.head .co { text-align: right; font-size: 9pt; color: #475569; line-height: 1.35; }
.head .co strong { color: #334155; }
h1 { font-size: 22pt; margin: 14pt 0 2pt; color: #0B6E99; letter-spacing: 0.01em; text-transform: uppercase; }
.subtitle { font-size: 14pt; font-weight: 700; color: #0B6E99; margin: 0 0 8pt; }
h2 { font-size: 16pt; margin: 12pt 0 6pt; color: #0B6E99; }
h3 { font-size: 12pt; margin: 12pt 0 4pt; color: #0B6E99; }
section.major { break-before: page; }
p { margin: 0 0 7pt; }
ul { margin: 0 0 8pt; padding-left: 20pt; }
li { margin: 0 0 2pt; }
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 6pt 0 10pt; }
th, td { text-align: left; vertical-align: top; border: 1px solid #cbd5e1; padding: 4pt 6pt; }
th { background: #f1f5f9; font-size: 9pt; color: #334155; }
tr { break-inside: avoid; }
table.info td { border: 0; padding: 2pt 6pt 2pt 0; }
table.info td.k { font-weight: 700; width: 1.35in; }
.note { font-size: 8.5pt; color: #475569; }
.flex { display: flex; gap: 14pt; align-items: flex-start; flex-wrap: wrap; }
.plot { flex: none; }
.legend { font-size: 8.5pt; color: #475569; }
.total { font-weight: 700; margin-top: 6pt; }
.sign { margin-top: 14pt; }
.photo { display: grid; grid-template-columns: 4.1in 1fr; gap: 12pt; break-inside: avoid; margin: 0 0 12pt; }
.photo .img { position: relative; }
.photo img { display: block; width: 100%; height: 3in; object-fit: cover; border-radius: 4pt; background: #f1f5f9; }
.photo .num { position: absolute; top: 6pt; left: 6pt; background: #fff; border-radius: 3pt; padding: 1pt 6pt; font-weight: 700; font-size: 9pt; }
.photo .cap { font-size: 11pt; }
.photo .meta { margin-top: 6pt; font-size: 8.5pt; color: #64748b; }
.docpage { break-before: page; text-align: center; }
.docpage img { max-width: 100%; max-height: 9in; border: 1px solid #e2e8f0; }
.ok { color: #166534; font-weight: 700; }
.short { color: #9a3412; font-weight: 700; }
.result { display: inline-block; border: 2px solid #0B6E99; border-radius: 6pt; padding: 4pt 10pt; font-weight: 700; margin: 4pt 0 8pt; }
.foot { margin-top: 12pt; font-size: 8.5pt; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 6pt; }
@media screen { body { background: #e2e8f0; } .page { background: #fff; padding: 0.5in 0.6in; margin: 16px auto; box-shadow: 0 1px 4px rgba(0,0,0,.15); } }
@media print { a { color: inherit; text-decoration: none; } }
`

function joinAnd(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function money(raw: string): string {
  const n = Number(raw.replace(/[$,\s]/g, ''))
  return Number.isFinite(n) && raw.trim() ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : raw.trim()
}

export function buildReportHtml(p: ProofPackage, opts: ReportOptions): string {
  const il = isIllinois(p.cityStateZip)
  const phone = p.phone.trim() || (il ? PHONES.IL.display : PHONES.MO.display)
  const fd = (d: string) => formatDate(d)
  const fill = (t: string) => fillPlaceholders(t, p, fd)
  const type = REPORT_TYPES.find((t) => t.id === p.reportType) ?? REPORT_TYPES[0]
  const createdBy = p.preparedBy.trim()
  const logo = opts.logoSrc && safeImgSrc(opts.logoSrc) ? `<img src="${escapeHtml(safeImgSrc(opts.logoSrc)!)}" alt="${BRAND}">` : `<strong style="font-size:18pt">${BRAND}</strong>`
  const head = (section: string) => `<div class="head">${logo}<div class="co"><strong>${BRAND}</strong><br>${escapeHtml(section)}${createdBy ? `<br>CREATED BY ${escapeHtml(createdBy)}` : ''}</div></div>`

  // Photos: numbered in component order, so each section can point to its photo numbers.
  const photos = COMPONENTS.flatMap((c) => p.photos.filter((ph) => ph.section === c.id && opts.files[ph.fileId] && safeImgSrc(opts.files[ph.fileId].src)))
  const photoNumbers = new Map(photos.map((ph, i) => [ph.id, i + 1]))
  const photosFor = (id: string) => photos.filter((ph) => ph.section === id).map((ph) => photoNumbers.get(ph.id)!)
  const photoRef = (id: string) => {
    const nums = photosFor(id)
    return nums.length ? `<p class="note">Photo${nums.length === 1 ? '' : 's'} ${nums.join(', ')} in the photo report.</p>` : ''
  }

  // ---- Cover -------------------------------------------------------------------------------------------------------
  const selectedStorms = p.storm.reports.filter((r) => p.storm.selected.includes(r.id))
  const ice = p.iws.include ? iceBarrier(iwsInput(p)) : null
  const includedCodes = p.codes.items.filter((c) => c.include && (c.title.trim() || c.text.trim()))
  const hailRows = p.hailMap.rows.filter((r) => r.date.trim())
  const sources = [
    photos.length ? `the ${BRAND} inspection report (${photos.length} photo${photos.length === 1 ? '' : 's'})` : '',
    ice ? 'the Ice & Water Shield (IWS) calculation' : '',
    p.hailMap.reportNumber.trim() || hailRows.length ? 'the Interactive Hail Maps report' : '',
    selectedStorms.length ? 'NOAA Storm Prediction Center storm reports' : '',
    includedCodes.length ? (p.codes.jurisdiction.trim() ? `the ${p.codes.jurisdiction.trim()} re-roofing requirements` : 'the applicable building code') : '',
    p.manufacturer.include && p.manufacturer.system.trim() ? `the ${p.manufacturer.system.trim()} system requirements` : '',
    p.totalPrice.trim() ? 'our proposal' : '',
  ].filter(Boolean)

  const row = (k1: string, v1: string, k2?: string, v2?: string) => (v1.trim() || (v2 ?? '').trim())
    ? `<tr><td class="k">${escapeHtml(k1)}</td><td>${escapeHtml(v1)}</td>${k2 ? `<td class="k">${escapeHtml(k2)}</td><td>${escapeHtml(v2 ?? '')}</td>` : '<td></td><td></td>'}</tr>` : ''
  const cover = `
${`<div class="head">${logo}<div class="co"><strong>${BRAND}</strong><br>${escapeHtml(LEGAL_NAME)}<br>Ph: ${escapeHtml(phone)} · ${SITE}${createdBy ? `<br>CREATED BY ${escapeHtml(createdBy)}` : ''}</div></div>`}
<h1>Roof System Evidence Package</h1>
<p class="subtitle">${escapeHtml(type.subtitle)}</p>
<table class="info">
${row('Prepared For:', p.preparedFor, 'Homeowner:', p.owner)}
${row('Property Address:', p.address || 'Property address', 'City / ZIP:', p.cityStateZip)}
${row('Structure Type:', p.structureType, 'Roof System:', p.roofSystem)}
${row('Inspection Dates:', inspectionDates(p, fd), ice && p.iws.reportDate ? 'IWS Report Date:' : 'Claim Number:', ice && p.iws.reportDate ? fd(p.iws.reportDate) : p.claimNumber)}
${row('Storm Event Date (construction basis):', p.dateOfLoss ? fd(p.dateOfLoss) : '', ice && p.iws.reportDate && p.claimNumber.trim() ? 'Claim Number:' : undefined, ice && p.iws.reportDate ? p.claimNumber : undefined)}
${row('Prepared By:', [BRAND, createdBy].filter(Boolean).join(' – '))}
</table>
${p.purpose.trim() ? `<h3>Purpose of This Report</h3>${rich(fill(p.purpose))}` : ''}
${sources.length || p.opinionFindings.trim() || p.opinionConclusion.trim() ? `<h3>Construction Opinion – System Level</h3>` : ''}
${sources.length && p.opinionFindings.trim() ? `<p>Using ${escapeHtml(joinAnd(sources))}, the current roof system:</p>` : ''}
${bulletList(fill(p.opinionFindings))}
${p.opinionConclusion.trim() ? rich(fill(p.opinionConclusion)) : ''}
<p class="foot">${escapeHtml(INSURANCE_SENTENCE)}. 10-Year Workmanship Warranty.</p>`

  // ---- Inspection-based damage summary -------------------------------------------------------------------------------
  const squares = p.testSquares.filter((t) => t.slope.trim() && (t.hits.trim() || t.notes.trim()))
  let n = 0
  const damage = COMPONENTS.map((c) => {
    const comp = p.components[c.id]
    const lines: string[] = []
    if (c.id === 'property' && (p.structureType.trim() || p.roofSystem.trim())) {
      lines.push(`<p>${escapeHtml(`The property is ${[p.structureType.trim() && `a ${p.structureType.trim()}`, p.roofSystem.trim() && `with a ${p.roofSystem.trim()}`].filter(Boolean).join(' ')}.`)}</p>`)
    }
    if (c.id === 'shingles' && squares.length) {
      lines.push(`<p>Test squares were marked and photographed on each slope listed below (hits counted inside a 10 ft by 10 ft square):</p>` +
        `<table><thead><tr><th>Slope</th><th>Hits per 10' x 10'</th><th>Notes</th></tr></thead><tbody>${squares.map((t) => `<tr><td>${escapeHtml(t.slope)}</td><td>${escapeHtml(t.hits)}</td><td>${escapeHtml(t.notes)}</td></tr>`).join('')}</tbody></table>`)
    }
    if (comp?.findings.trim()) lines.push(bulletList(fill(comp.findings)))
    if (comp?.notes.trim()) lines.push(rich(fill(comp.notes)))
    if (!lines.length) return ''
    const label = c.id === 'shingles' ? `Shingle Field – Functional ${p.reportType === 'wind' ? 'Wind' : p.reportType === 'hail_wind' ? 'Hail and Wind' : 'Hail'} Damage` : c.label
    return `<h3>${++n}. ${escapeHtml(label)}</h3>${lines.join('\n')}${photoRef(c.id)}`
  }).filter(Boolean).join('\n')

  // ---- Weather / hail impact ------------------------------------------------------------------------------------------
  let w = 0
  const weatherParts: string[] = []
  if (p.hailMap.reportNumber.trim() || hailRows.length) {
    const ref = p.hailMap.reportNumber.trim() ? ` (Report No. ${escapeHtml(p.hailMap.reportNumber.trim())}${p.hailMap.verificationCode.trim() ? `, verification code ${escapeHtml(p.hailMap.verificationCode.trim())} at ihmverify.com` : ''})` : ''
    const table = hailRows.length
      ? `<table><thead><tr><th>Map date</th><th>At location</th><th>Within 1 mi</th><th>Within 3 mi</th><th>Within 10 mi</th></tr></thead><tbody>${hailRows.map((r) => `<tr><td>${escapeHtml(r.date.match(/^\d{4}-\d{2}-\d{2}$/) ? fd(r.date) : r.date)}</td><td>${escapeHtml(r.atLocation || '—')}</td><td>${escapeHtml(r.within1 || '—')}</td><td>${escapeHtml(r.within3 || '—')}</td><td>${escapeHtml(r.within10 || '—')}</td></tr>`).join('')}</tbody></table>` +
        `<p class="note">Interactive Hail Maps map dates begin at 6:00 a.m. CST on the indicated day and end at 6:00 a.m. CST the following day.</p>`
      : ''
    weatherParts.push(`<h3>${++w}. Hail Activity Near the Property</h3><p>The Interactive Hail Maps Hail Impact Report${ref} for ${escapeHtml(p.address || 'this property')} identifies hail events in the vicinity:</p>${table}` +
      (p.dateOfLoss ? `<p><strong>Primary storm event used for this report:</strong> ${escapeHtml(fd(p.dateOfLoss))}.</p>` : '') +
      (p.hailMap.notes.trim() ? rich(fill(p.hailMap.notes)) : ''))
  }
  if (selectedStorms.length && p.storm.place) {
    const rows = selectedStorms.map((r, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(KIND_LABEL[r.kind])}</td><td>${escapeHtml(describeMagnitude(r))}</td><td>${escapeHtml(formatCentralTime(r.at))}</td><td>${escapeHtml(`${r.miles} mi ${r.direction}`)}</td><td>${escapeHtml(`${r.location}, ${r.county} Co., ${r.state}`)}</td></tr>`).join('')
    const hail = selectedStorms.filter((r) => r.kind === 'hail' && r.magnitude !== null)
    const largest = hail.length ? Math.max(...hail.map((r) => r.magnitude!)) : null
    const nearest = selectedStorms[0]
    const facts = [
      `${selectedStorms.length} NOAA storm report${selectedStorms.length === 1 ? '' : 's'} within ${p.storm.radiusMiles} miles of the property${p.dateOfLoss ? ` around ${fd(p.dateOfLoss)}` : ''}.`,
      largest !== null ? `Largest hail reported: ${describeMagnitude({ kind: 'hail', magnitude: largest })}.` : '',
      `Nearest report: ${reportLabel(nearest)}, ${nearest.miles} miles ${nearest.direction} of the property.`,
    ].filter(Boolean)
    weatherParts.push(`<h3>${++w}. Storm Reports (NOAA)</h3><div class="flex">${stormPlotSvg(selectedStorms, p.storm.place, p.storm.radiusMiles)}<div style="flex:1;min-width:2.3in">${facts.map((f) => `<p>${escapeHtml(f)}</p>`).join('')}` +
      `<p class="legend">Blue circles: hail (bigger circle, bigger hail). Orange triangles: damaging wind. Red squares: tornado. Numbers match the table. Rings every ${escapeHtml(String(p.storm.radiusMiles / 4))} miles.</p></div></div>` +
      `<table><thead><tr><th>#</th><th>Type</th><th>Size or speed</th><th>Time (Central)</th><th>From the property</th><th>Reported near</th></tr></thead><tbody>${rows}</tbody></table>` +
      `<p class="note">Source: NOAA Storm Prediction Center preliminary local storm reports (spc.noaa.gov), read ${escapeHtml(formatCentralTime(p.storm.lookedUpAt ?? opts.generatedAt.toISOString()))}. Preliminary reports can be corrected later. Distances are from the property location found by the U.S. Census Bureau geocoder (${escapeHtml(p.storm.place.matched)}). A report shows where a storm was observed; hail can fall between reports.</p>` +
      (p.storm.notes.trim() ? rich(fill(p.storm.notes)) : ''))
  }
  if (p.correlation.trim() && weatherParts.length) weatherParts.push(`<h3>${++w}. Correlation with Observed Damage</h3>${rich(fill(p.correlation))}`)

  // ---- Code & manufacturer ---------------------------------------------------------------------------------------------
  let k = 0
  const codeParts: string[] = []
  if (includedCodes.length) {
    const where = p.codes.jurisdiction.trim()
    const title = where ? `${where.split(' (')[0]} Re-Roofing Requirements` : 'Building Code Requirements'
    codeParts.push(`<h3>${++k}. ${escapeHtml(title)}</h3>` +
      `<p>${escapeHtml(where ? `The ${where}${p.codes.edition.trim() ? `, ${p.codes.edition.trim()},` : ''} applies to this property and requires, among other things:` : `${p.codes.edition.trim() ? `The ${p.codes.edition.trim()} applies to this property and requires` : 'The building code requires'}, among other things:`)}</p>` +
      `<ul>${includedCodes.map((c) => `<li>${escapeHtml(c.text.trim() || c.title.trim())}${c.ref.trim() ? ` (${escapeHtml(c.ref.trim())})` : ''}</li>`).join('')}</ul>` +
      `<p class="note">Summaries in plain words; the adopted code text and local amendments govern.</p>`)
  }
  if (ice) {
    const inp = iwsInput(p)
    const cladding = CLADDING.find((c) => c.id === p.iws.cladding)
    const framing = FRAMING.find((f) => f.id === p.iws.framing)
    const inch = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(2).replace(/0$/, '')}"`
    codeParts.push(`<h3>${++k}. Ice &amp; Water Shield – ${ice.courses === 1 ? 'One-Course' : ice.courses === 2 ? 'Two-Course' : `${ice.courses}-Course`} Requirement at This Address</h3>` +
      `<p>The ice &amp; water shield calculation for ${escapeHtml(p.address || 'this property')}${p.iws.reportDate ? ` (${escapeHtml(fd(p.iws.reportDate))}${createdBy ? `, inspector: ${escapeHtml(createdBy)}` : ''})` : ''} calculates:</p><ul>` +
      `<li>Roof pitch: ${escapeHtml(`${inp.pitchRise}:12`)}.</li>` +
      `<li>Soffit overhang: ${inch(inp.overhangIn)}.</li>` +
      `<li>Wall assembly: ${escapeHtml(`${cladding && cladding.id !== 'other' ? cladding.label.toLowerCase() : 'cladding'} ${inch(inp.claddingIn)}, sheathing ${inch(inp.sheathingIn)}, ${framing && framing.id !== 'other' ? `${framing.id} framing` : 'framing'} ${inch(inp.framingIn)}, drywall ${inch(inp.drywallIn)}`)} (total ${inch(ice.wallDepthIn)}).</li>` +
      `<li>Horizontal run from fascia to the warm wall line plus 24": ${inch(ice.horizontalRunIn)}.</li>` +
      `<li>Sloped distance required to reach 24" inside the warm wall line: ${inch(ice.slopedRequiredIn)}.</li>` +
      `<li>Roll width ${inch(inp.rollWidthIn)} with a ${inch(inp.lapIn)} lap: ${ice.courses} course${ice.courses === 1 ? '' : 's'} cover ${inch(ice.coverageIn)}.</li></ul>` +
      `<p class="result">Result: ${ice.courses} full course${ice.courses === 1 ? '' : 's'} of ice &amp; water shield required at the eaves to meet IRC R905.1.2.</p>` +
      (ice.courses > 1 ? `<p>On this roof, a single course at the eaves does not extend far enough inside the wall line. ${ice.courses} courses are the minimum to meet the ice barrier requirement at this property.</p>` : '') +
      (p.iws.notes.trim() ? rich(fill(p.iws.notes)) : ''))
  }
  if (p.ventilation.include) {
    const v = sanitizeVentInput({ atticSqFt: p.ventilation.atticSqFt, intakeNfa: p.ventilation.intakeNfa, exhaustNfa: p.ventilation.exhaustNfa, method: p.ventilation.method })
    const r = ventilation(v)
    let body = ''
    if (r) {
      const sq = (x: number) => `${x.toLocaleString('en-US')} sq in`
      const exhaustNeed = r.requiredExhaustMin === r.requiredExhaustMax ? sq(r.requiredExhaustMax) : `${sq(r.requiredExhaustMin)} to ${sq(r.requiredExhaustMax)}`
      body += `<table><thead><tr><th></th><th>Required minimum</th><th>Measured</th></tr></thead><tbody>` +
        `<tr><td>Attic floor area</td><td colspan="2">${escapeHtml(v.atticSqFt.toLocaleString('en-US'))} sq ft, at 1/${v.method} of the area${v.method === 300 ? ' (balanced high and low vents)' : ''}</td></tr>` +
        `<tr><td>Total net free area</td><td>${escapeHtml(sq(r.requiredTotal))}</td><td>${escapeHtml(sq(r.existingTotal))}</td></tr>` +
        `<tr><td>Intake (low, soffit)</td><td>${escapeHtml(sq(r.requiredIntake))}</td><td>${escapeHtml(sq(Math.round(v.intakeNfa)))}</td></tr>` +
        `<tr><td>Exhaust (high, ridge or roof vents)</td><td>${escapeHtml(exhaustNeed)}</td><td>${escapeHtml(sq(Math.round(v.exhaustNfa)))}</td></tr>` +
        `</tbody></table>` +
        `<p class="${r.meetsMinimum ? 'ok' : 'short'}">${r.meetsMinimum ? 'The measured ventilation meets the code minimum.' : 'The measured ventilation does not meet the code minimum.'}</p>` +
        `<ul>${r.findings.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>` +
        `<p class="note">Minimum from IRC R806.2: net free ventilating area of 1/150 of the attic floor area, or 1/300 with 40-50% of it in the upper attic. Net free area is the figure printed on each vent.</p>`
    }
    if (p.ventilation.notes.trim()) body += rich(fill(p.ventilation.notes))
    if (body) codeParts.push(`<h3>${++k}. Ventilation and Shingle Performance</h3>${body}`)
  }
  if (p.flashingsNote.trim() && (p.components.flashings.findings.trim() || p.components.flashings.notes.trim())) {
    codeParts.push(`<h3>${++k}. Flashings – Reuse Limitations</h3>${rich(fill(p.flashingsNote))}`)
  }
  if (p.manufacturer.include && (p.manufacturer.system.trim() || p.manufacturer.points.trim())) {
    const sys = p.manufacturer.system.trim() || 'The new shingle'
    codeParts.push(`<h3>${++k}. ${escapeHtml(sys)} – System Approach</h3><p>${escapeHtml(`The ${p.manufacturer.system.trim() || 'new'} shingle system is intended to be installed as an integrated roof system:`)}</p>${bulletList(fill(p.manufacturer.points))}${p.manufacturer.notes.trim() ? rich(fill(p.manufacturer.notes)) : ''}`)
  }

  // ---- Scope & cost ----------------------------------------------------------------------------------------------------
  const scope = scopeLines(p)
  const costRows = p.costRows.filter((r) => r.category.trim() || r.description.trim())
  let s = 0
  const scopeParts: string[] = []
  if (scope.length) {
    scopeParts.push(`<h3>${++s}. Scope of Work – Roof System Replacement</h3>` +
      `<p>${escapeHtml(`To return the roof system and directly related components at ${p.address || 'this property'} to a code-compliant, pre-loss condition${p.dateOfLoss ? ` after the ${fd(p.dateOfLoss)} storm event` : ''}, the reasonable and necessary scope of work includes:`)}</p>` +
      `<ul>${scope.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>` +
      (p.scope.source.trim() ? `<p class="note">Quantities from the ${escapeHtml(p.scope.source.trim())}.</p>` : ''))
  }
  if (costRows.length || p.totalPrice.trim()) {
    scopeParts.push(`<h3>${++s}. Cost of Roofing System</h3>` +
      (costRows.length ? `<table><thead><tr><th style="width:1.8in">Work Category</th><th>Description</th></tr></thead><tbody>${costRows.map((r) => `<tr><td>${escapeHtml(r.category)}</td><td>${escapeHtml(fill(r.description))}</td></tr>`).join('')}</tbody></table>` : '') +
      (p.totalPrice.trim() ? `<p class="total">Total Contract Price for Roofing System Replacement: ${escapeHtml(money(p.totalPrice))}</p>` : '') +
      (p.costNote.trim() ? rich(fill(p.costNote)) : ''))
  }
  const signature = `<div class="sign"><p>${escapeHtml(`Respectfully submitted${p.preparedFor.trim() ? ` for ${p.preparedFor.trim()}'s construction review` : ''},`)}</p>` +
    `<p><strong>${escapeHtml(createdBy || BRAND)}</strong><br>${BRAND}<br>Ph: ${escapeHtml(phone)}${p.email.trim() ? `<br>Email: ${escapeHtml(p.email.trim())}` : ''}</p>` +
    `<p class="note">This report records the storm information and the conditions we observed and photographed. It is not an engineering report and does not decide insurance coverage.</p></div>`

  // ---- Photo report and attachments -----------------------------------------------------------------------------------
  const photoReport = photos.length ? COMPONENTS.map((c) => {
    const list = photos.filter((ph) => ph.section === c.id)
    if (!list.length) return ''
    return `<h3>${escapeHtml(c.label)}</h3>` + list.map((ph) => {
      const f = opts.files[ph.fileId]
      const when = formatTaken(f.takenAt)
      const num = photoNumbers.get(ph.id)!
      return `<div class="photo"><div class="img"><img src="${escapeHtml(safeImgSrc(f.src)!)}" alt="${escapeHtml(ph.caption || `Photo ${num}`)}"><span class="num">${num}</span></div>` +
        `<div><p class="cap">${escapeHtml(ph.caption || `Photo ${num}`)}</p><p class="meta">${escapeHtml(p.address || '')}${when ? `<br>Taken: ${escapeHtml(when)}` : ''}${createdBy ? `<br>By: ${escapeHtml(createdBy)}` : ''}</p></div></div>`
    }).join('')
  }).join('') + `<p class="note">"Taken" times come from the camera's own record in each photo file, when it has one.</p>` : ''

  const docs = p.documents.filter((d) => d.pageFileIds.some((id) => opts.files[id] && safeImgSrc(opts.files[id].src)))
  const appendix = docs.map((d, i) => {
    const letter = String.fromCharCode(65 + (i % 26))
    const pages = d.pageFileIds.filter((id) => opts.files[id] && safeImgSrc(opts.files[id].src))
    const shown = pages.map((id, j) => `<div class="docpage">${j === 0 ? `<h2>Attachment ${letter}. ${escapeHtml(d.title || d.originalName)}</h2>${d.source.trim() ? `<p class="note">Source: ${escapeHtml(d.source)}</p>` : ''}` : ''}<img src="${escapeHtml(safeImgSrc(opts.files[id].src)!)}" alt="${escapeHtml(`${d.title || d.originalName}, page ${j + 1}`)}"></div>`).join('')
    const more = d.pagesTotal > pages.length ? `<p class="note">Showing the first ${pages.length} of ${d.pagesTotal} pages of ${escapeHtml(d.originalName)}.</p>` : ''
    return shown + more
  }).join('')

  const sections = [
    `<section>${cover}</section>`,
    damage ? `<section class="major">${head('Inspection-Based Damage Summary')}<h2>Inspection-Based Damage Summary</h2>${damage}</section>` : '',
    weatherParts.length ? `<section class="major">${head(`Weather / ${p.reportType === 'wind' ? 'Wind' : 'Hail'} Impact Summary`)}<h2>Weather / ${p.reportType === 'wind' ? 'Wind' : 'Hail'} Impact Summary</h2>${weatherParts.join('\n')}</section>` : '',
    codeParts.length ? `<section class="major">${head('Code & Manufacturer Requirements')}<h2>Code &amp; Manufacturer Requirements – Roof System</h2>${codeParts.join('\n')}</section>` : '',
    `<section class="major">${head('Roof System Scope & Cost Summary')}<h2>Roof System Scope &amp; Cost Summary</h2>${scopeParts.join('\n')}${signature}</section>`,
    photoReport ? `<section class="major">${head('Inspection Photo Report')}<h2>Inspection Photo Report</h2>${photoReport}</section>` : '',
  ].filter(Boolean).join('\n')

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(`Roof System Evidence Package: ${p.address || 'Property'}`)}</title><style>${CSS}</style></head>
<body><div class="page">
${sections}
${appendix}
</div></body></html>`
}

/** The ice & water shield inputs as numbers. */
export function iwsInput(p: ProofPackage) {
  const framing = FRAMING.find((f) => f.id === p.iws.framing)
  const cladding = CLADDING.find((c) => c.id === p.iws.cladding)
  return {
    pitchRise: numberFrom(p.iws.pitchRise),
    overhangIn: numberFrom(p.iws.overhangIn),
    claddingIn: p.iws.claddingOverrideIn.trim() ? numberFrom(p.iws.claddingOverrideIn) : cladding?.inches ?? 0,
    sheathingIn: numberFrom(p.iws.sheathingIn, 0.5),
    framingIn: framing && framing.id !== 'other' ? framing.inches : numberFrom(p.iws.framingOtherIn),
    drywallIn: numberFrom(p.iws.drywallIn, 0.5),
    rollWidthIn: numberFrom(p.iws.rollWidthIn, 36),
    lapIn: numberFrom(p.iws.lapIn, 3.5),
  }
}

/** File name for the download, e.g. "Evidence package - 123 Main St - 2026-11-10.html". */
export function reportFileName(p: Pick<ProofPackage, 'address' | 'preparedOn'>, ext: 'html' | 'pdf' = 'html'): string {
  const addr = (p.address || 'property').replace(/[^A-Za-z0-9 #.-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'property'
  return `Evidence package - ${addr} - ${p.preparedOn || 'draft'}.${ext}`
}

/** The starter code list, every item unticked. */
export function starterCodes() {
  return CODE_LIBRARY.map((c) => ({ ...c, include: false }))
}
