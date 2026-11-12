import 'server-only'
import { createGitHubReader, GitHubError } from '../brain/github'
import { DEFAULT_REPO } from '../brain/sync'
import type { CompetitorScan } from './data'
import { parseCompanies, scrapeRows, waitingScans, type ScrapeRow } from './market-watch'

// Live reads for the dashboard's "Scraping activity" and "Website updates" sections. Both are cached for 10 minutes
// and never show raw errors, tokens or response bodies.

type Env = Record<string, string | undefined>
const cached: typeof fetch = (input, init) => fetch(input, { ...init, next: { revalidate: 600 } })

export type MarketWatch =
  | { state: 'ok'; rows: ScrapeRow[]; waiting: string[]; checkedAt: string }
  | { state: 'not_set_up'; missing: string }
  | { state: 'error'; message: string }

export async function getMarketWatch(env: Env, scans: CompetitorScan[], now = new Date()): Promise<MarketWatch> {
  const token = env.BRAIN_GITHUB_TOKEN?.trim()
  if (!token) return { state: 'not_set_up', missing: 'BRAIN_GITHUB_TOKEN' }
  const repo = env.BRAIN_GITHUB_REPO?.trim() || DEFAULT_REPO
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repo)) return { state: 'error', message: 'BRAIN_GITHUB_REPO must look like owner/name' }
  const gh = createGitHubReader({ token, repo, fetch: cached })
  try {
    const [companiesText, branches] = await Promise.all([gh.fileText('market/companies.json'), gh.branchNames('market-watch/')])
    return { state: 'ok', rows: scrapeRows(parseCompanies(companiesText), scans, now), waiting: waitingScans(branches, scans), checkedAt: now.toISOString() }
  } catch (e) {
    return { state: 'error', message: e instanceof GitHubError ? e.message : 'Could not read GitHub.' }
  }
}

// ---- Website updates ----------------------------------------------------------------------------------------------

export const SITE_REPO = 'RoofingnearmeSTL/roofingnearmestl.com'

export type SiteUpdate = { number: number; title: string; mergedAt: string; url: string; live: boolean | null }
export type SiteUpdates =
  | { state: 'ok'; updates: SiteUpdate[]; deployed: { sha: string; at: string | null; env: string } | null; checkedAt: string }
  | { state: 'error'; message: string }

type PullRow = { number?: unknown; title?: unknown; merged_at?: unknown; html_url?: unknown; base?: { ref?: unknown } }

/** Merged pull requests into main, newest first, marked live when merged before the running deployment's commit. */
export function siteUpdatesFrom(pulls: PullRow[], deployedAt: string | null, limit = 12): SiteUpdate[] {
  return pulls
    .filter((p) => typeof p.merged_at === 'string' && p.base?.ref === 'main' && typeof p.number === 'number' && typeof p.title === 'string')
    .map((p) => ({
      number: p.number as number,
      title: (p.title as string).slice(0, 200),
      mergedAt: p.merged_at as string,
      url: typeof p.html_url === 'string' && p.html_url.startsWith('https://github.com/') ? p.html_url : `https://github.com/${SITE_REPO}/pull/${p.number}`,
      live: deployedAt ? Date.parse(p.merged_at as string) <= Date.parse(deployedAt) : null,
    }))
    .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt))
    .slice(0, limit)
}

export async function getSiteUpdates(env: Env, now = new Date()): Promise<SiteUpdates> {
  // The website repo is public, so no token is used; GitHub allows 60 unauthenticated reads an hour, and this caches.
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'roofingnearmestl-dashboard' }
  try {
    const res = await cached(`https://api.github.com/repos/${SITE_REPO}/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=40`, { headers, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return { state: 'error', message: res.status === 403 || res.status === 429 ? 'GitHub rate limit reached; try again in an hour.' : `GitHub answered ${res.status}.` }
    const pulls = (await res.json()) as PullRow[]
    const sha = (env.VERCEL_GIT_COMMIT_SHA ?? '').trim()
    let deployed: { sha: string; at: string | null; env: string } | null = null
    if (/^[0-9a-f]{40}$/.test(sha)) {
      let at: string | null = null
      const c = await cached(`https://api.github.com/repos/${SITE_REPO}/commits/${sha}`, { headers, signal: AbortSignal.timeout(10000) }).catch(() => null)
      if (c?.ok) {
        const body = (await c.json().catch(() => null)) as { commit?: { committer?: { date?: unknown } } } | null
        at = typeof body?.commit?.committer?.date === 'string' ? body.commit.committer.date : null
      }
      deployed = { sha: sha.slice(0, 7), at, env: (env.VERCEL_ENV ?? '').trim() || 'unknown' }
    }
    return { state: 'ok', updates: siteUpdatesFrom(Array.isArray(pulls) ? pulls : [], deployed?.env === 'production' ? deployed.at : null), deployed, checkedAt: now.toISOString() }
  } catch {
    return { state: 'error', message: 'Could not reach GitHub.' }
  }
}
