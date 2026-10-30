import type { Metadata } from "next";
import Link from "next/link";
import ContentShell, { crumbSchema } from "@/components/content-shell";
import { SITE_URL, businessSchema } from "@/lib/site-pages";
import { questions } from "@/lib/questions";

const title = "Roofing & Exterior Guides | RoofingnearmeSTL Blog";
const description = "St. Louis roof cost guide, insurance answers and siding and gutter tips from a local crew. Straight answers with real numbers.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/blog" },
  openGraph: { title, description, url: "/blog", siteName: "RoofingnearmeSTL", locale: "en_US", type: "website", images: [{ url: "/og-image.jpg", width: 1200, height: 630 }] },
};

const articles = [
  { href: "/blog/roof-replacement-cost-st-louis-mo", title: "2026 Roof Replacement Cost in St. Louis, MO", summary: "Whole-roof prices by roof size and pitch, plus the estimator." },
  ...questions.map((q) => ({ href: `/questions/${q.slug}`, title: q.question, summary: q.answer.split(". ")[0] + "." })),
];

const crumbs = [{ name: "Blog", href: "/blog" }];
const schema = {
  "@context": "https://schema.org",
  "@graph": [
    businessSchema,
    { "@type": "Blog", "@id": `${SITE_URL}/blog`, url: `${SITE_URL}/blog`, name: title, description, publisher: { "@id": businessSchema["@id"] } },
    crumbSchema(SITE_URL, crumbs),
  ],
};

export default function BlogIndex() {
  return (
    <ContentShell breadcrumbs={crumbs} schema={schema}>
      <h1 className="text-4xl font-black tracking-tight text-black">Roofing &amp; Exterior Guides</h1>
      <p className="mt-3 text-zinc-600">Straight answers from a local crew. Roofing is Missouri only; siding, gutters, soffit and fascia in Missouri and Illinois.</p>
      <ul className="mt-8 space-y-4">
        {articles.map((article) => (
          <li key={article.href} className="rounded-2xl border border-zinc-200 p-5 hover:border-brand/40">
            <Link href={article.href} className="text-xl font-bold text-black hover:text-brand-ink">{article.title}</Link>
            <p className="mt-1 text-sm text-zinc-600">{article.summary}</p>
          </li>
        ))}
      </ul>
    </ContentShell>
  );
}
