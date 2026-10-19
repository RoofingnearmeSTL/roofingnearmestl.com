import ReviewButtons from "./review-buttons";
import { reviews } from "@/lib/reviews";

const Stars = ({ rating }: { rating: number }) => (
  <span className="text-yellow-500 tracking-wider" aria-label={`${rating} out of 5 stars`}>{"★".repeat(rating)}<span className="text-zinc-300">{"★".repeat(5 - rating)}</span></span>
);

// Homepage review showcase. Shows the reviews listed in src/lib/reviews.ts (newest first);
// until there are any, it invites customers to be among the first to leave one.
export default function ReviewsSection() {
  const shown = reviews.slice(0, 6);
  const average = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : null;
  return (
    <section id="reviews" className="bg-white py-16 scroll-mt-40">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-sm font-bold uppercase tracking-[0.14em] text-brand">Customer Reviews</p>
        <h2 className="text-black font-extrabold text-3xl text-center mt-2">What Our Neighbors Say</h2>
        {average ? (
          <p className="text-center text-zinc-600 mt-3"><Stars rating={Math.round(Number(average))} /> <b className="text-black">{average}</b> from {reviews.length} review{reviews.length === 1 ? "" : "s"}</p>
        ) : (
          <p className="text-center text-zinc-600 max-w-2xl mx-auto mt-3">We&apos;re a new local company and our first reviews are coming in now. Had us out to your home? We&apos;d be grateful for an honest review on Google or Facebook.</p>
        )}

        {shown.length > 0 && (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            {shown.map((review) => (
              <li key={`${review.author}-${review.date}`} className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <Stars rating={review.rating} />
                <blockquote className="mt-3 flex-1 text-zinc-700 leading-relaxed">&ldquo;{review.text}&rdquo;</blockquote>
                <p className="mt-4 text-sm font-bold text-black">{review.author}{review.town ? <span className="font-normal text-zinc-500">, {review.town}</span> : null}</p>
                <p className="text-xs text-zinc-500">{review.source === "google" ? "Google review" : "Facebook recommendation"} · {new Date(`${review.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
              </li>
            ))}
          </ul>
        )}

        <ReviewButtons placement="homepage_reviews" className="mt-10 justify-center" />
      </div>
    </section>
  );
}
