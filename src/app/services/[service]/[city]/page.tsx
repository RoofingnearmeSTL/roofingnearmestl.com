// City + service pages, e.g. /services/roof-replacement/st-charles-mo or /services/siding/waterloo-il.
// Roofing services exist only for Missouri cities (enforced in src/lib/service-grid.ts).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LandingPage, { type LandingModel } from "@/components/landing-page";
import { SITE_URL, businessSchema, faqSchema } from "@/lib/site-pages";
import { getGridPage, gridPages, gridPagesForCity, sameServiceElsewhere, type GridPage } from "@/lib/service-grid";

export const dynamicParams = false;

export function generateStaticParams() {
  return gridPages.map((page) => {
    const [, , service, city] = page.path.split("/");
    return { service, city };
  });
}

async function load(params: PageProps<"/services/[service]/[city]">["params"]) {
  const { service, city } = await params;
  return getGridPage(service, city);
}

export async function generateMetadata({ params }: PageProps<"/services/[service]/[city]">): Promise<Metadata> {
  const page = await load(params);
  if (!page) return {};
  const url = `${SITE_URL}${page.path}`;
  const image = { url: "/og-image.jpg", width: 1200, height: 630, alt: `RoofingnearmeSTL: ${page.h1}` };
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.description, url, siteName: "RoofingnearmeSTL", locale: "en_US", type: "website", images: [image] },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [image] },
  };
}

function structuredData(page: GridPage) {
  const url = `${SITE_URL}${page.path}`;
  const { city, service } = page;
  const stateName = city.state === "IL" ? "Illinois" : "Missouri";
  return {
    "@context": "https://schema.org",
    "@graph": [
      businessSchema,
      {
        "@type": "Service", "@id": `${url}#service`, name: service.shortTitle(city.place), serviceType: service.label, url, description: page.description,
        provider: { "@id": businessSchema["@id"] },
        areaServed: { "@type": "City", name: city.place, containedInPlace: { "@type": "AdministrativeArea", name: `${city.page.county}, ${stateName}` } },
      },
      { "@type": "WebPage", "@id": url, url, name: page.title, description: page.description, inLanguage: "en-US", about: { "@id": `${url}#service` }, isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "RoofingnearmeSTL", url: SITE_URL } },
      faqSchema(page.faqs),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: service.label, item: `${SITE_URL}${service.hub}` },
          { "@type": "ListItem", position: 3, name: city.place, item: `${SITE_URL}/${city.page.slug}` },
          { "@type": "ListItem", position: 4, name: service.shortTitle(city.place), item: url },
        ],
      },
    ],
  };
}

export default async function GridPageView({ params }: PageProps<"/services/[service]/[city]">) {
  const page = await load(params);
  if (!page) notFound();
  const { city, service } = page;
  const model: LandingModel = {
    scope: page.scope,
    city: city.page.city,
    navLabel: service.shortTitle(city.place),
    eyebrow: `${service.label} · ${city.place}`,
    h1: page.h1,
    intro: page.intro,
    defaultService: service.leadService,
    sections: page.sections,
    faqs: page.faqs,
    faqHeading: `${service.label} FAQ: ${city.place}`,
    breadcrumbs: [{ name: service.label, href: service.hub }, { name: city.place, href: `/${city.page.slug}` }, { name: service.shortTitle(city.place), href: page.path }],
    linkGroups: [
      { heading: `More services in ${city.page.city}`, links: [...gridPagesForCity(city.page.slug).filter((other) => other.path !== page.path).map((other) => ({ href: other.path, label: other.service.shortTitle(city.place) })), { href: `/${city.page.slug}`, label: `All services in ${city.place}` }] },
      { heading: `${service.label} near ${city.page.city}`, links: sameServiceElsewhere(page).map((other) => ({ href: other.path, label: other.city.place })) },
    ],
    estimatorPlace: service.key === "roof-replacement" ? city.place : undefined,
    schema: structuredData(page),
  };
  return <LandingPage model={model} />;
}
