import Image from "next/image";
import Link from "next/link";

export default function BrandHeader() {
  return <header className="border-b border-zinc-100 bg-white/90 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
      <Link href="/" aria-label="Roofing Near Me STL home"><Image src="/logo.png" alt="Roofing Near Me STL" width={320} height={240} priority className="h-[62px] w-auto" /></Link>
      <nav aria-label="Main navigation" className="flex items-center gap-6">
        <Link href="/#services" className="hidden font-medium text-zinc-700 hover:text-black md:block">Services</Link>
        <Link href="/#faq" className="hidden font-medium text-zinc-700 hover:text-black md:block">FAQ</Link>
        <Link href="/#quote" className="rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 hover:shadow-md">Get Free Quote</Link>
      </nav>
    </div>
  </header>;
}
