import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LandingPage, { type LandingModel } from "@/components/landing-page";
import { SITE_URL, businessSchema, cityPages, faqSchema, getSitePage, servicePages, sitePages, type SitePage } from "@/lib/site-pages";
import { gridPagesForCity, gridPagesForHub } from "@/lib/service-grid";

export const dynamicParams = false;

export function generateStaticParams() {
  return sitePages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const page = getSitePage((await params).slug);
  if (!page) return {};
  const url = `${SITE_URL}/${page.slug}`;
  const image = { url: "/og-image.jpg", width: 1200, height: 630, alt: `RoofingnearmeSTL: ${page.h1}` };
  // Each page gets its own share card (Facebook, texts, X) instead of the homepage card from the layout.
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.description, url, siteName: "RoofingnearmeSTL", locale: "en_US", type: "website", images: [image] },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [image] },
  };
}

// The listing page each page sits under in the breadcrumb.
const parentOf = (page: SitePage) => (page.kind === "service" ? { name: "Services", href: "/services" } : { name: "Areas We Serve", href: "/areas-we-serve" });

function structuredData(page: SitePage) {
  const url = `${SITE_URL}/${page.slug}`;
  const parent = parentOf(page);
  const stateName = page.state === "IL" ? "Illinois" : "Missouri";
  const place = page.kind === "city" ? { "@type": "City", name: page.navLabel, containedInPlace: { "@type": "AdministrativeArea", name: `${page.county}, ${stateName}` } } : null;
  const serviceNode = place
    ? page.scope === "il-exterior"
      ? { "@type": "Service", "@id": `${url}#service`, name: `Siding, gutters, soffit & fascia in ${page.navLabel}`, serviceType: "Siding and gutter services", url, description: page.description, provider: { "@id": businessSchema["@id"] }, areaServed: place }
      : { "@type": "Service", "@id": `${url}#service`, name: `Roofing in ${page.navLabel}`, serviceType: "Roofing", url, description: page.description, provider: { "@id": businessSchema["@id"] }, areaServed: place }
    : {
        "@type": "Service", "@id": `${url}#service`, name: page.navLabel, serviceType: page.navLabel, url, description: page.description, provider: { "@id": businessSchema["@id"] },
        // Roofing services: Missouri only. Exterior services: Missouri and Illinois.
        areaServed: page.scope === "roofing" ? { "@type": "State", name: "Missouri" } : [{ "@type": "State", name: "Missouri" }, { "@type": "State", name: "Illinois" }],
      };
  return {
    "@context": "https://schema.org",
    "@graph": [
      businessSchema,
      serviceNode,
      { "@type": "WebPage", "@id": url, url, name: page.title, description: page.description, inLanguage: "en-US", about: { "@id": `${url}#service` }, isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "RoofingnearmeSTL", url: SITE_URL } },
      faqSchema(page.faqs),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: parent.name, item: `${SITE_URL}${parent.href}` },
          { "@type": "ListItem", position: 3, name: page.navLabel, item: url },
        ],
      },
    ],
  };
}

// Service pages link to a handful of city pages; roofing services only to Missouri cities.
const FEATURED_MO = ["roofing-st-charles-mo", "roofing-chesterfield-mo", "roofing-kirkwood-mo", "roofing-arnold-mo", "roofing-st-peters-mo", "roofing-ofallon-mo"];
const FEATURED_IL = ["siding-gutters-waterloo-il", "siding-gutters-columbia-il", "siding-gutters-belleville-il", "siding-gutters-edwardsville-il"];
const link = (page: SitePage) => ({ href: `/${page.slug}`, label: page.navLabel });

function linkGroups(page: SitePage): LandingModel["linkGroups"] {
  if (page.kind === "city") {
    const nearby = cityPages.filter((other) => page.nearby?.includes(other.slug)).map(link);
    const grid = gridPagesForCity(page.slug).map((g) => ({ href: g.path, label: g.service.shortTitle(g.city.place) }));
    // Illinois cities only list exterior services.
    const services = servicePages.filter((s) => page.scope !== "il-exterior" || s.scope === "exterior").map((s) => ({ href: `/${s.slug}`, label: `${s.navLabel} in ${page.city}` }));
    return [
      { heading: `${page.city} service pages`, links: grid },
      { heading: `Areas near ${page.city}`, links: nearby },
      { heading: `Our services in ${page.city}`, links: grid.length ? services.filter((s) => !grid.some((g) => g.label.startsWith(s.label.split(" in ")[0]))) : services },
    ];
  }
  const featured = (page.scope === "roofing" ? FEATURED_MO : [...FEATURED_MO.slice(0, 3), ...FEATURED_IL]).map((slug) => cityPages.find((c) => c.slug === slug)!).map(link);
  return [
    { heading: `${page.navLabel} by city`, links: gridPagesForHub(`/${page.slug}`).map((g) => ({ href: g.path, label: g.city.place })) },
    { heading: "More services", links: servicePages.filter((other) => other.slug !== page.slug).map(link) },
    { heading: "Popular service areas", links: featured },
  ];
}

export default async function SitePageView({ params }: PageProps<"/[slug]">) {
  const page = getSitePage((await params).slug);
  if (!page) notFound();
  const parent = parentOf(page);
  const model: LandingModel = {
    scope: page.scope,
    city: page.city,
    navLabel: page.navLabel,
    eyebrow: page.eyebrow,
    h1: page.h1,
    intro: page.intro,
    defaultService: page.defaultService,
    sections: page.sections,
    faqs: page.faqs,
    faqHeading: page.kind === "city" ? `${page.scope === "il-exterior" ? "Siding & Gutter" : "Roofing"} FAQ: ${page.navLabel}` : `${page.navLabel} FAQ`,
    breadcrumbs: [parent, { name: page.navLabel, href: `/${page.slug}` }],
    linkGroups: linkGroups(page),
    // The roof cost estimator lives on the roof replacement page (Missouri pricing).
    estimatorPlace: page.slug === "roof-replacement" ? "St. Louis, MO" : undefined,
    reviewsFor: page.kind === "city" && page.city && page.state ? { city: page.city, state: page.state } : undefined,
    schema: structuredData(page),
  };
  return <LandingPage model={model} />;
}
