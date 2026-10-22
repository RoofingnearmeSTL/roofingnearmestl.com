# Crawl4AI marketing crawler (isolated)

A conservative, read-only crawler for marketing analysis. It lives entirely in
`scripts/crawl4ai/`, is not imported by the Next.js app, and writes only to local files.

## Prerequisites & installation
- Python 3.9+
```bash
python -m venv .venv-crawl4ai && source .venv-crawl4ai/bin/activate
pip install -r scripts/crawl4ai/requirements.txt
crawl4ai-setup        # installs the headless browser
```

## Run with safe defaults
```bash
npm run crawl:safe      # crawls https://roofingnearmestl.com
npm run crawl:analyze   # builds output/claude_prompt.md to paste into Claude
```
Other domain / custom limits (only crawl sites you own or have permission to crawl):
```bash
python scripts/crawl4ai/crawl.py --url https://example.com --max-pages 10 --delay 5
```
Output (`scripts/crawl4ai/output/`, git-ignored): `pages.csv`, `pages.json`,
`internal_links.json`, `pages/*.md`.

## Safety controls
| Control | Default | Purpose |
|---|---|---|
| Same-domain only | on | Never follows external links |
| robots.txt | enforced | Disallowed URLs skipped; `Crawl-delay` honored; crawl aborts if robots.txt is unreachable (5xx/network) |
| Concurrency | 1 | One request at a time |
| Delay | 3s (minimum 1s enforced) | Rate limiting between requests |
| Max pages / depth | 25 / 3 | Hard cap on load |
| Timeout / retries | 30s / 2 with exponential backoff | 4xx (except 429) are not retried |
| User-agent | `RoofingNearMeSTL-MarketingCrawler/1.0 (+https://roofingnearmestl.com)` | Identifies the crawler |
| Read-only | GET page loads only | No forms, no POSTs, no site changes; output is local files |
| Query strings stripped; assets skipped | on | Avoids crawl traps and heavy files |

## Legal / ethical notes
Respect each site's robots.txt and Terms of Service, keep rate limits conservative,
don't crawl gated/private content, and get permission before crawling competitors
beyond light, public-page analysis. Don't raise limits on sites you don't control.

## Troubleshooting
- `Could not read robots.txt` – site/network issue; retry later (crawl refuses by design).
- `ModuleNotFoundError: crawl4ai` – activate the venv and reinstall requirements.
- Browser errors – re-run `crawl4ai-setup`.
- 0 pages crawled – the start URL may be disallowed by robots.txt or timing out; raise `--timeout`.
- `pages.csv not found` for analyze – run `crawl:safe` first.
