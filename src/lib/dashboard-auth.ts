// Password check for the owner dashboard (HTTP Basic, any username). Only import: node:crypto.
import { createHash, timingSafeEqual } from 'node:crypto'

export const MIN_PASSWORD_LENGTH = 12
export const AUTH_REALM = 'RoofingnearmeSTL dashboard'

export type AuthResult = 'not_configured' | 'unauthorized' | 'ok'

const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest()

export function checkBasicAuth(header: string | null | undefined, password: string | undefined): AuthResult {
  const expected = typeof password === 'string' ? password.trim() : ''
  if (expected.length < MIN_PASSWORD_LENGTH) return 'not_configured'
  if (typeof header !== 'string' || header.length === 0 || header.length > 1024) return 'unauthorized'
  const m = /^basic\s+([A-Za-z0-9+/]+=*)\s*$/i.exec(header)
  if (!m) return 'unauthorized'
  const b64 = m[1]
  const decoded = Buffer.from(b64, 'base64')
  if (decoded.toString('base64').replace(/=+$/, '') !== b64.replace(/=+$/, '')) return 'unauthorized'
  const text = decoded.toString('utf8')
  const colon = text.indexOf(':')
  if (colon < 0) return 'unauthorized'
  const given = text.slice(colon + 1)
  // Digests are always 32 bytes, so different lengths never throw and never leak length.
  return timingSafeEqual(digest(given), digest(expected)) ? 'ok' : 'unauthorized'
}
