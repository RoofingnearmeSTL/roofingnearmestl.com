import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrandHeader from "@/components/brand-header";
import BrandFooter from "@/components/brand-footer";
import EmergencyBar from "@/components/emergency-bar";
import LeadForm from "@/components/lead-form";
import { SITE_URL, getSitePage, sitePages, type SitePage } from "@/lib/site-pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return sitePages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const page = getSitePage((await params).slug);
  if (!page) return {};
  const url = `${SITE_URL}/${page.slug}`;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.description, url, siteName: "Roofing Near Me STL", type: "website" },
  };
}

function structuredData(page: SitePage) {
  const url = `${SITE_URL}/${page.slug}`;
  const business = {
    "@type": "RoofingContractor",
    "@id": `${SITE_URL}/#business`,
    name: "Roofing Near Me STL",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    telephone: ["+1-618-612-5192", "+1-314-202-7663"],
    areaServed: ["Waterloo, IL", "Columbia, IL", "Belleville, IL", "St. Louis, MO"].map((name) => ({ "@type": "City", name })),
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      business,
      page.kind === "service"
        ? { "@type": "Service", "@id": `${url}#service`, name: page.navLabel, serviceType: page.navLabel, url, description: page.description, provider: { "@id": business["@id"] }, areaServed: business.areaServed }
        : { "@type": "WebPage", "@id": url, url, name: page.title, description: page.description, about: { "@id": business["@id"] } },
      {
        "@type": "FAQPage",
        mainEntity: page.faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: page.navLabel, item: url },
        ],
      },
    ],
  };
}

export default async function SitePageView({ params }: PageProps<"/[slug]">) {
  const page = getSitePage((await params).slug);
  if (!page) notFound();
  const related = sitePages.filter((other) => other.slug !== page.slug);

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(page)).replace(/</g, "\\u003c") }} />
      <EmergencyBar />
      <BrandHeader />

      <div className="bg-[#f9fafb] border-b border-zinc-200 py-2">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center lg:justify-between gap-3 text-xs font-bold text-zinc-600">
          <span>✓ Fully Insured - $2M Liability + Workers Comp</span>
          <span>✓ 10-Yr Workmanship Warranty</span>
          <span>✓ 5.0★ Google Reviews</span>
          <span>✓ Local to Waterloo / Columbia / Belleville / STL</span>
        </div>
      </div>

      <section className="relative isolate bg-white">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[url('/logo.png')] bg-no-repeat bg-center bg-contain opacity-[0.06] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16 grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <nav aria-label="Breadcrumb" className="text-sm text-zinc-500 mb-4"><Link href="/" className="hover:text-black underline">Home</Link> / <span className="text-black">{page.navLabel}</span></nav>
            <div className="inline-flex bg-brand-light text-black border border-brand/20 px-4 py-1.5 rounded-full text-sm font-bold mb-4">✓ {page.eyebrow} - Free Photo-Documented Report</div>
            <h1 className="text-black tracking-tight leading-[1.1] font-extrabold text-4xl sm:text-5xl">{page.h1}</h1>
            <p className="text-zinc-600 text-lg leading-relaxed mt-5">{page.intro}</p>

            <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-4 text-center">
              {[["5.0★", "Google Rating"], ["10-Yr", "Workmanship Warranty"], ["Same Day", "Free Honest Evaluation"]].map(([value, label]) => (
                <div key={label} className="bg-brand border border-brand rounded-xl px-2 sm:px-5 py-4 text-center shadow-sm"><div className="text-white font-extrabold text-xl sm:text-2xl">{value}</div><div className="text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wide">{label}</div></div>
              ))}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a href="tel:+16186125192" className="text-center bg-black hover:bg-zinc-800 text-white px-6 py-3 rounded-full font-bold">Illinois: 618-612-5192</a>
              <a href="tel:+13142027663" className="text-center bg-black hover:bg-zinc-800 text-white px-6 py-3 rounded-full font-bold">Missouri: 314-202-7663</a>
            </div>
          </div>

          <div id="estimate" className="bg-brand-light border-2 border-brand/30 rounded-2xl p-7 shadow-xl scroll-mt-40">
            <h2 className="text-black font-bold text-2xl leading-tight">Get Your Free Honest Evaluation in 30 Seconds</h2>
            <p className="text-zinc-600 text-sm mt-2 mb-6">During business hours, we call as soon as we receive your request with your free photo-documented options.</p>
            <LeadForm defaultService={page.defaultService} defaultCity={page.city} footer={<p className="text-xs text-zinc-500 text-center">No spam. ★★★★★ 5.0 Google Rated</p>} />
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

      <section id="faq" className="max-w-4xl mx-auto px-6 py-16 scroll-mt-40">
        <h2 className="text-black font-extrabold text-3xl text-center">{page.navLabel} FAQ</h2>
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
        <nav aria-label="More services and areas" className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-black font-bold text-xl">More Services &amp; Areas We Serve</h2>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {related.map((other) => (
              <li key={other.slug}><Link href={`/${other.slug}`} className="inline-block bg-brand-light border border-brand/20 text-black hover:border-brand rounded-full px-4 py-2 text-sm font-bold">{other.navLabel} →</Link></li>
            ))}
          </ul>
        </nav>
      </section>

      <BrandFooter />
    </div>
  );
}
