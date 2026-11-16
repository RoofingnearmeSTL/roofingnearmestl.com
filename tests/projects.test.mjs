// Our Work / before & after rules (Mike, Nov 15 2026). Run: node --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const loadTs = (file, imports = {}, extra = {}) => {
  const out = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: out, require: (name) => { if (name in imports) return imports[name]; throw new Error(`Unexpected import: ${name}`) }, process: { env: {} }, ...extra })
  return out
}
const reviews = loadTs('src/lib/reviews.ts')
const lib = loadTs('src/lib/projects.ts', { './reviews': reviews })
const read = (file) => fs.readFileSync(file, 'utf8')
const real = (over = {}) => ({
  slug: 'kirkwood-roof', service: 'Roof replacement', work: 'roofing', state: 'MO', problem: 'Old roof.', solution: 'New roof.',
  pairs: [{ before: { src: '/projects/kirkwood-roof/before-1.jpg', alt: 'Old roof', width: 1600, height: 1200 }, after: { src: '/projects/kirkwood-roof/after-1.jpg', alt: 'New roof', width: 1600, height: 1200 } }],
  permission: { photos: true, town: false }, ...over,
})

test('sample projects never show on the live site or on a main-branch build', () => {
  assert.equal(lib.samplesAllowed({ VERCEL_ENV: 'production' }), false)
  assert.equal(lib.samplesAllowed({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'main' }), false)
  assert.equal(lib.samplesAllowed({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'feature/x' }), true)
  assert.equal(lib.samplesAllowed({}), true) // this PC
  assert.equal(lib.visibleProjects({ VERCEL_ENV: 'production' }).some((p) => p.placeholder), false)
})

test('two real jobs show on the live site (St. Louis Metro siding job, Missouri roof job); no samples left', () => {
  assert.equal(lib.projects.filter((p) => p.placeholder).length, 0)
  assert.equal(lib.hasRealProjects(), true)
  const live = lib.visibleProjects({ VERCEL_ENV: 'production' })
  assert.deepEqual([...live.map((p) => p.slug)], ['st-louis-metro-siding-gutters-fascia', 'missouri-roof-replacement'])
  assert.ok(live.every((p) => p.featured), 'featured, so both show on the homepage')
  assert.equal(live[0].state, 'METRO', 'the universal St. Louis Metro job stays first, so /free-inspection keeps showing it')
  assert.match(read('src/app/our-work/page.tsx'), /notFound\(\)/)
  assert.match(read('src/app/sitemap.ts'), /hasRealProjects\(\)/)
})

test('roofing projects are Missouri only; Illinois is exterior only', () => {
  assert.throws(() => lib.assertProjectRules([real({ state: 'IL' })]), /Missouri only/)
  assert.throws(() => lib.assertProjectRules([real({ work: 'exterior', service: 'Siding', state: 'IL', solution: 'New roof and siding.' })]), /exterior work only/)
  for (const p of lib.projects) if (p.work === 'roofing') assert.equal(p.state, 'MO')
})

test('real projects need written photo permission, both photos and alt text', () => {
  assert.doesNotThrow(() => lib.assertProjectRules([real()]))
  assert.throws(() => lib.assertProjectRules([real({ permission: { photos: false, town: false } })]), /written OK/)
  assert.throws(() => lib.assertProjectRules([real({ pairs: [{ before: null, after: real().pairs[0].after }] })]), /before and an after/)
  assert.throws(() => lib.assertProjectRules([real({ pairs: [{ ...real().pairs[0], after: { ...real().pairs[0].after, alt: ' ' } }] })]), /alt text/)
  assert.throws(() => lib.assertProjectRules([real({ pairs: [{ ...real().pairs[0], before: { ...real().pairs[0].before, src: 'https://stock.example/roof.jpg' } }] })]), /public\/projects/)
})

test('a town needs the homeowner OK; never a street address or a price', () => {
  assert.throws(() => lib.assertProjectRules([real({ town: 'Kirkwood' })]), /homeowner's OK/)
  assert.equal(lib.projectTown(real({ town: 'Kirkwood', permission: { photos: true, town: true } })), 'Kirkwood, MO')
  assert.equal(lib.projectTown(real()), 'Missouri')
  assert.throws(() => lib.assertProjectRules([real({ problem: 'Leak at 123 Main St.' })]), /street addresses/)
  assert.throws(() => lib.assertProjectRules([real({ solution: 'New roof for $12,000.' })]), /no prices/)
})

test('a linked review must be a real review for the same kind of work', () => {
  assert.throws(() => lib.assertProjectRules([real({ review: 'Nobody Real' })]), /not in reviews.ts/)
  const exterior = reviews.reviews.find((r) => r.work === 'exterior')
  if (exterior) assert.throws(() => lib.assertProjectRules([real({ review: exterior.author })]), /different work/)
})

test('placeholders are an empty labelled frame, never a picture', () => {
  for (const p of lib.projects.filter((x) => x.placeholder)) for (const pair of p.pairs) { assert.equal(pair.before, null); assert.equal(pair.after, null) }
  const card = read('src/components/project-card.tsx')
  assert.match(card, /Sample layout · real photos coming soon/)
  assert.doesNotMatch(card, /autoplay|setInterval|"use client"/i) // no rotating carousel
})

test('the landing page keeps the form first and opens Our Work in a new tab', () => {
  const page = read('src/app/free-inspection/page.tsx')
  assert.ok(page.indexOf('<ProjectRequest />') < page.indexOf('<ProjectCard'), 'form comes before the project pair')
  assert.match(page, /href="\/our-work" target="_blank"/)
  assert.match(page, /BRAND_PROMISE/)
})

test('St. Louis Metro projects: universal for both states, exterior only, no town, all its filters', () => {
  const metro = lib.projects.find((p) => p.state === 'METRO')
  assert.equal(lib.projectTown(metro), 'St. Louis Metro')
  assert.deepEqual([...lib.serviceFilters(metro)], ['Siding', 'Gutters', 'Soffit & Fascia'])
  assert.throws(() => lib.assertProjectRules([real({ state: 'METRO' })]), /Missouri only/)
  assert.throws(() => lib.assertProjectRules([real({ state: 'METRO', work: 'exterior', service: 'Siding', solution: 'New siding and roof.' })]), /exterior work only/)
  assert.throws(() => lib.assertProjectRules([real({ state: 'METRO', work: 'exterior', service: 'Siding', problem: 'Old siding.', solution: 'New siding.', town: 'Kirkwood', permission: { photos: true, town: true } })]), /names no town/)
  assert.doesNotMatch(read('src/components/project-card.tsx'), /PHONES|phoneFor|tel:/, 'no state-specific phone on the card')
  for (const photo of [...metro.pairs.flatMap((pair) => [pair.before, pair.after]), ...metro.extras]) assert.ok(fs.existsSync('public' + photo.src), photo.src)
})

test('one real job fills the section: full-width showcase with every photo, no lone card (Mike, Nov 15 2026)', () => {
  const home = read('src/components/home-projects.tsx')
  assert.match(home, /featured\.length <= 2/)
  assert.match(home, /<ProjectShowcase key=\{p\.slug\} project=\{p\} \/>/)
  assert.match(read('src/app/our-work/page.tsx'), /<ProjectShowcase project=\{p\}/)
  assert.doesNotMatch(read('src/app/our-work/project-gallery.tsx'), /md:grid-cols-2/, 'one job per row, full width')
  const show = read('src/components/project-showcase.tsx')
  assert.match(show, /project\.pairs\.flatMap\(\(pair\) => \(pair\.before/)
  assert.match(show, /\.\.\.\(project\.extras \?\? \[\]\)/, 'extra after photos are included')
  const metro = lib.projects.find((p) => p.state === 'METRO')
  assert.equal(metro.pairs.length * 2 + metro.extras.length, 5, 'all 5 photos of the St. Louis Metro job')
})

test('Missouri roof job: walkthrough with "During" photos, Missouri only, brands we install, every photo on disk', () => {
  const roof = lib.projects.find((p) => p.slug === 'missouri-roof-replacement')
  assert.equal(roof.work, 'roofing')
  assert.equal(roof.state, 'MO')
  assert.equal(lib.projectTown(roof), 'Missouri')
  assert.deepEqual([...lib.serviceFilters(roof)], ['Roofing'])
  assert.equal(roof.pairs[0].before.stage, undefined, 'the first before photo is a real before (the small card shows it)')
  assert.deepEqual([...roof.pairs.slice(1).map((pair) => pair.before.stage)], ['During', 'During'])
  for (const pair of roof.pairs) for (const photo of [pair.before, pair.after]) assert.ok(fs.existsSync('public' + photo.src), photo.src)
  assert.match(roof.solution, /Owens Corning/, 'a shingle brand we install')
  assert.doesNotMatch(`${roof.problem} ${roof.solution}`, /certified|preferred|warrant|\$/i, 'no unverified claims or prices')
  // "During" is only for a before photo
  const after = { ...real().pairs[0].after, stage: 'During' }
  assert.throws(() => lib.assertProjectRules([real({ pairs: [{ ...real().pairs[0], after }] })]), /only a before photo/)
  assert.doesNotThrow(() => lib.assertProjectRules([real({ pairs: [{ ...real().pairs[0], before: { ...real().pairs[0].before, stage: 'During' } }] })]))
  const show = read('src/components/project-showcase.tsx')
  assert.match(show, /Before & during/)
  assert.match(show, /During: "bg-\[#1CA3D8\] text-black"/)
})
