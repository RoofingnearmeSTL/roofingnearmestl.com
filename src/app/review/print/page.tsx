import type { Metadata } from "next";

// Print-ready sheet of 4 review cards (US Letter). Open /review/print and press Ctrl+P.
// The QR code opens roofingnearmestl.com/review?utm_source=qr&utm_medium=print&utm_campaign=review_card
export const metadata: Metadata = {
  title: "Review Cards (Print) | RoofingnearmeSTL",
  alternates: { canonical: "/review/print" },
  robots: { index: false, follow: false },
};

function Card() {
  return (
    <div className="flex flex-col items-center justify-between rounded-xl border-2 border-dashed border-zinc-300 p-5 text-center break-inside-avoid">
      {/* eslint-disable-next-line @next/next/no-img-element -- static print asset */}
      <img src="/logo.png" alt="RoofingnearmeSTL" className="h-16 w-auto" />
      <p className="mt-2 text-lg font-black leading-tight">Thank you for choosing us!</p>
      <p className="text-sm text-zinc-600">Scan to leave a quick review on Google or Facebook</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- static print asset */}
      <img src="/review-qr.svg" alt="QR code: roofingnearmestl.com/review" className="my-3 h-40 w-40" />
      <p className="text-sm font-bold">roofingnearmestl.com/review</p>
      <p className="text-xs text-zinc-500">IL 618-612-5192 · MO 314-202-7663</p>
    </div>
  );
}

export default function ReviewPrintPage() {
  return (
    <main className="mx-auto max-w-[8.5in] bg-white p-[0.4in] text-black">
      <p className="mb-4 text-center text-sm text-zinc-500 print:hidden">Print this page (Ctrl+P) on US Letter, then cut along the dashed lines. 4 cards per sheet.</p>
      <div className="grid grid-cols-2 gap-[0.3in]">
        <Card /><Card /><Card /><Card />
      </div>
    </main>
  );
}
