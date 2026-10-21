// Shared layout for service, city and city + service pages. The page's scope decides phones,
// process copy, certifications and lead-form choices, so Illinois pages never offer roofing.
import Link from "next/link";
import BrandHeader from "@/components/brand-header";
import BrandFooter from "@/components/brand-footer";
import EmergencyBar from "@/components/emergency-bar";
import LeadForm from "@/components/lead-form";
import HeroBackground from "@/components/hero-background";
import ProcessSteps from "@/components/process-steps";
import Certifications from "@/components/certifications";
import RoofEstimator from "@/components/roof-estimator";
import CostFallback from "@/components/cost-fallback";
import { IL_LEAD_SERVICES, INSURANCE_SHORT, PHONES } from "@/lib/business";
import { jsonLd, type Scope, type SitePage } from "@/lib/site-pages";

export type LandingModel = {
  scope: Scope;
  city?: string;
  navLabel: string;
  eyebrow: string;
  h1: string;
  intro: string;
  defaultService: string;
  sections: SitePage["sections"];
  faqs: SitePage["faqs"];
  faqHeading: string;
  /** Breadcrumb trail after "Home"; the last item is the current page. */
  breadcrumbs: { name: string; href: string }[];
  linkGroups: { heading: string; links: { href: string; label: string }[] }[];
  /** Show the roof cost estimator (Missouri roofing pages only). */
  estimatorPlace?: string;
  schema: object;
};

const roofingScopes: Scope[] = ["roofing", "mo-all"];

function heroCall(scope: Scope) {
  if (scope === "il-exterior") return { prompt: "Questions about siding, gutters, soffit or fascia? Call our Illinois line:", phones: [PHONES.IL] };
  if (scope === "exterior") return { prompt: "Call for a free siding, gutter or soffit estimate:", phones: [PHONES.MO, PHONES.IL] };
  return { prompt: "Active leak or storm damage? Call for 24/7 emergency tarping (Missouri):", phones: [PHONES.MO] };
}

export default function LandingPage({ model }: { model: LandingModel }) {
  const roofing = roofingScopes.includes(model.scope);
  const call = heroCall(model.scope);
  const crumbs = model.breadcrumbs;
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(model.schema)} />
      <EmergencyBar />
      <BrandHeader />

      <div className="bg-[#f9fafb] border-b border-zinc-200 py-2">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center lg:justify-between gap-3 text-xs font-bold text-zinc-600">
          <Link href="/accreditation" className="hover:text-black">✓ {INSURANCE_SHORT}</Link>
          <span>✓ 10-Yr Workmanship Warranty</span>
          <span>✓ 5.0★ Google Reviews</span>
          {roofing ? <span>✓ BEI Certified: Hail &amp; Wind Damage</span> : <span>✓ Siding, Gutters, Soffit &amp; Fascia: MO + IL</span>}
          <span>✓ {roofing ? "Roofing in Missouri" : "Local crew based in Waterloo, IL"}</span>
        </div>
      </div>

      <section className="relative isolate bg-black">
        <HeroBackground />
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16 grid lg:grid-cols-2 gap-10 items-start">
          <div className="lg:col-start-1 lg:row-start-1">
            <nav aria-label="Breadcrumb" className="text-sm text-zinc-300 mb-4">
              <Link href="/" className="hover:text-white underline">Home</Link>
              {crumbs.map((crumb, index) => (
                <span key={crumb.href}> / {index === crumbs.length - 1 ? <span className="text-white">{crumb.name}</span> : <Link href={crumb.href} className="hover:text-white underline">{crumb.name}</Link>}</span>
              ))}
            </nav>
            <div className="inline-flex bg-brand-light text-black border border-brand/20 px-4 py-1.5 rounded-full text-sm font-bold mb-4">✓ {model.eyebrow} - {roofing ? "Free Photo-Documented Report" : "Free Estimate"}</div>
            <h1 className="text-white tracking-tight leading-[1.1] font-extrabold text-4xl sm:text-5xl">{model.h1}</h1>
            <p className="text-zinc-200 text-lg leading-relaxed mt-5">{model.intro}</p>
            <p className="mt-6 text-sm font-bold text-white">{call.prompt}</p>
            <div className="mt-2 flex flex-col sm:flex-row gap-3">
              {call.phones.map((phone) => <a key={phone.href} href={phone.href} className="text-center bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-full font-bold">{phone.label}</a>)}
            </div>
          </div>

          <div id="estimate" className="lg:col-start-2 lg:row-start-1 lg:row-span-2 bg-brand-light border-2 border-brand/30 rounded-2xl p-7 shadow-xl scroll-mt-40">
            <h2 className="text-black font-bold text-2xl leading-tight">Get Your Free Honest {roofing ? "Evaluation" : "Estimate"} in 30 Seconds</h2>
            <p className="text-zinc-600 text-sm mt-2 mb-6">During business hours, we call as soon as we receive your request{roofing ? " with your free photo-documented options" : ""}.</p>
            <LeadForm defaultService={model.defaultService} defaultCity={model.city} services={model.scope === "il-exterior" ? IL_LEAD_SERVICES : undefined} exteriorOnly={model.scope === "il-exterior"} footer={<p className="text-xs text-zinc-500 text-center">No spam. ★★★★★ 5.0 Google Rated</p>} />
          </div>

          <div className="lg:col-start-1 lg:row-start-2">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              {[["5.0★", "Google Rating"], ["10-Yr", "Workmanship Warranty"], ["Same Day", roofing ? "Free Honest Evaluation" : "Free Estimates"]].map(([value, label]) => (
                <div key={label} className="bg-brand border border-brand rounded-xl px-2 sm:px-5 py-4 text-center shadow-sm"><div className="text-white font-extrabold text-xl sm:text-2xl">{value}</div><div className="text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wide">{label}</div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-brand-light/50 py-16">
        <div className="max-w-4xl mx-auto px-6 space-y-10">
          {model.sections.map((section) => (
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
          {model.estimatorPlace && (
            <div>
              <RoofEstimator defaultPlace={model.estimatorPlace} headingLevel="h2" />
              <CostFallback headingLevel="h3" />
              <p className="mt-3 text-sm"><Link href="/blog/roof-replacement-cost-st-louis-mo" className="font-bold text-brand underline">Full 2026 St. Louis roof cost guide →</Link></p>
            </div>
          )}
        </div>
      </section>

      <ProcessSteps variant={roofing ? "roofing" : "exterior"} />
      {roofing && <Certifications />}

      <section id="faq" className="max-w-4xl mx-auto px-6 py-16 scroll-mt-40">
        <h2 className="text-black font-extrabold text-3xl text-center">{model.faqHeading}</h2>
        <div className="mt-8 space-y-4">
          {model.faqs.map(([question, answer]) => (
            <details key={question} className="bg-white border border-zinc-200 rounded-xl p-5">
              <summary className="text-black font-bold cursor-pointer focus-visible:outline-brand">{question}</summary>
              <p className="text-zinc-600 text-sm leading-relaxed mt-3">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-200 py-12">
        <nav aria-label="More services and areas" className="max-w-4xl mx-auto px-6 text-center space-y-8">
          {model.linkGroups.filter((group) => group.links.length > 0).map((group) => (
            <div key={group.heading}>
              <h2 className="text-black font-bold text-xl">{group.heading}</h2>
              <ul className="mt-4 flex flex-wrap justify-center gap-2">
                {group.links.map((link) => (
                  <li key={link.href}><Link href={link.href} className="inline-block bg-brand-light border border-brand/20 text-black hover:border-brand rounded-full px-4 py-2 text-sm font-bold">{link.label} →</Link></li>
                ))}
              </ul>
            </div>
          ))}
          <p className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-bold"><Link href="/services" className="text-brand underline">All services</Link><Link href="/areas-we-serve" className="text-brand underline">All areas we serve</Link><Link href="/accreditation" className="text-brand underline">Insurance &amp; certifications</Link></p>
        </nav>
      </section>

      <BrandFooter />
    </div>
  );
}
