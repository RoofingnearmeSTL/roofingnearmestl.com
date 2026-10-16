import { processSteps } from "@/lib/site-pages";

export default function ProcessSteps() {
  return (
    <section id="process" className="bg-white py-16 scroll-mt-40">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-sm font-bold uppercase tracking-[0.14em] text-brand">How It Works</p>
        <h2 className="text-black font-extrabold text-3xl text-center mt-2">Our 4-Step Process</h2>
        <p className="text-zinc-600 text-center max-w-2xl mx-auto mt-3">No vague timelines and no pushy sales. You see the photos before you decide anything.</p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {processSteps.map(([title, body], index) => (
            <li key={title} className="relative bg-brand-light/60 border border-brand/20 rounded-2xl p-6">
              <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white text-xl font-black shadow-md shadow-brand/20">{index + 1}</span>
              <h3 className="text-black font-bold text-lg mt-4">{title}</h3>
              <p className="text-zinc-600 text-sm leading-relaxed mt-2">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
