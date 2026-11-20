// Settings for the /free-inspection ad landing page (Mike's brief, Nov 14 2026).
// Anything not yet confirmed by Mike is OFF here and never shows on the page. Turning one on is a one-line change
// in a pull request, after Mike confirms it in writing (see the PR for the exact questions).
import { IL_LEAD_SERVICES } from "./business";

/**
 * Two-week start: Mike confirmed in chat on Nov 15 2026 that projects start about two weeks after signing.
 * Always worded with its conditions (scope, materials, weather), never as a guarantee.
 */
export const TWO_WEEK_START_CONFIRMED = true;
export const TWO_WEEK_START_TEXT =
  "Ready to move? Most projects start about two weeks after signing, depending on scope, materials and weather.";

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
/**
 * For homeowners who don't know what's wrong (Mike, Nov 20 2026). First choice in both states; saved in the same service
 * field as any other choice. It is not a roofing service, so it never brings roofing to an Illinois home.
 */
export const NOT_SURE_SERVICE = "Not sure - want your opinion / advice";
/** The matching "What's going on?" choice, offered for every service. */
export const NOT_SURE_ISSUE = "Not sure - want your opinion / advice";
export const SERVICES_BY_STATE = {
  MO: [NOT_SURE_SERVICE, ...MO_ROOFING_SERVICES, ...IL_LEAD_SERVICES],
  IL: [NOT_SURE_SERVICE, ...IL_LEAD_SERVICES],
} as const;

/** Issue choices adapted to the service (saved in the lead's existing issue field). */
export function issueChoices(service: string): string[] {
  if (MO_ROOFING_SERVICES.includes(service)) return ["Roof leak", "Storm damage", "Aging roof / replacement", NOT_SURE_ISSUE];
  if (service === "Gutter Cleaning" || service === "House & Siding Soft Wash") return ["Cleaning needed", NOT_SURE_ISSUE];
  if (service === "Christmas Lights") return ["New light installation", NOT_SURE_ISSUE];
  if (service === "Gable & Wall Vents") return ["Hot or stuffy attic", "Moisture or frost in the attic", NOT_SURE_ISSUE];
  if (!service) return [];
  return ["Repair needed", "Storm damage", "New installation or replacement", NOT_SURE_ISSUE];
}
