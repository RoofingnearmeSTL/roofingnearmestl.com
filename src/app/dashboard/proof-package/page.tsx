import type { Metadata } from "next";
import ProofPackageBuilder from "@/components/dashboard/proof-package-builder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Evidence package | RoofingnearmeSTL",
  robots: { index: false, follow: false, nocache: true },
};

export default function ProofPackagePage() {
  return (
    <>
      <h1 className="text-3xl font-black tracking-tight">Evidence package builder</h1>
      <p className="mt-1 max-w-3xl text-sm text-zinc-600">
        Builds a roof system evidence package (proof package) for an insurance claim in the same order as Mike&apos;s: cover and
        construction opinion, damage summary, weather and hail, code and manufacturer requirements with the ice &amp; water shield
        and ventilation math, scope and cost, the photo report and the attachments. Photos and documents stay on this computer;
        drafts save in this browser as you type.
      </p>
      <div className="mt-6">
        <ProofPackageBuilder />
      </div>
    </>
  );
}
