import { EMAIL, SITE_URL, SOCIAL } from './site';

export const JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person', '@id': `${SITE_URL}/#person`, name: 'Denny Pratama', url: SITE_URL, email: `mailto:${EMAIL}`,
      jobTitle: 'Product designer', image: `${SITE_URL}/opengraph-image`,
      address: { '@type': 'PostalAddress', addressCountry: 'ID' },
      knowsAbout: ['Product design', 'UI/UX design', 'Design systems', 'SaaS dashboards', 'Figma'],
      sameAs: SOCIAL.map((s) => s.href),
    },
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: SITE_URL, name: 'Denny Pratama', inLanguage: 'en', publisher: { '@id': `${SITE_URL}/#person` } },
  ],
}).replace(/</g, '\\u003c');

