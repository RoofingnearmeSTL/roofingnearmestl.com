import { MetadataRoute } from 'next';
import { SITE_URL, sitePages } from '@/lib/site-pages';
import { gridPages } from '@/lib/service-grid';
import { questions } from '@/lib/questions';

// Generated from the same lists that build the pages, so every URL here is a real page and new
// pages (cities, city + service pages, questions) are added automatically.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entry = (path: string, priority: number, changeFrequency: 'weekly' | 'monthly' = 'monthly') => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency, priority });
  return [
    entry('', 1, 'weekly'),
    entry('/services', 0.9),
    entry('/areas-we-serve', 0.9),
    entry('/blog/roof-replacement-cost-st-louis-mo', 0.9),
    ...sitePages.map((page) => entry(`/${page.slug}`, page.kind === 'service' ? 0.9 : 0.8)),
    ...gridPages.map((page) => entry(page.path, 0.7)),
    entry('/blog', 0.6),
    entry('/questions', 0.6),
    ...questions.map((q) => entry(`/questions/${q.slug}`, 0.7)),
    entry('/accreditation', 0.5),
  ];
}
