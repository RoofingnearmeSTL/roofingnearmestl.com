import { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  return [{
    url: 'https://roofingnearmestl.com',
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 1,
  }];
}
