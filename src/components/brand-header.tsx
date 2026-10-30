import EstimateLink from "./estimate-link";
import Image from "next/image";
import Link from "next/link";
import { DesktopNav, MobileNav } from "./nav-menus";

export default function BrandHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white border-y-2 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-32 md:min-h-36 flex items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" aria-label="RoofingnearmeSTL home" className="shrink-0">
            <Image src="/logo.png" alt="RoofingnearmeSTL" width={380} height={295} priority className="h-[106px] md:h-[128px] w-auto" />
          </Link>
          <div aria-hidden="true" className="hidden lg:block h-16 w-px bg-zinc-200 shrink-0" />
          <div className="hidden lg:block">
            <p className="text-xs font-bold tracking-[0.14em] text-black uppercase">Local. Reliable.</p>
            <p className="text-xs font-bold tracking-[0.14em] text-brand-ink uppercase mt-1">Protecting What Matters.</p>
            <p className="text-xs text-zinc-500 mt-2">Serving the St. Louis Metro Area</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 xl:gap-6 shrink-0">
          <DesktopNav />
          <EstimateLink className="bg-brand-ink hover:bg-brand-ink-dark text-white rounded-full px-4 sm:px-7 py-3 font-bold text-xs sm:text-sm shadow-md shadow-brand/20 whitespace-nowrap">Get Free Quote</EstimateLink>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
