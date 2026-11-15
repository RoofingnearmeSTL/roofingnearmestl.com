// Settings for the /free-inspection ad landing page (Mike's brief, Nov 14 2026).
// Anything not yet confirmed by Mike is OFF here and never shows on the page. Turning one on is a one-line change
// in a pull request, after Mike confirms it in writing (see the PR for the exact questions).
import { IL_LEAD_SERVICES } from "./business";

/**
 * "Project starts may be available as soon as two weeks after signing..." stays off until Mike confirms what starts
 * two weeks after signing, which services qualify, and that the timing is achievable right now.
 */
export const TWO_WEEK_START_CONFIRMED = false;
export const TWO_WEEK_START_TEXT =
  "Project starts may be available as soon as two weeks after signing, depending on scope, materials, weather, and scheduling.";

/** Cleanup practices Mike proposed; the section shows only once he confirms they are done on every job. */
export const CLEANUP_CONFIRMED = false;
export const CLEANUP_PRACTICES = [
  { title: "Landscaping protection", text: "We cover and protect plants and beds near the work area before we start." },
  { title: "Dump trailer, not a driveway dumpster", text: "Debris goes into a dump trailer instead of a dumpster parked on your driveway." },
  { title: "Two magnetic nail sweeps", text: "We sweep the yard and driveway with a magnetic nail sweeper twice." },
  { title: "Final walkthrough with you", text: "Before we leave, we walk the property with you to check the cleanup together." },
];

/**
 * Mike's ad video. Null until the files exist: the page then shows no player at all (never an empty one).
 * When ready: an MP4 (H.264, under ~15 MB), a poster image (same aspect ratio, webp, under 150 KB) and a
 * captions file (WebVTT, .vtt), all in public/video/.
 */
export const AD_VIDEO: { src: string; poster: string; captions?: string; width: number; height: number; title: string } | null = null;

/** Roofing is offered in Missouri only, until the Illinois roofing license. */
export const MO_ROOFING_SERVICES = ["Roof Repair", "Roof Replacement", "Leak / Emergency", "Storm Damage / Insurance"];
export const SERVICES_BY_STATE = {
  MO: [...MO_ROOFING_SERVICES, ...IL_LEAD_SERVICES],
  IL: [...IL_LEAD_SERVICES],
} as const;

/** Issue choices adapted to the service (saved in the lead's existing issue field). */
export function issueChoices(service: string): string[] {
  if (MO_ROOFING_SERVICES.includes(service)) return ["Roof leak", "Storm damage", "Aging roof / replacement", "Not sure"];
  if (service === "Gutter Cleaning" || service === "House & Siding Soft Wash") return ["Cleaning needed", "Not sure"];
  if (service === "Christmas Lights") return ["New light installation", "Not sure"];
  if (service === "Gable & Wall Vents") return ["Hot or stuffy attic", "Moisture or frost in the attic", "Not sure"];
  if (!service) return [];
  return ["Repair needed", "Storm damage", "New installation or replacement", "Not sure"];
}
