"use client";

import Script from "next/script";

export default function GoogleAds() {
  const destination = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SEND_TO;
  const tagId = destination?.split("/")[0];
  if (!tagId || !/^AW-\d+$/.test(tagId)) return null;

  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${tagId}`} strategy="afterInteractive" />
    <Script id="google-ads-init" strategy="afterInteractive">{`
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
      window.gtag('js', new Date());
      window.gtag('config', ${JSON.stringify(tagId)});
    `}</Script>
  </>;
}
