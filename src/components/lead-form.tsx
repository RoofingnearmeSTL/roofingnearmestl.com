"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { LEAD_SERVICES } from "@/lib/site-pages";

function subscribeToLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("hashchange", onChange);
  };
}

const getLocationSnapshot = () => window.location.href;
const getServerLocationSnapshot = () => "";

// The campaign tags a visitor arrived with are remembered (30 days) so a lead submitted
// on a later page, or a later visit, is still credited to the ad/post that brought them in.
const SOURCE_KEY = "roofing-lead-source";
const SOURCE_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"] as const;
type LeadSource = Partial<Record<(typeof SOURCE_PARAMS)[number] | "landing_page", string>> & { saved_at?: number };

export function rememberLandingSource() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!SOURCE_PARAMS.some((key) => params.get(key))) return;
    const source: LeadSource = { landing_page: window.location.href.slice(0, 500), saved_at: Date.now() };
    for (const key of SOURCE_PARAMS) {
      const value = params.get(key);
      if (value) source[key] = value.slice(0, 300);
    }
    localStorage.setItem(SOURCE_KEY, JSON.stringify(source));
  } catch {
    // Storage can be blocked; the current URL is still used at submit time.
  }
}

function rememberedSource(): LeadSource {
  try {
    const source: LeadSource = JSON.parse(localStorage.getItem(SOURCE_KEY) ?? "{}");
    if (!source.saved_at || Date.now() - source.saved_at > 30 * 24 * 60 * 60 * 1000) return {};
    return source;
  } catch {
    return {};
  }
}

export function useLandingUtm() {
  const landing = useSyncExternalStore(subscribeToLocation, getLocationSnapshot, getServerLocationSnapshot);
  const p = new URLSearchParams(landing ? new URL(landing).search : "");
  const current = SOURCE_PARAMS.some((key) => p.get(key)) || p.get("source");
  // No tags on this URL: fall back to the ones remembered from the visitor's landing page.
  const saved: LeadSource = !current && landing ? rememberedSource() : {};
  return {
    source: p.get("utm_source") || p.get("source") || saved.utm_source || "",
    medium: p.get("utm_medium") || saved.utm_medium || "",
    campaign: p.get("utm_campaign") || saved.utm_campaign || "",
    content: p.get("utm_content") || saved.utm_content || "",
    term: p.get("utm_term") || saved.utm_term || "",
    gclid: p.get("gclid") || saved.gclid || "",
    fbclid: p.get("fbclid") || saved.fbclid || "",
    landing: saved.landing_page || landing,
  };
}

const SERVICES = LEAD_SERVICES;
const inputClass = "w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-black placeholder:text-zinc-400 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none";

// Extra fields merged into the lead payload, e.g. the homepage cost estimator selections.
export type LeadExtras = Record<string, string | number | null | undefined>;

export default function LeadForm({ extras, defaultService = "Roof Repair", defaultCity = "", footer }: {
  extras?: LeadExtras;
  defaultService?: string;
  defaultCity?: string;
  footer?: React.ReactNode;
}) {
  const router = useRouter();
  const utm = useLandingUtm();
  const [sending, setSending] = useState(false);

  async function handleLeadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(sending) return;
    setSending(true);
    const fd = new FormData(e.target as HTMLFormElement);
    const payload = {
      ...extras,
      name: fd.get("name"),
      phone: fd.get("phone"),
      email: fd.get("email") || extras?.est_email || null,
      city: fd.get("city") || null,
      address: fd.get("address"),
      service_type: fd.get("service"),
      issue_type: fd.get("issue_type"),
      roof_age: fd.get("roof_age"),
      emergency: fd.get("emergency") === "on",
      message: fd.get("details"),
      company: fd.get("company"),
      utm_source: utm.source,
      utm_medium: utm.medium,
      utm_campaign: utm.campaign,
      utm_content: utm.content,
      utm_term: utm.term,
      gclid: utm.gclid,
      fbclid: utm.fbclid,
      landing_page: utm.landing,
      page: typeof window !== 'undefined' ? window.location.href : '',
    };
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if(res.ok){
        const result: { data?: { id?: string | number }[] } = await res.json();
        try {
          sessionStorage.setItem("roofing-lead-conversion", JSON.stringify({
            id: String(result.data?.[0]?.id ?? crypto.randomUUID()),
          }));
        } catch {
          // Storage restrictions must not prevent confirmation of a saved lead.
        }
        router.push("/thank-you");
      } else {
        alert("Error - please call Illinois: 618-612-5192 or Missouri: 314-202-7663");
      }
    } catch {
      alert("Error - please call Illinois: 618-612-5192 or Missouri: 314-202-7663");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleLeadSubmit}>
      <input name="name" required maxLength={100} autoComplete="name" placeholder="Your Name *" aria-label="Your name" className={inputClass} />
      <input name="phone" required type="tel" inputMode="tel" maxLength={30} pattern="(?:\D*\d){10,}\D*" title="Please enter a 10-digit phone number" autoComplete="tel" placeholder="Phone Number *" aria-label="Phone number" className={inputClass} />
      <input name="city" defaultValue={defaultCity} maxLength={80} autoComplete="address-level2" placeholder="City" aria-label="City" className={inputClass} />
      <select name="service" defaultValue={defaultService} aria-label="Service needed" className={inputClass}>
        {SERVICES.map((service) => <option key={service}>{service}</option>)}
      </select>
      <label className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-black">
        <input name="emergency" type="checkbox" className="h-5 w-5 accent-brand" />
        Active leak? Need an emergency tarp now
      </label>
      {/* Spam trap: hidden from people, bots fill it in. */}
      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />
      <details className="group rounded-xl border border-zinc-200 bg-white/70 px-4 py-3 text-sm text-black">
        <summary className="cursor-pointer list-none font-semibold text-zinc-700 [&::-webkit-details-marker]:hidden"><span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span> Add more details (optional)</summary>
        <div className="mt-3 space-y-3">
          <input name="email" type="email" maxLength={254} autoComplete="email" placeholder="Email" aria-label="Email" className={inputClass} />
          <input name="address" maxLength={200} autoComplete="street-address" placeholder="Street address" aria-label="Street address" className={inputClass} />
          <label className="block font-semibold">
            Issue
            <input name="issue_type" maxLength={200} placeholder="Leak, storm damage, aging roof, or other issue" className="mt-1 w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-black" />
          </label>
          <label className="block font-semibold">
            Age of Roof
            <select name="roof_age" defaultValue="Unknown" className="mt-1 w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-black">
              <option value="<5 years">&lt;5 years</option>
              <option value="5-10 years">5-10 years</option>
              <option value="10-15 years">10-15 years</option>
              <option value="15-20 years">15-20 years</option>
              <option value="20+ years">20+ years</option>
              <option value="Unknown">Unknown</option>
            </select>
          </label>
          <textarea name="details" maxLength={2000} placeholder="What's going on with your roof?" aria-label="What's going on with your roof?" rows={3} className={inputClass}></textarea>
        </div>
      </details>
      <button disabled={sending} className="w-full bg-brand py-4 rounded-full shadow-md shadow-brand/20 text-white text-base font-extrabold tracking-wide hover:bg-brand-dark disabled:opacity-50">
        {sending ? "Sending..." : "GET MY FREE PHOTO REPORT →"}
      </button>
      <p className="text-center text-xs text-zinc-500">We only use your info to contact you about your roof. <Link href="/privacy" className="underline">Privacy Policy</Link></p>
      {footer}
    </form>
  );
}
