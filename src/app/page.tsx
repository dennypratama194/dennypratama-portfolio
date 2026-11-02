import type { Metadata } from 'next';
import { Intro } from '@/components/home/Intro';
import { Hero } from '@/components/home/Hero';
import { Story } from '@/components/home/Story';
import { WorkIndex } from '@/components/home/WorkIndex';
import { Construction } from '@/components/home/Construction';
import { BothSides } from '@/components/home/BothSides';
import { Proof } from '@/components/home/Proof';
import { ContactFooter } from '@/components/ContactFooter';

// set here, not in the layout: a canonical in the layout is inherited by every page that forgets its own, /thanks and the 404 included
export const metadata: Metadata = { alternates: { canonical: '/' } };

export default function Home() {
  return (
    <>
      <Intro />
      <main>
        <Hero />
        <Story />
        <WorkIndex />
        <Construction />
        <BothSides />
        <Proof />
      </main>
      <ContactFooter label="" />
    </>
  );
}

