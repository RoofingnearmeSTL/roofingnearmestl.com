// Google Ads conversion destinations ("AW-<account>/<label>"), from Google Ads > Goals > Conversions.
// Vercel env vars override the defaults; anything that isn't a well-formed destination is ignored.
const SEND_TO = /^AW-\d+\/[A-Za-z0-9_-]+$/;
const pick = (value: string | undefined, fallback: string) => (value && SEND_TO.test(value) ? value : fallback);

/**
 * "Website estimate form" (Google Ads manual event, "Submit lead forms"): one per saved request, fired by the project
 * request form on the same page once the server has saved the lead (src/lib/lead-conversion.ts). No /thank-you page.
 */
export const ADS_LEAD_SEND_TO = pick(process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SEND_TO, "AW-18498850414/07H2CKnl4qMdEO6c-PRE");
// The "Website phone tap" conversion was removed on purpose (Engineering Package 001, Oct 28): a tap is not
// a lead. Real calls should be measured with Google call reporting instead.
/** The Google tag ID both conversions belong to. */
export const ADS_TAG_ID = ADS_LEAD_SEND_TO.split("/")[0];

/** Meta Pixel "RoofingnearmeSTL Website" (Events Manager, ad account 1245694118635705). Public ID; Vercel can override it. */
const META_PIXEL = /^\d{6,20}$/;
export const META_PIXEL_ID = META_PIXEL.test(process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "") ? process.env.NEXT_PUBLIC_META_PIXEL_ID! : "1445098534241466";

/**
 * The Meta Pixel only loads on the live site (roofingnearmestl.com and www). Local runs, the Playwright lead-form tests
 * and Vercel preview links never load it, so their test submits are not counted as real Leads (Nov 23 2026: 320 of 325
 * Leads in one week came from localhost).
 */
export const LIVE_HOST = /(^|\.)roofingnearmestl\.com$/;
