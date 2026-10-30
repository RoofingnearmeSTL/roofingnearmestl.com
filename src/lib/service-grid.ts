// City + service pages: /services/<service>/<city>-<st>, e.g. /services/roof-replacement/st-charles-mo.
// BUSINESS RULE: roofing services are Missouri-only. Illinois cities get siding, gutters and soffit/fascia only,
// never /services/roof-repair/waterloo-il. The checks at the bottom fail the build if that is ever broken.
import { INSURANCE_SENTENCE, IL_LEAD_SERVICES, PHONES, offersRoofing, type State } from "./business";
import { IL_COMING_SOON, priceRange, usd } from "./pricing";
import { assertIllinoisExteriorOnly, cityPages, regionNote, type Scope, type SitePage } from "./site-pages";

type Section = SitePage["sections"][number];
type Faq = [question: string, answer: string];

type City = { key: string; page: SitePage; place: string; state: State };

export type GridService = {
  key: string;
  label: string;
  /** The service's main page (/roof-replacement etc.). */
  hub: string;
  roofing: boolean;
  leadService: string;
  title: (place: string) => string;
  shortTitle: (place: string) => string;
  description: (place: string, city: string) => string;
  h1: (place: string) => string;
  intros: ((city: string, county: string) => string)[];
  sections: (city: City) => Section[];
  faqs: (city: City) => Faq[];
};

// ---------- which cities get which services (owner's list) ----------
export const MO_GRID_CITIES = ["st-charles", "kirkwood", "arnold", "ofallon", "ballwin", "chesterfield", "florissant", "st-peters"];
export const IL_GRID_CITIES = ["waterloo", "columbia", "belleville", "ofallon", "edwardsville", "collinsville", "granite-city", "fairview-heights"];

const [p12, p18, p24] = [12, 18, 24].map((sq) => priceRange(sq, "architectural"));
const priceSentence = `Our 2026 Missouri pricing for a 30-year architectural shingle roof: ${usd(p12.low)}-${usd(p12.high)} for about 1,200 sq ft of roof, ${usd(p18.low)}-${usd(p18.high)} for 1,800 and ${usd(p24.low)}-${usd(p24.high)} for 2,400. Low-pitch roofs land at the low end, steep roofs at the high end. 3-tab costs less; premium, clay, metal and slate are custom quotes.`;
const trust = (where: string): Section => ({ heading: "Local, insured and accountable", body: `A local crew based in Waterloo, IL, serving ${where}. ${INSURANCE_SENTENCE}, 5.0★ on Google, and our work is backed by a 10-Year Workmanship Warranty.` });
const ilNote = (city: string): Section => ({ heading: "Roofing in Illinois", body: `${IL_COMING_SOON}. Today in ${city} we repair and replace siding, gutters, downspouts, soffit and fascia.` });
const callFaq = (c: City): Faq => [`Which number should I call in ${c.page.city}?`, c.state === "MO"
  ? `Call our Missouri line at ${PHONES.MO.display}. For an active leak, emergency tarping is available 24/7. Or request a free inspection online and we'll call as soon as it comes in during business hours.`
  : `Call our Illinois line at ${PHONES.IL.display}, or request a free estimate online and we'll call as soon as it comes in during business hours.`];
const ilRoofFaq = (c: City): Faq => [`Do you do roofing in ${c.place}?`, `Not yet. ${IL_COMING_SOON}. Today we handle siding, gutters, downspouts, soffit and fascia in ${c.page.city}.`];
const local = (c: City, heading: string): Section => ({ heading, body: c.page.sections[0].body });
const region = (c: City): Section => ({ heading: c.state === "MO" ? `Roofs across ${c.page.county}` : `Homes across ${c.page.county}`, body: regionNote(c.page) });
const fit = (long: string, short: string) => (long.length <= 66 ? long : short);

// ---------- services ----------
export const GRID_SERVICES: GridService[] = [
  {
    key: "roof-replacement", label: "Roof Replacement", hub: "/roof-replacement", roofing: true, leadService: "Roof Replacement",
    title: (place) => fit(`Roof Replacement in ${place} | RoofingnearmeSTL`, `Roof Replacement, ${place}`),
    shortTitle: (place) => `Roof Replacement in ${place}`,
    description: (place) => `Roof replacement in ${place}: instant cost estimate, free photo-documented inspection, 10-yr workmanship warranty. ${PHONES.MO.display}.`,
    h1: (place) => `Roof Replacement in ${place}`,
    intros: [
      (city) => `Thinking about a new roof in ${city}? We start with a free photo-documented inspection, show you every slope and give you a written price, so you know whether you need a full replacement or just a repair.`,
      (city, county) => `${city} homeowners across ${county} get the same straight answer from us: photos of what we found, a clear written price, and no pressure to replace a roof that still has life left.`,
      (city) => `A roof replacement in ${city} is a big decision. Our free photo report, instant online estimate and 10-year workmanship warranty make it easy to check before you sign anything.`,
    ],
    sections: (c) => [
      { heading: `What a new roof costs in ${c.page.city}`, body: priceSentence },
      local(c, `Roofs in ${c.page.city}: what we look for`),
      region(c),
      { heading: "What's included", body: "One local crew from tear-off to clean-up:", bullets: ["Full tear-off down to the deck and a deck inspection", "Architectural and 3-tab shingles from Owens Corning, CertainTeed, TAMKO and IKO", "Flashing, vents and drip edge checked and replaced where needed", "Gutters, siding, soffit and fascia in the same project if you need them", "Job-site clean-up and a final walk-through with you", "10-Year Workmanship Warranty"] },
      trust(`${c.page.city} and the St. Louis area`),
    ],
    faqs: (c) => [
      [`How much does a new roof cost in ${c.page.city}?`, `Most homes with 12-24 squares (about 1,200-2,400 sq ft of roof) pay ${usd(p12.low)}-${usd(p24.high)} for a 30-year architectural roof. Pitch decides where you land in the range. Try the estimator on this page, then get a free inspection to lock your price.`],
      ["Do I really need a full replacement?", "Not always. Our Free Photo-Documented Report shows every slope, identifies your shingle and gives you honest Repair vs Replace options. If a repair will do, we say so."],
      [`Which shingles do you install in ${c.page.city}?`, "Owens Corning, CertainTeed, TAMKO and IKO architectural and 3-tab shingles, plus metal roofing (custom quote)."],
      callFaq(c),
    ],
  },
  {
    key: "roof-repair", label: "Roof Repair", hub: "/roof-repair", roofing: true, leadService: "Roof Repair",
    title: (place) => fit(`Roof Repair in ${place} | RoofingnearmeSTL`, `Roof Repair, ${place}`),
    shortTitle: (place) => `Roof Repair in ${place}`,
    description: (place) => `Roof repair in ${place}: leaks, flashing, missing shingles and 24/7 emergency tarping. Photos before & after, 10-yr workmanship warranty. ${PHONES.MO.display}.`,
    h1: (place) => `Roof Repair & Leak Repair in ${place}`,
    intros: [
      (city) => `A leak in ${city} doesn't automatically mean a new roof. We find the source, stop the water and show you photos of exactly what we fixed.`,
      (city, county) => `From a few missing shingles to a leak around the chimney, we repair roofs across ${city} and ${county}, with before-and-after photos so you know the job was done right.`,
      (city) => `Roof leaking in ${city}? Call for 24/7 emergency tarping, then get an honest repair: no replacement pitch unless the photos prove you need one.`,
    ],
    sections: (c) => [
      { heading: `Active leak in ${c.page.city}? Call now`, body: `Water coming in today? Call ${PHONES.MO.display}. We offer 24/7 emergency roof repair and tarping to protect your home until a permanent repair can be made.` },
      { heading: "Common repairs we handle", body: "Most leaks come from a handful of spots. We check them all:", bullets: ["Missing, lifted or wind-damaged shingles", "Flashing around chimneys, walls and skylights", "Pipe boots and roof vents", "Valleys and low-slope transitions", "Hail-bruised or cracked shingles", "Gutter, soffit and fascia damage that lets water in"] },
      local(c, `Roofs in ${c.page.city}: what we look for`),
      region(c),
      { heading: "Repair or replace? We'll tell you honestly", body: "If your roof has plenty of life left, a repair is usually the smart move. If the damage is widespread, we'll show you the photos and what a replacement would cost." },
      trust(`${c.page.city} and the St. Louis area`),
    ],
    faqs: (c) => [
      [`Can you fix a roof leak in ${c.page.city} the same day?`, "Same-day evaluations are available when our schedule allows. For an active leak, call and we can tarp the area to stop further damage until the permanent repair is done."],
      ["Will you try to sell me a whole new roof?", "No. We document damage, we don't just sell roofs. You get photos and honest Repair vs Replace options, and the decision is yours."],
      ["Is my repair covered by a warranty?", "Our work is backed by a 10-Year Workmanship Warranty. Ask us how it applies to your specific repair."],
      callFaq(c),
    ],
  },
  {
    key: "storm-damage", label: "Hail & Storm Damage", hub: "/storm-damage-insurance", roofing: true, leadService: "Storm Damage / Insurance",
    // No "Repair" here: the town's roof repair page owns repair searches (one page per search).
    title: (place) => fit(`Hail & Storm Damage Inspection in ${place} | RoofingnearmeSTL`, `Hail & Storm Damage, ${place}`),
    shortTitle: (place) => `Hail & Storm Damage in ${place}`,
    description: (place, city) => `Hail or wind hit ${city}? Free photo-documented roof inspection by a BEI-certified inspector: shingle ID, hail hits marked, honest options. ${PHONES.MO.display}.`,
    h1: (place) => `Hail & Storm Damage Roof Inspections in ${place}`,
    intros: [
      (city) => `After hail or high winds in ${city}, you need to know what really happened to your roof. Our Free Photo-Documented Report gives you shingle identification and clear photos of the damage.`,
      (city, county) => `Storms hit ${county} hard. If your ${city} roof took hail or wind, we document every slope so you can decide what to do next with facts in hand.`,
      (city) => `Dented gutters or shingles in the yard after a storm in ${city}? Get a free, photo-documented roof inspection before you call anyone else.`,
    ],
    sections: (c) => [
      { heading: "What's in your storm damage report", body: "We photograph every slope and document what we find:", bullets: ["Shingle identification (brand, style and approximate age)", "Hail bruising, cracks and granule loss", "Lifted, creased or missing shingles from wind", "Damage to vents, flashing, gutters and siding", "Honest Repair vs Replace options"] },
      { heading: "How we work with insurance", body: "We're roofing contractors, not public adjusters, so we don't negotiate claims. We provide the documentation: a photo report that's yours to keep and share with your insurance carrier if you choose. If the claim is approved, we can do the work." },
      local(c, `Roofs in ${c.page.city}: what we look for`),
      region(c),
      { heading: "Protect your home right away", body: `If the storm opened up your roof, call ${PHONES.MO.display} for emergency tarping. Quick steps to prevent further damage matter to your home and are often expected by insurance carriers.` },
      trust(`${c.page.city} and the St. Louis area`),
    ],
    faqs: (c) => [
      [`How do I know if hail damaged my roof in ${c.page.city}?`, "Hail damage is often invisible from the ground. Look for dented gutters, downspouts or vents, then have the roof inspected up close. Our report shows exactly what we find."],
      ["Should I call my insurance company or a roofer first?", "Many homeowners get a roof inspection first so they know whether there's real damage before they file. It's your decision, and our report is free either way."],
      ["My insurance denied my claim. Can you help?", "We don't negotiate claims, but our Free Photo-Documented Report gives you shingle ID and photos of what we see. It's yours to share with your carrier if you'd like a second look."],
      callFaq(c),
    ],
  },
  {
    key: "siding", label: "Siding", hub: "/siding", roofing: false, leadService: "Siding",
    title: (place) => fit(`Siding Repair & Replacement in ${place} | RoofingnearmeSTL`, `Siding Repair in ${place} | RoofingnearmeSTL`),
    shortTitle: (place) => `Siding in ${place}`,
    description: (place) => `Siding repair and replacement in ${place}: hail, wind and water damage fixed, photos first, 10-yr workmanship warranty. Call ${PHONES.IL.display}.`,
    h1: (place) => `Siding Repair & Replacement in ${place}`,
    intros: [
      (city) => `Cracked, loose or faded siding in ${city}? We photograph the damage, tell you honestly whether a repair or a full replacement makes sense, and give you a written estimate.`,
      (city, county) => `Siding across ${county} takes hail, wind and years of sun. In ${city} we repair what can be repaired and replace what can't, with photos before and after.`,
      (city) => `New siding or a few replaced panels: ${city} homeowners get a straight answer, clear photos and a written price from one local crew.`,
    ],
    sections: (c) => [
      { heading: "Siding problems we fix", body: "We repair what can be repaired and replace what can't:", bullets: ["Hail-cracked, dented or chipped panels", "Loose, warped or missing panels after high winds", "Gaps and damaged trim that let water behind the siding", "Full siding replacement when repairs no longer make sense"] },
      local(c, `Exteriors in ${c.page.city}: what we look for`),
      region(c),
      { heading: "Photos first, then options", body: "You get close-up photos of every problem area and honest repair vs replace options. If a storm damaged your siding, the photos are yours to keep and share with your insurance carrier." },
      ilNote(c.page.city!),
      trust(`${c.page.city} and the Metro East`),
    ],
    faqs: (c) => [
      [`Can you repair just a few siding panels in ${c.page.city}?`, "Often, yes. Whether a repair blends in depends on your siding's age, color and what's still available. We'll show you photos and tell you honestly which makes more sense."],
      ["Does hail damage siding?", "Yes. Hail can crack, chip and dent siding, especially on the sides of the house facing the storm. Our photos document what we find."],
      ilRoofFaq(c),
      callFaq(c),
    ],
  },
  {
    key: "gutters", label: "Gutters & Downspouts", hub: "/gutters-downspouts", roofing: false, leadService: "Gutters / Downspouts",
    title: (place) => fit(`Gutters & Downspouts in ${place} | RoofingnearmeSTL`, `Gutters & Downspouts, ${place}`),
    shortTitle: (place) => `Gutters in ${place}`,
    description: (place) => `Gutter and downspout installation and repair in ${place}: sagging, leaking or overflowing gutters fixed, downspouts re-routed. Call ${PHONES.IL.display}.`,
    h1: (place) => `Gutter & Downspout Installation and Repair in ${place}`,
    intros: [
      (city) => `Gutters protect your siding, fascia and foundation. When they sag, overflow or leak in ${city}, we find the cause, repair or replace the system, and show you photos of the work.`,
      (city, county) => `Heavy storms across ${county} test every gutter. In ${city} we fix leaking seams and sagging runs, install new gutters and move downspouts so water drains away from your home.`,
      (city) => `Water spilling over your gutters in ${city}? A local crew, clear photos and a written estimate: new gutters only when repairs won't do.`,
    ],
    sections: (c) => [
      { heading: "Gutter problems we fix", body: "The most common problems we see:", bullets: ["Sagging gutters pulling away from the house", "Leaking seams and corners", "Overflowing gutters and undersized downspouts", "Downspouts that dump water next to your foundation", "Hail-dented gutters and downspouts", "Rotted fascia behind the gutters"] },
      local(c, `Exteriors in ${c.page.city}: what we look for`),
      region(c),
      { heading: "Why gutters matter", body: "Overflowing gutters push water behind the fascia, stain siding and pool next to your foundation. Fixing the gutters, downspouts and fascia together stops the problem at the source." },
      ilNote(c.page.city!),
      trust(`${c.page.city} and the Metro East`),
    ],
    faqs: (c) => [
      [`How do I know if my gutters need replacing in ${c.page.city}?`, "Look for sagging, leaking seams, rust, gutters pulling away from the house, or water spilling over the sides in heavy rain. We'll tell you whether repairs or new gutters make more sense."],
      ["Can you move my downspouts away from my foundation?", "Yes. We can re-route downspouts and add extensions so water drains away from your home."],
      ilRoofFaq(c),
      callFaq(c),
    ],
  },
  {
    key: "soffit-fascia", label: "Soffit & Fascia", hub: "/soffit-fascia", roofing: false, leadService: "Soffit & Fascia",
    title: (place) => fit(`Soffit & Fascia Repair in ${place} | RoofingnearmeSTL`, `Soffit & Fascia Repair, ${place}`),
    shortTitle: (place) => `Soffit & Fascia in ${place}`,
    description: (place) => `Soffit and fascia repair and replacement in ${place}: rot, sagging, pests and storm damage fixed at the source. Free estimate. Call ${PHONES.IL.display}.`,
    h1: (place) => `Soffit & Fascia Repair and Replacement in ${place}`,
    intros: [
      (city) => `Soffit and fascia close off the edge of your home, hold your gutters and help your attic breathe. When they rot, sag or open up in ${city}, we find the cause and fix it right.`,
      (city, county) => `Peeling, soft or sagging fascia is common on older homes across ${county}. In ${city} we replace damaged sections or full runs and fix the water problem behind them.`,
      (city) => `Birds in the eaves or gutters pulling away in ${city}? It usually starts with the soffit and fascia. We show you photos and give you a written estimate.`,
    ],
    sections: (c) => [
      { heading: "Signs of soffit and fascia damage", body: "Look for these along the edge of your home:", bullets: ["Peeling paint, soft spots or rot on fascia boards", "Gutters pulling away from the fascia", "Sagging, cracked or missing soffit panels", "Birds, bees or squirrels getting into the eaves", "Storm damage along the eaves"] },
      local(c, `Exteriors in ${c.page.city}: what we look for`),
      region(c),
      { heading: "Fix the cause, not just the board", body: "Rotted fascia is usually a symptom of overflowing gutters or water getting in at the eaves. We find the source, so your new soffit and fascia last." },
      ilNote(c.page.city!),
      trust(`${c.page.city} and the Metro East`),
    ],
    faqs: (c) => [
      ["What's the difference between soffit and fascia?", "Fascia is the board along the edge of your roofline where the gutters attach. Soffit is the panel underneath the overhang that closes in the eaves and often has vents for your attic."],
      [`Can you replace just the damaged sections in ${c.page.city}?`, "Often, yes. We'll show you photos and recommend repairing sections or replacing the full run, whichever makes more sense."],
      ilRoofFaq(c),
      callFaq(c),
    ],
  },
];

const MO_SERVICES = ["roof-replacement", "roof-repair", "storm-damage"];
const IL_SERVICES = ["siding", "gutters", "soffit-fascia"];

function cityFor(key: string, state: State): City {
  const page = cityPages.find((candidate) => candidate.state === state && candidate.slug === (state === "MO" ? `roofing-${key}-mo` : `siding-gutters-${key}-il`));
  if (!page) throw new Error(`Grid city has no city page: ${key}-${state.toLowerCase()}`);
  return { key: `${key}-${state.toLowerCase()}`, page, place: page.navLabel, state };
}

export type GridPage = {
  path: string;
  service: GridService;
  city: City;
  scope: Scope;
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: Section[];
  faqs: Faq[];
};

const entries: [string, State][] = [...MO_GRID_CITIES.map((key) => [key, "MO"] as [string, State]), ...IL_GRID_CITIES.map((key) => [key, "IL"] as [string, State])];
export const gridPages: GridPage[] = entries.flatMap(([key, state], cityIndex) => {
  const city = cityFor(key, state);
  return (state === "MO" ? MO_SERVICES : IL_SERVICES).map((serviceKey) => {
    const service = GRID_SERVICES.find((candidate) => candidate.key === serviceKey)!;
    return {
      path: `/services/${service.key}/${city.key}`,
      service,
      city,
      scope: (state === "MO" ? "roofing" : "il-exterior") as Scope,
      title: service.title(city.place),
      description: service.description(city.place, city.page.city!),
      h1: service.h1(city.place),
      intro: service.intros[cityIndex % service.intros.length](city.page.city!, city.page.county!),
      sections: service.sections(city),
      faqs: service.faqs(city),
    };
  });
});

// ---------- build-time rules ----------
for (const page of gridPages) {
  if (page.service.roofing && !offersRoofing(page.city.state)) throw new Error(`Roofing page for a non-roofing state: ${page.path}`);
  if (page.city.state === "IL") {
    if (!IL_LEAD_SERVICES.includes(page.service.leadService)) throw new Error(`Illinois grid page offers ${page.service.leadService}: ${page.path}`);
    assertIllinoisExteriorOnly(page.path, page.scope, page.service.leadService, [page.title, page.description, page.h1, page.intro, ...page.sections.flatMap((x) => [x.heading, x.body, ...(x.bullets ?? [])]), ...page.faqs.flat()]);
  }
  if (page.description.length > 160) throw new Error(`Meta description over 160 characters: ${page.path}`);
}

export const getGridPage = (service: string, city: string) => gridPages.find((page) => page.path === `/services/${service}/${city}`);
/** Same service in other grid cities of the same state (for "nearby" links). */
export const sameServiceElsewhere = (page: GridPage) => gridPages.filter((other) => other.service.key === page.service.key && other.city.state === page.city.state && other.path !== page.path);
/** Grid pages for one city page (for links from the city page). */
export const gridPagesForCity = (citySlug: string) => gridPages.filter((page) => page.city.page.slug === citySlug);
/** Grid pages for one service hub (for links from the service page). */
export const gridPagesForHub = (hub: string) => gridPages.filter((page) => page.service.hub === hub);
