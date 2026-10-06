export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* TOP BAR */}
      <div className="bg-black text-white text-center py-2 text-sm">
        🚨 24/7 Emergency Roof Repair in St. Louis Metro - Call Now: <a href="tel:16185551234" className="font-bold underline">(618) 555-1234</a>
      </div>

      {/* HEADER */}
      <header className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="font-black text-xl tracking-tight">ROOFING NEAR ME<span className="text-red-600"> STL</span>.COM</div>
        <a href="#quote" className="bg-red-600 text-white px-5 py-2.5 rounded-full font-bold">Get Free Quote</a>
      </header>

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 py-12 lg:py-20 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold mb-4">✓ Licensed & Insured in IL & MO - 500+ Roofs Done</div>
          <h1 className="text-5xl font-black leading-[0.9] tracking-tight">Need a Roofer Near <span className="text-red-600">St. Louis?</span><br/>We Answer in 5 Minutes.</h1>
          <p className="text-lg text-zinc-600 mt-5">Waterloo • Columbia • Belleville • St. Louis. Same-day inspections. No pushy sales - just honest pricing from a local crew that lives here.</p>

          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="border rounded-xl p-3"><div className="font-black text-2xl">4.9★</div><div className="text-xs">Google Rating</div></div>
            <div className="border rounded-xl p-3"><div className="font-black text-2xl">10-Yr</div><div className="text-xs">Workmanship Warranty</div></div>
            <div className="border rounded-xl p-3"><div className="font-black text-2xl">Same Day</div><div className="text-xs">Free Estimate</div></div>
          </div>
        </div>

        {/* LEAD FORM */}
        <div id="quote" className="bg-zinc-900 text-white rounded- p-7 shadow-2xl">
          <h2 className="text-2xl font-bold">Get Your Free Roof Estimate in 30 Seconds</h2>
          <p className="text-zinc-400 text-sm mt-2 mb-6">We’ll text you back in under 5 mins during business hours.</p>

          <form className="space-y-3" action="https://formspree.io/f/xvovqk" method="POST">
            <input name="name" required placeholder="Your Name" className="w-full p-3.5 rounded-xl bg-white text-black" />
            <input name="phone" required placeholder="Phone Number" className="w-full p-3.5 rounded-xl bg-white text-black" />
            <input name="address" required placeholder="Address / City (St. Louis, Waterloo...)" className="w-full p-3.5 rounded-xl bg-white text-black" />
            <select name="service" className="w-full p-3.5 rounded-xl bg-white text-black">
              <option>Roof Repair</option>
              <option>Roof Replacement</option>
              <option>Leak / Emergency</option>
              <option>Storm Damage / Insurance</option>
              <option>Gutters / Siding</option>
            </select>
            <textarea name="details" placeholder="What’s going on with your roof?" rows={3} className="w-full p-3.5 rounded-xl bg-white text-black"></textarea>
            <button className="w-full bg-red-600 py-4 rounded-xl font-black text-lg hover:bg-red-700">GET MY FREE ESTIMATE →</button>
            <p className="text-xs text-zinc-500 text-center">No spam. Local STL crew. We never sell your info.</p>
          </form>
        </div>
      </section>

      {/* SERVICES */}
      <section className="bg-zinc-100 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-black text-center">St. Louis’ Most Called Roofing Crew For:</h2>
          <div className="grid md:grid-cols-4 gap-6 mt-10">
            {[
              ["Roof Replacement", "GAF / Owens Corning shingles. Done in 1-2 days."],
              ["Emergency Repair", "Tarp + leak stop same day. 24/7 storm line."],
              ["Storm & Hail", "We handle insurance photos + adjuster meeting."],
              ["Gutters & Flashing", "Stops leaks that other roofers miss."],
            ].map(([t,d])=>(
              <div key={t} className="bg-white p-6 rounded-2xl border">
                <div className="font-bold text-lg">{t}</div>
                <div className="text-sm text-zinc-600 mt-2">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-10 text-center text-sm text-zinc-500">
        © {new Date().getFullYear()} RoofingNearMeSTL.com • Serving Waterloo IL 62298 + All St. Louis Metro • Licensed IL/MO<br/>
        Call (618) 555-1234 - This is a lead site template. Replace phone + Formspree ID before ads.
      </footer>
    </div>
  );
}