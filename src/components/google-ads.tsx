"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Marketing tags, each off until its ID is set in Vercel:
// - NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SEND_TO (AW-123/abc): Google Ads
// - NEXT_PUBLIC_GA4_ID (G-XXXXXXX): Google Analytics 4
// - NEXT_PUBLIC_META_PIXEL_ID (digits): Meta (Facebook/Instagram) Pixel
const adsTagId = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SEND_TO?.split("/")[0];
const googleTagIds = [
  adsTagId && /^AW-\d+$/.test(adsTagId) ? adsTagId : "",
  /^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA4_ID ?? "") ? process.env.NEXT_PUBLIC_GA4_ID! : "",
].filter(Boolean);
const metaPixelId = /^\d{6,20}$/.test(process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "") ? process.env.NEXT_PUBLIC_META_PIXEL_ID! : "";

type TrackingWindow = Window & {
  gtag?: (command: "event", name: string, parameters: Record<string, string>) => void;
  fbq?: (command: "track", name: string, parameters?: Record<string, string>) => void;
};

// Reports taps on phone links as "contact" events, since many leads call instead of filling the form.
function useCallTracking() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.('a[href^="tel:"]');
      if (!link) return;
      const phone = link.getAttribute("href")!.slice(4);
      const w = window as TrackingWindow;
      w.gtag?.("event", "click_to_call", { phone_number: phone, page_path: location.pathname });
      w.fbq?.("track", "Contact", { content_name: phone });
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}

// The pixel's first PageView fires on load; report later in-site navigations too.
function useMetaPageViews() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    (window as TrackingWindow).fbq?.("track", "PageView");
  }, [pathname]);
}

export default function GoogleAds() {
  useCallTracking();
  useMetaPageViews();
  return <>
    {googleTagIds.length > 0 && <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${googleTagIds[0]}`} strategy="afterInteractive" />
      <Script id="google-ads-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
        window.gtag('js', new Date());
        ${googleTagIds.map((id) => `window.gtag('config', ${JSON.stringify(id)});`).join("\n        ")}
      `}</Script>
    </>}
    {metaPixelId && <Script id="meta-pixel" strategy="afterInteractive">{`
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', ${JSON.stringify(metaPixelId)});
      fbq('track', 'PageView');
    `}</Script>}
  </>;
}
