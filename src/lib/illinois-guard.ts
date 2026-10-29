// Illinois rule for the lead form and the lead API (Engineering Package 001, approved 2026-10-28):
// roofing is offered in Missouri only; Illinois = siding, gutters, soffit & fascia until the IL roofing
// license. Plain functions with no imports, so the browser form and the server use the exact same check.

export const ILLINOIS_ROOFING_MESSAGE =
  "Roofing in Illinois is coming soon after our IL license. For an Illinois home we can help with siding, gutters, soffit & fascia: pick one of those above, or call 618-612-5192.";

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

export function illinoisRoofingBlocked(input: {
  service?: unknown; emergency?: unknown; city?: unknown; address?: unknown; estLocation?: unknown; page?: unknown;
}): boolean {
  return isRoofingRequest(input.service, input.emergency) && looksIllinois(input);
}
