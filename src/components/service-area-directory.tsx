import Link from "next/link";
import { areaGroups } from "@/lib/site-pages";

const cityLink = "inline-block rounded-full border border-brand/20 bg-brand-light px-3 py-1.5 text-sm font-bold text-black hover:border-brand";

// Every city page, grouped by county/region. Used on /areas-we-serve (open cards) and the homepage
// (compact: each county is a row that opens to show its cities; the links stay in the HTML for search engines).
export default function ServiceAreaDirectory({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="mt-3 divide-y divide-zinc-200 border-y border-zinc-200">
        {areaGroups.map((group) => (
          <details key={group.id} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 font-bold text-black hover:text-brand [&::-webkit-details-marker]:hidden">
              <span>{group.name} <span className="font-normal text-zinc-500">({group.pages.length})</span></span>
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-zinc-400 transition-transform group-open:rotate-180"><path d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" /></svg>
            </summary>
            <ul className="flex flex-wrap gap-2 pb-4">
              {group.pages.map((page) => (
                <li key={page.slug}><Link href={`/${page.slug}`} className={cityLink}>{page.navLabel}</Link></li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {areaGroups.map((group) => (
        <section key={group.id} id={group.id} className="scroll-mt-40 rounded-2xl border-2 border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-black">{group.name}</h3>
          <p className="text-xs font-semibold text-zinc-500">{group.id.startsWith("il-") ? "Siding, gutters, soffit & fascia" : "Roofing + siding, gutters, soffit & fascia"}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {group.pages.map((page) => (
              <li key={page.slug}><Link href={`/${page.slug}`} className={cityLink}>{page.navLabel}</Link></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
