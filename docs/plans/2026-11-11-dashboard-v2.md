# Owner dashboard v2: proof packages, n8n usage alerts, website updates, scraping activity

Branch: `feature/dashboard-v2` (from `main` after PR #75). Source: the Nov 10, 2026 Zoom meeting between Mike and
Michael Pope (next steps for Michael). Status: built and tested; waiting for Mike's review and merge.

## What the meeting asked for, and where it went

| Meeting item | Where | Status |
|---|---|---|
| Proof package report in the dashboard: upload files, generate a professional report | `/dashboard/proof-package` | Built |
| Alert Mike when n8n usage nears the plan limit | Dashboard "n8n usage" + daily `/api/n8n-usage-check` email | Built; needs the n8n paid plan and settings |
| Sample dashboard for tracking updates and scraping activity | Dashboard "Website updates" and "Scraping activity" | Built |
| Merge the remaining branches and deploy the dashboard | PRs #72 to #75 are merged. The 4 `copilot/*` branches from Sept 28-29 are old drafts, not part of this work | Owner steps below |
| Walk Mike through the dashboard and set a game plan | Walkthrough list below | For the call |
| Automate the data scraping / lead generation Mike showed | Ridgeline CRM (separate app), not this public site: lead-list import with dedupe, aged-lead detection, door-knocking and mailer tracking | Outside this repo |
| Welcome email wording for new leads | `src/lib/customer-email.ts` (the one email the site sends) | Waiting for Mike's wording |
| Proof package source sites (Hail Recon, the roofing site, Lomanco) and a sample report | Builder's "Attached documents"; links can be added when Mike sends them | Waiting for Mike |

Obsidian (the Brain-Data notes) stays the place for marketing data, as agreed in the meeting; nothing here adds a
new database table. The proof package keeps photos and drafts in the browser only.

## Matched to Mike's own evidence package (Nov 11, 2026)

Mike sent his tools and a sample package (a real customer's; kept out of this repo). The builder now follows its order:
cover with purpose and a system-level construction opinion; inspection-based damage summary by component (property,
shingle field with test squares, flashings, gutters, screens and collateral, ventilation); weather / hail impact
(Interactive Hail Maps report numbers typed in, NOAA reports, correlation); code and manufacturer requirements
(a St. Louis County re-roofing checklist list from the county's public checklist, the ice & water shield course
calculation, ventilation, flashing reuse, the manufacturer system); scope and cost (scope bullets from the Roofr
quantities, cost table, total price, signature); the photo report; attachments, with a one-click button that adds
Mike's four Building Experts Institute certificates from `public/certifications`.

- Ice & water shield math matches the Building Experts Institute calculator: overhang + wall depth + 24" to the warm
  wall line, times the slope factor, then courses of the roll width minus the lap (Mike's sample: 46.31", 2 courses).
- Links only (no sign-in, no data pulled): the IWS calculator, Interactive Hail Maps, Lomanco, Roofr. Data Dealers is
  a lead-data tool, so it went to Ridgeline (with Roofr and Interactive Hail Maps) as link-out integration cards.
- Two warnings in the builder: the St. Louis County checklist says an ice barrier is not required in the county,
  which conflicts with citing R905.1.2 there; and an attic area under 300 sq ft usually means roof squares were typed
  instead of attic square feet.
- The report uses RoofingnearmeSTL branding only.

## Decisions made while building

- Proof packages are built in the browser. Photos never leave the computer, nothing goes into Supabase (in line with the
  Oct 31 / Nov 9 data decisions), and drafts save in IndexedDB in that browser. The one outside request is the storm
  lookup (address + date of loss) through the dashboard's own route to the U.S. Census geocoder and NOAA SPC.
- Storm data: NOAA Storm Prediction Center daily local storm reports (public, free, back to 2004), labelled
  "preliminary" in the report. Hail-history products (e.g. a hail recon report) are attached as PDFs.
- Building code: a starter list of IRC sections in plain words, all unticked. Mike ticks what applies to the county's
  adopted edition; nothing goes into a report unless ticked. Ventilation uses IRC R806.2 (1/150, or 1/300 balanced).
- Illinois addresses show the "no roofing until the IL license" warning and the Illinois phone number.
- The dashboard's "no client components" test now allows exactly one, the builder, and checks that it reads no
  secrets, imports nothing server-side, previews in a sandbox without scripts, and fetches only the storm route.
- n8n counts follow n8n's rule (manual runs, sub-workflow calls and error-workflow runs don't count). Daily counts are
  kept in `metrics_daily` (source `n8n`) so they can't drop when n8n deletes old history. Alerts send only on the day a
  75/90/100% line is passed or the pace first points past the limit.
- New dependency: `pdfjs-dist` 6.4.299 (Oct 3, 2026; pinned, over two weeks old), loaded only in the builder.
- A third Vercel cron (`/api/n8n-usage-check`, 14:00 UTC). If the Vercel plan refuses three crons, the deployment
  check on the PR fails and says so.

## Owner setup after the merge

1. Dashboard v1 steps still open (README, "Data store setup"): run the SQL file once, add `BRAIN_GITHUB_TOKEN` and
   `DASHBOARD_PASSWORD` in Vercel (Production, Sensitive), confirm `CRON_SECRET`.
2. After upgrading n8n from the trial (the API isn't available on the trial): n8n, Settings, n8n API, create a key.
   In Vercel add `N8N_API_KEY` (Sensitive), `N8N_API_URL` (e.g. `https://yourname.app.n8n.cloud`),
   `N8N_MONTHLY_EXECUTION_LIMIT` (the plan's monthly runs) and `N8N_BILLING_DAY` (the day the plan renews).
3. Redeploy, then Promote (auto-assign is off). Run `/api/n8n-usage-check` once from Vercel, Settings, Cron Jobs, and
   check its first real run the next day (lessons.md, Oct 31: "deployed isn't working").

## Walkthrough for the call with Mike

1. Overview: leads, n8n usage meter, website updates (what's live vs waiting for Promote), scraping activity (14 sites,
   which scans wait to be merged), competitors and recommendations, Brain notes.
2. Proof package: enter an address and date of loss, Find storm reports, add photos and the hail and Lomanco PDFs,
   tick code items, Preview, Print to PDF. Ask Mike for the 3-4 source sites and a sample of his current report, to
   match its layout and wording.
3. Game plan: which proof-package sections he wants changed; welcome email wording; n8n plan size and renewal day.

## Status checklist

- [x] Proof package builder, storm lookup route, report builder, ventilation and code helpers
- [x] n8n usage check (library, daily route, dashboard section, cron entry)
- [x] Website updates and scraping activity sections
- [x] Unit tests (`tests/n8n-usage`, `proof-package`, `dashboard-activity`, updated `dashboard-wiring`, `vercel-cron`)
- [x] Playwright (`e2e/proof-package.spec.ts`, `e2e/dashboard.spec.ts`)
- [x] README and security-and-recovery settings
- [ ] Mike's review and merge, then the owner setup above
