import Link from "next/link";
import type { Block, Inline } from "@/lib/brain/markdown";

function Inlines({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((n, i) => {
        switch (n.t) {
          case "text": return <span key={i}>{n.v}</span>;
          case "strong": return <strong key={i}><Inlines items={n.v} /></strong>;
          case "em": return <em key={i}><Inlines items={n.v} /></em>;
          case "code": return <code key={i} className="rounded bg-zinc-100 px-1 text-[0.9em]">{n.v}</code>;
          case "link":
            return n.external
              ? <a key={i} href={n.href} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-brand-ink underline"><Inlines items={n.v} /></a>
              : <Link key={i} href={n.href} className="font-semibold text-brand-ink underline"><Inlines items={n.v} /></Link>;
        }
      })}
    </>
  );
}

export default function MarkdownView({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-3 break-words leading-relaxed">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h": {
            const cls = b.level <= 1 ? "text-xl font-black" : b.level === 2 ? "text-lg font-bold" : "text-base font-bold";
            const Tag = (b.level <= 1 ? "h2" : b.level === 2 ? "h3" : "h4") as "h2" | "h3" | "h4";
            return <Tag key={i} className={`${cls} mt-4`}><Inlines items={b.v} /></Tag>;
          }
          case "p": return <p key={i}><Inlines items={b.v} /></p>;
          case "ul": return <ul key={i} className="list-disc space-y-1 pl-6">{b.items.map((it, j) => <li key={j}><Inlines items={it} /></li>)}</ul>;
          case "ol": return <ol key={i} className="list-decimal space-y-1 pl-6">{b.items.map((it, j) => <li key={j}><Inlines items={it} /></li>)}</ol>;
          case "quote": return <blockquote key={i} className="border-l-4 border-brand/40 pl-4 text-zinc-700"><Inlines items={b.v} /></blockquote>;
          case "code": return <pre key={i} className="overflow-x-auto rounded-lg bg-zinc-100 p-3 text-sm"><code>{b.v}</code></pre>;
          case "hr": return <hr key={i} className="border-zinc-200" />;
          case "table":
            return (
              <div key={i} className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead><tr>{b.head.map((c, j) => <th key={j} className="border border-zinc-200 bg-zinc-50 px-2 py-1 text-left"><Inlines items={c} /></th>)}</tr></thead>
                  <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k} className="border border-zinc-200 px-2 py-1 align-top"><Inlines items={c} /></td>)}</tr>)}</tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
