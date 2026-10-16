import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GoogleAds from "@/components/google-ads";
import MobileCallBar from "@/components/mobile-call-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const shareDescription = "Don't replace yet! Free photo-documented roof report in Waterloo, Columbia, Belleville & St. Louis. Call IL 618-612-5192 or MO 314-202-7663.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.roofingnearmestl.com"),
  title: "Roofing Near Me STL | Free Roofing Estimates",
  description: "Local roofing estimates, repairs and replacement in St. Louis, Illinois and Missouri.",
  // Preview card used when the site is shared on Facebook, Google, texts, etc.
  openGraph: {
    type: "website",
    siteName: "Roofing Near Me STL",
    title: "Roofing Near Me STL | Free Photo-Documented Roof Report",
    description: shareDescription,
    url: "/",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Roofing Near Me STL: Free photo-documented roof report" }],
  },
  twitter: { card: "summary_large_image", images: ["/og-image.jpg"] },
  // Site ownership codes from Google Search Console and Meta Business Suite (set in Vercel).
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION
      ? { "facebook-domain-verification": process.env.NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION }
      : undefined,
  },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon-512.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><GoogleAds />{children}<MobileCallBar /></body>
    </html>
  );
}
