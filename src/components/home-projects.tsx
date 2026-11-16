// Homepage strip: up to 3 featured before & after projects and a link to /our-work. Renders nothing until a
// project can be shown (samples only on this PC and preview links, never on the live site).
import Link from "next/link";
import ProjectCard from "@/components/project-card";
import { visibleProjects } from "@/lib/projects";

export default function HomeProjects() {
  const featured = visibleProjects().filter((p) => p.featured).slice(0, 3);
  if (featured.length === 0) return null;
  return (
    <section id="our-work" aria-labelledby="our-work-title" className="bg-white py-16 scroll-mt-40">
      <div className="max-w-7xl mx-auto px-6">
        <h2 id="our-work-title" className="text-black font-extrabold text-3xl text-center">Before &amp; After: Our Recent Work</h2>
        <p className="text-zinc-600 text-center max-w-3xl mx-auto mt-3">Real photos from our own jobs, shared with each homeowner&apos;s OK.</p>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => <ProjectCard key={p.slug} project={p} />)}
        </div>
        <p className="mt-6 text-center"><Link href="/our-work" className="font-bold text-brand-ink underline">See all our before &amp; after projects →</Link></p>
      </div>
    </section>
  );
}
