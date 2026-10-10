"use client";

import { usePathname } from "next/navigation";

export default function MobileCallBar() {
  const pathname = usePathname();
  if (pathname === "/thank-you" || pathname.startsWith("/thank-you/")) return null;

  return (
    <>
      <div aria-hidden="true" className="h-[calc(6rem+env(safe-area-inset-bottom))] md:hidden" />
      <nav aria-label="Call for a free roofing estimate" className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-100 bg-white px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-black shadow-lg md:hidden">
        <p className="mb-2 text-center text-sm font-black">Tap to Call - Free Estimate</p>
        <div className="grid grid-cols-2 gap-2">
          <a href="tel:+16186125192" aria-label="Tap to Call - Free Estimate in Illinois: 618-612-5192" className="flex min-h-12 flex-col items-center justify-center rounded-xl border border-brand/20 bg-brand-light text-brand px-2 py-2 font-bold active:bg-brand-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <span className="text-sm">Illinois</span>
            <span className="text-sm">618-612-5192</span>
          </a>
          <a href="tel:+13142027663" aria-label="Tap to Call - Free Estimate in Missouri: 314-202-7663" className="flex min-h-12 flex-col items-center justify-center rounded-xl border border-brand/20 bg-brand-light text-brand px-2 py-2 font-bold active:bg-brand-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <span className="text-sm">Missouri</span>
            <span className="text-sm">314-202-7663</span>
          </a>
        </div>
      </nav>
    </>
  );
}
