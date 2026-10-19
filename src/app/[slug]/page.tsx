import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrandHeader from "@/components/brand-header";
import BrandFooter from "@/components/brand-footer";
import EmergencyBar from "@/components/emergency-bar";
import LeadForm from "@/components/lead-form";
import HeroBackground from "@/components/hero-background";
import ProcessSteps from "@/components/process-steps";
import Certifications from "@/components/certifications";
import { SITE_URL, businessSchema, cityPages, faqSchema, getSitePage, jsonLd, servicePages, sitePages, type SitePage } from "@/lib/site-pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return sitePages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const page = getSitePage((await params).slug);
  if (!page) return {};
  const url = `${SITE_URL}/${page.slug}`;
  const image = { url: "/og-image.jpg", width: 1200, height: 630, alt: `RoofingnearmeSTL: ${page.h1}` };
  // Each page gets its own share card (Facebook, texts, X) instead of the homepage card from the layout.
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.description, url, siteName: "RoofingnearmeSTL", locale: "en_US", type: "website", images: [image] },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [image] },
  };
}

// The listing page each page sits under in the breadcrumb.
const parentOf = (page: SitePage) => (page.kind === "service" ? { name: "Services", href: "/services" } : { name: "Areas We Serve", href: "/areas-we-serve" });

function structuredData(page: SitePage) {
  const url = `${SITE_URL}/${page.slug}`;
  const business = businessSchema;
  const parent = parentOf(page);
  const place = page.kind === "city"
    ? { "@type": "City", name: page.navLabel, containedInPlace: { "@type": "AdministrativeArea", name: `${page.county}, ${page.state === "IL" ? "Illinois" : "Missouri"}` } }
    : null;
  return {
    "@context": "https://schema.org",
    "@graph": [
      business,
      place
        ? { "@type": "Service", "@id": `${url}#service`, name: `Roofing in ${page.navLabel}`, serviceType: "Roofing", url, description: page.description, provider: { "@id": business["@id"] }, areaServed: place }
        : { "@type": "Service", "@id": `${url}#service`, name: page.navLabel, serviceType: page.navLabel, url, description: page.description, provider: { "@id": business["@id"] }, areaServed: business.areaServed },
      { "@type": "WebPage", "@id": url, url, name: page.title, description: page.description, inLanguage: "en-US", about: { "@id": `${url}#service` }, isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "RoofingnearmeSTL", url: SITE_URL } },
      faqSchema(page.faqs),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: parent.name, item: `${SITE_URL}${parent.href}` },
          { "@type": "ListItem", position: 3, name: page.navLabel, item: url },
        ],
      },
    ],
  };
}

const phones = [
  { state: "IL", label: "Illinois: 618-612-5192", href: "tel:+16186125192" },
  { state: "MO", label: "Missouri: 314-202-7663", href: "tel:+13142027663" },
];

// Shown on service pages; city pages link to their own nearby cities instead.
const FEATURED_AREAS = ["roofing-waterloo-il", "roofing-columbia-il", "roofing-belleville-il", "roofing-edwardsville-il", "roofing-st-charles-mo", "roofing-chesterfield-mo", "roofing-kirkwood-mo", "roofing-arnold-mo"];

export default async function SitePageView({ params }: PageProps<"/[slug]">) {
  const page = getSitePage((await params).slug);
  if (!page) notFound();
  const parent = parentOf(page);
  // Missouri pages list the Missouri number first.
  const pagePhones = page.state === "MO" ? [...phones].reverse() : phones;
  const nearby = cityPages.filter((other) => page.nearby?.includes(other.slug));
  const linkGroups: [heading: string, pages: SitePage[]][] = page.kind === "city"
    ? [[`Areas near ${page.city}`, nearby], [`Our services in ${page.city}`, servicePages]]
    : [["More services", servicePages.filter((other) => other.slug !== page.slug)], ["Popular service areas", cityPages.filter((other) => FEATURED_AREAS.includes(other.slug))]];

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData(page))} />
      <EmergencyBar />
      <BrandHeader />

      <div className="bg-[#f9fafb] border-b border-zinc-200 py-2">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center lg:justify-between gap-3 text-xs font-bold text-zinc-600">
          <span>✓ Fully Insured - $2M Liability + Workers Comp</span>
          <span>✓ 10-Yr Workmanship Warranty</span>
          <span>✓ 5.0★ Google Reviews</span>
          <span>✓ BEI Certified: Hail &amp; Wind Damage</span>
          <span>✓ Local to Waterloo / Columbia / Belleville / STL</span>
        </div>
      </div>

      <section className="relative isolate bg-black">
        <HeroBackground />
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16 grid lg:grid-cols-2 gap-10 items-start">
          <div className="lg:col-start-1 lg:row-start-1">
            <nav aria-label="Breadcrumb" className="text-sm text-zinc-300 mb-4"><Link href="/" className="hover:text-white underline">Home</Link> / <Link href={parent.href} className="hover:text-white underline">{parent.name}</Link> / <span className="text-white">{page.navLabel}</span></nav>
            <div className="inline-flex bg-brand-light text-black border border-brand/20 px-4 py-1.5 rounded-full text-sm font-bold mb-4">✓ {page.eyebrow} - Free Photo-Documented Report</div>
            <h1 className="text-white tracking-tight leading-[1.1] font-extrabold text-4xl sm:text-5xl">{page.h1}</h1>
            <p className="text-zinc-200 text-lg leading-relaxed mt-5">{page.intro}</p>
            <p className="mt-6 text-sm font-bold text-white">Active leak or storm damage? Call for 24/7 emergency tarping:</p>
            <div className="mt-2 flex flex-col sm:flex-row gap-3">
              {pagePhones.map((phone) => <a key={phone.state} href={phone.href} className="text-center bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-full font-bold">{phone.label}</a>)}
            </div>
          </div>

          <div id="estimate" className="lg:col-start-2 lg:row-start-1 lg:row-span-2 bg-brand-light border-2 border-brand/30 rounded-2xl p-7 shadow-xl scroll-mt-40">
            <h2 className="text-black font-bold text-2xl leading-tight">Get Your Free Honest Evaluation in 30 Seconds</h2>
            <p className="text-zinc-600 text-sm mt-2 mb-6">During business hours, we call as soon as we receive your request with your free photo-documented options.</p>
            <LeadForm defaultService={page.defaultService} defaultCity={page.city} footer={<p className="text-xs text-zinc-500 text-center">No spam. ★★★★★ 5.0 Google Rated</p>} />
          </div>

          <div className="lg:col-start-1 lg:row-start-2">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              {[["5.0★", "Google Rating"], ["10-Yr", "Workmanship Warranty"], ["Same Day", "Free Honest Evaluation"]].map(([value, label]) => (
                <div key={label} className="bg-brand border border-brand rounded-xl px-2 sm:px-5 py-4 text-center shadow-sm"><div className="text-white font-extrabold text-xl sm:text-2xl">{value}</div><div className="text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wide">{label}</div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-brand-light/50 py-16">
        <div className="max-w-4xl mx-auto px-6 space-y-10">
          {page.sections.map((section) => (
            <article key={section.heading}>
              <h2 className="text-black font-extrabold text-2xl sm:text-3xl">{section.heading}</h2>
              <p className="text-zinc-700 leading-relaxed mt-3">{section.body}</p>
              {section.bullets && (
                <ul className="mt-4 grid sm:grid-cols-2 gap-2">
                  {section.bullets.map((bullet) => <li key={bullet} className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold text-black">✓ {bullet}</li>)}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <ProcessSteps />
      <Certifications />

      <section id="faq" className="max-w-4xl mx-auto px-6 py-16 scroll-mt-40">
        <h2 className="text-black font-extrabold text-3xl text-center">{page.kind === "city" ? `Roofing FAQ: ${page.navLabel}` : `${page.navLabel} FAQ`}</h2>
        <div className="mt-8 space-y-4">
          {page.faqs.map(([question, answer]) => (
            <details key={question} className="bg-white border border-zinc-200 rounded-xl p-5">
              <summary className="text-black font-bold cursor-pointer focus-visible:outline-brand">{question}</summary>
              <p className="text-zinc-600 text-sm leading-relaxed mt-3">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-200 py-12">
        <nav aria-label="More services and areas" className="max-w-4xl mx-auto px-6 text-center space-y-8">
          {linkGroups.map(([heading, pages]) => (
            <div key={heading}>
              <h2 className="text-black font-bold text-xl">{heading}</h2>
              <ul className="mt-4 flex flex-wrap justify-center gap-2">
                {pages.map((other) => (
                  <li key={other.slug}><Link href={`/${other.slug}`} className="inline-block bg-brand-light border border-brand/20 text-black hover:border-brand rounded-full px-4 py-2 text-sm font-bold">{page.kind === "city" && other.kind === "service" ? `${other.navLabel} in ${page.city}` : other.navLabel} →</Link></li>
                ))}
              </ul>
            </div>
          ))}
          <p className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-bold"><Link href="/services" className="text-brand underline">All services</Link><Link href="/areas-we-serve" className="text-brand underline">All areas we serve</Link></p>
        </nav>
      </section>

      <BrandFooter />
    </div>
  );
}
