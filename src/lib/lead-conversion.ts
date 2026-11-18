// Browser only. Reports one saved lead to every configured tag (Google Ads, GA4, Meta Pixel). Each tag reports on its
// own, so one blocked tag never stops the others. Used only by the project request form (every page that has the form;
// it stays on the page with "Request received"). The old /thank-you copy was removed (Mike, Nov 18 2026).
import { ADS_LEAD_SEND_TO, META_PIXEL_ID } from "./tracking";

type AnalyticsWindow = Window & {
  gtag?: (command: "event", name: string, parameters: Record<string, string | number>) => void;
  fbq?: (command: "track", name: string, parameters: Record<string, string>, options: { eventID: string }) => void;
};

/**
 * leadId is the transaction id, so Google Ads and Meta drop a repeat of the same lead. A license-pending Illinois
 * roofing request (or a suspected bot) is saved but is not an ad conversion: Ads and Meta are skipped, GA4 still counts it.
 * Returns a stop function for React effects.
 */
export function reportLeadConversion(leadId: string, notAnAdConversion: boolean, contentName = "Roof estimate request"): () => void {
  const pendingTags = new Set([
    "ads",
    !!process.env.NEXT_PUBLIC_GA4_ID && "ga4",
    !!META_PIXEL_ID && "meta",
  ].filter((tag): tag is string => !!tag));
  if (notAnAdConversion) {
    pendingTags.delete("ads");
    pendingTags.delete("meta");
  }
  if (!leadId || pendingTags.size === 0) return () => {};
  let tries = 0;
  const track = () => {
    const w = window as AnalyticsWindow;
    if (w.gtag && pendingTags.delete("ads")) w.gtag("event", "conversion", { send_to: ADS_LEAD_SEND_TO, transaction_id: leadId });
    if (w.gtag && pendingTags.delete("ga4")) w.gtag("event", "generate_lead", { lead_id: leadId, lead_status: notAnAdConversion ? "il_license_pending" : "new" });
    if (w.fbq && pendingTags.delete("meta")) w.fbq("track", "Lead", { content_name: contentName }, { eventID: leadId });
    // Stop when every tag has reported, or after ~10 seconds (for example, an ad blocker).
    if (pendingTags.size === 0 || ++tries > 40) clearInterval(timer);
  };
  const timer = setInterval(track, 250);
  track();
  return () => clearInterval(timer);
}

/**
 * GA4-only engagement event (estimate shown, estimate emailed). Never an ad conversion, never a lead, and it carries no
 * contact details or prices: only the event name and a plain status word.
 */
export function reportEngagement(name: "estimate_view" | "estimate_email", status?: string) {
  try {
    const w = window as AnalyticsWindow;
    if (process.env.NEXT_PUBLIC_GA4_ID && w.gtag) w.gtag("event", name, status ? { status } : {});
  } catch {
    // Analytics must never break the page.
  }
}
