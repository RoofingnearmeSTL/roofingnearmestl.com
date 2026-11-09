import Link from "next/link";
import { serverSupabase } from "@/lib/data-store/server-client";
import { cleanQuery, getGraph, getNote, searchNotes } from "@/lib/dashboard/data";
import { layoutGraph } from "@/lib/dashboard/graph-layout";
import { parseMarkdown } from "@/lib/brain/markdown";
import { formatCentral } from "@/lib/dashboard/time";
import { Card, NotSetUp, Section, SourceNote } from "@/components/dashboard/ui";
import MarkdownView from "@/components/dashboard/markdown-view";
import BrainGraphSvg, { groupColors } from "@/components/dashboard/brain-graph-svg";

export const dynamic = "force-dynamic";

type SP = { [key: string]: string | string[] | undefined };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const notesHref = (p: string) => "/dashboard/brain?note=" + encodeURIComponent(p);
const REPO_RE = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;

function notSetUp(r: { state: string; reason?: string }) {
  if (r.state === "error") return <p className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">Could not read the notes copy. Try again in a minute.</p>;
  if (r.reason === "supabase") return <NotSetUp>add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy.</NotSetUp>;
  return <NotSetUp>run the data store SQL file in Supabase (README, Data store setup), then run the first copy.</NotSetUp>;
}

export default async function BrainPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = cleanQuery(first(sp.q));
  const notePath = first(sp.note);
  const db = serverSupabase(process.env);
  const repoEnv = (process.env.BRAIN_GITHUB_REPO ?? "").trim();
  const repo = REPO_RE.test(repoEnv) ? repoEnv : "RoofingnearmeSTL/Brain-Data";

  const [search, note, graph] = await Promise.all([
    q ? searchNotes(db, q) : Promise.resolve(null),
    notePath ? getNote(db, notePath) : Promise.resolve(null),
    getGraph(db),
  ]);

  return (
    <>
      <h1 className="text-3xl font-black tracking-tight">Brain notes</h1>
      <p className="mt-1 text-sm text-zinc-600">A read-only daily copy of the notes on GitHub. To change a note, change it on GitHub.</p>

      <Section title="Search">
        <form action="/dashboard/brain" method="get" className="flex flex-wrap items-end gap-2">
          <label className="flex-1 text-sm font-bold" htmlFor="q">Search notes
            <input id="q" name="q" type="search" defaultValue={q} maxLength={80} className="mt-1 block min-h-11 w-full min-w-48 rounded-lg border border-zinc-300 bg-white px-3 font-normal" />
          </label>
          <button type="submit" className="min-h-11 rounded-full bg-brand-ink px-6 font-bold text-white hover:bg-brand-ink-dark">Search</button>
        </form>
        {search && (search.state !== "ok" ? notSetUp(search) : search.hits.length === 0 ? <p className="text-sm">No notes match &quot;{search.query}&quot;.</p> : (
          <ul className="space-y-3">
            {search.hits.map((h) => (
              <li key={h.path} className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">
                <Link href={notesHref(h.path)} className="font-bold text-brand-ink underline">{h.title}</Link>
                <p className="text-xs text-zinc-600">{h.path} · changed {formatCentral(h.changedAt)}</p>
                {h.snippet && <p className="mt-1 break-words text-zinc-700">{h.snippet}</p>}
              </li>
            ))}
          </ul>
        ))}
      </Section>

      {note && (
        <Section title="Note">
          {note.state !== "ok" ? notSetUp(note) : !note.found || !note.note ? <p className="text-sm">Not found. It may have been removed from GitHub.</p> : (
            <Card>
              <h3 className="text-xl font-black">{note.note.title}</h3>
              <p className="text-xs text-zinc-600">{note.note.path} · changed {formatCentral(note.note.changedAt)} (as seen by the daily copy)</p>
              <p className="mt-1 text-sm"><a className="font-bold text-brand-ink underline" href={`https://github.com/${repo}/blob/main/${note.note.path.split("/").map(encodeURIComponent).join("/")}`} target="_blank" rel="noopener noreferrer">Open in GitHub</a></p>
              <div className="mt-4"><MarkdownView blocks={parseMarkdown(note.note.body, note.note.path)} /></div>
              {note.note.truncated && <p className="mt-3 text-sm text-zinc-700">This note is long; the copy shows the first 200,000 characters.</p>}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div><h4 className="font-bold">Links to</h4><ul className="mt-1 space-y-1 text-sm">{note.linksTo.map((l) => <li key={l.path} className="break-words"><Link className="text-brand-ink underline" href={notesHref(l.path)}>{l.path}</Link></li>)}{note.linksTo.length === 0 && <li className="text-zinc-600">Nothing.</li>}</ul></div>
                <div><h4 className="font-bold">Linked from</h4><ul className="mt-1 space-y-1 text-sm">{note.linkedFrom.map((l) => <li key={l.path} className="break-words"><Link className="text-brand-ink underline" href={notesHref(l.path)}>{l.path}</Link></li>)}{note.linkedFrom.length === 0 && <li className="text-zinc-600">Nothing.</li>}</ul></div>
              </div>
              <SourceNote>Daily copy of GitHub {repo} (main){note.note.commit ? `, commit ${note.note.commit}` : ""}. Checked {formatCentral(note.checkedAt)}.</SourceNote>
            </Card>
          )}
        </Section>
      )}

      <section id="graph" className="mt-10">
        <h2 className="text-2xl font-black tracking-tight">How notes connect</h2>
        <div className="mt-4 space-y-4">
          {graph.state !== "ok" ? notSetUp(graph) : (() => {
            const laid = layoutGraph(graph.nodes.map((n) => ({ id: n.id, group: n.group })), graph.edges);
            const titles = new Map(graph.nodes.map((n) => [n.id, n.title]));
            const colors = groupColors(laid.map((n) => n.group));
            const top = [...laid].sort((a, b) => b.degree - a.degree || (a.id < b.id ? -1 : 1)).slice(0, 15);
            return (
              <>
                <BrainGraphSvg nodes={laid} edges={graph.edges} titles={titles} />
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">{[...colors.entries()].map(([g, c]) => <li key={g} className="flex items-center gap-1"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ background: c }} />{g}</li>)}</ul>
                {top.length > 0 && <Card><h3 className="font-bold">Most linked notes</h3><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{top.map((n) => <li key={n.id}><Link className="text-brand-ink underline" href={notesHref(n.id)}>{titles.get(n.id) ?? n.id}</Link> <span className="text-xs text-zinc-600">({n.degree} links)</span></li>)}</ol></Card>}
                <SourceNote>Each dot is a note and each line is a link between two notes (the {Math.min(graph.nodes.length, 150)} best-connected notes are drawn). Daily copy of GitHub {repo} (main). Checked {formatCentral(graph.checkedAt)}.</SourceNote>
              </>
            );
          })()}
        </div>
      </section>
    </>
  );
}
