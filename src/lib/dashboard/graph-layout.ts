// Deterministic force-directed layout (Fruchterman-Reingold) for the note map. No imports, no randomness.
export type LayoutNode = { id: string; group: string; x: number; y: number; degree: number }

function fnv(str: string, seed: number): number {
  let h = (2166136261 ^ seed) >>> 0
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
  return h
}

export function layoutGraph(
  nodes: { id: string; group: string }[],
  edges: { from: string; to: string }[],
  opts: { width?: number; height?: number; iterations?: number; margin?: number } = {},
): LayoutNode[] {
  const { width = 800, height = 560, iterations = 150, margin = 24 } = opts
  if (!nodes.length) return []
  const ids = new Set(nodes.map((n) => n.id))
  const es = edges.filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to)
  const deg = new Map<string, number>()
  for (const e of es) { deg.set(e.from, (deg.get(e.from) ?? 0) + 1); deg.set(e.to, (deg.get(e.to) ?? 0) + 1) }
  const kept = [...nodes].sort((a, b) => (deg.get(b.id) ?? 0) - (deg.get(a.id) ?? 0) || (a.id < b.id ? -1 : 1)).slice(0, 150)
  const keptIds = new Set(kept.map((n) => n.id))
  const ke = es.filter((e) => keptIds.has(e.from) && keptIds.has(e.to))
  const n = kept.length
  const idx = new Map(kept.map((nd, i) => [nd.id, i]))
  const innerW = width - 2 * margin
  const innerH = height - 2 * margin
  const x = kept.map((nd) => margin + (fnv(nd.id, 1) % 10000) / 10000 * innerW)
  const y = kept.map((nd) => margin + (fnv(nd.id, 2) % 10000) / 10000 * innerH)
  const k = Math.sqrt((innerW * innerH) / n)
  const t0 = width / 10
  for (let it = 0; it < iterations; it++) {
    const t = t0 * (1 - it / iterations)
    const dx = new Array(n).fill(0)
    const dy = new Array(n).fill(0)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ddx = x[i] - x[j]
        let ddy = y[i] - y[j]
        let d = Math.sqrt(ddx * ddx + ddy * ddy)
        if (d < 0.01) { ddx = ((i * 7 + j) % 5) - 2 || 1; ddy = ((i + j * 3) % 5) - 2 || 1; d = 0.01 + Math.sqrt(ddx * ddx + ddy * ddy) }
        const f = (k * k) / d
        dx[i] += (ddx / d) * f; dy[i] += (ddy / d) * f
        dx[j] -= (ddx / d) * f; dy[j] -= (ddy / d) * f
      }
    }
    for (const e of ke) {
      const a = idx.get(e.from)!, b = idx.get(e.to)!
      const ddx = x[a] - x[b], ddy = y[a] - y[b]
      const d = Math.max(Math.sqrt(ddx * ddx + ddy * ddy), 0.01)
      const f = (d * d) / k
      dx[a] -= (ddx / d) * f; dy[a] -= (ddy / d) * f
      dx[b] += (ddx / d) * f; dy[b] += (ddy / d) * f
    }
    for (let i = 0; i < n; i++) {
      const d = Math.max(Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]), 0.01)
      const step = Math.min(d, t)
      x[i] = Math.min(width - margin, Math.max(margin, x[i] + (dx[i] / d) * step))
      y[i] = Math.min(height - margin, Math.max(margin, y[i] + (dy[i] / d) * step))
    }
  }
  const r = (v: number) => Math.round(v * 10) / 10
  return kept.map((nd, i) => ({ id: nd.id, group: nd.group, x: r(x[i]), y: r(y[i]), degree: ke.reduce((c, e) => c + (e.from === nd.id || e.to === nd.id ? 1 : 0), 0) }))
}
