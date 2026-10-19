import { FACEBOOK_URL, GOOGLE_BUSINESS_URL, SITE_URL, sitePages } from "@/lib/site-pages";

export const dynamic = "force-static";

// Plain-text summary for AI assistants (https://llmstxt.org). Keep claims in sync with site-pages.ts.
export function GET() {
  const links = (kind: "service" | "city") => sitePages
    .filter((page) => page.kind === kind)
    .map((page) => `- [${page.navLabel}](${SITE_URL}/${page.slug}): ${page.description}`)
    .join("\n");

  const body = `# RoofingnearmeSTL (Roofing Near Me STL)

> Local roofing contractor serving Waterloo, Columbia and Belleville, Illinois, and the St. Louis, Missouri metro. Roof repair, roof replacement, storm and hail damage inspections, emergency tarping, gutters and siding. Every visit starts with a free photo-documented roof report with honest repair-vs-replace options.

- Phone (Illinois): 618-612-5192
- Phone (Missouri): 314-202-7663
- 24/7 emergency roof repair and tarping
- Fully insured: $2M liability plus workers' compensation
- 10-Year Workmanship Warranty
- 5.0-star Google rating
- Inspections by Mike Williamson, Building Experts Institute (BEI) certified in hail damage identification, wind damage identification, installation, and building code for asphalt shingle roofs (valid through March 2029)
- Financing available for retail projects
- Roofing contractor, not a public adjuster: provides photo documentation homeowners can share with their insurance carrier, but does not negotiate claims

## Services

${links("service")}

## Service areas

${links("city")}

## Profiles

- [Facebook](${FACEBOOK_URL})${GOOGLE_BUSINESS_URL ? `
- [Google Business Profile](${GOOGLE_BUSINESS_URL})` : ""}

## Get a free estimate

- [Free photo-documented roof report](${SITE_URL}/#estimate): request form and instant roof cost estimator
`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
