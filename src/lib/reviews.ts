import { SITE_URL } from "./site-pages";

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
//     town: "Waterloo",             // optional, only if the reviewer mentioned it
//   },
//
// Rules: only real reviews, unedited (you may shorten with "…"), never paid for
// or rewarded. The homepage section and its schema update automatically.
// ─────────────────────────────────────────────────────────────────────────────

export type Review = {
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  date: string;
  text: string;
  source: "google" | "facebook";
  town?: string;
};

export const reviews: Review[] = [
  {
    author: "Sherry Daly",
    rating: 5,
    date: "2026-10-19",
    text: "I can't say enough good things about Mike and the work he did for me. I have been with the same insurance company for 20 years, and when my roof needed to be replaced, they initially offered me only a small amount toward the repairs. Mike went above and beyond to help me work through the insurance process. He worked extremely hard, provided the documentation needed, and continued to follow up with the insurance company for months. There were several times when I was ready to give up, but Mike never did. He stayed persistent and kept fighting on my behalf. Because of Mike's hard work and dedication, the insurance company ultimately approved a substantial amount more than they initially offered, which made a huge difference in being able to pay for my new roof. Mike was professional, hardworking, persistent, and truly looked out for my best interest throughout the entire process. I'm incredibly grateful for everything he did and would absolutely recommend him to anyone who needs a roofer. He didn't just do a great job on the roof — he went the extra mile to make sure I received what I was entitled to from my insurance company.",
    source: "google",
  },
];

// Schema.org data matching the reviews shown on the page. Google does not show star
// rich results for a business's own reviews, but the markup still describes them
// accurately for search and AI engines.
export function reviewSchema() {
  if (reviews.length === 0) return {};
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: (total / reviews.length).toFixed(1),
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.map((review) => ({
      "@type": "Review",
      author: { "@type": "Person", name: review.author },
      datePublished: review.date,
      reviewBody: review.text,
      reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
      publisher: { "@type": "Organization", name: review.source === "google" ? "Google" : "Facebook" },
      itemReviewed: { "@id": `${SITE_URL}/#business` },
    })),
  };
}
