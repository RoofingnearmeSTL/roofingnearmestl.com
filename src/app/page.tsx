import BrandHeader from "@/components/brand-header";
import BrandFooter from "@/components/brand-footer";
import EmergencyBar from "@/components/emergency-bar";
import HeroBackground from "@/components/hero-background";
import ProcessSteps from "@/components/process-steps";
import Certifications from "@/components/certifications";
import Link from "next/link";
import { GOOGLE_REVIEWS_URL, businessSchema, faqSchema, homeFaqs, jsonLd, sitePages, websiteSchema } from "@/lib/site-pages";
import ReviewsSection from "@/components/reviews-section";
import ServiceAreaDirectory from "@/components/service-area-directory";
import CostFallback from "@/components/cost-fallback";
import { HomeEstimateProvider, HomeEstimator, HomeLeadForm } from "@/components/home-estimate";
import { INSURANCE_SHORT } from "@/lib/business";

export default function Home() {
  // Server page: only the estimator and lead form (HomeEstimateProvider) run in the browser.
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd({ "@context": "https://schema.org", "@graph": [websiteSchema, businessSchema, faqSchema(homeFaqs)] })} />
      <EmergencyBar />
      <BrandHeader />

      <div className="bg-[#f9fafb] border-b border-zinc-200 py-2">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center lg:justify-between gap-3 text-xs font-bold text-zinc-600">
          <Link href="/accreditation" className="hover:text-black">✓ {INSURANCE_SHORT}</Link>
          <span>✓ 10-Yr Workmanship Warranty</span>
          <span>✓ 5.0★ Google Reviews</span>
          <span>✓ BEI Certified: Hail &amp; Wind Damage</span>
          <span>✓ Roofing in Missouri · Siding &amp; Gutters in MO + IL</span>
        </div>
      </div>

      <main id="main">
      <HomeEstimateProvider>
      <section className="relative isolate bg-black">
        <HeroBackground />
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16 grid lg:grid-cols-2 gap-10 items-start">
        <div className="lg:col-start-1 lg:row-start-1">
          <div className="inline-flex bg-brand-light text-black border border-brand/20 px-4 py-1.5 rounded-full text-sm font-bold mb-4">✓ RoofingnearmeSTL · St. Louis Metro Area · Roofing in Missouri · Exteriors in MO &amp; IL</div>
          <h1 className="text-white tracking-tight leading-[1.1]">
            <span className="font-extrabold text-4xl sm:text-5xl">Don&apos;t Replace Yet!</span><br/>
            <span className="font-bold text-2xl sm:text-3xl">Get a Free Photo-Documented</span><br/>
            <span className="font-bold text-2xl sm:text-3xl">Roof Report. We Answer in </span><span className="text-brand font-extrabold text-2xl sm:text-3xl">5 Minutes.</span>
          </h1>
          <p className="text-zinc-200 text-lg leading-relaxed mt-5">{"RoofingnearmeSTL is a local crew based in Waterloo, IL: roofing in the St. Louis area of Missouri, and siding, gutters, soffit and fascia on both sides of the river. During business hours, we call as soon as we receive your request — with the right information to help you take the next step. Fill out what's needed below and we look forward to talking soon and sharing your free photo-documented options."}</p>
        </div>

        <div id="estimate" className="lg:col-start-2 lg:row-start-1 lg:row-span-2 bg-brand-light border-2 border-brand/30 rounded-2xl p-7 shadow-xl scroll-mt-40">
          <h2 className="text-black font-bold text-2xl leading-tight">Get Your Free Honest Evaluation in 30 Seconds</h2>
          <p className="text-zinc-600 text-sm mt-2 mb-6"><span className="text-[#28AADC] font-bold">★★★★★ 5.0 Google Reviews</span> - Why Your Neighbors Chose Us</p>
          
          <HomeLeadForm footer={<p className="text-xs text-zinc-500 text-center">No spam. ★★★★★ 5.0 Google Rated</p>} />
        </div>

        <div className="lg:col-start-1 lg:row-start-2">

          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div className="bg-brand border border-brand rounded-xl px-2 sm:px-5 py-4 text-center shadow-sm"><div className="text-white font-extrabold text-xl sm:text-2xl">5.0★</div><div className="text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wide"><a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer" className="underline">Google Rating</a></div></div>
            <div className="bg-brand border border-brand rounded-xl px-2 sm:px-5 py-4 text-center shadow-sm"><div className="text-white font-extrabold text-xl sm:text-2xl">10-Yr</div><div className="text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wide">Workmanship Warranty</div></div>
            <div className="bg-brand border border-brand rounded-xl px-2 sm:px-5 py-4 text-center shadow-sm"><div className="text-white font-extrabold text-xl sm:text-2xl">Same Day</div><div className="text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wide">Free Honest Evaluation</div></div>
          </div>

          <div className="mt-10">
            <HomeEstimator />
          </div>
        </div>
        </div>
      </section>
      </HomeEstimateProvider>

      <section aria-label="Roof replacement cost" className="bg-white px-6 pt-4">
        <div className="max-w-4xl mx-auto">
          <CostFallback />
          <p className="mt-2 text-sm text-center"><Link href="/blog/roof-replacement-cost-st-louis-mo" className="font-bold text-brand underline">Full 2026 St. Louis roof cost guide →</Link></p>
        </div>
      </section>

      <section id="services" className="bg-brand-light/50 py-16 scroll-mt-40">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-black font-extrabold text-3xl text-center">We Document Damage. We Don&apos;t Just Sell Roofs.</h2>
          <p className="text-zinc-600 text-center max-w-3xl mx-auto mt-4 leading-relaxed">Free Photo-Documented: Shingle ID + Damage Evidence + Repair vs Replace Options. That&apos;s Why Your Neighbors Chose Us.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            {[["DON'T REPLACE YET!", "Free Honest Evaluation - Should you repair or replace? We show you the photos."], ["Storm Damage? Aging Roof?", "Free Photo-Documented Report - We photograph what we see. Shingle ID + Damage Photos + Repair vs Replace options you keep. We document damage, we don't just sell roofs."], ["Aging Roof?", "Is it time? We document granular loss, seal strip failure, and remaining life."], ["Roof Repair", "Leak stopped today. No pushy replacement pitch unless photos prove you need it."], ["Retail Upgrades Welcome - F&I Available", "Roof • Siding • Gutters • Soffit & Fascia. One local crew."], ["Why Your Neighbors Chose Us", "Serving the St. Louis Metro Area: roofing in Missouri; siding, gutters, soffit, fascia and more exterior work on both sides of the river. Local. Reliable. Protecting What Matters."]].map(([title, description]) => (
              <article key={title} className="bg-white border-2 border-zinc-200 rounded-2xl p-6 shadow-sm hover:border-brand/40 transition-colors">
                <h3 className="text-black font-bold text-lg">{title}</h3>
                <p className="text-zinc-600 text-sm leading-relaxed mt-2">{description}</p>
              </article>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            <nav aria-label="Roofing Services" className="bg-white border-2 border-zinc-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-black font-bold text-lg"><Link href="/services" className="hover:text-brand">Roofing &amp; Exterior Services</Link></h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {sitePages.filter((page) => page.kind === "service").map((page) => (
                  <li key={page.slug}><Link href={`/${page.slug}`} className="inline-block bg-brand-light border border-brand/20 text-black hover:border-brand rounded-full px-4 py-2 text-sm font-bold">{page.navLabel} →</Link></li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Areas We Serve" className="bg-white border-2 border-zinc-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-black font-bold text-lg"><Link href="/areas-we-serve" className="hover:text-brand">Areas We Serve</Link></h3>
              <ServiceAreaDirectory compact />
              <Link href="/areas-we-serve" className="mt-3 inline-block text-sm font-bold text-brand underline">All service areas →</Link>
            </nav>
          </div>
        </div>
      </section>

      <ReviewsSection />
      <ProcessSteps />
      <Certifications />

      <section id="faq" className="max-w-4xl mx-auto px-6 py-16 scroll-mt-40">
        <h2 className="text-black font-extrabold text-3xl text-center">Free Honest Evaluation: Repair or Replace?</h2>
        <div className="mt-8 space-y-4">
          {homeFaqs.map(([question, answer]) => (
            <details key={question} className="bg-white border border-zinc-200 rounded-xl p-5">
              <summary className="text-black font-bold cursor-pointer focus-visible:outline-brand">{question}</summary>
              <p className="text-zinc-600 text-sm leading-relaxed mt-3 whitespace-pre-line">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      </main>

      <BrandFooter />
    </div>
  );
}
