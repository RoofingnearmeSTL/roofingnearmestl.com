"use client";

import { useEffect } from "react";

type AnalyticsWindow = Window & {
  gtag?: (command: "event", name: string, parameters: Record<string, string>) => void;
};

export default function Conversion() {
  useEffect(() => {
    const destination = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SEND_TO;
    if (!destination || !/^AW-\d+\/.+$/.test(destination)) return;
    const track = () => {
      const pending = sessionStorage.getItem("roofing-lead-conversion");
      const gtag = (window as AnalyticsWindow).gtag;
      if (!pending || !gtag) return;
      try {
        const lead: { id?: unknown } = JSON.parse(pending);
        if (typeof lead.id !== "string") return;
        gtag("event", "conversion", { send_to: destination, transaction_id: lead.id });
        sessionStorage.removeItem("roofing-lead-conversion");
        clearInterval(timer);
      } catch {
        sessionStorage.removeItem("roofing-lead-conversion");
      }
    };
    const timer = setInterval(track, 250);
    track();
    return () => clearInterval(timer);
  }, []);
  return null;
}
