import type { Metadata } from "next";
import Link from "next/link";
import ContentShell, { crumbSchema } from "@/components/content-shell";
import { SITE_URL, businessSchema, faqSchema } from "@/lib/site-pages";
import { questions } from "@/lib/questions";

const title = "Roofing, Siding & Gutter Questions Answered | RoofingnearmeSTL";
const description = "Short, straight answers about roof costs in Missouri, insurance and hail claims, and when gutters need replacing. From a local St. Louis-area crew.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/questions" },
  openGraph: { title, description, url: "/questions", siteName: "RoofingnearmeSTL", locale: "en_US", type: "website", images: [{ url: "/og-image.jpg", width: 1200, height: 630 }] },
};

const crumbs = [{ name: "Questions", href: "/questions" }];
const schema = { "@context": "https://schema.org", "@graph": [businessSchema, faqSchema(questions.map((q) => [q.question, q.answer])), crumbSchema(SITE_URL, crumbs)] };

export default function QuestionsIndex() {
  return (
    <ContentShell breadcrumbs={crumbs} schema={schema}>
      <h1 className="text-4xl font-black tracking-tight text-black">Questions, Answered</h1>
      <p className="mt-3 text-zinc-600">Each answer starts with the short version. Roofing answers apply to Missouri; siding and gutter answers to Missouri and Illinois.</p>
      <ul className="mt-8 space-y-4">
        {questions.map((q) => (
          <li key={q.slug} className="rounded-2xl border border-zinc-200 p-5">
            <Link href={`/questions/${q.slug}`} className="text-xl font-bold text-black hover:text-brand">{q.question}</Link>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{q.answer}</p>
          </li>
        ))}
      </ul>
    </ContentShell>
  );
}
