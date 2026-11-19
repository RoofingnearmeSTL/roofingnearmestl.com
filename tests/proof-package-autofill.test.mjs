import test from 'node:test'
import assert from 'node:assert/strict'
import { loadTs } from './helpers/load-ts.mjs'

const autofill = loadTs('src/lib/proof-package/autofill.ts')

// A typical adjuster/claim summary, with separate street and city lines.
const ADJUSTER = `ROOF DAMAGE ASSESSMENT

Prepared For: Allstate Insurance Company
Homeowner: Jane Q. Homeowner
Property Address: 1423 Maple Avenue
City/State/ZIP: Kirkwood, MO 63122
Claim #: 0938-AQ-55217
Date of Loss: May 10, 2026
Inspection Date: May 14, 2026
Adjuster: Bob Smith
Deductible: $1,000
`

test('extracts the cover fields from a labelled report', () => {
  const f = autofill.extractCoverFields(ADJUSTER)
  assert.equal(f.preparedFor, 'Allstate Insurance Company')
  assert.equal(f.owner, 'Jane Q. Homeowner')
  assert.equal(f.address, '1423 Maple Avenue')
  assert.equal(f.cityStateZip, 'Kirkwood, MO 63122')
  assert.equal(f.claimNumber, '0938-AQ-55217')
  assert.equal(f.dateOfLoss, '2026-05-10')
  assert.equal(f.inspectionDate, '2026-05-14')
})

test('splits a one-line address into street and city/state/ZIP', () => {
  const f = autofill.extractCoverFields('Property Address: 77 Oak Dr, Saint Louis, MO 63129-1234\nClaim No: 12345')
  assert.equal(f.address, '77 Oak Dr')
  assert.equal(f.cityStateZip, 'Saint Louis, MO 63129-1234')
  assert.equal(f.claimNumber, '12345')
})

test('reads Insured/Carrier variants even when two columns collapse to one line', () => {
  const f = autofill.extractCoverFields('Insured: John Roe   Carrier: State Farm   Claim #: SF-99   Date of Loss: 05/10/2026')
  assert.equal(f.owner, 'John Roe')
  assert.equal(f.preparedFor, 'State Farm')
  assert.equal(f.claimNumber, 'SF-99')
  assert.equal(f.dateOfLoss, '2026-05-10')
})

test('rejects dates, placeholders and sentence-like values', () => {
  // A date given where the carrier should be is not a carrier.
  assert.equal(autofill.extractCoverFields('Carrier: 05/10/2026').preparedFor, undefined)
  // Placeholders mean "nothing here".
  const ph = autofill.extractCoverFields('Insured: N/A\nClaim #: Pending\nInsurance Company: Unknown')
  assert.equal(ph.owner, undefined)
  assert.equal(ph.claimNumber, undefined)
  assert.equal(ph.preparedFor, undefined)
  // A city line with no house number is not a street address.
  const noNum = autofill.extractCoverFields('Address: Kirkwood, MO 63122')
  assert.equal(noNum.address, undefined)
  assert.equal(noNum.cityStateZip, 'Kirkwood, MO 63122')
  // An over-long claim value (a sentence) is not a claim number.
  assert.equal(autofill.extractCoverFields('Claim: no claim number has been assigned to this file yet').claimNumber, undefined)
})

test('returns nothing for empty or label-free text', () => {
  assert.deepEqual(autofill.extractCoverFields(''), {})
  assert.deepEqual(autofill.extractCoverFields('   '), {})
  assert.deepEqual(autofill.extractCoverFields('Just a paragraph of prose with no labelled fields at all.'), {})
})

test('firstDateISO parses the common formats and ranges', () => {
  assert.equal(autofill.firstDateISO('May 10, 2026'), '2026-05-10')
  assert.equal(autofill.firstDateISO('April 24–25, 2026'), '2026-04-24')
  assert.equal(autofill.firstDateISO('4/24/2026'), '2026-04-24')
  assert.equal(autofill.firstDateISO('4/24/26'), '2026-04-24')
  assert.equal(autofill.firstDateISO('2026-04-24'), '2026-04-24')
  assert.equal(autofill.firstDateISO('13/40/2026'), undefined) // out of range
  assert.equal(autofill.firstDateISO('no date here'), undefined)
})

test('merge fills only blank fields and reports them in display order', () => {
  const blank = { preparedFor: '', owner: '', address: '', cityStateZip: '', claimNumber: '', dateOfLoss: '', inspectionDate: '' }
  const extracted = autofill.extractCoverFields(ADJUSTER)
  const all = autofill.mergeCoverAutofill(blank, extracted)
  assert.deepEqual(all.applied, ['preparedFor', 'owner', 'address', 'cityStateZip', 'claimNumber', 'dateOfLoss', 'inspectionDate'])
  assert.equal(all.patch.owner, 'Jane Q. Homeowner')

  // Fields the user already typed are never overwritten.
  const partial = { ...blank, owner: 'Existing Name', inspectionDate: '2026-11-01' }
  const some = autofill.mergeCoverAutofill(partial, extracted)
  assert.equal(some.applied.includes('owner'), false)
  assert.equal(some.applied.includes('inspectionDate'), false)
  assert.equal(some.patch.owner, undefined)
  assert.equal(some.patch.preparedFor, 'Allstate Insurance Company')

  // Nothing extracted → nothing applied.
  assert.deepEqual(autofill.mergeCoverAutofill(blank, {}).applied, [])
})

test('every autofill field has a plain-language label', () => {
  for (const f of autofill.COVER_AUTOFILL_FIELDS) {
    assert.equal(typeof autofill.COVER_AUTOFILL_LABELS[f], 'string')
    assert.ok(autofill.COVER_AUTOFILL_LABELS[f].length > 0)
  }
})
