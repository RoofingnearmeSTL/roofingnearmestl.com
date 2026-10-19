import { certifications } from "@/lib/site-pages";

export default function Certifications() {
  return (
    <section id="certifications" className="bg-[#0f1a2b] py-16 text-white scroll-mt-40">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-sm font-bold uppercase tracking-[0.14em] text-brand">Trained &amp; Certified</p>
        <h2 className="font-extrabold text-3xl text-center mt-2">Certified by Building Experts Institute</h2>
        <p className="text-zinc-300 text-center max-w-3xl mx-auto mt-3">Your inspection is done by Mike Williamson, who completed Building Experts Institute certification in hail and wind damage identification, installation, and building code for asphalt shingle roofs.</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
          {certifications.map((cert) => (
            <li key={cert.number} className="rounded-2xl border border-white/15 bg-white/5 p-6">
              <span aria-hidden="true" className="inline-flex rounded-full bg-yellow-400 px-3 py-1 text-xs font-black uppercase tracking-wide text-black">★ BEI Certified</span>
              <h3 className="font-bold text-lg mt-4">{cert.title}</h3>
              <p className="text-sm text-zinc-300">{cert.subject}</p>
              <p className="text-xs text-zinc-400 mt-3">Certificate #{cert.number}<br />Valid through {cert.expires}</p>
              <a href={cert.file} target="_blank" rel="noopener" className="inline-block mt-4 text-sm font-bold text-brand underline hover:text-white">View certificate (PDF)</a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
