"use client";

import { useEffect } from "react";

type AnalyticsWindow = Window & {
  gtag?: (command: "event", name: string, parameters: Record<string, string>) => void;
  fbq?: (command: "track", name: string, parameters: Record<string, string>, options: { eventID: string }) => void;
};

// Reports one lead per saved form submission to every configured tag (Google Ads, GA4, Meta Pixel).
// Each tag reports on its own, so one blocked tag never stops the others.
export default function Conversion() {
  useEffect(() => {
    const destination = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SEND_TO;
    const pendingTags = new Set([
      !!destination && /^AW-\d+\/.+$/.test(destination) && "ads",
      !!process.env.NEXT_PUBLIC_GA4_ID && "ga4",
      !!process.env.NEXT_PUBLIC_META_PIXEL_ID && "meta",
    ].filter((tag): tag is string => !!tag));
    let leadId = "";
    try {
      const lead: { id?: unknown } = JSON.parse(sessionStorage.getItem("roofing-lead-conversion") ?? "{}");
      if (typeof lead.id === "string") leadId = lead.id;
    } catch {
      // Unreadable storage means there is nothing to report.
    }
    sessionStorage.removeItem("roofing-lead-conversion");
    if (!leadId || pendingTags.size === 0) return;

    let tries = 0;
    const track = () => {
      const w = window as AnalyticsWindow;
      if (w.gtag && pendingTags.delete("ads")) w.gtag("event", "conversion", { send_to: destination!, transaction_id: leadId });
      if (w.gtag && pendingTags.delete("ga4")) w.gtag("event", "generate_lead", { lead_id: leadId });
      if (w.fbq && pendingTags.delete("meta")) w.fbq("track", "Lead", { content_name: "Roof estimate request" }, { eventID: leadId });
      // Stop when every tag has reported, or after ~10 seconds (for example, an ad blocker).
      if (pendingTags.size === 0 || ++tries > 40) clearInterval(timer);
    };
    const timer = setInterval(track, 250);
    track();
    return () => clearInterval(timer);
  }, []);
  return null;
}
