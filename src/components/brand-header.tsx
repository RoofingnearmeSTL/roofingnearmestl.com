import Image from "next/image";
import Link from "next/link";

export default function BrandHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-zinc-200">
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
          <div className="hidden md:block text-right">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Call Now</p>
            <a href="tel:+16186125192" className="text-base xl:text-lg font-extrabold text-brand hover:text-brand-dark">618-612-5192</a>
          </div>
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-3 xl:gap-6 text-sm font-medium text-zinc-700">
            <Link href="/#services" className="hover:text-black">Services</Link>
            <Link href="/#faq" className="hover:text-black">FAQ</Link>
          </nav>
          <Link href="/#estimate" className="bg-black hover:bg-zinc-800 text-white rounded-full px-4 sm:px-7 py-3 font-bold text-xs sm:text-sm shadow whitespace-nowrap">Get Free Quote</Link>
        </div>
      </div>
    </header>
  );
}
