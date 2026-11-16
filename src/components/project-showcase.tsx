// One real job, full width: every before (and "during") photo on top, every after photo below (Mike, Nov 15 2026).
// Used on the homepage for the featured jobs and for each real job on /our-work, so there is no empty space beside
// a lone card. When both rows have the same number of photos, each after photo sits under the before or during shot
// from the same spot. Phones: one photo per row, full width (stacked), in walkthrough order. Each photo opens full
// size in a new tab. No carousel, no auto-rotation.
import Image from "next/image";
import { projectTown, type Project, type ProjectPhoto } from "@/lib/projects";

type Label = "Before" | "During" | "After";
const BADGE: Record<Label, string> = {
  Before: "bg-black/75 text-white",
  During: "bg-[#1CA3D8] text-black",
  After: "bg-[#FFD400] text-black",
};

/** Same column count on every screen size for the same number of photos, so two rows of 3 line up. */
const COLS: Record<number, { grid: string; sizes: string }> = {
  1: { grid: "", sizes: "(min-width: 1280px) 76rem, 100vw" },
  2: { grid: "sm:grid-cols-2", sizes: "(min-width: 1280px) 38rem, (min-width: 640px) 50vw, 100vw" },
  3: { grid: "sm:grid-cols-3", sizes: "(min-width: 1280px) 25rem, (min-width: 640px) 33vw, 100vw" },
};
const cols = (n: number) => COLS[Math.min(n, 3)] ?? COLS[3];

function Photo({ photo, label, sizes }: { photo: ProjectPhoto; label: Label; sizes: string }) {
  return (
    <figure className="relative">
      <a href={photo.src} target="_blank" rel="noopener" aria-label={`${label}: ${photo.alt} (opens full size in a new tab)`} className="block overflow-hidden rounded-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand">
        <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes={sizes} className="aspect-[4/3] w-full object-cover transition-transform duration-300 hover:scale-[1.02]" />
      </a>
      <figcaption className={`pointer-events-none absolute top-2 left-2 rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wide ${BADGE[label]}`}>{label}</figcaption>
    </figure>
  );
}

export const showcasePhotos = (project: Project) => ({
  before: project.pairs.flatMap((pair) => (pair.before ? [pair.before] : [])),
  after: [...project.pairs.flatMap((pair) => (pair.after ? [pair.after] : [])), ...(project.extras ?? [])],
});

export default function ProjectShowcase({ project }: { project: Project }) {
  const { before, after } = showcasePhotos(project);
  const top = cols(before.length);
  const bottom = cols(after.length);
  const during = before.some((photo) => photo.stage === "During");
  return (
    <article data-project={project.slug} data-showcase className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-zinc-500">{during ? "Before & during" : "Before"}</h3>
          <div className={`grid gap-3 ${top.grid}`}>
            {before.map((photo) => <Photo key={photo.src} photo={photo} label={photo.stage ?? "Before"} sizes={top.sizes} />)}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-zinc-500">After</h3>
          <div className={`grid gap-3 ${bottom.grid}`}>
            {after.map((photo) => <Photo key={photo.src} photo={photo} label="After" sizes={bottom.sizes} />)}
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
