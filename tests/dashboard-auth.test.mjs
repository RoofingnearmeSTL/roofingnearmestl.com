import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { loadTs } from './helpers/load-ts.mjs'
import { checkBasicAuth } from '../src/lib/dashboard-auth.ts'

const PW = 'a-long-enough-test-password'
const basic = (user, pass) => 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')

test('unset, empty or short password means not configured', () => {
  assert.equal(checkBasicAuth(basic('u', PW), undefined), 'not_configured')
  assert.equal(checkBasicAuth(basic('u', PW), ''), 'not_configured')
  assert.equal(checkBasicAuth(basic('u', 'short-11-chr'.slice(0, 11)), 'short-11-chr'.slice(0, 11)), 'not_configured')
})

test('bad headers are unauthorized', () => {
  assert.equal(checkBasicAuth(null, PW), 'unauthorized')
  assert.equal(checkBasicAuth('Bearer x', PW), 'unauthorized')
  assert.equal(checkBasicAuth('Basic !!!', PW), 'unauthorized')
  assert.equal(checkBasicAuth('Basic ' + 'A'.repeat(2000), PW), 'unauthorized')
  assert.equal(checkBasicAuth('Basic ' + Buffer.from('nocolon').toString('base64'), PW), 'unauthorized')
})

test('wrong password is unauthorized, right one passes with any username', () => {
  assert.equal(checkBasicAuth(basic('owner', 'wrong-password-123'), PW), 'unauthorized')
  assert.equal(checkBasicAuth(basic('owner', PW), PW), 'ok')
  assert.equal(checkBasicAuth(basic('', PW), PW), 'ok')
  assert.equal(checkBasicAuth('basic ' + Buffer.from('x:' + PW).toString('base64'), PW), 'ok')
})

test('colon and unicode passwords work; very different lengths never throw', () => {
  assert.equal(checkBasicAuth(basic('u', 'pass:with:colons-123'), 'pass:with:colons-123'), 'ok')
  assert.equal(checkBasicAuth(basic('u', 'pässwörd-ünïcode-ok'), 'pässwörd-ünïcode-ok'), 'ok')
  assert.equal(checkBasicAuth(basic('u', 'x'), PW), 'unauthorized')
  assert.equal(checkBasicAuth(basic('u', 'x'.repeat(900)), PW), 'unauthorized')
})

test('the source compares digests with timingSafeEqual only', () => {
  const src = fs.readFileSync(new URL('../src/lib/dashboard-auth.ts', import.meta.url), 'utf8')
  assert.match(src, /timingSafeEqual/)
  assert.match(src, /createHash\('sha256'\)/)
  assert.doesNotMatch(src, /given\s*===|===\s*expected|expected\s*===/)
})

function loadProxy(password) {
  class Resp {
    constructor(body, init = {}) { this.body = body; this.status = init.status ?? 200; this.headers = new Map(Object.entries(init.headers ?? {})) }
    static next() { return new Resp(null, { status: 200 }) }
  }
  return loadTs('src/proxy.ts', { mocks: { 'next/server': { NextResponse: Resp } }, env: { DASHBOARD_PASSWORD: password } })
}
const reqWith = (auth) => ({ headers: { get: (k) => (k.toLowerCase() === 'authorization' ? auth : null) } })

test('proxy: no password is 404, wrong is 401, right passes', () => {
  const none = loadProxy('').proxy(reqWith(basic('u', PW)))
  assert.equal(none.status, 404)
  assert.match(none.headers.get('X-Robots-Tag'), /noindex/)
  const bad = loadProxy(PW).proxy(reqWith(basic('u', 'nope-nope-nope-1')))
  assert.equal(bad.status, 401)
  assert.match(bad.headers.get('WWW-Authenticate'), /^Basic realm=/)
  const ok = loadProxy(PW).proxy(reqWith(basic('u', PW)))
  assert.equal(ok.status, 200)
  assert.equal(ok.headers.get('X-Robots-Tag'), 'noindex, nofollow')
  assert.match(ok.headers.get('Cache-Control'), /no-store/)
})

test('proxy matcher covers only dashboard paths', () => {
  assert.deepEqual(loadProxy(PW).config.matcher, ['/dashboard', '/dashboard/:path*', '/api/dashboard/:path*'])
})
