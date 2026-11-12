import 'server-only'
import type { Execution } from './usage'

// Read-only reader for the n8n public API (GET /api/v1/executions). Fixed error messages only: response bodies are
// never read into errors or logs, and the API key is never included in anything returned.
// The n8n API is not available on the n8n Cloud free trial; it answers 401/403 until the plan is upgraded.

export class N8nError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'N8nError'
  }
}

export type N8nSettings = { baseUrl: string; apiKey: string }

/** The n8n address from a setting, without a trailing slash or /api/v1, or null when it is not a plain https URL. */
export function n8nBaseUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const url = raw.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '')
  if (url.length > 200) return null
  return /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/i.test(url) ? url : null
}

function messageFor(status: number): string {
  if (status === 401) return 'n8n refused the API key (401). Make a new key in n8n, Settings, n8n API, and save it as N8N_API_KEY.'
  if (status === 403) return 'n8n said no access (403). The n8n API is not available on the free trial; it works after upgrading the plan.'
  if (status === 404) return 'n8n could not find the API (404). Check N8N_API_URL (for example https://yourname.app.n8n.cloud).'
  if (status === 429) return 'n8n rate limit reached; try again later.'
  return `n8n answered ${status}.`
}

const PAGE_SIZE = 250

/**
 * Executions that started at or after `since`, newest first, reading at most `maxPages` pages of 250. n8n lists
 * executions newest first, so reading stops at the first page that reaches back past `since`.
 */
export async function fetchExecutionsSince(
  settings: N8nSettings,
  since: Date,
  opts: { fetch?: typeof fetch; maxPages?: number; timeoutMs?: number } = {},
): Promise<{ executions: Execution[]; complete: boolean }> {
  const f = opts.fetch ?? fetch
  const maxPages = opts.maxPages ?? 40
  const out: Execution[] = []
  let cursor: string | null = null
  for (let page = 0; page < maxPages; page++) {
    const url = new URL(settings.baseUrl + '/api/v1/executions')
    url.searchParams.set('limit', String(PAGE_SIZE))
    url.searchParams.set('includeData', 'false')
    if (cursor) url.searchParams.set('cursor', cursor)
    let res: Response
    try {
      res = await f(url.toString(), {
        headers: { 'X-N8N-API-KEY': settings.apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 15000),
        cache: 'no-store',
      })
    } catch {
      throw new N8nError('Could not reach n8n (network or timeout).')
    }
    if (!res.ok) throw new N8nError(messageFor(res.status))
    let body: { data?: unknown; nextCursor?: unknown }
    try {
      body = await res.json()
    } catch {
      throw new N8nError('n8n sent an answer that could not be read.')
    }
    const rows = Array.isArray(body.data) ? (body.data as Record<string, unknown>[]) : []
    let reachedBack = false
    for (const r of rows) {
      const startedAt = typeof r.startedAt === 'string' ? r.startedAt : typeof r.createdAt === 'string' ? r.createdAt : null
      if (!startedAt) continue
      if (Date.parse(startedAt) < since.getTime()) {
        reachedBack = true
        continue
      }
      out.push({ id: String(r.id ?? ''), mode: typeof r.mode === 'string' ? r.mode : '', startedAt })
    }
    cursor = typeof body.nextCursor === 'string' && body.nextCursor ? body.nextCursor : null
    if (reachedBack || !cursor) return { executions: out, complete: true }
  }
  return { executions: out, complete: false }
}

/** Settings from the environment, or the names of the missing ones. */
export function n8nSettings(env: Record<string, string | undefined>): { settings: N8nSettings | null; missing: string[] } {
  const missing: string[] = []
  const baseUrl = n8nBaseUrl(env.N8N_API_URL)
  const apiKey = (env.N8N_API_KEY ?? '').trim()
  if (!baseUrl) missing.push(env.N8N_API_URL ? 'N8N_API_URL (must be an https address)' : 'N8N_API_URL')
  if (!apiKey) missing.push('N8N_API_KEY')
  if (!(env.N8N_MONTHLY_EXECUTION_LIMIT ?? '').trim()) missing.push('N8N_MONTHLY_EXECUTION_LIMIT')
  return { settings: baseUrl && apiKey ? { baseUrl, apiKey } : null, missing }
}
