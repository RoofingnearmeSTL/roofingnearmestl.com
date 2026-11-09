// Contact checks shared by the lead form (browser) and /api/lead (server).
// No imports and no secrets here: this file is bundled into the browser.

export type ContactField = 'name' | 'phone' | 'email'

export type PhoneProblem = 'too_short' | 'too_long' | 'repeated' | 'area_code' | 'n11' | 'exchange' | 'fictional'

export type PhoneCheck = { ok: true; digits: string } | { ok: false; problem: PhoneProblem }

/** US/Canada number rules. The order of the checks is part of the contract. */
export function checkPhone(input: string): PhoneCheck {
  let digits = String(input ?? '').replace(/\D/g, '')
  if (digits.length < 10) return { ok: false, problem: 'too_short' }
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1)
  if (digits.length !== 10) return { ok: false, problem: 'too_long' }
  if (/^(\d)\1{9}$/.test(digits)) return { ok: false, problem: 'repeated' }
  if (digits[0] === '0' || digits[0] === '1') return { ok: false, problem: 'area_code' }
  if (digits[1] === '1' && digits[2] === '1') return { ok: false, problem: 'n11' }
  if (digits[3] === '0' || digits[3] === '1') return { ok: false, problem: 'exchange' }
  const line = Number(digits.slice(6))
  if (digits.slice(3, 6) === '555' && line >= 100 && line <= 199) return { ok: false, problem: 'fictional' }
  return { ok: true, digits }
}

/** Shown to the homeowner, in plain words. */
export const PHONE_HELP: Record<PhoneProblem, string> = {
  too_short: 'Please enter your full 10-digit phone number, starting with the area code.',
  too_long: 'That has too many digits. Please enter a 10-digit phone number (no extension).',
  repeated: "That number doesn't look right (all the digits are the same). Please enter the number we can call you on.",
  area_code: 'Area codes never start with 0 or 1. Please check the first 3 digits.',
  n11: '211, 311, 411, 511, 611, 711, 811 and 911 are service numbers, not area codes. Please check the first 3 digits.',
  exchange: "The 3 digits after the area code can't start with 0 or 1. Please check the number.",
  fictional: 'Numbers from 555-0100 to 555-0199 are made-up numbers used in movies. Please enter your real phone number.',
}

/** Shown to the team in the owner email and the CRM note. */
export const PHONE_REASON: Record<PhoneProblem, string> = {
  too_short: 'fewer than 10 digits',
  too_long: 'too many digits for a US number',
  repeated: 'all the digits are the same',
  area_code: 'the area code starts with 0 or 1',
  n11: 'the area code is a service code like 911',
  exchange: 'the 3 digits after the area code start with 0 or 1',
  fictional: '555-0100 to 555-0199 is a made-up range',
}

export const CONTACT_MESSAGES = {
  nameRequired: 'Please enter your name so we know who to ask for.',
  phoneRequired: 'Please enter your phone number so we can call you back.',
  emailRequired: 'Please enter your email so we can send you the details of your free inspection or estimate.',
  emailIncomplete: 'This email address looks incomplete (it needs an @ and a domain like gmail.com). Please check it.',
}

export const EMAIL_PATTERN = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/

export const isEmailSyntax = (value: string) => EMAIL_PATTERN.test(String(value ?? '').trim())

export const emailDomain = (email: string) => email.slice(email.lastIndexOf('@') + 1).trim().toLowerCase()

export function contactFieldError(field: ContactField, value: string): string | undefined {
  const text = String(value ?? '').trim()
  if (field === 'name') return text ? undefined : CONTACT_MESSAGES.nameRequired
  if (field === 'phone') {
    if (!text) return CONTACT_MESSAGES.phoneRequired
    const check = checkPhone(text)
    return check.ok ? undefined : PHONE_HELP[check.problem]
  }
  if (!text) return CONTACT_MESSAGES.emailRequired
  return isEmailSyntax(text) ? undefined : CONTACT_MESSAGES.emailIncomplete
}

const COMMON_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'att.net', 'sbcglobal.net', 'charter.net', 'comcast.net']
// Real providers one letter away from a common one; never "correct" these.
const REAL_LOOKALIKES = new Set(['mail.com', 'email.com', 'ymail.com'])
const COM_TYPOS = new Set(['con', 'cmo'])

// Optimal string alignment distance: swapping two neighbouring letters counts as one edit.
function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array<number>(b.length + 1).fill(0)
    row[0] = i
    return row
  })
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

/** A likely fix for a mistyped common email domain, or null. The browser only offers it; it never applies it. */
export function suggestEmail(email: string): string | null {
  const text = String(email ?? '').trim()
  const at = text.lastIndexOf('@')
  if (at < 1 || at === text.length - 1) return null
  const local = text.slice(0, at)
  const domain = text.slice(at + 1).toLowerCase()
  if (COMMON_DOMAINS.includes(domain) || REAL_LOOKALIKES.has(domain)) return null
  const dot = domain.lastIndexOf('.')
  const name = dot === -1 ? domain : domain.slice(0, dot)
  const tld = dot === -1 ? '' : domain.slice(dot + 1)
  let best: string | null = null
  let bestDistance = 2
  for (const known of COMMON_DOMAINS) {
    const knownDot = known.lastIndexOf('.')
    const knownName = known.slice(0, knownDot)
    const knownTld = known.slice(knownDot + 1)
    const distance = editDistance(name, knownName)
    if (distance > 1) continue
    if (!(tld === '' || COM_TYPOS.has(tld) || editDistance(tld, knownTld) <= 1)) continue
    if (distance < bestDistance) { best = known; bestDistance = distance }
  }
  const result = best ? `${local}@${best}` : COM_TYPOS.has(tld) && name ? `${local}@${name}.com` : null
  return result && result !== text ? result : null
}
