import EstimateLink from "./estimate-link";
import Image from "next/image";
import Link from "next/link";

export default function BrandFooter() {
  return <footer className="bg-black px-6 py-12 text-white">
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 text-center md:flex-row md:text-left">
      <div><Link href="/"><Image src="/logo-white.png" alt="Roofing Near Me STL" width={180} height={135} className="mx-auto w-[180px] h-auto md:mx-0" /></Link><p className="mt-4 text-sm text-zinc-400">Local. Reliable. Protecting what matters.</p></div>
      <div className="space-y-3 text-sm"><p>Fully Insured • GAF Certified • Owens Corning Preferred • Waterloo • Columbia • Belleville • St. Louis</p><p><a href="tel:+16186125192" className="font-bold text-brand">Illinois: 618-612-5192</a></p><p><a href="tel:+13142027663" className="font-bold text-brand">Missouri: 314-202-7663</a></p><div className="flex justify-center gap-5 md:justify-start"><Link href="/#services" className="text-zinc-400 hover:text-white">Services</Link><EstimateLink className="text-zinc-400 hover:text-white">Free Estimate</EstimateLink></div><p className="text-xs text-zinc-400">© {new Date().getFullYear()} Roofing Near Me STL</p></div>
    </div>
  </footer>;
}
