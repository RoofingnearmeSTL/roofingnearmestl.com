"use client";
import BrandHeader from "@/components/brand-header";
import BrandFooter from "@/components/brand-footer";
import EmergencyBar from "@/components/emergency-bar";
import { useRouter } from "next/navigation";
import { useState, useEffect, useSyncExternalStore } from "react";

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

export default function Home() {
  const router = useRouter();
  const landing = useSyncExternalStore(subscribeToLocation, getLocationSnapshot, getServerLocationSnapshot);
  const p = new URLSearchParams(landing ? new URL(landing).search : "");
  const utm = {
    source: p.get("utm_source") || p.get("source") || "",
    medium: p.get("utm_medium") || "",
    campaign: p.get("utm_campaign") || "",
    content: p.get("utm_content") || "",
    term: p.get("utm_term") || "",
    gclid: p.get("gclid") || "",
    fbclid: p.get("fbclid") || "",
    landing,
  };
  const [est, setEst] = useState({ size: "1800", pitch: "medium", material: "asphalt", email: "" });
  const [showPrice, setShowPrice] = useState(false);
  const [sending, setSending] = useState(false);

  // REPLACE THIS WITH YOUR REAL GOOGLE PLACE ID LATER - get it from https://developers.google.com/maps/documentation/places/web-service/place-id
  const GOOGLE_PLACE_ID = "ChIJ_YOUR_PLACE_ID_HERE";

  useEffect(() => {
    const params = new URLSearchParams(landing ? new URL(landing).search : "");
    const data: Record<string, string> = {
      source: params.get("utm_source") || params.get("source") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
      content: params.get("utm_content") || "",
      term: params.get("utm_term") || "",
      gclid: params.get("gclid") || "",
      fbclid: params.get("fbclid") || "",
      landing,
    };
    Object.entries(data).forEach(([key, value]) => {
      if (value) localStorage.setItem(`utm_${key}`, value);
    });
  }, [landing]);

  const price = (() => {
    let base = 9500;
    if (est.size === "1200") base = 7200;
    if (est.size === "1800") base = 9800;
    if (est.size === "2400") base = 13200;
    if (est.size === "3000") base = 16800;
    if (est.pitch === "steep") base *= 1.25;
    if (est.material === "architectural") base *= 1.15;
    if (est.material === "metal") base *= 2.1;
    return Math.round(base/100)*100;
  })();

  async function handleLeadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(sending) return;
    setSending(true);
    const fd = new FormData(e.target as HTMLFormElement);
    const payload = {
      name: fd.get("name"),
      phone: fd.get("phone"),
      email: fd.get("email") || est.email || null,
      city: fd.get("city") || null,
      address: fd.get("address"),
      service: fd.get("service"),
      details: fd.get("details"),
      utm_source: utm.source,
      utm_medium: utm.medium,
      utm_campaign: utm.campaign,
      utm_content: utm.content,
      utm_term: utm.term,
      gclid: utm.gclid,
      fbclid: utm.fbclid,
      landing_page: utm.landing,
      est_size: est.size,
      est_pitch: est.pitch,
      est_material: est.material,
      est_email: est.email,
      est_price_low: Math.round(price*0.9),
      est_price_high: Math.round(price*1.15),
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
    <div className="min-h-screen bg-white text-zinc-900">
      <EmergencyBar />
      <BrandHeader />

      <div className="border-y border-zinc-200 bg-zinc-50 py-2">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center lg:justify-between gap-3 text-xs font-bold text-zinc-600">
          <span>✓ IL License #104.12345 • MO License #123456</span>
          <span>✓ Fully Insured - $2M Liability + Workers Comp</span>
          <span>✓ GAF Certified • Owens Corning Preferred</span>
          <span>✓ 5.0★ Google Reviews • BBB A+ Rated</span>
          <span>✓ 500+ Roofs in Waterloo / Columbia / Belleville</span>
        </div>
      </div>

      <section className="relative isolate bg-white">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[url('/logo.png')] bg-no-repeat bg-center bg-contain opacity-[0.06] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16 grid lg:grid-cols-2 gap-10 items-start">
        <div>
          <div className="inline-flex bg-brand-light text-black border border-brand/20 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">✓ Licensed & Insured - Illinois & Missouri</div>
          <h1 className="text-5xl text-black font-extrabold leading-[0.9] tracking-tight">Need a Roofer Near <span className="text-brand font-extrabold">St. Louis?</span><br/>We Answer in 5 Minutes.</h1>
          <p className="text-lg text-zinc-600 mt-5">Waterloo • Columbia • Belleville • St. Louis. Same-day inspections. No pushy sales - just honest pricing from a local crew that lives here.</p>

          <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div className="bg-brand border border-brand rounded-xl px-2 sm:px-5 py-4 text-center shadow-sm"><div className="text-white font-extrabold text-xl sm:text-2xl">5.0★</div><div className="text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wide"><a href={`https://search.google.com/local/reviews?placeid=${GOOGLE_PLACE_ID}`} target="_blank" className="underline">Google Rating</a></div></div>
            <div className="bg-brand border border-brand rounded-xl px-2 sm:px-5 py-4 text-center shadow-sm"><div className="text-white font-extrabold text-xl sm:text-2xl">10-Yr</div><div className="text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wide">Workmanship Warranty</div></div>
            <div className="bg-brand border border-brand rounded-xl px-2 sm:px-5 py-4 text-center shadow-sm"><div className="text-white font-extrabold text-xl sm:text-2xl">Same Day</div><div className="text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wide">Free Estimate</div></div>
          </div>

          <div className="mt-10 bg-white border-2 border-brand/25 rounded-2xl p-6 shadow-sm">
            <h3 className="text-black font-bold text-xl">Instant Roof Cost Estimator</h3>
            <p className="text-sm text-zinc-600 mt-1">3 clicks - get a real STL price range.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <select value={est.size} onChange={e=>setEst({...est,size:e.target.value})} className="bg-white border border-zinc-300 rounded-xl px-3 py-3 text-black font-medium">
                <option value="1200">~1,200 sqft</option>
                <option value="1800">~1,800 sqft (avg)</option>
                <option value="2400">~2,400 sqft</option>
                <option value="3000">~3,000+ sqft</option>
              </select>
              <select value={est.pitch} onChange={e=>setEst({...est,pitch:e.target.value})} className="bg-white border border-zinc-300 rounded-xl px-3 py-3 text-black font-medium">
                <option value="low">Low Pitch</option>
                <option value="medium">Medium Pitch</option>
                <option value="steep">Steep Pitch</option>
              </select>
              <select value={est.material} onChange={e=>setEst({...est,material:e.target.value})} className="bg-white border border-zinc-300 rounded-xl px-3 py-3 text-black font-medium">
                <option value="asphalt">3-Tab Asphalt</option>
                <option value="architectural">Architectural Shingle</option>
                <option value="metal">Metal Roof</option>
              </select>
            </div>
            {!showPrice? (
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <input value={est.email} onChange={e=>setEst({...est,email:e.target.value})} placeholder="Enter email to unlock price" className="min-w-0 flex-1 bg-white p-3 border border-zinc-300 rounded-xl" />
                <button onClick={()=>{ if(est.email.includes("@")) setShowPrice(true)}} className="bg-brand border border-brand hover:bg-brand-dark text-white px-6 py-3 rounded-full font-bold shadow-md shadow-brand/20">See Price →</button>
              </div>
            ) : (
              <div className="mt-4 bg-brand-light border border-brand/20 rounded-xl p-4 text-center">
                <div className="text-sm">Estimated Replacement Range:</div>
                <div className="text-3xl font-black text-brand">${(price*0.9).toLocaleString()} - ${(price*1.15).toLocaleString()}</div>
                <a href="#estimate" className="inline-block mt-3 bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded-full font-bold shadow-md shadow-brand/20">Lock This Estimate</a>
              </div>
            )}
            <div className="text-zinc-500 mt-2 text-xs">UTM: {utm.source || "direct"} / {utm.medium || "organic"} - Tracked • <span className="font-bold text-yellow-500">★★★★★ 5.0</span> Google</div>
          </div>
        </div>

        <div id="estimate" className="bg-brand-light border-2 border-brand/30 rounded-2xl p-7 shadow-xl scroll-mt-40">
          <h2 className="text-black font-bold text-2xl leading-tight">Get Your Free Roof Estimate in 30 Seconds</h2>
          <p className="text-zinc-600 text-sm mt-2 mb-6">We&apos;ll text you back in under 5 mins during business hours. <span className="text-yellow-400 font-bold">★★★★★</span> <span className="text-brand font-bold">5.0 Google Reviews</span></p>
          
          <form className="space-y-3" onSubmit={handleLeadSubmit}>
            <input name="name" required placeholder="Your Name" className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-black placeholder:text-zinc-400 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
            <input name="phone" required placeholder="Phone Number" className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-black placeholder:text-zinc-400 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
            <input name="email" type="email" placeholder="Email (optional)" className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-black placeholder:text-zinc-400 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
            <input name="address" placeholder="Address (optional)" className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-black placeholder:text-zinc-400 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
            <input name="city" placeholder="City (optional)" className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-black placeholder:text-zinc-400 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
            <select name="service" className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-black placeholder:text-zinc-400 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none">
              <option>Roof Repair</option>
              <option>Roof Replacement</option>
              <option>Leak / Emergency</option>
              <option>Storm Damage / Insurance</option>
              <option>Gutters / Siding</option>
            </select>
            <textarea name="details" placeholder="What's going on with your roof?" rows={3} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-black placeholder:text-zinc-400 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"></textarea>
            <button disabled={sending} className="w-full bg-brand py-4 rounded-full shadow-md shadow-brand/20 text-white text-base font-bold tracking-wide hover:bg-brand-dark disabled:opacity-50">
              {sending ? "Sending..." : "GET MY FREE ESTIMATE →"}
            </button>
            <p className="text-xs text-zinc-500 text-center">No spam. Source: {utm.source || "direct"} • ★★★★★ 5.0 Google Rated</p>
          </form>
        </div>
        </div>
      </section>

      <section id="services" className="bg-brand-light/50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-black text-center">St. Louis&apos; Most Called Roofing Crew For:</h2>
          <div className="grid md:grid-cols-4 gap-6 mt-10">
            {[
              ["Roof Replacement", "GAF / Owens Corning. Done in 1-2 days."],
              ["Emergency Repair", "Tarp + leak stop same day."],
              ["Storm & Hail", "We handle insurance photos + adjuster."],
              ["Gutters & Flashing", "Stops leaks others miss."],
            ].map(([t,d])=>(
              <div key={t} className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md">
                <div className="font-bold text-lg">{t}</div>
                <div className="text-sm text-zinc-600 mt-2">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-extrabold text-black text-center">Roofing FAQ - St. Louis</h2>
        <div className="mt-8 space-y-4">
          <details className="border border-zinc-100 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md"><summary className="font-bold cursor-pointer">How much does a new roof cost in St. Louis?</summary><p className="text-sm text-zinc-600 mt-3">2026 average $7,200-$16,800 for 1,200-3,000 sqft. Use estimator above.</p></details>
          <details className="border border-zinc-100 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md"><summary className="font-bold cursor-pointer">Are you licensed in IL and MO?</summary><p className="text-sm text-zinc-600 mt-3">Yes - IL & MO licensed, $2M insured. 5.0★ Google Rated.</p></details>
          <details className="border border-zinc-100 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md"><summary className="font-bold cursor-pointer">How fast can you inspect in Waterloo?</summary><p className="text-sm text-zinc-600 mt-3">Same day if call before 2pm. We live in 62298.</p></details>
        </div>
      </section>

      <BrandFooter />
    </div>
  );
}
