export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@example.com';
export const AVAILABILITY = 'Taking on 2–3 projects per quarter';

// The mark: two halves of eleven points, one a 180° turn of the other around the pivot.
export const D_PATH = 'M3.5 -511.5L-173.5 -435.5L-173.5 -160.5L-345.5 -82.5L-345.5 261.5L-215.5 324.5L-86.5 265.5L-86.5 80.5L-170.5 116.5L-255.5 65.5L3.5 -47.5Z';
export const P_PATH = 'M-3.5 511.5L173.5 435.5L173.5 160.5L345.5 82.5L345.5 -261.5L215.5 -324.5L86.5 -265.5L86.5 -80.5L170.5 -116.5L255.5 -65.5L-3.5 47.5Z';
export const MARK_VB = '-346 -512 692 1024';

export const SOCIAL = [
  { name: 'Dribbble', href: 'https://dribbble.com/dennypratama' },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/in/denny-pratama-740a14151/' },
  { name: 'Upwork', href: 'https://www.upwork.com/freelancers/dennypratama194' },
  { name: 'GitHub', href: 'https://github.com/dennypratama194' },
  { name: 'Threads', href: 'https://threads.com/dennypratama' },
];

export const NAV = [
  { key: 'work', label: 'Work', href: '/work' },
  { key: 'about', label: 'About', href: '/about' },
  { key: 'blog', label: 'Blog', href: '/blog' },
  { key: 'contact', label: 'Contact', href: '/contact' },
] as const;

// what happens after someone gets in touch: the contact page shows it before, the thanks page after
export const NEXT_STEPS: [string, string][] = [
  ['I read it and reply', 'Usually with a few questions about goals, timing and budget.'],
  ['A clear scope and price', 'One page: what I’ll do, what it costs and when you’ll see it.'],
];


