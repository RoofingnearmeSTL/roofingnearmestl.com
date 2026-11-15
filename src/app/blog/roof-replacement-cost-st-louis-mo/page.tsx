import type { Metadata } from "next";
import Link from "next/link";
import ContentShell, { crumbSchema } from "@/components/content-shell";
import { EstimatePrompt, ProjectRequest } from "@/components/project-request";
import { SITE_URL, businessSchema, faqSchema } from "@/lib/site-pages";
import { PHONES } from "@/lib/business";
import { IL_COMING_SOON, PITCHES, type PitchKey } from "@/lib/pricing";
import { ROOF_PRICE_GET, ROOF_PRICE_HOW } from "@/lib/estimate-offer";

// Since Nov 15 2026 (Mike): no dollar figures on the site. This guide explains what drives the cost; the visitor gets a
// rough whole-roof number only after a saved request (estimator boxes + request form, src/components/project-request.tsx).
const path = "/blog/roof-replacement-cost-st-louis-mo";
const title = "2026 Roof Replacement Cost in St. Louis, MO | RoofingnearmeSTL";
const description = "What a new roof costs in St. Louis depends on roof size, shingle and pitch. Enter yours and get a rough whole-roof estimate after you send a request.";
const crumbs = [{ name: "Blog", href: "/blog" }, { name: "Roof Replacement Cost", href: path }];

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: { title, description, url: path, siteName: "RoofingnearmeSTL", locale: "en_US", type: "article", images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "St. Louis roof replacement cost 2026" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/og-image.jpg"] },
};

const faqs: [string, string][] = [
  ["How much does a new roof cost in St. Louis?", `${ROOF_PRICE_HOW} ${ROOF_PRICE_GET}`],
  ["How much does a new roof cost in Missouri?", `It depends on your roof size, shingle and pitch. ${ROOF_PRICE_GET} Rotted decking, extra old layers, flashing and ventilation can change the final number.`],
  ["What is a roofing square?", "One square is 100 square feet of roof surface. A roof with 1,800 sq ft of surface is 18 squares. Roof area is not your home's floor area: slopes and overhangs usually make the roof larger than the floor plan."],
  ["How does roof pitch change the price?", "Low pitch (2/12-4/12) is priced at the low end of our range, medium pitch (5/12-7/12) in the middle and steep pitch (8/12 and up) at the high end."],
  ["Is 3-tab or architectural shingle better value?", "3-tab (25-year) costs less. Architectural shingles (30-year) are thicker, last longer and are what most St. Louis homeowners choose. Pick either in the estimator to compare after you send your request."],
  ["What if I don't know my roof size?", "Check \"I don't know my roof size\" and send your request anyway. We won't guess a number: we measure your roof and quote it properly."],
  ["Do you price clay, metal or slate online?", "No. Clay, metal and slate need an in-person look, so they're a custom quote. Call Mike to lock your price."],
  ["Do you offer financing?", "Yes. Financing is available for retail roof, siding and gutter projects. Ask during your free evaluation."],
  ["Does this apply in Illinois?", `No. Roof replacement estimates are for roofing in the St. Louis area of Missouri. ${IL_COMING_SOON}; in Illinois we offer siding, gutters, soffit and fascia.`],
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    businessSchema,
    {
      "@type": "Article", "@id": `${SITE_URL}${path}#article`, headline: "2026 Roof Replacement Cost in St. Louis, MO", description, url: `${SITE_URL}${path}`,
      datePublished: "2026-10-20", dateModified: "2026-11-15", inLanguage: "en-US",
      author: { "@type": "Person", name: "Mike Williamson" }, publisher: { "@id": businessSchema["@id"] }, image: `${SITE_URL}/og-image.jpg`,
      about: { "@type": "Service", name: "Roof replacement", areaServed: { "@type": "State", name: "Missouri" } },
    },
    faqSchema(faqs),
    crumbSchema(SITE_URL, crumbs),
  ],
};

export default function RoofCostGuide() {
  const pitches = Object.keys(PITCHES) as PitchKey[];
  return (
    <ContentShell breadcrumbs={crumbs} schema={schema}>
      <article>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-ink">Cost guide · Updated November 2026</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-black sm:text-5xl">2026 Roof Replacement Cost in St. Louis, MO</h1>
        <p className="mt-5 text-lg leading-relaxed text-zinc-700">
          <b>What a new roof costs depends on three things: your roof size, the shingle you choose and your roof pitch.</b> {ROOF_PRICE_HOW}
        </p>
        <p className="mt-3 text-zinc-700">{ROOF_PRICE_GET}</p>

        <h2 className="mt-10 text-2xl font-extrabold text-black">Get your own rough estimate</h2>
        <div className="mt-4"><EstimatePrompt headingLevel="h3" /></div>

        <h2 className="mt-10 text-2xl font-extrabold text-black">How pitch changes the price</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-zinc-700">
          {pitches.map((key) => <li key={key}><b>{PITCHES[key].label}:</b> {PITCHES[key].rule}.</li>)}
        </ul>

        <h2 className="mt-10 text-2xl font-extrabold text-black">What can change your final price</h2>
        <p className="mt-2 text-zinc-700">Your free photo-documented inspection sets the final number. The most common reasons it moves within (or past) the range:</p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-zinc-700">
          <li>Roof decking that needs replacing once the old shingles are off</li>
          <li>More than one layer of old shingles to tear off</li>
          <li>Chimneys, skylights and walls that need new flashing</li>
          <li>Ventilation that needs to be added or corrected</li>
        </ul>

        <h2 className="mt-10 text-2xl font-extrabold text-black">Clay, metal and slate</h2>
        <p className="mt-2 text-zinc-700">These need an in-person look, so they&apos;re a custom quote, not an online price. <a href={PHONES.MO.href} className="font-bold text-brand-ink underline">Call Mike to lock your price: {PHONES.MO.display}</a>.</p>

        <h2 className="mt-10 text-2xl font-extrabold text-black">Where these estimates apply</h2>
        <p className="mt-2 text-zinc-700">Roof replacement estimates are for roofing in the St. Louis area of Missouri. {IL_COMING_SOON}. In Illinois we offer <Link href="/siding" className="underline">siding</Link>, <Link href="/gutters-downspouts" className="underline">gutters</Link>, and <Link href="/soffit-fascia" className="underline">soffit &amp; fascia</Link>.</p>

        <h2 className="mt-10 text-2xl font-extrabold text-black">Roof cost FAQ</h2>
        <div className="mt-4 space-y-3">
          {faqs.map(([q, a]) => (
            <details key={q} className="rounded-xl border border-zinc-200 bg-white p-5"><summary className="cursor-pointer font-bold text-black">{q}</summary><p className="mt-3 text-sm leading-relaxed text-zinc-600">{a}</p></details>
          ))}
        </div>

        <div id="estimate" className="mt-12 scroll-mt-40 rounded-2xl border-2 border-brand/30 bg-brand-light p-7">
          <h2 className="text-2xl font-bold text-black">Get your rough estimate: free photo-documented inspection</h2>
          <p className="mt-2 mb-6 text-sm text-zinc-600">Missouri roofing. During business hours, we call as soon as your request comes in.</p>
          <ProjectRequest tone="light" defaultState="MO" defaultService="Roof Replacement" footer={<p className="text-xs text-zinc-500 text-center">No spam. ★★★★★ 5.0 Google Rated</p>} />
        </div>

        <p className="mt-8 text-sm text-zinc-600">More answers: <Link href="/questions/will-insurance-pay-for-a-new-roof-in-missouri" className="underline">Will insurance pay for a new roof?</Link> · <Link href="/roof-replacement" className="underline">Roof replacement</Link></p>
      </article>
    </ContentShell>
  );
}
