// Rough roof replacement estimate for the /free-inspection ad page (Mike's brief, Nov 14 2026).
// One module for the browser and the server, so the price on screen and the price in the email are always
// the same pricing.ts calculation. The server is the only place a price is worked out before a lead is saved:
// it never trusts a price sent by the browser.
// Missouri roof replacement only. Illinois roofing gets no estimate until the Illinois roofing license.
import { PITCHES, SHINGLE_OPTIONS, SQ_MAX, SQ_MIN, estimate, isCustom, type PitchKey, type ShingleKey } from "./pricing";

/** The one service that can get an instant rough estimate. */
export const ESTIMATE_SERVICE = "Roof Replacement";

export const ROUGH_ESTIMATE_HEADLINE = "Your Rough Roof Replacement Estimate";

/** Shown beside every estimate on screen and in every estimate email (wording from Mike's brief). */
export const ROUGH_ESTIMATE_NOTICE =
  "This is a rough planning estimate based on the information you entered, not a final quote. Actual cost depends on verified roof measurements, roof condition, materials, and project scope. Your inspection determines the final quote.";

/**
 * Written roof-price wording for pages, FAQs and llms.txt (Mike, Nov 15 2026): no dollar figures anywhere on the site;
 * a rough number only after a saved request. Same words everywhere so pages never disagree.
 */
export const ROOF_PRICE_HOW =
  "Roof replacement prices are whole-roof totals based on your roof size, material and pitch: low pitch lands at the low end of our range, medium in the middle and steep at the high end. 3-tab costs less than 30-year architectural; premium, clay, metal and slate are custom quotes.";
export const ROOF_PRICE_GET =
  "To see a rough estimate for your roof, fill out the request form with your roof size, material and pitch: your estimate shows as soon as your request is saved, and we email you a copy. Your free inspection sets the final price.";

/** Shown before sending, only for an eligible Missouri roof replacement request. */
export const ESTIMATE_OFFER_TEXT = "Submit your request to view a rough roof replacement estimate and receive a copy by email.";

export const SUCCESS_MESSAGES = {
  estimate: "Your project request is received. Here's your rough estimate.",
  needsDetails: "Your project request is received. We'll contact you to arrange the next step and confirm the details needed for your quote.",
  exterior: "Your project request is received. We'll contact you to discuss the details and arrange the next step.",
} as const;

/**
 * size null = "I don't know my roof size". A number needs a size, a material and a pitch, all chosen by the homeowner;
 * without a size, material and pitch are optional and nothing is filled in for them.
 */
export type EstimateInputs = { size: number | null; material: ShingleKey | null; pitch: PitchKey | null };

export type RoughEstimate = {
  squares: number;
  sizeLabel: string;
  materialLabel: string;
  pitchLabel: string;
  price: number;
  low: number;
  high: number;
};

export type EstimateOutcome =
  | { status: "ready"; estimate: RoughEstimate }
  | { status: "needs_measurements" }
  | { status: "custom_quote"; materialLabel: string };

const MATERIAL_KEYS = SHINGLE_OPTIONS.map((option) => option.key);
const PITCH_KEYS = Object.keys(PITCHES) as PitchKey[];

export const materialLabel = (key: ShingleKey) => SHINGLE_OPTIONS.find((option) => option.key === key)!.label.replace(/ \(.*\)$/, "");
export const sizeLabel = (squares: number) => `${squares} SQ (about ${(squares * 100).toLocaleString("en-US")} sq ft of roof)`;

/**
 * Checks estimator inputs sent by a browser. Roof size is a whole number of squares within the estimator's range,
 * or null for "I don't know my roof size". Anything else returns null (no estimate, the lead is still saved).
 */
export function parseEstimateInputs(raw: unknown): EstimateInputs | null {
  if (!raw || typeof raw !== "object") return null;
  const { size, material, pitch } = raw as Record<string, unknown>;
  const m = typeof material === "string" && MATERIAL_KEYS.includes(material as ShingleKey) ? material as ShingleKey : null;
  const p = typeof pitch === "string" && PITCH_KEYS.includes(pitch as PitchKey) ? pitch as PitchKey : null;
  if ((material != null && !m) || (pitch != null && !p)) return null; // a value that isn't one of ours
  if (size === null || size === undefined) return { size: null, material: m, pitch: p };
  if (typeof size !== "number" || !Number.isInteger(size) || size < SQ_MIN || size > SQ_MAX) return null;
  // A size needs a material, and a priced material needs a pitch (clay, metal and slate are custom quotes anyway).
  if (!m || (!p && !isCustom(m))) return null;
  return { size, material: m, pitch: p };
}

/** No size means no number: a default roof size would be a misleading estimate. Clay, metal and slate are custom quotes. */
export function roughEstimate(inputs: EstimateInputs): EstimateOutcome {
  if (inputs.material && isCustom(inputs.material)) return { status: "custom_quote", materialLabel: materialLabel(inputs.material) };
  if (inputs.size === null || !inputs.material || !inputs.pitch) return { status: "needs_measurements" };
  const result = estimate(inputs.size, inputs.material, inputs.pitch);
  if (!result) return { status: "custom_quote", materialLabel: materialLabel(inputs.material) };
  return {
    status: "ready",
    estimate: {
      squares: inputs.size,
      sizeLabel: sizeLabel(inputs.size),
      materialLabel: materialLabel(inputs.material),
      pitchLabel: PITCHES[inputs.pitch].label,
      price: result.price,
      low: result.low,
      high: result.high,
    },
  };
}

/** Only a Missouri home, a roof replacement, and nothing that says Illinois (ZIP, town or an Illinois page). */
export function estimateEligible(input: { state: unknown; service: unknown; illinois: boolean }): boolean {
  return input.state === "MO" && input.service === ESTIMATE_SERVICE && !input.illinois;
}

/** The lead's roof columns, written by the server from the checked inputs (never the browser's own labels). */
export function estimateLeadFields(inputs: EstimateInputs) {
  return {
    roof_size: inputs.size === null ? "Not known (homeowner unsure)" : sizeLabel(inputs.size),
    roof_pitch: inputs.pitch ? PITCHES[inputs.pitch].label : null,
    roof_material: inputs.material ? materialLabel(inputs.material) : null,
  };
}

/** Whether the inputs can produce a number (for the submit button wording). */
export const canShowNumber = (inputs: EstimateInputs) => roughEstimate(inputs).status === "ready";
