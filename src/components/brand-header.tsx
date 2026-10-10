import EstimateLink from "./estimate-link";
import Image from "next/image";
import Link from "next/link";

export default function BrandHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white border-y-2 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-32 md:min-h-36 flex items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" aria-label="Roofing Near Me STL home" className="shrink-0">
            <Image src="/logo.png" alt="Roofing Near Me STL" width={380} height={295} priority className="h-[106px] md:h-[128px] w-auto" />
          </Link>
          <div aria-hidden="true" className="hidden lg:block h-16 w-px bg-zinc-200 shrink-0" />
          <div className="hidden lg:block">
            <p className="text-xs font-bold tracking-[0.14em] text-black uppercase">Local. Reliable.</p>
            <p className="text-xs font-bold tracking-[0.14em] text-brand uppercase mt-1">Protecting What Matters.</p>
            <p className="text-xs text-zinc-500 mt-2">Waterloo • Columbia • Belleville • STL</p>
          </div>
        </div>
        <div className="flex items-center gap-4 xl:gap-6 shrink-0">
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-3 xl:gap-6 text-sm font-medium text-zinc-600">
            <Link href="/#services" className="hover:text-black">Services</Link>
            <Link href="/#faq" className="hover:text-black">FAQ</Link>
          </nav>
          <EstimateLink className="bg-brand hover:bg-brand-dark text-white rounded-full px-4 sm:px-7 py-3 font-bold text-xs sm:text-sm shadow-md shadow-brand/20 whitespace-nowrap">Get Free Quote</EstimateLink>
        </div>
      </div>
    </header>
  );
}
