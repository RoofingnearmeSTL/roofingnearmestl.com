import ReviewButtons from "./review-buttons";
import { SHOW_ELFSIGHT_WIDGET, reviews } from "@/lib/reviews";
import { ELFSIGHT_REVIEWS_WIDGET_ID, GOOGLE_BUSINESS_URL } from "@/lib/site-pages";
import ElfsightReviews from "./elfsight-reviews";

const Stars = ({ rating }: { rating: number }) => (
  <span className="text-yellow-500 tracking-wider" aria-label={`${rating} out of 5 stars`}>{"★".repeat(rating)}<span className="text-zinc-300">{"★".repeat(5 - rating)}</span></span>
);

// Long reviews are trimmed on the card (the full text stays in the page) with a link to read them on Google.
const LONG_REVIEW = 320;

// Homepage review showcase. Shows the reviews listed in src/lib/reviews.ts (newest first), or the
// Elfsight widget when SHOW_ELFSIGHT_WIDGET is on; with no reviews yet, it invites the first ones.
export default function ReviewsSection() {
  const useWidget = SHOW_ELFSIGHT_WIDGET && Boolean(ELFSIGHT_REVIEWS_WIDGET_ID);
  const shown = reviews.slice(0, 6);
  const average = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : null;
  const allGoogle = reviews.every((review) => review.source === "google");
  return (
    <section id="reviews" className="bg-white py-16 scroll-mt-40">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-sm font-bold uppercase tracking-[0.14em] text-brand">Customer Reviews</p>
        <h2 className="text-black font-extrabold text-3xl text-center mt-2">What Our Neighbors Say</h2>
        {useWidget ? (
          <ElfsightReviews className="mt-8" />
        ) : average ? (
          <p className="text-center text-zinc-600 mt-3"><Stars rating={Math.round(Number(average))} /> <b className="text-black">{average}</b> from {reviews.length} {allGoogle ? "Google " : ""}review{reviews.length === 1 ? "" : "s"} · <a href={GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-brand underline">See them on Google</a></p>
        ) : (
          <p className="text-center text-zinc-600 max-w-2xl mx-auto mt-3">We&apos;re a new local company and our first reviews are coming in now. Had us out to your home? We&apos;d be grateful for an honest review on Google or Facebook.</p>
        )}

        {!useWidget && shown.length > 0 && (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            {shown.map((review) => (
              <li key={`${review.author}-${review.date}`} className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <Stars rating={review.rating} />
                <blockquote className={`mt-3 text-zinc-700 leading-relaxed ${review.text.length > LONG_REVIEW ? "line-clamp-6" : ""}`}>&ldquo;{review.text}&rdquo;</blockquote>
                {review.text.length > LONG_REVIEW && review.source === "google" && (
                  <a href={GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer" className="mt-2 text-sm font-bold text-brand underline">Read the full review on Google</a>
                )}
                <div className="mt-auto pt-4">
                  <p className="text-sm font-bold text-black">{review.author}{review.town ? <span className="font-normal text-zinc-500">, {review.town}</span> : null}</p>
                  <p className="text-xs text-zinc-500">{review.source === "google" ? "Google review" : "Facebook recommendation"} · {new Date(`${review.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <ReviewButtons placement="homepage_reviews" className="mt-10 justify-center" />
      </div>
    </section>
  );
}
