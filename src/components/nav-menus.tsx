"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { areaGroups, servicePages } from "@/lib/site-pages";

type MenuItem = { href: string; label: string };
const services: MenuItem[] = servicePages.map((page) => ({ href: `/${page.slug}`, label: page.navLabel }));
// Too many cities for one menu, so the menu lists areas and each opens its section of /areas-we-serve.
const areas: MenuItem[] = areaGroups.map((group) => ({ href: `/areas-we-serve#${group.id}`, label: group.name }));
const menus = [
  { label: "Services", items: services, all: { href: "/services", label: "All services →" } },
  { label: "Areas We Serve", items: areas, all: { href: "/areas-we-serve", label: "All service areas →" } },
];

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
      // Clicks inside the menu keep it open, except a link click (an "#area" link doesn't change the pathname).
      if (event instanceof MouseEvent && root.current?.contains(event.target as Node) && !(event.target as Element).closest("a")) return;
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

function DesktopMenu({ label, items, all }: (typeof menus)[number]) {
  return (
    <details className="group relative" onToggle={closeOthers}>
      <summary className="flex cursor-pointer list-none items-center gap-1 hover:text-black [&::-webkit-details-marker]:hidden">{label}{caret}</summary>
      <ul className="absolute right-0 top-full z-50 mt-3 w-72 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl">
        {items.map((item) => (
          <li key={item.href}><Link href={item.href} className="block rounded-lg px-3 py-2 text-black hover:bg-brand-light">{item.label}</Link></li>
        ))}
        <li className="mt-1 border-t border-zinc-100 pt-1"><Link href={all.href} className="block rounded-lg px-3 py-2 font-bold text-brand-ink hover:bg-brand-light">{all.label}</Link></li>
      </ul>
    </details>
  );
}

export function DesktopNav() {
  const root = useCloseMenus();
  return (
    <div ref={root} className="contents">
      <nav aria-label="Main navigation" className="hidden md:flex items-center gap-4 xl:gap-6 text-sm font-medium text-zinc-600">
        {menus.map((menu) => <DesktopMenu key={menu.label} {...menu} />)}
        <Link href="/blog/roof-replacement-cost-st-louis-mo" className="hover:text-black">Roof Cost</Link>
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
          {menus.map((menu) => (
            <div key={menu.label} className="mb-4">
              <p className="px-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{menu.label}</p>
              <ul className="mt-1">
                {menu.items.map((item) => (
                  <li key={item.href}><Link href={item.href} className="block rounded-lg px-3 py-3 text-base font-bold text-black hover:bg-brand-light">{item.label}</Link></li>
                ))}
                <li><Link href={menu.all.href} className="block rounded-lg px-3 py-3 text-base font-bold text-brand-ink hover:bg-brand-light">{menu.all.label}</Link></li>
              </ul>
            </div>
          ))}
          <Link href="/blog/roof-replacement-cost-st-louis-mo" className="block rounded-lg px-3 py-3 text-base font-bold text-black hover:bg-brand-light">Roof Cost Guide</Link>
          <Link href="/questions" className="block rounded-lg px-3 py-3 text-base font-bold text-black hover:bg-brand-light">Questions</Link>
          <Link href="/#faq" className="block rounded-lg px-3 py-3 text-base font-bold text-black hover:bg-brand-light">FAQ</Link>
        </nav>
      </details>
    </div>
  );
}
