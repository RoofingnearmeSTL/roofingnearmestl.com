"use client";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

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

export function useLandingUtm() {
  const landing = useSyncExternalStore(subscribeToLocation, getLocationSnapshot, getServerLocationSnapshot);
  const p = new URLSearchParams(landing ? new URL(landing).search : "");
  return {
    source: p.get("utm_source") || p.get("source") || "",
    medium: p.get("utm_medium") || "",
    campaign: p.get("utm_campaign") || "",
    content: p.get("utm_content") || "",
    term: p.get("utm_term") || "",
    gclid: p.get("gclid") || "",
    fbclid: p.get("fbclid") || "",
    landing,
  };
}

const SERVICES = ["Roof Repair", "Roof Replacement", "Leak / Emergency", "Storm Damage / Insurance", "Gutters / Siding"];
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
      <input name="name" required placeholder="Your Name" className={inputClass} />
      <input name="phone" required placeholder="Phone Number" className={inputClass} />
      <input name="email" type="email" placeholder="Email (optional)" className={inputClass} />
      <input name="address" placeholder="Address (optional)" className={inputClass} />
      <input name="city" defaultValue={defaultCity} placeholder="City (optional)" className={inputClass} />
      <select name="service" defaultValue={defaultService} className={inputClass}>
        {SERVICES.map((service) => <option key={service}>{service}</option>)}
      </select>
      <textarea name="details" placeholder="What's going on with your roof?" rows={3} className={inputClass}></textarea>
      <label className="block text-sm font-semibold text-black">
        Issue
        <input name="issue_type" placeholder="Leak, storm damage, aging roof, or other issue" className="mt-1 w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-black" />
      </label>
      <label className="block text-sm font-semibold text-black">
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
      <fieldset className="text-sm text-black">
        <legend className="font-semibold">Emergency Tarp Needed</legend>
        <label className="mt-2 flex items-center gap-2">
          <input name="emergency" type="checkbox" className="h-5 w-5 accent-brand" />
          Active leak / Need emergency tarp now
        </label>
      </fieldset>
      <button disabled={sending} className="w-full bg-brand py-4 rounded-full shadow-md shadow-brand/20 text-white text-base font-extrabold tracking-wide hover:bg-brand-dark disabled:opacity-50">
        {sending ? "Sending..." : "GET MY FREE PHOTO REPORT →"}
      </button>
      {footer}
    </form>
  );
}
