import type { ReactNode } from "react";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-600">{label}</p>
      <p className="mt-1 text-2xl font-black text-brand-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="text-xs text-zinc-500">{children}</p>;
}

export function StatusPill({ status, children }: { status: "ok" | "off" | "missing"; children: ReactNode }) {
  const style = status === "ok" ? "bg-green-100 text-green-800" : status === "off" ? "bg-zinc-100 text-zinc-700" : "bg-amber-100 text-amber-900";
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${style}`}>{children}</span>;
}

export function NotSetUp({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>Not set up yet:</strong> {children}</p>;
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-zinc-200 bg-white p-4">{children}</div>;
}
