"use client";
import EstimateLink from "@/components/estimate-link";
import BrandHeader from "@/components/brand-header";
import BrandFooter from "@/components/brand-footer";
import EmergencyBar from "@/components/emergency-bar";
import LeadForm, { useLandingUtm } from "@/components/lead-form";
import HeroBackground from "@/components/hero-background";
import ProcessSteps from "@/components/process-steps";
import Certifications from "@/components/certifications";
import Link from "next/link";
import { GOOGLE_REVIEWS_URL, businessSchema, faqSchema, homeFaqs, jsonLd, sitePages, websiteSchema } from "@/lib/site-pages";
import { reviewSchema } from "@/lib/reviews";
import ReviewsSection from "@/components/reviews-section";
import ServiceAreaDirectory from "@/components/service-area-directory";
import { useState, useEffect } from "react";

export default function Home() {
  const { landing } = useLandingUtm();
  const [est, setEst] = useState({ size: "1800", pitch: "medium", material: "asphalt", email: "" });
  const [showPrice, setShowPrice] = useState(false);


  useEffect(() => {
    const params = new URLSearchParams(landing ? new URL(landing).search : "");
    const data: Record<string, string> = {
      source: params.get("utm_source") || params.get("source") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
      content: params.get("utm_content") || "",
      term: params.get("utm_term") || "",
      gclid: params.get("gclid") || "",
      fbclid: params.get("fbclid") || "",
      landing,
    };
    Object.entries(data).forEach(([key, value]) => {
      if (value) localStorage.setItem(`utm_${key}`, value);
    });
  }, [landing]);

  const price = (() => {
    let base = 9500;
    if (est.size === "1200") base = 7200;
    if (est.size === "1800") base = 9800;
    if (est.size === "2400") base = 13200;
    if (est.size === "3000") base = 16800;
    if (est.pitch === "steep") base *= 1.25;
    if (est.material === "architectural") base *= 1.15;
    if (est.material === "metal") base *= 2.1;
    return Math.round(base/100)*100;
  })();

  const tile = est.material === "clay" || est.material === "slate";
  const estimateExtras = {
    roof_size: ({ "1200": "~1,200 sqft", "1800": "~1,800 sqft", "2400": "~2,400 sqft", "3000": "~3,000+ sqft" } as Record<string, string>)[est.size],
    roof_pitch: ({ low: "Low Pitch", medium: "Medium Pitch", steep: "Steep Pitch" } as Record<string, string>)[est.pitch],
    roof_material: ({ asphalt: "3-Tab Asphalt", architectural: "Architectural Shingle", metal: "Metal Roof", clay: "Clay Tile", slate: "Slate Tile" } as Record<string, string>)[est.material],
    est_size: est.size,
    est_pitch: est.pitch,
    est_material: est.material,
    est_email: est.email,
    est_price_low: tile ? null : Math.round(price*0.9),
    est_price_high: tile ? null : Math.round(price*1.15),
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd({ "@context": "https://schema.org", "@graph": [websiteSchema, { ...businessSchema, ...reviewSchema() }, faqSchema(homeFaqs)] })} />
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
          <div className="inline-flex bg-brand-light text-black border border-brand/20 px-4 py-1.5 rounded-full text-sm font-bold mb-4">✓ RoofingnearmeSTL - Local Roofer in Waterloo, IL</div>
          <h1 className="text-white tracking-tight leading-[1.1]">
            <span className="font-extrabold text-4xl sm:text-5xl">Don&apos;t Replace Yet!</span><br/>
            <span className="font-bold text-2xl sm:text-3xl">Get a Free Photo-Documented</span><br/>
            <span className="font-bold text-2xl sm:text-3xl">Roof Report. We Answer in </span><span className="text-brand font-extrabold text-2xl sm:text-3xl">5 Minutes.</span>
          </h1>
          <p className="text-zinc-200 text-lg leading-relaxed mt-5">{"RoofingnearmeSTL is a local roofing company based in Waterloo, IL, serving the Metro East and St. Louis. During business hours, we call as soon as we receive your request — with the right information to help you take the next step. Fill out what's needed below and we look forward to talking soon and sharing your free photo-documented options. That's why neighbors find us when searching 'quick response roofer near me' or 'roofing companies that respond fast' in Waterloo, Columbia, Belleville & STL."}</p>
        </div>

        <div id="estimate" className="lg:col-start-2 lg:row-start-1 lg:row-span-2 bg-brand-light border-2 border-brand/30 rounded-2xl p-7 shadow-xl scroll-mt-40">
          <h2 className="text-black font-bold text-2xl leading-tight">Get Your Free Honest Evaluation in 30 Seconds</h2>
          <p className="text-zinc-600 text-sm mt-2">{"During business hours, we call as soon as we receive your request — with the right information to help you take the next step. Fill out what's needed below and we look forward to talking soon and sharing your free photo-documented options."}</p>
          <p className="text-zinc-600 text-sm mt-2 mb-6"><span className="text-[#28AADC] font-bold">★★★★★ 5.0 Google Reviews</span> - Why Your Neighbors Chose Us</p>
          
          <LeadForm extras={estimateExtras} footer={<p className="text-xs text-zinc-500 text-center">No spam. ★★★★★ 5.0 Google Rated</p>} />
        </div>

        <div className="lg:col-start-1 lg:row-start-2">

          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div className="bg-brand border border-brand rounded-xl px-2 sm:px-5 py-4 text-center shadow-sm"><div className="text-white font-extrabold text-xl sm:text-2xl">5.0★</div><div className="text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wide"><a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer" className="underline">Google Rating</a></div></div>
            <div className="bg-brand border border-brand rounded-xl px-2 sm:px-5 py-4 text-center shadow-sm"><div className="text-white font-extrabold text-xl sm:text-2xl">10-Yr</div><div className="text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wide">Workmanship Warranty</div></div>
            <div className="bg-brand border border-brand rounded-xl px-2 sm:px-5 py-4 text-center shadow-sm"><div className="text-white font-extrabold text-xl sm:text-2xl">Same Day</div><div className="text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wide">Free Honest Evaluation</div></div>
          </div>

          <div className="mt-10 bg-white border-2 border-brand/25 rounded-2xl p-6 shadow-sm">
            <h3 className="text-black font-bold text-xl">Instant Roof Cost Estimator</h3>
            <p className="text-sm text-zinc-600 mt-1">3 clicks - get a real STL price range. No pushy sales.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <select value={est.size} onChange={e=>setEst({...est,size:e.target.value})} className="bg-white border border-zinc-300 rounded-xl px-3 py-3 text-black font-medium">
                <option value="1200">~1,200 sqft</option>
                <option value="1800">~1,800 sqft (avg)</option>
                <option value="2400">~2,400 sqft</option>
                <option value="3000">~3,000+ sqft</option>
              </select>
              <select value={est.pitch} onChange={e=>setEst({...est,pitch:e.target.value})} className="bg-white border border-zinc-300 rounded-xl px-3 py-3 text-black font-medium">
                <option value="low">Low Pitch</option>
                <option value="medium">Medium Pitch</option>
                <option value="steep">Steep Pitch</option>
              </select>
              <select value={est.material} onChange={e=>setEst({...est,material:e.target.value})} className="bg-white border border-zinc-300 rounded-xl px-3 py-3 text-black font-medium">
                <option value="asphalt">3-Tab Asphalt</option>
                <option value="architectural">Architectural Shingle</option>
                <option value="metal">Metal Roof</option>
                <option value="clay">Clay Tile</option>
                <option value="slate">Slate Tile</option>
              </select>
            </div>
            {!showPrice? (
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <input value={est.email} onChange={e=>setEst({...est,email:e.target.value})} placeholder="Enter email to unlock price" className="min-w-0 flex-1 bg-white p-3 border border-zinc-300 rounded-xl" />
                <button onClick={()=>{ if(est.email.includes("@")) setShowPrice(true)}} className="bg-brand border border-brand hover:bg-brand-dark text-white px-6 py-3 rounded-full font-bold shadow-md shadow-brand/20">See Price →</button>
              </div>
            ) : (
              <div className="mt-4 bg-brand-light border border-brand/20 rounded-xl p-4 text-center">
                <div className="text-sm">Estimated Replacement Range:</div>
                <div className="text-3xl font-black text-brand">{est.material === "clay" || est.material === "slate"
                  ? "Tile pricing requires an evaluation"
                  : `$${(price*0.9).toLocaleString()} - $${(price*1.15).toLocaleString()}`}</div>
                <EstimateLink className="inline-block mt-3 bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded-full font-bold shadow-md shadow-brand/20">Lock This Estimate</EstimateLink>
              </div>
            )}
            <div className="text-zinc-500 mt-2 text-xs"><span className="font-bold text-yellow-500">★★★★★ 5.0</span> Google</div>
          </div>
        </div>
        </div>
      </section>

      <section id="services" className="bg-brand-light/50 py-16 scroll-mt-40">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-black font-extrabold text-3xl text-center">We Document Damage. We Don&apos;t Just Sell Roofs.</h2>
          <p className="text-zinc-600 text-center max-w-3xl mx-auto mt-4 leading-relaxed">Free Photo-Documented: Shingle ID + Damage Evidence + Repair vs Replace Options. That&apos;s Why Your Neighbors Chose Us.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            {[["DON'T REPLACE YET!", "Free Honest Evaluation - Should you repair or replace? We show you the photos."], ["Storm Damage? Aging Roof?", "Free Photo-Documented Report - We photograph what we see. Shingle ID + Damage Photos + Repair vs Replace options you keep. We document damage, we don't just sell roofs."], ["Aging Roof?", "Is it time? We document granular loss, seal strip failure, and remaining life."], ["Roof Repair", "Leak stopped today. No pushy replacement pitch unless photos prove you need it."], ["Retail Upgrades Welcome - F&I Available", "Roof • Siding • Gutters • Soffit & Fascia. One local crew."], ["Why Your Neighbors Chose Us", "Serving Waterloo / Columbia / Belleville / STL. Local. Reliable. Protecting What Matters."]].map(([title, description]) => (
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
              <p className="text-zinc-600 text-sm leading-relaxed mt-3">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <BrandFooter />
    </div>
  );
}
