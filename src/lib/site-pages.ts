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
    title: "Roof Replacement in St. Louis & Metro East | Roofing Near Me STL",
    description:
      "Roof replacement in Waterloo, Columbia, Belleville & St. Louis. Free photo-documented report first, so you only replace when photos prove you need it. 10-Yr Workmanship Warranty.",
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
    title: "Roof Repair & Leak Repair in St. Louis & Metro East | Roofing Near Me STL",
    description:
      "Roof leak repair in Waterloo, Columbia, Belleville & St. Louis. Leak stopped fast, emergency tarping available, and no pushy replacement pitch unless photos prove you need it.",
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
    title: "Hail & Storm Damage Roof Inspection in St. Louis | Roofing Near Me STL",
    description:
      "Hail or wind damage in Waterloo, Columbia, Belleville or St. Louis? Get a Free Photo-Documented Report with shingle ID and damage photos you can share with your insurance carrier.",
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
    title: "Roofing Company in Waterloo, IL | Roof Repair & Replacement | Roofing Near Me STL",
    description:
      "Local roofer in Waterloo, IL. Roof repair, roof replacement and storm damage inspections with a Free Photo-Documented Report. Call 618-612-5192.",
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
    title: "Roofing Company in Columbia, IL | Roof Repair & Replacement | Roofing Near Me STL",
    description:
      "Local roofer in Columbia, IL. Roof repair, roof replacement and storm damage inspections with a Free Photo-Documented Report. Call 618-612-5192.",
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
    title: "Roofing Company in Belleville, IL | Roof Repair & Replacement | Roofing Near Me STL",
    description:
      "Local roofer in Belleville, IL. Roof repair, roof replacement and storm damage inspections with a Free Photo-Documented Report. Call 618-612-5192.",
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
