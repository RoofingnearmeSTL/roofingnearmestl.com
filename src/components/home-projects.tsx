// Homepage strip: featured before & after projects and a link to /our-work. Renders nothing until a project can be
// shown. Once a real job exists, only real jobs show here (samples stay on /our-work previews). Up to 2 real jobs =
// each one's full-width showcase with every photo, stacked (Mike, Nov 15 2026: all photos, no empty space beside a
// lone card); 3 jobs = cards that fill the row, with every photo on /our-work.
import Link from "next/link";
import ProjectCard from "@/components/project-card";
import ProjectShowcase from "@/components/project-showcase";
import { visibleProjects } from "@/lib/projects";

export default function HomeProjects() {
  const shown = visibleProjects().filter((p) => p.featured);
  const real = shown.filter((p) => !p.placeholder);
  const featured = (real.length ? real : shown).slice(0, 3);
  if (featured.length === 0) return null;
  return (
    <section id="our-work" aria-labelledby="our-work-title" className="bg-white py-16 scroll-mt-40">
      <div className="max-w-7xl mx-auto px-6">
        <h2 id="our-work-title" className="text-black font-extrabold text-3xl text-center">Before &amp; After: Our Recent Work</h2>
        <p className="text-zinc-600 text-center max-w-3xl mx-auto mt-3">Real photos from our own jobs, shared with each homeowner&apos;s OK.</p>
        {featured.length <= 2 && featured.every((p) => !p.placeholder) ? (
          <div className="mt-8 space-y-8">{featured.map((p) => <ProjectShowcase key={p.slug} project={p} />)}</div>
        ) : (
          <div className={`mt-8 grid gap-6 ${featured.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
            {featured.map((p) => <ProjectCard key={p.slug} project={p} />)}
          </div>
        )}
        <p className="mt-6 text-center"><Link href="/our-work" className="font-bold text-brand-ink underline">See all our before &amp; after projects →</Link></p>
      </div>
    </section>
  );
}
