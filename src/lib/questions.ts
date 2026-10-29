// Q&A library (/questions/<slug>) written for Google AI Overviews and answer engines:
// the direct answer comes first, in 40-60 words, then the detail. Roofing answers are Missouri-only.
import { IL_COMING_SOON, priceRange, usd } from "./pricing";

export type Question = {
  slug: string;
  question: string;
  title: string;
  description: string;
  /** The first thing on the page: a 40-60 word answer. */
  answer: string;
  sections: { heading: string; body: string; bullets?: string[] }[];
  related: { href: string; label: string }[];
  datePublished: string;
};

const [p12, p18, p24] = [12, 18, 24].map((sq) => priceRange(sq, "architectural"));

export const questions: Question[] = [
  {
    slug: "will-insurance-pay-for-a-new-roof-in-missouri",
    question: "Will insurance pay for a new roof in Missouri?",
    title: "Will Insurance Pay for a New Roof in Missouri? | RoofingnearmeSTL",
    description: "Usually only for sudden hail or wind damage, not age or wear. How Missouri homeowners policies pay for roofs, RCV vs ACV, and what to do first.",
    answer: "Usually only when a sudden, covered event like hail or wind damaged the roof, not age or normal wear. How much is paid depends on your policy (replacement cost or actual cash value), your deductible and the adjuster's findings. A photo-documented roof inspection before you file shows what damage actually exists.",
    sections: [
      { heading: "What homeowners policies usually cover", body: "Most policies cover sudden, accidental damage and exclude wear and tear. Coverage varies, so your policy wording decides:", bullets: ["Usually covered: hail damage, wind damage, a tree or limb falling on the roof", "Usually not covered: old age, granule loss from wear, poor maintenance, slow leaks that were ignored", "Sometimes limited: older roofs, cosmetic hail damage, or roofs with a separate wind/hail deductible"] },
      { heading: "Replacement cost vs actual cash value", body: "A replacement cost value (RCV) policy pays what it costs to replace the roof, minus your deductible; part of it may be paid after the work is done. An actual cash value (ACV) policy subtracts depreciation for the roof's age, so an older roof gets less. Check your declarations page to see which you have." },
      { heading: "What to do after a storm", body: "A simple order that protects you:", bullets: ["Stop more damage: if water is coming in, get the roof tarped (we offer 24/7 emergency tarping in Missouri)", "Take photos of anything you can see from the ground: dented gutters, shingles in the yard", "Get a photo-documented roof inspection so you know whether there's real damage", "If there is, call your insurance company and file the claim", "Meet the adjuster, then compare their estimate with what was documented"] },
      { heading: "How we help, and what we don't do", body: "We're roofing contractors, not public adjusters, so we don't negotiate claims. We document the damage with a free photo report that's yours to keep and share with your carrier, and if the claim is approved we can do the work. Roofing is offered in Missouri; " + IL_COMING_SOON.toLowerCase() + "." },
      { heading: "Good to know", body: "This is general information, not insurance or legal advice. Your policy, your insurer and the adjuster's findings decide what's paid." },
    ],
    related: [
      { href: "/storm-damage-insurance", label: "Hail & storm damage inspections" },
      { href: "/questions/how-much-does-a-new-roof-cost-in-missouri", label: "How much does a new roof cost in Missouri?" },
      { href: "/blog/roof-replacement-cost-st-louis-mo", label: "2026 St. Louis roof cost guide" },
    ],
    datePublished: "2026-10-20",
  },
  {
    slug: "how-much-does-a-new-roof-cost-in-missouri",
    question: "How much does a new roof cost in Missouri?",
    title: "How Much Does a New Roof Cost in Missouri? (2026) | RoofingnearmeSTL",
    description: `St. Louis-area roof replacement with 30-yr architectural shingles runs ${usd(p12.low)}-${usd(p24.high)} for most homes. Prices by roof size, pitch and shingle.`,
    answer: `In the St. Louis area, a 30-year architectural shingle roof costs about ${usd(p12.low)}-${usd(p24.high)} for most homes (12-24 squares, about 1,200-2,400 sq ft of roof). 3-tab shingles cost less. Low-pitch roofs land at the low end and steep roofs at the high end; clay, metal and slate are custom quotes.`,
    sections: [
      { heading: "Typical prices by roof size (30-year architectural)", body: `12 squares (about 1,200 sq ft of roof): ${usd(p12.low)}-${usd(p12.high)}. 18 squares (about 1,800 sq ft): ${usd(p18.low)}-${usd(p18.high)}. 24 squares (about 2,400 sq ft): ${usd(p24.low)}-${usd(p24.high)}.` },
      { heading: "Why pitch matters", body: "Steeper roofs take more time, safety gear and care, so they cost more. We price low-pitch roofs (2/12-4/12) at the low end of the range, medium pitch (5/12-7/12) in the middle and steep roofs (8/12 and up) at the high end." },
      { heading: "What can change your final price", body: "Your free inspection sets the final number. Common reasons it moves:", bullets: ["Roof decking that needs replacing once the old shingles are off", "More than one layer of old shingles to tear off", "Chimneys, skylights and walls that need new flashing", "Ventilation that needs to be added or corrected"] },
      { heading: "Where these prices apply", body: `These are our 2026 prices for roofing in the St. Louis area of Missouri. ${IL_COMING_SOON}; in Illinois we offer siding, gutters, soffit and fascia.` },
    ],
    related: [
      { href: "/blog/roof-replacement-cost-st-louis-mo", label: "Full cost guide + estimator" },
      { href: "/roof-replacement", label: "Roof replacement" },
      { href: "/questions/will-insurance-pay-for-a-new-roof-in-missouri", label: "Will insurance pay for a new roof?" },
    ],
    datePublished: "2026-10-20",
  },
  {
    slug: "signs-you-need-new-gutters",
    question: "What are the signs you need new gutters?",
    title: "Signs You Need New Gutters (and When to Repair) | RoofingnearmeSTL",
    description: "Sagging, leaking seams, rust, overflowing in rain, rotted fascia or water at your foundation. How to tell if your gutters need repair or replacement.",
    answer: "Replace gutters when you see sagging or gutters pulling away from the house, leaking seams, rust or cracks, water spilling over the sides in heavy rain, peeling paint or rot on the fascia behind them, or water pooling near your foundation. One or two problems can often be repaired; several together usually mean it's time for new gutters.",
    sections: [
      { heading: "The warning signs, one by one", body: "Walk around your home during or right after a heavy rain and look for:", bullets: ["Sagging runs or gutters pulling away from the fascia", "Drips or streaks at seams and corners", "Rust spots, cracks or holes", "Water spilling over the front edge even when the gutters are clean", "Peeling paint, soft spots or rot on the fascia boards", "Downspouts emptying right next to the foundation, or puddles and washed-out mulch there", "Dents after a hail storm"] },
      { heading: "Repair or replace?", body: "A leaking seam, a loose hanger or a single dented section can usually be repaired. When gutters sag in several places, leak at many seams, are rusting through, or keep overflowing because they're undersized, replacing the system is usually the better value." },
      { heading: "Fix the fascia at the same time", body: "Overflowing gutters soak the fascia board they hang on. If the fascia is soft or rotted, it should be replaced before new gutters go up, or the new gutters won't hold." },
      { heading: "Where we do gutter work", body: "We install and repair gutters and downspouts in both Missouri and the Illinois Metro East, including Waterloo, Columbia, Belleville, Edwardsville and St. Louis-area Missouri towns." },
    ],
    related: [
      { href: "/gutters-downspouts", label: "Gutters & downspouts" },
      { href: "/soffit-fascia", label: "Soffit & fascia" },
      { href: "/services/gutters/waterloo-il", label: "Gutters in Waterloo, IL" },
    ],
    datePublished: "2026-10-20",
  },
];

// Answers must open with 40-60 words (checked at build time).
for (const q of questions) {
  const words = q.answer.split(/\s+/).filter(Boolean).length;
  if (words < 40 || words > 60) throw new Error(`Answer for "${q.question}" is ${words} words; keep it 40-60.`);
  if (q.description.length > 160) throw new Error(`Description too long for ${q.slug}`);
}

export const getQuestion = (slug: string) => questions.find((q) => q.slug === slug);
