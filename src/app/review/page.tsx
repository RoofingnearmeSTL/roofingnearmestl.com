import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import BrandFooter from "@/components/brand-footer";
import ReviewButtons from "@/components/review-buttons";

// Short, shareable review link (QR cards, texts, emails, invoices): roofingnearmestl.com/review
// Every customer sees the same choices; there is no filtering of happy vs. unhappy customers.
export const metadata: Metadata = {
  title: "Leave a Review | RoofingnearmeSTL",
  description: "Thank you for choosing RoofingnearmeSTL. Share your experience on Google or Facebook.",
  alternates: { canonical: "/review" },
  robots: { index: false, follow: true },
};

export default function ReviewPage() {
  return (
    <div className="min-h-screen bg-brand-light/50 text-zinc-900 flex flex-col">
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-7 text-center shadow-sm sm:p-10">
          <Link href="/" aria-label="RoofingnearmeSTL home"><Image src="/logo.png" alt="RoofingnearmeSTL" width={380} height={295} priority className="mx-auto h-28 w-auto" /></Link>
          <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">Thank you for choosing us!</h1>
          <p className="mt-4 text-zinc-600 leading-relaxed">We&apos;re a local roofing company, and honest reviews from neighbors like you are how other homeowners find us. It takes about a minute.</p>
          <ReviewButtons placement="review_page" className="mt-8 justify-center" />
          <div className="mt-8 rounded-xl bg-zinc-50 p-5 text-left text-sm text-zinc-600">
            <p className="font-bold text-black">Not sure what to write? You might mention:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>What you needed (repair, replacement, storm inspection…)</li>
              <li>Your town</li>
              <li>How the inspection, photos and communication went</li>
            </ul>
          </div>
          <p className="mt-6 text-xs text-zinc-500">Reviews are completely optional and never rewarded. Thank you for your time.</p>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
