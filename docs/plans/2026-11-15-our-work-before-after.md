# Our Work: before & after projects + reviews (Nov 15 2026)

Mike approved (chat, Nov 15 2026): Our Work page + one pair on the landing page + manual reviews; brand line
"Born & raised in St. Louis. Local, not storm chasers. ... no waiting, no runarounds"; two-week start; build with
4 placeholder projects until real photos with homeowner OK arrive. Domain: www.roofingnearmestl.com (no hyphen).

## Built (this PR)
- `src/lib/projects.ts`: project list, rules checked at build (`assertProjectRules`), 4 sample projects.
  Samples show only on this PC and Vercel preview links; never when `VERCEL_ENV=production` or on a `main` build.
- `src/components/project-card.tsx`: before | after side by side (stacked on phones), 3-5 short lines, optional
  word-for-word review from the same customer. No carousel.
- `/our-work` with service filters. 404 on the live site until a real project exists; menu, footer and
  sitemap links appear automatically then.
- Homepage: up to 3 featured projects above the reviews. `/free-inspection`: one featured pair beside the form
  (below it on phones), "See more of our work" opens in a new tab; brand line under the headline; two-week start on.
- Reviews stay manual (`src/lib/reviews.ts`), linked to Google.

## Going live (what Mike sends per project)
1. 1-3 before photos and the same angles after, as large as possible.
2. Service, state, town (only if the homeowner OKs it), one line on the problem, one on what we did (material/brand).
3. Homeowner's written OK for the photos (and for the town).
4. Optional: the name on that customer's Google review.
Then: photos to `public/projects/<slug>/`, an entry in `projects.ts`, delete one sample, PR, Mike merges + Promotes.

## Later (not built)
- Drag slider on top of the side-by-side pair (keyboard accessible).
- Single project pages once a project has 5+ photos and a real write-up.
- City pages showing projects done in that town.
