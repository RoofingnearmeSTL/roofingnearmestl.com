import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ContentShell, { crumbSchema } from "@/components/content-shell";
import EstimateLink from "@/components/estimate-link";
import { SITE_URL, businessSchema, faqSchema } from "@/lib/site-pages";
import { getQuestion, questions } from "@/lib/questions";

export const dynamicParams = false;
export const generateStaticParams = () => questions.map((q) => ({ slug: q.slug }));

export async function generateMetadata({ params }: PageProps<"/questions/[slug]">): Promise<Metadata> {
  const q = getQuestion((await params).slug);
  if (!q) return {};
  const path = `/questions/${q.slug}`;
  return {
    title: q.title,
    description: q.description,
    alternates: { canonical: path },
    openGraph: { title: q.title, description: q.description, url: path, siteName: "RoofingnearmeSTL", locale: "en_US", type: "article", images: [{ url: "/og-image.jpg", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: q.title, description: q.description, images: ["/og-image.jpg"] },
  };
}

export default async function QuestionPage({ params }: PageProps<"/questions/[slug]">) {
  const q = getQuestion((await params).slug);
  if (!q) notFound();
  const path = `/questions/${q.slug}`;
  const crumbs = [{ name: "Questions", href: "/questions" }, { name: q.question, href: path }];
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      businessSchema,
      { "@type": "Article", "@id": `${SITE_URL}${path}#article`, headline: q.question, description: q.description, url: `${SITE_URL}${path}`, datePublished: q.datePublished, dateModified: q.datePublished, inLanguage: "en-US", author: { "@type": "Person", name: "Mike Williamson" }, publisher: { "@id": businessSchema["@id"] } },
      faqSchema([[q.question, q.answer]]),
      crumbSchema(SITE_URL, crumbs),
    ],
  };
  return (
    <ContentShell breadcrumbs={crumbs} schema={schema}>
      <article>
        <h1 className="text-4xl font-black tracking-tight text-black">{q.question}</h1>
        <p className="mt-5 rounded-2xl border-l-4 border-brand bg-brand-light p-5 text-lg leading-relaxed text-black"><b>Short answer:</b> {q.answer}</p>
        {q.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-2xl font-extrabold text-black">{section.heading}</h2>
            <p className="mt-2 leading-relaxed text-zinc-700">{section.body}</p>
            {section.bullets && <ul className="mt-3 list-disc space-y-1 pl-6 text-zinc-700">{section.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
          </section>
        ))}
        <div className="mt-10 rounded-2xl bg-zinc-50 p-5">
          <p className="font-bold text-black">Related</p>
          <ul className="mt-2 flex flex-wrap gap-2">{q.related.map((r) => <li key={r.href}><Link href={r.href} className="inline-block rounded-full border border-brand/20 bg-brand-light px-4 py-2 text-sm font-bold text-black hover:border-brand">{r.label} →</Link></li>)}</ul>
        </div>
        <p className="mt-6"><EstimateLink className="inline-block rounded-full bg-brand px-6 py-3 font-bold text-white hover:bg-brand-dark">Get a free estimate</EstimateLink></p>
        <p className="mt-6 text-xs text-zinc-500">Answered by Mike Williamson, RoofingnearmeSTL. Published {new Date(`${q.datePublished}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</p>
      </article>
    </ContentShell>
  );
}
