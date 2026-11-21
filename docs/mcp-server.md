# Business brain MCP server

A single remote **MCP** (Model Context Protocol) endpoint so Mike can connect Claude, ChatGPT or Gemini to the
RoofingnearmeSTL business brain and ask questions about it in plain language.

- **Endpoint:** `https://www.roofingnearmestl.com/api/mcp`
- **Auth:** `Authorization: Bearer <MCP_AUTH_TOKEN>` (one shared token you set in Vercel)
- **Transport:** stateless Streamable-HTTP / JSON-RPC 2.0, POST only. No dependency — the handler is hand-rolled in
  `src/app/api/mcp/route.ts` so it is easy to read and audit in this public repo.
- **Read-only.** Every tool only *reads* the data that already lives in Supabase (the same tables the owner
  dashboard uses, plus the `leads` table). It never writes, and it creates no new tables or Supabase project. It uses
  the server-only service-role client (`serverSupabase()`), exactly like the dashboard and the lead API.

## What it can answer (the tools)

| Tool | What it returns |
| --- | --- |
| `brain_search(query, limit=8)` | Full-text search of the Brain-Data notes; path, title, folder, snippet |
| `brain_note(path)` | The full body of one note by path |
| `brain_recent(days=14, limit=20)` | Most recently changed notes |
| `competitor_intel(company?, limit=20)` | Recent competitor scan changes (added/removed pages and offer lines) |
| `recommendations_list(status?, open_only=true, company?, limit=50)` | Growth/SEO recommendations |
| `metrics(source?, metric?, since?)` | Daily numbers from `metrics_daily` |
| `leads_recent(days=14, limit=50)` | Recent leads from the site (Mike's own CRM data) |
| `business_snapshot()` | Open-recommendation count, 14-day lead count, latest scan date, latest sync-run status |

Every tool returns its result as MCP text content (`[{ "type": "text", "text": "<json>" }]`).

If the data-store tables have not been created yet (run
`supabase/migrations/20261109120000_data_store_dashboard_v1.sql` once in the Supabase SQL Editor), the tools return a
clear `"tables_not_set_up"` message instead of failing.

## Privacy / security

- The endpoint is **closed by default**: if `MCP_AUTH_TOKEN` is unset or empty, *every* request is denied (401).
  The token is compared in constant time and is never logged or echoed back.
- `leads_recent` returns the owner's own lead details (name, phone, email, address, city, service, message). This is
  Mike's private CRM data, returned only to whoever holds the bearer token, and it is never cached or published. Only
  an explicit allow-list of columns is selected (no `select *`, no ad click-IDs).
- The token is a secret: keep it only in Vercel environment variables, never in the repo. Treat it like a password.
  To rotate it, set a new value in Vercel, redeploy, then update the connector header.

## Go live (owner steps)

1. **Create the token.** Generate a long random string, e.g. in a terminal:
   ```
   openssl rand -hex 32
   ```
2. **Set it in Vercel.** Project → Settings → Environment Variables → add `MCP_AUTH_TOKEN` = that value for the
   **Production** environment (add Preview too if you want to test on a preview URL).
3. **Redeploy** so the new variable is picked up (Deployments → redeploy latest, or push any change).
4. **Add the connector in Claude.** Settings → Connectors → *Add custom connector*:
   - **URL:** `https://www.roofingnearmestl.com/api/mcp`
   - **Header:** `Authorization: Bearer <the MCP_AUTH_TOKEN value>`

   ChatGPT and Gemini add a remote MCP server the same way: the same URL and the same `Authorization: Bearer …`
   header.
5. Ask it something, e.g. *"Give me a business snapshot"* or *"Any open SEO recommendations?"*

## How it works (for the next agent)

- `src/lib/mcp/tools.ts` — the tool definitions (name, description, JSON-Schema) and their read-only queries against
  the existing tables. Pure functions of a Supabase client, so they unit-test with a mocked client.
- `src/lib/mcp/server.ts` — the JSON-RPC dispatcher (`initialize`, `ping`, `tools/list`, `tools/call`, notifications)
  and the constant-time bearer check.
- `src/app/api/mcp/route.ts` — the thin Next App Router route handler (auth → parse → dispatch → `application/json`).
  `GET` returns 405; notifications return 202.
- `tests/mcp.test.mjs` — covers auth (401 / closed-by-default), `tools/list`, `tools/call` dispatch and shaping, the
  "not set up" paths, and method/tool errors. No real network or Supabase.
