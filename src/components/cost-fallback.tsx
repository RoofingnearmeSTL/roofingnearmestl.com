// Plain-text roof cost section that Google and AI answers can read. Since Nov 15 2026 (Mike) it explains how pricing
// works without any dollar figures: a rough number appears only after a request is saved (src/lib/estimate-offer.ts).
import { ROOF_PRICE_GET, ROOF_PRICE_HOW } from "@/lib/estimate-offer";
import { IL_COMING_SOON } from "@/lib/pricing";

export default function CostFallback({ headingLevel = "h2" }: { headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <div id="cost-fallback" className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-black">
      <Heading className="text-xl font-extrabold">2026 Roof Replacement Cost in St. Louis, MO</Heading>
      <p className="mt-3 text-zinc-700">{ROOF_PRICE_HOW}</p>
      <p className="mt-3 text-zinc-700">{ROOF_PRICE_GET}</p>
      <p className="mt-3 text-sm text-zinc-600">Roof replacement estimates are for Missouri homes. {IL_COMING_SOON}; in Illinois we quote siding, gutters, soffit and fascia.</p>
    </div>
  );
}
