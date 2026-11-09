-- supabase/migrations/20261109120000_data_store_dashboard_v1.sql
-- Data store and owner dashboard v1 (DATA-03, DATA-04, DASH-01, DASH-02). RoofingnearmeSTL, Nov 9 2026.
-- Run ONCE by the owner in Supabase -> SQL Editor -> New query -> paste -> Run. The app never runs it.
-- Safe to run twice (if not exists everywhere). public.leads is NOT touched.
-- Security: RLS is on for every table and there are NO policies, so the anon and authenticated roles can read or
-- write nothing. Only the website server (service role key, server-only) uses these tables, exactly like leads.
-- Never store customer names, phones, emails, addresses or messages in any of these tables.

begin;

-- One row per Brain-Data markdown file (daily read-only copy; GitHub stays the source of truth).
create table if not exists public.brain_notes (
  path        text primary key
              check (char_length(path) between 4 and 400 and path ~ '\.md$' and path !~ '(^|/)\.\.(/|$)'),
  folder      text not null default '',
  title       text not null check (char_length(title) <= 300),
  body        text not null default '',
  truncated   boolean not null default false,
  size_bytes  integer not null default 0 check (size_bytes >= 0),
  links       jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  git_sha     text not null check (git_sha ~ '^[0-9a-f]{40,64}$'),
  commit_sha  text check (commit_sha ~ '^[0-9a-f]{40,64}$'),
  changed_at  timestamptz not null default now(),
  search      tsvector generated always as (
                setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                setweight(to_tsvector('english', coalesce(body, '')), 'B')
              ) stored
);
create index if not exists brain_notes_search_idx on public.brain_notes using gin (search);
create index if not exists brain_notes_folder_idx on public.brain_notes (folder);
create index if not exists brain_notes_changed_idx on public.brain_notes (changed_at desc);
comment on table public.brain_notes is 'Daily read-only copy of Brain-Data markdown files (GitHub main). Never edit here: the next copy overwrites it.';

-- Note-to-note links (rebuilt from brain_notes.links on every copy).
create table if not exists public.brain_links (
  from_path text not null references public.brain_notes (path) on delete cascade,
  to_path   text not null references public.brain_notes (path) on delete cascade,
  kind      text not null default 'link' check (kind in ('link', 'wiki', 'mention')),
  primary key (from_path, to_path),
  check (from_path <> to_path)
);
create index if not exists brain_links_to_idx on public.brain_links (to_path);

-- One row per company per weekly scan (market/companies/<slug>/scans/<date>/changes.json).
create table if not exists public.competitor_changes (
  company             text not null check (company ~ '^[a-z0-9-]{1,80}$'),
  company_name        text check (char_length(company_name) <= 120),
  scan_date           date not null,
  compared_with       date,
  pages_before        integer check (pages_before >= 0),
  pages_now           integer check (pages_now >= 0),
  pages_source        text check (pages_source in ('changes.json', 'sitemap-urls.txt')),
  sitemap_read        boolean,
  homepage            text check (char_length(homepage) <= 200),
  added_count         integer not null default 0 check (added_count >= 0),
  removed_count       integer not null default 0 check (removed_count >= 0),
  added               jsonb not null default '[]'::jsonb check (jsonb_typeof(added) = 'array'),
  removed             jsonb not null default '[]'::jsonb check (jsonb_typeof(removed) = 'array'),
  new_offer_lines     jsonb not null default '[]'::jsonb check (jsonb_typeof(new_offer_lines) = 'array'),
  removed_offer_lines jsonb not null default '[]'::jsonb check (jsonb_typeof(removed_offer_lines) = 'array'),
  robots_skipped      jsonb not null default '[]'::jsonb check (jsonb_typeof(robots_skipped) = 'array'),
  source_path         text not null,
  git_sha             text not null check (git_sha ~ '^[0-9a-f]{40,64}$'),
  synced_at           timestamptz not null default now(),
  primary key (company, scan_date)
);
create index if not exists competitor_changes_scan_idx on public.competitor_changes (scan_date desc);

-- Rows of the tables in market/companies/<slug>/recommendations.md.
create table if not exists public.recommendations (
  company     text not null check (company ~ '^[a-z0-9-]{1,80}$'),
  rec_id      text not null check (rec_id ~ '^[A-Z]{1,6}-[0-9]{1,5}$'),
  rec_date    date,
  idea        text not null check (char_length(idea) <= 2000),
  evidence    text check (char_length(evidence) <= 2000),
  status      text not null check (status in ('proposed', 'approved', 'in_progress', 'done', 'declined', 'still_recommended', 'unknown')),
  status_text text check (char_length(status_text) <= 2000),
  link        text check (char_length(link) <= 500),
  is_open     boolean generated always as (status not in ('done', 'declined')) stored,
  source_path text not null,
  synced_at   timestamptz not null default now(),
  primary key (company, rec_id)
);
create index if not exists recommendations_open_idx on public.recommendations (is_open, rec_date desc);

-- Generic daily numbers for later ad, GA4 and call data (no importer yet). Totals only: never personal data.
create table if not exists public.metrics_daily (
  id          bigint generated always as identity primary key,
  metric_date date not null,
  source      text not null check (source ~ '^[a-z0-9_]{1,40}$'),   -- e.g. google_ads, ga4, meta_ads, calls, website
  metric      text not null check (metric ~ '^[a-z0-9_]{1,60}$'),   -- e.g. clicks, cost_usd, sessions, calls_answered
  dimension   text not null default '' check (char_length(dimension) <= 200), -- '' = total; e.g. a campaign name
  value       numeric not null,
  recorded_at timestamptz not null default now(),
  unique (metric_date, source, metric, dimension)
);
create index if not exists metrics_daily_source_idx on public.metrics_daily (source, metric, metric_date desc);

-- One row per sync run (daily Brain copy now; later ads/GA4 imports).
create table if not exists public.sync_runs (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind ~ '^[a-z0-9_]{1,40}$'),
  trigger     text not null default 'cron' check (trigger in ('cron', 'manual')),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  ok          boolean,                                 -- null while running
  partial     boolean not null default false,
  commit_sha  text check (commit_sha ~ '^[0-9a-f]{40,64}$'),
  counts      jsonb not null default '{}'::jsonb check (jsonb_typeof(counts) = 'object'),
  skipped     jsonb not null default '[]'::jsonb check (jsonb_typeof(skipped) = 'array'),
  error       text check (char_length(error) <= 500)   -- fixed messages only, never keys or response bodies
);
create index if not exists sync_runs_kind_started_idx on public.sync_runs (kind, started_at desc);

-- Server-only, like leads: RLS on with no policies, and no table rights for the public roles.
alter table public.brain_notes        enable row level security;
alter table public.brain_links        enable row level security;
alter table public.competitor_changes enable row level security;
alter table public.recommendations    enable row level security;
alter table public.metrics_daily      enable row level security;
alter table public.sync_runs          enable row level security;

revoke all on table public.brain_notes, public.brain_links, public.competitor_changes,
  public.recommendations, public.metrics_daily, public.sync_runs from anon, authenticated;
grant select, insert, update, delete on table public.brain_notes, public.brain_links, public.competitor_changes,
  public.recommendations, public.metrics_daily, public.sync_runs to service_role;
grant usage, select on sequence public.metrics_daily_id_seq, public.sync_runs_id_seq to service_role;

notify pgrst, 'reload schema';

commit;
