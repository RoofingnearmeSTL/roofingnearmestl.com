"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { sitePages } from "@/lib/site-pages";

const services = sitePages.filter((page) => page.kind === "service");
const areas = sitePages.filter((page) => page.kind === "city");

// Closes any open <details> menu inside `root` after navigation, outside clicks and Escape.
function useCloseMenus() {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    root.current?.querySelectorAll("details[open]").forEach((menu) => menu.removeAttribute("open"));
  }, [pathname]);
  useEffect(() => {
    function close(event: Event) {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof MouseEvent && root.current?.contains(event.target as Node)) return;
      root.current?.querySelectorAll("details[open]").forEach((menu) => menu.removeAttribute("open"));
    }
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  return root;
}

function closeOthers(event: React.SyntheticEvent<HTMLDetailsElement>) {
  const opened = event.currentTarget;
  if (!opened.open) return;
  opened.parentElement?.querySelectorAll("details[open]").forEach((menu) => { if (menu !== opened) menu.removeAttribute("open"); });
}

const caret = <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition-transform group-open:rotate-180"><path d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" /></svg>;

function DesktopMenu({ label, pages, allHref }: { label: string; pages: typeof sitePages; allHref?: string }) {
  return (
    <details className="group relative" onToggle={closeOthers}>
      <summary className="flex cursor-pointer list-none items-center gap-1 hover:text-black [&::-webkit-details-marker]:hidden">{label}{caret}</summary>
      <ul className="absolute right-0 top-full z-50 mt-3 w-64 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl">
        {pages.map((page) => (
          <li key={page.slug}><Link href={`/${page.slug}`} className="block rounded-lg px-3 py-2 text-black hover:bg-brand-light">{page.navLabel}</Link></li>
        ))}
        {allHref && <li className="mt-1 border-t border-zinc-100 pt-1"><Link href={allHref} className="block rounded-lg px-3 py-2 text-zinc-500 hover:bg-brand-light hover:text-black">All services →</Link></li>}
      </ul>
    </details>
  );
}

export function DesktopNav() {
  const root = useCloseMenus();
  return (
    <div ref={root} className="contents">
      <nav aria-label="Main navigation" className="hidden md:flex items-center gap-4 xl:gap-6 text-sm font-medium text-zinc-600">
        <DesktopMenu label="Services" pages={services} allHref="/#services" />
        <DesktopMenu label="Areas We Serve" pages={areas} />
        <Link href="/#faq" className="hover:text-black">FAQ</Link>
      </nav>
    </div>
  );
}

export function MobileNav() {
  const root = useCloseMenus();
  return (
    <div ref={root} className="md:hidden">
      <details className="group">
        <summary aria-label="Open menu" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-zinc-300 text-black [&::-webkit-details-marker]:hidden">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 group-open:hidden"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hidden h-5 w-5 group-open:block"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </summary>
        <nav aria-label="Mobile navigation" className="absolute inset-x-0 top-full max-h-[70vh] overflow-y-auto border-b-2 border-black bg-white px-4 py-4 shadow-xl">
          {([["Services", services], ["Areas We Serve", areas]] as const).map(([heading, pages]) => (
            <div key={heading} className="mb-4">
              <p className="px-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{heading}</p>
              <ul className="mt-1">
                {pages.map((page) => (
                  <li key={page.slug}><Link href={`/${page.slug}`} className="block rounded-lg px-3 py-3 text-base font-bold text-black hover:bg-brand-light">{page.navLabel}</Link></li>
                ))}
              </ul>
            </div>
          ))}
          <Link href="/#faq" className="block rounded-lg px-3 py-3 text-base font-bold text-black hover:bg-brand-light">FAQ</Link>
        </nav>
      </details>
    </div>
  );
}
