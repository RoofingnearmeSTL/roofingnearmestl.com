import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { checkBasicAuth } from "@/lib/dashboard-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Owner dashboard | RoofingnearmeSTL",
  robots: { index: false, follow: false, nocache: true },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: the proxy already checks the password; this check means a matcher mistake still cannot expose the pages.
  const h = await headers();
  if (checkBasicAuth(h.get("authorization"), process.env.DASHBOARD_PASSWORD) !== "ok") notFound();
  return (
    <div className="min-h-screen bg-brand-light/40 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="RoofingnearmeSTL" width={380} height={295} className="h-16 w-auto" priority />
            <span className="text-sm font-bold text-zinc-600">Owner dashboard</span>
          </div>
          <nav aria-label="Dashboard" className="flex flex-wrap gap-2 text-sm font-bold">
            <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-full px-4 text-brand-ink hover:bg-brand-light">Overview</Link>
            <Link href="/dashboard/proof-package" className="inline-flex min-h-11 items-center rounded-full px-4 text-brand-ink hover:bg-brand-light">Proof package</Link>
            <Link href="/dashboard/brain" className="inline-flex min-h-11 items-center rounded-full px-4 text-brand-ink hover:bg-brand-light">Brain notes</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
