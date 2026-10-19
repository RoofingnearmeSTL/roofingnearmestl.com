import { MetadataRoute } from 'next';
import { SITE_URL, sitePages } from '@/lib/site-pages';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    ...['/services', '/areas-we-serve'].map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
    ...sitePages.map((page) => ({
      url: `${SITE_URL}/${page.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: page.kind === 'service' ? 0.9 : 0.8,
    })),
  ];
}
