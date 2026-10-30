import type { Metadata } from "next";
import Link from "next/link";
import BrandHeader from "@/components/brand-header";
import BrandFooter from "@/components/brand-footer";
import EmergencyBar from "@/components/emergency-bar";
import EstimateLink from "@/components/estimate-link";
import { SITE_URL, businessSchema, jsonLd, servicePages } from "@/lib/site-pages";

const title = "Roofing, Siding & Gutter Services St. Louis | RoofingnearmeSTL";
const description = "Roof repair, roof replacement, storm damage inspections, siding, gutters, downspouts, soffit and fascia in St. Louis & the Metro East. One local crew.";
const image = { url: "/og-image.jpg", width: 1200, height: 630, alt: "RoofingnearmeSTL services" };

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/services" },
  openGraph: { title, description, url: "/services", siteName: "RoofingnearmeSTL", locale: "en_US", type: "website", images: [image] },
  twitter: { card: "summary_large_image", title, description, images: [image] },
};

const url = `${SITE_URL}/services`;
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      ...businessSchema,
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Roofing and exterior services",
        itemListElement: servicePages.map((page) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: page.navLabel, url: `${SITE_URL}/${page.slug}` } })),
      },
    },
    { "@type": "CollectionPage", "@id": url, url, name: title, description, about: { "@id": businessSchema["@id"] } },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Services", item: url },
      ],
    },
  ],
};

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <EmergencyBar />
      <BrandHeader />
      <main className="bg-brand-light/50 px-6 py-14">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-sm font-bold uppercase tracking-[0.14em] text-brand-ink">Services</p>
          <h1 className="mt-2 text-center text-4xl font-black tracking-tight text-black sm:text-5xl">Roofing &amp; Exterior Services</h1>
          <p className="mx-auto mt-4 max-w-3xl text-center leading-relaxed text-zinc-600">One local crew for your roof and everything around it. Every job starts with a Free Photo-Documented Report, so you see the problem before you decide anything.</p>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {servicePages.map((page) => (
              <li key={page.slug}>
                <Link href={`/${page.slug}`} className="flex h-full flex-col rounded-2xl border-2 border-zinc-200 bg-white p-6 shadow-sm transition-colors hover:border-brand/40">
                  <h2 className="text-xl font-bold text-black">{page.navLabel}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">{page.intro}</p>
                  <span className="mt-4 text-sm font-bold text-brand-ink">Learn more →</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="tel:+16186125192" className="rounded-full bg-white px-6 py-3 text-center font-bold text-black shadow-sm hover:bg-zinc-100">Illinois: 618-612-5192</a>
            <a href="tel:+13142027663" className="rounded-full bg-white px-6 py-3 text-center font-bold text-black shadow-sm hover:bg-zinc-100">Missouri: 314-202-7663</a>
            <EstimateLink className="rounded-full bg-brand-ink px-6 py-3 text-center font-bold text-white hover:bg-brand-ink-dark">Free Photo-Documented Report</EstimateLink>
          </div>
          <p className="mt-8 text-center text-sm text-zinc-600">Serving the St. Louis Metro Area: roofing in Missouri, exteriors in Missouri and Illinois. <Link href="/areas-we-serve" className="font-bold text-brand-ink underline">See all areas we serve</Link></p>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
