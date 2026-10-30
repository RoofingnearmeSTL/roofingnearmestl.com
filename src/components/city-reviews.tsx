// "Why Your Neighbors Chose Us" on city pages: real Google reviews from src/lib/reviews.ts, quoted word for word.
// No review markup (schema) on purpose: self-serving review markup was removed in #23.
// Illinois pages show only siding/gutter/soffit/fascia reviews (no roofing until the IL license).
import ReviewButtons from "./review-buttons";
import { Stars } from "./reviews-section";
import { publicTown, quoteFor, reviews, reviewsForCity } from "@/lib/reviews";
import { GOOGLE_BUSINESS_URL } from "@/lib/site-pages";

export default function CityReviews({ city, state }: { city: string; state: "MO" | "IL" }) {
  // Google reviews only: the section is labelled "Real Google Reviews".
  const google = reviews.filter((review) => review.source === "google");
  const shown = reviewsForCity(city, state, google).slice(0, 3);
  const anyLocal = shown.some((item) => item.local);
  const googleCount = google.length;
  const average = googleCount ? (google.reduce((sum, review) => sum + review.rating, 0) / googleCount).toFixed(1) : null;
  return (
    <section id="reviews" aria-labelledby="neighbors-heading" className="bg-white py-16 scroll-mt-40">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-center text-sm font-bold uppercase tracking-[0.14em] text-brand-ink">Real Google Reviews</p>
        <h2 id="neighbors-heading" className="text-black font-extrabold text-3xl text-center mt-2">Why Your Neighbors Chose Us</h2>

        {shown.length > 0 && average ? (
          <>
            <p className="text-center text-zinc-600 mt-3"><Stars rating={Math.round(Number(average))} /> <b className="text-black">{average}</b> on Google from {googleCount} review{googleCount === 1 ? "" : "s"}. {anyLocal ? `Reviews from ${city} come first; the rest are` : "These are"} from homeowners across the St. Louis Metro Area, quoted word for word. · <a href={GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-ink underline">Read them all on Google</a></p>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
              {shown.map(({ review, local }) => {
                const town = publicTown(review);
                return (
                  <li key={`${review.author}-${review.date}`} className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    {local && <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-ink">Here in {city}</p>}
                    <Stars rating={review.rating} />
                    <blockquote className="mt-3 text-zinc-700 leading-relaxed">&ldquo;{quoteFor(review)}&rdquo;</blockquote>
                    <div className="mt-auto pt-4">
                      <p className="text-sm font-bold text-black">{review.author}{town ? <span className="font-normal text-zinc-500">, {town}</span> : null}</p>
                      <p className="text-xs text-zinc-500">{review.source === "google" ? "Google review" : "Facebook recommendation"} · {new Date(`${review.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="text-center text-zinc-600 max-w-2xl mx-auto mt-3">
            RoofingnearmeSTL is a local crew {city === "Waterloo" ? "based right here in Waterloo" : "based in Waterloo, IL"}, rated <b className="text-black">5.0★ on Google</b>. As {city} homeowners review their siding, gutter, soffit and fascia work, we&apos;ll show those reviews here, word for word. · <a href={GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-ink underline">See our Google reviews</a>
          </p>
        )}

        <ReviewButtons placement={`city_reviews_${state.toLowerCase()}`} size="sm" className="mt-8 justify-center" />
      </div>
    </section>
  );
}
