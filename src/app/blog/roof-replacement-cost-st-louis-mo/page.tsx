import type { Metadata } from "next";
import Link from "next/link";
import ContentShell, { crumbSchema } from "@/components/content-shell";
import RoofEstimator from "@/components/roof-estimator";
import LeadForm from "@/components/lead-form";
import { SITE_URL, businessSchema, faqSchema } from "@/lib/site-pages";
import { PHONES } from "@/lib/business";
import { IL_COMING_SOON, PITCHES, SHINGLES, TABLE_SQUARES, estimate, priceRange, usd, type PitchKey } from "@/lib/pricing";

const path = "/blog/roof-replacement-cost-st-louis-mo";
const arch = SHINGLES.architectural;
const tab = SHINGLES["3tab"];
const [p12, p18, p24] = [12, 18, 24].map((sq) => priceRange(sq, "architectural"));
const title = "2026 Roof Replacement Cost in St. Louis, MO | RoofingnearmeSTL";
const description = `A 30-yr architectural roof in St. Louis costs ${usd(arch.low)}-${usd(arch.high)} per square, ${usd(p12.low)}-${usd(p24.high)} for most homes. Price table by size, pitch & shingle.`;
const crumbs = [{ name: "Blog", href: "/blog" }, { name: "Roof Replacement Cost", href: path }];

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: { title, description, url: path, siteName: "RoofingnearmeSTL", locale: "en_US", type: "article", images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "St. Louis roof replacement cost 2026" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/og-image.jpg"] },
};

const faqs: [string, string][] = [
  ["How much does a new roof cost in St. Louis?", `A 30-year architectural shingle roof costs ${usd(arch.low)}-${usd(arch.high)} per square, or ${usd(p12.low)}-${usd(p24.high)} for most homes with 12-24 squares. 3-tab runs ${usd(tab.low)}-${usd(tab.high)} per square.`],
  ["What is a roofing square?", "One square is 100 square feet of roof surface. A roof with 1,800 sq ft of surface is 18 squares."],
  ["How does roof pitch change the price?", "Low pitch (2/12-4/12) is priced at the low end of the range, medium pitch (5/12-7/12) in the middle and steep pitch (8/12 and up) at the high end."],
  ["Is 3-tab or architectural shingle better value?", `3-tab costs less (${usd(tab.low)}-${usd(tab.high)} per square, 25-year). Architectural shingles (${usd(arch.low)}-${usd(arch.high)} per square, 30-year) are thicker, last longer and are what most St. Louis homeowners choose.`],
  ["Do you price clay, metal or slate online?", "No. Clay, metal and slate need an in-person look, so they're a custom quote. Call Mike to lock your price."],
  ["Do you offer financing?", "Yes. Financing is available for retail roof, siding and gutter projects. Ask during your free evaluation."],
  ["Do these prices apply in Illinois?", `No. These prices are for roofing in the St. Louis area of Missouri. ${IL_COMING_SOON}; in Illinois we offer siding, gutters, soffit and fascia.`],
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    businessSchema,
    {
      "@type": "Article", "@id": `${SITE_URL}${path}#article`, headline: "2026 Roof Replacement Cost in St. Louis, MO", description, url: `${SITE_URL}${path}`,
      datePublished: "2026-10-20", dateModified: "2026-10-20", inLanguage: "en-US",
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
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand">Cost guide · Updated October 2026</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-black sm:text-5xl">2026 Roof Replacement Cost in St. Louis, MO</h1>
        <p className="mt-5 text-lg leading-relaxed text-zinc-700">
          <b>A new 30-year architectural shingle roof in St. Louis, MO costs {usd(arch.low)}-{usd(arch.high)} per square (100 sq ft), or {usd(p12.low)}-{usd(p24.high)} for most homes with 12-24 squares.</b> 3-tab shingles run {usd(tab.low)}-{usd(tab.high)} per square. Low-pitch roofs land at the low end and steep roofs at the high end. Clay, metal and slate are custom quotes.
        </p>
        <ul className="mt-5 grid gap-2 sm:grid-cols-3 text-center">
          {[[12, p12], [18, p18], [24, p24]].map(([sq, range]) => (
            <li key={String(sq)} className="rounded-xl border border-brand/20 bg-brand-light p-4"><div className="text-sm font-bold">{String(sq)} SQ · {(Number(sq) * 100).toLocaleString("en-US")} sq ft</div><div className="text-xl font-black text-brand">{usd((range as { low: number }).low)}-{usd((range as { high: number }).high)}</div></li>
          ))}
        </ul>

        <h2 className="mt-10 text-2xl font-extrabold text-black">Price by roof size, shingle and pitch</h2>
        <p className="mt-2 text-zinc-700">Every row uses our 2026 Missouri pricing: 30-year architectural {usd(arch.low)}-{usd(arch.high)}/SQ and 3-tab 25-year {usd(tab.low)}-{usd(tab.high)}/SQ. The pitch columns show the architectural estimate for each pitch.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <caption className="sr-only">Roof replacement cost in St. Louis, MO by roof size</caption>
            <thead>
              <tr className="bg-zinc-100 text-left">
                <th className="border border-zinc-200 p-2">Roof size</th>
                <th className="border border-zinc-200 p-2">3-Tab 25-yr</th>
                <th className="border border-zinc-200 p-2">30-yr Architectural</th>
                {pitches.map((key) => <th key={key} className="border border-zinc-200 p-2">Arch. {PITCHES[key].label.split(" (")[0]}</th>)}
              </tr>
            </thead>
            <tbody>
              {TABLE_SQUARES.map((sq) => {
                const t = priceRange(sq, "3tab"), a = priceRange(sq, "architectural");
                return (
                  <tr key={sq}>
                    <th scope="row" className="border border-zinc-200 p-2 text-left">{sq} SQ ({(sq * 100).toLocaleString("en-US")} sq ft)</th>
                    <td className="border border-zinc-200 p-2">{usd(t.low)}-{usd(t.high)}</td>
                    <td className="border border-zinc-200 p-2 font-bold">{usd(a.low)}-{usd(a.high)}</td>
                    {pitches.map((key) => <td key={key} className="border border-zinc-200 p-2">{usd(estimate(sq, "architectural", key)!.price)}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h2 className="mt-10 text-2xl font-extrabold text-black">Try the estimator</h2>
        <div className="mt-4"><RoofEstimator headingLevel="h3" /></div>

        <h2 className="mt-10 text-2xl font-extrabold text-black">How pitch changes the price</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-zinc-700">
          {pitches.map((key) => <li key={key}><b>{PITCHES[key].label}:</b> {PITCHES[key].rule}. Example, 18 SQ architectural: {usd(estimate(18, "architectural", key)!.price)}.</li>)}
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
        <p className="mt-2 text-zinc-700">These need an in-person look, so they&apos;re a custom quote, not an online price. <a href={PHONES.MO.href} className="font-bold text-brand underline">Call Mike to lock your price: {PHONES.MO.display}</a>.</p>

        <h2 className="mt-10 text-2xl font-extrabold text-black">Where these prices apply</h2>
        <p className="mt-2 text-zinc-700">These are our 2026 prices for roofing in the St. Louis area of Missouri. {IL_COMING_SOON}. In Illinois we offer <Link href="/siding" className="underline">siding</Link>, <Link href="/gutters-downspouts" className="underline">gutters</Link>, and <Link href="/soffit-fascia" className="underline">soffit &amp; fascia</Link>.</p>

        <h2 className="mt-10 text-2xl font-extrabold text-black">Roof cost FAQ</h2>
        <div className="mt-4 space-y-3">
          {faqs.map(([q, a]) => (
            <details key={q} className="rounded-xl border border-zinc-200 bg-white p-5"><summary className="cursor-pointer font-bold text-black">{q}</summary><p className="mt-3 text-sm leading-relaxed text-zinc-600">{a}</p></details>
          ))}
        </div>

        <div id="estimate" className="mt-12 scroll-mt-40 rounded-2xl border-2 border-brand/30 bg-brand-light p-7">
          <h2 className="text-2xl font-bold text-black">Lock your price: free photo-documented inspection</h2>
          <p className="mt-2 mb-6 text-sm text-zinc-600">Missouri roofing. During business hours, we call as soon as your request comes in.</p>
          <LeadForm defaultService="Roof Replacement" footer={<p className="text-xs text-zinc-500 text-center">No spam. ★★★★★ 5.0 Google Rated</p>} />
        </div>

        <p className="mt-8 text-sm text-zinc-600">More answers: <Link href="/questions/how-much-does-a-new-roof-cost-in-missouri" className="underline">How much does a new roof cost in Missouri?</Link> · <Link href="/questions/will-insurance-pay-for-a-new-roof-in-missouri" className="underline">Will insurance pay for a new roof?</Link> · <Link href="/roof-replacement" className="underline">Roof replacement</Link></p>
      </article>
    </ContentShell>
  );
}
