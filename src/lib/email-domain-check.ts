// Server-only: can this email's domain receive mail? Never imported by browser code.
// Follows RFC 5321 section 5.1: MX records first, then A/AAAA as an implicit MX.
import { Resolver } from 'node:dns/promises'

export type EmailCheck = 'ok' | 'no_mail_server' | 'unknown'
export type EmailCheckField = EmailCheck | 'none'

export type DnsLookup = {
  resolveMx(host: string): Promise<{ exchange: string; priority: number }[]>
  resolve4(host: string): Promise<string[]>
  resolve6(host: string): Promise<string[]>
  cancel?(): void
}

const codeOf = (error: unknown): string => {
  const code = (error as { code?: unknown } | null)?.code
  return typeof code === 'string' ? code : ''
}
const NO_SUCH_RECORD = new Set(['ENODATA', 'ENOTFOUND'])

async function lookup(domain: string, dns: DnsLookup): Promise<EmailCheck> {
  try {
    const mx = await dns.resolveMx(domain)
    if (mx.length > 0) {
      // A null MX (RFC 7505) says the domain accepts no mail.
      return mx.every((record) => record.exchange === '' || record.exchange === '.') ? 'no_mail_server' : 'ok'
    }
  } catch (error) {
    const code = codeOf(error)
    if (code === 'ENOTFOUND') return 'no_mail_server'
    if (code !== 'ENODATA') return 'unknown'
  }
  const [a, aaaa] = await Promise.allSettled([
    Promise.resolve().then(() => dns.resolve4(domain)),
    Promise.resolve().then(() => dns.resolve6(domain)),
  ])
  if ((a.status === 'fulfilled' && a.value.length > 0) || (aaaa.status === 'fulfilled' && aaaa.value.length > 0)) return 'ok'
  const none = (r: PromiseSettledResult<string[]>) => (r.status === 'fulfilled' ? r.value.length === 0 : NO_SUCH_RECORD.has(codeOf(r.reason)))
  return none(a) && none(aaaa) ? 'no_mail_server' : 'unknown'
}

/** Never rejects. Gives up after timeoutMs (default 1.5 s) with 'unknown'. */
export async function checkEmailDomain(email: string, options: { dns?: DnsLookup; timeoutMs?: number } = {}): Promise<EmailCheck> {
  const timeoutMs = options.timeoutMs ?? 1500
  const text = String(email ?? '')
  const at = text.lastIndexOf('@')
  if (at === -1) return 'unknown'
  let domain = text.slice(at + 1).trim().toLowerCase()
  if (domain.endsWith('.')) domain = domain.slice(0, -1)
  if (!domain || !domain.includes('.') || domain.startsWith('[')) return 'unknown'
  let timer: ReturnType<typeof setTimeout> | undefined
  let dns: DnsLookup | undefined
  try {
    dns = options.dns ?? (() => {
      const r = new Resolver({ timeout: timeoutMs, tries: 1 })
      return {
        resolveMx: (h: string) => r.resolveMx(h),
        resolve4: (h: string) => r.resolve4(h),
        resolve6: (h: string) => r.resolve6(h),
        cancel: () => r.cancel(),
      }
    })()
    const active = dns
    return await Promise.race([
      lookup(domain, active).catch(() => 'unknown' as const),
      new Promise<EmailCheck>((resolve) => { timer = setTimeout(() => resolve('unknown'), timeoutMs) }),
    ])
  } catch {
    return 'unknown'
  } finally {
    clearTimeout(timer)
    try { dns?.cancel?.() } catch { /* nothing to cancel */ }
  }
}
