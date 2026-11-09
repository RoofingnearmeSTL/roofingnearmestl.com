# Data store and owner dashboard v1 (DATA-03, DATA-04, DASH-01, DASH-02, FUP-02 extra)

Branch: `feature/dashboard-v1` (builds on `feature/phase1-lead-quality`)

Status: **Proposed: waiting for Mike's confirmation.** Moving a copy of the Brain notes into a database replaces
Mike's Oct 31 "no database" decision in Brain-Data (`docs/memory/decisions.md`). Nothing is merged, promoted or
recorded in decisions.md until Mike confirms. GitHub Brain-Data stays where notes are written and reviewed; the
Supabase tables are a read-only daily copy.

## Goal

- DATA-03: a central business data store in the existing Supabase project (six new tables, one migration file, run
  once by the owner; `public.leads` is not touched).
- DATA-04: a daily copy of the Brain-Data markdown notes, competitor scan changes and recommendation tables into
  those tables, through a protected cron route.
- DASH-01 / DASH-02: a password-protected owner dashboard at `/dashboard` (stage 2).
- FUP-02 extra: a "Meet Mike, the owner: watch a short hello" link on the thank-you page when `INTRO_VIDEO_URL` is a
  valid https link (stage 2).

## Files

Stage 1 (data store and daily copy):

- New: `supabase/migrations/20261109120000_data_store_dashboard_v1.sql`, `src/lib/brain/paths.ts`,
  `parse-note.ts`, `parse-recommendations.ts`, `parse-changes.ts`, `github.ts`, `sync.ts`,
  `src/lib/data-store/errors.ts`, `server-client.ts`, `brain-store.ts`, `src/app/api/sync/brain/route.ts`,
  `tests/helpers/load-ts.mjs`, `tests/brain-parse.test.mjs`, `brain-recommendations.test.mjs`,
  `brain-changes.test.mjs`, `brain-sync.test.mjs`, `brain-store.test.mjs`, `brain-sync-route.test.mjs`,
  `vercel-cron.test.mjs`.
- Changed: `vercel.json` (one added cron entry only).

Stage 2 (dashboard, video link, docs): proxy, dashboard pages and components, thank-you block, robots, README,
security and verification docs, Playwright specs. Not built yet.

## Decisions

- Env vars (server-only, never `NEXT_PUBLIC_`): `BRAIN_GITHUB_TOKEN` (fine-grained, read-only Contents),
  optional `BRAIN_GITHUB_REPO` (default `RoofingnearmeSTL/Brain-Data`, branch always `main`), `CRON_SECRET`
  (existing, reused), `DASHBOARD_PASSWORD` (stage 2).
- `GET /api/sync/brain` uses the same bearer check as `/api/lead-check` (503 without `CRON_SECRET`, 401 on a wrong
  bearer). Cron: `0 11 * * *` (about 5-6 AM Central). By hand: `?full=1` refetches every file;
  `?allow_large_delete=1` lifts the wipe guard.
- Copies every `.md` except `market/companies/*/scans/**`, plus each `scans/<date>/changes.json` into
  `competitor_changes` and each `recommendations.md` table into `recommendations`. When a changes.json has no page
  count, the sibling `sitemap-urls.txt` line count is used.
- Safety: every GitHub read finishes before any database write; a GitHub error leaves the previous copy in place and
  is recorded in `sync_runs`. Caps: 2,000 notes, 1 MB per file, 200,000 characters stored per note, 400 file
  fetches and a 45 second budget per run (the rest is copied the next day, never deleted). Deletes stop if they
  would remove more than half of 20 or more notes. The wipe guard is checked before any write, so a refused run
  changes nothing.
- Errors are fixed messages only. The token, response bodies and raw errors never reach logs, responses or
  `sync_runs.error`. Tests use fake values only.
- The sync never imports `src/lib/supabase.ts` (it throws on import when settings are missing); it uses
  `src/lib/data-store/server-client.ts`, which returns null instead.
- Missing token or tables: the route answers 503 with `setup` set to `token_missing` or `tables_missing`.
- Changed notes are fetched by git blob sha. A new note that an unchanged note's `[[wiki link]]` would now match is
  picked up on the next `?full=1` run.

## Out of scope

Importers for `metrics_daily`, writing back to GitHub, editing recommendations from the dashboard, per-file commit
dates, vector search, dashboard user accounts or rate limiting, any change to the lead route, lead form or leads
table, recording the decision in Brain-Data, and running the migration or creating tokens (owner steps).

## Owner setup

1. Mike confirms the move (replaces the Oct 31 decision). Only then merge.
2. Run `supabase/migrations/20261109120000_data_store_dashboard_v1.sql` once in the Supabase SQL Editor.
3. Create a fine-grained GitHub token for Brain-Data only, Contents read-only, with an expiry reminder.
4. Add `BRAIN_GITHUB_TOKEN` (and, in stage 2, `DASHBOARD_PASSWORD`) in Vercel, Production, Sensitive; confirm
   `CRON_SECRET` exists. Redeploy.
5. Run the first copy: Vercel, Settings, Cron Jobs, `/api/sync/brain`, Run.

## Status checklist

Stage 1:

- [x] Migration SQL file (not run)
- [x] Pure parsers: paths, notes and links, recommendations tables, changes.json
- [x] GitHub reader with fixed error messages
- [x] Data store client (null when unset) and Brain store
- [x] Sync algorithm with caps, wipe guard and failure-keeps-old-copy
- [x] `GET /api/sync/brain` route and the cron entry
- [x] Unit tests for all of the above
- [x] `CI=1 npm run check` green

Stage 2:

- [x] Password proxy (`src/proxy.ts`, `src/lib/dashboard-auth.ts`) and `/dashboard`, `/dashboard/brain`
- [x] Thank-you intro video link
- [x] robots, tracking-off, call-bar and compliance-scan guards
- [x] Playwright specs (second test server on port 3201; every secret blanked)
- [x] README, security-and-recovery and verification docs

## As built (stage 2)

Dashboard data layer: `src/lib/dashboard/data.ts` (selects named columns only; lead rows reduced to time, status and
source bucket). Pages are server components with no client code. Open owner items: Mike's confirmation, the SQL run,
`BRAIN_GITHUB_TOKEN`, `DASHBOARD_PASSWORD`.
