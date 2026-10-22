#!/usr/bin/env python3
"""Build a Claude-ready prompt from crawl output (local files only)."""
import argparse
from pathlib import Path

import config as cfg

HERE = Path(__file__).parent


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--output", default=cfg.OUTPUT_DIR)
    p.add_argument("--max-chars", type=int, default=60000)
    args = p.parse_args()
    out = Path(args.output)
    csv_path = out / "pages.csv"
    if not csv_path.exists():
        raise SystemExit(f"{csv_path} not found. Run `npm run crawl:safe` first.")
    template = (HERE / "claude-prompt.md").read_text(encoding="utf-8")
    links = out / "internal_links.json"
    data = (
        "### pages.csv\n" + csv_path.read_text(encoding="utf-8")
        + "\n### internal_links.json\n"
        + (links.read_text(encoding="utf-8") if links.exists() else "{}")
    )[: args.max_chars]
    result = out / "claude_prompt.md"
    result.write_text(template.replace("{{CRAWL_DATA}}", data), encoding="utf-8")
    print(f"Wrote {result}. Paste it into Claude (attach output/pages/*.md for deeper content review).")


if __name__ == "__main__":
    main()
