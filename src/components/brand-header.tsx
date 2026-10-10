import Image from "next/image";
import Link from "next/link";

export default function BrandHeader() {
  return <header className="sticky top-0 z-50 bg-white border-b border-zinc-200 shadow-sm">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 h-24 md:h-28">
      <Link href="/" aria-label="Roofing Near Me STL home"><Image src="/logo.png" alt="Roofing Near Me STL" width={360} height={279} priority className="h-[76px] md:h-[92px] w-auto" /></Link>
      <nav aria-label="Main navigation" className="flex items-center gap-4 md:gap-8">
        <Link href="/#services" className="hidden font-medium text-zinc-700 hover:text-black md:block">Services</Link>
        <Link href="/#faq" className="hidden font-medium text-zinc-700 hover:text-black md:block">FAQ</Link>
        <Link href="/#estimate" className="rounded-full bg-black px-4 md:px-7 py-3 text-sm font-bold text-white shadow transition hover:bg-zinc-800 hover:shadow-md">Get Free Quote</Link>
      </nav>
    </div>
  </header>;
}
