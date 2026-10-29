// Illinois rule for the lead form and the lead API: roofing is offered in Missouri only until the IL roofing
// license (225 ILCS 335/9). A roofing request for an Illinois home is still saved (Mike, Oct 29, 2026), tagged
// "il_license_pending" so nobody quotes, schedules or does roof work on it, and the homeowner is told so plainly.
// Plain functions with no imports, so the browser form and the server use the exact same check.

/** The leads.status value for a roofing request on an Illinois home. */
export const IL_LICENSE_PENDING = "il_license_pending";

/** Shown under the form before sending, so the homeowner knows up front. */
export const ILLINOIS_ROOFING_NOTICE =
  "Roofing in Illinois is pending our IL license, which we expect soon. Send your request anyway: we'll save it, call you, and help now with siding, gutters, soffit, fascia and other exterior work. Illinois line: 618-612-5192.";

// Lead-form services that are roof work (everything except the exterior services).
const ROOFING_SERVICES = new Set(["Roof Repair", "Roof Replacement", "Leak / Emergency", "Storm Damage / Insurance"]);

// Metro East towns that only exist on the Illinois side. O'Fallon, Columbia and Washington are left out on
// purpose: Missouri has towns with those names, so they count as Illinois only when the state is written.
const ILLINOIS_ONLY_CITIES = new Set([
  "waterloo", "belleville", "fairview heights", "dupo", "cahokia heights", "cahokia", "centreville",
  "edwardsville", "collinsville", "granite city", "alton", "wood river", "east st louis", "millstadt",
  "smithton", "red bud", "swansea", "shiloh", "mascoutah", "freeburg", "glen carbon", "maryville", "troy",
  "godfrey", "highland", "valmeyer", "hecker", "east alton", "bethalto", "pontoon beach", "caseyville",
]);

const normalize = (text: string) => text.toLowerCase().replace(/[.']/g, "").replace(/\s+/g, " ").trim();

export function isRoofingRequest(service: unknown, emergencyTarp: unknown): boolean {
  return emergencyTarp === true || (typeof service === "string" && ROOFING_SERVICES.has(service.trim()));
}

/** True only when the location is clearly in Illinois (a town that exists only there, "IL"/"Illinois", or an IL ZIP). */
export function looksIllinois(input: { city?: unknown; address?: unknown; estLocation?: unknown; page?: unknown }): boolean {
  const text = [input.city, input.address, input.estLocation].filter((value): value is string => typeof value === "string").join(" ");
  if (/\bil\b|\bill\.|illinois/i.test(text)) return true; // "IL", "il", "Ill." or "Illinois" written as the state
  if (/\b6[0-2]\d{3}\b/.test(text)) return true; // Illinois ZIP codes are 600xx-629xx
  if (typeof input.city === "string" && ILLINOIS_ONLY_CITIES.has(normalize(input.city).replace(/,.*$/, ""))) return true;
  if (typeof input.page === "string" && /-il(?:[/?#]|$)/.test(input.page)) return true; // sent from an Illinois page
  return false;
}

/** A roofing request (or an emergency roof tarp) for a home that is clearly in Illinois. */
export function isIllinoisRoofingRequest(input: {
  service?: unknown; emergency?: unknown; city?: unknown; address?: unknown; estLocation?: unknown; page?: unknown;
}): boolean {
  return isRoofingRequest(input.service, input.emergency) && looksIllinois(input);
}
