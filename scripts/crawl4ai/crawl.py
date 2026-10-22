#!/usr/bin/env python3
"""Safe, read-only Crawl4AI crawler. Writes local files only."""
import argparse
import asyncio
import csv
import json
import re
import sys
from pathlib import Path
from urllib.parse import urldefrag, urljoin, urlparse
from urllib.robotparser import RobotFileParser
from urllib.request import Request, urlopen

import config as cfg


def normalize(url):
    url, _ = urldefrag(url)
    p = urlparse(url)
    path = p.path or "/"
    return p._replace(path=path, query="", fragment="").geturl().rstrip("/") or url


def same_domain(url, host):
    h = (urlparse(url).hostname or "").lower()
    return h == host or h == "www." + host or "www." + h == host


def load_robots(start_url, timeout):
    base = urlparse(start_url)
    robots_url = f"{base.scheme}://{base.netloc}/robots.txt"
    rp = RobotFileParser()
    try:
        req = Request(robots_url, headers={"User-Agent": cfg.USER_AGENT})
        with urlopen(req, timeout=timeout) as r:
            rp.parse(r.read().decode("utf-8", "replace").splitlines())
    except Exception as e:  # 4xx => allow all (urllib semantics); errors => be safe
        status = getattr(e, "code", None)
        if status and 400 <= status < 500:
            rp.parse([])
        else:
            print(f"Could not read robots.txt ({e}); refusing to crawl.", file=sys.stderr)
            sys.exit(2)
    return rp


def slug(url):
    p = urlparse(url)
    s = re.sub(r"[^a-zA-Z0-9]+", "-", (p.netloc + p.path)).strip("-").lower()
    return s[:100] or "index"


def extract(html):
    def first(pattern):
        m = re.search(pattern, html or "", re.I | re.S)
        return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""

    def all_(pattern):
        return [re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", x)).strip()
                for x in re.findall(pattern, html or "", re.I | re.S)]

    return {
        "title": first(r"<title[^>]*>(.*?)</title>"),
        "meta_description": first(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']'),
        "h1": all_(r"<h1[^>]*>(.*?)</h1>"),
        "h2": all_(r"<h2[^>]*>(.*?)</h2>"),
        "has_schema": "application/ld+json" in (html or ""),
    }


async def fetch(crawler, run_cfg, url, retries, backoff):
    for attempt in range(retries + 1):
        try:
            res = await crawler.arun(url=url, config=run_cfg)
            if res.success and (res.status_code or 200) < 400:
                return res
            if res.status_code and 400 <= res.status_code < 500 and res.status_code != 429:
                return None  # do not retry client errors
        except Exception as e:
            print(f"  error: {e}", file=sys.stderr)
        if attempt < retries:
            await asyncio.sleep(backoff * (2 ** attempt))
    return None


async def run(args):
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

    start = normalize(args.url)
    host = (urlparse(start).hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    robots = load_robots(start, args.timeout)
    delay = max(args.delay, robots.crawl_delay(cfg.USER_AGENT) or 0)

    out = Path(args.output)
    (out / "pages").mkdir(parents=True, exist_ok=True)

    browser_cfg = BrowserConfig(headless=True, user_agent=cfg.USER_AGENT, verbose=False)
    run_cfg = CrawlerRunConfig(cache_mode=CacheMode.BYPASS, page_timeout=int(args.timeout * 1000))

    queue, seen, rows, link_map = [(start, 0)], {start}, [], {}
    async with AsyncWebCrawler(config=browser_cfg) as crawler:  # sequential: concurrency 1
        while queue and len(rows) < args.max_pages:
            url, depth = queue.pop(0)
            if not robots.can_fetch(cfg.USER_AGENT, url):
                print(f"skip (robots.txt): {url}")
                continue
            print(f"[{len(rows) + 1}/{args.max_pages}] {url}")
            res = await fetch(crawler, run_cfg, url, args.retries, cfg.BACKOFF_SECONDS)
            if res:
                md = str(res.markdown or "")
                meta = extract(res.html)
                (out / "pages" / f"{slug(url)}.md").write_text(md, encoding="utf-8")
                internal = []
                for link in (res.links or {}).get("internal", []):
                    href = normalize(urljoin(url, link.get("href", "")))
                    if urlparse(href).scheme in ("http", "https") and same_domain(href, host) \
                            and not href.lower().endswith(cfg.SKIP_EXTENSIONS):
                        internal.append(href)
                        if href not in seen and depth < args.max_depth:
                            seen.add(href)
                            queue.append((href, depth + 1))
                link_map[url] = sorted(set(internal))
                rows.append({"url": url, "depth": depth, "word_count": len(md.split()),
                             "internal_links": len(set(internal)), **meta})
            if queue:
                await asyncio.sleep(delay)

    (out / "pages.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    (out / "internal_links.json").write_text(json.dumps(link_map, indent=2), encoding="utf-8")
    with open(out / "pages.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["url", "depth", "title", "meta_description", "h1", "word_count",
                    "internal_links", "has_schema"])
        for r in rows:
            w.writerow([r["url"], r["depth"], r["title"], r["meta_description"],
                        " | ".join(r["h1"]), r["word_count"], r["internal_links"], r["has_schema"]])
    print(f"Done: {len(rows)} pages -> {out}")


def main():
    p = argparse.ArgumentParser(description="Safe read-only crawler (same-domain, robots.txt-aware).")
    p.add_argument("--url", default=cfg.DEFAULT_START_URL)
    p.add_argument("--max-pages", type=int, default=cfg.MAX_PAGES)
    p.add_argument("--max-depth", type=int, default=cfg.MAX_DEPTH)
    p.add_argument("--delay", type=float, default=cfg.DELAY_SECONDS)
    p.add_argument("--timeout", type=float, default=cfg.TIMEOUT_SECONDS)
    p.add_argument("--retries", type=int, default=cfg.MAX_RETRIES)
    p.add_argument("--output", default=cfg.OUTPUT_DIR)
    args = p.parse_args()
    if urlparse(args.url).scheme not in ("http", "https"):
        p.error("--url must be http(s)")
    args.max_pages = max(1, args.max_pages)
    args.delay = max(1.0, args.delay)  # never hammer a site
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
