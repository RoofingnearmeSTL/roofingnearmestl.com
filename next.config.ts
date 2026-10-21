import type { NextConfig } from "next";
import { ilRedirects } from "./src/lib/service-areas";

// Browser security headers for every page. Kept compatible with Google Ads (gtag) scripts.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

// /services/<service> on its own goes to that service's main page.
const serviceHubs: Record<string, string> = {
  "roof-replacement": "/roof-replacement",
  "roof-repair": "/roof-repair",
  "storm-damage": "/storm-damage-insurance",
  siding: "/siding",
  gutters: "/gutters-downspouts",
  "soffit-fascia": "/soffit-fascia",
};

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // Illinois city pages moved from /roofing-<city>-il to exterior-only /siding-gutters-<city>-il
      // (no roofing in Illinois until the IL roofing license). Permanent, so Google moves the history over.
      ...ilRedirects.map(({ from, to }) => ({ source: from, destination: to, permanent: true })),
      ...Object.entries(serviceHubs).map(([key, hub]) => ({ source: `/services/${key}`, destination: hub, permanent: true })),
    ];
  },
};

export default nextConfig;
