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

## First real project (Nov 15 2026, Mike)
- `st-louis-metro-siding-gutters-fascia`: siding, gutters, fascia and window wraps. Homeowner OK for the photos given
  to Mike. No address, homeowner name or price. Labelled "Siding, Gutters, Fascia & Window Wraps — St. Louis Metro".
- `state: "METRO"` = universal example for both states until a true Missouri job and a true Illinois job arrive.
  Exterior only (the build refuses roofing wording or a town on a METRO project); the card has no phone number.
- Shows on /our-work (2 pairs + front close-up), homepage, /free-inspection. /our-work, its menu/footer links and the
  sitemap entry go live with this. The siding and gutter samples were removed; 2 roof samples stay preview-only.
- Photos resized to 1600px with all hidden data (GPS, camera info) removed. Mid-job house-wrap photo not used.
- Next jobs: add another entry to `projects` in src/lib/projects.ts; it shows on the same pages automatically.

## Second real project + full-width showcase (Nov 15 2026, Mike)
- Homepage and /our-work show each real job as a full-width gallery with every photo (PR #82). Up to 2 featured jobs
  are stacked on the homepage; from 3 jobs the homepage switches to cards, with every photo on /our-work.
- `missouri-roof-replacement`: hail and wind damage, paid through the homeowner's insurance claim. Homeowner's written
  OK for the photos and for mentioning insurance (Mike confirmed in chat). Missouri, no town.
- New photo `stage: "During"` (before slot only, blue "During" badge): the roof job reads before → during → after,
  each finished shot under the matching start shot. Faces of two people by the van blurred; no readable plates,
  house numbers or street signs. The two sample roof layouts were removed (a real roof job replaces them).
