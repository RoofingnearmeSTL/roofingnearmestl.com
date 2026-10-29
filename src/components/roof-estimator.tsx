"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import EstimateLink from "./estimate-link";
import type { LeadExtras } from "./lead-form";
import { cityPages } from "@/lib/site-pages";
import { IL_ROOFING_NOTE, PITCHES, SHINGLES, SHINGLE_OPTIONS, SQ_DEFAULT, SQ_MAX, SQ_MIN, clampSquares, estimate, estimatorExtras, isCustom, priceRange, usd, type PitchKey, type ShingleKey } from "@/lib/pricing";

const MO_PHONE = { href: "tel:+13142027663", label: "314-202-7663" };
const IL_PHONE = { href: "tel:+16186125192", label: "618-612-5192" };

// Property location decides whether roofing can be priced: Missouri yes, Illinois exterior only.
const places = [
  { label: "St. Louis, MO", state: "MO" as const },
  ...cityPages.filter((page) => page.state === "MO").map((page) => ({ label: page.navLabel, state: "MO" as const })),
  ...cityPages.filter((page) => page.state === "IL").map((page) => ({ label: page.navLabel, state: "IL" as const })),
];

const selectClass = "w-full bg-white border border-zinc-300 rounded-xl px-3 py-3 text-black font-medium";

/** Adjustable roof replacement estimator: roof size slider (10-40 SQ), shingle and pitch dropdowns. */
export default function RoofEstimator({ onChange, defaultPlace = "St. Louis, MO", headingLevel = "h3" }: {
  onChange?: (extras: LeadExtras) => void;
  defaultPlace?: string;
  headingLevel?: "h2" | "h3";
}) {
  const [place, setPlace] = useState(places.some((p) => p.label === defaultPlace) ? defaultPlace : "St. Louis, MO");
  const [squares, setSquares] = useState(SQ_DEFAULT);
  const [shingle, setShingle] = useState<ShingleKey>("architectural");
  const [pitch, setPitch] = useState<PitchKey>("medium");

  const state = places.find((p) => p.label === place)?.state ?? "MO";
  const custom = isCustom(shingle);
  const result = state === "MO" ? estimate(squares, shingle, pitch) : null;
  const range = !custom ? priceRange(squares, shingle as "3tab" | "architectural") : null;
  const shingleLabel = SHINGLE_OPTIONS.find((option) => option.key === shingle)!.label.replace(/ \(.*\)$/, "");

  const extras = useMemo<LeadExtras>(() => estimatorExtras({ squares, shingle, pitch, place, state }), [squares, shingle, pitch, place, state]);
  useEffect(() => { onChange?.(extras); }, [extras, onChange]);

  const Heading = headingLevel;
  return (
    <div className="bg-white border-2 border-brand/25 rounded-2xl p-6 shadow-sm text-black">
      <Heading className="font-bold text-xl">Instant Roof Cost Estimator</Heading>
      <p className="text-sm text-zinc-600 mt-1">Missouri roofing, 2026 pricing. Move the slider and pick your shingle and pitch.</p>

      <label className="block mt-4 text-sm font-bold">Property location
        <select value={place} onChange={(e) => setPlace(e.target.value)} className={`${selectClass} mt-1`}>
          <optgroup label="Missouri (roofing + exterior)">
            {places.filter((p) => p.state === "MO").map((p) => <option key={p.label}>{p.label}</option>)}
          </optgroup>
          <optgroup label="Illinois (siding, gutters, soffit & fascia)">
            {places.filter((p) => p.state === "IL").map((p) => <option key={p.label}>{p.label}</option>)}
          </optgroup>
        </select>
      </label>

      {state === "IL" ? (
        <div role="status" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-black">
          <p className="font-bold">{IL_ROOFING_NOTE}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={IL_PHONE.href} className="bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded-full font-bold">Call {IL_PHONE.label}</a>
            <Link href="/siding" className="border border-brand text-black px-4 py-2 rounded-full font-bold">Siding</Link>
            <Link href="/gutters-downspouts" className="border border-brand text-black px-4 py-2 rounded-full font-bold">Gutters</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <label htmlFor="roof-squares" className="flex items-baseline justify-between gap-3 text-sm font-bold">
              <span>Roof size</span>
              <span className="text-brand text-lg font-black">{squares} SQ <span className="text-xs font-semibold text-zinc-500">≈ {(squares * 100).toLocaleString("en-US")} sq ft of roof</span></span>
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input id="roof-squares" type="range" min={SQ_MIN} max={SQ_MAX} step={1} value={squares} onChange={(e) => setSquares(clampSquares(Number(e.target.value)))} aria-valuetext={`${squares} squares`} className="w-full accent-brand" />
              <input type="number" min={SQ_MIN} max={SQ_MAX} value={squares} onChange={(e) => setSquares(clampSquares(Number(e.target.value) || SQ_MIN))} aria-label="Roof size in squares" className="w-20 bg-white border border-zinc-300 rounded-lg px-2 py-2 text-center font-bold" />
            </div>
            <p className="text-xs text-zinc-500 mt-1">1 square (SQ) = 100 sq ft of roof. Range {SQ_MIN}-{SQ_MAX} SQ.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <label className="text-sm font-bold">Shingle quality
              <select value={shingle} onChange={(e) => setShingle(e.target.value as ShingleKey)} className={`${selectClass} mt-1`}>
                {SHINGLE_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold">Roof pitch
              <select value={pitch} onChange={(e) => setPitch(e.target.value as PitchKey)} className={`${selectClass} mt-1`} disabled={custom}>
                {(Object.keys(PITCHES) as PitchKey[]).map((key) => <option key={key} value={key}>{PITCHES[key].label}</option>)}
              </select>
            </label>
          </div>

          <div aria-live="polite" className="mt-4 bg-brand-light border border-brand/20 rounded-xl p-4 text-center">
            {custom || !result || !range ? (
              <>
                <div className="text-sm font-bold">{shingleLabel}</div>
                <div className="text-2xl font-black text-brand mt-1">Custom - Call to Lock Price</div>
                <p className="text-xs text-zinc-600 mt-1">Custom Quote Required: clay, metal and slate are priced after an in-person look.</p>
                <a href={MO_PHONE.href} className="inline-block mt-3 bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded-full font-bold shadow-md shadow-brand/20">Call Mike to Lock Price</a>
              </>
            ) : (
              <>
                <div className="text-sm">Estimated replacement, {squares} SQ {SHINGLES[shingle as "3tab" | "architectural"].label}:</div>
                <div className="text-4xl font-black text-brand">{usd(result.price)}</div>
                <p className="text-xs text-zinc-600 mt-1">Full range {usd(range.low)} - {usd(range.high)}. {PITCHES[pitch].label.split(" (")[0]} uses the {PITCHES[pitch].rule}.</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <EstimateLink className="bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded-full font-bold shadow-md shadow-brand/20">Lock This Price</EstimateLink>
                  <a href={MO_PHONE.href} className="border border-brand text-black px-5 py-2 rounded-full font-bold">Call Mike to Lock Price</a>
                </div>
              </>
            )}
          </div>
        </>
      )}
      <p className="text-zinc-500 mt-2 text-xs">Estimate only. Your free photo-documented inspection sets the final price.</p>
    </div>
  );
}
