"use client";
import Script from "next/script";
import { ELFSIGHT_REVIEWS_WIDGET_ID } from "@/lib/site-pages";

// Live Google reviews from the Elfsight "Google Reviews" widget (managed at dash.elfsight.com).
// Renders nothing until a widget ID is set, so the page never shows an empty box.
export default function ElfsightReviews({ className }: { className?: string }) {
  if (!ELFSIGHT_REVIEWS_WIDGET_ID) return null;
  return (
    <div className={className}>
      <Script src="https://elfsightcdn.com/platform.js" strategy="lazyOnload" />
      <div className={`elfsight-app-${ELFSIGHT_REVIEWS_WIDGET_ID}`} data-elfsight-app-lazy />
    </div>
  );
}
