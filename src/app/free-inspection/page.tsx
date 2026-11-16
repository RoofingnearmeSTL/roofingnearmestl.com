// /free-inspection: advertising landing page for exterior projects in Missouri and Illinois (Mike's brief, Nov 14 2026).
// Rules: Missouri = roofing + exterior; Illinois = exterior only ("Roofing coming soon after IL license"). Roofing calls go
// to the Missouri number. Prices come only from pricing.ts, as whole-roof totals, and only after a request is saved.
// Unconfirmed claims (two-week starts, cleanup practices) and missing media (ad video, before/after photos) are switched
// off in src/lib/free-inspection.ts and never shown.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BRAND_PROMISE, INSURANCE, INSURANCE_SHORT, LEGAL_NAME, PHONES } from "@/lib/business";
import { visibleProjects } from "@/lib/projects";
import ProjectCard from "@/components/project-card";
import { AD_VIDEO, CLEANUP_CONFIRMED, CLEANUP_PRACTICES, TWO_WEEK_START_CONFIRMED, TWO_WEEK_START_TEXT } from "@/lib/free-inspection";
import { IL_COMING_SOON } from "@/lib/pricing";
import { publicTown, quoteFor, reviews } from "@/lib/reviews";
import { GOOGLE_BUSINESS_URL } from "@/lib/site-pages";
import { AdVideo, ProjectPageProvider, ProjectRequest, ProjectStickyBar, FORM_ID, yellowButton } from "@/components/project-request";

export const metadata: Metadata = {
  title: "Start Your Exterior Project | RoofingnearmeSTL",
  description: "Roofing in Missouri. Siding, gutters, soffit, fascia and more in Missouri and Illinois. Tell us what your home needs and get a clear next step.",
  alternates: { canonical: "/free-inspection" },
  // Ad landing page: kept out of search so it doesn't compete with the service and city pages.
  robots: { index: false, follow: true },
};

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

// Real Google reviews only. A roofing review from an Illinois job stays off this page (it serves Illinois visitors too).
const shownReviews = reviews.filter((r) => !(r.work === "roofing" && r.town?.state === "IL")).slice(0, 2);
// One before & after pair beside the form (below it on phones), never a gallery in front of the form.
const featuredProject = visibleProjects().find((p) => p.featured);
const average = reviews.length ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : null;

const STEPS = [
  { title: "Tell us about your project.", text: "Pick your state and the service you need, and add your contact details. It takes about a minute." },
  { title: "Get an assessment and straightforward options.", text: "We look at what your home needs, take photos as we go, and explain your options in plain words." },
  { title: "Review your quote and arrange the work.", text: "You get a project-specific quote. Nothing is scheduled until you're ready and we've agreed a time." },
];

const FAQS: { q: string; a: string }[] = [
  { q: "Which services do you offer in each state?", a: `Missouri: roofing, plus siding, gutters and downspouts, gutter cleaning and guards, soffit and fascia, trim wraps, porch and patio decks, house and siding soft washing, gable and wall vents, and Christmas lights. Illinois: the same exterior services, without roofing. ${IL_COMING_SOON}.` },
  { q: "What happens after I submit?", a: "Your request is saved and sent to our team right away. During business hours, we call as soon as your request comes in to talk through the project and arrange the next step." },
  { q: "How are appointments confirmed?", a: "We agree a time with you by phone or email. Nothing is booked until we've confirmed a time together." },
  { q: "Which projects qualify for a rough estimate?", a: "Only roof replacements on Missouri homes, in 3-Tab or 30-Year Architectural shingles, when you know your roof size. Clay, metal and slate are custom quotes. Other services get a project-specific quote after we review the details." },
  { q: "Why is the estimate only rough?", a: "It's based only on the roof size, material and pitch you enter. The real cost depends on verified roof measurements, roof condition, materials and project scope. Your inspection determines the final quote." },
  { q: "What if I don't know my roof size?", a: "Check \"I don't know my roof size\" and send your request anyway. We won't guess a number for you: we measure the roof and then quote it. Roof area isn't the same as your home's floor area, because slopes and overhangs add surface." },
  { q: "How is a project-specific quote worked out?", a: "We look at the work in person, measure, check the condition of what's there, and price the materials and scope you choose. You get the quote before anything is scheduled." },
];

function Section({ id, title, eyebrow, children }: { id?: string; title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-white/10 px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {eyebrow && <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#1CA3D8]">{eyebrow}</p>}
        <h2 className="mt-1 text-3xl font-extrabold text-white">{title}</h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

export default function FreeInspectionPage() {
  return (
    <ProjectPageProvider>
      <div className="min-h-screen bg-black text-white">
        <header className="border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <Link href="/" aria-label="RoofingnearmeSTL home" className="flex items-center">
              <Image src="/logo-white.png" alt="RoofingnearmeSTL" width={1400} height={1085} sizes="96px" priority className="h-14 w-auto sm:h-16" />
            </Link>
            <div className="text-right text-xs leading-tight sm:text-sm">
              <a href={PHONES.MO.href} className="block font-bold text-white hover:text-[#1CA3D8]">Missouri roofing &amp; exterior <span className="text-[#1CA3D8]">{PHONES.MO.display}</span></a>
              <a href={PHONES.IL.href} className="mt-1 block font-bold text-white hover:text-[#1CA3D8]">Illinois exterior <span className="text-[#1CA3D8]">{PHONES.IL.display}</span></a>
            </div>
          </div>
        </header>

        <main>
          <section className="px-4 pt-8 pb-12 sm:px-6 lg:pt-12">
            {/* Mobile: headline, short copy, then the form. Desktop: copy and media on the left, form on the right. */}
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_minmax(0,30rem)] lg:grid-rows-[auto_1fr] lg:gap-x-12">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#1CA3D8]">RoofingnearmeSTL · St. Louis Metro Area</p>
                <h1 className="mt-2 text-4xl font-black leading-tight tracking-tight sm:text-5xl">Your Next Exterior Project Starts Here.</h1>
                <p className="mt-4 text-lg text-zinc-200">Tell us what your home needs. Get straightforward answers and a clear next step.</p>
                <p className="mt-3 text-base font-bold text-white">{BRAND_PROMISE}</p>
                {TWO_WEEK_START_CONFIRMED && <p className="mt-3 text-base text-zinc-200">{TWO_WEEK_START_TEXT}</p>}
                <ul className="mt-5 flex flex-wrap gap-2 text-sm font-bold">
                  <li className="rounded-full border border-[#1CA3D8]/60 px-3 py-1">Roofing in Missouri</li>
                  <li className="rounded-full border border-[#1CA3D8]/60 px-3 py-1">Siding, gutters, soffit &amp; fascia in MO + IL</li>
                  <li className="rounded-full border border-[#1CA3D8]/60 px-3 py-1">10-Year Workmanship Warranty</li>
                  {average && <li className="rounded-full border border-[#1CA3D8]/60 px-3 py-1"><span className="text-[#FFD400]">★</span> {average} on Google</li>}
                </ul>
              </div>

              <div id={FORM_ID} className="scroll-mt-4 rounded-2xl border border-white/15 bg-zinc-900 p-5 shadow-xl sm:p-6 lg:row-span-2">
                <h2 className="text-2xl font-extrabold">Start your project request</h2>
                <p className="mt-1 mb-4 text-sm text-zinc-300">Tell us about the property first, then how to reach you.</p>
                <ProjectRequest />
              </div>

              <div className="space-y-4 lg:self-start">
                {AD_VIDEO ? <AdVideo video={AD_VIDEO} /> : (
                  <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
                    <p className="font-bold text-white">What to expect</p>
                    <ul className="mt-3 space-y-2 text-sm text-zinc-200">
                      <li>✓ A local team that answers your questions plainly</li>
                      <li>✓ Photos of what we find, so you see what we see</li>
                      <li>✓ A clear quote before anything is scheduled</li>
                    </ul>
                  </div>
                )}
                {featuredProject && (
                  <div>
                    <ProjectCard project={featuredProject} tone="dark" />
                    <p className="mt-2 text-sm"><a href="/our-work" target="_blank" rel="noopener" className="font-bold text-[#1CA3D8] underline">See more of our work</a> <span className="text-zinc-400">(opens in a new tab)</span></p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <Section id="how-it-works" eyebrow="How it works" title="Three steps, no pressure">
            <ol className="grid gap-4 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1CA3D8] font-black text-black">{i + 1}</span>
                  <p className="mt-3 font-extrabold">{step.title}</p>
                  <p className="mt-1 text-sm text-zinc-300">{step.text}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="trust" eyebrow="Why homeowners choose us" title="Straight answers, backed up">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
                <p className="font-extrabold">10-Year Workmanship Warranty</p>
                <p className="mt-1 text-sm text-zinc-300">Covers our workmanship on the work we do. The manufacturer warranty applies to the materials we install. Ask us how it applies to your project.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
                <p className="font-extrabold">{INSURANCE_SHORT}</p>
                <p className="mt-1 text-sm text-zinc-300">General liability coverage of {money(INSURANCE.eachOccurrence)} per occurrence and {money(INSURANCE.generalAggregate)} aggregate. <Link href="/accreditation" className="underline">See our insurance and certificates</Link>.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
                <p className="font-extrabold">Building Experts Institute certificates</p>
                <p className="mt-1 text-sm text-zinc-300">Mike Williamson completed Building Experts Institute certification in hail and wind damage identification, installation, and building code for asphalt shingle roofs.</p>
              </div>
            </div>
            {shownReviews.length > 0 && (
              <div className="mt-8">
                <p className="text-zinc-200"><span className="text-[#FFD400]">★★★★★</span> {average} Google rating · <a href={GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-[#1CA3D8] underline">Read our reviews on Google</a></p>
                <ul className="mt-4 grid gap-4 md:grid-cols-2">
                  {shownReviews.map((review) => (
                    <li key={`${review.author}-${review.date}`} className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
                      <blockquote className="text-zinc-100">&ldquo;{quoteFor(review)}&rdquo;</blockquote>
                      <p className="mt-3 text-sm font-bold">{review.author}{publicTown(review) ? <span className="font-normal text-zinc-400">, {publicTown(review)}</span> : null}</p>
                      <p className="text-xs text-zinc-400">Google review · {review.work === "roofing" ? (review.town?.state === "MO" ? "Missouri roofing customer" : "Roofing customer") : "Exterior project"}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          {CLEANUP_CONFIRMED && (
            <Section id="cleanup" eyebrow="Respect for your property" title="How we clean up">
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {CLEANUP_PRACTICES.map((item) => (
                  <li key={item.title} className="rounded-2xl border border-[#1CA3D8]/40 bg-zinc-900 p-5">
                    <p className="font-extrabold">{item.title}</p>
                    <p className="mt-1 text-sm text-zinc-300">{item.text}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section id="missouri-roofing" eyebrow="Missouri roofing" title="Shingle brands we install in Missouri">
            <p className="max-w-3xl text-zinc-200">For Missouri roofing projects we install shingles from Owens Corning, CertainTeed, TAMKO and IKO. The manufacturer warranty applies to the materials we install. Roofing in Illinois: {IL_COMING_SOON}.</p>
          </Section>

          <Section id="faq" eyebrow="Questions" title="Good to know before you start">
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details key={item.q} className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
                  <summary className="cursor-pointer font-bold">{item.q}</summary>
                  <p className="mt-2 text-zinc-300">{item.a}</p>
                </details>
              ))}
            </div>
          </Section>

          <section className="border-t border-white/10 px-4 py-14 text-center sm:px-6">
            <h2 className="text-3xl font-extrabold">Let&apos;s Talk About Your Project.</h2>
            <p className="mt-2 text-zinc-300">One short form, then a real person gets back to you.</p>
            <a href={`#${FORM_ID}`} className={`${yellowButton} mt-6`}>Start My Project</a>
            <p className="mt-4 text-sm text-zinc-300">Or call Missouri <a href={PHONES.MO.href} className="font-bold text-[#1CA3D8]">{PHONES.MO.display}</a> · Illinois exterior <a href={PHONES.IL.href} className="font-bold text-[#1CA3D8]">{PHONES.IL.display}</a></p>
          </section>
        </main>

        <footer className="border-t border-white/10 px-4 py-10 text-sm text-zinc-400 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-bold text-white">RoofingnearmeSTL</p>
              <p>{LEGAL_NAME} · 421 Janice Dr, Waterloo, IL 62298</p>
              <p>Roofing in Missouri · Siding, gutters, soffit &amp; fascia in MO + IL</p>
            </div>
            <nav aria-label="Company" className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/" className="hover:text-white">Home</Link>
              <Link href="/services" className="hover:text-white">Services</Link>
              <Link href="/areas-we-serve" className="hover:text-white">Areas We Serve</Link>
              <Link href="/accreditation" className="hover:text-white">Insurance &amp; Certifications</Link>
              <Link href="/questions" className="hover:text-white">Questions</Link>
              <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            </nav>
          </div>
          <p className="mx-auto mt-6 max-w-6xl text-xs">© {new Date().getFullYear()} RoofingnearmeSTL</p>
        </footer>
        <ProjectStickyBar />
      </div>
    </ProjectPageProvider>
  );
}
