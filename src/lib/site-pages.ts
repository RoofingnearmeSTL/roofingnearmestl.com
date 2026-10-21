// Content for the service and city landing pages rendered by src/app/[slug]/page.tsx.
// BUSINESS RULES (src/lib/business.ts): Missouri = roofing + siding + gutters + soffit/fascia.
// Illinois = siding + gutters + soffit/fascia ONLY ("Roofing coming soon after IL license"). The checks at the
// bottom of this file fail the build if an Illinois page offers roofing.
// Only use claims the owner has confirmed: 5.0★ Google, 10-Yr Workmanship Warranty, 24/7 emergency
// repair and tarping (Missouri), financing, metal installs, same-day evaluations when the schedule allows.
// Insurance: say only what the 03/17/2026 COI shows ($1M per occurrence / $2M aggregate general liability).
// Workers' comp is not on the COI, so do not claim it.
// Shingle brands we install (owner-confirmed): Owens Corning, CertainTeed, TAMKO and IKO. Say "we install", never certified/preferred.
// NOT true (do not add): GAF Certified, Owens Corning Preferred, BBB A+, 500+ roofs.
// The wider St. Louis city pages are generated from src/lib/service-areas.ts.
import { areaNames, buildAreaPages, regions, type RegionId } from "./service-areas";
import { IL_LEAD_SERVICES, INSURANCE, INSURANCE_SENTENCE, LEGAL_NAME, PHONES } from "./business";
import { IL_COMING_SOON } from "./pricing";

/**
 * Which services a page offers, which decides phones, process copy, certifications and lead-form choices:
 * - roofing: Missouri roofing service pages
 * - exterior: siding / gutters / soffit-fascia service pages (Missouri and Illinois)
 * - mo-all: Missouri city pages (roofing + exterior)
 * - il-exterior: Illinois city pages (exterior only)
 */
export type Scope = "roofing" | "exterior" | "mo-all" | "il-exterior";

export type SitePage = {
  slug: string;
  kind: "service" | "city";
  scope: Scope;
  navLabel: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  defaultService: string;
  city?: string;
  state?: "IL" | "MO";
  county?: string;
  region?: RegionId;
  /** Slugs of nearby city pages, linked from the page. */
  nearby?: string[];
  sections: { heading: string; body: string; bullets?: string[] }[];
  faqs: [question: string, answer: string][];
};

export const SITE_URL = "https://www.roofingnearmestl.com";

// Choices in the lead form's "Service needed" menu. Every page's defaultService must be one of these.
export const LEAD_SERVICES = ["Roof Repair", "Roof Replacement", "Leak / Emergency", "Storm Damage / Insurance", "Siding", "Gutters / Downspouts", "Soffit & Fascia"];

const corePages: SitePage[] = [
  {
    slug: "roof-replacement",
    kind: "service",
    scope: "roofing",
    navLabel: "Roof Replacement",
    title: "Roof Replacement in St. Louis, MO | RoofingnearmeSTL",
    description:
      "Roof replacement in St. Louis, MO: 30-yr architectural shingles $450-$750/SQ, free photo-documented inspection, 10-yr workmanship warranty. 314-202-7663.",
    eyebrow: "Roof Replacement",
    h1: "Roof Replacement in St. Louis, Missouri",
    intro:
      "Don't replace yet. Before we quote a new roof, we photograph every slope and show you what we see. If a repair will buy you years, we tell you. If replacement is the right call, you get a clear plan, a real price range, and a local crew that stands behind the work.",
    defaultService: "Roof Replacement",
    sections: [
      {
        heading: "Replace only when the photos prove it",
        body:
          "Every replacement starts with our Free Photo-Documented Report: shingle identification, close-up photos of granule loss, cracking, bruising and seal-strip failure, and honest Repair vs Replace options. The report is yours to keep, whether you hire us or not.",
      },
      {
        heading: "What a replacement with us includes",
        body: "One local crew handles the job from tear-off to clean-up:",
        bullets: [
          "Full tear-off down to the deck and a deck inspection",
          "Architectural and 3-tab shingles from Owens Corning, CertainTeed, TAMKO and IKO",
          "Metal roofing options",
          "Flashing, vents and drip edge checked and replaced where needed",
          "Gutters, siding, soffit and fascia available in the same project",
          "Job-site clean-up and a final walk-through with you",
          "10-Year Workmanship Warranty",
        ],
      },
      {
        heading: "Shingle brands we install",
        body:
          "We install shingles from Owens Corning, CertainTeed, TAMKO and IKO. We'll walk you through the product lines, colors and price points that fit your home and budget, and the manufacturer's warranty applies to the shingles we install.",
      },
      {
        heading: "Signs it may be time for a new roof",
        body:
          "Age alone doesn't decide it. We look for widespread granule loss, curling or cracked shingles, repeated leaks, soft decking, and storm damage across multiple slopes. If only one area is failing, a repair is often the better value, and we'll say so.",
      },
      {
        heading: "Know your price before anyone visits",
        body:
          "A 30-year architectural shingle roof runs $450-$750 per square (100 sq ft) in the St. Louis area: $5,400-$9,000 for 12 squares, $8,100-$13,500 for 18 and $10,800-$18,000 for 24. Low-pitch roofs land at the low end and steep roofs at the high end. Use the estimator below, then request a free evaluation to lock your price. Financing is available on retail projects.",
      },
      {
        heading: "Missouri roofing",
        body:
          `Roof replacement is available for homes in Missouri. In Illinois we offer siding, gutters, soffit and fascia; ${IL_COMING_SOON.toLowerCase()}.`,
      },
    ],
    faqs: [
      [
        "How do I know if I need a full roof replacement?",
        "Start with a Free Photo-Documented Report. We photograph every slope, identify your shingle and show you the damage. If a repair makes more sense, we recommend the repair.",
      ],
      [
        "What roofing materials do you install?",
        "Architectural and 3-tab asphalt shingles from Owens Corning, CertainTeed, TAMKO and IKO, plus metal roofing. Clay and slate tile projects need an in-person evaluation before we can price them.",
      ],
      [
        "Which shingle brands do you install?",
        "Owens Corning, CertainTeed, TAMKO and IKO. We'll help you compare product lines, colors and price points during your free evaluation.",
      ],
      [
        "What warranty comes with a new roof?",
        "Our work carries a 10-Year Workmanship Warranty, and the manufacturer warranty applies to the materials we install.",
      ],
      [
        "Do you offer financing?",
        "Yes. Financing is available for retail roof, siding and gutter projects. Ask during your free evaluation.",
      ],
    ],
  },
  {
    slug: "roof-repair",
    kind: "service",
    scope: "roofing",
    navLabel: "Roof Repair",
    title: "Roof Leak Repair in St. Louis, MO | RoofingnearmeSTL",
    description:
      "Roof leaking? 24/7 emergency tarping and honest roof repair across the St. Louis area in Missouri. Photos before & after. Call 314-202-7663.",
    eyebrow: "Roof Repair",
    h1: "Roof Repair & Leak Repair in St. Louis, Missouri",
    intro:
      "A leak doesn't automatically mean a new roof. We find the source, stop the water, and show you photos of exactly what we fixed. No pushy replacement pitch unless the photos prove you need one.",
    defaultService: "Roof Repair",
    sections: [
      {
        heading: "Active leak? Call now",
        body:
          "Water coming in today? Call 314-202-7663. We offer 24/7 emergency roof repair across the St. Louis area in Missouri, including emergency tarping to protect your home until a permanent repair can be made. (Roof work is Missouri only for now; in Illinois we handle siding, gutters, soffit and fascia.)",
      },
      {
        heading: "Common repairs we handle",
        body: "Most leaks come from a handful of spots. We check them all:",
        bullets: [
          "Missing, lifted or wind-damaged shingles",
          "Flashing around chimneys, walls and skylights",
          "Pipe boots and roof vents",
          "Valleys and low-slope transitions",
          "Hail-bruised or cracked shingles",
          "Gutter, soffit and fascia damage that lets water in",
        ],
      },
      {
        heading: "Photos before and after every repair",
        body:
          "You see what we see. We photograph the problem before we touch it and the finished repair afterward, so you know the job was done right, even on a roof you'll never climb.",
      },
      {
        heading: "Repair or replace? We'll tell you honestly",
        body:
          "If your roof has plenty of life left, a repair is usually the smart move. If the damage is widespread, we'll show you the photos and walk through your options, including what a replacement would cost.",
      },
    ],
    faqs: [
      [
        "Can you fix a leak the same day?",
        "Same-day evaluations are available when our schedule allows. For an active leak, call and we can tarp the area to stop further damage until the permanent repair is done.",
      ],
      [
        "Will you try to sell me a whole new roof?",
        "No. We document damage, we don't just sell roofs. You get photos and honest Repair vs Replace options, and the decision is yours.",
      ],
      [
        "Is my repair covered by a warranty?",
        "Our work is backed by a 10-Year Workmanship Warranty. Ask us how it applies to your specific repair.",
      ],
      [
        "Do you repair gutters and siding too?",
        "Yes. Roof, siding, gutters, soffit and fascia. One local crew.",
      ],
    ],
  },
  {
    slug: "storm-damage-insurance",
    kind: "service",
    scope: "roofing",
    navLabel: "Storm Damage & Insurance",
    title: "Hail Damage Roof Inspection St. Louis, MO | RoofingnearmeSTL",
    description:
      "Free hail & wind damage roof inspection in the St. Louis area, Missouri, by a BEI-certified inspector. Photo report you can share with your insurer.",
    eyebrow: "Storm Damage & Insurance",
    h1: "Hail & Storm Damage Roof Inspections in St. Louis, Missouri",
    intro:
      "After hail or high winds, you need to know what really happened to your roof. Our Free Photo-Documented Report gives you shingle identification and clear photos of the damage, so you can make the next decision with facts in hand.",
    defaultService: "Storm Damage / Insurance",
    sections: [
      {
        heading: "What's in your storm damage report",
        body: "We photograph every slope and document what we find:",
        bullets: [
          "Shingle identification (brand, style and approximate age)",
          "Hail bruising, cracks and granule loss",
          "Lifted, creased or missing shingles from wind",
          "Damage to vents, flashing, gutters and siding",
          "Honest Repair vs Replace options",
        ],
      },
      {
        heading: "How we work with insurance",
        body:
          "We're roofing contractors, not public adjusters, so we don't negotiate claims. What we provide is the documentation: a photo report that's yours to keep and share with your insurance carrier if you choose. If the claim is approved, we can do the work. If it isn't, many neighbors use our report for a second look.",
      },
      {
        heading: "Local, not storm chasers",
        body:
          `We're a local crew from Waterloo, working across the St. Louis area. ${INSURANCE_SENTENCE}, and still here long after the storm crews leave town. Roof inspections and repairs are offered in Missouri; for Illinois homes we document and fix storm damage to siding, gutters, soffit and fascia.`,
      },
      {
        heading: "Protect your home right away",
        body:
          "If the storm opened up your roof, call 314-202-7663 for emergency tarping (Missouri). Taking quick steps to prevent further damage matters to your home and is often expected by insurance carriers.",
      },
    ],
    faqs: [
      [
        "My insurance denied my claim. Can you help?",
        "We don't negotiate claims, but our Free Photo-Documented Report gives you shingle ID and photos of what we see. It's yours to share with your carrier if you'd like a second look.",
      ],
      [
        "How do I know if hail damaged my roof?",
        "Hail damage is often invisible from the ground. Look for dented gutters, downspouts or vents, then have the roof inspected up close. Our report shows you exactly what we find.",
      ],
      [
        "Should I call my insurance company or a roofer first?",
        "Many homeowners get a roof inspection first so they know whether there's real damage before they file. It's your decision, and our report is free either way.",
      ],
      [
        "Are you a storm chaser?",
        "No. We're a local crew based in Waterloo, working across the St. Louis area, and we'll be here long after the storm crews leave.",
      ],
    ],
  },
  {
    slug: "siding",
    kind: "service",
    scope: "exterior",
    navLabel: "Siding",
    title: "Siding Repair & Replacement in St. Louis | RoofingnearmeSTL",
    description:
      "Siding repair and replacement in St. Louis & the Metro East: hail, wind and water damage, photo-documented estimate, financing available. 618-612-5192.",
    eyebrow: "Siding",
    h1: "Siding Repair & Replacement in St. Louis & the Metro East",
    intro:
      "Siding takes a beating from hail, wind and years of weather. We photograph the damage, show you whether a repair or a full replacement makes sense, and handle it with the same local crew that takes care of your roof.",
    defaultService: "Siding",
    sections: [
      {
        heading: "Siding problems we fix",
        body: "We repair what can be repaired and replace what can't:",
        bullets: [
          "Hail-cracked, dented or chipped panels",
          "Loose, warped or missing panels after high winds",
          "Gaps and damaged trim that let water behind the siding",
          "Siding damage found during a roof or storm inspection",
          "Full siding replacement when repairs no longer make sense",
        ],
      },
      {
        heading: "Photos first, then options",
        body:
          "We document siding the same way we document roofs: close-up photos of every problem area and honest Repair vs Replace options. If a storm damaged your siding, the photos are yours to keep and share with your insurance carrier.",
      },
      {
        heading: "Roof and siding, one crew",
        body:
          "Roof and siding damage often come from the same storm. One local crew handling both keeps the details where the roof meets the walls, like flashing and trim, coordinated, with one point of contact for the whole project.",
      },
      {
        heading: "Missouri and Illinois",
        body: `We repair and replace siding on both sides of the river, in Missouri and the Illinois Metro East. Roofing is Missouri only for now (${IL_COMING_SOON.toLowerCase()}). Financing is available on retail siding projects.`,
      },
    ],
    faqs: [
      [
        "Can you repair just a few damaged siding panels?",
        "Often, yes. Whether a repair blends in depends on your siding's age, color and what's still available. We'll show you photos and tell you honestly whether a repair or a replacement makes more sense.",
      ],
      [
        "Does hail damage siding?",
        "Yes. Hail can crack, chip and dent siding, especially on the sides of the house facing the storm. Our photo report documents what we find.",
      ],
      [
        "Do you offer financing for siding?",
        "Yes. Financing is available for retail roof, siding and gutter projects.",
      ],
      [
        "Is siding work covered by a warranty?",
        "Our work is backed by a 10-Year Workmanship Warranty. Ask us how it applies to your siding project.",
      ],
    ],
  },
  {
    slug: "gutters-downspouts",
    kind: "service",
    scope: "exterior",
    navLabel: "Gutters & Downspouts",
    title: "Gutter Installation & Repair in St. Louis | RoofingnearmeSTL",
    description:
      "Gutter and downspout installation and repair in St. Louis & the Metro East: sagging, leaking, overflowing or hail-dented gutters fixed right. 618-612-5192.",
    eyebrow: "Gutters & Downspouts",
    h1: "Gutter & Downspout Installation and Repair in St. Louis & the Metro East",
    intro:
      "Gutters protect your roof edge, siding and foundation. When they sag, overflow or leak, water ends up where it shouldn't. We find the cause, repair or replace the system, and show you photos of the work.",
    defaultService: "Gutters / Downspouts",
    sections: [
      {
        heading: "Gutter problems we fix",
        body: "The most common problems we see:",
        bullets: [
          "Sagging gutters pulling away from the house",
          "Leaking seams and corners",
          "Overflowing gutters and undersized downspouts",
          "Downspouts that dump water next to your foundation",
          "Hail-dented gutters and downspouts",
          "Rotted fascia behind the gutters",
        ],
      },
      {
        heading: "Why gutters matter to your roof",
        body:
          "Overflowing gutters can push water behind the fascia, rot the edge of the roof deck and stain your siding. When we inspect your roof, we check the gutters, downspouts and fascia too, because these problems are connected.",
      },
      {
        heading: "New gutters with a new roof",
        body:
          "Replacing your roof is often the right time to replace worn gutters, so the new drip edge and gutters work together. If your existing gutters still have life left, we'll tell you.",
      },
      {
        heading: "Missouri and Illinois",
        body: `Gutters and downspouts are installed and repaired in both Missouri and the Illinois Metro East. Roofing is Missouri only for now (${IL_COMING_SOON.toLowerCase()}).`,
      },
      {
        heading: "Dented gutters can mean hail damage",
        body:
          "Dented gutters and downspouts are one of the easiest signs of hail to spot from the ground. If you see dents, have the roof looked at too. Our Free Photo-Documented Report covers both.",
      },
    ],
    faqs: [
      [
        "How do I know if my gutters need replacing?",
        "Look for sagging, leaking seams, rust, gutters separating from the house, or water spilling over the sides in heavy rain. We'll inspect them and tell you whether repairs or new gutters make more sense.",
      ],
      [
        "Can you move my downspouts away from my foundation?",
        "Yes. We can re-route downspouts and add extensions so water drains away from your home.",
      ],
      [
        "Do dented gutters mean my roof has hail damage?",
        "Not always, but they're a common sign. Have the roof inspected; our photo report shows exactly what we find.",
      ],
      [
        "Do you install gutters with a new roof?",
        "Yes. We can replace gutters as part of a roof project or on their own.",
      ],
    ],
  },
  {
    slug: "soffit-fascia",
    kind: "service",
    scope: "exterior",
    navLabel: "Soffit & Fascia",
    title: "Soffit & Fascia Repair in St. Louis | RoofingnearmeSTL",
    description:
      "Soffit & fascia repair and replacement in St. Louis & the Metro East: rot, sagging, pests and storm damage fixed at the source. Call 618-612-5192.",
    eyebrow: "Soffit & Fascia",
    h1: "Soffit & Fascia Repair and Replacement in St. Louis & the Metro East",
    intro:
      "Soffit and fascia close off your roof's edge, hold your gutters and help your attic breathe. When they rot, sag or open up, you can get leaks, pests and moisture problems. We find the damage, show you the photos and fix it right.",
    defaultService: "Soffit & Fascia",
    sections: [
      {
        heading: "Signs of soffit and fascia damage",
        body: "Look for these along your roof edge:",
        bullets: [
          "Peeling paint, soft spots or rot on fascia boards",
          "Gutters pulling away from the fascia",
          "Sagging, cracked or missing soffit panels",
          "Water stains along the roof edge",
          "Birds, bees or squirrels getting into the eaves",
          "Storm damage along the eaves",
        ],
      },
      {
        heading: "Why it matters",
        body:
          "Fascia carries the weight of your gutters and seals the roof edge. Soffit lets air into your attic so heat and moisture can escape. When either one fails, the problems spread to the roof deck, rafters and attic.",
      },
      {
        heading: "Fix the cause, not just the board",
        body:
          "Rotted fascia is usually a symptom of overflowing gutters, missing drip edge or a leak at the eaves. We find the source, so your new soffit and fascia last.",
      },
      {
        heading: "Missouri and Illinois",
        body: `Soffit and fascia work is available in both Missouri and the Illinois Metro East. Roofing is Missouri only for now (${IL_COMING_SOON.toLowerCase()}).`,
      },
      {
        heading: "Part of a roof or gutter project",
        body:
          "Soffit and fascia work often goes hand in hand with a new roof or new gutters. One local crew can handle all of it in the same project.",
      },
    ],
    faqs: [
      [
        "What's the difference between soffit and fascia?",
        "Fascia is the board along the edge of your roof where the gutters attach. Soffit is the panel under the overhang that closes in the eaves and often has vents for your attic.",
      ],
      [
        "Can you replace just the damaged sections?",
        "Often, yes. We'll show you photos of the damage and recommend repairing sections or replacing the full run, whichever makes more sense.",
      ],
      [
        "Why does my fascia keep rotting?",
        "Usually water: overflowing or clogged gutters, missing drip edge, or a leak at the roof edge. We find and fix the cause so it doesn't come back.",
      ],
      [
        "Do you offer financing?",
        "Yes. Financing is available on retail projects. Ask during your free evaluation.",
      ],
    ],
  },
];

const coreNames: Record<string, string> = Object.fromEntries(corePages.map((page) => [page.slug, page.navLabel]));
function nameOf(slug: string) {
  const name = coreNames[slug] ?? areaNames[slug];
  if (!name) throw new Error(`Unknown nearby page: ${slug}`);
  return name;
}

export const sitePages: SitePage[] = [...corePages, ...buildAreaPages(nameOf)];

// Fail the build on a broken page list instead of shipping a duplicate URL or a dead "nearby" link.
for (const [index, page] of sitePages.entries()) {
  if (sitePages.findIndex((other) => other.slug === page.slug) !== index) throw new Error(`Duplicate page slug: ${page.slug}`);
  if (page.kind === "city" && (!page.state || !page.county || !page.region || !page.city)) throw new Error(`City page missing location fields: ${page.slug}`);
  page.nearby?.forEach(nameOf);
  if (!LEAD_SERVICES.includes(page.defaultService)) throw new Error(`Unknown defaultService on ${page.slug}: ${page.defaultService}`);
  if (page.state === "IL") assertIllinoisExteriorOnly(page.slug, page.scope, page.defaultService, [page.title, page.description, page.h1, page.intro, ...page.sections.flatMap((x) => [x.heading, x.body, ...(x.bullets ?? [])]), ...page.faqs.flat()]);
}

/**
 * Illinois pages may not offer roofing (no license yet). Fails the build if Illinois page text offers
 * roof work. Allowed: the brand name, "Roofing coming soon after IL license", and the "Roofing in Illinois" note.
 */
export function assertIllinoisExteriorOnly(where: string, scope: Scope, defaultService: string, texts: string[]) {
  if (scope !== "il-exterior") throw new Error(`Illinois page must be exterior-only: ${where}`);
  if (!IL_LEAD_SERVICES.includes(defaultService)) throw new Error(`Illinois page offers a non-exterior service: ${where}`);
  const allowed = /RoofingnearmeSTL|roofing coming soon after il license|roofing in illinois|do you do roofing in|roofing is (available|missouri only)[^.]*/gi;
  const banned = /\broof(er|ers|ing company|ing contractor|ing services?| repair| replacement| inspection| leak|s? (repaired|replaced|inspected))|\b(re-?roof|tarp|tarping|shingles?)\b|replace (your|the) roof|new roof/i;
  for (const text of texts) {
    const hit = text.replace(allowed, "").match(banned);
    if (hit) throw new Error(`Illinois page offers roofing ("${hit[0]}") on ${where}: ${text.slice(0, 120)}`);
  }
}

export const servicePages = sitePages.filter((page) => page.kind === "service");
export const cityPages = sitePages.filter((page) => page.kind === "city");
/** City pages grouped for menus, the homepage and /areas-we-serve. */
export const areaGroups = regions.map((region) => ({ ...region, pages: cityPages.filter((page) => page.region === region.id) }));

/** The county/region note shown on a city page. */
export const regionNote = (page: SitePage) => regions.find((region) => region.id === page.region)?.note ?? "";

export function getSitePage(slug: string) {
  return sitePages.find((page) => page.slug === slug);
}

// Homepage FAQ (also published as FAQPage schema). Same claim rules as above.
export const homeFaqs: [question: string, answer: string][] = [
  ["Do I really need a full roof replacement?", "Don't Replace Yet! Free Photo-Documented Report - Shingle ID, damage evidence, and Repair vs Replace options. We document damage, we don't just sell roofs."],
  ["What's a Photo-Documented Shingle Report?", "We photograph every slope, identify your shingle, document granule loss, bruising, cracks, seal failure. You get photos + honest assessment."],
  ["My insurance denied my claim. Can you help?", "We're roofing contractors, not public adjusters - we don't negotiate claims. What we do provide is a Free Photo-Documented Report: Shingle ID + photos of what we see + Repair vs Replace options. It's yours to keep and share with your carrier if you choose. Many neighbors use it for a second look."],
  ["Are you local or chasing storms?", `We're local, based in Waterloo, IL, and working across the St. Louis area. Not a storm chaser. ${INSURANCE_SENTENCE}. Local. Reliable. Protecting What Matters.`],
  ["How fast do you respond?", "During business hours, we call as soon as we receive your request to reach out with the right information to help you take the next step. Fill out what's needed and we look forward to talking soon and sharing your free photo-documented options. Same-day evaluations when available."],
  ["What warranty?", "10-Year Workmanship Warranty on our work, plus the manufacturer warranty on the materials we install. 5.0★ Google Reviews."],
  ["Do you offer emergency tarping?", "Yes, in Missouri. We offer 24/7 emergency roof repair and tarping across the St. Louis area in Missouri. Call 314-202-7663."],
  ["What areas do you serve?", "Roofing: St. Louis and communities across St. Louis County, St. Charles County, Jefferson County and Franklin County in Missouri, including St. Charles, St. Peters, O'Fallon, Wentzville, Chesterfield, Kirkwood, Florissant, Arnold, Festus and Washington. Siding, gutters, soffit and fascia: those Missouri communities plus the Illinois Metro East, including Waterloo, Columbia, Belleville, O'Fallon, Fairview Heights, Edwardsville, Collinsville, Granite City and Alton. Illinois roofing is coming soon after our IL license."],
  ["How much does a new roof cost?", "In the St. Louis area (Missouri), a 30-year architectural shingle roof runs $450-$750 per square, so most homes with 12-24 squares pay $5,400-$18,000. 3-tab starts at $350 per square; clay, metal and slate are custom quotes. Low pitch is the low end, steep pitch the high end. Try the estimator above, then get a free inspection to lock your price."],
  ["Do you offer financing?", "Yes. Financing is available for retail roof, siding and gutter projects. Ask during your free evaluation."],
  ["What roofing materials do you install?", "Architectural and 3-tab asphalt shingles from Owens Corning, CertainTeed, TAMKO and IKO, plus metal roofing. Clay and slate tile projects are priced after an in-person evaluation."],
  ["Are you insured?", `Yes. Roofing Near Me STL LLC carries commercial general liability insurance with ${INSURANCE.carrier}: $1,000,000 per occurrence and $2,000,000 aggregate. Ask and we'll send a current certificate of insurance. See our accreditation page for details.`],
  ["Do you do gutters and siding too?", "Yes. Siding, gutters, soffit and fascia in Missouri and Illinois, and roofing in Missouri. One local crew."],
  ["What happens during the free evaluation?", "We inspect and photograph every slope, identify your shingle, and document any damage. Then we walk you through honest Repair vs Replace options with the photos in front of you."],
  ["Do I have to hire you after the free report?", "No. The Free Photo-Documented Report is yours to keep, whether you hire us, get other quotes, or share it with your insurance carrier."],
];

export const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61592983316574";
export const FACEBOOK_REVIEWS_URL = `${FACEBOOK_URL}&sk=reviews`;
// Verified Google Business Profile (Maps listing by its Google ID) and its "Ask for reviews" link.
// Vercel env vars can override these without a code change.
export const GOOGLE_BUSINESS_URL = process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_URL || "https://maps.google.com/?cid=14595866484134946559";
export const GOOGLE_REVIEWS_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL || "https://g.page/r/Cf-m5C88747KEAI/review";
// Short link to print, text or email: /review shows both review buttons. QR codes point here.
export const REVIEW_PAGE_URL = `${SITE_URL}/review`;
// Elfsight "Google Reviews" widget shown in the homepage reviews section (dash.elfsight.com).
// Only a well-formed widget ID is used, so a typo can never inject markup.
const elfsightId = process.env.NEXT_PUBLIC_ELFSIGHT_REVIEWS_WIDGET_ID || "6bf35e3e-1fb6-40a4-9085-4bcd335ec3b8";
export const ELFSIGHT_REVIEWS_WIDGET_ID = /^[a-f0-9-]{36}$/.test(elfsightId) ? elfsightId : "";

export const businessSchema = {
  "@type": "RoofingContractor",
  "@id": `${SITE_URL}/#business`,
  name: "RoofingnearmeSTL",
  alternateName: "Roofing Near Me STL",
  legalName: LEGAL_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  image: `${SITE_URL}/og-image.jpg`,
  slogan: "Local. Reliable. Protecting What Matters.",
  telephone: [PHONES.IL.e164, PHONES.MO.e164],
  areaServed: [...cityPages.map((page) => page.navLabel), "St. Louis, MO"].map((name) => ({ "@type": "City", name })),
  knowsAbout: ["Roof repair", "Roof replacement", "Hail and wind damage inspection", "Owens Corning shingles", "CertainTeed shingles", "TAMKO shingles", "IKO shingles", "Metal roofing", "Siding", "Gutters and downspouts", "Soffit and fascia"],
  founder: { "@type": "Person", name: "Mike Williamson" },
  // Roofing is offered in Missouri only; exterior work in Missouri and Illinois.
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Roofing and exterior services",
    itemListElement: [
      ...["Roof replacement", "Roof repair", "Hail and storm damage roof inspection", "Emergency roof tarping"].map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name }, areaServed: { "@type": "State", name: "Missouri" } })),
      ...["Siding", "Gutters and downspouts", "Soffit and fascia"].map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name }, areaServed: [{ "@type": "State", name: "Missouri" }, { "@type": "State", name: "Illinois" }] })),
    ],
  },
  hasCredential: [
    ["Hail Damage Identification", "1772825948-28-1442"],
    ["Wind Damage Identification", "1772943831-29-1442"],
    ["Installation (Asphalt Shingle Roofs)", "1773862133-30-1442"],
    ["Building Code (Asphalt Shingle Roofs)", "1773114388-31-1442"],
  ].map(([name, id]) => ({ "@type": "EducationalOccupationalCredential", name: `Building Experts Institute: ${name}`, identifier: id, credentialCategory: "certificate", recognizedBy: { "@type": "Organization", name: "Building Experts Institute" } })),
  hasMap: GOOGLE_BUSINESS_URL,
  sameAs: [FACEBOOK_URL, GOOGLE_BUSINESS_URL].filter(Boolean),
};

// Google reads WebSite name/alternateName on the homepage to decide the site name it shows in results,
// and it helps Google treat "RoofingnearmeSTL" as this business instead of the phrase "roofing near me stl".
export const websiteSchema = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: "RoofingnearmeSTL",
  alternateName: ["Roofing Near Me STL", "Roofingnearmestl"],
  inLanguage: "en-US",
  publisher: { "@id": `${SITE_URL}/#business` },
};

export function faqSchema(faqs: [question: string, answer: string][]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })),
  };
}

export function jsonLd(data: object) {
  // Escape "<" so text inside the data (e.g. a review) can never close the script tag.
  return { __html: JSON.stringify(data).replace(/</g, String.fromCharCode(92) + "u003c") };
}

export const exteriorProcessSteps: [title: string, body: string][] = [
  ["Call or Request Online", "Tell us what's going on with your siding, gutters, soffit or fascia. During business hours, we call as soon as your request comes in."],
  ["Photo-Documented Look", "We photograph the siding, gutters, downspouts, soffit and fascia and mark any storm damage, rot or loose sections we find."],
  ["Honest Options, In Writing", "You get the photos plus honest repair vs replace options and a written estimate. No pressure, and the photos are yours to keep."],
  ["Repair or Replace, Then Clean-Up", "Our crew does the work and cleans up the job site, backed by our 10-Year Workmanship Warranty."],
];

export const processSteps: [title: string, body: string][] = [
  ["Call or Request Online", "Tell us what's going on. During business hours, we call as soon as your request comes in. Active leak? We offer 24/7 emergency tarping."],
  ["Photo-Documented Inspection", "We inspect and photograph every slope, identify your shingle, and mark any hail or wind damage we find."],
  ["Honest Options, In Writing", "You get the photos plus honest Repair vs Replace options and a written estimate. No pressure, and the report is yours to keep."],
  ["Repair or Replace, Then Clean-Up", "Our crew does the work and cleans up the job site, backed by our 10-Year Workmanship Warranty."],
];

// Building Experts Institute certificates of completion held by Mike Williamson (issued Mar 2026, valid to Mar 2029).
export const certifications = [
  { title: "Hail Damage Identification", subject: "Asphalt Shingle Roofs", number: "1772825948-28-1442", issued: "Mar 06, 2026", expires: "Mar 06, 2029", file: "/certifications/bei-hail-damage-identification.pdf" },
  { title: "Wind Damage Identification", subject: "Asphalt Shingle Roofs", number: "1772943831-29-1442", issued: "Mar 07, 2026", expires: "Mar 07, 2029", file: "/certifications/bei-wind-damage-identification.pdf" },
  { title: "Installation", subject: "Asphalt Shingle Roofs", number: "1773862133-30-1442", issued: "Mar 18, 2026", expires: "Mar 18, 2029", file: "/certifications/bei-asphalt-shingle-installation.pdf" },
  { title: "Building Code", subject: "Asphalt Shingle Roofs", number: "1773114388-31-1442", issued: "Mar 09, 2026", expires: "Mar 09, 2029", file: "/certifications/bei-asphalt-shingle-building-code.pdf" },
];
