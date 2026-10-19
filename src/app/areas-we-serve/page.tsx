import type { Metadata } from "next";
import BrandHeader from "@/components/brand-header";
import BrandFooter from "@/components/brand-footer";
import EmergencyBar from "@/components/emergency-bar";
import EstimateLink from "@/components/estimate-link";
import ServiceAreaDirectory from "@/components/service-area-directory";
import { SITE_URL, areaGroups, businessSchema, cityPages, jsonLd } from "@/lib/site-pages";

const title = "Areas We Serve: St. Louis & Metro East Roofer | RoofingnearmeSTL";
const description = `Roofing, siding and gutters in ${cityPages.length} St. Louis-area communities across Illinois and Missouri. Find your city and get a free photo-documented roof report.`;
const image = { url: "/og-image.jpg", width: 1200, height: 630, alt: "RoofingnearmeSTL service areas" };

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/areas-we-serve" },
  openGraph: { title, description, url: "/areas-we-serve", siteName: "RoofingnearmeSTL", locale: "en_US", type: "website", images: [image] },
  twitter: { card: "summary_large_image", title, description, images: [image] },
};

const url = `${SITE_URL}/areas-we-serve`;
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    businessSchema,
    {
      "@type": "CollectionPage",
      "@id": url,
      url,
      name: title,
      description,
      about: { "@id": businessSchema["@id"] },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: cityPages.map((page, index) => ({ "@type": "ListItem", position: index + 1, name: page.navLabel, url: `${SITE_URL}/${page.slug}` })),
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Areas We Serve", item: url },
      ],
    },
  ],
};

export default function AreasWeServePage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <EmergencyBar />
      <BrandHeader />
      <main className="bg-brand-light/50 px-6 py-14">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-sm font-bold uppercase tracking-[0.14em] text-brand">Areas We Serve</p>
          <h1 className="mt-2 text-center text-4xl font-black tracking-tight text-black sm:text-5xl">Roofing Across St. Louis &amp; the Metro East</h1>
          <p className="mx-auto mt-4 max-w-3xl text-center leading-relaxed text-zinc-600">
            We&apos;re a local crew serving {cityPages.length} communities in {areaGroups.length} areas on both sides of the river: roof repair, roof replacement, storm damage inspections, siding, gutters, soffit and fascia. Find your city below. Don&apos;t see it? Call us. If you&apos;re near St. Louis, there&apos;s a good chance we can help.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="tel:+16186125192" className="rounded-full bg-white px-6 py-3 text-center font-bold text-black shadow-sm hover:bg-zinc-100">Illinois: 618-612-5192</a>
            <a href="tel:+13142027663" className="rounded-full bg-white px-6 py-3 text-center font-bold text-black shadow-sm hover:bg-zinc-100">Missouri: 314-202-7663</a>
            <EstimateLink className="rounded-full bg-brand px-6 py-3 text-center font-bold text-white hover:bg-brand-dark">Free Photo-Documented Report</EstimateLink>
          </div>
          <div className="mt-12"><ServiceAreaDirectory /></div>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
