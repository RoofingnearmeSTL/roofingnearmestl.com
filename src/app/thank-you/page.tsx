import type { Metadata } from "next";
import Link from "next/link";
import BrandHeader from "@/components/brand-header";
import BrandFooter from "@/components/brand-footer";
import EmergencyBar from "@/components/emergency-bar";
import { PHONES } from "@/lib/business";
import Conversion from "./conversion";

export const metadata: Metadata = {
  title: "Thank You | RoofingnearmeSTL",
  alternates: { canonical: "/thank-you" },
  description: "Your estimate request has been received.",
  robots: { index: false, follow: false },
};

// ?area=il         an Illinois exterior request (siding, gutters, soffit & fascia and other exterior work)
// ?area=il-pending a roofing request for an Illinois home: saved, but no roof work until the IL license
// &urgent=1        the homeowner checked the emergency box
export default async function ThankYou({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const query = await searchParams;
  const area = query.area === "il" || query.area === "il-pending" ? query.area : "";
  const illinois = area !== "";
  const pending = area === "il-pending";
  const urgent = pending && query.urgent === "1";
  const phone = illinois ? PHONES.IL : PHONES.MO;

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <Conversion />
      {!illinois && <EmergencyBar />}
      <BrandHeader />
      <main className="bg-brand-light/50 border-y px-6 py-16 lg:py-24">
        <div className="max-w-2xl mx-auto bg-white border border-zinc-100 rounded-2xl p-7 sm:p-12 shadow-sm text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-10 w-10" role="img" aria-label="Request received"><path d="m5 12 4 4L19 6" /></svg>
          </div>
          <div className="inline-flex bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">✓ Request Received</div>
          <h1 className="mt-5 text-4xl sm:text-5xl font-black tracking-tight">You&apos;re All Set!</h1>
          {pending ? (
            <>
              <p className="mt-5 text-2xl font-bold">{urgent ? "We'll call you as soon as we can" : "Our local team will call you"}</p>
              <p className="mt-3 text-zinc-600">
                {urgent
                  ? <>Thanks for reaching out to RoofingnearmeSTL. Water coming in? Call us now at <a href={PHONES.IL.href} className="font-bold text-brand-ink">{PHONES.IL.display}</a> and we&apos;ll point you to a licensed Illinois roofer right away.</>
                  : <>Thanks for choosing RoofingnearmeSTL. Your request is saved. If your roof needs work now, we&apos;ll point you to a licensed Illinois roofer, and we can help right away with siding, gutters, soffit, fascia and other exterior work.</>}
              </p>
            </>
          ) : (
            <>
              <p className="mt-5 text-2xl font-bold">We&apos;ll call within 30 mins</p>
              <p className="mt-3 text-zinc-600">Thanks for choosing RoofingnearmeSTL. Your estimate request is saved, and our local crew will be in touch to discuss your {illinois ? "project" : "roof"}.</p>
            </>
          )}
          <div className="mt-7 text-yellow-500 text-3xl tracking-widest" aria-label="5 stars">★★★★★</div>
          <p className="mt-1 text-sm font-bold text-zinc-600">5.0 Google Reviews</p>
          <div className="mt-8 grid sm:grid-cols-3 gap-3 text-sm font-bold">
            <div className="border rounded-xl p-4">✓ Local in IL &amp; MO</div>
            <div className="border rounded-xl p-4">✓ Fully Insured</div>
            <div className="border rounded-xl p-4">✓ 10-Yr Workmanship Warranty</div>
          </div>
          {illinois && <p className="mt-6 text-sm text-zinc-600">Illinois line: <a href={phone.href} className="font-bold text-brand-ink">{phone.display}</a></p>}
          <Link href="/" className="inline-block mt-8 bg-brand-ink text-white px-7 py-3 rounded-full font-bold shadow-md shadow-brand/20 hover:bg-brand-ink-dark">Back to Home</Link>
          {/* Small print, like a disclaimer (Mike, Oct 29). */}
          {pending && (
            <p className="mt-8 text-xs leading-snug text-zinc-500">
              Roofing in Illinois is pending our Illinois roofing license, which we expect soon. Until then we don&apos;t quote, schedule or do roof work on Illinois homes. We&apos;ve saved your request and will reach out when roofing opens for Illinois.
            </p>
          )}
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
