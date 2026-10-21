// Page frame for articles, Q&A and info pages: emergency bar, header, breadcrumb, footer, JSON-LD.
import Link from "next/link";
import BrandHeader from "@/components/brand-header";
import BrandFooter from "@/components/brand-footer";
import EmergencyBar from "@/components/emergency-bar";
import { jsonLd } from "@/lib/site-pages";

export default function ContentShell({ breadcrumbs, schema, children }: {
  breadcrumbs: { name: string; href: string }[];
  schema: object;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)} />
      <EmergencyBar />
      <BrandHeader />
      <main className="px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-sm text-zinc-500 mb-4">
            <Link href="/" className="underline hover:text-black">Home</Link>
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href}> / {index === breadcrumbs.length - 1 ? <span className="text-black">{crumb.name}</span> : <Link href={crumb.href} className="underline hover:text-black">{crumb.name}</Link>}</span>
            ))}
          </nav>
          {children}
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}

export const crumbSchema = (base: string, crumbs: { name: string; href: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: [{ name: "Home", href: "" }, ...crumbs].map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: `${base}${crumb.href}` })),
});
