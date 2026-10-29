// Plain-text roof cost summary under the estimator: the estimator runs in the browser, so this is the
// version Google and AI answers can read. Numbers come from src/lib/pricing.ts (owner's 2026 pricing).
import { priceRange, usd } from "@/lib/pricing";

export default function CostFallback({ headingLevel = "h2" }: { headingLevel?: "h2" | "h3" }) {
  const [s12, s18, s24] = [12, 18, 24].map((sq) => priceRange(sq, "architectural"));
  const Heading = headingLevel;
  return (
    <div id="cost-fallback" className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-black">
      <Heading className="text-xl font-extrabold">2026 Roof Replacement Cost in St. Louis, MO</Heading>
      <p className="mt-3 text-zinc-700">A new 30-year architectural shingle roof in St. Louis, MO costs about {usd(s12.low)}-{usd(s24.high)} for most homes (about 1,200-2,400 sq ft of roof).</p>
      <p className="mt-3 text-zinc-700">1,200 sq ft (12 SQ) {usd(s12.low)}-{usd(s12.high)} | 1,800 sq ft (18 SQ) {usd(s18.low)}-{usd(s18.high)} | 2,400 sq ft (24 SQ) {usd(s24.low)}-{usd(s24.high)}. 3-Tab costs less; premium, clay, metal and slate are custom quotes. Pitch matters: Low pitch uses low end, Medium mid-range, Steep high end.</p>
      <p className="mt-3 text-sm text-zinc-600">Pricing for Missouri roofing only - Illinois pricing for siding/gutters only - Roofing coming soon after IL license.</p>
    </div>
  );
}
