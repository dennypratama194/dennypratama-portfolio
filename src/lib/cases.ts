export type Case = {
  slug: string; name: string; site: string; siteLabel: string; intro: string; cover: string;
  meta: [string, string | null][]; // null hides the row until Denny supplies the real value
  briefTitle: string; briefText: string;
  /** the second brief column (goal, what wasn't working, deadline); hidden until Denny writes it. Never invent it. */
  briefMore?: string;
  design: string[]; production: string[];
  gallery: { cls: string; img: string; n: string; cap: string; pos: string }[];
  detail: { title: string; text: string; img: string; alt: string; code: string; note: string };
  /** null hides the outcome section; it stays hidden until Denny has real numbers */
  outcomes: [string, string][] | null;
  next: { name: string; href: string; label: string; img: string };
};

export const CASES: Case[] = [
  {
    slug: 'wordsburg',
    name: 'Wordsburg',
    site: 'https://wordsburg.com',
    siteLabel: 'wordsburg.com',
    intro: 'A global content solutions partner that publishes white papers, playbooks and a busy blog. I designed the experience end to end, down to the article template their team publishes with.',
    cover: '/img/work-wordsburg.jpg',
    meta: [['Client', 'Wordsburg'], ['Sector', 'Learning, translation, localization'], ['Role', 'UI/UX design'], ['Built on', 'WordPress'], ['Year', null]],
    briefTitle: 'A content engine that looks like a brand, not a blog theme.',
    briefText: 'Wordsburg publishes constantly: white papers, use cases, a transformation playbook and a steady stream of articles. Each of those pages has to carry the brand as carefully as the homepage does.',
    design: ['Site-wide UI/UX, from the homepage to the article template', 'A blog system with category pills, bylines and breadcrumbs', 'A locked icon style built on one gradient stroke', 'A branded image frame that marks every visual as Wordsburg’s'],
    production: ['Built by the client’s own team, from my design files'],
    gallery: [
      { cls: 'g-a', img: '/img/cs-wb-article.jpg', n: 'Fig. 02', cap: 'Article template · desktop', pos: '50% 0%' },
      { cls: 'g-b', img: '/img/cs-wb-mobile.jpg', n: 'Fig. 03', cap: 'Same template · 390 px', pos: '50% 0%' },
      { cls: 'g-c', img: '/img/cs-wb-blog.jpg', n: 'Fig. 04', cap: 'Blog index · search and topic filter', pos: '50% 0%' },
      { cls: 'g-d', img: '/img/cs-wb-what.jpg', n: 'Fig. 05', cap: 'Services overview', pos: '0% 50%' },
      { cls: 'g-e', img: '/img/cs-wb-article2.jpg', n: 'Fig. 06', cap: 'Long-form reading view', pos: '50% 40%' },
    ],
    detail: {
      title: 'From a Figma chore to a CSS rule.',
      text: 'Every image on Wordsburg wears the same cut-corner frame. In Figma it was a manual step for every visual. On the live site it’s a mask in the template, so anything the team uploads gets the frame on its own.',
      img: '/img/cs-wb-what.jpg',
      alt: 'A Wordsburg image with the cut-corner frame applied by CSS',
      code: '/* every uploaded image gets the frame */\n.wb-frame {\n  clip-path: polygon(\n    0 0, calc(100% - 56px) 0,\n    100% 56px, 100% 100%,\n    56px 100%, 0 calc(100% - 56px)\n  );\n}',
      note: 'clip-path polygon · 56px corners · zero manual steps',
    },
    // Hidden until Denny supplies real numbers (organic sessions, articles published, mobile LCP). Never invent these.
    outcomes: null,
    next: { name: 'This site', href: '/work/dennypratama', label: '00 / 09 · Case study', img: '/img/work-dennypratama.jpg' },
  },
];

export const getCase = (slug: string) => CASES.find((c) => c.slug === slug);

