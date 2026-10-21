// Owner-confirmed business facts used across the site. No imports, so any file can use it.
//
// BUSINESS RULES (do not break):
// - Missouri: roofing + siding + gutters + soffit/fascia.
// - Illinois: siding + gutters + soffit/fascia ONLY. No roofing services, prices, inspections or tarping
//   are offered or advertised for Illinois until the Illinois roofing license ("Roofing coming soon after IL license").

export type State = "IL" | "MO";

export const LEGAL_NAME = "Roofing Near Me STL LLC";

export const PHONES: Record<State, { display: string; href: string; e164: string; label: string }> = {
  IL: { display: "618-612-5192", href: "tel:+16186125192", e164: "+1-618-612-5192", label: "Illinois: 618-612-5192" },
  MO: { display: "314-202-7663", href: "tel:+13142027663", e164: "+1-314-202-7663", label: "Missouri: 314-202-7663" },
};

/** States where roofing is offered. */
export const ROOFING_STATES: readonly State[] = ["MO"];
export const offersRoofing = (state: State) => ROOFING_STATES.includes(state);

/** Lead form choices offered in Illinois (exterior only). */
export const IL_LEAD_SERVICES = ["Siding", "Gutters / Downspouts", "Soffit & Fascia"];

// Certificate of liability insurance (ACORD 25) dated 03/17/2026. Workers' compensation is NOT listed on it,
// so the site does not claim workers' comp until a certificate for it is provided.
export const INSURANCE = {
  insured: LEGAL_NAME,
  carrier: "Sutton Specialty Insurance Company",
  type: "Commercial general liability (occurrence)",
  eachOccurrence: 1_000_000,
  generalAggregate: 2_000_000,
  productsCompletedOps: 1_000_000,
  personalAdvertisingInjury: 1_000_000,
  damageToRentedPremises: 50_000,
  medicalExpense: 5_000,
  effective: "March 17, 2026",
  expires: "March 17, 2027",
};
export const INSURANCE_SHORT = "Fully Insured: $1M/$2M General Liability";
export const INSURANCE_SENTENCE = "Fully insured with general liability coverage of $1,000,000 per occurrence and $2,000,000 aggregate";
