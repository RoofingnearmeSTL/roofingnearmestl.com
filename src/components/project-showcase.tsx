// One real job, full width: every before photo on top, every after photo below (Mike, Nov 15 2026).
// Used on the homepage while there is one featured job, and for each real job on /our-work, so there is no empty
// space beside a lone card. Phones: one photo per row, full width (stacked). Each photo opens full size in a new
// tab. No carousel, no auto-rotation.
import Image from "next/image";
import { projectTown, type Project, type ProjectPhoto } from "@/lib/projects";

function Photo({ photo, label, sizes }: { photo: ProjectPhoto; label: "Before" | "After"; sizes: string }) {
  const badge = label === "Before" ? "bg-black/75 text-white" : "bg-[#FFD400] text-black";
  return (
    <figure className="relative">
      <a href={photo.src} target="_blank" rel="noopener" aria-label={`${photo.alt} (opens full size in a new tab)`} className="block overflow-hidden rounded-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand">
        <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes={sizes} className="aspect-[4/3] w-full object-cover transition-transform duration-300 hover:scale-[1.02]" />
      </a>
      <figcaption className={`pointer-events-none absolute top-2 left-2 rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wide ${badge}`}>{label}</figcaption>
    </figure>
  );
}

export const showcasePhotos = (project: Project) => ({
  before: project.pairs.flatMap((pair) => (pair.before ? [pair.before] : [])),
  after: [...project.pairs.flatMap((pair) => (pair.after ? [pair.after] : [])), ...(project.extras ?? [])],
});

export default function ProjectShowcase({ project }: { project: Project }) {
  const { before, after } = showcasePhotos(project);
  const afterCols = after.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <article data-project={project.slug} data-showcase className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-zinc-500">Before</h3>
          <div className={`grid gap-3 sm:grid-cols-2 ${before.length >= 3 ? "lg:grid-cols-3" : ""}`}>
            {before.map((photo) => <Photo key={photo.src} photo={photo} label="Before" sizes="(min-width: 1280px) 38rem, (min-width: 640px) 50vw, 100vw" />)}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-zinc-500">After</h3>
          <div className={`grid gap-3 ${afterCols}`}>
            {after.map((photo) => <Photo key={photo.src} photo={photo} label="After" sizes="(min-width: 1280px) 25rem, (min-width: 640px) 33vw, 100vw" />)}
          </div>
        </div>
      </div>
      <h3 className="mt-5 text-xl font-extrabold text-zinc-900">{project.service} <span className="font-normal text-zinc-600">— {projectTown(project)}</span></h3>
      <p className="mt-1 text-zinc-600"><span className="font-bold">The problem:</span> {project.problem}</p>
      <p className="mt-1 text-zinc-600"><span className="font-bold">What we did:</span> {project.solution}</p>
      <p className="mt-2 text-xs text-zinc-500">Tap any photo to see it full size.</p>
    </article>
  );
}
