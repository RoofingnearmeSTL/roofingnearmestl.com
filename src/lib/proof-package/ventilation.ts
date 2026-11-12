// Attic ventilation math for proof packages (pure, no imports).
//
// The International Residential Code (IRC section R806.2 in the 2018 and 2021 editions) asks for a net free
// ventilating area (NFA) of at least 1/150 of the vented attic floor area. It allows 1/300 when 40% to 50% of the
// required area is in the upper part of the attic (exhaust, within 3 feet of the ridge) and the rest is low (intake);
// in climate zones 6 to 8 a vapor retarder is also needed (St. Louis is climate zone 4). Shingle makers' installation
// instructions usually ask for the same. NFA is in square inches; vent makers print it on each vent.
// Mike checks real jobs with the Lomanco ventilation calculator; this mirrors the code minimum for the report.

export type VentMethod = 150 | 300

export type VentInput = {
  atticSqFt: number
  intakeNfa: number
  exhaustNfa: number
  method: VentMethod
}

export type VentResult = {
  requiredTotal: number
  /** Exhaust (upper) range in square inches. With 1/300 the code range is 40-50% of the total. */
  requiredExhaustMin: number
  requiredExhaustMax: number
  /** Intake (lower) needed: the rest of the total. */
  requiredIntake: number
  existingTotal: number
  totalShort: number
  intakeShort: number
  exhaustShort: number
  exhaustShare: number | null
  findings: string[]
  meetsMinimum: boolean
}

const round = (n: number) => Math.round(n)

export function sanitizeVentInput(raw: Partial<Record<keyof VentInput, unknown>>): VentInput {
  const num = (v: unknown) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/,/g, '')) : NaN
    return Number.isFinite(n) && n >= 0 && n < 1_000_000 ? n : 0
  }
  return { atticSqFt: num(raw.atticSqFt), intakeNfa: num(raw.intakeNfa), exhaustNfa: num(raw.exhaustNfa), method: raw.method === 150 ? 150 : 300 }
}

export function ventilation(input: VentInput): VentResult | null {
  const { atticSqFt, intakeNfa, exhaustNfa, method } = input
  if (!(atticSqFt > 0)) return null
  const requiredTotal = round((atticSqFt * 144) / method)
  // With 1/300 the exhaust must be 40-50% of the total; with 1/150 the code sets no split, so a balanced 50% is used.
  const requiredExhaustMin = method === 300 ? round(requiredTotal * 0.4) : round(requiredTotal * 0.5)
  const requiredExhaustMax = round(requiredTotal * 0.5)
  const requiredIntake = requiredTotal - requiredExhaustMax
  const existingTotal = round(intakeNfa + exhaustNfa)
  const totalShort = Math.max(requiredTotal - existingTotal, 0)
  const intakeShort = Math.max(requiredIntake - round(intakeNfa), 0)
  const exhaustShort = Math.max(requiredExhaustMin - round(exhaustNfa), 0)
  const exhaustShare = existingTotal > 0 ? Math.round((exhaustNfa / existingTotal) * 100) : null

  const findings: string[] = []
  const fmt = (n: number) => `${n.toLocaleString('en-US')} sq in`
  if (existingTotal === 0) findings.push('No working attic ventilation was measured.')
  else if (totalShort > 0) findings.push(`Total ventilation is ${fmt(totalShort)} short of the minimum (${fmt(existingTotal)} of ${fmt(requiredTotal)}).`)
  else findings.push(`Total ventilation meets the minimum (${fmt(existingTotal)} of ${fmt(requiredTotal)}).`)
  if (existingTotal > 0 && intakeShort > 0) findings.push(`Intake (low) ventilation is ${fmt(intakeShort)} short.`)
  if (existingTotal > 0 && exhaustShort > 0) findings.push(`Exhaust (high) ventilation is ${fmt(exhaustShort)} short.`)
  if (method === 300 && exhaustShare !== null && existingTotal > 0 && (exhaustShare < 40 || exhaustShare > 50)) {
    findings.push(`The system is not balanced: exhaust is ${exhaustShare}% of the total, outside the 40-50% the 1/300 rule needs.`)
  }
  if (existingTotal > 0 && exhaustNfa > intakeNfa) findings.push('There is more exhaust than intake, which can pull air from the living space instead of from the soffits.')
  const meetsMinimum = existingTotal > 0 && totalShort === 0 && intakeShort === 0 && exhaustShort === 0 && !(method === 300 && exhaustShare !== null && (exhaustShare < 40 || exhaustShare > 50))
  return { requiredTotal, requiredExhaustMin, requiredExhaustMax, requiredIntake, existingTotal, totalShort, intakeShort, exhaustShort, exhaustShare, findings, meetsMinimum }
}
