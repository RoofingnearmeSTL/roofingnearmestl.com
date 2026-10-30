// ─────────────────────────────────────────────────────────────────────────────
// HOW TO ADD A REVIEW (takes 1 minute)
// Copy a review from your Google Business Profile (or Facebook) and add an entry
// to the list below. Newest first. Use the reviewer's name exactly as it shows
// publicly (first name + last initial is fine), and copy the text word for word.
//
//   {
//     author: "Jane D.",
//     rating: 5,
//     date: "2026-10-21",           // date the review was posted (YYYY-MM-DD)
//     text: "Mike found the leak and showed me photos...",
//     source: "google",             // "google" or "facebook"
//     work: "roofing",              // "roofing" or "exterior" (siding, gutters, soffit, fascia)
//     excerpt: "Mike found the leak…", // optional: a short piece copied word for word, for city pages
//     town: { city: "Waterloo", state: "IL", from: "review" }, // optional, only if the review
//                                   // or our public owner reply on Google names the town
//   },
//
// Rules: only real reviews, unedited (you may shorten with "…"), never paid for
// or rewarded. The homepage review section and the city pages update automatically.
// A review shows under a town only when that town is named in the review or our reply.
// Roofing reviews never show on Illinois pages (no Illinois roofing license yet).
// ─────────────────────────────────────────────────────────────────────────────

export type ReviewTown = { city: string; state: "MO" | "IL"; from: "review" | "owner reply" };

export type Review = {
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  date: string;
  text: string;
  source: "google" | "facebook";
  work: "roofing" | "exterior";
  /** Short piece of `text`, word for word (tests check this). Shown on city pages. */
  excerpt?: string;
  town?: ReviewTown;
};

export const reviews: Review[] = [
  {
    author: "Mason Tinker",
    rating: 5,
    date: "2026-10-20",
    text: "Mike showed up and offered an inspection. I was skeptical but agreed. He was up and down in less than 20 minutes and gave me an honest photo report that showed my roof was still in good standing. If and when I need to replace I will be calling him based on honesty alone!",
    source: "google",
    work: "roofing",
    excerpt: "He was up and down in less than 20 minutes and gave me an honest photo report that showed my roof was still in good standing. If and when I need to replace I will be calling him based on honesty alone!",
    // Named in our Google reply. A roof job in Illinois, so the town is never shown (see publicTown).
    town: { city: "Dupo", state: "IL", from: "owner reply" },
  },
  {
    author: "Kile K",
    rating: 5,
    date: "2026-10-20",
    text: "If you’re looking for a roofer who truly goes above and beyond, Mike is your guy! His professionalism, attention to detail, and dedication to quality workmanship are second to none. From start to finish, Mike makes the entire process smooth, stress-free, and easy to understand. What really sets Mike apart is his honesty, reliability, and genuine pride in his work. He doesn’t just aim to get the job done—he aims to get it done RIGHT. It’s rare to find someone who combines exceptional craftsmanship with outstanding customer service. Mike sets the gold standard for what a roofing professional should be. If you want quality work, peace of mind, and someone you can trust, look no further. I can’t recommend Mike highly enough.",
    source: "google",
    work: "roofing",
    excerpt: "From start to finish, Mike makes the entire process smooth, stress-free, and easy to understand. What really sets Mike apart is his honesty, reliability, and genuine pride in his work.",
    // Named in our Google reply ("help you while in Imperial, MO").
    town: { city: "Imperial", state: "MO", from: "owner reply" },
  },
  {
    author: "Sherry Daly",
    rating: 5,
    date: "2026-10-19",
    text: "I can't say enough good things about Mike and the work he did for me. I have been with the same insurance company for 20 years, and when my roof needed to be replaced, they initially offered me only a small amount toward the repairs. Mike went above and beyond to help me work through the insurance process. He worked extremely hard, provided the documentation needed, and continued to follow up with the insurance company for months. There were several times when I was ready to give up, but Mike never did. He stayed persistent and kept fighting on my behalf. Because of Mike's hard work and dedication, the insurance company ultimately approved a substantial amount more than they initially offered, which made a huge difference in being able to pay for my new roof. Mike was professional, hardworking, persistent, and truly looked out for my best interest throughout the entire process. I'm incredibly grateful for everything he did and would absolutely recommend him to anyone who needs a roofer. He didn't just do a great job on the roof — he went the extra mile to make sure I received what I was entitled to from my insurance company.",
    source: "google",
    work: "roofing",
    excerpt: "Mike went above and beyond to help me work through the insurance process. He worked extremely hard, provided the documentation needed, and continued to follow up with the insurance company for months.",
  },
];

/** The short quote for a card: the excerpt, with "…" only where text was cut. */
export function quoteFor(review: Review): string {
  const excerpt = review.excerpt;
  if (!excerpt) return review.text;
  const at = review.text.indexOf(excerpt);
  if (at < 0) return review.text; // excerpt no longer matches: fall back to the full review (tests catch this)
  // No trailing "…" after a full sentence: "work.…" reads badly, and the quote is still word for word.
  const cutAtEnd = at + excerpt.length < review.text.length && !/[.!?]$/.test(excerpt);
  return `${at > 0 ? "…" : ""}${excerpt}${cutAtEnd ? "…" : ""}`;
}

/** The town to print next to a review, or null. Roofing jobs in Illinois never show their town. */
export function publicTown(review: Review): string | null {
  if (!review.town) return null;
  if (review.town.state === "IL" && review.work === "roofing") return null;
  return `${review.town.city}, ${review.town.state}`;
}

/**
 * Reviews for a city page. Illinois pages only get exterior-work reviews (no roofing until the IL license).
 * Reviews from this exact town come first and are flagged `local`; the rest are general proof and are
 * never labelled with a town they don't belong to.
 */
export function reviewsForCity(city: string, state: "MO" | "IL", list: Review[] = reviews) {
  const allowed = state === "IL" ? list.filter((review) => review.work === "exterior") : list;
  const isLocal = (review: Review) => review.town?.city === city && review.town.state === state && publicTown(review) !== null;
  return [...allowed.filter(isLocal), ...allowed.filter((review) => !isLocal(review))].map((review) => ({ review, local: isLocal(review) }));
}
