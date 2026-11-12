// Proof package data model (pure, no imports except types), shared by the builder and the report.
// The sections follow Mike's own evidence package: cover with purpose and a system-level opinion, an
// inspection-based damage summary, a weather / hail impact summary, code and manufacturer requirements (with the
// ice & water shield and ventilation calculations), and a scope and cost summary, then the photo report and
// attachments.
import type { NearbyReport } from './storms'
import type { VentMethod } from './ventilation'

export const COMPONENTS = [
  { id: 'property', label: 'Property & Roof Configuration' },
  { id: 'shingles', label: 'Shingle Field – Functional Damage' },
  { id: 'flashings', label: 'Flashings & Penetrations' },
  { id: 'gutters', label: 'Gutters, Downspouts and Gutter Guards' },
  { id: 'collateral', label: 'Window Screens and Collateral' },
  { id: 'ventilation', label: 'Ventilation-Related Conditions' },
  { id: 'interior', label: 'Interior' },
  { id: 'other', label: 'Other' },
] as const

export type ComponentId = (typeof COMPONENTS)[number]['id']
/** Kept for older code and tests: photos are grouped by component. */
export const PHOTO_SECTIONS = COMPONENTS
export type PhotoSection = ComponentId

export const REPORT_TYPES = [
  { id: 'hail', label: 'Hail', subtitle: 'Construction Report – Hail-Damaged Roof System' },
  { id: 'wind', label: 'Wind', subtitle: 'Construction Report – Wind-Damaged Roof System' },
  { id: 'hail_wind', label: 'Hail and wind', subtitle: 'Construction Report – Hail- and Wind-Damaged Roof System' },
] as const
export type ReportType = (typeof REPORT_TYPES)[number]['id']

/** A file kept in the browser: a photo, or one page image of an attached PDF. */
export type StoredFile = { id: string; name: string; type: string; dataUrl: string; width: number; height: number; takenAt: string | null }

export type Photo = { id: string; fileId: string; section: ComponentId; caption: string }
export type TestSquare = { id: string; slope: string; hits: string; notes: string }
export type AttachedDoc = { id: string; title: string; source: string; pageFileIds: string[]; originalName: string; pagesTotal: number }
export type CodeChoice = { id: string; ref: string; title: string; text: string; include: boolean }
export type HailMapRow = { id: string; date: string; atLocation: string; within1: string; within3: string; within10: string }
export type CostRow = { id: string; category: string; description: string }

export type ProofPackage = {
  id: string
  version: 2
  createdAt: string
  updatedAt: string
  // Cover
  reportType: ReportType
  preparedFor: string
  owner: string
  address: string
  cityStateZip: string
  structureType: string
  roofSystem: string
  claimNumber: string
  dateOfLoss: string
  inspectionDate: string
  inspectionDateEnd: string
  preparedBy: string
  preparedOn: string
  phone: string
  email: string
  purpose: string
  opinionFindings: string
  opinionConclusion: string
  // Inspection-based damage summary
  components: Record<ComponentId, { findings: string; notes: string }>
  testSquares: TestSquare[]
  photos: Photo[]
  // Weather / hail impact
  hailMap: { reportNumber: string; verificationCode: string; reportDate: string; rows: HailMapRow[]; notes: string }
  storm: {
    radiusMiles: number
    span: number
    lookedUpAt: string | null
    place: { matched: string; lat: number; lon: number } | null
    reports: NearbyReport[]
    selected: string[]
    notes: string
    /** Optional "lat, lon" for addresses the Census lookup can't find. */
    coords: string
  }
  correlation: string
  // Code & manufacturer
  codes: { jurisdiction: string; edition: string; items: CodeChoice[] }
  iws: {
    include: boolean
    reportDate: string
    pitchRise: string
    overhangIn: string
    framing: string
    framingOtherIn: string
    cladding: string
    claddingOverrideIn: string
    sheathingIn: string
    drywallIn: string
    rollWidthIn: string
    lapIn: string
    notes: string
  }
  ventilation: { include: boolean; atticSqFt: string; intakeNfa: string; exhaustNfa: string; method: VentMethod; notes: string }
  flashingsNote: string
  manufacturer: { include: boolean; system: string; points: string; notes: string }
  // Scope & cost
  scope: {
    source: string
    tearOffSq: string
    iwsSf: string
    underlaymentSq: string
    dripEdgeLf: string
    starterLf: string
    shingleSq: string
    ridgeVentLf: string
    hipRidgeLf: string
    stepFlashingLf: string
    pipeBoots: string
    extra: string
  }
  costRows: CostRow[]
  totalPrice: string
  costNote: string
  // Attachments
  documents: AttachedDoc[]
}

export function newId(): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c?.randomUUID) return c.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Starter text. {placeholders} fill in from the form when the report is built (fillPlaceholders).
export const PURPOSE_STARTER =
  'This report is provided to assist {prepared for} in evaluating the roof at {address} strictly from a construction standpoint. It documents:\n' +
  '- The physical condition of the roof system and related components after the {date of loss} storm event.\n' +
  '- The building code requirements and manufacturer expectations that apply when the roof is repaired or replaced.\n' +
  '- The reasonable and necessary scope and cost to restore the roof system to its pre-loss condition as one functioning assembly.\n\n' +
  'The roof is treated as a single system: deck, underlayments, metals, shingles, flashings, ventilation, gutters, downspouts and related details. ' +
  'This report does not address coverage or policy interpretation; it describes what the construction work must look like for the system to perform.'

export const CONCLUSION_STARTER =
  'From a contractor\'s standpoint, spot shingle replacement and partial component swaps do not restore this roof to pre-loss condition, ' +
  'do not fully address the functional damage, and do not align with current code and manufacturer system requirements. ' +
  'A full, code-compliant roof system replacement is the reasonable and necessary construction approach.'

export const CORRELATION_STARTER =
  'The sequence is consistent:\n' +
  '- Hail in the area on {date of loss} large enough to damage asphalt shingles and light-gauge metal.\n' +
  '- Inspection on {inspection date} documenting fresh impacts to the shingles, metals and other components listed above.\n\n' +
  'From a contractor\'s perspective, the impact pattern and timing match a storm event and are not consistent with slow, uniform wear or normal aging alone.'

export const FLASHINGS_STARTER =
  'Existing flashings may be reused only when they are in good condition and still match the manufacturer\'s installation instructions. ' +
  'Flashings that are rusted, punctured, loose or within the damaged field do not meet that standard; reasonable and necessary work includes installing new, corrosion-resistant flashings at these locations during the reroof.'

export const MANUFACTURER_POINTS_STARTER =
  'Ice & water barrier at the eaves and other critical areas.\n' +
  'Continuous underlayment over the deck.\n' +
  'Starter strip at all eaves (and often rakes) for seal and wind resistance.\n' +
  'Field shingles fastened in the manufacturer\'s nailing pattern.\n' +
  'Matching hip and ridge shingles.\n' +
  'Intake and exhaust ventilation matched to the attic.'

export const COST_NOTE_STARTER =
  'This price represents the reasonable and necessary cost to restore the roof system and directly related components at this property to a code-compliant, pre-loss condition following the {date of loss} storm event.'

export const DEFAULT_COST_ROWS: Omit<CostRow, 'id'>[] = [
  { category: 'Roof Tear-Off & Deck Prep', description: 'Remove existing shingle roof (approx. {tear off} SQ), inspect the deck, replace any rotten sheathing as needed.' },
  { category: 'Waterproofing Components', description: 'Ice & water shield (approx. {ice and water} SF) and underlayment (approx. {underlayment} SQ) installed per current code and manufacturer guidelines.' },
  { category: 'Perimeter Metals & Starter', description: 'New drip edge (approx. {drip edge} LF) and starter strip (approx. {starter} LF) at all eaves and rakes.' },
  { category: 'Shingle System', description: '{shingle system} shingles (approx. {shingles} SQ), including hip & ridge (approx. {hip and ridge} LF) and ridge vent (approx. {ridge vent} LF).' },
  { category: 'Flashings', description: 'New pipe boots, step flashings and related components where existing are corroded, punctured or within the damaged field.' },
  { category: 'Exterior Components', description: 'Replacement of damaged gutters, downspouts, gutter guards and window screens as documented.' },
  { category: 'Protection & Cleanup', description: 'Property protection, daily cleanup, final cleanup and complete debris haul-off.' },
]

function emptyComponents(): ProofPackage['components'] {
  return Object.fromEntries(COMPONENTS.map((c) => [c.id, { findings: '', notes: '' }])) as ProofPackage['components']
}

export function emptyPackage(now: Date, codes: CodeChoice[]): ProofPackage {
  const today = now.toISOString().slice(0, 10)
  return {
    id: newId(), version: 2, createdAt: now.toISOString(), updatedAt: now.toISOString(),
    reportType: 'hail', preparedFor: '', owner: '', address: '', cityStateZip: '', structureType: '', roofSystem: '', claimNumber: '',
    dateOfLoss: '', inspectionDate: today, inspectionDateEnd: '', preparedBy: '', preparedOn: today, phone: '', email: '',
    purpose: PURPOSE_STARTER, opinionFindings: '', opinionConclusion: CONCLUSION_STARTER,
    components: emptyComponents(),
    testSquares: [
      { id: newId(), slope: 'Front', hits: '', notes: '' },
      { id: newId(), slope: 'Back', hits: '', notes: '' },
      { id: newId(), slope: 'Left', hits: '', notes: '' },
      { id: newId(), slope: 'Right', hits: '', notes: '' },
    ],
    photos: [],
    hailMap: { reportNumber: '', verificationCode: '', reportDate: '', rows: [], notes: '' },
    storm: { radiusMiles: 10, span: 1, lookedUpAt: null, place: null, reports: [], selected: [], notes: '', coords: '' },
    correlation: CORRELATION_STARTER,
    codes: { jurisdiction: '', edition: '', items: codes },
    iws: {
      include: false, reportDate: '', pitchRise: '', overhangIn: '', framing: '2x4', framingOtherIn: '', cladding: 'vinyl', claddingOverrideIn: '',
      sheathingIn: '0.5', drywallIn: '0.5', rollWidthIn: '36', lapIn: '3.5', notes: '',
    },
    ventilation: { include: false, atticSqFt: '', intakeNfa: '', exhaustNfa: '', method: 300, notes: '' },
    flashingsNote: FLASHINGS_STARTER,
    manufacturer: { include: false, system: '', points: MANUFACTURER_POINTS_STARTER, notes: '' },
    scope: { source: 'Roofr measurement report', tearOffSq: '', iwsSf: '', underlaymentSq: '', dripEdgeLf: '', starterLf: '', shingleSq: '', ridgeVentLf: '', hipRidgeLf: '', stepFlashingLf: '', pipeBoots: '', extra: '' },
    costRows: DEFAULT_COST_ROWS.map((r) => ({ ...r, id: newId() })),
    totalPrice: '',
    costNote: COST_NOTE_STARTER,
    documents: [],
  }
}

type Loose = Record<string, unknown>

/**
 * Bring a saved draft up to the current model: fields added since it was saved get their defaults, and the
 * version 1 names (carrier, summary, recommendation) move to their new places. Unknown values are dropped.
 */
export function normalizePackage(raw: unknown, codes: CodeChoice[]): ProofPackage {
  const base = emptyPackage(new Date(), codes)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Loose
  const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d)
  const out: ProofPackage = { ...base }
  for (const k of Object.keys(base) as (keyof ProofPackage)[]) {
    const v = r[k as string]
    const d = base[k]
    if (v === undefined) continue
    if (typeof d === 'string' && typeof v === 'string') (out as Loose)[k] = v
    else if (Array.isArray(d) && Array.isArray(v)) (out as Loose)[k] = v
    else if (d && typeof d === 'object' && !Array.isArray(d) && v && typeof v === 'object' && !Array.isArray(v)) (out as Loose)[k] = { ...(d as Loose), ...(v as Loose) }
  }
  out.id = str(r.id, base.id)
  out.version = 2
  out.reportType = REPORT_TYPES.some((t) => t.id === r.reportType) ? (r.reportType as ReportType) : 'hail'
  if (r.version === 1) {
    out.preparedFor = str(r.carrier, '')
    if (typeof r.summary === 'string' && r.summary.trim()) out.opinionFindings = r.summary
    if (typeof r.recommendation === 'string' && r.recommendation.trim()) out.opinionConclusion = r.recommendation
    out.photos = (Array.isArray(r.photos) ? r.photos as Photo[] : []).map((p) => ({
      ...p,
      section: ({ overview: 'property', roof: 'shingles', soft_metals: 'gutters', attic: 'ventilation' } as Record<string, ComponentId>)[p.section as string] ?? (COMPONENTS.some((c) => c.id === p.section) ? p.section : 'other'),
    }))
  }
  out.components = { ...emptyComponents(), ...(out.components ?? {}) }
  if (!out.codes.items?.length) out.codes = { ...out.codes, items: codes }
  return out
}

/** Fill {placeholders} in starter text from the form. Unknown placeholders stay as they are. */
export function fillPlaceholders(text: string, p: ProofPackage, formatDate: (d: string) => string, extra: Record<string, string> = {}): string {
  const values: Record<string, string> = {
    'date of loss': p.dateOfLoss ? formatDate(p.dateOfLoss) : '[date of loss]',
    'storm date': p.dateOfLoss ? formatDate(p.dateOfLoss) : '[date of loss]',
    'inspection date': inspectionDates(p, formatDate) || '[inspection date]',
    'prepared for': p.preparedFor.trim() || 'the insurance company',
    address: p.address.trim() || 'this property',
    'shingle system': p.manufacturer.system.trim() || 'New',
    'tear off': p.scope.tearOffSq.trim() || '—',
    'ice and water': p.scope.iwsSf.trim() || '—',
    underlayment: p.scope.underlaymentSq.trim() || '—',
    'drip edge': p.scope.dripEdgeLf.trim() || '—',
    starter: p.scope.starterLf.trim() || '—',
    shingles: p.scope.shingleSq.trim() || '—',
    'hip and ridge': p.scope.hipRidgeLf.trim() || '—',
    'ridge vent': p.scope.ridgeVentLf.trim() || '—',
    ...extra,
  }
  return text.replace(/\{([a-z ]+)\}/gi, (m, key: string) => values[key.toLowerCase()] ?? m)
}

export function inspectionDates(p: Pick<ProofPackage, 'inspectionDate' | 'inspectionDateEnd'>, formatDate: (d: string) => string): string {
  if (!p.inspectionDate) return ''
  if (!p.inspectionDateEnd || p.inspectionDateEnd === p.inspectionDate) return formatDate(p.inspectionDate)
  return `${formatDate(p.inspectionDate)} – ${formatDate(p.inspectionDateEnd)}`
}

/** Every file id the package still uses (for cleaning up removed photos and pages). */
export function usedFileIds(p: ProofPackage): Set<string> {
  const ids = new Set<string>()
  for (const ph of p.photos) ids.add(ph.fileId)
  for (const d of p.documents) for (const f of d.pageFileIds) ids.add(f)
  return ids
}

/** Scope of work bullets from the measurement quantities (only lines with a quantity, plus extra lines). */
export function scopeLines(p: ProofPackage): string[] {
  const s = p.scope
  const q = (v: string) => v.trim()
  const lines: string[] = []
  if (q(s.tearOffSq)) lines.push(`Remove the existing roof down to the deck (approx. ${q(s.tearOffSq)} squares).`, 'Inspect the deck and replace any deteriorated or damaged sheathing as needed.')
  if (q(s.iwsSf)) lines.push(`Install ice & water shield at all required eaves and valleys (approx. ${q(s.iwsSf)} square feet)${p.iws.include ? ' per the ice & water shield calculation' : ''}.`)
  if (q(s.underlaymentSq)) lines.push(`Install underlayment over the remaining roof areas (approx. ${q(s.underlaymentSq)} squares).`)
  if (q(s.dripEdgeLf)) lines.push(`Install new drip edge at all eaves and rakes (approx. ${q(s.dripEdgeLf)} linear feet).`)
  if (q(s.starterLf)) lines.push(`Install starter strip at all eaves and rakes (approx. ${q(s.starterLf)} linear feet).`)
  if (q(s.shingleSq)) lines.push(`Install new ${p.manufacturer.system.trim() ? `${p.manufacturer.system.trim()} ` : ''}shingles (approx. ${q(s.shingleSq)} squares) with the manufacturer's nailing pattern.`)
  if (q(s.ridgeVentLf) || q(s.hipRidgeLf)) {
    const parts = [q(s.ridgeVentLf) ? `ridge vent (approx. ${q(s.ridgeVentLf)} linear feet)` : '', q(s.hipRidgeLf) ? `matching hip & ridge cap shingles (approx. ${q(s.hipRidgeLf)} linear feet)` : ''].filter(Boolean)
    lines.push(`Install new ${parts.join(' and ')}.`)
  }
  if (q(s.stepFlashingLf)) lines.push(`Install new step flashing at roof-to-wall intersections (approx. ${q(s.stepFlashingLf)} linear feet).`)
  if (q(s.pipeBoots)) lines.push(`Install new pipe boots (${q(s.pipeBoots)}).`)
  for (const l of s.extra.split('\n').map((x) => x.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)) lines.push(l)
  return lines
}
