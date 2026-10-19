// Content for the service and city landing pages rendered by src/app/[slug]/page.tsx.
// Only use claims the owner has confirmed: 5.0★ Google, 10-Yr Workmanship Warranty, 24/7 emergency
// repair and tarping, financing, metal installs, same-day evaluations when the schedule allows.
// NOT true (do not add): GAF Certified, Owens Corning Preferred, BBB A+, 500+ roofs.

export type SitePage = {
  slug: string;
  kind: "service" | "city";
  navLabel: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  defaultService: string;
  city?: string;
  sections: { heading: string; body: string; bullets?: string[] }[];
  faqs: [question: string, answer: string][];
};

export const SITE_URL = "https://www.roofingnearmestl.com";

export const sitePages: SitePage[] = [
  {
    slug: "roof-replacement",
    kind: "service",
    navLabel: "Roof Replacement",
    title: "Roof Replacement Metro East & St. Louis | RoofingnearmeSTL",
    description:
      "Roof replacement in Waterloo, Columbia, Belleville & St. Louis. Free photo-documented inspection first, real price range, 10-yr workmanship warranty.",
    eyebrow: "Roof Replacement",
    h1: "Roof Replacement in St. Louis & the Metro East",
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
          "Architectural shingle, 3-tab asphalt and metal roofing options",
          "Flashing, vents and drip edge checked and replaced where needed",
          "Gutters, siding, soffit and fascia available in the same project",
          "Job-site clean-up and a final walk-through with you",
          "10-Year Workmanship Warranty",
        ],
      },
      {
        heading: "Signs it may be time for a new roof",
        body:
          "Age alone doesn't decide it. We look for widespread granule loss, curling or cracked shingles, repeated leaks, soft decking, and storm damage across multiple slopes. If only one area is failing, a repair is often the better value, and we'll say so.",
      },
      {
        heading: "Know your price range before anyone visits",
        body:
          "Use the Instant Roof Cost Estimator on our homepage to get a St. Louis price range in three clicks, then request your free evaluation to lock it in. Financing is available on retail projects.",
      },
    ],
    faqs: [
      [
        "How do I know if I need a full roof replacement?",
        "Start with a Free Photo-Documented Report. We photograph every slope, identify your shingle and show you the damage. If a repair makes more sense, we recommend the repair.",
      ],
      [
        "What roofing materials do you install?",
        "Architectural shingles, 3-tab asphalt and metal roofing. Clay and slate tile projects need an in-person evaluation before we can price them.",
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
    navLabel: "Roof Repair",
    title: "Roof Leak Repair Metro East & St. Louis | RoofingnearmeSTL",
    description:
      "Roof leaking? 24/7 emergency tarping and honest roof repair in Waterloo, Columbia, Belleville & St. Louis. Photos before & after. Call 618-612-5192.",
    eyebrow: "Roof Repair",
    h1: "Roof Repair & Leak Repair in St. Louis & the Metro East",
    intro:
      "A leak doesn't automatically mean a new roof. We find the source, stop the water, and show you photos of exactly what we fixed. No pushy replacement pitch unless the photos prove you need one.",
    defaultService: "Roof Repair",
    sections: [
      {
        heading: "Active leak? Call now",
        body:
          "Water coming in today? Call Illinois: 618-612-5192 or Missouri: 314-202-7663. We offer 24/7 emergency roof repair across the St. Louis metro, including emergency tarping to protect your home until a permanent repair can be made.",
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
    navLabel: "Storm Damage & Insurance",
    title: "Hail Damage Roof Inspection Metro East | RoofingnearmeSTL",
    description:
      "Free hail & wind damage roof inspection by a BEI-certified inspector. Photo report you can share with your insurer. Waterloo, Columbia, Belleville, STL.",
    eyebrow: "Storm Damage & Insurance",
    h1: "Hail & Storm Damage Roof Inspections in St. Louis & the Metro East",
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
          "We're your neighbors in Waterloo, Columbia, Belleville and St. Louis. Fully insured with $2M liability and workers' comp, and still here long after the storm crews leave town.",
      },
      {
        heading: "Protect your home right away",
        body:
          "If the storm opened up your roof, call Illinois: 618-612-5192 or Missouri: 314-202-7663 for emergency tarping. Taking quick steps to prevent further damage matters to your home and is often expected by insurance carriers.",
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
        "No. We're local to Waterloo, Columbia, Belleville and St. Louis, and we'll be here long after the storm crews leave.",
      ],
    ],
  },
  {
    slug: "roofing-waterloo-il",
    kind: "city",
    navLabel: "Waterloo, IL",
    city: "Waterloo",
    title: "Roofer in Waterloo, IL | Free Roof Inspection | RoofingnearmeSTL",
    description:
      "Local roofer in Waterloo, IL. Free photo-documented roof inspection by a BEI-certified inspector, repair, replacement & 24/7 tarping. 618-612-5192.",
    eyebrow: "Waterloo, Illinois",
    h1: "Roofing Company in Waterloo, IL",
    intro:
      "Waterloo homeowners call us for leaks, storm damage and full roof replacements, and to find out honestly which one they need. Every visit starts with a Free Photo-Documented Report, so you see your roof before you decide anything.",
    defaultService: "Roof Repair",
    sections: [
      {
        heading: "Roofing services in Waterloo",
        body: "One local crew for your whole exterior:",
        bullets: [
          "Roof leak repair and 24/7 emergency tarping",
          "Full roof replacement: architectural shingle, asphalt and metal",
          "Hail and wind damage inspections with photo documentation",
          "Gutters, siding, soffit and fascia",
        ],
      },
      {
        heading: "Your neighbors, not a storm crew",
        body:
          "A local crew serving Waterloo, Columbia, Belleville and St. Louis. Fully insured with $2M liability and workers' comp, 5.0★ on Google, and every job is backed by a 10-Year Workmanship Warranty.",
      },
      {
        heading: "Fast response in Monroe County",
        body:
          "During business hours, we call as soon as your request comes in. Same-day evaluations are available when our schedule allows. For an active leak, call our Illinois line: 618-612-5192.",
      },
    ],
    faqs: [
      [
        "Do you serve all of Waterloo, IL?",
        "Yes. We work throughout Waterloo and nearby Columbia, plus Belleville and the greater St. Louis area.",
      ],
      [
        "How much does a new roof cost in Waterloo?",
        "It depends on size, pitch and material. Use the Instant Roof Cost Estimator on our homepage for a quick range, then request a free evaluation for an exact quote.",
      ],
      [
        "Can you check my roof after a storm?",
        "Yes. Our Free Photo-Documented Report includes shingle ID and damage photos you can keep and share with your insurance carrier.",
      ],
    ],
  },
  {
    slug: "roofing-columbia-il",
    kind: "city",
    navLabel: "Columbia, IL",
    city: "Columbia",
    title: "Roofer in Columbia, IL | Free Roof Inspection | RoofingnearmeSTL",
    description:
      "Columbia, IL roof inspections by a BEI-certified inspector. Honest repair-or-replace photo report, 24/7 tarping, 10-yr workmanship warranty. 618-612-5192.",
    eyebrow: "Columbia, Illinois",
    h1: "Roofing Company in Columbia, IL",
    intro:
      "Columbia homeowners trust us to tell them the truth about their roof. We photograph what we see, explain your Repair vs Replace options, and only recommend a new roof when the photos prove you need one.",
    defaultService: "Roof Repair",
    sections: [
      {
        heading: "Roofing services in Columbia",
        body: "Everything your roof and exterior need, from one local crew:",
        bullets: [
          "Leak repair and 24/7 emergency tarping",
          "Roof replacement: architectural shingle, asphalt and metal",
          "Hail and wind damage inspections",
          "Gutters, siding, soffit and fascia",
        ],
      },
      {
        heading: "Local, insured and accountable",
        body:
          "A local crew serving Columbia, Waterloo, Belleville and St. Louis. Fully insured with $2M liability and workers' comp, 5.0★ on Google, and a 10-Year Workmanship Warranty on our work.",
      },
      {
        heading: "Quick answers, no pressure",
        body:
          "Request your free evaluation below and we'll call as soon as it comes in during business hours. For a leak happening right now, call 618-612-5192.",
      },
    ],
    faqs: [
      [
        "Do you work in Columbia, IL?",
        "Yes. Columbia is one of our core service areas, along with Waterloo, Belleville and St. Louis.",
      ],
      [
        "Do I need a full replacement or a repair?",
        "Our Free Photo-Documented Report answers that with photos and honest Repair vs Replace options.",
      ],
      [
        "Do you offer financing?",
        "Financing is available for retail roof, siding and gutter projects.",
      ],
    ],
  },
  {
    slug: "roofing-belleville-il",
    kind: "city",
    navLabel: "Belleville, IL",
    city: "Belleville",
    title: "Roofer in Belleville, IL | Free Roof Inspection | RoofingnearmeSTL",
    description:
      "Belleville, IL roofer: free roof inspection by a BEI-certified inspector, honest photo report, 24/7 emergency tarping, 10-yr warranty. Call 618-612-5192.",
    eyebrow: "Belleville, Illinois",
    h1: "Roofing Company in Belleville, IL",
    intro:
      "From quick leak repairs to full replacements, Belleville homeowners get the same promise from us: photos first, honest options, and no pushy sales. You decide with the facts in front of you.",
    defaultService: "Roof Repair",
    sections: [
      {
        heading: "Roofing services in Belleville",
        body: "One local crew for roofs and exteriors:",
        bullets: [
          "Roof leak repair and 24/7 emergency tarping",
          "Full roof replacement: architectural shingle, asphalt and metal",
          "Storm and hail damage inspections with photo reports",
          "Gutters, siding, soffit and fascia",
        ],
      },
      {
        heading: "Why Belleville neighbors choose us",
        body:
          "A local crew serving Belleville, Waterloo, Columbia and St. Louis. Fully insured with $2M liability and workers' comp, 5.0★ on Google, and backed by a 10-Year Workmanship Warranty.",
      },
      {
        heading: "Fast response across St. Clair County",
        body:
          "During business hours, we call as soon as your request arrives, and same-day evaluations are available when our schedule allows. Active leak? Call 618-612-5192.",
      },
    ],
    faqs: [
      [
        "Do you serve Belleville, IL?",
        "Yes. Belleville is one of our core service areas, along with Waterloo, Columbia and St. Louis.",
      ],
      [
        "Can you inspect my roof after hail?",
        "Yes. You'll get a Free Photo-Documented Report with shingle ID and damage photos you can share with your insurance carrier.",
      ],
      [
        "How fast can you get here?",
        "We call as soon as your request comes in during business hours, and same-day evaluations are available when our schedule allows.",
      ],
    ],
  },
];

export function getSitePage(slug: string) {
  return sitePages.find((page) => page.slug === slug);
}

// Homepage FAQ (also published as FAQPage schema). Same claim rules as above.
export const homeFaqs: [question: string, answer: string][] = [
  ["Do I really need a full roof replacement?", "Don't Replace Yet! Free Photo-Documented Report - Shingle ID, damage evidence, and Repair vs Replace options. We document damage, we don't just sell roofs."],
  ["What's a Photo-Documented Shingle Report?", "We photograph every slope, identify your shingle, document granule loss, bruising, cracks, seal failure. You get photos + honest assessment."],
  ["My insurance denied my claim. Can you help?", "We're roofing contractors, not public adjusters - we don't negotiate claims. What we do provide is a Free Photo-Documented Report: Shingle ID + photos of what we see + Repair vs Replace options. It's yours to keep and share with your carrier if you choose. Many neighbors use it for a second look."],
  ["Are you local or chasing storms?", "We're your neighbors - Waterloo • Columbia • Belleville • STL. Not a storm chaser. Fully Insured $2M Liability + Workers Comp. Local. Reliable. Protecting What Matters."],
  ["How fast do you respond?", "During business hours, we call as soon as we receive your request to reach out with the right information to help you take the next step. Fill out what's needed and we look forward to talking soon and sharing your free photo-documented options. Same-day evaluations when available."],
  ["What warranty?", "10-Year Workmanship Warranty on our work, plus the manufacturer warranty on the materials we install. 5.0★ Google Reviews."],
  ["Do you offer emergency tarping?", "Yes. We offer 24/7 emergency roof repair and tarping across the St. Louis metro. Call Illinois: 618-612-5192 or Missouri: 314-202-7663."],
  ["What areas do you serve?", "Waterloo, Columbia and Belleville in Illinois, plus St. Louis and the surrounding Missouri metro."],
  ["How much does a new roof cost?", "It depends on roof size, pitch and material. Use our Instant Roof Cost Estimator above for a quick St. Louis price range, then request a free evaluation for an exact quote. Clay and slate tile need an in-person evaluation."],
  ["Do you offer financing?", "Yes. Financing is available for retail roof, siding and gutter projects. Ask during your free evaluation."],
  ["What roofing materials do you install?", "Architectural shingles, 3-tab asphalt and metal roofing. Clay and slate tile projects are priced after an in-person evaluation."],
  ["Are you insured?", "Yes. We're fully insured with $2M general liability and workers' compensation coverage."],
  ["Do you do gutters and siding too?", "Yes. Roof, siding, gutters, soffit and fascia. One local crew."],
  ["What happens during the free evaluation?", "We inspect and photograph every slope, identify your shingle, and document any damage. Then we walk you through honest Repair vs Replace options with the photos in front of you."],
  ["Do I have to hire you after the free report?", "No. The Free Photo-Documented Report is yours to keep, whether you hire us, get other quotes, or share it with your insurance carrier."],
];

export const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61592983316574";
// Public Google Business Profile (Maps "Share" link) and review link, set in Vercel when available.
export const GOOGLE_BUSINESS_URL = process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_URL || "";
export const GOOGLE_REVIEWS_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL || "";

export const businessSchema = {
  "@type": "RoofingContractor",
  "@id": `${SITE_URL}/#business`,
  name: "RoofingnearmeSTL",
  alternateName: "Roofing Near Me STL",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  image: `${SITE_URL}/og-image.jpg`,
  slogan: "Local. Reliable. Protecting What Matters.",
  telephone: ["+1-618-612-5192", "+1-314-202-7663"],
  areaServed: ["Waterloo, IL", "Columbia, IL", "Belleville, IL", "St. Louis, MO"].map((name) => ({ "@type": "City", name })),
  sameAs: [FACEBOOK_URL, GOOGLE_BUSINESS_URL].filter(Boolean),
};

export function faqSchema(faqs: [question: string, answer: string][]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })),
  };
}

export function jsonLd(data: object) {
  return { __html: JSON.stringify(data).replace(/</g, "\u003c") };
}

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
