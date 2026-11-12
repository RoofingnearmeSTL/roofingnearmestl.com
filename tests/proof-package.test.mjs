import test from 'node:test'
import assert from 'node:assert/strict'
import { loadTs } from './helpers/load-ts.mjs'

const storms = loadTs('src/lib/proof-package/storms.ts')
const vent = loadTs('src/lib/proof-package/ventilation.ts')
const model = loadTs('src/lib/proof-package/model.ts')
const report = loadTs('src/lib/proof-package/report.ts')
const ice = loadTs('src/lib/proof-package/ice-barrier.ts')
const codes = loadTs('src/lib/proof-package/code-library.ts')

const HAIL_CSV = `Time,Size,Location,County,State,Lat,Lon,Comments
2254,175,2 N Kirkwood,St. Louis,MO,38.61,-90.41,Golf ball hail, covering the ground. (LSX)
0130,100,Ballwin,St. Louis,MO,38.6,-90.55,Quarter size. (LSX)
2300,125,Far Away,Greene,MO,37.21,-93.29,(SGF)
bad,row
2310,abc,No Size,St. Louis,MO,38.62,-90.40,
`

test('SPC days cover the Central dates around the date of loss', () => {
  assert.deepEqual(storms.spcDaysFor('2026-05-10', 1), ['2026-05-08', '2026-05-09', '2026-05-10', '2026-05-11'])
  assert.deepEqual(storms.spcDaysFor('2026-05-10', 0), ['2026-05-09', '2026-05-10'])
  assert.deepEqual(storms.spcDaysFor('not a date', 1), [])
  assert.equal(storms.spcCode('2026-05-10'), '260510')
})

test('SPC hail rows parse with UTC times that roll past midnight', () => {
  const rows = storms.parseSpcCsv(HAIL_CSV, 'hail', '2026-05-10')
  assert.equal(rows.length, 4)
  assert.equal(rows[0].at, '2026-05-10T22:54:00.000Z')
  assert.equal(rows[0].magnitude, 1.75)
  assert.equal(rows[0].comments, 'Golf ball hail, covering the ground. (LSX)')
  assert.equal(rows[1].at, '2026-05-11T01:30:00.000Z') // 0130 belongs to the next UTC morning
  assert.equal(rows[3].magnitude, null)
})

test('nearby reports are filtered by radius and Central date, nearest first, with a direction', () => {
  const rows = storms.parseSpcCsv(HAIL_CSV, 'hail', '2026-05-10')
  const home = { lat: 38.58, lon: -90.41 }
  const near = storms.nearbyReports(rows, home, 10, '2026-05-10', 0)
  // 01:30 UTC May 11 is 8:30 pm May 10 Central, so it is on the date of loss.
  assert.deepEqual(near.map((r) => r.location), ['2 N Kirkwood', 'No Size', 'Ballwin'])
  assert.equal(near[0].direction, 'N')
  assert.ok(near[0].miles > 1.9 && near[0].miles < 2.3)
  assert.equal(storms.nearbyReports(rows, home, 10, '2026-05-12', 0).length, 0)
  assert.equal(storms.describeMagnitude({ kind: 'hail', magnitude: 1.75 }), '1.75 in (golf ball)')
  assert.equal(storms.describeMagnitude({ kind: 'hail', magnitude: 0.5 }), '0.50 in')
  assert.equal(storms.describeMagnitude({ kind: 'wind', magnitude: 65 }), '65 mph')
})

test('the Census geocoder answer is read safely', () => {
  assert.deepEqual(storms.parseCensusGeocode({ result: { addressMatches: [{ matchedAddress: '11 N 4TH ST, SAINT LOUIS, MO, 63102', coordinates: { x: -90.1888, y: 38.6252 } }] } }),
    { matched: '11 N 4TH ST, SAINT LOUIS, MO, 63102', lat: 38.6252, lon: -90.1888 })
  assert.equal(storms.parseCensusGeocode({ result: { addressMatches: [] } }), null)
  assert.equal(storms.parseCensusGeocode(null), null)
})

test('ventilation follows the 1/150 and 1/300 minimums', () => {
  const r = vent.ventilation({ atticSqFt: 1500, intakeNfa: 360, exhaustNfa: 360, method: 300 })
  assert.equal(r.requiredTotal, 720)
  assert.equal(r.requiredExhaustMin, 288)
  assert.equal(r.requiredExhaustMax, 360)
  assert.equal(r.requiredIntake, 360)
  assert.equal(r.meetsMinimum, true)
  const short = vent.ventilation({ atticSqFt: 1500, intakeNfa: 100, exhaustNfa: 300, method: 300 })
  assert.equal(short.meetsMinimum, false)
  assert.equal(short.totalShort, 320)
  assert.equal(short.intakeShort, 260)
  assert.match(short.findings.join(' '), /not balanced/)
  assert.match(short.findings.join(' '), /more exhaust than intake/)
  assert.equal(vent.ventilation({ atticSqFt: 1500, intakeNfa: 0, exhaustNfa: 0, method: 150 }).requiredTotal, 1440)
  assert.equal(vent.ventilation({ atticSqFt: 0, intakeNfa: 1, exhaustNfa: 1, method: 300 }), null)
  assert.deepEqual(vent.sanitizeVentInput({ atticSqFt: '1,500', intakeNfa: '-3', exhaustNfa: 'x', method: 150 }), { atticSqFt: 1500, intakeNfa: 0, exhaustNfa: 0, method: 150 })
})

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

function samplePackage(overrides = {}) {
  const p = model.emptyPackage(new Date('2026-11-10T15:00:00Z'), report.starterCodes())
  return Object.assign(p, {
    owner: 'Test Homeowner', address: '123 Example St', cityStateZip: 'Kirkwood, MO 63122', dateOfLoss: '2026-05-10',
    inspectionDate: '2026-05-14', inspectionDateEnd: '2026-05-15', preparedBy: 'Inspector Name', preparedOn: '2026-11-10',
    preparedFor: 'Example Insurance', claimNumber: 'CLM-1',
  }, overrides)
}

test('the ice & water shield math matches the Building Experts Institute calculator', () => {
  // Mike's sample: 5:12, 13" overhang, vinyl 1.25 + sheathing 0.5 + 2x4 3.5 + drywall 0.5 = 5.75" wall.
  const r = ice.iceBarrier({ pitchRise: 5, overhangIn: 13, claddingIn: 1.25, sheathingIn: 0.5, framingIn: 3.5, drywallIn: 0.5, rollWidthIn: 36, lapIn: 3.5 })
  assert.deepEqual(r, { wallDepthIn: 5.75, horizontalRunIn: 42.75, slopedRequiredIn: 46.31, courses: 2, coverageIn: 68.5 })
  // 4:12, 6" overhang, 5.25" wall: 35.25" run, 37.16" sloped, just past one 36" roll.
  assert.equal(ice.iceBarrier({ pitchRise: 4, overhangIn: 6, claddingIn: 0.75, sheathingIn: 0.5, framingIn: 3.5, drywallIn: 0.5, rollWidthIn: 36, lapIn: 3.5 }).courses, 2)
  // 3:12, 4" overhang: 33.25" run, 34.27" sloped: one course.
  assert.equal(ice.iceBarrier({ pitchRise: 3, overhangIn: 4, claddingIn: 0.75, sheathingIn: 0.5, framingIn: 3.5, drywallIn: 0.5, rollWidthIn: 36, lapIn: 3.5 }).courses, 1)
})

test('ice barrier courses step up exactly at each roll edge', () => {
  const base = { overhangIn: 0, claddingIn: 0, sheathingIn: 0, framingIn: 0, drywallIn: 0, rollWidthIn: 36, lapIn: 3.5 }
  // A tiny pitch keeps the sloped distance almost equal to the 24" minimum plus the overhang.
  assert.equal(ice.iceBarrier({ ...base, pitchRise: 0.01, overhangIn: 11.99 }).courses, 1) // 35.99"
  assert.equal(ice.iceBarrier({ ...base, pitchRise: 0.01, overhangIn: 12.5 }).courses, 2) // 36.5"
  assert.equal(ice.iceBarrier({ ...base, pitchRise: 0.01, overhangIn: 44.4 }).courses, 2) // 68.4" <= 68.5
  assert.equal(ice.iceBarrier({ ...base, pitchRise: 0.01, overhangIn: 45 }).courses, 3)
  assert.equal(ice.iceBarrier({ ...base, pitchRise: 0 }), null)
  assert.equal(ice.iceBarrier({ ...base, pitchRise: 5, rollWidthIn: 3, lapIn: 3.5 }), null)
  assert.equal(ice.numberFrom('13"'), 13)
  assert.equal(ice.numberFrom('', 0.5), 0.5)
})

test('the St. Louis County list carries the checklist references and starts unticked', () => {
  const ids = codes.ST_LOUIS_COUNTY_LIBRARY.map((c) => c.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(codes.ST_LOUIS_COUNTY_LIBRARY.some((c) => c.ref === 'R905.2.8.5'))
  assert.ok(codes.ST_LOUIS_COUNTY_LIBRARY.some((c) => c.id === 'slco-ice-barrier' && /not required/.test(c.text)))
  assert.ok(report.starterCodes().every((c) => c.include === false))
})

test('the report escapes every value and fills the starter text', () => {
  const p = samplePackage({ owner: '<script>alert(1)</script>', opinionFindings: 'Shows damage from the {date of loss} storm\n- Second <b>finding</b>' })
  const html = report.buildReportHtml(p, { files: {}, logoSrc: '/logo.png', generatedAt: new Date('2026-11-10T15:00:00Z') })
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  assert.ok(html.includes('assist Example Insurance in evaluating the roof at 123 Example St'))
  assert.ok(html.includes('<li>Shows damage from the May 10, 2026 storm</li>'))
  assert.ok(html.includes('<li>Second &lt;b&gt;finding&lt;/b&gt;</li>'))
  assert.ok(html.includes('May 14, 2026 – May 15, 2026'))
  assert.ok(html.includes('314-202-7663'))
  assert.ok(html.includes('ROOF SYSTEM EVIDENCE PACKAGE') || html.includes('Roof System Evidence Package'))
  assert.ok(html.includes('Construction Report – Hail-Damaged Roof System'))
  assert.ok(!/GAF|Preferred|BBB|workers/i.test(html))
  assert.match(html, /<title>Roof System Evidence Package: 123 Example St<\/title>/)
})

test('an Illinois property gets the Illinois phone number', () => {
  assert.equal(report.isIllinois('Waterloo, IL 62298'), true)
  assert.equal(report.isIllinois('Columbia, Illinois'), true)
  assert.equal(report.isIllinois('Kirkwood, MO 63122'), false)
  const html = report.buildReportHtml(samplePackage({ cityStateZip: 'Waterloo, IL 62298' }), { files: {}, logoSrc: null, generatedAt: new Date() })
  assert.ok(html.includes('618-612-5192'))
  assert.ok(!html.includes('314-202-7663'))
})

test('every section renders like Mike\'s package; unsafe images are dropped', () => {
  const rows = storms.parseSpcCsv(HAIL_CSV, 'hail', '2026-05-10')
  const near = storms.nearbyReports(rows, { lat: 38.58, lon: -90.41 }, 10, '2026-05-10', 1)
  const p = samplePackage({ structureType: 'single-family brick and vinyl siding residence', roofSystem: 'gable-style asphalt shingle roof' })
  p.opinionFindings = 'Shows functional hail damage across multiple test squares'
  p.components.shingles.findings = 'Granule loss and bruising consistent with hail impact'
  p.components.flashings.findings = 'Pipe jack flashing with rust and exposed nail holes'
  p.storm = { ...p.storm, place: { matched: '123 EXAMPLE ST', lat: 38.58, lon: -90.41 }, reports: near, selected: near.slice(0, 2).map((r) => r.id), lookedUpAt: '2026-11-10T15:00:00Z' }
  p.hailMap = { reportNumber: '1234-5678', verificationCode: 'abc123', reportDate: '2026-05-12', rows: [{ id: 'h', date: '2026-05-10', atLocation: '', within1: '0.50"', within3: '0.75"', within10: '1.00"' }], notes: '' }
  p.photos = [
    { id: 'a', fileId: 'f1', section: 'shingles', caption: 'Hail hit on the front slope' },
    { id: 'b', fileId: 'f2', section: 'shingles', caption: 'Should not show' },
    { id: 'c', fileId: 'f1', section: 'property', caption: 'Front elevation' },
  ]
  p.testSquares[0].hits = '16-20'
  p.iws = { ...p.iws, include: true, pitchRise: '5', overhangIn: '13', reportDate: '2026-05-13' }
  p.ventilation = { include: true, atticSqFt: '1500', intakeNfa: '200', exhaustNfa: '300', method: 300, notes: '' }
  p.codes.items[2].include = true
  p.manufacturer = { include: true, system: 'Owens Corning Duration', points: model.MANUFACTURER_POINTS_STARTER, notes: '' }
  p.scope = { ...p.scope, tearOffSq: '21.70', iwsSf: '414.93', shingleSq: '23.90', ridgeVentLf: '85.25', hipRidgeLf: '85.25' }
  p.totalPrice = '13845'
  p.documents = [{ id: 'd', title: 'Hail impact report', source: 'Interactive Hail Maps', pageFileIds: ['f3'], originalName: 'hail.pdf', pagesTotal: 3 }]
  const files = {
    f1: { src: PNG, takenAt: '2026-05-14T15:41:00Z', width: 1, height: 1 },
    f2: { src: 'javascript:alert(1)', takenAt: null, width: 1, height: 1 },
    f3: { src: PNG, takenAt: null, width: 1, height: 1 },
  }
  const html = report.buildReportHtml(p, { files, logoSrc: 'https://evil.example/x.png', generatedAt: new Date('2026-11-10T15:00:00Z') })
  for (const h of ['Inspection-Based Damage Summary', 'Weather / Hail Impact Summary', 'Code &amp; Manufacturer Requirements – Roof System', 'Roof System Scope &amp; Cost Summary', 'Inspection Photo Report']) {
    assert.ok(html.includes(`<h2>${h}</h2>`), h)
  }
  assert.ok(html.includes('Using the RoofingnearmeSTL inspection report (2 photos), the Ice &amp; Water Shield (IWS) calculation, the Interactive Hail Maps report, NOAA Storm Prediction Center storm reports'))
  assert.ok(html.includes('The property is a single-family brick and vinyl siding residence with a gable-style asphalt shingle roof.'))
  // Photos are numbered by component: the property photo first.
  assert.ok(html.includes('<p class="cap">Front elevation</p>'))
  assert.ok(/<span class="num">1<\/span><\/div><div><p class="cap">Front elevation/.test(html))
  assert.ok(html.includes('Photo 2 in the photo report.'))
  assert.ok(html.includes('Taken: May 14, 2026'))
  assert.ok(!html.includes('javascript:'))
  assert.ok(!html.includes('evil.example'))
  assert.ok(html.includes('<td>Front</td><td>16-20</td>'))
  assert.ok(html.includes('Report No. 1234-5678, verification code abc123 at ihmverify.com'))
  assert.ok(html.includes('<strong>Primary storm event used for this report:</strong> May 10, 2026.'))
  assert.ok(html.includes('1.75 in (golf ball)'))
  assert.ok(html.includes('<svg class="plot"'))
  assert.ok(html.includes('Ice &amp; Water Shield – Two-Course Requirement at This Address'))
  assert.ok(html.includes('Sloped distance required to reach 24" inside the warm wall line: 46.31"'))
  assert.ok(html.includes('Result: 2 full courses of ice &amp; water shield required at the eaves to meet IRC R905.1.2.'))
  assert.ok(html.includes('does not meet the code minimum'))
  assert.ok(html.includes('(IRC R905.2.8.5)'))
  assert.ok(!html.includes('IRC R908.3.1.1')) // not ticked
  assert.ok(html.includes('Flashings – Reuse Limitations'))
  assert.ok(html.includes('Owens Corning Duration – System Approach'))
  assert.ok(html.includes('Remove the existing roof down to the deck (approx. 21.70 squares).'))
  assert.ok(html.includes('Install new Owens Corning Duration shingles (approx. 23.90 squares)'))
  assert.ok(html.includes('Ice &amp; water shield (approx. 414.93 SF)'))
  assert.ok(html.includes('Total Contract Price for Roofing System Replacement: $13,845.00'))
  assert.ok(html.includes('Respectfully submitted for Example Insurance&#39;s construction review,'))
  assert.ok(html.includes('Attachment A. Hail impact report'))
  assert.ok(html.includes('Showing the first 1 of 3 pages'))
  // Numbered parts within each section have no gaps.
  for (const sec of html.split('<section').slice(1)) {
    const nums = [...sec.matchAll(/<h3>(\d+)\. /g)].map((m) => Number(m[1]))
    assert.deepEqual(nums, nums.map((_, i) => i + 1))
  }
})

test('old drafts open in the new layout', () => {
  const v1 = { id: 'old', version: 1, carrier: 'Old Insurance', summary: 'Old summary', recommendation: 'Old recommendation', address: '1 Old Rd',
    photos: [{ id: 'p', fileId: 'f', section: 'roof', caption: 'x' }, { id: 'q', fileId: 'g', section: 'soft_metals', caption: 'y' }], bogus: 1 }
  const p = model.normalizePackage(v1, report.starterCodes())
  assert.equal(p.id, 'old')
  assert.equal(p.version, 2)
  assert.equal(p.preparedFor, 'Old Insurance')
  assert.equal(p.opinionFindings, 'Old summary')
  assert.equal(p.opinionConclusion, 'Old recommendation')
  assert.deepEqual(p.photos.map((x) => x.section), ['shingles', 'gutters'])
  assert.equal(p.components.flashings.findings, '')
  assert.equal(p.iws.rollWidthIn, '36')
  assert.equal('bogus' in p, false)
  assert.equal(model.normalizePackage(null, report.starterCodes()).version, 2)
})

test('scope lines only list measured quantities', () => {
  const p = samplePackage()
  assert.deepEqual(model.scopeLines(p), [])
  p.scope = { ...p.scope, dripEdgeLf: '206.34', pipeBoots: '1 EA', extra: '- Replace window screens\n\n' }
  assert.deepEqual(model.scopeLines(p), [
    'Install new drip edge at all eaves and rakes (approx. 206.34 linear feet).',
    'Install new pipe boots (1 EA).',
    'Replace window screens',
  ])
})

test('storm report labels read naturally', () => {
  assert.equal(report.reportLabel({ kind: 'hail', magnitude: 1.75 }), 'Hail 1.75 in (golf ball)')
  assert.equal(report.reportLabel({ kind: 'wind', magnitude: null }), 'Damaging wind (speed not given)')
  assert.equal(report.reportLabel({ kind: 'wind', magnitude: 60 }), 'Damaging wind 60 mph')
  assert.equal(report.reportLabel({ kind: 'tornado', magnitude: null }), 'Tornado')
})

test('plain text becomes paragraphs and bullets', () => {
  assert.equal(report.rich('Intro line\n- one\n- two\nAfter'), '<p>Intro line</p>\n<ul><li>one</li><li>two</li></ul>\n<p>After</p>')
  assert.equal(report.bulletList('a\n\n- b'), '<ul><li>a</li><li>b</li></ul>')
  assert.equal(report.bulletList('  \n'), '')
})

test('image sources are limited to inline, blob and same-site paths', () => {
  assert.equal(report.safeImgSrc(PNG), PNG)
  assert.equal(report.safeImgSrc('/logo.png'), '/logo.png')
  assert.equal(report.safeImgSrc('blob:http://localhost:3000/5d0c6a1e-1b2c-4d5e-8f90-123456789abc'), 'blob:http://localhost:3000/5d0c6a1e-1b2c-4d5e-8f90-123456789abc')
  for (const bad of ['//evil.example/x.png', 'https://evil.example/x.png', 'data:text/html;base64,PGI+', 'data:image/svg+xml;base64,PHN2Zz4=', '/x.png" onerror="1']) {
    assert.equal(report.safeImgSrc(bad), null, bad)
  }
  assert.equal(report.reportFileName({ address: '123 Example St / Apt <2>', preparedOn: '2026-11-10' }), 'Evidence package - 123 Example St Apt 2 - 2026-11-10.html')
})
