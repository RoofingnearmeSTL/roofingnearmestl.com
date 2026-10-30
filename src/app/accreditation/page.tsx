import type { Metadata } from "next";
import Link from "next/link";
import ContentShell, { crumbSchema } from "@/components/content-shell";
import { GOOGLE_BUSINESS_URL, SITE_URL, businessSchema, certifications } from "@/lib/site-pages";
import { INSURANCE, LEGAL_NAME, PHONES } from "@/lib/business";
import { IL_COMING_SOON, usd } from "@/lib/pricing";

const title = "Insurance, Certifications & Licensing | RoofingnearmeSTL";
const description = "RoofingnearmeSTL: $1M/$2M general liability insurance, BEI-certified inspector, 10-yr workmanship warranty. Roofing in MO; siding & gutters in MO and IL.";
const path = "/accreditation";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: { title, description, url: path, siteName: "RoofingnearmeSTL", locale: "en_US", type: "website", images: [{ url: "/og-image.jpg", width: 1200, height: 630 }] },
};

const crumbs = [{ name: "Insurance & Certifications", href: path }];
const schema = {
  "@context": "https://schema.org",
  "@graph": [
    businessSchema,
    { "@type": "AboutPage", "@id": `${SITE_URL}${path}`, url: `${SITE_URL}${path}`, name: title, description, about: { "@id": businessSchema["@id"] } },
    crumbSchema(SITE_URL, crumbs),
  ],
};

// Summary of the 03/17/2026 certificate of liability insurance (ACORD 25). The certificate itself is sent on
// request rather than posted, because it carries the policy number and home address.
const coverage: [string, string][] = [
  ["Insured", INSURANCE.insured],
  ["Insurance carrier", INSURANCE.carrier],
  ["Coverage", INSURANCE.type],
  ["Each occurrence", usd(INSURANCE.eachOccurrence)],
  ["General aggregate", usd(INSURANCE.generalAggregate)],
  ["Products / completed operations aggregate", usd(INSURANCE.productsCompletedOps)],
  ["Personal & advertising injury", usd(INSURANCE.personalAdvertisingInjury)],
  ["Damage to rented premises", usd(INSURANCE.damageToRentedPremises)],
  ["Medical expense (any one person)", usd(INSURANCE.medicalExpense)],
  ["Policy period", `${INSURANCE.effective} - ${INSURANCE.expires}`],
];

export default function Accreditation() {
  return (
    <ContentShell breadcrumbs={crumbs} schema={schema}>
      <h1 className="text-4xl font-black tracking-tight text-black">Insurance, Certifications &amp; Licensing</h1>
      <p className="mt-3 text-lg text-zinc-700">{LEGAL_NAME}, doing business as RoofingnearmeSTL, is a local crew based in Waterloo, IL. Here is exactly what protects you when we work on your home.</p>

      <section className="mt-10">
        <h2 className="text-2xl font-extrabold text-black">General liability insurance</h2>
        <p className="mt-2 text-zinc-700">From our current certificate of liability insurance:</p>
        <table className="mt-4 w-full border-collapse text-sm">
          <tbody>
            {coverage.map(([label, value]) => (
              <tr key={label}><th scope="row" className="w-1/2 border border-zinc-200 bg-zinc-50 p-2 text-left">{label}</th><td className="border border-zinc-200 p-2">{value}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-sm text-zinc-600">Need a certificate of insurance for your HOA, lender or records? Ask and we&apos;ll send a current copy: Missouri <a href={PHONES.MO.href} className="font-bold text-brand-ink underline">{PHONES.MO.display}</a> · Illinois <a href={PHONES.IL.href} className="font-bold text-brand-ink underline">{PHONES.IL.display}</a>.</p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-extrabold text-black">Building Experts Institute certifications</h2>
        <p className="mt-2 text-zinc-700">Mike Williamson completed Building Experts Institute (BEI) certification for asphalt shingle roofs:</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {certifications.map((cert) => (
            <li key={cert.number} className="rounded-xl border border-zinc-200 p-4">
              <p className="font-bold text-black">{cert.title}</p>
              <p className="text-sm text-zinc-600">{cert.subject} · Certificate #{cert.number}</p>
              <p className="text-xs text-zinc-500">Issued {cert.issued} · Valid through {cert.expires}</p>
              <a href={cert.file} target="_blank" rel="noopener" className="mt-2 inline-block text-sm font-bold text-brand-ink underline">View certificate (PDF)</a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-extrabold text-black">Where we work</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-zinc-700">
          <li><b>Missouri:</b> roofing (repair, replacement, storm damage, 24/7 emergency tarping), siding, gutters and downspouts, soffit and fascia.</li>
          <li><b>Illinois:</b> siding, gutters and downspouts, soffit and fascia. {IL_COMING_SOON}.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-extrabold text-black">Warranty &amp; materials</h2>
        <p className="mt-2 text-zinc-700">Our work is backed by a 10-Year Workmanship Warranty, and the manufacturer warranty applies to the materials we install. We install shingles from Owens Corning, CertainTeed, TAMKO and IKO.</p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-extrabold text-black">Reviews</h2>
        <p className="mt-2 text-zinc-700">Rated 5.0★ on Google. <a href={GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-ink underline">Read our reviews</a> or <Link href="/review" className="font-bold text-brand-ink underline">leave one</Link>.</p>
      </section>
    </ContentShell>
  );
}
