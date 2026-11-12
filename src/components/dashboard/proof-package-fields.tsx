// Small form pieces for the proof package builder. Imported only by the builder (a client component), so they run in
// the browser with it and need no client directive of their own.
import type { ReactNode } from "react";

export const input = "mt-1 block min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 font-normal text-zinc-900";
export const btn = "inline-flex min-h-11 items-center justify-center rounded-full px-5 font-bold";
export const btnMain = `${btn} bg-brand-ink text-white hover:bg-brand-ink-dark disabled:opacity-50`;
export const btnLine = `${btn} border border-zinc-300 bg-white text-brand-ink hover:bg-brand-light disabled:opacity-50`;
export const small = "inline-flex min-h-9 items-center rounded-full border border-zinc-300 bg-white px-3 text-sm font-bold text-brand-ink hover:bg-brand-light disabled:opacity-40";

export function Card({ title, hint, children, id }: { title: string; hint?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
      <h2 className="text-xl font-black tracking-tight">{title}</h2>
      {hint && <p className="mt-1 text-sm text-zinc-600">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 border-t border-zinc-100 pt-4 first:border-0 first:pt-0">
      <h3 className="text-base font-black text-brand-ink">{title}</h3>
      {children}
    </div>
  );
}

export function Text({ label, value, onChange, type = "text", placeholder, max = 200, list }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; max?: number; list?: string }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input type={type} value={value} maxLength={max} placeholder={placeholder} list={list} onChange={(e) => onChange(e.target.value)} className={input} />
    </label>
  );
}

export function Area({ label, value, onChange, rows = 4, hint }: { label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      {hint && <span className="block text-xs font-normal text-zinc-600">{hint}</span>}
      <textarea value={value} rows={rows} maxLength={8000} onChange={(e) => onChange(e.target.value)} className={`${input} py-2`} />
    </label>
  );
}

export function Pick({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly { id: string; label: string }[] }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <select className={input} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm font-bold">
      <input type="checkbox" className="h-5 w-5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** A link to an outside tool. Opens in a new tab and sends nothing from the builder. */
export function ToolLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={small}>
      {children} ↗
    </a>
  );
}
