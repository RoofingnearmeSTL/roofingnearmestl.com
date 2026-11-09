import Link from "next/link";
import { serverSupabase } from "@/lib/data-store/server-client";
import { getBrainSummary, getCompetitors, getLeadSummary, type Result } from "@/lib/dashboard/data";
import { setupHealth } from "@/lib/dashboard/setup-health";
import { systemMap } from "@/lib/dashboard/system-map";
import { formatCentral, timeAgo } from "@/lib/dashboard/time";
import { Card, NotSetUp, Section, SourceNote, Stat, StatusPill } from "@/components/dashboard/ui";
import SystemMapSvg from "@/components/dashboard/system-map-svg";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  il_license_pending: "Illinois roofing (license pending)",
  suspected_bot: "Possible spam",
  test: "Test",
};
const REC_LABELS: Record<string, string> = {
  proposed: "Proposed", approved: "Approved", in_progress: "In progress", done: "Done", declined: "Declined", still_recommended: "Still recommended", unknown: "Unknown",
};

function Problem({ r }: { r: Exclude<Result<unknown>, { state: "ok" }> }) {
  if (r.state === "error") return <p className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">{r.message}. Try again in a minute.</p>;
  if (r.reason === "supabase") return <NotSetUp>add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy.</NotSetUp>;
  return <NotSetUp>run the data store SQL file in Supabase (README, Data store setup). File: supabase/migrations/20261109120000_data_store_dashboard_v1.sql</NotSetUp>;
}

export default async function DashboardPage() {
  const now = new Date();
  const db = serverSupabase(process.env);
  const [leads, comps, brain] = await Promise.all([getLeadSummary(db, now), getCompetitors(db), getBrainSummary(db, now)]);
  const health = setupHealth(process.env);
  const tokenMissing = health.find((h) => h.id === "brain_copy")?.missing.some((m) => m.startsWith("BRAIN_GITHUB_TOKEN")) ?? true;
  const lastRun = brain.state === "ok" ? brain.runs[0] ?? null : null;
  const map = systemMap({
    health,
    dataStore: brain.state === "ok" ? "ok" : brain.state === "error" ? "error" : "not_set_up",
    lastBrainSync: lastRun ? { ok: lastRun.state === "ok" ? true : lastRun.state === "failed" || lastRun.state === "did_not_finish" ? false : null, at: lastRun.finishedAt ?? lastRun.startedAt } : null,
  });

  return (
    <>
      <h1 className="text-3xl font-black tracking-tight">Owner dashboard</h1>
      <p className="mt-1 text-sm text-zinc-600">Checked {formatCentral(now)}. Counts, dates, sources and statuses only: no customer details are shown here.</p>

      <Section title="Leads">
        {leads.state !== "ok" ? <Problem r={leads} /> : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Last lead" value={leads.lastLeadAt ? timeAgo(leads.lastLeadAt, now) : "none yet"} sub={leads.lastLeadAt ? formatCentral(leads.lastLeadAt) : undefined} />
              <Stat label="Today" value={leads.today} />
              <Stat label="Last 7 days" value={leads.last7} />
              <Stat label="Last 30 days" value={leads.last30} />
            </div>
            {leads.last30 === 0 && <p className="text-sm text-zinc-700">No leads in the last 30 days.</p>}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <h3 className="font-bold">By status (last 30 days)</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {Object.entries(leads.byStatus).sort((a, b) => b[1] - a[1]).map(([k, v]) => <li key={k} className="flex justify-between gap-3"><span>{STATUS_LABELS[k] ?? k}</span><strong>{v}</strong></li>)}
                  {Object.keys(leads.byStatus).length === 0 && <li className="text-zinc-600">Nothing yet.</li>}
                </ul>
              </Card>
              <Card>
                <h3 className="font-bold">Where leads came from (last 30 days)</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {leads.bySource.map((s) => <li key={s.label} className="flex justify-between gap-3"><span className="break-words">{s.label}</span><strong>{s.count}</strong></li>)}
                  {leads.bySource.length === 0 && <li className="text-zinc-600">Nothing yet.</li>}
                </ul>
              </Card>
            </div>
            <SourceNote>From the {leads.source}; test leads are left out of the totals and sources. {leads.capped ? "Showing the newest 5,000 leads only. " : ""}Checked {formatCentral(leads.checkedAt)}.</SourceNote>
          </>
        )}
        <Card>
          <h3 className="font-bold">Lead path setup</h3>
          <ul className="mt-3 space-y-3">
            {health.filter((h) => h.id !== "brain_copy" && h.id !== "ga4").map((h) => (
              <li key={h.id} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                <div><p className="font-semibold">{h.label}</p>{!h.ok && <p className="text-xs text-zinc-600">Add in Vercel: {h.missing.join(", ")}</p>}</div>
                <StatusPill status={h.ok ? "ok" : "missing"}>{h.ok ? "OK" : "Not set up"}</StatusPill>
              </li>
            ))}
          </ul>
          <SourceNote>Checked from the website&apos;s settings on {formatCentral(now)}. It only tests that a setting is present; it does not prove delivery.</SourceNote>
        </Card>
      </Section>

      <Section title="Competitors">
        {comps.state !== "ok" ? <Problem r={comps} /> : (
          <>
            {comps.scans.length === 0 ? <NotSetUp>the first daily copy has not run, so there are no weekly scans here yet (see Brain below).</NotSetUp> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {comps.scans.map((s) => (
                  <Card key={s.company}>
                    <h3 className="font-bold">{s.name}</h3>
                    <p className="text-sm text-zinc-700">Latest scan: {s.scanDate}</p>
                    <p className="text-sm text-zinc-700">Pages: {s.pagesNow ?? "not recorded"}</p>
                    <p className="text-sm text-zinc-700">+{s.added} / −{s.removed} pages{s.comparedWith ? ` since ${s.comparedWith}` : ""}</p>
                    <p className="text-sm text-zinc-700">New offer wording: {s.offerLines}</p>
                  </Card>
                ))}
              </div>
            )}
            <Card>
              <h3 className="font-bold">Open recommendations ({comps.open.length})</h3>
              {comps.open.length === 0 ? <p className="mt-2 text-sm text-zinc-600">None open.</p> : (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead><tr className="text-xs uppercase text-zinc-600"><th className="py-1 pr-3">ID</th><th className="py-1 pr-3">Company</th><th className="py-1 pr-3">Date</th><th className="py-1 pr-3">Idea</th><th className="py-1">Status</th></tr></thead>
                    <tbody>
                      {comps.open.map((r) => <tr key={r.company + r.id} className="border-t border-zinc-100 align-top"><td className="py-1 pr-3 font-mono">{r.id}</td><td className="py-1 pr-3">{r.company}</td><td className="py-1 pr-3 whitespace-nowrap">{r.date ?? ""}</td><td className="py-1 pr-3 min-w-56">{r.idea}</td><td className="py-1">{REC_LABELS[r.status] ?? r.status}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-xs text-zinc-600">All recommendations by status: {Object.entries(comps.byStatus).map(([k, v]) => `${REC_LABELS[k] ?? k} ${v}`).join(", ") || "none"}.</p>
            </Card>
            <SourceNote>From {comps.source}. Checked {formatCentral(comps.checkedAt)}.</SourceNote>
          </>
        )}
      </Section>

      <Section title="Brain">
        {brain.state !== "ok" ? (
          brain.state === "not_set_up" && brain.reason === "tables" ? <Problem r={brain} /> : tokenMissing && brain.state === "not_set_up" ? <NotSetUp>add BRAIN_GITHUB_TOKEN in Vercel, then redeploy.</NotSetUp> : <Problem r={brain} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Stat label="Notes copied" value={brain.noteCount} />
              <Stat label="Last copy" value={!lastRun ? "none yet" : lastRun.state === "ok" ? "OK" : lastRun.state === "running" ? "Running" : lastRun.state === "did_not_finish" ? "Did not finish" : "Failed"} sub={lastRun ? formatCentral(lastRun.finishedAt ?? lastRun.startedAt) : undefined} />
              <Stat label="Last good copy" value={brain.lastOk ? timeAgo(brain.lastOk.finishedAt, now) : "never"} sub={brain.lastOk ? formatCentral(brain.lastOk.finishedAt) : undefined} />
            </div>
            {tokenMissing && !lastRun && <NotSetUp>add BRAIN_GITHUB_TOKEN in Vercel, then run the first copy (README, Data store setup).</NotSetUp>}
            {!tokenMissing && !lastRun && <NotSetUp>the first daily copy has not run. In Vercel, Settings, Cron Jobs, run /api/sync/brain once.</NotSetUp>}
            {lastRun?.state === "failed" && lastRun.error && <p className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">Last copy failed: {lastRun.error} The previous copy is still in place.</p>}
            {lastRun?.partial && <p className="text-sm text-zinc-700">The last copy was partial; the rest follows on the next run.</p>}
            <Card>
              <h3 className="font-bold">Recently changed notes</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {brain.recent.slice(0, 10).map((n) => <li key={n.path}><Link className="inline-flex min-h-11 items-center font-semibold text-brand-ink underline sm:min-h-0" href={"/dashboard/brain?note=" + encodeURIComponent(n.path)}>{n.title}</Link> <span className="block text-xs text-zinc-600 sm:inline">{n.path}</span></li>)}
                {brain.recent.length === 0 && <li className="text-zinc-600">No notes copied yet.</li>}
              </ul>
              <p className="mt-2 text-xs text-zinc-600">&quot;Changed&quot; means when the daily copy last saw the note change.</p>
            </Card>
            <form action="/dashboard/brain" method="get" className="flex flex-wrap items-end gap-2">
              <label className="flex-1 text-sm font-bold" htmlFor="q">Search notes
                <input id="q" name="q" type="search" maxLength={80} className="mt-1 block min-h-11 w-full min-w-48 rounded-lg border border-zinc-300 bg-white px-3 font-normal" />
              </label>
              <button type="submit" className="min-h-11 rounded-full bg-brand-ink px-6 font-bold text-white hover:bg-brand-ink-dark">Search</button>
            </form>
            <p><Link className="inline-flex min-h-11 items-center font-bold text-brand-ink underline" href="/dashboard/brain#graph">See how notes connect</Link></p>
            <SourceNote>Daily copy of GitHub RoofingnearmeSTL/Brain-Data (main){lastRun?.commit ? `, commit ${lastRun.commit}` : ""}. Checked {formatCentral(brain.checkedAt)}.</SourceNote>
          </>
        )}
      </Section>

      <Section title="How everything connects">
        <SystemMapSvg nodes={map.nodes} edges={map.edges} />
        <ul className="grid gap-2 sm:grid-cols-2">
          {map.nodes.map((n) => (
            <li key={n.id} className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong>{n.label}</strong><StatusPill status={n.status === "connected" ? "ok" : n.status === "built_off" ? "off" : "missing"}>{n.statusLabel}</StatusPill></div>
              <p className="mt-1 text-xs text-zinc-600">{n.detail}</p>
            </li>
          ))}
        </ul>
        <SourceNote>Built from the website&apos;s settings and known facts (Brain-Data notes, Nov 9 2026). &quot;Connected&quot; means the settings are present, not that delivery was tested. Checked {formatCentral(now)}.</SourceNote>
      </Section>
    </>
  );
}
