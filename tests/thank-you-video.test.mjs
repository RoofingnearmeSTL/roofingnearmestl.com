import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { introVideoUrl } from '../src/lib/customer-email.ts'

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('introVideoUrl accepts only https links', () => {
  assert.equal(introVideoUrl('https://video.example.invalid/hello'), 'https://video.example.invalid/hello')
  assert.equal(introVideoUrl(undefined), null)
  assert.equal(introVideoUrl('http://video.example.invalid/hello'), null)
  assert.equal(introVideoUrl('javascript:alert(1)'), null)
})

test('thank-you page uses the link block and keeps its wording', () => {
  const page = read('src/app/thank-you/page.tsx')
  assert.match(page, /introVideoUrl\(process\.env\.INTRO_VIDEO_URL\)/)
  assert.match(page, /<IntroVideoLink/)
  assert.ok(page.includes('We&apos;ll call within 30 mins'))
  assert.ok(page.includes('You&apos;re All Set!'))
  assert.ok(page.includes("Until then we don&apos;t quote, schedule or do roof work on Illinois homes."))
})

test('the link component has the exact label, safe rel and no iframe', () => {
  const c = read('src/components/intro-video-link.tsx')
  assert.ok(c.includes('Meet Mike, the owner: watch a short hello'))
  assert.ok(c.includes('rel="noopener noreferrer"'))
  assert.doesNotMatch(c, /iframe/i)
})
