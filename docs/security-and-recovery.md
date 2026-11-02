# Security and recovery guide

How the site is protected, how to bring it back if something breaks, and how to replace a leaked key.
This file is public (the repo is public): it names settings, never their values.

Last full check: 2026-10-23.

## Where everything lives

| Piece | Service | What breaks without it |
|---|---|---|
| Website code | GitHub `RoofingnearmeSTL/roofingnearmestl.com` (public) | Nothing live; it is the source for every deploy |
| Live website | Vercel project `roofingnearmestl.com` (team `roofingnearme-stl`) | The site |
| Lead storage | Supabase project `zaazhdquikjhmocwcqjw`, table `leads` | Saving form leads (the form shows an error and asks people to call) |
| Lead emails | Resend, sending from `leads@roofingnearmestl.com` | Lead alert emails (leads are still saved) |
| Lead text alerts | Twilio (optional, off until set) | Text alerts only |
| Leads into RoofLink | Make scenario "Website leads to RoofLink" + RoofLink API key | RoofLink sync only (leads are still saved and emailed) |
| Ads and tracking | Google Ads, Search Console, Business Profile, Meta Pixel | Tracking only |

## Settings the site needs (Vercel → Settings → Environment Variables)

Secret (server only, never `NEXT_PUBLIC_`):
`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` (Resend "Sending access"), `RESEND_LEAD_CHECK_KEY` (Resend
"Full access", read only by `/api/lead-check` to list sent emails), `CRON_SECRET`, `LEAD_TO_EMAIL`, `LEAD_WEBHOOK_URL`,
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `LEAD_ALERT_PHONE`.

Public (safe in the browser): `NEXT_PUBLIC_SUPABASE_URL` and the optional `NEXT_PUBLIC_*` overrides
for Google and Meta IDs (each has a built-in default in `src/lib`).

The service-role key is only read in `src/lib/supabase.ts` (marked `server-only`) and
`src/app/api/lead/route.ts`. Never import either from a `"use client"` file.

## Protections in place (checked 2026-10-23)

- `main` is protected by the "Lock Main" ruleset: no deletion, no force-push, changes only by pull request
  (the owner account can bypass).
- GitHub secret scanning and push protection are on (0 open alerts). No secret or `.env` file appears
  anywhere in the history of either public repo.
- `.env*`, `.codex/` and crawler output are git-ignored.
- No Supabase, Resend, Twilio or Browserbase key appears in the live site's JavaScript.
- Anonymous reads of the `leads` table are refused (HTTP 401 without a key).
- Live security headers: HSTS, X-Frame-Options DENY, CSP `frame-ancestors 'none'`, nosniff,
  Referrer-Policy, Permissions-Policy.

## Restore the website

1. **Bad deploy:** Vercel → Deployments → pick the last good Production deployment → "Instant Rollback".
   The site is back in seconds. Then fix the code with a normal pull request.
2. **Bad code merged:** on GitHub, open the merged pull request → "Revert" → merge the revert PR.
   Vercel redeploys automatically.
3. **Rebuild from nothing:** import the GitHub repo into a new Vercel project, re-add the environment
   variables listed above, connect the domain `roofingnearmestl.com`, deploy.

## Restore leads

- Every lead is also emailed to `LEAD_TO_EMAIL`, so the inbox is a second copy.
- Supabase backups depend on the plan: check Supabase → Project Settings → Database → Backups.
  On the Free plan there are no self-service restores, so export the `leads` table to CSV once a month
  (Table Editor → leads → Export) and keep the file somewhere private (not in this repo).

## Replace a leaked or old key

Make the new key first, update every place it is used, redeploy, then delete the old key.

| Key | Make a new one at | Then update |
|---|---|---|
| Supabase service role | Supabase → Project Settings → API keys | Vercel `SUPABASE_SERVICE_ROLE_KEY` → redeploy |
| Resend (sending) | Resend → API Keys, permission "Sending access" | Vercel `RESEND_API_KEY` → redeploy |
| Resend (lead check) | Resend → API Keys, permission "Full access" | Vercel `RESEND_LEAD_CHECK_KEY` → redeploy |
| Twilio auth token | Twilio Console → Account → API keys & tokens | Vercel `TWILIO_AUTH_TOKEN` → redeploy |
| Make webhook link | Make → Webhooks → the website webhook (create a new one) | Vercel `LEAD_WEBHOOK_URL` → redeploy |
| RoofLink API key | RoofLink → Company Settings → API Keys | Make → HTTP module → Connection |
| Browserbase | browserbase.com/settings | Windows user variable `BROWSERBASE_API_KEY`, the Claude Code MCP header, `.codex/config.toml` |
| GitHub sign-in | github.com/settings/tokens (or sign out/in of Git Credential Manager) | Local Git only |

## Monthly 10-minute check

- [ ] GitHub → Security: no open secret-scanning or Dependabot alerts
- [ ] GitHub and Vercel, Supabase, Resend, Make, Google, Meta accounts: two-factor login on
- [ ] GitHub → Settings → Applications: remove apps you no longer use
- [ ] Supabase: export `leads` to CSV
- [ ] Vercel: last Production deployment is green
