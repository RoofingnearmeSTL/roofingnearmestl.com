import Link from "next/link";
import { areaGroups } from "@/lib/site-pages";

// Every city page, grouped by county/region. Used on /areas-we-serve and the homepage.
export default function ServiceAreaDirectory({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "mt-3 space-y-4" : "grid gap-6 sm:grid-cols-2"}>
      {areaGroups.map((group) => (
        <section key={group.id} id={group.id} className={compact ? "" : "scroll-mt-40 rounded-2xl border-2 border-zinc-200 bg-white p-6 shadow-sm"}>
          <h3 className={compact ? "text-sm font-bold text-zinc-500" : "text-lg font-bold text-black"}>{group.name}</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {group.pages.map((page) => (
              <li key={page.slug}><Link href={`/${page.slug}`} className="inline-block rounded-full border border-brand/20 bg-brand-light px-3 py-1.5 text-sm font-bold text-black hover:border-brand">{page.navLabel}</Link></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
