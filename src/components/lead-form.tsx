"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { LEAD_SERVICES } from "@/lib/site-pages";
import { ILLINOIS_ROOFING_NOTICE, isIllinoisRoofingRequest } from "@/lib/illinois-guard";
import { contactFieldError, suggestEmail, type ContactField } from "@/lib/contact-check";

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
const SOURCE_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gbraid", "wbraid", "fbclid"] as const;
type LeadSource = Partial<Record<(typeof SOURCE_PARAMS)[number] | "landing_page" | "referrer", string>> & { saved_at?: number };

// The site that sent the visitor (other websites only), capped at 500 characters.
function externalReferrer(): string {
  try {
    const ref = document.referrer;
    if (!ref) return "";
    const url = new URL(ref);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    const bare = (host: string) => host.replace(/^www\./, "");
    if (bare(url.hostname) === bare(window.location.hostname)) return "";
    return ref.slice(0, 500);
  } catch {
    return "";
  }
}

export function rememberLandingSource() {
  try {
    const params = new URLSearchParams(window.location.search);
    const referrer = externalReferrer();
    const tagged = SOURCE_PARAMS.some((key) => params.get(key));
    // An untagged visit is saved only when another site sent it and nothing is remembered yet (first touch).
    if (!tagged && (!referrer || rememberedSource().saved_at)) return;
    const source: LeadSource = { landing_page: window.location.href.slice(0, 500), saved_at: Date.now(), ...(referrer ? { referrer } : {}) };
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
    gbraid: p.get("gbraid") || saved.gbraid || "",
    wbraid: p.get("wbraid") || saved.wbraid || "",
    referrer: (current ? "" : saved.referrer) || (landing ? externalReferrer() : ""),
    fbclid: p.get("fbclid") || saved.fbclid || "",
    landing: saved.landing_page || landing,
  };
}

const SERVICES = LEAD_SERVICES;
const inputClass = "w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-black placeholder:text-zinc-400 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none";

const subscribeNever = () => () => {};
const CONTACT_FIELDS: ContactField[] = ["name", "phone", "email", "zip"]; // page order
const errorClass = "px-1 text-sm font-medium text-red-700";
const invalidInput = " border-red-600 ring-2 ring-red-600/20";

// Extra fields merged into the lead payload, e.g. the homepage cost estimator selections.
export type LeadExtras = Record<string, string | number | null | undefined>;

export default function LeadForm({ extras, defaultService = "Roof Repair", defaultCity = "", services = SERVICES, exteriorOnly = false, footer }: {
  extras?: LeadExtras;
  defaultService?: string;
  defaultCity?: string;
  /** Service choices; Illinois pages pass the exterior-only list. */
  services?: string[];
  /** Illinois pages: siding/gutter wording, no roof leak, tarp or roof-age fields. */
  exteriorOnly?: boolean;
  footer?: React.ReactNode;
}) {
  const router = useRouter();
  const utm = useLandingUtm();
  const [sending, setSending] = useState(false);
  const [ilRoofing, setIlRoofing] = useState(false);
  // When the form appeared; a submission faster than a person could type is flagged (never dropped) by the server.
  const shownAt = useRef(0);
  useEffect(() => { shownAt.current = Date.now(); }, []);
  const uid = useId();
  // False on the server and during hydration, so the browser's own checks still work without JavaScript.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [errors, setErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const errorId = (f: ContactField) => `${uid}-${f}-error`;
  const hintId = `${uid}-email-hint`;

  function showFieldError(field: ContactField, value: string) {
    setErrors((prev) => ({ ...prev, [field]: contactFieldError(field, value) }));
  }
  function onFieldBlur(e: React.FocusEvent<HTMLInputElement>) {
    const field = e.currentTarget.name as ContactField;
    showFieldError(field, e.currentTarget.value);
    if (field === "email") setEmailSuggestion(suggestEmail(e.currentTarget.value));
  }
  // Only updates or clears an error that is already showing; never adds a new one while the person types.
  function onFieldChange(e: React.ChangeEvent<HTMLInputElement>) {
    const field = e.currentTarget.name as ContactField;
    if (errors[field]) showFieldError(field, e.currentTarget.value);
    if (field === "email" && emailSuggestion) setEmailSuggestion(null);
  }
  function applyEmailSuggestion(e: React.MouseEvent<HTMLButtonElement>) {
    const input = e.currentTarget.form?.elements.namedItem("email");
    if (!(input instanceof HTMLInputElement) || !emailSuggestion) return;
    input.value = emailSuggestion;
    setEmailSuggestion(null);
    showFieldError("email", input.value);
    input.focus();
  }

  // Illinois roofing requests are still sent and saved (tagged license pending on the server); the homeowner
  // just sees a small note first, so nobody is surprised that we can't do roof work in Illinois yet.
  function checkIllinoisRoofing(e: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    setIlRoofing(isIllinoisRoofingRequest({ service: fd.get("service"), emergency: fd.get("emergency") === "on", city: fd.get("city"),
      address: fd.get("address"), zip: fd.get("zip"), estLocation: extras?.est_location, page: window.location.pathname }));
  }

  async function handleLeadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(sending) return;
    // Plain-words checks before sending. If the checking itself ever crashes, the lead is sent anyway.
    const form = e.currentTarget;
    let found: Partial<Record<ContactField, string>> = {};
    try {
      for (const field of CONTACT_FIELDS) {
        const input = form.elements.namedItem(field);
        const message = contactFieldError(field, input instanceof HTMLInputElement ? input.value : "");
        if (message) found[field] = message;
      }
    } catch {
      found = {};
    }
    const first = CONTACT_FIELDS.find((field) => found[field]);
    if (first) {
      flushSync(() => setErrors(found));
      const input = form.elements.namedItem(first);
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
      return;
    }
    setErrors({});
    setSending(true);
    const fd = new FormData(e.target as HTMLFormElement);
    const payload = {
      ...extras,
      name: fd.get("name"),
      phone: fd.get("phone"),
      email: fd.get("email") || extras?.est_email || null,
      city: fd.get("city") || null,
      zip: fd.get("zip"),
      address: fd.get("address"),
      service_type: fd.get("service"),
      issue_type: fd.get("issue_type"),
      roof_age: fd.get("roof_age"),
      emergency: fd.get("emergency") === "on",
      urgent: fd.get("urgent") === "on",
      form_ms: shownAt.current ? Date.now() - shownAt.current : null,
      message: fd.get("details"),
      company: fd.get("company"),
      utm_source: utm.source,
      utm_medium: utm.medium,
      utm_campaign: utm.campaign,
      utm_content: utm.content,
      utm_term: utm.term,
      gclid: utm.gclid,
      gbraid: utm.gbraid,
      wbraid: utm.wbraid,
      referrer: utm.referrer,
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
        const result: { data?: { id?: string | number }[]; area?: "il" | "il-pending"; suspected?: boolean } = await res.json();
        const ilPending = result.area === "il-pending";
        try {
          sessionStorage.setItem("roofing-lead-conversion", JSON.stringify({
            id: String(result.data?.[0]?.id ?? crypto.randomUUID()),
            // A license-pending Illinois roofing request, or a suspected bot, is not counted as a Google Ads or Meta conversion.
            ilPending: ilPending || result.suspected === true,
          }));
        } catch {
          // Storage restrictions must not prevent confirmation of a saved lead.
        }
        const query = new URLSearchParams();
        if (result.area) query.set("area", result.area);
        if (ilPending && payload.emergency) query.set("urgent", "1");
        router.push(query.size ? `/thank-you?${query}` : "/thank-you");
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
    <form noValidate={hydrated} className="space-y-3" onSubmit={handleLeadSubmit} onChange={checkIllinoisRoofing}>
      <div className="space-y-1">
        <input name="name" required maxLength={100} autoComplete="name" placeholder="Your Name *" aria-label="Your name"
          aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? errorId("name") : undefined}
          onBlur={onFieldBlur} onChange={onFieldChange} className={inputClass + (errors.name ? invalidInput : "")} />
        {errors.name && <p id={errorId("name")} className={errorClass}>{errors.name}</p>}
      </div>
      <div className="space-y-1">
        <input name="phone" required type="tel" inputMode="tel" maxLength={30} pattern="(?:\D*\d){10,}\D*" title="Please enter a 10-digit phone number" autoComplete="tel" placeholder="Phone Number *" aria-label="Phone number"
          aria-invalid={errors.phone ? true : undefined} aria-describedby={errors.phone ? errorId("phone") : undefined}
          onBlur={onFieldBlur} onChange={onFieldChange} className={inputClass + (errors.phone ? invalidInput : "")} />
        {errors.phone && <p id={errorId("phone")} className={errorClass}>{errors.phone}</p>}
      </div>
      <div className="space-y-1">
        <input name="email" required type="email" maxLength={254} autoComplete="email" placeholder="Email *" aria-label="Email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={[errors.email && errorId("email"), emailSuggestion && hintId].filter(Boolean).join(" ") || undefined}
          onBlur={onFieldBlur} onChange={onFieldChange} className={inputClass + (errors.email ? invalidInput : "")} />
        {errors.email && <p id={errorId("email")} className={errorClass}>{errors.email}</p>}
        {emailSuggestion && (
          <p id={hintId} className="px-1 text-sm text-zinc-700">
            Did you mean <strong>{emailSuggestion}</strong>?{" "}
            <button type="button" onClick={applyEmailSuggestion} className="font-semibold text-brand-ink underline">Use {emailSuggestion}</button>
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input name="city" defaultValue={defaultCity} maxLength={80} autoComplete="address-level2" placeholder="City" aria-label="City" className={inputClass} />
        <div className="space-y-1">
          <input name="zip" required inputMode="numeric" maxLength={10} autoComplete="postal-code" placeholder="ZIP Code *" aria-label="ZIP code"
            aria-invalid={errors.zip ? true : undefined} aria-describedby={errors.zip ? errorId("zip") : undefined}
            onBlur={onFieldBlur} onChange={onFieldChange} className={inputClass + (errors.zip ? invalidInput : "")} />
          {errors.zip && <p id={errorId("zip")} className={errorClass}>{errors.zip}</p>}
        </div>
      </div>
      <select name="service" defaultValue={defaultService} aria-label="Service needed" className={inputClass}>
        {services.map((service) => <option key={service}>{service}</option>)}
      </select>
      {!exteriorOnly && (
        <label className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-black">
          <input name="emergency" type="checkbox" className="h-5 w-5 accent-brand" />
          Active leak? Need an emergency tarp now
        </label>
      )}
      {exteriorOnly && (
        <label className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-black">
          <input name="urgent" type="checkbox" className="h-5 w-5 accent-brand" />
          Storm damage to siding, gutters or trim? Call me back fast
        </label>
      )}
      {/* Spam trap: hidden from people, bots fill it in. */}
      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />
      <details className="group rounded-xl border border-zinc-200 bg-white/70 px-4 py-3 text-sm text-black">
        <summary className="cursor-pointer list-none font-semibold text-zinc-700 [&::-webkit-details-marker]:hidden"><span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span> Add more details (optional)</summary>
        <div className="mt-3 space-y-3">
          <input name="address" maxLength={200} autoComplete="street-address" placeholder="Street address" aria-label="Street address" className={inputClass} />
          <label className="block font-semibold">
            Issue
            <input name="issue_type" maxLength={200} placeholder={exteriorOnly ? "Siding damage, overflowing gutters, rotted fascia, or other issue" : "Leak, storm damage, aging roof, or other issue"} className="mt-1 w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-black" />
          </label>
          {!exteriorOnly && <label className="block font-semibold">
            Age of Roof
            <select name="roof_age" defaultValue="Unknown" className="mt-1 w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-black">
              <option value="<5 years">&lt;5 years</option>
              <option value="5-10 years">5-10 years</option>
              <option value="10-15 years">10-15 years</option>
              <option value="15-20 years">15-20 years</option>
              <option value="20+ years">20+ years</option>
              <option value="Unknown">Unknown</option>
            </select>
          </label>}
          <textarea name="details" maxLength={2000} placeholder={exteriorOnly ? "What's going on with your siding or gutters?" : "What's going on with your roof?"} aria-label="Project details" rows={3} className={inputClass}></textarea>
        </div>
      </details>
      {/* Small print, like a disclaimer (Mike, Oct 29). */}
      {ilRoofing && <p role="status" className="px-1 text-xs leading-snug text-zinc-500">{ILLINOIS_ROOFING_NOTICE}</p>}
      <button disabled={sending} className="w-full bg-brand-ink py-4 rounded-full shadow-md shadow-brand/20 text-white text-base font-extrabold tracking-wide hover:bg-brand-ink-dark disabled:opacity-50">
        {sending ? "Sending..." : exteriorOnly ? "GET MY FREE EXTERIOR QUOTE →" : "GET MY FREE PHOTO REPORT →"}
      </button>
      <p className="text-center text-xs text-zinc-500">We only use your info to contact you about your {exteriorOnly ? "project" : "roof"}. <Link href="/privacy" className="underline">Privacy Policy</Link></p>
      {footer}
    </form>
  );
}
