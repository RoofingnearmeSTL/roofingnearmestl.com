"""Conservative, safety-first defaults for the Crawl4AI marketing crawler.

Every value can be overridden with CLI flags (see crawl.py --help). Defaults
are intentionally slow and small so the crawl cannot load a target site.
"""

DEFAULT_START_URL = "https://roofingnearmestl.com"
USER_AGENT = (
    "RoofingNearMeSTL-MarketingCrawler/1.0 "
    "(+https://roofingnearmestl.com; read-only marketing analysis)"
)
CONCURRENCY = 1          # one request at a time (fixed; not configurable)
DELAY_SECONDS = 3.0      # minimum pause between requests
MAX_PAGES = 25           # hard cap on pages fetched
MAX_DEPTH = 3            # link depth from the start URL
TIMEOUT_SECONDS = 30     # per-page timeout
MAX_RETRIES = 2          # retries per page, with exponential backoff
BACKOFF_SECONDS = 5.0    # base backoff between retries
OUTPUT_DIR = "scripts/crawl4ai/output"
SKIP_EXTENSIONS = (
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".zip",
    ".mp4", ".mp3", ".css", ".js", ".xml", ".ico", ".woff", ".woff2",
)
