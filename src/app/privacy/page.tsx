import type { Metadata } from "next";
import BrandHeader from "@/components/brand-header";
import BrandFooter from "@/components/brand-footer";

// Keep this page in step with what the site actually collects: the lead form (src/components/lead-form.tsx),
// lead source tracking, the API route (Supabase, Resend, Twilio) and the tags in src/components/google-ads.tsx.
export const metadata: Metadata = {
  title: "Privacy Policy | RoofingnearmeSTL",
  description: "How RoofingnearmeSTL collects, uses and protects the information you share on roofingnearmestl.com.",
  alternates: { canonical: "/privacy" },
};

const sections: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "Information you give us",
    body: (
      <>
        <p>When you request an estimate, we collect what you type into the form: your name and phone number, and, if you choose to add them, your city, email, street address, the service you need, whether it&apos;s an emergency, your roof&apos;s age and details about the problem.</p>
        <p>If you call or text us, we receive your phone number and whatever you tell us.</p>
      </>
    ),
  },
  {
    heading: "Information collected automatically",
    body: (
      <>
        <p><b>How you found us.</b> If you arrive from an ad or a link with campaign tags (for example from Google, Facebook or a printed QR code), your browser stores that source and the page you landed on for up to 30 days. If you then send a request, it is sent along with it so we know which ads and listings are working.</p>
        <p><b>Analytics and advertising tags.</b> We may use Google Analytics, Google Ads and the Meta (Facebook) Pixel. These tools use cookies and similar technology to record pages you view, buttons you tap (such as call or review buttons) and whether a request was sent, so we can measure and improve our advertising. Google and Meta handle that data under their own privacy policies.</p>
      </>
    ),
  },
  {
    heading: "How we use your information",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>To contact you about your request and to schedule, inspect and quote your roof.</li>
        <li>To provide the work you hire us for and keep records of it.</li>
        <li>To understand which ads, listings and pages bring in customers.</li>
        <li>To protect the site from spam and abuse.</li>
      </ul>
    ),
  },
  {
    heading: "Who we share it with",
    body: (
      <>
        <p>We do not sell your personal information. We share it only with service providers that help us run the website and respond to you: Vercel (website hosting), Supabase (secure storage of requests), Resend (emails your request to our team), Twilio (text alerts to our team), and Google and Meta (analytics and advertising, as described above).</p>
        <p>We may also share information if the law requires it.</p>
      </>
    ),
  },
  {
    heading: "Your choices",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>You can block or delete cookies in your browser settings.</li>
        <li>You can manage ads from Google at <a className="text-brand underline" href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">adssettings.google.com</a> and from Meta in your Facebook ad preferences.</li>
        <li>You can ask us to see, correct or delete the information you sent us by calling us at a number below.</li>
      </ul>
    ),
  },
  {
    heading: "Security and how long we keep it",
    body: <p>Requests are sent over an encrypted connection and stored in a private database that is not publicly accessible. We keep request information for as long as we need it to serve you and to keep normal business records.</p>,
  },
  {
    heading: "Children",
    body: <p>This website is meant for homeowners and is not directed to children under 13. We do not knowingly collect information from children.</p>,
  },
  {
    heading: "Changes and contact",
    body: (
      <p>If we change this policy, we&apos;ll update it on this page. Questions? Call RoofingnearmeSTL at <a className="font-bold text-brand" href="tel:+16186125192">618-612-5192</a> (Illinois) or <a className="font-bold text-brand" href="tel:+13142027663">314-202-7663</a> (Missouri).</p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <BrandHeader />
      <main className="px-6 py-14">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-black tracking-tight">Privacy Policy</h1>
          <p className="mt-3 text-sm text-zinc-500">Last updated October 19, 2026</p>
          <p className="mt-6 leading-relaxed text-zinc-700">This policy explains what information RoofingnearmeSTL collects through roofingnearmestl.com, how we use it and the choices you have.</p>
          {sections.map((section) => (
            <section key={section.heading} className="mt-9">
              <h2 className="text-xl font-extrabold text-black">{section.heading}</h2>
              <div className="mt-3 space-y-3 leading-relaxed text-zinc-700">{section.body}</div>
            </section>
          ))}
        </article>
      </main>
      <BrandFooter />
    </div>
  );
}
