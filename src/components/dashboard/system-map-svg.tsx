import type { MapEdge, MapNode } from "@/lib/dashboard/system-map";

// Fixed positions (centre of each box) in a 800 x 420 picture.
const POS: Record<string, [number, number]> = {
  website: [400, 190], google: [100, 110], meta: [100, 270],
  supabase: [690, 60], resend: [690, 140], n8n: [690, 220], rooflink: [690, 300], twilio: [690, 380],
  vercel_cron: [260, 380], github_brain: [440, 380],
};
const W = 150, H = 46;

function boxStyle(status: MapNode["status"]) {
  if (status === "connected") return { fill: "#E8F5FB", stroke: "#0B6E99", dash: undefined };
  if (status === "built_off") return { fill: "#f4f4f5", stroke: "#71717a", dash: "5 4" };
  return { fill: "#fffbeb", stroke: "#b45309", dash: undefined };
}

export default function SystemMapSvg({ nodes, edges }: { nodes: MapNode[]; edges: MapEdge[] }) {
  const label = nodes.map((n) => `${n.label}: ${n.statusLabel}`).join("; ");
  return (
    <svg viewBox="0 0 800 420" width="100%" role="img" aria-label={`How the platforms connect. ${label}`} className="rounded-xl border border-zinc-200 bg-white">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#71717a" /></marker>
      </defs>
      {edges.map((e, i) => {
        const a = POS[e.from], b = POS[e.to];
        if (!a || !b) return null;
        return (
          <g key={i}>
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#a1a1aa" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <text x={(a[0] + b[0]) / 2} y={(a[1] + b[1]) / 2 - 4} textAnchor="middle" fontSize="10" fill="#52525b" stroke="#fff" strokeWidth="3" paintOrder="stroke">{e.label}</text>
          </g>
        );
      })}
      {nodes.map((n) => {
        const p = POS[n.id];
        if (!p) return null;
        const s = boxStyle(n.status);
        return (
          <g key={n.id}>
            <rect x={p[0] - W / 2} y={p[1] - H / 2} width={W} height={H} rx="10" fill={s.fill} stroke={s.stroke} strokeWidth="2" strokeDasharray={s.dash} />
            <text x={p[0]} y={p[1] - 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#18181b">{n.label}</text>
            <text x={p[0]} y={p[1] + 12} textAnchor="middle" fontSize="10" fill="#3f3f46">{n.statusLabel}</text>
          </g>
        );
      })}
    </svg>
  );
}
