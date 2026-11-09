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

test('no client components or raw HTML in the dashboard', () => {
  for (const f of [...walk(path.join(root, 'src/app/dashboard')), ...walk(path.join(root, 'src/components/dashboard'))]) {
    const s = fs.readFileSync(f, 'utf8')
    assert.doesNotMatch(s, /["']use client["']/, f)
    assert.doesNotMatch(s, /dangerouslySetInnerHTML/, f)
  }
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
