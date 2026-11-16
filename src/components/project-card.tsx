// One before & after project: the pair side by side (stacked on phones), then 3-5 short lines.
// No carousel, no auto-rotation: both photos are always visible. Placeholders show an empty labelled frame,
// never a stock or AI picture. `full` (on /our-work) shows every pair plus extra after photos; elsewhere the first pair.
// St. Louis Metro projects show for both states, so the card never carries a state-specific phone number.
import Image from "next/image";
import { projectReview, projectTown, type Project, type ProjectPhoto } from "@/lib/projects";
import { quoteFor } from "@/lib/reviews";

type Tone = "dark" | "light";

function Frame({ photo, label, tone }: { photo: ProjectPhoto | null; label: "Before" | "After"; tone: Tone }) {
  // Photos come in landscape and portrait; the 4:3 frame crops to the middle so every pair lines up.
  const badge = label === "Before" ? "bg-black/75 text-white" : "bg-[#FFD400] text-black";
  return (
    <figure className="relative">
      {photo ? (
        <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes="(min-width: 1024px) 24rem, 50vw" className="aspect-[4/3] w-full rounded-xl object-cover" />
      ) : (
        <div className={`flex aspect-[4/3] w-full items-center justify-center rounded-xl border-2 border-dashed text-center text-sm font-bold ${tone === "dark" ? "border-white/25 bg-zinc-800 text-zinc-400" : "border-zinc-300 bg-zinc-100 text-zinc-500"}`}>
          {label} photo<br />coming soon
        </div>
      )}
      <figcaption className={`absolute top-2 left-2 rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wide ${badge}`}>{label}</figcaption>
    </figure>
  );
}

export default function ProjectCard({ project, tone = "light", full = false }: { project: Project; tone?: Tone; full?: boolean }) {
  const review = projectReview(project);
  const muted = tone === "dark" ? "text-zinc-300" : "text-zinc-600";
  const pairs = full ? project.pairs : project.pairs.slice(0, 1);
  const extras = full ? project.extras ?? [] : [];
  return (
    <article data-project={project.slug} className={`rounded-2xl border p-4 ${tone === "dark" ? "border-white/10 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-900 shadow-sm"}`}>
      {project.placeholder && <p className="mb-2 inline-block rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-900" data-sample-project>Sample layout · real photos coming soon</p>}
      <div className="space-y-2">
        {pairs.map((pair, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-2">
            <Frame photo={pair.before} label="Before" tone={tone} />
            <Frame photo={pair.after} label="After" tone={tone} />
          </div>
        ))}
        {extras.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{extras.map((photo) => <Frame key={photo.src} photo={photo} label="After" tone={tone} />)}</div>}
      </div>
      <h3 className="mt-3 font-extrabold">{project.service} <span className={`font-normal ${muted}`}>— {projectTown(project)}</span></h3>
      <p className={`mt-1 text-sm ${muted}`}><span className="font-bold">The problem:</span> {project.problem}</p>
      <p className={`mt-1 text-sm ${muted}`}><span className="font-bold">What we did:</span> {project.solution}</p>
      {review && (
        <blockquote className={`mt-3 border-l-4 border-[#1CA3D8] pl-3 text-sm italic ${muted}`}>
          &ldquo;{quoteFor(review)}&rdquo; <span className="not-italic font-bold">: {review.author}, Google review</span>
        </blockquote>
      )}
    </article>
  );
}
