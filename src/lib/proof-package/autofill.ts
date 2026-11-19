// Proof-package cover autofill (pure, no imports): read the blank cover fields out of the plain text of an
// uploaded PDF (a claim letter, adjuster summary, hail report or evidence package). Heuristic and conservative —
// it only returns a value when a labelled match is found, and never overwrites a field the user already typed.
// The PDF text is pulled in the browser by pdfToText in browser-files.ts; this module never touches the DOM.

/** The cover fields this can read. Keys match ProofPackage cover fields. Dates are ISO yyyy-mm-dd. */
export type ExtractedCover = {
  preparedFor?: string // insurance company
  owner?: string // homeowner
  address?: string // street address
  cityStateZip?: string
  claimNumber?: string
  dateOfLoss?: string
  inspectionDate?: string
}

export const COVER_AUTOFILL_FIELDS = ['preparedFor', 'owner', 'address', 'cityStateZip', 'claimNumber', 'dateOfLoss', 'inspectionDate'] as const
export type CoverAutofillField = (typeof COVER_AUTOFILL_FIELDS)[number]

/** Short, homeowner-plain names for the "Filled: …" confirmation. */
export const COVER_AUTOFILL_LABELS: Record<CoverAutofillField, string> = {
  preparedFor: 'insurance company',
  owner: 'homeowner',
  address: 'street address',
  cityStateZip: 'city, state and ZIP',
  claimNumber: 'claim number',
  dateOfLoss: 'storm event date',
  inspectionDate: 'inspection date',
}

// Labels that can terminate a captured value, so two-column text that collapses to one line
// ("Prepared For: Allstate   Homeowner: Jane Doe") doesn't bleed one field into the next.
// More specific variants come before shorter ones that share a prefix.
const STOP_LABELS = [
  'Homeowner', 'Insured', 'Policyholder', 'Property\\s*Owner', 'Owner',
  'Prepared\\s*For', 'Insurance\\s*Company', 'Insurance\\s*Carrier', 'Carrier', 'Insurer', 'Insurance',
  'Property\\s*Address', 'Site\\s*Address', 'Loss\\s*Location', 'Street\\s*Address', 'Mailing\\s*Address', 'Address',
  'City\\s*/\\s*State\\s*/\\s*ZIP', 'City\\s*,?\\s*State\\s*,?\\s*ZIP', 'City\\s*/\\s*ZIP', 'City',
  'Claim\\s*#', 'Claim\\s*No\\.?', 'Claim\\s*Number', 'Claim',
  'Date\\s*of\\s*Loss', 'Loss\\s*Date', 'Date\\s*of\\s*Storm', 'Storm\\s*Date', 'DOL',
  'Inspection\\s*Dates?', 'Date\\s*Inspected', 'Date\\s*of\\s*Inspection', 'Inspected\\s*On',
  'Policy', 'Adjuster', 'Deductible', 'Phone', 'Email', 'Report', 'Page',
]
const STOP = `(?:${STOP_LABELS.join('|')})`

function clean(v: string | undefined): string {
  return (v ?? '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:·•\-]+/, '')
    .replace(/[\s,;:·•\-]+$/, '')
    .trim()
}

/** Value after the first matching label, stopping at the next known label (with a colon) or end of line. */
function capture(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*:\\s*([^\\n]*?)\\s*(?=${STOP}\\s*:|\\n|$)`, 'i')
    const m = text.match(re)
    const v = clean(m?.[1])
    if (v) return v
  }
  return undefined
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

function iso(y: number, m: number, d: number): string | undefined {
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : undefined
}

/** First calendar date in a string → ISO. Handles "April 24–25, 2026", "Apr 24, 2026", "4/24/2026", "2026-04-24". */
export function firstDateISO(raw: string): string | undefined {
  if (!raw) return undefined
  // PDF text extraction often sprinkles spaces around separators ("05 / 10 / 2026"); close them up first.
  const s = raw.replace(/(\d)\s*([/–—-])\s*(\d)/g, '$1$2$3')
  let m = s.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:\s*[–-]\s*\d{1,2})?,?\s+(\d{4})\b/)
  if (m) {
    const mon = MONTHS[m[1].slice(0, 3).toLowerCase()]
    if (mon) return iso(+m[3], mon, +m[2])
  }
  m = s.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/)
  if (m) return iso(+m[1], +m[2], +m[3])
  m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/)
  if (m) return iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[1], +m[2])
  return undefined
}

// A "City, ST 12345" (or "…-6789") tail at the end of an address value.
const CITY_STATE_ZIP = /([A-Za-z][A-Za-z.\s]*,\s*[A-Za-z]{2}\.?\s*\d{5}(?:-\d{4})?)\s*$/
// Words that mark a street even when it has no house number (e.g. "County Road 5", "Main Street").
const STREET_WORD = /\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|ct|court|cir|circle|way|hwy|highway|pl|place|ter|terrace|pkwy|parkway|trail|loop|route|rte|pike|row|run|cove|crossing|xing)\b/i

/** Pull a "City, ST 12345" tail off an address value so street and city/state/ZIP land in their own fields. */
function splitStreetCityZip(full: string): { street?: string; cityStateZip?: string } {
  const s = clean(full)
  if (!s) return {}
  const m = s.match(CITY_STATE_ZIP)
  if (m) {
    const cityStateZip = clean(m[1])
    const street = clean(s.slice(0, m.index).replace(/[,\s]+$/, ''))
    return street ? { street, cityStateZip } : { cityStateZip }
  }
  return { street: s }
}

const WORD = /[A-Za-z]/
function looksLikeStreet(s: string): boolean {
  return /\d/.test(s) || STREET_WORD.test(s)
}
// Values a form uses to mean "nothing here" — never worth filling into a blank box.
const PLACEHOLDER = /^(n\/?a|n\.a\.?|none|null|tbd|t\.b\.d\.?|pending|unknown|not\s*(given|listed|provided|available|applicable))$/i

/** Heuristically read cover fields from a report's plain text. Returns only fields found with confidence. */
export function extractCoverFields(text: string): ExtractedCover {
  if (!text || text.trim().length < 15) return {}
  const out: ExtractedCover = {}

  const owner = capture(text, ['Homeowner', 'Insured', 'Policyholder', 'Property\\s*Owner', 'Owner'])
  // A homeowner name must read like a name, not a date, a placeholder or a bare number.
  if (owner && WORD.test(owner) && !firstDateISO(owner) && !PLACEHOLDER.test(owner) && owner.length <= 80) out.owner = owner

  const carrier = capture(text, ['Prepared\\s*For', 'Insurance\\s*Company', 'Insurance\\s*Carrier', 'Carrier', 'Insurer', 'Insurance'])
  if (carrier && WORD.test(carrier) && !firstDateISO(carrier) && !PLACEHOLDER.test(carrier) && carrier.length <= 80) out.preparedFor = carrier

  const streetRaw = capture(text, ['Property\\s*Address', 'Site\\s*Address', 'Loss\\s*Location', 'Street\\s*Address', 'Address'])
  const cityRaw = capture(text, ['City\\s*/\\s*State\\s*/\\s*ZIP', 'City\\s*,?\\s*State\\s*,?\\s*ZIP', 'City\\s*/\\s*ZIP', 'City'])
  if (streetRaw) {
    const split = splitStreetCityZip(streetRaw)
    // Only treat it as a street when it reads like one (a number or a street word); a bare "City, ST ZIP"
    // captured under an "Address" label belongs in the city/state/ZIP box instead.
    if (split.street && looksLikeStreet(split.street) && WORD.test(split.street)) out.address = split.street
    const cityStateZip = cityRaw ?? split.cityStateZip
    if (cityStateZip && WORD.test(cityStateZip)) out.cityStateZip = clean(cityStateZip)
  } else if (cityRaw && WORD.test(cityRaw)) {
    out.cityStateZip = clean(cityRaw)
  }

  const claim = capture(text, ['Claim\\s*#', 'Claim\\s*No\\.?', 'Claim\\s*Number', 'Claim'])
  // Claim numbers are short tokens, not sentences or placeholders.
  if (claim && /\d/.test(claim) && !PLACEHOLDER.test(claim) && claim.length <= 40 && claim.split(/\s+/).length <= 4) out.claimNumber = claim

  const loss = capture(text, ['Date\\s*of\\s*Loss', 'Loss\\s*Date', 'Date\\s*of\\s*Storm', 'Storm\\s*Date', 'DOL'])
  const lossIso = loss && firstDateISO(loss)
  if (lossIso) out.dateOfLoss = lossIso

  const inspected = capture(text, ['Inspection\\s*Dates?', 'Date\\s*of\\s*Inspection', 'Date\\s*Inspected', 'Inspected\\s*On'])
  const inspectedIso = inspected && firstDateISO(inspected)
  if (inspectedIso) out.inspectionDate = inspectedIso

  return out
}

/** Fill only the cover fields that are currently blank; report which ones were applied, in display order. */
export function mergeCoverAutofill(
  current: Record<CoverAutofillField, string>,
  extracted: ExtractedCover,
): { patch: Partial<Record<CoverAutofillField, string>>; applied: CoverAutofillField[] } {
  const patch: Partial<Record<CoverAutofillField, string>> = {}
  const applied: CoverAutofillField[] = []
  for (const f of COVER_AUTOFILL_FIELDS) {
    const val = extracted[f]
    if (val && !(current[f] ?? '').trim()) {
      patch[f] = val
      applied.push(f)
    }
  }
  return { patch, applied }
}
