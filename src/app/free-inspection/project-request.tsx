"use client";

// /free-inspection project request: state and service first, then (Missouri roof replacement only) the estimate
// inputs, then contact details. Prices appear only after the request is saved, and only from the server's answer.
// Same endpoint, checks, attribution, spam trap and lead delivery as the site's main lead form.
import Link from "next/link";
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { attributionFields, useLandingUtm } from "@/components/lead-form";
import { contactFieldError, type ContactField } from "@/lib/contact-check";
import { ILLINOIS_ROOFING_NOTICE, isIllinoisRoofingRequest } from "@/lib/illinois-guard";
import { PHONES } from "@/lib/business";
import { IL_COMING_SOON, PITCHES, SHINGLE_OPTIONS, SQ_MAX, SQ_MIN, isCustom, usd, type PitchKey, type ShingleKey } from "@/lib/pricing";
import {
  ESTIMATE_OFFER_TEXT, ESTIMATE_SERVICE, ROUGH_ESTIMATE_HEADLINE, ROUGH_ESTIMATE_NOTICE, SUCCESS_MESSAGES,
  canShowNumber, roughEstimate, type EstimateInputs, type EstimateOutcome, type RoughEstimate,
} from "@/lib/estimate-offer";
import { MO_ROOFING_SERVICES, SERVICES_BY_STATE, issueChoices } from "@/lib/free-inspection";
import { reportEngagement, reportLeadConversion } from "@/lib/lead-conversion";

type PropertyState = "" | "MO" | "IL";
type EmailStatus = "sent" | "failed" | "not_sent";
type ResultKind = "estimate" | "needs_details" | "custom_quote" | "project" | "il_pending";

/** What survives a refresh (sessionStorage, this tab only): no contact details and no prices, just the sealed token. */
type StoredResult = {
  v: 1;
  kind: ResultKind;
  state: "MO" | "IL";
  email: EmailStatus;
  token?: string;
  inputs?: EstimateInputs;
  materialLabel?: string;
};

const STORE_KEY = "free-inspection-request";
const FORM_ID = "project-form";

// ── Shared state for the page: the property state picks the phone number in the sticky bar ─────────────────────
type PageState = { state: PropertyState; setState: (s: PropertyState) => void; done: boolean; setDone: (d: boolean) => void };
const PageContext = createContext<PageState>({ state: "", setState: () => {}, done: false, setDone: () => {} });

export function ProjectPageProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PropertyState>("");
  const [done, setDone] = useState(false);
  return <PageContext.Provider value={{ state, setState, done, setDone }}>{children}</PageContext.Provider>;
}

const phoneFor = (state: PropertyState) => (state === "IL" ? PHONES.IL : PHONES.MO);

function readStored(): StoredResult | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? "null") as StoredResult | null;
    return value && value.v === 1 && typeof value.kind === "string" && (value.state === "MO" || value.state === "IL") ? value : null;
  } catch {
    return null;
  }
}
const subscribeNever = () => () => {};
const getStoredRaw = () => {
  try {
    return sessionStorage.getItem(STORE_KEY) ?? "";
  } catch {
    return "";
  }
};

// ── Styles (black page, blue #1CA3D8 accents, yellow buttons with dark text) ───────────────────────────────────
const label = "block text-sm font-bold text-white";
const input = "mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-black placeholder:text-zinc-500 outline-none focus:border-[#1CA3D8] focus:ring-2 focus:ring-[#1CA3D8]/40";
const invalid = " border-red-500 ring-2 ring-red-500/40";
const errorText = "mt-1 text-sm font-semibold text-red-300";
const hint = "mt-1 text-xs text-zinc-300";
export const yellowButton = "inline-flex items-center justify-center rounded-full bg-[#FFD400] px-6 py-3 font-extrabold text-black shadow-md hover:bg-[#FFE04D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60";

type FieldName = "state" | "service" | "size" | "material" | "pitch" | ContactField;
const CONTACT_FIELDS: ContactField[] = ["name", "phone", "email", "address", "city", "zip"];

export function ProjectRequest() {
  const page = useContext(PageContext);
  const utm = useLandingUtm();
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const errorId = (name: FieldName) => `${uid}-${name}-error`;
  // False on the server and during hydration, so the browser's own checks still work without JavaScript.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const storedRaw = useSyncExternalStore(subscribeNever, getStoredRaw, () => "");
  const restored = useMemo(() => (storedRaw ? readStored() : null), [storedRaw]);

  const [service, setService] = useState("");
  const [issue, setIssue] = useState("");
  const [size, setSize] = useState("");
  const [sizeUnknown, setSizeUnknown] = useState(false);
  const [material, setMaterial] = useState<ShingleKey | "">("");
  const [pitch, setPitch] = useState<PitchKey | "">("");
  const [zipText, setZipText] = useState("");
  const [cityText, setCityText] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState("");
  const [submitted, setSubmitted] = useState<{ stored: StoredResult; estimate: RoughEstimate | null } | null>(null);
  const shownAt = useRef(0);
  useEffect(() => { shownAt.current = Date.now(); }, []);

  const state = page.state;
  const result = submitted ?? (restored ? { stored: restored, estimate: null } : null);
  const { setDone } = page;
  const hasResult = !!result;
  useEffect(() => { setDone(hasResult); }, [hasResult, setDone]);

  const services = state ? SERVICES_BY_STATE[state] : [];
  const roofing = MO_ROOFING_SERVICES.includes(service);
  // Typed ZIP or town says Illinois: no estimate, the license-pending note instead.
  const ilRoofing = state === "MO" && isIllinoisRoofingRequest({ service, zip: zipText, city: cityText, state });
  const showEstimator = state === "MO" && service === ESTIMATE_SERVICE && !ilRoofing;
  const inputs: EstimateInputs = {
    size: sizeUnknown || !size.trim() ? null : Number(size),
    material: material || null,
    pitch: pitch || null,
  };
  const numberPossible = showEstimator && !sizeUnknown && Number.isInteger(inputs.size) && canShowNumber(inputs);
  const submitLabel = numberPossible ? "Send Request & Get Rough Estimate" : "Send My Project Request";

  function chooseState(next: "MO" | "IL") {
    page.setState(next);
    if (service && !(SERVICES_BY_STATE[next] as readonly string[]).includes(service)) { setService(""); setIssue(""); }
    setErrors((prev) => ({ ...prev, state: undefined }));
  }

  // Read the value right away: React clears e.currentTarget once the handler returns, before a state updater runs.
  function contactBlur(e: React.FocusEvent<HTMLInputElement>) {
    const field = e.currentTarget.name as ContactField;
    const message = contactFieldError(field, e.currentTarget.value);
    setErrors((prev) => ({ ...prev, [field]: message }));
  }
  function contactChange(e: React.ChangeEvent<HTMLInputElement>) {
    const field = e.currentTarget.name as ContactField;
    const value = e.currentTarget.value;
    if (field === "zip") setZipText(value);
    if (field === "city") setCityText(value);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: contactFieldError(field, value) }));
  }

  function check(form: HTMLFormElement): Partial<Record<FieldName, string>> {
    const found: Partial<Record<FieldName, string>> = {};
    if (!state) found.state = "Choose the state the property is in.";
    if (!service) found.service = "Choose the service you need.";
    if (showEstimator) {
      if (!sizeUnknown) {
        const n = Number(size);
        if (!size.trim() || !Number.isInteger(n) || n < SQ_MIN || n > SQ_MAX) {
          found.size = `Enter a whole number from ${SQ_MIN} to ${SQ_MAX}, or check "I don't know my roof size".`;
        }
        if (!material) found.material = "Choose a roofing material.";
        if (!pitch && !(material && isCustom(material))) found.pitch = "Choose your roof pitch.";
      }
    }
    for (const field of CONTACT_FIELDS) {
      const el = form.elements.namedItem(field);
      const message = contactFieldError(field, el instanceof HTMLInputElement ? el.value : "");
      if (message) found[field] = message;
    }
    return found;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    const form = e.currentTarget;
    let found: Partial<Record<FieldName, string>> = {};
    try {
      found = check(form);
    } catch {
      found = {}; // if the checking itself ever crashes, the request is sent anyway
    }
    const order: FieldName[] = ["state", "service", "size", "material", "pitch", ...CONTACT_FIELDS];
    const first = order.find((field) => found[field]);
    if (first) {
      flushSync(() => setErrors(found));
      const inputName: Partial<Record<FieldName, string>> = { state: "property_state", size: "roof_size", material: "roof_material", pitch: "roof_pitch" };
      const target = form.querySelector(`[name="${inputName[first] ?? first}"]`);
      if (target instanceof HTMLElement) target.focus();
      return;
    }
    setErrors({});
    setFailure("");
    setSending(true);
    const fd = new FormData(form);
    const estimateRequest = showEstimator ? { size: inputs.size, material: inputs.material, pitch: inputs.pitch } : undefined;
    const payload = {
      form: "project-request",
      property_state: state,
      name: fd.get("name"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      address: fd.get("address"),
      city: fd.get("city"),
      zip: fd.get("zip"),
      service_type: service,
      issue_type: issue || null,
      emergency: roofing && state === "MO" && fd.get("emergency") === "on",
      urgent: !roofing && fd.get("urgent") === "on",
      message: fd.get("details"),
      company: fd.get("company"),
      form_ms: shownAt.current ? Date.now() - shownAt.current : null,
      ...(estimateRequest ? { estimate_request: estimateRequest } : {}),
      ...attributionFields(utm),
    };
    try {
      const res = await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data: {
        ok?: boolean; ref?: string; area?: string; suspected?: boolean; email?: EmailStatus;
        estimate?: EstimateOutcome; estimate_token?: string;
      } = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error("not saved");
      const ilPending = data.area === "il-pending";
      const outcome = ilPending ? undefined : data.estimate;
      const kind: ResultKind = ilPending ? "il_pending"
        : outcome?.status === "ready" ? "estimate"
          : outcome?.status === "custom_quote" ? "custom_quote"
            : outcome || service === ESTIMATE_SERVICE ? "needs_details"
              : "project";
      const stored: StoredResult = {
        v: 1, kind, state: state === "IL" ? "IL" : "MO",
        email: data.email === "sent" || data.email === "failed" ? data.email : "not_sent",
        ...(data.estimate_token ? { token: data.estimate_token } : {}),
        ...(kind === "estimate" && estimateRequest ? { inputs: estimateRequest } : {}),
        ...(outcome?.status === "custom_quote" ? { materialLabel: outcome.materialLabel } : {}),
      };
      try {
        sessionStorage.setItem(STORE_KEY, JSON.stringify(stored));
      } catch {
        // Blocked storage: the result still shows; it just won't survive a refresh.
      }
      setSubmitted({ stored, estimate: outcome?.status === "ready" ? outcome.estimate : null });
      // One lead conversion per saved request, here and never again (a refresh restores the result without it).
      // License-pending Illinois roofing and suspected bots are not ad conversions.
      reportLeadConversion(typeof data.ref === "string" ? data.ref : crypto.randomUUID(), ilPending || data.suspected === true, "Project request");
      if (kind === "estimate") reportEngagement("estimate_view", "first");
      requestAnimationFrame(() => document.getElementById(`${FORM_ID}-result`)?.focus());
    } catch {
      setFailure("We couldn't send your request just now. Your answers are still filled in, so please try again.");
    } finally {
      setSending(false);
    }
  }

  if (result) return <ResultPanel stored={result.stored} initialEstimate={result.estimate} />;

  const fieldError = (name: FieldName) => errors[name] ? <p id={errorId(name)} className={errorText}>{errors[name]}</p> : null;
  const aria = (name: FieldName) => ({ "aria-invalid": errors[name] ? true : undefined, "aria-describedby": errors[name] ? errorId(name) : undefined });
  const contact = (name: ContactField, text: string, props: React.InputHTMLAttributes<HTMLInputElement>, help?: string) => (
    <div>
      <label htmlFor={id(name)} className={label}>{text} <span aria-hidden="true" className="text-[#FFD400]">*</span></label>
      <input id={id(name)} name={name} required onBlur={contactBlur} onChange={contactChange} {...props} {...aria(name)} className={input + (errors[name] ? invalid : "")} />
      {help && <p className={hint}>{help}</p>}
      {fieldError(name)}
    </div>
  );

  return (
    <form noValidate={hydrated} onSubmit={onSubmit} className="space-y-4" aria-describedby={`${uid}-required-note`}>
      <p id={`${uid}-required-note`} className="text-xs text-zinc-300">Fields marked <span className="text-[#FFD400]">*</span> are required.</p>

      <fieldset {...aria("state")}>
        <legend className={label}>Where is the property? <span aria-hidden="true" className="text-[#FFD400]">*</span></legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["MO", "IL"] as const).map((s) => (
            <label key={s} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold ${state === s ? "border-[#1CA3D8] bg-[#1CA3D8]/15 text-white" : "border-zinc-600 text-zinc-100"}`}>
              <input type="radio" name="property_state" value={s} required checked={state === s} onChange={() => chooseState(s)} className="h-5 w-5 accent-[#1CA3D8]" />
              {s === "MO" ? "Missouri" : "Illinois"}
            </label>
          ))}
        </div>
        <p className={hint}>{state === "IL"
          ? <>Illinois: siding, gutters, soffit, fascia and other exterior work. {IL_COMING_SOON}.</>
          : "Missouri: roofing plus exterior work. Illinois: exterior work only."}</p>
        {fieldError("state")}
      </fieldset>

      <div>
        <label htmlFor={id("service")} className={label}>Service needed <span aria-hidden="true" className="text-[#FFD400]">*</span></label>
        <select id={id("service")} name="service" required value={service} disabled={!state} onChange={(e) => { setService(e.target.value); setIssue(""); setErrors((p) => ({ ...p, service: undefined })); }} {...aria("service")} className={input + (errors.service ? invalid : "") + " disabled:bg-zinc-200"}>
          <option value="">{state ? "Choose a service" : "Choose the state first"}</option>
          {services.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {fieldError("service")}
      </div>

      {service && (
        <div>
          <label htmlFor={id("issue")} className={label}>What&apos;s going on? <span className="font-normal text-zinc-300">(optional)</span></label>
          <select id={id("issue")} name="issue_type" value={issue} onChange={(e) => setIssue(e.target.value)} className={input}>
            <option value="">Choose one</option>
            {issueChoices(service).map((choice) => <option key={choice} value={choice}>{choice}</option>)}
          </select>
        </div>
      )}

      {roofing && state === "MO" && !ilRoofing && (
        <label className="flex items-center gap-2 rounded-xl border border-red-400/60 px-3 py-3 text-sm font-bold text-white">
          <input name="emergency" type="checkbox" className="h-5 w-5 accent-[#FFD400]" />
          Active leak? Need an emergency tarp now (Missouri)
        </label>
      )}
      {service && !roofing && (
        <label className="flex items-center gap-2 rounded-xl border border-zinc-600 px-3 py-3 text-sm font-bold text-white">
          <input name="urgent" type="checkbox" className="h-5 w-5 accent-[#FFD400]" />
          Storm damage to siding, gutters or trim? Call me back fast
        </label>
      )}

      {ilRoofing && <p role="status" className="rounded-xl border border-amber-300/60 bg-amber-300/10 p-3 text-sm text-amber-100">{ILLINOIS_ROOFING_NOTICE}</p>}

      {showEstimator && (
        <div className="space-y-3 rounded-2xl border border-[#1CA3D8]/50 bg-[#1CA3D8]/10 p-4">
          <p className="text-sm font-bold text-white">{ESTIMATE_OFFER_TEXT}</p>
          <div>
            <label htmlFor={id("size")} className={label}>Roof size in squares</label>
            <div className="flex items-center gap-3">
              <input id={id("size")} name="roof_size" type="number" inputMode="numeric" min={SQ_MIN} max={SQ_MAX} step={1} placeholder="e.g. 18" value={size} disabled={sizeUnknown}
                onChange={(e) => { setSize(e.target.value); setErrors((p) => ({ ...p, size: undefined })); }} {...aria("size")} className={input + " max-w-32" + (errors.size ? invalid : "") + " disabled:bg-zinc-200"} />
              <input type="range" aria-label="Roof size slider" min={SQ_MIN} max={SQ_MAX} step={1} value={size ? Number(size) || SQ_MIN : SQ_MIN} disabled={sizeUnknown}
                onChange={(e) => { setSize(e.target.value); setErrors((p) => ({ ...p, size: undefined })); }} className="mt-1 w-full accent-[#1CA3D8]" />
            </div>
            <p className={hint}>1 square = 100 sq ft of roof surface. Roof area is not your home&apos;s floor area: slopes and overhangs usually make the roof larger than the floor plan. Entering your address does not measure your roof.</p>
            <label className="mt-2 flex items-center gap-2 text-sm font-bold text-white">
              <input type="checkbox" checked={sizeUnknown} onChange={(e) => { setSizeUnknown(e.target.checked); setErrors((p) => ({ ...p, size: undefined, pitch: undefined, material: undefined })); }} className="h-5 w-5 accent-[#1CA3D8]" />
              I don&apos;t know my roof size
            </label>
            {sizeUnknown && <p className={hint}>That&apos;s fine. A number needs real roof measurements, so we won&apos;t guess. Send your request and we&apos;ll measure and quote it properly.</p>}
            {fieldError("size")}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={id("material")} className={label}>Material</label>
              <select id={id("material")} name="roof_material" value={material} onChange={(e) => { setMaterial(e.target.value as ShingleKey | ""); setErrors((p) => ({ ...p, material: undefined, pitch: undefined })); }} {...aria("material")} className={input + (errors.material ? invalid : "")}>
                <option value="">Choose a material</option>
                {SHINGLE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              {fieldError("material")}
            </div>
            <div>
              <label htmlFor={id("pitch")} className={label}>Roof pitch</label>
              <select id={id("pitch")} name="roof_pitch" value={pitch} onChange={(e) => { setPitch(e.target.value as PitchKey | ""); setErrors((p) => ({ ...p, pitch: undefined })); }} {...aria("pitch")} className={input + (errors.pitch ? invalid : "")}>
                <option value="">Choose a pitch</option>
                {(Object.keys(PITCHES) as PitchKey[]).map((key) => <option key={key} value={key}>{PITCHES[key].label}</option>)}
              </select>
              {fieldError("pitch")}
            </div>
          </div>
          {material && isCustom(material) && <p className={hint}>Clay, metal and slate are custom quotes: no instant number. We&apos;ll quote them after looking at your roof.</p>}
        </div>
      )}

      {service && !showEstimator && !ilRoofing && (
        <p className="text-sm text-zinc-300">{service === ESTIMATE_SERVICE
          ? "Roof replacement estimates are for Missouri homes."
          : "We'll give you a project-specific quote after reviewing the details with you. There's no instant price for this service."}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {contact("name", "Your name", { autoComplete: "name", maxLength: 100 })}
        {contact("phone", "Phone", { type: "tel", inputMode: "tel", autoComplete: "tel", maxLength: 30 })}
      </div>
      {contact("email", "Email", { type: "email", inputMode: "email", autoComplete: "email", maxLength: 254 }, numberPossible ? "Your rough estimate copy is emailed here." : "We send your request details here.")}
      {contact("address", "Street address", { autoComplete: "street-address", maxLength: 200 })}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {contact("city", "City", { autoComplete: "address-level2", maxLength: 80 })}
        {contact("zip", "ZIP code", { inputMode: "numeric", autoComplete: "postal-code", maxLength: 5, pattern: "\\d{5}" })}
      </div>
      <div>
        <label htmlFor={id("details")} className={label}>Anything else we should know? <span className="font-normal text-zinc-300">(optional)</span></label>
        <textarea id={id("details")} name="details" rows={3} maxLength={2000} className={input} />
      </div>
      {/* Spam trap: hidden from people, bots fill it in. */}
      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />

      {failure && (
        <div role="alert" className="rounded-xl border border-red-400 bg-red-500/10 p-3 text-sm text-white">
          {failure} Or call {state === "IL" ? <a href={PHONES.IL.href} className="font-bold underline">{PHONES.IL.display}</a> : <>Missouri <a href={PHONES.MO.href} className="font-bold underline">{PHONES.MO.display}</a> · Illinois <a href={PHONES.IL.href} className="font-bold underline">{PHONES.IL.display}</a></>}.
        </div>
      )}
      <button type="submit" disabled={sending} className={`${yellowButton} w-full py-4 text-base`}>
        {sending ? "Sending your request..." : submitLabel}
      </button>
      <p className="text-center text-xs text-zinc-300">We use your details only to respond to this request. We call during business hours as soon as your request comes in. <Link href="/privacy" className="underline">Privacy Policy</Link></p>
    </form>
  );
}

// ── After the request is saved ─────────────────────────────────────────────────────────────────────────────────
function ResultPanel({ stored, initialEstimate }: { stored: StoredResult; initialEstimate: RoughEstimate | null }) {
  const phone = stored.kind === "estimate" || stored.kind === "needs_details" || stored.kind === "custom_quote" ? PHONES.MO : phoneFor(stored.state);
  const message = stored.kind === "estimate" ? SUCCESS_MESSAGES.estimate
    : stored.kind === "needs_details" || stored.kind === "custom_quote" ? SUCCESS_MESSAGES.needsDetails
      : stored.kind === "il_pending" ? "Your request is saved. Roofing in Illinois is pending our Illinois roofing license, so we don't quote, schedule or do roof work on Illinois homes yet."
        : SUCCESS_MESSAGES.exterior;
  return (
    <div id={`${FORM_ID}-result`} tabIndex={-1} role="status" className="space-y-4 outline-none">
      <p className="inline-flex rounded-full bg-[#1CA3D8]/20 px-3 py-1 text-sm font-bold text-[#7FD3F2]">✓ Request received</p>
      <p className="text-xl font-extrabold text-white">{message}</p>
      {stored.kind === "estimate" && <EstimateBlock stored={stored} initialEstimate={initialEstimate} />}
      {stored.kind === "custom_quote" && <p className="text-sm text-zinc-200">{stored.materialLabel ?? "This material"} is a custom quote, so there&apos;s no instant number. We&apos;ll price it after looking at your roof.</p>}
      {stored.kind === "il_pending" && (
        <p className="text-sm text-zinc-200">{IL_COMING_SOON}. We&apos;ll call you, and we can help now with siding, gutters, soffit, fascia and other exterior work. Water coming in? Call <a href={PHONES.IL.href} className="font-bold text-[#7FD3F2] underline">{PHONES.IL.display}</a> and we&apos;ll point you to a licensed Illinois roofer.</p>
      )}
      {stored.kind !== "il_pending" && (
        <p className="text-sm text-zinc-200">Nothing is booked yet: we&apos;ll contact you to agree a time that works. Need us sooner? Call <a href={phone.href} className="font-bold text-[#7FD3F2] underline">{phone.display}</a>.</p>
      )}
    </div>
  );
}

const inputsKey = (i: EstimateInputs) => `${i.size}-${i.material}-${i.pitch}`;

function EstimateBlock({ stored, initialEstimate }: { stored: StoredResult; initialEstimate: RoughEstimate | null }) {
  const start = stored.inputs ?? { size: null, material: null, pitch: null };
  const [size, setSize] = useState(start.size ?? 18);
  const [material, setMaterial] = useState<ShingleKey>(start.material ?? "architectural");
  const [pitch, setPitch] = useState<PitchKey>(start.pitch ?? "medium");
  // After a refresh the price is shown again only once the server accepts the sealed token for this request.
  const [verified, setVerified] = useState<"yes" | "checking" | "no">(initialEstimate ? "yes" : stored.token && stored.inputs ? "checking" : "no");
  const [emailNote, setEmailNote] = useState(
    stored.email === "sent" ? "A copy of this estimate was sent to the email address on your request."
      : "Your project request was received, but we couldn't send the email copy. Your estimate stays available on this page.",
  );
  const [emailing, setEmailing] = useState(false);
  const [lastEmailed, setLastEmailed] = useState(stored.email === "sent" && stored.inputs ? inputsKey(stored.inputs) : "");

  useEffect(() => {
    if (verified !== "checking") return;
    let live = true;
    fetch("/api/estimate-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: stored.token, inputs: stored.inputs, send: false }) })
      .then((res) => { if (live) setVerified(res.ok ? "yes" : "no"); })
      .catch(() => { if (live) setVerified("no"); });
    return () => { live = false; };
  }, [verified, stored.token, stored.inputs]);

  const current: EstimateInputs = { size, material, pitch };
  const outcome = roughEstimate(current);
  const canEmail = !!stored.token && outcome.status === "ready" && !emailing;

  async function emailUpdate() {
    if (!canEmail) return;
    setEmailing(true);
    try {
      const res = await fetch("/api/estimate-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: stored.token, inputs: current, send: true }) });
      const data: { email?: string } = await res.json().catch(() => ({}));
      const status = res.status === 401 ? "expired" : data.email ?? "failed";
      reportEngagement("estimate_email", status);
      setEmailNote(
        status === "sent" ? "Your updated estimate was sent to the email address on your request."
          : status === "duplicate" ? "We already sent this exact estimate to your email."
            : status === "too_soon" ? "Please wait a minute before sending another update."
              : status === "limit" ? `You've reached the limit for updated estimate emails. Call ${PHONES.MO.display} and we'll help.`
                : status === "expired" ? `Your estimate session has ended. Call ${PHONES.MO.display} for an updated estimate.`
                  : "We couldn't send the email just now. Your estimate is still shown here.",
      );
      if (status === "sent" || status === "duplicate") setLastEmailed(inputsKey(current));
    } catch {
      setEmailNote("We couldn't send the email just now. Your estimate is still shown here.");
    } finally {
      setEmailing(false);
    }
  }

  if (verified === "checking") return <p className="text-sm text-zinc-300">Loading your estimate...</p>;
  if (verified === "no") {
    return <p className="text-sm text-zinc-200">Your request is saved. To see your estimate again, call <a href={PHONES.MO.href} className="font-bold text-[#7FD3F2] underline">{PHONES.MO.display}</a> and we&apos;ll go over it with you.</p>;
  }
  // The first view shows exactly the server's numbers; adjusting recalculates with the same pricing.ts logic.
  const shown = outcome.status === "ready" ? outcome.estimate : null;
  const sameAsSubmitted = stored.inputs && inputsKey(current) === inputsKey(stored.inputs);
  const display = sameAsSubmitted && initialEstimate ? initialEstimate : shown;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-[#1CA3D8] bg-black p-4">
        <h3 className="text-lg font-extrabold text-white">{ROUGH_ESTIMATE_HEADLINE}</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-[1fr_1fr]">
          <div aria-live="polite">
            {display ? (
              <>
                <p className="text-sm text-zinc-300">{display.sizeLabel} · {display.materialLabel} · {display.pitchLabel}</p>
                <p className="mt-1 text-4xl font-black text-[#FFD400]">{usd(display.price)}</p>
                <p className="text-sm text-zinc-200">Whole roof. Range {usd(display.low)} - {usd(display.high)}.</p>
              </>
            ) : (
              <p className="text-base font-bold text-white">{outcome.status === "custom_quote" ? `${outcome.materialLabel} is a custom quote: no instant number.` : "Choose a size, material and pitch to see a number."}</p>
            )}
          </div>
          <p className="rounded-xl bg-[#FFD400] p-3 text-sm font-bold leading-snug text-black">{ROUGH_ESTIMATE_NOTICE}</p>
        </div>
      </div>

      <details className="rounded-2xl border border-zinc-700 p-4 text-white">
        <summary className="cursor-pointer font-bold">Adjust your estimate</summary>
        <div className="mt-3 space-y-3">
          <label className="block text-sm font-bold">Roof size: {size} squares
            <input type="range" min={SQ_MIN} max={SQ_MAX} step={1} value={size} onChange={(e) => setSize(Number(e.target.value))} className="mt-2 w-full accent-[#1CA3D8]" aria-valuetext={`${size} squares`} />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold">Material
              <select value={material} onChange={(e) => setMaterial(e.target.value as ShingleKey)} className={input}>
                {SHINGLE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold">Roof pitch
              <select value={pitch} onChange={(e) => setPitch(e.target.value as PitchKey)} className={input}>
                {(Object.keys(PITCHES) as PitchKey[]).map((key) => <option key={key} value={key}>{PITCHES[key].label}</option>)}
              </select>
            </label>
          </div>
          <p className={hint}>Adjusting doesn&apos;t send a new request. Email yourself the new numbers if you want a copy.</p>
          {stored.token && (
            <button type="button" onClick={emailUpdate} disabled={!canEmail || lastEmailed === inputsKey(current)} className={yellowButton}>
              {emailing ? "Sending..." : "Email My Updated Estimate"}
            </button>
          )}
        </div>
      </details>
      <p className="text-sm text-zinc-200" role="status">{emailNote}</p>
    </div>
  );
}

// ── Sticky mobile bar: Call (the selected state's number) + Start My Project ──────────────────────────────────
export function ProjectStickyBar() {
  const { state, done } = useContext(PageContext);
  // Starts hidden, so it never flashes over the form before the first visibility check.
  const [formInView, setFormInView] = useState(true);
  useEffect(() => {
    const target = document.getElementById(FORM_ID);
    if (!target || typeof IntersectionObserver === "undefined") return;
    // Hidden while the form is on screen, so it never covers fields, errors or the submit button.
    const observer = new IntersectionObserver(([entry]) => setFormInView(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  const phone = phoneFor(state);
  function startProject() {
    const target = document.getElementById(FORM_ID);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    const first = target?.querySelector<HTMLElement>(done ? `#${FORM_ID}-result` : 'input[name="property_state"]');
    first?.focus({ preventScroll: true });
  }
  return (
    <>
      <div aria-hidden="true" className="h-[calc(5rem+env(safe-area-inset-bottom))] md:hidden" />
      <nav aria-label="Call or start your project" className={`fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-transform md:hidden ${formInView ? "translate-y-full" : ""}`} aria-hidden={formInView || undefined}>
        <div className="grid grid-cols-2 gap-2">
          <a href={phone.href} tabIndex={formInView ? -1 : undefined} className="flex min-h-12 items-center justify-center rounded-full border-2 border-[#1CA3D8] px-2 text-sm font-extrabold text-white">
            Call {phone.display}
          </a>
          <button type="button" onClick={startProject} tabIndex={formInView ? -1 : undefined} className={`${yellowButton} min-h-12 px-2 text-sm`}>
            {done ? "View My Request" : "Start My Project"}
          </button>
        </div>
      </nav>
    </>
  );
}

// ── Ad video: poster first, the video loads only when tapped, never autoplays with sound ───────────────────────
export function AdVideo({ video }: { video: { src: string; poster: string; captions?: string; width: number; height: number; title: string } }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (playing) void ref.current?.play().catch(() => {}); }, [playing]);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900" style={{ aspectRatio: `${video.width} / ${video.height}` }}>
      {playing ? (
        <video ref={ref} controls playsInline preload="none" poster={video.poster} width={video.width} height={video.height} className="h-full w-full" title={video.title}>
          <source src={video.src} type="video/mp4" />
          {video.captions && <track kind="captions" src={video.captions} srcLang="en" label="English" default />}
        </video>
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 h-full w-full" aria-label={`Play video: ${video.title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- small poster, dimensions reserved by the box */}
          <img src={video.poster} alt="" width={video.width} height={video.height} loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FFD400] text-2xl text-black shadow-lg group-hover:scale-105">▶</span>
        </button>
      )}
    </div>
  );
}

export { FORM_ID };
