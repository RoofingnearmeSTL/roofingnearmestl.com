<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules for every AI agent (Claude Code, Codex, Copilot, ChatGPT)

Website for **RoofingnearmeSTL** (legal name Roofing Near Me STL LLC, Waterloo, IL), live at
https://www.roofingnearmestl.com. Owner: Mike Williamson. These rules apply to every change.
This repo is public: never add anything here you would not publish.

## 1. Service area rule (never break)

- **Missouri:** roofing, siding, gutters, soffit and fascia.
- **Illinois:** siding, gutters, soffit and fascia **only**. No roofing offers, prices, CTAs or roofing
  service URLs for Illinois until the Illinois roofing license is issued. Allowed wording:
  "Roofing coming soon after IL license".
- The build enforces this (`assertIllinoisExteriorOnly` in `src/lib/site-pages.ts` and the guards in
  `src/lib/service-grid.ts`). Never weaken or bypass these checks to make a build pass.
- Phones: Illinois 618-612-5192, Missouri 314-202-7663 (`src/lib/business.ts`). Roofing CTAs use the
  Missouri number.

## 2. Claims (only what is verified)

- **True, OK to use:** 10-Year Workmanship Warranty; 24/7 emergency roof repair and tarping (Missouri);
  financing available; metal roofing installs; same-day evaluations "when our schedule allows";
  5.0★ Google rating; shingle brands **we install** (Owens Corning, CertainTeed, TAMKO, IKO);
  Building Experts Institute certificates; general liability $1M per occurrence / $2M aggregate
  (`INSURANCE` in `src/lib/business.ts`).
- **Never claim:** GAF Certified, Owens Corning Preferred (or any "certified/preferred" manufacturer
  status), BBB A+, "500+ roofs", workers' compensation coverage, or anything not listed above.
  Ask the owner before adding any new fact.
- Reviews are quoted word for word from real Google reviews only.

## 3. Pricing

- All prices come from `src/lib/pricing.ts` (30yr Architectural $450-$750/SQ, 3-Tab $350-$550/SQ,
  clay/metal/slate = custom quote; low pitch = low end, medium = middle, steep = high end).
- Never hard-code a dollar amount in a page; compute it from `pricing.ts` so the estimator, FAQ and
  cost guide always agree. Tests in `tests/pricing.test.mjs` must keep passing.
- Do not remove the adjustable estimator (`src/components/roof-estimator.tsx`).
- Show whole-roof totals only. Never publish per-square rates ("$X/SQ", "per square") or a
  "Premium from" price anywhere on the site, in metadata or in llms.txt (owner decision, Oct 29 2026).
  Premium, clay, metal and slate are custom quotes. `tests/pricing.test.mjs` checks this.

## 4. How changes ship

1. Work on a new branch from `main`; one agent per branch, never two agents on the same files.
2. Before opening a PR run `npm run check` (eslint, `tsc --noEmit`, `node --test tests/*.mjs`,
   `next build`, then `scripts/compliance-scan.mjs`). All must pass. GitHub Actions runs the same checks
   plus a secret scan on every PR (`.github/workflows/pr-checks.yml`); never merge with a red check.
3. Open a pull request; the owner reviews and merges. Never push to `main` directly
   (it is protected), never force-push, never merge your own PR.
4. Save multi-step plans in `docs/plans/` so the next agent can pick up the work.
5. After a merge, confirm the change on the live site (pages load, Google/Meta tags fire).

## 5. Security

- Never put API keys, tokens, passwords or webhook URLs in code, commits, PR text or chat.
  Secrets live in Vercel environment variables (see `docs/security-and-recovery.md`).
- Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `TWILIO_*`, `LEAD_WEBHOOK_URL`)
  must never be read from a `"use client"` file or exposed as `NEXT_PUBLIC_*`.
- `.env*` and `.codex/` stay git-ignored. Do not commit local tool settings.
- Do not change or delete production data in Supabase; the `leads` table is server-write only (RLS on).
- Lead handling must never fail a saved lead: email, text and webhook steps are best-effort.

## 6. Scripts and tools

- `scripts/crawl4ai/`: polite competitor crawler (respects robots.txt, page caps). Its output stays
  git-ignored. It never runs inside the website.
- Do not use automation to bypass CAPTCHAs, logins or sites that block bots.

## 7. Style

- Plain, clear wording for homeowners. Brand name is always "RoofingnearmeSTL".
- Keep page titles under ~60 characters and meta descriptions under 160 (the build checks this).
