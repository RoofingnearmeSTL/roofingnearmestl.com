This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Lead API

`src/app/api/lead/route.ts` inserts into `leads` using the server-only
`SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL`. After a successful
insert it sends a notification using `RESEND_API_KEY` to `LEAD_TO_EMAIL`.
Configure these in each Vercel environment that will receive leads; never put
service-role or email API keys in client code or `NEXT_PUBLIC_*` variables.
The sender is `leads@roofingnearmestl.com` and must be verified in Resend.
An email failure is logged without failing an already-saved lead.

Phone and email checks (`src/lib/contact-check.ts`, `src/lib/email-domain-check.ts`): the browser form blocks
clearly invalid phone numbers and suggests fixes for common email typos (never applied without a tap). The server
never rejects a number with 10 or more digits; it flags it ("Phone check" in the owner email, the CRM note and
`phone_check` in the webhook). The server also looks up the email domain's mail records (1.5 s cap, run alongside the
save); when the domain has no mail server it keeps the email, adds an "Email check" line for the team and skips the
customer confirmation. The webhook carries `email_check` (`ok`, `no_mail_server`, `unknown` or `none`).

Since Nov 9 2026 the browser form requires an email (native `required` plus the inline check). The server still saves
a lead without one (old cached pages, no JavaScript): `email_check` is `none` and no customer email is sent.

Customer follow-up email (FUP-01): one combined email, built in `src/lib/customer-email.ts`, sent from
`leads@roofingnearmestl.com` with reply-to `LEAD_TO_EMAIL`. It is sent only when the lead has an email, is not a
suspected bot, the email check did not find "no_mail_server", and Resend is configured. RoofLink sends no email of its
own. The phone numbers come from `src/lib/business.ts`.

The database must expose these columns with types compatible with the submitted
values: `name`, `phone`, `email`, `address`, `city`, `service_type`, `issue_type`,
`roof_age`, `roof_size`, `roof_pitch`, `roof_material`, `emergency`, `message`.
Optional lead-source columns `gbraid`, `wbraid`, `referrer` (text).
The form sends canonical column names, including human-readable size, pitch,
and material labels. The API also accepts legacy `service`, `details`, and
`est_size`/`est_pitch`/`est_material` fields. Absent optional values are
null, except `emergency`, which defaults to false.

If PostgREST returns `PGRST204`, inspect the actual `leads` schema in Supabase
before deploying. Add missing columns using the database's appropriate types
and constraints; a service-role key does not fix a schema mismatch. If the
columns already exist, reload the schema cache in Supabase's SQL Editor:

```sql
NOTIFY pgrst, 'reload schema';
```

See [Supabase schema-cache instructions](https://supabase.com/docs/guides/troubleshooting/refresh-postgrest-schema).
No database migration or cache reload is performed by this application.

### Lead-source columns (gbraid, wbraid, referrer)

Run this once in Supabase SQL Editor to store the Google Ads `gbraid`/`wbraid` click IDs and the referring website:

```sql
alter table public.leads
  add column if not exists gbraid text,
  add column if not exists wbraid text,
  add column if not exists referrer text;
NOTIFY pgrst, 'reload schema';
```

Until it runs, an insert that carries any of these fields and fails with `PGRST204` is retried once without them
(log line `SUPABASE INSERT RETRY WITHOUT gbraid/wbraid/referrer`), so either order (migration first or deploy first)
is safe and no lead is lost. The app never runs the migration itself.

Run isolated lead-handler regression tests (mocked Supabase and Resend, no
credentials or live side effects) with:

```bash
node --test tests/lead-route.test.mjs
```

### Roofing detail rollout

The form now submits roof age ranges as text (including `<5 years` and
`Unknown`), human-readable roof size text, pitch/material text, and a real
boolean emergency flag. Verify `roof_age` and `roof_size` accept text before
rolling out. If existing columns are numeric, review and run this migration in
Supabase SQL Editor (it retains existing values as their text representation):

```sql
alter table public.leads
  alter column roof_age type text using roof_age::text,
  alter column roof_size type text using roof_size::text;
NOTIFY pgrst, 'reload schema';
```

Clay Tile and Slate Tile preserve all existing material options. Because no
validated tile pricing model is configured, tile selections request an
individual evaluation instead of displaying an asphalt price range.

After merge and a no-cache Production redeploy, submit separate clearly labeled
Clay Tile and Slate Tile tests on the production form with an age range and
Emergency Tarp Needed checked. Confirm the corresponding Supabase rows, roofing
fields in the Resend emails, and delivery in the configured recipient inbox.
The isolated tests do not establish live persistence or inbox delivery.

## Optional settings

- `NEXT_PUBLIC_GOOGLE_REVIEWS_URL`: the review link from Google Business Profile
  (Profile → Ask for reviews → copy link). Until it is set, the homepage
  "Google Rating" badge shows as plain text instead of a link.
- Text alerts for new leads (Twilio): set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
  `TWILIO_FROM_NUMBER` (your Twilio number, e.g. `+16185550100`) and
  `LEAD_ALERT_PHONE` (the cell phone to text). Nothing is sent until all four are
  set. US numbers need an approved A2P 10DLC registration before carriers deliver
  reliably. A failed text is logged and never fails a saved lead.

- CRM webhook: `LEAD_WEBHOOK_URL` (https only) sends each saved lead to the CRM automation.
  `LEAD_WEBHOOK_SECRET` is an optional server-only secret (never `NEXT_PUBLIC_`); when set, each webhook call carries
  the header `X-Webhook-Secret` with that value (surrounding spaces trimmed), and the receiver should check it.

- `INTRO_VIDEO_URL`: optional, server-side, not a secret (never `NEXT_PUBLIC_`). An `https://` link to Mike's short
  hello video (for example an unlisted YouTube link). When set, the customer follow-up email gets a "Watch Mike's
  hello" button and the link. Anything else is ignored and logged as `INTRO_VIDEO_URL IGNORED`. Redeploy after
  changing it. One video goes to Missouri AND Illinois leads, so it must not mention roofs, prices, tarps or
  response times.

## Marketing and social settings (Vercel → Settings → Environment Variables)

All optional; each feature turns on once its value is set (Production + Preview), then redeploy.

| Variable | Where to get it | Turns on |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_BUSINESS_URL` | Google Maps → your business → Share → Copy link | Footer "Google" button, `sameAs` in schema, llms.txt |
| `NEXT_PUBLIC_GOOGLE_REVIEWS_URL` | Business Profile → Ask for reviews → Copy link | Google Rating badge link, footer "Leave a Google review" |
| `NEXT_PUBLIC_GA4_ID` | Google Analytics → Admin → Data streams (`G-…`) | GA4 page views, `generate_lead`, `click_to_call` |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Events Manager → Data sources → Pixel ID (digits) | Pixel PageView, `Lead` on thank-you, `Contact` on phone taps |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console → HTML tag method → `content` value | Search Console ownership |
| `NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION` | Meta Business Suite → Brand safety → Domains → meta-tag `content` | Meta domain verification |

The Facebook page link is in `src/lib/site-pages.ts` (`FACEBOOK_URL`). The share
image for link previews is `public/og-image.jpg`.
