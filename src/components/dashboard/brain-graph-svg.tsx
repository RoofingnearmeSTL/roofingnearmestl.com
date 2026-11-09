import type { LayoutNode } from "@/lib/dashboard/graph-layout";

const PALETTE = ["#0B6E99", "#b45309", "#15803d", "#7e22ce", "#be123c", "#0f766e", "#4d7c0f", "#a16207"];

export function groupColors(groups: string[]): Map<string, string> {
  const uniq = [...new Set(groups)].sort();
  return new Map(uniq.map((g, i) => [g, PALETTE[i % PALETTE.length]]));
}

export default function BrainGraphSvg({ nodes, edges, titles }: { nodes: LayoutNode[]; edges: { from: string; to: string }[]; titles: Map<string, string> }) {
  if (!nodes.length) return <p className="text-sm text-zinc-600">No notes copied yet.</p>;
  const pos = new Map(nodes.map((n) => [n.id, n]));
  const colors = groupColors(nodes.map((n) => n.group));
  const labelled = new Set([...nodes].sort((a, b) => b.degree - a.degree || (a.id < b.id ? -1 : 1)).slice(0, 20).map((n) => n.id));
  return (
    <svg viewBox="0 0 800 560" width="100%" role="img" aria-label={`Map of how ${nodes.length} notes link to each other`} className="rounded-xl border border-zinc-200 bg-white">
      {edges.map((e, i) => {
        const a = pos.get(e.from), b = pos.get(e.to);
        if (!a || !b) return null;
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#d4d4d8" strokeWidth="1" />;
      })}
      {nodes.map((n) => (
        <a key={n.id} href={"/dashboard/brain?note=" + encodeURIComponent(n.id)}>
          <title>{titles.get(n.id) ?? n.id}</title>
          <circle cx={n.x} cy={n.y} r={4 + Math.min(n.degree, 10)} fill={colors.get(n.group)} fillOpacity="0.85" stroke="#fff" strokeWidth="1" />
          {labelled.has(n.id) && <text x={n.x} y={n.y - 8 - Math.min(n.degree, 10)} textAnchor="middle" fontSize="10" fill="#27272a" stroke="#fff" strokeWidth="3" paintOrder="stroke">{(titles.get(n.id) ?? n.id).slice(0, 28)}</text>}
        </a>
      ))}
    </svg>
  );
}
