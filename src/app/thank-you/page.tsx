import type { Metadata } from "next";
import Link from "next/link";
import BrandHeader from "@/components/brand-header";
import BrandFooter from "@/components/brand-footer";
import EmergencyBar from "@/components/emergency-bar";
import Conversion from "./conversion";

export const metadata: Metadata = {
  title: "Thank You | Roofing Near Me STL",
  description: "Your roofing estimate request has been received.",
  robots: { index: false, follow: false },
};

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <Conversion />
      <EmergencyBar />
      <BrandHeader />
      <main className="bg-brand-light/50 border-y px-6 py-16 lg:py-24">
        <div className="max-w-2xl mx-auto bg-white border border-zinc-100 rounded-2xl p-7 sm:p-12 shadow-sm text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-10 w-10" role="img" aria-label="Request received"><path d="m5 12 4 4L19 6" /></svg>
          </div>
          <div className="inline-flex bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">✓ Request Received</div>
          <h1 className="mt-5 text-4xl sm:text-5xl font-black tracking-tight">You&apos;re All Set!</h1>
          <p className="mt-5 text-2xl font-bold">We&apos;ll call within 30 mins</p>
          <p className="mt-3 text-zinc-600">Thanks for choosing Roofing Near Me STL. Your estimate request is saved, and our local crew will be in touch to discuss your roof.</p>
          <div className="mt-7 text-yellow-500 text-3xl tracking-widest" aria-label="5 stars">★★★★★</div>
          <p className="mt-1 text-sm font-bold text-zinc-600">5.0 Google Reviews</p>
          <div className="mt-8 grid sm:grid-cols-3 gap-3 text-sm font-bold">
            <div className="border rounded-xl p-4">✓ Licensed in IL &amp; MO</div>
            <div className="border rounded-xl p-4">✓ Fully Insured</div>
            <div className="border rounded-xl p-4">✓ 10-Yr Workmanship Warranty</div>
          </div>
          <Link href="/" className="inline-block mt-8 bg-brand text-white px-7 py-3 rounded-full font-bold shadow-md shadow-brand/20 hover:bg-brand-dark">Back to Home</Link>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
