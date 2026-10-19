// City landing pages for the wider St. Louis service area, rendered by src/app/[slug]/page.tsx.
// Each city gets its own local paragraph and nearby-area links so no two pages are copies of each other.
// Same claim rules as site-pages.ts: only owner-confirmed claims, and local facts limited to plain geography.
import type { SitePage } from "./site-pages";

export type RegionId = "il-monroe-st-clair" | "il-madison" | "mo-st-charles" | "mo-west-county" | "mo-central-county" | "mo-north-county" | "mo-jefferson" | "mo-franklin";

// Groupings for menus and the /areas-we-serve page, Illinois first (home base), then Missouri.
// Each region also has a short note about the homes and roofs there, shown on its city pages.
export const regions: { id: RegionId; name: string; note: string }[] = [
  {
    id: "il-monroe-st-clair", name: "Monroe & St. Clair County, IL",
    note: "Monroe and St. Clair County are home base for us. Homes here range from historic brick near the old town centers to newer subdivisions, and spring storms rolling in from the west are the most common reason for a roof check.",
  },
  {
    id: "il-madison", name: "Madison County, IL",
    note: "Across Madison County, from the river bluffs at Alton to Edwardsville and Collinsville, we work on everything from century-old homes to new construction. Hail and high winds hit both sides of the river, so dented gutters and lifted shingles are worth a closer look after any big storm.",
  },
  {
    id: "mo-st-charles", name: "St. Charles County, MO",
    note: "St. Charles County has grown fast, so many roofs here were installed around the same time and are reaching the age where wear shows up all at once. After hail, damage often runs across whole neighborhoods, which is why a documented inspection matters before you file a claim or sign a contract.",
  },
  {
    id: "mo-west-county", name: "West St. Louis County, MO",
    note: "West County homes tend to be larger, with steeper, more complex roofs and plenty of mature trees. That means more valleys, flashing and gutters to inspect, and more places for a small leak to hide.",
  },
  {
    id: "mo-central-county", name: "Central St. Louis County, MO",
    note: "Central St. Louis County has some of the region's oldest neighborhoods, with historic homes, chimneys and steep rooflines under mature trees. A careful repair often makes more sense here than a rushed replacement, and our photos show you which is which.",
  },
  {
    id: "mo-north-county", name: "North & Northwest St. Louis County, MO",
    note: "North County neighborhoods are mostly established, with many homes built in the mid-1900s. Older roofs can hide extra shingle layers, aging flashing and worn decking, so we check beneath the surface, not just the top layer.",
  },
  {
    id: "mo-jefferson", name: "Jefferson County, MO",
    note: "Jefferson County mixes older river towns, growing subdivisions along I-55 and rural properties with plenty of trees. Along with hail, we see a lot of wind and limb damage here, and we document all of it.",
  },
  {
    id: "mo-franklin", name: "Franklin County, MO",
    note: "Franklin County is the western edge of our service area, with river towns and rural homes that get the same spring hail and wind as the rest of the metro. Visits out here work like anywhere else: free, photo-documented and with no pressure.",
  },
];

type Area = {
  slug: string;
  city: string;
  state: "IL" | "MO";
  county: string;
  region: RegionId;
  /** What makes roofing in this city different: housing, trees, location. Plain, checkable facts only. */
  local: string;
  /** Slugs of nearby city pages (validated at build time). */
  nearby: string[];
  /** Optional replacement for the generated intro. */
  intro?: string;
};

const areas: Area[] = [
  // Monroe & St. Clair County, IL (Waterloo, Columbia and Belleville have hand-written pages in site-pages.ts)
  {
    slug: "roofing-ofallon-il", city: "O'Fallon", state: "IL", county: "St. Clair County", region: "il-monroe-st-clair",
    local: "O'Fallon is home to many military families from nearby Scott Air Force Base and plenty of newer subdivisions along I-64. Whether you're settling in, selling or getting ready for a move, our photo report gives you a clear record of your roof's condition.",
    nearby: ["roofing-belleville-il", "roofing-collinsville-il"],
  },
  {
    slug: "roofing-dupo-il", city: "Dupo", state: "IL", county: "St. Clair County", region: "il-monroe-st-clair",
    local: "Dupo sits on Illinois Route 3 between Cahokia Heights and Columbia, right in the middle of our Metro East service area. We handle leak repairs, storm damage inspections and full replacements here, with photos before and after.",
    nearby: ["roofing-columbia-il", "roofing-cahokia-heights-il", "roofing-waterloo-il"],
  },
  {
    slug: "roofing-cahokia-heights-il", city: "Cahokia Heights", state: "IL", county: "St. Clair County", region: "il-monroe-st-clair",
    intro: "Cahokia Heights, formed in 2021 when Cahokia, Centreville and Alorton combined, is part of our Metro East service area. Every visit starts with a Free Photo-Documented Report, so you see your roof before you decide anything.",
    local: "Many homes in Cahokia Heights are older, and keeping water off and away from them matters. Along with the shingles, we check flashing, gutters and downspouts so rain is carried off the roof and away from your home.",
    nearby: ["roofing-dupo-il", "roofing-belleville-il", "roofing-columbia-il"],
  },
  // Madison County, IL
  {
    slug: "roofing-edwardsville-il", city: "Edwardsville", state: "IL", county: "Madison County", region: "il-madison",
    local: "Edwardsville, the Madison County seat and home of SIUE, has historic homes near downtown and newer subdivisions on the edges of town. We inspect them all the same way: every slope photographed, and honest repair-or-replace options.",
    nearby: ["roofing-collinsville-il", "roofing-wood-river-il", "roofing-granite-city-il"],
  },
  {
    slug: "roofing-collinsville-il", city: "Collinsville", state: "IL", county: "Madison County", region: "il-madison",
    local: "Collinsville, home of the World's Largest Catsup Bottle, has established neighborhoods on the bluffs and newer homes near I-55/70. We inspect, repair and replace roofs across town, with photos every step of the way.",
    nearby: ["roofing-edwardsville-il", "roofing-ofallon-il", "roofing-granite-city-il"],
  },
  {
    slug: "roofing-granite-city-il", city: "Granite City", state: "IL", county: "Madison County", region: "il-madison",
    local: "Granite City's established neighborhoods have many older homes where the roof, gutters and fascia have all aged together. We look at the whole exterior and photograph what needs attention now and what can wait.",
    nearby: ["roofing-collinsville-il", "roofing-edwardsville-il", "roofing-wood-river-il"],
  },
  {
    slug: "roofing-alton-il", city: "Alton", state: "IL", county: "Madison County", region: "il-madison",
    local: "Alton's historic homes on the Mississippi River bluffs often have steep roofs, chimneys and detailed trim. We inspect flashing, chimneys, soffit and fascia as closely as the shingles, so nothing gets missed.",
    nearby: ["roofing-wood-river-il", "roofing-edwardsville-il"],
  },
  {
    slug: "roofing-wood-river-il", city: "Wood River", state: "IL", county: "Madison County", region: "il-madison",
    local: "Wood River sits between Alton, East Alton and Roxana, with established neighborhoods of older homes. We help homeowners here choose between a repair and a replacement with photos, not guesswork.",
    nearby: ["roofing-alton-il", "roofing-edwardsville-il", "roofing-granite-city-il"],
  },
  // St. Charles County, MO
  {
    slug: "roofing-st-charles-mo", city: "St. Charles", state: "MO", county: "St. Charles County", region: "mo-st-charles",
    local: "From older brick homes near the historic Main Street district to newer subdivisions across the city, we see every kind of roof in St. Charles. Older homes often need careful flashing and chimney work, and on any home, spring hail and wind are the most common reasons we're called out.",
    nearby: ["roofing-st-peters-mo", "roofing-ofallon-mo"],
  },
  {
    slug: "roofing-st-peters-mo", city: "St. Peters", state: "MO", county: "St. Charles County", region: "mo-st-charles",
    local: "St. Peters is mostly established subdivisions, where many homes are on their first or second roof. We check for the wear that comes with age, like granule loss, lifted shingles and cracked pipe boots, and for hail and wind damage after storms roll through along I-70.",
    nearby: ["roofing-st-charles-mo", "roofing-ofallon-mo", "roofing-wentzville-mo"],
  },
  {
    slug: "roofing-ofallon-mo", city: "O'Fallon", state: "MO", county: "St. Charles County", region: "mo-st-charles",
    local: "O'Fallon has grown quickly, and many homes in its newer subdivisions still have the shingles they were built with. As those roofs age and storms add up, we photograph every slope so you can see whether a repair will carry you or it's time to replace.",
    nearby: ["roofing-st-peters-mo", "roofing-wentzville-mo", "roofing-st-charles-mo"],
  },
  {
    slug: "roofing-wentzville-mo", city: "Wentzville", state: "MO", county: "St. Charles County", region: "mo-st-charles",
    local: "Many of Wentzville's homes, near where I-64 meets I-70, were built in the last few decades, and a lot of them are getting close to their first roof replacement. We document shingle condition and storm damage with photos so you can plan ahead instead of reacting to a leak.",
    nearby: ["roofing-ofallon-mo", "roofing-st-peters-mo"],
  },
  // West St. Louis County, MO
  {
    slug: "roofing-chesterfield-mo", city: "Chesterfield", state: "MO", county: "St. Louis County", region: "mo-west-county",
    local: "Chesterfield homes often have larger, steeper roofs with valleys, dormers and skylights, which are exactly the spots where leaks start. We inspect and photograph every slope, including the transitions and flashing you can't see from the ground.",
    nearby: ["roofing-wildwood-mo", "roofing-ellisville-mo", "roofing-ballwin-mo"],
  },
  {
    slug: "roofing-wildwood-mo", city: "Wildwood", state: "MO", county: "St. Louis County", region: "mo-west-county",
    local: "Wildwood's wooded lots are beautiful, but overhanging trees drop limbs, leaves and debris that clog gutters and hold moisture on shingles. We check for limb damage, debris build-up and gutter overflow along with the usual storm and age-related wear.",
    nearby: ["roofing-chesterfield-mo", "roofing-ellisville-mo", "roofing-ballwin-mo"],
  },
  {
    slug: "roofing-ballwin-mo", city: "Ballwin", state: "MO", county: "St. Louis County", region: "mo-west-county",
    local: "Ballwin's established neighborhoods off Manchester Road have plenty of homes where aging shingles, worn flashing and tired gutters tend to show up together. We photograph all of it so you can fix what matters most first.",
    nearby: ["roofing-manchester-mo", "roofing-ellisville-mo", "roofing-chesterfield-mo"],
  },
  {
    slug: "roofing-manchester-mo", city: "Manchester", state: "MO", county: "St. Louis County", region: "mo-west-county",
    local: "Along Manchester Road and the neighborhoods around it, many homes have mature trees, older gutters and roofs that have weathered a lot of St. Louis storms. We inspect the roof, gutters, soffit and fascia together, because water problems often start where they meet.",
    nearby: ["roofing-ballwin-mo", "roofing-ellisville-mo", "roofing-kirkwood-mo"],
  },
  {
    slug: "roofing-ellisville-mo", city: "Ellisville", state: "MO", county: "St. Louis County", region: "mo-west-county",
    local: "Ellisville homes near Manchester and Clarkson Roads range from established ranches to newer two-story houses. Whatever the style, we start with a Free Photo-Documented Report so you know exactly what condition your roof is in.",
    nearby: ["roofing-ballwin-mo", "roofing-wildwood-mo", "roofing-chesterfield-mo"],
  },
  // Central St. Louis County, MO
  {
    slug: "roofing-clayton-mo", city: "Clayton", state: "MO", county: "St. Louis County", region: "mo-central-county",
    local: "Clayton, the St. Louis County seat, mixes historic homes, newer houses and multi-family buildings. Whatever you own, our Free Photo-Documented Report gives you photos of every slope and honest repair-or-replace options.",
    nearby: ["roofing-frontenac-mo", "roofing-webster-groves-mo", "roofing-kirkwood-mo"],
  },
  {
    slug: "roofing-frontenac-mo", city: "Frontenac", state: "MO", county: "St. Louis County", region: "mo-central-county",
    local: "Frontenac's larger homes often have complex roofs with multiple valleys, dormers and skylights. We photograph every slope and transition, and we'll tell you honestly when a repair is all you need.",
    nearby: ["roofing-kirkwood-mo", "roofing-clayton-mo"],
  },
  {
    slug: "roofing-kirkwood-mo", city: "Kirkwood", state: "MO", county: "St. Louis County", region: "mo-central-county",
    local: "Kirkwood is known for its historic homes and mature trees, and both are hard on roofs and gutters. We look closely at flashing, chimneys, valleys and gutters on older homes and document everything with photos.",
    nearby: ["roofing-webster-groves-mo", "roofing-frontenac-mo", "roofing-manchester-mo"],
  },
  {
    slug: "roofing-webster-groves-mo", city: "Webster Groves", state: "MO", county: "St. Louis County", region: "mo-central-county",
    local: "Webster Groves has many older homes with steep roofs, dormers and chimneys under a heavy tree canopy. Those details are where leaks usually start, so we inspect and photograph them up close.",
    nearby: ["roofing-kirkwood-mo", "roofing-clayton-mo"],
  },
  // North & Northwest St. Louis County, MO
  {
    slug: "roofing-florissant-mo", city: "Florissant", state: "MO", county: "St. Louis County", region: "mo-north-county",
    local: "Florissant is one of the oldest communities in the St. Louis area, and its neighborhoods include many mid-century homes. On older roofs we pay close attention to decking, flashing and ventilation, not just the shingles you can see from the street.",
    nearby: ["roofing-hazelwood-mo", "roofing-ferguson-mo"],
  },
  {
    slug: "roofing-hazelwood-mo", city: "Hazelwood", state: "MO", county: "St. Louis County", region: "mo-north-county",
    local: "Hazelwood homes near Lambert Airport and along I-270 take the same spring storms as the rest of North County. We inspect for hail, wind and age-related wear and give you photos and honest options.",
    nearby: ["roofing-florissant-mo", "roofing-bridgeton-mo", "roofing-ferguson-mo"],
  },
  {
    slug: "roofing-ferguson-mo", city: "Ferguson", state: "MO", county: "St. Louis County", region: "mo-north-county",
    local: "Ferguson's established neighborhoods and older homes near downtown often have aging roofs and chimneys. We inspect flashing, chimneys and gutters as closely as the shingles.",
    nearby: ["roofing-florissant-mo", "roofing-jennings-mo", "roofing-hazelwood-mo"],
  },
  {
    slug: "roofing-jennings-mo", city: "Jennings", state: "MO", county: "St. Louis County", region: "mo-north-county",
    local: "Jennings has many older homes in established neighborhoods, and older roofs often hide problems under the surface. We photograph what we find, from worn flashing to soft decking, so you can decide on a repair or a replacement with the facts.",
    nearby: ["roofing-ferguson-mo", "roofing-florissant-mo"],
  },
  {
    slug: "roofing-bridgeton-mo", city: "Bridgeton", state: "MO", county: "St. Louis County", region: "mo-north-county",
    local: "Bridgeton sits right next to St. Louis Lambert International Airport, with established neighborhoods that have seen plenty of St. Louis storms. We check for hail and wind damage and the wear that comes with age, and photograph all of it.",
    nearby: ["roofing-hazelwood-mo", "roofing-st-ann-mo", "roofing-maryland-heights-mo"],
  },
  {
    slug: "roofing-st-ann-mo", city: "St. Ann", state: "MO", county: "St. Louis County", region: "mo-north-county",
    local: "St. Ann was built up largely after World War II, and many of its homes now have older roofs where a small leak can turn into a bigger repair. We find the source, fix it, and show you before-and-after photos.",
    nearby: ["roofing-bridgeton-mo", "roofing-maryland-heights-mo"],
  },
  {
    slug: "roofing-maryland-heights-mo", city: "Maryland Heights", state: "MO", county: "St. Louis County", region: "mo-north-county",
    local: "From neighborhoods near Creve Coeur Lake to homes off Dorsett Road, Maryland Heights has a wide mix of housing, including townhomes and condos with shared roofs. We document damage clearly, so you have what you need whether you own the home or work with an HOA.",
    nearby: ["roofing-bridgeton-mo", "roofing-st-ann-mo", "roofing-chesterfield-mo"],
  },
  // Jefferson County, MO
  {
    slug: "roofing-arnold-mo", city: "Arnold", state: "MO", county: "Jefferson County", region: "mo-jefferson",
    local: "Arnold, along I-55 where the Meramec River meets the Mississippi, sees strong spring storms like the rest of the metro. We inspect for hail and wind damage and give you a photo report you can keep.",
    nearby: ["roofing-pevely-mo", "roofing-festus-mo"],
  },
  {
    slug: "roofing-pevely-mo", city: "Pevely", state: "MO", county: "Jefferson County", region: "mo-jefferson",
    local: "Pevely, along I-55, has a mix of older homes and newer subdivisions. We handle everything from a single leak to a full replacement, with photos before and after.",
    nearby: ["roofing-festus-mo", "roofing-arnold-mo", "roofing-de-soto-mo"],
  },
  {
    slug: "roofing-festus-mo", city: "Festus", state: "MO", county: "Jefferson County", region: "mo-jefferson",
    local: "From older homes near downtown Festus to newer subdivisions along I-55, every inspection starts the same way: a free, photo-documented look at every slope and honest options for your roof.",
    nearby: ["roofing-pevely-mo", "roofing-de-soto-mo", "roofing-arnold-mo"],
  },
  {
    slug: "roofing-de-soto-mo", city: "De Soto", state: "MO", county: "Jefferson County", region: "mo-jefferson",
    local: "Homes in and around De Soto, from in-town streets to rural lots, take a beating from spring storms and falling limbs. We inspect for storm damage, check gutters and fascia, and photograph what we find.",
    nearby: ["roofing-festus-mo", "roofing-pevely-mo"],
  },
  // Franklin County, MO
  {
    slug: "roofing-pacific-mo", city: "Pacific", state: "MO", county: "Franklin County", region: "mo-franklin",
    local: "Pacific sits along I-44 near the Meramec River, and homes here see the same hail and wind as the rest of the metro. We make the trip out for full inspections, repairs and replacements, with photos of every slope.",
    nearby: ["roofing-washington-mo", "roofing-wildwood-mo"],
  },
  {
    slug: "roofing-washington-mo", city: "Washington", state: "MO", county: "Franklin County", region: "mo-franklin",
    local: "Washington's historic downtown along the Missouri River has older homes with steep roofs and chimneys, and its newer neighborhoods have their own aging-shingle and storm damage needs. We serve both with the same photo-first approach.",
    nearby: ["roofing-pacific-mo"],
  },
];

const PHONE = { IL: "618-612-5192", MO: "314-202-7663" } as const;
const STATE_NAME = { IL: "Illinois", MO: "Missouri" } as const;

// A few intro wordings, rotated, so pages don't open with identical sentences.
const intros = [
  (city: string) => `${city} homeowners call us for leaks, storm damage and full roof replacements, and to find out honestly which one they need. Every visit starts with a Free Photo-Documented Report, so you see your roof before you decide anything.`,
  (city: string) => `Need a roofer in ${city} who shows you the damage before quoting anything? We photograph every slope, explain your Repair vs Replace options, and only recommend a new roof when the photos prove you need one.`,
  (city: string) => `From quick leak repairs to full replacements, ${city} homeowners get the same promise from us: photos first, honest options, and no pushy sales. You decide with the facts in front of you.`,
  (city: string) => `Roof leaking, storm-damaged or just getting old? In ${city}, we start with a Free Photo-Documented Report: shingle ID, close-up damage photos and honest options. The report is yours to keep, whether you hire us or not.`,
  (city: string) => `A roof estimate in ${city} shouldn't be a sales pitch. We climb up, photograph what we find, and walk you through the photos, so a repair stays a repair and a replacement only happens when it's truly needed.`,
  (city: string) => `When a storm moves through ${city}, we're the local crew that shows up with a camera, not a clipboard full of pressure. You get clear photos of your roof, honest options and a written estimate, with no obligation.`,
  (city: string) => `Whether it's one missing shingle or a roof at the end of its life, ${city} homeowners get the same thing from us: a free, photo-documented inspection and a straight answer about what your roof needs.`,
];

function areaPage(area: Area, index: number, nameOf: (slug: string) => string): SitePage {
  const { city, state, county } = area;
  const place = `${city}, ${state}`;
  const phone = PHONE[state];
  const nearby = area.nearby.map(nameOf).join(", ");
  const longTitle = `Roofer in ${place} | Free Roof Inspection | RoofingnearmeSTL`;
  const region = regions.find((candidate) => candidate.id === area.region)!;
  return {
    slug: area.slug,
    kind: "city",
    navLabel: place,
    city,
    state,
    county,
    region: area.region,
    nearby: area.nearby,
    title: longTitle.length <= 66 ? longTitle : `Roofer in ${place} | RoofingnearmeSTL`,
    description: `Roofer in ${place}: free photo-documented roof inspection, repair, replacement, 24/7 tarping, siding & gutters. Call ${phone}.`,
    eyebrow: `${city}, ${STATE_NAME[state]}`,
    h1: `Roofing Company in ${place}`,
    intro: area.intro ?? intros[index % intros.length](city),
    defaultService: "Roof Repair",
    sections: [
      {
        heading: `Roofing in ${city}: what we look for`,
        body: area.local,
      },
      {
        heading: `Roofs across ${region.name.replace(/, (IL|MO)$/, "")}`,
        body: region.note,
      },
      {
        heading: `Roofing and exterior services in ${city}`,
        body: "One local crew for your roof and the exterior around it:",
        bullets: [
          "Roof leak repair and 24/7 emergency tarping",
          "Roof replacement with Owens Corning, CertainTeed, TAMKO or IKO shingles, or metal",
          "Hail and wind damage inspections with photo reports",
          "Siding repair and replacement",
          "Gutters and downspouts",
          "Soffit and fascia",
        ],
      },
      {
        heading: "Local, insured and accountable",
        body: `A local crew serving ${county} and the greater St. Louis area. Fully insured with $2M liability and workers' comp, 5.0★ on Google, and every job is backed by a 10-Year Workmanship Warranty.`,
      },
      {
        heading: `Fast response in ${city}`,
        body: `During business hours, we call as soon as your request comes in, and same-day evaluations are available when our schedule allows. Active leak? Call our ${STATE_NAME[state]} line: ${phone}.`,
      },
    ],
    faqs: [
      [`Do you serve ${place}?`, `Yes. We work throughout ${city} and nearby ${nearby}, plus the rest of the St. Louis metro and the Metro East.`],
      [`How much does a new roof cost in ${city}?`, "It depends on size, pitch and material. Use the Instant Roof Cost Estimator on our homepage for a quick range, then request a free evaluation for an exact quote."],
      [`Can you check my roof after a storm in ${city}?`, "Yes. Our Free Photo-Documented Report includes shingle ID and damage photos you can keep and share with your insurance carrier."],
      [`Do you also do siding, gutters, soffit and fascia in ${city}?`, "Yes. Roof, siding, gutters, downspouts, soffit and fascia. One local crew, one point of contact."],
      [`Which number should I call in ${city}?`, `For an active leak or storm damage in ${city}, call our ${STATE_NAME[state]} line at ${phone}; emergency tarping is available 24/7. For everything else, request a free evaluation online and we'll call as soon as it comes in during business hours.`],
    ],
  };
}

/** Builds the city pages; `nameOf` turns a nearby slug into its "City, ST" label (covers the hand-written pages too). */
export function buildAreaPages(nameOf: (slug: string) => string): SitePage[] {
  // Rotate the intro within each region, so neighboring towns never open with the same paragraph.
  return areas.map((area) => areaPage(area, areas.filter((other) => other.region === area.region).indexOf(area), nameOf));
}

export const areaNames: Record<string, string> = Object.fromEntries(areas.map((area) => [area.slug, `${area.city}, ${area.state}`]));
