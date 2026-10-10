import Image from "next/image";

export default function EmergencyBar() {
  return <div className="bg-black px-4 py-2 text-center text-sm text-white">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
      <Image src="/logo-white.png" alt="Roofing Near Me STL" width={64} height={48} className="h-6 w-auto" />
      <span>24/7 Emergency Roof Repair in St. Louis Metro - Call Now:</span>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-brand"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z" /></svg>
      <a href="tel:+16186125192" className="font-bold text-white hover:text-brand">Illinois: 618-612-5192</a><span>&amp;</span><a href="tel:+13142027663" className="font-bold text-white hover:text-brand">Missouri: 314-202-7663</a>
    </div>
  </div>;
}
