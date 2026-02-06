import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/teacher/', '/student/'], // Disallow app routes to focus juice on LP
    },
    sitemap: 'https://www.classcrave.com/sitemap.xml',
  };
}
