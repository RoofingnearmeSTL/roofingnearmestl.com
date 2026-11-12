// Ice & water shield (ice barrier) courses at the eaves (pure, no imports).
//
// IRC R905.1.2: where an ice barrier is required, it runs from the lowest edge of the roof to at least 24 inches
// inside the exterior wall line. This follows the Building Experts Institute IWS calculator Mike uses: the 24 inches
// are measured to the warm (interior) face of the wall, so the horizontal run from the fascia is
//   overhang + wall depth (cladding + sheathing + framing + drywall) + 24 in,
// the sloped distance is that run times the slope factor sqrt(1 + (rise/12)^2), and each course after the first
// adds the roll width minus the lap. Checked against Mike's sample: 5:12, 13 in overhang, 5.75 in wall ->
// 42.75 in run, 46.31 in sloped, 2 courses of 36 in roll with a 3.5 in lap.

export const FRAMING = [
  { id: '2x4', label: '2x4 (3.5")', inches: 3.5 },
  { id: '2x6', label: '2x6 (5.5")', inches: 5.5 },
  { id: '2x8', label: '2x8 (7.25")', inches: 7.25 },
  { id: 'other', label: 'Other (enter below)', inches: 0 },
] as const

export const CLADDING = [
  { id: 'vinyl', label: 'Vinyl siding', inches: 1.25 },
  { id: 'insulated-vinyl', label: 'Insulated vinyl siding', inches: 1.75 },
  { id: 'fiber-cement', label: 'Fiber cement siding', inches: 1.25 },
  { id: 'engineered-wood', label: 'Engineered wood (LP) siding', inches: 1.25 },
  { id: 'wood-clapboard', label: 'Wood clapboard', inches: 0.75 },
  { id: 'board-batten', label: 'Board and batten', inches: 1.5 },
  { id: 'aluminum', label: 'Aluminum siding', inches: 1 },
  { id: 'steel', label: 'Steel siding', inches: 1 },
  { id: 'brick-full', label: 'Brick veneer (full)', inches: 4.5 },
  { id: 'thin-brick', label: 'Thin brick veneer', inches: 1.25 },
  { id: 'stone-natural', label: 'Stone veneer (natural)', inches: 5 },
  { id: 'stone-manufactured', label: 'Manufactured stone veneer', inches: 2.5 },
  { id: 'stucco', label: 'Stucco (traditional)', inches: 1 },
  { id: 'other', label: 'Other (enter below)', inches: 0 },
] as const

export type IceBarrierInput = {
  pitchRise: number
  overhangIn: number
  claddingIn: number
  sheathingIn: number
  framingIn: number
  drywallIn: number
  rollWidthIn: number
  lapIn: number
}

export type IceBarrierResult = {
  wallDepthIn: number
  horizontalRunIn: number
  slopedRequiredIn: number
  courses: number
  coverageIn: number
}

const r2 = (n: number) => Math.round(n * 100) / 100

export function iceBarrier(i: IceBarrierInput): IceBarrierResult | null {
  const vals = [i.pitchRise, i.overhangIn, i.claddingIn, i.sheathingIn, i.framingIn, i.drywallIn, i.rollWidthIn, i.lapIn]
  if (vals.some((v) => !Number.isFinite(v) || v < 0)) return null
  if (!(i.pitchRise > 0) || !(i.rollWidthIn > i.lapIn) || i.rollWidthIn < 12 || i.rollWidthIn > 72) return null
  const wallDepthIn = i.claddingIn + i.sheathingIn + i.framingIn + i.drywallIn
  const horizontalRunIn = i.overhangIn + wallDepthIn + 24
  const slopedRequiredIn = horizontalRunIn * Math.sqrt(1 + (i.pitchRise / 12) ** 2)
  const courses = slopedRequiredIn <= i.rollWidthIn ? 1 : 1 + Math.ceil((slopedRequiredIn - i.rollWidthIn) / (i.rollWidthIn - i.lapIn) - 1e-9)
  return {
    wallDepthIn: r2(wallDepthIn),
    horizontalRunIn: r2(horizontalRunIn),
    slopedRequiredIn: r2(slopedRequiredIn),
    courses,
    coverageIn: r2(i.rollWidthIn + (courses - 1) * (i.rollWidthIn - i.lapIn)),
  }
}

export function numberFrom(raw: unknown, fallback = 0): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() ? Number(raw.replace(/[",\s]/g, '')) : NaN
  return Number.isFinite(n) ? n : fallback
}
