"use client";

import { FACEBOOK_REVIEWS_URL, GOOGLE_REVIEWS_URL } from "@/lib/site-pages";

type TrackingWindow = Window & {
  gtag?: (command: "event", name: string, parameters: Record<string, string>) => void;
  fbq?: (command: "trackCustom", name: string, parameters: Record<string, string>) => void;
};

// Records which button and where (homepage, footer, QR card...) so review asks can be measured.
function trackReviewClick(platform: "google" | "facebook", placement: string) {
  const w = window as TrackingWindow;
  const source = new URLSearchParams(window.location.search).get("utm_source") ?? "";
  w.gtag?.("event", "review_click", { platform, placement, source, page_path: window.location.pathname });
  w.fbq?.("trackCustom", "ReviewClick", { platform, placement });
}

const GoogleG = () => (
  <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-16.7z" />
    <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.4-5.8c-2.1 1.4-4.8 2.2-8.4 2.2-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
  </svg>
);

const FacebookF = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0"><path d="M14 8.5V6.6c0-.8.2-1.3 1.4-1.3H17V2.2C16.7 2.1 15.7 2 14.6 2 12.2 2 10.6 3.4 10.6 6.1v2.4H8v3.4h2.6V22H14v-10.1h2.7l.4-3.4H14Z" /></svg>
);

export default function ReviewButtons({ placement, size = "lg", className = "" }: { placement: string; size?: "lg" | "sm"; className?: string }) {
  const pad = size === "lg" ? "px-5 py-3.5 text-base min-h-12" : "px-3 py-2 text-sm min-h-10";
  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackReviewClick("google", placement)}
        className={`inline-flex items-center justify-center gap-2 rounded-full bg-white font-bold text-black shadow-md ring-1 ring-zinc-300 hover:bg-zinc-100 ${pad}`}>
        <GoogleG /> Review us on Google
      </a>
      <a href={FACEBOOK_REVIEWS_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackReviewClick("facebook", placement)}
        className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#1877F2] font-bold text-white shadow-md hover:opacity-90 ${pad}`}>
        <FacebookF /> Recommend us on Facebook
      </a>
    </div>
  );
}
