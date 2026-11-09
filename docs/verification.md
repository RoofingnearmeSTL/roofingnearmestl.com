# Lead alert and GA4 verification

Evidence that lead alerts and GA4 tracking work in production. AI agents cannot see the Vercel,
Supabase, Resend or GA4 dashboards, so the owner records results here. Do not re-flag these items
as "unverified" once a row below is marked PASS with a date.

**Never put keys, tokens, webhook URLs, customer names, phone numbers or emails in this file. The repo is public.**

## What actually exists

| Alert | Status |
|---|---|
| Lead saved to Supabase `leads` table | Built (`src/app/api/lead/route.ts`) |
| Owner email through Resend (`RESEND_API_KEY`, `LEAD_TO_EMAIL`) | Built |
| Text alert through Twilio | Built, optional, off unless all four Twilio settings are set |
| CRM hook (`LEAD_WEBHOOK_URL`, Make.com to RoofLink) | Built, optional, not used |
| Phone and email checks on leads (owner email "Phone check" / "Email check" lines, webhook `phone_check` / `email_check`) | Built, not yet owner-tested |
| Daily lead check email (`/api/lead-check`) | Built |
| **Slack** | **Not built and not used. Nothing sends to Slack. Do not flag it.** |
| GA4 `generate_lead` and `click_to_call` | Built, runs only if `NEXT_PUBLIC_GA4_ID` is set in Vercel |

## Test procedure (owner, about 10 minutes)

1. Confirm in Vercel → Settings → Environment Variables (Production) that these names exist. Do not copy the values:
   `NEXT_PUBLIC_GA4_ID`, `RESEND_API_KEY`, `LEAD_TO_EMAIL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
   If `NEXT_PUBLIC_GA4_ID` was just added or changed, redeploy first.
2. In GA4 open Admin → DebugView (or Reports → Realtime) and leave it open.
3. On the live site, with the GA4 debug view active, submit the quote form with a test name such as `TEST DO NOT CALL` and your own email.
4. Check each result below.
5. Delete the test row from Supabase afterward.

## Results

Fill in the date, then PASS or FAIL. Add a short note if FAIL.

| Check | Where to look | Expected | Date | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| Lead saved | Supabase → Table editor → `leads` | New row with the test name | | | |
| Owner email sent | Resend → Emails | Status "Delivered" to `LEAD_TO_EMAIL` | | | |
| Owner email received | Inbox for `LEAD_TO_EMAIL` | Lead email present (check spam) | | | |
| Customer confirmation | Inbox of the test email | Confirmation email present | | | |
| GA4 `generate_lead` | GA4 DebugView or Realtime | Event shows, with `lead_id` and `lead_status` | | | |
| GA4 `click_to_call` | Same, after tapping a phone link | Event shows | | | |
| GA4 page views | GA4 Realtime | Active user on the page | | | |
| Daily lead check | Inbox the morning after | Email with the lead count | | | |

## If something fails

- **No Supabase row:** check Vercel → Logs for `SUPABASE INSERT FAILED` or `SUPABASE CONFIGURATION MISSING`.
- **No email:** check Vercel logs for `RESEND CONFIGURATION MISSING`, `RESEND EMAIL FAILED` or `RESEND EMAIL CRASH`, then the Resend dashboard.
- **No GA4 events:** `NEXT_PUBLIC_GA4_ID` must match `G-[A-Z0-9]+`, be set for Production, and the site must be redeployed after setting it. Ad blockers hide events, so test in a private window with extensions off.
