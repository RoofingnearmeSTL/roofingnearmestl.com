"use client";
// Service filter for /our-work. Plain buttons (no URL params), so the page stays static and fast.
import { useState, type ReactNode } from "react";

export default function ProjectGallery({ filters, cards }: { filters: string[]; cards: { filter: string; node: ReactNode }[] }) {
  const [active, setActive] = useState<string>("All");
  const shown = active === "All" ? cards : cards.filter((card) => card.filter === active);
  return (
    <div>
      <div role="group" aria-label="Filter projects by service" className="flex flex-wrap gap-2">
        {["All", ...filters].map((name) => (
          <button key={name} type="button" aria-pressed={active === name} onClick={() => setActive(name)}
            className={`rounded-full border px-4 py-2 text-sm font-bold ${active === name ? "border-brand bg-brand text-white" : "border-zinc-300 bg-white text-black hover:border-brand"}`}>
            {name}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">{shown.map((card, i) => <div key={i}>{card.node}</div>)}</div>
    </div>
  );
}
