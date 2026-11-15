# /free-inspection ad landing page (Nov 14, 2026)

Mike's brief: an ad landing page that turns ad visitors into qualified project requests, and gives eligible Missouri
roof replacement customers a rough estimate on screen and by email, only after the request is saved.

## Built (branch `feature/free-inspection-landing`)

- `src/app/free-inspection/page.tsx`: black page, #1CA3D8 accents, yellow CTAs with dark text. Hero + form, how it
  works, trust (warranty, insurance from `business.ts`, BEI certificates, real Google reviews), Missouri shingle brands,
  FAQ, final CTA linking back to the one form, footer with privacy and company info. `noindex` (ad page only, so it
  doesn't compete with the service and city pages).
- `src/app/free-inspection/project-request.tsx`: state and service first; Missouri roof replacement shows size /
  material / pitch with "I don't know my roof size"; contact details with visible labels and inline errors; result
  panel; sticky phone bar (Call + Start My Project, number follows the chosen state, hidden while the form is on screen).
- `src/lib/estimate-offer.ts`: the one estimate module (browser + server), built on `pricing.ts`. No size = no number.
- `/api/lead` (`form: "project-request"`): prices the estimate on the server, puts it in the one customer email, returns
  `ref`, `email` (sent / failed / not_sent) and a sealed `estimate_token`. Browser prices are ignored.
- `/api/estimate-email`: "Email My Updated Estimate". Sealed AES-GCM token (`src/lib/estimate-token.ts`), sends only to
  the address saved with the request, recalculates from `pricing.ts`, BotID, same-site check, duplicate/rate limits,
  Resend idempotency key. `send: false` re-checks the token to restore the result after a refresh.
- Conversions: one Ads/Meta/GA4 lead per saved request (`src/lib/lead-conversion.ts`), never on refresh, estimate view
  or email; GA4-only `estimate_view` / `estimate_email` events with no contact details or prices.

## Waiting on Mike (switched off in `src/lib/free-inspection.ts` until confirmed)

1. Two-week start: what starts two weeks after signing, which services, achievable now? (`TWO_WEEK_START_CONFIRMED`)
2. Cleanup practices: landscaping protection, dump trailer, two magnetic nail sweeps, final walkthrough, on every job?
   (`CLEANUP_CONFIRMED`)
3. Ad video: MP4 + poster + captions (.vtt) in `public/video/`, then fill `AD_VIDEO`.
4. Before/after: real photos of the same Missouri project, with town and service. Section not built until they exist.
5. Optional: a dedicated `ESTIMATE_TOKEN_SECRET` in Vercel (otherwise derived from the Supabase service key).

## Not done on purpose

- The estimator elsewhere on the site is unchanged (gating applies to this page only, per the brief).
- No ads launched or unpaused. No production test lead without Mike's OK.
- Updated-estimate limits are kept in each server copy's memory plus Resend's idempotency key; a durable limit would
  need a small Supabase table (Mike's OK and a migration).
