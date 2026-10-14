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

The database must expose these columns with types compatible with the submitted
values: `name`, `phone`, `email`, `address`, `city`, `service_type`, `issue_type`,
`roof_age`, `roof_size`, `roof_pitch`, `roof_material`, `emergency`, `message`.
The current form's `service`, `details`, and `est_size`/`est_pitch`/`est_material`
are mapped to the corresponding database columns. Absent optional values are
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

Run isolated lead-handler regression tests (mocked Supabase and Resend, no
credentials or live side effects) with:

```bash
node --test tests/lead-route.test.mjs
```
