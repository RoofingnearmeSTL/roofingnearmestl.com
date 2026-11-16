// ─────────────────────────────────────────────────────────────────────────────
// OUR WORK: before & after projects (Mike, Nov 15 2026)
//
// HOW TO ADD A REAL PROJECT
// 1. Put the photos in public/projects/<slug>/ (e.g. before-1.jpg, after-1.jpg), straight from the phone is fine.
//    Same angle before and after. Crop or blur house numbers, street signs, plates and people first.
// 2. Add an entry below with `permission.photos: true` (the homeowner said yes, in writing).
//    Set `town` only if the homeowner also OK'd naming the town (`permission.town: true`). Never a street address.
// 3. Delete one `placeholder: true` entry. Placeholders never show on the live site (see showProject).
//
// Rules (checked when the site builds and by tests/projects.test.mjs):
// - Real photos of our own work only. No stock, no AI images, no editing beyond brightness and cropping.
// - Roofing projects are Missouri only (no Illinois roofing license yet). Illinois projects are exterior work only.
// - state "METRO" (Mike, Nov 15 2026): a universal St. Louis Metro example shown for both states. Exterior work only,
//   no roofing wording, no state-specific phone number; labelled "St. Louis Metro".
// - `review` names a real review in reviews.ts from the same customer, for the same kind of work.
// ─────────────────────────────────────────────────────────────────────────────
import { reviews, type Review } from "./reviews";

export type ProjectPhoto = { src: string; alt: string; width: number; height: number };

export type Project = {
  slug: string;
  /** Sample layout until Mike sends real photos. Shown only on local and preview builds, never on the live site. */
  placeholder?: true;
  service: string;
  work: "roofing" | "exterior";
  /** "METRO" = universal St. Louis Metro example for both states (exterior work only). */
  state: "MO" | "IL" | "METRO";
  /** Only with the homeowner's OK (permission.town). */
  town?: string;
  /** One line: what was wrong. */
  problem: string;
  /** One line: what we did, with the material or brand installed. */
  solution: string;
  pairs: { before: ProjectPhoto | null; after: ProjectPhoto | null }[];
  /** Extra after photos (detail shots with no matching before). Shown on /our-work only. */
  extras?: ProjectPhoto[];
  /** Filters on /our-work this project appears under. Default: worked out from `service`. */
  filters?: ServiceFilter[];
  permission: { photos: boolean; town: boolean };
  /** Author of the same customer's review in reviews.ts, word for word as listed there. */
  review?: string;
  featured?: boolean;
};

export const SERVICE_FILTERS = ["Roofing", "Siding", "Gutters", "Soffit & Fascia"] as const;
export type ServiceFilter = (typeof SERVICE_FILTERS)[number];

const metro = "/projects/st-louis-metro-siding-gutters-fascia";

export const projects: Project[] = [
  {
    // Mike, Nov 15 2026: one real job, used as the universal before & after for both states until more jobs arrive.
    // Homeowner gave permission for the photos. No street address, homeowner name or price, ever.
    slug: "st-louis-metro-siding-gutters-fascia",
    service: "Siding, Gutters, Fascia & Window Wraps",
    work: "exterior",
    state: "METRO",
    problem: "Original beige vinyl siding, gutters and trim on a two-story home.",
    solution: "New dark gray vinyl lap siding with board & batten on the front, new black gutters and downspouts, new fascia and window wraps.",
    pairs: [
      {
        before: { src: `${metro}/before-1.jpg`, alt: "Side of a two-story home with beige vinyl siding before the project", width: 1536, height: 1152 },
        after: { src: `${metro}/after-1.jpg`, alt: "The same side of the home after new dark gray siding, black gutters and white fascia", width: 1152, height: 1536 },
      },
      {
        before: { src: `${metro}/before-2.jpg`, alt: "Back of the home with beige siding and gable vents before the project", width: 1536, height: 1152 },
        after: { src: `${metro}/after-2.jpg`, alt: "Back corner of the home after new dark gray siding, black gutters and downspouts, and window wraps", width: 1536, height: 1152 },
      },
    ],
    extras: [{ src: `${metro}/after-front.jpg`, alt: "Front of the home after: board & batten siding, black gutters, new fascia and window wraps", width: 1170, height: 1565 }],
    filters: ["Siding", "Gutters", "Soffit & Fascia"],
    permission: { photos: true, town: false },
    featured: true,
  },
  {
    slug: "sample-roof-replacement",
    placeholder: true,
    service: "Roof replacement",
    work: "roofing",
    state: "MO",
    problem: "Sample project: the real problem we found goes here.",
    solution: "Sample project: what we installed (for example, 30-year architectural shingles) goes here.",
    pairs: [{ before: null, after: null }],
    permission: { photos: false, town: false },
    featured: true,
  },
  {
    slug: "sample-storm-damage-roof",
    placeholder: true,
    service: "Storm damage roof repair",
    work: "roofing",
    state: "MO",
    problem: "Sample project: the storm damage we documented goes here.",
    solution: "Sample project: the repair we made goes here.",
    pairs: [{ before: null, after: null }],
    permission: { photos: false, town: false },
    featured: true,
  },
];

/**
 * Placeholders show only where no customer sees them: on this PC and on Vercel preview links. Never on a production
 * build (VERCEL_ENV=production) and never on a build of the main branch, so a promoted deployment cannot leak them.
 */
export function samplesAllowed(env: Record<string, string | undefined> = process.env): boolean {
  if (typeof window !== "undefined") return false; // in a browser bundle the env is unknown: assume live
  return env.VERCEL_ENV !== "production" && env.VERCEL_GIT_COMMIT_REF !== "main";
}

export function showProject(project: Project, env?: Record<string, string | undefined>): boolean {
  if (project.placeholder) return samplesAllowed(env);
  return project.permission.photos && project.pairs.every((pair) => pair.before && pair.after);
}

export const visibleProjects = (env?: Record<string, string | undefined>) => projects.filter((p) => showProject(p, env));
/** True when the live site has at least one real project: the Our Work page, menu link and sections show. */
export const hasRealProjects = () => projects.some((p) => !p.placeholder && showProject(p));

export function serviceFilter(project: Project): ServiceFilter {
  if (project.work === "roofing") return "Roofing";
  if (/gutter/i.test(project.service)) return "Gutters";
  if (/soffit|fascia/i.test(project.service)) return "Soffit & Fascia";
  return "Siding";
}

export const serviceFilters = (project: Project): ServiceFilter[] => project.filters ?? [serviceFilter(project)];

export function projectTown(p: Project): string {
  if (p.state === "METRO") return "St. Louis Metro";
  return p.town && p.permission.town ? `${p.town}, ${p.state}` : p.state === "MO" ? "Missouri" : "Illinois";
}
export const projectReview = (p: Project): Review | undefined => (p.review ? reviews.find((r) => r.author === p.review) : undefined);

/** Build-time guard, same idea as assertIllinoisExteriorOnly: a bad entry stops the build. */
export function assertProjectRules(list: Project[] = projects): void {
  const slugs = new Set<string>();
  for (const p of list) {
    if (slugs.has(p.slug)) throw new Error(`Duplicate project slug: ${p.slug}`);
    slugs.add(p.slug);
    if (p.work === "roofing" && p.state !== "MO") throw new Error(`Project ${p.slug}: roofing projects are Missouri only`);
    if (p.state === "IL" && /roof/i.test(`${p.service} ${p.solution}`)) throw new Error(`Project ${p.slug}: Illinois projects are exterior work only`);
    if (p.state === "METRO" && (p.work !== "exterior" || /roof/i.test(`${p.service} ${p.problem} ${p.solution}`))) throw new Error(`Project ${p.slug}: St. Louis Metro projects show in both states, so exterior work only`);
    if (p.state === "METRO" && p.town) throw new Error(`Project ${p.slug}: a St. Louis Metro project names no town`);
    if (p.town && !p.permission.town) throw new Error(`Project ${p.slug}: a town needs the homeowner's OK (permission.town)`);
    if (/\d+\s+\w+\s+(st|street|ave|avenue|rd|road|dr|drive|ln|lane|ct|court)\b/i.test(`${p.town ?? ""} ${p.problem} ${p.solution}`)) throw new Error(`Project ${p.slug}: no street addresses`);
    if (/\$\d/.test(`${p.problem} ${p.solution}`)) throw new Error(`Project ${p.slug}: no prices on project cards`);
    if (!p.placeholder) {
      if (!p.permission.photos) throw new Error(`Project ${p.slug}: needs the homeowner's written OK for photos`);
      for (const pair of p.pairs) {
        for (const photo of [pair.before, pair.after, ...(pair === p.pairs[0] ? p.extras ?? [] : [])]) {
          if (!photo) throw new Error(`Project ${p.slug}: every pair needs a before and an after photo`);
          if (!photo.src.startsWith(`/projects/${p.slug}/`)) throw new Error(`Project ${p.slug}: photos live in public/projects/${p.slug}/`);
          if (!photo.alt.trim()) throw new Error(`Project ${p.slug}: every photo needs alt text`);
        }
      }
    }
    if (p.review) {
      const review = projectReview(p);
      if (!review) throw new Error(`Project ${p.slug}: review "${p.review}" is not in reviews.ts`);
      if (review.work !== p.work) throw new Error(`Project ${p.slug}: the linked review is for different work`);
    }
  }
}

assertProjectRules();
