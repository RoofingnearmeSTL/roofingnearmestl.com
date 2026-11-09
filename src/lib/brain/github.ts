import 'server-only'

// Read-only GitHub REST reader for the Brain-Data repo. Fixed error messages only: response bodies are never read
// into errors or logs, and the token is never included in anything returned.

export class GitHubError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
  }
}

export type TreeEntry = { path: string; sha: string; size: number; type: string }

type Opts = { token: string; repo: string; fetch: typeof fetch; timeoutMs?: number }

const BASE = 'https://api.github.com'

function messageFor(status: number, res: Response): string {
  const remaining = res.headers?.get?.('x-ratelimit-remaining')
  if (status === 401) return 'GitHub refused the token (401). Make a new fine-grained token and save it as BRAIN_GITHUB_TOKEN.'
  if ((status === 403 || status === 429) && remaining === '0') return 'GitHub rate limit reached; the copy will try again at the next run.'
  if (status === 429) return 'GitHub rate limit reached; the copy will try again at the next run.'
  if (status === 403) return 'GitHub said no access (403). The token needs read-only Contents access to the Brain-Data repo.'
  if (status === 404) return 'GitHub could not find the repo or branch (404). Check BRAIN_GITHUB_REPO and that the token includes the Brain-Data repo.'
  return `GitHub answered ${status}.`
}

export function createGitHubReader({ token, repo, fetch: f, timeoutMs = 15000 }: Opts) {
  const [owner, name] = repo.split('/')
  const root = `${BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`

  async function get(url: string, accept: string): Promise<Response> {
    let res: Response
    try {
      res = await f(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: accept,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'roofingnearmestl-brain-sync',
        },
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch {
      throw new GitHubError(0, 'Could not reach GitHub (network or timeout).')
    }
    if (!res.ok) throw new GitHubError(res.status, messageFor(res.status, res))
    return res
  }

  async function text(res: Response): Promise<string> {
    try {
      return await res.text()
    } catch {
      throw new GitHubError(0, 'Could not reach GitHub (network or timeout).')
    }
  }

  return {
    async headSha(): Promise<string> {
      const res = await get(`${root}/commits/main`, 'application/vnd.github.sha')
      const sha = (await text(res)).trim()
      if (!/^[0-9a-f]{40,64}$/.test(sha)) throw new GitHubError(200, 'GitHub answered 200.')
      return sha
    },
    async tree(commitSha: string): Promise<{ entries: TreeEntry[]; truncated: boolean }> {
      const res = await get(`${root}/git/trees/${encodeURIComponent(commitSha)}?recursive=1`, 'application/vnd.github+json')
      let data: { tree?: unknown; truncated?: unknown }
      try {
        data = JSON.parse(await text(res))
      } catch {
        throw new GitHubError(200, 'GitHub answered 200.')
      }
      const entries: TreeEntry[] = []
      if (Array.isArray(data.tree)) {
        for (const e of data.tree as Record<string, unknown>[]) {
          if (e && typeof e.path === 'string' && typeof e.sha === 'string') {
            entries.push({ path: e.path, sha: e.sha, size: typeof e.size === 'number' ? e.size : 0, type: String(e.type) })
          }
        }
      }
      return { entries, truncated: data.truncated === true }
    },
    async blobText(sha: string): Promise<string> {
      const res = await get(`${root}/git/blobs/${encodeURIComponent(sha)}`, 'application/vnd.github.raw+json')
      const ct = res.headers?.get?.('content-type') ?? ''
      const body = await text(res)
      if (/json/i.test(ct)) {
        try {
          const j = JSON.parse(body) as { encoding?: unknown; content?: unknown }
          if (j.encoding === 'base64' && typeof j.content === 'string') return Buffer.from(j.content, 'base64').toString('utf8')
        } catch {
          // fall through: a JSON file served raw
        }
      }
      return body
    },
  }
}

export type GitHubReader = ReturnType<typeof createGitHubReader>
