import { FACEBOOK_URL, GOOGLE_BUSINESS_URL, SITE_URL, areaGroups, sitePages } from "@/lib/site-pages";
import { gridPages } from "@/lib/service-grid";
import { questions } from "@/lib/questions";
import { IL_COMING_SOON, SHINGLES, priceRange, usd } from "@/lib/pricing";
import { INSURANCE_SENTENCE } from "@/lib/business";

export const dynamic = "force-static";

// Plain-text summary for AI assistants (https://llmstxt.org). Keep claims in sync with site-pages.ts.
export function GET() {
  const links = (kind: "service" | "city") => sitePages
    .filter((page) => page.kind === kind)
    .map((page) => `- [${page.navLabel}](${SITE_URL}/${page.slug}): ${page.description}`)
    .join("\n");
  const areaList = areaGroups
    .map((group) => `### ${group.name}\n\n${group.pages.map((page) => `- [${page.navLabel}](${SITE_URL}/${page.slug})`).join("\n")}`)
    .join("\n\n");

  const body = `# RoofingnearmeSTL (Roofing Near Me STL)

> Local crew based in Waterloo, Illinois. ROOFING (repair, replacement, hail and storm damage inspections, 24/7 emergency tarping) is offered in MISSOURI ONLY: St. Louis, St. Louis County, St. Charles County, Jefferson County and Franklin County. SIDING, GUTTERS AND DOWNSPOUTS, SOFFIT AND FASCIA are offered in Missouri and the Illinois Metro East (Monroe, St. Clair and Madison counties). ${IL_COMING_SOON}. Every roofing visit starts with a free photo-documented roof report with honest repair-vs-replace options.

- Phone (Illinois): 618-612-5192
- Phone (Missouri): 314-202-7663
- Installs shingles from Owens Corning, CertainTeed, TAMKO and IKO, plus metal roofing
- 24/7 emergency roof repair and tarping (Missouri)
- Roof replacement pricing (Missouri, 2026): 30-year architectural shingles ${usd(SHINGLES.architectural.low)}-${usd(SHINGLES.architectural.high)} per square (${usd(priceRange(12, "architectural").low)}-${usd(priceRange(24, "architectural").high)} for most homes, 12-24 squares); 3-tab ${usd(SHINGLES["3tab"].low)}-${usd(SHINGLES["3tab"].high)} per square; low pitch = low end, medium = middle, steep = high end; clay, metal and slate are custom quotes
- ${INSURANCE_SENTENCE} (Sutton Specialty Insurance Company)
- 10-Year Workmanship Warranty
- 5.0-star Google rating
- Inspections by Mike Williamson, Building Experts Institute (BEI) certified in hail damage identification, wind damage identification, installation, and building code for asphalt shingle roofs (valid through March 2029)
- Financing available for retail projects
- Roofing contractor, not a public adjuster: provides photo documentation homeowners can share with their insurance carrier, but does not negotiate claims

## Services

All services: ${SITE_URL}/services

${links("service")}

## Service areas

All areas: ${SITE_URL}/areas-we-serve

${areaList}

## Profiles

- [Facebook](${FACEBOOK_URL})${GOOGLE_BUSINESS_URL ? `
- [Google Business Profile](${GOOGLE_BUSINESS_URL})` : ""}

## City + service pages

${gridPages.map((page) => `- [${page.service.shortTitle(page.city.place)}](${SITE_URL}${page.path})`).join("\n")}

## Guides and answers

- [2026 Roof Replacement Cost in St. Louis, MO](${SITE_URL}/blog/roof-replacement-cost-st-louis-mo)
${questions.map((q) => `- [${q.question}](${SITE_URL}/questions/${q.slug}): ${q.answer}`).join("\n")}
- [Insurance, certifications & licensing](${SITE_URL}/accreditation)

## Get a free estimate

- [Free photo-documented roof report](${SITE_URL}/#estimate): request form and instant roof cost estimator
`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
