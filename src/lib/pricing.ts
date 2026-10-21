// Roof replacement pricing (owner-set, 2026). One source for the estimator, the text fallback,
// the cost guide and the Q&A pages, so the published numbers can never disagree.
// Missouri roofing only: Illinois roofing is not offered until the Illinois roofing license.
// 1 square (SQ) = 100 sq ft of roof surface.

export const SQ_MIN = 10;
export const SQ_MAX = 40;
export const SQ_DEFAULT = 18;

export type ShingleKey = "3tab" | "architectural" | "clay" | "metal" | "slate";
export type PitchKey = "low" | "medium" | "steep";

/** Priced shingles: dollars per square, low and high end of the range. */
export const SHINGLES: Record<"3tab" | "architectural", { label: string; low: number; high: number }> = {
  "3tab": { label: "3-Tab 25-Year", low: 350, high: 550 },
  architectural: { label: "30-Year Architectural", low: 450, high: 750 },
};

/** Not priced online: custom quote, "Call Mike to Lock Price". */
export const CUSTOM_MATERIALS: Record<"clay" | "metal" | "slate", string> = { clay: "Clay Tile", metal: "Metal", slate: "Slate" };

export const SHINGLE_OPTIONS: { key: ShingleKey; label: string }[] = [
  { key: "architectural", label: "30-Year Architectural (most popular)" },
  { key: "3tab", label: "3-Tab 25-Year" },
  { key: "clay", label: "Clay Tile (custom quote)" },
  { key: "metal", label: "Metal (custom quote)" },
  { key: "slate", label: "Slate (custom quote)" },
];

export const PITCHES: Record<PitchKey, { label: string; rule: string }> = {
  low: { label: "Low Pitch (2/12 - 4/12)", rule: "low end of the range" },
  medium: { label: "Medium Pitch (5/12 - 7/12)", rule: "middle of the range" },
  steep: { label: "Steep Pitch (8/12 - 12/12+)", rule: "high end of the range" },
};

export const isCustom = (shingle: ShingleKey): shingle is "clay" | "metal" | "slate" => shingle in CUSTOM_MATERIALS;

/** Clamp to the slider range and whole squares. */
export const clampSquares = (sq: number) => Math.min(SQ_MAX, Math.max(SQ_MIN, Math.round(sq)));

/** Low/high dollars for a roof size and priced shingle. */
export function priceRange(sq: number, shingle: "3tab" | "architectural") {
  const squares = clampSquares(sq);
  const { low, high } = SHINGLES[shingle];
  return { low: squares * low, high: squares * high };
}

/**
 * The estimate shown to the homeowner. Pitch picks the point in the range:
 * low pitch = low end, medium = middle ((low + high) / 2), steep = high end.
 * Clay, metal and slate return null: custom quote only.
 */
export function estimate(sq: number, shingle: ShingleKey, pitch: PitchKey) {
  if (isCustom(shingle)) return null;
  const { low, high } = priceRange(sq, shingle);
  const price = pitch === "low" ? low : pitch === "steep" ? high : Math.round((low + high) / 2);
  return { low, high, price };
}

export const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/** Lead-form fields describing what the homeowner picked in the estimator (saved with the lead and emailed). */
export function estimatorExtras(input: { squares: number; shingle: ShingleKey; pitch: PitchKey; place: string; state: "IL" | "MO" }) {
  const squares = clampSquares(input.squares);
  const result = input.state === "MO" ? estimate(squares, input.shingle, input.pitch) : null;
  return {
    roof_size: `${squares} SQ (~${(squares * 100).toLocaleString("en-US")} sq ft)`,
    roof_pitch: PITCHES[input.pitch].label,
    roof_material: SHINGLE_OPTIONS.find((option) => option.key === input.shingle)!.label.replace(/ \(.*\)$/, ""),
    est_size: squares,
    est_pitch: input.pitch,
    est_material: input.shingle,
    est_location: input.place,
    est_price: result?.price ?? null,
    est_price_low: result?.low ?? null,
    est_price_high: result?.high ?? null,
  };
}

/** Example rows for text tables (12, 18 and 24 SQ are the published examples). */
export const EXAMPLE_SQUARES = [12, 18, 24];
export const TABLE_SQUARES = [10, 12, 15, 18, 20, 24, 28, 32, 36, 40];

// Shown wherever an Illinois property is selected or an Illinois page would mention roofing.
export const IL_ROOFING_NOTE = "Roofing pricing shown for Missouri only - Illinois exterior pricing: Siding & Gutters - Roofing coming soon after IL license - Call for IL exterior quote";
export const IL_COMING_SOON = "Roofing coming soon after IL license";
