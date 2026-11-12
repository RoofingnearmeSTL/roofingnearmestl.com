import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(f)) out.push(p)
  }
  return out
}

test('robots disallows /dashboard for both groups; sitemap never mentions it', () => {
  const r = read('src/app/robots.ts')
  assert.equal((r.match(/'\/api\/', '\/dashboard'/g) ?? []).length, 2)
  assert.doesNotMatch(read('src/app/sitemap.ts'), /dashboard/)
})

test('compliance scan, tracking and call bar skip the dashboard', () => {
  assert.match(read('scripts/compliance-scan.mjs'), /startsWith\("\/dashboard"\)\) continue/)
  assert.match(read('src/components/google-ads.tsx'), /if \(isDashboard\) return null/)
  assert.match(read('src/components/mobile-call-bar.tsx'), /startsWith\("\/dashboard"\)/)
})

// The proof package builder is the one client component: photos must stay on the owner's computer, so it has to run
// in the browser. Everything else in the dashboard stays server-only.
const CLIENT_ALLOWED = new Set([path.join(root, 'src/components/dashboard/proof-package-builder.tsx')])

test('no client components or raw HTML in the dashboard (except the proof package builder)', () => {
  for (const f of [...walk(path.join(root, 'src/app/dashboard')), ...walk(path.join(root, 'src/components/dashboard'))]) {
    const s = fs.readFileSync(f, 'utf8')
    if (!CLIENT_ALLOWED.has(f)) assert.doesNotMatch(s, /["']use client["']/, f)
    assert.doesNotMatch(s, /dangerouslySetInnerHTML/, f)
  }
})

test('the proof package builder reads no secrets, imports nothing server-side and previews without scripts', () => {
  const s = read('src/components/dashboard/proof-package-builder.tsx')
  assert.doesNotMatch(s, /process\.env/)
  assert.doesNotMatch(s, /from ["']@\/lib\/(supabase|data-store|dashboard|n8n|brain)/)
  assert.doesNotMatch(s, /server-only/)
  // The preview frame may print but never run scripts.
  const frame = /<iframe[^>]*sandbox="([^"]*)"/.exec(s)
  assert.ok(frame, 'the preview iframe is sandboxed')
  assert.doesNotMatch(frame[1], /allow-scripts/)
  // The only network call is the dashboard's own storm lookup.
  const fetches = [...s.matchAll(/fetch\(\s*([`'"])([^`'"]*)/g)].map((m) => m[2])
  assert.deepEqual(fetches, ['${window.location.origin}/dashboard/proof-package/storms?${q}'])
  for (const f of ['src/lib/proof-package/browser-files.ts', 'src/lib/proof-package/drafts.ts', 'src/lib/proof-package/report.ts', 'src/lib/proof-package/model.ts']) {
    assert.doesNotMatch(read(f), /process\.env|server-only/, f)
  }
})

test('the storm lookup route re-checks the dashboard password', () => {
  const r = read('src/app/dashboard/proof-package/storms/route.ts')
  assert.match(r, /checkBasicAuth\(req\.headers\.get\('authorization'\), process\.env\.DASHBOARD_PASSWORD\) !== 'ok'/)
})

test('dashboard secrets are never public env vars; the proxy exports no runtime', () => {
  for (const f of walk(path.join(root, 'src'))) {
    assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /NEXT_PUBLIC_(DASHBOARD|BRAIN)/, f)
  }
  assert.doesNotMatch(read('src/proxy.ts'), /export const runtime/)
})

test('the dashboard layout re-checks the password', () => {
  const l = read('src/app/dashboard/layout.tsx')
  assert.match(l, /checkBasicAuth/)
  assert.match(l, /notFound\(\)/)
})
