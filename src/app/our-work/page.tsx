// Our Work: real before & after projects (Mike, Nov 15 2026). Until the first real project is added, the live site
// has no such page (404, no menu link, not in the sitemap); sample layouts show only on this PC and preview links.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ContentShell, { crumbSchema } from "@/components/content-shell";
import ProjectCard from "@/components/project-card";
import ProjectShowcase from "@/components/project-showcase";
import EstimateLink from "@/components/estimate-link";
import { SERVICE_FILTERS, serviceFilters, visibleProjects } from "@/lib/projects";
import { BRAND_PROMISE } from "@/lib/business";
import { GOOGLE_BUSINESS_URL, SITE_URL, businessSchema } from "@/lib/site-pages";
import { IL_COMING_SOON } from "@/lib/pricing";
import ProjectGallery from "./project-gallery";

const title = "Our Work: Before & After Projects | RoofingnearmeSTL";
const description = "Real before & after photos of our roofing (Missouri) and siding, gutter, soffit and fascia projects (MO and IL) around St. Louis.";
const path = "/our-work";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: { title, description, url: path, siteName: "RoofingnearmeSTL", locale: "en_US", type: "website", images: [{ url: "/og-image.jpg", width: 1200, height: 630 }] },
};

const crumbs = [{ name: "Our Work", href: path }];
const schema = {
  "@context": "https://schema.org",
  "@graph": [
    businessSchema,
    { "@type": "CollectionPage", "@id": `${SITE_URL}${path}`, url: `${SITE_URL}${path}`, name: title, description, about: { "@id": businessSchema["@id"] } },
    crumbSchema(SITE_URL, crumbs),
  ],
};

export default function OurWork() {
  const list = visibleProjects();
  if (list.length === 0) notFound();
  const filters = SERVICE_FILTERS.filter((f) => list.some((p) => serviceFilters(p).includes(f)));
  return (
    <ContentShell breadcrumbs={crumbs} schema={schema}>
      <h1 className="text-4xl font-black tracking-tight text-black">Our Work: Before &amp; After</h1>
      <p className="mt-3 text-lg text-zinc-700">{BRAND_PROMISE}</p>
      <p className="mt-2 text-zinc-600">Every photo here is from our own jobs, shared with the homeowner&apos;s OK. Roofing projects are in Missouri; siding, gutters, soffit and fascia in Missouri and Illinois (Illinois roofing: {IL_COMING_SOON}).</p>
      <div className="mt-8">
        <ProjectGallery filters={[...filters]} cards={list.map((p) => ({ filters: serviceFilters(p), node: p.placeholder ? <ProjectCard project={p} /> : <ProjectShowcase project={p} /> }))} />
      </div>
      <div className="mt-10 rounded-2xl border border-brand/30 bg-brand-light p-6 text-center">
        <p className="text-xl font-extrabold text-black">Want results like these on your home?</p>
        <p className="mt-1 text-zinc-700">One short form, then a real person gets back to you. <Link href={GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer" className="underline">See our reviews on Google</Link>.</p>
        <EstimateLink className="mt-4 inline-block rounded-xl bg-brand px-6 py-3 font-bold text-white">Start My Free Inspection Request</EstimateLink>
      </div>
    </ContentShell>
  );
}
